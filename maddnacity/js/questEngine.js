// js/questEngine.js
// Motor de Procesamiento y Seguimiento de Misiones (Versión Completa Mejorada)
import { QUESTS_CATALOG, QUEST_TYPES } from "./questsCatalog.js";

export class QuestEngine {
    constructor(timeEngine) {
        this.timeEngine = timeEngine;
    }

    // Aceptar misión
    acceptQuest(player, questId) {
        const qDef = QUESTS_CATALOG[questId];
        if (!qDef) return { success: false, reason: "Misión inexistente." };
        if (!player.quests) player.quests = { active: {}, completed: [] };
        if (player.quests.completed.includes(questId)) {
            return { success: false, reason: "Misión ya completada." };
        }
        if (player.quests.active[questId]) {
            return { success: false, reason: "Misión ya en curso." };
        }

        // Evaluar progreso inicial para misiones de conteo, habilidades o inventario
        let initialProgress = 0;
        if (qDef.type === QUEST_TYPES.BUSINESS) {
            initialProgress = this.calculateBusinessProgress(player, qDef);
        } else if (qDef.type === QUEST_TYPES.SKILL) {
            initialProgress = this.calculateSkillProgress(player, qDef);
        } else if (qDef.type === QUEST_TYPES.DELIVERY) {
            initialProgress = this.calculateDeliveryProgress(player, qDef);
        }

        const isAlreadyCompleted = initialProgress >= qDef.targetAmount;

        player.quests.active[questId] = {
            progress: Math.min(initialProgress, qDef.targetAmount),
            target: qDef.targetAmount,
            completed: isAlreadyCompleted,
            startedAt: Date.now()
        };

        return { success: true };
    }

    // Registrar progreso por eventos/acciones
    trackProgress(player, type, key, amount) {
        if (!player.quests || !player.quests.active) return false;
        let updated = false;

        Object.keys(player.quests.active).forEach(qId => {
            const qState = player.quests.active[qId];
            const qDef = QUESTS_CATALOG[qId];

            if (qDef && !qState.completed) {
                if (qDef.type === type) {
                    if (type === QUEST_TYPES.ACTION && qDef.targetAction === key) {
                        qState.progress += amount;
                        if (qState.progress >= qState.target) {
                            qState.progress = qState.target;
                            qState.completed = true;
                        }
                        updated = true;
                    } else if (type === QUEST_TYPES.BUSINESS) {
                        if (!qDef.targetAction || qDef.targetAction === key) {
                            qState.progress += amount;
                            if (qState.progress >= qState.target) {
                                qState.progress = qState.target;
                                qState.completed = true;
                            }
                            updated = true;
                        }
                    }
                }
            }
        });

        this.checkAllActiveQuests(player);
        return updated;
    }

    // Verificar y actualizar misiones activas basadas en el estado actual del jugador
    checkAllActiveQuests(player) {
        if (!player.quests || !player.quests.active) return;

        Object.keys(player.quests.active).forEach(qId => {
            const qState = player.quests.active[qId];
            const qDef = QUESTS_CATALOG[qId];

            if (qDef && !qState.completed) {
                if (qDef.type === QUEST_TYPES.BUSINESS) {
                    const currentProgress = this.calculateBusinessProgress(player, qDef);
                    if (currentProgress > qState.progress) {
                        qState.progress = Math.min(currentProgress, qState.target);
                    }
                    if (qState.progress >= qState.target) {
                        qState.completed = true;
                    }
                } else if (qDef.type === QUEST_TYPES.SKILL) {
                    const currentProgress = this.calculateSkillProgress(player, qDef);
                    if (currentProgress > qState.progress) {
                        qState.progress = Math.min(currentProgress, qState.target);
                    }
                    if (qState.progress >= qState.target) {
                        qState.completed = true;
                    }
                } else if (qDef.type === QUEST_TYPES.DELIVERY) {
                    const currentProgress = this.calculateDeliveryProgress(player, qDef);
                    if (currentProgress > qState.progress) {
                        qState.progress = Math.min(currentProgress, qState.target);
                    }
                    if (qState.progress >= qState.target) {
                        qState.completed = true;
                    }
                }
            }
        });
    }

    // Cálculo de progreso para misiones tipo BUSINESS
    calculateBusinessProgress(player, qDef) {
        if (!qDef) return 0;
        switch (qDef.targetAction) {
            case "BUY_PROPERTY":
            case "PROPERTIES_COUNT":
                return (player.properties || []).length;
            case "FOUND_BUSINESS":
            case "BUSINESS_COUNT":
                return (player.businesses || []).length;
            case "SPECIFIC_PROPERTY":
                return (player.properties || []).filter(p => p.typeId === qDef.targetKey).length;
            case "SPECIFIC_BUSINESS":
                return (player.businesses || []).filter(b => b.typeId === qDef.typeId || b.typeId === qDef.targetKey).length;
            default:
                return 0;
        }
    }

    // Cálculo de progreso para misiones tipo SKILL
    calculateSkillProgress(player, qDef) {
        if (!qDef || !qDef.targetSkill || !player.skills || !player.skills[qDef.targetSkill]) return 0;
        return player.skills[qDef.targetSkill].level || 0;
    }

    // Cálculo de progreso para misiones tipo DELIVERY (Suministros en Inventario)
    calculateDeliveryProgress(player, qDef) {
        if (!qDef || !qDef.targetItem || !player.inventory) return 0;
        return player.inventory[qDef.targetItem] || 0;
    }

    // Reclamar recompensa de misión completada
    claimReward(player, questId) {
        if (!player.quests || !player.quests.active) {
            return { success: false, reason: "Estructura de misiones no válida." };
        }

        const qState = player.quests.active[questId];
        const qDef = QUESTS_CATALOG[questId];

        if (!qState || !qState.completed) return { success: false, reason: "Misión no completada." };

        // Si es tipo DELIVERY, consumir los objetos requeridos
        if (qDef.type === QUEST_TYPES.DELIVERY && qDef.targetItem) {
            const reqAmount = qDef.targetAmount || 1;
            if ((player.inventory[qDef.targetItem] || 0) >= reqAmount) {
                player.inventory[qDef.targetItem] -= reqAmount;
                if (player.inventory[qDef.targetItem] <= 0) {
                    delete player.inventory[qDef.targetItem];
                }
            } else {
                return { success: false, reason: "No dispones de los objetos necesarios en el inventario." };
            }
        }

        // Aplicar Recompensas
        if (qDef.rewards.money) player.money += qDef.rewards.money;
        if (qDef.rewards.reputation) player.reputation = (player.reputation || 0) + qDef.rewards.reputation;
        if (qDef.rewards.xp && player.skills && player.skills[qDef.rewards.xp.skill]) {
            const skillObj = player.skills[qDef.rewards.xp.skill];
            skillObj.xp += qDef.rewards.xp.amount;
            const neededXp = skillObj.level * 100;
            if (skillObj.xp >= neededXp) {
                skillObj.xp -= neededXp;
                skillObj.level += 1;
                if (skillObj.level > 5) {
                    skillObj.talentPoints = (skillObj.talentPoints || 0) + 1;
                }
            }
        }

        // Mover a completadas
        delete player.quests.active[questId];
        if (!player.quests.completed) player.quests.completed = [];
        if (!player.quests.completed.includes(questId)) {
            player.quests.completed.push(questId);
        }

        // Aceptar automáticamente la siguiente misión solo si existe y no está completada
        if (qDef.nextQuest && QUESTS_CATALOG[qDef.nextQuest]) {
            if (!player.quests.completed.includes(qDef.nextQuest)) {
                this.acceptQuest(player, qDef.nextQuest);
            }
        }

        return { success: true, nextQuest: qDef.nextQuest };
    }
}