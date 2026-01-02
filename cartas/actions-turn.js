// --- ACCIONES: GESTIÓN DE TURNOS ---
// Guardar como: Cartas Silen/actions-turn.js

window.GameActionsTurn = {
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
        let combatUpdates = {}; 

        if (gameState.phase === 'response') {
            // Nota: resolveCombatPhase estará disponible en window.GameActions una vez cargado todo
            combatUpdates = window.GameActions.resolveCombatPhase(context);
            nextPhase = 'main';
            sendLog("Fase Principal iniciada.");
        } 
        else if (gameState.phase === 'main') {
            shouldEndTurn = true;
        }

        if (shouldEndTurn) {
            const myId = gameState.myPlayerId;
            const opId = myId === 0 ? 1 : 0;
            
            if (gameConfig && gameConfig.mode === 'ai') {
                setGameState(prev => ({ 
                    ...prev, 
                    turn: opId, 
                    phase: 'waiting',
                    incomingStack: [], 
                    outgoingStack: prev.outgoingStack 
                }));
                addLog("Fin del turno. IA pensando...");
                
                // Llamamos a la IA usando window por seguridad
                if (window.GameAI) {
                    window.GameAI.runAiTurn({ ...context, gameState: { ...gameState, incomingStack: gameState.outgoingStack } });
                } else {
                    console.error("GameAI no está definido");
                }

            } else {
                const payload = {
                    turn: opId,
                    incomingStack: gameState.outgoingStack
                };
                if(conn) conn.send({ type: 'pass_turn', payload });
                setGameState(prev => ({ ...prev, turn: opId, phase: 'waiting' }));
                sendLog("Fin del turno. Acciones enviadas.");
            }

        } else {
            const newState = { ...gameState, ...combatUpdates, phase: nextPhase };
            setGameState(newState);
            if (gameConfig?.mode !== 'ai') sendStateUpdate(newState);
        }
    }
};