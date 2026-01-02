// --- INTELIGENCIA ARTIFICIAL (LÓGICA DE LA MÁQUINA) ---
// Guardar como: Cartas Silen/game-ai.js

const GameAI = {
    // Configuración básica de la IA
    AI_PLAYER_ID: 1,
    
    // Iniciar turno de la IA
    runAiTurn: async (context) => {
        const { setGameState, addLog, gameConfig } = context;
        
        // Simular tiempo de "pensar"
        await new Promise(r => setTimeout(r, 1500));

        // 1. INICIO DE TURNO (Robar carta, Energía)
        setGameState(prev => {
            const ai = { ...prev.players[GameAI.AI_PLAYER_ID] };
            
            // Aumentar turno global y energía
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

            // Descongelar campo
            ai.field.forEach(u => u.isFrozen = false);

            // Determinar fase: Si el jugador humano mandó ataques (outgoingStack del humano -> incomingStack de la IA)
            // En el estado global, incomingStack son los ataques que RECIBE el turno actual.
            // Si es turno de la IA, incomingStack tiene los ataques del Humano.
            const hasIncoming = prev.incomingStack && prev.incomingStack.length > 0;
            const initialPhase = hasIncoming ? 'response' : 'main';

            const newPlayers = [...prev.players];
            newPlayers[GameAI.AI_PLAYER_ID] = ai;

            addLog(`[IA] Inicia turno (Fase: ${initialPhase === 'response' ? 'Defensa' : 'Ataque'}).`);

            return {
                ...prev,
                turn: GameAI.AI_PLAYER_ID,
                turnCount: nextTurnCount,
                phase: initialPhase,
                outgoingStack: [], 
                players: newPlayers
            };
        });

        // Dar un momento para que se actualice el estado
        await new Promise(r => setTimeout(r, 500));

        // Ejecutar lógica según fase
        // Nota: Leemos el estado actualizado pasando una función al siguiente paso o accediendo via context si fuera ref, 
        // pero aquí encadenaremos lógica basada en la predicción de fase.
        
        // Acceder al estado más reciente requiere un pequeño hack o pasar la función
        // Para simplificar en React funcional, llamaremos a las funciones de decisión.
        GameAI.decideNextMove(context);
    },

    decideNextMove: async (context) => {
        // Necesitamos leer el estado actual del contexto, pero como setGameState es asíncrono,
        // usamos un setTimeout breve para asegurar lectura fresca o usamos la referencia.
        // En esta arquitectura, pasamos a la siguiente fase de ejecución.
        
        setTimeout(async () => {
            const state = context.gameState; // Esto podría estar desactualizado en closures antiguos, cuidado.
            // Para garantizar, usamos el setter para leer el estado actual y decidir.
            
            context.setGameState(current => {
                GameAI.executePhaseLogic(current, context);
                return current; // No modificamos aquí, solo leemos para ejecutar
            });
        }, 500);
    },

    executePhaseLogic: async (gameState, context) => {
        const ai = gameState.players[GameAI.AI_PLAYER_ID];
        const human = gameState.players[0];

        if (gameState.phase === 'response') {
            await GameAI.handleDefense(gameState, context);
        } else if (gameState.phase === 'main') {
            await GameAI.handleMainPhase(gameState, context);
        }
    },

    // LÓGICA DE DEFENSA
    handleDefense: async (currentState, context) => {
        const { setGameState, addLog } = context;
        const ai = currentState.players[GameAI.AI_PLAYER_ID];
        const incoming = currentState.incomingStack || [];
        
        // Estrategia simple: Bloquear ataques que maten o hagan mucho daño
        let assignedBlockers = [];

        // Clonamos para simular
        let availableBlockers = ai.field.filter(c => !c.isFrozen);

        const newIncoming = incoming.map(attack => {
            // Si ya no tengo bloqueadores, pasa el daño
            if (availableBlockers.length === 0) return attack;

            // Buscar el mejor bloqueador (el que tenga HP > ataque o el más débil para sacrificar)
            // 1. Intentar sobrevivir y matar atacante
            let bestBlocker = availableBlockers.find(b => {
                const power = (b.power || 0) + (b.strength || 0) + (b.intelligence || 0);
                return b.currentHp > attack.sourceStats && power >= attack.sourceStats;
            });

            // 2. Si no, sacrificar el más débil para evitar daño al jugador
            if (!bestBlocker) {
                bestBlocker = availableBlockers.sort((a,b) => a.cost - b.cost)[0];
            }

            if (bestBlocker) {
                // Marcar como usado
                availableBlockers = availableBlockers.filter(b => b.uuid !== bestBlocker.uuid);
                addLog(`[IA] ${bestBlocker.name} bloquea a ${attack.sourceCardName}.`);
                return { ...attack, blockerUuid: bestBlocker.uuid };
            }

            return attack;
        });

        // Aplicar bloqueos
        await new Promise(r => setTimeout(r, 1000));
        
        setGameState(prev => ({
            ...prev,
            incomingStack: newIncoming
        }));

        // Resolver combate
        setTimeout(() => {
            // CORRECCIÓN IA: Recibir updates del combate y aplicarlos manualmente
            const combatUpdates = GameActions.resolveCombatPhase(context);
            
            // Forzamos avance de fase de la IA aplicando updates
            context.setGameState(prev => ({ 
                ...prev, 
                ...combatUpdates,
                phase: 'main' 
            }));
            
            addLog("[IA] Fase Principal iniciada.");
            
            // Ejecutar Fase Principal
            setTimeout(() => GameAI.decideNextMove(context), 1000);
        }, 1500);
    },

    // LÓGICA DE FASE PRINCIPAL (Jugar cartas y Atacar)
    handleMainPhase: async (currentState, context) => {
        const { setGameState, addLog } = context;
        
        // 1. Jugar cartas
        // Iteramos cartas en mano para ver cuáles jugar
        // Hacemos esto en pasos secuenciales visuales
        
        const tryPlayCard = async () => {
            let playedSomething = false;
            
            // Usamos un setter para obtener estado fresco y modificarlo atómicamente
            await new Promise(resolve => {
                setGameState(prev => {
                    const ai = prev.players[GameAI.AI_PLAYER_ID];
                    if (ai.field.length >= 5) return prev; // Campo lleno

                    // Buscar carta jugable (Coste <= Energía) - Prioriza las más caras que pueda pagar
                    const playableIndex = ai.hand.findIndex(c => c.cost <= ai.energy);

                    if (playableIndex !== -1) {
                        const card = ai.hand[playableIndex];
                        const newAi = { ...ai };
                        
                        newAi.energy -= card.cost;
                        const [playedCard] = newAi.hand.splice(playableIndex, 1);
                        
                        // Entrar al campo
                        const unit = { ...playedCard, currentHp: playedCard.maxHp, uuid: Date.now() + Math.random(), isFrozen: false };
                        newAi.field.push(unit);
                        
                        const newPlayers = [...prev.players];
                        newPlayers[GameAI.AI_PLAYER_ID] = newAi;
                        
                        addLog(`[IA] Juega ${unit.name}.`);
                        playedSomething = true;
                        
                        return { ...prev, players: newPlayers };
                    }
                    return prev;
                });
                setTimeout(resolve, 1000);
            });

            if (playedSomething) await tryPlayCard(); // Intentar jugar otra
        };

        await tryPlayCard();

        // 2. Usar Habilidades / Preparar Ataques
        await new Promise(resolve => {
            setGameState(prev => {
                const ai = prev.players[GameAI.AI_PLAYER_ID];
                const newAi = { ...ai };
                const outgoing = [...prev.outgoingStack];
                
                newAi.field.forEach(unit => {
                    if (unit.isFrozen) return;

                    // IA Simple: Si tiene habilidad de ataque (interaction), usarla siempre si hay energía.
                    // Si no tiene habilidad específica, atacar normal no gasta energía extra en este juego, 
                    // pero definimos ataques como habilidades 'interaction'.
                    
                    const attackAbility = unit.abilities.find(a => a.type === 'interaction');
                    
                    if (attackAbility && newAi.energy >= attackAbility.cost) {
                        newAi.energy -= attackAbility.cost;
                        unit.isFrozen = true;

                        const power = (unit.power || 0) + (unit.strength || 0) + (unit.intelligence || 0);
                        
                        outgoing.push({
                            sourceCardName: unit.name,
                            sourceCardUuid: unit.uuid,
                            sourceStats: power,
                            abilityName: attackAbility.name,
                            uuid: Date.now() + Math.random()
                        });
                        addLog(`[IA] ${unit.name} ataca.`);
                    }
                });

                const newPlayers = [...prev.players];
                newPlayers[GameAI.AI_PLAYER_ID] = newAi;

                return { ...prev, players: newPlayers, outgoingStack: outgoing };
            });
            setTimeout(resolve, 1000);
        });

        // 3. Terminar Turno (Pasar al Humano)
        addLog("[IA] Fin de turno. Enviando ataques...");
        
        setGameState(prev => {
            // Pasamos el outgoingStack de la IA al incomingStack del Humano
            // Y cambiamos el turno al 0
            return {
                ...prev,
                turn: 0,
                phase: prev.outgoingStack.length > 0 ? 'response' : 'main', // Si IA ataca, humano responde
                incomingStack: prev.outgoingStack, // Lo que IA envió
                outgoingStack: [],
                turnCount: prev.turnCount // El contador aumenta al inicio del turno de quien sea, en startTurn
            };
        });

        // Iniciar turno del Humano (Lógica local)
        setTimeout(() => {
             GameActions.startTurn(context);
        }, 500);
    }
};