// IA GUIONES - VERSIÓN PERSISTENTE (INBOX SYSTEM)
// K → Ki (El flujo de datos no se pierde, se recupera al reconectar)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, off, get, child, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// 1. CONFIGURACIÓN (Instancia Compartida)
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

// Referencias al DOM
const btnGenGuion = document.getElementById('btn-gen-guion');
const inputScriptTheme = document.getElementById('ia-guion-prompt');
const inputChapters = document.getElementById('ia-guion-chapters'); 
const useDataToggle = document.getElementById('ia-use-data'); 
const progressContainer = document.getElementById('guion-progress');

console.log("Módulo IA Guiones Cargado - Sistema Persistente Activo.");

// --- AYUDANTE: OBTENER DATOS (NUEVO) ---
function getUniversalData() {
    try {
        const rawData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
        if (rawData.length === 0) return "";
        // Convertimos los datos a un string legible para la IA
        return rawData.map(d => `[${d.category || 'DATO'}] ${d.title}: ${d.content}`).join('\n').substring(0, 15000); // Límite de seguridad
    } catch (e) {
        console.warn("Error leyendo datos locales:", e);
        return "";
    }
}

// --- 2. SISTEMA DE BANDEJA DE ENTRADA ---
// Escucha permanentemente si aparecen resultados en la base de datos

function initResultListener(userId) {
    console.log(`📡 Escuchando resultados pendientes para: ${userId}`);
    const resultsRef = ref(db, `users/${userId}/results/scripts`);

    onChildAdded(resultsRef, async (snapshot) => {
        const newScript = snapshot.val();
        if (!newScript) return;

        console.log("📦 Guion recibido del servidor:", newScript.title);

        // 1. Guardar en LocalStorage
        const localScripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
        
        // Evitar duplicados si ya lo tenemos
        if (!localScripts.find(s => s.id === newScript.id)) {
            localScripts.unshift(newScript);
            localStorage.setItem('minimal_scripts_v1', JSON.stringify(localScripts));
            
            alert(`✅ ¡Guion recibido!\n"${newScript.title}" se ha guardado correctamente.`);
            
            // Actualizar interfaz si existe la función global
            if (window.renderScriptList) window.renderScriptList();
        }

        // 2. Limpieza: Borrar del servidor
        try {
            await remove(snapshot.ref);
            console.log("🧹 Copia del servidor eliminada.");
        } catch (e) {
            console.error("Error limpiando servidor:", e);
        }

        // 3. Resetear UI
        if (btnGenGuion) {
            btnGenGuion.disabled = false;
            btnGenGuion.innerText = "Generar Guion";
        }
        showProgress(false);
    });
}

// Inicializar listener cuando el usuario se loguea
onAuthStateChanged(auth, (user) => {
    if (user) {
        initResultListener(user.uid);
    }
});


// --- 3. FUNCIÓN DE GENERACIÓN (CORREGIDA) ---

async function generateScriptFromText() {
    try {
        const theme = inputScriptTheme ? inputScriptTheme.value.trim() : "";
        const chapters = inputChapters ? parseInt(inputChapters.value) : 5;
        const useDeepData = useDataToggle ? useDataToggle.checked : false;

        if (!theme) return alert("Por favor, define el tema.");

        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión para usar la IA.");

        // Preparar contexto de datos SI está marcado
        let dataContext = "";
        if (useDeepData) {
            dataContext = getUniversalData();
            if (!dataContext) console.log("⚠️ Se pidió usar datos, pero no hay datos en memoria.");
        }

        if (btnGenGuion) {
            btnGenGuion.disabled = true;
            btnGenGuion.innerText = "Enviando...";
        }
        showProgress(true);
        updateProgress(5, "Contactando servidor...");

        // Enviar Job a la Cola
        const jobsRef = ref(db, 'queue/scripts');
        const newJobRef = push(jobsRef);
        
        await set(newJobRef, {
            userId: user.uid,
            prompt: theme,
            context: dataContext, // <--- ENVIAMOS LOS DATOS AQUÍ
            chapters: chapters,
            mode: useDeepData ? 'deep' : 'fast',
            status: "pending",
            createdAt: Date.now()
        });

        console.log("🚀 Job enviado con modo:", useDeepData ? "DEEP (Con datos)" : "FAST");
        updateProgress(15, "En cola de procesamiento...");

        // Listener de progreso
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
        console.error("Error local:", error);
        alert("Error: " + error.message);
        showProgress(false);
        if (btnGenGuion) btnGenGuion.disabled = false;
    }
}

// Helpers UI
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