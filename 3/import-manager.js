/* SILENOS 3/import-manager.js */

const ImportManager = {
    renderInWindow(windowId) {
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!winContent) return;

        winContent.innerHTML = `
            <div class="flex flex-col h-full bg-[#f3f4f6] p-6 gap-6 relative">
                
                <div class="flex items-center gap-3 border-b border-gray-300 pb-4 shrink-0">
                    <div class="p-3 bg-indigo-100 rounded-xl text-indigo-600 shadow-sm">
                        <i data-lucide="hard-drive" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-700">Almacenamiento Global</h3>
                        <p class="text-xs text-gray-500">Importar/Exportar Proyectos, Libros, Programas y Datos</p>
                    </div>
                </div>

                <div class="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
                    
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 shrink-0">
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

                    <div class="flex flex-col gap-2 bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0" style="min-height: 200px;">
                        <div class="flex items-center gap-2 mb-1">
                            <i data-lucide="import" class="w-4 h-4 text-orange-500"></i>
                            <label class="text-xs font-bold text-gray-500 uppercase">Zona de Importación</label>
                        </div>

                        <div id="import-zone-${windowId}" class="flex-1 relative group bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors h-32">
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

                    <div class="mt-4 pt-4 border-t border-red-200">
                        <div class="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2 text-red-600 mb-1">
                                    <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                                    <span class="text-xs font-bold uppercase">Zona de Peligro</span>
                                </div>
                                <p class="text-[10px] text-red-400">Borra archivos y módulos. Mantiene API Keys.</p>
                            </div>
                            <button onclick="ImportManager.showResetModal('${windowId}')" 
                                class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform">
                                ☢️ VACIAR MEMORIA
                            </button>
                        </div>
                    </div>

                </div>

                <div id="import-status-${windowId}" class="text-[10px] text-center text-gray-400 font-mono h-4 shrink-0"></div>
                
                <div id="modal-container-${windowId}"></div>
            </div>
        `;

        this.setupEvents(windowId);
        if (window.lucide) lucide.createIcons();
    },

    setupEvents(windowId) {
        const textarea = document.getElementById(`import-text-${windowId}`);
        const overlay = document.getElementById(`import-overlay-${windowId}`);

        if (!textarea) return;

        textarea.addEventListener('dragover', (e) => { e.preventDefault(); overlay.style.opacity = '1'; });
        textarea.addEventListener('dragleave', (e) => { e.preventDefault(); overlay.style.opacity = '0'; });
        
        textarea.addEventListener('drop', async (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            overlay.style.opacity = '0';

            const items = e.dataTransfer.items;
            if (items && items.length > 0) {
                await this.handleExternalDrop(items, textarea, windowId);
            }
        });
    },

    showResetModal(windowId) {
        const container = document.getElementById(`modal-container-${windowId}`);
        if (!container) return;

        container.innerHTML = `
            <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-b-[20px] pop-in">
                <div class="bg-white w-4/5 max-sm:w-full p-6 rounded-2xl shadow-2xl flex flex-col gap-4 items-center text-center border-2 border-red-100">
                    <div class="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-2">
                        <i data-lucide="trash-2" class="w-6 h-6"></i>
                    </div>
                    
                    <h3 class="text-lg font-bold text-gray-800">¿Estás seguro?</h3>
                    <p class="text-xs text-gray-500 leading-relaxed">
                        Esta acción borrará <b>TODOS</b> los archivos, carpetas, libros y módulos personalizados del sistema.<br>
                        <span class="text-green-600 font-bold">Tu API KEY se conservará.</span>
                    </p>

                    <div class="flex gap-3 w-full mt-2">
                        <button onclick="document.getElementById('modal-container-${windowId}').innerHTML=''" 
                            class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition-colors">
                            CANCELAR
                        </button>
                        <button onclick="ImportManager.executeReset('${windowId}')" 
                            class="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs shadow-lg transition-transform active:scale-95">
                            SÍ, BORRAR TODO
                        </button>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    },

    executeReset(windowId) {
        const savedKeys = localStorage.getItem('silenos_api_keys');
        localStorage.clear();
        if (savedKeys) localStorage.setItem('silenos_api_keys', savedKeys);

        const container = document.getElementById(`modal-container-${windowId}`);
        if (container) {
            container.innerHTML = `
                <div class="absolute inset-0 z-50 flex items-center justify-center bg-white rounded-b-[20px]">
                    <div class="flex flex-col items-center gap-3 text-green-600 animate-pulse">
                        <i data-lucide="refresh-cw" class="w-8 h-8 animate-spin"></i>
                        <span class="text-sm font-bold">Reiniciando Sistema...</span>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }

        setTimeout(() => location.reload(), 1500);
    },

    async handleExternalDrop(dataTransferItems, textarea, windowId) {
        this.setStatus(windowId, "Analizando materia binaria...", "text-blue-500");
        const entries = [];
        for (let i = 0; i < dataTransferItems.length; i++) {
            const item = dataTransferItems[i];
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
                if (entry) entries.push(entry);
            }
        }

        const collectedItems = [];
        for (const entry of entries) {
            await this.processRecursiveEntry(entry, collectedItems);
        }

        if (collectedItems.length > 0) {
            textarea.value = JSON.stringify(collectedItems, null, 2);
            this.setStatus(windowId, `${collectedItems.length} elementos listos para confluencia.`, "text-green-600");
        }
    },

    async processRecursiveEntry(entry, list, parentId = 'desktop') {
        if (entry.isFile) {
            const file = await new Promise((res) => entry.file(res));
            const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name);

            if (isImage) {
                const savedName = await FileSystem.saveImageFile(file);
                if (savedName) {
                    list.push({
                        id: 'image-' + Date.now() + Math.random().toString(36).substr(2, 5),
                        type: 'image',
                        title: file.name,
                        content: savedName,
                        parentId: parentId,
                        icon: 'image',
                        color: 'text-blue-400',
                        x: 100 + Math.random() * 100,
                        y: 100 + Math.random() * 100
                    });
                }
            } else if (file.name.endsWith('.json')) {
                const text = await file.text();
                try { 
                    const data = JSON.parse(text);
                    if (Array.isArray(data)) list.push(...data);
                    else list.push(data);
                } catch(e) {}
            } else if (file.name.endsWith('.txt')) {
                const text = await file.text();
                list.push({
                    id: 'narrative-' + Date.now(),
                    type: 'narrative',
                    title: file.name.replace('.txt', ''),
                    content: { tag: "IMPORT", text: text },
                    parentId: parentId,
                    icon: 'sticky-note',
                    color: 'text-orange-500'
                });
            }
        } else if (entry.isDirectory) {
            const folderId = 'folder-' + Date.now();
            list.push({
                id: folderId,
                type: 'folder',
                title: entry.name,
                parentId: parentId,
                icon: 'folder',
                color: 'text-blue-500'
            });
            const reader = entry.createReader();
            const subEntries = await new Promise(res => reader.readEntries(res));
            for (const sub of subEntries) {
                await this.processRecursiveEntry(sub, list, folderId);
            }
        }
    },

    async executeImport(windowId) {
        const raw = document.getElementById(`import-text-${windowId}`).value;
        if (!raw.trim()) return this.setStatus(windowId, "El área está vacía.", "text-red-500");

        try {
            if (typeof ProgrammerManager !== 'undefined') await ProgrammerManager.init();

            let data = JSON.parse(raw);
            if (!Array.isArray(data)) data = [data]; 

            // --- LÓGICA DE RE-IDENTIFICACIÓN (H) PARA EVITAR SOBREESCRITURA ---
            const idMap = {};
            data.forEach(item => {
                if (item.id && item.type !== 'custom-module') {
                    // Generar un nuevo ID único basado en el tipo y el tiempo
                    const newId = item.type + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
                    idMap[item.id] = newId;
                }
            });

            let count = 0;
            let modulesCount = 0;

            data.forEach(item => {
                if (!item.type) return;

                if (item.type === 'custom-module') {
                    // Los módulos de código suelen mantener su ID para actualizarse
                    if (typeof ProgrammerManager !== 'undefined') {
                        const idx = ProgrammerManager.customModules.findIndex(m => m.id === item.id);
                        const moduleData = { ...item };
                        delete moduleData.type; 
                        
                        if (idx >= 0) ProgrammerManager.customModules[idx] = moduleData;
                        else ProgrammerManager.customModules.push(moduleData);
                        
                        modulesCount++;
                    }
                } 
                else if (['folder', 'file', 'program', 'narrative', 'book', 'data', 'executable', 'image'].includes(item.type)) {
                    // Aplicar la nueva identidad si el ID estaba en el mapa
                    if (idMap[item.id]) {
                        item.id = idMap[item.id];
                    }
                    
                    // Re-vincular con el padre si este también fue importado/renombrado
                    if (item.parentId && idMap[item.parentId]) {
                        item.parentId = idMap[item.parentId];
                    }

                    // Al tener IDs nuevos, siempre los añadimos al sistema
                    FileSystem.data.push(item);
                    count++;
                }
            });

            const missingParents = new Set();
            FileSystem.data.forEach(item => {
                if (item.parentId && item.parentId !== 'desktop') {
                    const parentExists = FileSystem.data.some(f => f.id === item.parentId);
                    if (!parentExists) missingParents.add(item.parentId);
                }
            });

            missingParents.forEach(pid => {
                FileSystem.data.push({
                    id: pid,
                    type: 'folder',
                    title: 'Carpeta Recuperada',
                    parentId: 'desktop', 
                    x: 50 + (Math.random() * 50), 
                    y: 50 + (Math.random() * 50),
                    icon: 'folder',
                    color: 'text-amber-500'
                });
            });

            FileSystem.save();
            if (modulesCount > 0 && typeof ProgrammerManager !== 'undefined') ProgrammerManager.saveModules();

            this.setStatus(windowId, `Importado: ${count} items, ${modulesCount} módulos.`, "text-green-600 font-bold");
            if (typeof refreshSystemViews === 'function') refreshSystemViews();
            
        } catch (e) {
            this.setStatus(windowId, "Error JSON: " + e.message, "text-red-600");
        }
    },

    async downloadBackup(windowId) {
        try {
            if (typeof ProgrammerManager !== 'undefined') await ProgrammerManager.init();

            let backupData = [...FileSystem.data];
            if (typeof ProgrammerManager !== 'undefined' && ProgrammerManager.customModules.length > 0) {
                 const mods = ProgrammerManager.customModules.map(m => ({ ...m, type: 'custom-module' }));
                 backupData = backupData.concat(mods);
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
            
            this.setStatus(windowId, `Backup generado (${backupData.length} items).`, "text-indigo-600");
        } catch (e) {
            this.setStatus(windowId, "Error: " + e.message, "text-red-500");
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