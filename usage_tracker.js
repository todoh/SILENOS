// --- USAGE TRACKER (Control de Límites) v2.3 (Shared Instance Fix) ---
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, update, increment } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { currentUser } from './auth_ui.js';
import { hasUserCustomKeys } from './apikey.js';

console.log("Módulo Usage Tracker Cargado (Shared Instance)");

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

// FIX: Instancia Compartida
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db = getDatabase(app);
const LIMITS = { script: 14, book: 12, game: 8 };

function getTodayKey() { return new Date().toISOString().split('T')[0]; }

export async function checkUsageLimit(type) {
    if (hasUserCustomKeys()) {
        console.log("🚀 Límite ignorado: Usando API Key personal.");
        return true; 
    }
    if (!currentUser) return false;
    
    const userId = currentUser.uid;
    const dateKey = getTodayKey();
    const limit = LIMITS[type];
    const usageRef = ref(db, `users/${userId}/usage/${dateKey}/${type}`);
    
    try {
        const snapshot = await get(usageRef);
        const currentUsage = snapshot.exists() ? snapshot.val() : 0;
        
        if (currentUsage >= limit) {
            alert(`⛔ Has alcanzado el límite gratuito de ${limit} ${type}s hoy.`);
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