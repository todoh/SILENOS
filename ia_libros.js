// --- IA: GENERACIÓN DE LIBROS (Versión Persistente - Queue System + Lazy Load) ---
// B → Visión (El servidor procesa la obra completa)
// S → Contenedor descendente (Recibe el resultado final)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, off, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { loadFileContent, saveFileToDrive } from './drive_api.js'; // <--- IMPORTACIÓN ACTUALIZADA

console.log("Módulo IA Libros Cargado (v7.2 - Server Queue + AutoDrive)");

// 1. CONFIGURACIÓN FIREBASE (Instancia Compartida)
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

// Referencias DOM
const scriptSelector = document.getElementById('ia-script-selector');
const nuanceInput = document.getElementById('ia-libro-nuance');
const paragraphsInput = document.getElementById('ia-book-paragraphs'); 
const btnGenLibro = document.getElementById('btn-gen-libro');
const progressContainer = document.getElementById('libro-progress');

// --- 2. SISTEMA DE BANDEJA DE ENTRADA (Listener de Resultados) ---

function initResultListener(userId) {
    console.log(`📚 Escuchando libros terminados para: ${userId}`);
    const resultsRef = ref(db, `users/${userId}/results/books`);

    onChildAdded(resultsRef, async (snapshot) => {
        const newBook = snapshot.val();
        if (!newBook) return;

        console.log("📦 Libro recibido del servidor:", newBook.title);

        // 1. Guardar en LocalStorage
        const localBooks = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
        
        // Evitar duplicados por ID
        if (!localBooks.find(b => b.id === newBook.id)) {
            localBooks.unshift(newBook);
            localStorage.setItem('minimal_books_v4', JSON.stringify(localBooks));
            
            alert(`✅ ¡Libro Completado!\n"${newBook.title}" se ha guardado en tu biblioteca.`);
            
            if (window.renderBookList) window.renderBookList();

            // --- AUTO-GUARDADO SILENCIOSO EN DRIVE ---
            try {
                console.log("☁️ Iniciando auto-guardado en Drive (Libro)...");
                const driveId = await saveFileToDrive('book', newBook.title, newBook);
                
                if (driveId) {
                    // Actualizamos referencia
                    const updatedBooks = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
                    const target = updatedBooks.find(b => b.id === newBook.id);
                    if (target) {
                        target.driveFileId = driveId;
                        localStorage.setItem('minimal_books_v4', JSON.stringify(updatedBooks));
                        console.log("✅ Libro sincronizado en Drive:", driveId);
                    }
                }
            } catch (driveErr) {
                console.warn("⚠️ Fallo en auto-guardado Drive:", driveErr);
            }
            // -----------------------------------------
        }

        // 2. Limpieza del servidor
        try {
            await remove(snapshot.ref);
            console.log("🧹 Copia del servidor eliminada.");
        } catch (e) {
            console.error("Error limpiando servidor:", e);
        }

        // 3. Reset UI
        if (btnGenLibro) {
            btnGenLibro.disabled = false;
            btnGenLibro.innerText = "Generar Libro";
        }
        showProgress(false);
    });
}

// Inicializar listener al loguear
onAuthStateChanged(auth, (user) => {
    if (user) initResultListener(user.uid);
});


// --- 3. LÓGICA DE ENVÍO A LA COLA (CON LAZY LOAD) ---

function refreshScriptSelector() {
    if (!scriptSelector) return;
    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    scriptSelector.innerHTML = '<option value="">-- Selecciona un Guion Base --</option>';
    
    // Mostrar scripts (indicando si están en la nube visualmente)
    scripts.slice().reverse().forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        const cloudMark = s.isPlaceholder ? "☁️ " : "";
        option.textContent = cloudMark + s.title;
        scriptSelector.appendChild(option);
    });
}

async function generateBookFromText() {
    try {
        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión para usar la IA.");

        const scriptId = scriptSelector.value;
        if (!scriptId) return alert("Selecciona un guion para adaptar.");

        // Obtener el guion localmente
        const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
        const sourceScript = scripts.find(s => s.id == scriptId);
        
        if (!sourceScript) return alert("Error: No se encuentra el guion en memoria.");

        if (btnGenLibro) {
            btnGenLibro.disabled = true;
            btnGenLibro.innerText = "Verificando...";
        }
        showProgress(true);

        // --- INICIO BLOQUE LAZY LOAD ---
        // Si el guion es un placeholder (solo índice), lo descargamos ahora mismo
        if (sourceScript.isPlaceholder) {
            updateProgress(5, "☁️ Descargando guion original desde Drive...");
            console.log("Detectado placeholder. Iniciando descarga...");

            try {
                if (!sourceScript.driveFileId) throw new Error("El guion no tiene ID de Drive asociado.");
                
                const fullData = await loadFileContent(sourceScript.driveFileId);
                
                if (!fullData || !fullData.scenes) {
                    throw new Error("El archivo descargado está vacío o corrupto.");
                }

                // Fusionamos los datos descargados con el objeto local
                Object.assign(sourceScript, fullData);
                delete sourceScript.isPlaceholder;

                // Guardamos en LocalStorage para no tener que descargarlo la próxima vez
                localStorage.setItem('minimal_scripts_v1', JSON.stringify(scripts));
                console.log("Guion descargado y cacheado localmente.");

                // Actualizamos el selector visualmente (quitamos la nube)
                refreshScriptSelector();
                scriptSelector.value = scriptId; 

            } catch (downloadError) {
                console.error(downloadError);
                throw new Error("Fallo al descargar el guion original: " + downloadError.message);
            }
        }
        // --- FIN BLOQUE LAZY LOAD ---

        const nuance = nuanceInput ? nuanceInput.value.trim() : "Narrativa estándar";
        
        if (btnGenLibro) btnGenLibro.innerText = "Enviando...";
        updateProgress(10, "Empaquetando guion y enviando al servidor...");

        // Preparar payload con las escenas ya cargadas
        const cleanScenes = sourceScript.scenes.map(s => ({
            title: s.title,
            content: s.paragraphs.map(p => p.text).join('\n')
        }));

        // Enviar Job a la Cola
        const jobsRef = ref(db, 'queue/books');
        const newJobRef = push(jobsRef);

        await set(newJobRef, {
            userId: user.uid,
            sourceTitle: sourceScript.title,
            scenes: cleanScenes, 
            styleNuance: nuance,
            status: "pending",
            createdAt: Date.now()
        });

        console.log("🚀 Job de Libro enviado. Scenes:", cleanScenes.length);
        updateProgress(15, "En cola de procesamiento...");

        // Listener de progreso específico de este Job
        onValue(newJobRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            if (data.msg) updateProgress(data.progress || 20, data.msg);
            
            if (data.status === "completed") {
                updateProgress(99, "Finalizando descarga...");
                off(newJobRef); 
            } 
            else if (data.status === "error") {
                alert("Error en el servidor: " + data.msg);
                off(newJobRef);
                showProgress(false);
                if (btnGenLibro) btnGenLibro.disabled = false;
            }
        });

    } catch (error) {
        console.error("Error local:", error);
        alert("Error: " + error.message);
        showProgress(false);
        if (btnGenLibro) btnGenLibro.disabled = false;
        if (btnGenLibro) btnGenLibro.innerText = "Generar Libro";
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

// Event Listeners
if (btnGenLibro) {
    btnGenLibro.onclick = null; 
    btnGenLibro.addEventListener('click', generateBookFromText);
}

document.addEventListener('DOMContentLoaded', refreshScriptSelector);
window.refreshScriptSelector = refreshScriptSelector;
window.generateBookFromText = generateBookFromText;