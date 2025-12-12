// SILENOS/ia_guiones.js
// IA GUIONES - VERSIÓN PERSISTENTE (SERVER HOLD PROTOCOL)

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
const progressContainer = document.getElementById('guion-progress');

console.log("Módulo IA Guiones Cargado (v3.4 - Server Hold Protocol)");

 
// --- MONITOR DE COLA EN TIEMPO REAL  -
function initQueueMonitor(userId) {
    const queueRef = ref(db, 'queue/scripts');
    onValue(queueRef, (snapshot) => {
        const myJobs = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const job = childSnapshot.val();
                
                // [FIX] Ahora incluimos 'completed' y 'error' para que la UI reciba el evento final
                // y pueda cerrar la tarjeta. Antes se quedaba "zombie" al filtrarlos.
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

// --- FUNCIÓN CORREGIDA: RECEPCIÓN SEGURA + SERVER HOLD ---
function initResultListener(userId) {
    console.log(`📡 Escuchando resultados (Guiones) para: ${userId}`);
    const resultsRef = ref(db, `users/${userId}/results/scripts`);

    onChildAdded(resultsRef, async (snapshot) => {
        const newScript = snapshot.val();
        if (!newScript) return;

        console.log("📦 Guion recibido:", newScript.title);
        const localScripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
        
        // Evitar duplicados
        if (localScripts.findIndex(s => s.id === newScript.id) === -1) {
            
            // [SERVER HOLD]: Inyectamos la Key de Firebase para borrarlo LUEGO (al abrir)
            newScript.firebaseKey = snapshot.key;

            // Paso 1: Intentamos añadirlo al array local
            localScripts.unshift(newScript);
            
            try {
                // INTENTO 1: Guardado estándar
                localStorage.setItem('minimal_scripts_v1', JSON.stringify(localScripts));
                
                alert(`✅ ¡Guion recibido!\n"${newScript.title}" guardado localmente.\n(Se mantiene copia en servidor hasta que lo abras).`);
                if (window.renderScriptList) window.renderScriptList();

                // Backup silencioso en Drive (Opcional, pero bueno tenerlo)
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
                // --- MANEJO DEL ERROR: MEMORIA LLENA ---
                if (e.name === 'QuotaExceededError') {
                    console.warn("⚠️ LocalStorage lleno. Activando protocolo 'Cloud-First'.");
                    
                    try {
                        // 1. Forzar subida a Drive inmediatamente
                        const driveId = await saveFileToDrive('script', newScript.title, newScript);
                        
                        if (driveId) {
                            // 2. Crear Placeholder
                            const placeholder = {
                                id: newScript.id,
                                title: newScript.title,
                                isAI: true,
                                driveFileId: driveId,
                                isPlaceholder: true, 
                                scenes: [], 
                                timestamp: Date.now()
                            };

                            // 3. Sustituir
                            localScripts[0] = placeholder;

                            // 4. Reintentar guardado
                            localStorage.setItem('minimal_scripts_v1', JSON.stringify(localScripts));
                            
                            alert(`⚠️ Memoria llena.\n"${newScript.title}" guardado en NUBE ☁️.`);
                            if (window.renderScriptList) window.renderScriptList();
                            
                            // [EXCEPCIÓN]: Si tuvimos que convertirlo a placeholder por falta de espacio,
                            // SI podemos borrarlo del servidor porque ya está en Drive seguro.
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
        // [IMPORTANTE]: YA NO BORRAMOS DEL SERVIDOR AQUÍ (excepto en el caso de memoria llena arriba)
        
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

        if (btnGenGuion) {
            btnGenGuion.disabled = true;
            btnGenGuion.innerText = "Enviando...";
        }
        showProgress(true);
        updateProgress(5, "Contactando servidor...");

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

        console.log("🚀 Job enviado.");
        updateProgress(15, "En cola...");

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