// Gestor del Modelo Player y Firestore Sync (Versión Completa y Corregida)
import { db } from "./firebase.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
            skills: {
                cooking: { level: 1, xp: 0 },
                training: { level: 1, xp: 0 },
                talking: { level: 1, xp: 0 },
                working: { level: 1, xp: 0 }
            },
            activeAction: null,
            actionQueue: [],
            properties: [],
            businesses: [],
            inventory: {},
            lastUpdate: Date.now()
        };
    }

    async loadOrCreatePlayer(uid, name = "", avatar = "images/1.jpg") {
        const playerRef = doc(db, "players", uid);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
            const data = playerSnap.data();
            this.currentPlayer = {
                ...this.createDefaultPlayerSchema(uid, data.name || name, data.avatar || avatar),
                ...data,
                stats: {
                    health: 100,
                    energy: 100,
                    mood: 100,
                    ...(data.stats || {})
                },
                skills: {
                    cooking: { level: 1, xp: 0 },
                    training: { level: 1, xp: 0 },
                    talking: { level: 1, xp: 0 },
                    working: { level: 1, xp: 0 },
                    ...(data.skills || {})
                }
            };
        } else {
            const newPlayerData = this.createDefaultPlayerSchema(uid, name, avatar);
            await setDoc(playerRef, newPlayerData);
            this.currentPlayer = newPlayerData;
        }
        return this.currentPlayer;
    }

    async savePlayerState() {
        if (!this.currentPlayer || !this.currentPlayer.id) return;
        const playerRef = doc(db, "players", this.currentPlayer.id);
        this.currentPlayer.lastUpdate = Date.now();
        await setDoc(playerRef, this.currentPlayer, { merge: true });
    }
}