
// --- ACCIONES DE JUEGO (REGLAS TÁCTICAS) ---

const GameActions = {
    // Calcular suma de stats para combate
    getCombatPower: (card) => {
        return (card.power || 0) + (card.strength || 0) + (card.intelligence || 0);
    },

    startTurn: (context) => {
        const { setGameState, gameState, sendStateUpdate, addLog } = context;
        
        setGameState(prev => {
            const myId = prev.myPlayerId;
            const newPlayers = [...prev.players];
            const me = newPlayers[myId];
            
            // 1. Aumentar turno y calcular energía (10, 20, 30... max 100)
            const nextTurnCount = prev.turnCount + 1;
            const newEnergyCap = Math.min(100, nextTurnCount * 10);
            
            me.maxEnergy = newEnergyCap;
            me.energy = newEnergyCap; // Reinicio completo, no acumula

            // 2. Robar carta
            if(me.deck.length > 0) {
                const card = me.deck.shift();
                // Inicializar HP actual al robar y asegurar UUID único
                card.currentHp = card.maxHp;
                card.isFrozen = false;
                if(!card.uuid) card.uuid = Date.now() + Math.random(); 
                me.hand.push(card);
            }

            // 3. Descongelar unidades en campo
            me.field.forEach(u => u.isFrozen = false);

            // 4. Determinar fase inicial
            // Si hay ataques entrantes, vamos a Response. Si no, directo a Preparation.
            const hasIncoming = prev.incomingStack && prev.incomingStack.length > 0;
            const initialPhase = hasIncoming ? 'response' : 'preparation';

            const newState = {
                ...prev,
                turn: myId, // Asegurar que es mi turno
                turnCount: nextTurnCount,
                phase: initialPhase,
                outgoingStack: [], // Limpiar pila de salida nueva
                players: newPlayers
            };
            
            addLog(`--- TURNO ${Math.floor(nextTurnCount/2) + 1} ---`);
            addLog(`Fase: ${initialPhase === 'response' ? 'RESPUESTA (Defiéndete)' : 'PREPARACIÓN'}`);
            
            sendStateUpdate(newState);
            return newState;
        });
    },

    advancePhase: (context) => {
        const { gameState, setGameState, sendStateUpdate, sendLog, conn, onBack, user } = context;
        
        let nextPhase = '';
        let shouldEndTurn = false;

        if (gameState.phase === 'response') {
            // Resolver combates pendientes
            GameActions.resolveCombatPhase(context);
            nextPhase = 'preparation';
            sendLog("Fase de Preparación iniciada.");
        } 
        else if (gameState.phase === 'preparation') {
            nextPhase = 'interaction';
            sendLog("Fase de Interacción iniciada.");
        } 
        else if (gameState.phase === 'interaction') {
            shouldEndTurn = true;
        }

        if (shouldEndTurn) {
            // Pasar turno
            const myId = gameState.myPlayerId;
            const opId = myId === 0 ? 1 : 0;
            
            // Enviamos nuestras acciones salientes como entrantes para el rival
            const payload = {
                turn: opId,
                incomingStack: gameState.outgoingStack // Lo que yo lanzo, él recibe
            };

            if(conn) conn.send({ type: 'pass_turn', payload });
            
            setGameState(prev => ({ ...prev, turn: opId, phase: 'waiting' }));
            sendLog("Fin del turno. Acciones enviadas.");
        } else {
            // Solo cambiar fase local
            const newState = { ...gameState, phase: nextPhase };
            setGameState(newState);
            sendStateUpdate(newState);
        }
    },

    playCard: (cardIndex, context) => {
        const { gameState, setGameState, sendStateUpdate, addLog } = context;
        const me = gameState.players[gameState.myPlayerId];
        const card = me.hand[cardIndex];

        if (gameState.phase !== 'preparation') {
            addLog("Solo puedes jugar cartas en Fase de Preparación.");
            return;
        }
        if (me.energy < card.cost) {
            addLog("Energía insuficiente.");
            return;
        }
        if (me.field.length >= 5) {
            addLog("Campo lleno.");
            return;
        }

        const newPlayers = [...gameState.players];
        const player = newPlayers[gameState.myPlayerId];

        player.energy -= card.cost;
        player.hand.splice(cardIndex, 1);
        
        // La carta entra lista
        // Aseguramos que tenga UUID al entrar al campo
        const unit = { 
            ...card, 
            currentHp: card.maxHp, 
            uuid: card.uuid || (Date.now() + Math.random()) 
        };
        player.field.push(unit);

        const newState = { ...gameState, players: newPlayers };
        setGameState(newState);
        sendStateUpdate(newState);
    },

    useAbility: (cardUuid, abilityId, context) => {
        const { gameState, setGameState, sendStateUpdate, addLog } = context;
        const myId = gameState.myPlayerId;
        const me = gameState.players[myId];
        
        // Encontrar carta en el campo
        const cardIndex = me.field.findIndex(c => c.uuid === cardUuid);
        if (cardIndex === -1) {
            console.error("Carta no encontrada:", cardUuid);
            return;
        }
        const card = me.field[cardIndex];
        const ability = card.abilities.find(a => a.id === abilityId);

        if (!ability) {
            console.error("Habilidad no encontrada:", abilityId);
            return;
        }

        if (card.isFrozen) {
            addLog(`${card.name} ya actuó este turno.`);
            return;
        }
        if (me.energy < ability.cost) {
            addLog(`Energía insuficiente para ${ability.name}.`);
            return;
        }

        // Validación de Fase vs Tipo de Habilidad
        if (ability.type === 'preparation' && gameState.phase !== 'preparation') {
            addLog("Habilidad de Preparación: Solo en Fase Prep.");
            return;
        }
        if (ability.type === 'interaction' && gameState.phase !== 'interaction') {
            addLog("Habilidad de Interacción: Solo en Fase Interacción.");
            return;
        }
        if (ability.type === 'response' && gameState.phase !== 'response') {
            addLog("Habilidad de Respuesta: Solo en Fase de Respuesta.");
            return;
        }
        
        const newPlayers = [...gameState.players];
        const player = newPlayers[myId];
        const fieldCard = player.field[cardIndex];

        // Coste
        player.energy -= ability.cost;

        // --- LÓGICA DE HABILIDADES ---
        if (ability.type === 'preparation') {
            // Efectos inmediatos
            if (ability.id === 'meditate') fieldCard.currentHp = Math.min(fieldCard.maxHp, fieldCard.currentHp + 50);
            if (ability.id === 'grow') {
                fieldCard.strength += 10; fieldCard.intelligence += 10; fieldCard.power += 10;
            }
            addLog(`${card.name} usó ${ability.name}.`);
        } 
        else if (ability.type === 'interaction') {
            // Congelar y meter al Stack (ATACAR)
            fieldCard.isFrozen = true;
            
            const action = {
                sourceCardName: card.name,
                sourceCardUuid: card.uuid, 
                sourceStats: GameActions.getCombatPower(card),
                abilityName: ability.name,
                uuid: Date.now() + Math.random()
            };

            setGameState(prev => ({
                ...prev,
                outgoingStack: [...prev.outgoingStack, action],
                players: newPlayers
            }));
            addLog(`${card.name} prepara ${ability.name}.`);
        }
        else if (ability.type === 'response') {
            // (DEFENDER) Buscar ataque sin bloquear
            const unblockedAction = gameState.incomingStack.find(a => !a.blockerUuid);
            
            if (unblockedAction) {
                fieldCard.isFrozen = true; // Defender gasta la acción de la carta
                // Llamamos a la lógica de asignación
                GameActions.assignDefender(unblockedAction.uuid, card.uuid, context);
                addLog(`${card.name} defiende contra ${unblockedAction.sourceCardName}.`);
            } else {
                addLog("No hay ataques para bloquear.");
                player.energy += ability.cost; // Devolver energía si falló
                return; 
            }
        }

        setGameState(prev => ({ ...prev, players: newPlayers }));
        sendStateUpdate({ ...gameState, players: newPlayers });
    },

    // Asignar defensor en Fase de Respuesta
    assignDefender: (actionUuid, blockerCardUuid, context) => {
        const { gameState, setGameState } = context;
        if (gameState.phase !== 'response') return;

        setGameState(prev => {
            const newIncoming = prev.incomingStack.map(action => {
                if (action.uuid === actionUuid) {
                    return { ...action, blockerUuid: blockerCardUuid };
                }
                return action;
            });
            return { ...prev, incomingStack: newIncoming };
        });
    },

    resolveCombatPhase: (context) => {
        const { gameState, setGameState, addLog, user, onBack, conn } = context;
        const myId = gameState.myPlayerId;
        const newPlayers = [...gameState.players];
        const me = newPlayers[myId];
        
        // Procesar combates
        gameState.incomingStack.forEach(action => {
            const attackPower = action.sourceStats;
            
            if (action.blockerUuid) {
                // Hay defensor
                const blockerIndex = me.field.findIndex(c => c.uuid === action.blockerUuid);
                if (blockerIndex !== -1) {
                    const blocker = me.field[blockerIndex];
                    const defensePower = GameActions.getCombatPower(blocker);
                    
                    addLog(`Choque: ${action.sourceCardName} (${attackPower}) vs ${blocker.name} (${defensePower})`);

                    const diff = attackPower - defensePower;

                    if (diff > 0) {
                        // Atacante gana, daño al defensor (mi carta)
                        blocker.currentHp -= diff;
                        addLog(`${blocker.name} pierde y recibe ${diff} de daño.`);
                    } else if (diff < 0) {
                        // Defensor gana, daño al atacante (carta rival)
                        const reflectDamage = Math.abs(diff);
                        addLog(`¡${blocker.name} gana! ${action.sourceCardName} recibe ${reflectDamage} daño de vuelta.`);
                        
                        // ENVIAR REPORTE DE DAÑO AL RIVAL
                        if(conn) {
                            conn.send({ 
                                type: 'DAMAGE_REPORT', 
                                payload: { 
                                    targetUuid: action.sourceCardUuid, // UUID del atacante original
                                    targetName: action.sourceCardName,
                                    damage: reflectDamage 
                                } 
                            });
                        }

                    } else {
                        addLog("Empate de fuerzas. Nadie recibe daño.");
                    }

                    // Chequeo de muerte del defensor local
                    if (blocker.currentHp <= 0) {
                        addLog(`${blocker.name} ha caído al Retiro.`);
                        me.field.splice(blockerIndex, 1);
                        me.retirement.push(blocker);
                    }
                }
            } else {
                // Sin bloqueo -> Punto para el rival
                addLog(`¡Impacto directo de ${action.sourceCardName}! Rival gana 1 Punto.`);
                const opId = myId === 0 ? 1 : 0;
                newPlayers[opId].points += 1; 
            }
        });

        // Limpiar stack
        setGameState(prev => ({
            ...prev,
            players: newPlayers,
            incomingStack: []
        }));

        // Chequeo de Victoria (Si el rival llegó a 30 con mis fallos de defensa)
        const opId = myId === 0 ? 1 : 0;
        if (newPlayers[opId].points >= 30) {
            alert("EL RIVAL HA ALCANZADO 30 PUNTOS. DERROTA.");
            conn.send({ type: 'GAME_OVER', payload: { winner: opId } });
            onBack();
        }
    }
};
