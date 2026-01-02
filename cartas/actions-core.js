// --- ACCIONES: NÚCLEO Y UTILIDADES ---
// Guardar como: Cartas Silen/actions-core.js

window.GameActionsCore = {
    // Calcular suma de stats para combate
    getCombatPower: (card) => {
        return (card.strength || 0);
    }
};