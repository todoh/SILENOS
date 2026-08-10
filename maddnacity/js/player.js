// js/player.js
// Gestor del Modelo Player y Firestore Sync (Versión Completa Corregida)
import { db } from "./firebase.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { SPECIALIZATIONS_CATALOG } from "./skillsCatalog.js";
import { LIFESTYLE_CATALOG } from "./lifestyleCatalog.js";

export class PlayerManager {
    constructor() {
        this.currentPlayer = null;
    }

    createDefaultPlayerSchema(uid, name, avatar = "images/1.jpg") {
        return {
            id: uid,
            name: name || "Ciudadano",
            avatar: avatar,
            age: 18,
            money: 10000,
            reputation: 1,
            influence: 0,
            stats: {
                health: 100,
                energy: 100,
                mood: 100
            },
            statsCustom: {
                sudokusCompleted: 0
            },
            skills: {
                cooking: { level: 1, xp: 0, specialization: null, talentPoints: 0, unlockedNodes: [] },
                training: { level: 1, xp: 0, specialization: null, talentPoints: 0, unlockedNodes: [] },
                talking: { level: 1, xp: 0, specialization: null, talentPoints: 0, unlockedNodes: [] },
                working: { level: 1, xp: 0, specialization: null, talentPoints: 0, unlockedNodes: [] }
            },
            quests: {
                active: {
                    "QUEST_001": { progress: 0, target: 60, completed: false, startedAt: Date.now() }
                },
                completed: []
            },
            sudokuState: {
                active: false
            },
            lifestyle: {
                equippedVehicle: null,
                equippedApparel: null,
                equippedHomeComfort: null,
                ownedItems: {}
            },
            modifiers: {},
            activeAction: null,
            actionQueue: [],
            properties: [],
            businesses: [],
            inventory: {},
            lastUpdate: Date.now(),
            lastLifestyleMaintenancePaid: Date.now()
        };
    }

    async loadOrCreatePlayer(uid, name = "", avatar = "images/1.jpg") {
        const playerRef = doc(db, "players", uid);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
            const data = playerSnap.data();
            const defaultSchema = this.createDefaultPlayerSchema(uid, data.name || name, data.avatar || avatar);
            
            // Fusión segura de misiones activas y completadas sin forzar QUEST_001 si ya se completó o eliminó
            const savedQuests = data.quests || {};
            const savedCompleted = savedQuests.completed || [];
            let loadedActive = savedQuests.active !== undefined ? savedQuests.active : defaultSchema.quests.active;

            // Si QUEST_001 está completada, nos aseguramos de que no figure en activas por error de fallback
            if (savedCompleted.includes("QUEST_001") && loadedActive["QUEST_001"]) {
                delete loadedActive["QUEST_001"];
            }

            this.currentPlayer = {
                ...defaultSchema,
                ...data,
                stats: {
                    ...defaultSchema.stats,
                    ...(data.stats || {})
                },
                statsCustom: {
                    ...defaultSchema.statsCustom,
                    ...(data.statsCustom || {})
                },
                skills: {
                    ...defaultSchema.skills,
                    ...(data.skills || {})
                },
                quests: {
                    active: loadedActive,
                    completed: savedCompleted
                },
                sudokuState: {
                    ...defaultSchema.sudokuState,
                    ...(data.sudokuState || {})
                },
                lifestyle: {
                    ...defaultSchema.lifestyle,
                    ...(data.lifestyle || {})
                }
            };
        } else {
            const newPlayerData = this.createDefaultPlayerSchema(uid, name, avatar);
            await setDoc(playerRef, newPlayerData);
            this.currentPlayer = newPlayerData;
        }

        this.recalculatePlayerModifiers(this.currentPlayer);
        return this.currentPlayer;
    }

    async savePlayerState() {
        if (!this.currentPlayer || !this.currentPlayer.id) return;
        const playerRef = doc(db, "players", this.currentPlayer.id);
        this.currentPlayer.lastUpdate = Date.now();
        await setDoc(playerRef, this.currentPlayer, { merge: true });
    }

    recalculatePlayerModifiers(player) {
        if (!player) return;
        const mods = {
            energyCostMult: 0,
            buffDurationMult: 0,
            rentCostMult: 0,
            vaultYieldBonus: 0,
            maxQueueBonus: 0,
            bizMaintenanceMult: 0,
            influenceGainMult: 0,
            purchaseDiscount: 0,
            repGainMult: 0,
            maxHealthBonus: 0,
            collapsePenaltyRed: 0,
            timeReduction: 0,
            socializeSpeed: 0,
            sleepRegenBonus: 0,
            moodRegenBonus: 0,
            healthRegenBonus: 0,
            dailyReputation: 0,
            dailyInfluence: 0,
            foodVitalsBonus: 0
        };

        if (player.skills) {
            Object.keys(player.skills).forEach(skillKey => {
                const sk = player.skills[skillKey];
                if (sk.specialization && sk.unlockedNodes && SPECIALIZATIONS_CATALOG[skillKey]) {
                    const branchDef = SPECIALIZATIONS_CATALOG[skillKey].branches[sk.specialization];
                    if (branchDef && branchDef.nodes) {
                        sk.unlockedNodes.forEach(nodeId => {
                            const nodeDef = branchDef.nodes[nodeId];
                            if (nodeDef && nodeDef.modifiers) {
                                Object.keys(nodeDef.modifiers).forEach(mKey => {
                                    mods[mKey] = (mods[mKey] || 0) + nodeDef.modifiers[mKey];
                                });
                            }
                        });
                    }
                }
            });
        }

        if (player.lifestyle && player.lifestyle.ownedItems) {
            const slots = ["equippedVehicle", "equippedApparel", "equippedHomeComfort"];
            slots.forEach(slotKey => {
                const itemId = player.lifestyle[slotKey];
                if (itemId) {
                    const itemState = player.lifestyle.ownedItems[itemId];
                    if (itemState && itemState.status === "ACTIVE") {
                        const itemDef = LIFESTYLE_CATALOG[itemId];
                        if (itemDef && itemDef.modifiers) {
                            Object.keys(itemDef.modifiers).forEach(mKey => {
                                mods[mKey] = (mods[mKey] || 0) + itemDef.modifiers[mKey];
                            });
                        }
                    }
                }
            });
        }

        player.modifiers = mods;
    }
}