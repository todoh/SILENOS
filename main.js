// ===================================
// ARCHIVO PRINCIPAL - INICIALIZACIÓN Y GLOBALES
// ===================================

// --- VARIABLES GLOBALES ---
let guionLiterarioData = [];
let escenas = {}; // Para la sección "Capítulos"
let storyScenes = []; 
// La variable 'momentos' ya no es necesaria, los datos se leen/escriben del DOM.
let activeSceneId = null;

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
    // No cargamos desde localStorage aquí para empezar siempre limpios.
    // La carga se maneja explícitamente con el botón.
    
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
    initMomentos();  // Llama a la inicialización de todas las secciones
};

document.getElementById("titulo-proyecto").addEventListener("input", function() {
    titulo2 = document.getElementById("titulo-proyecto").innerText;
});

// --- FUNCIONES GENERALES DE UI ---
function cerrartodo() {
    document.getElementById('personajes').style.display = 'none';
    document.getElementById('ia').style.display = 'none';
    document.getElementById('escena-vista').style.display = 'none';
    document.getElementById('capitulosh').style.display = 'none';
    document.getElementById('escenah').style.display = 'none';
    document.getElementById('guion-literario').style.display = 'none';
    document.getElementById('momentos').style.display = 'none';
}

function abrir(escena) {
    cerrartodo();
    document.getElementById(escena).style.display = 'flex';

    // =======================================================================
    //  INICIO DE LA CORRECCIÓN
    // =======================================================================
    // Lógica especial para cada sección al abrirla.
    // Esto asegura que ciertos componentes se actualicen siempre que
    // el usuario navegue a su sección correspondiente.
    if (escena === 'momentos') {
        console.log("Abriendo sección Momentos. Actualizando lista de guiones.");
        // Asegura que la lista de guiones para la IA esté siempre actualizada.
        if (typeof cargarGuionesEnDropdown === 'function') {
            cargarGuionesEnDropdown();
        } else {
            console.error("Error: La función cargarGuionesEnDropdown no fue encontrada.");
        }

        // Lógica para centrar el lienzo de momentos
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
    // =======================================================================
    //  FIN DE LA CORRECCIÓN
    // =======================================================================
}


function gridear(escena) {
    cerrartodo();
    document.getElementById(escena).style.display = 'grid';
}

function reiniciarEstadoApp() {
    // Resetear variables de datos
    guionLiterarioData = [];
    escenas = {};
    storyScenes = [];
    activeSceneId = null;
    ultimoId = 0;
    indiceCapituloActivo = -1;

    // Resetear UI
    document.getElementById("titulo-proyecto").innerText = "Silenos Versión 1.1.8";
    document.getElementById("listapersonajes").innerHTML = "";
    document.getElementById("lista-capitulos").innerHTML = "";
    document.getElementById("momentos-lienzo").innerHTML = ""; // Limpiar lienzo de momentos
    
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

/**
 * Función corregida para importar datos JSON.
 * Ahora solo admite 'Datos' (personajes, objetos, etc.).
 * Puede procesar un único objeto JSON o un array de objetos.
 */
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

    // Función interna para procesar un único objeto de dato
    const procesarDato = (dato) => {
        // Valida que el objeto 'dato' tenga la estructura correcta
        if (dato && typeof dato.nombre !== 'undefined' && typeof dato.descripcion !== 'undefined' && typeof dato.etiqueta !== 'undefined') {
            try {
                if (typeof agregarPersonajeDesdeDatos === 'function') {
                    agregarPersonajeDesdeDatos(dato);
                    return true; // Éxito
                }
                return false;
            } catch (e) {
                console.error("Error al intentar añadir el 'Dato': ", dato.nombre, e);
                return false; // Fracaso
            }
        }
        return false; // Estructura incorrecta
    };

    let datosImportados = 0;
    let errores = 0;

    if (Array.isArray(jsonData)) {
        // El usuario pegó un array de datos
        jsonData.forEach(dato => {
            if (procesarDato(dato)) {
                datosImportados++;
            } else {
                errores++;
            }
        });
    } else if (typeof jsonData === 'object' && jsonData !== null) {
        // El usuario pegó un único objeto
        if (procesarDato(jsonData)) {
            datosImportados++;
        } else {
            errores++;
        }
    } else {
        // El formato no es ni un objeto ni un array de objetos
        alert("El JSON proporcionado no es válido. Debe ser un único objeto de 'Dato' o un array de 'Datos'.");
        return;
    }

    // Informar al usuario sobre el resultado
    if (datosImportados > 0) {
        alert(`¡Se importaron ${datosImportados} dato(s) con éxito en la sección "Datos"!`);
        cerrarModalImportar();
        document.getElementById('json-import-area').value = ''; 
    }
    
    if (errores > 0) {
        // Este mensaje solo aparece si hubo tanto éxitos como errores, o solo errores.
        const mensajeError = `Se encontraron ${errores} objeto(s) con formato incorrecto o que no son 'Datos'. Solo se importan los que tienen las claves 'nombre', 'descripcion' y 'etiqueta'.`;
        if (datosImportados === 0) {
             alert(mensajeError);
        } else {
            console.warn(mensajeError); // Si algo se importó, no molestamos con otra alerta, pero lo dejamos en consola.
        }
    }
}


// EN EL ARCHIVO: main.js
// REEMPLAZA LA FUNCIÓN EXISTENTE 'reiniciar' CON ESTA VERSIÓN:

// EN EL ARCHIVO: main.js
// REEMPLAZA LA FUNCIÓN EXISTENTE 'reiniciar' CON ESTA VERSIÓN:

function reiniciar() {
    if (confirm("¿Reiniciar el proyecto? Se perderán todos los cambios no guardados y volverás a la pantalla de inicio.")) {
        
        // 1. Resetea todos los datos internos de la aplicación, como antes.
        reiniciarEstadoApp();

        // 2. Llama a la nueva función que controla la animación de salida.
        if (typeof animacionReiniciar === 'function') {
            animacionReiniciar();
        } else {
            // Si por alguna razón la función no existe, volvemos al método instantáneo.
            console.error("La función animacionReiniciar no fue encontrada. Reiniciando de forma instantánea.");
            document.getElementById('silenos').style.display = 'none';
            document.getElementById('principio').style.display = 'flex';
        }
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
    
    window.cantidaddeescenas = cantidaddeescenas;
    window.cantidadframes = cantidadframes;
}

// --- LÓGICA DEL MODAL DE DATOS CON IA ---
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
// =======================================================================
//  INICIO DE LA CORRECIÓN: Función para poblar el dropdown de guiones
// =======================================================================

/**
 * Carga los títulos de los guiones desde la variable global guionLiterarioData 
 * en el dropdown de la sección 'Momentos'.
 * Esta función es llamada cuando se abre la sección 'Momentos' o cuando se 
 * modifica la lista de guiones.
 */
function cargarGuionesEnDropdown() {
    const guionSelect = document.getElementById('guion-select');
    if (!guionSelect) {
        console.error("Error crítico: No se encontró el elemento <select> con id 'guion-select'.");
        return;
    }

    // Guardar el valor que estaba seleccionado para intentar restaurarlo después
    const valorSeleccionadoAnteriormente = guionSelect.value;
    
    // 1. Limpiar completamente las opciones existentes
    guionSelect.innerHTML = '';

    // 2. Crear y añadir una opción por defecto (placeholder)
    const placeholder = document.createElement('option');
    placeholder.value = ""; // Sin valor para que no sea una selección válida

    if (guionLiterarioData.length === 0) {
        placeholder.textContent = "No hay guiones creados";
        placeholder.disabled = true; // Deshabilitar si no hay guiones
    } else {
        placeholder.textContent = "Selecciona un guion...";
    }
    guionSelect.appendChild(placeholder);

    // 3. Poblar el dropdown con los guiones disponibles
    guionLiterarioData.forEach(guion => {
        // Solo añadir guiones que tengan un título
        if (guion.titulo && guion.titulo.trim() !== "") {
            const option = document.createElement('option');
            option.value = guion.titulo; // El valor de la opción será el título del guion
            option.textContent = guion.titulo; // El texto visible será también el título
            guionSelect.appendChild(option);
        }
    });

    // 4. Intentar restaurar la selección que tenía el usuario
    guionSelect.value = valorSeleccionadoAnteriormente || "";
}

// =======================================================================
//  FIN DE LA CORRECIÓN
// =======================================================================


// AÑADIR ESTE CÓDIGO AL ARCHIVO: main.js

/**
 * Abre el modal de Opciones de Exportación.
 * Al abrirse, se encarga de poblar el selector de momentos iniciales.
 */
function abrirModalExportar() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-exportar');
    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'flex';
    if (overlay) {
        overlay.onclick = function() {
            cerrarModalExportar();
        }
    }

    // --- ¡ESTA ES LA LÍNEA CLAVE! ---
    // Llama a la función para llenar el dropdown cada vez que se abre el modal.
    if (typeof poblarSelectorMomentoInicial === 'function') {
        poblarSelectorMomentoInicial();
    } else {
        console.error("La función para poblar el selector de momentos no está disponible.");
    }
}

/**
 * Cierra el modal de Opciones de Exportación.
 */
function cerrarModalExportar() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-exportar');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}