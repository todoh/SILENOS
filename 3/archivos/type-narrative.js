/* SILENOS 3/archivos/type-narrative.js */
const TypeNarrative = {
    create(name, parentId, coords) {
        return {
            id: 'narr-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'narrative',
            title: name || 'Dato Narrativo',
            parentId,
            content: { text: "" },
            x: coords?.x || 0,
            y: coords?.y || 0,
            z: coords?.z || 0,
            icon: 'sticky-note',
            color: 'text-orange-500'
        };
    }
};