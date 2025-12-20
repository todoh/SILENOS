// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    renderDesktop();
    renderDesktopFiles(); // Nueva función para archivos
    lucide.createIcons();
});

// --- RENDERIZADO (APPS FIJAS + ARCHIVOS) ---
function renderDesktop() {
    const desktop = document.getElementById('desktop-area');
    // Limpiamos solo el área de apps fijas si quisieras separarlo, 
    // pero aquí mezclaremos apps y archivos visualmente o los pondremos en capas.
    // Para simplificar, usaremos el mismo contenedor pero mantenemos APPS arriba.
    desktop.innerHTML = ''; 

    // Renderizar APPS (fijas)
    APPS.forEach(app => {
        const btn = document.createElement('div');
        btn.className = 'flex flex-col items-center gap-2 group w-24 mb-4 cursor-pointer relative z-0';
        btn.onclick = () => openApp(app.id);
        btn.innerHTML = `
            <div class="desktop-icon-btn group-hover:-translate-y-1">
                <i data-lucide="${app.icon}" class="${app.color} w-8 h-8"></i>
            </div>
            <span class="text-xs font-bold text-gray-600 drop-shadow-sm text-center">${app.title}</span>
        `;
        desktop.appendChild(btn);
    });
}

function renderDesktopFiles() {
    // Buscar o crear contenedor de archivos (absoluto)
    let container = document.getElementById('desktop-files-layer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'desktop-files-layer';
        container.className = 'absolute inset-0 pointer-events-none z-0'; // Pointer events auto en hijos
        document.body.appendChild(container); // Append al body para posicionamiento absoluto real
    }
    container.innerHTML = '';

    const files = FileSystem.getItems('desktop');

    files.forEach(file => {
        const el = document.createElement('div');
        el.className = `absolute flex flex-col items-center gap-2 w-20 cursor-pointer pointer-events-auto ${file.type === 'folder' ? 'folder-drop-zone' : ''}`;
        el.style.left = `${file.x}px`;
        el.style.top = `${file.y}px`;
        el.dataset.id = file.id;

        // Mouse down inicia drag
        el.onmousedown = (e) => startIconDrag(e, file.id, 'desktop');

        el.innerHTML = `
            <div class="desktop-icon-btn hover:scale-105 transition-transform bg-[#e0e5ec]/80 backdrop-blur-sm">
                <i data-lucide="${file.icon}" class="${file.color} w-8 h-8"></i>
            </div>
            <span class="text-xs font-bold text-gray-700 text-center bg-white/30 px-2 rounded backdrop-blur-sm">${file.title}</span>
        `;
        container.appendChild(el);
    });
    
    lucide.createIcons();
}

// --- GESTIÓN DE VENTANAS (APPS + CARPETAS) ---

// Abrir Carpeta
function openFolderWindow(folderId) {
    const folder = FileSystem.getItem(folderId);
    if (!folder) return;

    // Verificar si ya está abierta
    const existing = openWindows.find(w => w.id === folderId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(folderId);
        focusWindow(folderId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: folderId,
        appId: 'folder-manager', // ID genérico para iconos en dock
        type: 'folder', // Distintivo
        folderId: folderId,
        title: folder.title,
        icon: 'folder-open',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: 100 + (openWindows.length * 30),
        y: 100 + (openWindows.length * 30)
    };

    createWindowDOM(winObj, { width: 500, height: 400 });
    openWindows.push(winObj);
    renderDock();
    lucide.createIcons();
    
    // Renderizar contenido inicial
    renderFolderContent(folderId, folderId);
}

function renderFolderContent(windowId, folderId) {
    const winContent = document.querySelector(`#window-${windowId} .content-area`);
    if (!winContent) return;

    // Marcamos el área como zona de contenido de carpeta para el Drop
    winContent.innerHTML = `
        <div class="folder-window-content w-full h-full p-4 flex flex-wrap content-start gap-4" data-folder-id="${folderId}">
            </div>
    `;
    
    const container = winContent.querySelector('.folder-window-content');
    const items = FileSystem.getItems(folderId);

    if (items.length === 0) {
        container.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 italic">Carpeta vacía</div>`;
        return;
    }

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = `flex flex-col items-center gap-2 w-20 cursor-pointer ${item.type === 'folder' ? 'folder-drop-zone' : ''}`;
        el.dataset.id = item.id;
        
        el.onmousedown = (e) => startIconDrag(e, item.id, folderId);

        el.innerHTML = `
            <div class="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition-all">
                <i data-lucide="${item.icon}" class="${item.color} w-7 h-7"></i>
            </div>
            <span class="text-xs text-gray-600 text-center truncate w-full">${item.title}</span>
        `;
        container.appendChild(el);
    });
    lucide.createIcons();
}

function openApp(appId) {
    const app = APPS.find(a => a.id === appId);
    if (!app) return;

    const existingWindow = openWindows.find(w => w.id === appId); // Id simple para apps
    if (existingWindow) {
        if (existingWindow.isMinimized) toggleMinimize(appId);
        focusWindow(appId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: appId,
        appId: appId,
        type: 'app',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: 50 + (openWindows.length * 30),
        y: 50 + (openWindows.length * 30)
    };

    createWindowDOM(winObj, app);
    openWindows.push(winObj);
    renderDock();
    lucide.createIcons();
}

function createWindowDOM(winObj, config) {
    const container = document.getElementById('windows-container');
    const title = winObj.type === 'folder' ? winObj.title : config.title;
    const icon = winObj.type === 'folder' ? winObj.icon : config.icon;
    const color = winObj.type === 'folder' ? 'text-blue-500' : config.color;

    const winEl = document.createElement('div');
    winEl.id = `window-${winObj.id}`;
    winEl.className = 'window neumorph-out pop-in pointer-events-auto';
    
    winEl.style.width = config.width ? `${config.width}px` : '600px';
    winEl.style.height = config.height ? `${config.height}px` : '450px';
    winEl.style.left = `${winObj.x}px`;
    winEl.style.top = `${winObj.y}px`;
    winEl.style.zIndex = winObj.zIndex;

    // Contenido
    let contentHTML = '';
    if (winObj.type === 'app') {
        if (config.type === 'blocked') {
            contentHTML = `<div class="p-8 text-center">Modo Externo <br> <a href="${config.url}" target="_blank" class="text-blue-500 underline">Abrir</a></div>`;
        } else {
            contentHTML = `
                <iframe src="${config.url}" class="w-full h-full border-0 bg-white"></iframe>
                <div class="iframe-overlay absolute inset-0 hidden"></div>
            `;
        }
    } else {
        // Carpeta (se llenará dinámicamente)
        contentHTML = `<div class="content-loader">Cargando...</div>`;
    }

    winEl.innerHTML = `
        <div class="window-header h-10 flex items-center justify-between px-4 select-none bg-[#e0e5ec] rounded-t-[20px]"
             onmousedown="startWindowDrag(event, '${winObj.id}')">
            <div class="flex items-center gap-2 text-gray-600 font-bold text-sm">
                <i data-lucide="${icon}" class="${color} w-4 h-4"></i>
                <span>${title}</span>
            </div>
            <div class="flex items-center gap-3" onmousedown="event.stopPropagation()">
                <button onclick="toggleMinimize('${winObj.id}')" class="neumorph-control hover:text-blue-500 text-gray-500">
                    <i data-lucide="minus" class="w-3 h-3"></i>
                </button>
                <button onclick="toggleMaximize('${winObj.id}')" class="neumorph-control hover:text-green-500 text-gray-500">
                    <i data-lucide="square" class="w-3 h-3"></i>
                </button>
                <button onclick="closeApp('${winObj.id}')" class="neumorph-control hover:text-red-500 text-gray-500">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            </div>
        </div>
        <div class="content-area flex-1 bg-gray-100 relative rounded-b-[20px] overflow-hidden">
            ${contentHTML}
        </div>
    `;

    winEl.addEventListener('mousedown', () => focusWindow(winObj.id));
    container.appendChild(winEl);
}

function closeApp(id) {
    const el = document.getElementById(`window-${id}`);
    if (el) el.remove();
    openWindows = openWindows.filter(w => w.id !== id);
    renderDock();
}

function focusWindow(id) {
    zIndexCounter++;
    const winObj = openWindows.find(w => w.id === id);
    if (winObj) {
        winObj.zIndex = zIndexCounter;
        const el = document.getElementById(`window-${id}`);
        if (el) el.style.zIndex = winObj.zIndex;
        renderDock();
    }
}

function toggleMinimize(id) {
    const winObj = openWindows.find(w => w.id === id);
    if (!winObj) return;

    const el = document.getElementById(`window-${id}`);
    winObj.isMinimized = !winObj.isMinimized;

    if (winObj.isMinimized) {
        el.style.display = 'none';
    } else {
        el.style.display = 'flex';
        focusWindow(id);
    }
    renderDock();
}

function toggleMaximize(id) {
    const winObj = openWindows.find(w => w.id === id);
    if (!winObj) return;

    const el = document.getElementById(`window-${id}`);
    winObj.isMaximized = !winObj.isMaximized;

    if (winObj.isMaximized) {
        el.classList.add('maximized');
    } else {
        el.classList.remove('maximized');
        el.style.left = `${winObj.x}px`;
        el.style.top = `${winObj.y}px`;
        
        if (winObj.type === 'app') {
             const app = APPS.find(a => a.id === winObj.appId);
             el.style.width = app.width ? `${app.width}px` : '600px';
             el.style.height = app.height ? `${app.height}px` : '450px';
        } else {
             el.style.width = '500px';
             el.style.height = '400px';
        }
    }
}

// --- DOCK DINÁMICO ---
function renderDock() {
    const dockContainer = document.getElementById('dock-items');
    dockContainer.innerHTML = '';

    if (openWindows.length === 0) {
        dockContainer.innerHTML = '<span class="text-gray-400 text-sm font-medium italic select-none empty-msg">Sin apps abiertas</span>';
        return;
    }

    const visibleWindows = openWindows.filter(w => !w.isMinimized);
    let activeId = null;
    if (visibleWindows.length > 0) {
        const maxZ = Math.max(...visibleWindows.map(w => w.zIndex));
        activeId = visibleWindows.find(w => w.zIndex === maxZ)?.id;
    }

    openWindows.forEach(win => {
        let iconName = 'box'; 
        if(win.type === 'app') {
            const app = APPS.find(a => a.id === win.appId);
            iconName = app ? app.icon : 'box';
        } else {
            iconName = win.icon;
        }

        const isActive = (win.id === activeId) && !win.isMinimized;
        const isMinimized = win.isMinimized;

        const btn = document.createElement('button');
        let classes = "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative ";
        
        if (isActive) classes += "neumorph-in text-blue-500 transform scale-105";
        else classes += "neumorph-btn text-gray-500 hover:text-gray-700 hover:-translate-y-1";
        
        if (isMinimized) classes += " opacity-60";

        btn.className = classes;
        btn.onclick = () => {
            if (isActive) toggleMinimize(win.id);
            else {
                if (win.isMinimized) toggleMinimize(win.id);
                else focusWindow(win.id);
            }
        };

        btn.innerHTML = `
            <i data-lucide="${iconName}" class="w-6 h-6"></i>
            ${!isMinimized ? '<div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400"></div>' : ''}
        `;
        
        dockContainer.appendChild(btn);
    });

    lucide.createIcons();
}