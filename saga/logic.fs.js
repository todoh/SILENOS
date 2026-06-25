// --- SISTEMA DE ARCHIVOS Y ESCANEO (FILE SYSTEM MIGRADO CON GANCHO DE CRONOLOGÍA) ---

DataStudio.prototype.selectDirectoryAPI = async function() {
    try {
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        if (handle) {
            this.rootHandle = handle;
            this.targetHandle = handle;
            
            const labelBtn = document.getElementById('folder-label-btn');
            if (labelBtn && labelBtn.querySelector('span')) {
                labelBtn.querySelector('span').innerText = handle.name;
            }
            
            Utils.log(`Repositorio cargado: ${handle.name}`, "success");
            await this.loadFiles();
        }
    } catch (err) {
        console.warn("Selección de directorio cancelada o rechazada:", err);
        if (err.name !== 'AbortError') {
            ui.alert("Error al acceder a la carpeta: " + err.message);
        }
    }
};

DataStudio.prototype.scanRoot = async function() {
    const list = document.getElementById('folder-list-container') || document.getElementById('folder-list'); 
    if (!list) return;
    list.innerHTML = '';
    if (!this.rootHandle) {
        list.innerHTML = '<div class="p-4 text-center text-xs text-red-500 font-medium tracking-wide bg-red-50/50 border border-red-100"><i class="fa-solid fa-triangle-exclamation mr-1.5"></i> Carpeta raíz no asignada. Usa el botón superior.</div>';
        return;
    }
    this.addFolderOption(list, this.rootHandle, 'ROOT', true);
    await this.scanDirRecursive(this.rootHandle, list, 'ROOT');
};

DataStudio.prototype.scanDirRecursive = async function(dirHandle, listElement, pathString, depth = 0) {
    if (depth > 2) return; 
    try {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                const currentPath = `${pathString} / ${entry.name}`;
                this.addFolderOption(listElement, entry, currentPath);
                await this.scanDirRecursive(entry, listElement, currentPath, depth + 1);
            }
        }
    } catch (e) {
        console.warn("Permiso denegado temporalmente al escanear subdirectorio.");
    }
};

DataStudio.prototype.addFolderOption = function(container, handle, displayName, isRoot) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = "px-6 py-3 cursor-pointer border-b border-gray-50 flex items-center gap-4 text-xs font-light text-gray-600 hover:bg-gray-50 transition-colors";
    const icon = isRoot ? 'fa-database text-black' : 'fa-folder text-gray-300';
    el.innerHTML = `<i class="fa-solid ${icon} text-[10px]"></i><span class="truncate w-full tracking-wide">${displayName}</span>`;
    el.onclick = async () => {
        this.targetHandle = handle;
        const labelBtn = document.getElementById('folder-label-btn');
        if (labelBtn && labelBtn.querySelector('span')) {
            labelBtn.querySelector('span').innerText = displayName.split('/').pop();
        }
        ui.toggleFolderModal();
        await this.loadFiles();
    };
    container.appendChild(el);
};

DataStudio.prototype.loadFiles = async function() {
    if(!this.targetHandle) return;
    this.items = [];
    const grid = document.getElementById('grid-container');
    if (grid) grid.innerHTML = '<div class="col-span-full text-center text-gray-300 text-xs py-12">Cargando datos...</div>';

    try {
        for await (const entry of this.targetHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.includes('TIMELINE') && !entry.name.includes('RESUMEN_GLOBAL') && !entry.name.includes('TRAMAS_GLOBAL') && !entry.name.includes('VISUAL_BIBLE')) {
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

        // GANCHO CRÍTICO OMEGA BLINDADO: Enrutamiento seguro para evitar fallos de inicialización
        if (typeof window.mainCrono !== 'undefined') {
            if (window.ui) {
                window.ui.selectedFolderHandle = this.targetHandle;
            } else if (typeof ui !== 'undefined') {
                ui.selectedFolderHandle = this.targetHandle;
            }
            await window.mainCrono.confirmFolderSelection();
        }

    } catch(e) { console.error(e); }
};

DataStudio.prototype.saveTramas = async function() {
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
};