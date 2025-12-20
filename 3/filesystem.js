/* SILENOS 3/filesystem.js */
// --- SISTEMA DE ARCHIVOS (Persistencia y Lógica) ---

const FS_KEY = 'neumorph_os_filesystem';

const FileSystem = {
    // Estado inicial
    data: [],

    init() {
        try {
            const stored = localStorage.getItem(FS_KEY);
            if (stored) {
                this.data = JSON.parse(stored);
            } else {
                this.data = []; 
            }
        } catch (e) {
            console.error("FileSystem: Error corrupto al leer caché", e);
            this.data = [];
        }
    },

    save() {
        try {
            localStorage.setItem(FS_KEY, JSON.stringify(this.data));
            window.dispatchEvent(new Event('fs-data-changed'));
        } catch (e) {
            console.error("FileSystem: Error CRÍTICO al guardar en disco", e);
            alert("Error crítico: No se puede guardar en el almacenamiento local.");
        }
    },

    // Crear Carpeta
    createFolder(name, parentId = 'desktop', x = 0, y = 0) {
        this.init(); 
        const folder = {
            id: 'folder-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'folder',
            title: name || 'Nueva Carpeta',
            parentId: parentId,
            x: x,
            y: y,
            icon: 'folder',
            color: 'text-blue-500'
        };
        this.data.push(folder);
        this.save();
        return folder;
    },

    // Crear Dato JSON
    createData(name, content, parentId = 'desktop', x = 0, y = 0) {
        this.init();
        const file = {
            id: 'file-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'file',
            title: name || 'Nuevo Dato',
            parentId: parentId,
            content: content || { info: "Escribe aquí tu JSON..." },
            x: x,
            y: y,
            icon: 'file-json',
            color: 'text-green-600'
        };
        this.data.push(file);
        this.save();
        return file;
    },

    // [NUEVO] Crear Programa
    createProgram(name, parentId = 'desktop', x = 0, y = 0) {
        this.init();
        const prog = {
            id: 'program-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'program',
            title: name || 'Nuevo Programa',
            parentId: parentId,
            // Contenido inicial vacío (el grafo detectará esto y pondrá el Start por defecto)
            content: { 
                nodes: [], 
                connections: [],
                panX: 0,
                panY: 0,
                scale: 1
            },
            x: x,
            y: y,
            icon: 'cpu', // Icono distintivo
            color: 'text-purple-500'
        };
        this.data.push(prog);
        this.save();
        return prog;
    },

    // Crear Dato Narrativo
    createNarrative(name, parentId = 'desktop', x = 0, y = 0) {
        this.init();
        const item = {
            id: 'narrative-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'narrative',
            title: name || 'Dato Narrativo',
            parentId: parentId,
            content: {
                tag: "GENERAL",
                text: "Escribe aquí tu contenido narrativo..."
            },
            x: x,
            y: y,
            icon: 'sticky-note',
            color: 'text-orange-500'
        };
        this.data.push(item);
        this.save();
        return item;
    },

    // Crear Libro
    createBook(name, parentId = 'desktop', x = 0, y = 0) {
        this.init();
        const book = {
            id: 'book-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'book', 
            title: name || 'Nuevo Libro',
            parentId: parentId,
            content: {
                chapters: [
                    {
                        title: "Capítulo 1",
                        paragraphs: ["Comienza tu historia aquí..."]
                    }
                ]
            },
            x: x,
            y: y,
            icon: 'book', 
            color: 'text-indigo-600'
        };
        this.data.push(book);
        this.save();
        return book;
    },

    // Mover o Editar item
    updateItem(id, updates) {
        const item = this.data.find(i => i.id === id);
        if (item) {
            Object.assign(item, updates);
            this.save();
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
        this.init(); 
        const getIdsToDelete = (itemId) => {
            let ids = [itemId];
            const children = this.data.filter(i => i.parentId === itemId);
            children.forEach(c => {
                ids = ids.concat(getIdsToDelete(c.id));
            });
            return ids;
        };

        const allIdsToDelete = getIdsToDelete(id);
        this.data = this.data.filter(i => !allIdsToDelete.includes(i.id));
        this.save();
    }
};

// Inicializar al cargar
FileSystem.init();