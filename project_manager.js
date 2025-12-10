// --- PROJECT MANAGER v1.0 (CLOUD SYNC) ---
// Coordina la carga/guardado entre LocalStorage y Google Drive API.

import { initDriveFolder, listDriveProjects, loadProjectFile, saveProjectToDrive } from './drive_api.js';
import { currentUser } from './auth_ui.js';

console.log("Project Manager Cargado (Autosave System)");

// Claves de Sistema
const STORAGE_KEYS = [
    'minimal_universal_data',
    'minimal_books_v4',
    'minimal_scripts_v1',
    'minimal_games_v1',
    'silenos_universe_name'
];
const SESSION_FILE_ID_KEY = 'silenos_active_drive_id';
const SESSION_FILE_NAME_KEY = 'silenos_active_project_name';

// Estado
let isDirty = false;
let autosaveTimer = null;
let lastSnapshot = ""; // Para detectar cambios reales

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Restaurar estado de sesión si venimos de un reload
    const activeId = sessionStorage.getItem(SESSION_FILE_ID_KEY);
    const activeName = sessionStorage.getItem(SESSION_FILE_NAME_KEY);

    if (activeId && activeName) {
        console.log(`Proyecto Activo: ${activeName} (${activeId})`);
        updateProjectUI(activeName, "Nube");
        startAutosaveSystem();
    } else {
        console.log("Modo: Local / Offline");
        updateProjectUI("Proyecto Local", "Local");
    }

    // Engancharse a eventos de UI (Exponer funciones globales)
    window.openDriveSelector = openDriveSelector;
    window.saveToDriveManual = saveToDriveManual;
    window.createNewCloudProject = createNewCloudProject;
});

// --- UI: SELECTOR DE PROYECTOS ---
async function openDriveSelector() {
    if (!currentUser) return alert("Debes iniciar sesión primero.");
    
    // Crear Modal dinámicamente si no existe
    let modal = document.getElementById('drive-modal');
    if (!modal) {
        createDriveModal();
        modal = document.getElementById('drive-modal');
    }

    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Buscando en Drive...</div>';
    
    modal.classList.add('active'); // Mostrar modal
    modal.style.display = 'flex';

    // 1. Inicializar carpeta (por si no existe)
    const folderId = await initDriveFolder();
    if (!folderId) {
        listContainer.innerHTML = '<div style="color:red; padding:20px;">Error conectando con Drive.</div>';
        return;
    }

    // 2. Listar archivos
    const files = await listDriveProjects(folderId);
    
    renderFileList(files, listContainer);
}

function renderFileList(files, container) {
    container.innerHTML = '';
    
    if (files.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#888;">
                No hay proyectos en la carpeta 'Silenos_Projects'.<br>
                <button class="io-btn action" onclick="window.createNewCloudProject()" style="margin-top:15px;">Crear el Primero</button>
            </div>`;
        return;
    }

    // Botón crear nuevo siempre visible
    const newBtn = document.createElement('div');
    newBtn.className = 'drive-file-item new-project';
    newBtn.innerHTML = `<span>+ Crear Nuevo Proyecto Vacío</span>`;
    newBtn.onclick = createNewCloudProject;
    container.appendChild(newBtn);

    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'drive-file-item';
        div.innerHTML = `
            <span class="drive-name">${file.name.replace('.json','')}</span>
            <span class="drive-date">${new Date(file.modifiedTime).toLocaleDateString()}</span>
        `;
        div.onclick = () => loadCloudProject(file.id, file.name);
        container.appendChild(div);
    });
}

function closeDriveModal() {
    const modal = document.getElementById('drive-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}
window.closeDriveModal = closeDriveModal;

// --- LÓGICA DE CARGA (DESCARGA -> LOCALSTORAGE -> RELOAD) ---
async function loadCloudProject(fileId, fileName) {
    if(!confirm(`¿Cargar "${fileName}"? Esto sobrescribirá los datos locales actuales.`)) return;

    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Descargando...</div>';

    const projectData = await loadProjectFile(fileId);
    
    if (!projectData) {
        alert("Error al descargar el archivo.");
        closeDriveModal();
        return;
    }

    // 1. Limpieza Total
    localStorage.clear();

    // 2. Inyección de Datos (Mapping inverso del backup)
    if (projectData.universalData) localStorage.setItem('minimal_universal_data', JSON.stringify(projectData.universalData));
    if (projectData.books) localStorage.setItem('minimal_books_v4', JSON.stringify(projectData.books));
    if (projectData.scripts) localStorage.setItem('minimal_scripts_v1', JSON.stringify(projectData.scripts));
    if (projectData.games) localStorage.setItem('minimal_games_v1', JSON.stringify(projectData.games));
    if (projectData.universeName) localStorage.setItem('silenos_universe_name', projectData.universeName);

    // 3. Establecer Sesión Activa
    sessionStorage.setItem(SESSION_FILE_ID_KEY, fileId);
    sessionStorage.setItem(SESSION_FILE_NAME_KEY, fileName.replace('.json',''));

    // 4. Recarga Táctica
    alert("Proyecto cargado. Recargando entorno...");
    location.reload();
}

// --- LÓGICA DE GUARDADO ---
function gatherProjectData() {
    return {
        version: "3.0",
        timestamp: new Date().toISOString(),
        universeName: localStorage.getItem('silenos_universe_name') || 'Proyecto Sin Nombre',
        universalData: JSON.parse(localStorage.getItem('minimal_universal_data')) || [],
        books: JSON.parse(localStorage.getItem('minimal_books_v4')) || [],
        scripts: JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [],
        games: JSON.parse(localStorage.getItem('minimal_games_v1')) || []
    };
}

async function saveToDriveManual() {
    const fileId = sessionStorage.getItem(SESSION_FILE_ID_KEY);
    if (!fileId) return alert("No estás trabajando en un proyecto de la nube. Usa 'Crear Nuevo' o 'Abrir'.");

    const data = gatherProjectData();
    const currentName = sessionStorage.getItem(SESSION_FILE_NAME_KEY);
    const folderId = await initDriveFolder(); // Aseguramos folder

    // Feedback Visual
    const dockName = document.getElementById('current-project-name');
    if(dockName) dockName.textContent = "Guardando...";

    try {
        await saveProjectToDrive(folderId, currentName, data, fileId);
        
        // Actualizar Snapshot para el autosave
        lastSnapshot = JSON.stringify(data);
        if(dockName) dockName.textContent = currentName;
        alert("¡Guardado en Drive correctamente!");
    } catch (e) {
        alert("Error al guardar: " + e.message);
        if(dockName) dockName.textContent = currentName + " (Error)";
    }
}

async function createNewCloudProject() {
    const name = prompt("Nombre del nuevo proyecto:");
    if (!name) return;

    // 1. Preparar datos actuales (o vacíos si limpiamos antes, pero mejor guardar lo que hay en pantalla)
    // Opción: Empezar de cero real
    localStorage.clear();
    localStorage.setItem('silenos_universe_name', name);
    
    // Guardamos estado inicial vacío
    const emptyData = gatherProjectData();
    
    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = 'Creando...';

    const folderId = await initDriveFolder();
    const newId = await saveProjectToDrive(folderId, name, emptyData, null);

    if (newId) {
        sessionStorage.setItem(SESSION_FILE_ID_KEY, newId);
        sessionStorage.setItem(SESSION_FILE_NAME_KEY, name);
        location.reload();
    }
}

// --- SISTEMA AUTOSAVE (OBSERVADOR) ---
function startAutosaveSystem() {
    // Tomar foto inicial
    lastSnapshot = JSON.stringify(gatherProjectData());

    // Chequeo cada 10 segundos (menos agresivo que 5s para ahorrar API calls)
    autosaveTimer = setInterval(async () => {
        const currentData = gatherProjectData();
        const currentString = JSON.stringify(currentData);

        if (currentString !== lastSnapshot) {
            console.log("Autosave: Cambios detectados. Subiendo...");
            
            const fileId = sessionStorage.getItem(SESSION_FILE_ID_KEY);
            const fileName = sessionStorage.getItem(SESSION_FILE_NAME_KEY);
            const folderId = await initDriveFolder();

            // Feedback discreto
            const dockName = document.getElementById('current-project-name');
            if(dockName) dockName.innerHTML = `${fileName} <span style="font-size:0.7em; opacity:0.7">☁️</span>`;

            try {
                await saveProjectToDrive(folderId, fileName, currentData, fileId);
                lastSnapshot = currentString; // Actualizar foto
                
                if(dockName) dockName.textContent = fileName;
                console.log("Autosave: Éxito.");
            } catch (e) {
                console.warn("Autosave: Falló", e);
                if(dockName) dockName.textContent = `${fileName} (!)` ;
            }
        }
    }, 10000); // 10 segundos
}

// --- UTILIDADES UI ---
function createDriveModal() {
    const div = document.createElement('div');
    div.id = 'drive-modal';
    div.className = 'modal-overlay';
    div.innerHTML = `
        <div class="modal-content glass-container" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Proyectos en Drive</h3>
                <button class="btn-icon" onclick="window.closeDriveModal()">×</button>
            </div>
            <div class="modal-body">
                <div id="drive-file-list" class="drive-list-container">
                    </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function updateProjectUI(name, type) {
    // Intentamos actualizar el texto del menú si ya está renderizado
    // Si no, AuthUI lo hará al renderizar el usuario
    const el = document.getElementById('current-project-name');
    if (el) el.textContent = name;
}