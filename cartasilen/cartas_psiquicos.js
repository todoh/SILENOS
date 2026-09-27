/* -------------------------------------------------------------------------- */
/*                         CARTAS: PSIQUICOS & MENTALES                       */
/* -------------------------------------------------------------------------- */

const CARDS_PSIQUICOS = [
    { id: 'psychic_mind', name: 'Onda Mental', element: 'MENTE', cost: 2, type: 'ATTACK', val: 140, targetScope: 'ANY_ENEMY', image: 'cartas/ondamental.png', desc: 'Lectura táctica que inflige 140 de daño psíquico.' },
    { id: 'psychic_dream', name: 'Tejido Onírico', element: 'SUENO', cost: 3, type: 'HEAL', val: 180, targetScope: 'ANY_SELF', image: 'cartas/onirico.png', desc: 'Sustancia de ensueño que restaura 180 HP.' },
    { id: 'psychic_nightmare', name: 'Terror Nocturno', element: 'PESADILLA', cost: 3, type: 'ATTACK', val: 200, statusEffect: 'CURSE', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/terrornocturno.png', desc: '200 de daño mental y causa Maldición.' },
    { id: 'psychic_psychedelia', name: 'Distorsión Sensorial', element: 'PSICODELIA', cost: 2, type: 'ATTACK', val: 100, statusEffect: 'DELIRIUM', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/sensorial.png', desc: '100 de daño y provoca Delirio.' },
    { id: 'psychic_amnesia', name: 'Niebla de Amnesia', element: 'AMNESIA', cost: 1, type: 'ATTACK', val: 60, statusEffect: 'AMNESIA', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/amnesia.png', desc: '60 daño y anula habilidades especiales por 2 turnos.' },
    { id: 'psychic_hypnosis', name: 'Sugestión Directa', element: 'HIPNOSIS', cost: 3, type: 'DRAIN', val: 160, targetScope: 'ANY_ENEMY', image: 'cartas/sugestion.png', desc: 'Control mental que drena 160 HP.' },
    { id: 'psychic_lucidity', name: 'Foco Absoluto', element: 'LUCIDEZ', cost: 2, type: 'BOOST', val: 1.5, targetScope: 'SELF_HERO', image: 'cartas/focoabsoluto.png', desc: '+50% potencia de ataque y precisión perfecta.' },
    { id: 'psychic_trauma', name: 'Cicatriz Prolongada', element: 'TRAUMA', cost: 3, type: 'ATTACK', val: 150, statusEffect: 'TRAUMA', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/cicatriz.png', desc: '150 de daño e impide ganar escudo.' }
];