/* -------------------------------------------------------------------------- */
/*                         CARTAS: CLASICOS & FISICOS                         */
/* -------------------------------------------------------------------------- */

const CARDS_FISICOS = [
    { id: 'fire_ball', name: 'Ráfaga de Fuego', element: 'FIRE', cost: 2, type: 'ATTACK', val: 150, targetScope: 'ANY_ENEMY', image: 'cartas/rafagafuego.png', desc: 'Inflige 150 de daño de calor.' },
    { id: 'fire_burn', name: 'Llama Combustiva', element: 'FIRE', cost: 3, type: 'ATTACK', val: 100, statusEffect: 'BURN', statusVal: 60, statusDuration: 2, targetScope: 'ANY_ENEMY', image: 'cartas/llamaradafuego.png', desc: '100 daño y Quemadura (60/t).' },
    { id: 'fire_meteor', name: 'Meteoro Ígneo', element: 'FIRE', cost: 6, type: 'ATTACK', val: 380, typeSynergy: { element: 'FIRE', bonusPerMatch: 60 }, targetScope: 'ANY_ENEMY', image: 'cartas/meteoritoigneo.png', desc: '380 daño. +60 adicional por cada otra carta de Fuego.' },
    { id: 'water_heal', name: 'Marea Curativa', element: 'WATER', cost: 4, type: 'HEAL', val: 240, typeSynergy: { element: 'WATER', bonusPerMatch: 50 }, targetScope: 'ANY_SELF', image: 'cartas/mareacurativa.png', desc: 'Restaura 240 HP. +50 extra por cada carta de Agua.' },
    { id: 'water_shield', name: 'Burbuja de Agua', element: 'WATER', cost: 2, type: 'DEFENSE', val: 160, targetScope: 'ANY_SELF', image: 'cartas/burbujaagua.png', desc: 'Concede 160 de escudo fluido.' },
    { id: 'earth_shield', name: 'Escudo de Piedra', element: 'EARTH', cost: 3, type: 'DEFENSE', val: 200, targetScope: 'ANY_SELF', image: 'cartas/escudopiedra.png', desc: 'Otorga 200 de granito defensivo.' },
    { id: 'earth_quake', name: 'Sismo Terrestre', element: 'EARTH', cost: 4, type: 'ATTACK', val: 260, targetScope: 'ANY_ENEMY', image: 'cartas/sismoterrestre.png', desc: 'Sacudida sísmica de 260 de daño.' },
    { id: 'air_strike', name: 'Tornados Gemelos', element: 'AIR', cost: 4, type: 'ATTACK', val: 280, targetScope: 'ANY_ENEMY', image: 'cartas/tornadosgemelos.png', desc: 'Ataque huracanado de 280 de daño.' },
    { id: 'air_boost', name: 'Viento Celeris', element: 'AIR', cost: 2, type: 'BOOST', val: 1.5, targetScope: 'SELF_HERO', image: 'cartas/vientoceleris.png', desc: '+50% potencia en tu próximo ataque.' },
    { id: 'physical_lightning', name: 'Descarga Voltaica', element: 'RAYO', cost: 4, type: 'ATTACK', val: 240, targetScope: 'ANY_ENEMY', image: 'cartas/rayo.png', desc: '240 de daño eléctrico paralizante.' },
    { id: 'ice_freeze', name: 'Ráfaga de Hielo', element: 'ICE', cost: 3, type: 'ATTACK', val: 120, statusEffect: 'FREEZE', statusVal: 1, statusDuration: 1, targetScope: 'ANY_ENEMY', image: 'cartas/rafagahielo.png', desc: '120 daño y Congela por 1 turno.' },
    { id: 'physical_metal', name: 'Placa de Acero', element: 'METAL', cost: 4, type: 'DEFENSE', val: 280, targetScope: 'ANY_SELF', image: 'cartas/acero.png', desc: 'Otorga 280 de blindaje metálico.' },
    { id: 'physical_magma', name: 'Fundición Denso', element: 'MAGMA', cost: 5, type: 'ATTACK', val: 340, targetScope: 'ANY_ENEMY', image: 'cartas/fundida.png', desc: 'Piedra fundida que causa 340 de daño.' }
];