// --- USAGE TRACKER (Control de Límites) v2.2 ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, update, increment } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { currentUser } from './auth_ui.js';
import { hasUserCustomKeys } from './apikey.js'; // <--- IMPORTANTE

console.log("Módulo Usage Tracker Cargado (Bypass Enabled)");

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

const app = initializeApp(firebaseConfig, "UsageTracker");
const db = getDatabase(app);

const LIMITS = { script: 14, book: 12, game: 8 };

function getTodayKey() { return new Date().toISOString().split('T')[0]; }

export async function checkUsageLimit(type) {
    // 1. CHEQUEO DE BYPASS (MODO DIOS)
    if (hasUserCustomKeys()) {
        console.log("🚀 Límite ignorado: Usando API Key personal.");
        return true; 
    }

    if (!currentUser) return false;
    
    // Chequeo normal
    const userId = currentUser.uid;
    const dateKey = getTodayKey();
    const limit = LIMITS[type];
    const usageRef = ref(db, `users/${userId}/usage/${dateKey}/${type}`);
    
    try {
        const snapshot = await get(usageRef);
        const currentUsage = snapshot.exists() ? snapshot.val() : 0;
        
        if (currentUsage >= limit) {
            alert(`⛔ Has alcanzado el límite gratuito de ${limit} ${type}s hoy.\n\nCONSEJO: Añade tu propia API Key en Configuración para eliminar los límites.`);
            return false;
        }
        return true;
    } catch (e) {
        console.error("Error tracker:", e);
        return false;
    }
}

export async function registerUsage(type) {
    if (!currentUser) return;
    // Registramos el uso igual, aunque sea ilimitado, para estadísticas del usuario
    const userId = currentUser.uid;
    const dateKey = getTodayKey();
    const updates = {};
    updates[`users/${userId}/usage/${dateKey}/${type}`] = increment(1);
    updates[`users/${userId}/stats/total_${type}`] = increment(1);

    try { await update(ref(db), updates); } catch (e) { console.error(e); }
}

export async function getUserStats() {
    if (!currentUser) return null;
    const userId = currentUser.uid;
    const dateKey = getTodayKey();

    try {
        const [dailySnap, totalSnap] = await Promise.all([
            get(ref(db, `users/${userId}/usage/${dateKey}`)),
            get(ref(db, `users/${userId}/stats`))
        ]);

        const daily = dailySnap.exists() ? dailySnap.val() : {};
        const total = totalSnap.exists() ? totalSnap.val() : {};

        return {
            daily: { script: daily.script || 0, book: daily.book || 0, game: daily.game || 0 },
            total: { script: total.total_script || 0, book: total.total_book || 0, game: total.total_game || 0 },
            limits: LIMITS
        };
    } catch (e) { return null; }
}