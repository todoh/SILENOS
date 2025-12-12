// SILENOS/ia_guiones.js
// IA GUIONES - VERSIÓN PERSISTENTE (SERVER HOLD PROTOCOL) - FIRE & FORGET

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, off, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { saveFileToDrive } from './drive_api.js';  
import { updateQueueState } from './project_ui.js'; 
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; 

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

console.log("Módulo IA Guiones Cargado (v3.5 - Fire & Forget)");

// --- MONITOR DE COLA EN TIEMPO REAL (MICRO-TARJETAS) ---
function initQueueMonitor(userId) {
    const queueRef = ref(db, 'queue/scripts');
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

// --- RECEPCIÓN DE RESULTADOS ---
function initResultListener(userId) {
    console.log(`📡 Escuchando resultados (Guiones) para: ${userId}`);
    const resultsRef = ref(db, `users/${userId}/results/scripts`);

    onChildAdded(resultsRef, async (snapshot) => {
        const newScript = snapshot.val();
        if (!newScript) return;

        console.log("📦 Guion recibido:", newScript.title);
        const localScripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
        
        if (localScripts.findIndex(s => s.id === newScript.id) === -1) {
            
            newScript.firebaseKey = snapshot.key;

            localScripts.unshift(newScript);
            
            try {
                localStorage.setItem('minimal_scripts_v1', JSON.stringify(localScripts));
                
                alert(`✅ ¡Guion recibido!\n"${newScript.title}" guardado localmente.`);
                if (window.renderScriptList) window.renderScriptList();

                try {
                    const driveId = await saveFileToDrive('script', newScript.title, newScript);
                    if (driveId) {
                        const updated = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
                        const t = updated.find(s => s.id === newScript.id);
                        if (t) { 
                            t.driveFileId = driveId; 
                            localStorage.setItem('minimal_scripts_v1', JSON.stringify(updated)); 
                        }
                    }
                } catch (e) { console.warn("Error backup drive background:", e); }

            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn("⚠️ LocalStorage lleno. Activando protocolo 'Cloud-First'.");
                    try {
                        const driveId = await saveFileToDrive('script', newScript.title, newScript);
                        
                        if (driveId) {
                            const placeholder = {
                                id: newScript.id,
                                title: newScript.title,
                                isAI: true,
                                driveFileId: driveId,
                                isPlaceholder: true, 
                                scenes: [], 
                                timestamp: Date.now()
                            };

                            localScripts[0] = placeholder;
                            localStorage.setItem('minimal_scripts_v1', JSON.stringify(localScripts));
                            
                            alert(`⚠️ Memoria llena.\n"${newScript.title}" guardado en NUBE ☁️.`);
                            if (window.renderScriptList) window.renderScriptList();
                            
                            try { await remove(snapshot.ref); console.log("🗑️ Borrado de servidor (Force Cloud Save)."); } catch(e){}

                        } else {
                            throw new Error("Fallo Drive Full Disk");
                        }
                    } catch (criticalError) {
                        alert(`❌ ERROR CRÍTICO\nNo hay espacio y falló Drive. El archivo sigue seguro en el servidor.`);
                    }
                } 
            }
        } 
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
        const canProceed = await checkUsageLimit('script');
        if (!canProceed) return; 

        const theme = inputScriptTheme ? inputScriptTheme.value.trim() : "";
        const chapters = inputChapters ? parseInt(inputChapters.value) : 5;
        const useDeepData = useDataToggle ? useDataToggle.checked : false;

        if (!theme) return alert("Por favor, define el tema.");
        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión.");

        let dataContext = "";
        if (useDeepData) dataContext = getUniversalData();

        // 1. Deshabilitar brevemente para evitar doble click
        if (btnGenGuion) {
            btnGenGuion.disabled = true;
            btnGenGuion.innerText = "Enviando...";
        }

        // 2. Enviar a Cola
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

        registerUsage('script');

        console.log("🚀 Job enviado. Limpiando interfaz.");
        
        // 3. Limpieza inmediata (Fire & Forget)
        if (inputScriptTheme) inputScriptTheme.value = "";
        
        if (btnGenGuion) {
            btnGenGuion.disabled = false;
            btnGenGuion.innerText = "Generar Guion";
        }

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
        if (btnGenGuion) btnGenGuion.disabled = false;
    }
}

if (btnGenGuion) {
    btnGenGuion.onclick = null; 
    btnGenGuion.addEventListener('click', generateScriptFromText);
}