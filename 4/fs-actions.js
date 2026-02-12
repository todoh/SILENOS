// --- FS-ACTIONS.JS (HANDLERS, ACTIONS & CLIPBOARD) ---

// Estado global de acciones
window.Actions = {
    clipboard: {
        operation: null, // 'copy' o 'cut'
        entry: null,     // FileSystemHandle
        sourceDir: null  // Handle del directorio origen (necesario para borrar en cut)
    },

    // --- MENÚ CONTEXTUAL ---
    openContextMenu(x, y, entry, parentHandle) {
        // Eliminar menú previo si existe
        const oldMenu = document.getElementById('ctx-menu');
        if (oldMenu) oldMenu.remove();

        const menu = document.createElement('div');
        menu.id = 'ctx-menu';
        menu.className = 'fixed bg-white border border-black shadow-lg z-[9999] flex flex-col w-32 py-1';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        // Generar opciones según si se clickeó en un archivo o en el fondo
        let options = [];

        if (entry) {
            // Clic en archivo/carpeta
            options = [
                { label: 'OPEN', action: () => this.executeOpen(entry) },
                { label: 'COPY', action: () => this.setClipboard('copy', entry, parentHandle) },
                { label: 'CUT', action: () => this.setClipboard('cut', entry, parentHandle) },
                { label: 'RENAME', action: () => triggerRenameFlow(entry) },
                { label: 'DELETE', action: () => handleDelete(entry, parentHandle) },
            ];
        } else {
            // Clic en fondo (pegar)
            if (this.clipboard.entry) {
                const opName = this.clipboard.operation === 'cut' ? 'MOVE HERE' : 'PASTE HERE';
                options.push({ label: opName, action: () => this.executePaste(parentHandle) });
            }
            options.push({ label: 'NEW FOLDER', action: () => handleCreateFolder(parentHandle) });
            options.push({ label: 'NEW FILE', action: () => handleCreateFile(parentHandle) });
        }

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'text-left px-4 py-2 hover:bg-black hover:text-white text-xs font-mono uppercase';
            btn.textContent = opt.label;
            btn.onclick = () => {
                opt.action();
                menu.remove();
            };
            menu.appendChild(btn);
        });

        // Cerrar al hacer clic fuera
        setTimeout(() => {
            document.addEventListener('click', function closeCtx() {
                if (menu) menu.remove();
                document.removeEventListener('click', closeCtx);
            }, { once: true });
        }, 10);

        document.body.appendChild(menu);
    },

    // --- LOGICA DEL PORTAPAPELES ---
    setClipboard(op, entry, sourceDir) {
        this.clipboard = { operation: op, entry: entry, sourceDir: sourceDir };
        showToast(`${op.toUpperCase()}: ${entry.name}`);
    },

    async executePaste(targetDirHandle) {
        if (!this.clipboard.entry) return;
        if (!targetDirHandle) targetDirHandle = window.currentHandle;

        const { operation, entry, sourceDir } = this.clipboard;

        try {
            showToast("Processing...");
            
            // Copiar contenido (Recursivo si es carpeta)
            await this.copyEntryToHandle(entry, targetDirHandle);

            // Si era 'Cortar', borrar el original
            if (operation === 'cut' && sourceDir) {
                // Verificar que no estamos pegando en la misma carpeta
                if (await sourceDir.isSameEntry(targetDirHandle)) {
                    showToast("Ignored: Source and Destination are same");
                    return;
                }
                await sourceDir.removeEntry(entry.name, { recursive: true });
            }

            // Limpiar clipboard si fue corte
            if (operation === 'cut') {
                this.clipboard = { operation: null, entry: null, sourceDir: null };
            }

            // REFRESCAR VISTAS
            this.refreshViews(targetDirHandle);
            if (operation === 'cut') this.refreshViews(sourceDir);

            showToast("Done!");
        } catch (err) {
            console.error(err);
            showToast("Error: " + err.message);
        }
    },

    async copyEntryToHandle(entry, targetDirHandle) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            // Crear archivo en destino (renombrar si existe)
            const newFileHandle = await targetDirHandle.getFileHandle(entry.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(file);
            await writable.close();
        } else if (entry.kind === 'directory') {
            const newDirHandle = await targetDirHandle.getDirectoryHandle(entry.name, { create: true });
            // Copiar hijos recursivamente
            for await (const child of entry.values()) {
                await this.copyEntryToHandle(child, newDirHandle);
            }
        }
    },

    async refreshViews(handle) {
        // Refrescar Universo si es la carpeta actual
        if (window.currentHandle && await window.currentHandle.isSameEntry(handle)) {
            if (typeof Universe !== 'undefined') await Universe.loadDirectory(handle);
        }
        
        // Refrescar Ventana si está abierta para esa carpeta
        if (typeof WindowManager !== 'undefined') {
            const win = WindowManager.windows.find(w => w.type === 'dir' && w.title === handle.name); // Simple check por nombre/titulo
            // Una comprobación más robusta requeriría guardar el handle en la ventana, lo cual hemos añadido en window-system.js
            WindowManager.windows.forEach(async w => {
                if (w.type === 'dir' && w.handle && await w.handle.isSameEntry(handle)) {
                    WindowManager.populateDirectoryWindow(w.id, handle);
                }
            });
        }
    },

    executeOpen(entry) {
        if (entry.kind === 'directory') {
            if (typeof WindowManager !== 'undefined') {
                WindowManager.openWindow(entry.name, entry, 'dir');
            }
        } else {
            handleOpenFile(entry);
        }
    },

    // Helper para pegar desde botón de ventana
    pasteToWindow(windowId) {
        const win = WindowManager.windows.find(w => w.id === windowId);
        if (win && win.handle) {
            this.executePaste(win.handle);
        }
    }
};

// --- HANDLERS ANTIGUOS (ADAPTADOS) ---

async function handleOpenFile(entry) {
    if (!entry) return;
    try {
        if (typeof openFileInSilenos === 'function') {
            // Necesitamos el parent handle para assets HTML, difícil saberlo desde aquí si venimos de ventana flotante.
            // Usamos currentHandle como fallback.
            await openFileInSilenos(entry, window.currentHandle);
        }
    } catch (err) {
        console.error("Error al abrir archivo:", err);
        showToast("Error opening file");
    }
}

async function handleDelete(entry, parentHandle) {
    if (!confirm(`¿Eliminar ${entry.name}?`)) return;
    const dir = parentHandle || window.currentHandle;
    try {
        await dir.removeEntry(entry.name, { recursive: true });
        Actions.refreshViews(dir);
    } catch (err) {
        console.error(err);
        showToast("Delete failed");
    }
}

async function handleCreateFolder(targetHandle) {
    const dir = targetHandle || window.currentHandle;
    if (!dir) return;
    const name = prompt("Nombre carpeta:");
    if (!name) return;
    try {
        await dir.getDirectoryHandle(name, { create: true });
        Actions.refreshViews(dir);
    } catch (e) { showToast("Error creating folder"); }
}

async function handleCreateFile(targetHandle) {
    const dir = targetHandle || window.currentHandle;
    if (!dir) return;
    const name = prompt("Nombre archivo:");
    if (!name) return;
    try {
        await dir.getFileHandle(name, { create: true });
        Actions.refreshViews(dir);
    } catch (e) { showToast("Error creating file"); }
}

// Renombrado: Sigue dependiendo de UI.js openRenameModal
function triggerRenameFlow(entry) {
    if (typeof openRenameModal === 'function') {
        openRenameModal(entry.name, async (newName) => {
            try {
                if (entry.move) {
                    await entry.move(newName);
                    // No sabemos el padre fácilmente aquí sin pasarlo, asumimos refresco global o Universe
                    if (typeof Universe !== 'undefined') await Universe.loadDirectory(window.currentHandle);
                } else {
                    showToast("Rename not supported directly");
                }
            } catch (e) {
                console.error(e);
                showToast("Error renaming");
            }
        });
    }
}

// Compatibilidad
async function handleFileClick(filename) {
    // Deprecado en favor de Actions.executeOpen, pero mantenido para no romper referencias
    console.warn("Use Actions.executeOpen instead");
}