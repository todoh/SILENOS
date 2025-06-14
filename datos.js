// ===================================
// GESTIÓN DE DATOS Y ETIQUETAS
// ===================================

const opcionesEtiqueta = [
    { emoji: '⦾', valor: 'indeterminado', titulo: 'Indeterminado' },
    { emoji: '🧍', valor: 'personaje', titulo: 'Personaje' },
    { emoji: '🗺️', valor: 'ubicacion', titulo: 'Ubicación' },
    { emoji: '🗓️', valor: 'evento', titulo: 'Evento' },
    { emoji: '🛠️', valor: 'objeto', titulo: 'Objeto' },
    { emoji: '💭', valor: 'concepto', titulo: 'Concepto' },
    { emoji: '📝', valor: 'nota', titulo: 'Nota' },
];

// Función de ayuda para convertir un archivo a formato Base64
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
 */
function mostrarMenuEtiquetas(botonEtiqueta) {
    // Elimina cualquier menú anterior para evitar duplicados
    const menuExistente = document.querySelector('.menu-etiquetas');
    if (menuExistente) menuExistente.remove();

    const menu = document.createElement('div');
    menu.className = 'menu-etiquetas';

    opcionesEtiqueta.forEach(opcion => {
        const itemMenu = document.createElement('div');
        itemMenu.className = 'item-menu-etiqueta';
        itemMenu.textContent = `${opcion.emoji} ${opcion.titulo}`;
        
        itemMenu.onclick = (e) => {
            e.stopPropagation(); // Evita que el clic se propague y cierre el overlay
            botonEtiqueta.innerHTML = opcion.emoji;
            botonEtiqueta.title = `Etiqueta: ${opcion.titulo}`;
            botonEtiqueta.dataset.etiqueta = opcion.valor;
            menu.remove();
        };
        menu.appendChild(itemMenu);
    });

    document.body.appendChild(menu);
    const rect = botonEtiqueta.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;

    // Cierra el menú si se hace clic en cualquier otro lugar
    const cerrarMenuHandler = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', cerrarMenuHandler, true);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenuHandler, true), 100);
}

/**
 * Crea y añade un nuevo elemento de "Dato" al DOM.
 * @param {object} personajeData - El objeto con los datos del personaje/dato.
 */
function agregarPersonajeDesdeDatos(personajeData = {}) {
    const { 
        nombre = '', 
        descripcion = '', 
        imagen = '', 
        etiqueta: etiquetaValor = 'indeterminado' 
    } = personajeData;

    const lista = document.getElementById('listapersonajes');
    if (!lista) return;

    // --- Contenedor Principal de la Tarjeta ---
    const contenedor = document.createElement('div');
    contenedor.className = 'personaje';

    // --- Parte Visual (El cuadrado clicable) ---
    const visual = document.createElement('div');
    visual.className = 'personaje-visual';
    
    const img = document.createElement('img');
    const descripcionPreview = document.createElement('div');
    descripcionPreview.className = 'personaje-descripcion-preview';
    
    // Función para actualizar la visibilidad y contenido
    const actualizarVisual = (nuevaImagenSrc, nuevaDescripcion) => {
        img.src = nuevaImagenSrc || '';
        descripcionPreview.textContent = nuevaDescripcion;
        
        if (img.src && !img.src.endsWith('/')) { // Si hay una URL de imagen válida
             img.classList.remove('hidden');
        } else {
             img.classList.add('hidden');
        }
    };
    
    img.onerror = () => { img.classList.add('hidden'); };
    img.onload = () => {
        if (img.src && !img.src.endsWith('/')) {
            img.classList.remove('hidden');
        }
    }
    
    visual.appendChild(img);
    visual.appendChild(descripcionPreview);
    contenedor.appendChild(visual);

    // --- Nombre (posicionado debajo del cuadrado) ---
    const cajaNombre = document.createElement('input');
    cajaNombre.type = 'text';
    cajaNombre.className = 'nombreh';
    cajaNombre.value = nombre;
    cajaNombre.placeholder = 'Nombre';
    contenedor.appendChild(cajaNombre);

    // --- Overlay de Edición (inicialmente oculto) ---
    const overlay = document.createElement('div');
    overlay.className = 'personaje-edit-overlay';
    const editControls = document.createElement('div');
    editControls.className = 'edit-controls';
    const cajaTexto = document.createElement('textarea');
    cajaTexto.value = descripcion;
    cajaTexto.placeholder = 'Descripción...';
    // Actualiza la vista previa en tiempo real mientras se escribe
    cajaTexto.addEventListener('input', () => {
        actualizarVisual(img.src, cajaTexto.value);
    });
    editControls.appendChild(cajaTexto);

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'edit-buttons-wrapper';

    // Botón para cambiar imagen
    const botonCargar = document.createElement('button');
    botonCargar.className = 'edit-btn change-image-btn';
    botonCargar.innerHTML = '📷';
    botonCargar.title = 'Cambiar Imagen';
    botonCargar.onclick = () => {
        const inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = 'image/*, video/mp4, video/webm, image/gif';
        inputFile.onchange = async (event) => {
            if (event.target.files && event.target.files[0]) {
                const nuevaImagen = await fileToBase64(event.target.files[0]);
                actualizarVisual(nuevaImagen, cajaTexto.value);
            }
        };
        inputFile.click();
    };
    buttonsWrapper.appendChild(botonCargar);

    // Botón para elegir etiqueta
    const etiquetaBtn = document.createElement('button');
    etiquetaBtn.className = 'edit-btn change-tag-btn';
    const opcionGuardada = opcionesEtiqueta.find(op => op.valor === etiquetaValor) || opcionesEtiqueta[0];
    etiquetaBtn.innerHTML = opcionGuardada.emoji;
    etiquetaBtn.title = `Etiqueta: ${opcionGuardada.titulo}`;
    etiquetaBtn.dataset.etiqueta = opcionGuardada.valor;
    etiquetaBtn.onclick = () => mostrarMenuEtiquetas(etiquetaBtn);
    buttonsWrapper.appendChild(etiquetaBtn);
    
    // Botón para eliminar dato
    const botonEliminar = document.createElement('button');
    botonEliminar.className = 'edit-btn delete-btn';
    botonEliminar.innerHTML = '🗑️';
    botonEliminar.title = 'Eliminar Dato';
    botonEliminar.onclick = () => {
        // Usamos un modal de confirmación personalizado en lugar de `confirm()` si es posible.
        // Por ahora, `confirm` es una solución simple.
        if (confirm(`¿Estás seguro de que quieres eliminar "${cajaNombre.value || 'este dato'}"?`)) {
            contenedor.remove();
        }
    };
    buttonsWrapper.appendChild(botonEliminar);

    editControls.appendChild(buttonsWrapper);
    overlay.appendChild(editControls);
    contenedor.appendChild(overlay);

    lista.appendChild(contenedor);
    
    // Llamada inicial para establecer el estado correcto al crear la tarjeta
    actualizarVisual(imagen, descripcion);
}


function agregarPersonaje() {
    agregarPersonajeDesdeDatos();
}


function inicializarInteraccionPersonajes() {
    const listaPersonajesEl = document.getElementById('listapersonajes');
    if (!listaPersonajesEl) return;

    listaPersonajesEl.addEventListener('click', (e) => {
        const visualClicked = e.target.closest('.personaje-visual');
        if (visualClicked) {
            const personajeActual = visualClicked.closest('.personaje');
            if (!personajeActual) return;
            const personajeActivo = document.querySelector('.personaje.editing');
            if (personajeActivo && personajeActivo !== personajeActual) {
                personajeActivo.classList.remove('editing');
            }
            personajeActual.classList.toggle('editing');
        }
    });

    document.addEventListener('click', (e) => {
        const personajeActivo = document.querySelector('.personaje.editing');
        if (personajeActivo && !e.target.closest('.personaje.editing')) {
             personajeActivo.classList.remove('editing');
        }
    }, true);
}

document.addEventListener('DOMContentLoaded', inicializarInteraccionPersonajes);


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
        deleteButton.textContent = 'Eliminar';
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