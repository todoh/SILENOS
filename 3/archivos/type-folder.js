/* SILENOS 3/archivos/type-folder.js */
const TypeFolder = {
    create(name, parentId, coords) {
        return {
            id: 'folder-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'folder',
            title: name || 'Nueva Carpeta',
            parentId,
            // Las carpetas no tienen 'content' de texto usualmente, pero mantenemos estructura
            content: { files: [] }, 
            x: coords?.x || 0, 
            y: coords?.y || 0, 
            z: coords?.z || 0,
            icon: 'folder',
            color: 'text-yellow-400', // Color estándar de carpeta
            isOpen: false
        };
    }
};