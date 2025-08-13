/**
 * =================================================================
 * MOMENTOS-GENERACION.JS - MODO DE ILUSTRACIÓN POR COMPONENTES
 * =================================================================
 * Este archivo contiene la lógica para un nuevo modo de ilustración
 * que primero genera cada elemento visual como un SVG individual y
 * luego compone las escenas finales utilizando estos "activos" pre-generados.
 * Esto garantiza una coherencia visual del 100%.
 */

/**
 * [NUEVO ORQUESTADOR]
 * Inicia el proceso de ilustración por componentes.
 * 1. Analiza todos los momentos para crear una guía de diseño maestra.
 * 2. Genera un SVG individual para CADA elemento de la guía.
 * 3. Compone la escena final para cada momento, ensamblando los SVGs de los elementos necesarios.
 */
async function generacionLoteMomentos() {
    if (progressBarManager.isActive) {
        alert("Ya hay un proceso de IA en ejecución.");
        return;
    }
    if (!confirm(`Esto iniciará el proceso de ilustración por COMPONENTES.
- Se analizarán todos los momentos para crear una guía de diseño.
- Se dibujará un SVG para cada elemento individual de la guía.
- Finalmente, se compondrán las escenas ensamblando los elementos.
¿Deseas continuar?`)) {
        return;
    }

    progressBarManager.start('Iniciando ilustración por componentes...');

    const nodosAIlustrar = Array.from(document.querySelectorAll('#momentos-lienzo .momento-nodo')).filter(nodo => {
        const descripcion = nodo.dataset.descripcion || '';
        const tieneImagen = nodo.querySelector('.momento-imagen')?.src.includes('data:image');
        return descripcion.trim().length >= 10 && !tieneImagen;
    });

    if (nodosAIlustrar.length === 0) {
        alert("No se encontraron momentos que necesiten ilustración.");
        progressBarManager.error("No hay nada que ilustrar.");
        return;
    }

    try {
        // --- FASE 1: ANÁLISIS GLOBAL Y CREACIÓN DE LA GUÍA DE DISEÑO MAESTRA ---
        progressBarManager.set(5, 'Analizando todos los momentos para crear la guía de diseño...');
        const momentosParaAnalizar = nodosAIlustrar.map((nodo, index) => ({
            idTemporal: `temp_${index}`,
            descripcion: nodo.dataset.descripcion
        }));
        
        // Usamos la función de análisis existente para obtener la guía de diseño.
        const guiaDeDisenoMaestra = await analizarLoteDeMomentos(momentosParaAnalizar, {});
        console.log("Guía de Diseño Maestra generada:", guiaDeDisenoMaestra);


        // --- FASE 2: GENERACIÓN DE ACTIVOS SVG INDIVIDUALES ---
        progressBarManager.set(20, 'Generando activos SVG para cada elemento de la guía...');
        
        // 'ilustrarTodosLosElementos' es una nueva función que genera un SVG para cada entrada en la guía.
        const bibliotecaDeActivosSVG = await ilustrarTodosLosElementos(guiaDeDisenoMaestra);
        console.log("Biblioteca de Activos SVG creada:", bibliotecaDeActivosSVG);

        if (Object.keys(bibliotecaDeActivosSVG).length === 0) {
            throw new Error("No se pudo generar ningún activo SVG a partir de la guía de diseño.");
        }

        // --- FASE 3: COMPOSICIÓN DE ESCENAS FINALES ---
        progressBarManager.set(60, 'Componiendo escenas finales con los activos SVG...');
        const promesasDeComposicion = nodosAIlustrar.map((nodo, index) => {
             const progress = 60 + (index / nodosAIlustrar.length) * 40;
             progressBarManager.set(progress, `Componiendo escena: "${nodo.querySelector('.momento-titulo').textContent}"`);
            
            // 'componerEscenaConActivos' es la nueva función que ensambla el SVG final.
            return componerEscenaConActivos(nodo, guiaDeDisenoMaestra, bibliotecaDeActivosSVG);
        });

        await Promise.allSettled(promesasDeComposicion);

        progressBarManager.finish('¡Ilustración por componentes finalizada!');

    } catch (error) {
        console.error("Error crítico en la generación por componentes:", error);
        progressBarManager.error("Proceso cancelado por un error crítico.");
        alert(`Ocurrió un error general durante la ilustración por componentes: ${error.message}`);
    }
}

/**
 * [NUEVA] Genera un SVG para cada elemento definido en la guía de diseño.
 * @param {object} guiaDeDiseno - La guía de diseño maestra.
 * @returns {Promise<object>} Un objeto donde cada clave es el nombre de un elemento y el valor es su código SVG.
 */
async function ilustrarTodosLosElementos(guiaDeDiseno) {
    const biblioteca = {};
    const promesasDeElementos = Object.entries(guiaDeDiseno).map(([nombreElemento, descripcionElemento]) => {
        const prompt = `
            Eres un ilustrador de svg y personajes experto. Tu tarea es crear un único elemento visual en formato SVG.
            
            **Descripción del Elemento a Ilustrar:**
            - **Nombre:** ${nombreElemento}
            - **Detalles:** ${JSON.stringify(descripcionElemento)}

            **Instrucciones OBLIGATORIAS:**
            1. Dibuja ÚNICAMENTE el elemento descrito.
            2. El fondo DEBE ser transparente.
            3. El elemento debe estar centrado y ocupar un espacio razonable dentro del viewBox.
            4. Utiliza un estilo de ilustración "flat design" limpio y profesional.
            5. El SVG DEBE usar un viewBox="0 0 1000 1000".
            6. Responde ÚNICAMENTE con el código SVG. No incluyas JSON, comentarios ni explicaciones.
        `;
        
        // Usamos un modelo más rápido y económico para estos activos individuales.
        return llamarIAConFeedback(prompt, `Dibujando activo: ${nombreElemento}`, 'gemini-2.5-flash-lite', false)
            .then(respuestaSVG => {
                const svgLimpio = extraerBloqueSVG(respuestaSVG);
                if (svgLimpio) {
                    biblioteca[nombreElemento] = svgLimpio;
                } else {
                    console.warn(`No se pudo extraer el SVG para el elemento: ${nombreElemento}`);
                }
            })
            .catch(error => {
                console.error(`Error generando el activo SVG para ${nombreElemento}:`, error);
            });
    });

    await Promise.all(promesasDeElementos);
    return biblioteca;
}

/**
 * [NUEVA] Compone la escena final para un nodo ensamblando los SVGs de los activos.
 * @param {HTMLElement} nodo - El nodo del momento a procesar.
 * @param {object} guiaDeDiseno - La guía de diseño maestra.
 * @param {object} bibliotecaDeActivosSVG - El objeto con los SVGs de cada elemento.
 * @returns {Promise<void>}
 */
async function componerEscenaConActivos(nodo, guiaDeDiseno, bibliotecaDeActivosSVG) {
    const descripcionMomento = nodo.dataset.descripcion;
    const tituloNodo = nodo.querySelector('.momento-titulo').textContent;

    try {
        // Paso 1: Decidir qué elementos de la biblioteca usar para esta escena.
        const promptComposicion = `
            Eres un Director de Escena. Tu tarea es leer la descripción de una escena y seleccionar los activos necesarios de una biblioteca.

            **Biblioteca de Activos Disponibles (Nombres):**
            ---
            [${Object.keys(bibliotecaDeActivosSVG).join(', ')}]
            ---

            **Descripción de la Escena a Componer:**
            ---
            "${descripcionMomento}"
            ---

            **Tu Tarea:**
            1. Lee la descripción de la escena.
            2. Elige de la lista de activos disponibles cuáles son necesarios para esta escena.
            3. Describe cómo se deben colocar estos activos en una escena panorámica (1920x1080). Indica posición (ej: "centro", "izquierda-fondo"), tamaño (ej: "grande", "pequeño") y capa (ej: "primer plano", "fondo").
            4. Responde ÚNICAMENTE con un objeto JSON: {"composicion": [{"nombre": "...", "x": %, "y": %, "escala": float, "capa": int}]}
               - 'x' e 'y' son porcentajes (0-100) del centro del objeto.
               - 'escala' es un multiplicador (ej: 1.0 es tamaño normal, 2.0 es el doble).
               - 'capa' es el orden de apilamiento (menor es más al fondo).

            **Ejemplo de respuesta JSON:**
            { "composicion": [
                { "nombre": "Ogro Valiente", "x": 50, "y": 70, "escala": 1.2, "capa": 10 },
                { "nombre": "Puente de Piedra", "x": 50, "y": 80, "escala": 2.5, "capa": 5 },
                { "nombre": "Luna Creciente", "x": 80, "y": 20, "escala": 0.8, "capa": 1 }
            ]}
        `;

        const respuestaComposicion = await llamarIAConFeedback(promptComposicion, `Planificando: ${tituloNodo}`, 'gemini-2.0-flash', true, 2);
        if (!respuestaComposicion || !respuestaComposicion.composicion) {
            throw new Error("La IA de composición no devolvió un plan de escena válido.");
        }

        // Paso 2: Ensamblar el SVG final.
        const { composicion } = respuestaComposicion;
        // Ordenamos por capa para dibujar primero los elementos del fondo.
        composicion.sort((a, b) => a.capa - b.capa);

        let elementosSVGParaEnsamblar = '';
        composicion.forEach(item => {
            const activoSVG = bibliotecaDeActivosSVG[item.nombre];
            if (activoSVG) {
                // Eliminamos el tag <svg> exterior del activo para poder anidarlo.
                const contenidoInterno = activoSVG.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
                const xPos = (item.x / 100) * 1920;
                const yPos = (item.y / 100) * 1080;
                // Usamos un <g> para transformar (mover y escalar) el activo.
                elementosSVGParaEnsamblar += `<g transform="translate(${xPos}, ${yPos}) scale(${item.escala || 1})">
                    ${contenidoInterno}
                </g>\n`;
            }
        });

        // Creamos el prompt para el fondo
        const promptFondo = `
            Crea un fondo SVG panorámico (viewBox="0 0 1920 1080") para una escena descrita como: "${descripcionMomento}".
            Debe ser un paisaje o interior detallado, con colores y degradados que creen una atmósfera. No incluyas personajes.
            Responde ÚNICAMENTE con el código SVG del fondo.
        `;
        const fondoSVG = await llamarIAConFeedback(promptFondo, `Creando fondo: ${tituloNodo}`, 'gemini-2.5-flash-lite', false);
        const fondoLimpio = extraerBloqueSVG(fondoSVG) || '<rect width="1920" height="1080" fill="#cccccc"/>';

        // Ensamblamos el SVG final con el fondo y los elementos.
        const svgFinal = `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
            ${fondoLimpio.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
            ${elementosSVGParaEnsamblar}
        </svg>`;

        await guardarIlustracionEnNodo(nodo, svgFinal);
        return { status: 'fulfilled', id: nodo.id };

    } catch (error) {
        console.error(`Error componiendo la escena para el nodo ${nodo.id}:`, error);
        const imgElemento = nodo.querySelector('.momento-imagen');
        if (imgElemento) imgElemento.parentElement.innerHTML += '<p style="color:red; font-size:10px;">Error Comp.</p>';
        return { status: 'rejected', id: nodo.id, error: error.message };
    }
}
