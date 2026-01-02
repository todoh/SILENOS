// --- ACCIONES DE JUEGO (AGREGADOR PRINCIPAL) ---
// Sobreescribir: Cartas Silen/game-actions.js

// Este archivo unifica todos los módulos de lógica.
// Nota: AbilityLibrary es independiente y se accede via window.AbilityLibrary
window.GameActions = {
    ...window.GameActionsCore,
    ...window.GameActionsTurn,
    ...window.GameActionsPlay,
    ...window.GameActionsCombat
};