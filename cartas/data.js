// --- BASE DE DATOS DE CARTAS (Silenos Tactical) ---
// Guardar como: Cartas Silen/data.js

// Habilidades base (Atacar/Defender) - Coste 0 se mantiene
const BASE_ABILITIES = [
    { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
    { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
];

// Cartas del núcleo base (Core Set)
// AJUSTES: Vida reducida a ~1/3. Costes de habilidades bajados drásticamente.
const CORE_CARDS = [
    { 
        id: 1, name: "Guerrero de Fuego", cost: 10,
        power: 1, strength: 35, intelligence: 10, maxHp: 85, // Antes 250
        image: "img/guerrero_fuego.jpg", desc: "Arde con furia combativa.",
        types: ["Fuego", "Guerrero", "Humano"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 2, name: "Muro de Hielo", cost: 10, 
        power: 0, strength: 50, intelligence: 5, maxHp: 135, // Antes 400
        image: "img/muro_hielo.jpg", desc: "Defensa sólida.",
        types: ["Hielo", "Estructura", "Elemental"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 3, name: "Mago de Fuego", cost: 20, 
        power: 2, strength: 10, intelligence: 60, maxHp: 60, // Antes 180
        image: "img/mago_fuego.jpg", desc: "Maestro de la piromancia.",
        types: ["Fuego", "Mago", "Humano"], 
        abilities: [
            ...BASE_ABILITIES, 
            { id: 'fireball', name: "Bola de Fuego", type: "interaction", cost: 15, desc: "Daño mágico alto." } // Coste bajado de 25 a 15
        ]
    },
    { 
        id: 4, name: "Elemental de Roca", cost: 25, 
        power: 2, strength: 60, intelligence: 5, maxHp: 200, // Antes 600
        image: "img/elemental_roca.jpg", desc: "Duro como la piedra.",
        types: ["Tierra", "Elemental", "Tanque"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 5, name: "Sacerdotisa", cost: 15, 
        power: 1, strength: 10, intelligence: 50, maxHp: 50, // Antes 150
        image: "img/sacerdotisa.jpg", desc: "Luz curativa.",
        types: ["Luz", "Soporte", "Humano"], 
        abilities: [
            ...BASE_ABILITIES, 
            { id: 'heal', name: "Curar", type: "preparation", cost: 10, desc: "Restaura HP." } // Coste bajado de 20 a 10
        ]
    },
    { 
        id: 6, name: "Caballero Real", cost: 30, 
        power: 2, strength: 55, intelligence: 20, maxHp: 115, // Antes 350
        image: "img/caballero_real.jpg", desc: "Honor y acero.",
        types: ["Acero", "Guerrero", "Humano"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 7, name: "Titan de Hielo", cost: 40, 
        power: 3, strength: 70, intelligence: 15, maxHp: 265, // Antes 800
        image: "img/titan_hielo.jpg", desc: "El invierno camina.",
        types: ["Hielo", "Gigante", "Elemental"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 8, name: "Fénix", cost: 45, 
        power: 3, strength: 40, intelligence: 70, maxHp: 100, // Antes 300
        image: "img/fenix.jpg", desc: "Renace de las cenizas.",
        types: ["Fuego", "Bestia", "Volador"], 
        abilities: [
            ...BASE_ABILITIES,
            { id: 'rebirth', name: "Renacer", type: "response", cost: 25, desc: "Revive al morir." } // Coste bajado de 50 a 25
        ]
    },
    { 
        id: 9, name: "Druida", cost: 30, 
        power: 1, strength: 45, intelligence: 60, maxHp: 120, // Antes 350
        image: "img/druida.jpg", desc: "Fuerza de la naturaleza.",
        types: ["Naturaleza", "Soporte", "Elfo"], 
        abilities: [
            ...BASE_ABILITIES, 
            { id: 'grow', name: "Crecer", type: "preparation", cost: 8, desc: "+10 a todo." } // Coste bajado de 15 a 8
        ]
    },
    { 
        id: 10, name: "Golem", cost: 50, 
        power: 2, strength: 85, intelligence: 5, maxHp: 235, // Antes 700
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

// NUEVO: Integración de DATA5 (Sinergias)
if (typeof DATA5_CARDS !== 'undefined') {
    combinedCards = [...combinedCards, ...DATA5_CARDS];
}

const CARDS = combinedCards;