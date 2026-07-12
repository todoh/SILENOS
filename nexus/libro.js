// ============================================================================
// SILENOS CORE - ARCHITECTURE EXPANSION ENGINE (libro.js)
// Pipeline de generación masiva paso a paso para estructura Lasuro.json
// ============================================================================

// Estructura interna de control para la fase de expansión
let esqueletoExpandido = {
    eventosMacro: [],
    capitulosBase: []
};

// Función de renderizado del Canvas para actualizar los subpasos de la fase de redacción del libro
function drawCanvasMatrix(currentStep, total) {
    const canvas = document.getElementById('pipeline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const cols = 16; 
    const rows = 1;
    const cellWidth = canvas.width / cols;
    const cellHeight = canvas.height / rows;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let activeIndex = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (activeIndex < currentStep) {
                ctx.fillStyle = '#10b981'; // Verde Esmeralda para progreso del Libro
            } else if (activeIndex === currentStep) {
                ctx.fillStyle = '#d97706'; // Activo actual
            } else {
                ctx.fillStyle = '#e5e7eb'; // En espera
            }
            ctx.fillRect(c * cellWidth + 1, r * cellHeight + 1, cellWidth - 2, cellHeight - 2);
            activeIndex++;
        }
    }
}

// PIPELINE MAESTRO DE EXPANSIÓN DE LIBRO
async function generarLibroCompleto() {
    const mainGenre = document.getElementById('book-genre').value;
    const subgenre = document.getElementById('book-subgenre').value;
    const specificRules = document.getElementById('genre-template-rules').value;
    
    // Inyección de instrucciones de sistema literarias avanzadas
    const systemInstructionLibro = `Eres el novelista principal de Silenos Studio, especializado en el género [${mainGenre} - ${subgenre}]. Directrices críticas: ${specificRules}. Tu prosa es rica, inmersiva, descriptiva, con alto nivel de vocabulario, evitando clichés. Todo el output estructural que se te solicite en formato JSON debe ser estrictamente parseable, sin texto explicativo fuera de los bloques de código JSON.`;

    try {
        // Preparar parámetros iniciales del JSON final basándonos en la UI y la Base de Datos
        finalBookJSON.titulo = document.getElementById('book-title').value.trim() || "Obra Magna Transmutada";
        finalBookJSON.autores = document.getElementById('book-authors').value.trim() || "Manuel Rodsua & Cristina Lobo";
        finalBookJSON.portada = " ";
        finalBookJSON.tono = `Género: ${mainGenre}, Enfoque: ${subgenre}`;
        finalBookJSON.estilo = `Narrativa compleja en tercera persona adaptada a las reglas de la plantilla: ${specificRules}`;
        finalBookJSON.disclaimer = `Esta obra ha sido estructurada a través de un pipeline de inteligencia artificial serial, entrelazando el lore profundo y el ecosistema unificado de la base de datos de contexto.`;
        finalBookJSON.indice = ["Prólogo"];
        finalBookJSON.partes = [{ nombre: "Bloque Único de Desarrollo", capitulos: [] }];

        // --------------------------------------------------------------------
        // BLOQUE A: LAS 5 LLAMADAS PARA EL ESQUELETO DE 30 CAPÍTULOS
        // --------------------------------------------------------------------
        changePhaseBadge("Libro: Preparando Esqueleto");
        logConsole("Iniciando Fase de Expansión Literaria. Ejecutando Bloque A de Estructuración...");

        // Llamada 1: Lista de más de 40 eventos ordenados cronológicamente
        logConsole("Llamada 1/5: Generando lista maestra de más de 40 eventos clave organizados linealmente...");
        const validatorLlamada1 = (obj) => { return { valid: Array.isArray(obj.eventos) && obj.eventos.length >= 40, reason: "Debe contener una lista con un mínimo de 40 eventos" }; };
        validatorLlamada1.isJsonValidator = true;

        const prompt1 = `Analiza detalladamente toda nuestra Base de Datos Contextual de la Historia:\n${JSON.stringify(storyDatabase)}\n\nGenera una lista secuencial, cronológica e inamovible de más de 40 eventos históricos y dramáticos de impacto crítico para el desarrollo de la trama completa. Devuelve ÚNICAMENTE un objeto JSON con el siguiente formato:\n{\n  "eventos": [\n    "1. Descripción del primer evento...",\n    "2. Descripción del segundo evento..."\n  ]\n}`;
        const resLlamada1 = await callGeminiWithRetry(prompt1, systemInstructionLibro, validatorLlamada1);
        esqueletoExpandido.eventosMacro = resLlamada1.eventos;
        logConsole(`Llamada 1/5 Exitosa. Se han consolidado ${esqueletoExpandido.eventosMacro.length} eventos macro ordenados.`, "success");

        // Llamada 2: Esqueleto de 30 capítulos con exactamente 8 hitos/puntos por capítulo
        logConsole("Llamada 2/5: Distribuyendo los eventos en un mapa inicial de 30 capítulos con 8 sub-puntos por sección...");
        const validatorLlamada2 = (obj) => { return { valid: Array.isArray(obj.estructura) && obj.estructura.length === 30 && obj.estructura.every(c => c.puntos && c.puntos.length === 8), reason: "Debe estructurar exactamente 30 capítulos, cada uno conteniendo una lista rígida de 8 puntos o sub-eventos." }; };
        validatorLlamada2.isJsonValidator = true;

        const prompt2 = `Utilizando los eventos macro ordenados:\n${JSON.stringify(esqueletoExpandido.eventosMacro)}\n\nDistribuye la trama construyendo el armazón completo de exactamente 30 capítulos. Cada capítulo debe contener su número, un título provisional y una lista exacta de 8 sub-puntos de desarrollo secuencial que ocurrirán en él. Devuelve ÚNICAMENTE un JSON con esta estructura:\n{\n  "estructura": [\n    {\n      "numero": 1,\n      "titulo_provisional": "...",\n      "puntos": ["punto 1", "punto 2", "punto 3", "punto 4", "punto 5", "punto 6", "punto 7", "punto 8"]\n    }\n  ]\n}`;
        const resLlamada2 = await callGeminiWithRetry(prompt2, systemInstructionLibro, validatorLlamada2);
        esqueletoExpandido.capitulosBase = resLlamada2.estructura;
        logConsole("Llamada 2/5 Exitosa. Mapeados los 30 capítulos con sus 8 puntos internos rígidos.", "success");

        // Llamada 3: Detallar los primeros 10 capítulos (1 al 10)
        logConsole("Llamada 3/5: Desarrollando y expandiendo sinopsis y dinámicas para Capítulos 1 al 10...");
        const validatorBloque = (obj) => { return { valid: Array.isArray(obj.capitulos) && obj.capitulos.length === 10, reason: "Debe retornar exactamente los 10 capítulos desarrollados con sus especificaciones estructurales." }; };
        validatorBloque.isJsonValidator = true;

        const prompt3 = `Toma el bloque inicial de capítulos (del 1 al 10) de nuestra estructura:\n${JSON.stringify(esqueletoExpandido.capitulosBase.slice(0, 10))}\n\nDetalla minuciosamente estos 10 capítulos. Desarrolla sus 8 subpartes internas convirtiéndolas en una sinopsis argumental densa e interconectada para cada capítulo. Devuelve un JSON con el formato:\n{\n  "capitulos": [\n    { "numero": 1, "titulo": "Título Final del Capítulo", "sinopsis": "Sinopsis extendida que amasa los 8 puntos..." }\n  ]\n}`;
        const resLlamada3 = await callGeminiWithRetry(prompt3, systemInstructionLibro, validatorBloque);
        
        // Llamada 4: Detallar los siguientes 10 capítulos (11 al 20)
        logConsole("Llamada 4/5: Desarrollando y expandiendo sinopsis y dinámicas para Capítulos 11 al 20...");
        const prompt4 = `Toma el bloque intermedio de capítulos (del 11 al 20) de nuestra estructura:\n${JSON.stringify(esqueletoExpandido.capitulosBase.slice(10, 20))}\n\nDetalla minuciosamente estos 10 capítulos. Desarrolla sus 8 subpartes internas en una sinopsis argumental densa. Devuelve un JSON con el formato:\n{\n  "capitulos": [\n    { "numero": 11, "titulo": "Título Final del Capítulo", "sinopsis": "Sinopsis extendida que amasa los 8 puntos..." }\n  ]\n}`;
        const resLlamada4 = await callGeminiWithRetry(prompt4, systemInstructionLibro, validatorBloque);

        // Llamada 5: Detallar los últimos 10 capítulos (21 al 30)
        logConsole("Llamada 5/5: Desarrollando y expandiendo sinopsis y dinámicas para Capítulos 21 al 30...");
        const prompt5 = `Toma el bloque final de capítulos (del 21 al 30) de nuestra estructura:\n${JSON.stringify(esqueletoExpandido.capitulosBase.slice(20, 30))}\n\nDetalla minuciosamente estos 10 capítulos. Desarrolla sus 8 subpartes internas en una sinopsis argumental densa. Devuelve un JSON con el formato:\n{\n  "capitulos": [\n    { "numero": 21, "titulo": "Título Final del Capítulo", "sinopsis": "Sinopsis extendida que amasa los 8 puntos..." }\n  ]\n}`;
        const resLlamada5 = await callGeminiWithRetry(prompt5, systemInstructionLibro, validatorBloque);

        // Integrar toda la estructura limpia en el mapa de trabajo intermedio
        let listadoCapitulosDetallados = [
            ...resLlamada3.capitulos,
            ...resLlamada4.capitulos,
            ...resLlamada5.capitulos
        ];
        logConsole("Bloque A Finalizado. El esqueleto de 30 capítulos está completamente detallado con sus 8 subpartes consolidadas.", "success");

        // --------------------------------------------------------------------
        // BLOQUE B: REDACCIÓN COMPLETA INDIVIDUAL DE LOS 30 CAPÍTULOS
        // --------------------------------------------------------------------
        changePhaseBadge("Libro: Escribiendo Capítulos");
        logConsole("Iniciando Bloque B: Redacción extendida individual por capítulo (30 llamadas críticas)...");

        const validatorRedaccion = (obj) => { return { valid: obj.titulo && Array.isArray(obj.texto) && obj.texto.length >= 4, reason: "El capítulo redactado debe conservar su título y proveer un desarrollo inmersivo dividido en múltiples párrafos (mínimo 4)." }; };
        validatorRedaccion.isJsonValidator = true;

        for (let i = 0; i < listadoCapitulosDetallados.length; i++) {
            let capMeta = listadoCapitulosDetallados[i];
            let numCap = i + 1;
            logConsole(`Procesando Redacción del Capítulo ${numCap}/30: "${capMeta.titulo}"...`, 'api');
            
            // Actualizar interfaz del canvas y barra de progreso de manera dinámica
            drawCanvasMatrix(Math.floor((numCap / 30) * 16), 16);
            document.getElementById('progress-text').innerText = `Capítulo ${numCap} / 30 Redactado`;
            document.getElementById('progress-bar').style.width = `${Math.floor((numCap / 30) * 100)}%`;

            const promptCap = `Estamos escribiendo el manuscrito final. Redacta por COMPLETO el Capítulo Número ${numCap}.\nTítulo asignado: "${capMeta.titulo}"\nSinopsis de desarrollo base (que integra sus 8 subpartes previamente estructuradas):\n"${capMeta.sinopsis}"\n\nContexto maestro de soporte:\n- Eje Macro: ${storyDatabase.la_trama}\n- Entorno Geográfico: ${storyDatabase.los_lugares}\n\nEscribe el capítulo completo con una extensión literaria amplia, rica, sofisticada y descriptiva. Separa el texto obligatoriamente en un array de párrafos fluidos e independientes dentro del objeto JSON. Devuelve ÚNICAMENTE un JSON con esta estructura:\n{\n  "titulo": "${capMeta.titulo}",\n  "texto": [\n    "Párrafo 1 del manuscrito...",\n    "Párrafo 2 del manuscrito...",\n    "Párrafo 3..."\n  ]\n}`;
            
            let capRedactado = await callGeminiWithRetry(promptCap, systemInstructionLibro, validatorRedaccion);
            
            // Inyectar en la estructura final de Lasuro.json
            finalBookJSON.partes[0].capitulos.push({
                numero: numCap,
                titulo: capRedactado.titulo || capMeta.titulo,
                sinopsis: capMeta.sinopsis,
                texto: capRedactado.texto,
                expandido: true
            });
            
            finalBookJSON.indice.push(`Capítulo ${numCap}`);
            logConsole(`Capítulo ${numCap} guardado en el búfer de compilación con ${capRedactado.texto.length} párrafos de extensión.`, "success");
        }

        // --------------------------------------------------------------------
        // BLOQUE C: ACABADO Y METADATOS COMPLEMENTARIOS (ÚLTIMAS 4 LLAMADAS)
        // --------------------------------------------------------------------
        changePhaseBadge("Libro: Post-Producción");
        logConsole("Iniciando Bloque C: Compilación de extras, paratextos y etiquetas de indexación...");

        // Llamada C1: Etiquetas
        logConsole("Llamada Extra 1/4: Extrayendo red de etiquetas conceptuales meta...");
        const resEtiquetas = await callGeminiWithRetry(
            `Genera una lista de etiquetas conceptuales, géneros cruzados, temas ontológicos y descriptores de estilo separados por comas que sirvan para indexar este libro completo. Devuelve solo el texto plano con las etiquetas.`,
            systemInstructionLibro
        );
        finalBookJSON.etiquetas = resEtiquetas.replace(/`/g, "").trim();

        // Llamada C2: Prólogo
        logConsole("Llamada Extra 2/4: Redactando Prólogo literario...");
        const resPrologo = await callGeminiWithRetry(
            `Escribe el PRÓLOGO oficial de esta obra de 30 capítulos. Debe ser lírico, evocador, sentar las bases conceptuales, estéticas y el tono de la historia basándote en el cosmos definido:\n${storyDatabase.definicion_conjunto}`,
            systemInstructionLibro
        );
        finalBookJSON.prologo = resPrologo.trim();

        // Llamada C3: Apéndice
        logConsole("Llamada Extra 3/4: Compilando Apéndice técnico...");
        const resApendice = await callGeminiWithRetry(
            `Escribe el APÉNDICE oficial de la obra. Debe detallar la glosa técnica de las ciencias, terminologías, subestructuras de facciones o cronología oculta del lore analizado:\n${storyDatabase.ciencias_historia}\n${storyDatabase.historia_previa}`,
            systemInstructionLibro
        );
        finalBookJSON.apendice = resApendice.trim();
        finalBookJSON.indice.push("Apéndice");

        // Llamada C4: Nota Final
        logConsole("Llamada Extra 4/4: Redactando Nota Final de los Autores...");
        const resNotaFinal = await callGeminiWithRetry(
            `Escribe la NOTA FINAL de los autores (Manuel Rodsua y Cristina Lobo). Debe ser una reflexión profunda sobre la memoria recuperada de las piedras, las posibilidades latentes y la repercusión final de los acontecimientos:\n${storyDatabase.la_repercusion}`,
            systemInstructionLibro
        );
        finalBookJSON.nota_final = resNotaFinal.trim();
        finalBookJSON.indice.push("Nota Final");

        // Finalización exitosa del Pipeline Completo
        changePhaseBadge("Obra Compilada");
        logConsole("¡COMPILACIÓN EXITOSA! Toda la estructura del libro ha sido consolidada bajo el esquema rígido de Lasuro.json.", "success");
        document.getElementById('btn-download').disabled = false;

    } catch (err) {
        logConsole(`Fallo crítico en el Pipeline de Expansión del Libro: ${err.message}`, 'error');
        changePhaseBadge("Error en Libro");
    }
}

// ACOPLAMIENTO AL PIPELINE EXISTENTE:
// Modificamos el gancho final de startPipeline() en main.js para invocar inmediatamente 
// a generarLibroCompleto() una vez que la base de datos se consolide con éxito.