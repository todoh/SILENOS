/* -------------------------------------------------------------------------- */
/*                         CARTAS: BIOLOGICOS & ORGANICOS                     */
/* -------------------------------------------------------------------------- */

const CARDS_BIOLOGICOS = [
    { id: 'plant_regen', name: 'Savia Regenerativa', element: 'PLANT', cost: 3, type: 'HEAL', val: 120, statusEffect: 'REGEN', statusVal: 80, statusDuration: 2, targetScope: 'ANY_SELF', image: 'cartas/sabia.png', desc: 'Cura 120 HP y otorga Regeneración (80 HP/t).' },
    { id: 'poison_spores', name: 'Esporas Venenosas', element: 'POISON', cost: 1, type: 'ATTACK', val: 50, statusEffect: 'POISON', statusVal: 60, statusDuration: 3, targetScope: 'ANY_ENEMY', image: 'cartas/esporavenenosas.png', desc: '50 daño y Veneno (60 daño/t).' },
    { id: 'bio_spore', name: 'Red Micelial', element: 'ESPORA', cost: 2, type: 'STATUS', val: 80, statusEffect: 'POISON', statusVal: 50, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/micelio.png', desc: 'Propagación de hongos con toxina micelial.' },
    { id: 'bio_blood', name: 'Drenaje Sanguíneo', element: 'SANGRE', cost: 4, type: 'DRAIN', val: 180, targetScope: 'ANY_ENEMY', image: 'cartas/drenaje.png', desc: 'Sacrificio que roba 180 HP al enemigo.' },
    { id: 'bio_bone', name: 'Armadura Ósea', element: 'HUESO', cost: 2, type: 'DEFENSE', val: 180, targetScope: 'ANY_SELF', image: 'cartas/armadurahueso.png', desc: 'Rigidez estructural que concede 180 de escudo.' },
    { id: 'bio_sap', name: 'Nutriente Celular', element: 'SAVIA', cost: 3, type: 'HEAL', val: 250, targetScope: 'ANY_SELF', image: 'cartas/nutriente.png', desc: 'Regeneración biológica de 250 HP.' },
    { id: 'bio_plague', name: 'Degradación Viral', element: 'PESTE', cost: 3, type: 'ATTACK', val: 120, statusEffect: 'POISON', statusVal: 80, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/virus.png', desc: '120 daño e Infección celular.' },
    { id: 'bio_flesh', name: 'Masa Mutante', element: 'CARNE', cost: 4, type: 'ATTACK', val: 220, targetScope: 'ANY_ENEMY', image: 'cartas/mutacioncarne.png', desc: 'Mutación viva que inflige 220 de daño.' }
];