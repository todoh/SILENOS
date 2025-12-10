// --- PROJECT MANAGER v3.5 (IMPORTACIÓN DE DATOS) ---
// Y → Confluencia (Importación y Mezcla)

import { initDriveFolder, listDriveProjects, loadProjectFile, saveProjectToDrive } from './drive_api.js';
import { currentUser } from './auth_ui.js';

console.log("Project Manager Cargado (v3.5 - Data Import)");

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

let autosaveTimer = null;
let lastSnapshot = ""; 

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    createGlobalDialogUI();
    createDriveModal();
    createImportModal(); // Nuevo Modal de Importación

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
    window.openImportModal = openImportModal; // Nueva
    window.closeImportModal = closeImportModal; // Nueva
    window.executeImport = executeImport; // Nueva
});

// --- SISTEMA DE IMPORTACIÓN DE DATOS (NUEVO) ---

// 1. Crear Modal HTML
function createImportModal() {
    const div = document.createElement('div');
    div.id = 'import-modal';
    div.className = 'modal-overlay';
    div.innerHTML = `
        <div class="modal-content glass-container" style="max-width: 600px; height: 80vh;">
            <div class="modal-header">
                <h3>Importar Datos Universales</h3>
                <button class="btn-icon" onclick="window.closeImportModal()">×</button>
            </div>
            <div class="modal-body" style="padding: 0;">
                <div id="import-tree-container" class="import-tree-area">
                    <div style="padding:20px; text-align:center; color:#999;">Cargando lista de proyectos...</div>
                </div>
            </div>
            <div class="modal-footer">
                <div style="flex:1; font-size:0.8rem; color:#888; display:flex; align-items:center;">
                    <span id="import-count">0</span> items seleccionados
                </div>
                <button class="io-btn" onclick="window.closeImportModal()">Cancelar</button>
                <button class="io-btn action" onclick="window.executeImport()">Importar Selección</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// 2. Lógica de Apertura
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

// 3. Renderizado del Árbol (Proyectos -> Datos)
function renderImportTree(files, container) {
    container.innerHTML = '';
    
    if (files.length === 0) {
        container.innerHTML = '<div style="padding:20px;">No hay proyectos en la nube.</div>';
        return;
    }

    files.forEach(file => {
        const projectRow = document.createElement('div');
        projectRow.className = 'tree-project-item';
        
        // Estructura: Checkbox - Nombre Proyecto - Contenedor Hijos
        projectRow.innerHTML = `
            <div class="tree-header">
                <label class="minimal-checkbox">
                    <input type="checkbox" class="project-check" data-file-id="${file.id}">
                    <span class="checkmark"></span>
                </label>
                <span class="tree-title" onclick="toggleProjectExpand('${file.id}', '${file.name}', this)">${file.name.replace('.json','')}</span>
                <span class="expand-icon">▼</span>
            </div>
            <div id="children-${file.id}" class="tree-children hidden"></div>
        `;
        
        container.appendChild(projectRow);

        // Evento Checkbox Padre
        const pCheck = projectRow.querySelector('.project-check');
        pCheck.addEventListener('change', (e) => {
            // Si marcamos el padre, intentamos marcar los hijos si ya están cargados
            const childContainer = document.getElementById(`children-${file.id}`);
            const children = childContainer.querySelectorAll('.data-check');
            
            if (children.length > 0) {
                children.forEach(ch => ch.checked = e.target.checked);
            } else if (e.target.checked && childContainer.classList.contains('hidden')) {
                // Si marcamos padre y no está expandido, expandimos y cargamos automáticamente
                toggleProjectExpand(file.id, file.name, projectRow.querySelector('.tree-title'), true);
            }
            updateImportCount();
        });
    });
}

// 4. Expansión y Carga Perezosa (Lazy Load) de Datos
window.toggleProjectExpand = async (fileId, fileName, titleEl, autoSelect = false) => {
    const childContainer = document.getElementById(`children-${fileId}`);
    const icon = titleEl.nextElementSibling;
    
    if (!childContainer.classList.contains('hidden') && !autoSelect) {
        // Contraer
        childContainer.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
        return;
    }

    // Expandir
    childContainer.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';

    if (childContainer.innerHTML === '') {
        childContainer.innerHTML = '<div style="padding:10px; font-size:0.8rem; color:#aaa;">Cargando datos...</div>';
        
        try {
            const projectData = await loadProjectFile(fileId);
            childContainer.innerHTML = ''; // Limpiar loading

            const universalData = projectData.universalData || [];
            
            if (universalData.length === 0) {
                childContainer.innerHTML = '<div style="padding:10px; font-size:0.8rem; font-style:italic; opacity:0.6;">Sin datos.</div>';
            } else {
                universalData.forEach(item => {
                    const itemRow = document.createElement('div');
                    itemRow.className = 'tree-data-item';
                    itemRow.innerHTML = `
                        <label class="minimal-checkbox small">
                            <input type="checkbox" class="data-check" value="${item.id}">
                            <span class="checkmark"></span>
                        </label>
                        <span class="data-name">[${item.category || 'GEN'}] ${item.title || 'Sin Título'}</span>
                        <textarea style="display:none;" class="data-json">${JSON.stringify(item)}</textarea>
                    `;
                    childContainer.appendChild(itemRow);
                    
                    // Listener para actualizar contador
                    itemRow.querySelector('input').addEventListener('change', updateImportCount);
                });
            }

            // Si se pidió auto-selección (al clicar el padre primero)
            if (autoSelect) {
                const pCheck = document.querySelector(`.project-check[data-file-id="${fileId}"]`);
                if(pCheck && pCheck.checked) {
                    childContainer.querySelectorAll('.data-check').forEach(ch => ch.checked = true);
                    updateImportCount();
                }
            }

        } catch (e) {
            childContainer.innerHTML = '<div style="color:red; font-size:0.8rem;">Error al leer archivo.</div>';
            console.error(e);
        }
    }
};

function updateImportCount() {
    const count = document.querySelectorAll('.data-check:checked').length;
    const counterEl = document.getElementById('import-count');
    if(counterEl) counterEl.textContent = count;
}

// 5. Ejecutar Importación
async function executeImport() {
    const selectedChecks = document.querySelectorAll('.data-check:checked');
    if (selectedChecks.length === 0) return silenosAlert("No has seleccionado ningún dato.");

    let importedCount = 0;
    let currentData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    
    // Mapa para evitar duplicados ID (opcional, Silenos usa ID timestamp, riesgo bajo de colisión pero posible)
    const existingIds = new Set(currentData.map(d => d.id));

    selectedChecks.forEach(chk => {
        const jsonStr = chk.parentElement.parentElement.querySelector('.data-json').value;
        try {
            const newItem = JSON.parse(jsonStr);
            
            // Lógica de colisión: Si ya existe el ID, generamos uno nuevo para importar copia
            if (existingIds.has(newItem.id)) {
                newItem.id = Date.now() + Math.floor(Math.random() * 1000);
                newItem.title = newItem.title + " (Copia)";
            }
            
            currentData.unshift(newItem); // Añadir al principio
            importedCount++;
        } catch (e) {
            console.error("Error parseando item", e);
        }
    });

    localStorage.setItem('minimal_universal_data', JSON.stringify(currentData));
    
    // Refrescar UI de Datos si existe la función
    if (window.renderCards) window.renderCards();
    if (window.updateDatalist) window.updateDatalist(); // Refrescar categorías

    closeImportModal();
    await silenosAlert(`¡${importedCount} datos importados correctamente al proyecto actual!`);
}


// --- FUNCIONES CORE EXISTENTES (SIN CAMBIOS, SOLO REFERENCIA) ---

function createGlobalDialogUI() {
    if (document.getElementById('silenos-dialog-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'silenos-dialog-overlay';
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
        <div class="dialog-box">
            <div id="sd-title" class="dialog-title">Aviso</div>
            <div id="sd-message" class="dialog-message">...</div>
            <input type="text" id="sd-input" class="dialog-input" style="display:none;">
            <div id="sd-actions" class="dialog-actions"></div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function showDialog({ title, message, type = 'alert', placeholder = '' }) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('silenos-dialog-overlay');
        const titleEl = document.getElementById('sd-title');
        const msgEl = document.getElementById('sd-message');
        const inputEl = document.getElementById('sd-input');
        const actionsEl = document.getElementById('sd-actions');

        titleEl.textContent = title;
        msgEl.innerHTML = message.replace(/\n/g, '<br>');
        actionsEl.innerHTML = '';
        inputEl.style.display = 'none';
        inputEl.value = '';

        if (type === 'prompt') {
            inputEl.style.display = 'block';
            inputEl.placeholder = placeholder;
            inputEl.value = placeholder;
            setTimeout(() => inputEl.focus(), 100);
        }

        const createBtn = (text, cls, onClickVal) => {
            const btn = document.createElement('button');
            btn.className = `dialog-btn ${cls}`;
            btn.textContent = text;
            btn.onclick = () => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.style.display = 'none';
                    resolve(onClickVal); 
                }, 200);
            };
            return btn;
        };

        if (type === 'alert') {
            actionsEl.appendChild(createBtn('Entendido', 'primary', true));
        } 
        else if (type === 'confirm') {
            actionsEl.appendChild(createBtn('Confirmar', 'primary', true));
            actionsEl.appendChild(createBtn('Cancelar', '', false));
        }
        else if (type === 'prompt') {
            const okBtn = createBtn('Aceptar', 'primary', null);
            okBtn.onclick = () => {
                const val = inputEl.value.trim();
                overlay.classList.remove('active');
                setTimeout(() => { overlay.style.display = 'none'; resolve(val); }, 200);
            };
            actionsEl.appendChild(okBtn);
            actionsEl.appendChild(createBtn('Cancelar', '', null));
        }
        else if (type === 'custom_save') {
            actionsEl.appendChild(createBtn('🆕 Guardar como NUEVO', 'primary', 'new'));
            actionsEl.appendChild(createBtn('✏️ Renombrar Original', '', 'rename'));
            actionsEl.appendChild(createBtn('Cancelar', 'danger', 'cancel'));
        }

        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('active'), 10);
    });
}

async function silenosAlert(msg, title="Silenos") {
    await showDialog({ title, message: msg, type: 'alert' });
}

async function silenosConfirm(msg, title="Confirmación") {
    return await showDialog({ title, message: msg, type: 'confirm' });
}

async function silenosPrompt(msg, placeholder="", title="Entrada") {
    return await showDialog({ title, message: msg, placeholder, type: 'prompt' });
}

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
    
    let modal = document.getElementById('drive-modal');
    if (!modal) {
        createDriveModal();
        modal = document.getElementById('drive-modal');
    }

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
        const msg = document.createElement('div');
        msg.style.textAlign = 'center'; msg.style.padding = '30px'; msg.style.color = '#aaa'; msg.style.fontStyle = 'italic';
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

async function loadCloudProject(fileId, fileName) {
    const doLoad = await silenosConfirm(`¿Cargar "${fileName}"?\n\nSe reemplazarán los datos actuales de la pantalla.`);
    if(!doLoad) return;

    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Descargando...</div>';

    const projectData = await loadProjectFile(fileId);
    
    if (!projectData) {
        await silenosAlert("Error al descargar el archivo.");
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

    await silenosAlert("Proyecto cargado correctamente.");
    location.reload();
}

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
    const data = gatherProjectData();
    const dockName = document.getElementById('current-project-name');
    if(dockName) dockName.textContent = statusMessage;

    try {
        const savedId = await saveProjectToDrive(folderId, fileName, data, fileIdToUpdate);
        lastSnapshot = JSON.stringify(data); 
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
    const emptyData = gatherProjectData();
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

function startAutosaveSystem() {
    lastSnapshot = JSON.stringify(gatherProjectData());
    if (autosaveTimer) clearInterval(autosaveTimer);

    autosaveTimer = setInterval(async () => {
        const fileId = sessionStorage.getItem(SESSION_FILE_ID_KEY);
        const currentLocalName = localStorage.getItem('silenos_universe_name');
        const sessionCloudName = sessionStorage.getItem(SESSION_FILE_NAME_KEY);

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

function createDriveModal() {
    const div = document.createElement('div');
    div.id = 'drive-modal';
    div.className = 'modal-overlay'; 
    div.innerHTML = `
        <div class="modal-content glass-container" style="max-width: 500px; max-height: 80vh;">
            <div class="modal-header">
                <h3>Proyectos en Drive</h3>
                <button class="btn-icon" onclick="window.closeDriveModal()">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
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