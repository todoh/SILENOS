// --- BASE DE DATOS DE CARTAS (Silenos Tactical) ---
// Guardar como: Cartas Silen/data.js

const BASE_ABILITIES = [
    { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
    { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
];

// Cartas del núcleo base (Core Set)
const CORE_CARDS = [
    { 
        id: 1, name: "Guerrero de Fuego", cost: 10,
        power: 1, strength: 35, intelligence: 10, maxHp: 250,
        image: "img/guerrero_fuego.jpg", desc: "Arde con furia combativa.",
        types: ["Fuego", "Guerrero", "Humano"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 2, name: "Muro de Hielo", cost: 10, 
        power: 0, strength: 50, intelligence: 5, maxHp: 400,
        image: "img/muro_hielo.jpg", desc: "Defensa sólida.",
        types: ["Hielo", "Estructura", "Elemental"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 3, name: "Dragón Ancestral", cost: 60, 
        power: 4, strength: 90, intelligence: 60, maxHp: 800,
        image: "img/dragon_ancestral.jpg", desc: "Rey de los cielos.",
        types: ["Fuego", "Dragón", "Bestia"], 
        abilities: [...BASE_ABILITIES, { id: 'breath', name: "Aliento", type: "interaction", cost: 20, desc: "Daña sin contacto." }]
    },
    { 
        id: 4, name: "Ladrón Sombrío", cost: 20, 
        power: 2, strength: 25, intelligence: 40, maxHp: 200,
        image: "img/ladron_sombrio.jpg", desc: "Rápido y letal.",
        types: ["Oscuridad", "Asesino", "Humano"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 5, name: "Mago Arcano", cost: 40, 
        power: 1, strength: 30, intelligence: 85, maxHp: 180,
        image: "img/mago_arcano.jpg", desc: "Conocimiento puro.",
        types: ["Arcano", "Conjurador", "Humano"], 
        abilities: [...BASE_ABILITIES, { id: 'meditate', name: "Meditar", type: "preparation", cost: 10, desc: "Cura 50 HP." }]
    },
    { 
        id: 6, name: "Slime", cost: 10, 
        power: 0, strength: 15, intelligence: 5, maxHp: 150,
        image: "img/slime.jpg", desc: "Pequeño pero valiente.",
        types: ["Agua", "Soporte", "Limo"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 7, name: "Caballero Real", cost: 50, 
        power: 2, strength: 75, intelligence: 30, maxHp: 600,
        image: "img/caballero_real.jpg", desc: "Honor ante todo.",
        types: ["Metal", "Guardián", "Humano"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 8, name: "Nigromante", cost: 40, 
        power: 1, strength: 40, intelligence: 70, maxHp: 300,
        image: "img/nigromante.jpg", desc: "Levanta a los muertos.",
        types: ["Oscuridad", "Conjurador", "Humano"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 9, name: "Druida", cost: 30, 
        power: 1, strength: 45, intelligence: 60, maxHp: 350,
        image: "img/druida.jpg", desc: "Fuerza de la naturaleza.",
        types: ["Naturaleza", "Soporte", "Elfo"], 
        abilities: [...BASE_ABILITIES, { id: 'grow', name: "Crecer", type: "preparation", cost: 15, desc: "+10 a todo." }]
    },
    { 
        id: 10, name: "Golem", cost: 50, 
        power: 2, strength: 85, intelligence: 5, maxHp: 700,
        image: "img/golem.jpg", desc: "Inamovible.",
        types: ["Tierra", "Guardián", "Constructo"], 
        abilities: [...BASE_ABILITIES]
    },
];

// Lógica de Mezcla: Combina Core + Todos los paquetes adicionales detectados
let combinedCards = [...CORE_CARDS];

if (typeof EXTRA_CARDS !== 'undefined') {
    combinedCards = [...combinedCards, ...EXTRA_CARDS];
}

if (typeof NARRATIVE_CARDS !== 'undefined') {
    combinedCards = [...combinedCards, ...NARRATIVE_CARDS];
}

if (typeof EXPANSION_CARDS !== 'undefined') {
    combinedCards = [...combinedCards, ...EXPANSION_CARDS];
}

// Integración del nuevo Data 5 (Sinergias)
// Verificamos si existe globalmente (window.DATA5_CARDS) o localmente
if (typeof window.DATA5_CARDS !== 'undefined') {
    combinedCards = [...combinedCards, ...window.DATA5_CARDS];
} else if (typeof DATA5_CARDS !== 'undefined') {
    combinedCards = [...combinedCards, ...DATA5_CARDS];
}

const ALL_CARDS = combinedCards;