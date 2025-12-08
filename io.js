// --- LÓGICA DE ENTRADA/SALIDA (IO) v3.1 (New Project) ---

console.log("Módulo IO Cargado (v3.1 - Universo)");

const ioFileInput = document.getElementById('io-file-input');
const exportModal = document.getElementById('export-modal');
const newProjectModal = document.getElementById('new-project-modal');
const formatRadios = document.getElementsByName('export-format');

// Helper para formato fecha: YYYY-MM-DD_HH-mm
function getFormattedDate() {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

// Helper para limpiar nombre archivo
function sanitizeFilename(name) {
    if (!name) return 'proyecto';
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// --- 1. GUARDAR PROYECTO (BACKUP JSON COMPLETO) ---
function saveProjectBackup() {
    // Recuperar nombre del universo para el archivo
    const universeName = localStorage.getItem('silenos_universe_name') || 'sin_titulo';
    const filename = `${sanitizeFilename(universeName)}_${getFormattedDate()}.json`;

    const backupData = {
        version: "2.0", // Subimos versión por estructura de universo
        timestamp: new Date().toISOString(),
        universeName: universeName, // Guardamos el nombre explícitamente
        universalData: JSON.parse(localStorage.getItem('minimal_universal_data')) || [],
        books: JSON.parse(localStorage.getItem('minimal_books_v4')) || [],
        scripts: JSON.parse(localStorage.getItem('minimal_scripts_v1')) || []
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    downloadFile(dataStr, filename, 'application/json');
}

// --- 2. CARGAR PROYECTO (RESTORE JSON) ---
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
                
                // Verificación básica
                if (data.books || data.scripts || data.universalData) {
                    if(confirm("Esto sobrescribirá TODO: Universo, libros y guiones. ¿Proceder?")) {
                        
                        // 1. Restaurar Libros
                        if(data.books) localStorage.setItem('minimal_books_v4', JSON.stringify(data.books));
                        
                        // 2. Restaurar Guiones
                        if(data.scripts) localStorage.setItem('minimal_scripts_v1', JSON.stringify(data.scripts));
                        
                        // 3. Restaurar Universo (Datos)
                        if(data.universalData) localStorage.setItem('minimal_universal_data', JSON.stringify(data.universalData));

                        // 4. Restaurar Nombre del Universo
                        if(data.universeName) localStorage.setItem('silenos_universe_name', data.universeName);
                        
                        alert("Proyecto cargado correctamente.");
                        location.reload(); // Recarga para refrescar todas las UIs
                    }
                } else {
                    alert("El archivo no es un backup válido de Silenos.");
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

// --- 3. NUEVO PROYECTO (LIMPIEZA) ---

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
        // Lanzar descarga
        saveProjectBackup();
        
        // Dar un pequeño tiempo de gracia para que el navegador inicie la descarga
        // antes de recargar la página (lo cual cancelaría scripts pendientes).
        setTimeout(() => {
            wipeAndReload();
        }, 1500); 
    } else {
        wipeAndReload();
    }
}

function wipeAndReload() {
    // Borrar claves específicas de contenido, manteniendo configuraciones (como API Key si la hubiera aparte)
    localStorage.removeItem('minimal_universal_data');
    localStorage.removeItem('minimal_books_v4');
    localStorage.removeItem('minimal_scripts_v1');
    localStorage.removeItem('silenos_universe_name');
    
    // Recargar para reiniciar la interfaz
    location.reload();
}

// --- 4. EXPORTACIÓN (MODAL) ---

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

    if (books.length === 0 && scripts.length === 0) {
        container.innerHTML = '<p class="empty-msg">Nada para exportar.</p>';
        return;
    }

    if (books.length > 0) {
        const h4 = document.createElement('h4');
        h4.textContent = 'Libros';
        h4.className = 'export-section-title';
        container.appendChild(h4);
        books.forEach(book => {
            const label = document.createElement('label');
            label.className = 'export-item-row';
            label.innerHTML = `<input type="checkbox" class="export-check-book" value="${book.id}"> <span class="truncate">${book.title || 'Sin Título'}</span>`;
            container.appendChild(label);
        });
    }

    if (scripts.length > 0) {
        const h4 = document.createElement('h4');
        h4.textContent = 'Guiones';
        h4.className = 'export-section-title';
        container.appendChild(h4);
        scripts.forEach(script => {
            const label = document.createElement('label');
            label.className = 'export-item-row';
            label.innerHTML = `<input type="checkbox" class="export-check-script" value="${script.id}"> <span class="truncate">${script.title || 'Sin Título'}</span>`;
            container.appendChild(label);
        });
    }
}

function executeExport() {
    const selectedBookChecks = document.querySelectorAll('.export-check-book:checked');
    const selectedScriptChecks = document.querySelectorAll('.export-check-script:checked');

    if (selectedBookChecks.length === 0 && selectedScriptChecks.length === 0) return alert("Selecciona algo.");

    const selectedBookIds = Array.from(selectedBookChecks).map(cb => parseInt(cb.value));
    const selectedScriptIds = Array.from(selectedScriptChecks).map(cb => parseInt(cb.value));

    let format = 'html';
    for (const radio of formatRadios) if (radio.checked) format = radio.value;

    let contentToExport = "";
    const allBooks = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
    const allScripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];

    allBooks.filter(b => selectedBookIds.includes(b.id)).forEach(b => contentToExport += formatContent(b, 'book', format));
    allScripts.filter(s => selectedScriptIds.includes(s.id)).forEach(s => contentToExport += formatContent(s, 'script', format));

    let finalOutput = contentToExport;
    let mime = 'text/html';
    let ext = 'html';

    if (format === 'txt') {
        mime = 'text/plain'; ext = 'txt';
    } else if (format === 'doc') {
        finalOutput = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"></head><body>${contentToExport}</body></html>`;
        mime = 'application/msword'; ext = 'doc';
    } else {
        // HTML wrapper
        finalOutput = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;max-width:800px;margin:20px auto;padding:20px;line-height:1.6;}</style></head><body>${contentToExport}</body></html>`;
    }

    downloadFile(finalOutput, `export_seleccion.${ext}`, mime);
    closeExportModal();
}

// Utils
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

// Exportar global
window.saveProjectBackup = saveProjectBackup;
window.triggerLoadProject = triggerLoadProject;
window.openExportModal = openExportModal;
window.closeExportModal = closeExportModal;
window.executeExport = executeExport;

// Nuevas exportaciones
window.openNewProjectModal = openNewProjectModal;
window.closeNewProjectModal = closeNewProjectModal;
window.createNewProject = createNewProject;