// IA: GENERADOR DE JUEGOS (Versión Persistente - Realtime HUD)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, off, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { saveFileToDrive } from './drive_api.js'; 
import { updateQueueState } from './project_ui.js';
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; // <--- IMPORTANTE: Tracker

console.log("Módulo IA Juegos Cargado (v3.1 - Zero Data Loss Protocol)");

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

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getDatabase(app);

const promptInput = document.getElementById('ia-game-prompt');
const metricInput = document.getElementById('ia-game-metric'); 
const useDataCheck = document.getElementById('ia-game-use-data');
const btnGen = document.getElementById('btn-gen-game');
const progressContainer = document.getElementById('game-progress');

// --- MONITOR DE COLA ---
function initQueueMonitor(userId) {
    const queueRef = ref(db, 'queue/games');
    onValue(queueRef, (snapshot) => {
        const myJobs = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const job = childSnapshot.val();
                if (job.userId === userId && (job.status === 'pending' || job.status === 'processing')) {
                    // Usamos topic como título
                    myJobs.push({ title: job.topic, status: job.status });
                }
            });
        }
        updateQueueState('game', myJobs);
    });
}

function getUniversalData() {
    const rawData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    if (rawData.length === 0) return "";
    return rawData.map(d => `[${d.category}] ${d.title}: ${d.content}`).join('\n').substring(0, 10000);
}

// --- FUNCIÓN CORREGIDA: RECEPCIÓN SEGURA ---
function initResultListener(userId) {
    const resultsRef = ref(db, `users/${userId}/results/games`);
    onChildAdded(resultsRef, async (snapshot) => {
        const newGame = snapshot.val();
        if (!newGame) return;
        console.log("🎲 Juego recibido:", newGame.title);
        const localGames = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
        
        let isDataSecured = false;

        if (!localGames.find(g => g.id === newGame.id)) {
            localGames.push(newGame); 
            localStorage.setItem('minimal_games_v1', JSON.stringify(localGames));
            alert(`✅ ¡Juego Terminado!\n"${newGame.title}" añadido.`);
            if (window.renderGameList) window.renderGameList();
            
            try {
                // BACKUP DRIVE OBLIGATORIO PARA CONFIRMAR BORRADO
                const driveId = await saveFileToDrive('game', newGame.title, newGame);
                if (driveId) {
                    const updated = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
                    const t = updated.find(g => g.id === newGame.id);
                    if (t) { t.driveFileId = driveId; localStorage.setItem('minimal_games_v1', JSON.stringify(updated)); }
                    
                    isDataSecured = true;
                }
            } catch (e) { console.warn("Fallo backup drive juegos", e); }
        } else {
            // Ya existe localmente
            isDataSecured = true;
        }

        // Solo borrar si está asegurado
        if (isDataSecured) {
            try { await remove(snapshot.ref); console.log("🗑️ Juego eliminado del servidor (Backup Drive OK)."); } catch (e) {}
        } else {
            console.warn("🔒 Juego mantenido en servidor (Fallo Drive).");
        }

        if (btnGen) btnGen.disabled = false;
        showProgress(false);
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        initResultListener(user.uid);
        initQueueMonitor(user.uid);
    }
});

async function startStoryGeneration() {
    try {
        // 1. CHEQUEO DE LÍMITES
        const canProceed = await checkUsageLimit('game');
        if (!canProceed) return; 

        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión.");

        const topic = promptInput.value.trim();
        const metric = metricInput.value.trim() || "Puntuación Final";
        if (!topic) return alert("Define tema.");
        const contextData = useDataCheck.checked ? getUniversalData() : "";

        if (btnGen) btnGen.disabled = true;
        showProgress(true);
        updateProgress(5, "Contactando...");

        // 2. ENVÍO A COLA
        const newJobRef = push(ref(db, 'queue/games'));
        await set(newJobRef, {
            userId: user.uid,
            topic: topic,
            metric: metric,
            context: contextData,
            status: "pending",
            createdAt: Date.now()
        });

        // 3. REGISTRO CONSUMO
        registerUsage('game');

        console.log("🚀 Job Juego enviado.");
        updateProgress(10, "En cola...");

        onValue(newJobRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            if (data.msg) updateProgress(data.progress || 20, data.msg);
            if (data.status === "completed") {
                updateProgress(99, "Finalizando...");
                off(newJobRef);
            } 
            else if (data.status === "error") {
                alert("Error: " + data.msg);
                off(newJobRef);
                showProgress(false);
                if (btnGen) btnGen.disabled = false;
            }
        });

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
        showProgress(false);
        if (btnGen) btnGen.disabled = false;
    }
}

function updateProgress(percent, text) {
    if(!progressContainer) return;
    const fill = progressContainer.querySelector('.progress-fill');
    const textEl = progressContainer.querySelector('.progress-text');
    const percentEl = progressContainer.querySelector('.progress-percent');
    if(fill) fill.style.width = `${percent}%`;
    if(textEl) textEl.textContent = text;
    if(percentEl) percentEl.textContent = `${Math.floor(percent)}%`;
}
function showProgress(show) {
    if(!progressContainer) return;
    if(show) progressContainer.classList.add('active');
    else progressContainer.classList.remove('active');
}

if (btnGen) {
    btnGen.addEventListener('click', startStoryGeneration);
}