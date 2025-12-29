/* SILENOS 3/filesystem.js */
// --- SISTEMA DE ARCHIVOS BASADO EN CACHE API Y STORAGE MANAGER ---

const CACHE_NAME = 'silenos-fs-v1';
const METADATA_PATH = '/system/metadata.json';

const FileSystem = {
    data: [],
    _hasChanges: false,

    async init() {
        try {
            // 1. Solicitar Persistencia y verificar cuota (Intentar reservar espacio)
            if (navigator.storage && navigator.storage.persist) {
                const isPersisted = await navigator.storage.persist();
                console.log(`FS: Persistencia de almacenamiento ${isPersisted ? 'CONCEDIDA' : 'NO GARANTIZADA'}`);
                
                const estimate = await navigator.storage.estimate();
                const quotaMB = (estimate.quota || 0) / (1024 * 1024);
                const usageMB = (estimate.usage || 0) / (1024 * 1024);
                
                console.log(`FS: Cuota disponible: ${quotaMB.toFixed(2)} MB. Usado: ${usageMB.toFixed(2)} MB.`);
                
                if (quotaMB < 512) {
                    console.warn("FS: Advertencia - El sistema tiene asignados menos de 512MB de espacio virtual.");
                } else {
                    console.log("FS: Espacio virtual de >512MB verificado.");
                }
            }

            // 2. Recuperar metadatos desde Cache API
            const cache = await caches.open(CACHE_NAME);
            const response = await cache.match(METADATA_PATH);
            
            if (response) {
                this.data = await response.json();
                console.log("H -> Materia recuperada del Cache API.");
            } else {
                // Intento de migración legacy si existe localStorage previo
                const legacy = localStorage.getItem('silenos_materia_storage');
                if (legacy) {
                    console.log("FS: Migrando datos antiguos de LocalStorage a Cache API...");
                    this.data = JSON.parse(legacy);
                    this.save(); // Guardar en el nuevo sistema
                }
            }

        } catch (e) {
            console.error("FS: Error en coherencia inicial (Cache API)", e);
        }
    },

    async save() {
        try {
            const cache = await caches.open(CACHE_NAME);
            const blob = new Blob([JSON.stringify(this.data)], { type: 'application/json' });
            const response = new Response(blob, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            await cache.put(METADATA_PATH, response);
            
            window.dispatchEvent(new Event('fs-data-changed'));
            this._hasChanges = true;
            // console.log("FS: Sistema guardado en Cache API");
        } catch (e) {
            console.error("FS: Error de almacenamiento crítico", e);
            alert("⚠️ Error al guardar en el disco virtual.");
        }
    },

    // [MODIFICADO] Guarda la imagen como Blob en Cache API y devuelve una ruta interna
    async saveImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = async () => {
                    // Procesamiento visual (Resize)
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const max = 800; 

                    if (width > height) {
                        if (width > max) {
                            height *= max / width;
                            width = max;
                        }
                    } else {
                        if (height > max) {
                            width *= max / height;
                            height = max;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convertir a Blob en lugar de Base64 para ahorrar memoria
                    canvas.toBlob(async (blob) => {
                        if (!blob) {
                            reject("Error generando blob de imagen");
                            return;
                        }

                        const fileId = 'img-' + Date.now() + '-' + Math.floor(Math.random() * 10000) + '.png';
                        const filePath = `/images/${fileId}`;
                        
                        try {
                            const cache = await caches.open(CACHE_NAME);
                            const response = new Response(blob, {
                                headers: { 'Content-Type': 'image/png' }
                            });
                            await cache.put(filePath, response);
                            resolve(filePath); // Guardamos la ruta interna, no el base64 gigante
                        } catch (err) {
                            console.error("FS: Error guardando imagen en Cache", err);
                            reject(err);
                        }
                    }, 'image/png', 0.8);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    // [MODIFICADO] Recupera la URL usable (Blob URL) desde la caché
    async getImageUrl(contentData) {
        if (!contentData) return null;

        // Soporte Legacy (si aún hay base64 guardado)
        if (contentData.startsWith('data:image')) return contentData;

        // Soporte Cache API (Rutas internas)
        if (contentData.startsWith('/images/')) {
            try {
                const cache = await caches.open(CACHE_NAME);
                const response = await cache.match(contentData);
                if (response) {
                    const blob = await response.blob();
                    return URL.createObjectURL(blob);
                }
            } catch (e) {
                console.error("FS: No se pudo recuperar la imagen", contentData);
            }
        }
        return null;
    },

    // --- MÉTODOS DE CREACIÓN DE MATERIA (M) ---

    _getDefaultCoords(x, y) {
        return {
            x: (typeof x === 'number') ? x : window.innerWidth / 2,
            y: (typeof y === 'number') ? y : window.innerHeight / 2,
            z: 0 
        };
    },

    createImageItem(filename, parentId = 'desktop', contentPath = '', x, y) {
        const coords = this._getDefaultCoords(x, y);
        const item = {
            id: 'image-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'image', title: filename, parentId,
            content: contentPath, // Ahora guarda la ruta /images/...
            x: coords.x, y: coords.y, z: coords.z, icon: 'image', color: 'text-blue-400'
        };
        this.data.push(item);
        this.save();
        return item;
    },

    createFolder(name, parentId = 'desktop', x, y) {
        const coords = this._getDefaultCoords(x, y);
        const folder = {
            id: 'folder-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'folder', title: name || 'Nueva Carpeta', parentId,
            x: coords.x, y: coords.y, z: coords.z, icon: 'folder', color: 'text-blue-500'
        };
        this.data.push(folder);
        this.save();
        return folder;
    },

    createData(name, content, parentId = 'desktop', x, y) {
        const coords = this._getDefaultCoords(x, y);
        const file = {
            id: 'file-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'file', title: name || 'Nuevo Dato', parentId,
            content: content || { info: "..." },
            x: coords.x, y: coords.y, z: coords.z, icon: 'file-json', color: 'text-green-600'
        };
        this.data.push(file);
        this.save();
        return file;
    },

    createBook(name, parentId = 'desktop', x, y) {
        const coords = this._getDefaultCoords(x, y);
        const book = {
            id: 'book-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'book', title: name || 'Nuevo Libro', parentId,
            content: { chapters: [{ title: "Capítulo 1", paragraphs: ["..."] }] },
            x: coords.x, y: coords.y, z: coords.z, icon: 'book', color: 'text-indigo-600'
        };
        this.data.push(book);
        this.save();
        return book;
    },

    createNarrative(name, parentId = 'desktop', x, y) {
        const coords = this._getDefaultCoords(x, y);
        const item = {
            id: 'narrative-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'narrative', title: name || 'Dato Narrativo', parentId,
            content: { tag: "GENERAL", text: "..." },
            x: coords.x, y: coords.y, z: coords.z, icon: 'sticky-note', color: 'text-orange-500'
        };
        this.data.push(item);
        this.save();
        return item;
    },

    createProgram(name, parentId = 'desktop', x, y) {
        const coords = this._getDefaultCoords(x, y);
        const prog = {
            id: 'program-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'program', title: name || 'Nuevo Programa', parentId,
            content: { nodes: [], connections: [], panX: 0, panY: 0, scale: 1 },
            x: coords.x, y: coords.y, z: coords.z, icon: 'cpu', color: 'text-purple-500'
        };
        this.data.push(prog);
        this.save();
        return prog;
    },

    updateItem(id, updates) {
        const item = this.data.find(i => i.id === id);
        if (item) { Object.assign(item, updates); this.save(); return true; }
        return false;
    },

    getItems(parentId) { return this.data.filter(i => i.parentId === parentId); },
    getItem(id) { return this.data.find(i => i.id === id); },

    deleteItem(id) {
        const getIdsToDelete = (itemId) => {
            let ids = [itemId];
            const children = this.data.filter(i => i.parentId === itemId);
            children.forEach(c => ids = ids.concat(getIdsToDelete(c.id)));
            return ids;
        };
        const allIdsToDelete = getIdsToDelete(id);
        
        // Opcional: Podríamos limpiar las imágenes del caché aquí si quisiéramos ser estrictos con la basura
        // pero por seguridad mantenemos el borrado solo de metadatos por ahora.
        
        this.data = this.data.filter(i => !allIdsToDelete.includes(i.id));
        this.save();
    }
};