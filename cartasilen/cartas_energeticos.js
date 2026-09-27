/* -------------------------------------------------------------------------- */
/*                         CARTAS: ENERGETICOS & RADIALES                     */
/* -------------------------------------------------------------------------- */

const CARDS_ENERGETICOS = [
    { id: 'light_boost', name: 'Resplandor Solar', element: 'LIGHT', cost: 2, type: 'BOOST', val: 1.5, targetScope: 'SELF_HERO', image: 'cartas/resplandorsolar.png', desc: 'Carga tu ataque actual X1.5.' },
    { id: 'light_blessing', name: 'Bendición Divina', element: 'LIGHT', cost: 5, type: 'HEAL', val: 400, targetScope: 'ANY_SELF', image: 'cartas/bendiciondivina.png', desc: 'Restaura 400 HP.' },
    { id: 'shadow_drain', name: 'Drenaje Sombrío', element: 'SHADOW', cost: 3, type: 'DRAIN', val: 150, targetScope: 'ANY_ENEMY', image: 'cartas/drenajesombrio.png', desc: 'Roba 150 HP al objetivo.' },
    { id: 'energy_spectrum', name: 'Banda Cromática', element: 'ESPECTRO', cost: 3, type: 'ATTACK', val: 200, targetScope: 'ANY_ENEMY', image: 'cartas/cromatica.png', desc: '200 daño por descomposición de luz.' },
    { id: 'energy_blindness', name: 'Destello Absoluto', element: 'CEGUERA', cost: 1, type: 'ATTACK', val: 80, statusEffect: 'DELIRIUM', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/resplandorsolar2.png', desc: '80 daño y Deslumbramiento cegador.' },
    { id: 'energy_aura', name: 'Proyección Vital', element: 'AURA', cost: 2, type: 'DEFENSE', val: 150, targetScope: 'ANY_SELF', image: 'cartas/proyeccion.png', desc: 'Proyección de energía que otorga 150 de escudo.' },
    { id: 'radiation_trauma', name: 'Onda de Radiación', element: 'RADIATION', cost: 3, type: 'ATTACK', val: 140, statusEffect: 'TRAUMA', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/radiacion.png', desc: '140 daño y Trauma (impide recibir escudo).' },
    { id: 'energy_ether', name: 'Flujo Etéreo', element: 'ETER', cost: 3, type: 'HEAL', val: 220, targetScope: 'ANY_SELF', image: 'cartas/eter.png', desc: 'Sustancia sutil mágicamente curativa de 220 HP.' },
    { id: 'energy_void', name: 'Anulación del Vacío', element: 'VACIO', cost: 5, type: 'ATTACK', val: 350, targetScope: 'ANY_ENEMY', image: 'cartas/vacio.png', desc: 'Ausencia de materia: 350 de daño directo.' }
];