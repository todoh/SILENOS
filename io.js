// SILENOS/io.js
// --- LÓGICA DE ENTRADA/SALIDA (IO) v3.5 (Quick Export Added) ---

import { generateGameExport } from './juego_export.js';
import { STORAGE_KEYS, getUniversalDataSnapshot, importDataSnapshot } from './project_core.js';

console.log("Módulo IO Cargado (v3.5 - Quick Export)");

const ioFileInput = document.getElementById('io-file-input');
const exportModal = document.getElementById('export-modal');
const newProjectModal = document.getElementById('new-project-modal');
const formatRadios = document.getElementsByName('export-format');

function getFormattedDate() {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

function sanitizeFilename(name) {
    if (!name) return 'proyecto';
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// --- 1. GUARDAR BACKUP COMPLETO (JSON RAW) ---
function saveProjectBackup() {
    const universeName = localStorage.getItem(STORAGE_KEYS.PROJECT_NAME) || 'sin_titulo';
    const filename = `${sanitizeFilename(universeName)}_${getFormattedDate()}.json`;

    const backupData = {
        version: "4.0",
        timestamp: new Date().toISOString(),
        dataSnapshot: getUniversalDataSnapshot(),
        books: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS)) || [],
        scripts: JSON.parse(localStorage.getItem(STORAGE_KEYS.SCRIPTS)) || [],
        games: JSON.parse(localStorage.getItem(STORAGE_KEYS.GAMES)) || [] 
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    downloadFile(dataStr, filename, 'application/json');
}

// --- 2. CARGAR BACKUP ---
function triggerLoadProject() {
    if(ioFileInput) ioFileInput.click();
}

if(ioFileInput) {
    ioFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                
                if (confirm("Esto sobrescribirá los datos locales con el contenido del backup. ¿Proceder?")) {
                    
                    if(data.books) localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(data.books));
                    if(data.scripts) localStorage.setItem(STORAGE_KEYS.SCRIPTS, JSON.stringify(data.scripts));
                    if(data.games) localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(data.games));
                    
                    if (data.dataSnapshot) {
                        importDataSnapshot(data.dataSnapshot);
                    } else {
                        if(data.universalData) localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(data.universalData));
                        if(data.universeName) localStorage.setItem(STORAGE_KEYS.PROJECT_NAME, data.universeName);
                    }
                    
                    if (!data.games && data.nodes) {
                         const legacyGame = [{ id: Date.now(), title: "Juego Restaurado", nodes: data.nodes }];
                         localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(legacyGame));
                    }
                    
                    alert("Proyecto restaurado correctamente.");
                    location.reload(); 
                }
            } catch (err) {
                console.error(err);
                alert("Error crítico al leer JSON.");
            }
            ioFileInput.value = ''; 
        };
        reader.readAsText(file);
    });
}

// --- 3. GESTIÓN PROYECTO ---
function openNewProjectModal() {
    if(newProjectModal) {
        newProjectModal.style.display = 'flex';
        setTimeout(() => newProjectModal.classList.add('active'), 10);
    }
}

function closeNewProjectModal() {
    if(newProjectModal) {
        newProjectModal.classList.remove('active');
        setTimeout(() => newProjectModal.style.display = 'none', 300);
    }
}

function createNewProject(withBackup) {
    if (withBackup) {
        saveProjectBackup();
        setTimeout(() => { wipeAndReload(); }, 1500); 
    } else {
        wipeAndReload();
    }
}

function wipeAndReload() {
    localStorage.clear();
    location.reload();
}

// --- 4. EXPORTACIÓN (MODAL Y RÁPIDA) ---

function openExportModal() {
    if(exportModal) {
        renderExportOptions();
        exportModal.style.display = 'flex';
        setTimeout(() => exportModal.classList.add('active'), 10);
    }
}

function closeExportModal() {
    if(exportModal) {
        exportModal.classList.remove('active');
        setTimeout(() => exportModal.style.display = 'none', 300);
    }
}

function renderExportOptions() {
    const container = document.getElementById('export-selection-container');
    if (!container) return;
    container.innerHTML = '';
    
    const books = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS)) || [];
    const scripts = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCRIPTS)) || [];
    const games = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAMES)) || [];

    if (books.length === 0 && scripts.length === 0 && games.length === 0) {
        container.innerHTML = '<p class="empty-msg">Nada para exportar.</p>';
        return;
    }

    if (books.length > 0) appendSection(container, 'Libros', books, 'book');
    if (scripts.length > 0) appendSection(container, 'Guiones', scripts, 'script');
    if (games.length > 0) appendSection(container, 'Juegos', games, 'game');
}

function appendSection(container, title, items, type) {
    const h4 = document.createElement('h4');
    h4.textContent = title;
    h4.className = 'export-section-title';
    container.appendChild(h4);
    items.forEach(item => {
        const label = document.createElement('label');
        label.className = 'export-item-row';
        label.innerHTML = `<input type="checkbox" class="export-check-${type}" value="${item.id}"> <span class="truncate">${item.title || 'Sin Título'}</span>`;
        container.appendChild(label);
    });
}

function executeExport() {
    const selectedBookChecks = document.querySelectorAll('.export-check-book:checked');
    const selectedScriptChecks = document.querySelectorAll('.export-check-script:checked');
    const selectedGameChecks = document.querySelectorAll('.export-check-game:checked');

    if (selectedBookChecks.length === 0 && selectedScriptChecks.length === 0 && selectedGameChecks.length === 0) return alert("Selecciona algo.");

    const allBooks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS)) || [];
    const allScripts = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCRIPTS)) || [];
    const allGames = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAMES)) || [];

    let format = 'html';
    for (const radio of formatRadios) if (radio.checked) format = radio.value;

    let contentToExport = "";

    Array.from(selectedBookChecks).forEach(cb => {
        const item = allBooks.find(b => b.id == cb.value);
        if(item) contentToExport += formatContent(item, 'book', format);
    });
    Array.from(selectedScriptChecks).forEach(cb => {
        const item = allScripts.find(s => s.id == cb.value);
        if(item) contentToExport += formatContent(item, 'script', format);
    });
    Array.from(selectedGameChecks).forEach(cb => {
        const item = allGames.find(g => g.id == cb.value);
        if(item) {
            const gameContent = generateGameExport(item, format);
            contentToExport += gameContent + (format === 'html' ? '' : '\n\n====================\n\n');
        }
    });

    finalizeDownload(contentToExport, `silenos_export.${format}`, format);
    closeExportModal();
}

// --- NUEVA FUNCIÓN DE EXPORTACIÓN RÁPIDA ---
function quickExport(type, id, format) {
    let item = null;
    let storageKey = '';

    if (type === 'book') storageKey = STORAGE_KEYS.BOOKS;
    else if (type === 'script') storageKey = STORAGE_KEYS.SCRIPTS;
    else if (type === 'game') storageKey = STORAGE_KEYS.GAMES;

    const list = JSON.parse(localStorage.getItem(storageKey)) || [];
    item = list.find(i => i.id === id);

    if (!item) return alert("Error: Elemento no encontrado.");
    
    // Check de Lazy Load
    if (item.isPlaceholder) {
        return alert("⚠️ Este archivo está en la nube.\nÁbrelo primero para descargar su contenido y luego intenta exportar.");
    }

    let content = "";
    if (type === 'game') {
        content = generateGameExport(item, format);
    } else {
        content = formatContent(item, type, format);
    }

    const safeTitle = sanitizeFilename(item.title || 'export');
    finalizeDownload(content, `${safeTitle}.${format}`, format);
}

// --- HELPERS DE FORMATO Y DESCARGA ---

function finalizeDownload(content, filename, format) {
    let finalOutput = content;
    let mime = 'text/plain';

    if (format === 'html') {
        mime = 'text/html';
        if (!content.trim().startsWith('<!DOCTYPE html>')) {
             finalOutput = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;max-width:800px;margin:20px auto;padding:20px;line-height:1.6;}</style></head><body>${content}</body></html>`;
        }
    } else if (format === 'doc') {
        mime = 'application/msword';
        // Envolver para que Word lo interprete mejor como HTML-Doc
        if (!content.trim().startsWith('<html')) {
            finalOutput = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"></head><body>${content}</body></html>`;
        }
    }

    downloadFile(finalOutput, filename, mime);
}

function formatContent(item, type, format) {
    const title = item.title || "Sin Título";
    if (format === 'txt') {
        let txt = `\n--- ${type.toUpperCase()}: ${title.toUpperCase()} ---\n\n`;
        if(type==='book') item.chapters.forEach(c => { txt += `[${c.title}]\n`; c.paragraphs.forEach(p=> txt+= p.text+'\n\n'); });
        if(type==='script') item.scenes.forEach(s => { txt += `[${s.title}]\n`; s.paragraphs.forEach(p=> txt+= p.text+'\n'); });
        return txt;
    } else {
        let html = `<h1>${title}</h1>`;
        if(type==='book') item.chapters.forEach(c => { html += `<h3>${c.title}</h3>`; c.paragraphs.forEach(p=> html+= `<p>${p.text}</p>`); });
        if(type==='script') item.scenes.forEach(s => { html += `<h3>${s.title}</h3>`; s.paragraphs.forEach(p=> html+= `<p>${p.text}</p>`); });
        return html + '<hr>';
    }
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

// Exportar al objeto window para onclicks
window.saveProjectBackup = saveProjectBackup;
window.triggerLoadProject = triggerLoadProject;
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.executeExport = executeExport;
window.openNewProjectModal = openNewProjectModal;
window.closeNewProjectModal = closeNewProjectModal;
window.createNewProject = createNewProject;
window.quickExport = quickExport; // <--- NUEVO