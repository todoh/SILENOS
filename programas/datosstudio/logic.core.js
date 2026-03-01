// --- APP PRINCIPAL (CORE) ---
class DataStudio {
    constructor() {
        this.rootHandle = null;     
        this.targetHandle = null;   
        this.items = [];            
        this.tramas = []; // NUEVO: Memoria para los Nodos de Datos Omega (Tramas)
        this.currentFileHandle = null; 
        this.currentData = null;    
        this.processingIds = new Set();
    }

    init() {
        ui.updateAuthUI();
        window.parent.addEventListener('silenos:config-updated', ui.updateAuthUI);
        if(typeof FS !== 'undefined' && FS.rootHandle) this.rootHandle = FS.rootHandle;
        setTimeout(() => ui.toggleFolderModal(), 500);
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
                // FILTRO: Ignoramos TIMELINE, RESUMEN_GLOBAL y TRAMAS_GLOBAL
                if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.includes('TIMELINE') && !entry.name.includes('RESUMEN_GLOBAL') && !entry.name.includes('TRAMAS_GLOBAL')) {
                    const file = await entry.getFile();
                    const text = await file.text();
                    try {
                        const json = JSON.parse(text);
                        this.items.push({ handle: entry, data: json, name: entry.name });
                    } catch(e) { console.warn("JSON corrupto", entry.name); }
                }
            }

            // NUEVO: CARGAR TRAMAS_GLOBAL.json (Datos Omega)
            try {
                const tramasHandle = await this.targetHandle.getFileHandle('TRAMAS_GLOBAL.json');
                const tramasFile = await tramasHandle.getFile();
                const tramasText = await tramasFile.text();
                this.tramas = JSON.parse(tramasText);
            } catch (e) {
                // Si no existe el archivo, inicializamos el array vacío sin problema
                this.tramas = [];
            }

            this.renderGrid();

            // Si el motor de Tramas ya está cargado, forzar un render del canvas
            if (typeof window.TramasCanvas !== 'undefined') {
                window.TramasCanvas.render();
            }

        } catch(e) { console.error(e); }
    }

    // NUEVO: Rutina de guardado específica para los nodos Omega
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

        this.items.forEach(item => {
            const card = document.createElement('div');
            card.className = "data-card group";
            card.onclick = () => this.openEditor(item);

            let imgHTML = '<i class="fa-solid fa-cube text-3xl text-gray-200"></i>';
            if (this.processingIds.has(item.name)) {
                 imgHTML = `<div class="card-loading-overlay"><i class="fa-solid fa-palette fa-spin text-xl mb-2"></i><span class="text-[10px] font-bold">PINTANDO</span></div>`;
            } else if (item.data.imagen64) {
                if(item.data.imagen64.startsWith('<svg')) imgHTML = item.data.imagen64; 
                else imgHTML = `<img src="${item.data.imagen64}" class="card-img" loading="lazy">`;
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
        this.currentFileHandle = item.handle;
        this.currentData = item.data; 
        
        document.getElementById('inp-title').value = this.currentData.name || this.currentData.title || "";
        document.getElementById('inp-tag').value = this.currentData.type || "General";
        document.getElementById('inp-id').value = item.name;
        document.getElementById('inp-desc').value = this.currentData.desc || "";
        document.getElementById('inp-visual').value = this.currentData.visualDesc || "";

        const imgContainer = document.getElementById('editor-img-container');
        if (this.currentData.imagen64 && !this.currentData.imagen64.startsWith('<svg')) {
            // object-contain para asegurar que se vea completa
            imgContainer.innerHTML = `<img src="${this.currentData.imagen64}" class="w-full h-full object-contain">`;
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
            visualDesc: `Representation of ${name}`, imagen64: null
        };

        try {
            const fileHandle = await this.targetHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(newData, null, 2));
            await writable.close();
            
            // COHERENCE HOOK: Actualizar resumen al crear
            Coherence.updateItem(newData); 

            await this.loadFiles(); 
            const newItem = this.items.find(i => i.name === filename);
            if(newItem) this.openEditor(newItem);
        } catch(e) { console.error(e); }
    }

    async saveCurrentItem() {
        if(!this.currentFileHandle) return;
        
        const newName = document.getElementById('inp-title').value;
        const newFilename = newName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
        const oldFilename = this.currentFileHandle.name;
        const oldName = this.currentData.name; // Guardamos el nombre antiguo por si cambia

        // 1. ACTUALIZAR OBJETO DE REFERENCIA EN MEMORIA
        this.currentData.name = newName;
        this.currentData.type = document.getElementById('inp-tag').value;
        this.currentData.desc = document.getElementById('inp-desc').value;
        this.currentData.visualDesc = document.getElementById('inp-visual').value;

        const btn = document.getElementById('btn-save');
        btn.innerText = "GUARDANDO..."; btn.disabled = true;

        try {
            // 2. ESCRIBIR EN DISCO (RENOMBRAR O SOBRESCRIBIR)
            if (newFilename !== oldFilename) {
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
                const writable = await newFileHandle.createWritable();
                await writable.write(JSON.stringify(this.currentData, null, 2));
                await writable.close();

                await this.targetHandle.removeEntry(oldFilename);

                // COHERENCE HOOK: Si cambia el nombre, borramos el resumen viejo
                if (oldName !== newName) await Coherence.removeItem(oldName);

                this.currentFileHandle = newFileHandle;
                document.getElementById('inp-id').value = newFilename; 
                Utils.log(`Renombrado: ${oldFilename} -> ${newFilename}`, "info");

            } else {
                // Mismo archivo
                const writable = await this.currentFileHandle.createWritable();
                await writable.write(JSON.stringify(this.currentData, null, 2));
                await writable.close();
            }

            // 3. ACTUALIZAR COHERENCIA
            await Coherence.updateItem(this.currentData);

            // 4. SINCRONIZACIÓN NUCLEAR (Aquí estaba el fallo)
            // Recargamos todo desde el disco para asegurarnos que la Grid muestra la verdad absoluta
            await this.loadFiles();

            // Re-conectamos la memoria del editor con el nuevo objeto recién cargado
            // para que futuras ediciones no usen referencias rotas
            const refreshedItem = this.items.find(i => i.name === (newFilename !== oldFilename ? newFilename : oldFilename));
            if (refreshedItem) {
                this.currentData = refreshedItem.data;
                this.currentFileHandle = refreshedItem.handle;
            }

            setTimeout(() => { btn.innerText = "GUARDADO"; btn.classList.add('bg-green-600'); }, 500);
            setTimeout(() => { btn.innerText = "GUARDAR CAMBIOS"; btn.classList.remove('bg-green-600'); btn.disabled = false; }, 1500);

        } catch(e) { 
            console.error(e);
            ui.alert("Error al guardar: " + e.message); 
            btn.disabled = false; 
        }
    }

    async deleteCurrentItem() {
        if(!this.currentFileHandle) return;
        const nameToDelete = this.currentData.name;
        
        ui.confirm("¿Estás seguro de que quieres eliminar este elemento?", async () => {
            try {
                await this.targetHandle.removeEntry(this.currentFileHandle.name);
                
                // COHERENCE HOOK: Eliminar del resumen
                Coherence.removeItem(nameToDelete);

                ui.closeSidebar();
                await this.loadFiles(); // Refrescamos la grid
            } catch(e) { console.error(e); }
        });
    }
}