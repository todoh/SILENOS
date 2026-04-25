// --- BASE DE DATOS DE CARTAS (Silenos Tactical) ---
// Guardar como: Cartas Silen/data.js

const BASE_ABILITIES = [
    { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico." },
    { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Activa defensa." }
];
window.BASE_ABILITIES = BASE_ABILITIES;

const CORE_CARDS = [
    { 
        id: 1, name: "Guerrero de Fuego", cost: 10,
        power: 1, 
        attack: 35, specialAttack: 10, 
        defense: 25, specialDefense: 10, 
        maxHp: 85,
        image: "img/guerrero_fuego.jpg", desc: "Arde con furia combativa.",
        types: ["Fuego", "Guerrero", "Humano"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 2, name: "Muro de Hielo", cost: 10, 
        power: 0, 
        attack: 5, specialAttack: 5, 
        defense: 60, specialDefense: 40, 
        maxHp: 135,
        image: "img/muro_hielo.jpg", desc: "Defensa sólida.",
        types: ["Hielo", "Estructura", "Elemental"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 3, name: "Mago de Fuego", cost: 20, 
        power: 2, 
        attack: 10, specialAttack: 60, 
        defense: 10, specialDefense: 45, 
        maxHp: 60,
        image: "img/mago_fuego.jpg", desc: "Maestro de la piromancia.",
        types: ["Fuego", "Mago", "Humano"], 
        abilities: [
            ...BASE_ABILITIES, 
            { id: 'fireball', name: "Bola de Fuego", type: "interaction", cost: 15, desc: "Daño mágico alto." }
        ]
    },
    { 
        id: 4, name: "Elemental de Roca", cost: 25, 
        power: 2, 
        attack: 40, specialAttack: 5, 
        defense: 60, specialDefense: 20, 
        maxHp: 200,
        image: "img/elemental_roca.jpg", desc: "Duro como la piedra.",
        types: ["Tierra", "Elemental", "Tanque"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 5, name: "Sacerdotisa", cost: 15, 
        power: 1, 
        attack: 5, specialAttack: 40, 
        defense: 15, specialDefense: 60, 
        maxHp: 50,
        image: "img/sacerdotisa.jpg", desc: "Luz curativa.",
        types: ["Luz", "Soporte", "Humano"], 
        abilities: [
            ...BASE_ABILITIES, 
            { id: 'heal', name: "Curar", type: "preparation", cost: 10, desc: "Restaura HP." } 
        ]
    },
    { 
        id: 6, name: "Caballero Real", cost: 30, 
        power: 2, 
        attack: 55, specialAttack: 15, 
        defense: 45, specialDefense: 30, 
        maxHp: 115,
        image: "img/caballero_real.jpg", desc: "Honor y acero.",
        types: ["Acero", "Guerrero", "Humano"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 7, name: "Titan de Hielo", cost: 40, 
        power: 3, 
        attack: 70, specialAttack: 20, 
        defense: 60, specialDefense: 50, 
        maxHp: 265,
        image: "img/titan_hielo.jpg", desc: "El invierno camina.",
        types: ["Hielo", "Gigante", "Elemental"], 
        abilities: [...BASE_ABILITIES]
    },
    { 
        id: 8, name: "Fénix", cost: 45, 
        power: 3, 
        attack: 40, specialAttack: 70, 
        defense: 30, specialDefense: 65, 
        maxHp: 100,
        image: "img/fenix.jpg", desc: "Renace de las cenizas.",
        types: ["Fuego", "Bestia", "Volador"], 
        abilities: [
            ...BASE_ABILITIES,
            { id: 'rebirth', name: "Renacer", type: "response", cost: 25, desc: "Revive al morir." } 
        ]
    },
    { 
        id: 9, name: "Druida", cost: 30, 
        power: 1, 
        attack: 25, specialAttack: 60, 
        defense: 30, specialDefense: 70, 
        maxHp: 120,
        image: "img/druida.jpg", desc: "Fuerza de la naturaleza.",
        types: ["Naturaleza", "Soporte", "Elfo"], 
        abilities: [
            ...BASE_ABILITIES, 
            { id: 'grow', name: "Crecer", type: "preparation", cost: 8, desc: "+10 a todo." }
        ]
    },
    { 
        id: 10, name: "Golem", cost: 50, 
        power: 2, 
        attack: 80, specialAttack: 0, 
        defense: 90, specialDefense: 10, 
        maxHp: 235,
        image: "img/golem.jpg", desc: "Inamovible.",
        types: ["Tierra", "Guardián", "Constructo"], 
        abilities: [...BASE_ABILITIES]
    },
];

let combinedCards = [...CORE_CARDS];

if (typeof EXTRA_CARDS !== 'undefined') combinedCards = [...combinedCards, ...EXTRA_CARDS];
else if (typeof window.EXTRA_CARDS !== 'undefined') combinedCards = [...combinedCards, ...window.EXTRA_CARDS];

if (typeof NARRATIVE_CARDS !== 'undefined') combinedCards = [...combinedCards, ...NARRATIVE_CARDS];
else if (typeof window.NARRATIVE_CARDS !== 'undefined') combinedCards = [...combinedCards, ...window.NARRATIVE_CARDS];

if (typeof EXPANSION_CARDS !== 'undefined') combinedCards = [...combinedCards, ...EXPANSION_CARDS];
else if (typeof window.EXPANSION_CARDS !== 'undefined') combinedCards = [...combinedCards, ...window.EXPANSION_CARDS];

if (typeof DATA5_CARDS !== 'undefined') combinedCards = [...combinedCards, ...DATA5_CARDS];
else if (typeof window.DATA5_CARDS !== 'undefined') combinedCards = [...combinedCards, ...window.DATA5_CARDS];

const CARDS = combinedCards;
window.CARDS = combinedCards;
window.ALL_CARDS = combinedCards;