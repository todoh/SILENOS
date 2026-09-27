/* -------------------------------------------------------------------------- */
/*                         CARTAS: COSMICOS & ESPACIO-TEMPORALES             */
/* -------------------------------------------------------------------------- */

const CARDS_COSMICOS = [
    { id: 'cosmic_time', name: 'Cronos Rebobinado', element: 'TIEMPO', cost: 3, type: 'HEAL', val: 200, targetScope: 'ANY_SELF', image: 'cartas/tiempo.png', desc: 'Retrocede el tiempo y restaura 200 HP.' },
    { id: 'cosmic_gravity', name: 'Repulsión de Masa', element: 'GRAVEDAD', cost: 4, type: 'ATTACK', val: 250, targetScope: 'ANY_ENEMY', image: 'cartas/masas.png', desc: 'Atracción gravitacional de 250 de daño.' },
    { id: 'cosmic_space', name: 'Portal Dimensional', element: 'ESPACIO', cost: 2, type: 'DEFENSE', val: 170, targetScope: 'ANY_SELF', image: 'cartas/portal.png', desc: 'Desvía el impacto concediendo 170 de escudo.' },
    { id: 'cosmic_stellar', name: 'Polvo de Estrellas', element: 'ESTELAR', cost: 3, type: 'ATTACK', val: 220, targetScope: 'ANY_ENEMY', image: 'cartas/polvo.png', desc: 'Energía cósmica densa de 220 de daño.' },
    { id: 'cosmic_singularity', name: 'Punto de Colapso', element: 'SINGULARIDAD', cost: 6, type: 'ATTACK', val: 420, targetScope: 'ANY_ENEMY', image: 'cartas/singularidad.png', desc: 'Densidad infinita que causa 420 de daño.' },
    { id: 'cosmic_darkmatter', name: 'Impacto Invisible', element: 'MATERIA_OSCURA', cost: 4, type: 'ATTACK', val: 240, targetScope: 'ANY_ENEMY', image: 'cartas/materiaoscura.png', desc: 'Sustancia cósmica invisible de 240 de daño.' },
    { id: 'cosmic_plasma', name: 'Gas Ionizado', element: 'PLASMA', cost: 4, type: 'ATTACK', val: 270, targetScope: 'ANY_ENEMY', image: 'cartas/ion.png', desc: 'Fuego ionizado a ultra alta temperatura (270 daño).' },
    { id: 'cosmic_dust', name: 'Erosión Cósmica', element: 'POLVO', cost: 1, type: 'ATTACK', val: 120, targetScope: 'ANY_ENEMY', image: 'cartas/radiacion.png', desc: 'Partículas en suspensión: 120 de daño.' }
];