// Motor Multijugador, Clasificación Global de Ciudadanos e Interacciones
import { db } from "./firebase.js";
import { collection, query, orderBy, limit, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export class MultiplayerEngine {
    constructor() {
        this.leaderboardCollection = "leaderboard";
    }

    // Sincronizar estadísticas públicas del personaje para el ranking multijugador
    async updatePublicProfile(player) {
        if (!player || !player.id) return;
        const publicRef = doc(db, this.leaderboardCollection, player.id);
        const publicData = {
            id: player.id,
            name: player.name || "Ciudadano Anónimo",
            avatar: player.avatar || "images/1.jpg",
            money: player.money || 0,
            influence: player.influence || 0,
            reputation: player.reputation || 1,
            businessCount: (player.businesses || []).length,
            propertyCount: (player.properties || []).length,
            lastSeen: Date.now()
        };
        try {
            await setDoc(publicRef, publicData, { merge: true });
        } catch (e) {
            console.error("Error al actualizar perfil público:", e);
        }
    }

    // Obtener la clasificación de los ciudadanos más ricos de Maddna City
    async getTopCitizens(maxResults = 10) {
        try {
            const q = query(
                collection(db, this.leaderboardCollection),
                orderBy("money", "desc"),
                limit(maxResults)
            );
            const querySnapshot = await getDocs(q);
            const citizens = [];
            querySnapshot.forEach(doc => {
                citizens.push(doc.data());
            });
            return citizens;
        } catch (e) {
            console.error("Error al obtener ranking global:", e);
            return [];
        }
    }
}