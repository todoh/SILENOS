/* SILENOS 3/archivos/type-js.js */
const TypeJS = {
    create(name, content, parentId, coords) {
        return {
            id: 'js-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'javascript', 
            title: name || 'script.js', 
            parentId,
            content: { text: content || "" },
            x: coords?.x || 0, 
            y: coords?.y || 0, 
            z: coords?.z || 0, 
            icon: 'file-code', // O 'code'
            color: 'text-yellow-300' // Amarillo JS
        };
    }
};