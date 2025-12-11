// --- IA: GENERADOR DE JUEGOS (Versión Persistente - Queue System) ---
// J → Juegos (Dinámica procesada en la nube)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, off, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { saveFileToDrive } from './drive_api.js'; // <--- IMPORTACIÓN AÑADIDA

console.log("Módulo IA Juegos Cargado (v2.6 - Server Queue + AutoDrive)");

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

// DOM Elements
const promptInput = document.getElementById('ia-game-prompt');
const metricInput = document.getElementById('ia-game-metric'); 
const useDataCheck = document.getElementById('ia-game-use-data');
const btnGen = document.getElementById('btn-gen-game');
const progressContainer = document.getElementById('game-progress');

// --- 1. AYUDANTE DE DATOS ---
function getUniversalData() {
    const rawData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    if (rawData.length === 0) return "";
    return rawData.map(d => `[${d.category}] ${d.title}: ${d.content}`).join('\n').substring(0, 10000); // Limitamos tamaño
}

// --- 2. SISTEMA DE BANDEJA DE ENTRADA ---
function initResultListener(userId) {
    console.log(`🎮 Escuchando juegos terminados para: ${userId}`);
    const resultsRef = ref(db, `users/${userId}/results/games`);

    onChildAdded(resultsRef, async (snapshot) => {
        const newGame = snapshot.val();
        if (!newGame) return;

        console.log("🎲 Juego recibido del servidor:", newGame.title);

        const localGames = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
        
        if (!localGames.find(g => g.id === newGame.id)) {
            localGames.push(newGame); 
            localStorage.setItem('minimal_games_v1', JSON.stringify(localGames));
            
            alert(`✅ ¡Juego Terminado!\n"${newGame.title}" ha sido añadido a tu lista.`);
            
            if (window.renderGameList) window.renderGameList();
            
            // Opcional: Abrir automáticamente
            if (window.openGame) window.openGame(newGame.id);

            // --- AUTO-GUARDADO SILENCIOSO EN DRIVE ---
            try {
                console.log("☁️ Iniciando auto-guardado en Drive (Juego)...");
                const driveId = await saveFileToDrive('game', newGame.title, newGame);
                
                if (driveId) {
                    // Actualizamos referencia
                    const updatedGames = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
                    const target = updatedGames.find(g => g.id === newGame.id);
                    if (target) {
                        target.driveFileId = driveId;
                        localStorage.setItem('minimal_games_v1', JSON.stringify(updatedGames));
                        console.log("✅ Juego sincronizado en Drive:", driveId);
                    }
                }
            } catch (driveErr) {
                console.warn("⚠️ Fallo en auto-guardado Drive:", driveErr);
            }
            // -----------------------------------------
        }

        try {
            await remove(snapshot.ref);
        } catch (e) { console.error(e); }

        if (btnGen) btnGen.disabled = false;
        showProgress(false);
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) initResultListener(user.uid);
});

// --- 3. INICIO DE GENERACIÓN ---

async function startStoryGeneration() {
    try {
        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión para usar la IA.");

        const topic = promptInput.value.trim();
        const metric = metricInput.value.trim() || "Puntuación Final";
        
        if (!topic) return alert("Por favor, define el tema del juego.");

        // Preparar contexto
        const contextData = useDataCheck.checked ? getUniversalData() : "";

        if (btnGen) btnGen.disabled = true;
        showProgress(true);
        updateProgress(5, "Contactando con el Arquitecto de Juegos...");

        // Enviar Job
        const jobsRef = ref(db, 'queue/games');
        const newJobRef = push(jobsRef);

        await set(newJobRef, {
            userId: user.uid,
            topic: topic,
            metric: metric,
            context: contextData,
            status: "pending",
            createdAt: Date.now()
        });

        console.log("🚀 Job de Juego enviado.");
        updateProgress(10, "En cola de diseño...");

        // Listener de progreso
        onValue(newJobRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            if (data.msg) updateProgress(data.progress || 20, data.msg);

            if (data.status === "completed") {
                updateProgress(99, "Finalizando ensamblaje...");
                off(newJobRef);
            } 
            else if (data.status === "error") {
                alert("Error servidor: " + data.msg);
                off(newJobRef);
                showProgress(false);
                if (btnGen) btnGen.disabled = false;
            }
        });

    } catch (e) {
        console.error(e);
        alert("Ocurrió un error local: " + e.message);
        showProgress(false);
        if (btnGen) btnGen.disabled = false;
    }
}

// UI Helpers
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