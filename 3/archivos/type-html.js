/* SILENOS 3/archivos/type-html.js */
const TypeHTML = {
    create(name, content, parentId, coords) {
        const fileName = name || 'index.html';
        // Extraemos la primera letra en mayúscula para el logo
        const firstLetter = fileName.charAt(0).toUpperCase();
        
        return {
            id: 'html-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'html', 
            title: fileName, 
            parentId,
            content: { text: content || "" },
            x: coords?.x || 0, 
            y: coords?.y || 0, 
            z: coords?.z || 0, 
            icon: firstLetter, // La letra es el icono
            color: 'text-orange-500' // Color naranja característico de HTML
        };
    }
};