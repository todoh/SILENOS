/* SILENOS 3/window-core.js */
// --- NÚCLEO DE GESTIÓN DE VENTANAS (DOM, FOCO Y ESTADOS) ---

function createWindowDOM(winObj, config) {
    const container = document.getElementById('windows-container');
    
    // CORRECCIÓN: Prioridad en winObj.title
    let title = winObj.title || config.title || "Ventana";
    let icon = winObj.icon || config.icon || "box";
    let color = winObj.color || config.color || "text-gray-600";

    // Mapeo dinámico de colores y estilos según el tipo (F -> Forma)
    const typeConfigs = {
        'folder': { color: 'text-blue-500' },
        'data': { color: 'text-green-600' },
        'image': { color: 'text-blue-400' },
        'book': { color: 'text-indigo-600' },
        'narrative': { color: 'text-orange-500' },
        'ai-tool': { color: 'text-purple-600' },
        'programmer': { color: 'text-purple-600' },
        'storage-tool': { color: 'text-indigo-600' },
        'program-runner': { color: 'text-green-600' }
    };

    if (typeConfigs[winObj.type]) {
        color = typeConfigs[winObj.type].color;
    }

    const winEl = document.createElement('div');
    winEl.id = `window-${winObj.id}`;
    winEl.className = 'window neumorph-out pop-in pointer-events-auto flex flex-col';
    
    winEl.style.width = config.width ? `${config.width}px` : '600px';
    winEl.style.height = config.height ? `${config.height}px` : '450px';
    winEl.style.left = `${winObj.x}px`;
    winEl.style.top = `${winObj.y}px`;
    winEl.style.zIndex = winObj.zIndex;

    winEl.innerHTML = `
        <div class="window-header h-10 flex items-center justify-between px-4 select-none bg-[#e0e5ec] rounded-t-[20px] shrink-0"
             onmousedown="startWindowDrag(event, '${winObj.id}')">
            <div class="flex items-center gap-2 text-gray-600 font-bold text-sm">
                <i data-lucide="${icon}" class="${color} w-4 h-4"></i>
                <span class="truncate max-w-[200px]">${title}</span>
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
            <div class="w-full h-full flex items-center justify-center text-gray-400">Cargando...</div>
        </div>
    `;

    winEl.addEventListener('mousedown', () => focusWindow(winObj.id));
    container.appendChild(winEl);
}

function closeApp(id) {
    const el = document.getElementById(`window-${id}`);
    if (el) el.remove();
    openWindows = openWindows.filter(w => w.id !== id);
    if (typeof renderDock === 'function') renderDock();
}

function focusWindow(id) {
    zIndexCounter++;
    const winObj = openWindows.find(w => w.id === id);
    if (winObj) {
        winObj.zIndex = zIndexCounter;
        const el = document.getElementById(`window-${id}`);
        if (el) el.style.zIndex = winObj.zIndex;
        if (typeof renderDock === 'function') renderDock();
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
    if (typeof renderDock === 'function') renderDock();
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
        
        const sizes = {
            'book': { w: 700, h: 600 },
            'narrative': { w: 500, h: 400 },
            'ai-tool': { w: 700, h: 600 },
            'programmer': { w: 700, h: 600 },
            'config': { w: 400, h: 350 },
            'default': { w: 600, h: 450 }
        };

        const size = sizes[winObj.type] || sizes.default;
        el.style.width = `${size.w}px`;
        el.style.height = `${size.h}px`;
    }
}