// live gemini/visualizador.js
// ─── VISUALIZADOR DE ARCHIVOS ──────────────────────────────────────────

window.visualizadorUI = {
    currentDirHandle: null,
    parentDirHandles: [], 
    currentFileHandle: null,
    _dragBound: null,

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
            
            // Ordenar: Carpetas primero, luego alfabético
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
                        // Generación de miniatura real asíncrona
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
                     content.innerHTML = `<textarea readonly class="vis-textarea" spellcheck="false">${safeText}</textarea>`;
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