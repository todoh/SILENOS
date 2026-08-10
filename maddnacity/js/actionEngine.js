// js/actionEngine.js
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

        const mods = player.modifiers || {};

        // Descuento de costes por acción si aplicase
        if (actionDef.costPerMinute) {
            const cost = actionDef.costPerMinute * durationGameMinutes;
            player.money = Math.max(0, player.money - cost);
        }

        // Ganancia de dinero
        if (actionDef.moneyGainPerMinute) {
            const workSkillLevel = player.skills?.working?.level || 1;
            const bonusMult = 1 + ((workSkillLevel - 1) * 0.1);
            const gain = actionDef.moneyGainPerMinute * bonusMult * durationGameMinutes;
            player.money += gain;
        }

        // Modificadores en Vitales
        if (actionDef.effectsPerMinute) {
            let healthDelta = (actionDef.effectsPerMinute.health || 0) * durationGameMinutes;
            let energyDelta = (actionDef.effectsPerMinute.energy || 0) * durationGameMinutes;
            let moodDelta = (actionDef.effectsPerMinute.mood || 0) * durationGameMinutes;

            // Reducción de coste/desgaste de energía si es negativo
            if (energyDelta < 0 && mods.energyCostMult) {
                energyDelta *= (1 + mods.energyCostMult);
            }

            // Bonificadores de regeneración en descanso/SLEEP
            if (actionDef.id === "SLEEP") {
                if (mods.sleepRegenBonus) energyDelta *= (1 + mods.sleepRegenBonus);
                if (mods.healthRegenBonus) healthDelta *= (1 + mods.healthRegenBonus);
                if (mods.moodRegenBonus) moodDelta *= (1 + mods.moodRegenBonus);
            }

            const maxHealth = 100 + (mods.maxHealthBonus || 0);

            player.stats.health = Math.min(maxHealth, Math.max(0, player.stats.health + healthDelta));
            player.stats.energy = Math.min(100, Math.max(0, player.stats.energy + energyDelta));
            player.stats.mood = Math.min(100, Math.max(0, player.stats.mood + moodDelta));
        }

        // Ganancia de XP con modificadores de rama
        if (actionDef.xpGain && actionDef.xpGain.skill && player.skills[actionDef.xpGain.skill]) {
            let xpGained = actionDef.xpGain.xpPerMinute * durationGameMinutes;
            const skillKey = actionDef.xpGain.skill;

            // Modificador de XP específico por habilidad (ej. Trainer Mentor)
            const skillXpBonus = mods[`xpGain_${skillKey}`] || 0;
            xpGained *= (1 + skillXpBonus);

            const skillObj = player.skills[skillKey];
            skillObj.xp += xpGained;
            const neededXp = skillObj.level * 100;

            if (skillObj.xp >= neededXp) {
                skillObj.xp -= neededXp;
                skillObj.level += 1;

                // Otorgar punto de talento si supera el Hito de Nivel 5
                if (skillObj.level > 5) {
                    skillObj.talentPoints = (skillObj.talentPoints || 0) + 1;
                }
            }
        }
    }

    applyIdleDecay(player, gameMinutes) {
        let energyLoss = 0.05 * gameMinutes;
        if (player.modifiers?.energyCostMult) {
            energyLoss *= (1 + player.modifiers.energyCostMult);
        }

        player.stats.energy = Math.max(0, player.stats.energy - energyLoss);
        player.stats.mood = Math.max(0, player.stats.mood - (0.02 * gameMinutes));

        if (player.stats.energy === 0) {
            player.stats.health = Math.max(0, player.stats.health - (0.08 * gameMinutes));
        }
    }

    enqueueAction(player, actionType, durationMinutes) {
        if (!ACTIONS_CATALOG[actionType]) return { success: false, reason: "Acción no válida." };

        const mods = player.modifiers || {};
        const maxQueue = 5 + (mods.maxQueueBonus || 0);

        const queueLength = (player.activeAction ? 1 : 0) + player.actionQueue.length;
        if (queueLength >= maxQueue) {
            return { success: false, reason: `La cola de acciones está llena (máximo ${maxQueue} actividades).` };
        }

        // Reducción de tiempo efectiva por vehículos poseídos
        let effectiveDuration = durationMinutes;
        if (mods.timeReduction && mods.timeReduction > 0) {
            effectiveDuration = Math.max(1, Math.round(durationMinutes * (1 - mods.timeReduction)));
        }

        const actionItem = {
            id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            type: actionType,
            durationMinutes: effectiveDuration,
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