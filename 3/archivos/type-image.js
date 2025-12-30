/* SILENOS 3/archivos/type-image.js */
const TypeImage = {
    create(name, src, parentId, coords) {
        return {
            id: 'img-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'image',
            title: name || 'imagen.png',
            parentId,
            content: { src: src || '' }, // src puede ser base64 o url
            x: coords?.x || 0, 
            y: coords?.y || 0, 
            z: coords?.z || 0,
            icon: 'image',
            color: 'text-purple-400'
        };
    }
};