// --- MAIN.JS (EVENTS, CLIPBOARD & PROGRAMS LOGIC) ---

// Bandera para evitar bucles infinitos de sincronización
window.isSyncing = false;

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

// --- LOGICA DE DESCARGA AUTOMÁTICA GITHUB (SMART SYNC) ---

async function checkFileExists(rootHandle, filePath) {
    const parts = filePath.split('/');
    const filename = parts.pop();
    let currentDir = rootHandle;

    try {
        // Navegar hasta la carpeta contenedora
        for (const part of parts) {
            currentDir = await currentDir.getDirectoryHandle(part);
        }
        // Intentar obtener el archivo
        await currentDir.getFileHandle(filename);
        return true; // Existe
    } catch (e) {
        return false; // No existe (o error de acceso)
    }
}

async function downloadGithubPrograms(rootHandle) {
    if (window.isSyncing) {
        console.log("SYNC: Ya hay una sincronización en curso. Omitiendo.");
        return;
    }

    window.isSyncing = true; 
    console.log("SYNC: Comprobando actualizaciones de GitHub...");

    const repoOwner = 'todoh';
    const repoName = 'SILENOS';
    const branch = 'main';
    const targetFolder = 'programas'; 

    const treeUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${branch}?recursive=1`;

    try {
        // 1. Obtener lista de archivos (JSON ligero)
        const resp = await fetch(treeUrl);
        if (!resp.ok) throw new Error(`GitHub API Error: ${resp.status}`);
        const data = await resp.json();

        // 2. Filtrar
        const filesToDownload = data.tree.filter(item => 
            item.path.startsWith(`${targetFolder}/`) && item.type === 'blob'
        );

        // 3. DESCARGA INTELIGENTE (Solo lo que falta)
        const batchSize = 10;
        let downloaded = 0;
        let skipped = 0;

        for (let i = 0; i < filesToDownload.length; i += batchSize) {
            const batch = filesToDownload.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (item) => {
                try {
                    // VERIFICACIÓN: Si existe, saltamos la descarga
                    const exists = await checkFileExists(rootHandle, item.path);
                    
                    if (exists) {
                        skipped++;
                        return;
                    }

                    // Si no existe, descargamos
                    const rawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${item.path}`;
                    const contentResp = await fetch(rawUrl);
                    const blob = await contentResp.blob();
                    await saveFileRecursively(rootHandle, item.path, blob);
                    downloaded++;
                    console.log(`SYNC: Descargado ${item.path}`);

                } catch (err) {
                    console.warn(`SYNC FAIL: ${item.path}`, err);
                }
            }));
        }

        if (downloaded > 0) {
            if(typeof showToast === 'function') showToast(`SYNC: INSTALLED ${downloaded} NEW FILES`);
            console.log(`SYNC: Finalizado. Descargados: ${downloaded}, Saltados: ${skipped}`);
        } else {
            console.log(`SYNC: Sistema actualizado. (${skipped} archivos verificados)`);
        }

    } catch (e) {
        console.error("SYNC FATAL ERROR:", e);
        if(typeof showToast === 'function') showToast("SYNC ERROR");
    } finally {
        window.isSyncing = false; 
    }
}

async function saveFileRecursively(rootHandle, filePath, blob) {
    const parts = filePath.split('/'); 
    const filename = parts.pop();      
    
    let currentDir = rootHandle;

    // Navegar o crear carpetas intermedias
    for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }

    // Escribir el archivo
    const fileHandle = await currentDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

// --- LOGICA RECURSIVA DEL VISUALIZADOR DE PROGRAMAS ---

async function scanHtmlFilesRecursive(dirHandle, pathPrefix = '') {
    let results = [];
    
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'directory') {
            // Recursividad: buscar dentro de subcarpetas
            // IMPORTANTE: Pasamos 'entry' como dirHandle para la siguiente recursión
            const subResults = await scanHtmlFilesRecursive(entry, pathPrefix + entry.name + ' / ');
            results = results.concat(subResults);
        } else if (entry.kind === 'file' && entry.name.endsWith('.html')) {
            // Es un archivo HTML
            results.push({
                entry: entry,
                path: pathPrefix, 
                name: entry.name,
                parentHandle: dirHandle // <--- AQUI GUARDAMOS LA CARPETA PADRE EXACTA
            });
        }
    }
    
    return results;
}

// MODIFICADO: Usa parentHandle del item
async function populateProgramsWindow(winId, programsHandle) {
    const container = document.getElementById(`win-programs-${winId}`);
    if (!container) return;

    container.innerHTML = `<div class="text-xs font-mono text-gray-400 animate-pulse p-4">ESCANEANDO DIRECTORIOS...</div>`;

    try {
        const files = await scanHtmlFilesRecursive(programsHandle);

        container.innerHTML = ''; 

        const header = document.createElement('div');
        header.className = 'mb-6 pb-2 border-b border-black flex justify-between items-end';
        header.innerHTML = `
            <span class="text-xl font-bold tracking-tighter">INDEX</span>
            <span class="text-[10px] font-mono">${files.length} PROGRAMAS ENCONTRADOS</span>
        `;
        container.appendChild(header);

        if (files.length === 0) {
            container.innerHTML += `<div class="text-center mt-10 text-xs font-mono text-gray-400">NO SE ENCONTRARON ARCHIVOS HTML</div>`;
            return;
        }

        const list = document.createElement('div');
        list.className = 'grid grid-cols-1 md:grid-cols-2 gap-3';

        files.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'group flex flex-col items-start p-4 border border-gray-200 hover:bg-black hover:text-white hover:border-black transition-all text-left bg-gray-50';
            
            const nameHtml = `<span class="font-bold text-sm mb-1 group-hover:underline underline-offset-2 decoration-1">${item.name.replace('.html', '')}</span>`;
            const pathHtml = item.path 
                ? `<span class="text-[9px] font-mono text-gray-400 group-hover:text-gray-300 uppercase tracking-wide">${item.path}</span>`
                : `<span class="text-[9px] font-mono text-gray-400 group-hover:text-gray-300 uppercase tracking-wide">ROOT</span>`;

            btn.innerHTML = nameHtml + pathHtml;
            
            btn.onclick = () => {
                // USAMOS item.parentHandle (La carpeta del programa, ej: "animation")
                // Esto permite que 'chroma.js' se encuentre.
                // html-processor.js se encargará de buscar 'librerias' en la raíz si no está aquí.
                if (typeof handleOpenFile === 'function') {
                    handleOpenFile(item.entry, item.parentHandle);
                }
            };

            list.appendChild(btn);
        });

        container.appendChild(list);

    } catch (e) {
        console.error("Error escaneando programas:", e);
        container.innerHTML = `<div class="text-red-500 text-xs font-mono p-4">ERROR READING PROGRAMS: ${e.message}</div>`;
    }
}

// --- MANEJADOR DEL BOTÓN PROGRAMAS ---

async function handleOpenPrograms() {
    if (!window.currentHandle) {
        if(typeof showToast === 'function') showToast("ERROR: Mount Drive First");
        return;
    }

    try {
        const programsHandle = await window.currentHandle.getDirectoryHandle('programas', { create: true });
        
        if (typeof WindowManager !== 'undefined') {
            const winId = WindowManager.openWindow('PROGRAMAS INSTALADOS', programsHandle, 'programs');
            
            await populateProgramsWindow(winId, programsHandle);

            downloadGithubPrograms(window.currentHandle).then(async () => {
                if (document.getElementById(`win-programs-${winId}`)) {
                    console.log("SYNC: Actualizando lista de programas...");
                    await populateProgramsWindow(winId, programsHandle);
                    if(typeof showToast === 'function') showToast("PROGRAM LIST UPDATED");
                }
                if (typeof Universe !== 'undefined') await Universe.loadDirectory(window.currentHandle);
            });

        } else {
            console.error("WindowManager not found");
        }
    } catch (e) {
        console.error("Error crítico Programs:", e);
        if(typeof showToast === 'function') showToast("Error opening programs folder");
    }
}

// --- EVENT LISTENERS GLOBALES ---

window.addEventListener('contextmenu', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
}, false);

const btnSortTrigger = document.getElementById('btn-sort-trigger');
const btnProgramsTrigger = document.getElementById('btn-programs-trigger');
const btnClearWindows = document.getElementById('btn-clear-windows');

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