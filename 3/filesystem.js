/* SILENOS 3/filesystem.js */
// --- SISTEMA DE ARCHIVOS BASADO EN CACHÉ (LOCALSTORAGE) Y MATERIA BASE64 ---

const FS_KEY = 'silenos_materia_storage';

const FileSystem = {
    data: [],
    _hasChanges: false,

    async init() {
        try {
            const stored = localStorage.getItem(FS_KEY);
            if (stored) {
                this.data = JSON.parse(stored);
                console.log("H -> Materia recuperada de la memoria local.");
            }
        } catch (e) {
            console.error("FS: Error en coherencia inicial", e);
        }
    },

    save() {
        try {
            localStorage.setItem(FS_KEY, JSON.stringify(this.data));
            window.dispatchEvent(new Event('fs-data-changed'));
            this._hasChanges = true;
        } catch (e) {
            console.error("FS: Error de almacenamiento (Límite de caché excedido)", e);
            alert("⚠️ Error: La memoria del sistema está llena. Elimina archivos o imágenes.");
        }
    },

    // [ARREGLADO] Ahora permite una resolución mayor (800px) para "verlas bien"
    async saveImageFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const max = 800; // Aumentado de 150 a 800 para calidad visual

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
                    
                    const base64 = canvas.toDataURL('image/png', 0.8);
                    resolve(base64);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    // [NUEVO] Función que faltaba para recuperar la URL de la materia visual
    async getImageUrl(contentData) {
        if (!contentData) return null;
        // Si ya es base64, lo devolvemos directamente
        if (contentData.startsWith('data:image')) return contentData;
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

    createImageItem(filename, parentId = 'desktop', contentData = '', x, y) {
        const coords = this._getDefaultCoords(x, y);
        const item = {
            id: 'image-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'image', title: filename, parentId,
            content: contentData,
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
        this.data = this.data.filter(i => !allIdsToDelete.includes(i.id));
        this.save();
    }
};