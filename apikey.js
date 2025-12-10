// --- GESTIÓN DE API KEY (GOOGLE GEMINI - MODO HÍBRIDO) v2.5 ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

console.log("Módulo API Key Cargado (v2.5 - User Bypass Support)");

const STORAGE_KEY = 'silenos_google_apikey';

// Configuración Firebase (Lectura de keys servidor)
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

let cachedServerKeys = [];
let firebaseInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    initFirebaseAndFetch();
    // Ya no vinculamos el input antiguo automáticamente, lo gestiona auth_ui ahora
});

async function initFirebaseAndFetch() {
    try {
        if (!firebaseInitialized) {
            initializeApp(firebaseConfig);
            firebaseInitialized = true;
        }
        const db = getDatabase();
        const snapshot = await get(ref(db, 'server_api_keys'));
        if (snapshot.exists()) {
            const val = snapshot.val();
            if (typeof val === 'string') {
                cachedServerKeys = val.split(',').map(k => k.trim()).filter(k => k.length > 0);
            }
        }
    } catch (error) { console.error("Error Firebase Keys:", error); }
}

// --- NUEVAS FUNCIONES DE APOYO ---

export function hasUserCustomKeys() {
    const local = localStorage.getItem(STORAGE_KEY);
    return local && local.trim().length > 0;
}

export function getUserKeyCount() {
    const local = localStorage.getItem(STORAGE_KEY);
    if (!local) return 0;
    return local.split(',').filter(k => k.trim().length > 0).length;
}

export function saveUserKeys(keystring) {
    if (!keystring || keystring.trim() === '') {
        localStorage.removeItem(STORAGE_KEY);
        return 0;
    } else {
        localStorage.setItem(STORAGE_KEY, keystring.trim());
        return getUserKeyCount();
    }
}

// --- LÓGICA CORE ---

export function getGoogleApiKey() {
    return localStorage.getItem(STORAGE_KEY);
}

export async function getApiKeysList() {
    // 1. Prioridad ABSOLUTA: LocalStorage (Usuario)
    const rawLocal = localStorage.getItem(STORAGE_KEY);
    if (rawLocal && rawLocal.trim().length > 0) {
        console.log("⚡ Usando Keys Personales (Límites desactivados)");
        return rawLocal.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }

    // 2. Fallback: Servidor
    if (cachedServerKeys.length > 0) return cachedServerKeys;

    await initFirebaseAndFetch();
    return cachedServerKeys.length > 0 ? cachedServerKeys : [];
}