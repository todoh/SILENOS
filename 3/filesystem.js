/* SILENOS 3/filesystem.js */
// --- SISTEMA DE ARCHIVOS PRINCIPAL (Facade) ---
// Dependencias: archivos/fs-constants.js, archivos/type-*.js

// CAMBIO IMPORTANTE: Asignamos a window.FileSystem para acceso global desde apps/iframes
window.FileSystem = {
    data: [],
    _hasChanges: false,

    // --- CICLO DE VIDA ---

    async init() {
        try {
            if (navigator.storage && navigator.storage.persist) {
                const isPersisted = await navigator.storage.persist();
                console.log(`FS: Persistencia ${isPersisted ? 'CONCEDIDA' : 'NO GARANTIZADA'}`);
                
                const estimate = await navigator.storage.estimate();
                const quotaMB = (estimate.quota || 0) / (1024 * 1024);
                console.log(`FS: Cuota disponible: ${quotaMB.toFixed(2)} MB.`);
            }

            await this.load();

            setInterval(() => {
                if (this._hasChanges) {
                    this.save();
                    this._hasChanges = false;
                }
            }, 5000);

            console.log("FS: Sistema de archivos inicializado con módulos divididos.");
            return true;
        } catch (error) {
            console.error("FS: Error fatal en init:", error);
            return false;
        }
    },

    // --- PERSISTENCIA METADATA ---

    async save() {
        try {
            const cache = await caches.open(FS_CONSTANTS.CACHE_NAME);
            const dataBlob = new Blob([JSON.stringify(this.data)], { type: 'application/json' });
            const response = new Response(dataBlob);
            await cache.put(FS_CONSTANTS.METADATA_PATH, response);
            console.log("FS: Estado guardado en disco."); // Log para verificar
        } catch (e) {
            console.error("FS: Error al guardar:", e);
        }
    },

    async load() {
        try {
            const cache = await caches.open(FS_CONSTANTS.CACHE_NAME);
            const response = await cache.match(FS_CONSTANTS.METADATA_PATH);
            
            if (response) {
                this.data = await response.json();
                console.log(`FS: ${this.data.length} elementos cargados.`);
            } else {
                console.log("FS: No hay datos previos. Iniciando vacío.");
                this.data = [];
            }
        } catch (e) {
            console.error("FS: Error al cargar:", e);
            this.data = [];
        }
    },

    // --- ALMACENAMIENTO RAW (ARCHIVOS EN BRUTO) ---
    async saveRawFile(file) {
        try {
            const cache = await caches.open(FS_CONSTANTS.CACHE_NAME);
            const contentId = 'blob-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const path = `/files/${contentId}`; 
            
            const response = new Response(file, { 
                headers: { 
                    'Content-Type': file.type || 'application/octet-stream',
                    'X-Original-Name': file.name
                }
            });
            await cache.put(path, response);
            return path;
        } catch(e) {
            console.error("FS: Error guardando archivo raw:", e);
            return null;
        }
    },

    async getRawFile(path) {
        if (!path || !path.startsWith('/files/')) return null;
        try {
            const cache = await caches.open(FS_CONSTANTS.CACHE_NAME);
            const response = await cache.match(path);
            if (response) return await response.blob();
            return null;
        } catch(e) { 
            console.error("FS: Error recuperando raw file:", e);
            return null; 
        }
    },

    async getImageUrl(content) {
        if (typeof content === 'string' && content.startsWith('/files/')) {
            const blob = await this.getRawFile(content);
            if (blob) return URL.createObjectURL(blob);
        }
        return content; 
    },

    // --- OPERACIONES CRUD ---

    createFileItem(name, parentId, contentPath, mimeType, x, y) {
        const item = {
            id: 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            type: 'file',
            title: name,
            parentId: parentId,
            content: contentPath,
            mimeType: mimeType,
            icon: 'file',
            color: 'text-gray-400',
            x: x || 100,
            y: y || 100
        };
        this.data.push(item);
        this.save();
        return item;
    },

    createFolder(name, parentId, coords) {
        const folder = TypeFolder.create(name, parentId, coords);
        this.data.push(folder);
        this.save();
        return folder;
    },

    createTextFile(name, content, parentId, coords) {
        const file = TypeText.create(name, content, parentId, coords);
        this.data.push(file);
        this.save();
        return file;
    },

    createCSS(name, content, parentId, coords) {
        const file = TypeCSS.create(name, content, parentId, coords);
        this.data.push(file);
        this.save();
        return file;
    },

    createJS(name, content, parentId, coords) {
        const file = TypeJS.create(name, content, parentId, coords);
        this.data.push(file);
        this.save();
        return file;
    },
    
    createImage(name, src, parentId, coords) {
        const file = TypeImage.create(name, src, parentId, coords);
        this.data.push(file);
        this.save();
        return file;
    },

    createJSON(name, content, parentId, coords) {
        const file = TypeJSON.create(name, content, parentId, coords);
        this.data.push(file);
        this.save();
        return file;
    },

    createHTML(name, content, parentId, coords) {
        if (typeof TypeHTML === 'undefined') {
            console.error("FS: TypeHTML no está cargado.");
            return null;
        }
        const file = TypeHTML.create(name, content, parentId, coords);
        this.data.push(file);
        this.save();
        return file;
    },

    createProgram(name, parentId, coords) {
        if (typeof TypeProgram === 'undefined') {
            console.error("FS: TypeProgram no está cargado.");
            return null;
        }
        const item = TypeProgram.create(name, parentId, coords);
        this.data.push(item);
        this.save();
        return item;
    },

    createBook(name, parentId, coords) {
        if (typeof TypeBook === 'undefined') {
            console.error("FS: TypeBook no está cargado.");
            return null;
        }
        const item = TypeBook.create(name, parentId, coords);
        this.data.push(item);
        this.save();
        return item;
    },

    createNarrative(name, parentId, coords) {
        if (typeof TypeNarrative === 'undefined') {
            console.error("FS: TypeNarrative no está cargado.");
            return null;
        }
        const item = TypeNarrative.create(name, parentId, coords);
        this.data.push(item);
        this.save();
        return item;
    },

    createData(name, content, parentId, coords) {
        if (typeof TypeData === 'undefined') {
            console.error("FS: TypeData no está cargado. Usando fallback genérico.");
            const item = {
                id: 'data-' + Date.now(),
                type: 'data',
                title: name,
                parentId,
                content: content || {},
                x: coords?.x || 0,
                y: coords?.y || 0,
                z: coords?.z || 0,
                icon: 'database',
                color: 'text-blue-400'
            };
            this.data.push(item);
            this.save();
            return item;
        }
        const item = TypeData.create(name, content, parentId, coords);
        this.data.push(item);
        this.save();
        return item;
    },

    // --- GESTIÓN DE ITEMS ---

    // EDITADO: Añadido parámetro 'suppressSave' para actualizaciones masivas
    updateItem(id, updates, suppressSave = false) {
        const item = this.data.find(i => i.id === id);
        if (item) { 
            Object.assign(item, updates); 
            this._hasChanges = true; 
            // Solo guardamos si NO se suprime el guardado. 
            // Si suppressSave es true, confiamos en el setInterval o en una llamada manual posterior.
            if (!suppressSave) {
                this.save();
            }
            return true; 
        }
        return false;
    },

    getItems(parentId) { 
        return this.data.filter(i => i.parentId === parentId); 
    },

    getItem(id) { 
        return this.data.find(i => i.id === id); 
    },

    deleteItem(id) {
        const getIdsToDelete = (itemId) => {
            let ids = [itemId];
            const children = this.data.filter(i => i.parentId === itemId);
            children.forEach(c => ids = ids.concat(getIdsToDelete(c.id)));
            return ids;
        };

        const allIdsToDelete = getIdsToDelete(id);
        const initialCount = this.data.length;
        
        this.data = this.data.filter(i => !allIdsToDelete.includes(i.id));
        
        if (this.data.length < initialCount) {
            this.save();
            return true;
        }
        return false;
    },
    
    exists(name, parentId) {
        return this.data.some(i => i.parentId === parentId && i.title === name);
    }
};