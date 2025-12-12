// --- MÓDULO DE AUTENTICACIÓN Y PERFIL v3.0 (Persistence Fix) ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getUserStats } from './usage_tracker.js'; 
import { getGoogleApiKey, saveUserKeys, getUserKeyCount } from './apikey.js';
import { initCoopSystem, openCoopModal } from './coop_manager.js';

console.log("Módulo Auth UI Cargado (v3.0 - Persistence Fix)");

const authConfig = {
  apiKey: "AIzaSyAfK_AOq-Pc2bzgXEzIEZ1ESWvnhMJUvwI",
  authDomain: "enraya-51670.firebaseapp.com",
  databaseURL: "https://enraya-51670-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "enraya-51670",
  storageBucket: "enraya-51670.firebasestorage.app",
  messagingSenderId: "103343380727",
  appId: "1:103343380727:web:b2fa02aee03c9506915bf2",
  measurementId: "G-2G31LLJY1T"
};

// FIX: Usar instancia única compartida
let authApp;
if (!getApps().length) {
    authApp = initializeApp(authConfig); 
} else {
    authApp = getApp(); 
}

const auth = getAuth(authApp);

// --- NUEVO: FORZAR PERSISTENCIA LOCAL (NO SE CIERRA AL CERRAR NAVEGADOR) ---
setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("🔐 Persistencia de sesión activada: LOCAL"))
    .catch((error) => console.error("Error setting persistence:", error));

const provider = new GoogleAuthProvider();
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
}

function renderGuestState() {
    // 1. Mostrar pantalla de bloqueo, Ocultar App
    const loginOverlay = document.getElementById('login-overlay-screen');
    if (loginOverlay) loginOverlay.style.display = 'flex';
    
    // 2. Limpiar dock
    if (userDock) userDock.innerHTML = '';

    // 3. Renderizar botón en el centro
    const btnContainer = document.getElementById('login-btn-container');
    if (btnContainer) {
        btnContainer.innerHTML = `
        <button class="user-auth-btn" onclick="window.silenosLogin()" style="font-size: 1.2rem; padding: 15px 30px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="margin-right:12px;"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.76-1.35 3.37-2.78 4.32l3.44 2.69c2.01-1.85 3.18-4.58 3.18-7.74 0-.58-.05-1.15-.15-1.71z" style="fill:#4285f4"></path><path d="M12.18 21c2.7 0 4.96-.89 6.6-2.42l-3.21-2.69c-.89.6-2.03.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12l-3.23 2.5c1.65 3.27 5.04 5.51 8.83 5.51z" style="fill:#34a853"></path><path d="M6.58 14.72c-.2-.6-.31-1.24-.31-1.92s.11-1.32.31-1.92l-3.23-2.5C2.69 9.8 2.22 11.23 2.22 12.8s.47 3 1.13 4.39l3.23-2.47z" style="fill:#fbbc05"></path><path d="M12.18 6.45c1.47 0 2.79.5 3.82 1.49l2.86-2.86C17.14 3.44 14.88 2.5 12.18 2.5 8.39 2.5 5 4.74 3.35 8.01l3.23 2.5c.79-2.36 3-4.12 5.6-4.12z" style="fill:#ea4335"></path></svg>
            Conectar con Google
        </button>`;
    }

    document.body.classList.remove('is-logged-in');
}

function renderUserState(user) {
    const loginOverlay = document.getElementById('login-overlay-screen');
    if (loginOverlay) loginOverlay.style.display = 'none';

    if (!userDock) return;
    const photoURL = user.photoURL || 'https://via.placeholder.com/40';
    
    userDock.innerHTML = `
        <div class="user-profile-container">
            <div class="user-menu-popup" id="user-menu">
                <div class="menu-header">Hola, ${user.displayName || 'Viajero'}</div>
                <div class="menu-item disabled"><span class="menu-icon">📂</span> <span id="current-project-name">Conectado</span></div>
                <div class="menu-item" onclick="window.openSettingsModal()"><span class="menu-icon">⚙️</span> Configuración</div>
                <div class="menu-item" onclick="window.openCoopModal()"><span class="menu-icon">🤝</span> Cooperación</div>
                <div class="menu-divider"></div>      
                <div class="menu-item" onclick="window.saveToDriveManual()"><span class="menu-icon">💾</span> Sincronizar Todo</div>              
                <div class="menu-divider"></div>
                <div class="menu-item danger" onclick="window.silenosLogout()"><span class="menu-icon">✕</span> Cerrar Sesión</div>
            </div>
            <img src="${photoURL}" class="user-avatar" onclick="window.toggleUserMenu()" alt="Perfil">
        </div>`;
    
    document.body.classList.add('is-logged-in');
}

// --- AJUSTES Y UI ---
window.openSettingsModal = async () => {
    const menu = document.getElementById('user-menu');
    if (menu) menu.classList.remove('active');
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    const stats = await getUserStats();
    if (stats) {
        document.getElementById('stat-total-script').textContent = stats.total.script;
        document.getElementById('stat-total-book').textContent = stats.total.book;
        document.getElementById('stat-total-game').textContent = stats.total.game;
        updateBar('script', stats.daily.script, stats.limits.script);
        updateBar('book', stats.daily.book, stats.limits.book);
        updateBar('game', stats.daily.game, stats.limits.game);
    }
    const savedKey = getGoogleApiKey();
    const input = document.getElementById('settings-api-input');
    if (input) input.value = savedKey || '';
    updateApiStatusUI();
};

window.saveSettingsApiKey = () => {
    const input = document.getElementById('settings-api-input');
    if (!input) return;
    saveUserKeys(input.value);
    const btn = input.nextElementSibling;
    const originalText = btn.textContent;
    btn.textContent = "✓";
    setTimeout(() => btn.textContent = originalText, 1500);
    updateApiStatusUI();
};

function updateApiStatusUI() {
    const count = getUserKeyCount();
    const indicator = document.getElementById('api-active-indicator');
    const badge = document.getElementById('api-key-count-badge');
    const limitsBars = document.querySelectorAll('.progress-fill'); 
    if (count > 0) {
        if(indicator) indicator.style.display = 'flex';
        if(badge) badge.textContent = count;
        limitsBars.forEach(bar => bar.style.backgroundColor = '#00b894'); 
    } else {
        if(indicator) indicator.style.display = 'none';
        limitsBars.forEach(bar => bar.style.backgroundColor = ''); 
    }
}

function updateBar(type, current, max) {
    const label = document.getElementById(`label-daily-${type}`);
    const bar = document.getElementById(`bar-daily-${type}`);
    if (label) label.textContent = `${current} / ${max}`;
    if (bar) {
        const pct = Math.min((current / max) * 100, 100);
        bar.style.width = `${pct}%`;
        if (getUserKeyCount() === 0 && pct >= 100) {
            bar.style.backgroundColor = '#d63031';
        } else if (getUserKeyCount() > 0) {
             bar.style.backgroundColor = '#00b894';
        } else {
             bar.style.backgroundColor = 'var(--ai-color)';
        }
    }
}

window.closeSettingsModal = () => {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};

function updateIAVisibility(user) {
    const guestMsg = document.getElementById('ia-guest-warning');
    const loggedContent = document.getElementById('ia-logged-content');
    if (!guestMsg || !loggedContent) return;
    if (user) {
        guestMsg.style.display = 'none';
        loggedContent.style.display = 'block';
    } else {
        guestMsg.style.display = 'block';
        loggedContent.style.display = 'none';
    }
}

// --- LOGIN / LOGOUT ---

export const silenosLogin = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        sessionStorage.setItem('google_drive_token', token);
    } catch (error) { alert("Error login: " + error.message); }
};

export const silenosLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('google_drive_token');
    
    // Al salir, también limpiamos visualmente para evitar datos fantasma
    localStorage.removeItem('minimal_scripts_v1');
    localStorage.removeItem('minimal_books_v4');
    localStorage.removeItem('minimal_games_v1');
    
    location.reload(); 
};

window.silenosLogin = silenosLogin;
window.silenosLogout = silenosLogout;
window.toggleUserMenu = () => { document.getElementById('user-menu')?.classList.toggle('active'); };

document.addEventListener('click', (e) => {
    const dock = document.getElementById('user-dock');
    if (dock && !dock.contains(e.target)) document.getElementById('user-menu')?.classList.remove('active');
});

// --- LISTENER PRINCIPAL DE ESTADO ---

function initAuthListener() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateIAVisibility(user);
        
        if (user) {
            renderUserState(user);
            initCoopSystem(user);
            
            // Si hay login, forzamos sincronización inicial de librería
            if (window.syncLibrary) {
                setTimeout(() => window.syncLibrary(), 500);
            }
        } else {
            renderGuestState();
        }
    });
}

export function getDriveToken() { return sessionStorage.getItem('google_drive_token'); }
export { auth, currentUser };