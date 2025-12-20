// SILENOS 3/drag-drop.js
// --- SISTEMA DRAG & DROP UNIFICADO (Con Multiselección y Drop Zones Especiales) ---

let dragState = {
    isDragging: false,
    type: null, // 'window' | 'icon'
    targetId: null, 
    offsetX: 0,
    offsetY: 0,
    initialX: 0, 
    initialY: 0,
    ghostEl: null,
    sourceParentId: null,
    multiDragIds: [] // Array para IDs múltiples
};

// --- ARRASTRE DE VENTANAS ---
function startWindowDrag(e, id) {
    if (e.button !== 0) return;

    const winObj = openWindows.find(w => w.id === id);
    if (winObj && winObj.isMaximized) return;

    dragState.isDragging = true;
    dragState.type = 'window';
    dragState.targetId = id;

    const el = document.getElementById(`window-${id}`);
    const rect = el.getBoundingClientRect();
    dragState.offsetX = e.clientX - rect.left;
    dragState.offsetY = e.clientY - rect.top;

    const overlay = el.querySelector('.iframe-overlay');
    if(overlay) overlay.style.display = 'block';

    if (typeof focusWindow === 'function') focusWindow(id);
}

// --- ARRASTRE DE ICONOS (Archivos/Carpetas) ---
function startIconDrag(e, fileId, sourceParentId) {
    if (e.button !== 0) return;
    e.stopPropagation(); 

    // LÓGICA DE SELECCIÓN ANTES DE ARRASTRAR
    if (typeof SelectionManager !== 'undefined') {
        if (!SelectionManager.isSelected(fileId)) {
            if (!e.ctrlKey) SelectionManager.clearSelection();
            SelectionManager.addId(fileId);
        }
    }

    const fileItem = FileSystem.getItem(fileId);
    if (!fileItem) return;

    dragState.isDragging = true;
    dragState.type = 'icon';
    dragState.targetId = fileId;
    dragState.sourceParentId = sourceParentId;
    
    // Obtener todos los IDs
    dragState.multiDragIds = SelectionManager.getSelectedIds();
    if (!dragState.multiDragIds.includes(fileId)) dragState.multiDragIds.push(fileId);

    dragState.initialX = e.clientX;
    dragState.initialY = e.clientY;

    // Crear GHOST
    const count = dragState.multiDragIds.length;
    
    const ghost = document.createElement('div');
    ghost.className = 'fixed pointer-events-none z-[9999] opacity-90 flex flex-col items-center gap-2';
    
    if (count > 1) {
        ghost.innerHTML = `
            <div class="relative">
                <div class="absolute top-0 left-0 w-16 h-16 bg-white rounded-2xl shadow-md border border-gray-300 transform -rotate-6"></div>
                <div class="absolute top-0 left-0 w-16 h-16 bg-white rounded-2xl shadow-md border border-gray-300 transform rotate-3"></div>
                <div class="relative w-16 h-16 bg-[#e0e5ec] rounded-2xl flex items-center justify-center shadow-lg border border-white">
                    <i data-lucide="${fileItem.icon}" class="${fileItem.color} w-8 h-8"></i>
                    <div class="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
                        ${count}
                    </div>
                </div>
            </div>
        `;
    } else {
        ghost.innerHTML = `
            <div class="w-16 h-16 bg-[#e0e5ec] rounded-2xl flex items-center justify-center shadow-lg border border-white">
                <i data-lucide="${fileItem.icon}" class="${fileItem.color} w-8 h-8"></i>
            </div>
        `;
    }
    
    document.body.appendChild(ghost);
    dragState.ghostEl = ghost;
    
    updateGhostPosition(e.clientX, e.clientY);
    if (window.lucide) lucide.createIcons();
}

function updateGhostPosition(x, y) {
    if (dragState.ghostEl) {
        dragState.ghostEl.style.left = `${x - 32}px`; 
        dragState.ghostEl.style.top = `${y - 32}px`;
    }
}

// --- EVENTOS GLOBALES ---
window.addEventListener('mousemove', (e) => {
    if (!dragState.isDragging) return;

    if (dragState.type === 'window') {
        const winObj = openWindows.find(w => w.id === dragState.targetId);
        if (!winObj) return;

        let newX = e.clientX - dragState.offsetX;
        let newY = e.clientY - dragState.offsetY;
        if (newY < 0) newY = 0;

        const el = document.getElementById(`window-${dragState.targetId}`);
        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
        winObj.x = newX;
        winObj.y = newY;

    } else if (dragState.type === 'icon') {
        updateGhostPosition(e.clientX, e.clientY);
    }
});

window.addEventListener('mouseup', (e) => {
    if (!dragState.isDragging) return;

    if (dragState.type === 'window') {
        const el = document.getElementById(`window-${dragState.targetId}`);
        if (el) {
            const overlay = el.querySelector('.iframe-overlay');
            if(overlay) overlay.style.display = 'none';
        }
    } else if (dragState.type === 'icon') {
        handleIconDrop(e);
        if (dragState.ghostEl) dragState.ghostEl.remove();
    }

    dragState.isDragging = false;
    dragState.targetId = null;
    dragState.multiDragIds = [];
    dragState.ghostEl = null;
});

// --- LÓGICA DE SOLTAR ICONO ---
function handleIconDrop(e) {
    const movedDist = Math.hypot(e.clientX - dragState.initialX, e.clientY - dragState.initialY);
    
    // Si se movió muy poco, lo contamos como click (abrir)
    if (movedDist < 5) {
        if (dragState.multiDragIds.length <= 1) {
            const item = FileSystem.getItem(dragState.targetId);
            if (item.type === 'folder') {
                if (typeof openFolderWindow === 'function') openFolderWindow(item.id);
            } else {
                if (typeof openDataWindow === 'function') openDataWindow(item.id);
            }
        }
        return;
    }

    // Detectar destino
    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    let destParentId = null;
    let destX = e.clientX;
    let destY = e.clientY;
    let isReorder = false; 

    // 1. Detección de zona de DROP IA
    const aiDropZone = targetEl ? targetEl.closest('.ai-drop-zone') : null;
    if (aiDropZone && typeof AIWorker !== 'undefined') {
        dragState.multiDragIds.forEach(id => AIWorker.addFileToContext(id));
        aiDropZone.style.borderColor = "#3b82f6";
        setTimeout(() => aiDropZone.style.borderColor = "rgba(0,0,0,0.1)", 300);
        return; 
    }

    // 2. Detección de zona de DROP IMPORTACIÓN
    const importDropZone = targetEl ? targetEl.closest('.import-drop-zone') : null;
    if (importDropZone && typeof ImportManager !== 'undefined') {
        const winId = importDropZone.id.replace('import-text-', '');
        if (winId) ImportManager.handleInternalDrop(dragState.multiDragIds, importDropZone, winId);
        return;
    }

    // 3. Detección de zona de DROP PROGRAMADOR (CANVAS)
    const progCanvas = targetEl ? targetEl.closest('.prog-editor-container') : null;
    if (progCanvas && typeof ProgrammerManager !== 'undefined') {
        const winId = progCanvas.id.replace('prog-canvas-', '');
        if (winId) ProgrammerManager.handleFileDrop(winId, dragState.multiDragIds, destX, destY);
        return;
    }

    // 4. [NUEVO] Detección de zona de DROP RUNNER (Interfaz Ejecutable)
    const runnerDrop = targetEl ? targetEl.closest('.runner-drop-zone') : null;
    if (runnerDrop && typeof ProgrammerManager !== 'undefined') {
         // Extraemos nodeId y fieldName del dataset
         const nodeId = runnerDrop.dataset.node;
         const fieldName = runnerDrop.dataset.field;
         if (nodeId && fieldName) {
             ProgrammerManager.handleRunnerFileDrop(nodeId, fieldName, dragState.multiDragIds);
         }
         return;
    }

    // 5. ¿Sobre una carpeta?
    const folderIcon = targetEl.closest('.folder-drop-zone');
    if (folderIcon) {
        const folderId = folderIcon.dataset.id;
        if (!dragState.multiDragIds.includes(folderId)) {
            destParentId = folderId;
        }
    }

    // 6. ¿Dentro de una ventana de carpeta?
    if (!destParentId) {
        const windowEl = targetEl.closest('.folder-window-content');
        if (windowEl) {
            destParentId = windowEl.dataset.folderId;
            isReorder = (destParentId === dragState.sourceParentId);
        }
    }

    // 7. Escritorio
    if (!destParentId) {
        if (!targetEl.closest('.window')) {
            destParentId = 'desktop';
            isReorder = (destParentId === dragState.sourceParentId);
        }
    }

    // Ejecutar movimiento
    if (destParentId) {
        dragState.multiDragIds.forEach((id, index) => {
            const updates = { parentId: destParentId };
            
            if (isReorder) {
                updates.x = destX - 32 + (index * 10); 
                updates.y = destY - 32 + (index * 10);
            } else {
                if (destParentId === 'desktop') {
                     updates.x = destX - 32 + (index * 10);
                     updates.y = destY - 32 + (index * 10);
                } else {
                     updates.x = 0;
                     updates.y = 0;
                }
            }
            FileSystem.updateItem(id, updates);
        });
        
        refreshAllViews();
        SelectionManager.setSelection(dragState.multiDragIds);
    }
}

function refreshAllViews() {
    if (typeof renderDesktopFiles === 'function') renderDesktopFiles(); 
    if (typeof openWindows !== 'undefined') {
        openWindows.forEach(win => {
            if (win.type === 'folder' && typeof renderFolderContent === 'function') {
                renderFolderContent(win.id, win.folderId);
            }
        });
    }
    if (typeof SelectionManager !== 'undefined') SelectionManager.renderVisuals();
}