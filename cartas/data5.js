// --- PAQUETE DE PRUEBAS DE SINERGIA (DATA 5) ---
// Guardar como: Cartas Silen/data5.js

// Estas cartas están diseñadas para probar las mecánicas de:
// - Curación de aliados (holy_heal)
// - Bufos de aliados (battle_cry)
// - Sinergias tribales (pack_strike, fire_resonance, swarm)
// IDs reservados: 200 - 240

// MODIFICADO: Vida reducida en 1/3 y costes de habilidad bajados.

// USAMOS window.DATA5_CARDS PARA ASEGURAR QUE SEA GLOBAL Y VISIBLE EN data.js
window.DATA5_CARDS = [
    // --- BESTIAS (Sinergia de Manada - Requiere 'pack_strike' en actions-abilities.js) ---
    { 
        id: 201, name: "Lobo Alfa", cost: 20, 
        power: 1, strength: 25, intelligence: 5, maxHp: 100, // Antes 150
        image: "img/lobo.jpg", desc: "Lidera la manada.", 
        types: ["Bestia", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'pack_strike', name: "Aullido", type: "interaction", cost: 5, desc: "+Daño por cada Bestia aliada." } // Coste reducido
        ] 
    },
    { 
        id: 202, name: "Oso de Guerra", cost: 30, 
        power: 2, strength: 40, intelligence: 2, maxHp: 165, // Antes 250
        image: "img/oso_guerra.jpg", desc: "Fuerza bruta.", 
        types: ["Bestia", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'roar', name: "Rugido", type: "interaction", cost: 8, desc: "Baja ataque enemigo." } // Coste reducido
        ] 
    },
    { 
        id: 203, name: "Rata de Plaga", cost: 5, 
        power: 1, strength: 10, intelligence: 2, maxHp: 40, // Antes 60
        image: "img/rata.jpg", desc: "Nunca viene sola.", 
        types: ["Bestia", "Veneno"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'swarm', name: "Enjambre", type: "passive", cost: 2, desc: "Más fuerte con otras ratas." } // Coste reducido
        ] 
    },

    // --- SAGRADOS (Sinergia de Curación/Apoyo - Requiere 'holy_heal' en actions-abilities.js) ---
    { 
        id: 204, name: "Sacerdotisa", cost: 15, 
        power: 1, strength: 5, intelligence: 25, maxHp: 65, // Antes 100
        image: "img/sacerdotisa.jpg", desc: "Luz curativa.", 
        types: ["Humano", "Sagrado"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'holy_heal', name: "Curar", type: "interaction", cost: 8, desc: "Cura a un aliado." } // Coste reducido
        ] 
    },
    { 
        id: 205, name: "Paladín", cost: 25, 
        power: 2, strength: 30, intelligence: 15, maxHp: 120, // Antes 180
        image: "img/paladin.jpg", desc: "Escudo de la fe.", 
        types: ["Humano", "Sagrado"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'shield_wall', name: "Muro Escudos", type: "interaction", cost: 10, desc: "+Defensa a todos." } // Coste reducido
        ] 
    },
    { 
        id: 206, name: "Ángel Guerrero", cost: 40, 
        power: 3, strength: 40, intelligence: 30, maxHp: 145, // Antes 220
        image: "img/angel_guerrero.jpg", desc: "Justicia alada.", 
        types: ["Ángel", "Sagrado", "Volador"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'divine_smite', name: "Castigo", type: "interaction", cost: 12, desc: "Daño masivo sagrado." } // Coste reducido
        ] 
    },

    // --- FUEGO (Sinergia de Daño Directo - Requiere 'fireball' en actions-abilities.js) ---
    { 
        id: 207, name: "Guerrero Fuego", cost: 20, 
        power: 2, strength: 35, intelligence: 5, maxHp: 90, // Antes 140
        image: "img/guerrero_fuego.jpg", desc: "Espada ardiente.", 
        types: ["Humano", "Fuego"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'flame_strike', name: "Golpe Ígneo", type: "interaction", cost: 8, desc: "Ataque de fuego." } // Coste reducido
        ] 
    },
    { 
        id: 208, name: "Mago de Fuego", cost: 25, 
        power: 2, strength: 5, intelligence: 40, maxHp: 60, // Antes 90
        image: "img/mago_fuego.jpg", desc: "Pirotecnia letal.", 
        types: ["Humano", "Fuego", "Mago"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'fireball', name: "Bola Fuego", type: "interaction", cost: 10, desc: "Daño a distancia." } // Coste reducido
        ] 
    },
    { 
        id: 209, name: "Fénix", cost: 45, 
        power: 3, strength: 30, intelligence: 30, maxHp: 105, // Antes 160
        image: "img/fenix.jpg", desc: "Renace de cenizas.", 
        types: ["Bestia", "Fuego", "Volador"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'rebirth_flame', name: "Renacer", type: "passive", cost: 15, desc: "Revive al morir (1 vez)." } // Coste reducido
        ] 
    },

    // --- MANDO (Bufos generales - Requiere 'battle_cry') ---
    { 
        id: 210, name: "Comandante", cost: 30, 
        power: 2, strength: 35, intelligence: 20, maxHp: 110, // Antes 170
        image: "img/comandante.jpg", desc: "Táctico experto.", 
        types: ["Humano", "Guerrero"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'battle_cry', name: "Grito Batalla", type: "interaction", cost: 5, desc: "+Ataque a todos." } // Coste reducido
        ] 
    },
    { 
        id: 211, name: "Escudero", cost: 10, 
        power: 1, strength: 15, intelligence: 5, maxHp: 70, // Antes 110
        image: "img/escudero.jpg", desc: "Siempre fiel.", 
        types: ["Humano", "Guerrero"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'aid', name: "Ayudar", type: "interaction", cost: 2, desc: "Pequeña cura/bufo." } // Coste reducido
        ] 
    },
    { 
        id: 212, name: "Bardo", cost: 15, 
        power: 1, strength: 10, intelligence: 20, maxHp: 65, // Antes 100
        image: "img/bardo.jpg", desc: "Música inspiradora.", 
        types: ["Humano", "Mago"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'song_courage', name: "Canción Valor", type: "interaction", cost: 5, desc: "Inmune a miedo." } // Coste reducido
        ] 
    },

    // --- NO MUERTOS (Sinergia de Plaga/Resurrección) ---
    { 
        id: 213, name: "Nigromante", cost: 25, 
        power: 2, strength: 10, intelligence: 35, maxHp: 70, // Antes 110
        image: "img/nigromante.jpg", desc: "Alza a los caídos.", 
        types: ["Humano", "Oscuridad", "Mago"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'raise_dead', name: "Alzar", type: "interaction", cost: 12, desc: "Crea esqueleto." } // Coste reducido
        ] 
    },
    { 
        id: 214, name: "Esqueleto Arco", cost: 10, 
        power: 1, strength: 15, intelligence: 0, maxHp: 45, // Antes 70
        image: "img/esqueleto_arco.jpg", desc: "Huesos frágiles.", 
        types: ["NoMuerto", "Arquero"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'bone_shot', name: "Flecha Hueso", type: "interaction", cost: 2, desc: "Daño leve." } // Coste reducido
        ] 
    },
    { 
        id: 215, name: "Rey Esqueleto", cost: 50, 
        power: 3, strength: 50, intelligence: 15, maxHp: 130, // Antes 200
        image: "img/rey_esqueleto.jpg", desc: "Monarca eterno.", 
        types: ["NoMuerto", "Guerrero", "Rey"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'army_darkness', name: "Ejército", type: "interaction", cost: 15, desc: "Invoca 2 esqueletos." } // Coste reducido
        ] 
    },

    // --- NATURALEZA ---
    { 
        id: 216, name: "Hada del Bosque", cost: 10, 
        power: 1, strength: 5, intelligence: 15, maxHp: 30, // Antes 50
        image: "img/hada.jpg", desc: "Pequeña y veloz.", 
        types: ["Hada", "Naturaleza", "Volador"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'pixie_dust', name: "Polvo Hada", type: "interaction", cost: 2, desc: "Cega enemigo." } // Coste reducido
        ] 
    },
    { 
        id: 217, name: "Señor Bosque", cost: 40, 
        power: 3, strength: 50, intelligence: 20, maxHp: 200, // Antes 300
        image: "img/seniobosque.jpg", desc: "Antiguo protector.", 
        types: ["Planta", "Naturaleza", "Gigante"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'root_tangle', name: "Raíces", type: "interaction", cost: 10, desc: "Inmoviliza enemigo." } // Coste reducido
        ] 
    },
    { 
        id: 218, name: "Druida", cost: 20, 
        power: 2, strength: 20, intelligence: 30, maxHp: 80, // Antes 120
        image: "img/druida.jpg", desc: "Cambiaformas.", 
        types: ["Humano", "Naturaleza"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'nature_growth', name: "Crecimiento", type: "interaction", cost: 7, desc: "Cura/Buff." } // Coste reducido
        ] 
    },

    // --- CONSTRUCTOS / ELEMENTALES ---
    { 
        id: 219, name: "Gólem de Piedra", cost: 35, 
        power: 2, strength: 45, intelligence: 0, maxHp: 185, // Antes 280
        image: "img/golem.jpg", desc: "Duro como roca.", 
        types: ["Constructo", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'stone_skin', name: "Piel Piedra", type: "passive", cost: 8, desc: "Reduce daño físico." } // Coste reducido
        ] 
    },
    { 
        id: 220, name: "Elemental Roca", cost: 25, 
        power: 2, strength: 35, intelligence: 5, maxHp: 100, // Antes 150
        image: "img/elemental_roca.jpg", desc: "Tierra viviente.", 
        types: ["Elemental", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'hurl_rock', name: "Lanzar Roca", type: "interaction", cost: 8, desc: "Daño a distancia." } // Coste reducido
        ] 
    },
    { 
        id: 221, name: "Cristal Viviente", cost: 15, 
        power: 1, strength: 10, intelligence: 30, maxHp: 50, // Antes 80
        image: "img/cristal.png", desc: "Brillo arcano.", 
        types: ["Elemental", "Arcano"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'refract', name: "Refracción", type: "response", cost: 5, desc: "Devuelve daño mágico." } // Coste reducido
        ] 
    },

    // --- TECNOLOGÍA / VAPOR ---
    { 
        id: 222, name: "Autómata", cost: 20, 
        power: 2, strength: 25, intelligence: 10, maxHp: 85, // Antes 130
        image: "img/automata.jpg", desc: "Engranajes.", 
        types: ["Mecánico", "Acero"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'repair', name: "Reparar", type: "interaction", cost: 5, desc: "Auto-curación." } // Coste reducido
        ] 
    },
    { 
        id: 223, name: "Torreta", cost: 15, 
        power: 1, strength: 15, intelligence: 0, maxHp: 65, // Antes 100
        image: "img/torreta.jpg", desc: "Defensa estática.", 
        types: ["Mecánico", "Estructura"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'rapid_fire', name: "Fuego Rápido", type: "interaction", cost: 8, desc: "Ataque doble." } // Coste reducido
        ] 
    },
    { 
        id: 224, name: "Tanque Vapor", cost: 40, 
        power: 3, strength: 40, intelligence: 0, maxHp: 165, // Antes 250
        image: "img/tanque_vapor.jpg", desc: "Imparable.", 
        types: ["Mecánico", "Acero", "Vehículo"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'steam_blast', name: "Chorro Vapor", type: "interaction", cost: 10, desc: "Daño área." } // Coste reducido
        ] 
    },

    // --- OTROS / CLASES VARIAS (Completando hasta el ID 240) ---
    { 
        id: 225, name: "Ninja Viento", cost: 25, 
        power: 2, strength: 30, intelligence: 15, maxHp: 60, // Antes 90
        image: "img/ninja_viento.jpg", desc: "Silencioso.", 
        types: ["Humano", "Viento", "Asesino"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'shuriken', name: "Shuriken", type: "interaction", cost: 5, desc: "Daño rápido." } // Coste reducido
        ] 
    },
    { 
        id: 226, name: "Grifo", cost: 35, 
        power: 3, strength: 35, intelligence: 10, maxHp: 90, // Antes 140
        image: "img/grifo.jpg", desc: "Rey de los cielos.", 
        types: ["Bestia", "Volador"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'wind_gust', name: "Ráfaga", type: "interaction", cost: 8, desc: "Empuja enemigos." } // Coste reducido
        ] 
    },
    { 
        id: 227, name: "Espejismo", cost: 15, 
        power: 1, strength: 5, intelligence: 30, maxHp: 40, // Antes 60
        image: "img/espejismo.jpg", desc: "¿Es real?", 
        types: ["Ilusión", "Arcano"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'confusion', name: "Confusión", type: "interaction", cost: 5, desc: "Enemigo falla ataque." } // Coste reducido
        ] 
    },
    { 
        id: 228, name: "Sirena", cost: 20, 
        power: 2, strength: 15, intelligence: 25, maxHp: 65, // Antes 100
        image: "img/sirena.jpg", desc: "Canto mortal.", 
        types: ["Bestia", "Agua"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'lullaby', name: "Nana", type: "interaction", cost: 8, desc: "Duerme enemigo." } // Coste reducido
        ] 
    },
    { 
        id: 229, name: "Kraken Menor", cost: 40, 
        power: 3, strength: 45, intelligence: 5, maxHp: 120, // Antes 180
        image: "img/kraken_menor.jpg", desc: "Terror profundo.", 
        types: ["Bestia", "Agua", "Gigante"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'tentacle_grab', name: "Agarre", type: "interaction", cost: 10, desc: "Inmoviliza." } // Coste reducido
        ] 
    },
    { 
        id: 230, name: "Leviatán", cost: 55, 
        power: 3, strength: 60, intelligence: 10, maxHp: 170, // Antes 260
        image: "img/leviatan.jpg", desc: "Monstruo marino.", 
        types: ["Bestia", "Agua", "Gigante"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'tidal_wave', name: "Maremoto", type: "interaction", cost: 15, desc: "Daño masivo a todos." } // Coste reducido
        ] 
    },
    { 
        id: 231, name: "Ladrón Sombrío", cost: 15, 
        power: 1, strength: 20, intelligence: 15, maxHp: 50, // Antes 80
        image: "img/ladron_sombrio.jpg", desc: "Roba y huye.", 
        types: ["Humano", "Ladrón"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'backstab', name: "Puñalada", type: "interaction", cost: 5, desc: "Critico por espalda." } // Coste reducido
        ] 
    },
    { 
        id: 232, name: "Vampiro Noble", cost: 30, 
        power: 2, strength: 35, intelligence: 25, maxHp: 85, // Antes 130
        image: "img/vampiro_noble.jpg", desc: "Sangre azul.", 
        types: ["NoMuerto", "Vampiro"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'life_drain', name: "Drenar Vida", type: "interaction", cost: 8, desc: "Roba vida." } // Coste reducido
        ] 
    },
    { 
        id: 233, name: "Fantasma", cost: 20, 
        power: 1, strength: 10, intelligence: 20, maxHp: 45, // Antes 70
        image: "img/fantasma.jpg", desc: "Espíritu inquieto.", 
        types: ["NoMuerto", "Espíritu"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'phase_shift', name: "Intangible", type: "response", cost: 5, desc: "Evita daño físico." } // Coste reducido
        ] 
    },
    { 
        id: 234, name: "Imp", cost: 10, 
        power: 1, strength: 10, intelligence: 10, maxHp: 30, // Antes 50
        image: "img/imp.jpg", desc: "Pequeño demonio.", 
        types: ["Demonio", "Fuego"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'fire_spit', name: "Escupir Fuego", type: "interaction", cost: 2, desc: "Daño leve fuego." } // Coste reducido
        ] 
    },
    { 
        id: 235, name: "Berserker", cost: 25, 
        power: 2, strength: 40, intelligence: 0, maxHp: 90, // Antes 140
        image: "img/berserker.jpg", desc: "Furia.", 
        types: ["Humano", "Guerrero"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 236, name: "Muro de Hielo", cost: 20, 
        power: 1, strength: 0, intelligence: 20, maxHp: 130, // Antes 200
        image: "img/muro_hielo.jpg", desc: "Barrera fría.", 
        types: ["Estructura", "Hielo"], 
        abilities: [
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 237, name: "Titán de Hielo", cost: 50, 
        power: 3, strength: 55, intelligence: 15, maxHp: 200, // Antes 300
        image: "img/titan_hielo.jpg", desc: "Gigante helado.", 
        types: ["Gigante", "Hielo"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 238, name: "Cíclope", cost: 40, 
        power: 3, strength: 70, intelligence: 0, maxHp: 265, // Antes 400
        image: "img/ciclope.jpg", desc: "Un ojo.", 
        types: ["Gigante", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 239, name: "Hidra", cost: 45, 
        power: 3, strength: 60, intelligence: 10, maxHp: 300, // Antes 450
        image: "img/hidra.jpg", desc: "Muchas cabezas.", 
        types: ["Bestia", "Agua"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 240, name: "Dragón Ancestral", cost: 60, 
        power: 3, strength: 80, intelligence: 50, maxHp: 330, // Antes 500
        image: "img/dragon_ancestral.jpg", desc: "Poder puro.", 
        types: ["Dragón", "Fuego", "Volador"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    }
];

if (typeof window !== 'undefined') {
    window.DATA5_CARDS = window.DATA5_CARDS;
}