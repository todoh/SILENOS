// IA: GENERADOR DE JUEGOS (Versión Fire & Forget)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, off, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { saveFileToDrive } from './drive_api.js'; 
import { updateQueueState } from './project_ui.js';
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; 

console.log("Módulo IA Juegos Cargado (v3.3 - Fire & Forget)");

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

// --- MONITOR DE COLA ---
function initQueueMonitor(userId) {
    const queueRef = ref(db, 'queue/games');
    onValue(queueRef, (snapshot) => {
        const myJobs = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const job = childSnapshot.val();
                
                const relevantStatuses = ['pending', 'processing', 'completed', 'error'];

                if (job.userId === userId && relevantStatuses.includes(job.status)) {
                  myJobs.push({ 
                        id: childSnapshot.key, 
                        title: job.prompt, 
                        status: job.status,
                        progress: job.progress,
                        msg: job.msg
                    });
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

// --- RECEPCIÓN DE RESULTADOS ---
function initResultListener(userId) {
    const resultsRef = ref(db, `users/${userId}/results/games`);
    onChildAdded(resultsRef, async (snapshot) => {
        const newGame = snapshot.val();
        if (!newGame) return;
        console.log("🎲 Juego recibido:", newGame.title);
        const localGames = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
        
        if (!localGames.find(g => g.id === newGame.id)) {
            
            newGame.firebaseKey = snapshot.key;

            localGames.push(newGame); 
            localStorage.setItem('minimal_games_v1', JSON.stringify(localGames));
            alert(`✅ ¡Juego Terminado!\n"${newGame.title}" añadido.`);
            if (window.renderGameList) window.renderGameList();
            
            try {
                // Backup Drive
                const driveId = await saveFileToDrive('game', newGame.title, newGame);
                if (driveId) {
                    const updated = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
                    const t = updated.find(g => g.id === newGame.id);
                    if (t) { t.driveFileId = driveId; localStorage.setItem('minimal_games_v1', JSON.stringify(updated)); }
                }
            } catch (e) { console.warn("Fallo backup drive juegos", e); }
        }
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
        const canProceed = await checkUsageLimit('game');
        if (!canProceed) return; 

        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión.");

        const topic = promptInput.value.trim();
        const metric = metricInput.value.trim() || "Puntuación Final";
        if (!topic) return alert("Define tema.");
        const contextData = useDataCheck.checked ? getUniversalData() : "";

        // 1. Bloqueo visual temporal
        if (btnGen) btnGen.disabled = true;

        // 2. Enviar Job
        const newJobRef = push(ref(db, 'queue/games'));
        await set(newJobRef, {
            userId: user.uid,
            topic: topic,
            metric: metric,
            context: contextData,
            status: "pending",
            createdAt: Date.now()
        });

        registerUsage('game');

        console.log("🚀 Job Juego enviado. Limpiando.");
        
        // 3. Limpieza inmediata (Fire & Forget)
        if (promptInput) promptInput.value = "";
        
        if (btnGen) btnGen.disabled = false;

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
        if (btnGen) btnGen.disabled = false;
    }
}

if (btnGen) {
    btnGen.addEventListener('click', startStoryGeneration);
}