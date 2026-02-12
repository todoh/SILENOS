// --- MAIN.JS (EVENTS & CLIPBOARD) ---

// Función auxiliar para detectar dónde pegar (Ventana activa o Escritorio)
function getActiveTargetHandle() {
    // 1. Si hay ventanas abiertas gestionadas por WindowManager
    if (typeof WindowManager !== 'undefined' && WindowManager.windows.length > 0) {
        
        // Filtramos las ventanas visibles (no minimizadas)
        const visibleWindows = WindowManager.windows.filter(w => !w.minimized);
        
        if (visibleWindows.length > 0) {
            // Buscamos la que tiene el Z-Index más alto (la que está encima visualmente)
            const topWindow = visibleWindows.reduce((prev, current) => 
                (prev.zIndex > current.zIndex) ? prev : current
            );

            // Si la ventana activa es un DIRECTORIO y tiene handle, devolvemos ese handle
            if (topWindow.type === 'dir' && topWindow.handle) {
                console.log(`[PASTE TARGET]: Ventana '${topWindow.title}'`);
                return topWindow.handle;
            }
        }
    }

    // 2. Si no, devolvemos el escritorio (Root) por defecto
    console.log(`[PASTE TARGET]: Escritorio (Root)`);
    return window.currentHandle;
}

async function processClipboardItems(items, targetHandle = null) {
    log(`PROCESSING CLIPBOARD...`);
    let found = false;
    
    // Si no viene target explícito, calculamos el activo
    const destHandle = targetHandle || getActiveTargetHandle();
    
    if (!destHandle) {
        showToast("Error: No directory mounted");
        return;
    }

    for (const item of items) {
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            if (blob.type.startsWith('image/')) {
                const ext = blob.type.split('/')[1] || 'png';
                const filename = generateFilename('IMG', ext); 
                // Pasamos destHandle como 4º argumento
                await writeFileToSystem(filename, blob, true, destHandle);
                found = true;
            }
        } 
        else if (item.kind === 'string' && item.type === 'text/plain') {
            item.getAsString(async (text) => {
                if (!text.trim()) return;
                const type = detectTextType(text); 
                const filename = generateFilename(type.toUpperCase(), type);
                // Pasamos destHandle como 4º argumento
                await writeFileToSystem(filename, text, false, destHandle);
            });
            found = true;
        }
    }
    if(!found) showToast("Clipboard format not supported");
}

async function handleGlobalPaste() {
    if (!window.currentHandle) {
        showToast('ERROR: Mount root first');
        return;
    }

    // Detectar destino activo antes de leer el portapapeles
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
            showToast("Click 'Allow' or use Ctrl+V");
        }
    }
}

async function handlePasteEvent(e) {
    if (!window.currentHandle) return;
    e.preventDefault();
    
    // Detectar destino activo
    const targetHandle = getActiveTargetHandle();
    
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    await processClipboardItems(items, targetHandle);
}

// --- EVENT LISTENERS ---

// Bloqueo total del menú contextual del navegador
window.addEventListener('contextmenu', (e) => {
    // Si necesitas que algún elemento específico SI tenga menú (ej: inputs de texto),
    // puedes añadir una excepción aquí.
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
}, false);

// Elementos del DOM traídos de UI.js o buscados aquí si es necesario
const btnSortTrigger = document.getElementById('btn-sort-trigger');

if(typeof btnSelectDir !== 'undefined' && btnSelectDir) btnSelectDir.addEventListener('click', initFileSystem);
if(typeof btnPasteTrigger !== 'undefined' && btnPasteTrigger) btnPasteTrigger.addEventListener('click', handleGlobalPaste);
if(typeof btnCreateFolder !== 'undefined' && btnCreateFolder) btnCreateFolder.addEventListener('click', handleCreateFolder);

// --- LISTENER DE ORDENAR ACTUALIZADO ---
// Ahora refresca (carga disco) Y ordena, recentrando la cámara gracias a fs-universe-data.js
if(btnSortTrigger) {
    btnSortTrigger.addEventListener('click', async () => {
        if (typeof Universe !== 'undefined' && Universe.initialized && window.currentHandle) {
            // 1. Cambiar el modo manualmente
            Universe.sortMode = Universe.sortMode === 'name' ? 'type' : 'name';
            
            // 2. Mostrar feedback visual
            if (typeof showToast === 'function') showToast(`REFRESH & SORT: ${Universe.sortMode.toUpperCase()}`);
            
            // 3. Recargar directorio completo (Refrescar datos y aplicar orden)
            await Universe.loadDirectory(window.currentHandle);
        }
    });
}

// Actualizado: Refresh ahora recarga el universo si existe
if(typeof btnRefresh !== 'undefined' && btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
        if (window.currentHandle) {
            if (typeof Universe !== 'undefined') await Universe.loadDirectory(window.currentHandle);
            else if (typeof refreshFileTree === 'function') await refreshFileTree();
        }
    });
}

const btnClearWindows = document.getElementById('btn-clear-windows');
if(btnClearWindows) {
    btnClearWindows.addEventListener('click', () => {
        // En WindowSystem.js debería existir initWindowSystem, si no, se recarga manualmente
        if(typeof WindowManager !== 'undefined' && WindowManager.windows) {
            // Cerrar todas manualmente
            [...WindowManager.windows].forEach(w => WindowManager.closeWindow(w.id));
        }
    });
}

window.addEventListener('paste', handlePasteEvent);
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

if (!('showDirectoryPicker' in window)) {
    if(typeof errorMsg !== 'undefined' && errorMsg) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = "ALERTA: Navegador incompatible (Use Chrome/Edge).";
    }
}