// --- MÓDULO DE AUTENTICACIÓN Y PERFIL (USER DOCK) v2.1 ---
// Actualizado: Añadida opción "Importar Datos" en el menú.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

console.log("Módulo Auth UI Cargado (v2.1 - Import Data)");

const authConfig = {
    apiKey: "AIzaSyBxlmzjYjOEAwc_DVtFpt9DnN7XnuRkbKw",
    authDomain: "silenos-fc5e5.firebaseapp.com",
    projectId: "silenos-fc5e5",
    storageBucket: "silenos-fc5e5.firebasestorage.app",
    messagingSenderId: "314671855826",
    appId: "1:314671855826:web:ea0af5cd962baa1fd6150b",
    measurementId: "G-V636CRYZ8X"
};

const authApp = initializeApp(authConfig, "SilenosAuth");
const auth = getAuth(authApp);
const provider = new GoogleAuthProvider();

// !!! IMPORTANTE: Añadimos el permiso para gestionar archivos creados por esta app !!!
provider.addScope('https://www.googleapis.com/auth/drive.file');

let currentUser = null;
let userDock = null;

document.addEventListener('DOMContentLoaded', () => {
    createUserDockUI();
    initAuthListener();
});

function createUserDockUI() {
    if (document.getElementById('user-dock')) return;
    userDock = document.createElement('div');
    userDock.id = 'user-dock';
    userDock.className = 'user-dock';
    document.body.appendChild(userDock);
    renderGuestState();
}

function renderGuestState() {
    userDock.innerHTML = `
        <button class="user-auth-btn" onclick="window.silenosLogin()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right:8px;">
                <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.76-1.35 3.37-2.78 4.32l3.44 2.69c2.01-1.85 3.18-4.58 3.18-7.74 0-.58-.05-1.15-.15-1.71z" style="fill:#4285f4"></path>
                <path d="M12.18 21c2.7 0 4.96-.89 6.6-2.42l-3.21-2.69c-.89.6-2.03.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12l-3.23 2.5c1.65 3.27 5.04 5.51 8.83 5.51z" style="fill:#34a853"></path>
                <path d="M6.58 14.72c-.2-.6-.31-1.24-.31-1.92s.11-1.32.31-1.92l-3.23-2.5C2.69 9.8 2.22 11.23 2.22 12.8s.47 3 1.13 4.39l3.23-2.47z" style="fill:#fbbc05"></path>
                <path d="M12.18 6.45c1.47 0 2.79.5 3.82 1.49l2.86-2.86C17.14 3.44 14.88 2.5 12.18 2.5 8.39 2.5 5 4.74 3.35 8.01l3.23 2.5c.79-2.36 3-4.12 5.6-4.12z" style="fill:#ea4335"></path>
            </svg>
            Conectar
        </button>
    `;
}

function renderUserState(user) {
    const photoURL = user.photoURL || 'https://via.placeholder.com/40';
    userDock.innerHTML = `
        <div class="user-profile-container">
            <div class="user-menu-popup" id="user-menu">
                <div class="menu-header">Hola, ${user.displayName || 'Viajero'}</div>
                <div class="menu-item disabled">
                    <span class="menu-icon">📂</span> <span id="current-project-name">Proyecto Local</span>
                </div>
                 <div class="menu-item" onclick="window.openDriveSelector()">
                    <span class="menu-icon">☁️</span> Abrir desde Drive...
                </div>
                <div class="menu-item" onclick="window.saveToDriveManual()">
                    <span class="menu-icon">💾</span> Guardar en Drive
                </div>
                <div class="menu-item" onclick="window.openImportModal()">
                    <span class="menu-icon">📥</span> Importar Datos...
                </div>
                <div class="menu-divider"></div>
                <div class="menu-item danger" onclick="window.silenosLogout()">
                    <span class="menu-icon">✕</span> Cerrar Sesión
                </div>
            </div>
            <img src="${photoURL}" class="user-avatar" onclick="window.toggleUserMenu()" alt="Perfil">
        </div>
    `;
}

window.silenosLogin = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        
        sessionStorage.setItem('google_drive_token', token);
        
        console.log("Login exitoso. Token de Drive capturado.");
    } catch (error) {
        console.error("Error en login:", error);
        alert("No se pudo conectar: " + error.message);
    }
};

window.silenosLogout = async () => {
    try {
        await signOut(auth);
        sessionStorage.removeItem('google_drive_token');
        console.log("Sesión cerrada");
        location.reload(); 
    } catch (error) {
        console.error("Error al salir:", error);
    }
};

window.toggleUserMenu = () => {
    const menu = document.getElementById('user-menu');
    if (menu) menu.classList.toggle('active');
};

document.addEventListener('click', (e) => {
    const dock = document.getElementById('user-dock');
    if (dock && !dock.contains(e.target)) {
        const menu = document.getElementById('user-menu');
        if (menu) menu.classList.remove('active');
    }
});

function initAuthListener() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            renderUserState(user);
            if (window.onSilenosUserLogged) window.onSilenosUserLogged(user);
        } else {
            renderGuestState();
        }
    });
}

export function getDriveToken() {
    return sessionStorage.getItem('google_drive_token');
}

export { auth, currentUser };