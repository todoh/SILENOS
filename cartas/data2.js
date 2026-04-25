// --- PAQUETE DE EXPANSIÓN DE CARTAS (DATA 2) ---
// Guardar como: Cartas Silen/data2.js

// AJUSTES: Atributos rediseñados (ATK, SATK, DEF, SDEF, POW, HP) para el modo experto.

const EXTRA_CARDS = [
    { 
        id: 11, name: "Ninja del Viento", cost: 20, 
        power: 2,       
        attack: 40,   
        specialAttack: 30, 
        defense: 15,
        specialDefense: 20,
        maxHp: 65, 
        image: "img/ninja_viento.jpg", 
        desc: "Velocidad invisible.",
        types: ["Viento", "Asesino", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico rápido." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 12, name: "Yeti de la Tundra", cost: 30, 
        power: 2, 
        attack: 70,   
        specialAttack: 10, 
        defense: 50,
        specialDefense: 30,
        maxHp: 150, 
        image: "img/yeti.jpg", 
        desc: "Abominable fuerza bruta.",
        types: ["Hielo", "Guerrero", "Bestia"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico demoledor." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 13, name: "Sacerdote", cost: 25, 
        power: 1, 
        attack: 10,   
        specialAttack: 60, 
        defense: 20,
        specialDefense: 50,
        maxHp: 50, 
        image: "img/sacerdote.jpg", 
        desc: "Luz sagrada.",
        types: ["Luz", "Soporte", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico débil." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'meditate', name: "Bendición", type: "preparation", cost: 8, desc: "Cura 50 HP." } 
        ]
    },
    { 
        id: 14, name: "Rey Esqueleto", cost: 60, 
        power: 3,       
        attack: 80, 
        specialAttack: 50, 
        defense: 60,
        specialDefense: 40,
        maxHp: 215, 
        image: "img/rey_esqueleto.jpg", 
        desc: "El trono de huesos espera.",
        types: ["Oscuridad", "Guerrero", "No-Muerto"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico implacable." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'grow', name: "Mando", type: "preparation", cost: 10, desc: "+10 a todo." } 
        ]
    },
    { 
        id: 15, name: "Leviatán", cost: 80, 
        power: 5,       
        attack: 100,  
        specialAttack: 60, 
        defense: 80,
        specialDefense: 60,
        maxHp: 300, 
        image: "img/leviatan.jpg", 
        desc: "Terror de las profundidades.",
        types: ["Agua", "Gigante", "Bestia"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico devastador." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'tidal_wave', name: "Tsunami", type: "interaction", cost: 25, desc: "Daño masivo a todos." } 
        ]
    }
];