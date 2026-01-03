// --- PAQUETE DE PERSONAJES NARRATIVOS (DATA 3) ---
// Guardar como: Cartas Silen/data3.js

// AJUSTES: Vida reducida a ~1/3. Costes de habilidades bajados para facilitar combos.

const NARRATIVE_CARDS = [
    { 
        id: 20, name: "Arandela", cost: 35, 
        power: 2, 
        strength: 55,   
        intelligence: 60, 
        maxHp: 100, // Antes 300
        image: "img/arandela.jpg", 
        desc: "Capitana audaz de la Bananonave Blackj.",
        types: ["Metal", "Artífice", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'barrier', name: "Barrera Psiónica", type: "response", cost: 8, desc: "Bloquea y cura 20 HP." } // Coste bajado de 15 a 8
        ]
    },
    { 
        id: 21, name: "Kaelen", cost: 45, 
        power: 3, 
        strength: 70,   
        intelligence: 40, 
        maxHp: 165, // Antes 500
        image: "img/kaelen.jpg", 
        desc: "Guerrero errante de las tierras baldías.",
        types: ["Fuego", "Guerrero", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'berserk', name: "Furia", type: "preparation", cost: 10, desc: "+20 STR, -10 HP." } // Coste bajado de 20 a 10
        ]
    },
    { 
        id: 22, name: "Orco", cost: 15, 
        power: 1, 
        strength: 40,   
        intelligence: 5, 
        maxHp: 85, // Antes 250
        image: "img/orco.jpg", 
        desc: "Fuerza bruta sin control.",
        types: ["Tierra", "Guerrero", "Orco"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 23, name: "Aprendiz", cost: 10, 
        power: 1, 
        strength: 10,   
        intelligence: 30, 
        maxHp: 40, // Antes 120
        image: "img/aprendiz.jpg", 
        desc: "Aún está aprendiendo.",
        types: ["Arcano", "Mago", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 24, name: "Vampiro Noble", cost: 50, 
        power: 3,       
        strength: 60, 
        intelligence: 70, 
        maxHp: 185, // Antes 550
        image: "img/vampiro_noble.jpg", 
        desc: "La sangre es poder.",
        types: ["Oscuridad", "Mago", "No-Muerto"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'vampiric', name: "Eco Vampírico", type: "preparation", cost: 15, desc: "Roba 50 HP al activarse." } // Coste bajado de 30 a 15
        ]
    },
    { 
        id: 25, name: "Insecto Metálico", cost: 15, 
        power: 0,       
        strength: 20, 
        intelligence: 10, 
        maxHp: 40, // Antes 120
        image: "img/insecto.jpg", 
        desc: "Guardián del enjambre.",
        types: ["Metal", "Guardián", "Insecto"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'swarm', name: "Enjambre", type: "interaction", cost: 5, desc: "+10 Daño si hay aliados." } // Coste bajado de 10 a 5
        ]
    },
    { 
        id: 26, name: "Dron Luminara", cost: 25, 
        power: 1, 
        strength: 30, 
        intelligence: 55, 
        maxHp: 60, // Antes 180
        image: "img/dron.jpg", 
        desc: "Vigilancia avanzada.",
        types: ["Metal", "Artífice", "Máquina"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'scan', name: "Escanear", type: "preparation", cost: 2, desc: "Revela debilidades." } // Coste bajado de 5 a 2
        ]
    }
];