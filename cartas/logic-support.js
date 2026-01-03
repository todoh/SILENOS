 // --- LÓGICA DE SOPORTE Y CURACIÓN SELECTIVA --- // Guardar como: Cartas Silen/logic-support.js

window.GameLogicSupport = { resolveSupportAbility: (targetUuid, context) => { const { gameState, setGameState, sendStateUpdate, addLog, gameConfig, targetingData, setTargetingData, conn } = context;

    if (!targetingData) return;

    const { sourceUuid, abilityId, cost, abilityName } = targetingData;
    const myId = gameState.myPlayerId;

    // Clonamos estado completo
    const newPlayers = JSON.parse(JSON.stringify(gameState.players));
    const me = newPlayers[myId];

    // 1. Buscar carta origen (la que lanza el hechizo)
    const sourceCard = me.field.find(c => c.uuid === sourceUuid);
    if (!sourceCard) { setTargetingData(null); return; }

    // 2. Buscar carta objetivo (en TU propio campo)
    const targetIndex = me.field.findIndex(c => c.uuid === targetUuid);
    if (targetIndex === -1) {
        addLog("Debes seleccionar un aliado válido.");
        return; // No cancelamos, dejamos que intente de nuevo
    }
    const targetCard = me.field[targetIndex];

    // 3. Validar Energía
    if (me.energy < cost) { 
        addLog("Energía insuficiente."); 
        setTargetingData(null); 
        return; 
    }

    // 4. Cobrar y Agotar origen
    me.energy -= cost;
    sourceCard.isFrozen = true;

    // 5. OBTENER METADATOS DE LA HABILIDAD
    const metaHandler = window.AbilityLibrary?.interactions[abilityId];
    let meta = {};
    if (metaHandler) {
        meta = metaHandler(sourceCard);
    }

    // --- APLICAR EFECTOS ---
    const amount = meta.amount || sourceCard.intelligence || 10;
    
    if (meta.effectType === 'heal') {
        const oldHp = targetCard.currentHp;
        targetCard.currentHp = Math.min(targetCard.maxHp, targetCard.currentHp + amount);
        const healed = targetCard.currentHp - oldHp;
        addLog(`${sourceCard.name} cura a ${targetCard.name} (+${healed} HP).`);
    } 
    else if (meta.effectType === 'buff') {
        // Ejemplo de buff genérico definido en metadata
        if (meta.buffStats) {
            if(meta.buffStats.strength) targetCard.strength = (targetCard.strength || 0) + meta.buffStats.strength;
            if(meta.buffStats.intelligence) targetCard.intelligence = (targetCard.intelligence || 0) + meta.buffStats.intelligence;
            if(meta.buffStats.power) targetCard.power = (targetCard.power || 0) + meta.buffStats.power;
            
            addLog(`${sourceCard.name} potencia a ${targetCard.name}.`);
        }
    }

    // Efecto visual en red (opcional, reportamos como log)
    if (conn && gameConfig?.mode !== 'ai') {
        conn.send({ 
            type: 'LOG_MSG', 
            payload: { msg: `El rival usó ${abilityName} sobre sus tropas.` } 
        });
    }

    // GUARDAR Y LIMPIAR
    setTargetingData(null); 
    setGameState({ ...gameState, players: newPlayers });
    
    if (gameConfig?.mode !== 'ai') {
        sendStateUpdate({ ...gameState, players: newPlayers });
    }
}
};  