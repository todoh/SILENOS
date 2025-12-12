// IA GUIONES - VERSIÓN PERSISTENTE (INBOX SYSTEM + REALTIME HUD)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, off, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { saveFileToDrive } from './drive_api.js';  
import { updateQueueState } from './project_ui.js'; 
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; // <--- IMPORTANTE: Tracker

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

const btnGenGuion = document.getElementById('btn-gen-guion');
const inputScriptTheme = document.getElementById('ia-guion-prompt');
const inputChapters = document.getElementById('ia-guion-chapters'); 
const useDataToggle = document.getElementById('ia-use-data'); 
const progressContainer = document.getElementById('guion-progress');

console.log("Módulo IA Guiones Cargado (v3.1 - Con Límites)");

// --- MONITOR DE COLA EN TIEMPO REAL ---
function initQueueMonitor(userId) {
    const queueRef = ref(db, 'queue/scripts');
    // Escucha constante: Se actualiza si añades, si el servidor procesa, o si termina.
    onValue(queueRef, (snapshot) => {
        const myJobs = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const job = childSnapshot.val();
                if (job.userId === userId && (job.status === 'pending' || job.status === 'processing')) {
                    // Extraemos título y estado para la UI
                    myJobs.push({ title: job.prompt, status: job.status });
                }
            });
        }
        // Actualiza el HUD con la lista de nombres
        updateQueueState('script', myJobs);
    });
}

function getUniversalData() {
    try {
        const rawData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
        if (rawData.length === 0) return "";
        return rawData.map(d => `[${d.category || 'DATO'}] ${d.title}: ${d.content}`).join('\n').substring(0, 15000); 
    } catch (e) { return ""; }
}

function initResultListener(userId) {
    console.log(`📡 Escuchando resultados (Guiones) para: ${userId}`);
    const resultsRef = ref(db, `users/${userId}/results/scripts`);

    onChildAdded(resultsRef, async (snapshot) => {
        const newScript = snapshot.val();
        if (!newScript) return;

        console.log("📦 Guion recibido:", newScript.title);
        const localScripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
        
        if (localScripts.findIndex(s => s.id === newScript.id) === -1) {
            localScripts.unshift(newScript);
            localStorage.setItem('minimal_scripts_v1', JSON.stringify(localScripts));
            
            alert(`✅ ¡Guion recibido!\n"${newScript.title}" guardado.`);
            if (window.renderScriptList) window.renderScriptList();

            // Auto-Drive
            try {
                const driveId = await saveFileToDrive('script', newScript.title, newScript);
                if (driveId) {
                    newScript.driveFileId = driveId;
                    const updated = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
                    const t = updated.find(s => s.id === newScript.id);
                    if (t) { t.driveFileId = driveId; localStorage.setItem('minimal_scripts_v1', JSON.stringify(updated)); }
                }
            } catch (e) {}
        }

        try { await remove(snapshot.ref); } catch (e) {}

        if (btnGenGuion) {
            btnGenGuion.disabled = false;
            btnGenGuion.innerText = "Generar Guion";
        }
        showProgress(false);
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        initResultListener(user.uid);
        initQueueMonitor(user.uid); 
    }
});

async function generateScriptFromText() {
    try {
        // 1. CHEQUEO DE LÍMITES ANTES DE EMPEZAR
        const canProceed = await checkUsageLimit('script');
        if (!canProceed) return; // Si retorna false, el tracker ya mostró la alerta.

        const theme = inputScriptTheme ? inputScriptTheme.value.trim() : "";
        const chapters = inputChapters ? parseInt(inputChapters.value) : 5;
        const useDeepData = useDataToggle ? useDataToggle.checked : false;

        if (!theme) return alert("Por favor, define el tema.");
        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión.");

        let dataContext = "";
        if (useDeepData) dataContext = getUniversalData();

        if (btnGenGuion) {
            btnGenGuion.disabled = true;
            btnGenGuion.innerText = "Enviando...";
        }
        showProgress(true);
        updateProgress(5, "Contactando servidor...");

        // 2. ENVÍO A LA COLA
        const newJobRef = push(ref(db, 'queue/scripts'));
        await set(newJobRef, {
            userId: user.uid,
            prompt: theme,
            context: dataContext,
            chapters: chapters,
            mode: useDeepData ? 'deep' : 'fast',
            status: "pending",
            createdAt: Date.now()
        });

        // 3. REGISTRO DEL CONSUMO
        registerUsage('script');

        console.log("🚀 Job enviado.");
        updateProgress(15, "En cola...");

        // Listener de progreso individual (Solo para barra de progreso)
        onValue(newJobRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            if (data.msg) updateProgress(data.progress || 20, data.msg);
            
            if (data.status === "completed") {
                updateProgress(99, "Finalizando...");
                off(newJobRef); 
            } 
            else if (data.status === "error") {
                alert("Error servidor: " + data.msg);
                off(newJobRef);
                showProgress(false);
                if (btnGenGuion) btnGenGuion.disabled = false;
            }
        });

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
        showProgress(false);
        if (btnGenGuion) btnGenGuion.disabled = false;
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

if (btnGenGuion) {
    btnGenGuion.onclick = null; 
    btnGenGuion.addEventListener('click', generateScriptFromText);
}