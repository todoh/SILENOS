/* -------------------------------------------------------------------------- */
/*                         CARTAS: MISTICOS & ESPIRITUALES                    */
/* -------------------------------------------------------------------------- */

const CARDS_MISTICOS = [
    { id: 'mystic_soul', name: 'Proyección del Alma', element: 'ALMA', cost: 3, type: 'DRAIN', val: 170, targetScope: 'ANY_ENEMY', image: 'cartas/drenajesombrio.png', desc: 'Esencia espiritual directa que roba 170 HP.' },
    { id: 'mystic_ghost', name: 'Plano Etéreo', element: 'FANTASMA', cost: 2, type: 'DEFENSE', val: 180, targetScope: 'ANY_SELF', image: 'cartas/burbujaagua.png', desc: 'Incorporeidad que otorga 180 de protección.' },
    { id: 'mystic_karma', name: 'Reflejo Kármico', element: 'KARMA', cost: 3, type: 'ATTACK', val: 200, targetScope: 'ANY_ENEMY', image: 'cartas/impulsoego.png', desc: 'Balance de retribución: 200 de daño directo.' },
    { id: 'curse_hex', name: 'Hexágono Oscuro', element: 'CURSE', cost: 1, type: 'ATTACK', val: 80, statusEffect: 'CURSE', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/hexagono.png', desc: '80 daño y Maldición (+50% daño recibido).' },
    { id: 'mystic_sacred', name: 'Santuario Bendito', element: 'SACRO', cost: 5, type: 'HEAL', val: 350, targetScope: 'ANY_SELF', image: 'cartas/bendiciondivina.png', desc: 'Energía sagrada que recupera 350 HP.' },
    { id: 'mystic_sinister', name: 'Oscuridad Maligna', element: 'SINIESTRO', cost: 3, type: 'ATTACK', val: 210, statusEffect: 'CURSE', statusVal: 1, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/hexagono.png', desc: 'Corrupción directa de 210 de daño + Maldición.' },
    { id: 'mystic_necro', name: 'Descomposición', element: 'NECRO', cost: 3, type: 'DRAIN', val: 190, targetScope: 'ANY_ENEMY', image: 'cartas/sombravoraz.png', desc: 'Energía de muerte que drena 190 HP.' },
    { id: 'mystic_rune', name: 'Símbolo Ancestral', element: 'RUNA', cost: 2, type: 'BOOST', val: 1.6, targetScope: 'SELF_HERO', image: 'cartas/resplandorsolar.png', desc: 'Simbología antigua que potencia X1.6.' }
];