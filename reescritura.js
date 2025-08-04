// =================================================================
// SILENOS - MÓDULO DE REESCRITURA CON IA
// =================================================================

/**
 * Inicia el proceso de reescritura para un ÚNICO capítulo.
 * Pide confirmación al usuario antes de proceder.
 * @param {string} capituloId - El ID del capítulo a reescribir.
 */
async function iniciarReescrituraCapitulo(capituloId) {
    if (!confirm("¿Reescribir únicamente este capítulo usando la IA?\nSe usará el guion original como guía. El contenido actual del capítulo se reemplazará.")) {
        return;
    }

    const contexto = _obtenerContextoLibro();
    if (!contexto) return;

    try {
        if (typeof progressBarManager !== 'undefined') {
            progressBarManager.start(`Reescribiendo Capítulo...`, null, true); // El tercer parámetro indica que es una tarea corta
        }

        await _reescribirUnSoloCapitulo(capituloId, contexto);

        if (typeof progressBarManager !== 'undefined') {
            progressBarManager.finish("Capítulo reescrito con éxito.");
        }
        alert("El capítulo ha sido reescrito.");

    } catch (error) {
        console.error("Error al reescribir el capítulo:", error);
        if (typeof progressBarManager !== 'undefined') {
            progressBarManager.error(`Error: ${error.message}`);
        }
        alert(`No se pudo reescribir el capítulo: ${error.message}`);
    }
}

/**
 * Inicia el proceso de reescritura desde un capítulo seleccionado HASTA EL FINAL.
 * Pide confirmación al usuario ya que es una acción destructiva.
 * @param {string} capituloIdInicial - El ID del capítulo desde el cual empezar a reescribir.
 */
async function iniciarReescrituraDesdeCapitulo(capituloIdInicial) {
    if (!confirm("ADVERTENCIA: ¿Reescribir la historia desde este capítulo hasta el final?\nSe eliminarán y reemplazarán todos los capítulos siguientes. Esta acción no se puede deshacer.")) {
        return;
    }

    const contexto = _obtenerContextoLibro();
    if (!contexto) return;

    try {
        if (typeof progressBarManager !== 'undefined') {
            progressBarManager.start(`Iniciando reescritura total...`);
        }

        await _reescribirMultiplesCapitulos(capituloIdInicial, contexto);

        if (typeof progressBarManager !== 'undefined') {
            progressBarManager.finish("La historia ha sido reescrita desde el punto seleccionado.");
        }
        alert("La historia ha sido reescrita con éxito.");

    } catch (error) {
        console.error("Error en la reescritura múltiple:", error);
        if (typeof progressBarManager !== 'undefined') {
            progressBarManager.error(`Error: ${error.message}`);
        }
        alert(`No se pudo completar la reescritura: ${error.message}`);
    }
}

// --- FUNCIONES INTERNAS (PRIVADAS) ---

/**
 * Obtiene el contexto de IA guardado para el libro activo.
 * @returns {object|null} El objeto de contexto o null si no se encuentra.
 */
function _obtenerContextoLibro() {
    if (!libroActivoId || !libros[libroActivoId]) {
        alert("Error: No hay un libro activo seleccionado.");
        return null;
    }
    const contexto = libros[libroActivoId].iaContext;
    if (!contexto || !contexto.resumenPorEscenas) {
        alert("Este libro no fue generado por la IA o no tiene un guion guardado. No se puede reescribir.");
        return null;
    }
    return contexto;
}

/**
 * Orquesta la reescritura de un solo capítulo.
 * @param {string} capituloId - El ID del capítulo.
 * @param {object} contexto - El contexto de IA del libro.
 */
async function _reescribirUnSoloCapitulo(capituloId, contexto) {
    const { indice, capitulosDelLibro } = _obtenerIndiceYCapitulosDelLibro(capituloId);

    if (indice === -1) {
        throw new Error("No se pudo encontrar el capítulo en la estructura del libro.");
    }

    progressBarManager.set(20, `Obteniendo contexto del capítulo anterior...`);

    let contextoEscenaAnterior = "";
    if (indice > 0) {
        const capituloAnteriorId = capitulosDelLibro[indice - 1];
        const framesAnteriores = escenas[capituloAnteriorId].frames.map(f => f.texto).join("\n");
        contextoEscenaAnterior = `Contenido del capítulo anterior para dar continuidad: ${framesAnteriores}`;
    }

    progressBarManager.set(50, `Llamando a la IA para generar nuevo contenido...`);

    const nuevoContenidoCapitulo = await _generarContenidoCapitulo(indice, contexto, contextoEscenaAnterior);

    progressBarManager.set(80, `Actualizando datos del capítulo...`);

    // Actualizar el capítulo existente
    const capituloExistente = escenas[capituloId];
    capituloExistente.texto = nuevoContenidoCapitulo.titulo_escena_desarrollada;
    capituloExistente.frames = nuevoContenidoCapitulo.frames_desarrollados.map(f => ({
        texto: f.contenido_frame || "",
        imagen: "" // La imagen se reinicia, se puede generar de nuevo
    }));
    capituloExistente.generadoPorIA = true; // Reafirmar que es de IA

    guardarCambios();
    actualizarLista();
}

/**
 * Orquesta la reescritura de múltiples capítulos, eliminando los antiguos primero.
 * @param {string} capituloIdInicial - El ID del capítulo de inicio.
 * @param {object} contexto - El contexto de IA del libro.
 */
async function _reescribirMultiplesCapitulos(capituloIdInicial, contexto) {
    const { indice: indiceInicial, capitulosDelLibro } = _obtenerIndiceYCapitulosDelLibro(capituloIdInicial);

    if (indiceInicial === -1) {
        throw new Error("No se pudo encontrar el capítulo de inicio.");
    }

    progressBarManager.set(10, `Eliminando capítulos antiguos...`);
    _eliminarCapitulosDesdeIndice(indiceInicial, capitulosDelLibro);
    
    let contextoEscenaAnterior = "";
    if (indiceInicial > 0) {
        const capituloAnteriorId = capitulosDelLibro[indiceInicial - 1];
        const framesAnteriores = escenas[capituloAnteriorId].frames.map(f => f.texto).join("\n");
        contextoEscenaAnterior = `Contenido del capítulo anterior para dar continuidad: ${framesAnteriores}`;
    }

    for (let i = indiceInicial; i < contexto.resumenPorEscenas.length; i++) {
        const progress = 20 + (70 * (i - indiceInicial) / (contexto.resumenPorEscenas.length - indiceInicial));
        progressBarManager.set(progress, `Reescribiendo capítulo ${i + 1}/${contexto.resumenPorEscenas.length}...`);

        const nuevoContenido = await _generarContenidoCapitulo(i, contexto, contextoEscenaAnterior);

        // Crear un nuevo capítulo con el contenido generado
        const nuevoCapituloId = `${libroActivoId}-capitulo-${Date.now()}`;
        escenas[nuevoCapituloId] = {
            tipo: "generica",
            texto: nuevoContenido.titulo_escena_desarrollada,
            imagen: "",
            opciones: [],
            botones: [],
            frames: nuevoContenido.frames_desarrollados.map(f => ({ texto: f.contenido_frame || "", imagen: "" })),
            generadoPorIA: true,
            libroId: libroActivoId
        };
        
        // El contenido recién generado se convierte en el contexto para el siguiente
        contextoEscenaAnterior = `Contenido del capítulo anterior para dar continuidad: ` + nuevoContenido.frames_desarrollados.map(f => f.contenido_frame).join("\n");

        guardarCambios();
        actualizarLista(); // Actualizar la UI para ver el progreso en tiempo real
        await new Promise(resolve => setTimeout(resolve, 200)); // Pequeña pausa
    }
}

/**
 * Llama a la IA para generar el contenido de un capítulo específico.
 * @param {number} indiceCapitulo - El índice del capítulo a generar (0-based).
 * @param {object} contexto - El contexto de IA del libro.
 * @param {string} contextoEscenaAnterior - El texto de la escena anterior.
 * @returns {Promise<object>} La respuesta JSON de la IA con el contenido del capítulo.
 */
async function _generarContenidoCapitulo(indiceCapitulo, contexto, contextoEscenaAnterior) {
    const resumenEspecifico = contexto.resumenPorEscenas[indiceCapitulo].resumen_escena;
    const prompt = `
        **Instrucción de Idioma OBLIGATORIA:** Tu respuesta COMPLETA debe estar en el mismo idioma que el Título General.

        Título General: ${contexto.tituloOriginal}
        Planteamiento General de la Historia: ${contexto.planteamientoGeneral}
        Resumen Específico del Capítulo ${indiceCapitulo + 1}: ${resumenEspecifico}
        ${contextoEscenaAnterior ? `${contextoEscenaAnterior}` : ""}
        
        **Instrucción de Relevancia:** Puedes usar estos datos como inspiración: ${JSON.stringify(contexto.datosUsados, null, 2)}
        
        **Tarea Principal:** Desarrolla el capítulo ${indiceCapitulo + 1} siguiendo ESTRICTAMENTE el resumen y dando continuidad a la historia. Divídelo en ${window.cantidadframes || 4} frames y dale un título al capítulo.
        **Formato JSON OBLIGATORIO:** {"titulo_escena_desarrollada": "string", "frames_desarrollados": [{"contenido_frame": "string"}]}`;

    // Reutilizamos la función robusta de geminialfa.js
    // Asegúrate que llamarIAConFeedback esté disponible globalmente o impórtala si usas módulos.
    return await llamarIAConFeedback(prompt, `Reescritura Capítulo ${indiceCapitulo + 1}`, 'gemini-1.5-flash');
}

/**
 * Obtiene el índice de un capítulo y la lista ordenada de todos los capítulos del libro.
 * @param {string} capituloId - El ID del capítulo a buscar.
 * @returns {{indice: number, capitulosDelLibro: string[]}}
 */
function _obtenerIndiceYCapitulosDelLibro(capituloId) {
    const capitulosDelLibro = Object.keys(escenas)
        .filter(id => escenas[id].libroId === libroActivoId)
        .sort(); // Asumimos un orden basado en ID (timestamp) o podrías necesitar una key de orden.
    const indice = capitulosDelLibro.indexOf(capituloId);
    return { indice, capitulosDelLibro };
}

/**
 * Elimina capítulos del objeto 'escenas' a partir de un índice dado.
 * @param {number} indiceInicial - El índice a partir del cual eliminar.
 * @param {string[]} capitulosDelLibro - Array de IDs de capítulos ordenados.
 */
function _eliminarCapitulosDesdeIndice(indiceInicial, capitulosDelLibro) {
    for (let i = indiceInicial; i < capitulosDelLibro.length; i++) {
        const idParaEliminar = capitulosDelLibro[i];
        delete escenas[idParaEliminar];
    }
    guardarCambios();
    actualizarLista();
}