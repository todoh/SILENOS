// --- INITIALIZER MAESTRO ---
const Sys = window.parent.SystemConfig;
const FS = window.parent; 

// Mapeamos explícitamente ui a la ventana global antes de instanciar la app
if (typeof ui !== 'undefined') {
    window.ui = ui;
}

if (typeof uiCrono !== 'undefined') {
    window.uiCrono = uiCrono;
}

const app = new DataStudio();

// Exponemos 'app' de forma global para que tramas.canvas.js y la UI lo lean sin problema.
window.app = app; 

window.onload = () => {
    app.init();
};