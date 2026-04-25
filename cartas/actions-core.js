// --- ACCIONES: NÚCLEO Y UTILIDADES ---
// Guardar como: Cartas Silen/actions-core.js

window.GameActionsCore = {
    // Calcular poder de ataque físico
    getCombatPower: (card) => {
        return (card.attack || 0);
    },
    // Calcular poder de ataque especial
    getSpecialPower: (card) => {
        return (card.specialAttack || 0);
    }
};