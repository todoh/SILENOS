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

    let x = e.clientX, y = e.clientY, z = 0;
    if (destParentId === 'desktop' && typeof ThreeDesktop !== 'undefined') {
        const world = ThreeDesktop.screenToWorld(e.clientX, e.clientY);
        x = world.x; y = world.y; z = world.z;
    }

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
        const collected = [];
        for (let i = 0; i < items.length; i++) {
            const entry = items[i].webkitGetAsEntry();
            if (entry) {
                await ImportManager.processRecursiveEntry(entry, collected, destParentId);
            }
        }

        collected.forEach(item => {
            if (destParentId === 'desktop') {
                item.x = x + (Math.random() * 40);
                item.y = y + (Math.random() * 40);
                item.z = z;
            }
            FileSystem.data.push(item);
        });

        FileSystem.save();
        if (typeof refreshSystemViews === 'function') refreshSystemViews();
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
            // El ajuste -32 compensa el tamaño del icono (64px/2) para centrarlo al ratón
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