/* -------------------------------------------------------------------------- */
/*                         CARTAS: PERCEPTIVOS & SENSORIALES                  */
/* -------------------------------------------------------------------------- */

const CARDS_SENSORIALES = [
    { id: 'sensory_synesthesia', name: 'Traslape Cromático', element: 'SINESTESIA', cost: 3, type: 'ATTACK', val: 220, targetScope: 'ANY_ENEMY', image: 'cartas/cromatico.png', desc: '220 de daño mezclando frecuencias sensoriales.' },
    { id: 'sensory_trance', name: 'Estado de Absorción', element: 'TRANCE', cost: 2, type: 'DEFENSE', val: 180, targetScope: 'ANY_SELF', image: 'cartas/absorcion.png', desc: 'Concede 180 de escudo insensible al dolor.' },
    { id: 'sensory_frenzy', name: 'Furia Desinhibida', element: 'FRENESI', cost: 3, type: 'BOOST', val: 1.8, targetScope: 'SELF_HERO', image: 'cartas/frenesi.png', desc: '+80% de daño en tu próximo ataque.' },
    { id: 'sensory_vertigo', name: 'Pérdida de Centro', element: 'VERTIGO', cost: 1, type: 'ATTACK', val: 80, statusEffect: 'DELIRIUM', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/desbalance.png', desc: '80 de daño e inflige Desorientación.' },
    { id: 'delirium_fog', name: 'Delirio Sensorial', element: 'DELIRIO', cost: 2, type: 'ATTACK', val: 100, statusEffect: 'DELIRIUM', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/delirio.png', desc: '100 daño y causa Delirio (50% prob. de fallo).' },
    { id: 'sensory_ecstasy', name: 'Euforia Cegadora', element: 'EXTASIS', cost: 4, type: 'HEAL', val: 260, targetScope: 'ANY_SELF', image: 'cartas/euforia.png', desc: 'Sobrecarga de placer que restaura 260 HP.' },
    { id: 'ego_blast', name: 'Impulso del Ego', element: 'EGO', cost: 3, type: 'ATTACK', val: 180, typeSynergy: { sameCategoryCount: true, bonusPerMatch: 50 }, targetScope: 'ANY_ENEMY', image: 'cartas/impulsoego.png', desc: '180 daño. +50 por cada carta o entidad Sensorial.' },
    { id: 'sensory_catharsis', name: 'Liberación Violenta', element: 'CATARSIS', cost: 5, type: 'ATTACK', val: 360, targetScope: 'ANY_ENEMY', image: 'cartas/catarsis.png', desc: 'Descarga emocional acumulada de 360 de daño.' }
];