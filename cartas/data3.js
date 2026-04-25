// --- PAQUETE DE PERSONAJES NARRATIVOS (DATA 3) ---
// Guardar como: Cartas Silen/data3.js

// AJUSTES: Atributos desglosados para combate experto.

const NARRATIVE_CARDS = [
    { 
        id: 20, name: "Arandela", cost: 35, 
        power: 2, 
        attack: 45,   
        specialAttack: 60, 
        defense: 40,
        specialDefense: 50,
        maxHp: 100, 
        image: "img/arandela.jpg", 
        desc: "Capitana audaz de la Bananonave Blackj.",
        types: ["Metal", "Artífice", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'barrier', name: "Barrera Psiónica", type: "response", cost: 8, desc: "Bloquea y cura 20 HP." } 
        ]
    },
    { 
        id: 21, name: "Kaelen", cost: 45, 
        power: 3, 
        attack: 75,   
        specialAttack: 20,
        defense: 55,
        specialDefense: 35, 
        maxHp: 165, 
        image: "img/kaelen.jpg", 
        desc: "Guerrero errante de las tierras baldías.",
        types: ["Fuego", "Guerrero", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'berserk', name: "Furia", type: "preparation", cost: 10, desc: "+20 ATK, -10 HP." } 
        ]
    },
    { 
        id: 22, name: "Orco", cost: 15, 
        power: 1, 
        attack: 45,   
        specialAttack: 5, 
        defense: 35,
        specialDefense: 10,
        maxHp: 85, 
        image: "img/orco.jpg", 
        desc: "Fuerza bruta sin control.",
        types: ["Tierra", "Guerrero", "Orco"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 23, name: "Aprendiz", cost: 10, 
        power: 1, 
        attack: 10,   
        specialAttack: 35, 
        defense: 10,
        specialDefense: 25,
        maxHp: 40, 
        image: "img/aprendiz.jpg", 
        desc: "Aún está aprendiendo.",
        types: ["Arcano", "Mago", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 24, name: "Vampiro Noble", cost: 50, 
        power: 3,       
        attack: 55, 
        specialAttack: 70, 
        defense: 45,
        specialDefense: 60,
        maxHp: 185, 
        image: "img/vampiro_noble.jpg", 
        desc: "La sangre es poder.",
        types: ["Oscuridad", "Mago", "No-Muerto"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'vampiric', name: "Eco Vampírico", type: "preparation", cost: 15, desc: "Roba 50 HP al activarse." } 
        ]
    },
    { 
        id: 25, name: "Insecto Metálico", cost: 15, 
        power: 0,       
        attack: 25, 
        specialAttack: 5, 
        defense: 45,
        specialDefense: 15,
        maxHp: 40, 
        image: "img/insecto.jpg", 
        desc: "Guardián del enjambre.",
        types: ["Metal", "Guardián", "Insecto"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'swarm', name: "Enjambre", type: "interaction", cost: 5, desc: "+10 Daño si hay aliados." } 
        ]
    },
    { 
        id: 26, name: "Dron Luminara", cost: 25, 
        power: 1, 
        attack: 15, 
        specialAttack: 55, 
        defense: 30,
        specialDefense: 45,
        maxHp: 60, 
        image: "img/dron.jpg", 
        desc: "Vigilancia avanzada.",
        types: ["Metal", "Artífice", "Máquina"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataque físico." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'scan', name: "Escanear", type: "preparation", cost: 2, desc: "Revela debilidades." } 
        ]
    }
];