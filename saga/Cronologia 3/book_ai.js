// --- cronologia/book_ai.js ---
// Propósito: Motor IA de Continuidad Orgánica (PATRÓN CHUNKING + PARALELISMO MASIVO + RELEVO ESTRICTO XML).
// ACTUALIZADO: Tono equilibrado y positivo. Fluidez narrativa, integración orgánica de salidas + CONECTORES INTERNOS Y EXTERNOS usando ecosistema FAST. Corrección de solapamiento.

const BookAI = {
    async callModel(systemRole, userText, modelName = 'gemini-fast', maxRetries = 3, temperature = 0.60) {
        const authKey = (window.parent && window.parent.SystemConfig && window.parent.SystemConfig.authKey) 
                        || window.Sys?.authKey 
                        || localStorage.getItem('silenos_auth_key')
                        || window.ai?.authKey
                        || localStorage.getItem('pollinations_api_key');

        if (!authKey) {
            console.error("No se encontró clave.");
            throw new Error("Sistema desconectado. Verifica autenticación.");
        }

        let currentModel = modelName;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                    method: 'POST', 
                    headers: { 
                        'Authorization': `Bearer ${authKey}`, 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ 
                        model: currentModel, 
                        messages: [ 
                            { role: 'system', content: systemRole }, 
                            { role: 'user', content: userText } 
                        ],
                        temperature: temperature 
                    })
                });
                
                if (!response.ok) throw new Error(await response.text());
                const data = await response.json();
                return data.choices[0].message.content;
                
            } catch (error) {
                console.warn(`Intento ${attempt} fallido con modelo ${currentModel}:`, error);
                
                if (attempt === maxRetries) {
                    console.error("Error definitivo en BookAI tras múltiples intentos:", error);
                    throw error;
                }
                
                console.log(`Cambiando a 'gemini-fast' y reintentando... (Intento ${attempt + 1}/${maxRetries})`);
                currentModel = 'gemini-fast';
                
                // Backoff exponencial
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
    },

    cleanJSON(str) {
        str = str.replace(/```json/gi, '').replace(/```/g, '').trim();
        const first = str.indexOf('{');
        const last = str.lastIndexOf('}');
        if (first !== -1 && last !== -1 && last > first) {
            return str.substring(first, last + 1);
        }
        return str; 
    },

    extractCleanText(llmResponse) {
        if (!llmResponse) return "";
        
        // 1. Extraer el texto confinado en XML (si existe)
        const match = llmResponse.match(/<texto>([\s\S]*?)<\/texto>/i);
        let text = match ? match[1] : llmResponse;
        
        // 2. Limpiar bloques markdown residuales
        text = text.replace(/^```[\s\S]*?\n/gi, '').replace(/```$/g, '');
        
        // 3. Limpieza de artefactos de puntuación
        text = text.replace(/\s*\.\s*\./g, '.'); 
        text = text.replace(/\s+\./g, '.'); 
        
        // 4. Equilibrio de comillas
        const quoteCount = (text.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
            text = text.replace(/"([^"]*)$/, '$1'); 
        }

        return text.trim();
    },

    formatObjects(objs) {
        if (!objs || objs.length === 0) return 'Ninguno';
        return objs.map(o => typeof o === 'string' ? o : `${o.item || o} (${o.current_location || 'En escena'})`).join(', ');
    },

    cleanCharacterList(characters) {
        if (!characters || !Array.isArray(characters)) return [];
        let unique = [...new Set(characters)];
        unique = unique.filter(name => !unique.some(other => other !== name && other.includes(name)));
        return unique;
    },

    async simulateGlobalState(eventsQueue, progressCallback) {
        let currentState = {
            location: "Ubicación inicial",
            characters: [],
            objects_in_play: [],
            last_action: "Inicio de la historia",
            clima_atmosfera: "Estándar",
            vector_tiempo: "Continuación",
            paradigma_actual: "Normal"
        };
        const states = [];

        for(let i = 0; i < eventsQueue.length; i++) {
            const ev = eventsQueue[i];

            if (ev.setup_tecnico && Object.keys(ev.setup_tecnico).length > 0) {
                const parsed = {
                    location: ev.setup_tecnico.locacion_explicita || currentState.location,
                    characters: this.cleanCharacterList(ev.setup_tecnico.elenco_activo) || [],
                    objects_in_play: ev.setup_tecnico.objetos_en_uso || [],
                    last_action: ev.deltas_cambios?.cambio_de_paradigma || "Avanza la trama", 
                    clima_atmosfera: ev.setup_tecnico.clima_atmosfera || "Estándar",
                    vector_tiempo: ev.setup_tecnico.vector_tiempo || "Continuación",
                    paradigma_actual: ev.deltas_cambios?.revelacion_clave || "Ninguna"
                };
                currentState = parsed;
                states.push(parsed);
                if (progressCallback) progressCallback('simulation', i + 1, eventsQueue.length);
                continue;
            }

            const masterDirectives = ev.customPrompt || ev.title || "Continúa la historia.";
            const prompt = `ERES EL SUPERVISOR DE CONTINUIDAD. FORMATO DE SALIDA JSON ESTRICTO:
            { "location": "Lugar", "characters": ["Nombres"], "objects_in_play": ["Objetos"], "last_action": "Resumen" }`;
            
            try {
                const res = await this.callModel("Eres un motor de lógica JSON puro.", prompt, "gemini-fast", 3, 0.1);
                const parsed = JSON.parse(this.cleanJSON(res));
                parsed.clima_atmosfera = "Estándar";
                parsed.vector_tiempo = "Continuación";
                parsed.paradigma_actual = "Normal";
                currentState = parsed;
                states.push(parsed);
            } catch(e) {
                states.push(JSON.parse(JSON.stringify(currentState))); 
            }
            if (progressCallback) progressCallback('simulation', i + 1, eventsQueue.length);
        }
        return states;
    },

    async phase0Showrunner(chapterDescription, masterDirectives, futureContext, chapterState) {
        const planningPrompt = `ROL: Arquitecto Literario. TEMA CENTRAL: ${chapterDescription} | HORIZONTE: ${futureContext}\nDIRECTRIZ ABSOLUTA: ${masterDirectives}`;
        return await this.callModel("Eres el arquitecto de una novela best-seller.", planningPrompt, "nova-fast", 3, 0.5);
    },

    async phase1Architect(chapterSynopsis, masterDirectives, chapterStrategy, chapterState) {
        const architectPrompt = `ROL: Coreógrafo de Escena. Divide la acción en 3 a 6 pasos fluidos. SINOPSIS: "${chapterSynopsis}"`;
        return await this.callModel("Eres un estructurador literario.", architectPrompt, "nova-fast", 3, 0.4);
    },

    async phase2Writer(currentBeatText, beatParticipantes, beatIndex, totalBeats, masterDirectives, lastParagraphs, chapterState, eventBase) {
        const isFirst = beatIndex === 1;
        const isLast = beatIndex === totalBeats;
        
        const entryRule = (isFirst && eventBase.frase_entrada) 
            ? `REGLA DE ENTRADA: La escena anterior acaba de terminar con esta acción: "${eventBase.frase_entrada}". ESTÁ PROHIBIDO repetir esta frase. Inicia tu texto directamente con la reacción o el movimiento que le sigue, conectando de forma fluida con el nuevo entorno.`
            : `INICIO: Aterriza al lector suavemente en la acción.`;

        const exitRule = (isLast && eventBase.frase_salida) 
            ? `REGLA DE SALIDA: Guía la narrativa de forma natural para que culmine EXACTAMENTE con esta frase: "${eventBase.frase_salida}". Haz que esta acción final se sienta como una consecuencia orgánica de lo sucedido.`
            : `CIERRE: Fluye hacia la siguiente escena con naturalidad, dejando la acción o el pensamiento en movimiento.`;

        const writerPrompt = `
ROL: Novelista profesional de estilo cinematográfico, inmersivo y natural.

MATRIZ DE ENTORNO: Lugar: ${chapterState.location} | Objetos: ${this.formatObjects(chapterState.objects_in_play)} | Personajes: ${chapterState.characters.join(', ')}.
MANUAL TÉCNICO: ${masterDirectives}
TEXTO PREVIO: "...${(lastParagraphs || "").slice(-2000)}"
LATIDO A ESCRIBIR: "${currentBeatText}"

INSTRUCCIONES DE ESTILO (REFUERZO POSITIVO):
1. NATURALIDAD Y FLUIDEZ: Escribe con prosa armónica. Enfócate en acciones constructivas que sirvan al desarrollo de la trama y de los personajes.
2. DIÁLOGOS VIVOS: Construye conversaciones que suenen a personas reales interactuando con su entorno, reflejando su estado emocional de manera elegante.
3. CONEXIÓN: Utiliza las guías de [COSTURA INTERNA] si están presentes en el latido para hilar este fragmento con el siguiente.
4. ${entryRule}
5. ${exitRule}

Devuelve ÚNICAMENTE tu texto dentro de <texto></texto>.
`;
        return await this.callModel("Eres un novelista experto en prosa fluida e inmersiva.", writerPrompt, "gemini-fast", 3, 0.60);
    },

    async phase3Critic(draft, lastParagraphs, beatIndex, totalBeats, chapterState, eventBase) {
        const criticPrompt = `
ROL: Editor de fluidez narrativa. Revisa este borrador: "${draft}"
PROTOCOLO:
1. Asegura que el lenguaje fluya de forma natural y elegante, enriqueciendo la experiencia del lector.
2. Verifica que las transiciones entre ideas y acciones sean orgánicas y sin saltos bruscos.
3. Si hay una frase final exigida, asegúrate de que esté integrada como parte natural de la escena.
Devuelve ÚNICAMENTE el texto final dentro de <texto></texto>.
`;
        return await this.callModel("Eres un editor literario centrado en la armonía y la naturalidad.", criticPrompt, "gemini-fast", 3, 0.4);
    },

    async generateIsolatedChapter(event, chapterState, futureContext, progressCallback = null) {
        if (progressCallback) progressCallback('writing', event.id, 1, 1);

        const masterDirectives = event.customPrompt || event.title || "Fluye con la narrativa de forma natural.";
        const combinedSynopsis = event.moments && event.moments.length > 0 ? event.moments.map(m => m.text).join(" | ") : event.description;
            
        let chapterParticipants = chapterState.characters;
        if (event.moments && event.moments.length > 0 && event.moments[0].participantes) {
            const allParticipants = event.moments.flatMap(m => m.participantes);
            chapterParticipants = [...new Set(allParticipants)];
        }

        const entryRule = event.frase_entrada 
            ? `REGLA DE ENTRADA: La escena anterior acaba de terminar con esta acción: "${event.frase_entrada}". ESTÁ PROHIBIDO repetir esta frase. Inicia tu texto directamente con la reacción o el movimiento que le sigue, conectando de forma fluida con el nuevo entorno.`
            : `INICIO EN FRÍO: Comienza inmerso en la acción, el diálogo o la atmósfera de la escena.`;

        const exitRule = event.frase_salida 
            ? `REGLA DE SALIDA: Guía la narrativa de forma natural para que culmine EXACTAMENTE con esta frase: "${event.frase_salida}". Haz que esta acción final se sienta como una consecuencia orgánica de lo sucedido.`
            : `CIERRE: Termina la escena dejando un puente emocional o de acción abierto hacia el futuro.`;

        const chapterPrompt = `
ROL: Novelista experto en prosa cinematográfica e inmersiva. Buscamos un equilibrio perfecto: una escritura madura, elegante y natural.

SINOPSIS DEL CAPÍTULO Y COSTURAS INTERNAS: ${combinedSynopsis}
HORIZONTE: ${futureContext}
ENTORNO: Lugar: ${chapterState.location} | Clima: ${chapterState.clima_atmosfera} | Objetos: ${this.formatObjects(chapterState.objects_in_play)}
ELENCO PERMITIDO: ${chapterParticipants.join(', ')}.

MANUAL TÉCNICO Y DIRECTRICES:
${masterDirectives}

INSTRUCCIONES DE ESTILO (COSTURA Y FLUIDEZ):
1. FLUJO INVISIBLE Y COSTURAS INTERNAS: Teje los latidos (beats) de la sinopsis usando las guías de [COSTURA INTERNA] presentes. Asegúrate de que el paso de una acción a otra se sienta continuo y lógico.
2. ACCIÓN Y DIÁLOGO ORGÁNICOS: Muestra las emociones y el avance de la trama a través de interacciones ricas y diálogos integrados, prestando atención al lenguaje corporal sutil.
3. VARIEDAD ESTRUCTURAL: Intercala párrafos de acción, descripciones precisas del entorno y diálogos de forma armónica para mantener un ritmo cautivador.
4. ${entryRule}
5. ${exitRule}

FORMATO DE SALIDA:
Devuelve ÚNICAMENTE tu texto final dentro de <texto></texto>. Cero notas de autor.
`;

        const rawResponse = await this.callModel(
            "Eres un escritor con prosa equilibrada, natural e inmersiva.", 
            chapterPrompt, 
            "gemini-fast", // USO ESTRICTO DEL ECOSISTEMA FAST
            3,
            0.60 
        );

        const finalCleanText = this.extractCleanText(rawResponse);

        return {
            id: event.id,
            title: event.title || "Capítulo",
            text: finalCleanText
        };
    },

    // NUEVO ENFOQUE: Transiciones fluidas y orgánicas
    async generateConnector(textA, textB, bookContext) {
        const prompt = `
ROL: Novelista experto en transiciones fluidas y puentes narrativos.
CONTEXTO GENERAL DE LA OBRA: ${bookContext || "Desarrollo narrativo continuo."}

FINAL DEL CAPÍTULO PREVIO:
"...${textA}"

INICIO DEL CAPÍTULO SIGUIENTE:
"${textB}..."

TAREA: Escribe 1 o 2 párrafos que sirvan como puente orgánico entre estos dos fragmentos.
Enfócate en armonizar el salto de espacio, tiempo o temperatura emocional. Haz que el final del primer texto desemboque naturalmente en la apertura del segundo, creando un tejido intermedio que enriquezca la experiencia del lector. Evita ser redundante con la información que ya existe en los fragmentos.

Devuelve ÚNICAMENTE el texto conector dentro de <texto></texto>. Cero notas de autor.`;

        const rawResponse = await this.callModel(
            "Eres un puente narrativo experto y elegante.", 
            prompt, 
            "gemini-fast", // USO ESTRICTO DEL ECOSISTEMA FAST
            3, 
            0.60
        );

        return this.extractCleanText(rawResponse);
    },

    async generateFullBookParallel(eventsQueue, progressCallback = null, bookContext = "") {
        console.log("Iniciando FASE AGÉNTICA: Simulando línea temporal...");
        const globalStates = await this.simulateGlobalState(eventsQueue, progressCallback);

        if (!bookContext) {
            bookContext = eventsQueue.map(e => e.title || e.description).join(" | ");
        }

        console.log("GENERACIÓN ABSOLUTA: Ejecutando sistema 'One-Shot' con prosa natural equilibrada (gemini-fast)...");
        
        const chapterPromises = eventsQueue.map((event, index) => {
            const state = globalStates[index];
            const futureContext = index < eventsQueue.length - 1 ? `Hacia donde nos dirigimos: ${eventsQueue[index + 1].description || eventsQueue[index + 1].title}` : "Clímax / Final de la obra.";
            return this.generateIsolatedChapter(event, state, futureContext, progressCallback);
        });

        const finalChapters = await Promise.all(chapterPromises);
        console.log("Generación de capítulos completada. Iniciando fase de CONECTORES ORGÁNICOS EXTERNOS...");

        for (let i = 0; i < finalChapters.length - 1; i++) {
            if (progressCallback) progressCallback('connecting', i + 1, finalChapters.length - 1);
            
            const textA = finalChapters[i].text.slice(-1000);
            const textB = finalChapters[i + 1].text.slice(0, 1000);
            
            const connectorText = await this.generateConnector(textA, textB, bookContext);
            
            if (connectorText) {
                finalChapters[i].text += "\n\n" + connectorText;
            }
        }

        console.log("Generación completada. Libro Ensamblado con éxito, incluyendo costuras internas y externas.");
        return finalChapters;
    }
};

window.BookAI = BookAI;