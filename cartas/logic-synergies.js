// --- LÓGICA DE SINERGIAS Y TIPOS ---
// Guardar como: Cartas Silen/logic-synergies.js

window.GameLogicSynergies = {
    // Definición de colores para los tipos (Visual)
    getTypeColor: (type) => {
        const colors = {
            // Elementales
            'Fuego': 'text-red-400 bg-red-900/30 border-red-500/50',
            'Agua': 'text-blue-400 bg-blue-900/30 border-blue-500/50',
            'Hielo': 'text-cyan-300 bg-cyan-900/30 border-cyan-500/50',
            'Viento': 'text-slate-300 bg-slate-700/30 border-slate-500/50',
            'Tierra': 'text-amber-600 bg-amber-900/30 border-amber-600/50',
            'Oscuridad': 'text-purple-400 bg-purple-900/30 border-purple-500/50',
            'Luz': 'text-yellow-200 bg-yellow-900/30 border-yellow-500/50',
            
            // Esenciales (Clases)
            'Guerrero': 'text-orange-300 bg-orange-900/20 border-orange-500/30',
            'Mago': 'text-indigo-300 bg-indigo-900/20 border-indigo-500/30',
            'Pícaro': 'text-emerald-300 bg-emerald-900/20 border-emerald-500/30',
            'Tanque': 'text-gray-300 bg-gray-600/30 border-gray-400/50',
            'Soporte': 'text-pink-300 bg-pink-900/20 border-pink-500/30',
            'Clerigo': 'text-white bg-yellow-100/10 border-yellow-200/50',
            
            // Oficiales (Razas/Facciones)
            'Dragón': 'text-amber-500 bg-amber-900/40 border-amber-500',
            'Humano': 'text-stone-300 bg-stone-800/40 border-stone-500',
            'No-Muerto': 'text-lime-300 bg-lime-900/20 border-lime-500/30',
            'Bestia': 'text-rose-300 bg-rose-900/20 border-rose-500/30',
            'Constructo': 'text-zinc-400 bg-zinc-800 border-zinc-500',
            'Divino': 'text-yellow-400 bg-yellow-500/10 border-yellow-300',
            'Elfo': 'text-green-300 bg-green-900/30 border-green-500'
        };
        // Retorno por defecto si no encuentra el tipo
        return colors[type] || 'text-slate-400 bg-slate-800 border-slate-600';
    },

    // Verificar si una carta tiene un tipo específico
    hasType: (card, type) => {
        if (!card.types || !Array.isArray(card.types)) return false;
        return card.types.includes(type);
    },

    // Cuenta cuántos aliados de un tipo específico hay en el tablero (excluyendo la carta fuente si se desea)
    countAlliesByType: (ownerId, type, excludeCardId = null) => {
        // Intenta acceder al tablero global. Si no existe la estructura, retorna 0.
        if (!window.GameLogic || !window.GameLogic.players || !window.GameLogic.players[ownerId]) return 0;
        
        const board = window.GameLogic.players[ownerId].board || [];
        return board.filter(c => 
            c.id !== excludeCardId && 
            window.GameLogicSynergies.hasType(c, type)
        ).length;
    },

    // (Futuro) Calcular bonificación de sinergia basada en el campo
    calculateSynergyBonus: (fieldCards) => {
        let bonuses = { strength: 0, intelligence: 0 };
        // Lógica extendida se puede implementar aquí
        return bonuses;
    }
};