// Motor Multijugador, Clasificación Global de Ciudadanos e Interacciones
import { db } from "./firebase.js";
import { collection, query, orderBy, limit, getDocs, doc, setDoc, addDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export class MultiplayerEngine {
    constructor() {
        this.leaderboardCollection = "leaderboard";
        this.chatCollection = "global_chat";
        this.unsubscribeChat = null;
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

    // Enviar un mensaje al Chat Global
    async sendChatMessage(player, messageText) {
        if (!player || !messageText || !messageText.trim()) return false;
        try {
            // Limpieza automática preventiva antes de mandar un mensaje nuevo
            this.cleanOldChatMessages();

            await addDoc(collection(db, this.chatCollection), {
                senderId: player.id,
                senderName: player.name || "Ciudadano",
                senderAvatar: player.avatar || "images/1.jpg",
                text: messageText.trim(),
                timestamp: Date.now()
            });
            return true;
        } catch (e) {
            console.error("Error al enviar mensaje de chat:", e);
            return false;
        }
    }

    // Eliminar un mensaje propio específico
    async deleteChatMessage(messageId, playerId) {
        if (!messageId || !playerId) return false;
        try {
            const messageRef = doc(db, this.chatCollection, messageId);
            await deleteDoc(messageRef);
            return true;
        } catch (e) {
            console.error("Error al eliminar el mensaje:", e);
            return false;
        }
    }

    // Purgar de Firestore los mensajes con más de 1 hora (3600000 ms) de antigüedad
    async cleanOldChatMessages() {
        try {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            const q = query(
                collection(db, this.chatCollection),
                orderBy("timestamp", "asc")
            );
            const querySnapshot = await getDocs(q);
            
            const deletePromises = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.timestamp && data.timestamp < oneHourAgo) {
                    deletePromises.push(deleteDoc(doc(db, this.chatCollection, docSnap.id)));
                }
            });

            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
            }
        } catch (e) {
            console.error("Error al purgar chat antiguo:", e);
        }
    }

    // Escuchar mensajes del Chat Global en tiempo real y filtrar los expirados localmente
    listenToGlobalChat(callback, maxMessages = 30) {
        if (this.unsubscribeChat) {
            this.unsubscribeChat();
        }

        const q = query(
            collection(db, this.chatCollection),
            orderBy("timestamp", "desc"),
            limit(maxMessages)
        );

        this.unsubscribeChat = onSnapshot(q, (snapshot) => {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            const messages = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                // Filtrar localmente en caso de que aún no hayan sido purgados en BD
                if (data.timestamp && data.timestamp >= oneHourAgo) {
                    messages.push({ id: doc.id, ...data });
                }
            });

            messages.reverse();
            callback(messages);
        }, (error) => {
            console.error("Error escuchando el chat global:", error);
        });
    }
}