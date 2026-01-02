// --- ACCIONES DE JUEGO (REGLAS TÁCTICAS) ---
// Sobreescribir: Cartas Silen/game-actions.js

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
            
            // 1. Aumentar turno y calcular energía
            const nextTurnCount = prev.turnCount + 1;
            const newEnergyCap = Math.min(100, nextTurnCount * 10);
            
            me.maxEnergy = newEnergyCap;
            me.energy = newEnergyCap; 

            // 2. Robar carta
            if(me.deck.length > 0) {
                const card = me.deck.shift();
                card.currentHp = card.maxHp;
                card.isFrozen = false;
                if(!card.uuid) card.uuid = Date.now() + Math.random(); 
                me.hand.push(card);
            }

            // 3. Descongelar unidades
            me.field.forEach(u => u.isFrozen = false);

            // 4. Fase inicial
            const hasIncoming = prev.incomingStack && prev.incomingStack.length > 0;
            const initialPhase = hasIncoming ? 'response' : 'main';

            const newState = {
                ...prev,
                turn: myId,
                turnCount: nextTurnCount,
                phase: initialPhase,
                outgoingStack: [],
                players: newPlayers
            };
            
            addLog(`--- TURNO ${Math.floor(nextTurnCount/2) + 1} ---`);
            addLog(`Fase: ${initialPhase === 'response' ? 'DEFENSA' : 'ATAQUE'}`);
            
            // Solo enviar update si NO es IA. Si es IA, el estado es compartido localmente.
            if (context.gameConfig?.mode !== 'ai') {
                sendStateUpdate(newState);
            }
            
            return newState;
        });
    },

    advancePhase: (context) => {
        const { gameState, setGameState, sendStateUpdate, sendLog, addLog, conn, onBack, gameConfig } = context;
        
        let nextPhase = '';
        let shouldEndTurn = false;
        let combatUpdates = {}; // Almacena cambios ocurridos en el combate (daño/puntos)

        if (gameState.phase === 'response') {
            // CORRECCIÓN: Capturamos los datos actualizados (puntos, daño) en lugar de dejar que la función intente guardar el estado sola
            combatUpdates = GameActions.resolveCombatPhase(context);
            nextPhase = 'main';
            sendLog("Fase Principal iniciada.");
        } 
        else if (gameState.phase === 'main') {
            shouldEndTurn = true;
        }

        if (shouldEndTurn) {
            const myId = gameState.myPlayerId;
            const opId = myId === 0 ? 1 : 0;
            
            // Si es IA, activamos la IA
            if (gameConfig && gameConfig.mode === 'ai') {
                setGameState(prev => ({ 
                    ...prev, 
                    turn: opId, 
                    phase: 'waiting',
                    incomingStack: [], // Limpiamos incoming local
                    outgoingStack: prev.outgoingStack // Esto será el incoming de la IA
                }));
                addLog("Fin del turno. IA pensando...");
                
                // En modo IA, el incomingStack de la IA se coge del outgoingStack global en el siguiente tick
                // Pasamos el turno a la IA:
                GameAI.runAiTurn({ ...context, gameState: { ...gameState, incomingStack: gameState.outgoingStack } });

            } else {
                // Modo Online
                const payload = {
                    turn: opId,
                    incomingStack: gameState.outgoingStack
                };
                if(conn) conn.send({ type: 'pass_turn', payload });
                setGameState(prev => ({ ...prev, turn: opId, phase: 'waiting' }));
                sendLog("Fin del turno. Acciones enviadas.");
            }

        } else {
            // CORRECCIÓN: Fusionamos gameState actual + combatUpdates (puntos/daño) + nextPhase
            const newState = { ...gameState, ...combatUpdates, phase: nextPhase };
            setGameState(newState);
            if (gameConfig?.mode !== 'ai') sendStateUpdate(newState);
        }
    },

    playCard: (cardIndex, context) => {
        const { gameState, setGameState, sendStateUpdate, addLog, gameConfig } = context;
        const me = gameState.players[gameState.myPlayerId];
        const card = me.hand[cardIndex];

        if (gameState.phase !== 'main') { addLog("Solo en Fase Principal."); return; }
        if (me.energy < card.cost) { addLog("Energía insuficiente."); return; }
        
        // MODIFICACIÓN: Eliminado el límite de 5 cartas
        // if (me.field.length >= 5) { addLog("Campo lleno."); return; }

        const newPlayers = [...gameState.players];
        const player = newPlayers[gameState.myPlayerId];

        player.energy -= card.cost;
        player.hand.splice(cardIndex, 1);
        
        const unit = { ...card, currentHp: card.maxHp, uuid: card.uuid || (Date.now() + Math.random()) };
        player.field.push(unit);

        const newState = { ...gameState, players: newPlayers };
        setGameState(newState);
        if (gameConfig?.mode !== 'ai') sendStateUpdate(newState);
    },

    useAbility: (cardUuid, abilityId, context) => {
        const { gameState, setGameState, sendStateUpdate, addLog, gameConfig } = context;
        const myId = gameState.myPlayerId;
        const me = gameState.players[myId];
        
        const cardIndex = me.field.findIndex(c => c.uuid === cardUuid);
        if (cardIndex === -1) return;
        const card = me.field[cardIndex];
        const ability = card.abilities.find(a => a.id === abilityId);

        if (!ability) return;
        if (card.isFrozen) { addLog(`${card.name} ya actuó.`); return; }
        if (me.energy < ability.cost) { addLog("Sin energía."); return; }

        const isMainPhaseAbility = ability.type === 'preparation' || ability.type === 'interaction';
        if (isMainPhaseAbility && gameState.phase !== 'main') { addLog("Solo Fase Principal."); return; }
        if (ability.type === 'response' && gameState.phase !== 'response') { addLog("Solo Fase Respuesta."); return; }
        
        const newPlayers = [...gameState.players];
        const player = newPlayers[myId];
        const fieldCard = player.field[cardIndex];

        player.energy -= ability.cost;

        if (ability.type === 'preparation') {
            if (ability.id === 'meditate') fieldCard.currentHp = Math.min(fieldCard.maxHp, fieldCard.currentHp + 50);
            if (ability.id === 'grow') { fieldCard.strength += 10; fieldCard.intelligence += 10; fieldCard.power += 10; }
            addLog(`${card.name} usó ${ability.name}.`);
        } 
        else if (ability.type === 'interaction') {
            fieldCard.isFrozen = true;
            const action = {
                sourceCardName: card.name,
                sourceCardUuid: card.uuid, 
                sourceStats: GameActions.getCombatPower(card),
                abilityName: ability.name,
                uuid: Date.now() + Math.random()
            };
            setGameState(prev => ({ ...prev, outgoingStack: [...prev.outgoingStack, action], players: newPlayers }));
            addLog(`${card.name} prepara ${ability.name}.`);
        }
        else if (ability.type === 'response') {
            const unblockedAction = gameState.incomingStack.find(a => !a.blockerUuid);
            if (unblockedAction) {
                GameActions.assignDefender(unblockedAction.uuid, card.uuid, context);
            } else {
                addLog("Nada que bloquear.");
                player.energy += ability.cost; 
                return; 
            }
        }

        if (ability.type !== 'interaction') { 
            setGameState(prev => ({ ...prev, players: newPlayers }));
        }
        
        if (gameConfig?.mode !== 'ai') sendStateUpdate({ ...gameState, players: newPlayers });
    },

    assignDefender: (actionUuid, blockerCardUuid, context) => {
        const { gameState, setGameState, addLog } = context;
        if (gameState.phase !== 'response') return;

        const myId = gameState.myPlayerId;
        const me = gameState.players[myId];
        const blocker = me.field.find(c => c.uuid === blockerCardUuid);

        if (!blocker || blocker.isFrozen) return;

        setGameState(prev => {
            const newPlayers = [...prev.players];
            const myPlayer = newPlayers[myId];
            const fieldCard = myPlayer.field.find(c => c.uuid === blockerCardUuid);
            
            if (fieldCard) {
                fieldCard.isFrozen = true;
                addLog(`${fieldCard.name} defiende.`);
            }

            const newIncoming = prev.incomingStack.map(action => {
                if (action.blockerUuid === blockerCardUuid) return { ...action, blockerUuid: null };
                if (action.uuid === actionUuid) return { ...action, blockerUuid: blockerCardUuid };
                return action;
            });

            return { ...prev, incomingStack: newIncoming, players: newPlayers };
        });
    },

    resolveCombatPhase: (context) => {
        const { gameState, setGameState, addLog, onBack, conn, gameConfig } = context;
        
        // CORRECCIÓN: Usamos 'turn' para identificar quién está defendiendo (Fase Respuesta).
        const defenderId = gameState.turn; 
        
        // Clonamos players
        const newPlayers = JSON.parse(JSON.stringify(gameState.players));
        const defender = newPlayers[defenderId];
        
        // El atacante es el opuesto al defensor
        const attackerId = defenderId === 0 ? 1 : 0;
        
        // Procesar combates
        gameState.incomingStack.forEach(action => {
            const attackPower = action.sourceStats;
            
            if (action.blockerUuid) {
                const blockerIndex = defender.field.findIndex(c => c.uuid === action.blockerUuid);
                if (blockerIndex !== -1) {
                    const blocker = defender.field[blockerIndex];
                    const defensePower = GameActions.getCombatPower(blocker);
                    
                    addLog(`Choque: ${action.sourceCardName} (${attackPower}) vs ${blocker.name} (${defensePower})`);
                    const diff = attackPower - defensePower;

                    if (diff > 0) {
                        blocker.currentHp -= diff;
                        addLog(`${blocker.name} recibe ${diff} daño.`);
                    } else if (diff < 0) {
                        const reflectDamage = Math.abs(diff);
                        addLog(`¡${blocker.name} gana! Devuelve ${reflectDamage} daño.`);
                        
                        // DAÑO DE VUELTA:
                        if (gameConfig && gameConfig.mode === 'ai') {
                             // Aplicar daño a la carta del atacante (Rival o Humano según el caso)
                             const attackerPlayer = newPlayers[attackerId];
                             const attackerCard = attackerPlayer.field.find(c => c.uuid === action.sourceCardUuid);
                             if (attackerCard) {
                                 attackerCard.currentHp -= reflectDamage;
                                 if (attackerCard.currentHp <= 0) {
                                     attackerPlayer.field = attackerPlayer.field.filter(c => c.uuid !== action.sourceCardUuid);
                                 }
                             }
                        } else if (conn) {
                            // En modo online, el que ejecuta esto es el defensor, así que envía reporte
                            conn.send({ 
                                type: 'DAMAGE_REPORT', 
                                payload: { targetUuid: action.sourceCardUuid, targetName: action.sourceCardName, damage: reflectDamage } 
                            });
                        }

                    } else {
                        addLog("Empate. Sin daño.");
                    }

                    if (blocker.currentHp <= 0) {
                        addLog(`${blocker.name} ha muerto.`);
                        defender.field.splice(blockerIndex, 1);
                        defender.retirement.push(blocker);
                    }
                }
            } else {
                addLog(`¡Impacto! ${action.sourceCardName} golpea directo.`);
                // El atacante gana punto
                newPlayers[attackerId].points += 1; 
            }
        });

        // Chequeo de Victoria (Usamos IDs locales para mostrar mensajes correctos)
        const myId = gameState.myPlayerId;
        const opId = myId === 0 ? 1 : 0;
        
        if (newPlayers[opId].points >= 30) {
            alert(gameConfig?.mode === 'ai' ? "DERROTA. La IA ha ganado." : "EL RIVAL HA ALCANZADO 30 PUNTOS. DERROTA.");
            if (conn) conn.send({ type: 'GAME_OVER', payload: { winner: opId } });
            onBack();
        } else if (newPlayers[myId].points >= 30) {
            alert("¡VICTORIA! Has alcanzado 30 Puntos.");
            if (conn) conn.send({ type: 'GAME_OVER', payload: { winner: myId } });
            onBack();
        }

        // CORRECCIÓN FINAL: Devolvemos los cambios en lugar de setGameState para evitar sobrescritura en advancePhase
        return {
            players: newPlayers,
            incomingStack: []
        };
    }
};