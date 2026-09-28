/* -------------------------------------------------------------------------- */
/*                          GLOBAL ENGINE STATE & CONFIG                      */
/* -------------------------------------------------------------------------- */
const MAX_HP = 1000;
const INITIAL_ENERGY = 1;
const MAX_ENERGY_CAP = 10;
const HAND_SIZE = 3;

let state = {
    activeScreen: 'home',
    difficulty: 'normal',
    isMultiplayer: false,
    decks: [
        { id: 'deck_default', name: 'Baraja Principal', cardIds: [...PRESET_BALANCED] }
    ],
    activeDeckId: 'deck_default',
    activeDeckCardIds: [...PRESET_BALANCED],
    deckFilter: 'ALL',
    show64Panel: false,
    turnCount: 1,
    battleStatus: 'IDLE',
    pendingTarget: null,
    battle: {
        turn: 'p1',
        lastLog: '¡Comienza el combate!',
        lastCardPlayed: null,
        p1: { name: 'Tú', avatar: '🧙‍♂️', hp: MAX_HP, maxHp: MAX_HP, energy: INITIAL_ENERGY, maxEnergy: INITIAL_ENERGY, shield: 0, boost: 1, statuses: [], deck: [], hand: [], discard: [], entities: [] },
        p2: { name: 'IA Rival', avatar: '🤖', hp: MAX_HP, maxHp: MAX_HP, energy: INITIAL_ENERGY, maxEnergy: INITIAL_ENERGY, shield: 0, boost: 1, statuses: [], deck: [], hand: [], discard: [], entities: [] }
    }
};

function getActiveDeck() {
    let deck = state.decks.find(d => d.id === state.activeDeckId);
    if (!deck && state.decks.length > 0) {
        deck = state.decks[0];
        state.activeDeckId = deck.id;
    }
    if (!deck) {
        deck = { id: 'deck_' + Date.now(), name: 'Baraja Principal', cardIds: [...PRESET_BALANCED] };
        state.decks = [deck];
        state.activeDeckId = deck.id;
    }
    state.activeDeckCardIds = deck.cardIds;
    return deck;
}

function loadSavedState() {
    try {
        const savedDecks = localStorage.getItem('duel_elemental_decks');
        const savedActiveId = localStorage.getItem('duel_elemental_active_deck_id');
        if (savedDecks) {
            const parsed = JSON.parse(savedDecks);
            if (Array.isArray(parsed) && parsed.length > 0) {
                state.decks = parsed;
            }
        } else {
            const savedOld = localStorage.getItem('duel_elemental_deck');
            if (savedOld) {
                const parsedOld = JSON.parse(savedOld);
                if (Array.isArray(parsedOld) && parsedOld.length >= 10 && parsedOld.length <= 20) {
                    state.decks = [{ id: 'deck_default', name: 'Baraja Principal', cardIds: parsedOld }];
                }
            }
        }
        if (savedActiveId && state.decks.some(d => d.id === savedActiveId)) {
            state.activeDeckId = savedActiveId;
        } else if (state.decks.length > 0) {
            state.activeDeckId = state.decks[0].id;
        }
        getActiveDeck();
    } catch (e) {
        console.error('Local Storage read error', e);
    }
}

function saveDeckState() {
    try {
        const active = getActiveDeck();
        active.cardIds = [...state.activeDeckCardIds];
        localStorage.setItem('duel_elemental_decks', JSON.stringify(state.decks));
        localStorage.setItem('duel_elemental_active_deck_id', state.activeDeckId);
    } catch (e) {
        console.error('Local Storage write error', e);
    }
}

function createNewDeck(name = null) {
    const deckNum = state.decks.length + 1;
    const deckName = name || `Baraja ${deckNum}`;
    const newId = 'deck_' + Math.random().toString(36).substring(2, 9);
    const newDeck = {
        id: newId,
        name: deckName,
        cardIds: [...PRESET_BALANCED]
    };
    state.decks.push(newDeck);
    state.activeDeckId = newId;
    state.activeDeckCardIds = [...newDeck.cardIds];
    saveDeckState();
    return newDeck;
}

function selectActiveDeck(deckId) {
    const target = state.decks.find(d => d.id === deckId);
    if (target) {
        state.activeDeckId = target.id;
        state.activeDeckCardIds = [...target.cardIds];
        saveDeckState();
    }
}

function renameActiveDeck(newName) {
    if (!newName || !newName.trim()) return;
    const active = getActiveDeck();
    active.name = newName.trim();
    saveDeckState();
}

function deleteActiveDeck() {
    if (state.decks.length <= 1) {
        if (typeof showToast === 'function') showToast('Debes mantener al menos una baraja', '⚠️');
        return false;
    }
    const index = state.decks.findIndex(d => d.id === state.activeDeckId);
    if (index !== -1) {
        state.decks.splice(index, 1);
        state.activeDeckId = state.decks[0].id;
        state.activeDeckCardIds = [...state.decks[0].cardIds];
        saveDeckState();
        return true;
    }
    return false;
}

/* -------------------------------------------------------------------------- */
/*                          BATTLE UTILITIES & LOGIC                          */
/* -------------------------------------------------------------------------- */

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function initBattle() {
    state.isMultiplayer = false;
    state.turnCount = 1;
    state.battleStatus = 'PLAYING';
    state.pendingTarget = null;
    
    getActiveDeck();
    
    const enemyHpBonus = state.difficulty === 'hard' ? 200 : 0;
    const enemyHp = MAX_HP + enemyHpBonus;
    
    const p1DeckCards = createInstanceCards(shuffle(state.activeDeckCardIds));
    const cpuCardIds = state.difficulty === 'hard' ? PRESET_AGGRESSIVE : PRESET_BALANCED;
    const p2DeckCards = createInstanceCards(shuffle(cpuCardIds));
    
    state.battle = {
        turn: 'p1',
        lastLog: `⚔️ ¡Batalla iniciada en Dificultad ${state.difficulty.toUpperCase()}! Es tu turno.`,
        lastCardPlayed: null,
        p1: { name: 'Tú', avatar: '🧙‍♂️', hp: MAX_HP, maxHp: MAX_HP, energy: INITIAL_ENERGY, maxEnergy: INITIAL_ENERGY, shield: 0, boost: 1, statuses: [], deck: p1DeckCards, hand: [], discard: [], entities: [] },
        p2: { name: 'IA Rival', avatar: '🤖', hp: enemyHp, maxHp: enemyHp, energy: INITIAL_ENERGY, maxEnergy: INITIAL_ENERGY, shield: 0, boost: 1, statuses: [], deck: p2DeckCards, hand: [], discard: [], entities: [] }
    };
    
    drawCardsForPlayer('p1', HAND_SIZE);
    drawCardsForPlayer('p2', HAND_SIZE);
    
    document.getElementById('battle-diff-tag').textContent = `Dificultad: ${state.difficulty.toUpperCase()}`;
    document.getElementById('modal-gameover').classList.add('hidden');
    
    recalculatePositionAuras('p1');
    recalculatePositionAuras('p2');
    updateBattleUI();
}

function drawCardsForPlayer(playerKey, count) {
    const p = state.battle[playerKey];
    if (!p) return;
    for (let i = 0; i < count; i++) {
        if (p.hand.length >= 5) break;
        if (p.deck.length === 0) {
            if (p.discard && p.discard.length > 0) {
                p.deck = shuffle([...p.discard]);
                p.discard = [];
            } else {
                break;
            }
        }
        if (p.deck.length > 0) {
            p.hand.push(p.deck.pop());
        }
    }
}

/* -------------------------------------------------------------------------- */
/*              SISTEMA DE SELECCIÓN DE OBJETIVOS E INTERCEPCIÓN             */
/* -------------------------------------------------------------------------- */

function initiateTargeting(pendingAction) {
    state.pendingTarget = pendingAction;
    state.battle.lastLog = `🎯 SELECCIONA OBJETIVO (${pendingAction.targetScope})...`;
    updateBattleUI();
}

function cancelTargeting() {
    state.pendingTarget = null;
    state.battle.lastLog = `Selección cancelada. Continúa tu turno.`;
    updateBattleUI();
}

function isValidTarget(targetPlayerKey, targetKind, targetInstanceId, scope) {
    const isEnemy = state.isMultiplayer ? targetPlayerKey !== mpState.role : targetPlayerKey === 'p2';
    const isSelf = state.isMultiplayer ? targetPlayerKey === mpState.role : targetPlayerKey === 'p1';
    
    if (scope === 'ANY_ENEMY') return isEnemy;
    if (scope === 'ENEMY_HERO') return isEnemy && targetKind === 'HERO';
    if (scope === 'ENEMY_ENTITY') return isEnemy && targetKind === 'ENTITY';
    if (scope === 'ANY_SELF') return isSelf;
    if (scope === 'SELF_HERO') return isSelf && targetKind === 'HERO';
    if (scope === 'SELF_ENTITY') return isSelf && targetKind === 'ENTITY';
    if (scope === 'ANY_ENTITY') return targetKind === 'ENTITY';
    if (scope === 'ANY') return true;
    return false;
}

function selectTarget(targetPlayerKey, targetKind, targetInstanceId = null) {
    if (!state.pendingTarget) return;
    const { targetScope } = state.pendingTarget;
    if (!isValidTarget(targetPlayerKey, targetKind, targetInstanceId, targetScope)) {
        showToast('Objetivo no válido para esta acción', '⚠️');
        return;
    }
    const pending = state.pendingTarget;
    state.pendingTarget = null;
    executeTargetedAction(pending, targetPlayerKey, targetKind, targetInstanceId);
}

function executeTargetedAction(pending, targetPlayerKey, targetKind, targetInstanceId) {
    const actorKey = pending.actorKey;
    const actor = state.battle[actorKey];
    
    if (pending.type === 'CARD') {
        const cardIndex = actor.hand.findIndex(c => c.uid === pending.cardUid);
        if (cardIndex === -1) return;
        const card = actor.hand[cardIndex];
        if (actor.energy < card.cost) return;
        
        if (card.type === 'BOOST' && actor.statuses && actor.statuses.some(s => s.id === 'AMNESIA')) {
            showToast('Sufres Amnesia: No puedes usar potenciadores', '🚫');
            return;
        }
        
        actor.energy -= card.cost;
        actor.hand.splice(cardIndex, 1);
        if (!actor.discard) actor.discard = [];
        actor.discard.push(card);
        
        const calculatedVal = calculateCardSynergyValue(card, actorKey);
        
        if (card.type === 'ATTACK' || card.type === 'STATUS') {
            let damage = Math.round(calculatedVal * actor.boost);
            actor.boost = 1;
            if (damage > 0) {
                resolveAttackWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, damage, card.name);
            }
        } else if (card.type === 'DRAIN') {
            let drainAmt = Math.round(calculatedVal * actor.boost);
            actor.boost = 1;
            resolveDrainWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, drainAmt, card.name);
        } else if (card.type === 'HEAL') {
            resolveHealWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, calculatedVal, card.name);
        } else if (card.type === 'DEFENSE') {
            resolveShieldWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, calculatedVal, card.name);
        }
        
        if (card.statusEffect) {
            applyStatusEffect(targetPlayerKey, targetKind, targetInstanceId, card.statusEffect, card.statusVal || 1, card.statusDuration || 2);
        }
    } else if (pending.type === 'ENTITY_ATTACK') {
        const entity = actor.entities.find(e => e.instanceId === pending.instanceId);
        if (!entity || entity.usedThisTurn) return;
        if (entity.statuses && entity.statuses.some(s => s.id === 'FREEZE')) {
            showToast(`${entity.name} está Congelado`, '❄️');
            return;
        }
        
        entity.usedThisTurn = true;
        entity.mode = 'ATTACK';
        let damage = Math.round((entity.atk || 100) * actor.boost);
        actor.boost = 1;
        resolveAttackWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, damage, `${entity.name} (Ataque)`);
    } else if (pending.type === 'ENTITY_USE') {
        const entity = actor.entities.find(e => e.instanceId === pending.instanceId);
        if (!entity || entity.usedThisTurn) return;
        entity.usedThisTurn = true;
        useEntityAbilityWithTarget(actorKey, pending.instanceId, targetPlayerKey, targetKind, targetInstanceId);
    }
    
    recalculatePositionAuras('p1');
    recalculatePositionAuras('p2');
    updateBattleUI();
    
    if (state.isMultiplayer) {
        syncMultiplayerBattleState();
    } else {
        checkMatchOver();
    }
}

function playCard(cardUid) {
    const myKey = state.isMultiplayer ? mpState.role : 'p1';
    if (state.battle.turn !== myKey || state.battleStatus !== 'PLAYING') return;
    const actor = state.battle[myKey];
    const card = actor.hand.find(c => c.uid === cardUid);
    if (!card) return;
    
    if (actor.energy < card.cost) {
        showToast('Energía insuficiente', '⚡');
        return;
    }
    
    if (card.type === 'ENTITY') {
        if (actor.entities.length >= 5) {
            showToast('Campo lleno (máximo 5 entidades)', '⚠️');
            return;
        }
        actor.energy -= card.cost;
        const cardIndex = actor.hand.findIndex(c => c.uid === cardUid);
        actor.hand.splice(cardIndex, 1);
        
        const baseHp = card.hp || 200;
        const baseAtk = card.atk || 100;
        actor.entities.push({
            ...card,
            instanceId: 'ent_' + Math.random().toString(36).substring(2, 9),
            baseHp: baseHp,
            baseAtk: baseAtk,
            hp: baseHp,
            maxHp: baseHp,
            atk: baseAtk,
            auraBonusAtk: 0,
            auraBonusShield: 0,
            mode: 'NONE',
            usedThisTurn: false,
            statuses: []
        });
        
        recalculatePositionAuras(myKey);
        state.battle.lastLog = `${actor.name} invocó a ${card.name}.`;
        createFloatingText(myKey, '✨ Entidad convocada!', '#6366f1');
        triggerParticlesAtPlayer(myKey, '#6366f1');
        updateBattleUI();
        
        if (state.isMultiplayer) syncMultiplayerBattleState();
        else checkMatchOver();
        return;
    }
    
    if (card.type === 'BOOST') {
        if (actor.statuses && actor.statuses.some(s => s.id === 'AMNESIA')) {
            showToast('Sufres Amnesia: No puedes usar potenciadores', '🚫');
            return;
        }
        actor.energy -= card.cost;
        const cardIndex = actor.hand.findIndex(c => c.uid === cardUid);
        actor.hand.splice(cardIndex, 1);
        if (!actor.discard) actor.discard = [];
        actor.discard.push(card);
        actor.boost = card.val;
        
        state.battle.lastLog = `${actor.name} usó ${card.name} (+50% Daño Siguiente).`;
        createFloatingText(myKey, '🔥 Potenciado X1.5!', '#f59e0b');
        triggerParticlesAtPlayer(myKey, '#f59e0b');
        updateBattleUI();
        
        if (state.isMultiplayer) syncMultiplayerBattleState();
        else checkMatchOver();
        return;
    }
    
    initiateTargeting({
        type: 'CARD',
        cardUid: card.uid,
        targetScope: card.targetScope || 'ANY_ENEMY',
        actorKey: myKey
    });
}

function executeEntityAction(actorKey, instanceId, actionType) {
    if (state.battleStatus !== 'PLAYING' && state.battleStatus !== 'CPU_TURN') return;
    if (state.battle.turn !== actorKey) return;
    
    const actor = state.battle[actorKey];
    const entity = actor.entities.find(e => e.instanceId === instanceId);
    if (!entity) return;
    
    if (entity.statuses && entity.statuses.some(s => s.id === 'FREEZE')) {
        showToast(`${entity.name} está Congelado`, '❄️');
        return;
    }
    
    if (actionType === 'DEFEND') {
        entity.mode = 'DEFEND';
        state.battle.lastLog = `${actor.name}: ${entity.name} entra en DEFENSA.`;
        createFloatingText(actorKey, '🛡️ Defendiendo', '#3b82f6');
        updateBattleUI();
        if (state.isMultiplayer) syncMultiplayerBattleState();
        return;
    }
    
    if (entity.usedThisTurn) {
        if (!state.isMultiplayer || actorKey === mpState.role) showToast('Esta entidad ya actuó este turno', '⚠️');
        return;
    }
    
    if (actionType === 'ATTACK') {
        initiateTargeting({
            type: 'ENTITY_ATTACK',
            instanceId: instanceId,
            targetScope: 'ANY_ENEMY',
            actorKey: actorKey
        });
    } else if (actionType === 'USE') {
        if (entity.statuses && entity.statuses.some(s => s.id === 'AMNESIA')) {
            showToast(`${entity.name} sufre Amnesia`, '🚫');
            return;
        }
        const abilityScope = entity.abilityScope || 'ANY_SELF';
        initiateTargeting({
            type: 'ENTITY_USE',
            instanceId: instanceId,
            targetScope: abilityScope,
            actorKey: actorKey
        });
    }
}

/* -------------------------------------------------------------------------- */
/*            RESOLUCIÓN DE ACCIONES CON INTERCEPCIÓN DE DEFENSA              */
/* -------------------------------------------------------------------------- */

function resolveAttackWithTarget(attackerKey, targetPlayerKey, targetKind, targetInstanceId, incomingDamage, sourceName) {
    const actor = state.battle[attackerKey];
    const targetPlayer = state.battle[targetPlayerKey];
    
    if (actor.statuses && actor.statuses.some(s => s.id === 'DELIRIUM')) {
        if (Math.random() < 0.5) {
            createFloatingText(attackerKey, '💥 ¡Ataque Fallado! (Delirio)', '#a855f7');
            state.battle.lastLog = `😵 ¡El ataque de ${sourceName} falló debido al Delirio!`;
            updateBattleUI();
            return;
        }
    }
    
    let targetObj = targetKind === 'HERO' ? targetPlayer : targetPlayer.entities.find(e => e.instanceId === targetInstanceId);
    let finalDamage = incomingDamage;
    
    if (targetObj && targetObj.statuses && targetObj.statuses.some(s => s.id === 'CURSE')) {
        finalDamage = Math.round(incomingDamage * 1.5);
        createFloatingText(targetPlayerKey, '☠️ ¡Maldición (+50% Daño)!', '#9333ea');
    }
    
    let remainingDamage = finalDamage;
    
    for (let i = 0; i < targetPlayer.entities.length; i++) {
        const defender = targetPlayer.entities[i];
        if (defender.mode === 'DEFEND') {
            if (defender.hp > remainingDamage) {
                defender.hp -= remainingDamage;
                createFloatingText(targetPlayerKey, `-${remainingDamage} HP (${defender.name})`, '#f43f5e');
                remainingDamage = 0;
                break;
            } else {
                remainingDamage -= defender.hp;
                createFloatingText(targetPlayerKey, `💀 ${defender.name} Derrotada!`, '#ef4444');
                defender.hp = 0;
            }
        }
    }
    
    targetPlayer.entities = targetPlayer.entities.filter(e => e.hp > 0);
    recalculatePositionAuras(targetPlayerKey);
    
    if (remainingDamage <= 0) {
        state.battle.lastLog = `${actor.name}: ${sourceName} fue completamente interceptado.`;
        updateBattleUI();
        return;
    }
    
    if (targetKind === 'HERO') {
        if (targetPlayer.shield > 0) {
            if (targetPlayer.shield >= remainingDamage) {
                targetPlayer.shield -= remainingDamage;
                remainingDamage = 0;
            } else {
                remainingDamage -= targetPlayer.shield;
                targetPlayer.shield = 0;
            }
        }
        targetPlayer.hp = Math.max(0, targetPlayer.hp - remainingDamage);
        createFloatingText(targetPlayerKey, `-${remainingDamage} HP`, '#f43f5e');
        triggerParticlesAtPlayer(targetPlayerKey, '#f43f5e');
        state.battle.lastLog = `${actor.name} usó ${sourceName} infligiendo ${finalDamage} de daño a ${targetPlayer.name}.`;
    } else if (targetKind === 'ENTITY') {
        const targetEntity = targetPlayer.entities.find(e => e.instanceId === targetInstanceId);
        if (targetEntity) {
            if (targetEntity.hp > remainingDamage) {
                targetEntity.hp -= remainingDamage;
                createFloatingText(targetPlayerKey, `-${remainingDamage} HP (${targetEntity.name})`, '#f43f5e');
                state.battle.lastLog = `${actor.name} atacó a ${targetEntity.name} con ${sourceName} (-${remainingDamage} HP).`;
            } else {
                createFloatingText(targetPlayerKey, `💀 ${targetEntity.name} Destruida!`, '#ef4444');
                targetEntity.hp = 0;
                state.battle.lastLog = `${actor.name} destruyó a ${targetEntity.name} con ${sourceName}.`;
            }
            targetPlayer.entities = targetPlayer.entities.filter(e => e.hp > 0);
            recalculatePositionAuras(targetPlayerKey);
        } else {
            if (targetPlayer.shield > 0) {
                if (targetPlayer.shield >= remainingDamage) {
                    targetPlayer.shield -= remainingDamage;
                    remainingDamage = 0;
                } else {
                    remainingDamage -= targetPlayer.shield;
                    targetPlayer.shield = 0;
                }
            }
            targetPlayer.hp = Math.max(0, targetPlayer.hp - remainingDamage);
            createFloatingText(targetPlayerKey, `-${remainingDamage} HP`, '#f43f5e');
            state.battle.lastLog = `${actor.name} infligió ${remainingDamage} de daño excedente.`;
        }
    }
    updateBattleUI();
}

function resolveDrainWithTarget(attackerKey, targetPlayerKey, targetKind, targetInstanceId, drainAmt, sourceName) {
    const actor = state.battle[attackerKey];
    resolveAttackWithTarget(attackerKey, targetPlayerKey, targetKind, targetInstanceId, drainAmt, sourceName);
    actor.hp = Math.min(actor.maxHp, actor.hp + drainAmt);
    createFloatingText(attackerKey, `+${drainAmt} HP`, '#10b981');
}

function resolveHealWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, val, sourceName) {
    const actor = state.battle[actorKey];
    const targetPlayer = state.battle[targetPlayerKey];
    if (targetKind === 'HERO') {
        targetPlayer.hp = Math.min(targetPlayer.maxHp, targetPlayer.hp + val);
        createFloatingText(targetPlayerKey, `+${val} HP`, '#10b981');
        state.battle.lastLog = `${actor.name} usó ${sourceName} curando ${val} HP.`;
    } else if (targetKind === 'ENTITY') {
        const ent = targetPlayer.entities.find(e => e.instanceId === targetInstanceId);
        if (ent) {
            ent.hp = Math.min(ent.maxHp, ent.hp + val);
            createFloatingText(targetPlayerKey, `+${val} HP (${ent.name})`, '#10b981');
            state.battle.lastLog = `${actor.name} curó ${val} HP a ${ent.name}.`;
        }
    }
}

function resolveShieldWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, val, sourceName) {
    const actor = state.battle[actorKey];
    const targetPlayer = state.battle[targetPlayerKey];
    const targetObj = targetKind === 'HERO' ? targetPlayer : targetPlayer.entities.find(e => e.instanceId === targetInstanceId);
    
    if (targetObj && targetObj.statuses && targetObj.statuses.some(s => s.id === 'TRAUMA')) {
        showToast(`${targetObj.name} sufre Trauma y no puede recibir escudo`, '🚫');
        return;
    }
    
    if (targetKind === 'HERO') {
        targetPlayer.shield += val;
        createFloatingText(targetPlayerKey, `+${val} Escudo`, '#6366f1');
        state.battle.lastLog = `${actor.name} usó ${sourceName} (+${val} Escudo).`;
    } else if (targetKind === 'ENTITY') {
        const ent = targetPlayer.entities.find(e => e.instanceId === targetInstanceId);
        if (ent) {
            ent.hp += val;
            ent.maxHp += val;
            createFloatingText(targetPlayerKey, `+${val} Resistencia (${ent.name})`, '#6366f1');
            state.battle.lastLog = `${actor.name} otorgó +${val} de resistencia a ${ent.name}.`;
        }
    }
}

function useEntityAbilityWithTarget(actorKey, instanceId, targetPlayerKey, targetKind, targetInstanceId) {
    const actor = state.battle[actorKey];
    const entity = actor.entities.find(e => e.instanceId === instanceId);
    if (!entity) return;
    
    if (entity.id === 'entity_golem') {
        resolveShieldWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, 120, entity.name);
    } else if (entity.id === 'entity_phoenix') {
        let dmg = Math.round(100 * actor.boost);
        actor.boost = 1;
        resolveAttackWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, dmg, `${entity.name} (Llama)`);
    } else if (entity.id === 'entity_fairy') {
        resolveHealWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, 100, entity.name);
    } else if (entity.id === 'entity_demon') {
        let drain = Math.round(80 * actor.boost);
        actor.boost = 1;
        resolveDrainWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, drain, `${entity.name} (Drena Alma)`);
    } else if (entity.id === 'entity_arandela') {
        resolveShieldWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, 150, entity.name);
    } else if (entity.id === 'entity_mao') {
        let drain = Math.round(120 * actor.boost);
        actor.boost = 1;
        resolveDrainWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, drain, `${entity.name} (Amnesia)`);
        applyStatusEffect(targetPlayerKey, targetKind, targetInstanceId, 'AMNESIA', 1, 2);
    } else if (entity.id === 'entity_lazarillo') {
        resolveHealWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, 140, entity.name);
        applyStatusEffect(targetPlayerKey, targetKind, targetInstanceId, 'REGEN', 60, 2);
    } else if (entity.id === 'entity_chupitopo') {
        let dmg = Math.round(110 * actor.boost);
        actor.boost = 1;
        resolveAttackWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, dmg, `${entity.name} (Trago Delirante)`);
        applyStatusEffect(targetPlayerKey, targetKind, targetInstanceId, 'DELIRIUM', 1, 2);
    } else {
        resolveShieldWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, 80, entity.name);
    }
}

function checkMatchOver() {
    if (state.isMultiplayer) {
        checkMatchOverMP();
        return;
    }
    const p1 = state.battle.p1;
    const p2 = state.battle.p2;
    if (p1.hp <= 0 || p2.hp <= 0) {
        state.battleStatus = 'GAME_OVER';
        const p1Won = p1.hp > 0;
        document.getElementById('gameover-icon').textContent = p1Won ? '🏆' : '💀';
        document.getElementById('gameover-title').textContent = p1Won ? '¡VICTORIA!' : '¡DERROTA!';
        document.getElementById('gameover-subtitle').textContent = p1Won 
            ? 'Has demostrado tu maestría sobre los elementos.' 
            : 'La IA te ha superado. Revisa tu baraja e inténtalo de nuevo.';
        document.getElementById('stat-final-turn').textContent = `Turno ${state.turnCount}`;
        document.getElementById('stat-final-hp').textContent = `${p1.hp} HP`;
        document.getElementById('modal-gameover').classList.remove('hidden');
    }
}