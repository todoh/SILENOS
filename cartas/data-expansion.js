// --- EXPANSIÓN BASE (WAVE 1: 50 CARTAS) ---
// Guardar como: Cartas Silen/data-expansion.js

// AJUSTES: Vida drásticamente reducida (facilitar muertes). Costes de habilidades reducidos.

const EXPANSION_CARDS = [
    // --- TIER 1: INICIADOS (Coste 10-20) ---
    { 
        id: 100, name: "Escudero Novato", cost: 10, 
        power: 0, strength: 20, intelligence: 5, maxHp: 50, // Antes 150
        image: "img/escudero.jpg", desc: "Su entusiasmo supera su habilidad.",
        types: ["Físico", "Guardián", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 101, name: "Diablillo Ígneo", cost: 10, 
        power: 1, strength: 25, intelligence: 15, maxHp: 35, // Antes 100
        image: "img/imp.jpg", desc: "Pequeño, rojo y molesto.",
        types: ["Fuego", "Conjurador", "Demonio"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 102, name: "Rata de Alcantarilla", cost: 10, 
        power: 1, strength: 15, intelligence: 5, maxHp: 25, // Antes 80
        image: "img/rata.jpg", desc: "Portadora de plagas.",
        types: ["Veneno", "Bestia", "Alimaña"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 103, name: "Espora Flotante", cost: 10, 
        power: 0, strength: 5, intelligence: 20, maxHp: 20, // Antes 60
        image: "img/espora.jpg", desc: "Explota al contacto.",
        types: ["Naturaleza", "Trampa", "Planta"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 104, name: "Slime Básico", cost: 15, 
        power: 1, strength: 20, intelligence: 5, maxHp: 65, // Antes 200
        image: "img/slime.jpg", desc: "Gelatinoso y pegajoso.",
        types: ["Agua", "Tanque", "Limo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    
    // --- TIER 2: SOLDADOS Y AVENTUREROS (Coste 20-35) ---
    { 
        id: 110, name: "Guardia de la Ciudad", cost: 20, 
        power: 1, strength: 40, intelligence: 10, maxHp: 85, // Antes 250
        image: "img/guardia.jpg", desc: "Protege la ley.",
        types: ["Físico", "Guardián", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 111, name: "Mercenario", cost: 25, 
        power: 2, strength: 50, intelligence: 15, maxHp: 90, // Antes 280
        image: "img/mercenario.jpg", desc: "Lucha por oro.",
        types: ["Físico", "Guerrero", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 112, name: "Arquero Esqueleto", cost: 20, 
        power: 2, strength: 35, intelligence: 5, maxHp: 40, // Antes 120
        image: "img/esqueleto_arco.jpg", desc: "Puntería desde la tumba.",
        types: ["Físico", "Tirador", "No-Muerto"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 113, name: "Mago Arcano", cost: 30, 
        power: 2, strength: 10, intelligence: 65, maxHp: 50, // Antes 160
        image: "img/mago_arcano.jpg", desc: "Estudioso de lo oculto.",
        types: ["Arcano", "Mago", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'fireball', name: "Rayo Arcano", type: "interaction", cost: 12, desc: "Daño mágico." }] // Coste bajado
    },
    { 
        id: 114, name: "Bardo", cost: 25, 
        power: 1, strength: 20, intelligence: 45, maxHp: 60, // Antes 180
        image: "img/bardo.jpg", desc: "Música inspiradora.",
        types: ["Sonido", "Soporte", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'heal', name: "Melodía", type: "preparation", cost: 8, desc: "Cura aliados." }] // Coste bajado
    },

    // --- TIER 3: ELITES Y MONSTRUOS (Coste 35-50) ---
    { 
        id: 120, name: "Berserker", cost: 35, 
        power: 3, strength: 75, intelligence: 5, maxHp: 115, // Antes 350
        image: "img/berserker.jpg", desc: "Ira incontrolable.",
        types: ["Físico", "Guerrero", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'berserk', name: "Furia", type: "preparation", cost: 8, desc: "Sacrifica HP por daño." }] // Coste bajado
    },
    { 
        id: 121, name: "Grifo Real", cost: 45, 
        power: 3, strength: 60, intelligence: 30, maxHp: 150, // Antes 450
        image: "img/grifo.jpg", desc: "Majestad alada.",
        types: ["Viento", "Bestia", "Volador"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 122, name: "Nigromante", cost: 40, 
        power: 2, strength: 20, intelligence: 70, maxHp: 75, // Antes 220
        image: "img/nigromante.jpg", desc: "Levanta a los muertos.",
        types: ["Oscuridad", "Invocador", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'rebirth', name: "Alzar", type: "response", cost: 20, desc: "Revive unidad." }] // Coste bajado
    },
    { 
        id: 123, name: "Tanque a Vapor", cost: 50, 
        power: 3, strength: 80, intelligence: 10, maxHp: 200, // Antes 600
        image: "img/tanque_vapor.jpg", desc: "Tecnología enana.",
        types: ["Metal", "Tanque", "Máquina"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 124, name: "Asesino Sombrío", cost: 40, 
        power: 3, strength: 55, intelligence: 40, maxHp: 65, // Antes 200
        image: "img/asesino.jpg", desc: "Golpea desde las sombras.",
        types: ["Oscuridad", "Asesino", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },

    // --- TIER 4: LEYENDAS Y COLOSOS (Coste 50+) ---
    { 
        id: 130, name: "Dragón de Oro", cost: 80, 
        power: 5, strength: 90, intelligence: 80, maxHp: 330, // Antes 1000
        image: "img/dragon_oro.jpg", desc: "Poder ancestral.",
        types: ["Fuego", "Dragón", "Volador"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'fireball', name: "Aliento", type: "interaction", cost: 20, desc: "Quema todo." }] // Coste bajado
    },
    { 
        id: 131, name: "Señor del Bosque", cost: 70, 
        power: 4, strength: 85, intelligence: 60, maxHp: 300, // Antes 900
        image: "img/seniobosque.jpg", desc: "Guardián eterno.",
        types: ["Naturaleza", "Guardián", "Elemental"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'grow', name: "Raíces", type: "preparation", cost: 10, desc: "Fortalece aliados." }] // Coste bajado
    },
    { 
        id: 132, name: "Mecha-Kaiju", cost: 90, 
        power: 5, strength: 95, intelligence: 20, maxHp: 400, // Antes 1200
        image: "img/mecha_kaiju.jpg", desc: "Destructor mecánico.",
        types: ["Metal", "Coloso", "Máquina"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 133, name: "Nigromante Supremo", cost: 75, 
        power: 4, strength: 30, intelligence: 90, maxHp: 165, // Antes 500
        image: "img/nigromante_supremo.jpg", desc: "La muerte obedece.",
        types: ["Oscuridad", "Líder", "No-Muerto"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'rebirth', name: "Legión", type: "response", cost: 30, desc: "Revive múltiples." }] // Coste bajado
    },
    { 
        id: 134, name: "Dragón Ancestral", cost: 100, 
        power: 6, strength: 100, intelligence: 100, maxHp: 500, // Antes 1500
        image: "img/dragon_ancestral.jpg", desc: "El primero de todos.",
        types: ["Arcano", "Dragón", "Dios"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'tidal_wave', name: "Cataclismo", type: "interaction", cost: 40, desc: "Destrucción total." }] // Coste bajado
    },

    // --- ESPECIALES Y RAROS ---
    { 
        id: 140, name: "Mímico", cost: 20, 
        power: 1, strength: 30, intelligence: 10, maxHp: 50, // Antes 150
        image: "img/mimico.jpg", desc: "¡No es un cofre!",
        types: ["Físico", "Trampa", "Monstruo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 141, name: "Fantasma", cost: 25, 
        power: 2, strength: 10, intelligence: 40, maxHp: 35, // Antes 100
        image: "img/fantasma.jpg", desc: "Intangible.",
        types: ["Espíritu", "Incorpóreo", "No-Muerto"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 142, name: "Bruja del Pantano", cost: 30, 
        power: 2, strength: 15, intelligence: 60, maxHp: 55, // Antes 160
        image: "img/bruja.jpg", desc: "Pociones y maldiciones.",
        types: ["Veneno", "Mago", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'snipe', name: "Maldición", type: "interaction", cost: 10, desc: "Daño directo." }] // Coste bajado
    },
    { 
        id: 143, name: "Automata", cost: 35, 
        power: 2, strength: 60, intelligence: 50, maxHp: 100, // Antes 300
        image: "img/automata.jpg", desc: "Programado para luchar.",
        types: ["Metal", "Guerrero", "Constructo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 144, name: "Oso de Guerra", cost: 25, 
        power: 2, strength: 55, intelligence: 5, maxHp: 110, // Antes 320
        image: "img/oso_guerra.jpg", desc: "Armadura y garras.",
        types: ["Físico", "Bestia", "Tanque"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 145, name: "Francotirador", cost: 30, 
        power: 3, strength: 40, intelligence: 20, maxHp: 50, // Antes 140
        image: "img/sniper.jpg", desc: "Un tiro, una baja.",
        types: ["Físico", "Tirador", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'snipe', name: "Disparo Preciso", type: "interaction", cost: 12, desc: "Daño a distancia." }] // Coste bajado
    },
    { 
        id: 146, name: "Paladín", cost: 40, 
        power: 2, strength: 60, intelligence: 30, maxHp: 125, // Antes 380
        image: "img/paladin.jpg", desc: "Luz y defensa.",
        types: ["Luz", "Guardián", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 147, name: "Sirena", cost: 35, 
        power: 1, strength: 20, intelligence: 70, maxHp: 85, // Antes 250
        image: "img/sirena.jpg", desc: "Voz hipnótica.",
        types: ["Agua", "Conjurador", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'psi_pulse', name: "Canto", type: "interaction", cost: 15, desc: "Daño sónico." }] // Coste bajado de 30 a 15
    },
    { 
        id: 148, name: "Cíclope", cost: 60, 
        power: 2, strength: 85, intelligence: 5, maxHp: 235, // Antes 700
        image: "img/ciclope.jpg", desc: "Un ojo, mucha fuerza.",
        types: ["Físico", "Guerrero", "Gigante"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 149, name: "Cubo Gelatinoso", cost: 20, 
        power: 1, strength: 30, intelligence: 0, maxHp: 135, // Antes 400
        image: "img/cubo.jpg", desc: "Digiere todo.",
        types: ["Ácido", "Limo", "Monstruo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    }
];