// --- LÓGICA DE ENTRADA/SALIDA (IO) v3.2 (Game Projects Support) ---

console.log("Módulo IO Cargado (v3.2 - Universo Completo)");

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

// --- 1. GUARDAR PROYECTO ---
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
        // AHORA GUARDAMOS LISTA DE JUEGOS
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
                        
                        // RESTAURAR JUEGOS
                        if(data.games) {
                            localStorage.setItem('minimal_games_v1', JSON.stringify(data.games));
                        } else if (data.nodes) {
                             // Soporte retrocompatibilidad backup antiguo
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

// --- 3. NUEVO PROYECTO ---
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
    localStorage.removeItem('minimal_universal_data');
    localStorage.removeItem('minimal_books_v4');
    localStorage.removeItem('minimal_scripts_v1');
    localStorage.removeItem('minimal_games_v1'); // Limpiar juegos
    localStorage.removeItem('silenos_universe_name');
    location.reload();
}

// --- 4. EXPORTACIÓN ---
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

    if (books.length > 0) {
        appendSection(container, 'Libros', books, 'book');
    }
    if (scripts.length > 0) {
        appendSection(container, 'Guiones', scripts, 'script');
    }
    if (games.length > 0) {
        appendSection(container, 'Juegos (Solo Texto)', games, 'game');
    }
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
        if(item) contentToExport += formatContent(item, 'game', format);
    });

    let finalOutput = contentToExport;
    let mime = 'text/html';
    let ext = 'html';

    if (format === 'txt') {
        mime = 'text/plain'; ext = 'txt';
    } else if (format === 'doc') {
        finalOutput = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"></head><body>${contentToExport}</body></html>`;
        mime = 'application/msword'; ext = 'doc';
    } else {
        finalOutput = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;max-width:800px;margin:20px auto;padding:20px;line-height:1.6;}</style></head><body>${contentToExport}</body></html>`;
    }

    downloadFile(finalOutput, `export_seleccion.${ext}`, mime);
    closeExportModal();
}

function formatContent(item, type, format) {
    const title = item.title || "Sin Título";
    if (format === 'txt') {
        let txt = `\n--- ${type.toUpperCase()}: ${title.toUpperCase()} ---\n\n`;
        if(type==='book') item.chapters.forEach(c => { txt += `[${c.title}]\n`; c.paragraphs.forEach(p=> txt+= p.text+'\n\n'); });
        if(type==='script') item.scenes.forEach(s => { txt += `[${s.title}]\n`; s.paragraphs.forEach(p=> txt+= p.text+'\n'); });
        if(type==='game') {
             // Exportación lineal básica de juego
             (item.nodes || []).forEach(n => {
                 txt += `[${n.title}] (ID: ${n.id})\n${n.text}\n`;
                 n.choices.forEach(c => txt += `  -> ${c.text} (Ir a: ${c.targetId})\n`);
                 txt += '\n';
             });
        }
        return txt;
    } else {
        let html = `<h1>${title}</h1>`;
        if(type==='book') item.chapters.forEach(c => { html += `<h3>${c.title}</h3>`; c.paragraphs.forEach(p=> html+= `<p>${p.text}</p>`); });
        if(type==='script') item.scenes.forEach(s => { html += `<h3>${s.title}</h3>`; s.paragraphs.forEach(p=> html+= `<p>${p.text}</p>`); });
        if(type==='game') {
             (item.nodes || []).forEach(n => {
                 html += `<h3>${n.title} <small>#${n.id}</small></h3><p>${n.text}</p><ul>`;
                 n.choices.forEach(c => html += `<li>${c.text} (Ir a #${c.targetId})</li>`);
                 html += '</ul><hr>';
             });
        }
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