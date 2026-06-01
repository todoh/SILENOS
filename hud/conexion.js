import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"; 
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"; 
import { getDatabase, ref, set, get, update, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js"; 
import { firebaseConfig } from "./config.js"; 

// Inicialización de servicios del núcleo 
const app = initializeApp(firebaseConfig); 
export const auth = getAuth(app); 
export const db = getDatabase(app); 
const provider = new GoogleAuthProvider(); 

// Funciones de Autenticación de Red 
export function loginWithGoogle() {     
    return signInWithPopup(auth, provider); 
}
export function logoutSession() {     
    return signOut(auth); 
}
export function subscribeToAuthState(callback) {     
    onAuthStateChanged(auth, callback); 
}

// Interacciones directas con Database 
export function getUserMapping(uid) {     
    return get(ref(db, `uid_to_realid/${uid}`)); 
}
export function getAllUsers() {     
    return get(ref(db, 'users')); 
}
export function writeTransaction(updates) {     
    return update(ref(db), updates); 
}
export function updateUserFields(realId, fields) {     
    return update(ref(db, `users/${realId}`), fields); 
}
export function createFriendRequest(targetRealId, senderRealId) {     
    return set(ref(db, `friend_requests/${targetRealId}/${senderRealId}`), "pending"); 
}
export function removeFriendRequest(myRealId, targetRealId) {     
    return set(ref(db, `friend_requests/${myRealId}/${targetRealId}`), null); 
}
export function listenToUserNode(realId, callback) {     
    return onValue(ref(db, `users/${realId}`), callback); 
}
export function listenToRequestsNode(realId, callback) {     
    return onValue(ref(db, `friend_requests/${realId}`), callback); 
}
export function listenToFriendsNode(realId, callback) {     
    return onValue(ref(db, `friends/${realId}`), callback); 
}
export function listenToGlobalUsersNode(callback) {     
    return onValue(ref(db, 'users'), callback); 
}

// ========================================================================== 
// GESTIÓN DE CHATS, PESTAÑAS Y NOTIFICACIONES 
// ==========================================================================  

/**
 * Genera un ID único y ordenado para la sala de chat entre dos usuarios de forma determinista.
 */
export function getChatId(idA, idB) {     
    return Number(idA) < Number(idB) ? `${idA}_${idB}` : `${idB}_${idA}`;  
}

/**
 * Escucha en tiempo real las pestañas de chat activas de un usuario concreto.
 */
export function listenToActiveTabs(realId, callback) {     
    return onValue(ref(db, `active_tabs/${realId}`), callback); 
}

/**
 * Abre una pestaña de chat para un usuario concreto y puede marcar su estado como activo.
 */
export function openChatTab(myRealId, targetRealId, isVisible = true) {     
    const estado = isVisible ? "active" : "notification";     
    return set(ref(db, `active_tabs/${myRealId}/${targetRealId}`), estado); 
}

/**
 * Cierra de raíz la pestaña de chat en la base de datos eliminando su registro.
 */
export function closeChatTab(myRealId, targetRealId) {     
    return set(ref(db, `active_tabs/${myRealId}/${targetRealId}`), null); 
}

/**
 * Limpia el flag de notificación devolviendo la pestaña a su estado activo estándar.
 */
export function clearChatNotification(myRealId, targetRealId) {     
    return set(ref(db, `active_tabs/${myRealId}/${targetRealId}`), "active"); 
}

/**
 * Escucha en tiempo real los mensajes de una sala de chat específica.
 */
export function listenToChatRoom(chatId, callback) {     
    return onValue(ref(db, `chats/${chatId}/messages`), callback); 
}

/**
 * Añade un mensaje al nodo de la sala de chat correspondiente y levanta una notificación al receptor.
 */
export function sendMessage(chatId, senderRealId, text, extraFields = {}) {     
    const chatMessagesRef = ref(db, `chats/${chatId}/messages`);          
    return get(chatMessagesRef).then((snapshot) => {         
        let messages = snapshot.val() || [];         
        if (!Array.isArray(messages)) {             
            messages = [];         
        }                  
        const nuevoMensaje = {             
            sender: senderRealId,             
            text: text,             
            timestamp: Date.now(),             
            ...extraFields         
        };         
        messages.push(nuevoMensaje);         
        const updates = {};         
        updates[`chats/${chatId}/messages`] = messages;         
        const partes = chatId.split("_");         
        const receiverRealId = partes[0] === String(senderRealId) ? partes[1] : partes[0];         
        
        // Solo alteramos pestañas si es un mensaje de texto real, no una señal WebRTC oculta 
        if (!extraFields.signalType) {             
            const receiverTabRef = ref(db, `active_tabs/${receiverRealId}/${senderRealId}`);             
            return get(receiverTabRef).then((tabSnap) => {                 
                if (tabSnap.val() !== "active") {                     
                    updates[`active_tabs/${receiverRealId}/${senderRealId}`] = "notification";                 
                }                 
                return update(ref(db), updates);             
            });         
        } else {             
            return update(ref(db), updates);         
        }     
    });  
}

/**
 * Levanta de forma remota una pestaña en estado de notificación para advertir de una llamada entrante.
 */
export function notifyIncomingCallTab(receiverRealId, senderRealId) {     
    const receiverTabRef = ref(db, `active_tabs/${receiverRealId}/${senderRealId}`);     
    return get(receiverTabRef).then((tabSnap) => {         
        if (tabSnap.val() !== "active") {             
            return set(receiverTabRef, "notification");         
        }     
    }); 
}

// ==========================================================================
// GESTIÓN DE PRESENCIA PARA CONTROL DE LLAMADAS 
// ==========================================================================

export function establecerPresenciaLlamada(chatId, myRealId) {
    const llamadaRef = ref(db, `llamadas_activas/${chatId}/${myRealId}`);
    set(llamadaRef, true);
    onDisconnect(llamadaRef).remove();
}

export function removerPresenciaLlamada(chatId, myRealId) {
    return set(ref(db, `llamadas_activas/${chatId}/${myRealId}`), null);
}

export function escucharPresenciaLlamada(chatId, callback) {
    return onValue(ref(db, `llamadas_activas/${chatId}`), callback);
}