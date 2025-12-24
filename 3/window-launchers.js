/* SILENOS 3/window-launchers.js */
// --- LANZADORES DE APLICACIONES Y VENTANAS (LOGICA DE NEGOCIO) ---

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
    if (typeof renderDock === 'function') renderDock();
    if (window.lucide) lucide.createIcons();
    
    renderFolderContent(folderId, folderId);
}

function renderFolderContent(windowId, folderId) {
    // CORRECCIÓN: Selección robusta del contenedor
    const winEl = document.getElementById(`window-${windowId}`);
    const winContent = winEl ? winEl.querySelector('.content-area') : null;
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
            <span class="text-xs text-gray-600 text-center line-clamp-2 break-words w-full font-bold px-1"
                onclick="showRenameModal(event, '${item.id}', '${item.title}')">${item.title}</span>
        `;
        container.appendChild(el);
    });
    if (window.lucide) lucide.createIcons();
}

function openDataWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    if (file.type === 'image') { openImageWindow(fileId); return; }
    if (file.type === 'book') { openBookWindow(fileId); return; }
    if (file.type === 'narrative') { openNarrativeWindow(fileId); return; }
    
    if (file.type === 'executable') { 
        if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.runHeadless(null, fileId);
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
        id: fileId, appId: 'data-viewer', type: 'data', fileId: fileId,
        title: file.title, icon: file.icon || 'file-json', zIndex: zIndexCounter,
        isMinimized: false, isMaximized: false, x: 120, y: 120
    };

    createWindowDOM(winObj, { width: 600, height: 500, color: 'text-green-600' });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();
    if (window.lucide) lucide.createIcons();

    if (typeof DataViewer !== 'undefined' && DataViewer.renderInWindow) {
        DataViewer.renderInWindow(fileId, fileId);
    }
}

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
    const winObj = { id: fileId, appId: 'image-viewer', type: 'image', fileId: fileId, title: file.title, icon: 'image', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 150, y: 150 };

    createWindowDOM(winObj, { width: 450, height: 450 });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();

    // CORRECCIÓN: Selección robusta que soporta puntos en el ID
    const winEl = document.getElementById(`window-${fileId}`);
    const winContent = winEl ? winEl.querySelector('.content-area') : null;
    
    if (winContent) {
        winContent.innerHTML = `<div class="w-full h-full bg-[#1e1e1e] flex items-center justify-center p-4 overflow-auto">
            <img src="${file.content}" class="max-w-full max-h-full shadow-2xl rounded-lg object-contain">
        </div>`;
    }
}

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
        id: winId, appId: 'terminal-runner', type: 'program-runner', fileId: fileId,
        title: ">_ " + file.title, icon: 'terminal', zIndex: zIndexCounter,
        isMinimized: false, isMaximized: false, x: 200, y: 200
    };

    createWindowDOM(winObj, { width: 500, height: 350, color: 'text-gray-400' });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();

    const winEl = document.getElementById(`window-${winId}`);
    const winContent = winEl ? winEl.querySelector('.content-area') : null;
    if (winContent) {
        winContent.innerHTML = `
            <div class="flex flex-col h-full bg-black text-green-500 font-mono text-xs p-2">
                <div class="flex justify-between border-b border-gray-800 pb-2 mb-2">
                    <span>ESTADO: <span id="runner-status-${winId}" class="text-yellow-500">Iniciando...</span></span>
                </div>
                <div id="runner-console-${winId}" class="flex-1 overflow-y-auto custom-scrollbar p-1">
                    <div>> Cargando módulos...</div>
                </div>
            </div>
        `;
        setTimeout(() => {
            if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.runHeadless(winId, fileId);
        }, 500);
    }
}

function openProgramRunnerWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    const winId = 'runner-' + fileId;
    
    const existing = openWindows.find(w => w.id === winId);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(winId);
        focusWindow(winId);
        return;
    }

    zIndexCounter++;
    const winObj = { id: winId, appId: 'program-runner', type: 'program-runner', fileId: fileId, title: file.title, icon: 'play-circle', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 200, y: 100 };

    createWindowDOM(winObj, { width: 500, height: 500 });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();
    if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.renderRunnerInWindow(winId, fileId);
}

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
    const winObj = { id: winId, appId: 'programmer', type: 'programmer', title: winTitle, icon: 'cpu', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, fileId: fileId, x: 100, y: 100 };

    createWindowDOM(winObj, { width: 800, height: 600 });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();
    if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.renderInWindow(winId, fileId);
}

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
    const winObj = { id: bookId, appId: 'book-manager', type: 'book', fileId: bookId, title: book.title, icon: 'book', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 80, y: 80 };

    createWindowDOM(winObj, { width: 700, height: 600 });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();
    if (typeof BookManager !== 'undefined') BookManager.renderInWindow(bookId, bookId);
}

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
    const winObj = { id: fileId, appId: 'narrative-manager', type: 'narrative', fileId: fileId, title: file.title, icon: 'sticky-note', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 150, y: 150 };

    createWindowDOM(winObj, { width: 500, height: 400 });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();
    if (typeof NarrativeManager !== 'undefined') NarrativeManager.renderInWindow(fileId, fileId);
}

function openAICreatorWindow() {
    const id = 'ai-creator-app';
    const existing = openWindows.find(w => w.id === id);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(id);
        focusWindow(id);
        return;
    }

    zIndexCounter++;
    const winObj = { id: id, appId: 'ai-creator', type: 'ai-tool', title: "Generador de Guiones IA", icon: 'clapperboard', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 200, y: 100 };

    createWindowDOM(winObj, { width: 700, height: 600 });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();
    
    const winEl = document.getElementById(`window-${id}`);
    const winContent = winEl ? winEl.querySelector('.content-area') : null;
    if (winContent) {
        winContent.innerHTML = `
            <div class="flex h-full bg-[#f3f4f6]">
                <div class="w-1/2 p-4 flex flex-col gap-4 border-r border-gray-300">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-gray-500 uppercase">Idea / Tema</label>
                        <textarea id="ai-prompt-input" class="w-full h-24 neumorph-in p-2 text-sm outline-none resize-none" placeholder="Ej: Una historia de ciencia ficción sobre..."></textarea>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-gray-500 uppercase">Capítulos</label>
                        <input type="number" id="ai-chapters-input" value="5" class="w-full neumorph-in p-2 text-sm outline-none">
                    </div>
                    <div id="ai-context-drop" class="ai-drop-zone flex-1 neumorph-in rounded-xl p-2 overflow-y-auto border-2 border-dashed border-transparent">
                        <div id="ai-context-list" class="flex flex-col"></div>
                    </div>
                    <button onclick="AIWorker.createJob(document.getElementById('ai-prompt-input').value, document.getElementById('ai-chapters-input').value);" class="neumorph-btn py-3 text-purple-600 font-bold">GENERAR GUION</button>
                </div>
                <div class="w-1/2 p-4 bg-gray-50 flex flex-col">
                     <div id="ai-queue-list" class="flex-1 overflow-y-auto"></div>
                </div>
            </div>
        `;
        if (typeof AIWorker !== 'undefined') {
            AIWorker.renderContextList();
            AIWorker.renderQueue();
        }
    }
}

function openConfigWindow() {
    const id = 'config-window';
    const existing = openWindows.find(w => w.id === id);
    if (existing) {
        if (existing.isMinimized) toggleMinimize(id);
        focusWindow(id);
        return;
    }

    zIndexCounter++;
    const winObj = { id: id, appId: 'config', type: 'config', title: "Configuración", icon: 'settings', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 200, y: 200 };

    createWindowDOM(winObj, { width: 400, height: 350 });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();

    const winEl = document.getElementById(`window-${id}`);
    const winContent = winEl ? winEl.querySelector('.content-area') : null;
    if (winContent) {
        let currentKeys = '';
        if (typeof AIService !== 'undefined' && AIService.apiKeys) currentKeys = AIService.apiKeys.join(',');

        winContent.innerHTML = `
            <div class="p-6 flex flex-col gap-6 bg-[#f3f4f6] h-full">
                <div class="flex items-center gap-2 border-b border-gray-300 pb-2">
                    <i data-lucide="cpu" class="w-5 h-5 text-gray-500"></i>
                    <h3 class="text-sm font-bold text-gray-700">Ajustes del Sistema</h3>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Gemini API Keys (CSV)</label>
                    <input type="password" id="config-api-keys" class="neumorph-in p-3 text-xs outline-none" placeholder="Keys..." value="${currentKeys}"
                        onchange="if(typeof AIService !== 'undefined') AIService.setApiKeys(this.value)">
                </div>
                <div class="mt-auto flex justify-end">
                    <button onclick="closeApp('${id}')" class="neumorph-btn px-6 py-2 text-xs font-bold text-gray-600">Cerrar</button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
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
    const winObj = { id: id, appId: 'storage-tool', type: 'storage-tool', title: "Almacenamiento", icon: 'hard-drive', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 200, y: 150 };

    createWindowDOM(winObj, { width: 500, height: 600 });
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();
    if (typeof ImportManager !== 'undefined') ImportManager.renderInWindow(id);
}

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
    const winObj = { id: appId, appId: appId, type: 'app', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 50, y: 50 };

    createWindowDOM(winObj, app);
    openWindows.push(winObj);
    if (typeof renderDock === 'function') renderDock();
    if (window.lucide) lucide.createIcons();
}