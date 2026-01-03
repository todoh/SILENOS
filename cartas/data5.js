// --- PAQUETE DE PRUEBAS DE SINERGIA (DATA 5) ---
// Guardar como: Cartas Silen/data5.js

// Estas cartas están diseñadas para probar las mecánicas de:
// - Curación de aliados (holy_heal)
// - Bufos de aliados (battle_cry)
// - Sinergias tribales (pack_strike, fire_resonance, swarm)
// IDs reservados: 200 - 240

// USAMOS window.DATA5_CARDS PARA ASEGURAR QUE SEA GLOBAL Y VISIBLE EN data.js
window.DATA5_CARDS = [
    // --- BESTIAS (Sinergia de Manada - Requiere 'pack_strike' en actions-abilities.js) ---
    { 
        id: 201, name: "Lobo Alfa", cost: 20, 
        power: 1, strength: 25, intelligence: 5, maxHp: 150, 
        image: "img/lobo.jpg", desc: "Lidera la manada.", 
        types: ["Bestia", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'pack_strike', name: "Aullido", type: "interaction", cost: 10, desc: "Daña +10 por cada otra Bestia." }
        ] 
    },
    { 
        id: 202, name: "Huargo", cost: 15, 
        power: 1, strength: 20, intelligence: 2, maxHp: 120, 
        image: "img/wargo.jpg", desc: "Cazador feroz.", 
        types: ["Bestia", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 203, name: "Hiena", cost: 10, 
        power: 1, strength: 15, intelligence: 5, maxHp: 100, 
        image: "img/hyena.jpg", desc: "Carroñero.", 
        types: ["Bestia", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 204, name: "Oso Joven", cost: 25, 
        power: 2, strength: 40, intelligence: 0, maxHp: 250, 
        image: "img/oso.jpg", desc: "Fuerza bruta.", 
        types: ["Bestia", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'heavy_smash', name: "Aplastar", type: "interaction", cost: 15, desc: "Daño = 150% de STR." }
        ] 
    },
    
    // --- CLÉRIGOS Y SOPORTE (Curación y Bufos - Requiere 'holy_heal'/'battle_cry') ---
    { 
        id: 205, name: "Novicia", cost: 15, 
        power: 0, strength: 5, intelligence: 20, maxHp: 80, 
        image: "img/novicia.jpg", desc: "Luz guía.", 
        types: ["Humano", "Clerigo", "Luz"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'holy_heal', name: "Sanar", type: "interaction", cost: 15, desc: "Cura 50 HP a aliado." }
        ] 
    },
    { 
        id: 206, name: "Clérigo de Batalla", cost: 30, 
        power: 1, strength: 25, intelligence: 25, maxHp: 200, 
        image: "img/clerigo.jpg", desc: "Protege y sirve.", 
        types: ["Humano", "Clerigo", "Luz"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'battle_cry', name: "Bendición", type: "interaction", cost: 20, desc: "+20 STR a aliado." }
        ] 
    },
    { 
        id: 207, name: "Bardo", cost: 20, 
        power: 0, strength: 10, intelligence: 30, maxHp: 100, 
        image: "img/bardo.jpg", desc: "Música inspiradora.", 
        types: ["Humano", "Soporte"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'battle_cry', name: "Canción", type: "interaction", cost: 10, desc: "+20 STR a aliado." }
        ] 
    },
    { 
        id: 208, name: "Druida Aprendiz", cost: 25, 
        power: 1, strength: 15, intelligence: 35, maxHp: 150, 
        image: "img/druida_aprendiz.jpg", desc: "Amigo del bosque.", 
        types: ["Elfo", "Soporte", "Naturaleza"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'holy_heal', name: "Rebrote", type: "interaction", cost: 15, desc: "Cura 50 HP." }
        ] 
    },

    // --- ELEMENTALES (Resonancia - Requiere 'fire_resonance') ---
    { 
        id: 209, name: "Chispa", cost: 10, 
        power: 1, strength: 5, intelligence: 15, maxHp: 50, 
        image: "img/chispa.jpg", desc: "Pequeña llama.", 
        types: ["Elemental", "Fuego"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 210, name: "Espíritu Ígneo", cost: 20, 
        power: 2, strength: 10, intelligence: 40, maxHp: 100, 
        image: "img/espiritu_fuego.jpg", desc: "Arde intensamente.", 
        types: ["Elemental", "Fuego"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'fire_resonance', name: "Explosión", type: "interaction", cost: 15, desc: "Daño extra si hay más Fuego." }
        ] 
    },
    { 
        id: 211, name: "Gota de Agua", cost: 10, 
        power: 0, strength: 5, intelligence: 10, maxHp: 100, 
        image: "img/agua.jpg", desc: "Húmedo.", 
        types: ["Elemental", "Agua"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 212, name: "Mago de Hielo", cost: 30, 
        power: 1, strength: 10, intelligence: 50, maxHp: 120, 
        image: "img/mago_hielo.jpg", desc: "Corazón frío.", 
        types: ["Humano", "Hielo"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'ice_gaze', name: "Congelar", type: "interaction", cost: 20, desc: "40 Daño directo." }
        ] 
    },

    // --- GUERREROS Y TANQUES (Auto-bufos y Stats) ---
    { 
        id: 213, name: "Recluta", cost: 10, 
        power: 1, strength: 15, intelligence: 0, maxHp: 100, 
        image: "img/recluta.jpg", desc: "Primer día.", 
        types: ["Humano", "Guerrero"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 214, name: "Escudero", cost: 15, 
        power: 0, strength: 10, intelligence: 5, maxHp: 200, 
        image: "img/escudero.jpg", desc: "Sube el escudo.", 
        types: ["Humano", "Tanque"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'stone_form', name: "Cubrirse", type: "preparation", cost: 5, desc: "Recupera 100 HP." }
        ] 
    },
    { 
        id: 215, name: "Berserker", cost: 25, 
        power: 3, strength: 40, intelligence: 0, maxHp: 180, 
        image: "img/berserker.jpg", desc: "Sin control.", 
        types: ["Humano", "Guerrero"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'heavy_smash', name: "Tajo", type: "interaction", cost: 20, desc: "Golpe pesado." }
        ] 
    },
    { 
        id: 216, name: "Gólem de Barro", cost: 30, 
        power: 1, strength: 30, intelligence: 0, maxHp: 400, 
        image: "img/golem_barro.jpg", desc: "Duro como roca.", 
        types: ["Constructo", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },

    // --- NO-MUERTOS (Enjambre y Desechables - Requiere 'swarm'/'soul_drain') ---
    { 
        id: 217, name: "Esqueleto", cost: 10, 
        power: 1, strength: 10, intelligence: 0, maxHp: 60, 
        image: "img/esqueleto.jpg", desc: "Cruje.", 
        types: ["No-Muerto", "Guerrero"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 218, name: "Zombi", cost: 10, 
        power: 1, strength: 15, intelligence: 0, maxHp: 100, 
        image: "img/zombie.jpg", desc: "Cerebros...", 
        types: ["No-Muerto", "Guerrero"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 219, name: "Fantasma", cost: 20, 
        power: 0, strength: 5, intelligence: 30, maxHp: 80, 
        image: "img/fantasma.jpg", desc: "Etéreo.", 
        types: ["No-Muerto", "Espíritu"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'soul_drain', name: "Asustar", type: "interaction", cost: 15, desc: "Drena energía." }
        ] 
    },
    { 
        id: 220, name: "Nigromante Novato", cost: 25, 
        power: 1, strength: 10, intelligence: 40, maxHp: 100, 
        image: "img/nigromante_novato.jpg", desc: "Levanta huesos.", 
        types: ["Humano", "Oscuridad"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'swarm', name: "Horda", type: "interaction", cost: 15, desc: "Daño físico." }
        ] 
    },

    // --- RELLENO VARIADO (Mecánicas mixtas) ---
    { 
        id: 221, name: "Rata Gigante", cost: 5, 
        power: 1, strength: 5, intelligence: 0, maxHp: 30, 
        image: "img/rata_gigante.jpg", desc: "Plaga.", 
        types: ["Bestia"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 222, name: "Diablillo", cost: 15, 
        power: 1, strength: 15, intelligence: 15, maxHp: 80, 
        image: "img/diablillo.jpg", desc: "Travieso.", 
        types: ["Demonio", "Fuego"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 223, name: "Hada", cost: 20, 
        power: 0, strength: 5, intelligence: 40, maxHp: 50, 
        image: "img/hada.jpg", desc: "Polvo mágico.", 
        types: ["Hada", "Luz"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'holy_heal', name: "Polvo", type: "interaction", cost: 10, desc: "Cura 50." }
        ] 
    },
    { 
        id: 224, name: "Autómata", cost: 25, 
        power: 2, strength: 30, intelligence: 20, maxHp: 200, 
        image: "img/automata.jpg", desc: "Mecanismo.", 
        types: ["Constructo", "Metal"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 225, name: "Torreta", cost: 30, 
        power: 0, strength: 40, intelligence: 0, maxHp: 150, 
        image: "img/torreta.jpg", desc: "Defensa estática.", 
        types: ["Constructo", "Metal"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 226, name: "Limo Ácido", cost: 15, 
        power: 0, strength: 20, intelligence: 5, maxHp: 120, 
        image: "img/slime_acido.jpg", desc: "Corrosivo.", 
        types: ["Limo", "Acido"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 227, name: "Ninja de Viento", cost: 20, 
        power: 2, strength: 25, intelligence: 15, maxHp: 90, 
        image: "img/ninja_viento.jpg", desc: "Silencioso.", 
        types: ["Humano", "Viento"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 228, name: "Mago de Batalla", cost: 25, 
        power: 1, strength: 20, intelligence: 20, maxHp: 150, 
        image: "img/mago_batalla.jpg", desc: "Espada y hechizo.", 
        types: ["Humano", "Mago"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'charge_up', name: "Cargar", type: "preparation", cost: 10, desc: "Int -> Str." }
        ] 
    },
    { 
        id: 229, name: "Cubo Gelatinoso", cost: 30, 
        power: 1, strength: 35, intelligence: 0, maxHp: 300, 
        image: "img/cubo.jpg", desc: "Absorbe todo.", 
        types: ["Limo", "Soporte"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 230, name: "Espectro", cost: 25, 
        power: 1, strength: 10, intelligence: 45, maxHp: 100, 
        image: "img/espectro.jpg", desc: "Miedo puro.", 
        types: ["Espíritu", "Oscuridad"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 231, name: "Grifo Joven", cost: 35, 
        power: 2, strength: 40, intelligence: 20, maxHp: 250, 
        image: "img/grifo.jpg", desc: "Noble bestia.", 
        types: ["Bestia", "Viento"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 232, name: "Sirena", cost: 20, 
        power: 0, strength: 10, intelligence: 35, maxHp: 120, 
        image: "img/sirena.jpg", desc: "Canto letal.", 
        types: ["Agua", "Mago"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 233, name: "Trant", cost: 30, 
        power: 1, strength: 50, intelligence: 10, maxHp: 400, 
        image: "img/seniobosque.jpg", desc: "Árbol viviente.", 
        types: ["Planta", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 234, name: "Fénix Renacido", cost: 40, 
        power: 2, strength: 30, intelligence: 50, maxHp: 200, 
        image: "img/fenix.jpg", desc: "Fuego eterno.", 
        types: ["Bestia", "Fuego"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 235, name: "Yeti", cost: 35, 
        power: 2, strength: 55, intelligence: 5, maxHp: 350, 
        image: "img/yeti.jpg", desc: "Abominable.", 
        types: ["Bestia", "Hielo"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 236, name: "Vampiro Menor", cost: 25, 
        power: 1, strength: 30, intelligence: 20, maxHp: 180, 
        image: "img/vampiro_menor.jpg", desc: "Sed de sangre.", 
        types: ["No-Muerto", "Oscuridad"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'vampiric', name: "Morder", type: "preparation", cost: 15, desc: "Recupera 50 HP." }
        ] 
    },
    { 
        id: 237, name: "Gárgola", cost: 20, 
        power: 1, strength: 25, intelligence: 5, maxHp: 200, 
        image: "img/gargola.jpg", desc: "Vigilante.", 
        types: ["Constructo", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 238, name: "Cíclope", cost: 40, 
        power: 3, strength: 70, intelligence: 0, maxHp: 400, 
        image: "img/ciclope.jpg", desc: "Un ojo.", 
        types: ["Gigante", "Tierra"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 239, name: "Hidra", cost: 45, 
        power: 3, strength: 60, intelligence: 10, maxHp: 450, 
        image: "img/hidra.jpg", desc: "Muchas cabezas.", 
        types: ["Bestia", "Agua"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." }
        ] 
    },
    { 
        id: 240, name: "Dragón de Bronce", cost: 50, 
        power: 3, strength: 80, intelligence: 40, maxHp: 600, 
        image: "img/dragon_bronce.jpg", desc: "Guardián del tiempo.", 
        types: ["Dragón", "Metal"], 
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Ataca." }, 
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea." },
            { id: 'breath', name: "Aliento", type: "interaction", cost: 25, desc: "Daña sin contacto." }
        ] 
    }
];