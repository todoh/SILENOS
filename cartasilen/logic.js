/* -------------------------------------------------------------------------- */
/*                          1. CARD DATABASE DEFINITION                       */
/* -------------------------------------------------------------------------- */
const CARD_TYPES = {
    ATTACK: { id: 'ATTACK', name: 'Ataque', emoji: '⚔️', color: 'text-rose-600 bg-rose-50 border-rose-200' },
    DEFENSE: { id: 'DEFENSE', name: 'Defensa', emoji: '🛡️', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    HEAL: { id: 'HEAL', name: 'Curación', emoji: '💚', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    BOOST: { id: 'BOOST', name: 'Potenciador', emoji: '⚡', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    DRAIN: { id: 'DRAIN', name: 'Drenaje', emoji: '🩸', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    STATUS: { id: 'STATUS', name: 'Estado', emoji: '🌀', color: 'text-violet-600 bg-violet-50 border-violet-200' },
    ENTITY: { id: 'ENTITY', name: 'Entidad', emoji: '🗿', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' }
};

const ELEMENT_INFO = {
    FIRE: { name: 'Fuego', emoji: '🔥' },
    WATER: { name: 'Agua', emoji: '💧' },
    EARTH: { name: 'Tierra', emoji: '🌍' },
    AIR: { name: 'Aire', emoji: '💨' },
    SHADOW: { name: 'Sombra', emoji: '🌑' },
    LIGHT: { name: 'Luz', emoji: '✨' },
    POISON: { name: 'Veneno', emoji: '☠️' },
    ICE: { name: 'Hielo', emoji: '❄️' },
    CURSE: { name: 'Maldición', emoji: '👁️' },
    PLANT: { name: 'Planta', emoji: '🌿' },
    PSYCHIC: { name: 'Psíquico', emoji: '🔮' },
    RADIATION: { name: 'Radiación', emoji: '☢️' }
};

const STATUS_EFFECTS_INFO = {
    BURN: { name: 'Quemadura', emoji: '🔥', desc: 'Sufre daño al inicio de cada turno.' },
    POISON: { name: 'Veneno', emoji: '☠️', desc: 'Sufre daño corrosivo cada turno.' },
    FREEZE: { name: 'Congelación', emoji: '❄️', desc: 'Incapaz de actuar o atacar.' },
    CURSE: { name: 'Maldición', emoji: '👁️', desc: 'Recibe +50% de daño adicional.' },
    REGEN: { name: 'Regeneración', emoji: '💚', desc: 'Recupera salud al inicio de cada turno.' },
    AMNESIA: { name: 'Amnesia', emoji: '❓', desc: 'Bloquea el uso de habilidades especiales.' },
    DELIRIUM: { name: 'Delirio', emoji: '🌀', desc: '50% de probabilidad de fallar el ataque.' },
    TRAUMA: { name: 'Trauma', emoji: '💢', desc: 'Impide generar o mantener escudo.' }
};

const CARDS_DATABASE = [
    { id: 'fire_ball', name: 'Ráfaga de Fuego', element: 'FIRE', cost: 1, type: 'ATTACK', val: 15, targetScope: 'ANY_ENEMY', icon: '🔥', image: 'cartas/rafagafuego.png', desc: 'Inflige 15 de daño al objetivo elegido.', bg: 'from-orange-500/10 to-red-500/10' },
    { id: 'fire_burn', name: 'Llama Combustiva', element: 'FIRE', cost: 2, type: 'ATTACK', val: 10, statusEffect: 'BURN', statusVal: 6, statusDuration: 2, targetScope: 'ANY_ENEMY', icon: '🔥', image: 'cartas/llamaradafuego.png', desc: 'Inflige 10 de daño y aplica Quemadura (6 daño/turno por 2 turnos).', bg: 'from-orange-500/10 to-red-500/10' },
    { id: 'fire_meteor', name: 'Meteoro Ígneo', element: 'FIRE', cost: 3, type: 'ATTACK', val: 38, targetScope: 'ANY_ENEMY', icon: '☄️', image: 'cartas/meteoritoigneo.png', desc: 'Ataque fulminante de 38 de daño al objetivo elegido.', bg: 'from-amber-600/10 to-orange-600/10' },
    { id: 'water_heal', name: 'Marea Curativa', element: 'WATER', cost: 2, type: 'HEAL', val: 24, targetScope: 'ANY_SELF', icon: '💧', image: 'cartas/mareacurativa.png', desc: 'Restaura 24 HP a un aliado u Invocador.', bg: 'from-blue-500/10 to-cyan-500/10' },
    { id: 'water_shield', name: 'Burbuja de Agua', element: 'WATER', cost: 1, type: 'DEFENSE', val: 16, targetScope: 'ANY_SELF', icon: '🫧', image: 'cartas/burbujaagua.png', desc: 'Concede 16 de escudo a un aliado o Invocador.', bg: 'from-cyan-400/10 to-blue-400/10' },
    { id: 'earth_shield', name: 'Escudo de Piedra', element: 'EARTH', cost: 1, type: 'DEFENSE', val: 20, targetScope: 'ANY_SELF', icon: '🛡️', image: 'cartas/escudopiedra.png', desc: 'Otorga 20 de granito defensivo a un objetivo aliado.', bg: 'from-amber-700/10 to-stone-700/10' },
    { id: 'earth_quake', name: 'Sismo Terrestre', element: 'EARTH', cost: 2, type: 'ATTACK', val: 26, targetScope: 'ANY_ENEMY', icon: '🌍', image: 'cartas/sismoterrestre.png', desc: 'Sacudida sísmica de 26 de daño a un objetivo.', bg: 'from-stone-600/10 to-amber-900/10' },
    { id: 'air_strike', name: 'Tornados Gemelos', element: 'AIR', cost: 2, type: 'ATTACK', val: 28, targetScope: 'ANY_ENEMY', icon: '🌪️', image: 'cartas/tornadosgemelos.png', desc: 'Ataque huracanado de 28 de daño.', bg: 'from-teal-500/10 to-emerald-500/10' },
    { id: 'air_boost', name: 'Viento Celeris', element: 'AIR', cost: 1, type: 'BOOST', val: 1.5, targetScope: 'SELF_HERO', icon: '💨', image: 'cartas/vientoceleris.png', desc: '+50% potencia en tu próximo ataque.', bg: 'from-emerald-400/10 to-teal-400/10' },
    { id: 'shadow_drain', name: 'Drenaje Sombrío', element: 'SHADOW', cost: 2, type: 'DRAIN', val: 15, targetScope: 'ANY_ENEMY', icon: '🌑', image: 'cartas/drenajesombrio.png', desc: 'Roba 15 HP al objetivo elegido y te cura.', bg: 'from-purple-600/10 to-indigo-600/10' },
    { id: 'shadow_curse', name: 'Marea Nocturna', element: 'SHADOW', cost: 1, type: 'ATTACK', val: 14, targetScope: 'ANY_ENEMY', icon: '👁️', image: 'cartas/mareanocturna.png', desc: 'Inflige 14 de daño sombrío al objetivo elegido.', bg: 'from-violet-500/10 to-purple-800/10' },
    { id: 'light_boost', name: 'Resplandor Solar', element: 'LIGHT', cost: 1, type: 'BOOST', val: 1.5, targetScope: 'SELF_HERO', icon: '✨', image: 'cartas/resplandorsolar.png', desc: 'Carga tu ataque actual X1.5.', bg: 'from-yellow-400/10 to-amber-400/10' },
    { id: 'light_blessing', name: 'Bendición Divina', element: 'LIGHT', cost: 3, type: 'HEAL', val: 40, targetScope: 'ANY_SELF', icon: '🌟', image: 'cartas/bendiciondivina.png', desc: 'Restaura 40 HP a un objetivo aliado.', bg: 'from-amber-300/10 to-yellow-500/10' },
    { id: 'poison_spores', name: 'Esporas Venenosas', element: 'POISON', cost: 1, type: 'ATTACK', val: 5, statusEffect: 'POISON', statusVal: 6, statusDuration: 3, targetScope: 'ANY_ENEMY', icon: '☠️', image: 'cartas/sombravoraz.png', desc: 'Inflige 5 de daño y aplica Veneno (6 daño/turno por 3 turnos).', bg: 'from-emerald-600/10 to-green-800/10' },
    { id: 'ice_freeze', name: 'Ráfaga de Hielo', element: 'ICE', cost: 2, type: 'ATTACK', val: 12, statusEffect: 'FREEZE', statusVal: 1, statusDuration: 1, targetScope: 'ANY_ENEMY', icon: '❄️', image: 'cartas/rafagahielo.png', desc: 'Inflige 12 de daño y Congela al objetivo por 1 turno.', bg: 'from-cyan-500/10 to-blue-600/10' },
    { id: 'curse_hex', name: 'Hexágono Oscuro', element: 'CURSE', cost: 1, type: 'ATTACK', val: 8, statusEffect: 'CURSE', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', icon: '👁️', image: 'cartas/hexagono.png', desc: 'Inflige 8 de daño y aplica Maldición (+50% daño recibido por 2 turnos).', bg: 'from-purple-900/10 to-violet-900/10' },
    { id: 'plant_regen', name: 'Savia Regenerativa', element: 'PLANT', cost: 2, type: 'HEAL', val: 12, statusEffect: 'REGEN', statusVal: 8, statusDuration: 2, targetScope: 'ANY_SELF', icon: '🌿', image: 'cartas/sabia.png', desc: 'Cura 12 HP y otorga Regeneración (8 HP/turno por 2 turnos).', bg: 'from-green-500/10 to-emerald-600/10' },
    { id: 'psychic_amnesia', name: 'Niebla de Amnesia', element: 'PSYCHIC', cost: 1, type: 'ATTACK', val: 6, statusEffect: 'AMNESIA', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', icon: '🔮', image: 'cartas/amnesia.png', desc: 'Inflige 6 de daño y aplica Amnesia (bloquea habilidades especiales por 2 turnos).', bg: 'from-fuchsia-600/10 to-pink-600/10' },
    { id: 'delirium_fog', name: 'Delirio Sensorial', element: 'PSYCHIC', cost: 2, type: 'ATTACK', val: 10, statusEffect: 'DELIRIUM', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', icon: '🌀', image: 'cartas/delirio.png', desc: 'Inflige 10 de daño y causa Delirio (50% prob. de fallar ataques por 2 turnos).', bg: 'from-indigo-500/10 to-purple-500/10' },
    { id: 'radiation_trauma', name: 'Onda de Radiación', element: 'RADIATION', cost: 2, type: 'ATTACK', val: 14, statusEffect: 'TRAUMA', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', icon: '☢️', image: 'cartas/radiacion.png', desc: 'Inflige 14 de daño y aplica Trauma (impide ganar o tener escudo por 2 turnos).', bg: 'from-yellow-500/10 to-lime-600/10' },
    { id: 'entity_golem', name: 'Gólem de Granito', element: 'EARTH', cost: 2, type: 'ENTITY', hp: 25, atk: 12, targetScope: 'NONE', abilityScope: 'ANY_SELF', icon: '🗿', image: 'cartas/golem.png', desc: 'Entidad (HP: 25 | ATK: 12). HABILIDAD: Otorga +12 de Escudo a un aliado.', bg: 'from-stone-700/10 to-neutral-700/10' },
    { id: 'entity_phoenix', name: 'Fénix Ígneo', element: 'FIRE', cost: 2, type: 'ENTITY', hp: 18, atk: 16, targetScope: 'NONE', abilityScope: 'ANY_ENEMY', icon: '🔥', image: 'cartas/fenix.png', desc: 'Entidad (HP: 18 | ATK: 16). HABILIDAD: Lanza Llama Ígnea causando 10 de daño.', bg: 'from-red-600/10 to-orange-500/10' },
    { id: 'entity_fairy', name: 'Hada Celestial', element: 'LIGHT', cost: 2, type: 'ENTITY', hp: 15, atk: 8, targetScope: 'NONE', abilityScope: 'ANY_SELF', icon: '✨', image: 'cartas/hada.png', desc: 'Entidad (HP: 15 | ATK: 8). HABILIDAD: Concede Bendición curando 10 HP.', bg: 'from-yellow-300/10 to-amber-200/10' },
    { id: 'entity_demon', name: 'Sombra Voraz', element: 'SHADOW', cost: 2, type: 'ENTITY', hp: 20, atk: 14, targetScope: 'NONE', abilityScope: 'ANY_ENEMY', icon: '🌑', image: 'cartas/sombravoraz.png', desc: 'Entidad (HP: 20 | ATK: 14). HABILIDAD: Roba 8 HP al objetivo.', bg: 'from-purple-800/10 to-indigo-900/10' }
];

const MAX_HP = 100;
const MAX_ENERGY = 3;
const HAND_SIZE = 3;

/* Default Presets */
const PRESET_BALANCED = ['fire_ball', 'fire_burn', 'water_heal', 'earth_shield', 'entity_golem', 'entity_phoenix', 'poison_spores', 'plant_regen'];
const PRESET_AGGRESSIVE = ['fire_ball', 'fire_burn', 'ice_freeze', 'curse_hex', 'entity_phoenix', 'entity_demon', 'radiation_trauma', 'delirium_fog'];

/* -------------------------------------------------------------------------- */
/*                          2. GLOBAL ENGINE STATE                            */
/* -------------------------------------------------------------------------- */
let state = {
    activeScreen: 'home',
    difficulty: 'normal',
    activeDeckCardIds: [...PRESET_BALANCED],
    deckFilter: 'ALL',
    turnCount: 1,
    battleStatus: 'IDLE',
    pendingTarget: null,
    battle: {
        turn: 'p1',
        lastLog: '⚔️ Comienza el combate!',
        p1: { name: 'Tú', avatar: '🧙‍♂️', hp: MAX_HP, maxHp: MAX_HP, energy: MAX_ENERGY, shield: 0, boost: 1, statuses: [], deck: [], hand: [], discard: [], entities: [] },
        p2: { name: 'IA Rival', avatar: '🤖', hp: MAX_HP, maxHp: MAX_HP, energy: MAX_ENERGY, shield: 0, boost: 1, statuses: [], deck: [], hand: [], discard: [], entities: [] }
    }
};

function loadSavedState() {
    try {
        const saved = localStorage.getItem('duel_elemental_deck');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length >= 6 && parsed.length <= 12) {
                state.activeDeckCardIds = parsed;
            }
        }
    } catch (e) {
        console.error('Local Storage read error', e);
    }
}

function saveDeckState() {
    try {
        localStorage.setItem('duel_elemental_deck', JSON.stringify(state.activeDeckCardIds));
    } catch (e) {
        console.error('Local Storage write error', e);
    }
}

/* -------------------------------------------------------------------------- */
/*                          3. BATTLE UTILITIES & LOGIC                       */
/* -------------------------------------------------------------------------- */
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function createInstanceCards(cardIdList) {
    return cardIdList.map(id => {
        const template = CARDS_DATABASE.find(c => c.id === id) || CARDS_DATABASE[0];
        return { ...template, uid: 'card_' + Math.random().toString(36).substring(2, 9) };
    });
}

function initBattle() {
    state.turnCount = 1;
    state.battleStatus = 'PLAYING';
    state.pendingTarget = null;
         
    const enemyHpBonus = state.difficulty === 'hard' ? 20 : 0;
    const enemyHp = MAX_HP + enemyHpBonus;
         
    const p1DeckCards = createInstanceCards(shuffle(state.activeDeckCardIds));
    const cpuCardIds = state.difficulty === 'hard' ? PRESET_AGGRESSIVE : PRESET_BALANCED;
    const p2DeckCards = createInstanceCards(shuffle(cpuCardIds));
         
    state.battle = {
        turn: 'p1',
        lastLog: `⚔️ Batalla iniciada en Dificultad ${state.difficulty.toUpperCase()}! Es tu turno.`,
        p1: { name: 'Tú', avatar: '🧙‍♂️', hp: MAX_HP, maxHp: MAX_HP, energy: MAX_ENERGY, shield: 0, boost: 1, statuses: [], deck: p1DeckCards, hand: [], discard: [], entities: [] },
        p2: { name: 'IA Rival', avatar: '🤖', hp: enemyHp, maxHp: enemyHp, energy: MAX_ENERGY, shield: 0, boost: 1, statuses: [], deck: p2DeckCards, hand: [], discard: [], entities: [] }
    };
         
    drawCardsForPlayer('p1', HAND_SIZE);
    drawCardsForPlayer('p2', HAND_SIZE);
         
    document.getElementById('battle-diff-tag').textContent = `Dificultad: ${state.difficulty.toUpperCase()}`;
    document.getElementById('modal-gameover').classList.add('hidden');
         
    updateBattleUI();
}

function drawCardsForPlayer(playerKey, count) {
    const p = state.battle[playerKey];
    for (let i = 0; i < count; i++) {
        if (p.hand.length >= 5) break;
        if (p.deck.length === 0) {
            if (p.discard.length > 0) {
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
/*                     SISTEMA DE ESTADOS ALTERADOS                          */
/* -------------------------------------------------------------------------- */
function applyStatusEffect(targetPlayerKey, targetKind, targetInstanceId, statusType, val, duration) {
    const targetPlayer = state.battle[targetPlayerKey];
    let targetObj = null;
    let targetName = "";
    if (targetKind === 'HERO') {
        targetObj = targetPlayer;
        targetName = targetPlayer.name;
    } else if (targetKind === 'ENTITY') {
        targetObj = targetPlayer.entities.find(e => e.instanceId === targetInstanceId);
        if (targetObj) targetName = targetObj.name;
    }
    if (!targetObj) return;
    if (!targetObj.statuses) targetObj.statuses = [];
    const existing = targetObj.statuses.find(s => s.id === statusType);
    if (existing) {
        existing.duration = Math.max(existing.duration, duration);
        existing.val = Math.max(existing.val, val);
    } else {
        const info = STATUS_EFFECTS_INFO[statusType] || { name: statusType, emoji: '✨' };
        targetObj.statuses.push({
            id: statusType,
            name: info.name,
            emoji: info.emoji,
            val: val,
            duration: duration
        });
    }
    const info = STATUS_EFFECTS_INFO[statusType] || { name: statusType };
    createFloatingText(targetPlayerKey, `+${info.name}`, '#8b5cf6');
    state.battle.lastLog += ` [${targetName}: ${info.name}]`;
}

function processTurnStartStatuses(playerKey) {
    const player = state.battle[playerKey];
    if (!player) return;
    const targets = [
        { kind: 'HERO', obj: player, instanceId: null },
        ...player.entities.map(e => ({ kind: 'ENTITY', obj: e, instanceId: e.instanceId }))
    ];
    targets.forEach(t => {
        if (!t.obj.statuses || t.obj.statuses.length === 0) return;
        const activeStatuses = [];
        t.obj.statuses.forEach(status => {
            if (status.id === 'BURN') {
                const dmg = status.val;
                if (t.kind === 'HERO') {
                    player.hp = Math.max(0, player.hp - dmg);
                } else {
                    t.obj.hp = Math.max(0, t.obj.hp - dmg);
                }
                createFloatingText(playerKey, `-${dmg} HP (Quemadura)`, '#f97316');
                state.battle.lastLog = `🔥 ${t.obj.name} sufrió ${dmg} daño por Quemadura.`;
            } else if (status.id === 'POISON') {
                const dmg = status.val;
                if (t.kind === 'HERO') {
                    player.hp = Math.max(0, player.hp - dmg);
                } else {
                    t.obj.hp = Math.max(0, t.obj.hp - dmg);
                }
                createFloatingText(playerKey, `-${dmg} HP (Veneno)`, '#10b981');
                state.battle.lastLog = `☠️ ${t.obj.name} sufrió ${dmg} daño por Veneno.`;
            } else if (status.id === 'REGEN') {
                const heal = status.val;
                if (t.kind === 'HERO') {
                    player.hp = Math.min(player.maxHp, player.hp + heal);
                } else {
                    t.obj.hp = Math.min(t.obj.maxHp, t.obj.hp + heal);
                }
                createFloatingText(playerKey, `+${heal} HP (Regen)`, '#10b981');
                state.battle.lastLog = `🌿 ${t.obj.name} recuperó ${heal} HP por Regeneración.`;
            } else if (status.id === 'TRAUMA') {
                if (t.kind === 'HERO') player.shield = 0;
            }
            status.duration -= 1;
            if (status.duration > 0) {
                activeStatuses.push(status);
            } else {
                createFloatingText(playerKey, `-Fin ${status.name}`, '#a855f7');
            }
        });
        t.obj.statuses = activeStatuses;
    });
    player.entities = player.entities.filter(e => e.hp > 0);
}

/* -------------------------------------------------------------------------- */
/*              SISTEMA DE SELECCIÓN DE OBJETIVOS E INTERCEPCIÓN             */
/* -------------------------------------------------------------------------- */
function initiateTargeting(pendingAction) {
    state.pendingTarget = pendingAction;
    state.battle.lastLog = `SELECCIONA OBJETIVO (${pendingAction.targetScope})...`;
    updateBattleUI();
}

function cancelTargeting() {
    state.pendingTarget = null;
    state.battle.lastLog = `Selección cancelada. Continúa tu turno.`;
    updateBattleUI();
}

function isValidTarget(targetPlayerKey, targetKind, targetInstanceId, scope) {
    const isEnemy = targetPlayerKey === 'p2';
    const isSelf = targetPlayerKey === 'p1';
         
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
            showToast('Sufres Amnesia: No puedes usar potenciadores', '❓');
            return;
        }
        actor.energy -= card.cost;
        actor.hand.splice(cardIndex, 1);
        actor.discard.push(card);
        if (card.type === 'ATTACK' || card.type === 'STATUS') {
            let damage = Math.round((card.val || 0) * actor.boost);
            actor.boost = 1;
            if (damage > 0) {
                resolveAttackWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, damage, card.name);
            }
        } else if (card.type === 'DRAIN') {
            let drainAmt = Math.round(card.val * actor.boost);
            actor.boost = 1;
            resolveDrainWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, drainAmt, card.name);
        } else if (card.type === 'HEAL') {
            resolveHealWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, card.val, card.name);
        } else if (card.type === 'DEFENSE') {
            resolveShieldWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, card.val, card.name);
        }
        if (card.statusEffect) {
            applyStatusEffect(targetPlayerKey, targetKind, targetInstanceId, card.statusEffect, card.statusVal || 1, card.statusDuration || 2);
        }
    } else if (pending.type === 'ENTITY_ATTACK') {
        const entity = actor.entities.find(e => e.instanceId === pending.instanceId);
        if (!entity || entity.usedThisTurn) return;
        if (entity.statuses && entity.statuses.some(s => s.id === 'FREEZE')) {
            showToast(`${entity.name} está Congelado y no puede actuar`, '❄️');
            return;
        }
        entity.usedThisTurn = true;
        entity.mode = 'ATTACK';
        let damage = Math.round((entity.atk || 10) * actor.boost);
        actor.boost = 1;
        resolveAttackWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, damage, `${entity.name} (Ataque)`);
    } else if (pending.type === 'ENTITY_USE') {
        const entity = actor.entities.find(e => e.instanceId === pending.instanceId);
        if (!entity || entity.usedThisTurn) return;
        if (entity.statuses && entity.statuses.some(s => s.id === 'FREEZE')) {
            showToast(`${entity.name} está Congelado y no puede usar habilidades`, '❄️');
            return;
        }
        if (entity.statuses && entity.statuses.some(s => s.id === 'AMNESIA')) {
            showToast(`${entity.name} sufre Amnesia y no puede usar habilidades`, '❓');
            return;
        }
        entity.usedThisTurn = true;
        useEntityAbilityWithTarget(actorKey, pending.instanceId, targetPlayerKey, targetKind, targetInstanceId);
    }
    updateBattleUI();
    checkMatchOver();
}

function playCard(cardUid) {
    if (state.battle.turn !== 'p1' || state.battleStatus !== 'PLAYING') return;
    const actor = state.battle.p1;
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
        const baseHp = card.hp || 20;
        const baseAtk = card.atk || 10;
        actor.entities.push({
            ...card,
            instanceId: 'ent_' + Math.random().toString(36).substring(2, 9),
            hp: baseHp,
            maxHp: baseHp,
            atk: baseAtk,
            mode: 'NONE',
            usedThisTurn: false,
            statuses: []
        });
        state.battle.lastLog = `${actor.name} invocó a ${card.name}.`;
        createFloatingText('p1', '✨ Entidad convocada!', '#6366f1');
        triggerParticlesAtPlayer('p1', '#6366f1');
        updateBattleUI();
        checkMatchOver();
        return;
    }
    if (card.type === 'BOOST') {
        if (actor.statuses && actor.statuses.some(s => s.id === 'AMNESIA')) {
            showToast('Sufres Amnesia: No puedes usar potenciadores', '❓');
            return;
        }
        actor.energy -= card.cost;
        const cardIndex = actor.hand.findIndex(c => c.uid === cardUid);
        actor.hand.splice(cardIndex, 1);
        actor.discard.push(card);
        actor.boost = card.val;
        state.battle.lastLog = `${actor.name} usó ${card.name} (+50% Daño Siguiente).`;
        createFloatingText('p1', '⚡ Potenciado X1.5!', '#f59e0b');
        triggerParticlesAtPlayer('p1', '#f59e0b');
        updateBattleUI();
        checkMatchOver();
        return;
    }
    initiateTargeting({
        type: 'CARD',
        cardUid: card.uid,
        targetScope: card.targetScope || 'ANY_ENEMY',
        actorKey: 'p1'
    });
}

function executeEntityAction(actorKey, instanceId, actionType) {
    if (state.battleStatus !== 'PLAYING' && state.battleStatus !== 'CPU_TURN') return;
    if (state.battle.turn !== actorKey) return;
    const actor = state.battle[actorKey];
    const entity = actor.entities.find(e => e.instanceId === instanceId);
    if (!entity) return;
    if (entity.statuses && entity.statuses.some(s => s.id === 'FREEZE')) {
        showToast(`${entity.name} está Congelado y no puede actuar`, '❄️');
        return;
    }
    if (actionType === 'DEFEND') {
        entity.mode = 'DEFEND';
        state.battle.lastLog = `${actor.name}: ${entity.name} entra en postura de DEFENSA.`;
        createFloatingText(actorKey, '🛡️ Defendiendo', '#3b82f6');
        updateBattleUI();
        return;
    }
    if (entity.usedThisTurn) {
        if (actorKey === 'p1') showToast('Esta entidad ya actuó este turno', '⚠️');
        return;
    }
    if (actionType === 'ATTACK') {
        if (actorKey === 'p1') {
            initiateTargeting({
                type: 'ENTITY_ATTACK',
                instanceId: instanceId,
                targetScope: 'ANY_ENEMY',
                actorKey: 'p1'
            });
        }
    } else if (actionType === 'USE') {
        if (entity.statuses && entity.statuses.some(s => s.id === 'AMNESIA')) {
            showToast(`${entity.name} sufre Amnesia y no puede usar habilidades`, '❓');
            return;
        }
        const abilityScope = entity.abilityScope || 'ANY_SELF';
        if (actorKey === 'p1') {
            initiateTargeting({
                type: 'ENTITY_USE',
                instanceId: instanceId,
                targetScope: abilityScope,
                actorKey: 'p1'
            });
        }
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
            createFloatingText(attackerKey, '🌀 Ataque Fallado! (Delirio)', '#a855f7');
            state.battle.lastLog = `🌀 El ataque de ${sourceName} falló debido al Delirio!`;
            updateBattleUI();
            checkMatchOver();
            return;
        }
    }
    let targetObj = targetKind === 'HERO' ? targetPlayer : targetPlayer.entities.find(e => e.instanceId === targetInstanceId);
    let finalDamage = incomingDamage;
    if (targetObj && targetObj.statuses && targetObj.statuses.some(s => s.id === 'CURSE')) {
        finalDamage = Math.round(incomingDamage * 1.5);
        createFloatingText(targetPlayerKey, '👁️ Maldición (+50% Daño)!', '#9333ea');
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
                createFloatingText(targetPlayerKey, `🛡️ ${defender.name} Defensora Derrotada!`, '#ef4444');
                defender.hp = 0;
            }
        }
    }
    targetPlayer.entities = targetPlayer.entities.filter(e => e.hp > 0);
    if (remainingDamage <= 0) {
        state.battle.lastLog = `${actor.name}: ${sourceName} fue completamente interceptado por defensores.`;
        updateBattleUI();
        checkMatchOver();
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
        state.battle.lastLog = `${actor.name} usó ${sourceName} infligiendo ${finalDamage} de daño al Invocador rival.`;
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
            state.battle.lastLog = `${actor.name} infligió ${remainingDamage} de daño excedente al Invocador rival.`;
        }
    }
    updateBattleUI();
    checkMatchOver();
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
        state.battle.lastLog = `${actor.name} usó ${sourceName} curando ${val} HP a ${targetPlayer.name}.`;
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
        showToast(`${targetObj.name} sufre Trauma y no puede recibir escudo`, '💢');
        state.battle.lastLog = `💢 ${targetObj.name} no pudo recibir escudo debido al Trauma.`;
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
        resolveShieldWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, 12, entity.name);
    } else if (entity.id === 'entity_phoenix') {
        let dmg = Math.round(10 * actor.boost);
        actor.boost = 1;
        resolveAttackWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, dmg, `${entity.name} (Llama)`);
    } else if (entity.id === 'entity_fairy') {
        resolveHealWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, 10, entity.name);
    } else if (entity.id === 'entity_demon') {
        let drain = Math.round(8 * actor.boost);
        actor.boost = 1;
        resolveDrainWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, drain, `${entity.name} (Drena Alma)`);
    } else {
        resolveShieldWithTarget(actorKey, targetPlayerKey, targetKind, targetInstanceId, 8, entity.name);
    }
}

function reorderEntityToPosition(actorKey, fromIndex, toIndex) {
    if (state.battleStatus !== 'PLAYING' && state.battleStatus !== 'CPU_TURN') return;
    if (state.battle.turn !== actorKey) return;
    const actor = state.battle[actorKey];
    if (fromIndex < 0 || fromIndex >= actor.entities.length) return;
    if (toIndex < 0 || toIndex >= actor.entities.length) return;
    const [movedEntity] = actor.entities.splice(fromIndex, 1);
    actor.entities.splice(toIndex, 0, movedEntity);
    updateBattleUI();
}

function checkMatchOver() {
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