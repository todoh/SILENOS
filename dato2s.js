// Opciones de etiquetas predefinidas para los datos.
const opcionesEtiqueta = [
    { emoji: '⦾', valor: 'indeterminado', titulo: 'Indeterminado' },
    { emoji: '🧍', valor: 'personaje', titulo: 'Personaje' },
    { emoji: '🗺️', valor: 'ubicacion', titulo: 'Ubicación' },
    { emoji: '🗓️', valor: 'evento', titulo: 'Evento' },
    { emoji: '🛠️', valor: 'objeto', titulo: 'Objeto' },
    { emoji: '💭', valor: 'concepto', titulo: 'Concepto' },
    { emoji: '📝', valor: 'nota', titulo: 'Nota' },
    { emoji: '👁️‍🗨️', valor: 'visual', titulo: 'Visual' },
    { emoji: '✒️', valor: 'personalizar', titulo: 'Personalizar' }
];

// Variables globales para el estado de los datos.
let capitulos = [];
let capituloSeleccionado = 0;

/**
 * Inserta los estilos CSS necesarios para la nueva vista agrupada de datos.
 * Esto evita tener que modificar el archivo CSS principal.
 */
function injectarEstilosDatos() {
    const style = document.createElement('style');
    style.id = 'dynamic-datos-styles'; // ID to prevent duplicate styles
    if (document.getElementById(style.id)) return;

    style.textContent = `
        /* Cambia el contenedor principal para que los grupos se apilen verticalmente */
        #datos-container {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        .grupo-datos-header {
            width: 100%;
            padding: 8px 12px;
            margin-top: 20px;
            margin-bottom: 10px;
            background-color: var(--color-fondo-secundario); /* Usar variable de color */
            color: var(--color-texto-principal);
            font-weight: bold;
            border-radius: 6px;
            box-sizing: border-box;
            border-bottom: 2px solid var(--color-bordes);
        }

        .grupo-datos-header:first-child {
            margin-top: 0;
        }

        .grupo-datos-container {
            display: flex;
            flex-wrap: wrap;
            gap: 15px; /* Espacio entre tarjetas */
            width: 100%;
        }
    `;
    document.head.appendChild(style);
}


// Función de ayuda para convertir un archivo a formato Base64.
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Muestra un menú emergente para seleccionar una etiqueta.
 * @param {HTMLElement} botonEtiqueta - El botón que activó el menú.
 * @param {object} dato - El objeto de dato asociado.
 * @param {number} index - El índice del dato en el array.
 */
function mostrarMenuEtiquetas(botonEtiqueta, dato, index) {
    // Elimina menús existentes para evitar duplicados.
    const menuExistente = document.querySelector('.menu-etiquetas');
    if (menuExistente) {
        menuExistente.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'menu-etiquetas';
    document.body.appendChild(menu);

    opcionesEtiqueta.forEach(opcionData => {
        const opcion = document.createElement('div');
        opcion.className = 'opcion-etiqueta';
        opcion.textContent = `${opcionData.emoji} ${opcionData.titulo}`;

        opcion.onclick = (e) => {
            e.stopPropagation();
            if (opcionData.valor === 'personalizar') {
                // Lógica para crear una etiqueta personalizada.
                opcion.innerHTML = '';
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'Nombre de la etiqueta...';
                input.className = 'input-etiqueta-personalizada';
                opcion.appendChild(input);
                input.focus();

                input.onkeydown = (e) => {
                    if (e.key === 'Enter' && input.value.trim() !== '') {
                        const nuevoTitulo = input.value.trim();
                        const nuevoValor = nuevoTitulo.toLowerCase().replace(/\s+/g, '_');
                        const nuevoEmoji = '🔖';

                        if (!opcionesEtiqueta.some(opt => opt.valor === nuevoValor)) {
                            opcionesEtiqueta.splice(opcionesEtiqueta.length - 1, 0, {
                                emoji: nuevoEmoji,
                                valor: nuevoValor,
                                titulo: nuevoTitulo
                            });
                        }
                        actualizarDato(index, { tipo: nuevoValor });
                        menu.remove();
                    }
                };
                input.onblur = () => menu.remove();

            } else {
                actualizarDato(index, { tipo: opcionData.valor });
                menu.remove();
            }
        };
        menu.appendChild(opcion);
    });

    // Posicionamiento del menú.
    const rect = botonEtiqueta.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 5}px`;

    // Cierra el menú si se hace clic fuera.
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(event) {
            if (!menu.contains(event.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);
}

/**
 * Crea y devuelve el elemento HTML para una tarjeta de dato.
 * @param {object} dato - El objeto con la información del dato.
 * @param {number} index - El índice del dato para identificarlo.
 * @returns {HTMLElement} La tarjeta de dato creada.
 */
function crearTarjetaDato(dato, index) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'dato-tarjeta';

    const header = document.createElement('div');
    header.className = 'dato-header';

    const botonEtiqueta = document.createElement('button');
    botonEtiqueta.className = 'boton-etiqueta';
    const infoEtiqueta = opcionesEtiqueta.find(opt => opt.valor === dato.tipo) || { emoji: '🔖', titulo: dato.tipo };
    botonEtiqueta.textContent = infoEtiqueta.emoji;
    botonEtiqueta.title = `Etiqueta: ${infoEtiqueta.titulo}`;
    botonEtiqueta.onclick = (e) => {
        e.stopPropagation();
        mostrarMenuEtiquetas(botonEtiqueta, dato, index);
    };

    const tituloInput = document.createElement('input');
    tituloInput.type = 'text';
    tituloInput.value = dato.titulo;
    tituloInput.className = 'dato-titulo-input';
    tituloInput.placeholder = 'Título...';
    tituloInput.onchange = () => actualizarDato(index, { titulo: tituloInput.value });

    const acciones = document.createElement('div');
    acciones.className = 'dato-acciones';
    const eliminarBtn = document.createElement('button');
    eliminarBtn.textContent = '×';
    eliminarBtn.title = 'Eliminar dato';
    eliminarBtn.className = 'eliminar-dato-btn';
    eliminarBtn.onclick = () => eliminarDato(index);
    acciones.appendChild(eliminarBtn);

    header.appendChild(botonEtiqueta);
    header.appendChild(tituloInput);
    header.appendChild(acciones);

    const contenido = document.createElement('div');
    contenido.className = 'dato-contenido';

    const imagenContainer = document.createElement('div');
    imagenContainer.className = 'dato-imagen-container';
    const imagen = document.createElement('img');
    imagen.src = dato.imagen || 'placeholder.png'; // Usar un placeholder si no hay imagen
    imagen.onerror = () => { imagen.src = 'placeholder.png'; imagen.style.opacity = '0.5'; };
    imagenContainer.appendChild(imagen);
    const overlayImagen = document.createElement('div');
    overlayImagen.className = 'overlay-imagen';
    overlayImagen.textContent = 'Cambiar imagen';
    imagenContainer.appendChild(overlayImagen);

    imagenContainer.onclick = () => {
        const inputArchivo = document.createElement('input');
        inputArchivo.type = 'file';
        inputArchivo.accept = 'image/*';
        inputArchivo.onchange = async (e) => {
            if (e.target.files && e.target.files[0]) {
                const base64 = await fileToBase64(e.target.files[0]);
                actualizarDato(index, { imagen: base64 });
            }
        };
        inputArchivo.click();
    };

    const descripcionTextarea = document.createElement('textarea');
    descripcionTextarea.value = dato.contenido;
    descripcionTextarea.className = 'dato-descripcion-textarea';
    descripcionTextarea.placeholder = 'Descripción...';
    descripcionTextarea.onchange = () => actualizarDato(index, { contenido: descripcionTextarea.value });

    contenido.appendChild(imagenContainer);
    contenido.appendChild(descripcionTextarea);

    tarjeta.appendChild(header);
    tarjeta.appendChild(contenido);

    return tarjeta;
}

/**
 * Renderiza todos los datos del capítulo seleccionado, agrupándolos por tipo.
 */
function renderizarDatos() {
    if (!capitulos[capituloSeleccionado]) return;

    const datos = capitulos[capituloSeleccionado].datos;
    const datosContainer = document.getElementById('datos-container');
    datosContainer.innerHTML = '';

    // 1. Agrupar datos por 'tipo'.
    const datosAgrupados = datos.reduce((acc, dato, index) => {
        const tipo = dato.tipo || 'indeterminado';
        if (!acc[tipo]) {
            acc[tipo] = [];
        }
        // Guardar el dato con su índice original para poder editarlo/eliminarlo.
        acc[tipo].push({ ...dato, originalIndex: index });
        return acc;
    }, {});

    // 2. Determinar el orden de renderizado de los grupos.
    const ordenGruposExistentes = new Set(opcionesEtiqueta.map(opt => opt.valor));
    Object.keys(datosAgrupados).forEach(tipo => ordenGruposExistentes.add(tipo));
    const ordenFinal = Array.from(ordenGruposExistentes).filter(valor => valor !== 'personalizar');

    // 3. Renderizar cada grupo.
    ordenFinal.forEach(tipo => {
        if (datosAgrupados[tipo] && datosAgrupados[tipo].length > 0) {
            const infoEtiqueta = opcionesEtiqueta.find(opt => opt.valor === tipo) || { titulo: tipo };

            // Crear el encabezado del grupo (ej: "Personajes").
            const headerGrupo = document.createElement('div');
            headerGrupo.className = 'grupo-datos-header';
            headerGrupo.textContent = infoEtiqueta.titulo;
            datosContainer.appendChild(headerGrupo);

            // Crear el contenedor para las tarjetas de este grupo.
            const grupoContainer = document.createElement('div');
            grupoContainer.className = 'grupo-datos-container';

            // Renderizar las tarjetas del grupo.
            datosAgrupados[tipo].forEach(datoConIndice => {
                const tarjeta = crearTarjetaDato(datoConIndice, datoConIndice.originalIndex);
                grupoContainer.appendChild(tarjeta);
            });
            datosContainer.appendChild(grupoContainer);
        }
    });

    actualizarTituloGuion();
}


/**
 * Actualiza un campo específico de un dato y vuelve a renderizar la lista.
 * @param {number} index - El índice del dato a actualizar.
 * @param {object} nuevosValores - Un objeto con los campos y valores a actualizar.
 */
function actualizarDato(index, nuevosValores) {
    if (capitulos[capituloSeleccionado] && capitulos[capituloSeleccionado].datos[index]) {
        Object.assign(capitulos[capituloSeleccionado].datos[index], nuevosValores);
        renderizarDatos();
    }
}

/**
 * Elimina un dato del capítulo actual y vuelve a renderizar la lista.
 * @param {number} index - El índice del dato a eliminar.
 */
function eliminarDato(index) {
    if (capitulos[capituloSeleccionado] && capitulos[capituloSeleccionado].datos[index]) {
        capitulos[capituloSeleccionado].datos.splice(index, 1);
        renderizarDatos();
    }
}

/**
 * Agrega una nueva tarjeta de dato en blanco al capítulo actual.
 */
function agregarNuevoDato() {
    if (!capitulos.length) {
        capitulos.push({ titulo: "Nuevo Guion", datos: [] });
        capituloSeleccionado = 0;
    }
    capitulos[capituloSeleccionado].datos.push({
        titulo: '',
        contenido: '',
        imagen: '',
        tipo: 'indeterminado'
    });
    renderizarDatos();
}

/**
 * Actualiza el título del guion que se muestra en la cabecera.
 */
function actualizarTituloGuion() {
    const tituloGuionActual = document.getElementById('titulo-guion-actual');
    if (capitulos.length > 0) {
        tituloGuionActual.textContent = capitulos[capituloSeleccionado].titulo;
    } else {
        tituloGuionActual.textContent = "Sin guion seleccionado";
    }
}

/**
 * Cambia al capítulo seleccionado y renderiza sus datos.
 * @param {number} index - El índice del capítulo a mostrar.
 */
function mostrarCapituloSeleccionado(index) {
    capituloSeleccionado = index;
    renderizarDatos();
}

/**
 * Recopila los datos de todos los capítulos y los exporta a un archivo JSON.
 */
function exportarDatos() {
    if (capitulos.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }
    const datosParaExportar = JSON.stringify(capitulos, null, 2);
    const blob = new Blob([datosParaExportar], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'datos_silenos.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Maneja la importación de datos desde un archivo JSON.
 * @param {Event} event - El evento del input de archivo.
 */
function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const datosImportados = JSON.parse(e.target.result);
            if (Array.isArray(datosImportados) && datosImportados.every(cap => cap.hasOwnProperty('titulo') && cap.hasOwnProperty('datos'))) {
                capitulos = datosImportados;
                capituloSeleccionado = 0;
                renderizarDatos();
                alert("Datos importados con éxito.");
            } else {
                throw new Error("El formato del archivo no es válido.");
            }
        } catch (error) {
            alert(`Error al importar el archivo: ${error.message}`);
        }
    };
    reader.readAsText(file);
}

// Event Listeners y configuración inicial
document.addEventListener('DOMContentLoaded', () => {
    const datosEditor = document.getElementById('datos-editor');
    const agregarDatoBtn = document.getElementById('agregar-dato-btn');
    const importBtn = document.getElementById('importar-btn');
    const importInput = document.getElementById('importar-input');
    const exportBtn = document.getElementById('exportar-btn');
    const selectorBtn = document.getElementById('selector-de-guion-btn');
    const popup = document.getElementById('popup-guiones');

    // Inyecta los estilos necesarios para la vista de grupos.
    injectarEstilosDatos();

    // Lógica para mostrar/ocultar el editor de datos (asumiendo que otro script lo maneja).

    // Botones de la interfaz
    if (agregarDatoBtn) {
        agregarDatoBtn.addEventListener('click', agregarNuevoDato);
    }
    if(exportBtn) {
        exportBtn.addEventListener('click', exportarDatos);
    }
    if(importBtn) {
        importBtn.addEventListener('click', () => importInput.click());
    }
    if(importInput){
        importInput.addEventListener('change', importarDatos);
    }

    // --- Lógica del selector de guion ---
    function popularListaGuiones() {
        popup.innerHTML = '';
        capitulos.forEach((capitulo, index) => {
            const item = document.createElement('div');
            item.className = 'popup-item';
            item.textContent = capitulo.titulo;

            // Al hacer clic en un guion de la lista, lo muestra y cierra el popup.
            item.onclick = () => {
                mostrarCapituloSeleccionado(index);
                popup.style.display = 'none';
            };
            popup.appendChild(item);
        });
    }

    // 1. Evento principal: Abrir/cerrar el popup al hacer clic en el botón '☰'.
    selectorBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isVisible = popup.style.display === 'block';
        if (!isVisible) {
            popularListaGuiones();
            popup.style.display = 'block';
        } else {
            popup.style.display = 'none';
        }
    });

    // 2. Cierra el popup si se hace clic fuera.
    document.addEventListener('click', () => {
        if (popup.style.display === 'block') {
            popup.style.display = 'none';
        }
    });

    // 3. Evita que el popup se cierre al hacer clic dentro de él.
    popup.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    // Carga inicial (o dejarlo para que otro script lo maneje).
    if (capitulos.length === 0) {
        agregarNuevoDato(); // Crea un primer guion por defecto
        capitulos[0].datos = []; // Empieza sin datos
    }
    renderizarDatos();
});

// =========================================================================
// OTRAS FUNCIONES (IA, etc.) - Sin modificar
// =========================================================================

async function procesarEntradaConIA() {
    const textoUsuario = document.getElementById('ia-datos-area').value.trim();
    if (!textoUsuario) {
        alert("Por favor, introduce algún texto para analizar.");
        return;
    }
    cerrarModalAIDatos();
    const chatDiv = window.chatDiv || document.getElementById('chat');
    chatDiv.innerHTML += `<p><strong>Solicitud enviada:</strong> Analizando entrada...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;
    const pareceJson = textoUsuario.startsWith('[') || textoUsuario.startsWith('{');
    if (pareceJson) {
        chatDiv.innerHTML += `<p><strong>Info:</strong> Se ha detectado una estructura tipo JSON. Se intentará formatear.</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
        const promptCorreccion = `
        Rol: Eres un asistente experto en formateo de datos para una aplicación de escritura llamada Silenos.
        Tarea: Convierte la siguiente cadena de texto en un array JSON válido que siga la estructura de Silenos.
        Estructura de Salida Requerida por Objeto:
        {
          "nombre": "string",
          "descripcion": "string",
          "etiqueta": "string",
          "imagen": ""
        }
        Instrucciones Clave:
        1.  **Sintetiza la Descripción:** Combina toda la información relevante del objeto de entrada (como 'casa', 'vestimenta', 'estilo', etc.) en un único y coherente párrafo de texto para el campo "descripcion".
        2.  **Asigna una Etiqueta:** Basado en el contenido, asigna la etiqueta más apropiada (ej: 'personaje', 'estilo', 'ubicacion').
        3.  **No Inventes Nada:** No añadas información que no esté en el texto de entrada.
        4.  **No Identifiques la Obra:** No menciones de qué libro o película son los datos. Tu única tarea es la conversión estructural.
        Texto a convertir:
        ---
        ${textoUsuario}
        ---
        Responde ÚNICAMENTE con el array JSON corregido y formateado. No añadas explicaciones.`;
        try {
            const respuestaCorregida = await llamarIAConFeedback(promptCorreccion, "formateando JSON a la estructura de Silenos");
            if (Array.isArray(respuestaCorregida) && respuestaCorregida.length > 0 && respuestaCorregida.every(d => d.nombre && d.descripcion && d.etiqueta)) {
                let importados = 0;
                respuestaCorregida.forEach(dato => {
                    agregarPersonajeDesdeDatos(dato);
                    importados++;
                });
                alert(`La IA formateó la entrada y se importaron ${importados} datos.`);
                document.getElementById('ia-datos-area').value = '';
            } else {
                throw new Error("La IA no pudo formatear el JSON a la estructura esperada o devolvió un array vacío.");
            }
        } catch (error) {
            alert("Error al intentar formatear el JSON con la IA. " + error.message);
            console.error("Error formateando JSON:", error);
        }
        return;
    }
    chatDiv.innerHTML += `<p><strong>Info:</strong> Se detectó texto plano. Se asumirá que es una obra de ficción y se procederá a su análisis detallado.</p>`;
    try {
        const promptCategorias = `
        Analiza el nombre de la siguiente obra de ficción: "${textoUsuario}".
        Tu tarea es identificar y listar las categorías de datos más importantes y relevantes de esta obra (por ejemplo: Personajes Principales, Personajes Secundarios, Lugares Clave, Objetos Mágicos, Facciones, Eventos Históricos, Criaturas, etc.).
        Responde ÚNICAMENTE con un objeto JSON válido. La estructura debe ser:
        {
          "categorias_identificadas": ["Categoría 1", "Categoría 2", "Categoría 3"]
        }`;
        const respuestaCategorias = await llamarIAConFeedback(promptCategorias, `Paso 1: Identificando categorías para "${textoUsuario}"`);
        const categorias = respuestaCategorias.categorias_identificadas;
        if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
            throw new Error("La IA no pudo identificar categorías relevantes para la obra proporcionada.");
        }
        chatDiv.innerHTML += `<p><strong>Categorías encontradas:</strong> ${categorias.join(', ')}. Iniciando extracción detallada...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
        let totalDatosImportados = 0;
        for (const categoria of categorias) {
            let exitoCategoria = false;
            let reintentos = 0;
            const maxReintentos = 2;

            while (!exitoCategoria && reintentos < maxReintentos) {
                try {
                    if (reintentos > 0) {
                        chatDiv.innerHTML += `<p><strong>Reintentando...</strong> (intento ${reintentos + 1}) para la categoría: <strong>${categoria}</strong></p>`;
                    } else {
                        chatDiv.innerHTML += `<p><strong>Extrayendo...</strong> solicitando datos para la categoría: <strong>${categoria}</strong></p>`;
                    }
                    chatDiv.scrollTop = chatDiv.scrollHeight;
                    
                    const etiquetaSugerida = categoria.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                    const promptDetalles = `
                    Para la obra "${textoUsuario}", genera una lista de elementos que pertenecen a la categoría "${categoria}".
                    Para cada elemento, proporciona una descripción EXTREMADAMENTE DETALLADA.
                    Responde ÚNICAMENTE con un objeto JSON válido en formato de array. Cada objeto debe tener: {"nombre": "...", "descripcion": "...", "etiqueta": "${etiquetaSugerida}", "imagen": ""}`;

                    const respuestaDetalles = await llamarIAConFeedback(promptDetalles, `Paso 2: Extrayendo detalles de "${categoria}"`);
                    
                    if (Array.isArray(respuestaDetalles) && respuestaDetalles.length > 0) {
                        let importadosCategoria = 0;
                        respuestaDetalles.forEach(dato => {
                            if (dato.nombre && dato.descripcion && dato.etiqueta) {
                                agregarPersonajeDesdeDatos(dato);
                                importadosCategoria++;
                            }
                        });
                        totalDatosImportados += importadosCategoria;
                        chatDiv.innerHTML += `<p><strong>Éxito:</strong> Se agregaron ${importadosCategoria} datos de la categoría "${categoria}".</p>`;
                        exitoCategoria = true;
                    } else {
                        throw new Error(`La IA no devolvió datos para la categoría "${categoria}".`);
                    }

                } catch (errorCategoria) {
                    reintentos++;
                    chatDiv.innerHTML += `<p><strong>Error en categoría "${categoria}"</strong> (intento ${reintentos}): ${errorCategoria.message}</p>`;
                    if (reintentos >= maxReintentos) {
                        chatDiv.innerHTML += `<p><strong>Fallo definitivo:</strong> No se pudieron extraer datos para "${categoria}".</p>`;
                    }
                }
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }
        }
        
        if (totalDatosImportados > 0) {
            alert(`¡Proceso completado! Se importaron un total de ${totalDatosImportados} datos detallados.`);
            document.getElementById('ia-datos-area').value = '';
        } else {
            alert("El proceso finalizó, pero no se pudo importar ningún dato. Revisa el panel de chat para más información.");
        }

    } catch (error) {
        alert("Ocurrió un error general al procesar la solicitud. Revisa el panel de chat y la consola para más detalles.\n\nMensaje: " + error.message);
        console.error("Error en procesarEntradaConIA:", error);
    } finally {
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}
/**
 * Adds a delete button to each character element.
 * This function assumes character elements have a class 'personaje' 
 * and that you have a function to handle the actual data deletion.
 */
function agregarBotonEliminarAPersonajes() {
    // Select all character containers. We'll assume they have the class '.personaje' based on your CSS.
    const personajes = document.querySelectorAll('.personaje');

    personajes.forEach(personajeDiv => {
        // Prevent adding a button if one already exists
        if (personajeDiv.querySelector('.eliminar-personaje-btn')) {
            return;
        }

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '';
        deleteButton.className = 'eliminar-personaje-btn pro'; // Add classes for styling

        // Add the click event to handle the deletion
        deleteButton.onclick = function(event) {
            // Stop the click from propagating to parent elements
            event.stopPropagation();

            // Confirm before deleting
            if (confirm('¿Estás seguro de que quieres eliminar este dato?')) {
                // Here, you would typically remove the character from your data array first.
                // For example:
                // const characterId = personajeDiv.dataset.id; // Assuming you set a data-id attribute
                // eliminarDatoPorId(characterId); // A function you would create in datos.js

                // Then, remove the element from the DOM
                personajeDiv.remove();
            }
        };

        // Append the button to the character's div
        personajeDiv.appendChild(deleteButton);
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const selectorBtn = document.getElementById('selector-guion-btn-local');
    const popup = document.getElementById('lista-guiones-popup-local');

    // Si el botón existe en la página actual, le añadimos la funcionalidad.
    if (selectorBtn && popup) {
        
        // Función para llenar el popup con la lista de capítulos (guiones).
        function popularListaGuiones() {
            popup.innerHTML = ''; // Limpia la lista anterior para no duplicar.

            // Usa el array 'guionLiterarioData' que ya tienes en tu código.
            guionLiterarioData.forEach((capitulo, index) => {
                const item = document.createElement('button');
                item.className = 'guion-popup-item-local'; // Estilo definido en styles.css.
                item.textContent = capitulo.titulo;
                
                // Al hacer clic en un guion de la lista, lo muestra y cierra el popup.
                item.onclick = () => {
                    mostrarCapituloSeleccionado(index); // Función que ya usas para mostrar capítulos.
                    popup.style.display = 'none';
                };
                popup.appendChild(item);
            });
        }

        // 1. Evento principal: Abrir/cerrar el popup al hacer clic en el botón '☰'.
        selectorBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Evita que el clic se propague y cierre el menú inmediatamente.
            
            const isVisible = popup.style.display === 'block';

            if (!isVisible) {
                popularListaGuiones(); // Rellena la lista cada vez que se abre.
                popup.style.display = 'block';
            } else {
                popup.style.display = 'none';
            }
        });

        // 2. Evento secundario: Cerrar el popup si se hace clic en cualquier otro lugar de la página.
        document.addEventListener('click', () => {
            if (popup.style.display === 'block') {
                popup.style.display = 'none';
            }
        });

        // 3. Evitar que el popup se cierre al hacer clic dentro de él.
        popup.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
});
