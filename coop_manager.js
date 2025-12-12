// --- GESTOR DE COOPERACIÓN (SISTEMA DE AMIGOS & NOTIFICACIONES) ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, set, update, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { currentUser } from './auth_ui.js';
import { showRequestNotification } from './notification_ui.js';
import { startVideoCall, initVideoSystem, shareProject } from './video_call.js';

console.log("Módulo Cooperación Cargado (v2.3 - Shared Instance)");

const firebaseConfig = {
 apiKey: "AIzaSyAfK_AOq-Pc2bzgXEzIEZ1ESWvnhMJUvwI",
  authDomain: "enraya-51670.firebaseapp.com",
  databaseURL: "https://enraya-51670-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "enraya-51670",
  storageBucket: "enraya-51670.firebasestorage.app",
  messagingSenderId: "103343380727",
  appId: "1:103343380727:web:b2fa02aee03c9506915bf2",
  measurementId: "G-2G31LLJY1T"
};

// FIX: Usar la misma instancia que auth_ui.js
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp(); // Recupera la instancia por defecto donde está el usuario
}

const db = getDatabase(app);

let coopModal, friendCodeInput, friendListContainer, myCodeDisplay;
let pollingInterval = null;
let activeRequestsSet = new Set(); 

// --- 1. INICIALIZACIÓN Y GENERACIÓN DE CÓDIGO ---

export async function initCoopSystem(user) {
    if (!user) return;
    
    initVideoSystem(); 
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

// --- 2. SISTEMA DE SONDEO (POLLING) ---

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
                    if (!activeRequestsSet.has(senderUid)) {
                        const reqData = requests[senderUid];
                        showRequestNotification(
                            { id: senderUid, ...reqData },
                            () => handleAcceptRequest(uid, senderUid, reqData),
                            () => handleDeclineRequest(uid, senderUid)
                        );
                        activeRequestsSet.add(senderUid);
                    }
                });
            } else {
                activeRequestsSet.clear();
            }

        } catch (e) {
            console.warn("Error en polling de notificaciones:", e);
        }
    }, 3000); 
}

// --- 3. MANEJO DE RESPUESTAS ---

async function handleAcceptRequest(myUid, senderUid, senderData) {
    try {
        console.log(`Aceptando a ${senderData.name}...`);
        await update(ref(db, `users/${myUid}/friends`), { [senderUid]: true });
        await update(ref(db, `users/${senderUid}/friends`), { [myUid]: true });
        await remove(ref(db, `users/${myUid}/friend_requests/${senderUid}`));
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
        await remove(ref(db, `users/${myUid}/friend_requests/${senderUid}`));
        activeRequestsSet.delete(senderUid);
    } catch (e) {
        console.error("Error al rechazar:", e);
    }
}

// --- 4. UI MODAL ---

export async function openCoopModal() {
    if (!currentUser) return alert("Debes iniciar sesión.");
    if (!document.getElementById('coop-modal')) createCoopModalDOM();
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
                <h4 style="margin-bottom: 10px; color: #555; font-size: 0.9rem;">Tus Compas</h4>
                <div id="friend-list-container" class="export-list-scroll" style="height: 100%; background: rgba(0,0,0,0.02);"></div>
            </div>
        </div>`;
    document.body.appendChild(div);
}

// --- 5. LOGICA ENVÍO ---

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
        const codeSnap = await get(ref(db, `coop_codes/${code}`));
        if (!codeSnap.exists()) {
            alert("Código no encontrado.");
            resetInput();
            return;
        }
        const targetUid = codeSnap.val();
        const friendCheck = await get(ref(db, `users/${currentUser.uid}/friends/${targetUid}`));
        if (friendCheck.exists()) {
            alert("Este usuario ya es tu aliado.");
            resetInput();
            return;
        }
        const pendingCheck = await get(ref(db, `users/${targetUid}/friend_requests/${currentUser.uid}`));
        if (pendingCheck.exists()) {
            alert("Ya le has enviado una solicitud pendiente.");
            resetInput();
            return;
        }
        const myProfileSnap = await get(ref(db, `users/${currentUser.uid}/profile`));
        const myData = myProfileSnap.val();
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

// --- 6. LISTA AMIGOS ---

async function loadFriendsList() {
    friendListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Cargando compas...</div>';
    try {
        const friendsSnap = await get(ref(db, `users/${currentUser.uid}/friends`));
        if (!friendsSnap.exists()) {
            friendListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#ccc;">Aún no tienes compas.</div>';
            return;
        }
        const friendUids = Object.keys(friendsSnap.val());
        friendListContainer.innerHTML = ''; 
        const promises = friendUids.map(uid => get(ref(db, `users/${uid}/profile`)));
        const snapshots = await Promise.all(promises);
        snapshots.forEach((snap, index) => {
            if (snap.exists()) {
                const p = snap.val();
                p.uid = friendUids[index];
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
    div.style.justifyContent = "space-between";
    const infoDiv = document.createElement('div');
    infoDiv.style.display = "flex";
    infoDiv.style.alignItems = "center";
    infoDiv.style.gap = "10px";
    infoDiv.innerHTML = `
        <img src="${profile.photoURL || 'https://via.placeholder.com/30'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; border: 1px solid #eee;">
        <div style="display:flex; flex-direction:column;">
            <span class="drive-name">${profile.displayName || 'Aliado'}</span>
            <span style="font-size:0.7rem; color:#aaa; font-family:monospace;">${profile.coopCode}</span>
        </div>`;
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'friend-actions';
    actionsDiv.style.display = "flex";
    actionsDiv.style.gap = "8px";
    
    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn-icon small';
    shareBtn.title = "Compartir Proyecto Actual";
    shareBtn.style.display = "none";
    shareBtn.style.color = "#0984e3";
    shareBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.2 15c.7 0 1.3-1.4 1.3-3s-.6-3-1.3-3S19.9 10.4 19.9 12s.6 3 1.3 3zM2.8 15c-.7 0-1.3-1.4-1.3-3s.6-3 1.3-3 1.3 1.4 1.3 3-.6 3-1.3 3z"/><path d="M7.5 4.6l-3 3 3 3M16.5 4.6l3 3-3 3"/><path d="M4.5 7.6h15"/></svg>`;
    shareBtn.onclick = () => shareProject(profile.uid, profile.displayName);

    const callBtn = document.createElement('button');
    callBtn.className = 'btn-icon small';
    callBtn.title = "Videollamada";
    callBtn.style.color = "#00b894";
    callBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
    callBtn.onclick = () => startVideoCall(profile.uid, profile.displayName);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon small danger';
    delBtn.title = "Eliminar Aliado";
    delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    delBtn.onclick = () => confirmDeleteFriend(profile.uid, profile.displayName);

    actionsDiv.appendChild(shareBtn);
    actionsDiv.appendChild(callBtn);
    actionsDiv.appendChild(delBtn);
    div.appendChild(infoDiv);
    div.appendChild(actionsDiv);
    friendListContainer.appendChild(div);
}

function confirmDeleteFriend(friendUid, friendName) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10001';
    overlay.innerHTML = `
        <div class="dialog-box" style="max-width:350px; text-align:center;">
            <div style="font-size:2rem; margin-bottom:10px;">💔</div>
            <h3 style="margin-bottom:10px; color:#555;">¿Romper Vínculo?</h3>
            <p style="font-size:0.9rem; color:#888; margin-bottom:20px;">
                Eliminar a <strong>${friendName}</strong> es irreversible.
            </p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button class="io-btn" id="cancel-del">Cancelar</button>
                <button class="io-btn danger" id="confirm-del">Eliminar</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('cancel-del').onclick = () => document.body.removeChild(overlay);
    document.getElementById('confirm-del').onclick = async () => {
        document.body.removeChild(overlay);
        await executeDeleteFriend(friendUid);
    };
}

async function executeDeleteFriend(friendUid) {
    try {
        await remove(ref(db, `users/${currentUser.uid}/friends/${friendUid}`));
        await remove(ref(db, `users/${friendUid}/friends/${currentUser.uid}`));
        loadFriendsList(); 
    } catch (e) {
        console.error(e);
        alert("Error al eliminar.");
    }
}

window.openCoopModal = openCoopModal;
window.closeCoopModal = closeCoopModal;
window.addFriendByCode = addFriendByCode;