import * as conexion from "./conexion.js";
import { dom, showSubPanel, renderRequests, renderFriends, renderTuentiBar } from "./ui.js";
import { initAuth, currentUserData } from "./auth.js";
import { manageChatWindows, initChatContainerEvents } from "./chat.js";
import { escucharLlamadasEntrantes } from "./webrtc.js";

// --- NAVEGACIÓN DIRECTA DE SUB-PANELES ---
dom.menuOptName.addEventListener("click", () => showSubPanel(dom.subPanelName));
dom.menuOptImage.addEventListener("click", () => showSubPanel(dom.subPanelImage));
dom.menuOptFriends.addEventListener("click", () => showSubPanel(dom.subPanelFriends));

// --- ENLACE AUXILIAR DE IDENTIDAD ---
const getMyRealId = () => currentUserData ? currentUserData.realId : null;

// --- INICIALIZACIÓN DEL SISTEMA ---
initAuth((realId) => {
    listenToNetwork(realId);
});

// Iniciamos los manejadores globales del Chat Flotante
initChatContainerEvents(getMyRealId);

// --- OPERACIONES DE PETICIONES DE AMISTAD ---
dom.btnSendRequest.addEventListener("click", () => {
    dom.searchError.innerText = "";
    const targetUsername = dom.inputSearchUsername.value.trim().toLowerCase();
    if (!targetUsername) return;
    if (targetUsername === currentUserData.username) {
        dom.searchError.innerText = "No puedes mandarte una petición a ti mismo.";
        return;
    }
    conexion.getAllUsers().then((snapshot) => {
        if (!snapshot.exists()) return;
        
        const allUsers = snapshot.val();
        let targetRealId = null;
        for (let id in allUsers) {
            if (allUsers[id].username === targetUsername) {
                targetRealId = id;
                break;
            }
        }
        if (!targetRealId) {
            dom.searchError.innerText = "Usuario no encontrado.";
            return;
        }
        conexion.createFriendRequest(targetRealId, currentUserData.realId).then(() => {
            dom.inputSearchUsername.value = "";
            alert("Petición enviada.");
        });
    });
});

// --- ESCUCHA DE NODOS DE RED Y ENLACE DE RENDERS ---
function listenToNetwork(myRealId) {
    // 1. Peticiones de amistad recibidas
    conexion.listenToRequestsNode(myRealId, (snapshot) => {
        const requests = snapshot.val() || {};
        conexion.getAllUsers().then((userSnap) => {
            const allUsers = userSnap.val() || {};
            renderRequests(requests, allUsers, myRealId);
        });
    });

    // 2. Gestión mutua de la lista de amigos e inicialización de canales de llamada
    conexion.listenToFriendsNode(myRealId, (snapshot) => {
        const friendsList = snapshot.val() || {};
        conexion.getAllUsers().then((userSnap) => {
            const allUsers = userSnap.val() || {};
            renderFriends(friendsList, allUsers);
            
            // Enganchamos la escucha de señales WebRTC directamente sobre cada chat activo con tus amigos
            for (let friendRealId in friendsList) {
                if (friendsList[friendRealId] === true) {
                    const chatId = conexion.getChatId(myRealId, friendRealId);
                    escucharLlamadasEntrantes(chatId, myRealId);
                }
            }
        });
    });

    // 3. Escucha en tiempo real de las Pestañas de Chat Activas en la barra
    conexion.listenToActiveTabs(myRealId, (snapshot) => {
        const activeTabs = snapshot.val() || {};
        conexion.getAllUsers().then((userSnap) => {
            const allUsers = userSnap.val() || {};
            renderTuentiBar(activeTabs, allUsers);
            manageChatWindows(activeTabs, allUsers, myRealId);
        });
    });
}

// --- EVENTOS INTERACTIVOS EN ENLACES DE LISTAS DE USUARIOS ---
dom.listRequests.addEventListener("click", (e) => {
    const acceptId = e.target.getAttribute("data-accept");
    const rejectId = e.target.getAttribute("data-reject");
    const myRealId = getMyRealId();
    if (acceptId) {
        const updates = {};
        updates[`friend_requests/${myRealId}/${acceptId}`] = null;
        updates[`friends/${myRealId}/${acceptId}`] = true;
        updates[`friends/${acceptId}/${myRealId}`] = true;
        conexion.writeTransaction(updates);
    }
    if (rejectId) {
        conexion.removeFriendRequest(myRealId, rejectId);
    }
});

dom.listFriends.addEventListener("click", (e) => {
    const removeId = e.target.getAttribute("data-remove");
    const chatUserId = e.target.getAttribute("data-chat");
    const myRealId = getMyRealId();
    if (removeId) {
        const updates = {};
        updates[`friends/${myRealId}/${removeId}`] = null;
        updates[`friends/${removeId}/${myRealId}`] = null;
        conexion.writeTransaction(updates);
    }
    if (chatUserId) {
        conexion.openChatTab(myRealId, chatUserId, true);
    }
});