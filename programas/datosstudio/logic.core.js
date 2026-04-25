// --- APP PRINCIPAL (CORE) ---
class DataStudio {
    constructor() {
        this.rootHandle = null;     
        this.targetHandle = null;   
        this.items = [];            
        this.tramas = []; 
        this.currentFileHandle = null; 
        this.currentData = null;    
        this.processingIds = new Set();
        this.saveTimer = null; 
    }

    init() {
        ui.updateAuthUI();
        window.parent.addEventListener('silenos:config-updated', ui.updateAuthUI);
        if(typeof FS !== 'undefined' && FS.rootHandle) this.rootHandle = FS.rootHandle;
        setTimeout(() => ui.toggleFolderModal(), 500);

        const inputs = ['inp-title', 'inp-tag', 'inp-desc', 'inp-visual'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.scheduleSave());
            }
        });
    }

    scheduleSave() {
        const btn = document.getElementById('btn-save');
        if (btn && btn.innerText !== "GUARDANDO...") {
            btn.innerText = "ESPERANDO...";
            btn.classList.remove('bg-green-600');
        }
        clearTimeout(this.saveTimer);
        // Autoguardado silencioso tras 1.5s
        this.saveTimer = setTimeout(() => this.saveCurrentItem(true), 1500); 
    }

    // --- SISTEMA DE ARCHIVOS ---
    async scanRoot() {
        const list = document.getElementById('folder-list'); list.innerHTML = '';
        if (!this.rootHandle) {
            list.innerHTML = '<div class="p-8 text-center text-xs text-red-400">Root Handle no disponible.</div>';
            return;
        }
        this.addFolderOption(list, this.rootHandle, 'ROOT', true);
        await this.scanDirRecursive(this.rootHandle, list, 'ROOT');
    }

    async scanDirRecursive(dirHandle, listElement, pathString, depth = 0) {
        if (depth > 2) return; 
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                const currentPath = `${pathString} / ${entry.name}`;
                this.addFolderOption(listElement, entry, currentPath);
                await this.scanDirRecursive(entry, listElement, currentPath, depth + 1);
            }
        }
    }

    addFolderOption(container, handle, displayName, isRoot) {
        const el = document.createElement('div');
        el.className = "px-6 py-3 cursor-pointer border-b border-gray-50 flex items-center gap-4 text-xs font-light text-gray-600 hover:bg-gray-50 transition-colors";
        const icon = isRoot ? 'fa-database text-black' : 'fa-folder text-gray-300';
        el.innerHTML = `<i class="fa-solid ${icon} text-[10px]"></i><span class="truncate w-full tracking-wide">${displayName}</span>`;
        el.onclick = () => {
            this.targetHandle = handle;
            document.getElementById('folder-label-btn').querySelector('span').innerText = displayName.split('/').pop();
            ui.toggleFolderModal();
            this.loadFiles();
        };
        container.appendChild(el);
    }

    async loadFiles() {
        if(!this.targetHandle) return;
        this.items = [];
        const grid = document.getElementById('grid-container');
        grid.innerHTML = '<div class="col-span-full text-center text-gray-300 text-xs py-12">Cargando datos...</div>';

        try {
            for await (const entry of this.targetHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.includes('TIMELINE') && !entry.name.includes('RESUMEN_GLOBAL') && !entry.name.includes('TRAMAS_GLOBAL')) {
                    const file = await entry.getFile();
                    const text = await file.text();
                    try {
                        const json = JSON.parse(text);
                        let displayImage = json.imagen64; 
                        
                        if (json.imageFile) {
                            try {
                                const imgHandle = await this.targetHandle.getFileHandle(json.imageFile);
                                const imgFile = await imgHandle.getFile();
                                displayImage = URL.createObjectURL(imgFile);
                            } catch(e) { console.warn("Imagen enrutada no encontrada:", json.imageFile); }
                        }

                        this.items.push({ handle: entry, data: json, name: entry.name, displayImage: displayImage });
                    } catch(e) { console.warn("JSON corrupto", entry.name); }
                }
            }

            try {
                const tramasHandle = await this.targetHandle.getFileHandle('TRAMAS_GLOBAL.json');
                const tramasFile = await tramasHandle.getFile();
                const tramasText = await tramasFile.text();
                this.tramas = JSON.parse(tramasText);
            } catch (e) {
                this.tramas = [];
            }

            this.renderGrid();

            if (typeof window.TramasCanvas !== 'undefined') {
                window.TramasCanvas.render();
            }

        } catch(e) { console.error(e); }
    }

    async saveTramas() {
        if(!this.targetHandle) return;
        try {
            const fileHandle = await this.targetHandle.getFileHandle('TRAMAS_GLOBAL.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(this.tramas, null, 2));
            await writable.close();
            Utils.log("Red de Tramas Omega guardada.", "success");
        } catch(e) {
            console.error("Error guardando tramas:", e);
            Utils.log("Error crítico al guardar Tramas Omega.", "error");
        }
    }

    renderGrid() {
        const grid = document.getElementById('grid-container');
        grid.innerHTML = '';
        
        if(this.items.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-300 text-xs italic py-12">Carpeta vacía.</div>';
            return;
        }

        this.items.sort((a, b) => {
            const nameA = (a.data.name || a.data.title || "Sin Nombre").toLowerCase();
            const nameB = (b.data.name || b.data.title || "Sin Nombre").toLowerCase();
            return nameA.localeCompare(nameB);
        });

        this.items.forEach(item => {
            const card = document.createElement('div');
            card.className = "data-card group";
            card.onclick = () => this.openEditor(item);

            let imgHTML = '<i class="fa-solid fa-cube text-3xl text-gray-200"></i>';
            if (this.processingIds.has(item.name)) {
                 imgHTML = `<div class="card-loading-overlay"><i class="fa-solid fa-palette fa-spin text-xl mb-2"></i><span class="text-[10px] font-bold">PINTANDO</span></div>`;
            } else if (item.displayImage || item.data.imagen64) {
                const src = item.displayImage || item.data.imagen64;
                if(src.startsWith('<svg')) imgHTML = src; 
                else imgHTML = `<img src="${src}" class="card-img" loading="lazy">`;
            }

            card.innerHTML = `
                <span class="card-tag">${item.data.type || 'General'}</span>
                <div class="card-img-box">${imgHTML}</div>
                <div class="p-4 flex-1 flex flex-col">
                    <h3 class="font-medium text-sm text-black mb-1 truncate">${item.data.name || item.data.title || "Sin Nombre"}</h3>
                    <p class="text-[10px] text-gray-400 line-clamp-3 leading-relaxed">${item.data.desc || "Sin descripción..."}</p>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // --- EDITOR ---
    async openEditor(item) {
        // BLINDAJE: Si había un guardado pendiente, lo forzamos ANTES de cambiar de archivo
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
            await this.saveCurrentItem(true); 
        }
        
        this.currentFileHandle = item.handle;
        this.currentData = item.data; 
        
        document.getElementById('inp-title').value = this.currentData.name || this.currentData.title || "";
        document.getElementById('inp-tag').value = this.currentData.type || "General";
        document.getElementById('inp-id').value = item.name;
        document.getElementById('inp-desc').value = this.currentData.desc || "";
        document.getElementById('inp-visual').value = this.currentData.visualDesc || "";

        const imgContainer = document.getElementById('editor-img-container');
        const src = item.displayImage || this.currentData.imagen64;
        
        if (src && !src.startsWith('<svg')) {
            imgContainer.innerHTML = `<img src="${src}" class="w-full h-full object-contain">`;
        } else if (src && src.startsWith('<svg')) {
            imgContainer.innerHTML = src;
        } else {
            imgContainer.innerHTML = '<i class="fa-regular fa-image text-gray-300 text-2xl"></i>';
        }
        ui.openSidebar();
    }

    createNewItem() {
        if(!this.targetHandle) return ui.alert("Selecciona una carpeta primero."); 
        ui.toggleNameModal();
    }

    async confirmCreate() {
        const name = document.getElementById('new-item-name').value;
        if(!name) return; 
        ui.toggleNameModal(); 

        const cleanName = name.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${cleanName}_${Date.now()}.json`;

        const newData = {
            name: name, type: "General", desc: "Pendiente...", 
            visualDesc: `Representation of ${name}`, imagen64: null, imageFile: null
        };

        try {
            const fileHandle = await this.targetHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(newData, null, 2));
            await writable.close();
            
            Coherence.updateItem(newData); 

            await this.loadFiles(); 
            const newItem = this.items.find(i => i.name === filename);
            if(newItem) this.openEditor(newItem);
        } catch(e) { console.error(e); }
    }

    async saveCurrentItem(isAutoSave = false) {
        if(!this.currentFileHandle) return;
        
        const newName = document.getElementById('inp-title').value;
        const newFilename = newName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
        const oldFilename = this.currentFileHandle.name;
        const oldName = this.currentData.name;

        this.currentData.name = newName;
        this.currentData.type = document.getElementById('inp-tag').value;
        this.currentData.desc = document.getElementById('inp-desc').value;
        this.currentData.visualDesc = document.getElementById('inp-visual').value;

        const btn = document.getElementById('btn-save');
        if (!isAutoSave) {
            btn.innerText = "GUARDANDO..."; 
            btn.disabled = true;
        }

        try {
            let needsFullReload = false;

            if (newFilename !== oldFilename && !isAutoSave) {
                let alreadyExists = false;
                try {
                    await this.targetHandle.getFileHandle(newFilename);
                    alreadyExists = true;
                } catch (err) {
                    if (err.name !== 'NotFoundError') throw err;
                    alreadyExists = false;
                }

                if (alreadyExists) {
                    ui.alert(`Error: ID '${newFilename}' en uso.`);
                    btn.innerText = "ERROR ID";
                    setTimeout(() => { btn.innerText = "GUARDAR CAMBIOS"; btn.disabled = false; }, 2000);
                    return; 
                }

                const newFileHandle = await this.targetHandle.getFileHandle(newFilename, { create: true });
                
                if (this.currentData.imageFile) {
                    try {
                        const oldImgHandle = await this.targetHandle.getFileHandle(this.currentData.imageFile);
                        const oldImgFile = await oldImgHandle.getFile();
                        
                        const ext = this.currentData.imageFile.substring(this.currentData.imageFile.lastIndexOf('.'));
                        const newImgName = newFilename.replace('.json', ext);
                        
                        const newImgHandle = await this.targetHandle.getFileHandle(newImgName, { create: true });
                        const imgWritable = await newImgHandle.createWritable();
                        await imgWritable.write(oldImgFile);
                        await imgWritable.close();
                        
                        await this.targetHandle.removeEntry(this.currentData.imageFile);
                        this.currentData.imageFile = newImgName;
                    } catch(e) { console.error("Error renombrando imagen asociada", e); }
                }

                const writable = await newFileHandle.createWritable();
                await writable.write(JSON.stringify(this.currentData, null, 2));
                await writable.close();

                await this.targetHandle.removeEntry(oldFilename);

                if (oldName !== newName) await Coherence.removeItem(oldName);

                this.currentFileHandle = newFileHandle;
                document.getElementById('inp-id').value = newFilename; 
                Utils.log(`Renombrado: ${oldFilename} -> ${newFilename}`, "info");
                needsFullReload = true;
            } else {
                const writable = await this.currentFileHandle.createWritable();
                await writable.write(JSON.stringify(this.currentData, null, 2));
                await writable.close();
            }

            if (!isAutoSave || (oldName !== newName)) {
                await Coherence.updateItem(this.currentData);
            }

            if (!isAutoSave) {
                if (needsFullReload) {
                    await this.loadFiles();
                    const refreshedItem = this.items.find(i => i.name === (newFilename !== oldFilename ? newFilename : oldFilename));
                    if (refreshedItem) {
                        this.currentData = refreshedItem.data;
                        this.currentFileHandle = refreshedItem.handle;
                    }
                } else {
                    this.renderGrid();
                }

                setTimeout(() => { btn.innerText = "GUARDADO"; btn.classList.add('bg-green-600'); }, 100);
                setTimeout(() => { btn.innerText = "GUARDAR CAMBIOS"; btn.classList.remove('bg-green-600'); btn.disabled = false; }, 1500);
            } else {
                // Modo Silencioso: Mantiene los datos en memoria y actualiza el grid sin parpadeos bruscos
                const memoryItem = this.items.find(i => i.name === oldFilename);
                if (memoryItem) memoryItem.data = this.currentData;
                
                this.renderGrid(); // Refleja el cambio visual al instante en la tarjeta
                
                if (btn && btn.innerText === "ESPERANDO...") {
                    btn.innerText = "Sincronizado";
                    btn.classList.add('text-gray-400');
                    setTimeout(() => {
                        if (btn && btn.innerText === "Sincronizado") {
                            btn.innerText = "GUARDAR CAMBIOS";
                            btn.classList.remove('text-gray-400');
                        }
                    }, 1000);
                }
            }

        } catch(e) { 
            console.error(e);
            if (!isAutoSave) ui.alert("Error al guardar: " + e.message); 
            if (btn) btn.disabled = false; 
        }
    }

    async deleteCurrentItem() {
        if(!this.currentFileHandle) return;
        const nameToDelete = this.currentData.name;
        
        ui.confirm("¿Estás seguro de que quieres eliminar este elemento?", async () => {
            try {
                if (this.currentData.imageFile) {
                    try { await this.targetHandle.removeEntry(this.currentData.imageFile); } 
                    catch(e) { console.warn("No se pudo borrar la imagen asociada", e); }
                }

                await this.targetHandle.removeEntry(this.currentFileHandle.name);
                Coherence.removeItem(nameToDelete);
                ui.closeSidebar();
                await this.loadFiles();
            } catch(e) { console.error(e); }
        });
    }

    async migrateBase64Images() {
        if (!this.targetHandle) return ui.alert("Abre una carpeta primero.");
        
        const targets = this.items.filter(i => i.data.imagen64 && i.data.imagen64.startsWith('data:image'));
        if (targets.length === 0) return ui.alert("Todo en orden. No hay imágenes antiguas en Base64 para migrar.");

        ui.confirm(`¿Quieres extraer las imágenes de los ${targets.length} JSONs antiguos para guardarlas como archivos separados y optimizar el espacio?`, async () => {
            ui.setLoading(true, "Migrando imágenes (Esto puede llevar unos segundos)...");
            let count = 0;
            try {
                for (const item of targets) {
                    const base64Str = item.data.imagen64;
                    const blob = await Utils.base64ToBlob(base64Str);
                    
                    let ext = 'png';
                    if (blob.type === 'image/jpeg') ext = 'jpg';
                    if (blob.type === 'image/webp') ext = 'webp';
                    
                    const imgFilename = item.name.replace('.json', `.${ext}`);
                    const imgHandle = await this.targetHandle.getFileHandle(imgFilename, { create: true });
                    const imgWritable = await imgHandle.createWritable();
                    await imgWritable.write(blob);
                    await imgWritable.close();

                    item.data.imageFile = imgFilename;
                    item.data.imagen64 = null; 
                    item.displayImage = URL.createObjectURL(blob);

                    const writable = await item.handle.createWritable();
                    await writable.write(JSON.stringify(item.data, null, 2));
                    await writable.close();

                    count++;
                }
                Utils.log(`Se han extraído ${count} imágenes exitosamente.`, "success");
                this.renderGrid();
                
                if (this.currentFileHandle) {
                    const activeItem = this.items.find(i => i.name === this.currentFileHandle.name);
                    if (activeItem) this.openEditor(activeItem);
                }
            } catch(e) {
                console.error(e);
                ui.alert("Error durante la migración: " + e.message);
            } finally {
                ui.setLoading(false);
            }
        });
    }
}