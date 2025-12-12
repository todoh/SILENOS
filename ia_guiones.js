// SILENOS/ia_guiones.js
// IA GUIONES - VERSIÓN PERSISTENTE (INBOX SYSTEM + REALTIME HUD + SMART STORAGE)

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

console.log("Módulo IA Guiones Cargado (v3.3 - Zero Data Loss Protocol)");

// --- MONITOR DE COLA EN TIEMPO REAL ---
function initQueueMonitor(userId) {
    const queueRef = ref(db, 'queue/scripts');
    onValue(queueRef, (snapshot) => {
        const myJobs = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const job = childSnapshot.val();
                if (job.userId === userId && (job.status === 'pending' || job.status === 'processing')) {
                    myJobs.push({ title: job.prompt, status: job.status });
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

// --- FUNCIÓN CORREGIDA: RECEPCIÓN SEGURA ---
function initResultListener(userId) {
    console.log(`📡 Escuchando resultados (Guiones) para: ${userId}`);
    const resultsRef = ref(db, `users/${userId}/results/scripts`);

    onChildAdded(resultsRef, async (snapshot) => {
        const newScript = snapshot.val();
        if (!newScript) return;

        console.log("📦 Guion recibido:", newScript.title);
        const localScripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
        
        let isDataSecured = false;

        // Evitar duplicados
        if (localScripts.findIndex(s => s.id === newScript.id) === -1) {
            
            // Paso 1: Intentamos añadirlo al array local
            localScripts.unshift(newScript);
            
            try {
                // INTENTO 1: Guardado estándar
                localStorage.setItem('minimal_scripts_v1', JSON.stringify(localScripts));
                
                alert(`✅ ¡Guion recibido!\n"${newScript.title}" guardado.`);
                if (window.renderScriptList) window.renderScriptList();

                // Backup silencioso en Drive
                try {
                    const driveId = await saveFileToDrive('script', newScript.title, newScript);
                    if (driveId) {
                        const updated = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
                        const t = updated.find(s => s.id === newScript.id);
                        if (t) { 
                            t.driveFileId = driveId; 
                            localStorage.setItem('minimal_scripts_v1', JSON.stringify(updated)); 
                        }
                        // Confirmación Drive exitosa
                        isDataSecured = true;
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
                            // 2. Crear Placeholder (Versión ultraligera para el índice)
                            const placeholder = {
                                id: newScript.id,
                                title: newScript.title,
                                isAI: true,
                                driveFileId: driveId,
                                isPlaceholder: true, // Esto activa el Lazy Load al abrirlo
                                scenes: [], // Eliminamos el contenido pesado
                                timestamp: Date.now()
                            };

                            // 3. Sustituir el objeto pesado por el ligero en la lista
                            localScripts[0] = placeholder;

                            // 4. Reintentar guardado local (ahora pesa mucho menos)
                            localStorage.setItem('minimal_scripts_v1', JSON.stringify(localScripts));
                            
                            alert(`⚠️ Memoria local llena.\n"${newScript.title}" se ha guardado en la NUBE ☁️ y se ha creado un acceso directo.`);
                            if (window.renderScriptList) window.renderScriptList();
                            
                            isDataSecured = true;

                        } else {
                            throw new Error("No se pudo obtener ID de Drive al intentar liberar espacio.");
                        }
                    } catch (criticalError) {
                        console.error("Fallo crítico:", criticalError);
                        alert(`❌ ERROR CRÍTICO DE ESPACIO\nNo hay espacio local y falló la conexión con Drive.\n\nPor favor, libera espacio eliminando proyectos antiguos.`);
                    }
                } else {
                    // Otros errores
                    console.error("Error desconocido localStorage:", e);
                    alert("Error al guardar: " + e.message);
                }
            }
        } else {
            // Ya existe localmente
            isDataSecured = true;
        }

        // Limpiar cola de Firebase SOLO si está asegurado
        if (isDataSecured) {
             try { await remove(snapshot.ref); console.log("🗑️ Guion eliminado del servidor (Confirmado en Drive)."); } catch (e) {}
        } else {
             console.warn("🔒 Guion mantenido en servidor (Fallo de backup Drive).");
        }

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