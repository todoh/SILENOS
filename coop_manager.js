// --- GESTOR DE COOPERACIÓN (SISTEMA DE AMIGOS & NOTIFICACIONES) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, set, update, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { currentUser } from './auth_ui.js';
import { showRequestNotification } from './notification_ui.js';
import { startVideoCall, initVideoSystem } from './video_call.js'; // <--- IMPORTACIÓN NUEVA

console.log("Módulo Cooperación Cargado (v2.1 - Video & Actions)");

const firebaseConfig = {
  apiKey: "AIzaSyBxlmzjYjOEAwc_DVtFpt9DnN7XnuRkbKw",
  authDomain: "silenos-fc5e5.firebaseapp.com",
  databaseURL: "https://silenos-fc5e5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "silenos-fc5e5",
  storageBucket: "silenos-fc5e5.firebasestorage.app",
  messagingSenderId: "314671855826",
  appId: "1:314671855826:web:ea0af5cd962baa1fd6150b",
  measurementId: "G-V636CRYZ8X"
};

const app = initializeApp(firebaseConfig, "SilenosCoop");
const db = getDatabase(app);

let coopModal, friendCodeInput, friendListContainer, myCodeDisplay;
let pollingInterval = null;
let activeRequestsSet = new Set(); // Para no repetir notificaciones visuales

// --- 1. INICIALIZACIÓN Y GENERACIÓN DE CÓDIGO ---

export async function initCoopSystem(user) {
    if (!user) return;
    
    // Iniciar sistema de video (listeners de llamadas entrantes)
    initVideoSystem(); // <--- NUEVO

    // Iniciar el Polling de notificaciones (cada 3 segundos)
    startNotificationPoller(user.uid);

    const userRef = ref(db, `users/${user.uid}/profile`);
    try {
        const snapshot = await get(userRef);
        let profile = snapshot.exists() ? snapshot.val() : {};

        if (!profile.coopCode) {
            const newCode = generateUniqueCode();
            await update(userRef, {
                coopCode: newCode,
                displayName: user.displayName,
                photoURL: user.photoURL,
                email: user.email
            });
            await set(ref(db, `coop_codes/${newCode}`), user.uid);
        } else {
            // Actualizar datos frescos
            await update(userRef, {
                displayName: user.displayName,
                photoURL: user.photoURL
            });
        }
    } catch (e) {
        console.error("Error iniciando sistema coop:", e);
    }
}

function generateUniqueCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SIL-${code}`;
}

// --- 2. SISTEMA DE SONDEO (POLLING) DE NOTIFICACIONES ---

function startNotificationPoller(uid) {
    if (pollingInterval) clearInterval(pollingInterval);

    console.log("📡 Iniciando radar de solicitudes (3s)...");
    
    pollingInterval = setInterval(async () => {
        try {
            const requestsRef = ref(db, `users/${uid}/friend_requests`);
            const snapshot = await get(requestsRef);

            if (snapshot.exists()) {
                const requests = snapshot.val();
                
                Object.keys(requests).forEach(senderUid => {
                    // Si no la hemos mostrado ya en esta sesión
                    if (!activeRequestsSet.has(senderUid)) {
                        const reqData = requests[senderUid];
                        
                        // Lanzar Notificación Visual
                        showRequestNotification(
                            { id: senderUid, ...reqData },
                            () => handleAcceptRequest(uid, senderUid, reqData), // Callback Aceptar
                            () => handleDeclineRequest(uid, senderUid)          // Callback Rechazar
                        );
                        
                        // Marcar como mostrada
                        activeRequestsSet.add(senderUid);
                    }
                });
            } else {
                // Si no hay requests en DB, limpiamos el set local por si acaso se borraron externamente
                activeRequestsSet.clear();
            }

        } catch (e) {
            console.warn("Error en polling de notificaciones:", e);
        }
    }, 3000); // 3 SEGUNDOS EXACTOS
}

// --- 3. MANEJO DE RESPUESTAS ---

async function handleAcceptRequest(myUid, senderUid, senderData) {
    try {
        console.log(`Aceptando a ${senderData.name}...`);
        
        // 1. Añadir a mi lista de amigos
        await update(ref(db, `users/${myUid}/friends`), { [senderUid]: true });

        // 2. Añadirme a su lista de amigos (Bidireccional)
        await update(ref(db, `users/${senderUid}/friends`), { [myUid]: true });

        // 3. Borrar la solicitud
        await remove(ref(db, `users/${myUid}/friend_requests/${senderUid}`));

        // 4. Limpiar del set local
        activeRequestsSet.delete(senderUid);

        alert(`¡Ahora eres aliado de ${senderData.name}!`);
        if (coopModal && coopModal.classList.contains('active')) loadFriendsList();

    } catch (e) {
        console.error("Error al aceptar:", e);
        alert("Error al conectar.");
    }
}

async function handleDeclineRequest(myUid, senderUid) {
    try {
        console.log(`Rechazando a ${senderUid}...`);
        // Solo borramos la solicitud
        await remove(ref(db, `users/${myUid}/friend_requests/${senderUid}`));
        activeRequestsSet.delete(senderUid);
    } catch (e) {
        console.error("Error al rechazar:", e);
    }
}


// --- 4. GESTIÓN DEL MODAL UI ---

export async function openCoopModal() {
    if (!currentUser) return alert("Debes iniciar sesión.");
    
    if (!document.getElementById('coop-modal')) {
        createCoopModalDOM();
    }

    coopModal = document.getElementById('coop-modal');
    friendCodeInput = document.getElementById('friend-code-input');
    friendListContainer = document.getElementById('friend-list-container');
    myCodeDisplay = document.getElementById('my-coop-code');

    coopModal.style.display = 'flex';
    setTimeout(() => coopModal.classList.add('active'), 10);

    loadMyCode();
    loadFriendsList();
}

export function closeCoopModal() {
    const modal = document.getElementById('coop-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function createCoopModalDOM() {
    const div = document.createElement('div');
    div.id = 'coop-modal';
    div.className = 'modal-overlay';
    div.innerHTML = `
        <div class="modal-content glass-container" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Cooperación y Amigos</h3>
                <button class="btn-icon" onclick="window.closeCoopModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="io-card" style="text-align: center; margin-bottom: 20px; padding: 20px;">
                    <p style="font-size: 0.8rem; text-transform: uppercase; color: #888; margin-bottom: 10px;">Tu Código de Cooperación</p>
                    <div id="my-coop-code" style="font-size: 2rem; font-weight: 800; color: var(--ai-color); letter-spacing: 2px; user-select: text;">Cargando...</div>
                    <p style="font-size: 0.7rem; color: #aaa; margin-top: 5px;">Comparte este código para que te agreguen.</p>
                </div>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <input type="text" id="friend-code-input" class="ia-input" placeholder="Introduce código (ej: SIL-X9Y2)" style="margin-bottom: 0; text-transform: uppercase;">
                    <button class="io-btn action" onclick="window.addFriendByCode()" style="margin-bottom: 0;">Enviar Solicitud</button>
                </div>
                <h4 style="margin-bottom: 10px; color: #555; font-size: 0.9rem;">Tus Aliados</h4>
                <div id="friend-list-container" class="export-list-scroll" style="height: 100%; background: rgba(0,0,0,0.02);"></div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// --- 5. LÓGICA DE ENVÍO DE SOLICITUD ---

async function loadMyCode() {
    try {
        const snapshot = await get(ref(db, `users/${currentUser.uid}/profile/coopCode`));
        if (snapshot.exists()) myCodeDisplay.textContent = snapshot.val();
        else myCodeDisplay.textContent = "Error";
    } catch (e) { myCodeDisplay.textContent = "---"; }
}

export async function addFriendByCode() {
    const code = friendCodeInput.value.trim().toUpperCase();
    if (!code) return alert("Escribe un código.");
    if (code === myCodeDisplay.textContent) return alert("No puedes agregarte a ti mismo.");

    friendCodeInput.value = "Buscando...";
    friendCodeInput.disabled = true;

    try {
        // 1. Buscar UID destino
        const codeSnap = await get(ref(db, `coop_codes/${code}`));
        if (!codeSnap.exists()) {
            alert("Código no encontrado.");
            resetInput();
            return;
        }
        const targetUid = codeSnap.val();

        // 2. Verificar si ya somos amigos
        const friendCheck = await get(ref(db, `users/${currentUser.uid}/friends/${targetUid}`));
        if (friendCheck.exists()) {
            alert("Este usuario ya es tu aliado.");
            resetInput();
            return;
        }

        // 3. Verificar si ya le envié solicitud (Opcional, para no spammear)
        const pendingCheck = await get(ref(db, `users/${targetUid}/friend_requests/${currentUser.uid}`));
        if (pendingCheck.exists()) {
            alert("Ya le has enviado una solicitud pendiente.");
            resetInput();
            return;
        }

        // 4. Obtener mis datos para enviarlos en la solicitud
        const myProfileSnap = await get(ref(db, `users/${currentUser.uid}/profile`));
        const myData = myProfileSnap.val();

        // 5. ENVIAR SOLICITUD (Escribir en SU nodo de requests)
        await set(ref(db, `users/${targetUid}/friend_requests/${currentUser.uid}`), {
            name: myData.displayName || "Viajero",
            email: myData.email || "",
            photo: myData.photoURL || "",
            timestamp: Date.now()
        });

        alert("Solicitud enviada. Espera a que te acepten.");

    } catch (e) {
        console.error(e);
        alert("Error al enviar solicitud.");
    }
    resetInput();
}

function resetInput() {
    friendCodeInput.value = "";
    friendCodeInput.disabled = false;
    friendCodeInput.focus();
}

// --- 6. GESTIÓN DE LISTA DE AMIGOS (MODIFICADO) ---

async function loadFriendsList() {
    friendListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Cargando aliados...</div>';
    try {
        const friendsSnap = await get(ref(db, `users/${currentUser.uid}/friends`));
        if (!friendsSnap.exists()) {
            friendListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#ccc;">Aún no tienes aliados.</div>';
            return;
        }

        const friendUids = Object.keys(friendsSnap.val());
        friendListContainer.innerHTML = ''; 

        const promises = friendUids.map(uid => get(ref(db, `users/${uid}/profile`)));
        const snapshots = await Promise.all(promises);

        snapshots.forEach((snap, index) => { // <-- CORRECCIÓN: Usamos index para recuperar UID
            if (snap.exists()) {
                const p = snap.val();
                p.uid = friendUids[index]; // INYECTAR UID FALTANTE
                renderFriendItem(p);
            }
        });
    } catch (e) {
        console.error(e);
        friendListContainer.innerHTML = '<div style="color:red;">Error de carga.</div>';
    }
}

function renderFriendItem(profile) {
    const div = document.createElement('div');
    div.className = 'drive-file-item friend-item';
    div.style.cursor = "default";
    div.style.justifyContent = "space-between"; // Separar contenido

    // 1. Info del Usuario
    const infoDiv = document.createElement('div');
    infoDiv.style.display = "flex";
    infoDiv.style.alignItems = "center";
    infoDiv.style.gap = "10px";
    
    infoDiv.innerHTML = `
        <img src="${profile.photoURL || 'https://via.placeholder.com/30'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; border: 1px solid #eee;">
        <div style="display:flex; flex-direction:column;">
            <span class="drive-name">${profile.displayName || 'Aliado'}</span>
            <span style="font-size:0.7rem; color:#aaa; font-family:monospace;">${profile.coopCode}</span>
        </div>
    `;

    // 2. Botones de Acción
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'friend-actions';
    actionsDiv.style.display = "flex";
    actionsDiv.style.gap = "8px";

    // Botón Videollamada
    const callBtn = document.createElement('button');
    callBtn.className = 'btn-icon small';
    callBtn.title = "Videollamada P2P";
    callBtn.style.color = "#00b894";
    callBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
    callBtn.onclick = () => startVideoCall(profile.uid, profile.displayName);

    // Botón Eliminar
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon small danger';
    delBtn.title = "Eliminar Aliado";
    delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    delBtn.onclick = () => confirmDeleteFriend(profile.uid, profile.displayName);

    actionsDiv.appendChild(callBtn);
    actionsDiv.appendChild(delBtn);

    div.appendChild(infoDiv);
    div.appendChild(actionsDiv);

    friendListContainer.appendChild(div);
}

// --- 7. LÓGICA DE ELIMINACIÓN DELICADA ---

function confirmDeleteFriend(friendUid, friendName) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10001'; // Por encima del modal coop
    
    overlay.innerHTML = `
        <div class="dialog-box" style="max-width:350px; text-align:center;">
            <div style="font-size:2rem; margin-bottom:10px;">💔</div>
            <h3 style="margin-bottom:10px; color:#555;">¿Romper Vínculo?</h3>
            <p style="font-size:0.9rem; color:#888; margin-bottom:20px;">
                Estás a punto de eliminar a <strong>${friendName}</strong> de tu lista de aliados.<br>
                Esta acción no se puede deshacer.
            </p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button class="io-btn" id="cancel-del">Cancelar</button>
                <button class="io-btn danger" id="confirm-del">Eliminar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);

    document.getElementById('cancel-del').onclick = () => {
        document.body.removeChild(overlay);
    };

    document.getElementById('confirm-del').onclick = async () => {
        document.body.removeChild(overlay);
        await executeDeleteFriend(friendUid);
    };
}

async function executeDeleteFriend(friendUid) {
    try {
        // Borrar de mi lista
        await remove(ref(db, `users/${currentUser.uid}/friends/${friendUid}`));
        
        // Opcional: Borrarme de su lista también (Limpieza simétrica)
        await remove(ref(db, `users/${friendUid}/friends/${currentUser.uid}`));
        
        loadFriendsList(); // Refrescar UI
    } catch (e) {
        console.error(e);
        alert("Error al eliminar.");
    }
}

// Exportar funciones globales
window.openCoopModal = openCoopModal;
window.closeCoopModal = closeCoopModal;
window.addFriendByCode = addFriendByCode;