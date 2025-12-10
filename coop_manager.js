// --- GESTOR DE COOPERACIÓN (SISTEMA DE AMIGOS) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, set, update, child } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { currentUser } from './auth_ui.js';

console.log("Módulo Cooperación Cargado (v1.1 - Region Fix)");

// Configuración con la databaseURL explícita para Europa
const firebaseConfig = {
  apiKey: "AIzaSyBxlmzjYjOEAwc_DVtFpt9DnN7XnuRkbKw",
  authDomain: "silenos-fc5e5.firebaseapp.com",
  databaseURL: "https://silenos-fc5e5-default-rtdb.europe-west1.firebasedatabase.app", // <--- LÍNEA CORREGIDA
  projectId: "silenos-fc5e5",
  storageBucket: "silenos-fc5e5.firebasestorage.app",
  messagingSenderId: "314671855826",
  appId: "1:314671855826:web:ea0af5cd962baa1fd6150b",
  measurementId: "G-V636CRYZ8X"
};

// Inicializamos una instancia específica para la DB de cooperación
const app = initializeApp(firebaseConfig, "SilenosCoop");
const db = getDatabase(app);

// DOM Elements
let coopModal, friendCodeInput, friendListContainer, myCodeDisplay;

// --- 1. INICIALIZACIÓN Y GENERACIÓN DE CÓDIGO ---

export async function initCoopSystem(user) {
    if (!user) return;
    
    // Referencia al perfil del usuario
    const userRef = ref(db, `users/${user.uid}/profile`);
    
    try {
        const snapshot = await get(userRef);
        let profile = snapshot.exists() ? snapshot.val() : {};

        // Si no tiene código, generamos uno nuevo
        if (!profile.coopCode) {
            const newCode = generateUniqueCode();
            console.log("Generando nuevo Código de Cooperación:", newCode);

            // Guardamos en el perfil del usuario
            await update(userRef, {
                coopCode: newCode,
                displayName: user.displayName,
                photoURL: user.photoURL,
                email: user.email
            });

            // Guardamos en la tabla de búsqueda inversa (Código -> UID)
            // Esto permite buscar amigos por código rápidamente
            await set(ref(db, `coop_codes/${newCode}`), user.uid);
        } else {
            // Aseguramos que los datos del perfil estén frescos (foto/nombre)
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
    // Genera un código tipo "SIL-X9Y2"
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SIL-${code}`;
}

// --- 2. GESTIÓN DEL MODAL UI ---

export async function openCoopModal() {
    if (!currentUser) return alert("Debes iniciar sesión.");
    
    // Crear el modal si no existe en el DOM
    if (!document.getElementById('coop-modal')) {
        createCoopModalDOM();
    }

    coopModal = document.getElementById('coop-modal');
    friendCodeInput = document.getElementById('friend-code-input');
    friendListContainer = document.getElementById('friend-list-container');
    myCodeDisplay = document.getElementById('my-coop-code');

    // Mostrar modal
    coopModal.style.display = 'flex';
    setTimeout(() => coopModal.classList.add('active'), 10);

    // Cargar mi código
    loadMyCode();
    // Cargar lista de amigos
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
                    <button class="io-btn action" onclick="window.addFriendByCode()" style="margin-bottom: 0;">Agregar</button>
                </div>

                <h4 style="margin-bottom: 10px; color: #555; font-size: 0.9rem;">Tus Aliados</h4>
                <div id="friend-list-container" class="export-list-scroll" style="height: 100%; background: rgba(0,0,0,0.02);">
                    </div>

            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// --- 3. LÓGICA DE DATOS ---

async function loadMyCode() {
    try {
        const snapshot = await get(ref(db, `users/${currentUser.uid}/profile/coopCode`));
        if (snapshot.exists()) {
            myCodeDisplay.textContent = snapshot.val();
        } else {
            myCodeDisplay.textContent = "Error";
        }
    } catch (e) {
        myCodeDisplay.textContent = "---";
    }
}

export async function addFriendByCode() {
    const code = friendCodeInput.value.trim().toUpperCase();
    if (!code) return alert("Escribe un código.");
    if (code === myCodeDisplay.textContent) return alert("No puedes agregarte a ti mismo.");

    friendCodeInput.value = "Buscando...";
    friendCodeInput.disabled = true;

    try {
        // 1. Buscar UID a partir del código
        const codeSnap = await get(ref(db, `coop_codes/${code}`));
        
        if (!codeSnap.exists()) {
            alert("Código no encontrado.");
            resetInput();
            return;
        }

        const friendUid = codeSnap.val();

        // 2. Verificar si ya es amigo
        const friendCheck = await get(ref(db, `users/${currentUser.uid}/friends/${friendUid}`));
        if (friendCheck.exists()) {
            alert("Este usuario ya está en tu lista.");
            resetInput();
            return;
        }

        // 3. Obtener datos del amigo para confirmar
        const profileSnap = await get(ref(db, `users/${friendUid}/profile`));
        const friendData = profileSnap.val();

        if (confirm(`¿Agregar a ${friendData.displayName || 'Usuario'}?`)) {
            // 4. Guardar relación
            await update(ref(db, `users/${currentUser.uid}/friends`), {
                [friendUid]: true
            });
            
            // Agregarme a mí en su lista también (Bidireccional)
            await update(ref(db, `users/${friendUid}/friends`), {
                [currentUser.uid]: true
            });

            alert("¡Aliado agregado!");
            loadFriendsList();
        }

    } catch (e) {
        console.error(e);
        alert("Error al agregar amigo.");
    }
    resetInput();
}

function resetInput() {
    friendCodeInput.value = "";
    friendCodeInput.disabled = false;
    friendCodeInput.focus();
}

async function loadFriendsList() {
    friendListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Cargando aliados...</div>';

    try {
        // 1. Obtener lista de UIDs de amigos
        const friendsSnap = await get(ref(db, `users/${currentUser.uid}/friends`));
        
        if (!friendsSnap.exists()) {
            friendListContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#ccc;">Aún no tienes aliados.</div>';
            return;
        }

        const friendUids = Object.keys(friendsSnap.val());
        friendListContainer.innerHTML = ''; // Limpiar

        // 2. Cargar perfil de cada amigo
        const promises = friendUids.map(uid => get(ref(db, `users/${uid}/profile`)));
        const snapshots = await Promise.all(promises);

        snapshots.forEach(snap => {
            if (snap.exists()) {
                const p = snap.val();
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
    div.className = 'drive-file-item';
    div.style.cursor = "default";
    div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <img src="${profile.photoURL || 'https://via.placeholder.com/30'}" style="width:30px; height:30px; border-radius:50%;">
            <span class="drive-name">${profile.displayName}</span>
        </div>
        <span class="drive-date" style="font-family:monospace; font-size:0.8rem;">${profile.coopCode}</span>
    `;
    friendListContainer.appendChild(div);
}

// Exportar funciones globales para el HTML
window.openCoopModal = openCoopModal;
window.closeCoopModal = closeCoopModal;
window.addFriendByCode = addFriendByCode;