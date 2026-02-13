// --- FS-ACTIONS.JS (HANDLERS, ACTIONS & CLIPBOARD) ---

// Estado global de acciones
window.Actions = {
    clipboard: {
        operation: null, // 'copy' o 'cut'
        entries: [],     // Array de FileSystemHandles (Interno)
        sourceDir: null  
    },

    // --- MENÚ CONTEXTUAL ---
    openContextMenu(x, y, targets, parentHandle) {
        // Normalizamos 'targets' siempre a un array, aunque venga null o uno solo
        let entries = [];
        if (targets) {
            entries = Array.isArray(targets) ? targets : [targets];
        }

        const oldMenu = document.getElementById('ctx-menu');
        if (oldMenu) oldMenu.remove();

        const menu = document.createElement('div');
        menu.id = 'ctx-menu';
        menu.className = 'fixed bg-white border border-black shadow-lg z-[9999] flex flex-col w-48 py-1'; 
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        let options = [];

        if (entries.length > 0) {
            // -- ACCIONES SOBRE SELECCIÓN --
            const count = entries.length;
            const labelSuffix = count > 1 ? ` (${count})` : '';

            // Solo abrir si es uno solo
            if (count === 1) {
                // AQUÍ PASAMOS parentHandle CORRECTAMENTE AL ABRIR
                options.push({ label: 'OPEN', action: () => this.executeOpen(entries[0], parentHandle) });
            }

            options.push({ label: `COPY${labelSuffix}`, action: () => this.setClipboard('copy', entries, parentHandle) });
            options.push({ label: `CUT${labelSuffix}`, action: () => this.setClipboard('cut', entries, parentHandle) });
            
            // Renombrar solo si es uno
            if (count === 1) {
                options.push({ label: 'RENAME', action: () => triggerRenameFlow(entries[0]) });
            }
            
            options.push({ label: `DELETE${labelSuffix}`, action: () => handleDelete(entries, parentHandle) });

        } else {
            // -- ACCIONES GLOBALES (Fondo) --
            if (this.clipboard.entries.length > 0) {
                const opName = this.clipboard.operation === 'cut' ? 'MOVE HERE' : 'PASTE HERE';
                const count = this.clipboard.entries.length;
                options.push({ label: `${opName} (${count})`, action: () => this.executePaste(parentHandle) });
            }
            options.push({ label: 'NEW FOLDER', action: () => handleCreateFolder(parentHandle) });
            options.push({ label: 'NEW FILE', action: () => handleCreateFile(parentHandle) });
        }

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'text-left px-4 py-2 hover:bg-black hover:text-white text-xs font-mono uppercase truncate';
            btn.textContent = opt.label;
            btn.onclick = () => {
                opt.action();
                menu.remove();
            };
            menu.appendChild(btn);
        });

        // Cerrar al hacer click fuera
        setTimeout(() => {
            document.addEventListener('click', function closeCtx() {
                if (menu) menu.remove();
                document.removeEventListener('click', closeCtx);
            }, { once: true });
        }, 10);

        document.body.appendChild(menu);
    },

    // --- LOGICA DEL PORTAPAPELES (MULTI) ---
    setClipboard(op, entries, sourceDir) {
        // Guardamos array
        const list = Array.isArray(entries) ? entries : [entries];
        this.clipboard = { operation: op, entries: list, sourceDir: sourceDir };
        showToast(`${op.toUpperCase()}: ${list.length} ITEMS`);
    },

    // Ejecutar pegado interno (archivos de Silenos)
    async executePaste(targetDirHandle) {
        
        if (this.clipboard.entries.length === 0) return;
        if (!targetDirHandle) targetDirHandle = window.currentHandle;

        const { operation, entries, sourceDir } = this.clipboard;

        try {
            showToast(`Processing ${entries.length} items...`);
            
            for (const entry of entries) {
                // Copiar
                await this.copyEntryToHandle(entry, targetDirHandle);

                // Si es cortar, borrar original
                if (operation === 'cut' && sourceDir) {
                    if (await sourceDir.isSameEntry(targetDirHandle)) {
                        console.warn(`Skipping delete for ${entry.name} (same dir)`);
                        continue;
                    }
                    await sourceDir.removeEntry(entry.name, { recursive: true });
                }
            }

            if (operation === 'cut') {
                this.clipboard = { operation: null, entries: [], sourceDir: null };
            }

            // Refrescar vistas
            this.refreshViews(targetDirHandle);
            if (operation === 'cut' && sourceDir) this.refreshViews(sourceDir);

            showToast("Done!");
        } catch (err) {
            console.error(err);
            showToast("Error: " + err.message);
        }
    },

    async copyEntryToHandle(entry, targetDirHandle) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            const newFileHandle = await targetDirHandle.getFileHandle(entry.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(file);
            await writable.close();
        } else if (entry.kind === 'directory') {
            const newDirHandle = await targetDirHandle.getDirectoryHandle(entry.name, { create: true });
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
        
        // Refrescar Ventanas abiertas que muestren esta carpeta
        if (typeof WindowManager !== 'undefined') {
            WindowManager.windows.forEach(async w => {
                if (w.type === 'dir' && w.handle && await w.handle.isSameEntry(handle)) {
                    WindowManager.populateDirectoryWindow(w.id, handle);
                }
            });
        }
    },

    // AHORA ACEPTA parentHandle
    executeOpen(entry, parentHandle) {
        if (entry.kind === 'directory') {
            if (typeof WindowManager !== 'undefined') {
                WindowManager.openWindow(entry.name, entry, 'dir');
            }
        } else {
            handleOpenFile(entry, parentHandle);
        }
    },

    // --- FUNCIÓN DEL BOTÓN [PASTE] ---
    async pasteToWindow(windowId) {
        const win = WindowManager.windows.find(w => w.id === windowId);
        if (!win || !win.handle) {
            console.error("Target window invalid or no handle");
            return;
        }

        console.log(`[PASTE] Triggered for Window: ${win.title}`);

        if (this.clipboard.entries.length > 0) {
            console.log("-> Using Internal Clipboard");
            await this.executePaste(win.handle);
        } 
        else {
            console.log("-> Using System Clipboard (Navigator API)");
            try {
                const items = await navigator.clipboard.read();
                let pasted = false;

                for (const item of items) {
                    if (item.types.some(t => t.startsWith('image/'))) {
                        const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
                        const ext = blob.type.split('/')[1] || 'png';
                        const filename = (typeof generateFilename === 'function') 
                            ? generateFilename('IMG', ext) 
                            : `paste_${Date.now()}.${ext}`;
                            
                        await this.writeBlobToHandle(win.handle, filename, blob);
                        pasted = true;
                    }
                    else if (item.types.includes('text/plain')) {
                        const blob = await item.getType('text/plain');
                        const text = await blob.text();
                        if (text.trim()) {
                            const type = (typeof detectTextType === 'function') ? detectTextType(text) : 'txt';
                            const filename = (typeof generateFilename === 'function') 
                                ? generateFilename(type.toUpperCase(), type) 
                                : `paste_${Date.now()}.txt`;

                            await this.writeBlobToHandle(win.handle, filename, text);
                            pasted = true;
                        }
                    }
                }
                
                if (pasted) {
                    showToast("SYSTEM PASTE SUCCESS");
                    this.refreshViews(win.handle);
                } else {
                    showToast("Clipboard empty or unsupported");
                }

            } catch (err) {
                console.warn("Clipboard read failed, trying text fallback", err);
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        const type = (typeof detectTextType === 'function') ? detectTextType(text) : 'txt';
                        const filename = `PASTE_${Date.now()}.${type}`;
                        await this.writeBlobToHandle(win.handle, filename, text);
                        showToast("TEXT PASTED");
                        this.refreshViews(win.handle);
                    }
                } catch (e2) {
                    console.error("System Paste Failed completely", e2);
                    showToast("PASTE BLOCKED BY BROWSER");
                }
            }
        }
    },

    async writeBlobToHandle(dirHandle, filename, content) {
        try {
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
        } catch (err) {
            console.error("Write error:", err);
            throw err;
        }
    }
};

// --- HANDLERS GLOBALES (ACTUALIZADOS) ---

// Se añade parentHandle opcional. Si no se da, usa el global (Desktop)
async function handleOpenFile(entry, parentHandle) {
    if (!entry) return;
    
    // Contexto de resolución: ¿De dónde sacamos los assets hermanos?
    // Si viene parentHandle (desde una ventana), usamos ese.
    // Si no, usamos el directorio actual montado (Escritorio).
    const contextHandle = parentHandle || window.currentHandle;

    try {
        if (typeof openFileInSilenos === 'function') {
            await openFileInSilenos(entry, contextHandle);
        }
    } catch (err) {
        console.error("Error al abrir archivo:", err);
        showToast("Error opening file");
    }
}

async function handleDelete(entries, parentHandle) {
    const list = Array.isArray(entries) ? entries : [entries];
    const count = list.length;
    
    if (!confirm(`¿Eliminar ${count} elemento(s)?`)) return;
    
    const dir = parentHandle || window.currentHandle;
    try {
        for (const entry of list) {
            await dir.removeEntry(entry.name, { recursive: true });
        }
        Actions.refreshViews(dir);
        if (typeof Universe !== 'undefined') Universe.clearSelection();
        
    } catch (err) {
        console.error(err);
        showToast("Delete failed partially");
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

function triggerRenameFlow(entry) {
    if (typeof openRenameModal === 'function') {
        openRenameModal(entry.name, async (newName) => {
            try {
                if (entry.move) {
                    await entry.move(newName);
                    
                    if (typeof Universe !== 'undefined' && window.currentHandle) {
                        await Universe.loadDirectory(window.currentHandle);
                    }

                    if (typeof WindowManager !== 'undefined') {
                        for (const win of WindowManager.windows) {
                            if (win.type === 'dir' && win.handle) {
                                await WindowManager.populateDirectoryWindow(win.id, win.handle);
                                try {
                                    if (await win.handle.isSameEntry(entry)) {
                                        win.title = newName;
                                        const titleEl = document.querySelector(`#${win.id} .window-title`);
                                        if (titleEl) titleEl.textContent = newName;
                                    }
                                } catch (err) { }
                            }
                            else if (win.handle) { 
                                try {
                                    if (await win.handle.isSameEntry(entry)) {
                                        win.title = newName;
                                        const titleEl = document.querySelector(`#${win.id} .window-title`);
                                        if (titleEl) titleEl.textContent = newName;
                                    }
                                } catch(e) {}
                            }
                        }
                        WindowManager.renderTaskbar();
                    }

                    showToast(`RENAMED: ${newName}`);

                } else {
                    showToast("Rename not supported directly");
                }
            } catch (e) {
                console.error(e);
                showToast("Error renaming: " + e.message);
            }
        });
    }
}