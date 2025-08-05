// =================================================================
// SILENOS - MÓDULO DE REESCRITURA Y POBLADO AVANZADO CON IA (GRANULAR)
// =================================================================

/**
 * Inicia el proceso de reescritura para un ÚNICO capítulo.
 */
async function iniciarReescrituraCapitulo(capituloId) {
    if (!confirm("¿Reescribir únicamente este capítulo usando la IA?\nSe usará el guion original como guía. El contenido actual del capítulo se reemplazará.")) {
        return;
    }
    const contexto = _obtenerContextoLibro();
    if (!contexto) return;

    try {
        if (typeof progressBarManager !== 'undefined') progressBarManager.start(`Reescribiendo Capítulo...`);
        await _reescribirUnSoloCapitulo(capituloId, contexto);
        if (typeof progressBarManager !== 'undefined') progressBarManager.finish("Capítulo reescrito con éxito.");
        alert("El capítulo ha sido reescrito.");
    } catch (error) {
        console.error("Error al reescribir el capítulo:", error);
        if (typeof progressBarManager !== 'undefined') progressBarManager.error(`Error: ${error.message}`);
        alert(`No se pudo reescribir el capítulo: ${error.message}`);
    }
}

/**
 * Inicia el proceso de reescritura desde un capítulo seleccionado HASTA EL FINAL.
 */
async function iniciarReescrituraDesdeCapitulo(capituloIdInicial) {
    if (!confirm("ADVERTENCIA: ¿Reescribir la historia desde este capítulo hasta el final?\nSe eliminarán y reemplazarán todos los capítulos siguientes.")) {
        return;
    }
    const contexto = _obtenerContextoLibro();
    if (!contexto) return;

    try {
        if (typeof progressBarManager !== 'undefined') progressBarManager.start(`Iniciando reescritura total...`);
        await _reescribirMultiplesCapitulos(capituloIdInicial, contexto);
        if (typeof progressBarManager !== 'undefined') progressBarManager.finish("La historia ha sido reescrita desde el punto seleccionado.");
        alert("La historia ha sido reescrita con éxito.");
    } catch (error) {
        console.error("Error en la reescritura múltiple:", error);
        if (typeof progressBarManager !== 'undefined') progressBarManager.error(`Error: ${error.message}`);
        alert(`No se pudo completar la reescritura: ${error.message}`);
    }
}

// --- FUNCIONES INTERNAS (PRIVADAS) ---

/**
 * Obtiene el contexto de IA guardado para el libro activo.
 */
function _obtenerContextoLibro() {
    if (!libroActivoId || !libros) {
        alert("Error: No hay un libro activo seleccionado.");
        return null;
    }
    const libroActivo = libros.find(l => l.id === libroActivoId);
    if (!libroActivo) {
        alert("Error: No se pudo encontrar el libro activo.");
        return null;
    }
    const contexto = libroActivo.iaContext;
    if (!contexto || !contexto.resumenPorEscenas) {
        alert("Este libro no tiene un guion de IA vinculado. No se puede reescribir.");
        return null;
    }
    return contexto;
}

/**
 * Orquesta la reescritura de un solo capítulo, frame por frame.
 */
async function _reescribirUnSoloCapitulo(capituloId, contexto) {
    const { indice, capitulosDelLibro } = _obtenerIndiceYCapitulosDelLibro(capituloId);
    if (indice === -1) throw new Error("No se pudo encontrar el capítulo.");

    let contextoCapituloAnterior = "";
    if (indice > 0) {
        const capituloAnteriorId = capitulosDelLibro[indice - 1];
        if (escenas[capituloAnteriorId]) {
            contextoCapituloAnterior = escenas[capituloAnteriorId].frames.map(f => f.texto).join("\n\n");
        }
    }

    // Borra los frames existentes para reescribirlos
    escenas[capituloId].frames = [];
    escenas[capituloId].texto = `Reescribiendo Capítulo ${indice + 1}...`;
    guardarCambios();
    actualizarLista();

    await _generarCapituloFramePorFrame(capituloId, indice, contexto, contextoCapituloAnterior);
}

/**
 * Orquesta la reescritura de múltiples capítulos, frame por frame.
 */
async function _reescribirMultiplesCapitulos(capituloIdInicial, contexto) {
    const { indice: indiceInicial, capitulosDelLibro } = _obtenerIndiceYCapitulosDelLibro(capituloIdInicial);
    if (indiceInicial === -1) throw new Error("No se pudo encontrar el capítulo de inicio.");

    progressBarManager.set(5, `Eliminando capítulos antiguos...`);
    _eliminarCapitulosDesdeIndice(indiceInicial, capitulosDelLibro);
    
    let contextoCapituloAnterior = "";
    if (indiceInicial > 0) {
        const capituloAnteriorId = capitulosDelLibro[indiceInicial - 1];
        if (escenas[capituloAnteriorId]) {
            contextoCapituloAnterior = escenas[capituloAnteriorId].frames.map(f => f.texto).join("\n\n");
        }
    }

    for (let i = indiceInicial; i < contexto.resumenPorEscenas.length; i++) {
        const nuevoCapituloId = `${libroActivoId}-capitulo-${Date.now() + i}`;
        escenas[nuevoCapituloId] = {
            tipo: "generica",
            texto: `Escribiendo Capítulo ${i + 1}...`,
            imagen: "",
            opciones: [],
            botones: [],
            frames: [],
            generadoPorIA: true,
            libroId: libroActivoId
        };
        guardarCambios();
        actualizarLista();

        await _generarCapituloFramePorFrame(nuevoCapituloId, i, contexto, contextoCapituloAnterior);
        
        contextoCapituloAnterior = escenas[nuevoCapituloId].frames.map(f => f.texto).join("\n\n");
    }
}

/**
 * Proceso principal de generación de un libro capítulo a capítulo usando la IA.
 */
async function _poblarLibroConIA(libroId, contexto) {
    Object.keys(escenas).forEach(id => {
        if (escenas[id].libroId === libroId) delete escenas[id];
    });
    guardarCambios();
    actualizarLista();

    let contextoCapituloAnterior = ""; 

    for (let i = 0; i < contexto.resumenPorEscenas.length; i++) {
        const nuevoCapituloId = `${libroId}-capitulo-${Date.now() + i}`;
        escenas[nuevoCapituloId] = {
            tipo: "generica", texto: `Escribiendo Capítulo ${i + 1}...`, imagen: "",
            opciones: [], botones: [], frames: [], generadoPorIA: true, libroId: libroId
        };
        guardarCambios();
        actualizarLista();

        await _generarCapituloFramePorFrame(nuevoCapituloId, i, contexto, contextoCapituloAnterior);
        
        contextoCapituloAnterior = escenas[nuevoCapituloId].frames.map(f => f.texto).join("\n\n");
    }

    const libroParaActualizar = libros.find(libro => libro.id === libroId);
    if(libroParaActualizar) {
        libroParaActualizar.iaContext = contexto;
        localStorage.setItem("libros", JSON.stringify(libros)); 
    }
    
    seleccionarLibro(libroId, libroParaActualizar.titulo);
    actualizarLista();
}

/**
 * Genera el contenido completo de un capítulo, haciendo una llamada a la IA por cada frame
 * y dividiendo la respuesta en párrafos individuales.
 */
async function _generarCapituloFramePorFrame(capituloId, capituloIndex, contexto, contextoCapituloAnterior) {
    let textoFramesAnteriores = "";
    const totalFramesLogicos = contexto.cantidadFramesOriginal || 4; // Número de llamadas a la IA
    const totalCapitulos = contexto.resumenPorEscenas.length;

    for (let frameIndex = 0; frameIndex < totalFramesLogicos; frameIndex++) {
        const progress = 10 + (80 * (capituloIndex / totalCapitulos)) + (80 / totalCapitulos * (frameIndex / totalFramesLogicos));
        progressBarManager.set(progress, `Escribiendo sub-parte ${frameIndex + 1}/${totalFramesLogicos} (Cap. ${capituloIndex + 1})...`);
        
        // 1. Llama a la IA para obtener un bloque de texto con varios párrafos.
        const bloqueDeTexto = await _generarParrafosParaFrame(capituloIndex, frameIndex, totalFramesLogicos, contexto, textoFramesAnteriores, contextoCapituloAnterior);
        
        // 2. Divide el bloque de texto en párrafos individuales.
        const parrafos = bloqueDeTexto.split('\n').filter(p => p.trim() !== '');

        // 3. Crea un nuevo 'frame' (un frameh en la UI) por cada párrafo.
        parrafos.forEach(parrafo => {
            escenas[capituloId].frames.push({ texto: parrafo, imagen: "" });
        });

        // 4. Acumula el bloque completo para el contexto de la siguiente llamada.
        textoFramesAnteriores += bloqueDeTexto + "\n\n";

        guardarCambios();
        actualizarLista();
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 5. Genera el título final para el capítulo.
    const textoCapituloCompleto = escenas[capituloId].frames.map(f => f.texto).join("\n\n");
    const tituloFinalCapitulo = await _generarTituloParaCapitulo(textoCapituloCompleto, contexto.resumenPorEscenas[capituloIndex].resumen_escena);
    escenas[capituloId].texto = tituloFinalCapitulo;
    
    guardarCambios();
    actualizarLista();
}


/**
 * Llama a la IA para generar varios párrafos para un único frame.
 */
async function _generarParrafosParaFrame(capituloIndex, frameIndex, totalFrames, contexto, textoFramesAnteriores, textoCapituloAnterior) {
    const resumenCapitulo = contexto.resumenPorEscenas[capituloIndex].resumen_escena;
    
    const prompt = `
        **Contexto General de la Historia:**
        - Título: ${contexto.tituloOriginal}
        - Planteamiento: ${contexto.planteamientoGeneral}

        **Contexto del Capítulo ${capituloIndex + 1}:**
        - Resumen: ${resumenCapitulo}
        ${textoCapituloAnterior ? `- Texto del capítulo anterior:\n${textoCapituloAnterior.substring(0, 1500)}...` : ""}

        **Progreso Actual Dentro del Capítulo:**
        ${textoFramesAnteriores ? `- Texto ya escrito en este capítulo:\n${textoFramesAnteriores}` : "Este es el primer frame del capítulo."}

        **TAREA:**
        Eres un escritor de novelas. Estás escribiendo el Frame ${frameIndex + 1} de ${totalFrames} para el Capítulo ${capituloIndex + 1}.
        Tu objetivo es escribir **únicamente el texto para este frame**.
        Basándote en toda la información anterior, escribe entre 3 y 5 párrafos detallados y narrativos que continúen la historia de forma lógica y atractiva.
        No incluyas títulos, encabezados como "Frame X", ni resúmenes. Solo el texto narrativo.`;

    // Se espera texto plano, no JSON.
    return await llamarIAConFeedback(prompt, `Frame ${frameIndex + 1} de Cap. ${capituloIndex + 1}`, 'gemini-2.5-flash', false);
}

/**
 * Llama a la IA para generar un título para un capítulo basado en su contenido.
 */
async function _generarTituloParaCapitulo(textoCompleto, resumen) {
    const prompt = `
        **Contexto:**
        - Resumen del Capítulo: "${resumen}"
        - Texto Completo del Capítulo (extracto):\n"${textoCompleto.substring(0, 2000)}..."

        **TAREA:**
        Basado en el resumen y el texto completo, genera un título corto, evocador y atractivo para este capítulo.
        Responde únicamente con el título, sin comillas ni texto adicional.`;
    
    const titulo = await llamarIAConFeedback(prompt, `Título de Capítulo`, 'gemini-2.5-flash', false);
    return titulo.replace(/\"/g, "").trim(); // Limpiar comillas y espacios
}

/**
 * Obtiene el índice de un capítulo y la lista ordenada de todos los capítulos del libro.
 */
function _obtenerIndiceYCapitulosDelLibro(capituloId) {
    const capitulosDelLibro = Object.keys(escenas)
        .filter(id => escenas[id].libroId === libroActivoId)
        .sort();
    const indice = capitulosDelLibro.indexOf(capituloId);
    return { indice, capitulosDelLibro };
}

/**
 * Elimina capítulos del objeto 'escenas' a partir de un índice dado.
 */
function _eliminarCapitulosDesdeIndice(indiceInicial, capitulosDelLibro) {
    for (let i = indiceInicial; i < capitulosDelLibro.length; i++) {
        const idParaEliminar = capitulosDelLibro[i];
        delete escenas[idParaEliminar];
    }
    guardarCambios();
    actualizarLista();
}

/**
 * Se ejecuta al confirmar en el modal. Orquesta la GENERACIÓN de un libro.
 */
async function confirmarPobladoDeLibro() {
    const guionSelect = document.getElementById('guion-origen-select');
    const libroSeleccionadoEl = document.querySelector('.libro-seleccionable.seleccionado');

    const guionId = guionSelect.value;
    const libroId = libroSeleccionadoEl ? libroSeleccionadoEl.dataset.libroId : null;

    if (!guionId || !libroId) {
        alert("Por favor, selecciona un guion y un libro.");
        return;
    }

    const libroSeleccionado = libros.find(libro => libro.id === libroId);
    const scriptData = guionesGuardados[guionId];

    if (!libroSeleccionado || !scriptData) {
        alert("Error: No se encontraron los datos del libro o del guion.");
        return;
    }

    if (confirm(`¿Generar el libro "${libroSeleccionado.titulo}" usando el guion "${scriptData.tituloOriginal}"? Se llamará a la IA para escribir cada frame y se borrará el contenido actual.`)) {
        
        if(typeof cerrarModalSeleccionLibro === 'function') {
            cerrarModalSeleccionLibro();
        }
        
        try {
            if (typeof progressBarManager !== 'undefined') {
                progressBarManager.start(`Generando libro desde guion...`);
            }

            await _poblarLibroConIA(libroId, scriptData);

            if (typeof progressBarManager !== 'undefined') {
                progressBarManager.finish("Libro generado con éxito.");
            }
            alert("¡Libro generado con éxito desde el guion!");

        } catch (error) {
            console.error("Error al poblar el libro con IA:", error);
            if (typeof progressBarManager !== 'undefined') {
                progressBarManager.error(`Error: ${error.message}`);
            }
            alert(`No se pudo generar el libro: ${error.message}`);
        }
    }
}
