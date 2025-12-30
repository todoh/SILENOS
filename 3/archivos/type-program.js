/* SILENOS 3/archivos/type-program.js */
const TypeProgram = {
    create(name, parentId, coords) {
        return {
            id: 'prog-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'program',
            title: name || 'Nuevo Programa',
            parentId,
            content: { nodes: [], connections: [] },
            x: coords?.x || 0,
            y: coords?.y || 0,
            z: coords?.z || 0,
            icon: 'cpu',
            color: 'text-purple-600'
        };
    }
};