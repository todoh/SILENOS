// ===================================
// ARCHIVO PRINCIPAL - INICIALIZACIÓN Y GLOBALES
// ===================================
document.getElementById('exportar-juego-3d-btn').addEventListener('click', generarJuego3D);
// --- VARIABLES GLOBALES ---
// Se declaran las variables aquí, pero las que dependen del DOM se asignarán más tarde.
let guionLiterarioData = [];
let escenas = {};
let storyScenes = [];
let activeSceneId = null;
let ultimoId = 0;
let titulo2; // Se asignará en window.onload
let indiceCapituloActivo = -1;
let draggedFrameIndex = null;
let draggedFrameEscenaId = null;
let currentDragOverFrameElement = null;
let chatDiv; // Se asignará en window.onload

let nombredelahistoria = "Nombre de la Historia";
let cantidaddeescenas = 2;
let cantidadframes = 3;
let libros = [];
let libroActivoId = null;
let contenidoAProcesar = null;
let libroDestinoSeleccionadoId = null;

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
window.onload = function() {
    // Ahora que el DOM está cargado, es seguro asignar valores a las variables que dependen de él.
    titulo2 = document.getElementById("titulo-proyecto").innerText;
    chatDiv = document.getElementById("chat");
const videoFondo = document.getElementById('video-fondo');
    if (videoFondo) {
        // Ajusta este valor:
        // 1.0 es la velocidad normal.
        // 0.5 es la mitad de la velocidad (más lento).
        // 0.75 es un 25% más lento.
        videoFondo.playbackRate = 0.55; 
    }
    document.getElementById("titulo-proyecto").addEventListener("input", function() {
        titulo2 = document.getElementById("titulo-proyecto").innerText;
    });

    const themeToggleButton = document.getElementById('theme-toggle-button');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggleButton) themeToggleButton.textContent = '☀️';
    } else {
        if (themeToggleButton) themeToggleButton.textContent = '🌙';
    }
    actualizarParametrosIA();
    initEscenas();
    initMomentos();
    // Listener para cerrar el popup de libros al hacer clic fuera
    document.addEventListener('click', (event) => {
        const popup = document.getElementById('selector-libro-popup');
        const btn = document.getElementById('selector-libro-btn');
        if (popup && btn && popup.style.display === 'block') {
            if (!popup.contains(event.target) && event.target !== btn) {
                cerrarSelectorDeLibro();
            }
        }
    });
};



// --- FUNCIONES GENERALES DE UI ---
function cerrartodo() {
    document.getElementById('personajes').style.display = 'none';
    document.getElementById('ia').style.display = 'none';
    document.getElementById('escena-vista').style.display = 'none';
    document.getElementById('capitulosh').style.display = 'none';
    document.getElementById('escenah').style.display = 'none';
    document.getElementById('animaciones').style.display = 'none';
    document.getElementById('imagenes').style.display = 'none';
    document.getElementById('modal-imagenes').style.display = 'none';
    document.getElementById('biblioteca').style.display = 'none';
    document.getElementById('guion-literario').style.display = 'none';
    document.getElementById('momentos').style.display = 'none';
    document.getElementById('vistageneral').style.display = 'none';
    document.getElementById('juego').style.display = 'none';
    document.getElementById('animacionsvg').style.display = 'none';
  document.getElementById('animacionessvg').style.display = 'none';
  document.getElementById('rpgmaker').style.display = 'none';
  document.getElementById('proyecto').style.display = 'none';
  document.getElementById('interactivo').style.display = 'none';
  document.getElementById('diapositivas').style.display = 'none';
  document.getElementById('editor').style.display = 'none';


}

function abrir(escena) {
    cerrartodo();
    document.getElementById(escena).style.display = 'flex';

    if (escena === 'momentos') {
        console.log("Abriendo sección Momentos. Actualizando lista de guiones.");
        if (typeof cargarGuionesEnDropdown === 'function') {
            cargarGuionesEnDropdown();
        } else {
            console.error("Error: La función cargarGuionesEnDropdown no fue encontrada.");
        }

        const momentosContainer = document.getElementById('momentos');
        const lienzo = document.getElementById('momentos-lienzo');
        requestAnimationFrame(() => {
            if (momentosContainer && lienzo) {
                const containerWidth = momentosContainer.clientWidth;
                const lienzoWidth = lienzo.scrollWidth;
                const containerHeight = momentosContainer.clientHeight;
                const lienzoHeight = lienzo.scrollHeight;

                const scrollLeft = (lienzoWidth - containerWidth) / 2;
                const scrollTop = (lienzoHeight - containerHeight) / 2;
                
                momentosContainer.scrollLeft = scrollLeft;
                momentosContainer.scrollTop = scrollTop;
            }
        });
    }
    if (escena === 'vistageneral') {
        if (typeof ultimoInformeGenerado !== 'undefined' && ultimoInformeGenerado) {
            if (typeof renderizarInformeCompleto === 'function') {
                renderizarInformeCompleto(ultimoInformeGenerado);
            }
        } else {
            const informeContainer = document.getElementById('informe-container');
            if (informeContainer && informeContainer.innerHTML.trim() === '') {
                 informeContainer.innerHTML = '<p style="text-align: center; margin-top: 2rem;"> </p>';
            }
        }
    }

    if (escena === 'biblioteca') {
        const todasLasImagenes = recopilarTodasLasImagenes();
        renderizarGaleria(todasLasImagenes);
    }

    if (escena === 'proyecto') {
        renderizarVisorDeLibros();
    }
   // Llamamos a la función una sola vez, pasándole el nombre de la escena activa.
   actualizarBotonContextual(escena); 
}

function gridear(escena) {
    cerrartodo();
    document.getElementById(escena).style.display = 'grid';
    actualizarBotonContextual(escena);
}

function reiniciarEstadoApp() {
    // Esta función ahora se llama de forma segura despu√©s de que las variables han sido inicializadas.
    guionLiterarioData = [];
    escenas = {};
    storyScenes = [];
    activeSceneId = null;
    ultimoId = 0;
    indiceCapituloActivo = -1;

    // Resetear UI
    document.getElementById("titulo-proyecto").innerText = "Silenos Versión 1.1.11";
    document.getElementById("listapersonajes").innerHTML = "";
    document.getElementById("lista-capitulos").innerHTML = "";
    document.getElementById("momentos-lienzo").innerHTML = "";
    
    // Limpiar y re-renderizar secciones complejas
    if(typeof renderizarGuion === 'function') renderizarGuion();
    if(typeof renderEscenasUI === 'function') renderEscenasUI();
    if(typeof actualizarLista === 'function') actualizarLista();
    
    console.log("Estado de la aplicación reseteado.");
}


// --- LÓGICA DEL MODAL DE CONFIGURACIÓN ---
function abrirModalConfig() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('lugares');
    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'flex';
    if (overlay) {
        overlay.onclick = function() {
            cerrarModalConfig();
        }
    }
}

function cerrarModalConfig() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('lugares');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}

// --- LÓGICA DEL MODAL DE IMPORTACIÓN ---
function abrirModalImportar() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-importar-json');
    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'flex';
    if (overlay) {
        overlay.onclick = cerrarModalImportar;
    }
}

function cerrarModalImportar() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-importar-json');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}

function importarDatosDesdeJSON() {
    const jsonText = document.getElementById('json-import-area').value;
    if (!jsonText.trim()) {
        alert("El campo de texto está vacío.");
        return;
    }

    let jsonData;
    try {
        jsonData = JSON.parse(jsonText);
    } catch (error) {
        alert("Error de sintaxis en el JSON. Por favor, verifica el texto introducido.\n\n" + error.message);
        return;
    }

    const procesarDato = (dato) => {
        if (dato && typeof dato.nombre !== 'undefined' && typeof dato.descripcion !== 'undefined' && typeof dato.etiqueta !== 'undefined') {
            try {
                if (typeof agregarPersonajeDesdeDatos === 'function') {
                    agregarPersonajeDesdeDatos(dato);
                    return true;
                }
                return false;
            } catch (e) {
                console.error("Error al intentar añadir el 'Dato': ", dato.nombre, e);
                return false;
            }
        }
        return false;
    };

    let datosImportados = 0;
    let errores = 0;

    if (Array.isArray(jsonData)) {
        jsonData.forEach(dato => {
            if (procesarDato(dato)) {
                datosImportados++;
            } else {
                errores++;
            }
        });
    } else if (typeof jsonData === 'object' && jsonData !== null) {
        if (procesarDato(jsonData)) {
            datosImportados++;
        } else {
            errores++;
        }
    } else {
        alert("El JSON proporcionado no es válido. Debe ser un único objeto de 'Dato' o un array de 'Datos'.");
        return;
    }

    if (datosImportados > 0) {
        alert(`¡Se importaron ${datosImportados} dato(s) con éxito en la sección "Datos"!`);
        cerrarModalImportar();
        document.getElementById('json-import-area').value = ''; 
    }
    
    if (errores > 0) {
        const mensajeError = `Se encontraron ${errores} objeto(s) con formato incorrecto o que no son 'Datos'. Solo se importan los que tienen las claves 'nombre', 'descripcion' y 'etiqueta'.`;
        if (datosImportados === 0) {
             alert(mensajeError);
        } else {
            console.warn(mensajeError);
        }
    }
}

function reiniciar() {
    if (confirm("¿Reiniciar el proyecto? Se perderán todos los cambios no guardados y volverás a la pantalla de inicio.")) {
        reiniciarEstadoApp();
        if (typeof animacionReiniciar === 'function') {
            reiniciarEstadoApp()
            animacionReiniciar();
        } else {
            console.error("La función animacionReiniciar no fue encontrada. Reiniciando de forma instantánea.");
            document.getElementById('silenos').style.display = 'none';
            document.getElementById('principio').style.display = 'flex';
        }
    }
}

/**
 * MODIFICADO: Actualiza el botón contextual basándose en la sección activa.
 * Se ha añadido una nueva condición para la sección 'escenah' (Storyboard).
 */
function actualizarBotonContextual() {
    const btn = document.getElementById('contextual-action-btn');
    const btn2 = document.getElementById('open-imagenes-modal-btn');
    if (!btn || !btn2) return;

    // Clonar y reemplazar para limpiar listeners antiguos
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    const newBtn2 = btn2.cloneNode(true);
    btn2.parentNode.replaceChild(newBtn2, btn2);

    if (typeof apiKey === 'undefined' || !apiKey || !apiKey.trim()) {
        newBtn.style.display = 'none';
        newBtn2.style.display = 'none';
        return;
    }

    const seccionesVisibles = [
        'personajes', 'momentos', 'capitulosh', 'escenah', 'guion-literario', 'animacionessvg' // <-- AÑADIDO
    ];

    const idSeccionActiva = seccionesVisibles.find(id => {
        const seccion = document.getElementById(id);
        return seccion && seccion.style.display !== 'none';
    });

    if (idSeccionActiva) {
        newBtn.innerHTML = '✨';
        newBtn2.innerHTML = '👁️‍🗨️';
        newBtn.style.display = 'none';
        newBtn2.style.display = 'none';
        
        if (idSeccionActiva === 'personajes') {
            newBtn.title = 'Analizar o importar datos con IA';
            newBtn.onclick = abrirModalAIDatos;
            newBtn2.title = 'Generar Imágenes con IA';
            newBtn2.onclick = abrirModalImagenes;
            newBtn2.style.display = 'none';
        } else if (idSeccionActiva === 'momentos') {
            newBtn.title = 'Generar Aventura Interactiva con IA';
            newBtn.onclick = abrirModalMomentosIA;
        } else if (idSeccionActiva === 'capitulosh') {
            newBtn.title = 'Generar Frames con IA desde un Guion';
            newBtn.onclick = abrirModalSeleccionLibroParaFrames;
        } else if (idSeccionActiva === 'animacionessvg') { // <-- NUEVA CONDICIÓN
            newBtn.title = 'Generar Animaciones SVG con IA';
            newBtn.onclick = abrirModalAnimacionesIA;
        } else if (idSeccionActiva === 'escenah') {
            newBtn.innerHTML = '🎬';
            newBtn.title = 'Generar Storyboard desde Libro';
            newBtn.onclick = abrirModalGenerarStoryboardDesdeLibro;
        } else {
            newBtn.title = 'Abrir Herramientas de IA';
            newBtn.onclick = abrirModalIAHerramientas;
        }
    } else {
        newBtn.style.display = 'none';
        newBtn2.style.display = 'none';
    }
}



/**
 * CORREGIDO: Abre un modal para seleccionar un LIBRO y generar el storyboard.
 * Esta función ahora solo pide un libro y llama a la función correcta.
 */
function abrirModalGenerarStoryboardDesdeLibro() {
    // Comprobar si hay libros disponibles
    if (!libros || libros.length === 0) {
        alert("No hay libros en la biblioteca. Por favor, crea un libro primero.");
        return;
    }

    // Eliminar modales anteriores
    const existingOverlay = document.getElementById('storyboard-gen-modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // HTML del modal, ahora solo con selector de libro
    const modalHTML = `
        <div id="storyboard-gen-modal-overlay" class="modal-overlay" style="display: block;">
            <div id="storyboard-gen-modal" class="modal-content" style="display: flex; flex-direction: column;">
                <button class="modal-close-btn" onclick="cerrarModalGenerarStoryboard()">&times;</button>
                <h2 style="font-size: 1.5em; font-weight: bold; margin-bottom: 1rem;">Generar Storyboard desde Libro</h2>
                <p style="margin-bottom: 1.5rem;">Selecciona un libro. La IA leerá su contenido y generará una escena con una toma por cada párrafo.</p>
                
                <div style="margin-bottom: 1rem;">
                    <label for="libro-select-storyboard" style="display: block; margin-bottom: 0.5rem;">Libro:</label>
                    <select id="libro-select-storyboard" class="modal-select">
                        <option value="">Selecciona un libro...</option>
                        ${libros.map(libro => `<option value="${libro.id}">${libro.titulo}</option>`).join('')}
                    </select>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="cerrarModalGenerarStoryboard()" class="btn btn-secondary">Cancelar</button>
                    <button id="confirm-storyboard-gen" class="btn btn-primary">Generar Tomas</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Lógica del botón de confirmación
    document.getElementById('confirm-storyboard-gen').onclick = () => {
        const selectedLibroId = document.getElementById('libro-select-storyboard').value;

        if (!selectedLibroId) {
            alert("Por favor, selecciona un libro.");
            return;
        }

        // --- LÓGICA CLAVE ---
        // Se llama a la función que procesa un LIBRO.
        // Ahora está definida en este mismo archivo, por lo que no dará error.
        if (typeof crearYMostrarEscenasParaLibro === 'function') {
            console.log(`Iniciando generación de storyboard desde el libro ID: ${selectedLibroId}`);
            crearYMostrarEscenasParaLibro(selectedLibroId);
        } else {
            // Este error ya no debería ocurrir.
            alert("Error: La función 'crearYMostrarEscenasParaLibro' no está disponible. Asegúrate de que el script correspondiente esté cargado.");
        }
        
        cerrarModalGenerarStoryboard();
        // Nos aseguramos de que el usuario vea la sección del storyboard.
        abrir('escenah'); 
    };

    // Cierre del modal
    document.getElementById('storyboard-gen-modal-overlay').onclick = function(e) {
        if (e.target.id === 'storyboard-gen-modal-overlay') {
            cerrarModalGenerarStoryboard();
        }
    };
}


/**
 * Cierra el modal de generación de storyboard.
 */
function cerrarModalGenerarStoryboard() {
    const overlay = document.getElementById('storyboard-gen-modal-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * NUEVA FUNCIÓN: Muestra u oculta un indicador de carga global.
 */
function mostrarIndicadorCarga(mostrar, mensaje = "Procesando...") {
    let overlay = document.getElementById('loading-overlay');
    if (mostrar) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <p class="loading-message">${mensaje}</p>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        overlay.querySelector('.loading-message').textContent = mensaje;
    } else {
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}


 
// En tu archivo main.js, reemplaza la función existente por esta:

/**
 * Genera un storyboard, pidiendo a la IA que divida cada párrafo en múltiples
 * tomas. Para cada toma, solo se rellena el campo del guion conceptual.
 *
 * @param {string} libroId - El ID del libro para el cual generar el storyboard.
 */
async function crearYMostrarEscenasParaLibro(libroId) {
    if (!libroId) {
        alert("No se ha seleccionado ningún libro.");
        return;
    }

    const libro = libros.find(l => l.id === libroId);
    if (!libro) {
        alert("El libro seleccionado no se encontró.");
        return;
    }

    let contenidoCompleto = "";
    const capitulosDelLibro = Object.values(escenas).filter(cap => cap.libroId === libroId);

    for (const capitulo of capitulosDelLibro) {
        if (capitulo.frames && Array.isArray(capitulo.frames)) {
            for (const frame of capitulo.frames) {
                if (frame.texto && frame.texto.trim() !== "") {
                    contenidoCompleto += frame.texto + "\n\n";
                }
            }
        }
    }

    if (!contenidoCompleto.trim()) {
        alert("El libro seleccionado está vacío o sus capítulos no contienen texto. No se pueden generar tomas.");
        return;
    }

    const parrafos = contenidoCompleto.split('\n\n').filter(p => p.trim() !== '');
    if (parrafos.length === 0) {
        alert("No se encontraron párrafos válidos en el libro para generar tomas.");
        return;
    }

    mostrarIndicadorCarga(true, `Preparando escena para "${libro.titulo}"...`);

    const nuevaEscena = {
        id: `scene_${Date.now()}`,
        nombre: `Storyboard de ${libro.titulo}`,
        tomas: []
    };
    
    storyScenes.push(nuevaEscena);
    activeSceneId = nuevaEscena.id;
    
    if (typeof renderEscenasUI === 'function') {
        renderEscenasUI();
    } else {
        console.error("La función `renderEscenasUI` no está disponible para actualizar la vista.");
        mostrarIndicadorCarga(false);
        return;
    }

    try {
        for (let i = 0; i < parrafos.length; i++) {
            const parrafo = parrafos[i];
            
            mostrarIndicadorCarga(true, `Generando tomas para el párrafo ${i + 1}/${parrafos.length}...`);

            // --- CAMBIO 1: El prompt pide múltiples tomas, pero solo el guion conceptual para cada una ---
            const prompt = `Basado en el siguiente párrafo de una historia, divídelo en las tomas cinematográficas necesarias para narrarlo visualmente. Para CADA TOMA, genera únicamente una descripción detallada ("guion_conceptual").

Párrafo: "${parrafo}"

Formato de respuesta (JSON estricto con un array de tomas, cada una con un solo campo):
{
  "tomas_generadas": [
    {
      "guion_conceptual": "Descripción detallada de la primera toma, incluyendo personajes, acciones, entorno, tipo de plano y emoción."
    },
    {
      "guion_conceptual": "Descripción de la segunda toma..."
    }
  ]
}`;
            
            if (typeof llamarIAConFeedback !== 'function') {
                 throw new Error("La función `llamarIAConFeedback` no está definida.");
            }
            
            const modelToUse = 'gemini-2.5-flash';
            const respuestaAPI = await llamarIAConFeedback(prompt, `Párrafo ${i+1}`, modelToUse, true);

            // --- CAMBIO 2: La lógica procesa el array, pero crea la toma con el prompt visual vacío ---
            if (respuestaAPI && Array.isArray(respuestaAPI.tomas_generadas) && respuestaAPI.tomas_generadas.length > 0) {
                
                for (const tomaData of respuestaAPI.tomas_generadas) {
                    // Solo necesitamos validar que el guion conceptual exista
                    if (tomaData.guion_conceptual) {
                        const nuevaToma = {
                            id: `toma_${nuevaEscena.id}_${nuevaEscena.tomas.length}`,
                            duracion: 8,
                            imagen: '',
                            guionConceptual: tomaData.guion_conceptual, // Se rellena desde la IA
                            guionTecnico: "",                          // Se deja vacío intencionadamente
                            guionArtistico: ""
                        };
                        nuevaEscena.tomas.push(nuevaToma);
                    }
                }
                
                if (typeof renderEscenasUI === 'function') {
                    renderEscenasUI();
                }

            } else {
                console.warn(`No se pudo generar ninguna toma para el párrafo ${i+1}:`, parrafo);
            }
        }
        
        console.log(`Generación de storyboard completada con ${nuevaEscena.tomas.length} tomas.`);

    } catch (error) {
        console.error("Error durante la generación del storyboard:", error);
        alert("Ocurrió un error al generar las tomas. Revisa la consola para más detalles.");
    } finally {
        mostrarIndicadorCarga(false);
    }
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
    if (chatDiv && chatDiv.getElementsByTagName) {
        const chatParagraphs = chatDiv.getElementsByTagName("p");
        if (chatParagraphs.length === 0) return;
        const lastMessage = chatParagraphs[chatParagraphs.length - 1].innerText;
        navigator.clipboard.writeText(lastMessage);
    }
}

function actualizarParametrosIA() {
    nombredelahistoria = document.getElementById("nombrehistoria").value;
    cantidaddeescenas = parseInt(document.getElementById("cantidadescenas").value) || 0;
    cantidadframes = parseInt(document.getElementById("cantidadeframes").value) || 0;
    
    window.cantidaddeescenas = cantidaddeescenas;
    window.cantidadframes = cantidadframes;
}

function abrirModalAIDatos() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-ia-datos');
    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'flex';
    if (overlay) {
        overlay.onclick = cerrarModalAIDatos;
    }
}

function cerrarModalAIDatos() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-ia-datos');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}
function abrirModalImagenes() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-imagenes');
    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'flex';
    if (overlay) {
        overlay.onclick = cerrarModalImagenes;
    }
}

function cerrarModalImagenes() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-imagenes');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}
function cargarGuionesEnDropdown(selectElement) {
    if (!selectElement) {
        console.error("No se proporcionó un elemento <select> a cargarGuionesEnDropdown.");
        return;
    }
    const valorSeleccionadoAnteriormente = selectElement.value;
    selectElement.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = "";

    if (guionLiterarioData.length === 0) {
        placeholder.textContent = "No hay guiones creados";
        placeholder.disabled = true;
    } else {
        placeholder.textContent = "Selecciona un guion...";
    }
    selectElement.appendChild(placeholder);

    guionLiterarioData.forEach(guion => {
        if (guion.titulo && guion.titulo.trim() !== "") {
            const option = document.createElement('option');
            option.value = guion.titulo;
            option.textContent = guion.titulo;
            selectElement.appendChild(option);
        }
    });
    selectElement.value = valorSeleccionadoAnteriormente || "";
}

// main.js

// En main.js, REEMPLAZA tu función abrirModalExportar por esta:
function abrirModalExportar() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-exportar');
    if (!overlay || !modal) return;

    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalExportar;

    // --- LÓGICA CONSOLIDADA PARA POBLAR TODOS LOS SELECTORES ---

    // 1. Poblar el NUEVO selector de libros para exportar
    const selectLibroExport = document.getElementById('libro-export-select');
    if (selectLibroExport) {
        selectLibroExport.innerHTML = '';
        if (typeof libros !== 'undefined' && libros.length > 0) {
            libros.forEach(libro => {
                const option = document.createElement('option');
                option.value = libro.id;
                option.textContent = libro.titulo;
                selectLibroExport.appendChild(option);
            });
        } else {
            selectLibroExport.innerHTML = '<option disabled>No hay libros para exportar</option>';
        }
    }

    // 2. Poblar el selector de momentos para el videojuego
    if (typeof poblarSelectorMomentoInicial === 'function') {
        poblarSelectorMomentoInicial();
    }

    // 3. Poblar el selector de escenas de tomas
    const selectEscenasTomas = document.getElementById('tomas-export-select');
    if (selectEscenasTomas) {
        selectEscenasTomas.innerHTML = '';
        if (typeof storyScenes !== 'undefined' && storyScenes.length > 0) {
            const todasOption = document.createElement('option');
            todasOption.value = 'all';
            todasOption.textContent = 'Todas las Escenas';
            selectEscenasTomas.appendChild(todasOption);
            storyScenes.forEach(escena => {
                const option = document.createElement('option');
                option.value = escena.id;
                option.textContent = escena.nombre || 'Escena sin título';
                selectEscenasTomas.appendChild(option);
            });
        } else {
            selectEscenasTomas.innerHTML = '<option disabled>No hay escenas de tomas</option>';
        }
    }
}

 

function exportarLibroSeleccionado() {
    const select = document.getElementById('libro-export-select');
    if (!select || !select.value) {
        alert("No se ha seleccionado ningún libro para exportar.");
        return;
    }

    const libroId = select.value;
    const libro = libros.find(l => l.id === libroId);
    if (!libro) {
        alert("El libro seleccionado no se encontró.");
        return;
    }

    const capitulosDelLibro = Object.values(escenas).filter(cap => cap.libroId === libroId);

    // --- 1. Construir el contenido principal y la lista del menú al mismo tiempo ---
    let contenidoPrincipalHtml = '';
    let listaMenuHtml = '';

    if (capitulosDelLibro.length > 0) {
        capitulosDelLibro.forEach((capitulo, index) => {
            const idCapitulo = `capitulo-${index}`;
            const tituloCapitulo = capitulo.texto || `Capítulo ${index + 1}`;

            // Añadir el capítulo al contenido principal
            contenidoPrincipalHtml += `<div id="${idCapitulo}">
                <h2>${tituloCapitulo}</h2>`;
            
            if (capitulo.frames && capitulo.frames.length > 0) {
                capitulo.frames.forEach((frame, frameIndex) => {
                    contenidoPrincipalHtml += `<div class="frame">
                 
                        <p>${frame.texto.replace(/\n/g, '<br>')}</p>`;
                    if (frame.imagen) {
                        contenidoPrincipalHtml += `<img src="${frame.imagen}" alt="Imagen del Frame ${frameIndex + 1}">`;
                    }
                    contenidoPrincipalHtml += `</div>`;
                });
            } else {
                contenidoPrincipalHtml += `<p><em>Este capítulo no tiene frames.</em></p>`;
            }
            contenidoPrincipalHtml += `</div>`;

            // Añadir el enlace del capítulo a la lista del menú
            listaMenuHtml += `<li><a href="#${idCapitulo}">${tituloCapitulo}</a></li>`;
        });
    } else {
        contenidoPrincipalHtml = `<p><em>Este libro no tiene capítulos.</em></p>`;
    }


    // --- 2. Ensamblar el documento HTML final con Estilos y JavaScript ---
    const contenidoHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${libro.titulo}</title>
            <style>
                /* Estilos Generales */
                body { font-family: sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #fdfdfd; scroll-behavior: smooth; }
                .container { max-width: 800px; margin: auto; padding: 0 20px; }
                h1 { color: #2c3e50; text-align: center; }
                h2 { color:rgb(0, 0, 0); border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-top: 40px; }
                h3 { color: #7f8c8d; }
                .frame { margin: 20px 0; padding-left: 15px; border-left: 3px solid #bdc3c7; }
                .frame img { max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px; }
                p { white-space: pre-wrap; }

                /* Estilos del Menú de Navegación */
                #menu-btn {
                    position: fixed;
                    top: 15px;
                    left: 15px;
                    z-index: 1001;
                    background-color:rgb(0, 0, 0);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    transition: background-color 0.3s;
                }
                #menu-btn:hover { background-color:rgb(252, 18, 18); }
                
                #menu-navegacion {
                    position: fixed;
                    top: 0;
                    left: -300px; /* Oculto por defecto */
                    width: 280px;
                    height: 100%;
                    background-color: #fff;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
                    transition: left 0.3s ease-in-out;
                    z-index: 1000;
                    overflow-y: auto;
                }
                #menu-navegacion.visible { left: 0; }
                
                #menu-navegacion h3 {
                    padding: 20px;
                    margin: 0;
                    background-color: #ecf0f1;
                    color:rgb(0, 0, 0);
                }

                #menu-navegacion ul { list-style: none; padding: 10px 0; margin: 0; }
                #menu-navegacion li a {
                    display: block;
                    padding: 12px 20px;
                    color:rgb(0, 0, 0);
                    text-decoration: none;
                    transition: background-color 0.2s;
                }
                #menu-navegacion li a:hover { background-color: #ecf0f1; }
            </style>
        </head>
        <body>
            <button id="menu-btn">☰</button>

            <nav id="menu-navegacion">
                <h3>${libro.titulo}</h3>
                <ul>
                    ${listaMenuHtml}
                </ul>
            </nav>

            <div class="container">
                <h1>${libro.titulo}</h1>
                ${contenidoPrincipalHtml}
            </div>

            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const menuBtn = document.getElementById('menu-btn');
                    const menuNav = document.getElementById('menu-navegacion');
                    const menuLinks = menuNav.querySelectorAll('a');

                    // Abrir/cerrar menú con el botón
                    menuBtn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        menuNav.classList.toggle('visible');
                    });

                    // Cerrar menú al hacer clic en un enlace
                    menuLinks.forEach(link => {
                        link.addEventListener('click', () => {
                            menuNav.classList.remove('visible');
                        });
                    });

                    // Cerrar menú al hacer clic fuera de él
                    document.addEventListener('click', (event) => {
                        if (menuNav.classList.contains('visible') && !menuNav.contains(event.target)) {
                            menuNav.classList.remove('visible');
                        }
                    });
                });
            </script>
        </body>
        </html>`;

    // --- 3. Crear y descargar el archivo ---
    const blob = new Blob([contenidoHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${libro.titulo.replace(/ /g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    cerrarModalExportar();
}



function cerrarModalExportar() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-exportar');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}

function reproducirTexto(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-ES';
        utterance.rate = 1;
        utterance.pitch = 1;

        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            let spanishVoice = voices.find(voice => voice.lang === 'es-ES');
            if (spanishVoice) utterance.voice = spanishVoice;
            window.speechSynthesis.speak(utterance);
        } else {
            window.speechSynthesis.onvoiceschanged = function() {
                voices = window.speechSynthesis.getVoices();
                let spanishVoice = voices.find(voice => voice.lang === 'es-ES');
                if (spanishVoice) utterance.voice = spanishVoice;
                window.speechSynthesis.speak(utterance);
            };
        }
    } else {
        console.error('La API de Síntesis de Voz no es compatible con este navegador.');
    }
}


function abrirModalIAHerramientas() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-ia-herramientas');
    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'flex';
    if (overlay) {
        overlay.onclick = cerrarModalIAHerramientas;
    }

    const arcosContainer = document.getElementById('ia-arcos-filter-container');
    if (arcosContainer) {
        arcosContainer.innerHTML = ''; 

        const arcosUnicos = obtenerArcosUnicos(); 
        const opcionesArcoMap = new Map(opcionesArco.map(op => [op.valor, op]));

        if (arcosUnicos.length === 0) {
            arcosContainer.innerHTML = '<p style="font-style: italic; font-size: 0.9em; color: #999;">No se encontraron arcos en la sección de Datos.</p>';
            return;
        }

        arcosUnicos.forEach(arcoValor => {
            const opcion = opcionesArcoMap.get(arcoValor);
            const displayName = opcion ? `${opcion.emoji} ${opcion.titulo}` : arcoValor;

            const itemDiv = document.createElement('div');
            itemDiv.style.display = 'flex';
            itemDiv.style.alignItems = 'center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `arc-filter-${arcoValor}`;
            checkbox.value = arcoValor;
            checkbox.className = 'ia-arc-filter-checkbox';
            checkbox.checked = true; 

            const label = document.createElement('label');
            label.htmlFor = `arc-filter-${arcoValor}`;
            label.textContent = displayName;
            label.style.marginLeft = '8px';
            label.style.cursor = 'pointer';

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            arcosContainer.appendChild(itemDiv);
        });
    }
}

function cerrarModalIAHerramientas() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-ia-herramientas');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}
 

    const selectorGeneralBtn = document.getElementById('selector-general-btn-local');
    const informeContainer = document.getElementById('informe-container');
    const bibliotecaContainer = document.getElementById('biblioteca');

    const vistaGeneralPopup = document.createElement('div');
    vistaGeneralPopup.id = 'vista-general-popup';
    vistaGeneralPopup.className = 'lista-guiones-popup-local'; 
    vistaGeneralPopup.style.display = 'none';
    vistaGeneralPopup.style.position = 'absolute';
    vistaGeneralPopup.style.zIndex = '1002';
    document.body.appendChild(vistaGeneralPopup);

    function popularVistaGeneralPopup() {
        vistaGeneralPopup.innerHTML = ''; 

        const informeBtn = document.createElement('button');
        informeBtn.className = 'guion-popup-item-local';
        informeBtn.textContent = 'Informe actual';
        informeBtn.onclick = () => {
            if (informeContainer) informeContainer.style.display = 'block';
            if (bibliotecaContainer) bibliotecaContainer.style.display = 'none';
            vistaGeneralPopup.style.display = 'none';
        };
        vistaGeneralPopup.appendChild(informeBtn);

        const bibliotecaBtn = document.createElement('button');
        bibliotecaBtn.className = 'guion-popup-item-local';
        bibliotecaBtn.textContent = 'Biblioteca';
        bibliotecaBtn.onclick = () => {
            if (bibliotecaContainer) bibliotecaContainer.style.display = 'flex';
            if (informeContainer) informeContainer.style.display = 'none';
            vistaGeneralPopup.style.display = 'none';
        };
        vistaGeneralPopup.appendChild(bibliotecaBtn);
    }

    if (selectorGeneralBtn) {
        selectorGeneralBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isVisible = vistaGeneralPopup.style.display === 'block';

            if (!isVisible) {
                popularVistaGeneralPopup();
                const rect = selectorGeneralBtn.getBoundingClientRect();
                vistaGeneralPopup.style.top = `${rect.bottom + window.scrollY}px`;
                vistaGeneralPopup.style.left = `${rect.left + window.scrollX}px`;
                vistaGeneralPopup.style.display = 'block';
            } else {
                vistaGeneralPopup.style.display = 'none';
            }
        });
    }

    document.addEventListener('click', (event) => {
        if (vistaGeneralPopup.style.display === 'block' && !vistaGeneralPopup.contains(event.target) && event.target !== selectorGeneralBtn) {
            vistaGeneralPopup.style.display = 'none';
        }
    });

    vistaGeneralPopup.addEventListener('click', (event) => {
        event.stopPropagation();
    });


function abrirSelectorDeLibro(event) {
    event.stopPropagation(); 
    const popup = document.getElementById('selector-libro-popup');
    if (!popup) return;

    const isVisible = popup.style.display === 'block';

    if (isVisible) {
        popup.style.display = 'none';
    } else {
        renderizarSelectorDeLibro();
        const rect = event.currentTarget.getBoundingClientRect();
        popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;
        popup.style.display = 'block';
    }
}

function cerrarSelectorDeLibro() {
    const popup = document.getElementById('selector-libro-popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

function renderizarSelectorDeLibro() {
    const popup = document.getElementById('selector-libro-popup');
    if (!popup) return;

    popup.innerHTML = ''; 

    const crearLibroBtn = document.createElement('button');
    crearLibroBtn.className = 'guion-popup-item-local crear-libro-btn-popup';
    crearLibroBtn.innerHTML = '➕ Crear Nuevo Libro';
    crearLibroBtn.onclick = () => crearNuevoLibro();
   // popup.appendChild(crearLibroBtn);

    if (libros.length > 0) {
        popup.appendChild(document.createElement('hr'));
    }
    
    libros.forEach(libro => {
        const libroItem = document.createElement('div');
        libroItem.className = 'guion-popup-item-local libro-item-container';
        libroItem.onclick = () => seleccionarLibro(libro.id);

        const libroTituloSpan = document.createElement('span');
        libroTituloSpan.className = 'libro-popup-titulo';
        libroTituloSpan.textContent = libro.titulo;
        
        const editarBtn = document.createElement('button');
        editarBtn.className = 'libro-popup-editar-btn';
        editarBtn.innerHTML = '✏️';
        editarBtn.title = 'Cambiar nombre';
        editarBtn.onclick = (event) => {
            event.stopPropagation(); 
            iniciarEdicionNombreLibro(event, libro.id);
        };
        
        libroItem.appendChild(libroTituloSpan);
        libroItem.appendChild(editarBtn);
        popup.appendChild(libroItem);
    });
}

function iniciarEdicionNombreLibro(event, libroId) {
    const botonEditar = event.currentTarget;
    const itemContainer = botonEditar.parentElement;
    const tituloSpan = itemContainer.querySelector('.libro-popup-titulo');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = tituloSpan.textContent;
    input.className = 'libro-nombre-input-edicion';
    
    itemContainer.replaceChild(input, tituloSpan);
    input.focus();
    input.select();

    input.addEventListener('blur', () => {
        guardarNuevoNombreLibro(input, libroId);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur(); 
        } else if (e.key === 'Escape') {
            renderizarSelectorDeLibro();
        }
    });
}

function guardarNuevoNombreLibro(inputElement, libroId) {
    const nuevoTitulo = inputElement.value.trim();
    const libro = libros.find(l => l.id === libroId);

    if (libro && nuevoTitulo) {
        libro.titulo = nuevoTitulo;

        if (libro.id === libroActivoId) {
            const tituloContainer = document.getElementById('libro-activo-titulo');
            if (tituloContainer) {
                tituloContainer.textContent = `Libro: ${nuevoTitulo}`;
            }
        }
    }
    renderizarSelectorDeLibro();
}


 

function seleccionarLibro(id) {
    libroActivoId = id;
    const libro = libros.find(l => l.id === id);
    const tituloContainer = document.getElementById('libro-activo-titulo');
    if (libro && tituloContainer) {
        tituloContainer.textContent = `Libro: ${libro.titulo}`;
    }
    cerrarSelectorDeLibro();
    if (typeof actualizarLista === 'function') {
        actualizarLista();
    }
}

function abrirModalSeleccionLibroParaFrames() {
    const modal = document.getElementById('modal-seleccionar-libro-para-frames');
    modal.classList.add('modal-content');

    const overlay = document.getElementById('modal-overlay');
    const listaLibrosContainer = document.getElementById('lista-libros-para-frames');
    const selectGuiones = document.getElementById('guion-origen-select');
    
    if (!modal || !overlay || !listaLibrosContainer || !selectGuiones) return;

    selectGuiones.innerHTML = '';
    if (guionLiterarioData && guionLiterarioData.length > 0) {
        guionLiterarioData.forEach(guion => {
            if (guion.generadoPorIA) { 
                const option = document.createElement('option');
                option.value = guion.titulo;
                option.textContent = guion.titulo;
                selectGuiones.appendChild(option);
            }
        });
    } else {
        selectGuiones.innerHTML = '<option disabled>No hay guiones de IA disponibles</option>';
    }

    listaLibrosContainer.innerHTML = '';
    if (libros.length === 0) {
        listaLibrosContainer.innerHTML = '<p>No hay libros creados. Ve a la sección "Libro" para crear uno.</p>';
    } else {
        libros.forEach(libro => {
            const libroBtn = document.createElement('button');
            libroBtn.className = 'libro-item-seleccion';
            libroBtn.textContent = libro.titulo;
            libroBtn.dataset.libroId = libro.id; 
            libroBtn.onclick = (event) => marcarLibroSeleccionado(event);
            listaLibrosContainer.appendChild(libroBtn);
        });
    }

    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalSeleccionLibro;
}

function marcarLibroSeleccionado(event) {
    const todosLosBotones = document.querySelectorAll('#lista-libros-para-frames .libro-item-seleccion');
    todosLosBotones.forEach(btn => btn.classList.remove('selected'));

    const botonPulsado = event.currentTarget;
    botonPulsado.classList.add('selected');
    libroDestinoSeleccionadoId = botonPulsado.dataset.libroId;
}

function cerrarModalSeleccionLibro() {
    const modal = document.getElementById('modal-seleccionar-libro-para-frames');
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.style.display = 'none';
        overlay.onclick = null;
    }
    libroDestinoSeleccionadoId = null; 
}
 
function confirmarSeleccionYProcesar() {
    const guionSeleccionado = document.getElementById('guion-origen-select').value;

    if (!guionSeleccionado) {
        alert("Por favor, selecciona un guion de la lista.");
        return;
    }
    if (!libroDestinoSeleccionadoId) {
        alert("Por favor, selecciona un libro de destino.");
        return;
    }
 if (typeof reiniciarContadorEscenas === 'function') {
        reiniciarContadorEscenas();
    }
    libroActivoId = libroDestinoSeleccionadoId;

    if (typeof desarrollarFramesDesdeGeminimente === 'function') {
        desarrollarFramesDesdeGeminimente(guionSeleccionado);
    } else {
        alert("Error: La función 'desarrollarFramesDesdeGeminimente' no se encontró.");
    }
    
    cerrarModalSeleccionLibro();
    abrir('capitulosh');
}

 
/**
 * Cierra un elemento modal específico por su ID.
 * @param {string} modalId - El ID del modal que se va a cerrar.
 */
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.warn(`Se intentó cerrar el modal con ID "${modalId}", pero no se encontró.`);
    }
}