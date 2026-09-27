/* -------------------------------------------------------------------------- */
/*                         SISTEMA DE ESTADOS ALTERADOS                      */
/* -------------------------------------------------------------------------- */

const STATUS_EFFECTS_INFO = {
    BURN: { name: 'Quemadura', emoji: '🔥', desc: 'Sufre daño al inicio de cada turno.' },
    POISON: { name: 'Veneno', emoji: '☠️', desc: 'Sufre daño corrosivo cada turno.' },
    FREEZE: { name: 'Congelación', emoji: '❄️', desc: 'Incapaz de actuar o atacar.' },
    CURSE: { name: 'Maldición', emoji: '🔮', desc: 'Recibe +50% de daño adicional.' },
    REGEN: { name: 'Regeneración', emoji: '🌿', desc: 'Recupera salud al inicio de cada turno.' },
    AMNESIA: { name: 'Amnesia', emoji: '🌫️', desc: 'Bloquea el uso de habilidades especiales.' },
    DELIRIUM: { name: 'Delirio', emoji: '🤪', desc: '50% de probabilidad de fallar el ataque.' },
    TRAUMA: { name: 'Trauma', emoji: '🩸', desc: 'Impide generar o mantener escudo.' }
};

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
        const info = STATUS_EFFECTS_INFO[statusType] || { name: statusType, emoji: '🌀' };
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
                if (t.kind === 'HERO') player.hp = Math.max(0, player.hp - dmg);
                else t.obj.hp = Math.max(0, t.obj.hp - dmg);
                createFloatingText(playerKey, `-${dmg} HP (Quemadura)`, '#f97316');
            } else if (status.id === 'POISON') {
                const dmg = status.val;
                if (t.kind === 'HERO') player.hp = Math.max(0, player.hp - dmg);
                else t.obj.hp = Math.max(0, t.obj.hp - dmg);
                createFloatingText(playerKey, `-${dmg} HP (Veneno)`, '#10b981');
            } else if (status.id === 'REGEN') {
                const heal = status.val;
                if (t.kind === 'HERO') player.hp = Math.min(player.maxHp, player.hp + heal);
                else t.obj.hp = Math.min(t.obj.maxHp, t.obj.hp + heal);
                createFloatingText(playerKey, `+${heal} HP (Regen)`, '#10b981');
            } else if (status.id === 'TRAUMA') {
                if (t.kind === 'HERO') player.shield = 0;
            }

            status.duration -= 1;
            if (status.duration > 0) activeStatuses.push(status);
        });

        t.obj.statuses = activeStatuses;
    });

    player.entities = player.entities.filter(e => e.hp > 0);
    recalculatePositionAuras(playerKey);
}