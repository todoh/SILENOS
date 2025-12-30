/* SILENOS 3/archivos/type-text.js */
const TypeText = {
    create(name, content, parentId, coords) {
        return {
            id: 'file-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'text',
            title: name || 'nuevo_documento.txt',
            parentId,
            content: { text: content || "" },
            x: coords?.x || 0, 
            y: coords?.y || 0, 
            z: coords?.z || 0,
            icon: 'file-text',
            color: 'text-gray-200'
        };
    }
};