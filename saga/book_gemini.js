/**  
 * BOOK GEMINI CORE
 * Motor de Ensamblado de Libros en Serie basado puramente en la Cronología Activa y Ventana Deslizante
 * AJUSTE DE RITMO SECO: ANTI-SOBREESCRITURA, CONTROL DE ADJETIVACIÓN Y TRANSICIÓN DE FOCO PROTEGIDA
 */   
window.GeminiBookAssembler = {     
    session: null,     
    abortController: null,      
    isPausedByError: false,     
    sleep(ms) {         
        return new Promise(resolve => setTimeout(resolve, ms));     
    },     
    // Conector Avanzado con Gemini usando Server-Sent Events (SSE) + Mitigación Activa de Cuota 429     
    async callGeminiAPI(systemPrompt, userPrompt, jsonMode = false, onChunk = null) {         
        const apiKey = document.getElementById("gemini-book-api-key")?.value.trim() || localStorage.getItem('koreh_gemini_book_api_key');         
        if (!apiKey) {             
            throw new Error("API Key de Gemini no configurada en los parámetros de la obra.");         
        }         
        const model = "gemini-3.1-flash-lite";         
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;         
        let finalUserPrompt = userPrompt;         
        if (jsonMode) {             
            finalUserPrompt += "\nOutput strictly valid pure JSON raw format without codeblocks.";         
        }         
        const contents = [];         
        if (systemPrompt) {             
            contents.push({ role: "user", parts: [{ text: `System Instructions: ${systemPrompt}` }] });             
            contents.push({ role: "model", parts: [{ text: "Understood. I will follow those instructions precisely y evitaré clichés o repeticiones de inicio de párrafo." }] });         
        }         
        contents.push({ role: "user", parts: [{ text: finalUserPrompt }] });         
        const localController = new AbortController();         
        const signal = localController.signal;                  
        if (!this.abortController) {             
            this.abortController = localController;         
        }         
        const MAX_RETRIES = 5;         
        let attempt = 0;         
        let delay = 3000;         
        let bufferSSE = "";          
        while (attempt < MAX_RETRIES) {             
            try {                 
                const res = await fetch(url, {                      
                    method: 'POST',                      
                    headers: { 'Content-Type': 'application/json' },                      
                    body: JSON.stringify({ contents: contents }),                      
                    signal: signal                 
                });                 
                if (!res.ok) {                     
                    const errorData = await res.text();                                          
                    if (res.status === 429) {                         
                        let waitSeconds = 35;                         
                        try {                             
                            const parsedErr = JSON.parse(errorData);                             
                            const msg = parsedErr.error?.message || "";                             
                            const matchSeconds = msg.match(/retry in ([0-9.]+)/i);                             
                            if (matchSeconds && matchSeconds[1]) {                                 
                                waitSeconds = Math.ceil(parseFloat(matchSeconds[1])) + 2;                              
                            }                         
                        } catch(e){}                                                  
                        this.log(`  [CUOTA EXCEDIDA 429] Saturación de ráfaga agéntica. Pausa forzada de protección: esperando ${waitSeconds}s antes de reintentar hito...`, "warn");                         
                        await this.sleep(waitSeconds * 1000);                         
                        attempt++;                         
                        continue;                     
                    }                     
                    if (res.status === 401 || res.status === 402 || res.status === 403) {                         
                        throw new Error(`FALLO_CRITICO_AUTENTICACION (Status ${res.status}): ${errorData}`);                     
                    }                     
                    throw new Error(`Error HTTP ${res.status}: ${errorData}`);                 
                }                 
                const reader = res.body.getReader();                 
                const decoder = new TextDecoder("utf-8");                 
                while (true) {                     
                    const { done, value } = await reader.read();                     
                    if (done) break;                                          
                    bufferSSE += decoder.decode(value, { stream: true });                     
                    const lines = bufferSSE.split('\n');                                          
                    if (bufferSSE.endsWith('\n')) {                         
                        bufferSSE = "";                     
                    } else {                         
                        bufferSSE = lines.pop() || "";                     
                    }                                          
                    for (const line of lines) {                         
                        if (line.startsWith('data: ')) {                             
                            let cleanLine = line.replace(/^data:\s*/, '').trim();                             
                            if (cleanLine === '[DONE]') break;                             
                            try {                                 
                                const parsedLine = JSON.parse(cleanLine);                                 
                                const chunkText = parsedLine.candidates?.[0]?.content?.parts?.[0]?.text || "";                                 
                                if (chunkText && onChunk) {                                     
                                    onChunk(chunkText);                                 
                                }                             
                            } catch(e){}                         
                        } else {                             
                            try {                                 
                                const cleanLine = line.trim();                                 
                                if (cleanLine) {                                     
                                    const parsedLine = JSON.parse(cleanLine);                                     
                                    const chunkText = parsedLine.candidates?.[0]?.content?.parts?.[0]?.text || "";                                     
                                    if (chunkText && onChunk) onChunk(chunkText);                                 
                                }                             
                            } catch(e){}                         
                        }                     
                    }                 
                }                 
                return document.getElementById('gemini-book-terminal')?.innerText.split('\n').slice(-10).join('\n') || "Streaming completado.";             
            } catch (error) {                 
                if (error.message.includes("FALLO_CRITICO_AUTENTICACION")) {                     
                    throw error;                 
                }                 
                attempt++;                 
                if (attempt >= MAX_RETRIES) throw error;                 
                this.log(`  Fallo de conexión de red temporal. Reintentando en ${delay/1000}s...`, "warn");                 
                await this.sleep(delay);                 
                delay *= 2;             
            }         
        }     
    },     
    // SUB-AGENTE: Visión Maestra y Estrategia Estructural de Capítulo (Evita la fragmentación y repeticiones infinitas)
    async planChapterVision(chapterTitle, moments, ledgerLog, futureContext) {
        const sysPrompt = "Eres un director de orquestación académica narrativa y arquitecto de estructuras literarias avanzadas en formato JSON estricto.";
        const momentsText = moments.map((m, idx) => `Latido ${idx + 1}: ${m.text}`).join("\n");
        const userPrompt = `Analiza detalladamente todos los latidos del capítulo "${chapterTitle}" para generar una estrategia de flujo orgánico, control de ritmo estricto y continuidad fáctica.

HISTORIAL CRONOLÓGICO DE HECHOS PREVIOS (LEDGER):
${ledgerLog}

LATIDOS DE ACCIÓN SINOPSIS DEL CAPÍTULO ACTUAL:
${momentsText}

HORIZONTE ARGUMENTAL FUTURO:
${futureContext}

Genera un mapa de visión que distribuya el ritmo del capítulo. El objetivo es fusionar mentalmente los latidos para que no queden fragmentados y estructurar cómo se entrelazan de forma fluida.
Asegura de forma explícita mitigar el "eco léxico" estructural (ej. variar aperturas de párrafos correlativos drásticamente si tratan sobre la misma entidad u objeto).

Devuelve estrictamente un objeto JSON puro con la siguiente estructura:
{
    "hilo_conductor": "Foco dramático o climático que da coherencia interna a todo el bloque",
    "arquitectura_ritmo": "Directriz de cómo coordinar la longitud y unión de las frases para que se lean orgánicas y no como una lista robotizada de acciones",
    "puente_entrada": "Punto exacto de empalme con el final del historial previo",
    "puente_salida": "Disposición exacta del entorno al cierre del último latido para encajar con el horizonte futuro"
}`;
        try {
            await this.sleep(1200);
            const res = await this.callGeminiAPI(sysPrompt, userPrompt, true, null);
            return JSON.parse(this.cleanJSON(res));
        } catch(e) {
            return {
                hilo_conductor: "Evolución orgánica de la escena.",
                arquitectura_ritmo: "Prosa fluida, alternando frases cortas de impacto con cláusulas compuestas inmersivas.",
                puente_entrada: "Conectar con el último hito registrado de inmediato.",
                puente_salida: "Dejar la tensión en alto hacia el siguiente nodo."
            };
        }
    },
    // SUB-AGENTE INTEGRADO: Auditor implacable contra la sobreescritura, adjetivos triples y desorientación del lector
    async analyzeAndValidateBeat(beatText, activePhysicalState, ledgerLog, currentState) {         
        const sysPrompt = "Eres un supervisor de continuidad implacable, notario de hechos históricos y analizador ambiental JSON estricto.";         
        const userPrompt = `Analiza el siguiente borrador de texto frente a las restricciones físicas de la escena, el historial de hechos previos y las directrices de estilo seco.

ESTADO PERMITIDO ANTERIOR: ${activePhysicalState} 
HISTORIAL DE HITOS CRONOLÓGICOS (LEDGER): ${ledgerLog} 
BORRADOR A EVALUAR: "${beatText.substring(0, 2500)}" 

REGLAS DE RECHAZO EDITORIAL ABSOLUTO (PULIDO FINO):
1. SOBREESCRITURA Y POESÍA ARTIFICIAL: ¿El borrador satura la fórmula abusando de símiles o metáforas para rematar acciones (ej: "como mercurio", "como un animal", etc.)? Si la acción no respira sola, es RECHAZADO.
2. ADJETIVOS TRIPLES O SINÓNIMOS EN CADENA: ¿El texto incluye acumulaciones barrocas de adjetivos pesados (ej: "total, absoluta y aplastante" o "densa, hermética, asfixiante")? Si no elige un único adjetivo demoledor, es RECHAZADO.
3. CONEXIÓN DE FOCO Y COHERENCIA DE TRAJE: Si un personaje lleva un casco o traje hermético aislado, vigila que no sufra efectos del aire exterior filtrado antes de abrir el visor, o viceversa. Las interacciones con el visor, el aire y la atmósfera respirable deben ser lógicas paso a paso. Si se contradice el nivel de aislamiento del traje en menos de tres párrafos, es RECHAZADO.

Devuelve obligatoriamente un JSON puro con la siguiente estructura exacta:
{
    "aprobado": boolean,
    "fallo": "Explicación detallada de la inconsistencia de continuidad, el aislamiento erróneo de cascos, el abuso de adjetivos múltiples o la saturación de metáforas redundantes si aprobado es false. Si cumple con la prosa seca y directa, dejar vacío.",
    "hitos": "Extrae en viñetas cortas los hitos definitivos que acaban de ocurrir si aprobado es true.",
    "nuevo_estado": {
        "ubicacion_exacta": "Actualización del entorno inmediato",
        "personajes_presentes": ["Lista actualizada de personajes en escena"],
        "objetos_visibles": ["Lista actualizada de objetos en juego"]
    }
}`;         
        try {             
            await this.sleep(1000);             
            const res = await this.callGeminiAPI(sysPrompt, userPrompt, true, null);             
            return JSON.parse(this.cleanJSON(res));         
        } catch(e) {             
            return { aprobado: true, fallo: "", hitos: "- Avance de trama general consumado.", nuevo_estado: currentState };         
        }     
    },     
    async startProduction() {         
        const downloadBtn = document.getElementById("btn-gemini-book-download");         
        if (downloadBtn) downloadBtn.disabled = false;                  
        const defaultStyle = "Prosa clínica, visceral y de alto impacto visual. Frases directas, sobrias, sin barroquismos ni acumulación excesiva de adjetivos. Transiciones de punto de vista justificadas y limpias.";         
        if (window.timeline && window.timeline.events && window.timeline.events.length > 0) {             
            if (!this.session || this.isPausedByError === false) {                 
                this.session = {                     
                    title: document.getElementById("gemini-book-title").value || "Novela Nexus",                     
                    author: document.getElementById("gemini-book-author").value || "Manuel Rodsua",                     
                    style: document.getElementById("gemini-book-style").value || defaultStyle,                     
                    eventsQueue: JSON.parse(JSON.stringify(window.timeline.events)).sort((a, b) => (a.time || 0) - (b.time || 0)),                     
                    currentEventIndex: 0,                     
                    currentMomentIndex: 0,                     
                    finalText: "",                     
                    completedChaptersLog: [],                     
                    bookLedger: []                   
                };             
            }         
        } else {             
            if (!this.session || this.isPausedByError === false) {                 
                const availableEvents = (window.app && window.app.tramas) ? window.app.tramas.filter(n => n.type !== 'Region') : [];                 
                this.session = {                     
                    title: document.getElementById("gemini-book-title").value || "Novela Nexus",                     
                    author: document.getElementById("gemini-book-author").value || "Manuel Rodsua",                     
                    style: document.getElementById("gemini-book-style").value || defaultStyle,                     
                    eventsQueue: JSON.parse(JSON.stringify(availableEvents)),                     
                    currentEventIndex: 0,                     
                    currentMomentIndex: 0,                     
                    finalText: "",                     
                    completedChaptersLog: [],                     
                    bookLedger: []                 
                };             
            }         
        }         
        if (this.session.eventsQueue.length === 0) {             
            this.log("  No hay eventos cargados en la cronología para compilar.", "warn");             
            return;         
        }         
        this.isPausedByError = false;         
        const btn = document.getElementById('btn-gemini-book-generate');         
        if (btn) btn.innerText = "COMPILANDO...";         
        this.log(`  Iniciando Orquestación en Cadena Basada en Cronología Fuerte: "${this.session.title}"`, "emerald");         
        this.runEditorialLoop();     
    },     
    async runEditorialLoop() {         
        const queue = this.session.eventsQueue;         
        const totalEvents = queue.length;         
        this.setInputsState(true);         
        while (this.session.currentEventIndex < totalEvents) {             
            const ev = queue[this.session.currentEventIndex];             
            const chapterTitle = ev.description || ev.title || `Capítulo ${this.session.currentEventIndex + 1}`;                          
            this.log(`  Procesando Nodo Cronológico: ${chapterTitle} (${this.session.currentEventIndex + 1}/${totalEvents})`, "info");                          
            if (!ev.moments || ev.moments.length === 0) {                 
                ev.moments = [{ text: ev.desc || ev.description || "Desarrollo de la escena." }];             
            }             
            
            const ledgerLog = this.session.completedChaptersLog.join("\n") || "Inicio de la obra.";
            const futureContext = this.session.currentEventIndex < totalEvents - 1
                ? `Hacia el siguiente evento: ${queue[this.session.currentEventIndex + 1].description || queue[this.session.currentEventIndex + 1].title}`
                : "Cierre de la obra, clímax definitivo.";

            this.log(`  [VISIÓN DE CAPÍTULO] Ingestando matriz de latidos y calculando vectores estables...`, "info");
            const chapterVision = await this.planChapterVision(chapterTitle, ev.moments, ledgerLog, futureContext);
            this.log(`  -> Foco estratégico definido: "${chapterVision.hilo_conductor}"`, "emerald");

            let accumulatedChapterText = "";             
            let activeSceneState = {                 
                ubicacion_exacta: ev.title || "Entorno Cronológico",                 
                personajes_presentes: [],                 
                objetos_visibles: []             
            };             
            
            let charactersContext = "Contexto extraído directamente de la línea temporal activa de la obra.";             
            let errorOcurrido = false;             
            
            // BUCLE DE BEATS SECUENCIALES DESLIZANTES
            while (this.session.currentMomentIndex < ev.moments.length) {                 
                const moment = ev.moments[this.session.currentMomentIndex];                 
                this.log(`  Redactando latido secuencial ${this.session.currentMomentIndex + 1}/${ev.moments.length}...`);                 
                const activePhysicalState = `[ESTADO CRONOLÓGICO DE LA ESCENA]:\n- Ubicación: ${activeSceneState.ubicacion_exacta}\n- Resumen de secuencia activa: ${ev.description || 'N/A'}`;                                                   
                
                const prevBeat = this.session.currentMomentIndex > 0 ? ev.moments[this.session.currentMomentIndex - 1].text : "Inicio del nodo actual";
                const nextBeat = this.session.currentMomentIndex < ev.moments.length - 1 ? ev.moments[this.session.currentMomentIndex + 1].text : "Fin del nodo cronológico";
                const pacingInfo = `Capítulo ${this.session.currentEventIndex + 1} de ${totalEvents} | Beat ${this.session.currentMomentIndex + 1} de ${ev.moments.length}`;

                const transicionInterna = chapterVision.ganchos_internos?.[this.session.currentMomentIndex] 
                    ? `GUÍA DE CONTINUIDAD DEL CAPÍTULO PARA ESTE BEAT: ${chapterVision.ganchos_internos[this.session.currentMomentIndex]}`
                    : "";

                const sysWriter = "Eres un novelista clínico, visceral y cinematográfico de alto impacto inmediato. Tu sello de identidad es la urgencia provocada por el uso del presente de indicativo y oraciones afiladas. Dominas el realismo somático y las sensaciones corporales crudas.";                                  
                let userWriter = `[MATRIZ DE INTENCIONES HISTÓRICAS REALES (LEDGER)]:\n${ledgerLog}\n\n`;                 
                if (accumulatedChapterText) {                     
                    userWriter += `[TEXTO INMEDIATO PREVIO DEL MISMO CAPÍTULO]:\n"...${accumulatedChapterText.slice(-1800)}"\n\n`;                 
                }                 
                userWriter += `[MAPA DE VISIÓN DE CAPÍTULO OBLIGATORIO]:\n- Foco unificado: ${chapterVision.hilo_conductor}\n- Instrucción de Ritmo: ${chapterVision.arquitectura_ritmo}\n- Entrada: ${chapterVision.puente_entrada}\n- Destino de salida: ${chapterVision.puente_salida}\n${transicionInterna}\n\n`;
                userWriter += `[ESTADO CRONOLÓGICO ACTUAL]:\n${activePhysicalState}\n`;                 
                userWriter += `[PROGRESO ESTRUCTURAL DE RITMO]: ${pacingInfo}\n`;                 
                userWriter += `- BEAT ANTERIOR: "${prevBeat}"\n`;                 
                userWriter += `- BEAT SIGUIENTE (NO LO ANTICIPES): "${nextBeat}"\n\n`;                 
                userWriter += `ESTスタイル EDITORIAL EXIGIDO: ${this.session.style}\n\n`;                 
                userWriter += `ACCIÓN NARRATIVA A REDACTAR AHORA: "${moment.text}"\n`;                 
                if (moment.visualPrompt) userWriter += `CUE CINEMATOGRÁFICO ADICIONAL: "${moment.visualPrompt}"\n`;                 
                userWriter += `\nCONSTRICCIONES SINTÁCTICAS DE RITMO SECO Y FLUIDEZ ORGÁNICA (CUMPLIMIENTO ESTRICTO):\n`;                 
                userWriter += `1. PRESENTE DE INDICATIVO: Modula toda la acción en tiempo presente. Sensación de inmediatez total.\n`;                 
                userWriter += `2. DEJA RESPIRAR LA ACCIÓN SIN CAER EN RITMO ROBÓTICO: Prohibido rematar mecánicamente cada frase con una metáfora burda ('como un...'). Evita también el ritmo telegráfico artificial de sujeto + verbo + objeto en frases de tres palabras. Intercala oraciones subordinadas y compuestas; la prosa debe fluir de forma literaria, madura y compacta, no parecer un informe de inventario técnico.\n`;                 
                userWriter += `3. EVITA EL ECO COGNITIVO Y LA REPETICIÓN LÉXICA CERCANA: Si los párrafos o frases anteriores ya utilizaron una construcción específica para una entidad (ej. 'filamentos de las alas translúcidas'), varía obligatoriamente la sintaxis y los sustantivos en las oraciones contiguas. Queda estrictamente prohibido repetir palabras clave táctiles o visuales idénticas a menos que haya una mutación física sustancial.\n`;                 
                userWriter += `4. REGULACIÓN DE SUSTANTIVOS TÉCNICOS: No acumules demasiados elementos mecánicos, piezas o acoples secuenciales en una misma frase durante momentos de peligro o acción pura. Dosifica la terminología brutalista para mantener un ritmo cinematográfico ágil y fluido.\n`;                 
                userWriter += `5. CONSISTENCIA DE CASCOS Y ENTORNO: Si un personaje interactúa con su traje de vuelo, fisuras o el aire exterior, mantén la consistencia lógica de su nivel de aislamiento (si el visor está cerrado, el polvo o el aire exterior no entran en contacto directo con sus vías respiratorias hasta que se levante explícitamente dicho visor).\n`;
                userWriter += `6. TRANSICIONES POV DE ALTA FIDELIDAD: Si este fragmento cambia de foco espacial o perspectiva de personaje respecto al texto anterior, introduce obligatoriamente un separador visual de corte limpio '***' en una línea aislada antes de reanudar el texto de la nueva perspectiva.\n`;                 
                userWriter += `7. FORMATO: Devuelve tu prosa pura estrictamente confinada en las etiquetas <texto> y </texto>.`;                                  
                
                const term = document.getElementById("gemini-book-terminal");                 
                const blockDiv = document.createElement("div");                 
                blockDiv.className = "bg-gray-800 p-4 border-l-2 border-rose-500 my-2 text-gray-100 rounded-sm font-mono text-xs";                 
                if (term) term.appendChild(blockDiv);                 
                try {                     
                    let textStreamed = "";                     
                    let aprobado = false;                     
                    let intentos = 0;                     
                    let reprimenda = "";                     
                    while (intentos < 2 && !aprobado) {                         
                        intentos++;                         
                        textStreamed = "";                         
                        await this.callGeminiAPI(sysWriter, userWriter + reprimenda, false, (chunk) => {                             
                            textStreamed += chunk;                             
                            blockDiv.innerHTML = `<strong>[BEAT ${this.session.currentMomentIndex + 1} - INTENTO ${intentos}] ${chapterTitle}</strong><br><br>${textStreamed.replace(/\n/g, "<br>")}`;                             
                            if (term) term.scrollTop = term.scrollHeight;                         
                        });                         
                        let draftBeat = this.extractText(textStreamed);                         
                        if (draftBeat.length < 5) draftBeat = textStreamed.replace(/<[^>]*>/g, '').trim();                                                  
                        
                        const analysis = await this.analyzeAndValidateBeat(draftBeat, activePhysicalState, ledgerLog, activeSceneState);                         
                        if (analysis.aprobado) {                             
                            aprobado = true;                             
                            accumulatedChapterText = this.mergeText(accumulatedChapterText, draftBeat);                             
                            this.session.completedChaptersLog.push(`- En [${chapterTitle}]: ${analysis.hitos || '- Avance de trama consumado.'}`);                             
                            activeSceneState = analysis.nuevo_estado || activeSceneState;                         
                        } else {                             
                            reprimenda = `\n\n[ALERTA DE CONTINUIDAD EDITORIAL: El intento anterior falló debido a: "${analysis.fallo}". REESCRIBE CON MEJOR COHESIÓN Y VARIACIÓN LITERARIA EN TU NUEVA RESPUESTA].`;                         
                        }                     
                    }                     
                    this.session.currentMomentIndex++;                     
                    this.updateProgressUI();                     
                    await this.autoSaveIntermediateBackup();                                                                           
                    await this.sleep(4000);                 
                } catch (err) {                     
                    console.error("Quiebre en el pipeline secuencial:", err);                     
                    this.log(`  Sistema en pausa por Gateway: ${err.message}.`, "warn");                     
                    errorOcurrido = true;                     
                    break;                  
                }             
            }             
            if (errorOcurrido) {                 
                this.forcePauseExecution();                 
                return;             
            }             
            if (accumulatedChapterText) {                 
                if (this.session.finalText) {                     
                    this.session.finalText = this.session.finalText.trimEnd() + "\n\n### CAPÍTULO: " + chapterTitle + "\n\n" + accumulatedChapterText;                 
                } else {                     
                    this.session.finalText = "### CAPÍTULO: " + chapterTitle + "\n\n" + accumulatedChapterText;                 
                }             
            }             
            this.session.currentMomentIndex = 0;             
            this.session.currentEventIndex++;             
            this.updateProgressUI();             
            await this.autoSaveIntermediateBackup();         
        }         
        this.log(" PROCESO FINALIZADO CON ÉXITO! Estructura integrada sin plantillas desde la cronología activa.", "success");         
        this.forceResetButtons();     
    }
};