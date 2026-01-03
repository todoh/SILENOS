// --- PAQUETE DE EXPANSIÓN DE CARTAS (DATA 2) ---
// Guardar como: Cartas Silen/data2.js

// AJUSTES: Vida reducida a ~1/3. Costes de habilidades reducidos.

const EXTRA_CARDS = [
    { 
        id: 11, name: "Ninja del Viento", cost: 20, 
        power: 2,       
        strength: 40,   
        intelligence: 30, 
        maxHp: 65, // Antes 200
        image: "img/ninja_viento.jpg", 
        desc: "Velocidad invisible.",
        types: ["Viento", "Asesino", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 12, name: "Yeti de la Tundra", cost: 30, 
        power: 2, 
        strength: 70,   
        intelligence: 10, 
        maxHp: 150, // Antes 450
        image: "img/yeti.jpg", 
        desc: "Abominable fuerza bruta.",
        types: ["Hielo", "Guerrero", "Bestia"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 13, name: "Sacerdote", cost: 25, 
        power: 1, 
        strength: 20,   
        intelligence: 60, 
        maxHp: 50, // Antes 150
        image: "img/sacerdote.jpg", 
        desc: "Luz sagrada.",
        types: ["Luz", "Soporte", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'meditate', name: "Bendición", type: "preparation", cost: 8, desc: "Cura 50 HP." } // Coste bajado de 15 a 8
        ]
    },
    { 
        id: 14, name: "Rey Esqueleto", cost: 60, 
        power: 3,       
        strength: 80, 
        intelligence: 50, 
        maxHp: 215, // Antes 650
        image: "img/rey_esqueleto.jpg", 
        desc: "El trono de huesos espera.",
        types: ["Oscuridad", "Guerrero", "No-Muerto"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'grow', name: "Mando", type: "preparation", cost: 10, desc: "+10 a todo." } // Coste bajado de 20 a 10
        ]
    },
    { 
        id: 15, name: "Leviatán", cost: 80, 
        power: 5,       
        strength: 100,  
        intelligence: 40, 
        maxHp: 300, // Antes 900
        image: "img/leviatan.jpg", 
        desc: "Terror de las profundidades.",
        types: ["Agua", "Gigante", "Bestia"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'tidal_wave', name: "Tsunami", type: "interaction", cost: 25, desc: "Daño masivo a todos." } // Coste bajado de 50 a 25
        ]
    }
];