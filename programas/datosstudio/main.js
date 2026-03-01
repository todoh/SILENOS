const Sys = window.parent.SystemConfig;
const FS = window.parent; 

const app = new DataStudio();

// CORRECCIÓN: Exponemos 'app' de forma global para que tramas.canvas.js y la UI lo lean sin problema.
window.app = app; 

window.onload = () => app.init();