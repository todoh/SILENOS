/* SILENOS 3/import-manager.js */

const ImportManager = {
    renderInWindow(windowId) {
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!winContent) return;

        winContent.innerHTML = `
            <div class="flex flex-col h-full bg-[#f3f4f6] p-6 gap-6">
                
                <div class="flex items-center gap-3 border-b border-gray-300 pb-4">
                    <div class="p-3 bg-indigo-100 rounded-xl text-indigo-600 shadow-sm">
                        <i data-lucide="hard-drive" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-700">Almacenamiento Global</h3>
                        <p class="text-xs text-gray-500">Importar/Exportar Proyectos, Libros, Programas y Datos</p>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                    <div class="flex items-center gap-2 mb-1">
                        <i data-lucide="save" class="w-4 h-4 text-indigo-500"></i>
                        <label class="text-xs font-bold text-gray-500 uppercase">Backup Completo (Sistema + Módulos)</label>
                    </div>
                    <div class="flex items-center justify-between gap-4">
                        <p class="text-[11px] text-gray-400 leading-tight">
                            Descarga todo el sistema de archivos y los módulos de programación personalizados.
                        </p>
                        <button onclick="ImportManager.downloadBackup('${windowId}')" 
                            class="neumorph-btn px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-transform flex items-center gap-2 shrink-0">
                            <i data-lucide="download" class="w-4 h-4"></i> DESCARGAR
                        </button>
                    </div>
                </div>

                <div class="flex-1 flex flex-col gap-2 min-h-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div class="flex items-center gap-2 mb-1">
                        <i data-lucide="import" class="w-4 h-4 text-orange-500"></i>
                        <label class="text-xs font-bold text-gray-500 uppercase">Zona de Importación</label>
                    </div>

                    <div id="import-zone-${windowId}" class="flex-1 relative group bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors">
                        <textarea id="import-text-${windowId}" 
                            class="import-drop-zone w-full h-full bg-transparent p-4 text-xs font-mono text-gray-600 outline-none resize-none placeholder-gray-400"
                            placeholder='Arrastra aquí archivos .JSON (Backups/Datos) o Carpetas con .TXT (Narrativas).\nTambién puedes pegar texto JSON directamente.'></textarea>
                        
                        <div id="import-overlay-${windowId}" class="absolute inset-0 bg-indigo-50/90 flex flex-col items-center justify-center rounded-lg opacity-0 pointer-events-none transition-opacity z-10">
                            <i data-lucide="upload-cloud" class="w-10 h-10 text-indigo-500 mb-2"></i>
                            <span class="text-sm font-bold text-indigo-600">Soltar para procesar</span>
                        </div>
                    </div>

                    <div class="flex justify-between items-center mt-2">
                        <span id="import-count-${windowId}" class="text-[10px] font-bold text-gray-400">Esperando datos...</span>
                        
                        <button onclick="ImportManager.executeImport('${windowId}')" 
                            class="neumorph-btn px-6 py-2 text-xs font-bold text-green-600 hover:text-green-700 active:scale-95 transition-transform flex items-center gap-2">
                            <i data-lucide="check-circle" class="w-4 h-4"></i> IMPORTAR AL SISTEMA
                        </button>
                    </div>
                </div>

                <div id="import-status-${windowId}" class="text-[10px] text-center text-gray-400 font-mono h-4"></div>
            </div>
        `;

        this.setupEvents(windowId);
        if (window.lucide) lucide.createIcons();
    },

    setupEvents(windowId) {
        const textarea = document.getElementById(`import-text-${windowId}`);
        const overlay = document.getElementById(`import-overlay-${windowId}`);

        // Eventos Drag & Drop
        textarea.addEventListener('dragover', (e) => { e.preventDefault(); overlay.style.opacity = '1'; });
        textarea.addEventListener('dragleave', (e) => { e.preventDefault(); overlay.style.opacity = '0'; });
        
        textarea.addEventListener('drop', async (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            overlay.style.opacity = '0';

            const items = e.dataTransfer.items;
            if (items && items.length > 0) {
                // Manejo de Drop Externo (Archivos/Carpetas)
                await this.handleExternalDrop(items, textarea, windowId);
            }
        });
        
        // Manejo de Drop Interno (Iconos del propio sistema) -> ya manejado en drag-drop.js llamando a handleInternalDrop
    },

    // --- MANEJO DE DRAG & DROP EXTERNO (Archivos Reales) ---
    async handleExternalDrop(dataTransferItems, textarea, windowId) {
        this.setStatus(windowId, "Analizando archivos...", "text-blue-500");
        
        const fileEntries = [];
        const queue = [];

        // 1. Obtener entradas
        for (let i = 0; i < dataTransferItems.length; i++) {
            const item = dataTransferItems[i];
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
                if (entry) queue.push(entry);
            }
        }

        // 2. Recorrer recursivamente
        for (const entry of queue) {
            await this.traverseFileTree(entry, fileEntries);
        }

        this.setStatus(windowId, `Procesando ${fileEntries.length} archivos...`, "text-blue-500");

        // 3. Procesar Contenido
        const collectedItems = [];

        for (const entry of fileEntries) {
            try {
                const content = await this.readFileContent(entry);
                const result = this.processFileEntry(entry, content);
                
                if (result) {
                    if (Array.isArray(result)) {
                        // Si el archivo contenía un array (ej: backup.json), lo aplanamos
                        collectedItems.push(...result);
                    } else {
                        collectedItems.push(result);
                    }
                }
            } catch (err) {
                console.warn("Skip file:", entry.name);
            }
        }

        // 4. Volcar al Textarea
        if (collectedItems.length > 0) {
            // Formatear bonito
            textarea.value = JSON.stringify(collectedItems, null, 2);
            this.setStatus(windowId, `Detectados ${collectedItems.length} elementos. Pulsa IMPORTAR.`, "text-green-600 font-bold");
            document.getElementById(`import-count-${windowId}`).innerText = `${collectedItems.length} objetos listos`;
        } else {
            this.setStatus(windowId, "No se encontraron datos compatibles.", "text-red-500");
        }
    },

    // --- MANEJO DE DRAG & DROP INTERNO (Iconos de Silenos) ---
    handleInternalDrop(idList, dropZone, windowId) {
        const items = [];
        idList.forEach(id => {
            const item = FileSystem.getItem(id);
            if(item) items.push(item);
        });
        
        if (items.length > 0) {
            // Convertir a JSON en el textarea
            const textarea = document.getElementById(`import-text-${windowId}`);
            if (textarea) {
                textarea.value = JSON.stringify(items, null, 2);
                this.setStatus(windowId, `Cargados ${items.length} elementos internos.`, "text-blue-600");
            }
        }
    },

    // Recorre carpetas recursivamente
    traverseFileTree(entry, fileList) {
        return new Promise((resolve) => {
            if (entry.isFile) {
                fileList.push(entry);
                resolve();
            } else if (entry.isDirectory) {
                const dirReader = entry.createReader();
                const readEntries = () => {
                    dirReader.readEntries(async (entries) => {
                        if (entries.length === 0) {
                            resolve();
                        } else {
                            const promises = [];
                            for (const subEntry of entries) {
                                promises.push(this.traverseFileTree(subEntry, fileList));
                            }
                            await Promise.all(promises);
                            readEntries(); 
                        }
                    }, (err) => resolve());
                };
                readEntries();
            } else {
                resolve();
            }
        });
    },

    readFileContent(fileEntry) {
        return new Promise((resolve, reject) => {
            fileEntry.file((file) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file);
            }, reject);
        });
    },

    // Lógica inteligente para convertir archivos en objetos del sistema
    processFileEntry(entry, contentText) {
        const filename = entry.name;
        
        // 1. JSON (Puede ser un backup completo, un item suelto, un libro, programa, etc.)
        if (filename.toLowerCase().endsWith('.json')) {
            try {
                const json = JSON.parse(contentText);
                return json; // Devuelve el objeto o array tal cual
            } catch (e) { return null; }
        }

        // 2. TEXTO / MD (Convertir a Narrativa)
        if (filename.toLowerCase().endsWith('.txt') || filename.toLowerCase().endsWith('.md')) {
            const fullPath = entry.fullPath || ("/" + filename);
            const parts = fullPath.split('/');
            // Usar nombre de carpeta padre como etiqueta
            let tag = "GENERAL";
            if (parts.length > 2) tag = parts[parts.length - 2]; 

            return {
                id: 'narrative-import-' + Date.now() + Math.random(),
                type: 'narrative',
                title: filename.replace(/\.(txt|md)$/i, ''),
                content: {
                    tag: tag.toUpperCase(),
                    text: contentText
                },
                x: 100, y: 100, // Posiciones dummy, se pueden reorganizar luego
                icon: 'sticky-note',
                color: 'text-orange-500',
                parentId: 'desktop' // Por defecto al escritorio
            };
        }

        return null;
    },

    // --- EJECUCIÓN DE LA IMPORTACIÓN (Crear/Sobrescribir en Sistema) ---
    executeImport(windowId) {
        const raw = document.getElementById(`import-text-${windowId}`).value;
        if (!raw.trim()) return this.setStatus(windowId, "El área está vacía.", "text-red-500");

        try {
            let data = JSON.parse(raw);
            if (!Array.isArray(data)) data = [data]; // Normalizar a array

            let count = 0;
            let modulesCount = 0;

            data.forEach(item => {
                if (!item.type) return;

                // A. MÓDULOS DE PROGRAMACIÓN
                if (item.type === 'custom-module') {
                    if (typeof ProgrammerManager !== 'undefined') {
                        // Buscar si existe para actualizar o añadir
                        const idx = ProgrammerManager.customModules.findIndex(m => m.id === item.id);
                        // Limpiamos la propiedad 'type' que se añade solo para exportar
                        const moduleData = { ...item };
                        delete moduleData.type; 
                        
                        if (idx >= 0) ProgrammerManager.customModules[idx] = moduleData;
                        else ProgrammerManager.customModules.push(moduleData);
                        
                        modulesCount++;
                    }
                } 
                // B. ITEMS DEL SISTEMA DE ARCHIVOS (Folder, File, Book, Program, Narrative)
                else if (['folder', 'file', 'program', 'narrative', 'book', 'data'].includes(item.type)) {
                    // Verificar si existe por ID
                    const existingIdx = FileSystem.data.findIndex(i => i.id === item.id);
                    
                    if (existingIdx >= 0) {
                        // Sobrescribir existente (Restore)
                        FileSystem.data[existingIdx] = item;
                    } else {
                        // Crear nuevo
                        FileSystem.data.push(item);
                    }
                    count++;
                }
            });

            // Guardar cambios
            FileSystem.save();
            if (modulesCount > 0 && typeof ProgrammerManager !== 'undefined') {
                ProgrammerManager.saveModules();
            }

            this.setStatus(windowId, `Importado: ${count} items, ${modulesCount} módulos.`, "text-green-600 font-bold");
            
            // Refrescar vistas
            if (typeof refreshSystemViews === 'function') refreshSystemViews();
            
        } catch (e) {
            this.setStatus(windowId, "Error JSON: " + e.message, "text-red-600");
        }
    },

    downloadBackup(windowId) {
        try {
            // 1. Obtener datos del sistema de archivos
            let backupData = [...FileSystem.data];
            
            // 2. Adjuntar módulos personalizados si existen
            let modCount = 0;
            if (typeof ProgrammerManager !== 'undefined' && ProgrammerManager.customModules.length > 0) {
                 // Añadimos 'type: custom-module' para que executeImport los reconozca
                 const mods = ProgrammerManager.customModules.map(m => ({ ...m, type: 'custom-module' }));
                 backupData = backupData.concat(mods);
                 modCount = mods.length;
            }

            const jsonStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `silenos_full_backup_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            this.setStatus(windowId, `Backup generado (${backupData.length} items, incluye ${modCount} módulos).`, "text-indigo-600");
        } catch (e) {
            this.setStatus(windowId, "Error generando backup: " + e.message, "text-red-500");
        }
    },

    setStatus(windowId, msg, colorClass = "text-gray-500") {
        const el = document.getElementById(`import-status-${windowId}`);
        if (el) {
            el.innerHTML = msg;
            el.className = `text-[10px] text-center font-mono h-4 ${colorClass}`;
        }
    }
};