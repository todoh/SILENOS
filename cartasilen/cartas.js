/* -------------------------------------------------------------------------- */
/*                         BASE DE DATOS DE CARTAS                            */
/* -------------------------------------------------------------------------- */
const CARDS_ENTIDADES = [
    { 
        id: 'entity_golem', name: 'Gólem de Granito', element: 'EARTH', cost: 3, type: 'ENTITY', hp: 250, atk: 120, 
        positionAura: { adjacentBonusAtk: 0, adjacentBonusShield: 60 },
        targetScope: 'NONE', abilityScope: 'ANY_SELF', image: 'cartas/golem.png', 
        desc: 'Entidad (HP: 250 | ATK: 120). AURA: Concede +60 Escudo continuo a las entidades adyacentes. HABILIDAD: +120 Escudo directo.' 
    },
    { 
        id: 'entity_phoenix', name: 'Fénix Ígneo', element: 'FIRE', cost: 4, type: 'ENTITY', hp: 180, atk: 160, 
        positionAura: { adjacentBonusAtk: 40, adjacentBonusShield: 0 },
        targetScope: 'NONE', abilityScope: 'ANY_ENEMY', image: 'cartas/fenix.png', 
        desc: 'Entidad (HP: 180 | ATK: 160). AURA: Concede +40 ATK continuo a entidades adyacentes. HABILIDAD: Lanza Llama causando 100 daño.' 
    },
    { 
        id: 'entity_fairy', name: 'Hada Celestial', element: 'LIGHT', cost: 3, type: 'ENTITY', hp: 150, atk: 80, 
        positionAura: { adjacentBonusAtk: 20, adjacentBonusShield: 40 },
        targetScope: 'NONE', abilityScope: 'ANY_SELF', image: 'cartas/hada.png', 
        desc: 'Entidad (HP: 150 | ATK: 80). AURA: +20 ATK y +40 Escudo a entidades adyacentes. HABILIDAD: Cura 100 HP.' 
    },
    { 
        id: 'entity_demon', name: 'Sombra Voraz', element: 'SHADOW', cost: 4, type: 'ENTITY', hp: 200, atk: 140, 
        positionAura: { adjacentBonusAtk: 50, adjacentBonusShield: 0 },
        targetScope: 'NONE', abilityScope: 'ANY_ENEMY', image: 'cartas/sombravoraz.png', 
        desc: 'Entidad (HP: 200 | ATK: 140). AURA: Inspira a sus vecinos con +50 ATK. HABILIDAD: Roba 80 HP al objetivo.' 
    }
];

const CARDS_DATABASE = [
    ...CARDS_PSIQUICOS,
    ...CARDS_SENSORIALES,
    ...CARDS_FISICOS,
    ...CARDS_BIOLOGICOS,
    ...CARDS_ENERGETICOS,
    ...CARDS_COSMICOS,
    ...CARDS_MISTICOS,
    ...CARDS_SINTETICOS,
    ...CARDS_ENTIDADES
];

/* Default Presets (10 Cartas) */
const PRESET_BALANCED = ['fire_ball', 'fire_burn', 'water_heal', 'water_shield', 'earth_shield', 'air_strike', 'entity_golem', 'entity_phoenix', 'poison_spores', 'plant_regen'];
const PRESET_AGGRESSIVE = ['fire_ball', 'fire_burn', 'ice_freeze', 'earth_quake', 'curse_hex', 'sensory_synesthesia', 'entity_phoenix', 'entity_demon', 'ciber_glitch', 'ego_blast'];

function createInstanceCards(cardIdList) {
    return cardIdList.map(id => {
        const template = CARDS_DATABASE.find(c => c.id === id) || CARDS_DATABASE[0];
        return { ...template, uid: 'card_' + Math.random().toString(36).substring(2, 9) };
    });
}