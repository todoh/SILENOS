// ===================================
// ARCHIVO PRINCIPAL - INICIALIZACIÓN Y GLOBALES
// ===================================

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


// --- INICIALIZACIÓN DE LA APLICACIÓN ---
window.onload = function() {
    // Ahora que el DOM está cargado, es seguro asignar valores a las variables que dependen de él.
    titulo2 = document.getElementById("titulo-proyecto").innerText;
    chatDiv = document.getElementById("chat");

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
    
};


// --- FUNCIONES GENERALES DE UI ---
function cerrartodo() {
    document.getElementById('personajes').style.display = 'none';
    document.getElementById('ia').style.display = 'none';
    document.getElementById('escena-vista').style.display = 'none';
    document.getElementById('capitulosh').style.display = 'none';
    document.getElementById('escenah').style.display = 'none';
    document.getElementById('biblioteca').style.display = 'none';
    document.getElementById('guion-literario').style.display = 'none';
    document.getElementById('momentos').style.display = 'none';
    document.getElementById('galeria').style.display = 'none';
        document.getElementById('vistageneral').style.display = 'none';
 


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
                 informeContainer.innerHTML = '<p style="text-align: center; margin-top: 2rem;">Haz clic en "Analizar Datos del Proyecto" para generar un nuevo informe.</p>';
            }
        }
    }

    if (escena === 'biblioteca') {
        const todasLasImagenes = recopilarTodasLasImagenes();
        renderizarGaleria(todasLasImagenes);
    }

   // Llamamos a la función una sola vez, pasándole el nombre de la escena activa.
   actualizarBotonContextual(escena); 
}

function gridear(escena) {
    cerrartodo();
    document.getElementById(escena).style.display = 'grid';
        actualizarBotonContextual();   
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
    document.getElementById("titulo-proyecto").innerText = "Silenos Versión 1.1.8";
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
 * Actualiza la visibilidad, el icono y la función del botón de acción contextual
 * basándose en la sección que está actualmente visible en la aplicación.
 */
/**
 * Actualiza la visibilidad, el icono y la función del botón de acción contextual
 * basándose en la sección activa Y en si la API Key está configurada.
 */
function actualizarBotonContextual() {
    const btn = document.getElementById('contextual-action-btn');
    if (!btn) return;

    if (typeof apiKey === 'undefined' || !apiKey || !apiKey.trim()) {
        btn.style.display = 'none';
        return;
    }

    const seccionesVisibles = [
        'personajes', 'momentos', 'capitulosh', 'escenah', 'guion-literario'
    ];

    const idSeccionActiva = seccionesVisibles.find(id => {
        const seccion = document.getElementById(id);
        return seccion && seccion.style.display !== 'none';
    });

    if (idSeccionActiva) {
        btn.innerHTML = '✨';
        btn.style.display = 'flex';

        if (idSeccionActiva === 'personajes') {
            btn.title = 'Analizar o importar datos con IA';
            btn.onclick = abrirModalAIDatos;
        } else if (idSeccionActiva === 'momentos') { // <-- ESTE ES EL CAMBIO PRINCIPAL
            btn.title = 'Generar Aventura con IA';
            btn.onclick = abrirModalMomentosIA; // Llama a la nueva función de momentos.js
        } else {
            btn.title = 'Abrir Herramientas de IA';
            btn.onclick = abrirModalIAHerramientas;
        }
    } else {
        btn.style.display = 'none';
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
        document.execCommand('copy');
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
    
    // --- LÓGICA CONSOLIDADA PARA POBLAR TODOS LOS SELECTORES ---

    // Poblar el selector de momentos para el videojuego
    if (typeof poblarSelectorMomentoInicial === 'function') {
        poblarSelectorMomentoInicial();
    } else {
        console.error("La función para poblar el selector de momentos (poblarSelectorMomentoInicial) no está disponible.");
    }

    // Poblar el selector de escenas de tomas
    const selectEscenasTomas = document.getElementById('tomas-export-select');
    if (selectEscenasTomas) {
        selectEscenasTomas.innerHTML = ''; // Limpiar opciones anteriores
        selectEscenasTomas.disabled = false;

        if (typeof storyScenes !== 'undefined' && storyScenes.length > 0) {
            // Opción para exportar todas las escenas
            const todasOption = document.createElement('option');
            todasOption.value = 'all';
            todasOption.textContent = 'Todas las Escenas';
            selectEscenasTomas.appendChild(todasOption);

            // Añadir cada escena individualmente
            storyScenes.forEach(escena => {
                const option = document.createElement('option');
                option.value = escena.id;
                option.textContent = escena.nombre || 'Escena sin título';
                selectEscenasTomas.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No hay escenas de tomas';
            option.disabled = true;
            selectEscenasTomas.appendChild(option);
        }
    }
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

    // --- INICIO DE LA LÓGICA AÑADIDA ---
    // Poblar la lista de arcos narrativos disponibles
    const arcosContainer = document.getElementById('ia-arcos-filter-container');
    if (arcosContainer) {
        arcosContainer.innerHTML = ''; // Limpiar lista anterior

        // Obtener arcos únicos y las opciones predefinidas
        const arcosUnicos = obtenerArcosUnicos(); // Asumiendo que esta función ya existe en datos.js
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
            checkbox.checked = true; // Por defecto, todos marcados

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
    // --- FIN DE LA LÓGICA AÑADIDA ---
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
 

 // --- NUEVA LÓGICA: Selector para la sección Vista General ---
    const selectorGeneralBtn = document.getElementById('selector-general-btn-local');
    const informeContainer = document.getElementById('informe-container');
    const bibliotecaContainer = document.getElementById('biblioteca');

    // Crear el popup dinámicamente para mantener el HTML limpio
    const vistaGeneralPopup = document.createElement('div');
    vistaGeneralPopup.id = 'vista-general-popup';
    vistaGeneralPopup.className = 'lista-guiones-popup-local'; // Reutilizar estilos existentes
    vistaGeneralPopup.style.display = 'none';
    vistaGeneralPopup.style.position = 'absolute';
    vistaGeneralPopup.style.zIndex = '1002';
    document.body.appendChild(vistaGeneralPopup);

    function popularVistaGeneralPopup() {
        vistaGeneralPopup.innerHTML = ''; // Limpiar contenido previo

        // Botón para "Informe actual"
        const informeBtn = document.createElement('button');
        informeBtn.className = 'guion-popup-item-local';
        informeBtn.textContent = 'Informe actual';
        informeBtn.onclick = () => {
            if (informeContainer) informeContainer.style.display = 'block';
            if (bibliotecaContainer) bibliotecaContainer.style.display = 'none';
            vistaGeneralPopup.style.display = 'none';
        };
        vistaGeneralPopup.appendChild(informeBtn);

        // Botón para "Biblioteca"
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

    // Listener global para cerrar el popup de Vista General al hacer clic fuera
    document.addEventListener('click', (event) => {
        if (vistaGeneralPopup.style.display === 'block' && !vistaGeneralPopup.contains(event.target) && event.target !== selectorGeneralBtn) {
            vistaGeneralPopup.style.display = 'none';
        }
    });

    // Evitar que el popup se cierre al hacer clic dentro de él
    vistaGeneralPopup.addEventListener('click', (event) => {
        event.stopPropagation();
    });
