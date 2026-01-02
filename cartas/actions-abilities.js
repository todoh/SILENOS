// --- LIBRERÍA DE HABILIDADES (REGISTRO CENTRAL) ---
// Sobreescribir: Cartas Silen/actions-abilities.js

window.AbilityLibrary = {
    // --- UTILIDADES GENÉRICAS (Helpers) ---
    utils: {
        heal: (card, amount) => {
            const oldHp = card.currentHp;
            card.currentHp = Math.min(card.maxHp, card.currentHp + amount);
            const healed = card.currentHp - oldHp;
            return `recuperó ${healed} HP`;
        },
        buff: (card, stats) => {
            let log = [];
            if (stats.strength) { card.strength += stats.strength; log.push(`+${stats.strength} STR`); }
            if (stats.intelligence) { card.intelligence += stats.intelligence; log.push(`+${stats.intelligence} INT`); }
            if (stats.power) { card.power += stats.power; log.push(`+${stats.power} POW`); }
            return `ganó ${log.join(', ')}`;
        }
    },

    // --- DICCIONARIO DE EJECUCIÓN (PREPARATION) ---
    // Estas funciones se ejecutan INMEDIATAMENTE al usar la habilidad en tu turno (Self-cast)
    executions: {
        // Mago Arcano / Sacerdotisa
        'meditate': (card, context) => {
            return window.AbilityLibrary.utils.heal(card, 50);
        },
        
        // Alias para Sacerdotisa si usa ID distinto en data2
        'blessing': (card, context) => {
            return window.AbilityLibrary.utils.heal(card, 50);
        },

        // Druida / Rey Esqueleto
        'grow': (card, context) => {
            return window.AbilityLibrary.utils.buff(card, { strength: 10, intelligence: 10 });
        },

        // El Antiguo (Data3)
        'vampiric': (card, context) => {
            // Simulación de robo de vida (Self-heal potente)
            return window.AbilityLibrary.utils.heal(card, 50);
        }
    },

    // --- METADATA DE INTERACCIÓN (INTERACTION) ---
    // Define datos extra que se usan en resolveTargetedAbility cuando disparas a un enemigo
    interactions: {
        // Dragón Ancestral
        'breath': (card) => ({
            effectType: 'direct_damage',
            damageValue: 20, 
            abilityName: 'Aliento de Fuego'
        }),

        // Kaelen (Data3)
        'ice_gaze': (card) => ({
            effectType: 'direct_damage',
            damageValue: 40,
            abilityName: 'Mirada Gélida'
        }),

        // Agente Enmascarado (Data3)
        'energy_blade': (card) => ({
            effectType: 'piercing_damage',
            damageValue: 30, // Daño moderado pero consistente
            abilityName: 'Hoja Púrpura'
        }),

        // Leviatán (Data2/Data3)
        'maremoto': (card) => ({
            effectType: 'aoe_damage',
            damageValue: 15,
            abilityName: 'Maremoto'
        }),
        
        // Leviatán Alternativo (Data3)
        'psi_pulse': (card) => ({
            effectType: 'aoe_damage',
            damageValue: 25,
            abilityName: 'Pulso Psiónico'
        }),

        // Insecto Metálico (Data3) - DAÑO DINÁMICO
        'swarm': (card) => {
            // Ejemplo de lógica dinámica: Daño base 10 + 10 si tiene mucha vida o aliados
            // Nota: Para acceder a 'aliados' necesitaríamos pasar el contexto, 
            // pero por simplicidad aquí usamos stats de la propia carta.
            // Asumimos un daño base boosteado.
            return {
                effectType: 'physical_swarm',
                damageValue: 10 + (card.strength > 20 ? 10 : 0), 
                abilityName: 'Enjambre'
            };
        }
    }
};