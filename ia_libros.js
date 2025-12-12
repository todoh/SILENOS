// IA: GENERACIÓN DE LIBROS (Versión Fire & Forget)
// FIX: Limpieza automática de resultados procesados.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, off, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { loadFileContent, saveFileToDrive } from './drive_api.js'; 
import { updateQueueState } from './project_ui.js';
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; 

console.log("Módulo IA Libros Cargado (v8.5 - AutoClean Fix)");

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

const scriptSelector = document.getElementById('ia-script-selector');
const nuanceInput = document.getElementById('ia-libro-nuance');
const paragraphsInput = document.getElementById('ia-book-paragraphs'); 
const btnGenLibro = document.getElementById('btn-gen-libro');

// --- MONITOR DE COLA ---
function initQueueMonitor(userId) {
    const queueRef = ref(db, 'queue/books');
    onValue(queueRef, (snapshot) => {
        const myJobs = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const job = childSnapshot.val();
                const relevantStatuses = ['pending', 'processing', 'completed', 'error'];

                if (job.userId === userId && relevantStatuses.includes(job.status)) {
                  myJobs.push({ 
                        id: childSnapshot.key,
                        title: job.sourceTitle || job.title || "Libro en Proceso", 
                        status: job.status,
                        progress: job.progress,
                        msg: job.msg
                    });
                }
            });
        }
        updateQueueState('book', myJobs);
    });
}

// --- RECEPCIÓN DE RESULTADOS (MODIFICADO) ---
function initResultListener(userId) {
    const resultsRef = ref(db, `users/${userId}/results/books`);
    
    onChildAdded(resultsRef, async (snapshot) => {
        const newBook = snapshot.val();
        if (!newBook) return;

        const localBooks = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
        
        // 1. Limpieza de duplicados
        const exists = localBooks.some(b => b.id === newBook.id);
        if (exists) {
            console.log(`🧹 Limpiando libro duplicado del servidor: ${newBook.title}`);
            try { await remove(snapshot.ref); } catch(e) {}
            return;
        }

        console.log("📦 Libro NUEVO recibido:", newBook.title);
        
        try {
            // Guardar Localmente
            localBooks.unshift(newBook);
            localStorage.setItem('minimal_books_v4', JSON.stringify(localBooks));
            
            alert(`✅ ¡Libro Completado!\n"${newBook.title}" añadido.`);
            if (window.renderBookList) window.renderBookList();

            // Backup Drive
            saveFileToDrive('book', newBook.title, newBook).then(driveId => {
                if (driveId) {
                    const updated = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
                    const t = updated.find(b => b.id === newBook.id);
                    if (t) { 
                        t.driveFileId = driveId; 
                        localStorage.setItem('minimal_books_v4', JSON.stringify(updated)); 
                    }
                }
            }).catch(e => console.warn("Backup Drive Error:", e));

            // 2. LIMPIEZA DEL SERVIDOR
            try {
                await remove(snapshot.ref);
                console.log("🗑️ Libro eliminado del servidor (Limpieza).");
            } catch (e) { console.error("Error limpiando Firebase:", e); }

        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.warn("⚠️ LocalStorage lleno. Activando protocolo 'Cloud-First'.");
                
                try {
                    const driveId = await saveFileToDrive('book', newBook.title, newBook);
                    
                    if (driveId) {
                        const placeholder = {
                            id: newBook.id,
                            title: newBook.title,
                            isAI: true,
                            driveFileId: driveId,
                            isPlaceholder: true,
                            chapters: [],
                            timestamp: Date.now()
                        };

                        localBooks[0] = placeholder;
                        localStorage.setItem('minimal_books_v4', JSON.stringify(localBooks));
                        
                        alert(`⚠️ Memoria llena.\n"${newBook.title}" guardado en NUBE ☁️.`);
                        if (window.renderBookList) window.renderBookList();
                        
                        // Si está seguro en drive, borrar de firebase
                        await remove(snapshot.ref);

                    } else {
                        throw new Error("No Drive ID.");
                    }
                } catch (criticalError) {
                    alert(`❌ ERROR CRÍTICO DE ESPACIO.\nLibro mantenido en servidor.`);
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

function refreshScriptSelector() {
    if (!scriptSelector) return;
    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    scriptSelector.innerHTML = '<option value="">-- Selecciona un Guion Base --</option>';
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
        const canProceed = await checkUsageLimit('book');
        if (!canProceed) return; 

        const user = auth.currentUser;
        if (!user) return alert("Inicia sesión.");

        const scriptId = scriptSelector.value;
        if (!scriptId) return alert("Selecciona un guion.");
        const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
        const sourceScript = scripts.find(s => s.id == scriptId);
        if (!sourceScript) return alert("Error guion.");

        // 1. Feedback visual inicial
        if (btnGenLibro) {
            btnGenLibro.disabled = true;
            btnGenLibro.innerText = "Preparando...";
        }

        // Lazy Load Logic
        if (sourceScript.isPlaceholder) {
            try {
                if (!sourceScript.driveFileId) throw new Error("Sin ID Drive.");
                const fullData = await loadFileContent(sourceScript.driveFileId);
                if (!fullData) throw new Error("Vacío.");
                Object.assign(sourceScript, fullData);
                delete sourceScript.isPlaceholder;
                localStorage.setItem('minimal_scripts_v1', JSON.stringify(scripts));
                refreshScriptSelector();
                scriptSelector.value = scriptId; 
            } catch (e) {
                console.error(e);
                throw new Error("Error descarga: " + e.message);
            }
        }

        const rawScenes = sourceScript.scenes || [];
        const nuance = nuanceInput ? nuanceInput.value.trim() : "Estándar";
        const paragraphsPerChapter = paragraphsInput ? parseInt(paragraphsInput.value) : 15;
        
        if (btnGenLibro) btnGenLibro.innerText = "Enviando...";

        const cleanScenes = rawScenes.map(s => ({
            title: s.title || "Sin Título",
            paragraphs: (s.paragraphs || []).map(p => ({ text: p.text || "" }))
        }));

        // 2. Enviar Job
        const newJobRef = push(ref(db, 'queue/books'));
        await set(newJobRef, {
            userId: user.uid,
            sourceTitle: sourceScript.title, 
            scenes: cleanScenes, 
            styleNuance: nuance,
            paragraphsPerChapter: paragraphsPerChapter,
            status: "pending",
            createdAt: Date.now()
        });

        registerUsage('book');

        console.log("🚀 Job Libro enviado. Limpiando UI.");
        
        // 3. Limpieza y Restauración
        if (nuanceInput) nuanceInput.value = "";
        
        if (btnGenLibro) {
            btnGenLibro.disabled = false;
            btnGenLibro.innerText = "Generar Libro";
        }

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
        if (btnGenLibro) {
            btnGenLibro.disabled = false;
            btnGenLibro.innerText = "Generar Libro";
        }
    }
}

if (btnGenLibro) {
    btnGenLibro.onclick = null; 
    btnGenLibro.addEventListener('click', generateBookFromText);
}
document.addEventListener('DOMContentLoaded', refreshScriptSelector);
window.refreshScriptSelector = refreshScriptSelector;
window.generateBookFromText = generateBookFromText;