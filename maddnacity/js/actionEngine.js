// Motor de Procesamiento y Simulación de Acciones (Realtime y Offline)
import { ACTIONS_CATALOG } from "./actions.js";

export class ActionEngine {
    constructor(timeEngine) {
        this.timeEngine = timeEngine;
    }

    // Procesa el tiempo transcurrido entre dos timestamps reales para un personaje
    processOfflineTime(player, currentRealTimestamp) {
        const lastUpdate = player.lastUpdate || currentRealTimestamp;
        if (currentRealTimestamp <= lastUpdate) return false;

        const elapsedRealMs = currentRealTimestamp - lastUpdate;
        const elapsedRealSeconds = elapsedRealMs / 1000;
        let remainingGameMinutes = (elapsedRealSeconds * this.timeEngine.TIME_FACTOR) / 60;

        let modified = false;

        while (remainingGameMinutes > 0) {
            // 1. Si hay una acción activa, consumirla
            if (player.activeAction) {
                const actionDef = ACTIONS_CATALOG[player.activeAction.type];
                const minutesLeftInAction = player.activeAction.durationMinutes - player.activeAction.progressMinutes;

                if (remainingGameMinutes >= minutesLeftInAction) {
                    // Completar acción actual
                    this.applyActionEffects(player, actionDef, minutesLeftInAction);
                    remainingGameMinutes -= minutesLeftInAction;
                    player.activeAction = null;
                    modified = true;

                    // Promover siguiente acción de la cola
                    if (player.actionQueue.length > 0) {
                        player.activeAction = player.actionQueue.shift();
                        player.activeAction.startTimeReal = currentRealTimestamp;
                        player.activeAction.progressMinutes = 0;
                    }
                } else {
                    // Avance parcial de la acción activa
                    this.applyActionEffects(player, actionDef, remainingGameMinutes);
                    player.activeAction.progressMinutes += remainingGameMinutes;
                    remainingGameMinutes = 0;
                    modified = true;
                }
            } 
            // 2. Si no hay acción activa pero hay en cola, arrancar la siguiente
            else if (player.actionQueue.length > 0) {
                player.activeAction = player.actionQueue.shift();
                player.activeAction.startTimeReal = currentRealTimestamp;
                player.activeAction.progressMinutes = 0;
                modified = true;
            } 
            // 3. Ocioso / Pasivo: aplicar desgaste pasivo por minutos sobrantes
            else {
                this.applyIdleDecay(player, remainingGameMinutes);
                remainingGameMinutes = 0;
                modified = true;
            }
        }

        player.lastUpdate = currentRealTimestamp;
        return modified;
    }

    // Aplica proporcionalmente los cambios de estadísticas y experiencia incorporando la eficiencia de habilidades
    applyActionEffects(player, actionDef, durationGameMinutes) {
        if (!actionDef) return;

        // Calcular multiplicador de eficiencia según la habilidad asociada (+2% de ganancia/rendimiento y -1.5% de desgaste por nivel)
        let efficiencyMultiplier = 1.0;
        let fatigueReductionMultiplier = 1.0;

        if (actionDef.xpGain && actionDef.xpGain.skill && player.skills?.[actionDef.xpGain.skill]) {
            const skillLevel = player.skills[actionDef.xpGain.skill].level;
            efficiencyMultiplier += (skillLevel - 1) * 0.02;
            fatigueReductionMultiplier = Math.max(0.5, 1.0 - ((skillLevel - 1) * 0.015));
        }

        // Costes monetarios
        if (actionDef.costPerMinute) {
            const cost = actionDef.costPerMinute * durationGameMinutes;
            player.money = Math.max(0, player.money - cost);
        }

        // Ganancia monetaria con bonificación de eficiencia de habilidad
        if (actionDef.moneyGainPerMinute) {
            const gain = (actionDef.moneyGainPerMinute * efficiencyMultiplier) * durationGameMinutes;
            player.money += gain;
        }

        // Stats con reducción de fatiga / incremento de regeneración
        if (actionDef.effectsPerMinute) {
            let healthDelta = (actionDef.effectsPerMinute.health || 0) * durationGameMinutes;
            let energyDelta = (actionDef.effectsPerMinute.energy || 0) * durationGameMinutes;
            let moodDelta = (actionDef.effectsPerMinute.mood || 0) * durationGameMinutes;

            // Si el efecto es pérdida (negativo), se reduce con la habilidad. Si es ganancia (positivo), se multiplica por la eficiencia.
            healthDelta = healthDelta < 0 ? healthDelta * fatigueReductionMultiplier : healthDelta * efficiencyMultiplier;
            energyDelta = energyDelta < 0 ? energyDelta * fatigueReductionMultiplier : energyDelta * efficiencyMultiplier;
            moodDelta = moodDelta < 0 ? moodDelta * fatigueReductionMultiplier : moodDelta * efficiencyMultiplier;

            player.stats.health = Math.min(100, Math.max(0, player.stats.health + healthDelta));
            player.stats.energy = Math.min(100, Math.max(0, player.stats.energy + energyDelta));
            player.stats.mood = Math.min(100, Math.max(0, player.stats.mood + moodDelta));
        }

        // Experiencia
        if (actionDef.xpGain && actionDef.xpGain.skill && player.skills[actionDef.xpGain.skill]) {
            const xpGained = actionDef.xpGain.xpPerMinute * durationGameMinutes;
            const skillObj = player.skills[actionDef.xpGain.skill];
            skillObj.xp += xpGained;

            // Requisito subida nivel: Nivel * 100 XP
            let neededXp = skillObj.level * 100;
            while (skillObj.xp >= neededXp) {
                skillObj.xp -= neededXp;
                skillObj.level += 1;
                neededXp = skillObj.level * 100;
            }
        }
    }

    // Desgaste natural cuando el ciudadano no está realizando ninguna actividad
    applyIdleDecay(player, gameMinutes) {
        player.stats.energy = Math.max(0, player.stats.energy - (0.05 * gameMinutes));
        player.stats.mood = Math.max(0, player.stats.mood - (0.02 * gameMinutes));

        if (player.stats.energy === 0) {
            player.stats.health = Math.max(0, player.stats.health - (0.08 * gameMinutes));
        }
    }

    // Añadir una acción a la cola del jugador (máximo 5)
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

    // Cancelar una acción de la cola
    cancelQueueItem(player, index) {
        if (index >= 0 && index < player.actionQueue.length) {
            player.actionQueue.splice(index, 1);
            return true;
        }
        return false;
    }
}