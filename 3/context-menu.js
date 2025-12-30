/* SILENOS 3/context-menu.js */
// B -> Visión y Percepción de la Interfaz

document.addEventListener('contextmenu', (e) => {
    // Evitar menú si el gestor de selección está ocupado (arrastre)
    if (typeof SelectionManager !== 'undefined' && SelectionManager.preventNextContextMenu) {
        e.preventDefault();
        return;
    }
    
    // El programador de nodos tiene su propio sistema
    if (e.target.closest('.prog-editor-container')) {
        return; 
    }

    e.preventDefault();
    
    // Buscar si hemos clicado sobre materia (archivo/carpeta)
    const itemEl = e.target.closest('[data-id]');
    const itemId = itemEl ? itemEl.dataset.id : null;
    let itemTitle = null;

    if (itemId) {
        // Sincronizar selección si no estaba seleccionado
        if (typeof SelectionManager !== 'undefined' && !SelectionManager.isSelected(itemId)) {
            SelectionManager.clearSelection();
            SelectionManager.addId(itemId);
        }
        const item = FileSystem.getItem(itemId);
        if (item) itemTitle = item.title;
    } else if (typeof SelectionManager !== 'undefined') {
        SelectionManager.clearSelection();
    }

    // Identificar el contenedor (Escritorio o Ventana de Carpeta)
    const folderContent = e.target.closest('.folder-window-content');
    const parentId = folderContent ? folderContent.dataset.folderId : 'desktop';

    createContextMenu(e.clientX, e.clientY, itemId, itemTitle, parentId);
});

document.addEventListener('click', () => removeContextMenu());

function createContextMenu(mouseX, mouseY, itemId = null, itemTitle = null, parentId = 'desktop') {
    removeContextMenu();
    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.className = 'fixed z-[9999] bg-[#e0e5ec] p-2 rounded-xl flex flex-col gap-1 w-56 shadow-xl border border-white/50 pop-in';
    
    let finalX = mouseX + 224 > window.innerWidth ? mouseX - 224 : mouseX;
    let finalY = mouseY + 300 > window.innerHeight ? mouseY - 300 : mouseY; 
    menu.style.left = `${finalX}px`;
    menu.style.top = `${finalY}px`;

    const options = [];
    let selectedIds = typeof SelectionManager !== 'undefined' ? SelectionManager.getSelectedIds() : [];
    let selectedCount = selectedIds.length;
    let currentItem = itemId ? FileSystem.getItem(itemId) : null;

    if (itemId || selectedCount > 0) {
        // ACCIONES PARA ARCHIVOS SELECCIONADOS
        options.push({
            label: `Copiar ${selectedCount > 1 ? '('+selectedCount+')' : ''}`,
            icon: 'copy',
            color: 'text-blue-600',
            action: () => {
                SystemClipboard.copy(selectedCount > 0 ? selectedIds : [itemId]);
                showNotification("Copiado al portapapeles");
            }
        });

        options.push({ separator: true });

        if (selectedCount <= 1 && currentItem) {
            addTypeSpecificOptions(options, currentItem, itemId);
        }

        options.push({
            label: selectedCount > 1 ? `Eliminar (${selectedCount})` : 'Eliminar',
            icon: 'trash-2',
            color: 'text-red-500',
            action: () => showDeleteConfirm(finalX, finalY, itemId, itemTitle, selectedCount)
        });
    } else {
        // ACCIONES PARA ESPACIO VACÍO
        addCreationOptions(options, parentId, mouseX, mouseY);
    }

    renderOptions(menu, options);
    document.body.appendChild(menu);
    if (window.lucide) lucide.createIcons();
}

function addTypeSpecificOptions(options, item, itemId) {
    options.push({ 
        label: 'Renombrar', 
        icon: 'edit-2', 
        color: 'text-gray-600', 
        action: () => showRenameModal(null, itemId, item.title) 
    });

    if (item.type === 'folder') {
        options.push({ label: 'Descargar Pack (JSON)', icon: 'package', color: 'text-indigo-600', action: () => DownloadManager.downloadFolderRecursive(item) });
    }
    
    if (item.type === 'book') {
        options.push(
            { label: 'Descargar DOC', icon: 'file-type-2', color: 'text-blue-600', action: () => DownloadManager.downloadBookDoc(item) },
            { label: 'Descargar PDF', icon: 'printer', color: 'text-red-600', action: () => DownloadManager.downloadBookPdf(item) }
        );
    }

    if (item.type === 'html') {
        options.push({ label: 'Descargar HTML', icon: 'file-code', color: 'text-orange-600', action: () => DownloadManager.downloadHTML(item) });
    }
    
    if (item.type === 'program') {
        options.push({ label: 'Editar Programa', icon: 'edit-3', color: 'text-blue-600', action: () => { if (typeof openProgrammerWindow === 'function') openProgrammerWindow(itemId); } });
    }
    
    options.push({ label: 'Descargar JSON', icon: 'file-json', color: 'text-gray-600', action: () => DownloadManager.downloadJSON(item) });
}

function addCreationOptions(options, parentId, mouseX, mouseY) {
    if (parentId === 'desktop') {
        options.push({ label: 'Ordenar Escritorio', icon: 'layout-grid', color: 'text-indigo-600', action: () => { if (typeof DesktopOrganizer !== 'undefined') DesktopOrganizer.organize(); } });
        options.push({ separator: true });
    }
    
    if (typeof SystemClipboard !== 'undefined' && SystemClipboard.hasItems()) {
        options.push({ label: `Pegar Archivos (${SystemClipboard.getIds().length})`, icon: 'copy-plus', color: 'text-indigo-600', action: () => handlePasteAction(parentId, mouseX, mouseY) });
    }

    if (typeof window.handleExternalPasteAction === 'function') {
        options.push({ 
            label: 'Pegar desde Portapapeles', 
            icon: 'clipboard-paste', 
            color: 'text-green-600', 
            action: () => window.handleExternalPasteAction(parentId, mouseX, mouseY) 
        });
    }

    if (SystemClipboard.hasItems() || typeof window.handleExternalPasteAction === 'function') {
        options.push({ separator: true });
    }

    const getCoords = () => {
        if (parentId === 'desktop' && typeof ThreeDesktop !== 'undefined') {
            const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
            return { x: world.x - 48, y: world.y - 48, z: world.z };
        }
        return { x: undefined, y: undefined, z: Math.random() * 500 };
    };

    const createAndRefresh = (type, name) => {
        const c = getCoords();
        const item = type === 'folder' ? FileSystem.createFolder(name, parentId, c) :
                     type === 'program' ? FileSystem.createProgram(name, parentId, c) :
                     type === 'book' ? FileSystem.createBook(name, parentId, c) :
                     type === 'narrative' ? FileSystem.createNarrative(name, parentId, c) :
                     FileSystem.createData(name, {info:"Dato"}, parentId, c);
        
        if (item && typeof c.z === 'number') item.z = c.z;
        FileSystem.save(); 
        if (window.refreshAllViews) refreshAllViews();
        if (window.refreshSystemViews) window.refreshSystemViews();
    };

    options.push(
        { label: 'Crear Carpeta', icon: 'folder-plus', action: () => createAndRefresh('folder', 'Nueva Carpeta') },
        { label: 'Crear Programa', icon: 'cpu', color: 'text-purple-600', action: () => createAndRefresh('program', 'Nuevo Programa') },
        { label: 'Crear Libro', icon: 'book-plus', color: 'text-indigo-600', action: () => createAndRefresh('book', 'Nuevo Libro') },
        { label: 'Crear Dato Narrativo', icon: 'sticky-note', color: 'text-orange-500', action: () => createAndRefresh('narrative', 'Dato Narrativo') }
    );
}

function renderOptions(menu, options) {
    options.forEach(opt => {
        if (opt.separator) {
            const sep = document.createElement('div');
            sep.className = 'h-px bg-gray-300 my-1';
            menu.appendChild(sep);
        } else {
            const btn = document.createElement('button');
            btn.className = `flex items-center gap-3 px-3 py-2 hover:bg-black/5 rounded-lg ${opt.color || 'text-gray-700'} text-xs font-bold transition-colors text-left w-full`;
            btn.innerHTML = `<i data-lucide="${opt.icon || 'circle'}" class="w-4 h-4"></i> ${opt.label}`;
            btn.onclick = (e) => { e.stopPropagation(); removeContextMenu(); opt.action(); };
            menu.appendChild(btn);
        }
    });
}

function removeContextMenu() { const e = document.getElementById('context-menu'); if (e) e.remove(); }

function showNotification(msg) {
    const n = document.createElement('div');
    n.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-xs font-bold z-[10000] pop-in pointer-events-none backdrop-blur-sm shadow-lg';
    n.innerText = msg; document.body.appendChild(n); setTimeout(() => n.remove(), 2000);
}

function showDeleteConfirm(x, y, singleId, singleName, count) {
    const existing = document.getElementById('delete-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'delete-modal';
    modal.className = 'fixed z-[10000] bg-[#e0e5ec]/90 backdrop-blur border border-white/50 shadow-2xl rounded-xl p-4 flex flex-col items-center gap-3 pop-in';
    
    const modalW = 200;
    modal.style.left = `${x + modalW > window.innerWidth ? window.innerWidth - modalW - 20 : x}px`;
    modal.style.top = `${y + 120 > window.innerHeight ? window.innerHeight - 120 : y}px`;
    modal.style.width = `${modalW}px`;
    
    modal.innerHTML = `
        <div class="text-center">
            <p class="text-sm font-bold text-gray-700 break-words line-clamp-2">${count > 1 ? count + ' elementos' : singleName}</p>
            <p class="text-xs text-gray-500 mt-1">¿Borrar definitivamente?</p>
        </div>
        <div class="flex gap-3 w-full justify-center">
            <button id="del-yes" class="px-4 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg shadow">Si</button>
            <button id="del-no" class="px-4 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg shadow">No</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('del-yes').onclick = () => {
        if (count > 1 && typeof SelectionManager !== 'undefined') {
            SelectionManager.getSelectedIds().forEach(id => FileSystem.deleteItem(id));
            SelectionManager.clearSelection();
        } else if (singleId) {
            FileSystem.deleteItem(singleId);
        }
        
        if (window.refreshSystemViews) window.refreshSystemViews();
        modal.remove();
    };
    
    document.getElementById('del-no').onclick = () => modal.remove();
}