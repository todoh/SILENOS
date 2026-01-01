// --- BASE DE DATOS DE CARTAS (Silenos Tactical) ---

const BASE_ABILITIES = [
    { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
    { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
];

// Stats base para coste 1 según instrucciones: Vida 250, Poder 10, Int 10, Fuerza 10.
const ALL_CARDS = [
    { 
        id: 1, name: "Guerrero de Fuego", cost: 10, // Costes ajustados a la nueva escala de energía (1 = 10)
        power: 10, intelligence: 5, strength: 15, maxHp: 250,
        image: "🔥", desc: "Arde con furia combativa.",
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 2, name: "Muro de Hielo", cost: 10, 
        power: 5, intelligence: 15, strength: 5, maxHp: 400,
        image: "🧊", desc: "Defensa sólida.",
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 3, name: "Dragón Ancestral", cost: 60, 
        power: 50, intelligence: 40, strength: 60, maxHp: 800,
        image: "🐉", desc: "Rey de los cielos.",
        abilities: [...BASE_ABILITIES, { id: 'breath', name: "Aliento", type: "interaction", cost: 20, desc: "Daña sin contacto." }]
    },
    { 
        id: 4, name: "Ladrón Sombrío", cost: 20, 
        power: 15, intelligence: 20, strength: 15, maxHp: 200,
        image: "🥷", desc: "Rápido y letal.",
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 5, name: "Mago Arcano", cost: 40, 
        power: 10, intelligence: 50, strength: 5, maxHp: 180,
        image: "🧙‍♂️", desc: "Conocimiento puro.",
        abilities: [...BASE_ABILITIES, { id: 'meditate', name: "Meditar", type: "preparation", cost: 10, desc: "Cura 50 HP." }]
    },
    { 
        id: 6, name: "Slime", cost: 10, 
        power: 5, intelligence: 5, strength: 5, maxHp: 150,
        image: "🟢", desc: "Pequeño pero valiente.",
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 7, name: "Caballero Real", cost: 50, 
        power: 20, intelligence: 20, strength: 40, maxHp: 600,
        image: "🛡️", desc: "Honor ante todo.",
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 8, name: "Nigromante", cost: 40, 
        power: 30, intelligence: 30, strength: 10, maxHp: 300,
        image: "💀", desc: "Levanta a los muertos.",
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 9, name: "Druida", cost: 30, 
        power: 10, intelligence: 30, strength: 20, maxHp: 350,
        image: "🌳", desc: "Fuerza de la naturaleza.",
        abilities: [...BASE_ABILITIES, { id: 'grow', name: "Crecer", type: "preparation", cost: 15, desc: "+10 a todo." }]
    },
    { 
        id: 10, name: "Golem", cost: 50, 
        power: 10, intelligence: 5, strength: 50, maxHp: 700,
        image: "🗿", desc: "Inamovible.",
        abilities: [...BASE_ABILITIES]
    },
];