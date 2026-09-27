/* -------------------------------------------------------------------------- */
/*                         CARTAS: SINTETICOS & CAOTICOS                      */
/* -------------------------------------------------------------------------- */

const CARDS_SINTETICOS = [
    { id: 'ciber_glitch', name: 'Anomalía Ciber', element: 'CIBER', cost: 2, type: 'ATTACK', val: 120, typeSynergy: { category: 'Sintético', bonusPerMatch: 40 }, targetScope: 'ANY_ENEMY', image: 'cartas/glitch.png', desc: '120 daño. +40 por cada carta Sintética.' },
    { id: 'synth_sonic', name: 'Onda Vibratoria', element: 'SONICO', cost: 3, type: 'ATTACK', val: 230, targetScope: 'ANY_ENEMY', image: 'cartas/tornadosgemelos.png', desc: 'Frecuencia de sonido sónica de 230 de daño.' },
    { id: 'synth_crystal', name: 'Prisma Refractario', element: 'CRISTAL', cost: 3, type: 'DEFENSE', val: 220, targetScope: 'ANY_SELF', image: 'cartas/escudopiedra.png', desc: 'Estructura geométrica que otorga 220 de escudo.' },
    { id: 'synth_glitch', name: 'Error Estructural', element: 'GLITCH', cost: 2, type: 'ATTACK', val: 150, statusEffect: 'DELIRIUM', statusVal: 1, statusDuration: 1, targetScope: 'ANY_ENEMY', image: 'cartas/glitch.png', desc: 'Fallo de la realidad que inflige 150 de daño.' },
    { id: 'synth_chaos', name: 'Disruptor Caótico', element: 'CAOS', cost: 4, type: 'ATTACK', val: 280, targetScope: 'ANY_ENEMY', image: 'cartas/meteoritoigneo.png', desc: 'Energía pura e impredecible de 280 de daño.' },
    { id: 'synth_inertia', name: 'Conservación de Impulso', element: 'INERCIA', cost: 2, type: 'BOOST', val: 1.7, targetScope: 'SELF_HERO', image: 'cartas/vientoceleris.png', desc: 'Conserva el movimiento con +70% de ataque.' },
    { id: 'synth_polymer', name: 'Materia Maleable', element: 'POLIMERO', cost: 2, type: 'DEFENSE', val: 190, targetScope: 'ANY_SELF', image: 'cartas/burbujaagua.png', desc: 'Barrera plástica sintética de 190 de escudo.' },
    { id: 'synth_cloud', name: 'Gas Opaco', element: 'NUBE', cost: 1, type: 'ATTACK', val: 100, statusEffect: 'DELIRIUM', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/radiacion.png', desc: 'Densidad volátil que distorsiona la visión (100 daño).' }
];