// IA: GENERACIÓN DE LIBROS - PROTOCOLO DB HOLD
// El libro permanece en la base de datos hasta confirmación explícita.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { loadFileContent, saveFileToDrive } from './drive_api.js'; 
import { updateQueueState } from './project_ui.js';
import { showResultNotification } from './notification_ui.js'; // Import
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; 
import { getDriveToken } from './auth_ui.js';

console.log("Módulo IA Libros Cargado (v9.5 - DB Hold Protocol)");

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

// --- RECEPCIÓN SEGURA (HOLD) ---
function initResultListener(userId) {
    const resultsRef = ref(db, `users/${userId}/results/books`);
    
    onChildAdded(resultsRef, (snapshot) => {
        const newBook = snapshot.val();
        if (!newBook) return;

        // 1. Limpieza silenciosa de duplicados YA seguros
        const localBooks = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
        const exists = localBooks.find(b => b.id === newBook.id);
        if (exists && exists.driveFileId) {
            remove(snapshot.ref).catch(e=>{});
            return;
        }

        console.log("📥 Libro en DB. Esperando confirmación usuario:", newBook.title);

        // 2. Notificación Interactiva
        showResultNotification(newBook.title, 'book', async () => {
            try {
                return await processBookSave(newBook, snapshot.ref);
            } catch (e) {
                console.error("Error guardando libro:", e);
                alert("Error al procesar: " + e.message + "\n\nEl libro sigue en el servidor.");
                return false;
            }
        });
    });
}

async function processBookSave(bookData, dbRef) {
    // A. GUARDAR LOCAL
    const localBooks = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
    const index = localBooks.findIndex(b => b.id === bookData.id);
    if (index !== -1) localBooks[index] = bookData;
    else localBooks.unshift(bookData);

    try {
        localStorage.setItem('minimal_books_v4', JSON.stringify(localBooks));
    } catch (e) {
        console.warn("Storage lleno, intentando nube directa.");
    }

    // B. GUARDAR DRIVE
    const token = getDriveToken();
    if (token) {
        try {
            const driveId = await saveFileToDrive('book', bookData.title, bookData);
            if (driveId) {
                bookData.driveFileId = driveId;
                const updated = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
                const t = updated.find(b => b.id === bookData.id);
                if (t) { 
                    t.driveFileId = driveId; 
                    localStorage.setItem('minimal_books_v4', JSON.stringify(updated)); 
                }
            }
        } catch (driveErr) {
            console.error("Drive Error:", driveErr);
            if (!confirm("Fallo al subir a Drive. ¿Borrar del servidor de todos modos?")) return false;
        }
    } else {
        alert("Guardado local (Sin Drive).");
    }

    // C. BORRAR SERVER
    await remove(dbRef);
    console.log("✅ Libro guardado y limpiado del servidor.");
    
    if (window.renderBookList) window.renderBookList();
    return true;
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
            btnGenLibro.innerText = "Preparando...";
        }

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