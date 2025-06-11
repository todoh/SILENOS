// ===================================
// LÓGICA PARA LA SECCIÓN DE GALERÍA
// ===================================

let isCharacterEditorInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // Cuando el DOM esté cargado, configura el estado inicial de la galería.
    // Muestra la primera sección por defecto.
    mostrarSeccionGaleria('galeria-elementos');
});

/**
 * Muestra una sección específica dentro del contenedor de la galería y
 * oculta las demás. También actualiza el estado "activo" de los botones.
 * @param {string} idSeccion El ID de la sección a mostrar.
 */
function mostrarSeccionGaleria(idSeccion) {
    // Ocultar todas las secciones
    const secciones = document.querySelectorAll('#galeria-contenedor .galeria-seccion');
    secciones.forEach(seccion => {
        seccion.classList.remove('active');
    });

    // Quitar la clase 'active' de todos los botones
    const botones = document.querySelectorAll('#galeria-lista button');
    botones.forEach(boton => {
        boton.classList.remove('active');
    });

    // Mostrar la sección seleccionada
    const seccionActiva = document.getElementById(idSeccion);
    if (seccionActiva) {
        seccionActiva.classList.add('active');
    }

    // Añadir la clase 'active' al botón correspondiente
    const botonActivo = document.querySelector(`#galeria-lista button[onclick="mostrarSeccionGaleria('${idSeccion}')"]`);
    if (botonActivo) {
        botonActivo.classList.add('active');
    }

    // INICIALIZACIÓN DEL EDITOR DE PERSONAJES
    // Si la sección es el editor y no se ha inicializado antes, se llama a su función de inicio.
    if (idSeccion === 'galeria-editor-personajes' && !isCharacterEditorInitialized) {
        if (typeof initCharacterEditor === 'function') {
            initCharacterEditor();
            isCharacterEditorInitialized = true;
        } else {
            console.error("Error: La función initCharacterEditor() no está definida. Asegúrate de que el script del editor de personajes se ha cargado correctamente.");
        }
    }
}
