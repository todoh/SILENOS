// ===================================
// ARCHIVO PRINCIPAL - INICIALIZACIÓN Y GLOBALES
// ===================================

// --- VARIABLES GLOBALES ---
let guionLiterarioData = [];
let escenas = JSON.parse(localStorage.getItem("escenas")) || {};
let escenaActual = 'a';
let ultimoId = 0;
let titulo2 = document.getElementById("titulo-proyecto").innerText;

let indiceCapituloActivo = -1;
let draggedFrameIndex = null;
let draggedFrameEscenaId = null;
let currentDragOverFrameElement = null;

let chatDiv = document.getElementById("chat");

// --- Variables para la generación automática desde el panel de IA ---
let nombredelahistoria = "Nombre de la Historia";
let cantidaddeescenas = 2;
let cantidadframes = 3;


// --- INICIALIZACIÓN DE LA APLICACIÓN ---
window.onload = function() {
    let escenasGuardadas = localStorage.getItem("escenas");
    if (escenasGuardadas) {
        escenas = JSON.parse(escenasGuardadas);
        // Calcular el último ID para evitar colisiones al crear nuevas escenas
        const ids = Object.keys(escenas).map(id => parseInt(id.match(/\d+/g) ? id.match(/\d+/g).pop() : 0));
        ultimoId = Math.max(0, ...ids);
        actualizarLista();
    }
    
    // Aplicar el tema guardado al cargar
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggleButton) themeToggleButton.textContent = '☀️';
    } else {
        if (themeToggleButton) themeToggleButton.textContent = '🌙';
    }
    // Cargar valores iniciales de los inputs de IA
    actualizarParametrosIA();
};

document.getElementById("titulo-proyecto").addEventListener("input", function() {
    titulo2 = document.getElementById("titulo-proyecto").innerText;
});

// --- FUNCIONES GENERALES DE UI ---
function cerrartodo() {
    document.getElementById('personajes').style.display = 'none';
    document.getElementById('lugares').style.display = 'none';
    document.getElementById('ia').style.display = 'none';
    document.getElementById('escena-vista').style.display = 'none';
    document.getElementById('escenah').style.display = 'none';
    document.getElementById('guion-literario').style.display = 'none';
}

function abrir(escena) {
    document.getElementById(escena).style.display = 'flex';
}

function gridear(escena) {
    document.getElementById(escena).style.display = 'grid';
}

function reiniciar() {
    if (confirm("¿Reiniciar el proyecto?, perderás todos los cambios sin guardar.")) {
        localStorage.removeItem("escenas"); // <-- CORRECCIÓN AÑADIDA AQUÍ
        window.location.reload(true);
    }
}

function guardarCambios() {
    localStorage.setItem("escenas", JSON.stringify(escenas));
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
        if (themeToggleButton) themeToggleButton.textContent = '☀️';
    } else {
        localStorage.setItem('theme', 'light');
        if (themeToggleButton) themeToggleButton.textContent = '🌙';
    }
}

function herramientacopiar() {
    const chatParagraphs = chatDiv.getElementsByTagName("p");
    if (chatParagraphs.length === 0) return;
    const lastMessage = chatParagraphs[chatParagraphs.length - 1].innerText;
    document.execCommand('copy');
}

// Actualiza las variables globales desde los inputs del panel de IA
function actualizarParametrosIA() {
    nombredelahistoria = document.getElementById("nombrehistoria").value;
    cantidaddeescenas = parseInt(document.getElementById("cantidadescenas").value) || 0;
    cantidadframes = parseInt(document.getElementById("cantidadeframes").value) || 0;
    
    // Para compatibilidad con geminialfa.js que usa window
    window.cantidaddeescenas = cantidaddeescenas;
    window.cantidadframes = cantidadframes;
}
