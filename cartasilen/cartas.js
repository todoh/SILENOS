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
    },
    { 
        id: 'entity_arandela', name: 'Arandela Colocada', element: 'CAOS', cost: 3, type: 'ENTITY', hp: 220, atk: 110, 
        positionAura: { adjacentBonusAtk: 30, adjacentBonusShield: 30 },
        targetScope: 'NONE', abilityScope: 'ANY_SELF', image: 'cartas/arandela.png', 
        desc: 'Entidad (HP: 220 | ATK: 110). AURA: +30 ATK y +30 Escudo a entidades adyacentes. HABILIDAD: Concede +150 de escudo directo.' 
    },
    { 
        id: 'entity_mao', name: 'Mao', element: 'HIPNOSIS', cost: 4, type: 'ENTITY', hp: 200, atk: 130, 
        positionAura: { adjacentBonusAtk: 40, adjacentBonusShield: 0 },
        targetScope: 'NONE', abilityScope: 'ANY_ENEMY', image: 'cartas/mao.png', 
        desc: 'Entidad (HP: 200 | ATK: 130). AURA: +40 ATK a entidades adyacentes. HABILIDAD: Drena 120 HP e inflige Amnesia (2 turnos).' 
    },
    { 
        id: 'entity_lazarillo', name: 'Lazarillo', element: 'LUCIDEZ', cost: 2, type: 'ENTITY', hp: 160, atk: 70, 
        positionAura: { adjacentBonusAtk: 0, adjacentBonusShield: 40 },
        targetScope: 'NONE', abilityScope: 'ANY_SELF', image: 'cartas/lazarillo.png', 
        desc: 'Entidad (HP: 160 | ATK: 70). AURA: +40 Escudo a entidades adyacentes. HABILIDAD: Cura 140 HP y otorga Regeneración.' 
    },
    { 
        id: 'entity_chupitopo', name: 'Chupitopo', element: 'DELIRIO', cost: 3, type: 'ENTITY', hp: 190, atk: 100, 
        positionAura: { adjacentBonusAtk: 25, adjacentBonusShield: 25 },
        targetScope: 'NONE', abilityScope: 'ANY_ENEMY', image: 'cartas/chupitopo.png', 
        desc: 'Entidad (HP: 190 | ATK: 100). AURA: +25 ATK y +25 Escudo adyacente. HABILIDAD: Ataca con 110 de daño e inflige Delirio.' 
    }
];

const CARDS_ESPECIALES = [
    { id: 'special_blackjack', name: 'La Black J', element: 'CAOS', cost: 5, type: 'ATTACK', val: 210, typeSynergy: { sameCategoryCount: true, bonusPerMatch: 40 }, targetScope: 'ANY_ENEMY', image: 'cartas/blackj.png', desc: 'Jugada del 21: inflige 210 de daño. +40 adicional por cada carta o entidad Sintética/Caótica.' }
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
    ...CARDS_ENTIDADES,
    ...CARDS_ESPECIALES
];

/* Presets Actualizados con las Entidades */
const PRESET_BALANCED = ['fire_ball', 'fire_burn', 'water_heal', 'water_shield', 'earth_shield', 'air_strike', 'entity_golem', 'entity_arandela', 'entity_lazarillo', 'entity_chupitopo'];
const PRESET_AGGRESSIVE = ['fire_ball', 'fire_burn', 'ice_freeze', 'earth_quake', 'curse_hex', 'special_blackjack', 'entity_phoenix', 'entity_demon', 'entity_mao', 'ego_blast'];

function createInstanceCards(cardIdList) {
    return cardIdList.map(id => {
        const template = CARDS_DATABASE.find(c => c.id === id) || CARDS_DATABASE[0];
        return { ...template, uid: 'card_' + Math.random().toString(36).substring(2, 9) };
    });
}