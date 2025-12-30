/* SILENOS 3/window-launchers.js */
// --- B -> VISIÓN: LANZADORES ESPECIALIZADOS POR TIPO DE MATERIA (M) ---

function openProgrammerWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    const winId = 'prog-' + fileId;
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
        fileId: fileId, 
        title: "Editor: " + file.title, 
        icon: 'cpu', 
        zIndex: zIndexCounter, 
        isMinimized: false,
        isMaximized: false,
        x: 50 + (openWindows.length * 20), 
        y: 50 + (openWindows.length * 20) 
    };

    createWindowDOM(winObj, { width: 900, height: 650 });
    openWindows.push(winObj);
    
    if (typeof ProgrammerManager !== 'undefined') {
        ProgrammerManager.renderInWindow(winId, fileId);
    }
    
    if (typeof renderDock === 'function') renderDock();
    if (window.lucide) lucide.createIcons();
}

function openDataWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    // Enrutamiento por tipo de archivo
    if (file.type === 'folder') { openFolderWindow(fileId); return; }
    if (file.type === 'image') { openImageWindow(fileId); return; }
    if (file.type === 'book') { openBookWindow(fileId); return; }
    if (file.type === 'narrative') { openNarrativeWindow(fileId); return; }
    if (file.type === 'html') { openHTMLWindow(fileId); return; } // Soporte HTML
    if (file.type === 'executable') { if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.runHeadless(null, fileId); return; }
    if (file.type === 'program') { openProgramRunnerWindow(fileId); return; }

    // Fallback: Visor de Datos Genérico (Editor de Texto/JSON)
    const existing = openWindows.find(w => w.id === fileId);
    if (existing) { if (existing.isMinimized) toggleMinimize(fileId); focusWindow(fileId); return; }

    zIndexCounter++;
    const winObj = { id: fileId, appId: 'data-viewer', type: 'data', fileId: fileId, title: file.title, icon: file.icon || 'file-json', zIndex: zIndexCounter, isMinimized: false, isMaximized: false, x: 120 + (openWindows.length * 30), y: 120 + (openWindows.length * 30) };
    createWindowDOM(winObj, { width: 600, height: 500 });
    openWindows.push(winObj);
    if (typeof DataViewer !== 'undefined') DataViewer.renderInWindow(fileId, fileId);
    if (typeof renderDock === 'function') renderDock();
    if (window.lucide) lucide.createIcons();
}

function openFolderWindow(folderId) {
    const folder = FileSystem.getItem(folderId);
    if (!folder) return;
    const existing = openWindows.find(w => w.id === folderId);
    if (existing) { if (existing.isMinimized) toggleMinimize(folderId); focusWindow(folderId); return; }

    zIndexCounter++;
    const winObj = { id: folderId, type: 'folder', folderId: folderId, title: folder.title, icon: 'folder-open', zIndex: zIndexCounter, x: 100 + (openWindows.length * 30), y: 100 + (openWindows.length * 30) };
    createWindowDOM(winObj, { width: 500, height: 400 });
    openWindows.push(winObj);
    renderFolderContent(folderId, folderId);
    if (typeof renderDock === 'function') renderDock();
}

async function renderFolderContent(windowId, folderId) {
    const winContent = document.querySelector(`#window-${windowId} .content-area`);
    if (!winContent) return;
    winContent.innerHTML = `<div class="folder-window-content w-full h-full p-4 flex flex-wrap content-start gap-4 overflow-y-auto" data-folder-id="${folderId}"></div>`;
    const container = winContent.querySelector('.folder-window-content');
    const items = FileSystem.getItems(folderId);

    for (const item of items) {
        const el = document.createElement('div');
        el.className = `flex flex-col items-center gap-2 w-24 cursor-pointer relative ${item.type === 'folder' ? 'folder-drop-zone' : ''}`;
        el.dataset.id = item.id;
        el.onmousedown = (e) => { if (e.target.tagName !== 'INPUT') startIconDrag(e, item.id, folderId); };

        let iconContent = `<i data-lucide="${item.icon}" class="${item.color} w-7 h-7"></i>`;
        
        if (item.type === 'executable' || item.type === 'program') {
            const char = Array.from(item.title || " ")[0] || "⚙️";
            iconContent = `<span class="text-2xl font-black ${item.color} select-none">${char}</span>`;
        } else if (item.type === 'image' && item.content) {
            const blobUrl = await FileSystem.getImageUrl(item.content);
            if (blobUrl) iconContent = `<img src="${blobUrl}" class="w-full h-full object-cover rounded-lg pointer-events-none shadow-sm">`;
        } else if (item.type === 'html') {
             // Vista previa visual para HTML
             const letter = (item.title || 'H').charAt(0).toUpperCase();
             iconContent = `<div class="w-full h-full flex items-center justify-center font-black text-2xl text-orange-500">${letter}</div>`;
        }

        el.innerHTML = `
            <div class="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition-all overflow-hidden p-0">${iconContent}</div>
            <span class="text-xs text-gray-600 text-center line-clamp-3 break-words w-full font-bold px-1" onclick="showRenameModal(event, '${item.id}', '${item.title}')">${item.title}</span>`;
        container.appendChild(el);
    }
    if (window.lucide) lucide.createIcons();
}

async function openImageWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;
    const existing = openWindows.find(w => w.id === fileId);
    if (existing) { if (existing.isMinimized) toggleMinimize(fileId); focusWindow(fileId); return; }

    zIndexCounter++;
    const winObj = { id: fileId, type: 'image', title: file.title, icon: 'image', zIndex: zIndexCounter, x: 150 + (openWindows.length * 20), y: 150 + (openWindows.length * 20) };
    createWindowDOM(winObj, { width: 450, height: 450 });
    openWindows.push(winObj);

    const blobUrl = await FileSystem.getImageUrl(file.content);
    const winContent = document.querySelector(`#window-${fileId} .content-area`);
    if (winContent) {
        winContent.innerHTML = `<div class="w-full h-full bg-[#121212] flex items-center justify-center p-2 overflow-auto"><img src="${blobUrl || ''}" class="max-w-full max-h-full shadow-2xl rounded-md object-contain pointer-events-none"></div>`;
    }
    if (typeof renderDock === 'function') renderDock();
}

// --- NUEVA FUNCIÓN CORREGIDA: Ejecución de HTML sin Blob URL ---
async function openHTMLWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    const existing = openWindows.find(w => w.id === fileId);
    if (existing) { if (existing.isMinimized) toggleMinimize(fileId); focusWindow(fileId); return; }

    zIndexCounter++;
    const winObj = { 
        id: fileId, 
        type: 'html', 
        title: file.title, 
        icon: 'globe', 
        zIndex: zIndexCounter, 
        x: 100 + (openWindows.length * 30), 
        y: 100 + (openWindows.length * 30) 
    };

    // Ventana amplia para aplicaciones web
    createWindowDOM(winObj, { width: 900, height: 700 });
    openWindows.push(winObj);

    const winContent = document.querySelector(`#window-${fileId} .content-area`);
    if (winContent) {
        let htmlContent = "";
        
        // 1. Obtener el contenido HTML (Texto plano o desde Blob raw)
        if (file.content && typeof file.content === 'object' && file.content.text) {
            htmlContent = file.content.text;
        } else if (typeof file.content === 'string') {
             if (file.content.startsWith('/files/')) {
                 const blob = await FileSystem.getRawFile(file.content);
                 if (blob) htmlContent = await blob.text();
             } else {
                 htmlContent = file.content;
             }
        }

        // 2. Renderizar usando document.write en lugar de src="blob:..."
        // Esto mantiene el origen (origin) del padre, permitiendo que librerías como WebLLM
        // resuelvan URLs relativas correctamente sin errores de "Invalid URL".
        if (htmlContent) {
            winContent.innerHTML = ''; // Limpiar loader
            
            const iframe = document.createElement('iframe');
            iframe.className = "w-full h-full border-none bg-white";
            iframe.setAttribute('allow', 'accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write; display-capture; autoplay');
            
            // Importante: Adjuntar al DOM antes de escribir
            winContent.appendChild(iframe);
            
            try {
                const doc = iframe.contentWindow.document;
                doc.open();
                
                // Opcional: Reforzar la base URL para que sea idéntica al sistema
                // aunque en about:blank suele heredarla automáticamente.
                if (!htmlContent.includes('<base')) {
                    const baseTag = `<base href="${window.location.origin}/" />`;
                    if (htmlContent.includes('<head>')) {
                        htmlContent = htmlContent.replace('<head>', `<head>${baseTag}`);
                    } else {
                        htmlContent = `${baseTag}${htmlContent}`;
                    }
                }

                doc.write(htmlContent);
                doc.close();
            } catch (e) {
                console.error("Error escribiendo HTML en iframe:", e);
                winContent.innerHTML = `<div class="p-4 text-red-500 font-bold">Error de Ejecución: ${e.message}</div>`;
            }
        } else {
             winContent.innerHTML = `<div class="p-4 text-gray-400">El archivo está vacío o no se pudo leer.</div>`;
        }
    }

    if (typeof renderDock === 'function') renderDock();
}

function openTerminalWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    const winId = 'term-' + fileId;
    const existing = openWindows.find(w => w.id === winId);
    if (existing) { if (existing.isMinimized) toggleMinimize(winId); focusWindow(winId); return; }

    zIndexCounter++;
    const winObj = { id: winId, type: 'program-runner', title: ">_ " + file.title, icon: 'terminal', zIndex: zIndexCounter, x: 200, y: 200 };
    createWindowDOM(winObj, { width: 500, height: 350 });
    openWindows.push(winObj);

    const winContent = document.querySelector(`#window-${winId} .content-area`);
    if (winContent) {
        winContent.innerHTML = `<div class="flex h-full bg-black text-green-500 font-mono text-xs p-2"><div id="runner-console-${winId}" class="flex-1 overflow-y-auto"><div>> Iniciando...</div></div></div>`;
        setTimeout(() => { if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.runHeadless(winId, fileId); }, 500);
    }
    if (typeof renderDock === 'function') renderDock();
}

function openBookWindow(bookId) {
    const book = FileSystem.getItem(bookId);
    if (!book) return;
    const existing = openWindows.find(w => w.id === bookId);
    if (existing) { if (existing.isMinimized) toggleMinimize(bookId); focusWindow(bookId); return; }

    zIndexCounter++;
    const winObj = { id: bookId, type: 'book', title: book.title, icon: 'book', zIndex: zIndexCounter, x: 80, y: 80 };
    createWindowDOM(winObj, { width: 700, height: 600 });
    openWindows.push(winObj);
    if (typeof BookManager !== 'undefined') BookManager.renderInWindow(bookId, bookId);
    if (typeof renderDock === 'function') renderDock();
}

function openNarrativeWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;
    const existing = openWindows.find(w => w.id === fileId);
    if (existing) { if (existing.isMinimized) toggleMinimize(fileId); focusWindow(fileId); return; }

    zIndexCounter++;
    const winObj = { id: fileId, type: 'narrative', title: file.title, icon: 'sticky-note', zIndex: zIndexCounter, x: 150, y: 150 };
    createWindowDOM(winObj, { width: 500, height: 400 });
    openWindows.push(winObj);
    if (typeof NarrativeManager !== 'undefined') NarrativeManager.renderInWindow(fileId, fileId);
    if (typeof renderDock === 'function') renderDock();
}

function openProgramRunnerWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    const winId = 'runner-' + fileId;
    const existing = openWindows.find(w => w.id === winId);
    if (existing) { if (existing.isMinimized) toggleMinimize(winId); focusWindow(winId); return; }

    zIndexCounter++;
    const winObj = { id: winId, type: 'program-runner', title: file.title, icon: 'play-circle', zIndex: zIndexCounter, x: 200, y: 100 };
    createWindowDOM(winObj, { width: 500, height: 500 });
    openWindows.push(winObj);
    if (typeof ProgrammerManager !== 'undefined') ProgrammerManager.runHeadless(winId, fileId);
    if (typeof renderDock === 'function') renderDock();
}

function showRenameModal(e, itemId, oldTitle) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const existing = document.getElementById('rename-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'rename-modal';
    modal.className = 'fixed z-[10001] bg-[#e0e5ec]/95 backdrop-blur-md border border-white/50 shadow-2xl rounded-2xl p-4 pop-in';
    
    const x = e ? e.clientX : window.innerWidth / 2 - 100;
    const y = e ? e.clientY : window.innerHeight / 2 - 50;
    modal.style.left = `${Math.min(x, window.innerWidth - 250)}px`;
    modal.style.top = `${Math.min(y, window.innerHeight - 150)}px`;
    modal.style.width = '240px';

    modal.innerHTML = `
        <div class="flex flex-col gap-3">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Renombrar Materia</label>
            <input type="text" id="rename-input" value="${oldTitle}" 
                class="neumorph-in w-full p-3 text-xs font-bold text-gray-700 outline-none border-none"
                autocomplete="off">
            <div class="flex gap-2">
                <button id="rename-confirm" class="flex-1 py-2 bg-indigo-500 text-white text-[10px] font-bold rounded-lg shadow-lg active:scale-95 transition-transform">GUARDAR</button>
                <button id="rename-cancel" class="flex-1 py-2 bg-gray-200 text-gray-600 text-[10px] font-bold rounded-lg active:scale-95 transition-transform">CANCELAR</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const input = document.getElementById('rename-input');
    input.focus();
    input.select();

    const confirm = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== oldTitle) {
            FileSystem.updateItem(itemId, { title: newTitle });
            if (window.refreshSystemViews) window.refreshSystemViews();
            if (window.refreshAllViews) window.refreshAllViews();
        }
        modal.remove();
    };

    document.getElementById('rename-confirm').onclick = confirm;
    document.getElementById('rename-cancel').onclick = () => modal.remove();
    
    input.onkeydown = (ke) => {
        if (ke.key === 'Enter') confirm();
        if (ke.key === 'Escape') modal.remove();
    };
}