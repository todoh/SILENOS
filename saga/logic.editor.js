// --- PROPIEDADES DEL EDITOR, ACCIONES Y MUTACIONES (LOGIC EDITOR) ---
DataStudio.prototype.scheduleSave = function() {
    const btn = document.getElementById('btn-save');
    if (btn && btn.innerText !== "GUARDANDO...") {
        btn.innerText = "ESPERANDO...";
        btn.classList.remove('bg-green-600');
    }
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveCurrentItem(true), 1500);
};

DataStudio.prototype.openEditor = async function(item) {
    if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
        await this.saveCurrentItem(true);
    }

    this.currentFileHandle = item.handle;
    this.currentData = item.data;

    const inpTitle = document.getElementById('inp-title');
    const inpTag = document.getElementById('inp-tag');
    const inpId = document.getElementById('inp-id');
    const inpDesc = document.getElementById('inp-desc');
    const inpVisual = document.getElementById('inp-visual');

    if (inpTitle) inpTitle.value = this.currentData.name || this.currentData.title || "";
    if (inpTag) inpTag.value = this.currentData.type || "General";
    if (inpId) inpId.value = item.name;
    if (inpDesc) inpDesc.value = this.currentData.desc || "";
    if (inpVisual) {
        inpVisual.value = this.currentData.visualDesc || "";
        
        // Inyectar botón de traducción si no existe
        let translateBtn = document.getElementById('btn-translate-visual');
        if (!translateBtn) {
            translateBtn = document.createElement('button');
            translateBtn.id = 'btn-translate-visual';
            translateBtn.className = "text-[9px] text-blue-500 hover:text-blue-700 font-bold uppercase tracking-tighter mt-1 flex items-center gap-1 transition-colors";
            translateBtn.innerHTML = '<i class="fa-solid fa-language"></i> Traducir al Inglés';
            translateBtn.onclick = () => this.translateVisualDescription();
            inpVisual.parentNode.appendChild(translateBtn);
        }
    }

    const imgContainer = document.getElementById('editor-img-container');
    if (imgContainer) {
        const src = item.displayImage || this.currentData.imagen64;
        if (src && !src.startsWith('<svg')) {
            imgContainer.innerHTML = `<img src="${src}" class="w-full h-full object-contain cursor-zoom-in" onclick="if(typeof ui !== 'undefined' && ui.zoomImage) ui.zoomImage(this.src)">`;
        } else if (src && src.startsWith('<svg')) {
            imgContainer.innerHTML = src;
        } else {
            imgContainer.innerHTML = '<i class="fa-regular fa-image text-gray-300 text-2xl"></i>';
        }
    }
    ui.openSidebar();
};

DataStudio.prototype.createNewItem = function() {
    if (typeof ui !== 'undefined' && ui.toggleNameModal) {
        ui.toggleNameModal();
    }
};

DataStudio.prototype.confirmCreate = async function() {
    const input = document.getElementById('new-item-name');
    const name = input ? input.value : '';
    if (!name) return;
    ui.toggleNameModal();
    const cleanName = name.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${cleanName}_${Date.now()}.json`;
    const newData = {
        name: name,
        type: "General",
        desc: "Pendiente...",
        visualDesc: `Representation of ${name}`,
        imagen64: null,
        imageFile: null
    };
    try {
        const fileHandle = await this.targetHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(newData, null, 2));
        await writable.close();

        if (typeof Coherence !== 'undefined') Coherence.updateItem(newData);
        await this.loadFiles();

        const newItem = this.items.find(i => i.name === filename);
        if (newItem) this.openEditor(newItem);
    } catch (e) {
        console.error(e);
    }
};

DataStudio.prototype.saveCurrentItem = async function(isAutoSave = false) {
    if (!this.currentFileHandle) return;

    const inpTitle = document.getElementById('inp-title');
    const newName = inpTitle ? inpTitle.value : (this.currentData.name || '');
    const newFilename = newName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
    const oldFilename = this.currentFileHandle.name;
    const oldName = this.currentData.name;
    this.currentData.name = newName;

    const inpTag = document.getElementById('inp-tag');
    const inpDesc = document.getElementById('inp-desc');
    const inpVisual = document.getElementById('inp-visual');
    if (inpTag) this.currentData.type = inpTag.value;
    if (inpDesc) this.currentData.desc = inpDesc.value;
    if (inpVisual) this.currentData.visualDesc = inpVisual.value;

    const btn = document.getElementById('btn-save');
    if (!isAutoSave && btn) {
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
                if (btn) {
                    btn.innerText = "ERROR ID";
                    setTimeout(() => {
                        btn.innerText = "GUARDAR CAMBIOS";
                        btn.disabled = false;
                    }, 2000);
                }
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
                } catch (e) {
                    console.error("Error renombrando imagen asociada", e);
                }
            }
            const writable = await newFileHandle.createWritable();
            await writable.write(JSON.stringify(this.currentData, null, 2));
            await writable.close();
            await this.targetHandle.removeEntry(oldFilename);
            if (oldName !== newName && typeof Coherence !== 'undefined') await Coherence.removeItem(oldName);
            this.currentFileHandle = newFileHandle;
            const inpId = document.getElementById('inp-id');
            if (inpId) inpId.value = newFilename;
            Utils.log(`Renombrado: ${oldFilename} -> ${newFilename}`, "info");
            needsFullReload = true;
        } else {
            const writable = await this.currentFileHandle.createWritable();
            await writable.write(JSON.stringify(this.currentData, null, 2));
            await writable.close();
        }
        if ((!isAutoSave || (oldName !== newName)) && typeof Coherence !== 'undefined') {
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
            if (btn) {
                setTimeout(() => {
                    btn.innerText = "GUARDADO";
                    btn.classList.add('bg-green-600');
                }, 100);
                setTimeout(() => {
                    btn.innerText = "GUARDAR CAMBIOS";
                    btn.classList.remove('bg-green-600');
                    btn.disabled = false;
                }, 1500);
            }
        } else {
            const memoryItem = this.items.find(i => i.name === oldFilename);
            if (memoryItem) memoryItem.data = this.currentData;

            this.renderGrid();

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
    } catch (e) {
        console.error(e);
        if (!isAutoSave) ui.alert("Error al guardar: " + e.message);
        if (btn) btn.disabled = false;
    }
};

DataStudio.prototype.deleteCurrentItem = async function() {
    if (!this.currentFileHandle) return;
    const nameToDelete = this.currentData.name;

    ui.confirm("¿Estás seguro de que quieres eliminar este elemento?", async () => {
        try {
            if (this.currentData.imageFile) {
                try {
                    await this.targetHandle.removeEntry(this.currentData.imageFile);
                } catch (e) {
                    console.warn("No se pudo borrar la imagen asociada", e);
                }
            }
            await this.targetHandle.removeEntry(this.currentFileHandle.name);
            if (typeof Coherence !== 'undefined') Coherence.removeItem(nameToDelete);
            ui.closeSidebar();
            await this.loadFiles();
        } catch (e) {
            console.error(e);
        }
    });
};

DataStudio.prototype.deleteItemAtIndex = async function(index) {
    const item = this.items[index];
    if (!item) return;

    ui.confirm(`¿Estás seguro de que quieres eliminar "${item.data.name || item.name}"?`, async () => {
        try {
            if (item.data.imageFile) {
                try {
                    await this.targetHandle.removeEntry(item.data.imageFile);
                } catch (e) {}
            }
            await this.targetHandle.removeEntry(item.name);
            if (typeof Coherence !== 'undefined') Coherence.removeItem(item.data.name);

            if (this.currentFileHandle && this.currentFileHandle.name === item.name) {
                ui.closeSidebar();
            }
            await this.loadFiles();
        } catch (e) {
            console.error(e);
        }
    });
};

DataStudio.prototype.duplicateItemAtIndex = async function(index) {
    const item = this.items[index];
    if (!item) return;
    const baseName = item.data.name || "Copia";
    const newName = `${baseName} Copia`;
    const cleanName = newName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${cleanName}_${Date.now()}.json`;
    const duplicatedData = JSON.parse(JSON.stringify(item.data));
    duplicatedData.name = newName;
    duplicatedData.imageFile = null;
    duplicatedData.imagen64 = item.data.imagen64 || null;
    try {
        if (item.data.imageFile) {
            try {
                const srcImgHandle = await this.targetHandle.getFileHandle(item.data.imageFile);
                const srcImgFile = await srcImgHandle.getFile();
                const ext = item.data.imageFile.substring(item.data.imageFile.lastIndexOf('.'));
                const destImgFilename = filename.replace('.json', ext);

                const destImgHandle = await this.targetHandle.getFileHandle(destImgFilename, {
                    create: true
                });
                const imgWritable = await destImgHandle.createWritable();
                await imgWritable.write(srcImgFile);
                await imgWritable.close();

                duplicatedData.imageFile = destImgFilename;
            } catch (e) {
                console.warn("No se pudo duplicar el archivo físico de imagen:", e);
            }
        }
        const fileHandle = await this.targetHandle.getFileHandle(filename, {
            create: true
        });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(duplicatedData, null, 2));
        await writable.close();
        if (typeof Coherence !== 'undefined') Coherence.updateItem(duplicatedData);
        await this.loadFiles();
    } catch (e) {
        console.error("Error al duplicar elemento:", e);
    }
};

DataStudio.prototype.migrateBase64Images = async function() {
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
                const imgHandle = await this.targetHandle.getFileHandle(imgFilename, {
                    create: true
                });
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
        } catch (e) {
            console.error(e);
            ui.alert("Error durante la migración: " + e.message);
        } finally {
            ui.setLoading(false);
        }
    });
};