// ─── IDE & FILE MANAGER ───────────────────────────────────────────────────

const ide = {
    currentFileHandle: null,
    currentDirHandle: null,
    currentDirPath: "",
    clipboard: null, // { handle, isFile: boolean, type: 'copy', sourceDir }
    expandedPaths: new Set(), // Memoria de estado profundo para evitar colapsos visuales
    _keydownBound: null, // Referencia estática para evitar fugas de memoria

    open() {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta primero', 'error');
            return;
        }
        this.currentDirHandle = workspaceHandle;
        this.currentDirPath = "";
        document.getElementById('ideModal').classList.remove('hidden');
        this.refreshTree();

        // Evitar múltiples bindings creando una única referencia
        if (!this._keydownBound) this._keydownBound = this.handleKeydown.bind(this);
        document.getElementById('ideEditor').addEventListener('keydown', this._keydownBound);
    },

    close() {
        document.getElementById('ideModal').classList.add('hidden');
        if (this._keydownBound) {
            document.getElementById('ideEditor').removeEventListener('keydown', this._keydownBound);
        }
    },

    handleKeydown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveFile();
        }
    },

    async ensurePath(fullPath, isDir) {
        if (!workspaceHandle) throw new Error("No hay workspace seleccionado.");
        
        let normalizedPath = fullPath.replace(/\\/g, '/').trim();
        if (normalizedPath.startsWith('/')) normalizedPath = normalizedPath.substring(1);
        if (normalizedPath.startsWith('./')) normalizedPath = normalizedPath.substring(2);
        
        const parts = normalizedPath.split('/').filter(p => p && p !== '.');
        let currentHandle = workspaceHandle;
        let currentPathAcc = '';
        
        const dirParts = isDir ? parts : parts.slice(0, -1);
        const fileName = isDir ? null : parts[parts.length - 1];
        
        // Creación recursiva de la estructura de carpetas
        for (const part of dirParts) {
            currentPathAcc += (currentPathAcc ? '/' : '') + part;
            currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
            this.expandedPaths.add(currentPathAcc); // Mantiene la carpeta visualmente expandida
        }
        
        if (isDir) {
            return currentHandle;
        } else {
            if (!fileName) throw new Error("Ruta de archivo inválida.");
            return await currentHandle.getFileHandle(fileName, { create: true });
        }
    },

    async refreshTree() {
        if (!workspaceHandle) return;
        const container = document.getElementById('ideTree');
        container.innerHTML = '';
        await this.renderDirectory(workspaceHandle, container, 0, "");
    },

    async renderDirectory(dirHandle, container, level, pathPrefix) {
        try {
            // Ordenar: Carpetas primero, luego archivos
            const entries = [];
            for await (const entry of dirHandle.values()) {
                entries.push(entry);
            }
            entries.sort((a, b) => {
                if (a.kind === b.kind) return a.name.localeCompare(b.name);
                return a.kind === 'directory' ? -1 : 1;
            });

            for (const entry of entries) {
                const fullPath = pathPrefix + (pathPrefix ? '/' : '') + entry.name;
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'tree-item';
                itemDiv.style.paddingLeft = `${level * 15}px`;
                
                const isDir = entry.kind === 'directory';
                const isExpanded = this.expandedPaths.has(fullPath);
                const icon = isDir ? (isExpanded ? '📂' : '📁') : '📄';
                
                const titleSpan = document.createElement('span');
                titleSpan.className = 'tree-title';
                titleSpan.textContent = `${icon} ${entry.name}`;
                
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'tree-actions';
                
                // Pasamos strings correctamente escapados
                const safeName = entry.name.replace(/'/g, "\\'");
                const safePath = fullPath.replace(/'/g, "\\'");
                
                actionsDiv.innerHTML = `
                    <button title="Copiar" onclick="ide.setClipboard('${safeName}', ${isDir}, false, event, '${safePath}')">C</button>
                    <button title="Backup" onclick="ide.createBackup('${safeName}', ${isDir}, event, '${safePath}')">B</button>
                    <button title="Eliminar" onclick="ide.deleteEntry('${safeName}', ${isDir}, event, '${safePath}')" style="color:var(--gem-red)">X</button>
                `;

                itemDiv.appendChild(titleSpan);
                itemDiv.appendChild(actionsDiv);
                
                const childrenContainer = document.createElement('div');
                childrenContainer.style.display = isExpanded ? 'block' : 'none';

                // Renderizado profundo si el estado lo marca como expandido
                if (isDir && isExpanded) {
                    await this.renderDirectory(entry, childrenContainer, level + 1, fullPath);
                }

                itemDiv.onclick = async (e) => {
                    e.stopPropagation();
                    this.currentDirHandle = isDir ? entry : dirHandle; 
                    this.currentDirPath = isDir ? fullPath : pathPrefix;
                    
                    if (isDir) {
                        const willExpand = childrenContainer.style.display === 'none';
                        childrenContainer.style.display = willExpand ? 'block' : 'none';
                        
                        if (willExpand) {
                            this.expandedPaths.add(fullPath);
                            titleSpan.textContent = `📂 ${entry.name}`;
                            if (childrenContainer.innerHTML === '') {
                                await this.renderDirectory(entry, childrenContainer, level + 1, fullPath);
                            }
                        } else {
                            this.expandedPaths.delete(fullPath);
                            titleSpan.textContent = `📁 ${entry.name}`;
                        }
                    } else {
                        await this.openFile(entry);
                    }
                };

                container.appendChild(itemDiv);
                if (isDir) container.appendChild(childrenContainer);
            }
        } catch (e) {
            console.error("Error leyendo directorio:", e);
        }
    },

    async openFile(fileHandle) {
        try {
            const file = await fileHandle.getFile();
            const content = await file.text();
            document.getElementById('ideEditor').value = content;
            document.getElementById('ideCurrentFile').textContent = `Editando: ${fileHandle.name}`;
            this.currentFileHandle = fileHandle;
            if (typeof showToast === 'function') showToast(`Archivo abierto: ${fileHandle.name}`, 'success');
        } catch (e) {
            if (typeof showToast === 'function') showToast(`Error al abrir: ${e.message}`, 'error');
        }
    },

    async saveFile() {
        if (!this.currentFileHandle) {
            if (typeof showToast === 'function') showToast('No hay archivo abierto para guardar', 'error');
            return;
        }
        try {
            const writable = await this.currentFileHandle.createWritable();
            await writable.write(document.getElementById('ideEditor').value);
            await writable.close();
            if (typeof showToast === 'function') showToast('Archivo guardado ✓', 'success');
        } catch (e) {
            if (typeof showToast === 'function') showToast(`Error al guardar: ${e.message}`, 'error');
        }
    },

    async createFile() {
        const name = prompt("Nombre del nuevo archivo (ej: index.html o src/app.js):");
        if (!name) return;

        try {
            const basePath = this.currentDirPath ? this.currentDirPath + '/' : '';
            const fullPath = basePath + name;
            
            const newFileHandle = await this.ensurePath(fullPath, false);
            await this.openFile(newFileHandle);
            this.refreshTree();
            if (typeof showToast === 'function') showToast(`Archivo creado ✓`, 'success');
        } catch (e) {
            console.error("Error profundo creando archivo:", e);
            if (typeof showToast === 'function') showToast(`Error al crear: ${e.message}`, 'error');
        }
    },

    async createFolder() {
        const name = prompt("Nombre de la nueva carpeta (ej: componentes o src/utils):");
        if (!name) return;

        try {
            const basePath = this.currentDirPath ? this.currentDirPath + '/' : '';
            const fullPath = basePath + name;
            
            await this.ensurePath(fullPath, true);
            this.refreshTree();
            if (typeof showToast === 'function') showToast(`Carpeta creada ✓`, 'success');
        } catch (e) {
            console.error("Error profundo creando carpeta:", e);
            if (typeof showToast === 'function') showToast(`Error al crear carpeta: ${e.message}`, 'error');
        }
    },

    setClipboard(name, isDir, isCut, event, fullPath) {
        event.stopPropagation();
        const targetDir = this.currentDirHandle || workspaceHandle;
        this.clipboard = { name, isDir, sourceDir: targetDir };
        if (typeof showToast === 'function') showToast(`Copiado al portapapeles: ${name}`, 'success');
    },

    async paste() {
        if (!this.clipboard) return showToast('El portapapeles está vacío', 'error');
        const destDir = this.currentDirHandle || workspaceHandle;
        
        try {
            if (this.clipboard.isDir) {
                const srcHandle = await this.clipboard.sourceDir.getDirectoryHandle(this.clipboard.name);
                const destHandle = await destDir.getDirectoryHandle(this.clipboard.name + '_copia', { create: true });
                await this.copyDirectoryRecursive(srcHandle, destHandle);
            } else {
                const srcHandle = await this.clipboard.sourceDir.getFileHandle(this.clipboard.name);
                const file = await srcHandle.getFile();
                
                // Procesamiento estricto para nombres de archivo sin extensiones
                let newName = this.clipboard.name;
                if (newName.includes('.')) {
                    newName = newName.replace(/(\.[^.]+)$/, '_copia$1');
                } else {
                    newName = newName + '_copia';
                }
                
                const destHandle = await destDir.getFileHandle(newName, { create: true });
                const writable = await destHandle.createWritable();
                await writable.write(await file.arrayBuffer());
                await writable.close();
            }
            
            if (this.currentDirPath) this.expandedPaths.add(this.currentDirPath);
            this.refreshTree();
            
            if (typeof showToast === 'function') showToast('Pegado exitoso', 'success');
        } catch (e) {
            console.error("Error profundo al pegar:", e);
            if (typeof showToast === 'function') showToast(`Error al pegar: ${e.message}`, 'error');
        }
    },

    async copyDirectoryRecursive(srcDir, destDir) {
        for await (const entry of srcDir.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                const newFile = await destDir.getFileHandle(entry.name, { create: true });
                const writable = await newFile.createWritable();
                await writable.write(await file.arrayBuffer());
                await writable.close();
            } else if (entry.kind === 'directory') {
                const newDir = await destDir.getDirectoryHandle(entry.name, { create: true });
                await this.copyDirectoryRecursive(entry, newDir);
            }
        }
    },

    async createBackup(name, isDir, event, fullPath) {
        event.stopPropagation();
        const targetDir = this.currentDirHandle || workspaceHandle;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        try {
            if (isDir) {
                const srcHandle = await targetDir.getDirectoryHandle(name);
                const destHandle = await targetDir.getDirectoryHandle(`${name}_backup_${timestamp}`, { create: true });
                await this.copyDirectoryRecursive(srcHandle, destHandle);
            } else {
                const srcHandle = await targetDir.getFileHandle(name);
                const file = await srcHandle.getFile();
                
                let destName = name;
                if (destName.includes('.')) {
                    destName = destName.replace(/(\.[^.]+)$/, `_backup_${timestamp}$1`);
                } else {
                    destName = destName + `_backup_${timestamp}`;
                }
                
                const destHandle = await targetDir.getFileHandle(destName, { create: true });
                const writable = await destHandle.createWritable();
                await writable.write(await file.arrayBuffer());
                await writable.close();
            }
            
            if (this.currentDirPath) this.expandedPaths.add(this.currentDirPath);
            this.refreshTree();
            
            if (typeof showToast === 'function') showToast(`Backup creado exitosamente`, 'success');
        } catch (e) {
            console.error("Error profundo en backup:", e);
            if (typeof showToast === 'function') showToast(`Error en backup: ${e.message}`, 'error');
        }
    },

    async deleteEntry(name, isDir, event, fullPath) {
        event.stopPropagation();
        if (!confirm(`¿Estás seguro de eliminar permanentemente '${name}'?`)) return;
        const targetDir = this.currentDirHandle || workspaceHandle;
        try {
            await targetDir.removeEntry(name, { recursive: isDir });
            
            if (this.currentFileHandle && this.currentFileHandle.name === name) {
                this.currentFileHandle = null;
                document.getElementById('ideEditor').value = '';
                document.getElementById('ideCurrentFile').textContent = 'Ningún archivo abierto';
            }
            
            this.expandedPaths.delete(fullPath);
            if (this.currentDirPath) this.expandedPaths.add(this.currentDirPath);
            this.refreshTree();
            
            if (typeof showToast === 'function') showToast(`Eliminado: ${name}`, 'success');
        } catch (e) {
            console.error("Error profundo eliminando:", e);
            if (typeof showToast === 'function') showToast(`Error al eliminar: ${e.message}`, 'error');
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
            if (typeof showToast === 'function') showToast('La previsualización solo funciona con archivos .html o .svg', 'error');
            return;
        }
        
        let content = document.getElementById('ideEditor').value;

        // Inyectar dependencias locales (CSS y JS) solo si es HTML, para que funcionen dentro del Blob
        if (isHTML && typeof explorerLens !== 'undefined' && workspaceHandle) {
            if (typeof showToast === 'function') showToast('Procesando e inyectando dependencias locales...', 'listening');
            try {
                // Inyectar CSS local referenciado con <link href="archivo.css">
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
                        } catch (e) { console.warn(`No se pudo inyectar el CSS local: ${cssPath}`, e); }
                    }
                }

                // Inyectar JS local referenciado con <script src="archivo.js">
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
                        } catch (e) { console.warn(`No se pudo inyectar el JS local: ${jsPath}`, e); }
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
            if (typeof showToast === 'function') showToast(`Visualizando ${isHTML ? 'HTML' : 'SVG'} en el Navegador IA`, 'success');
        } else {
            window.open(url, '_blank');
        }
    }
};

// Vinculación de físicas al modal
document.addEventListener('DOMContentLoaded', () => {
    if (typeof makeDraggable === 'function') {
        makeDraggable(document.getElementById('ideModal'), document.getElementById('ideModalHeader'));
    }
});