/* SILENOS 3/archivos/type-css.js */
const TypeCSS = {
    create(name, content, parentId, coords) {
        return {
            id: 'css-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'css', 
            title: name || 'styles.css', 
            parentId,
            content: { text: content || "" },
            x: coords?.x || 0, 
            y: coords?.y || 0, 
            z: coords?.z || 0, 
            icon: 'palette',
            color: 'text-blue-400' // Azul CSS
        };
    }
};