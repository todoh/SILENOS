// --- ACCIONES: JUGAR CARTAS Y HABILIDADES ---
// Guardar como: Cartas Silen/actions-play.js

window.GameActionsPlay = {
    playCard: (cardIndex, context) => {
        const { gameState, setGameState, sendStateUpdate, addLog, gameConfig } = context;
        const me = gameState.players[gameState.myPlayerId];
        const card = me.hand[cardIndex];

        if (gameState.phase !== 'main') { addLog("Solo en Fase Principal."); return; }
        if (me.energy < card.cost) { addLog("Energía insuficiente."); return; }
        
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
        const { gameState, setGameState, sendStateUpdate, addLog, gameConfig, setTargetingData } = context;
        const myId = gameState.myPlayerId;
        const opId = myId === 0 ? 1 : 0;
        
        const me = gameState.players[myId];
        const opponent = gameState.players[opId];

        const cardIndex = me.field.findIndex(c => c.uuid === cardUuid);
        if (cardIndex === -1) return;
        const card = me.field[cardIndex]; // Referencia original
        const ability = card.abilities.find(a => a.id === abilityId);

        if (!ability) return;
        if (card.isFrozen) { addLog(`${card.name} ya actuó.`); return; }
        if (me.energy < ability.cost) { addLog("Sin energía."); return; }

        // Validar Fases
        const isOffensive = ability.type === 'preparation' || ability.type === 'interaction';
        if (isOffensive && gameState.phase !== 'main') { addLog("Solo Fase Principal."); return; }
        if (ability.type === 'response' && gameState.phase !== 'response') { addLog("Solo Fase Respuesta."); return; }

        // Clonamos para mutar estado
        const newPlayers = [...gameState.players];
        const player = newPlayers[myId];
        const fieldCard = player.field[cardIndex]; 

        // --- LÓGICA DIVIDIDA POR TIPO ---

        // TIPO 1: INTERACTION (Ofensivas)
        if (ability.type === 'interaction') {
            
            // CASO A: ATAQUE BÁSICO (ATK) -> SISTEMA CLÁSICO (STACK)
            if (ability.id === 'atk') {
                player.energy -= ability.cost;
                fieldCard.isFrozen = true;

                let actionPayload = {
                    sourceCardName: card.name,
                    sourceCardUuid: card.uuid,
                    sourceStats: window.GameActions.getCombatPower(card),
                    sourcePoints: (card.power || 0),
                    abilityName: ability.name,
                    uuid: Date.now() + Math.random()
                };
                
                const newState = { 
                    ...gameState, 
                    outgoingStack: [...gameState.outgoingStack, actionPayload], 
                    players: newPlayers 
                };

                setGameState(newState);
                addLog(`${card.name} prepara un ataque.`);
                if (gameConfig?.mode !== 'ai') sendStateUpdate(newState);
                return;
            }

            // CASO B: HABILIDAD ESPECIAL -> MODO APUNTADO
            else {
                if (opponent.field.length === 0) {
                    addLog("¡No hay enemigos para seleccionar!");
                    return;
                }

                addLog(`Selecciona OBJETIVO para ${ability.name}.`);
                setTargetingData({
                    sourceUuid: cardUuid,
                    abilityId: abilityId,
                    cost: ability.cost,
                    abilityName: ability.name
                });
                return; 
            }
        }

        // TIPO 2: PREPARATION (Buffs, Curas inmediatas)
        player.energy -= ability.cost;
        
        if (ability.type === 'preparation') {
            const handler = window.AbilityLibrary?.executions[abilityId];
            if (handler) {
                const msg = handler(fieldCard, context); 
                addLog(`${card.name} usó ${ability.name}: ${msg}.`);
            } else {
                addLog(`${card.name} usó ${ability.name} (Sin efecto).`);
            }
        } 
        
        // TIPO 3: RESPONSE (Defensas)
        else if (ability.type === 'response') {
            const unblockedAction = gameState.incomingStack.find(a => !a.blockerUuid);
            if (unblockedAction) {
                player.energy -= ability.cost; 
                window.GameActions.assignDefender(unblockedAction.uuid, card.uuid, context);
            } else {
                addLog("Nada que bloquear.");
                return; 
            }
        }

        setGameState(prev => ({ ...prev, players: newPlayers }));
        if (gameConfig?.mode !== 'ai') sendStateUpdate({ ...gameState, players: newPlayers });
    },

    // --- FUNCIÓN DE RESOLUCIÓN DE DAÑO (UPDATE: SOPORTE AOE) ---
    resolveTargetedAbility: (targetUuid, context) => {
        const { gameState, setGameState, sendStateUpdate, addLog, gameConfig, targetingData, setTargetingData, conn } = context;
        
        if (!targetingData) return;

        const { sourceUuid, abilityId, cost, abilityName } = targetingData;
        const myId = gameState.myPlayerId;
        const opId = myId === 0 ? 1 : 0;

        // Clonamos estado completo
        const newPlayers = JSON.parse(JSON.stringify(gameState.players));
        const me = newPlayers[myId];
        const opponent = newPlayers[opId];

        // Buscar carta origen
        const sourceCard = me.field.find(c => c.uuid === sourceUuid);
        if (!sourceCard) { setTargetingData(null); return; }

        // Validaciones finales
        if (me.energy < cost) { addLog("Energía insuficiente."); setTargetingData(null); return; }

        // Cobrar y Agotar
        me.energy -= cost;
        sourceCard.isFrozen = true;

        // OBTENER METADATOS DE LA HABILIDAD (Daño, Tipo, etc)
        const metaHandler = window.AbilityLibrary?.interactions[abilityId];
        let meta = {};
        if (metaHandler) {
            meta = metaHandler(sourceCard);
        }
        
        const damage = meta.damageValue || sourceCard.intelligence || 10;
        const isAOE = meta.effectType === 'aoe_damage'; // ¿Es daño de área?

        // --- LÓGICA DE DAÑO ---

        if (isAOE) {
            // CASO A: DAÑO DE ÁREA (MAREMOTO)
            // Golpeamos a TODOS los enemigos, ignorando a quién hiciste clic específicamente
            let hits = 0;
            
            // Iteramos al revés para poder borrar sin romper índices
            for (let i = opponent.field.length - 1; i >= 0; i--) {
                const unit = opponent.field[i];
                unit.currentHp -= damage;
                hits++;

                // Efecto visual de red
                if (conn) {
                    conn.send({ 
                        type: 'DAMAGE_REPORT', 
                        payload: { targetUuid: unit.uuid, targetName: unit.name, damage: damage } 
                    });
                }

                // Verificar Muerte
                if (unit.currentHp <= 0) {
                    addLog(`¡${unit.name} fue arrasado por el área!`);
                    opponent.field.splice(i, 1);
                    opponent.retirement.push(unit);
                }
            }
            
            addLog(`${sourceCard.name} usa ${abilityName}: Daña a ${hits} enemigos (-${damage} HP).`);

        } else {
            // CASO B: DAÑO A UN SOLO OBJETIVO (SINGLE TARGET)
            const targetIndex = opponent.field.findIndex(c => c.uuid === targetUuid);
            
            if (targetIndex !== -1) {
                const targetCard = opponent.field[targetIndex];
                
                targetCard.currentHp -= damage;
                addLog(`${sourceCard.name} usa ${abilityName} contra ${targetCard.name} (-${damage} HP).`);

                // Verificar Muerte
                if (targetCard.currentHp <= 0) {
                    addLog(`¡${targetCard.name} eliminado!`);
                    opponent.field.splice(targetIndex, 1);
                    opponent.retirement.push(targetCard);
                }
                
                if (conn) {
                    conn.send({ 
                        type: 'DAMAGE_REPORT', 
                        payload: { targetUuid: targetUuid, targetName: targetCard.name, damage: damage } 
                    });
                }
            } else {
                addLog("Objetivo no válido.");
                me.energy += cost; // Reembolso si falla (solo en single target)
                sourceCard.isFrozen = false;
            }
        }

        // GUARDAR Y LIMPIAR
        setTargetingData(null); 
        setGameState({ ...gameState, players: newPlayers });
        
        if (gameConfig?.mode !== 'ai') {
            sendStateUpdate({ ...gameState, players: newPlayers });
        }
    }
};