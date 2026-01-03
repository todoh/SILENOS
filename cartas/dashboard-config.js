// 1. CONFIGURACIÓN Y UTILIDADES DEL DASHBOARD
// Guardar como: Cartas Silen/dashboard-config.js

const PACK_TYPES = [
    { 
        id: 'elemental', 
        name: 'Sobre Elemental', 
        cost: 50, 
        count: 3, 
        desc: "Kit básico de iniciación.",
        color: "text-blue-400" 
    },
    { 
        id: 'advanced', 
        name: 'Sobre Avanzado', 
        cost: 150, 
        count: 5, 
        desc: "Para estrategas serios.",
        color: "text-purple-400" 
    },
    { 
        id: 'expert', 
        name: 'Sobre Experto', 
        cost: 300, 
        count: 10, 
        desc: "El poder absoluto.",
        color: "text-yellow-500" 
    },
    { 
        id: 'master', 
        name: 'Colección Maestra', 
        cost: 2000, 
        count: 0, 
        desc: "Desbloquea TODAS las cartas.",
        color: "text-red-600" 
    }
];

// Calculamos precio individual (Más caro que en sobre: Coste de carta * 5)
const getSingleCardPrice = (card) => {
    return Math.max(50, card.cost * 5);
};