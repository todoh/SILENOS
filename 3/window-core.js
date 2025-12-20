// SILENOS 3/window-core.js
// --- NÚCLEO DE GESTIÓN DE VENTANAS (DOM & STATE) ---

function createWindowDOM(winObj, config) {
    const container = document.getElementById('windows-container');
    
    let title = config.title;
    let icon = config.icon;
    let color = config.color;

    // Sobreescritura dinámica según tipo
    if (winObj.type === 'folder') {
        title = winObj.title;
        icon = winObj.icon;
        color = 'text-blue-500';
    } else if (winObj.type === 'data') {
        title = winObj.title;
        icon = winObj.icon;
        color = 'text-green-600';
    } else if (winObj.type === 'book') {
        title = winObj.title;
        icon = winObj.icon;
        color = 'text-indigo-600';
    } else if (winObj.type === 'narrative') {
        title = winObj.title;
        icon = winObj.icon;
        color = 'text-orange-500';
    } else if (winObj.type === 'ai-tool') {
        title = winObj.title;
        icon = winObj.icon;
        color = 'text-purple-600';
    } else if (winObj.type === 'programmer') {
        title = winObj.title;
        icon = winObj.icon;
        color = 'text-blue-600';
    }

    const winEl = document.createElement('div');
    winEl.id = `window-${winObj.id}`;
    winEl.className = 'window neumorph-out pop-in pointer-events-auto';
    
    winEl.style.width = config.width ? `${config.width}px` : '600px';
    winEl.style.height = config.height ? `${config.height}px` : '450px';
    winEl.style.left = `${winObj.x}px`;
    winEl.style.top = `${winObj.y}px`;
    winEl.style.zIndex = winObj.zIndex;

    let contentHTML = `<div class="content-loader w-full h-full flex items-center justify-center text-gray-400">Cargando...</div>`;

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
        <div class="content-area flex-1 bg-gray-100 relative rounded-b-[20px] overflow-hidden flex flex-col">
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
        
        // Restaurar tamaños según tipo
        if (winObj.type === 'book') {
            el.style.width = '700px';
            el.style.height = '600px';
        } else if (winObj.type === 'narrative') {
            el.style.width = '500px';
            el.style.height = '400px';
        } else if (winObj.type === 'ai-tool' || winObj.type === 'programmer') {
            el.style.width = '700px';
            el.style.height = '600px';
        } else if (winObj.type === 'config') {
             el.style.width = '400px';
             el.style.height = '350px';
        } else {
            el.style.width = '600px'; 
            el.style.height = '450px';
        }
    }
}

function renderDock() {
    const dockContainer = document.getElementById('dock-items');
    if (!dockContainer) return;

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

    if (window.lucide) lucide.createIcons();
}