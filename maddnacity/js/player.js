// Gestor del Modelo Player y Firestore Sync (Versión Final Completa)
import { db } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export class PlayerManager {
    constructor() {
        this.currentPlayer = null;
    }

    // Estructura oficial del Ciudadano de Maddna City
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

    // Cargar o registrar personaje en Firestore
    async loadOrCreatePlayer(uid, name = "", avatar = "images/1.jpg") {
        const playerRef = doc(db, "players", uid);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
            this.currentPlayer = playerSnap.data();
            if (!this.currentPlayer.avatar) this.currentPlayer.avatar = "images/1.jpg";
            if (!this.currentPlayer.actionQueue) this.currentPlayer.actionQueue = [];
            if (!this.currentPlayer.properties) this.currentPlayer.properties = [];
            if (!this.currentPlayer.businesses) this.currentPlayer.businesses = [];
            if (!this.currentPlayer.inventory) this.currentPlayer.inventory = {};
        } else {
            const newPlayerData = this.createDefaultPlayerSchema(uid, name, avatar);
            await setDoc(playerRef, newPlayerData);
            this.currentPlayer = newPlayerData;
        }
        return this.currentPlayer;
    }

    // Guardar estado persistente en base de datos
    async savePlayerState() {
        if (!this.currentPlayer) return;
        const playerRef = doc(db, "players", this.currentPlayer.id);
        this.currentPlayer.lastUpdate = Date.now();
        await updateDoc(playerRef, this.currentPlayer);
    }
}