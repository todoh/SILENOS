// SILENOS/ia_guiones.js
// IA GUIONES - PROTOCOLO DE ENTREGA GARANTIZADA (DB HOLD)
// El archivo permanece en Firebase DB hasta que el usuario confirma la recepción en la UI.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { saveFileToDrive } from './drive_api.js';  
import { updateQueueState } from './project_ui.js'; 
import { showResultNotification } from './notification_ui.js'; // Importamos la nueva notificación
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; 
import { getDriveToken } from './auth_ui.js';

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

console.log("Módulo IA Guiones Cargado (v6.0 - DB Hold Protocol)");

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

// --- RECEPCIÓN SEGURA ---
function initResultListener(userId) {
    const resultsRef = ref(db, `users/${userId}/results/scripts`);

    onChildAdded(resultsRef, (snapshot) => {
        const newScript = snapshot.val();
        if (!newScript) return;

        // 1. Verificar si ya lo tenemos guardado (para evitar notificaciones repetidas si ya se descargó)
        const localScripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
        const exists = localScripts.find(s => s.id === newScript.id);

        if (exists && exists.driveFileId) {
            // Si existe local y en drive, es seguro borrar del servidor automáticamente (limpieza)
            remove(snapshot.ref).catch(e => console.warn(e));
            return;
        }

        console.log("📥 Guion disponible en DB. Solicitando confirmación al usuario:", newScript.title);

        // 2. MOSTRAR NOTIFICACIÓN INTERACTIVA
        // No guardamos nada todavía. Esperamos al usuario.
        showResultNotification(newScript.title, 'script', async () => {
            try {
                return await processScriptSave(newScript, snapshot.ref);
            } catch (e) {
                console.error("Error al guardar:", e);
                alert("Error al guardar: " + e.message + "\n\nEl archivo sigue seguro en el servidor. Inténtalo de nuevo.");
                return false; // Indica fallo a la notificación para que no se cierre
            }
        });
    });
}

async function processScriptSave(scriptData, dbRef) {
    // A. GUARDAR LOCAL
    const localScripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    
    // Evitar duplicados si el usuario da click muchas veces
    const index = localScripts.findIndex(s => s.id === scriptData.id);
    if (index !== -1) localScripts[index] = scriptData;
    else localScripts.unshift(scriptData);
    
    try {
        localStorage.setItem('minimal_scripts_v1', JSON.stringify(localScripts));
    } catch (e) {
        // Fallback si LocalStorage está lleno: intentamos subir a Drive directamente más abajo
        console.warn("LocalStorage lleno, intentando modo 'Solo Nube'");
    }

    // B. GUARDAR EN DRIVE (Si hay token)
    const token = getDriveToken();
    if (token) {
        try {
            const driveId = await saveFileToDrive('script', scriptData.title, scriptData);
            if (driveId) {
                // Actualizar referencia local
                scriptData.driveFileId = driveId;
                const updatedList = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
                const t = updatedList.find(s => s.id === scriptData.id);
                if (t) { 
                    t.driveFileId = driveId;
                    localStorage.setItem('minimal_scripts_v1', JSON.stringify(updatedList));
                }
            }
        } catch (driveErr) {
            console.error("Error subiendo a Drive:", driveErr);
            if (!confirm("No se pudo guardar en Drive (Error de red). ¿Quieres borrarlo del servidor de todos modos y quedarte solo con la copia local?")) {
                return false; // Usuario cancela borrado, mantenemos en servidor
            }
        }
    } else {
        alert("Guardado en navegador. (No conectado a Drive)");
    }

    // C. BORRAR DEL SERVIDOR (Solo si llegamos aquí)
    await remove(dbRef);
    console.log("✅ Guion guardado y eliminado del servidor.");
    
    if (window.renderScriptList) window.renderScriptList();
    return true;
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