/* SILENOS 3/archivos/type-gamebook.js */
const TypeGamebook = {
    create(name, parentId, coords) {
        return {
            id: 'gamebook-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'gamebook',
            title: name || 'Nuevo Librojuego',
            parentId,
            // Estructura inicial idéntica a la requerida por el editor de React
            content: {
                title: name || 'Nueva Aventura',
                startSceneId: 'start',
                scenes: [
                    {
                        id: 'start',
                        title: 'Inicio',
                        text: 'Te despiertas en una habitación oscura. No recuerdas cómo llegaste aquí.',
                        image: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                        choices: [],
                        x: 100, y: 300
                    }
                ]
            },
            x: coords?.x || 0,
            y: coords?.y || 0,
            z: coords?.z || 0,
            icon: 'gamepad-2',
            color: 'text-purple-500'
        };
    }
};