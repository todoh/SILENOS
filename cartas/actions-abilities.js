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

    // --- DICCIONARIO DE EJECUCIÓN (PREPARATION - Habilidades que se usan sobre uno mismo/global) ---
    executions: {
        'meditate': (card, context) => {
            return window.AbilityLibrary.utils.heal(card, 50);
        },
        'blessing': (card, context) => {
            return window.AbilityLibrary.utils.heal(card, 50);
        },
        'grow': (card, context) => {
            return window.AbilityLibrary.utils.buff(card, { strength: 10, intelligence: 10 });
        },
        'vampiric': (card, context) => {
            return window.AbilityLibrary.utils.heal(card, 50);
        },
        // Nuevas ejecuciones
        'charge_up': (card, context) => {
            // Gana fuerza basada en su inteligencia actual (conversión de maná en fuerza)
            const bonus = Math.floor(card.intelligence * 0.5);
            return window.AbilityLibrary.utils.buff(card, { strength: bonus });
        },
        'stone_form': (card, context) => {
             // Recupera vida pero quizás en el futuro reduzca velocidad (no implementado speed aún)
             return window.AbilityLibrary.utils.heal(card, 100);
        }
    },

    // --- METADATA DE INTERACCIÓN (INTERACTION - Habilidades con objetivo) ---
    interactions: {
        'breath': (card) => ({
            effectType: 'direct_damage',
            damageValue: 20, 
            abilityName: 'Aliento de Fuego'
        }),

        'ice_gaze': (card) => ({
            effectType: 'direct_damage',
            damageValue: 40,
            abilityName: 'Mirada Gélida'
        }),

        'energy_blade': (card) => ({
            effectType: 'piercing_damage',
            damageValue: 30, 
            abilityName: 'Hoja Púrpura'
        }),

        'maremoto': (card) => ({
            effectType: 'aoe_damage',
            damageValue: 15,
            abilityName: 'Maremoto'
        }),
        
        'psi_pulse': (card) => ({
            effectType: 'aoe_damage',
            damageValue: 25,
            abilityName: 'Pulso Psiónico'
        }),

        'swarm': (card) => {
            return {
                effectType: 'physical_swarm',
                damageValue: 10 + (card.strength > 20 ? 10 : 0), 
                abilityName: 'Enjambre'
            };
        },

        // --- HABILIDADES DE SINERGIA Y SOPORTE (NUEVAS) ---

        // 1. Curación a Aliado
        'holy_heal': (card) => ({
            targetScope: 'ally', 
            effectType: 'heal',
            amount: 50,
            abilityName: 'Curación Mayor'
        }),
        
        // 2. Bufo a Aliado
        'battle_cry': (card) => ({
            targetScope: 'ally',
            effectType: 'buff',
            buffStats: { strength: 20 },
            abilityName: 'Grito de Batalla'
        }),

        // 3. Sinergia: Golpe de Manada (Daño escala por número de Bestias aliadas)
        'pack_strike': (card) => {
            let allyCount = 0;
            if (window.GameLogicSynergies) {
                // Asume que la carta tiene 'Bestia' como uno de sus tipos, buscamos otros de ese tipo
                allyCount = window.GameLogicSynergies.countAlliesByType(card.ownerId, 'Bestia', card.id);
            }
            const baseDmg = 15;
            const scaling = 10 * allyCount;
            return {
                effectType: 'physical_damage',
                damageValue: baseDmg + scaling,
                abilityName: `Golpe de Manada (+${scaling})`
            };
        },

        // 4. Sinergia: Resonancia Elemental (Daño escala si hay elementales de fuego)
        'fire_resonance': (card) => {
            let bonus = 0;
            if (window.GameLogicSynergies && window.GameLogicSynergies.countAlliesByType(card.ownerId, 'Fuego', card.id) > 0) {
                bonus = 25;
            }
            return {
                effectType: 'magic_damage',
                damageValue: 20 + bonus,
                abilityName: bonus > 0 ? 'Resonancia (Activa)' : 'Resonancia (Inactiva)'
            };
        },

        // 5. Transferencia (Debuff enemigo)
        'soul_drain': (card) => ({
            effectType: 'direct_damage', // Simplificado como daño, idealmente robaría stats
            damageValue: 30,
            abilityName: 'Drenar Alma'
        }),

        // 6. Golpe Pesado (Escala con la propia fuerza)
        'heavy_smash': (card) => ({
            effectType: 'physical_damage',
            damageValue: Math.floor(card.strength * 1.5),
            abilityName: 'Golpe Pesado'
        })
    }
};