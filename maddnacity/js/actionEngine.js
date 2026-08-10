// Motor de Procesamiento y Simulación de Acciones
import { ACTIONS_CATALOG } from "./actions.js";

export class ActionEngine {
    constructor(timeEngine) {
        this.timeEngine = timeEngine;
    }

    processOfflineTime(player, currentRealTimestamp) {
        const lastUpdate = player.lastUpdate || currentRealTimestamp;
        if (currentRealTimestamp <= lastUpdate) return false;

        const elapsedRealMs = currentRealTimestamp - lastUpdate;
        const elapsedRealSeconds = elapsedRealMs / 1000;
        let remainingGameMinutes = (elapsedRealSeconds * this.timeEngine.TIME_FACTOR) / 60;
        let modified = false;

        while (remainingGameMinutes > 0) {
            if (player.activeAction) {
                const actionDef = ACTIONS_CATALOG[player.activeAction.type];
                const minutesLeftInAction = player.activeAction.durationMinutes - player.activeAction.progressMinutes;

                if (remainingGameMinutes >= minutesLeftInAction) {
                    this.applyActionEffects(player, actionDef, minutesLeftInAction);
                    remainingGameMinutes -= minutesLeftInAction;
                    player.activeAction = null;
                    modified = true;

                    if (player.actionQueue.length > 0) {
                        player.activeAction = player.actionQueue.shift();
                        player.activeAction.startTimeReal = currentRealTimestamp;
                        player.activeAction.progressMinutes = 0;
                    }
                } else {
                    this.applyActionEffects(player, actionDef, remainingGameMinutes);
                    player.activeAction.progressMinutes += remainingGameMinutes;
                    remainingGameMinutes = 0;
                    modified = true;
                }
            } else if (player.actionQueue.length > 0) {
                player.activeAction = player.actionQueue.shift();
                player.activeAction.startTimeReal = currentRealTimestamp;
                player.activeAction.progressMinutes = 0;
                modified = true;
            } else {
                this.applyIdleDecay(player, remainingGameMinutes);
                remainingGameMinutes = 0;
                modified = true;
            }
        }
        player.lastUpdate = currentRealTimestamp;
        return modified;
    }

    applyActionEffects(player, actionDef, durationGameMinutes) {
        if (!actionDef) return;

        if (actionDef.costPerMinute) {
            const cost = actionDef.costPerMinute * durationGameMinutes;
            player.money = Math.max(0, player.money - cost);
        }

        if (actionDef.moneyGainPerMinute) {
            const workSkillLevel = player.skills?.working?.level || 1;
            const bonusMult = 1 + ((workSkillLevel - 1) * 0.1);
            const gain = actionDef.moneyGainPerMinute * bonusMult * durationGameMinutes;
            player.money += gain;
        }

        if (actionDef.effectsPerMinute) {
            player.stats.health = Math.min(100, Math.max(0, player.stats.health + (actionDef.effectsPerMinute.health || 0) * durationGameMinutes));
            player.stats.energy = Math.min(100, Math.max(0, player.stats.energy + (actionDef.effectsPerMinute.energy || 0) * durationGameMinutes));
            player.stats.mood = Math.min(100, Math.max(0, player.stats.mood + (actionDef.effectsPerMinute.mood || 0) * durationGameMinutes));
        }

        if (actionDef.xpGain && actionDef.xpGain.skill && player.skills[actionDef.xpGain.skill]) {
            const xpGained = actionDef.xpGain.xpPerMinute * durationGameMinutes;
            const skillObj = player.skills[actionDef.xpGain.skill];
            skillObj.xp += xpGained;

            const neededXp = skillObj.level * 100;
            if (skillObj.xp >= neededXp) {
                skillObj.xp -= neededXp;
                skillObj.level += 1;
            }
        }
    }

    applyIdleDecay(player, gameMinutes) {
        player.stats.energy = Math.max(0, player.stats.energy - (0.05 * gameMinutes));
        player.stats.mood = Math.max(0, player.stats.mood - (0.02 * gameMinutes));

        if (player.stats.energy === 0) {
            player.stats.health = Math.max(0, player.stats.health - (0.08 * gameMinutes));
        }
    }

    enqueueAction(player, actionType, durationMinutes) {
        if (!ACTIONS_CATALOG[actionType]) return { success: false, reason: "Acción no válida." };
        const queueLength = (player.activeAction ? 1 : 0) + player.actionQueue.length;
        if (queueLength >= 5) {
            return { success: false, reason: "La cola de acciones está llena (máximo 5 actividades)." };
        }
        const actionItem = {
            id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            type: actionType,
            durationMinutes: durationMinutes,
            progressMinutes: 0
        };
        if (!player.activeAction) {
            player.activeAction = actionItem;
        } else {
            player.actionQueue.push(actionItem);
        }
        return { success: true };
    }

    cancelQueueItem(player, index) {
        if (index >= 0 && index < player.actionQueue.length) {
            player.actionQueue.splice(index, 1);
            return true;
        }
        return false;
    }
}