import * as conexion from "./conexion.js";  
import { dom, updateChatWindowMessages } from "./ui.js";  
import { iniciarVideollamada } from "./webrtc.js";  

let activeChatListeners = {}; // Mantiene registro de escuchas activos para evitar duplicados  

export function manageChatWindows(activeTabs, allUsers, myRealId) {          
    // Eliminar ventanas que ya no están activas          
    const existingWindows = dom.chatWindowsContainer.querySelectorAll(".chat-window");          
    existingWindows.forEach(win => {                  
        const targetId = win.getAttribute("data-window-id");                  
        if (!activeTabs[targetId]) {                          
            win.remove();                          
            if (activeChatListeners[targetId]) {                                  
                activeChatListeners[targetId](); // Desuscribir nodo Firebase de mensajes                                  
                delete activeChatListeners[targetId];                          
            }                  
        }          
    });          

    // Crear o actualizar ventanas activas          
    for (let targetId in activeTabs) {                  
        const state = activeTabs[targetId];                  
        const friendData = allUsers[targetId] || { username: "Desconocido" };                  
        const chatId = conexion.getChatId(myRealId, targetId);                           
        let win = document.getElementById(`chat-window-${targetId}`);                  
        if (!win) {                          
            win = document.createElement("div");                          
            win.id = `chat-window-${targetId}`;                          
            win.className = "chat-window";                          
            win.setAttribute("data-window-id", targetId);                                       
            win.innerHTML = `                                  
                <div class="chat-header" id="chat-hdr-${targetId}">                                          
                    <span>${friendData.username}</span>                                          
                    <div>                                                  
                        <span class="chat-call-btn" data-call-window="${targetId}" style="margin-right: 12px; cursor: pointer; font-size: 11px; color: #a1c580;">[LLAMAR]</span>                                                  
                        <span class="chat-close-btn" data-close-window="${targetId}">&times;</span>                                          
                    </div>                                  
                </div>                                  
                <div class="chat-body" id="chat-body-${targetId}"></div>                                  
                <div class="chat-footer">                                          
                    <input type="text" id="chat-input-${targetId}" placeholder="Escribe un mensaje..." autocomplete="off">                                  
                </div>                          
            `;                          
            dom.chatWindowsContainer.appendChild(win);                          
            
            // Manejador del Input (Enviar al presionar Enter)                          
            const inputEl = win.querySelector(`#chat-input-${targetId}`);                          
            inputEl.addEventListener("keydown", (e) => {                                  
                if (e.key === "Enter") {                                          
                    const text = inputEl.value.trim();                                          
                    if (!text) return;                                          
                    conexion.sendMessage(chatId, myRealId, text).then(() => {                                                  
                        inputEl.value = "";                                          
                    });                                  
                }                          
            });                          
            
            // Limpiar flag de notificación al hacer click dentro de su input o ventana                          
            win.addEventListener("click", () => {                                  
                if (state === "notification") {                                          
                    conexion.clearChatNotification(myRealId, targetId);                                  
                }                          
            });                          
            
            // Vincular escucha en tiempo real de Firebase para esta sala concreta                          
            activeChatListeners[targetId] = conexion.listenToChatRoom(chatId, (chatSnap) => {                                  
                const messages = chatSnap.val();                                  
                updateChatWindowMessages(targetId, messages, myRealId);                          
            });                  
        }          
    }  
} // <-- CORREGIDO: Cierre de manageChatWindows

// Inicialización de eventos interactivos sobre el contenedor de ventanas y barra inferior  
export function initChatContainerEvents(getMyRealIdFunc) {          
    dom.tuentiBar.addEventListener("click", (e) => {                  
        const closeTabId = e.target.getAttribute("data-close-tab");                  
        const tabTargetId = e.target.closest(".tuenti-tab")?.getAttribute("data-target-id");                  
        const myRealId = getMyRealIdFunc();                  
        if (closeTabId) {                          
            e.stopPropagation();                          
            conexion.closeChatTab(myRealId, closeTabId);                          
            return;                  
        }                  
        if (tabTargetId) {                          
            const win = document.getElementById(`chat-window-${tabTargetId}`);                          
            if (win) {                                  
                win.classList.remove("tuenti-tab-flash");                                  
                win.classList.toggle("chat-window-minimized");                                  
                conexion.clearChatNotification(myRealId, tabTargetId);                          
            }                  
        }          
    });          

    dom.chatWindowsContainer.addEventListener("click", (e) => {                  
        const closeWinId = e.target.getAttribute("data-close-window");                  
        const callTargetId = e.target.getAttribute("data-call-window");                  
        const myRealId = getMyRealIdFunc();                           
        if (closeWinId) {                          
            conexion.closeChatTab(myRealId, closeWinId);                          
            return;                  
        }                  
        if (callTargetId) {                          
            const chatId = conexion.getChatId(myRealId, callTargetId);                          
            // Notificamos remotamente levantando el nodo active_tabs del amigo                          
            conexion.notifyIncomingCallTab(callTargetId, myRealId).then(() => {                                  
                iniciarVideollamada(chatId, myRealId, callTargetId);                          
            });                  
        }          
    });  
} // <-- CORREGIDO: Cierre de initChatContainerEvents