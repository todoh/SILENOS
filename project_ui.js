// --- PROJECT UI (Interfaz Visual y Diálogos) v6.3 (Queue List) ---
// Responsable de: Modales, Alertas, Árboles de selección DOM y HUD de Cola Detallado.

import { loadFileContent } from './drive_api.js'; 

console.log("Project UI Cargado (v6.3 - Queue List)");

// --- DIÁLOGOS GLOBALES (Alerts, Confirms) ---

export function createGlobalDialogUI() {
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
    
    // Iniciamos también el HUD de cola
    createQueueHUD();
}

export function showDialog({ title, message, type = 'alert', placeholder = '' }) {
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
        else if (type === 'custom_save_menu') {
            actionsEl.appendChild(createBtn('Continuar', 'primary', true));
            actionsEl.appendChild(createBtn('Cancelar', 'danger', false));
        }

        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('active'), 10);
    });
}

export async function silenosAlert(msg, title="Silenos") {
    await showDialog({ title, message: msg, type: 'alert' });
}

export async function silenosConfirm(msg, title="Confirmación") {
    return await showDialog({ title, message: msg, type: 'confirm' });
}

export async function silenosPrompt(msg, placeholder="", title="Entrada") {
    return await showDialog({ title, message: msg, placeholder, type: 'prompt' });
}

export function updateProjectUI(name, type) {
    const el = document.getElementById('current-project-name');
    if (el) el.textContent = name;
}

// --- MODALES ESPECÍFICOS (DRIVE & IMPORT) ---

export function createDriveModal() {
    if (document.getElementById('drive-modal')) return;
    const div = document.createElement('div');
    div.id = 'drive-modal';
    div.className = 'modal-overlay'; 
    div.innerHTML = `
        <div class="modal-content glass-container" style="max-width: 500px; max-height: 80vh;">
            <div class="modal-header">
                <h3>Silenos Drive</h3>
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

export function createImportModal() {
    if (document.getElementById('import-modal')) return;
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

// --- RENDERIZADO DE ÁRBOLES (Import Logic Visuals) ---

export function renderImportTree(files, container) {
    container.innerHTML = '';
    
    if (files.length === 0) {
        container.innerHTML = '<div style="padding:20px;">No hay proyectos disponibles.</div>';
        return;
    }

    files.forEach(file => {
        const projectRow = document.createElement('div');
        projectRow.className = 'tree-project-item';
        
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

        const pCheck = projectRow.querySelector('.project-check');
        pCheck.addEventListener('change', (e) => {
            const childContainer = document.getElementById(`children-${file.id}`);
            const children = childContainer.querySelectorAll('.data-check');
            
            if (children.length > 0) {
                children.forEach(ch => ch.checked = e.target.checked);
            } else if (e.target.checked && childContainer.classList.contains('hidden')) {
                toggleProjectExpand(file.id, file.name, projectRow.querySelector('.tree-title'), true);
            }
            updateImportCount();
        });
    });
}

// Exportar al objeto global window para que onclick funcione desde HTML
window.toggleProjectExpand = async (fileId, fileName, titleEl, autoSelect = false) => {
    const childContainer = document.getElementById(`children-${fileId}`);
    const icon = titleEl.nextElementSibling;
    
    if (!childContainer.classList.contains('hidden') && !autoSelect) {
        childContainer.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
        return;
    }

    childContainer.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';

    if (childContainer.innerHTML === '') {
        childContainer.innerHTML = '<div style="padding:10px; font-size:0.8rem; color:#aaa;">Cargando datos...</div>';
        
        try {
            const fileData = await loadFileContent(fileId);
            childContainer.innerHTML = ''; 

            const items = fileData.items || fileData.universalData || [];
            
            if (items.length === 0) {
                childContainer.innerHTML = '<div style="padding:10px; font-size:0.8rem; font-style:italic; opacity:0.6;">Sin datos.</div>';
            } else {
                items.forEach(item => {
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
                    
                    itemRow.querySelector('input').addEventListener('change', updateImportCount);
                });
            }

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

export function updateImportCount() {
    const count = document.querySelectorAll('.data-check:checked').length;
    const counterEl = document.getElementById('import-count');
    if(counterEl) counterEl.textContent = count;
}


// --- QUEUE HUD SYSTEM (VISUALIZADOR DE COLA AVANZADO) ---

const queueState = {
    script: [],
    book: [],
    game: []
};

function createQueueHUD() {
    if (document.getElementById('queue-hud')) return;

    // INYECCIÓN CSS PARA EL LISTADO (TOOLTIP)
    const style = document.createElement('style');
    style.innerHTML = `
        .queue-list-popover {
            position: absolute;
            bottom: 40px;
            right: 0;
            width: 220px;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            padding: 10px;
            display: none;
            flex-direction: column;
            gap: 5px;
            pointer-events: none;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.2s;
            border: 1px solid rgba(0,0,0,0.05);
            z-index: 10000;
        }
        .queue-pill:hover .queue-list-popover {
            display: flex;
            opacity: 1;
            transform: translateY(0);
        }
        .q-item {
            font-size: 0.75rem;
            color: #444;
            padding: 6px 0;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .q-item:last-child { border-bottom: none; }
        .q-icon { font-size: 0.9rem; }
        .q-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; flex: 1; }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'queue-hud';
    container.className = 'queue-hud';
    
    ['script', 'book', 'game'].forEach(type => {
        const pill = document.createElement('div');
        pill.id = `queue-pill-${type}`;
        pill.className = 'queue-pill'; 
        
        let label = 'GEN';
        if(type === 'script') label = 'GUION';
        if(type === 'book') label = 'LIBRO';
        if(type === 'game') label = 'JUEGO';

        pill.innerHTML = `
            <div class="queue-dot"></div>
            <span class="queue-label">${label}</span>
            <span id="queue-count-${type}">0</span>
            <div class="queue-list-popover" id="queue-list-${type}"></div>
        `;
        container.appendChild(pill);
    });

    document.body.appendChild(container);
}

// Nueva función de Estado Completo (Reemplaza al antiguo updateQueueCount para mayor detalle)
export function updateQueueState(type, jobs) {
    // jobs = [{ title, status }, ...]
    const count = jobs.length;
    queueState[type] = jobs;
    
    const pill = document.getElementById(`queue-pill-${type}`);
    const countEl = document.getElementById(`queue-count-${type}`);
    const listEl = document.getElementById(`queue-list-${type}`);
    
    if (pill && countEl) {
        countEl.textContent = count;
        if (count > 0) {
            pill.classList.add('active');
            
            // Renderizar Lista
            if(listEl) {
                listEl.innerHTML = '';
                jobs.forEach(job => {
                    const div = document.createElement('div');
                    div.className = 'q-item';
                    const icon = job.status === 'processing' ? '⚙️' : '⏳';
                    const safeTitle = job.title || 'Sin Título';
                    div.innerHTML = `<span class="q-icon">${icon}</span><span class="q-title" title="${safeTitle}">${safeTitle}</span>`;
                    listEl.appendChild(div);
                });
            }

        } else {
            pill.classList.remove('active');
            if(listEl) listEl.innerHTML = '';
        }
    }
}

// Mantener compatibilidad simple si se usa en otros lados, aunque ahora preferimos updateQueueState
export function updateQueueCount(type, delta) {
   // Deprecated for direct state update, but kept for safety
}