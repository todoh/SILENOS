/* SILENOS 3/drag-drop.js */
// --- SISTEMA DRAG & DROP ESPACIAL (X-Y-Z) Y EXTERNO ---

let dragState = {
    isDragging: false,
    type: null, 
    targetId: null, 
    offsetX: 0,
    offsetY: 0,
    initialX: 0, 
    initialY: 0,
    ghostEl: null,
    sourceParentId: null,
    multiDragIds: [] 
};

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
    
    // Activar overlay para evitar que el iframe capture eventos del ratón
    const overlay = el.querySelector('.iframe-overlay');
    if(overlay) overlay.style.display = 'block';
    
    if (typeof focusWindow === 'function') focusWindow(id);
}

function startIconDrag(e, fileId, sourceParentId) {
    if (e.button !== 0 || (e.buttons & 2)) return;
    e.stopPropagation(); 

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
    dragState.multiDragIds = SelectionManager.getSelectedIds();
    if (!dragState.multiDragIds.includes(fileId)) dragState.multiDragIds.push(fileId);
    dragState.initialX = e.clientX;
    dragState.initialY = e.clientY;
    
    // ACTIVAR OVERLAYS EN TODAS LAS VENTANAS PARA PERMITIR ARRASTRE FLUIDO SOBRE ELLAS
    document.querySelectorAll('.iframe-overlay').forEach(ov => ov.style.display = 'block');

    const count = dragState.multiDragIds.length;
    const ghost = document.createElement('div');
    ghost.className = 'fixed pointer-events-none z-[9999] opacity-90 flex flex-col items-center gap-2';
    
    ghost.innerHTML = `
        <div class="relative w-16 h-16 bg-[#e0e5ec] rounded-2xl flex items-center justify-center shadow-lg border border-white">
            <i data-lucide="${fileItem.icon}" class="${fileItem.color} w-8 h-8"></i>
            ${count > 1 ? `<div class="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">${count}</div>` : ''}
        </div>
    `;
    
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
    
    // DESACTIVAR OVERLAYS AL SOLTAR
    document.querySelectorAll('.iframe-overlay').forEach(ov => ov.style.display = 'none');

    try {
        if (dragState.type === 'window') {
            const el = document.getElementById(`window-${dragState.targetId}`);
            if (el) {
                const overlay = el.querySelector('.iframe-overlay');
                if(overlay) overlay.style.display = 'none';
            }
        } else if (dragState.type === 'icon') {
            handleIconDrop(e);
        }
    } finally {
        if (dragState.ghostEl) dragState.ghostEl.remove();
        dragState.isDragging = false;
        dragState.targetId = null;
        dragState.multiDragIds = [];
        dragState.ghostEl = null;
        document.body.style.cursor = 'default';
    }
});

window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (dragState.isDragging) return;

    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const folderWin = targetEl ? targetEl.closest('.folder-window-content') : null;
    const destParentId = folderWin ? folderWin.dataset.folderId : 'desktop';

    const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('url');
    const items = Array.from(e.dataTransfer.items);

    if (typeof ClipboardProcessor !== 'undefined') {
        const processed = await ClipboardProcessor.processExternalPaste(
            text, 
            items, 
            destParentId, 
            e.clientX, 
            e.clientY
        );

        if (processed && typeof refreshSystemViews === 'function') {
            refreshSystemViews();
        }
    }
});

function handleIconDrop(e) {
    const movedDist = Math.hypot(e.clientX - dragState.initialX, e.clientY - dragState.initialY);
    
    if (movedDist < 5) {
        if (dragState.targetId) {
            if (typeof openDataWindow === 'function') openDataWindow(dragState.targetId);
        }
        return; 
    }

    // --- LÓGICA DE DROP EN VENTANAS (CORREGIDA PARA CARPETAS) ---
    if (typeof openWindows !== 'undefined') {
        const windowsReversed = [...openWindows].reverse();
        
        for (const win of windowsReversed) {
            const winEl = document.getElementById(`window-${win.id}`);
            if (!winEl) continue;

            const rect = winEl.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                
                // Si la ventana es una carpeta, NO enviamos mensaje y NO hacemos return.
                // Dejamos que el código siga hacia la "Lógica Estándar" de carpetas.
                if (win.type === 'folder') {
                    break; 
                }
                
                const fileId = dragState.multiDragIds[0];
                const fileItem = FileSystem.getItem(fileId);
                const iframe = winEl.querySelector('iframe');
                if (iframe && fileItem) {
                    iframe.contentWindow.postMessage({
                        type: 'FILE_DROP_INTERNAL',
                        file: fileItem,
                        content: fileItem.content 
                    }, '*');
                }
                return; 
            }
        }
    }

    // --- LÓGICA ESTÁNDAR (ESCRITORIO / CARPETAS) ---
    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    let destParentId = 'desktop';

    const folderIcon = targetEl ? targetEl.closest('.folder-drop-zone') : null;
    const folderWindow = targetEl ? targetEl.closest('.folder-window-content') : null;

    if (folderIcon && !dragState.multiDragIds.includes(folderIcon.dataset.id)) {
        destParentId = folderIcon.dataset.id;
    } else if (folderWindow) {
        destParentId = folderWindow.dataset.folderId;
    }

    const isToDesktop = destParentId === 'desktop';
    let worldCoords = { x: 0, y: 0, z: 0 };
    
    if (isToDesktop && typeof ThreeDesktop !== 'undefined') {
        worldCoords = ThreeDesktop.screenToWorld(e.clientX, e.clientY);
    }

    dragState.multiDragIds.forEach((id, index) => {
        const updates = { parentId: destParentId };
        if (isToDesktop) {
            updates.x = worldCoords.x - 32 + (index * 20);
            updates.y = worldCoords.y - 32 + (index * 20);
            updates.z = 0; 
        }
        FileSystem.updateItem(id, updates);
    });
    
    FileSystem.save();
    if (typeof refreshAllViews === 'function') refreshAllViews();
    if (typeof refreshSystemViews === 'function') refreshSystemViews();
}

function refreshAllViews() {
    if (typeof openWindows !== 'undefined') {
        openWindows.forEach(win => {
            if (win.type === 'folder' && typeof renderFolderContent === 'function') {
                renderFolderContent(win.id, win.folderId);
            }
        });
    }
}