// --- MAIN.JS (EVENTS & CLIPBOARD) ---

async function processClipboardItems(items) {
    log(`PROCESSING CLIPBOARD...`);
    let found = false;

    for (const item of items) {
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            if (blob.type.startsWith('image/')) {
                const ext = blob.type.split('/')[1] || 'png';
                const filename = generateFilename('IMG', ext); 
                await writeFileToSystem(filename, blob, true);
                found = true;
            }
        } 
        else if (item.kind === 'string' && item.type === 'text/plain') {
            item.getAsString(async (text) => {
                if (!text.trim()) return;
                const type = detectTextType(text); 
                const filename = generateFilename(type.toUpperCase(), type);
                await writeFileToSystem(filename, text, false);
            });
            found = true;
        }
    }
    if(!found) showToast("Clipboard format not supported");
}

async function handleGlobalPaste() {
    if (!currentHandle) {
        showToast('ERROR: Mount root first');
        return;
    }
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
                await processClipboardItems([fakeItem]);
            }
        }
    } catch (err) {
        try {
            const text = await navigator.clipboard.readText();
            if(text) {
                const type = detectTextType(text);
                const filename = generateFilename(type.toUpperCase(), type);
                await writeFileToSystem(filename, text, false);
            }
        } catch (e) {
            log('CLIPBOARD ACCESS DENIED. Use Ctrl+V');
            showToast("Click 'Allow' or use Ctrl+V");
        }
    }
}

async function handlePasteEvent(e) {
    if (!currentHandle) return;
    e.preventDefault();
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    await processClipboardItems(items);
}

// --- EVENT LISTENERS ---

// Elementos del DOM traídos de UI.js o buscados aquí si es necesario
const btnSortTrigger = document.getElementById('btn-sort-trigger');

if(btnSelectDir) btnSelectDir.addEventListener('click', initFileSystem);
if(btnPasteTrigger) btnPasteTrigger.addEventListener('click', handleGlobalPaste);
if(btnCreateFolder) btnCreateFolder.addEventListener('click', handleCreateFolder);

// Listener para el botón de Ordenar
if(btnSortTrigger) {
    btnSortTrigger.addEventListener('click', () => {
        if (typeof Universe !== 'undefined' && Universe.initialized) {
            Universe.sortNodes(true); // true para alternar modo
        }
    });
}

// Actualizado: Refresh ahora recarga el universo si existe
if(btnRefresh) {
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
    if(errorMsg) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = "ALERTA: Navegador incompatible (Use Chrome/Edge).";
    }
}