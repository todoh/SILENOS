// Archivo: Librojuego/app.storage.js

window.Core = window.Core || {};

Object.assign(window.Core, {
    rootHandle: null,
    targetHandle: null,
    saveTimer: null,

    initStorage() {
        if (typeof window.parent !== 'undefined' && window.parent.rootHandle) {
            this.rootHandle = window.parent.rootHandle;
        } else if (typeof FS !== 'undefined' && FS.rootHandle) {
            this.rootHandle = FS.rootHandle;
        }
    },

    async scanRoot() {
        const list = document.getElementById('folder-list'); 
        if (!list) return;
        list.innerHTML = '';
        
        if (!this.rootHandle) {
            list.innerHTML = '<div class="p-8 text-center text-xs text-black font-bold">Root Handle no disponible. Sistema no conectado.</div>';
            return;
        }
        this.addFolderOption(list, this.rootHandle, 'RAÍZ DEL SISTEMA', true);
        await this.scanDirRecursive(this.rootHandle, list, 'ROOT');
    },

    async scanDirRecursive(dirHandle, listElement, pathString, depth = 0) {
        if (depth > 2) return; 
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                const currentPath = `${pathString} / ${entry.name}`;
                this.addFolderOption(listElement, entry, currentPath);
                await this.scanDirRecursive(entry, listElement, currentPath, depth + 1);
            }
        }
    },

    addFolderOption(container, handle, displayName, isRoot) {
        const el = document.createElement('div');
        el.className = "p-4 cursor-pointer bg-white mb-2 rounded-2xl flex items-center gap-4 text-xs font-bold text-gray-500 hover:text-black hover:bg-gray-100 transition-colors border-none";
        const icon = isRoot ? 'fa-database text-black' : 'fa-folder';
        el.innerHTML = `<i class="fa-solid ${icon} text-lg w-6 text-center"></i><span class="truncate w-full tracking-wider uppercase">${displayName}</span>`;
        el.onclick = () => {
            this.targetHandle = handle;
            const label = document.getElementById('folder-name-label');
            if (label) label.innerText = displayName.split('/').pop();
            if (typeof UI !== 'undefined' && UI.toggleFolderModal) UI.toggleFolderModal();
            this.loadBookFromDisk();
        };
        container.appendChild(el);
    },

    async loadBookFromDisk() {
        if (!this.targetHandle) return;
        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(true, "Cargando libro...");
        
        try {
            const fileHandle = await this.targetHandle.getFileHandle('book.json');
            const file = await fileHandle.getFile();
            const text = await file.text();
            this.book = JSON.parse(text);
            
            // CACHÉ DE IMÁGENES Y AUDIOS: Precarga URLs locales sin bloquear el lienzo
            for (let node of this.book.nodes) {
                if (node.imageUrl) {
                    try {
                        const imgHandle = await this.targetHandle.getFileHandle(node.imageUrl);
                        const imgFile = await imgHandle.getFile();
                        node._cachedImageUrl = URL.createObjectURL(imgFile);
                    } catch(err) {
                        console.warn(`Imagen vinculada no encontrada localmente: ${node.imageUrl}`);
                    }
                }
                if (node.audioUrl) {
                    try {
                        const audHandle = await this.targetHandle.getFileHandle(node.audioUrl);
                        const audFile = await audHandle.getFile();
                        node._cachedAudioUrl = URL.createObjectURL(audFile);
                    } catch(err) {
                        console.warn(`Audio vinculado no encontrado localmente: ${node.audioUrl}`);
                    }
                }
            }

            const titleEl = document.getElementById('book-title');
            if (titleEl) titleEl.value = this.book.title;

            if (typeof AIVisual !== 'undefined' && AIVisual.loadManualBible) {
                AIVisual.loadManualBible(this.book.visualBible);
            }

            this.selectedNodeId = null;
            if (typeof Editor !== 'undefined' && Editor.hide) Editor.hide();
            if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
            if (typeof UI !== 'undefined' && UI.switchTab) UI.switchTab('canvas');
            
        } catch (e) {
            console.log("No existe book.json en la carpeta. Se creará uno nuevo.");
            this.book = { title: "Nuevo Librojuego", visualBible: {}, nodes: [] };
            this.addNode("Inicio", "Despiertas en un lugar desconocido...", 100, 100);
            const titleEl = document.getElementById('book-title');
            if (titleEl) titleEl.value = this.book.title;
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
        }
    },

    scheduleSave() {
        if (!this.targetHandle) return; 
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.saveBookToDisk(), 400);
    },

    async saveBookToDisk() {
        if (!this.targetHandle) return;
        try {
            const fileHandle = await this.targetHandle.getFileHandle('book.json', { create: true });
            const writable = await fileHandle.createWritable();
            
            // Clonamos el objeto para no ensuciar el JSON con objetos volátiles de UI
            const saveObj = JSON.parse(JSON.stringify(this.book));
            saveObj.nodes.forEach(n => {
                delete n._cachedImageUrl;
                delete n._cachedAudioUrl;
            });

            await writable.write(JSON.stringify(saveObj, null, 2));
            await writable.close();
            console.log("Librojuego guardado automáticamente.");
        } catch (e) {
            console.error("Error guardando book.json:", e);
        }
    }
});