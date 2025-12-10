// --- USAGE TRACKER (Control de Límites por Usuario) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, get, update, increment } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { currentUser } from './auth_ui.js';

console.log("Módulo Usage Tracker Cargado");

const firebaseConfig = {
  apiKey: "AIzaSyBxlmzjYjOEAwc_DVtFpt9DnN7XnuRkbKw",
  authDomain: "silenos-fc5e5.firebaseapp.com",
  projectId: "silenos-fc5e5",
  databaseURL: "https://silenos-fc5e5-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "silenos-fc5e5.firebasestorage.app",
  messagingSenderId: "314671855826",
  appId: "1:314671855826:web:ea0af5cd962baa1fd6150b",
  measurementId: "G-V636CRYZ8X"
};

// Inicializamos una instancia secundaria para la DB si es necesario, 
// o reusamos la conexión implícita si ya está activa.
const app = initializeApp(firebaseConfig, "UsageTracker");
const db = getDatabase(app);

const LIMITS = {
    script: 14, // Guiones
    book: 12,   // Libros
    game: 8     // Juegos
};

function getTodayKey() {
    return new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

/**
 * Verifica si el usuario puede generar más contenido hoy.
 * @param {string} type - 'script', 'book', o 'game'
 * @returns {Promise<boolean>}
 */
export async function checkUsageLimit(type) {
    if (!currentUser) return false;
    if (!LIMITS[type]) return false;

    const userId = currentUser.uid;
    const dateKey = getTodayKey();
    const limit = LIMITS[type];

    const usageRef = ref(db, `users/${userId}/usage/${dateKey}/${type}`);
    
    try {
        const snapshot = await get(usageRef);
        const currentUsage = snapshot.exists() ? snapshot.val() : 0;
        
        if (currentUsage >= limit) {
            alert(`⛔ Has alcanzado el límite diario de ${limit} para ${type.toUpperCase()}.\nVuelve mañana.`);
            return false;
        }
        return true;
    } catch (e) {
        console.error("Error verificando límites:", e);
        return false; // Por seguridad, si falla no deja generar (o true si prefieres ser permisivo)
    }
}

/**
 * Registra una generación completada.
 * Aumenta el contador diario y el histórico total.
 * @param {string} type - 'script', 'book', o 'game'
 */
export async function registerUsage(type) {
    if (!currentUser) return;
    const userId = currentUser.uid;
    const dateKey = getTodayKey();

    const updates = {};
    // Incrementar diario
    updates[`users/${userId}/usage/${dateKey}/${type}`] = increment(1);
    // Incrementar histórico total
    updates[`users/${userId}/stats/total_${type}`] = increment(1);

    try {
        await update(ref(db), updates);
        console.log(`Uso registrado: +1 ${type}`);
    } catch (e) {
        console.error("Error registrando uso:", e);
    }
}

/**
 * Obtiene las estadísticas para el modal de configuración.
 */
export async function getUserStats() {
    if (!currentUser) return null;
    const userId = currentUser.uid;
    const dateKey = getTodayKey();

    try {
        // Obtenemos todo el nodo del usuario para sacar totales y diario de una vez
        // Nota: Si el usuario tiene muchísimos días, esto podría optimizarse leyendo solo lo necesario.
        // Para este caso, leeremos en paralelo las rutas específicas.
        
        const p1 = get(ref(db, `users/${userId}/usage/${dateKey}`));
        const p2 = get(ref(db, `users/${userId}/stats`));

        const [dailySnap, totalSnap] = await Promise.all([p1, p2]);

        const daily = dailySnap.exists() ? dailySnap.val() : {};
        const total = totalSnap.exists() ? totalSnap.val() : {};

        return {
            daily: {
                script: daily.script || 0,
                book: daily.book || 0,
                game: daily.game || 0
            },
            total: {
                script: total.total_script || 0,
                book: total.total_book || 0,
                game: total.total_game || 0
            },
            limits: LIMITS
        };
    } catch (e) {
        console.error("Error obteniendo stats:", e);
        return null;
    }
}