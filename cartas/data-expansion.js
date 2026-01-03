// --- EXPANSIÓN BASE (WAVE 1: 50 CARTAS) ---
// Guardar como: Cartas Silen/data-expansion.js

const EXPANSION_CARDS = [
    // --- TIER 1: INICIADOS (Coste 10-20) ---
    { 
        id: 100, name: "Escudero Novato", cost: 10, 
        power: 0, strength: 20, intelligence: 5, maxHp: 150, 
        image: "img/escudero.jpg", desc: "Su entusiasmo supera su habilidad.",
        types: ["Físico", "Guardián", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 101, name: "Diablillo Ígneo", cost: 10, 
        power: 1, strength: 25, intelligence: 15, maxHp: 100, 
        image: "img/imp.jpg", desc: "Pequeño, rojo y molesto.",
        types: ["Fuego", "Conjurador", "Demonio"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 102, name: "Espora Tóxica", cost: 10, 
        power: 0, strength: 10, intelligence: 10, maxHp: 100, 
        image: "img/espora.jpg", desc: "Flota peligrosamente.",
        types: ["Naturaleza", "Asesino", "Planta"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 103, name: "Rata de Alcantarilla", cost: 10, 
        power: 1, strength: 15, intelligence: 5, maxHp: 120, 
        image: "img/rata.jpg", desc: "Plaga urbana.",
        types: ["Físico", "Explorador", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 104, name: "Autómata Oxidado", cost: 15, 
        power: 0, strength: 30, intelligence: 0, maxHp: 200, 
        image: "img/automata.jpg", desc: "Aún funciona... creo.",
        types: ["Metal", "Guardián", "Constructo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 105, name: "Aprendiz de Mago", cost: 15, 
        power: 1, strength: 10, intelligence: 40, maxHp: 140, 
        image: "img/aprendiz.jpg", desc: "Estudia las artes arcanas.",
        types: ["Arcano", "Conjurador", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 106, name: "Lobo Gris", cost: 20, 
        power: 1, strength: 35, intelligence: 10, maxHp: 180, 
        image: "img/lobo.jpg", desc: "Cazador en manada.",
        types: ["Naturaleza", "Guerrero", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 107, name: "Esqueleto Arquero", cost: 20, 
        power: 2, strength: 25, intelligence: 20, maxHp: 160, 
        image: "img/esqueleto_arco.jpg", desc: "Puntería desde la tumba.",
        types: ["Físico", "Tirador", "No-Muerto"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 108, name: "Hada del Bosque", cost: 20, 
        power: 0, strength: 10, intelligence: 50, maxHp: 150, 
        image: "img/hada.jpg", desc: "Protectora menuda.",
        types: ["Naturaleza", "Soporte", "Hada"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'meditate', name: "Curar", type: "preparation", cost: 10, desc: "Cura 50 HP." }]
    },
    { 
        id: 109, name: "Mercenario", cost: 20, 
        power: 1, strength: 40, intelligence: 15, maxHp: 220, 
        image: "img/mercenario.jpg", desc: "Leal al oro.",
        types: ["Físico", "Guerrero", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },

    // --- TIER 2: VETERANOS (Coste 25-40) ---
    { 
        id: 110, name: "Guardia Real", cost: 30, 
        power: 1, strength: 50, intelligence: 10, maxHp: 400, 
        image: "img/guardia.jpg", desc: "La defensa del reino.",
        types: ["Metal", "Guardián", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 111, name: "Asesina Drow", cost: 30, 
        power: 2, strength: 45, intelligence: 35, maxHp: 250, 
        image: "img/drow.jpg", desc: "Silenciosa y letal.",
        types: ["Oscuridad", "Asesino", "Elfo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 112, name: "Mago de Fuego", cost: 35, 
        power: 2, strength: 30, intelligence: 70, maxHp: 200, 
        image: "img/mago_fuego.jpg", desc: "Piromante experto.",
        types: ["Fuego", "Conjurador", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'breath', name: "Bola de Fuego", type: "interaction", cost: 20, desc: "Daño a distancia." }]
    },
    { 
        id: 113, name: "Oso de Guerra", cost: 35, 
        power: 2, strength: 60, intelligence: 5, maxHp: 500, 
        image: "img/oso_guerra.jpg", desc: "Fuerza de la naturaleza.",
        types: ["Naturaleza", "Guerrero", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 114, name: "Fantasma", cost: 30, 
        power: 1, strength: 30, intelligence: 50, maxHp: 250, 
        image: "img/fantasma.jpg", desc: "Intangible terror.",
        types: ["Oscuridad", "Incorpóreo", "Espíritu"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 115, name: "Torreta Autonoma", cost: 40, 
        power: 3, strength: 55, intelligence: 20, maxHp: 300, 
        image: "img/torreta.jpg", desc: "Defensa automatizada.",
        types: ["Metal", "Estructura", "Máquina"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 116, name: "Guerrero Orco", cost: 30, 
        power: 2, strength: 55, intelligence: 5, maxHp: 350, 
        image: "img/orco.jpg", desc: "Furia en combate.",
        types: ["Físico", "Guerrero", "Orco"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 117, name: "Sacerdote Solar", cost: 40, 
        power: 1, strength: 30, intelligence: 65, maxHp: 280, 
        image: "img/sacerdote.jpg", desc: "Adorador del sol.",
        types: ["Luz", "Soporte", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'meditate', name: "Luz Sanadora", type: "preparation", cost: 15, desc: "Cura 50 HP." }]
    },
    { 
        id: 118, name: "Gárgola", cost: 35, 
        power: 1, strength: 45, intelligence: 20, maxHp: 450, 
        image: "img/gargola.jpg", desc: "Piedra viviente.",
        types: ["Tierra", "Guardián", "Constructo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 119, name: "Ninja de las Sombras", cost: 40, 
        power: 3, strength: 50, intelligence: 40, maxHp: 220, 
        image: "img/ninja_sombra.jpg", desc: "Nadie lo ve llegar.",
        types: ["Oscuridad", "Asesino", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },

    // --- TIER 3: ELITE (Coste 45-65) ---
    { 
        id: 120, name: "Comandante Táctico", cost: 50, 
        power: 2, strength: 60, intelligence: 50, maxHp: 500, 
        image: "img/comandante.jpg", desc: "Lidera con el ejemplo.",
        types: ["Físico", "Líder", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'grow', name: "Estrategia", type: "preparation", cost: 20, desc: "+10 Stats." }]
    },
    { 
        id: 121, name: "Elemental de Roca", cost: 55, 
        power: 2, strength: 80, intelligence: 10, maxHp: 700, 
        image: "img/elemental_roca.jpg", desc: "Montaña caminante.",
        types: ["Tierra", "Guardián", "Elemental"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 122, name: "Bruja del Pantano", cost: 50, 
        power: 2, strength: 30, intelligence: 85, maxHp: 300, 
        image: "img/bruja.jpg", desc: "Pociones letales.",
        types: ["Naturaleza", "Conjurador", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'breath', name: "Veneno", type: "interaction", cost: 25, desc: "Daño mágico." }]
    },
    { 
        id: 123, name: "Ciber-Samurai", cost: 60, 
        power: 3, strength: 75, intelligence: 40, maxHp: 450, 
        image: "img/ciber_samurai.jpg", desc: "Honor y acero cromado.",
        types: ["Metal", "Guerrero", "Cyborg"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'energy_blade', name: "Corte Láser", type: "interaction", cost: 20, desc: "Daño puro." }]
    },
    { 
        id: 124, name: "Vampiro Noble", cost: 60, 
        power: 2, strength: 55, intelligence: 60, maxHp: 400, 
        image: "img/vampiro_noble.jpg", desc: "Sed eterna.",
        types: ["Oscuridad", "Líder", "No-Muerto"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'vampiric', name: "Drenar", type: "preparation", cost: 25, desc: "Roba vida." }]
    },
    { 
        id: 125, name: "Paladín Sagrado", cost: 65, 
        power: 2, strength: 70, intelligence: 40, maxHp: 600, 
        image: "img/paladin.jpg", desc: "Luz justiciera.",
        types: ["Luz", "Guardián", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'meditate', name: "Plegaria", type: "preparation", cost: 20, desc: "Cura 50 HP." }]
    },
    { 
        id: 126, name: "Francotirador", cost: 45, 
        power: 4, strength: 30, intelligence: 60, maxHp: 200, 
        image: "img/sniper.jpg", desc: "Un tiro, una baja.",
        types: ["Físico", "Tirador", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'ice_gaze', name: "Tiro Certero", type: "interaction", cost: 30, desc: "Daño preciso." }]
    },
    { 
        id: 127, name: "Kraken Menor", cost: 55, 
        power: 2, strength: 65, intelligence: 30, maxHp: 550, 
        image: "img/kraken_menor.jpg", desc: "Terror de los mares.",
        types: ["Agua", "Guardián", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 128, name: "Druida Cambiapieles", cost: 50, 
        power: 2, strength: 50, intelligence: 50, maxHp: 400, 
        image: "img/cambiapieles.jpg", desc: "Hombre y bestia.",
        types: ["Naturaleza", "Guerrero", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'grow', name: "Forma Bestia", type: "preparation", cost: 15, desc: "+Stats." }]
    },
    { 
        id: 129, name: "Tanque de Vapor", cost: 65, 
        power: 3, strength: 85, intelligence: 10, maxHp: 750, 
        image: "img/tanque_vapor.jpg", desc: "Imparable máquina de guerra.",
        types: ["Metal", "Guardián", "Máquina"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },

    // --- TIER 4: LEYENDAS (Coste 70-100) ---
    { 
        id: 130, name: "Fénix Renacido", cost: 80, 
        power: 4, strength: 70, intelligence: 80, maxHp: 500, 
        image: "img/fenix.jpg", desc: "Renace de sus cenizas.",
        types: ["Fuego", "Conjurador", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'meditate', name: "Llamas de Vida", type: "preparation", cost: 30, desc: "Cura 50 HP." }]
    },
    { 
        id: 131, name: "Titán de Hielo", cost: 90, 
        power: 4, strength: 95, intelligence: 30, maxHp: 1000, 
        image: "img/titan_hielo.jpg", desc: "Congela el mundo.",
        types: ["Hielo", "Titán", "Elemental"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'breath', name: "Ventisca", type: "interaction", cost: 40, desc: "Daño masivo." }]
    },
    { 
        id: 132, name: "Señor del Abismo", cost: 85, 
        power: 5, strength: 90, intelligence: 60, maxHp: 800, 
        image: "img/senor_abismo.jpg", desc: "Oscuridad encarnada.",
        types: ["Oscuridad", "Líder", "Demonio"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'vampiric', name: "Consumir Alma", type: "preparation", cost: 30, desc: "Roba vida." }]
    },
    { 
        id: 133, name: "Ángel Guerrero", cost: 75, 
        power: 3, strength: 75, intelligence: 75, maxHp: 650, 
        image: "img/angel_guerrero.jpg", desc: "Justicia divina.",
        types: ["Luz", "Guerrero", "Angel"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'energy_blade', name: "Espada Sacra", type: "interaction", cost: 25, desc: "Daño puro." }]
    },
    { 
        id: 134, name: "Mecha-Godzilla", cost: 100, 
        power: 5, strength: 110, intelligence: 20, maxHp: 1200, 
        image: "img/mecha_kaiju.jpg", desc: "Destructor de ciudades.",
        types: ["Metal", "Titán", "Máquina"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'maremoto', name: "Misiles", type: "interaction", cost: 50, desc: "Daño en área." }]
    },

    // --- VARIANTES EXÓTICAS (Coste variado) ---
    { 
        id: 135, name: "Cubo de Gelatina", cost: 25, 
        power: 1, strength: 20, intelligence: 20, maxHp: 600, 
        image: "img/cubo.jpg", desc: "Absorbe todo.",
        types: ["Ácido", "Estructura", "Limo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 136, name: "Guerrero Espejismo", cost: 35, 
        power: 2, strength: 40, intelligence: 40, maxHp: 200, 
        image: "img/espejismo.jpg", desc: "¿Es real?",
        types: ["Arcano", "Guerrero", "Ilusión"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 137, name: "Berserker", cost: 40, 
        power: 3, strength: 70, intelligence: 0, maxHp: 250, 
        image: "img/berserker.jpg", desc: "Ataca sin pensar.",
        types: ["Físico", "Guerrero", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 138, name: "Mímico", cost: 30, 
        power: 2, strength: 50, intelligence: 30, maxHp: 300, 
        image: "img/mimico.jpg", desc: "Cuidado con el cofre.",
        types: ["Oscuridad", "Asesino", "Monstruo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 139, name: "Bardo", cost: 25, 
        power: 1, strength: 15, intelligence: 50, maxHp: 200, 
        image: "img/bardo.jpg", desc: "Música inspiradora.",
        types: ["Arcano", "Soporte", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'grow', name: "Canción", type: "preparation", cost: 15, desc: "Buff." }]
    },
    { 
        id: 140, name: "Hidra", cost: 70, 
        power: 3, strength: 65, intelligence: 20, maxHp: 800, 
        image: "img/hidra.jpg", desc: "Corta una cabeza, salen dos.",
        types: ["Agua", "Guerrero", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'meditate', name: "Regenerar", type: "preparation", cost: 20, desc: "Cura 50 HP." }]
    },
    { 
        id: 141, name: "Espectro del Vacío", cost: 55, 
        power: 2, strength: 40, intelligence: 90, maxHp: 300, 
        image: "img/vacio.jpg", desc: "No pertenece a este mundo.",
        types: ["Vacío", "Conjurador", "Horror"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'psi_pulse', name: "Horror", type: "interaction", cost: 35, desc: "Daño área." }]
    },
    { 
        id: 142, name: "Constructo de Cristal", cost: 60, 
        power: 2, strength: 50, intelligence: 50, maxHp: 600, 
        image: "img/cristal.jpg", desc: "Brillante y duro.",
        types: ["Arcano", "Guardián", "Constructo"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'energy_blade', name: "Reflejo", type: "interaction", cost: 20, desc: "Daño puro." }]
    },
    { 
        id: 143, name: "Señor de las Bestias", cost: 45, 
        power: 2, strength: 55, intelligence: 30, maxHp: 400, 
        image: "img/seniorbosque.jpg", desc: "Domina la selva.",
        types: ["Naturaleza", "Soporte", "Humano"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'swarm', name: "Llamada", type: "interaction", cost: 15, desc: "Ataque enjambre." }]
    },
    { 
        id: 144, name: "Grifo", cost: 50, 
        power: 3, strength: 60, intelligence: 30, maxHp: 450, 
        image: "img/grifo.jpg", desc: "Rey de los picos.",
        types: ["Viento", "Guerrero", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 145, name: "Nigromante Supremo", cost: 70, 
        power: 2, strength: 40, intelligence: 95, maxHp: 350, 
        image: "img/nigromante_supremo.jpg", desc: "La muerte es el principio.",
        types: ["Oscuridad", "Líder", "No-Muerto"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'vampiric', name: "Ritual", type: "preparation", cost: 20, desc: "Drena vida." }]
    },
    { 
        id: 146, name: "Centauro Guerrero", cost: 40, 
        power: 2, strength: 65, intelligence: 10, maxHp: 400, 
        image: "img/centauro.jpg", desc: "Carga imparable.",
        types: ["Físico", "Guerrero", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 147, name: "Sirena", cost: 35, 
        power: 1, strength: 20, intelligence: 70, maxHp: 250, 
        image: "img/sirena.jpg", desc: "Voz hipnótica.",
        types: ["Agua", "Conjurador", "Bestia"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'psi_pulse', name: "Canto", type: "interaction", cost: 30, desc: "Daño sónico." }]
    },
    { 
        id: 148, name: "Cíclope", cost: 60, 
        power: 2, strength: 85, intelligence: 5, maxHp: 700, 
        image: "img/ciclope.jpg", desc: "Un ojo, mucha fuerza.",
        types: ["Físico", "Guerrero", "Gigante"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }]
    },
    { 
        id: 149, name: "Dragón de Oro", cost: 100, 
        power: 5, strength: 100, intelligence: 100, maxHp: 1000, 
        image: "img/dragon_oro.jpg", desc: "El guardián definitivo.",
        types: ["Luz", "Dragón", "Divino"],
        abilities: [{ id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }, { id: 'breath', name: "Fuego Sagrado", type: "interaction", cost: 50, desc: "Daño masivo." }]
    }
];