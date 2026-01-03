// --- PAQUETE DE PERSONAJES NARRATIVOS (DATA 3) ---
// Guardar como: Cartas Silen/data3.js

const NARRATIVE_CARDS = [
    { 
        id: 20, name: "Arandela", cost: 35, 
        power: 2, 
        strength: 55,   
        intelligence: 60, 
        maxHp: 300,
        image: "img/arandela.jpg", 
        desc: "Capitana audaz de la Bananonave Blackj.",
        types: ["Metal", "Artífice", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'barrier', name: "Barrera Psiónica", type: "response", cost: 15, desc: "Bloquea y cura 20 HP." }
        ]
    },
    { 
        id: 21, name: "Kaelen", cost: 45, 
        power: 3, 
        strength: 70,   
        intelligence: 40, 
        maxHp: 500,
        image: "img/kaelen.jpg", 
        desc: "Líder de la Unidad de Recuperación.",
        types: ["Hielo", "Guerrero", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'ice_gaze', name: "Mirada Gélida", type: "interaction", cost: 25, desc: "Ataque preciso de 40 daño." }
        ]
    },
    { 
        id: 22, name: "Agente Enmascarado", cost: 40, 
        power: 2, 
        strength: 60,   
        intelligence: 50, 
        maxHp: 350,
        image: "img/enmascarado.jpg", 
        desc: "El Buscador del Orbe de Silencio.",
        types: ["Oscuridad", "Asesino", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'energy_blade', name: "Hoja Púrpura", type: "interaction", cost: 20, desc: "Daño directo ignorando defensa." }
        ]
    },
    { 
        id: 23, name: "El Leviatán", cost: 90, 
        power: 5,       
        strength: 110,  
        intelligence: 60, 
        maxHp: 1000,
        image: "img/leviatan2.jpg", 
        desc: "Entidad colosal biomecánica.",
        types: ["Vacío", "Titán", "Máquina"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'psi_pulse', name: "Pulso Psiónico", type: "interaction", cost: 40, desc: "Daña a todos (Simulado)." }
        ]
    },
    { 
        id: 24, name: "El Antiguo", cost: 55, 
        power: 1, 
        strength: 40, 
        intelligence: 90, 
        maxHp: 400,
        image: "img/antiguo.jpg", 
        desc: "Torrentes de emociones crudas.",
        types: ["Sangre", "Conjurador", "Horror"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'vampiric', name: "Eco Vampírico", type: "preparation", cost: 30, desc: "Roba 50 HP al activarse." }
        ]
    },
    { 
        id: 25, name: "Insecto Metálico", cost: 15, 
        power: 0,       
        strength: 20, 
        intelligence: 10, 
        maxHp: 120,
        image: "img/insecto.jpg", 
        desc: "Guardián del enjambre.",
        types: ["Metal", "Guardián", "Insecto"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'swarm', name: "Enjambre", type: "interaction", cost: 10, desc: "+10 Daño si hay aliados." }
        ]
    },
    { 
        id: 26, name: "Dron Luminara", cost: 25, 
        power: 1, 
        strength: 30, 
        intelligence: 55, 
        maxHp: 180,
        image: "img/dron.jpg", 
        desc: "Tecnología avanzada fragmentada.",
        types: ["Luz", "Soporte", "Máquina"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'fragment', name: "Fragmentación", type: "response", cost: 5, desc: "Evita daño letal una vez." }
        ]
    }
];