/* SILENOS 3/archivos/type-json.js */
const TypeJSON = {
    create(name, content, parentId, coords) {
        return {
            id: 'json-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'json', 
            title: name || 'data.json', 
            parentId,
            content: { text: typeof content === 'object' ? JSON.stringify(content, null, 2) : (content || "{}") },
            x: coords?.x || 0, 
            y: coords?.y || 0, 
            z: coords?.z || 0, 
            icon: 'brackets', // O 'file-json'
            color: 'text-orange-400'
        };
    }
};