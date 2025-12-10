// --- PROJECT MANAGER v4.0 (Orquestador) ---
// Y → Confluencia (Importación y Mezcla)

import { initDriveFolder, listDriveProjects, loadProjectFile, saveProjectToDrive } from './drive_api.js';
import { currentUser } from './auth_ui.js';
import { getProjectSnapshot, startAutosaveSystem, SESSION_FILE_ID_KEY, SESSION_FILE_NAME_KEY } from './project_core.js';
import { 
    createGlobalDialogUI, createDriveModal, createImportModal, 
    silenosAlert, silenosConfirm, silenosPrompt, showDialog, 
    updateProjectUI, renderImportTree 
} from './project_ui.js';

console.log("Project Manager Cargado (v4.0 - Modular)");

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar UI
    createGlobalDialogUI();
    createDriveModal();
    createImportModal();

    // Comprobar sesión activa
    const activeId = sessionStorage.getItem(SESSION_FILE_ID_KEY);
    const activeName = sessionStorage.getItem(SESSION_FILE_NAME_KEY);

    if (activeId && activeName) {
        console.log(`Proyecto Activo: ${activeName} (${activeId})`);
        updateProjectUI(activeName, "Nube");
        startAutosaveSystem();
    } else {
        updateProjectUI("Proyecto Local", "Local");
    }

    // Exportar funciones globales
    window.openDriveSelector = openDriveSelector;
    window.saveToDriveManual = saveToDriveManual;
    window.createNewCloudProject = createNewCloudProject;
    window.closeDriveModal = closeDriveModal;
    window.openImportModal = openImportModal;
    window.closeImportModal = closeImportModal;
    window.executeImport = executeImport;
});

// --- GESTIÓN DE IMPORTACIÓN ---

async function openImportModal() {
    if (!currentUser) return silenosAlert("Debes iniciar sesión para importar desde Drive.");

    const modal = document.getElementById('import-modal');
    modal.classList.add('active');
    modal.style.display = 'flex';

    const container = document.getElementById('import-tree-container');
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">Conectando con Drive...</div>';

    const folderId = await initDriveFolder();
    if (!folderId) {
        container.innerHTML = '<div style="color:var(--danger); padding:20px;">Error de conexión.</div>';
        return;
    }

    const files = await listDriveProjects(folderId);
    renderImportTree(files, container);
}

function closeImportModal() {
    const modal = document.getElementById('import-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

async function executeImport() {
    const selectedChecks = document.querySelectorAll('.data-check:checked');
    if (selectedChecks.length === 0) return silenosAlert("No has seleccionado ningún dato.");

    let importedCount = 0;
    let currentData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    const existingIds = new Set(currentData.map(d => d.id));

    selectedChecks.forEach(chk => {
        const jsonStr = chk.parentElement.parentElement.querySelector('.data-json').value;
        try {
            const newItem = JSON.parse(jsonStr);
            if (existingIds.has(newItem.id)) {
                newItem.id = Date.now() + Math.floor(Math.random() * 1000);
                newItem.title = newItem.title + " (Copia)";
            }
            currentData.unshift(newItem); 
            importedCount++;
        } catch (e) {
            console.error("Error parseando item", e);
        }
    });

    localStorage.setItem('minimal_universal_data', JSON.stringify(currentData));
    
    // Refrescar vistas (Llamadas seguras por si no existen los módulos)
    if (window.renderCards) window.renderCards();
    if (window.updateDatalist) window.updateDatalist();

    closeImportModal();
    await silenosAlert(`¡${importedCount} datos importados correctamente!`);
}

// --- GESTIÓN DE DRIVE (SAVE / LOAD) ---

async function checkIfFileExists(folderId, nameToCheck) {
    const files = await listDriveProjects(folderId);
    const cleanName = nameToCheck.trim().toLowerCase();
    const existing = files.find(f => {
        const fName = f.name.replace('.json', '').trim().toLowerCase();
        return fName === cleanName;
    });
    return existing ? existing : null;
}

async function openDriveSelector() {
    if (!currentUser) return silenosAlert("Debes iniciar sesión primero.");
    
    const modal = document.getElementById('drive-modal');
    const listContainer = document.getElementById('drive-file-list');
    
    listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">Conectando con Drive...</div>';
    modal.classList.add('active'); 
    modal.style.display = 'flex';

    const folderId = await initDriveFolder();
    if (!folderId) {
        listContainer.innerHTML = '<div style="color:var(--danger); padding:20px;">Error conectando con Drive.</div>';
        return;
    }

    const files = await listDriveProjects(folderId);
    renderFileList(files, listContainer);
}

function renderFileList(files, container) {
    container.innerHTML = '';
    const newBtn = document.createElement('div');
    newBtn.className = 'drive-file-item new-project';
    newBtn.innerHTML = `<span>+ Nuevo Proyecto</span>`;
    newBtn.onclick = createNewCloudProject;
    container.appendChild(newBtn);

    if (files.length === 0) {
        container.innerHTML += '<div style="text-align:center; padding:30px; color:#aaa;">Carpeta vacía.</div>';
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
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

async function loadCloudProject(fileId, fileName) {
    const doLoad = await silenosConfirm(`¿Cargar "${fileName}"?\n\nSe reemplazarán los datos actuales.`);
    if(!doLoad) return;

    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Descargando...</div>';

    const projectData = await loadProjectFile(fileId);
    
    if (!projectData) {
        await silenosAlert("Error al descargar el archivo.");
        closeDriveModal();
        return;
    }

    // Inyección manual porque estamos reemplazando TODO
    localStorage.clear();
    if (projectData.universalData) localStorage.setItem('minimal_universal_data', JSON.stringify(projectData.universalData));
    if (projectData.books) localStorage.setItem('minimal_books_v4', JSON.stringify(projectData.books));
    if (projectData.scripts) localStorage.setItem('minimal_scripts_v1', JSON.stringify(projectData.scripts));
    if (projectData.games) localStorage.setItem('minimal_games_v1', JSON.stringify(projectData.games));
    
    const cleanName = fileName.replace('.json','');
    localStorage.setItem('silenos_universe_name', projectData.universeName || cleanName);

    sessionStorage.setItem(SESSION_FILE_ID_KEY, fileId);
    sessionStorage.setItem(SESSION_FILE_NAME_KEY, cleanName);

    await silenosAlert("Proyecto cargado correctamente.");
    location.reload();
}

async function saveToDriveManual() {
    const sessionFileId = sessionStorage.getItem(SESSION_FILE_ID_KEY);
    
    if (!sessionFileId) {
        await silenosAlert("Proyecto local detectado. Se iniciará la subida.");
        return createNewCloudProjectFromCurrent();
    }

    const currentLocalName = (localStorage.getItem('silenos_universe_name') || 'Sin Nombre').trim();
    const sessionCloudName = (sessionStorage.getItem(SESSION_FILE_NAME_KEY) || '').trim();
    const folderId = await initDriveFolder();

    if (currentLocalName !== sessionCloudName) {
        const decision = await showDialog({
            title: "Cambio de Nombre Detectado",
            message: `Original: "${sessionCloudName}"\nActual: "${currentLocalName}"\n\n¿Qué quieres hacer?`,
            type: "custom_save"
        });

        if (decision === 'cancel') return;

        if (decision === 'new') {
            const duplicate = await checkIfFileExists(folderId, currentLocalName);
            if (duplicate) {
                await silenosAlert(`Ya existe "${currentLocalName}". Cambia el nombre antes de guardar.`);
                return;
            }
            const newId = await performSave(folderId, currentLocalName, null, "Creando copia nueva...");
            if (newId) {
                sessionStorage.setItem(SESSION_FILE_ID_KEY, newId);
                sessionStorage.setItem(SESSION_FILE_NAME_KEY, currentLocalName);
                await silenosAlert(`¡Guardado como NUEVO proyecto: "${currentLocalName}"!`);
            }
            return;
        }

        if (decision === 'rename') {
            await performSave(folderId, currentLocalName, sessionFileId, "Renombrando...");
            sessionStorage.setItem(SESSION_FILE_NAME_KEY, currentLocalName);
            await silenosAlert("Archivo renombrado y actualizado.");
            return;
        }

    } else {
        await performSave(folderId, currentLocalName, sessionFileId, "Guardando...");
        const dockName = document.getElementById('current-project-name');
        if(dockName) {
            const original = dockName.textContent;
            dockName.textContent = "¡Guardado!";
            setTimeout(() => dockName.textContent = original, 2000);
        }
    }
}

async function performSave(folderId, fileName, fileIdToUpdate, statusMessage) {
    const data = getProjectSnapshot();
    const dockName = document.getElementById('current-project-name');
    if(dockName) dockName.textContent = statusMessage;

    try {
        const savedId = await saveProjectToDrive(folderId, fileName, data, fileIdToUpdate);
        if(dockName) dockName.textContent = fileName;
        return savedId;
    } catch (e) {
        await silenosAlert("Error al guardar: " + e.message);
        if(dockName) dockName.textContent = fileName + " (Error)";
        return null;
    }
}

async function createNewCloudProject() {
    const folderId = await initDriveFolder();
    let name = await silenosPrompt("Nombre del nuevo proyecto:", "Nuevo Proyecto");
    if (!name) return;
    name = name.trim();

    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = 'Verificando nombre...';

    const duplicate = await checkIfFileExists(folderId, name);
    if (duplicate) {
        await silenosAlert(`Ya existe "${name}". Elige otro nombre.`);
        openDriveSelector(); 
        return;
    }

    localStorage.clear();
    localStorage.setItem('silenos_universe_name', name);
    const emptyData = getProjectSnapshot();
    listContainer.innerHTML = 'Creando...';

    const newId = await saveProjectToDrive(folderId, name, emptyData, null);
    if (newId) {
        sessionStorage.setItem(SESSION_FILE_ID_KEY, newId);
        sessionStorage.setItem(SESSION_FILE_NAME_KEY, name);
        await silenosAlert("Proyecto creado. Entrando...");
        location.reload();
    }
}

async function createNewCloudProjectFromCurrent() {
    const folderId = await initDriveFolder();
    const currentName = localStorage.getItem('silenos_universe_name') || 'Mi Proyecto';
    
    let name = await silenosPrompt("Nombre para guardar en la nube:", currentName);
    if (!name) return;
    name = name.trim();

    const duplicate = await checkIfFileExists(folderId, name);
    if (duplicate) {
        await silenosAlert(`Ya existe "${name}". Elige otro.`);
        return createNewCloudProjectFromCurrent(); 
    }

    const newId = await performSave(folderId, name, null, "Subiendo...");
    if (newId) {
        sessionStorage.setItem(SESSION_FILE_ID_KEY, newId);
        sessionStorage.setItem(SESSION_FILE_NAME_KEY, name);
        await silenosAlert("¡Proyecto vinculado a Drive!");
        localStorage.setItem('silenos_universe_name', name);
        updateProjectUI(name, "Nube");
    }
}