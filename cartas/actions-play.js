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
        const card = me.field[cardIndex]; 
        const ability = card.abilities.find(a => a.id === abilityId);

        if (!ability) return;
        if (card.isFrozen) { addLog(`${card.name} ya actuó.`); return; }
        if (me.energy < ability.cost) { addLog("Sin energía."); return; }

        const isOffensive = ability.type === 'preparation' || ability.type === 'interaction';
        if (isOffensive && gameState.phase !== 'main') { addLog("Solo Fase Principal."); return; }
        if (ability.type === 'response' && gameState.phase !== 'response') { addLog("Solo Fase Respuesta."); return; }

        const newPlayers = [...gameState.players];
        const player = newPlayers[myId];
        const fieldCard = player.field[cardIndex]; 

        if (ability.type === 'interaction') {
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
            else {
                const metaHandler = window.AbilityLibrary?.interactions[abilityId];
                const meta = metaHandler ? metaHandler(card) : {};
                const targetScope = meta.targetScope || 'enemy'; 

                if (targetScope === 'enemy' && opponent.field.length === 0) {
                    addLog("¡No hay enemigos para seleccionar!");
                    return;
                }
                
                addLog(`Selecciona OBJETIVO (${targetScope === 'ally' ? 'ALIADO' : 'ENEMIGO'}) para ${ability.name}.`);
                
                setTargetingData({
                    sourceUuid: cardUuid,
                    abilityId: abilityId,
                    cost: ability.cost,
                    abilityName: ability.name,
                    targetScope: targetScope 
                });
                return; 
            }
        }

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

    resolveTargetedAbility: (targetUuid, context) => {
        const { targetingData, setTargetingData, addLog } = context;
        
        if (!targetingData) return;

        if (targetingData.targetScope === 'ally') {
            if (window.GameLogicSupport) {
                window.GameLogicSupport.resolveSupportAbility(targetUuid, context);
            }
            return;
        }

        const { gameState, setGameState, sendStateUpdate, conn, gameConfig } = context;
        const { sourceUuid, abilityId, cost, abilityName } = targetingData;
        const myId = gameState.myPlayerId;
        const opId = myId === 0 ? 1 : 0;

        const newPlayers = JSON.parse(JSON.stringify(gameState.players));
        const me = newPlayers[myId];
        const opponent = newPlayers[opId];

        const sourceCard = me.field.find(c => c.uuid === sourceUuid);
        if (!sourceCard) { setTargetingData(null); return; }

        if (me.energy < cost) { addLog("Energía insuficiente."); setTargetingData(null); return; }

        me.energy -= cost;
        sourceCard.isFrozen = true;

        const metaHandler = window.AbilityLibrary?.interactions[abilityId];
        let meta = {};
        if (metaHandler) {
            meta = metaHandler(sourceCard);
        }
        
        // El daño escala con SATK en lugar de INT, pero podemos tener un valor base de habilidad
        const baseDamage = meta.damageValue || sourceCard.specialAttack || 10;
        const isAOE = meta.effectType === 'aoe_damage';

        if (isAOE) {
            let hits = 0;
            for (let i = opponent.field.length - 1; i >= 0; i--) {
                const unit = opponent.field[i];
                const sdef = unit.specialDefense || 0;
                const netDmg = Math.max(0, baseDamage - sdef);

                unit.currentHp -= netDmg;
                hits++;
                if (conn) {
                    conn.send({ type: 'DAMAGE_REPORT', payload: { targetUuid: unit.uuid, targetName: unit.name, damage: netDmg } });
                }
                if (unit.currentHp <= 0) {
                    addLog(`¡${unit.name} fue arrasado por el área!`);
                    opponent.field.splice(i, 1);
                    opponent.retirement.push(unit);
                }
            }
            addLog(`${sourceCard.name} usa ${abilityName}: Daña a ${hits} enemigos.`);

        } else {
            const targetIndex = opponent.field.findIndex(c => c.uuid === targetUuid);
            if (targetIndex !== -1) {
                const targetCard = opponent.field[targetIndex];
                const sdef = targetCard.specialDefense || 0;
                const netDmg = Math.max(0, baseDamage - sdef);

                targetCard.currentHp -= netDmg;
                addLog(`${sourceCard.name} ataca mágico a ${targetCard.name} (mitiga ${sdef}): Recibe -${netDmg} HP.`);
                
                if (targetCard.currentHp <= 0) {
                    addLog(`¡${targetCard.name} eliminado!`);
                    opponent.field.splice(targetIndex, 1);
                    opponent.retirement.push(targetCard);
                }
                if (conn) {
                    conn.send({ type: 'DAMAGE_REPORT', payload: { targetUuid: targetUuid, targetName: targetCard.name, damage: netDmg } });
                }
            } else {
                addLog("Objetivo no válido.");
                me.energy += cost; 
                sourceCard.isFrozen = false;
            }
        }

        setTargetingData(null); 
        setGameState({ ...gameState, players: newPlayers });
        if (gameConfig?.mode !== 'ai') {
            sendStateUpdate({ ...gameState, players: newPlayers });
        }
    }
};