/* SILENOS 3/filesystem.js */
// --- SISTEMA DE ARCHIVOS PRINCIPAL (Facade) ---
// Dependencias: archivos/fs-constants.js, archivos/type-*.js
// Optimizado: Usa IndexedDB para guardado selectivo (granular) + Compatibilidad con save()

window.FileSystem = {
    data: [],
    _db: null, // Referencia a la base de datos IndexedDB
    _modifiedIds: new Set(), // Cola de IDs que necesitan guardarse
    _deletedIds: new Set(),  // Cola de IDs que necesitan borrarse
    
    async init() {
        try {
            // 1. Verificación de persistencia
            if (navigator.storage && navigator.storage.persist) {
                const isPersisted = await navigator.storage.persist();
                console.log(`FS: Persistencia ${isPersisted ? 'CONCEDIDA' : 'NO GARANTIZADA'}`);
                
                const estimate = await navigator.storage.estimate();
                const quotaMB = (estimate.quota || 0) / (1024 * 1024);
                console.log(`FS: Cuota disponible: ${quotaMB.toFixed(2)} MB.`);
            }

            // 2. Inicializar IndexedDB
            await this._initDB();

            // 3. Cargar datos
            await this.load();

            // 4. Iniciar el ciclo de guardado selectivo (cada 1s)
            setInterval(() => {
                this._processPendingChanges();
            }, 1000);

            console.log("FS: Sistema de archivos inicializado (Modo DB Granular).");
            return true;
        } catch (error) {
            console.error("FS: Error fatal en init:", error);
            return false;
        }
    },

    // --- INTERNO: GESTIÓN DE INDEXEDDB ---

    _initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SilenosFS', 1);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('items')) {
                    db.createObjectStore('items', { keyPath: 'id' });
                }
            };

            request.onsuccess = (e) => {
                this._db = e.target.result;
                resolve();
            };

            request.onerror = (e) => {
                console.error("FS: Error abriendo IndexedDB", e);
                reject(e);
            };
        });
    },

    async _processPendingChanges() {
        if (this._modifiedIds.size === 0 && this._deletedIds.size === 0) return;

        try {
            const tx = this._db.transaction(['items'], 'readwrite');
            const store = tx.objectStore('items');
            
            // Procesar borrados
            for (const id of this._deletedIds) {
                store.delete(id);
            }
            this._deletedIds.clear();

            // Procesar actualizaciones/creaciones
            for (const id of this._modifiedIds) {
                const item = this.getItem(id);
                if (item) {
                    store.put(item);
                }
            }
            this._modifiedIds.clear();

            tx.oncomplete = () => {
                // console.log("FS: Sincronización DB completada.");
            };
        } catch (e) {
            console.error("FS: Error en guardado selectivo:", e);
        }
    },

    // --- COMPATIBILIDAD Y CONTROL ---

    // Este método existía en la versión anterior y es llamado por otros scripts.
    // Ahora actúa como un disparador manual del proceso de guardado granular.
    async save() {
        // Forzamos la ejecución inmediata de los cambios pendientes
        await this._processPendingChanges();
        console.log("FS: Guardado manual ejecutado.");
    },

    async load() {
        try {
            const tx = this._db.transaction(['items'], 'readonly');
            const store = tx.objectStore('items');
            const request = store.getAll();

            const items = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (items && items.length > 0) {
                this.data = items;
                console.log(`FS: ${this.data.length} elementos cargados desde DB.`);
            } else {
                console.log("FS: DB vacía. Buscando datos legacy...");
                await this._migrateFromLegacyCache();
            }
        } catch (e) {
            console.error("FS: Error al cargar:", e);
            this.data = [];
        }
    },

    async _migrateFromLegacyCache() {
        try {
            const cache = await caches.open(FS_CONSTANTS.CACHE_NAME);
            const response = await cache.match(FS_CONSTANTS.METADATA_PATH);
            
            if (response) {
                const legacyData = await response.json();
                console.log(`FS: Migrando ${legacyData.length} elementos de Caché a DB...`);
                this.data = legacyData;
                
                const tx = this._db.transaction(['items'], 'readwrite');
                const store = tx.objectStore('items');
                this.data.forEach(item => store.put(item));
                console.log("FS: Migración completada.");
            } else {
                this.data = [];
            }
        } catch (e) {
            this.data = [];
        }
    },

    // --- RAW FILES (BLOBS) ---
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
        } catch(e) { return null; }
    },

    async getImageUrl(content) {
        if (typeof content === 'string' && content.startsWith('/files/')) {
            const blob = await this.getRawFile(content);
            if (blob) return URL.createObjectURL(blob);
        }
        return content; 
    },

    // --- OPERACIONES CRUD ---

    _markDirty(id) {
        this._modifiedIds.add(id);
        this._deletedIds.delete(id); 
    },

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
        this._markDirty(item.id);
        return item;
    },

    createFolder(name, parentId, coords) {
        const folder = TypeFolder.create(name, parentId, coords);
        this.data.push(folder);
        this._markDirty(folder.id);
        return folder;
    },

    createTextFile(name, content, parentId, coords) {
        const file = TypeText.create(name, content, parentId, coords);
        this.data.push(file);
        this._markDirty(file.id);
        return file;
    },

    createCSS(name, content, parentId, coords) {
        const file = TypeCSS.create(name, content, parentId, coords);
        this.data.push(file);
        this._markDirty(file.id);
        return file;
    },

    createJS(name, content, parentId, coords) {
        const file = TypeJS.create(name, content, parentId, coords);
        this.data.push(file);
        this._markDirty(file.id);
        return file;
    },
    
    createImage(name, src, parentId, coords) {
        const file = TypeImage.create(name, src, parentId, coords);
        this.data.push(file);
        this._markDirty(file.id);
        return file;
    },

    createJSON(name, content, parentId, coords) {
        const file = TypeJSON.create(name, content, parentId, coords);
        this.data.push(file);
        this._markDirty(file.id);
        return file;
    },

    createHTML(name, content, parentId, coords) {
        if (typeof TypeHTML === 'undefined') return null;
        const file = TypeHTML.create(name, content, parentId, coords);
        this.data.push(file);
        this._markDirty(file.id);
        return file;
    },

    createProgram(name, parentId, coords) {
        if (typeof TypeProgram === 'undefined') return null;
        const item = TypeProgram.create(name, parentId, coords);
        this.data.push(item);
        this._markDirty(item.id);
        return item;
    },

    createBook(name, parentId, coords) {
        if (typeof TypeBook === 'undefined') return null;
        const item = TypeBook.create(name, parentId, coords);
        this.data.push(item);
        this._markDirty(item.id);
        return item;
    },
    
    createGamebook(name, parentId, coords) {
        if (typeof TypeGamebook === 'undefined') return null;
        const item = TypeGamebook.create(name, parentId, coords);
        this.data.push(item);
        this._markDirty(item.id);
        return item;
    },

    createNarrative(name, parentId, coords) {
        if (typeof TypeNarrative === 'undefined') return null;
        const item = TypeNarrative.create(name, parentId, coords);
        this.data.push(item);
        this._markDirty(item.id);
        return item;
    },

    createData(name, content, parentId, coords) {
        if (typeof TypeData === 'undefined') {
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
            this._markDirty(item.id);
            return item;
        }
        const item = TypeData.create(name, content, parentId, coords);
        this.data.push(item);
        this._markDirty(item.id);
        return item;
    },

    // AHORA UPDATEITEM SIEMPRE MARCA SUCIO, IGNORANDO EL SUPRESSSAVE
    // Esto es seguro porque 'markDirty' es muy barato en RAM.
    updateItem(id, updates, suppressSave = false) {
        const item = this.data.find(i => i.id === id);
        if (item) { 
            Object.assign(item, updates); 
            this._markDirty(item.id); 
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
            allIdsToDelete.forEach(deletedId => {
                this._deletedIds.add(deletedId);
                this._modifiedIds.delete(deletedId);
            });
            return true;
        }
        return false;
    },
    
    exists(name, parentId) {
        return this.data.some(i => i.parentId === parentId && i.title === name);
    }
};