/* SILENOS 3/window-manager.js */
// --- GESTIÓN DE VENTANAS (APPS + CARPETAS + DATOS + LIBROS + IA + IMÁGENES + CONFIG) ---

// --- 1. APERTURA DE VENTANAS POR TIPO ---

// Abrir Carpeta
function openFolderWindow(folderId) {
    const folder = FileSystem.getItem(folderId);
    if (!folder) return;

    const existing = openWindows.find(w => w.id === folderId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(folderId);
        focusWindow(folderId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: folderId,
        appId: 'folder-manager',
        type: 'folder', 
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
    if (window.lucide) lucide.createIcons();
    
    renderFolderContent(folderId, folderId);
}

// Visor de Imágenes
function openImageWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    const existing = openWindows.find(w => w.id === fileId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(fileId);
        focusWindow(fileId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: fileId,
        appId: 'image-viewer',
        type: 'image',
        fileId: fileId,
        title: file.title,
        icon: 'image',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: 150 + (openWindows.length * 20),
        y: 150 + (openWindows.length * 20)
    };

    createWindowDOM(winObj, { width: 450, height: 450, color: 'text-blue-400' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();

    const winContent = document.querySelector(`#window-${fileId} .content-area`);
    if (winContent) {
        winContent.innerHTML = `
            <div class="w-full h-full bg-[#1e1e1e] flex items-center justify-center p-4 overflow-auto">
                <img src="${file.content}" class="max-w-full max-h-full shadow-2xl rounded-lg object-contain">
            </div>
        `;
    }
}

// Ventana Terminal (Programas en modo consola)
function openTerminalWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    const winId = 'term-' + fileId;

    const existing = openWindows.find(w => w.id === winId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(winId);
        focusWindow(winId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: winId,
        appId: 'terminal-runner',
        type: 'program-runner',
        fileId: fileId,
        title: ">_ " + file.title,
        icon: 'terminal',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: window.innerWidth / 2 - 200,
        y: window.innerHeight / 2 - 150
    };

    createWindowDOM(winObj, { width: 500, height: 350, color: 'text-gray-400' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();

    const winContent = document.querySelector(`#window-${winId} .content-area`);
    if (winContent) {
        winContent.innerHTML = `
            <div class="flex flex-col h-full bg-black text-green-500 font-mono text-xs p-2">
                <div class="flex justify-between border-b border-gray-800 pb-2 mb-2">
                    <span>ESTADO: <span id="runner-status-${winId}" class="text-yellow-500">Iniciando...</span></span>
                    <span class="opacity-50">AUTO-EXEC</span>
                </div>
                <div id="runner-console-${winId}" class="flex-1 overflow-y-auto custom-scrollbar p-1">
                    <div>> Cargando módulos...</div>
                </div>
            </div>
        `;

        setTimeout(() => {
            if (typeof ProgrammerManager !== 'undefined') {
                ProgrammerManager.runHeadless(winId, fileId);
            } else {
                const con = document.getElementById(`runner-console-${winId}`);
                if(con) con.innerHTML += "<div class='text-red-500'>Error: ProgrammerManager no encontrado.</div>";
            }
        }, 500);
    }
}

// Abrir Ventana de Datos
function openDataWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    if (file.type === 'image') { openImageWindow(fileId); return; }
    if (file.type === 'book') { openBookWindow(fileId); return; }
    if (file.type === 'narrative') { openNarrativeWindow(fileId); return; }
    
    if (file.type === 'executable') { 
        if (typeof ProgrammerManager !== 'undefined') {
            ProgrammerManager.runHeadless(null, fileId);
        }
        return;
    }
    
    if (file.type === 'program') { openProgramRunnerWindow(fileId); return; }

    const existing = openWindows.find(w => w.id === fileId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(fileId);
        focusWindow(fileId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: fileId,
        appId: 'data-viewer', 
        type: 'data',         
        fileId: fileId,
        title: file.title,
        icon: file.icon || 'file-json',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: 120 + (openWindows.length * 30),
        y: 120 + (openWindows.length * 30)
    };

    createWindowDOM(winObj, { width: 600, height: 500, color: 'text-green-600' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();

    if (typeof DataViewer !== 'undefined' && DataViewer.renderInWindow) {
        DataViewer.renderInWindow(fileId, fileId);
    }
}

function openProgramRunnerWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    const winId = 'runner-' + fileId;
    const existing = openWindows.find(w => w.id === winId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(winId);
        focusWindow(winId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: winId,
        appId: 'program-runner',
        type: 'program-runner',
        fileId: fileId,
        title: file.title,
        icon: 'play-circle',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: window.innerWidth / 2 - 250,
        y: window.innerHeight / 2 - 250
    };

    createWindowDOM(winObj, { width: 500, height: 500, color: 'text-green-600' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();

    if (typeof ProgrammerManager !== 'undefined') {
        ProgrammerManager.renderRunnerInWindow(winId, fileId);
    }
}

// Abrir Ventana de Libro
function openBookWindow(bookId) {
    const book = FileSystem.getItem(bookId);
    if (!book) return;

    const existing = openWindows.find(w => w.id === bookId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(bookId);
        focusWindow(bookId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: bookId,
        appId: 'book-manager', 
        type: 'book',
        fileId: bookId,
        title: book.title,
        icon: book.icon || 'book',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: 80 + (openWindows.length * 30),
        y: 80 + (openWindows.length * 30)
    };

    createWindowDOM(winObj, { width: 700, height: 600, color: 'text-indigo-600' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();

    if (typeof BookManager !== 'undefined' && BookManager.renderInWindow) {
        BookManager.renderInWindow(bookId, bookId);
    }
}

// Abrir Ventana de Dato Narrativo
function openNarrativeWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    const existing = openWindows.find(w => w.id === fileId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(fileId);
        focusWindow(fileId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: fileId,
        appId: 'narrative-manager', 
        type: 'narrative', 
        fileId: fileId,
        title: file.title,
        icon: file.icon || 'sticky-note',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: 150 + (openWindows.length * 30),
        y: 150 + (openWindows.length * 30)
    };

    createWindowDOM(winObj, { width: 500, height: 400, color: 'text-orange-500' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();

    if (typeof NarrativeManager !== 'undefined') {
        NarrativeManager.renderInWindow(fileId, fileId);
    }
}

// Abrir Ventana de Configuración
function openConfigWindow() {
    const id = 'config-window';
    const existing = openWindows.find(w => w.id === id);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(id);
        focusWindow(id);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: id,
        appId: 'config',
        type: 'config',
        title: "Configuración",
        icon: 'settings',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: window.innerWidth / 2 - 200,
        y: window.innerHeight / 2 - 175
    };

    createWindowDOM(winObj, { width: 400, height: 350, color: 'text-gray-600' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();

    const winContent = document.querySelector(`#window-${id} .content-area`);
    if (winContent) {
        let currentKeys = '';
        if (typeof AIService !== 'undefined' && AIService.apiKeys) {
            currentKeys = AIService.apiKeys.join(',');
        }

        winContent.innerHTML = `
            <div class="p-6 flex flex-col gap-6 bg-[#f3f4f6] h-full">
                <div class="flex items-center gap-2 border-b border-gray-300 pb-2">
                    <i data-lucide="cpu" class="w-5 h-5 text-gray-500"></i>
                    <h3 class="text-sm font-bold text-gray-700">Ajustes del Sistema</h3>
                </div>
                
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Gemini API Keys (CSV)</label>
                    <input type="password" id="config-api-keys" 
                        class="neumorph-in p-3 text-xs outline-none text-gray-600 font-mono tracking-wide" 
                        placeholder="Pegar keys separadas por coma..." 
                        value="${currentKeys}"
                        onchange="if(typeof AIService !== 'undefined') { AIService.setApiKeys(this.value); this.style.borderColor = '#22c55e'; setTimeout(() => this.style.borderColor = 'transparent', 1000); }">
                    <p class="text-[10px] text-gray-400 leading-relaxed">
                        Las claves se guardan en LocalStorage. Necesarias para el AIService.
                    </p>
                </div>

                <div class="mt-auto flex justify-end">
                    <button onclick="closeApp('${id}')" class="neumorph-btn px-6 py-2 text-xs font-bold text-gray-600 hover:text-gray-800">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

// Abrir Ventana Creador IA
function openAICreatorWindow() {
    const id = 'ai-creator-app';
    const existing = openWindows.find(w => w.id === id);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(id);
        focusWindow(id);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: id,
        appId: 'ai-creator', 
        type: 'ai-tool',
        title: "Generador de Guiones IA",
        icon: 'clapperboard',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: window.innerWidth / 2 - 350,
        y: window.innerHeight / 2 - 300
    };

    createWindowDOM(winObj, { width: 700, height: 600, color: 'text-purple-600' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();
    
    const winContent = document.querySelector(`#window-${id} .content-area`);
    if(winContent) {
        winContent.innerHTML = `
            <div class="flex h-full bg-[#f3f4f6]">
                <div class="w-1/2 p-4 flex flex-col gap-4 border-r border-gray-300">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-gray-500 uppercase">Idea / Tema</label>
                        <textarea id="ai-prompt-input" class="w-full h-24 neumorph-in p-2 text-sm outline-none resize-none" 
                            placeholder="Ej: Una historia de ciencia ficción sobre..."></textarea>
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-gray-500 uppercase">Número de Capítulos</label>
                        <input type="number" id="ai-chapters-input" value="5" min="1" max="20"
                            class="w-full neumorph-in p-2 text-sm outline-none font-bold text-gray-700">
                    </div>

                    <div class="flex flex-col gap-1 flex-1 min-h-0">
                        <label class="text-xs font-bold text-gray-500 uppercase flex justify-between">
                            Contexto (Arrastra aquí)
                            <button onclick="AIWorker.clearContext()" class="text-[10px] text-blue-500 hover:underline">Limpiar</button>
                        </label>
                        <div id="ai-context-drop" class="ai-drop-zone flex-1 neumorph-in rounded-xl p-2 overflow-y-auto border-2 border-dashed border-transparent transition-colors">
                            <div id="ai-context-list" class="flex flex-col">
                                <div class="text-xs text-gray-400 italic p-2 text-center mt-4">
                                    Arrastra archivos de datos<br>o carpetas enteras aquí
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onclick="const p = document.getElementById('ai-prompt-input').value; const c = document.getElementById('ai-chapters-input').value; AIWorker.createJob(p, c);" 
                        class="neumorph-btn py-3 text-purple-600 font-bold hover:text-purple-700 active:scale-95 transition-transform">
                        GENERAR GUION
                    </button>
                </div>

                <div class="w-1/2 p-4 bg-gray-50 flex flex-col">
                     <label class="text-xs font-bold text-gray-500 uppercase mb-2">Cola de Generación</label>
                     <div id="ai-queue-list" class="flex-1 overflow-y-auto pr-1">
                        </div>
                </div>
            </div>
        `;
        
        if (typeof AIWorker !== 'undefined') {
            AIWorker.renderContextList();
            AIWorker.renderQueue();
        }
    }
}

// Abrir Ventana Programador
function openProgrammerWindow(fileId = null) {
    const winId = fileId || 'programmer-app';
    let winTitle = "Programador de Flujo";
    if (fileId) {
        const file = FileSystem.getItem(fileId);
        if (file) winTitle = file.title;
    }

    const existing = openWindows.find(w => w.id === winId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(winId);
        focusWindow(winId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: winId,
        appId: 'programmer', 
        type: 'programmer',
        title: winTitle,
        icon: 'cpu',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        fileId: fileId,
        x: window.innerWidth / 2 - 400,
        y: window.innerHeight / 2 - 300
    };

    createWindowDOM(winObj, { width: 800, height: 600, color: 'text-purple-600' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();
    
    if (typeof ProgrammerManager !== 'undefined') {
        ProgrammerManager.renderInWindow(winId, fileId);
    }
}

// --- 2. RENDERIZADO DE CONTENIDO DE CARPETAS ---

function renderFolderContent(windowId, folderId) {
    const winContent = document.querySelector(`#window-${windowId} .content-area`);
    if (!winContent) return;

    winContent.innerHTML = `
        <div class="folder-window-content w-full h-full p-4 flex flex-wrap content-start gap-4 overflow-y-auto" data-folder-id="${folderId}">
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
        el.className = `flex flex-col items-center gap-2 w-24 cursor-pointer relative ${item.type === 'folder' ? 'folder-drop-zone' : ''}`;
        el.dataset.id = item.id;
        
        el.onmousedown = (e) => {
             if (e.target.tagName !== 'INPUT') startIconDrag(e, item.id, folderId);
        };

        let iconContent = `<i data-lucide="${item.icon}" class="${item.color} w-7 h-7"></i>`;
        if (item.type === 'image' && item.content) {
            iconContent = `<img src="${item.content}" class="w-full h-full object-cover rounded-lg pointer-events-none shadow-sm">`;
        }

        el.innerHTML = `
            <div class="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition-all overflow-hidden p-0">
                ${iconContent}
            </div>
            <span 
                class="text-xs text-gray-600 text-center line-clamp-2 break-words w-full hover:bg-black/5 rounded px-1 cursor-text select-none font-bold"
                onmousedown="event.stopPropagation()"
                onclick="showRenameModal(event, '${item.id}', '${item.title}')"
            >
                ${item.title}
            </span>
        `;
        container.appendChild(el);
    });
    if (window.lucide) lucide.createIcons();
}

// --- 3. NÚCLEO DE GESTIÓN DE VENTANAS (DOM, FOCO Y ESTADOS) ---

function openApp(appId) {
    if (appId === 'storage-tool') {
        openStorageWindow();
        return;
    }

    const app = APPS.find(a => a.id === appId);
    if (!app) return;
    
    const existingWindow = openWindows.find(w => w.id === appId);
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
    if (window.lucide) lucide.createIcons();
}

function createWindowDOM(winObj, config) {
    const container = document.getElementById('windows-container');
    
    // CORRECCIÓN CRÍTICA: Priorizar winObj sobre config
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

function openStorageWindow() {
    const id = 'storage-app';
    const existing = openWindows.find(w => w.id === id);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(id);
        focusWindow(id);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: id,
        appId: 'storage-tool',
        type: 'storage-tool',
        title: "Almacenamiento",
        icon: 'hard-drive',
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        x: window.innerWidth / 2 - 250,
        y: window.innerHeight / 2 - 300
    };

    createWindowDOM(winObj, { width: 500, height: 600, color: 'text-indigo-600' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();

    if (typeof ImportManager !== 'undefined') {
        ImportManager.renderInWindow(id);
    }
}