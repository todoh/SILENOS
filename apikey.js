// --- GESTIÓN DE API KEY (GOOGLE GEMINI - MODO HÍBRIDO CON FIREBASE) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

console.log("Módulo API Key Cargado (Soporte Multi-Key + Fallback Server)");

const apiKeyInput = document.getElementById('google-api-key');
const STORAGE_KEY = 'silenos_google_apikey';

// --- CONFIGURACIÓN FIREBASE (PROPORCIONADA) ---
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

// Variable interna para guardar las keys del servidor (invisibles al usuario)
let cachedServerKeys = [];
let firebaseInitialized = false;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Mostrar keys del usuario si existen (visual)
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey && apiKeyInput) {
        apiKeyInput.value = savedKey;
    }
    
    // 2. Iniciar carga silenciosa de Firebase en segundo plano
    initFirebaseAndFetch();
});

// Inicializa Firebase y trae las keys, pero no bloquea la UI
async function initFirebaseAndFetch() {
    try {
        if (!firebaseInitialized) {
            const app = initializeApp(firebaseConfig);
            firebaseInitialized = true;
        }
        
        // Si el usuario YA tiene keys locales, no gastamos lecturas de Firebase innecesariamente
        // a menos que quieras tenerlas siempre listas por si borra las suyas.
        // Aquí las cargamos siempre por si acaso.
        const db = getDatabase();
        const keysRef = ref(db, 'server_api_keys'); // NOMBRE DEL NODO EN TU BD
        const snapshot = await get(keysRef);

        if (snapshot.exists()) {
            const val = snapshot.val();
            // Asumimos que es un string separado por comas, igual que el input manual
            if (typeof val === 'string') {
                cachedServerKeys = val.split(',').map(k => k.trim()).filter(k => k.length > 0);
                console.log("Sistema: Keys del servidor cargadas en memoria (Ocultas).");
            }
        } else {
            console.warn("Sistema: No se encontraron keys en el servidor (nodo 'server_api_keys').");
        }
    } catch (error) {
        console.error("Error conectando a Firebase:", error);
    }
}

// --- FUNCIONES UI (Usuario) ---

function saveGoogleApiKey() {
    if (!apiKeyInput) return;
    let keyStr = apiKeyInput.value.trim();
    
    if (keyStr.length > 0) {
        localStorage.setItem(STORAGE_KEY, keyStr);
        const count = keyStr.split(',').filter(k => k.trim()).length;
        alert(`Modo Manual: ${count} Key(s) guardada(s). El sistema usará ESTAS keys prioritariamente.`);
    } else {
        if(confirm("¿Borrar tus API Keys personales? (El sistema intentará usar las del servidor si existen)")) {
            localStorage.removeItem(STORAGE_KEY);
            apiKeyInput.value = '';
        }
    }
}

function getGoogleApiKey() {
    return localStorage.getItem(STORAGE_KEY);
}

// --- LÓGICA DE RECUPERACIÓN (HÍBRIDA) ---

// Ahora es ASYNC para asegurar que esperamos a Firebase si es necesario
async function getApiKeysList() {
    // 1. Prioridad: LocalStorage (Usuario)
    const rawLocal = localStorage.getItem(STORAGE_KEY);
    if (rawLocal && rawLocal.trim().length > 0) {
        console.log("Usando: Keys del Usuario");
        return rawLocal.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }

    // 2. Fallback: Memoria caché del Servidor
    if (cachedServerKeys.length > 0) {
        console.log("Usando: Keys del Servidor (Usuario sin keys)");
        return cachedServerKeys;
    }

    // 3. Último intento: Si aún no se han cargado (ej. clic muy rápido), forzamos fetch
    console.log("Esperando conexión con servidor...");
    await initFirebaseAndFetch();
    
    if (cachedServerKeys.length > 0) {
        return cachedServerKeys;
    }

    return []; // No hay keys en ningún lado
}

// Exponer a window para el HTML
window.saveGoogleApiKey = saveGoogleApiKey;
// Exportar para uso en módulos
export { getGoogleApiKey, getApiKeysList };