/* SILENOS 3/archivos/type-book.js */
const TypeBook = {
    create(name, parentId, coords) {
        return {
            id: 'book-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'book',
            title: name || 'Nuevo Libro',
            parentId,
            // CORRECCIÓN: Usamos 'paragraphs' como array para que BookManager pueda leerlo
            content: { 
                chapters: [
                    { title: 'Capítulo 1', paragraphs: ["Escribe aquí tu primer párrafo..."] }
                ] 
            },
            x: coords?.x || 0,
            y: coords?.y || 0,
            z: coords?.z || 0,
            icon: 'book',
            color: 'text-indigo-600'
        };
    }
};