// --- PROJECT MANAGER v2.1 (UX FIX) ---
// Coordina la carga/guardado entre LocalStorage y Google Drive API.
// MEJORA: Flujo de confirmación con botones (Confirm) en lugar de texto (Prompt).

import { initDriveFolder, listDriveProjects, loadProjectFile, saveProjectToDrive } from './drive_api.js';
import { currentUser } from './auth_ui.js';

console.log("Project Manager Cargado (v2.1 - UX Improved)");

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
let autosaveTimer = null;
let lastSnapshot = ""; 

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
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

    window.openDriveSelector = openDriveSelector;
    window.saveToDriveManual = saveToDriveManual;
    window.createNewCloudProject = createNewCloudProject;
});

// --- HELPER: VERIFICAR DUPLICADOS ---
async function checkIfFileExists(folderId, nameToCheck) {
    const files = await listDriveProjects(folderId);
    const cleanName = nameToCheck.trim().toLowerCase();
    const existing = files.find(f => {
        const fName = f.name.replace('.json', '').trim().toLowerCase();
        return fName === cleanName;
    });
    return existing ? existing : null;
}

// --- UI: SELECTOR DE PROYECTOS ---
async function openDriveSelector() {
    if (!currentUser) return alert("Debes iniciar sesión primero.");
    
    let modal = document.getElementById('drive-modal');
    if (!modal) {
        createDriveModal();
        modal = document.getElementById('drive-modal');
    }

    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Conectando con Drive...</div>';
    
    modal.classList.add('active'); 
    modal.style.display = 'flex';

    const folderId = await initDriveFolder();
    if (!folderId) {
        listContainer.innerHTML = '<div style="color:red; padding:20px;">Error conectando con Drive.</div>';
        return;
    }

    const files = await listDriveProjects(folderId);
    renderFileList(files, listContainer);
}

function renderFileList(files, container) {
    container.innerHTML = '';
    
    const newBtn = document.createElement('div');
    newBtn.className = 'drive-file-item new-project';
    newBtn.innerHTML = `<span>+ Crear Nuevo Proyecto Vacío</span>`;
    newBtn.onclick = createNewCloudProject;
    container.appendChild(newBtn);

    if (files.length === 0) {
        const msg = document.createElement('div');
        msg.style.textAlign = 'center'; msg.style.padding = '20px'; msg.style.color = '#888';
        msg.innerText = "Carpeta vacía.";
        container.appendChild(msg);
        return;
    }

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

// --- CARGA DE PROYECTO ---
async function loadCloudProject(fileId, fileName) {
    if(!confirm(`¿Cargar "${fileName}"?\n\nSe reemplazarán los datos actuales de la pantalla.`)) return;

    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Descargando...</div>';

    const projectData = await loadProjectFile(fileId);
    
    if (!projectData) {
        alert("Error al descargar.");
        closeDriveModal();
        return;
    }

    localStorage.clear();

    if (projectData.universalData) localStorage.setItem('minimal_universal_data', JSON.stringify(projectData.universalData));
    if (projectData.books) localStorage.setItem('minimal_books_v4', JSON.stringify(projectData.books));
    if (projectData.scripts) localStorage.setItem('minimal_scripts_v1', JSON.stringify(projectData.scripts));
    if (projectData.games) localStorage.setItem('minimal_games_v1', JSON.stringify(projectData.games));
    
    const cleanName = fileName.replace('.json','');
    localStorage.setItem('silenos_universe_name', projectData.universeName || cleanName);

    sessionStorage.setItem(SESSION_FILE_ID_KEY, fileId);
    sessionStorage.setItem(SESSION_FILE_NAME_KEY, cleanName);

    alert("Proyecto cargado. Recargando...");
    location.reload();
}

// --- DATOS ---
function gatherProjectData() {
    return {
        version: "3.1",
        timestamp: new Date().toISOString(),
        universeName: localStorage.getItem('silenos_universe_name') || 'Proyecto Sin Nombre',
        universalData: JSON.parse(localStorage.getItem('minimal_universal_data')) || [],
        books: JSON.parse(localStorage.getItem('minimal_books_v4')) || [],
        scripts: JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [],
        games: JSON.parse(localStorage.getItem('minimal_games_v1')) || []
    };
}

// --- GUARDADO MANUAL (LÓGICA CORREGIDA) ---
async function saveToDriveManual() {
    const sessionFileId = sessionStorage.getItem(SESSION_FILE_ID_KEY);
    
    // Si no hay sesión, es local puro. Forzamos subida.
    if (!sessionFileId) {
        alert("Proyecto local detectado. Se subirá a la nube.");
        return createNewCloudProjectFromCurrent();
    }

    const currentLocalName = (localStorage.getItem('silenos_universe_name') || 'Sin Nombre').trim();
    const sessionCloudName = (sessionStorage.getItem(SESSION_FILE_NAME_KEY) || '').trim();
    const folderId = await initDriveFolder();

    // --- DETECCIÓN DE CAMBIO DE NOMBRE (SIN PROMPTS CONFUSOS) ---
    if (currentLocalName !== sessionCloudName) {
        
        // 1. Preguntar si quiere crear NUEVO ARCHIVO
        const wantNewFile = confirm(
            `DETECTADO CAMBIO DE NOMBRE:\n` +
            `Original: "${sessionCloudName}" -> Nuevo: "${currentLocalName}"\n\n` +
            `¿Quieres guardar esto como un ARCHIVO NUEVO?\n` +
            `(Aceptar = Nuevo Archivo | Cancelar = Ver opciones de renombrado)`
        );

        if (wantNewFile) {
            // CHEQUEO DE DUPLICADOS
            const duplicate = await checkIfFileExists(folderId, currentLocalName);
            if (duplicate) {
                alert(`Error: Ya existe un archivo llamado "${currentLocalName}". Cambia el nombre antes de guardar.`);
                return;
            }

            const newId = await performSave(folderId, currentLocalName, null, "Creando copia nueva...");
            if (newId) {
                sessionStorage.setItem(SESSION_FILE_ID_KEY, newId);
                sessionStorage.setItem(SESSION_FILE_NAME_KEY, currentLocalName);
                alert(`¡Guardado como NUEVO proyecto: "${currentLocalName}"!`);
            }
            return;
        }

        // 2. Si dijo CANCELAR, preguntamos si quiere RENOMBRAR el actual
        const wantRename = confirm(
            `¿Entonces quieres RENOMBRAR el archivo original en la nube?\n\n` +
            `El archivo "${sessionCloudName}" pasará a llamarse "${currentLocalName}" y se sobrescribirá.`
        );

        if (wantRename) {
            await performSave(folderId, currentLocalName, sessionFileId, "Renombrando...");
            sessionStorage.setItem(SESSION_FILE_NAME_KEY, currentLocalName);
            // alert("Archivo renombrado y guardado."); // Opcional
            return;
        }
        
        // Si cancela todo, no hacemos nada
        return;

    } else {
        // Nombre idéntico, guardado normal
        await performSave(folderId, currentLocalName, sessionFileId, "Guardando...");
    }
}

async function performSave(folderId, fileName, fileIdToUpdate, statusMessage) {
    const data = gatherProjectData();
    const dockName = document.getElementById('current-project-name');
    
    if(dockName) dockName.textContent = statusMessage;

    try {
        const savedId = await saveProjectToDrive(folderId, fileName, data, fileIdToUpdate);
        lastSnapshot = JSON.stringify(data); 
        if(dockName) dockName.textContent = fileName;
        return savedId;
    } catch (e) {
        alert("Error al guardar: " + e.message);
        if(dockName) dockName.textContent = fileName + " (Error)";
        return null;
    }
}

// --- CREAR NUEVO (VACÍO) ---
async function createNewCloudProject() {
    const folderId = await initDriveFolder();
    let name = prompt("Nombre del nuevo proyecto (Debe ser único):");
    if (!name) return;
    name = name.trim();

    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = 'Verificando nombre...';

    const duplicate = await checkIfFileExists(folderId, name);
    if (duplicate) {
        alert(`Ya existe "${name}". Elige otro nombre.`);
        openDriveSelector();
        return;
    }

    // Limpieza y creación
    localStorage.clear();
    localStorage.setItem('silenos_universe_name', name);
    const emptyData = gatherProjectData();
    
    listContainer.innerHTML = 'Creando...';

    const newId = await saveProjectToDrive(folderId, name, emptyData, null);
    if (newId) {
        sessionStorage.setItem(SESSION_FILE_ID_KEY, newId);
        sessionStorage.setItem(SESSION_FILE_NAME_KEY, name);
        alert("Proyecto creado. Entrando...");
        location.reload();
    }
}

// --- SUBIR LOCAL A NUBE ---
async function createNewCloudProjectFromCurrent() {
    const folderId = await initDriveFolder();
    const currentName = localStorage.getItem('silenos_universe_name') || 'Mi Proyecto';
    
    let name = prompt("Nombre para guardar en la nube:", currentName);
    if (!name) return;
    name = name.trim();

    const duplicate = await checkIfFileExists(folderId, name);
    if (duplicate) {
        alert(`Ya existe "${name}". Elige otro.`);
        return createNewCloudProjectFromCurrent();
    }

    const newId = await performSave(folderId, name, null, "Subiendo...");
    if (newId) {
        sessionStorage.setItem(SESSION_FILE_ID_KEY, newId);
        sessionStorage.setItem(SESSION_FILE_NAME_KEY, name);
        alert("¡Proyecto vinculado a Drive!");
        localStorage.setItem('silenos_universe_name', name);
        updateProjectUI(name, "Nube");
    }
}

// --- AUTOSAVE ---
function startAutosaveSystem() {
    lastSnapshot = JSON.stringify(gatherProjectData());
    if (autosaveTimer) clearInterval(autosaveTimer);

    autosaveTimer = setInterval(async () => {
        const fileId = sessionStorage.getItem(SESSION_FILE_ID_KEY);
        const currentLocalName = localStorage.getItem('silenos_universe_name');
        const sessionCloudName = sessionStorage.getItem(SESSION_FILE_NAME_KEY);

        // Solo autoguardar si el nombre no ha cambiado (para evitar conflictos silenciosos)
        if (!fileId || currentLocalName !== sessionCloudName) return;

        const currentData = gatherProjectData();
        const currentString = JSON.stringify(currentData);

        if (currentString !== lastSnapshot) {
            const folderId = await initDriveFolder();
            const dockName = document.getElementById('current-project-name');
            if(dockName) dockName.innerHTML = `${sessionCloudName} <span style="font-size:0.8em; opacity:0.7">↻</span>`;
            try {
                await saveProjectToDrive(folderId, sessionCloudName, currentData, fileId);
                lastSnapshot = currentString;
                if(dockName) dockName.textContent = sessionCloudName;
            } catch (e) { console.warn("Autosave fail", e); }
        }
    }, 15000);
}

// --- UTILIDADES ---
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
                <div id="drive-file-list" class="drive-list-container"></div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function updateProjectUI(name, type) {
    const el = document.getElementById('current-project-name');
    if (el) el.textContent = name;
}