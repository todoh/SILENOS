// Estructura de Memoria Contextual Persistente (Base de Datos de la Historia)
let storyDatabase = {
    definicion_conjunto: "",
    definicion_individualidades: "",
    definicion_acciones: "",
    definicion_equilibrios: "",
    la_trama: "",
    ciencias_historia: "",
    los_eventos: "",
    los_sentimientos: "",
    los_motivos: "",
    los_lugares: "",
    historia_previa: "",
    los_grupos: "",
    los_juegos: "",
    las_posibilidades: "",
    la_variedad: "",
    la_repercusion: "",
    principio: "",
    final: "",
    esqueleto_capitulos: []
};

// Objeto Final que se compilará con la estructura exacta del libro
let finalBookJSON = {
    titulo: "",
    portada: "",
    autores: "",
    disclaimer: "",
    tono: "",
    estilo: "",
    indice: [],
    prologo: "",
    partes: [
        {
            nombre: "Bloque Único de Desarrollo",
            capitulos: []
        }
    ],
    apendice: "",
    nota_final: ""
};

const totalSteps = 16; // Sincronizado con los 16 bloques estructurales del panel central
let currentStepCounter = 0;

// Definición de subgéneros y sus respectivas plantillas con campos variables
const genreCatalog = {
    "Ciencia Ficción": {
        "Space Opera": "Ecosistema interplanetario, Imperios Galácticos, Tecnologías de viaje hiperespacial y balances de flotas a gran escala.",
        "Cyberpunk": "Estructuras de alta tecnología descontrolada, Corporaciones totalitarias, Inteligencia Artificial marginal y distorsión urbana de bajos recursos.",
        "Distopía / Postapocalíptico": "Sistemas de opresión estatal total, colapso ecológico/estructural previo y mecánicas extremas de racionamiento de recursos.",
        "Hard Sci-Fi": "Rigor científico irrestricto, Leyes físicas reales aplicadas a la trama, Astrodinámica y limitaciones de ingeniería tangible.",
        "Viajes en el tiempo / Ucronías": "Líneas cronológicas paralelas, Paradojas de causalidad causal y alteraciones de eventos históricos críticos."
    },
    "Misterio y Policiaco": {
        "Novela Negra (Noir)": "Atmósferas de cinismo absoluto, Corrupción institucional generalizada, Dilemas morales grises y psicología del submundo criminal.",
        "Policiaco Clásico (Procedimental)": "Tácticas de recolección de indicios forenses, Cadena de custodia, Métodos rigurosos de interrogatorio y leyes judiciales rígidas.",
        "De Detective (Whodunit)": "Estructuras cerradas de sospechosos, Rompecabezas de pistas cruzadas, Coartadas milimétricas y deducciones analíticas agudas.",
        "Thriller / Suspense": "Tensión y peligro inminente, Cuenta atrás psicológica, Giros inesperados y amenazas activas directas contra los protagonistas."
    },
    "Terror y Ficciática": {
        "Terror Cósmico": "Insignificancia de la mente humana, Entidades ancestrales multidimensionales fuera de la lógica tridimensional y locura inevitable.",
        "Terror Psicol gico": "Paranoia, Distorsiones severas de la percepción de la realidad, Trauma proyectado y desconfianza en el propio narrador.",
        "Gótico": "Castillos, Decadencia aristocrática o de linajes antiguos, Climas lúgubres y secretos familiares enterrados en la arquitectura.",
        "Sobrenatural / Paranormal": "Manifestaciones de entes del plano espectral, Posesiones demoníacas estructuradas, Maldiciones milenarias y criptas vivas.",
        "Survival / Gore": "Violencia explícita y anatómica, Lucha por la integridad física másica y entornos hostiles claustrofóbicos."
    },
    "Fantasía": {
        "Alta Fantasía (Fantasía Épica)": "Sistemas de magia duros o blandos con mitología fundacional, Razas fantásticas integrales y conflictos macro-geopolíticos continentales.",
        "Baja Fantasía / Fantasía Urbana": "Mecanismos mágicos e insólitos irrumpiendo directamente en el tejido metropolitano moderno y cotidiano actual.",
        "Fantasía Oscura": "Fantasía cruzada con dilemas de degradación moral, Monstruosidades descarnadas y desmitificación de héroes arquetípicos."
    },
    "Romántico": {
        "Romance Histórico": "Dinámicas relacionales y restricciones sociales de épocas pasadas con fidelidad estricta a trajes, normas y etiqueta de la época.",
        "Romance Contemporáneo": "Dinámicas afectivas hipermodernas, Conflictos de la vida profesional y urbana en el presente tecnológico.",
        "Romantasy (Romance Fantástico)": "Ejes políticos imperiales mágicos intrincadamente entrelazados con alianzas románticas y tensiones pasionales centrales."
    },
    "Histórica y Aventura": {
        "Novela Histórica": "Ficciones construidas estrictamente alrededor de hitos cronológicos, Personajes y costumbres fidedignas de un periodo verídico.",
        "De Aventuras": "Exploración de terrenos ignotos, Expediciones cartográficas complejas, Superación de trampas físicas y hallazgos arqueológicos."
    }
};

// Inicializador dinámico de subgéneros en el DOM
function updateSubgenres() {
    const mainGenre = document.getElementById('book-genre').value;
    const subgenreSelect = document.getElementById('book-subgenre');
    if (!subgenreSelect) return;
    subgenreSelect.innerHTML = "";
    const subs = genreCatalog[mainGenre];
    
    for (let sub in subs) {
        let opt = document.createElement('option');
        opt.value = sub;
        opt.innerText = sub;
        subgenreSelect.appendChild(opt);
    }
    updateGenreTemplate();
}

function updateGenreTemplate() {
    const mainGenre = document.getElementById('book-genre').value;
    const subgenre = document.getElementById('book-subgenre').value;
    const rulesTextArea = document.getElementById('genre-template-rules');
    
    if (rulesTextArea && genreCatalog[mainGenre] && genreCatalog[mainGenre][subgenre]) {
        rulesTextArea.value = genreCatalog[mainGenre][subgenre];
    }
}

// --- MANIPULACIÓN INTEGRAL Y ABIERTA DEL CANVAS GRÁFICO DE CONTROL ---
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
                ctx.fillStyle = '#2563eb'; // Procesado
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

// Registro de trazas en consola
function logConsole(message, type = 'info') {
    const consoleLog = document.getElementById('console-log');
    if (!consoleLog) return;
    const line = document.createElement('div');
    line.className = "console-line py-0.5 border-b border-gray-100/30 flex items-start gap-2";
    
    let color = "text-gray-600";
    let prefix = "[INFO]";
    if (type === 'success') { color = "text-green-600 font-medium"; prefix = "[OK]"; }
    if (type === 'error') { color = "text-red-500 font-bold"; prefix = "[ERR]"; }
    if (type === 'warning') { color = "text-amber-500 font-medium"; prefix = "[WARN]"; }
    if (type === 'api') { color = "text-blue-600"; prefix = "[LLM]"; }
    
    line.innerHTML = `<span class="${color} shrink-0">${prefix}</span><span class="break-all">${message}</span>`;
    consoleLog.appendChild(line);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Actualización en tiempo real de los campos en la interfaz central
function updateFieldDisplay(fieldId, text) {
    const element = document.getElementById(`view-${fieldId}`);
    const block = document.getElementById(`field-block-${fieldId}`);
    if (element) {
        element.innerText = text;
        element.classList.remove('text-gray-400', 'italic');
        element.classList.add('text-black');
    }
    if (block) {
        block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        block.style.backgroundColor = '#fafafa';
        setTimeout(() => { block.style.backgroundColor = 'transparent'; }, 1000);
    }
}

function updateProgressBar(stepIndex) {
    currentStepCounter = stepIndex;
    const pct = Math.min(100, Math.floor((currentStepCounter / totalSteps) * 100));
    document.getElementById('progress-bar').style.width = `${pct}%`;
    document.getElementById('progress-text').innerText = `Paso ${currentStepCounter} / ${totalSteps}`;
    document.getElementById('progress-percent').innerText = `${pct}%`;
    
    drawCanvasMatrix(currentStepCounter, totalSteps);
}

function changePhaseBadge(text) {
    document.getElementById('current-phase').innerText = text;
}

// --- PIPELINE MAESTRO SERIAL DE EJECUCIÓN FRAGMENTADO ---
async function startPipeline() {
    const seedConcept = document.getElementById('book-concept').value.trim();
    const apiKey = document.getElementById('gemini-api-key').value.trim();
    const mainGenre = document.getElementById('book-genre').value;
    const subgenre = document.getElementById('book-subgenre').value;
    const specificRules = document.getElementById('genre-template-rules').value;
    
    if (!apiKey) {
        alert("Por favor, introduce tu API Key de Gemini en la cabecera del engine.");
        return;
    }
    if (!seedConcept) {
        alert("Por favor, introduce un concepto central o idea semilla para inicializar la base de datos de la obra.");
        return;
    }
    
    document.getElementById('btn-start').disabled = true;
    let step = 0;
    storyDatabase.esqueleto_capitulos = [];
    
    // Inyección de directrices estructurales de género en las instrucciones del sistema
    const systemInstructionMaster = `Eres un arquitecto narrativo experto trabajando bajo el género: [${mainGenre} - ${subgenre}]. Reglas de la plantilla del campo: ${specificRules}. Tu objetivo es el AMASADO de la trama: entrelazar de forma orgánica, densa, compleja e hiper-coherente cada elemento situacional, psicológico y causal del relato. Evita generalidades y clichés. Devuelve siempre una prosa descriptiva densa, cruda, sofisticada y con un alto nivel literario adaptado al género.`;
    
    try {
        // ==========================================
        // FASE 1: BASE DE DATOS - CONFIGURACIÓN CONCEPTUAL Y AMASADO DE TRAMAS
        // ==========================================
        changePhaseBadge("Fase 1: Configuraci n de Base de Datos");
        
        logConsole(`Iniciando generación para el Macro-G nero h brido: ${mainGenre} (${subgenre})...`);
        
        // 1. CONJUNTO
        logConsole("Generando Definición del Conjunto (Ecosistema universal)...");
        storyDatabase.definicion_conjunto = await callGeminiWithRetry(
            `Basándote en la siguiente idea semilla, define el CONJUNTO (el universo, atmósfera general, leyes físicas/metafísicas que rigen el entorno, límites geográficos y el tono estético imperante):\n\nIdea semilla: "${seedConcept}"`,
            systemInstructionMaster
        );
        updateFieldDisplay('definicion_conjunto', storyDatabase.definicion_conjunto);
        updateProgressBar(++step);
        
        // 2. INDIVIDUALIDADES
        logConsole("Generando Definición de Individualidades (Entidades conscientes)...");
        storyDatabase.definicion_individualidades = await callGeminiWithRetry(
            `Considerando el CONJUNTO ya definido:\n"${storyDatabase.definicion_conjunto}"\n\nDefine las INDIVIDUALIDADES: las entidades fundamentales, fuerzas conscientes, arquetipos o personajes clave. Establece sus vicios, secretos iniciales y cómo encajan o disienten orgánicamente de las leyes del Conjunto.`,
            systemInstructionMaster
        );
        updateFieldDisplay('definicion_individualidades', storyDatabase.definicion_individualidades);
        updateProgressBar(++step);
        
        // 3. ACCIONES
        logConsole("Generando Definición de Acciones (Dinámicas cinéticas)...");
        storyDatabase.definicion_acciones = await callGeminiWithRetry(
            `Con este contexto acumulado:\nConjunto: "${storyDatabase.definicion_conjunto}"\nIndividualidades: "${storyDatabase.definicion_individualidades}"\n\nDefine las ACCIONES: qué tipos de dinámicas cinéticas, crímenes, investigaciones, rituales, transacciones ilegales o movimientos desestabilizadores configuran la tensión inmediata del relato. ¿Qué acciones específicas rompen el statu quo?`,
            systemInstructionMaster
        );
        updateFieldDisplay('definicion_acciones', storyDatabase.definicion_acciones);
        updateProgressBar(++step);
        
        // 4. EQUILIBRIOS
        logConsole("Generando Definición de Equilibrios (Fuerzas polares)...");
        storyDatabase.definicion_equilibrios = await callGeminiWithRetry(
            `Contexto previo:\nIndividualidades y Acciones: "${storyDatabase.definicion_individualidades}\n${storyDatabase.definicion_acciones}"\n\nDefine los EQUILIBRIOS: los contrapesos del orden, límites morales, códigos implícitos, mecánicas estructurales, leyes gubernamentales o balances cósmicos que impiden que el caos de las Acciones destruya el Conjunto inmediatamente.`,
            systemInstructionMaster
        );
        updateFieldDisplay('equilibrios', storyDatabase.definicion_equilibrios);
        updateProgressBar(++step);
        
        // 5. LA TRAMA (EL AMASADO MAESTRO)
        logConsole("Amasando el Eje Macro de la Trama Central...");
        storyDatabase.la_trama = await callGeminiWithRetry(
            `Cruza de forma milimétrica los cuatro pilares fundamentales previos:\n- Conjunto: "${storyDatabase.definicion_conjunto}"\n- Individualidades: "${storyDatabase.definicion_individualidades}"\n- Acciones: "${storyDatabase.definicion_acciones}"\n- Equilibrios: "${storyDatabase.definicion_equilibrios}"\n\nAmasa y define la TRAMA CENTRAL de la obra. No hagas un resumen vago; detalla el conflicto fundacional, el enigma motor, las subtramas de fricción secundaria y el vector exacto de desarrollo en el que las individualidades colisionan con los equilibrios debido a sus acciones.`,
            systemInstructionMaster
        );
        updateFieldDisplay('la_trama', storyDatabase.la_trama);
        updateProgressBar(++step);
        
        // 6. CIENCIAS DE LA HISTORIA
        logConsole("Generando Ciencias de la Historia...");
        storyDatabase.ciencias_historia = await callGeminiWithRetry(
            `Basándote en la Trama y el Cosmos definido, detalla las CIENCIAS DE ESTA HISTORIA: la epistemología, los conocimientos técnicos, métodos arcanos, saberes forenses, lenguajes perdidos o sistemas de reglas lógicas que las individualidades deben dominar o descifrar para avanzar en la trama.`,
            systemInstructionMaster
        );
        updateFieldDisplay('ciencias_historia', storyDatabase.ciencias_historia);
        updateProgressBar(++step);
        
        // 7. LOS EVENTOS (SECUENCIA DE IMPACTOS)
        logConsole("Amasando Los Eventos Hito y encrucijadas...");
        storyDatabase.los_eventos = await callGeminiWithRetry(
            `Trama Central: "${storyDatabase.la_trama}"\n\nEstablece una secuencia cronológica e inamovible de LOS EVENTOS HITO (puntos de inflexión, incidentes instigadores, crímenes, revelaciones de secretos o cataclismos relacionales). Cada evento debe ser la consecuencia directa inevitable del evento anterior y la causa del siguiente (Efecto Dominó).`,
            systemInstructionMaster
        );
        updateFieldDisplay('los_eventos', storyDatabase.los_eventos);
        updateProgressBar(++step);
        
        // 8. LOS SENTIMIENTOS DOMINANTES
        logConsole("Generando Los Sentimientos Dominantes...");
        storyDatabase.los_sentimientos = await callGeminiWithRetry(
            `Basándote en las individualidades y la secuencia de eventos, describe LOS SENTIMIENTOS dominantes que tiñen la atmósfera psíquica de la novela (la paranoia colectiva, la desolación de los espacios, la obsesión, el luto soterrado o el cinismo institucional). Define cómo mutan estos sentimientos a medida que los eventos escalan.`,
            systemInstructionMaster
        );
        updateFieldDisplay('los_sentimientos', storyDatabase.los_sentimientos);
        updateProgressBar(++step);
        
        // 9. LOS MOTIVOS ONTOLÓGICOS
        logConsole("Generando Los Motivos Ontológicos...");
        storyDatabase.los_motivos = await callGeminiWithRetry(
            `Trama, Eventos y Sentimientos acumulados.\nDefine LOS MOTIVOS subyacentes: los impulsos ontológicos profundos, las deudas de sangre, las pulsiones ocultas, ambiciones invisibles o imperativos existenciales que obligan a las individualidades a mantener la fricción viva sin retroceder.`,
            systemInstructionMaster
        );
        updateFieldDisplay('los_motivos', storyDatabase.los_motivos);
        updateProgressBar(++step);
        
        // 10. LOS LUGARES Y ESPACIOS
        logConsole("Generando Los Lugares y Espacios...");
        storyDatabase.los_lugares = await callGeminiWithRetry(
            `Ecosistema: "${storyDatabase.definicion_conjunto}"\nEventos: "${storyDatabase.los_eventos}"\n\nDetalla LOS LUGARES y espacios liminales, escenas del crimen, arquitecturas lúgubres, geografías monumentales o habitaciones cerradas donde transcurre cada hito. Cada espacio debe actuar como un reflejo físico de la tensión dramática del momento.`,
            systemInstructionMaster
        );
        updateFieldDisplay('los_lugares', storyDatabase.los_lugares);
        updateProgressBar(++step);
        
        // 11. HISTORIA PREVIA (LORE FUNDACIONAL)
        logConsole("Generando La Historia Previa (Lore)...");
        storyDatabase.historia_previa = await callGeminiWithRetry(
            `Conectando todo el trasfondo generado hasta ahora, escribe la HISTORIA PREVIA (el lore antiguo, mitos de origen erróneos, crónicas manipuladas, traiciones ancestrales o precedentes históricos que justifican el estado actual de los equilibrios y los rencores de las facciones).`,
            systemInstructionMaster
        );
        updateFieldDisplay('historia_previa', storyDatabase.historia_previa);
        updateProgressBar(++step);
        
        // 12. LOS GRUPOS Y FACCIONES
        logConsole("Generando Los Grupos y Facciones...");
        storyDatabase.los_grupos = await callGeminiWithRetry(
            `Para tensar la red política y social del relato, define LOS GRUPOS (facciones, cofradías, corporaciones, agencias de detectives, logias o colectivos criminales). Especifica qué recursos controlan, qué secretos del Lore conocen y cuál es su postura exacta frente a la Trama Central.`,
            systemInstructionMaster
        );
        updateFieldDisplay('los_grupos', storyDatabase.los_grupos);
        updateProgressBar(++step);
        
        // 13. LOS JUEGOS O DINÁMICAS
        logConsole("Generando Los Juegos o Dinámicas...");
        storyDatabase.los_juegos = await callGeminiWithRetry(
            `Grupos y Motivos previos.\nDefine LOS JUEGOS O DINÁMICAS: las reglas explícitas o implícitas de interacción, estrategias políticas de manipulación, dinámicas rituales, protocolos judiciales o tabúes sociales que limitan o guían las interacciones entre facciones rivales.`,
            systemInstructionMaster
        );
        updateFieldDisplay('los_juegos', storyDatabase.los_juegos);
        updateProgressBar(++step);
        
        // 14. LAS POSIBILIDADES LATENTES
        logConsole("Amasando Las Posibilidades Latentes (Bifurcaciones)...");
        storyDatabase.las_posibilidades = await callGeminiWithRetry(
            `Considerando la inestabilidad de la trama, detalla LAS POSIBILIDADES LATENTES: los vectores alternativos, los giros inesperados bajo la superficie, sospechas erróneas viables, falsas pistas estructurales y caminos que el lector o los personajes creen posibles pero que esconden dobles fondos estructurales.`,
            systemInstructionMaster
        );
        updateFieldDisplay('las_posibilidades', storyDatabase.las_posibilidades);
        updateProgressBar(++step);
        
        // 15. LA VARIEDAD SIMBÓLICA
        logConsole("Generando La Variedad Simbólica...");
        storyDatabase.la_variedad = await callGeminiWithRetry(
            `Define LA VARIEDAD: la red de objetos mundanos, reliquias antiguas, sustancias químicas, indicios materiales, pistas físicas u objetos cargados de peso simbólico que circulan de mano en mano a lo largo de los Eventos Hito.`,
            systemInstructionMaster
        );
        updateFieldDisplay('la_variedad', storyDatabase.la_variedad);
        updateProgressBar(++step);
        
        // 16. LA REPERCUSIÓN FINAL
        logConsole("Generando La Repercusión Final...");
        storyDatabase.la_repercusion = await callGeminiWithRetry(
            `Para cerrar la Base de Datos Cohesionada, define la REPERCUSIÓN DE LOS ACONTECIMIENTOS: cómo el colapso final de la trama y la resolución de los eventos destruye, muta o transforma definitivamente el Conjunto y los Equilibrios iniciales, dejando una huella imborrable.`,
            systemInstructionMaster
        );
        updateFieldDisplay('la_repercusion', storyDatabase.la_repercusion);
        updateProgressBar(++step);
        
        logConsole("Base de datos unificada y amasada con éxito en sintonía con las directrices del género.", "success");
        await generarLibroCompleto();
        // Preparación del JSON Final de salida simbólica
        finalBookJSON.titulo = document.getElementById('book-title').value.trim();
        finalBookJSON.autores = document.getElementById('book-authors').value.trim();
        finalBookJSON.tono = mainGenre;
        finalBookJSON.estilo = subgenre;
        
        changePhaseBadge("Pipeline completado");
        logConsole("Proceso finalizado correctamente.", "success");
        document.getElementById('btn-download').disabled = false;
    } catch (error) {
        logConsole(`Fallo estructural en el Pipeline: ${error.message}`, 'error');
        changePhaseBadge("Error en Pipeline");
    } finally {
        document.getElementById('btn-start').disabled = false;
    }
}

function downloadJSON() {
    logConsole("Preparando descarga del archivo estructural final...");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalBookJSON, null, 4));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${document.getElementById('book-title').value.trim() || 'libro'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// Inicialización automática de subgéneros al arrancar la pantalla
window.addEventListener('DOMContentLoaded', () => {
    updateSubgenres();
    drawCanvasMatrix(0, totalSteps);
});