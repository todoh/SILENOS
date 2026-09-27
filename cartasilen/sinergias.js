/* -------------------------------------------------------------------------- */
/*            SISTEMA DE SINERGIAS POR POSICI N Y AURAS DIN MICAS            */
/* -------------------------------------------------------------------------- */

function recalculatePositionAuras(playerKey) {
    const player = state.battle ? state.battle[playerKey] : null;
    if (!player) return;
    
    // Asegurar existencia de array tras sincronización con Firebase
    player.entities = player.entities || [];

    // Resetear bonos dinamicos de auras
    player.entities.forEach(e => {
        e.auraBonusAtk = 0;
        e.auraBonusShield = 0;
    });

    // Calcular bonos basados en la posicion de cada entidad en la linea
    const len = player.entities.length;
    for (let i = 0; i < len; i++) {
        const ent = player.entities[i];
        if (ent && ent.positionAura) {
            const { adjacentBonusAtk = 0, adjacentBonusShield = 0 } = ent.positionAura;
            // Entidad a la izquierda
            if (i > 0 && player.entities[i - 1]) {
                player.entities[i - 1].auraBonusAtk = (player.entities[i - 1].auraBonusAtk || 0) + adjacentBonusAtk;
                player.entities[i - 1].auraBonusShield = (player.entities[i - 1].auraBonusShield || 0) + adjacentBonusShield;
            }
            // Entidad a la derecha
            if (i < len - 1 && player.entities[i + 1]) {
                player.entities[i + 1].auraBonusAtk = (player.entities[i + 1].auraBonusAtk || 0) + adjacentBonusAtk;
                player.entities[i + 1].auraBonusShield = (player.entities[i + 1].auraBonusShield || 0) + adjacentBonusShield;
            }
        }
    }

    // Aplicar valores recalculados
    player.entities.forEach(e => {
        e.atk = (e.baseAtk || e.atk || 10) + (e.auraBonusAtk || 0);
    });
}

function reorderEntityToPosition(actorKey, fromIndex, toIndex) {
    if (state.battleStatus !== 'PLAYING' && state.battleStatus !== 'CPU_TURN') return;
    if (state.battle.turn !== actorKey) return;
        
    const actor = state.battle ? state.battle[actorKey] : null;
    if (!actor) return;
    actor.entities = actor.entities || [];

    if (fromIndex < 0 || fromIndex >= actor.entities.length) return;
    if (toIndex < 0 || toIndex >= actor.entities.length) return;
        
    const [movedEntity] = actor.entities.splice(fromIndex, 1);
    actor.entities.splice(toIndex, 0, movedEntity);
        
    recalculatePositionAuras(actorKey);
    state.battle.lastLog = `${actor.name} reposicion  a ${movedEntity.name}. Sinergias de posici n recalculadas.`;
    createFloatingText(actorKey, '  Aura Reorganizada', '#8b5cf6');
    updateBattleUI();
}

/* -------------------------------------------------------------------------- */
/*                   EVALUADOR DE SINERGIAS POR TIPO                          */
/* -------------------------------------------------------------------------- */

function calculateCardSynergyValue(card, playerKey) {
    let baseVal = card ? (card.val || 0) : 0;
    if (!card || !card.typeSynergy) return baseVal;

    const player = state.battle ? state.battle[playerKey] : null;
    if (!player) return baseVal;

    const entities = player.entities || [];
    const hand = player.hand || [];

    const { element, category, sameCategoryCount, bonusPerMatch = 0 } = card.typeSynergy;
    let matches = 0;

    // Coincidencias en el campo de batalla
    entities.forEach(e => {
        if (element && e.element === element) matches++;
        if (category && ELEMENT_INFO[e.element] && ELEMENT_INFO[e.element].category === category) matches++;
    });

    // Coincidencias en la mano
    hand.forEach(c => {
        if (c.uid !== card.uid) {
            if (element && c.element === element) matches++;
            if (category && ELEMENT_INFO[c.element] && ELEMENT_INFO[c.element].category === category) matches++;
        }
    });

    // Coincidencias por misma categoria
    if (sameCategoryCount) {
        const cardCat = ELEMENT_INFO[card.element]?.category;
        if (cardCat) {
            entities.forEach(e => {
                if (ELEMENT_INFO[e.element]?.category === cardCat) matches++;
            });
            hand.forEach(c => {
                if (c.uid !== card.uid && ELEMENT_INFO[c.element]?.category === cardCat) matches++;
            });
        }
    }

    return baseVal + (matches * bonusPerMatch);
}