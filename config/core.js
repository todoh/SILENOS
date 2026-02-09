/* 3/js/config/core.js */
// Referencia global al servicio de IA del sistema padre
const SERVICE = window.parent.AIService || window.AIService;

// Estado global de la configuración
window.ConfigState = {
    currentTab: 'general'
};

// Inicializador maestro
document.addEventListener('DOMContentLoaded', () => {
    console.log("SILENOS Config: Core Initialized");
    if(window.AuthManager) window.AuthManager.init();
    if(window.ModelManager) window.ModelManager.init();
    if(window.StorageManager) window.StorageManager.init(); // Inicializar Storage
    if(window.UIManager) window.UIManager.init();
});