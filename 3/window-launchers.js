/* SILENOS 3/window-launchers.js */
// --- LANZADORES DE APLICACIONES Y VENTANAS ---

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

// Renderizado de contenido de carpeta (Helper para el launcher)
function renderFolderContent(windowId, folderId) {
    const winContent = document.querySelector(`#window-${windowId} .content-area`);
    if (!winContent) return;

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
        el.className = `flex flex-col items-center gap-2 w-24 cursor-pointer relative ${item.type === 'folder' ? 'folder-drop-zone' : ''}`;
        el.dataset.id = item.id;
        
        el.onmousedown = (e) => {
             if (e.target.tagName !== 'INPUT') startIconDrag(e, item.id, folderId);
        };

        el.innerHTML = `
            <div class="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition-all">
                <i data-lucide="${item.icon}" class="${item.color} w-7 h-7"></i>
            </div>
            <span 
                class="text-xs text-gray-600 text-center truncate w-full hover:bg-black/5 rounded px-1 cursor-text select-none"
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

// Abrir Ventana de Datos
function openDataWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    // Redirecciones por tipo
    if (file.type === 'book') { openBookWindow(fileId); return; }
    if (file.type === 'narrative') { openNarrativeWindow(fileId); return; }
    if (file.type === 'program') { openProgrammerWindow(fileId); return; } // [NUEVO]

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
    
    // Renderizado del contenido
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

// [NUEVO] Abrir Ventana Programador (Ahora acepta fileId)
function openProgrammerWindow(fileId = null) {
    // Si viene de archivo, usamos su ID. Si no, usamos 'programmer-app' genérico.
    const winId = fileId || 'programmer-app'; 
    
    // Obtener título real si es archivo
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
        icon: 'cpu', // Icono CPU para distinguir
        zIndex: zIndexCounter,
        isMinimized: false,
        isMaximized: false,
        fileId: fileId, // Guardamos referencia
        x: window.innerWidth / 2 - 400,
        y: window.innerHeight / 2 - 300
    };

    createWindowDOM(winObj, { width: 800, height: 600, color: 'text-purple-500' });
    openWindows.push(winObj);
    renderDock();
    if (window.lucide) lucide.createIcons();
    
    // Delegar renderizado a la clase Manager
    if (typeof ProgrammerManager !== 'undefined') {
        ProgrammerManager.renderInWindow(winId, fileId);
    }
}

// Abrir App Generica
function openApp(appId) {
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