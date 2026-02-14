// --- MAIN.JS (EVENTS, CLIPBOARD & PROGRAMS LOGIC) ---

// Función auxiliar para detectar dónde pegar (Ventana activa o Escritorio)
function getActiveTargetHandle() {
    if (typeof WindowManager !== 'undefined' && WindowManager.windows.length > 0) {
        const visibleWindows = WindowManager.windows.filter(w => !w.minimized);
        if (visibleWindows.length > 0) {
            const topWindow = visibleWindows.reduce((prev, current) => 
                (prev.zIndex > current.zIndex) ? prev : current
            );
            if (topWindow.type === 'dir' && topWindow.handle) {
                console.log(`[PASTE TARGET]: Ventana '${topWindow.title}'`);
                return topWindow.handle;
            }
        }
    }
    console.log(`[PASTE TARGET]: Escritorio (Root)`);
    return window.currentHandle;
}

async function processClipboardItems(items, targetHandle = null) {
    log(`PROCESSING CLIPBOARD...`);
    let found = false;
    const destHandle = targetHandle || getActiveTargetHandle();
    
    if (!destHandle) {
        if (typeof showToast === 'function') showToast("Error: No directory mounted");
        return;
    }

    for (const item of items) {
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            if (blob.type.startsWith('image/')) {
                const ext = blob.type.split('/')[1] || 'png';
                const filename = generateFilename('IMG', ext); 
                await writeFileToSystem(filename, blob, true, destHandle);
                found = true;
            }
        } 
        else if (item.kind === 'string' && item.type === 'text/plain') {
            item.getAsString(async (text) => {
                if (!text.trim()) return;
                const type = detectTextType(text); 
                const filename = generateFilename(type.toUpperCase(), type);
                await writeFileToSystem(filename, text, false, destHandle);
            });
            found = true;
        }
    }
    if(!found && typeof showToast === 'function') showToast("Clipboard format not supported");
}

async function handleGlobalPaste() {
    if (!window.currentHandle) {
        if (typeof showToast === 'function') showToast('ERROR: Mount root first');
        return;
    }

    const targetHandle = getActiveTargetHandle();

    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
            for (const type of clipboardItem.types) {
                const blob = await clipboardItem.getType(type);
                const fakeItem = {
                    kind: type.startsWith('text') ? 'string' : 'file',
                    type: type,
                    getAsFile: () => blob,
                    getAsString: async (cb) => cb(await blob.text())
                };
                await processClipboardItems([fakeItem], targetHandle);
            }
        }
    } catch (err) {
        try {
            const text = await navigator.clipboard.readText();
            if(text) {
                const type = detectTextType(text);
                const filename = generateFilename(type.toUpperCase(), type);
                await writeFileToSystem(filename, text, false, targetHandle);
            }
        } catch (e) {
            log('CLIPBOARD ACCESS DENIED. Use Ctrl+V');
            if (typeof showToast === 'function') showToast("Click 'Allow' or use Ctrl+V");
        }
    }
}

async function handlePasteEvent(e) {
    if (!window.currentHandle) return;
    e.preventDefault();
    const targetHandle = getActiveTargetHandle();
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    await processClipboardItems(items, targetHandle);
}

// --- LÓGICA DEL BOTÓN PROGRAMAS ---

async function scanForHtmlFiles(dirHandle, path = '') {
    let htmlFiles = [];
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && (entry.name.endsWith('.html') || entry.name.endsWith('.htm'))) {
            htmlFiles.push({ entry, path: path + entry.name, parentHandle: dirHandle });
        } else if (entry.kind === 'directory') {
            const subFiles = await scanForHtmlFiles(entry, path + entry.name + '/');
            htmlFiles = htmlFiles.concat(subFiles);
        }
    }
    return htmlFiles;
}

async function handleOpenPrograms() {
    if (!window.rootHandle) {
        if(typeof showToast === 'function') showToast('ERROR: Monta el directorio raíz primero');
        return;
    }

    let programasHandle = null;
    let baseName = 'KOREH';
    
    try {
        // Intenta buscar la subcarpeta KOREH
        programasHandle = await window.rootHandle.getDirectoryHandle('KOREH');
    } catch (e) {
        // Si no la encuentra, asumimos que has montado KOREH como tu raíz y escaneamos desde ahí
        console.warn('Escaneando desde la carpeta raíz actual directamente...');
        programasHandle = window.rootHandle;
        baseName = window.rootHandle.name;
    }

    // Abrimos la ventana tipo "programs"
    const winId = WindowManager.openWindow('APP CENTER', null, 'programs');
    const container = document.getElementById(`win-programs-${winId}`);
    if (!container) return;

    // Escaneamos recursivamente
    const files = await scanForHtmlFiles(programasHandle);

    container.innerHTML = '';
    
    // Header Minimalista
    const header = document.createElement('div');
    header.className = 'text-sm tracking-widest font-bold border-b-2 border-black pb-3 mb-6 flex justify-between items-end';
    header.innerHTML = `
        <span>PROGRAMAS INSTALADOS</span> 
        <span class="text-[10px] text-gray-400 font-normal font-mono">${files.length} ITEMS</span>
    `;
    container.appendChild(header);

    if (files.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'text-xs font-mono text-gray-400 mt-4';
        emptyState.textContent = '// NO SE ENCONTRARON PROGRAMAS (.HTML)';
        container.appendChild(emptyState);
        return;
    }

    // Lista de Programas
    files.forEach(fileObj => {
        const item = document.createElement('div');
        item.className = 'group flex flex-col md:flex-row md:justify-between md:items-center p-4 mb-3 border border-gray-200 hover:border-black hover:shadow-sm bg-gray-50 hover:bg-white cursor-pointer transition-all';
        
        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-4 mb-2 md:mb-0';
        leftDiv.innerHTML = `
            <div class="w-10 h-10 bg-black text-white flex items-center justify-center font-bold text-[10px] group-hover:bg-red-600 transition-colors shrink-0">
                EXE
            </div>
        `;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'flex flex-col';
        
        const nameEl = document.createElement('span');
        nameEl.className = 'text-base font-bold tracking-tight';
        nameEl.textContent = fileObj.entry.name.replace(/\.html?$/i, '').toUpperCase();
        
        const pathEl = document.createElement('span');
        pathEl.className = 'text-[10px] text-gray-400 font-mono mt-1 break-all';
        pathEl.textContent = `/${baseName}/` + fileObj.path;
        
        textDiv.appendChild(nameEl);
        textDiv.appendChild(pathEl);
        leftDiv.appendChild(textDiv);

        const rightDiv = document.createElement('div');
        rightDiv.className = 'text-[10px] font-mono font-bold px-4 py-2 border border-black opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white shrink-0';
        rightDiv.textContent = 'ABRIR';

        item.appendChild(leftDiv);
        item.appendChild(rightDiv);

        item.onclick = () => {
            if (typeof handleOpenFile === 'function') {
                handleOpenFile(fileObj.entry, fileObj.parentHandle);
            }
        };

        container.appendChild(item);
    });
}

// --- EVENT LISTENERS GLOBALES ---

window.addEventListener('contextmenu', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
}, false);

// Solo declaramos los botones NUEVOS que no existen en ui.js
const btnSortTrigger = document.getElementById('btn-sort-trigger');
const btnProgramsTrigger = document.getElementById('btn-programs-trigger');
const btnClearWindows = document.getElementById('btn-clear-windows');

// Asignamos listeners a los botones declarados en ui.js (verificando si existen)
if(typeof btnSelectDir !== 'undefined' && btnSelectDir) btnSelectDir.addEventListener('click', initFileSystem);
if(typeof btnPasteTrigger !== 'undefined' && btnPasteTrigger) btnPasteTrigger.addEventListener('click', handleGlobalPaste);
if(typeof btnCreateFolder !== 'undefined' && btnCreateFolder) btnCreateFolder.addEventListener('click', handleCreateFolder);
if(typeof btnRefresh !== 'undefined' && btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
        if (window.currentHandle) {
            if (typeof Universe !== 'undefined') await Universe.loadDirectory(window.currentHandle);
            else if (typeof refreshFileTree === 'function') await refreshFileTree();
        }
    });
}

// Asignamos listeners a los botones nuevos
if(btnProgramsTrigger) btnProgramsTrigger.addEventListener('click', handleOpenPrograms);

if(btnSortTrigger) {
    btnSortTrigger.addEventListener('click', async () => {
        if (typeof Universe !== 'undefined' && Universe.initialized && window.currentHandle) {
            Universe.sortMode = Universe.sortMode === 'name' ? 'type' : 'name';
            if (typeof showToast === 'function') showToast(`REFRESH & SORT: ${Universe.sortMode.toUpperCase()}`);
            await Universe.loadDirectory(window.currentHandle);
        }
    });
}

if(btnClearWindows) {
    btnClearWindows.addEventListener('click', () => {
        if(typeof WindowManager !== 'undefined' && WindowManager.windows) {
            [...WindowManager.windows].forEach(w => WindowManager.closeWindow(w.id));
        }
    });
}

window.addEventListener('paste', handlePasteEvent);
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

if (!('showDirectoryPicker' in window)) {
    const errorMsg = document.getElementById('error-msg');
    if(errorMsg) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = "ALERTA: Navegador incompatible (Use Chrome/Edge).";
    }
}