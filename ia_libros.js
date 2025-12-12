// IA: GENERACIÓN DE LIBROS (Versión Persistente - SERVER HOLD PROTOCOL)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, off, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { loadFileContent, saveFileToDrive } from './drive_api.js'; 
import { updateQueueState } from './project_ui.js';
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; 

console.log("Módulo IA Libros Cargado (v8.2 - Server Hold Protocol)");

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
const progressContainer = document.getElementById('libro-progress');

// --- MONITOR DE COLA  
function initQueueMonitor(userId) {
    const queueRef = ref(db, 'queue/books');
    onValue(queueRef, (snapshot) => {
        const myJobs = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const job = childSnapshot.val();
                
                // [FIX] Permitimos estados finales para que la UI cierre la notificación
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
        updateQueueState('book', myJobs);
    });
}

// --- FUNCIÓN CORREGIDA: RECEPCIÓN SEGURA + HOLD ---
function initResultListener(userId) {
    const resultsRef = ref(db, `users/${userId}/results/books`);
    
    onChildAdded(resultsRef, async (snapshot) => {
        const newBook = snapshot.val();
        if (!newBook) return;

        console.log("📦 Libro recibido:", newBook.title);
        const localBooks = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
        
        // Evitar duplicados
        if (!localBooks.find(b => b.id === newBook.id)) {
            
            // [SERVER HOLD]
            newBook.firebaseKey = snapshot.key;

            // 1. Intentamos añadir el libro completo al array en memoria
            localBooks.unshift(newBook);
            
            try {
                // 2. Intentamos guardar en LocalStorage
                localStorage.setItem('minimal_books_v4', JSON.stringify(localBooks));
                
                alert(`✅ ¡Libro Completado!\n"${newBook.title}" añadido.\n(Respaldo en servidor activo hasta apertura).`);
                if (window.renderBookList) window.renderBookList();

                // 3. Backup en Drive
                try {
                    const driveId = await saveFileToDrive('book', newBook.title, newBook);
                    if (driveId) {
                        const updated = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
                        const t = updated.find(b => b.id === newBook.id);
                        if (t) { 
                            t.driveFileId = driveId; 
                            localStorage.setItem('minimal_books_v4', JSON.stringify(updated)); 
                        }
                    }
                } catch (e) { 
                    console.warn("⚠️ Error backup drive:", e); 
                }

            } catch (e) {
                // --- MANEJO DE ERROR: QUOTA EXCEEDED ---
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
                            
                            // [EXCEPCIÓN] Si está en Drive, podemos borrar del server para liberar
                            try { await remove(snapshot.ref); console.log("🗑️ Borrado por Full Disk (Drive OK)."); } catch (e) {}

                        } else {
                            throw new Error("No Drive ID.");
                        }
                    } catch (criticalError) {
                        alert(`❌ ERROR CRÍTICO DE ESPACIO.\nLibro mantenido en servidor.`);
                    }
                }
            }
        }
        // [IMPORTANTE]: NO BORRAMOS DEL SERVIDOR AQUÍ.

        if (btnGenLibro) btnGenLibro.disabled = false;
        showProgress(false);
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

        if (btnGenLibro) {
            btnGenLibro.disabled = true;
            btnGenLibro.innerText = "Verificando...";
        }
        showProgress(true);

        // Lazy Load Logic
        if (sourceScript.isPlaceholder) {
            updateProgress(5, "☁️ Descargando guion base...");
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
        updateProgress(10, "Enviando...");

        const cleanScenes = rawScenes.map(s => ({
            title: s.title || "Sin Título",
            paragraphs: (s.paragraphs || []).map(p => ({ text: p.text || "" }))
        }));

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

        console.log("🚀 Job Libro enviado.");
        updateProgress(15, "En cola...");

        onValue(newJobRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            if (data.msg) updateProgress(data.progress || 20, data.msg);
            if (data.status === "completed") {
                updateProgress(99, "Listo.");
                off(newJobRef); 
            } 
            else if (data.status === "error") {
                alert("Error: " + data.msg);
                off(newJobRef);
                showProgress(false);
                if (btnGenLibro) btnGenLibro.disabled = false;
            }
        });

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
        showProgress(false);
        if (btnGenLibro) btnGenLibro.disabled = false;
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

if (btnGenLibro) {
    btnGenLibro.onclick = null; 
    btnGenLibro.addEventListener('click', generateBookFromText);
}
document.addEventListener('DOMContentLoaded', refreshScriptSelector);
window.refreshScriptSelector = refreshScriptSelector;
window.generateBookFromText = generateBookFromText;