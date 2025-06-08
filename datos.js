// ===================================
// GESTIÓN DE DATOS (PERSONAJES, ETC.) Y ETIQUETAS
// ===================================

const opcionesEtiqueta = [
    { emoji: '⦾', valor: 'indeterminado', titulo: 'Indeterminado' },
    { emoji: '🧍', valor: 'personaje', titulo: 'Personaje' },
    { emoji: '🗺️', valor: 'ubicacion', titulo: 'Ubicación' },
    { emoji: '🗓️', valor: 'evento', titulo: 'Evento' },
    { emoji: '🛠️', valor: 'objeto', titulo: 'Objeto' },
    { emoji: '💭', valor: 'concepto', titulo: 'Concepto' },
    { emoji: '📝', valor: 'nota', titulo: 'Nota' },
    { emoji: '✒️', valor: 'personalizar', titulo: 'Personalizar...' }
];

/**
 * Aplica o elimina los estilos para las etiquetas personalizadas.
 * @param {HTMLElement} element El elemento <span> de la etiqueta.
 * @param {'custom'|'default'} type El tipo de estilo a aplicar.
 */
function setEtiquetaStyles(element, type) {
    if (type === 'custom') {
        element.style.background = 'white';
        element.style.color = 'black';
        element.style.padding = '2px 5px';
        element.style.borderRadius = '3px';
        element.style.fontSize = '12px';
        element.style.border = '1px solid #333';
        element.style.fontFamily = 'Arial, sans-serif';
    } else {
        element.style.background = '';
        element.style.color = '';
        element.style.padding = '';
        element.style.borderRadius = '';
        element.style.fontSize = '24px'; // Tamaño para emojis
        element.style.border = '';
        element.style.fontFamily = '';
    }
}

function mostrarMenuEtiquetas(etiquetaElement) {
    const menuExistente = document.querySelector('.menu-etiquetas');
    if (menuExistente) {
        menuExistente.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'menu-etiquetas';
    menu.style.position = 'absolute';
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '5px';
    menu.style.zIndex = '999999999';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

    opcionesEtiqueta.forEach(opcion => {
        const itemMenu = document.createElement('div');
        itemMenu.className = 'item-menu-etiqueta';
        itemMenu.textContent = `${opcion.emoji} ${opcion.titulo}`;
        itemMenu.style.padding = '8px 12px';
        itemMenu.style.cursor = 'pointer';
        itemMenu.style.color = '#333';

        itemMenu.onmouseover = () => { itemMenu.style.backgroundColor = '#f0f0f0'; };
        itemMenu.onmouseout = () => { itemMenu.style.backgroundColor = 'white'; };

        itemMenu.onclick = (e) => {
            e.stopPropagation();
            menu.remove();
            if (opcion.valor === 'personalizar') {
                setEtiquetaStyles(etiquetaElement, 'custom');
                etiquetaElement.textContent = 'Personalizar';
                etiquetaElement.contentEditable = true;
                etiquetaElement.focus();
                
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(etiquetaElement);
                selection.removeAllRanges();
                selection.addRange(range);

                const onBlurHandler = () => {
                    etiquetaElement.contentEditable = false;
                    const nombreEtiqueta = etiquetaElement.textContent.trim();
                    const valorEtiqueta = nombreEtiqueta.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

                    if (valorEtiqueta) {
                        etiquetaElement.dataset.etiqueta = valorEtiqueta;
                        etiquetaElement.textContent = nombreEtiqueta;
                        etiquetaElement.title = `Etiqueta: ${nombreEtiqueta}`;
                        setEtiquetaStyles(etiquetaElement, 'custom');
                    } else {
                        const opcionIndeterminada = opcionesEtiqueta[0];
                        etiquetaElement.dataset.etiqueta = opcionIndeterminada.valor;
                        etiquetaElement.textContent = opcionIndeterminada.emoji;
                        etiquetaElement.title = `Etiqueta: ${opcionIndeterminada.titulo}`;
                        setEtiquetaStyles(etiquetaElement, 'default');
                    }
                    etiquetaElement.removeEventListener('blur', onBlurHandler);
                    etiquetaElement.removeEventListener('keydown', onKeydownHandler);
                };

                const onKeydownHandler = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        etiquetaElement.blur();
                    }
                };

                etiquetaElement.addEventListener('blur', onBlurHandler);
                etiquetaElement.addEventListener('keydown', onKeydownHandler);
            } else {
                etiquetaElement.contentEditable = false;
                etiquetaElement.textContent = opcion.emoji;
                etiquetaElement.dataset.etiqueta = opcion.valor;
                etiquetaElement.title = `Etiqueta: ${opcion.titulo}`;
                setEtiquetaStyles(etiquetaElement, 'default');
            }
        };
        menu.appendChild(itemMenu);
    });

    document.body.appendChild(menu);
    const rect = etiquetaElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (menu.offsetWidth / 2)}px`;

    const cerrarMenu = (e) => {
        if (!menu.contains(e.target) && e.target !== etiquetaElement) {
            menu.remove();
            document.removeEventListener('click', cerrarMenu, true);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', cerrarMenu, true);
    }, 100);
}

/**
 * Crea y añade un nuevo elemento de "Dato" al DOM a partir de un objeto de datos.
 * Si ya existe un dato sin imagen con el mismo nombre y etiqueta, fusiona las descripciones.
 * @param {object} personajeData El objeto con los datos del personaje/dato.
 */
function agregarPersonajeDesdeDatos(personajeData) {
    if (!personajeData || typeof personajeData.nombre === 'undefined' || typeof personajeData.descripcion === 'undefined' || typeof personajeData.etiqueta === 'undefined') {
        console.error("Los datos proporcionados son incompletos. Se requiere nombre, descripción y etiqueta.", personajeData);
        return; // Salir si los datos son inválidos
    }

    const nombreNuevo = personajeData.nombre.trim();
    const etiquetaNueva = personajeData.etiqueta;

    // --- INICIO: LÓGICA DE FUSIÓN ---
    if (!personajeData.imagen) {
        const listapersonajes = document.getElementById('listapersonajes').children;
        for (const personajeNode of listapersonajes) {
            const nombreExistenteEl = personajeNode.querySelector("input.nombreh");
            const etiquetaExistenteEl = personajeNode.querySelector(".etiqueta-personaje");
            const imagenExistenteEl = personajeNode.querySelector("img");

            const nombreExistente = nombreExistenteEl?.value.trim() || "";
            const etiquetaExistente = etiquetaExistenteEl?.dataset.etiqueta || "";
            const tieneImagenExistente = imagenExistenteEl?.src && imagenExistenteEl.src.startsWith('data:image');

            if (nombreExistente.toLowerCase() === nombreNuevo.toLowerCase() && etiquetaExistente === etiquetaNueva && !tieneImagenExistente) {
                const descripcionTextarea = personajeNode.querySelector("textarea");
                if (descripcionTextarea) {
                    const descripcionAntigua = descripcionTextarea.value;
                    const descripcionNueva = personajeData.descripcion;
                    
                    if (descripcionNueva && !descripcionAntigua.includes(descripcionNueva)) {
                        descripcionTextarea.value += `\n\n---\n\n${descripcionNueva}`;
                        console.log(`Dato fusionado: "${nombreNuevo}" (Etiqueta: ${etiquetaNueva}).`);
                    }
                    
                    return;
                }
            }
        }
    }
    // --- FIN: LÓGICA DE FUSIÓN ---


    let contenedor = document.createElement('div');
    contenedor.classList.add('personaje');
    contenedor.style.position = 'relative';

    let etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta-personaje';
    
    const etiquetaValor = personajeData.etiqueta || 'indeterminado';
    const opcionGuardada = opcionesEtiqueta.find(op => op.valor === etiquetaValor);

    if (opcionGuardada && opcionGuardada.valor !== 'personalizar') {
        etiqueta.textContent = opcionGuardada.emoji;
        etiqueta.dataset.etiqueta = opcionGuardada.valor;
        etiqueta.title = `Etiqueta: ${opcionGuardada.titulo}`;
        setEtiquetaStyles(etiqueta, 'default');
    } else { 
        const nombreEtiqueta = etiquetaValor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        etiqueta.textContent = nombreEtiqueta;
        etiqueta.dataset.etiqueta = etiquetaValor;
        etiqueta.title = `Etiqueta: ${nombreEtiqueta}`;
        setEtiquetaStyles(etiqueta, 'custom');
    }
    
    etiqueta.style.position = 'absolute';
    etiqueta.style.top = '10px';
    etiqueta.style.right = '10px';
    etiqueta.style.cursor = 'pointer';
    etiqueta.style.zIndex = '888888888';
    etiqueta.onclick = () => mostrarMenuEtiquetas(etiqueta);
    contenedor.appendChild(etiqueta);

    let cajaNombre = document.createElement('input');
    cajaNombre.type = 'text';
    cajaNombre.placeholder = 'Nombre';
    cajaNombre.value = personajeData.nombre;
    cajaNombre.classList.add('nombreh');
    contenedor.appendChild(cajaNombre);

    let cajaTexto = document.createElement('textarea');
    cajaTexto.placeholder = 'Descripción';
    cajaTexto.rows = 4;
    cajaTexto.cols = 30;
    cajaTexto.value = personajeData.descripcion;
    contenedor.appendChild(cajaTexto);
    
    let contenedorImagen = document.createElement('div');
    let imagen = document.createElement('img');
    imagen.src = personajeData.imagen || ''; 
    imagen.style.maxWidth = '340px';
    imagen.style.maxHeight = '95%';
    contenedorImagen.appendChild(imagen);
    
    let botonCargar = document.createElement('button');
    botonCargar.innerText = '📷';
    botonCargar.onclick = function() {
        let inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = 'image/*, video/mp4, video/webm, image/gif';
        inputFile.onchange = async function(event) {
            let archivo = event.target.files[0];
            if (archivo) {
                let base64Data = await fileToBase64(archivo);
                if (base64Data) {
                    imagen.src = base64Data;
                }
            }
        };
        inputFile.click();
    };
    contenedorImagen.appendChild(botonCargar);

    let botonEliminar = document.createElement('button');
    botonEliminar.innerText = 'X';
    botonEliminar.className = 'ideframeh';
    botonEliminar.onclick = function() {
        if (confirm("¿Estás seguro de que quieres eliminar este dato?")) {
            contenedor.remove();
        }
    };
    contenedorImagen.appendChild(botonEliminar);
    contenedor.appendChild(contenedorImagen);
    document.getElementById('listapersonajes').appendChild(contenedor);
}

function agregarPersonaje() {
    let contenedor = document.createElement('div');
    contenedor.classList.add('personaje');
    contenedor.style.position = 'relative';

    let etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta-personaje';
    etiqueta.dataset.etiqueta = 'indeterminado';
    etiqueta.textContent = '⦾';
    etiqueta.title = 'Etiqueta: Indeterminado';
    etiqueta.style.position = 'absolute';
    etiqueta.style.top = '10px';
    etiqueta.style.right = '10px';
    etiqueta.style.fontSize = '24px';
    etiqueta.style.cursor = 'pointer';
    etiqueta.style.zIndex = '888888888';
    etiqueta.onclick = () => mostrarMenuEtiquetas(etiqueta);
    contenedor.appendChild(etiqueta);

    let cajaNombre = document.createElement('input');
    cajaNombre.type = 'text';
    cajaNombre.placeholder = 'Nombre';
    cajaNombre.style.width = '100%';
    cajaNombre.style.marginBottom = '10px';
    cajaNombre.style.fontSize = 'x-large';
    cajaNombre.classList.add('nombreh');
    contenedor.appendChild(cajaNombre);

    let cajaTexto = document.createElement('textarea');
    cajaTexto.placeholder = 'Descripción';
    cajaTexto.rows = 4;
    cajaTexto.cols = 30;
    contenedor.appendChild(cajaTexto);
    
    let contenedorImagen = document.createElement('div');
    let imagen = document.createElement('img');
    imagen.src = ''; 
    imagen.style.maxWidth = '340px';
    imagen.style.maxHeight = '95%';
    contenedorImagen.appendChild(imagen);
    
    let botonCargar = document.createElement('button');
    botonCargar.innerText = '�';
    botonCargar.onclick = function() {
        let inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = 'image/*, video/mp4, video/webm, image/gif';
        inputFile.onchange = async function(event) {
            let archivo = event.target.files[0];
            if (archivo) {
                let base64Data = await fileToBase64(archivo);
                if (base64Data) {
                    imagen.src = base64Data;
                }
            }
        };
        inputFile.click();
    };
    contenedorImagen.appendChild(botonCargar);

    let botonEliminar = document.createElement('button');
    botonEliminar.innerText = 'X';
    botonEliminar.className = 'ideframeh';
    botonEliminar.onclick = function() {
        if (confirm("¿Estás seguro de que quieres eliminar este dato?")) {
            contenedor.remove();
        }
    };
    contenedorImagen.appendChild(botonEliminar);
    contenedor.appendChild(contenedorImagen);
    document.getElementById('listapersonajes').appendChild(contenedor);
}

function agregarBotonEliminarAPersonajes() {
    const personajes = document.getElementById('listapersonajes').children;
    for (let personaje of personajes) {
        if (personaje.querySelector('button.ideframeh')) continue;
        let botonEliminar = document.createElement('button');
        botonEliminar.innerText = 'X';
        botonEliminar.className = 'ideframeh';
        botonEliminar.onclick = function() {
            if (confirm("¿Estás seguro de que quieres eliminar este dato?")) {
                personaje.remove();
            }
        };
        const contenedorImagen = personaje.querySelector('div');
        if (contenedorImagen) {
            contenedorImagen.appendChild(botonEliminar);
        }
    }
}

/**
 * Procesa la entrada del usuario desde el modal de IA. Distingue entre JSON,
 * una obra de ficción, o datos en bruto, y aplica la lógica correspondiente.
 * Incluye un protocolo de reintento para la extracción de datos.
 */
async function procesarEntradaConIA() {
    const textoUsuario = document.getElementById('ia-datos-area').value.trim();
    if (!textoUsuario) {
        alert("Por favor, introduce algún texto para analizar.");
        return;
    }

    // Cerrar modal y mostrar feedback inicial
    cerrarModalAIDatos();
    const chatDiv = window.chatDiv || document.getElementById('chat');
    chatDiv.innerHTML += `<p><strong>Solicitud enviada:</strong> Analizando entrada...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    // --- LÓGICA DE DETECCIÓN MEJORADA ---
    const pareceJson = textoUsuario.startsWith('[') || textoUsuario.startsWith('{');

    // --- ESCENARIO A: LA ENTRADA PARECE SER JSON ---
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

    // --- ESCENARIO B: LA ENTRADA ES TEXTO PLANO (OBRA DE FICCIÓN) ---
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
            const maxReintentos = 2; // Intentar 1 vez + 1 reintento

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
                        exitoCategoria = true; // Salir del bucle de reintento
                    } else {
                        throw new Error(`La IA no devolvió datos para la categoría "${categoria}".`);
                    }

                } catch (errorCategoria) {
                    reintentos++;
                    chatDiv.innerHTML += `<p><strong>Error en categoría "${categoria}"</strong> (intento ${reintentos}): ${errorCategoria.message}</p>`;
                    if (reintentos >= maxReintentos) {
                        chatDiv.innerHTML += `<p><strong>Fallo definitivo:</strong> No se pudieron extraer datos para "${categoria}".</p>`;
                    } else {
                        await sleep(2000); // Esperar antes de reintentar
                    }
                }
                chatDiv.scrollTop = chatDiv.scrollHeight;
            } // Fin del while de reintentos
        } // Fin del for de categorías
        
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
