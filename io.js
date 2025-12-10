// --- LÓGICA DE ENTRADA/SALIDA (IO) v3.3 (Exportación Avanzada) ---
// Y → Confluencia (Unión de módulos de exportación)

import { generateGameExport } from './juego_export.js'; // IMPORTACIÓN DEL NUEVO MÓDULO

console.log("Módulo IO Cargado (v3.3 - Advanced Game Export)");

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

// --- 1. GUARDAR PROYECTO (JSON RAW) ---
function saveProjectBackup() {
    const universeName = localStorage.getItem('silenos_universe_name') || 'sin_titulo';
    const filename = `${sanitizeFilename(universeName)}_${getFormattedDate()}.json`;

    const backupData = {
        version: "3.0", 
        timestamp: new Date().toISOString(),
        universeName: universeName,
        universalData: JSON.parse(localStorage.getItem('minimal_universal_data')) || [],
        books: JSON.parse(localStorage.getItem('minimal_books_v4')) || [],
        scripts: JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [],
        games: JSON.parse(localStorage.getItem('minimal_games_v1')) || [] 
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    downloadFile(dataStr, filename, 'application/json');
}

// --- 2. CARGAR PROYECTO ---
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
                
                if (data.books || data.scripts || data.universalData || data.games) {
                    if(confirm("Esto sobrescribirá TODO. ¿Proceder?")) {
                        
                        if(data.books) localStorage.setItem('minimal_books_v4', JSON.stringify(data.books));
                        if(data.scripts) localStorage.setItem('minimal_scripts_v1', JSON.stringify(data.scripts));
                        if(data.universalData) localStorage.setItem('minimal_universal_data', JSON.stringify(data.universalData));
                        if(data.universeName) localStorage.setItem('silenos_universe_name', data.universeName);
                        if(data.games) localStorage.setItem('minimal_games_v1', JSON.stringify(data.games));
                        else if (data.nodes) {
                             const legacyGame = [{ id: Date.now(), title: "Juego Restaurado", nodes: data.nodes }];
                             localStorage.setItem('minimal_games_v1', JSON.stringify(legacyGame));
                        }
                        
                        alert("Proyecto cargado correctamente.");
                        location.reload(); 
                    }
                } else {
                    alert("Archivo no válido.");
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
    localStorage.clear(); // Limpieza total más agresiva
    location.reload();
}

// --- 4. EXPORTACIÓN (FORMATO LECTURA) ---
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
    
    const books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    const games = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];

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

    const allBooks = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
    const allScripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    const allGames = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];

    let format = 'html';
    for (const radio of formatRadios) if (radio.checked) format = radio.value;

    let contentToExport = "";

    // EXPORTACIÓN NORMAL PARA LIBROS Y GUIONES
    Array.from(selectedBookChecks).forEach(cb => {
        const item = allBooks.find(b => b.id == cb.value);
        if(item) contentToExport += formatContent(item, 'book', format);
    });
    Array.from(selectedScriptChecks).forEach(cb => {
        const item = allScripts.find(s => s.id == cb.value);
        if(item) contentToExport += formatContent(item, 'script', format);
    });

    // EXPORTACIÓN ESPECIAL PARA JUEGOS
    Array.from(selectedGameChecks).forEach(cb => {
        const item = allGames.find(g => g.id == cb.value);
        if(item) {
            // Aquí delegamos a la nueva lógica especializada
            const gameContent = generateGameExport(item, format);
            contentToExport += gameContent + (format === 'html' ? '' : '\n\n====================\n\n');
        }
    });

    // GENERAR ARCHIVO FINAL
    let finalOutput = contentToExport;
    let mime = 'text/html';
    let ext = 'html';

    if (format === 'txt') {
        mime = 'text/plain'; ext = 'txt';
    } else if (format === 'doc') {
        finalOutput = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"></head><body>${contentToExport}</body></html>`;
        mime = 'application/msword'; ext = 'doc';
    } else {
        // Si hay juegos HTML, generateGameExport ya devuelve el HTML completo.
        // Si mezclamos tipos (Libro + Juego) en HTML, habría conflicto de estructura.
        // ASUMIMOS: Si es HTML y hay un juego, el usuario probablemente exporta solo el juego o aceptamos concatenación simple.
        if (selectedGameChecks.length > 0 && selectedBookChecks.length === 0 && selectedScriptChecks.length === 0) {
            // Solo juegos: ya viene formateado full HTML
            finalOutput = contentToExport; 
        } else {
            // Mezcla o solo texto: Envolvemos
            finalOutput = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;max-width:800px;margin:20px auto;padding:20px;line-height:1.6;}</style></head><body>${contentToExport}</body></html>`;
        }
    }

    downloadFile(finalOutput, `silenos_export.${ext}`, mime);
    closeExportModal();
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

window.saveProjectBackup = saveProjectBackup;
window.triggerLoadProject = triggerLoadProject;
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.executeExport = executeExport;
window.openNewProjectModal = openNewProjectModal;
window.closeNewProjectModal = closeNewProjectModal;
window.createNewProject = createNewProject;