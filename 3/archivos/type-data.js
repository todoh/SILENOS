/* SILENOS 3/archivos/type-data.js */
const TypeData = {
    create(name, content, parentId, coords) {
        return {
            id: 'data-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'data',
            title: name || 'Nuevo Dato',
            parentId,
            content: content || {},
            x: coords?.x || 0,
            y: coords?.y || 0,
            z: coords?.z || 0,
            icon: 'database',
            color: 'text-blue-400'
        };
    }
};