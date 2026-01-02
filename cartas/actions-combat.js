// --- ACCIONES: LÓGICA DE COMBATE Y DEFENSA ---
// Guardar como: Cartas Silen/actions-combat.js

window.GameActionsCombat = {
    // --- LOGICA DE DEFENSA AUTOMÁTICA ---
    autoAssignDefenders: (context) => {
        const { setGameState, addLog, gameState } = context;
        if (gameState.phase !== 'response') return;

        setGameState(prev => {
            const myId = prev.myPlayerId;
            const newPlayers = [...prev.players];
            const me = newPlayers[myId];
            
            // 1. Limpiar todas las defensas actuales para recalcular
            me.field.forEach(c => c.isFrozen = false);
            let newIncoming = prev.incomingStack.map(a => ({ ...a, blockerUuid: null }));
            
            // 2. Obtener defensores disponibles
            let availableDefenders = me.field.filter(c => !c.isFrozen);

            // 3. Asignar lógicamente
            newIncoming = newIncoming.map(action => {
                if (availableDefenders.length === 0) return action;

                // Determinar fuerza del ataque entrante (priorizar damageValue si es habilidad, si no STR)
                const attackPower = action.damageValue !== undefined ? Number(action.damageValue) : (Number(action.sourceStats) || 0);

                // Buscar el mejor defensor (Fuerza >= Ataque) para sobrevivir
                // Aseguramos conversión numérica estricta aquí también
                let bestIdx = availableDefenders.findIndex(d => (Number(d.strength) || 0) >= attackPower);
                
                // Si no hay nadie que lo pare, usa el primero disponible
                if (bestIdx === -1) {
                    bestIdx = 0; 
                }

                const defender = availableDefenders[bestIdx];
                
                // Marcar
                defender.isFrozen = true;
                availableDefenders.splice(bestIdx, 1); // Quitar de disponibles

                return { ...action, blockerUuid: defender.uuid };
            });

            addLog("Autodefensa calculada.");
            return { ...prev, incomingStack: newIncoming, players: newPlayers };
        });
    },

    // --- ASIGNAR, SUSTITUIR O QUITAR DEFENSOR ---
    assignDefender: (actionUuid, blockerCardUuid, context) => {
        const { gameState, setGameState, addLog } = context;
        if (gameState.phase !== 'response') return;

        setGameState(prev => {
            const myId = prev.myPlayerId;
            const newPlayers = [...prev.players];
            const me = newPlayers[myId];
            
            // 1. Encontrar el ataque específico
            const actionIndex = prev.incomingStack.findIndex(a => a.uuid === actionUuid);
            if (actionIndex === -1) return prev;
            const currentAction = prev.incomingStack[actionIndex];

            // 2. ¿Había ya un defensor en este ataque? -> LIBERARLO (Sustitución)
            if (currentAction.blockerUuid) {
                const oldBlocker = me.field.find(c => c.uuid === currentAction.blockerUuid);
                if (oldBlocker) {
                    oldBlocker.isFrozen = false; // Vuelve a estar disponible
                }
            }

            // 3. Preparar nueva lista de incoming
            let newIncoming = [...prev.incomingStack];

            // 4. CASO A: Quitar defensa (blockerCardUuid es null)
            if (blockerCardUuid === null) {
                newIncoming[actionIndex] = { ...currentAction, blockerUuid: null };
                addLog("Defensa retirada.");
            } 
            // 5. CASO B: Asignar nuevo defensor
            else {
                const newBlocker = me.field.find(c => c.uuid === blockerCardUuid);
                
                if (newBlocker) {
                    // Si este blocker ya estaba en OTRO ataque, liberarlo de allá
                    newIncoming = newIncoming.map(act => {
                        if (act.blockerUuid === blockerCardUuid) {
                            return { ...act, blockerUuid: null };
                        }
                        return act;
                    });

                    // Asignar al nuevo ataque y congelar
                    newBlocker.isFrozen = true;
                    newIncoming[actionIndex] = { ...currentAction, blockerUuid: blockerCardUuid };
                    addLog(`${newBlocker.name} defiende.`);
                }
            }

            return { ...prev, incomingStack: newIncoming, players: newPlayers };
        });
    },

    resolveCombatPhase: (context) => {
        const { gameState, setGameState, addLog, onBack, conn, gameConfig } = context;
        
        // Identificar quién defiende (turno actual) y quién ataca (el otro)
        const defenderId = gameState.turn; 
        const attackerId = defenderId === 0 ? 1 : 0;

        // Clonar jugadores para modificar stats
        const newPlayers = JSON.parse(JSON.stringify(gameState.players));
        const defender = newPlayers[defenderId];
        const attackerPlayer = newPlayers[attackerId]; // Referencia al atacante para aplicar daño de vuelta
        
        gameState.incomingStack.forEach(action => {
            // DETECTAR TIPO DE ATAQUE:
            // Aseguramos que TODO sea Number para evitar errores de curación por strings
            const isAbilityAttack = action.damageValue !== undefined;
            const attackValue = isAbilityAttack ? Number(action.damageValue) : (Number(action.sourceStats) || 0);
            
            // Aseguramos que los puntos sean números
            let potentialPoints = (action.sourcePoints !== undefined && action.sourcePoints !== null) ? Number(action.sourcePoints) : 1; 
            
            // --- LÓGICA DE RESOLUCIÓN DE COMBATE ---
            if (action.blockerUuid) {
                const blockerIndex = defender.field.findIndex(c => c.uuid === action.blockerUuid);
                if (blockerIndex !== -1) {
                    const blocker = defender.field[blockerIndex];
                    
                    // CORRECCIÓN CRÍTICA: Forzamos Number() aquí también.
                    const defenseStrength = Number(window.GameActions.getCombatPower(blocker)) || 0;
                    
                    if (isAbilityAttack) {
                        // --- CASO HABILIDAD ---
                        // El defensor recibe el daño fijo de la habilidad.
                        blocker.currentHp -= attackValue;
                        addLog(`${blocker.name} recibió ${attackValue} de daño por ${action.abilityName || 'Habilidad'}.`);
                    } else {
                        // --- CASO COMBATE FÍSICO (STR vs STR) ---
                        addLog(`Choque: ${action.sourceCardName} (${attackValue}) vs ${blocker.name} (${defenseStrength})`);

                        if (attackValue > defenseStrength) {
                            // Atacante gana, defensor recibe la diferencia
                            const damage = Math.max(0, attackValue - defenseStrength);
                            blocker.currentHp -= damage;
                            addLog(`${blocker.name} es superado y recibe ${damage} daño.`);

                        } else if (defenseStrength > attackValue) {
                            // Defensor gana, atacante recibe la diferencia (Counter)
                            const damage = Math.max(0, defenseStrength - attackValue);
                            addLog(`${action.sourceCardName} es repelido y recibe ${damage} daño.`);
                            
                            // --- CORRECCIÓN APLICADA: EL ATACANTE SIEMPRE RECIBE DAÑO ---
                            // Buscamos la carta atacante en el array del jugador atacante
                            const attackerCardIndex = attackerPlayer.field.findIndex(c => c.uuid === action.sourceCardUuid);
                            
                            if (attackerCardIndex !== -1) {
                                const attackerCard = attackerPlayer.field[attackerCardIndex];
                                attackerCard.currentHp -= damage;

                                // Verificar si el atacante muere
                                if (attackerCard.currentHp <= 0) {
                                    addLog(`${attackerCard.name} (Atacante) ha muerto por el contraataque.`);
                                    attackerPlayer.field.splice(attackerCardIndex, 1);
                                    attackerPlayer.retirement.push(attackerCard);
                                }
                            }

                            // Si estamos en red, enviamos el reporte también para logs del otro lado,
                            // aunque el estado se sincronizará con newPlayers al final del turno.
                            if (conn && gameConfig?.mode !== 'ai') {
                                conn.send({ 
                                    type: 'DAMAGE_REPORT', 
                                    payload: { targetUuid: action.sourceCardUuid, targetName: action.sourceCardName, damage: damage } 
                                });
                            }

                        } else {
                            // Empate
                            addLog("Fuerzas iguales. Bloqueo perfecto.");
                        }
                    }

                    // Verificar muerte del defensor localmente
                    if (blocker.currentHp <= 0) {
                        addLog(`${blocker.name} ha sido destruida.`);
                        defender.field.splice(blockerIndex, 1);
                        defender.retirement.push(blocker);
                    }
                }
            } else {
                // Si no hay bloqueo, daño directo a puntos del jugador
                const currentPoints = Number(newPlayers[attackerId].points) || 0;
                const pointsToAdd = Number(potentialPoints);
                
                newPlayers[attackerId].points = currentPoints + pointsToAdd; 
                
                addLog(`¡Impacto Directo! ${action.sourceCardName} conecta por ${pointsToAdd} pts.`);
            }
        });

        // Verificación de condiciones de victoria
        const myId = gameState.myPlayerId;
        const opId = myId === 0 ? 1 : 0;
        
        // Comprobamos la victoria usando los nuevos valores numéricos
        if (newPlayers[opId].points >= 30) {
            alert(gameConfig?.mode === 'ai' ? "DERROTA. La IA ha ganado." : "EL RIVAL HA ALCANZADO 30 PUNTOS. DERROTA.");
            if (conn) conn.send({ type: 'GAME_OVER', payload: { winner: opId } });
            onBack();
        } else if (newPlayers[myId].points >= 30) {
            alert("¡VICTORIA! Has alcanzado 30 Puntos.");
            if (conn) conn.send({ type: 'GAME_OVER', payload: { winner: myId } });
            onBack();
        }

        return {
            players: newPlayers,
            incomingStack: []
        };
    }
};