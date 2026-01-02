// --- INTELIGENCIA ARTIFICIAL (LÓGICA DE LA MÁQUINA) ---
// Guardar como: Cartas Silen/game-ai.js

window.GameAI = {
    AI_PLAYER_ID: 1,
    
    runAiTurn: async (context) => {
        // Obtenemos gameState del context porque ahí vienen los ataques inyectados (incomingStack)
        // desde actions-turn.js, antes de que el estado global se limpiara.
        const { setGameState, addLog, gameState } = context;
        
        // Simular pensamiento
        await new Promise(r => setTimeout(r, 1500));

        // 1. INICIO DE TURNO (Robar carta, Energía)
        setGameState(prev => {
            const ai = { ...prev.players[window.GameAI.AI_PLAYER_ID] };
            
            const nextTurnCount = prev.turnCount + 1;
            const newEnergyCap = Math.min(100, nextTurnCount * 10);
            
            ai.maxEnergy = newEnergyCap;
            ai.energy = newEnergyCap;

            // Robar carta
            if(ai.deck.length > 0) {
                const card = ai.deck.shift();
                card.currentHp = card.maxHp;
                card.isFrozen = false;
                if(!card.uuid) card.uuid = Date.now() + Math.random();
                ai.hand.push(card);
            }

            // Descongelar campo (SOLO al inicio del turno absoluto)
            // IMPORTANTE: Usamos .map para crear nuevas referencias y no mutar el estado anterior
            ai.field = ai.field.map(u => ({ ...u, isFrozen: false }));

            // CORRECCIÓN: Usamos el incomingStack pasado por contexto (los ataques del jugador)
            // Si usamos prev.incomingStack aquí, estaría vacío porque se limpia al cambiar de turno.
            const incomingAttacks = gameState.incomingStack || [];
            const hasIncoming = incomingAttacks.length > 0;
            const initialPhase = hasIncoming ? 'response' : 'main';

            const newPlayers = [...prev.players];
            newPlayers[window.GameAI.AI_PLAYER_ID] = ai;

            addLog(`[IA] Inicia turno (Fase: ${initialPhase === 'response' ? 'Defensa' : 'Ataque'}).`);

            return {
                ...prev,
                turn: window.GameAI.AI_PLAYER_ID,
                turnCount: nextTurnCount,
                phase: initialPhase,
                // Restauramos los ataques en el estado para que handleDefense pueda leerlos
                incomingStack: incomingAttacks, 
                outgoingStack: [], 
                players: newPlayers
            };
        });

        await new Promise(r => setTimeout(r, 500));

        // Ejecutar lógica
        window.GameAI.decideNextMove(context);
    },

    decideNextMove: async (context) => {
        setTimeout(async () => {
            // Usamos el updater de setGameState para obtener el estado más reciente de forma segura
            context.setGameState(current => {
                // Ejecutamos la lógica basada en la fase actual
                window.GameAI.executePhaseLogic(current, context);
                return current; // No modificamos el estado aquí, solo leemos
            });
        }, 500);
    },

    executePhaseLogic: async (gameState, context) => {
        if (gameState.phase === 'response') {
            await window.GameAI.handleDefense(gameState, context);
        } else if (gameState.phase === 'main') {
            await window.GameAI.handleMainPhase(gameState, context);
        }
    },

    // LÓGICA DE DEFENSA
    handleDefense: async (currentState, context) => {
        const { setGameState, addLog } = context;
        
        // Clonación profunda para no perder referencias y asegurar persistencia de isFrozen
        let newPlayers = JSON.parse(JSON.stringify(currentState.players));
        const aiPlayer = newPlayers[window.GameAI.AI_PLAYER_ID];
        const incoming = currentState.incomingStack || [];
        
        // Filtramos solo los que NO están congelados para defender
        let availableBlockers = aiPlayer.field.filter(c => !c.isFrozen);

        if (aiPlayer.field.length === 0) {
            addLog("[IA] Campo vacío. Recibirá daño directo.");
        }

        const newIncoming = incoming.map(attack => {
            if (availableBlockers.length === 0) return attack;

            // Lógica simple: Buscar quien sobreviva o el más barato
            let bestBlocker = availableBlockers.find(b => {
                const strength = (b.strength || 0);
                return b.currentHp > attack.sourceStats && strength >= attack.sourceStats;
            });

            if (!bestBlocker) {
                bestBlocker = availableBlockers.sort((a,b) => a.cost - b.cost)[0];
            }

            if (bestBlocker) {
                // IMPORTANTE: Marcar como usado (isFrozen) en el array principal
                const fieldIndex = aiPlayer.field.findIndex(c => c.uuid === bestBlocker.uuid);
                if (fieldIndex !== -1) {
                    aiPlayer.field[fieldIndex].isFrozen = true; 
                    addLog(`[IA] ${aiPlayer.field[fieldIndex].name} defiende y se agota.`);
                }

                // Quitar de disponibles para este mismo turno de defensa
                availableBlockers = availableBlockers.filter(b => b.uuid !== bestBlocker.uuid);
                
                return { ...attack, blockerUuid: bestBlocker.uuid };
            }

            return attack;
        });

        // 1. Aplicar la defensa y congelar cartas
        await new Promise(resolve => {
            setGameState(prev => ({
                ...prev,
                incomingStack: newIncoming,
                players: newPlayers 
            }));
            setTimeout(resolve, 1000); 
        });

        // 2. Resolver combate y pasar a Main
        setGameState(current => {
            // current ya debe tener las cartas congeladas del paso anterior
            const combatUpdates = window.GameActions.resolveCombatPhase({ ...context, gameState: current });
            
            addLog("[IA] Fase Principal iniciada.");
            setTimeout(() => window.GameAI.decideNextMove(context), 1000);

            return { 
                ...current, 
                ...combatUpdates, 
                phase: 'main' 
            };
        });
    },

    // LÓGICA DE FASE PRINCIPAL
    handleMainPhase: async (currentState, context) => {
        const { setGameState, addLog } = context;
        
        // Intentar jugar cartas de la mano
        const tryPlayCard = async () => {
            let playedSomething = false;
            
            await new Promise(resolve => {
                setGameState(prev => {
                    const ai = prev.players[window.GameAI.AI_PLAYER_ID];
                    
                    const playableIndex = ai.hand.findIndex(c => c.cost <= ai.energy);

                    if (playableIndex !== -1) {
                        const card = ai.hand[playableIndex];
                        // Clonamos el jugador para no mutar estado previo incorrectamente
                        const newAi = JSON.parse(JSON.stringify(ai));
                        
                        newAi.energy -= card.cost;
                        newAi.hand.splice(playableIndex, 1);
                        
                        // La carta nueva entra fresca
                        const unit = { ...card, currentHp: card.maxHp, uuid: Date.now() + Math.random(), isFrozen: false };
                        newAi.field.push(unit);
                        
                        const newPlayers = [...prev.players];
                        newPlayers[window.GameAI.AI_PLAYER_ID] = newAi;
                        
                        addLog(`[IA] Juega ${unit.name}.`);
                        playedSomething = true;
                        
                        return { ...prev, players: newPlayers };
                    }
                    return prev;
                });
                setTimeout(resolve, 1000);
            });

            if (playedSomething) await tryPlayCard(); 
        };

        await tryPlayCard();

        // Intentar atacar con lo que quede en mesa
        await new Promise(resolve => {
            setGameState(prev => {
                const ai = prev.players[window.GameAI.AI_PLAYER_ID];
                // Clonamos campo para asegurar inmutabilidad
                const newAi = { ...ai, field: ai.field.map(u => ({...u})) };
                const outgoing = [...prev.outgoingStack];
                
                newAi.field.forEach(unit => {
                    // VERIFICACIÓN ESTRICTA: Si defendió, debe estar frozen y NO atacar.
                    if (unit.isFrozen) return;

                    const attackAbility = unit.abilities.find(a => a.type === 'interaction');
                    
                    if (attackAbility && newAi.energy >= attackAbility.cost) { 
                        newAi.energy -= attackAbility.cost;
                        unit.isFrozen = true; 

                        const combatStrength = (unit.strength || 0);
                        const potentialPoints = (unit.power || 0);
                        
                        outgoing.push({
                            sourceCardName: unit.name,
                            sourceCardUuid: unit.uuid,
                            sourceStats: combatStrength,
                            sourcePoints: potentialPoints,
                            abilityName: attackAbility.name,
                            uuid: Date.now() + Math.random()
                        });
                        addLog(`[IA] ${unit.name} ataca.`);
                    }
                });

                const newPlayers = [...prev.players];
                newPlayers[window.GameAI.AI_PLAYER_ID] = newAi;

                return { ...prev, players: newPlayers, outgoingStack: outgoing };
            });
            setTimeout(resolve, 1000);
        });

        addLog("[IA] Fin de turno. Enviando ataques...");
        
        setGameState(prev => {
            return {
                ...prev,
                turn: 0, 
                phase: prev.outgoingStack.length > 0 ? 'response' : 'main',
                incomingStack: prev.outgoingStack, 
                outgoingStack: [],
                turnCount: prev.turnCount
            };
        });

        setTimeout(() => {
             window.GameActions.startTurn(context);
        }, 500);
    }
};