// live gemini/visualizador.js
// ─── VISUALIZADOR Y EDITOR DE ARCHIVOS (Antiguo IDE Integrado) ─────────

window.visualizadorUI = {
    currentDirHandle: null,
    parentDirHandles: [], 
    currentFileHandle: null,
    _dragBound: null,
    clipboard: null, // { handle, name, isDir }
    _visAutoSaveTimer: null,

    async open(dirHandle = null) {
        if (!dirHandle && !workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta en ENTORNO LOCAL primero', 'error');
            return;
        }
        this.currentDirHandle = dirHandle || workspaceHandle;
        this.parentDirHandles = [];
        
        const modal = document.getElementById('visualizerModal');
        modal.classList.remove('hidden');
        
        if (typeof makeDraggable === 'function' && !this._dragBound) {
            makeDraggable(modal, document.getElementById('visModalHeader'));
            this._dragBound = true;
        }

        await this.renderCurrentFolder();
    },

    close() {
        document.getElementById('visualizerModal').classList.add('hidden');
        this.closePreview();
    },

    async ensurePath(fullPath, isDir) {
        if (!workspaceHandle) throw new Error("No hay workspace seleccionado.");
        
        let normalizedPath = fullPath.replace(/\\/g, '/').trim();
        if (normalizedPath.startsWith('/')) normalizedPath = normalizedPath.substring(1);
        if (normalizedPath.startsWith('./')) normalizedPath = normalizedPath.substring(2);
        
        const parts = normalizedPath.split('/').filter(p => p && p !== '.');
        let currentHandle = workspaceHandle;
        
        const dirParts = isDir ? parts : parts.slice(0, -1);
        const fileName = isDir ? null : parts[parts.length - 1];
        
        for (const part of dirParts) {
            currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
        }
        
        if (isDir) {
            return currentHandle;
        } else {
            if (!fileName) throw new Error("Ruta de archivo inválida.");
            return await currentHandle.getFileHandle(fileName, { create: true });
        }
    },

    async goUp() {
        if (this.parentDirHandles.length > 0) {
            this.currentDirHandle = this.parentDirHandles.pop();
            await this.renderCurrentFolder();
        } else {
            if (typeof showToast === 'function') showToast('Ya estás en la raíz', '');
        }
    },

    async openFolder(dirHandle) {
        this.parentDirHandles.push(this.currentDirHandle);
        this.currentDirHandle = dirHandle;
        await this.renderCurrentFolder();
    },

    async createFile() {
        const name = prompt("Nombre del nuevo archivo (ej: script.js o html/index.html):");
        if (!name) return;
        try {
            let handle;
            if (name.includes('/')) {
                const basePath = this.currentDirHandle === workspaceHandle ? '' : this.currentDirHandle.name + '/';
                handle = await this.ensurePath(basePath + name, false);
            } else {
                handle = await this.currentDirHandle.getFileHandle(name, { create: true });
            }
            
            historyManager.logAction('USUARIO (Visualizer)', `Creó archivo físico: ${handle.name}`);
            
            await this.openFilePreview(handle);
            await this.renderCurrentFolder();
            if(typeof ide !== 'undefined') ide.refreshTree();

            if (typeof showToast === 'function') showToast(`Archivo creado ✓`, 'success');
        } catch (e) {
            if (typeof showToast === 'function') showToast(`Error al crear: ${e.message}`, 'error');
        }
    },

    async createFolder() {
        const name = prompt("Nombre de la nueva carpeta:");
        if (!name) return;
        try {
            await this.currentDirHandle.getDirectoryHandle(name, { create: true });
            historyManager.logAction('USUARIO (Visualizer)', `Creó carpeta física: ${name}`);

            await this.renderCurrentFolder();
            if(typeof ide !== 'undefined') ide.refreshTree();

            if (typeof showToast === 'function') showToast(`Carpeta creada ✓`, 'success');
        } catch (e) {
            if (typeof showToast === 'function') showToast(`Error al crear: ${e.message}`, 'error');
        }
    },

    copyCurrentFile() {
        if (!this.currentFileHandle) return;
        this.clipboard = {
            handle: this.currentFileHandle,
            name: this.currentFileHandle.name,
            isDir: false
        };
        if (typeof showToast === 'function') showToast(`Copiado: ${this.currentFileHandle.name}`, 'success');
    },

    async paste() {
        if (!this.clipboard) return showToast('El portapapeles está vacío', 'error');
        try {
            if (this.clipboard.isDir) {
                if (typeof showToast === 'function') showToast('El copiado de carpetas requiere mover la lógica interna', 'error');
            } else {
                const file = await this.clipboard.handle.getFile();
                let newName = this.clipboard.name;
                if (newName.includes('.')) {
                    newName = newName.replace(/(\.[^.]+)$/, '_copia$1');
                } else {
                    newName = newName + '_copia';
                }
                const destHandle = await this.currentDirHandle.getFileHandle(newName, { create: true });
                const writable = await destHandle.createWritable();
                await writable.write(await file.arrayBuffer());
                await writable.close();
                
                historyManager.logAction('USUARIO (Visualizer)', `Pegó archivo: ${newName}`);
            }
            await this.renderCurrentFolder();
            if(typeof ide !== 'undefined') ide.refreshTree();

            if (typeof showToast === 'function') showToast('Pegado exitoso', 'success');
        } catch (e) {
            if (typeof showToast === 'function') showToast(`Error al pegar: ${e.message}`, 'error');
        }
    },

    async deleteCurrentFile() {
        if (!this.currentFileHandle) return;
        if (!confirm(`¿Estás seguro de eliminar permanentemente '${this.currentFileHandle.name}'?`)) return;
        try {
            await this.currentDirHandle.removeEntry(this.currentFileHandle.name);
            historyManager.logAction('USUARIO (Visualizer)', `Eliminó archivo: ${this.currentFileHandle.name}`);

            this.closePreview();
            await this.renderCurrentFolder();
            if(typeof ide !== 'undefined') ide.refreshTree();

            if (typeof showToast === 'function') showToast(`Eliminado`, 'success');
        } catch (e) {
            if (typeof showToast === 'function') showToast(`Error al eliminar: ${e.message}`, 'error');
        }
    },

    async saveFile(isAutoSave = false) {
        if (!this.currentFileHandle) {
            if (!isAutoSave && typeof showToast === 'function') showToast('No hay archivo abierto para guardar', 'error');
            return;
        }
        const editor = document.getElementById('visEditor');
        if (!editor) {
            if (!isAutoSave && typeof showToast === 'function') showToast('El archivo actual no es editable', 'error');
            return; 
        }
        try {
            const newContent = editor.value;

            // En guardado explícito, registramos en UndoStack
            if (!isAutoSave) {
                const file = await this.currentFileHandle.getFile();
                const oldContent = await file.text();
                if (oldContent !== newContent) {
                    await historyManager.saveState(this.currentFileHandle, oldContent, newContent);
                    historyManager.logAction('USUARIO (Visualizer)', `Guardó en disco y memoria histórica el archivo ${this.currentFileHandle.name}`);
                }
            }

            const writable = await this.currentFileHandle.createWritable();
            await writable.write(newContent);
            await writable.close();

            if (!isAutoSave && typeof showToast === 'function') showToast('Archivo guardado ✓', 'success');
        } catch (e) {
            if (!isAutoSave && typeof showToast === 'function') showToast(`Error al guardar: ${e.message}`, 'error');
        }
    },

    async previewHTML() {
        if (!this.currentFileHandle) {
            if (typeof showToast === 'function') showToast('No hay archivo abierto', 'error');
            return;
        }
        
        const fileName = this.currentFileHandle.name.toLowerCase();
        const isHTML = fileName.endsWith('.html');
        const isSVG = fileName.endsWith('.svg');
        
        if (!isHTML && !isSVG) {
            if (typeof showToast === 'function') showToast('La previsualización solo funciona con .html o .svg', 'error');
            return;
        }
        
        const editor = document.getElementById('visEditor');
        let content = editor ? editor.value : '';

        // Inyectar dependencias locales
        if (isHTML && typeof explorerLens !== 'undefined' && workspaceHandle) {
            if (typeof showToast === 'function') showToast('Procesando e inyectando dependencias locales...', 'listening');
            try {
                const cssRegex = /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi;
                let cssMatch;
                while ((cssMatch = cssRegex.exec(content)) !== null) {
                    const cssPath = cssMatch[1];
                    if (!cssPath.startsWith('http')) {
                        try {
                            const handle = await explorerLens.getHandleFromPath(cssPath);
                            const file = await handle.getFile();
                            const cssText = await file.text();
                            content = content.replace(cssMatch[0], `<style>\n/* Inyectado automáticamente de ${cssPath} */\n${cssText}\n</style>`);
                        } catch (e) {}
                    }
                }

                const jsRegex = /<script[^>]+src=["']([^"']+\.js)["'][^>]*><\/script>/gi;
                let jsMatch;
                while ((jsMatch = jsRegex.exec(content)) !== null) {
                    const jsPath = jsMatch[1];
                    if (!jsPath.startsWith('http')) {
                        try {
                            const handle = await explorerLens.getHandleFromPath(jsPath);
                            const file = await handle.getFile();
                            const jsText = await file.text();
                            content = content.replace(jsMatch[0], `<script>\n/* Inyectado automáticamente de ${jsPath} */\n${jsText}\n</script>`);
                        } catch (e) {}
                    }
                }
            } catch(e) {
                console.error("Error inyectando dependencias", e);
            }
        }
        
        const mimeType = isHTML ? 'text/html' : 'image/svg+xml';
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        if (typeof uiWeb !== 'undefined') {
            uiWeb.open(url);
            if (typeof showToast === 'function') showToast(`Visualizando en Navegador IA`, 'success');
        } else {
            window.open(url, '_blank');
        }
    },

    async renderCurrentFolder() {
        const grid = document.getElementById('visGridContainer');
        if (!grid) return;
        grid.innerHTML = '';
        
        const label = document.getElementById('visFolderLabel');
        if(label) label.innerText = `(${this.currentDirHandle.name})`;

        const upBtn = document.getElementById('visBtnUp');
        if (upBtn) {
            upBtn.style.opacity = this.parentDirHandles.length > 0 ? "1" : "0.3";
            upBtn.style.pointerEvents = this.parentDirHandles.length > 0 ? "auto" : "none";
        }

        try {
            const entries = [];
            for await (const entry of this.currentDirHandle.values()) {
                entries.push(entry);
            }
            
            entries.sort((a, b) => {
                if (a.kind === b.kind) return a.name.localeCompare(b.name);
                return a.kind === 'directory' ? -1 : 1;
            });

            if (entries.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 40px; font-family: monospace; font-size: 11px;">La carpeta está vacía.</div>';
                return;
            }

            for (const entry of entries) {
                const card = document.createElement('div');
                card.className = "vis-item-card";
                
                let iconHTML = '';
                if (entry.kind === 'directory') {
                    iconHTML = `<div class="vis-icon">📁</div>`;
                    card.onclick = () => this.openFolder(entry);
                } else {
                    const ext = entry.name.split('.').pop().toLowerCase();
                    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
                        const thumbId = 'thumb_' + Math.random().toString(36).substr(2, 9);
                        iconHTML = `<div class="vis-icon" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 6px; background: var(--surface2); border: 1px solid var(--text-dim); margin-bottom: 12px;"><div id="${thumbId}" style="font-size: 24px;">🖼️</div></div>`;
                        
                        entry.getFile().then(file => {
                            const url = URL.createObjectURL(file);
                            const thumbContainer = document.getElementById(thumbId);
                            if (thumbContainer) {
                                thumbContainer.parentElement.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                            }
                        }).catch(e => console.warn('Error cargando miniatura', e));
                        
                    } else if (['js', 'json', 'html', 'css', 'ts', 'py', 'md', 'txt'].includes(ext)) {
                        iconHTML = `<div class="vis-icon">📄</div>`;
                    } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                        iconHTML = `<div class="vis-icon">🎵</div>`;
                    } else if (['mp4', 'webm', 'mov'].includes(ext)) {
                        iconHTML = `<div class="vis-icon">🎞️</div>`;
                    } else {
                        iconHTML = `<div class="vis-icon">📝</div>`;
                    }
                    card.onclick = () => this.openFilePreview(entry);
                }

                card.innerHTML = `
                    ${iconHTML}
                    <div class="vis-name">${entry.name}</div>
                `;
                grid.appendChild(card);
            }
        } catch(e) {
            console.error("Error renderizando Visualizador:", e);
            grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--gem-red); text-align: center; padding: 20px;">Error al leer carpeta: ${e.message}</div>`;
        }
    },

    async openFilePreview(fileHandle) {
        this.currentFileHandle = fileHandle;
        const panel = document.getElementById('visFilePreviewPanel');
        const title = document.getElementById('visPreviewTitle');
        const content = document.getElementById('visPreviewContent');
        
        panel.classList.remove('hidden');
        title.innerText = fileHandle.name;
        content.innerHTML = '<div style="text-align: center; color: var(--text-dim); font-family: monospace; font-size: 11px; margin-top: 40px;">Cargando contenido...</div>';

        try {
            const file = await fileHandle.getFile();
            const ext = file.name.split('.').pop().toLowerCase();

            if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                const url = URL.createObjectURL(file);
                content.innerHTML = `<img src="${url}" style="width: 100%; height: auto; border-radius: 4px; object-fit: contain;">`;
            } else if (ext === 'svg') {
                const text = await file.text();
                content.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${text}</div>`;
            } else if (['mp4', 'webm', 'mov'].includes(ext)) {
                const url = URL.createObjectURL(file);
                content.innerHTML = `<video controls src="${url}" style="width: 100%; border-radius: 4px;"></video>`;
            } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                const url = URL.createObjectURL(file);
                content.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding-top:40px;"><div style="font-size:40px;">🎵</div><audio controls src="${url}" style="width: 100%;"></audio></div>`;
            } else {
                if (file.size > 2 * 1024 * 1024) { 
                     content.innerHTML = `<div style="color: var(--gem-red); font-family: monospace; font-size: 11px; text-align:center; margin-top:40px;">El archivo es demasiado masivo (>2MB) para previsualizarlo como texto.</div>`;
                } else {
                     const text = await file.text();
                     const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                     content.innerHTML = `<textarea id="visEditor" class="vis-textarea" spellcheck="false" style="flex:1;">${safeText}</textarea>`;
                     
                     // Enlazamos el Auto-guardado de persistencia
                     const editorEl = document.getElementById('visEditor');
                     editorEl.addEventListener('input', () => {
                         clearTimeout(this._visAutoSaveTimer);
                         this._visAutoSaveTimer = setTimeout(() => {
                             this.saveFile(true); // guardado silencioso (1s)
                         }, 1000);
                     });
                }
            }
        } catch(e) {
            content.innerHTML = `<div style="color: var(--gem-red); font-family: monospace; font-size: 11px; text-align:center; margin-top:40px;">Error de lectura: ${e.message}</div>`;
        }
    },

    closePreview() {
        this.currentFileHandle = null;
        const panel = document.getElementById('visFilePreviewPanel');
        const content = document.getElementById('visPreviewContent');
        if (panel) panel.classList.add('hidden');
        if (content) content.innerHTML = ''; 
    }
};