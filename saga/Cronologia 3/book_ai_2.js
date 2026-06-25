// --- cronologia/book_ai_2.js ---
// Propósito: Motor IA de Continuidad Orgánica EN SERIE.
// ARQUITECTURA AGÉNTICA MULTICAPA: Ledger de Intenciones, Director de Continuidad y Fusión Determinista.

const BookAI2 = {
    async callModel(systemRole, userText, modelName = 'nova-fast', maxRetries = 3, temperature = 0.60) {
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
                    console.error("Error definitivo en BookAI2 tras múltiples intentos:", error);
                    throw error;
                }
                
                console.log(`Cambiando a 'gemini-fast' y reintentando... (Intento ${attempt + 1}/${maxRetries})`);
                currentModel = 'gemini-fast'; // Fallback de seguridad
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
    },

    cleanJSON(str) {
        if (!str) return "{}";
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
        const match = llmResponse.match(/<texto>([\s\S]*?)<\/texto>/i);
        let text = match ? match[1] : llmResponse;
        text = text.replace(/^```[\s\S]*?\n/gi, '').replace(/```$/g, '');
        text = text.replace(/\s*\.\s*\./g, '.'); 
        text = text.replace(/\s+\./g, '.'); 
        const quoteCount = (text.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
            text = text.replace(/"([^"]*)$/, '$1'); 
        }
        return text.trim();
    },

    // ALGORITMO DE FUSIÓN MATEMÁTICA (Solución 1A: Recorte de solapamiento)
    mergeOverlappingText(oldText, newText) {
        if (!oldText) return newText.trim();
        const text1 = oldText.trimEnd();
        const text2 = newText.trimStart();
        
        const minOverlap = 15;
        const maxOverlap = Math.min(text1.length, text2.length, 300);
        let bestOverlap = 0;

        for (let i = minOverlap; i <= maxOverlap; i++) {
            const endOfOld = text1.substring(text1.length - i).toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '');
            const startOfNew = text2.substring(0, i).toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '');
            
            if (endOfOld === startOfNew) {
                bestOverlap = i;
            }
        }

        if (bestOverlap > 0) {
            // Recortar la superposición del nuevo texto
            let cutIndex = bestOverlap;
            while(cutIndex < text2.length && text2[cutIndex].match(/[^a-zA-Z0-9áéíóúñ]/)) {
                cutIndex++;
            }
            return text1 + " " + text2.substring(cutIndex).trimStart();
        }

        return text1 + "\n\n" + text2;
    },

    async simulateGlobalState(eventsQueue, progressCallback) {
        if (eventsQueue && !Array.isArray(eventsQueue) && Array.isArray(eventsQueue.events)) {
            eventsQueue = eventsQueue.events;
        }

        let currentState = {
            location: "Ubicación en evolución",
            epoca_tiempo: "Época no definida",
            characters: [],
            objects_in_play: [],
            last_action: "Inicio de la historia",
            clima_atmosfera: "Estándar"
        };
        const states = [];

        for(let i = 0; i < eventsQueue.length; i++) {
            const ev = eventsQueue[i];
            const masterDirectives = ev.customPrompt || ev.description || ev.title || "Continúa la historia.";
            const rawContent = ev.moments ? ev.moments.map(m => `Acción: ${m.text}. Visual: ${m.visualPrompt}`).join(" | ").substring(0, 4000) : "";
            
            const prompt = `ERES EL SUPERVISOR DE CONTINUIDAD ABSOLUTA. 
            OBJETIVO: Extraer el estado general de este capítulo.
            FORMATO DE SALIDA JSON ESTRICTO:
            { 
                "location": "Lugar o lugares principales", 
                "epoca_tiempo": "AÑO o ÉPOCA exacta",
                "characters": ["Personajes presentes"], 
                "clima_atmosfera": "Clima o atmósfera predominante"
            }
            MANUAL Y LORE: ${masterDirectives}
            TEXTO BRUTO: ${rawContent}`;
            
            try {
                const res = await this.callModel("Eres un motor de lógica JSON puro.", prompt, "nova-fast", 3, 0.1);
                const parsed = JSON.parse(this.cleanJSON(res));
                currentState = { ...currentState, ...parsed };
                states.push(currentState);
            } catch(e) {
                states.push(JSON.parse(JSON.stringify(currentState))); 
            }
            if (progressCallback) progressCallback('simulation', i + 1, eventsQueue.length);
        }
        return states;
    },

    async auditBeatResources(momentText, chapterState) {
        const inventory = window.ai ? window.ai.inventory : [];
        if (inventory.length === 0) return "Sin datos en la base de datos local.";

        const prompt = `ROL: Arquitecto Analista de Base de Datos.
        BEAT NARRATIVO A ESCRIBIR: "${momentText}"
        LUGAR ACTUAL: "${chapterState.location}"
        
        INVENTARIO TOTAL DISPONIBLE:
        ${inventory.join('\n')}

        TAREA: Identifica estrictamente qué elementos del INVENTARIO están implicados en este beat.`;

        try {
            return await this.callModel("Eres un puente de datos estricto.", prompt, "nova-fast", 2, 0.1);
        } catch (e) { 
            return "Datos no disponibles."; 
        }
    },

    // AGENTE NOTARIO: Extracting actions for the Ledger (Solución 2A)
    async extractLedger(beatText) {
        const prompt = `Extrae en viñetas muy cortas los HITOS DEFINITIVOS que acaban de ocurrir en este texto (decisiones tomadas, revelaciones dadas, objetos movidos/tirados, movimientos de lugar).
        TEXTO: "${beatText.substring(0, 2000)}"
        FORMATO: Solo viñetas, sin introducciones. Ejemplo: "- Encarna le dijo a su padre que quiere estudiar."`;
        
        try {
            return await this.callModel("Eres un notario de continuidad muy estricto y conciso.", prompt, "gemini-fast", 2, 0.1);
        } catch(e) { return "- Avance de trama general."; }
    },

    async trackMicroState(beatText, currentState) {
        const prompt = `ROL: Rastreador de Continuidad Física (Cámara de Seguridad).
        ESTADO ANTERIOR: ${JSON.stringify(currentState)}
        NUEVA ACCIÓN NARRADA RECIENTEMENTE: "${beatText.substring(0, 1500)}"

        TAREA: Actualiza la ubicación exacta, personajes presentes y objetos visibles basándote SOLO en la acción que acaba de ocurrir. 
        Si alguien se fue, sácalo de 'personajes_presentes'. Si se movieron a otro lugar, actualiza 'ubicacion_exacta'. Si sacaron un objeto, mételo en 'objetos_visibles'.
        
        FORMATO JSON ESTRICTO:
        {
            "ubicacion_exacta": "...",
            "personajes_presentes": ["..."],
            "objetos_visibles": ["..."]
        }`;

        try {
            const res = await this.callModel("Eres un analizador JSON estricto.", prompt, "gemini-fast", 2, 0.1);
            return JSON.parse(this.cleanJSON(res));
        } catch(e) {
            return currentState;
        }
    },

    // AGENTE DIRECTOR DE CONTINUIDAD (Solución 3B)
    async validateContinuity(draft, activePhysicalState, ledgerLog) {
        const prompt = `Analiza este borrador y verifica si rompe la continuidad física o lógica.
        
        ESTADO FÍSICO PERMITIDO: ${activePhysicalState}
        HISTORIAL DE HITOS YA SUCEDIDOS: ${ledgerLog}
        
        BORRADOR A EVALUAR: 
        "${draft}"
        
        REGLAS DE RECHAZO:
        1. ¿Alguien usa un objeto que fue descartado, perdido o arrojado en el HISTORIAL DE HITOS?
        2. ¿Alguien conversa sobre algo como si fuera "nuevo" cuando ya se resolvió en el HISTORIAL DE HITOS?
        3. ¿Alguien interactúa físicamente con alguien que no está en el ESTADO FÍSICO PERMITIDO?
        
        Responde ÚNICAMENTE en JSON estricto:
        { 
            "aprobado": boolean, 
            "fallo": "Si es false, explica en 1 frase el error físico o lógico. Si es true, déjalo vacío." 
        }`;
        
        try {
            const res = await this.callModel("Eres un supervisor de continuidad implacable (JSON puro).", prompt, "gemini-fast", 2, 0.1);
            return JSON.parse(this.cleanJSON(res));
        } catch(e) {
            return { aprobado: true, fallo: "" }; // Fallback de seguridad
        }
    },

    async updateWorldState(chapterText) {
        const prompt = `ROL: Agente de Continuidad y Mutación de Bases de Datos.
        CAPÍTULO RECIÉN ESCRITO:
        "${chapterText.substring(0, 5000)}"

        FORMATO JSON ESTRICTO:
        {
            "resumen_capitulo": "Resumen...",
            "mutaciones": [
                { "entidad": "Nombre exacto del afectado", "cambio": "Cicatriz / Perdió objeto / Muerte" }
            ]
        }`;

        try {
            const res = await this.callModel("Eres un analista de mutaciones de datos JSON puro.", prompt, "gemini-fast", 2, 0.1);
            return JSON.parse(this.cleanJSON(res));
        } catch(e) {
            return { resumen_capitulo: "La historia avanza.", mutaciones: [] };
        }
    },

    // INTEGRACIÓN AGÉNTICA: Escritor con Bucle de Validación y Ledger
    async generateBeatText(moment, chapterState, chapterTitle, immediateContext, ledgerLog, semanticData, activeSceneState) {
        
        const stateContextBlock = `[LORE Y ÉPOCA]: ${chapterState.location} | ${chapterState.epoca_tiempo}\n[DATOS RECUPERADOS]: ${semanticData}`;
        const historyContextBlock = `[HITOS YA CUMPLIDOS (LEDGER)]: \n${ledgerLog || "Ninguno aún."}`;
        
        const contextWindow = immediateContext && immediateContext.length > 10 
            ? `[TEXTO INMEDIATAMENTE ANTERIOR]:\n"...${immediateContext.trim()}"` 
            : `[INICIO DE CAPÍTULO]: Aterriza al lector directamente en la acción.`;

        const activePhysicalState = `
[ESTADO ACTIVO DE LA ESCENA]:
- Ubicación: ${activeSceneState.ubicacion_exacta || chapterState.location}
- Personajes: ${(activeSceneState.personajes_presentes || []).join(', ') || "Solo el protagonista"}
- Objetos Visibles: ${(activeSceneState.objetos_visibles || []).join(', ') || "Ninguno notable"}
`;

        const architectPrompt = `ROL: Arquitecto Literario. TAREA: Estructurar el siguiente latido de la escena.
MOMENTO A NARRAR: "${moment.text}"
DETALLES VISUALES: "${moment.visualPrompt}"

${stateContextBlock}
${activePhysicalState}

OBJETIVO: Define 2 Puntos de Acción clave para ejecutar este momento.
REGLA: Las acciones deben AVANZAR en el tiempo y respetar la física del entorno.`;
        
        const blueprint = await this.callModel("Eres un arquitecto narrativo experto.", architectPrompt, "nova-fast", 3, 0.4);

        let draft = "";
        let intentos = 0;
        let reprimenda = "";
        let aprobado = false;

        // BUCLE DEL DIRECTOR DE CONTINUIDAD (Validador Agéntico)
        while (intentos < 3 && !aprobado) {
            intentos++;

            const writerPrompt = `
ROL: Novelista Master.
ESTILO: Fluidez, ritmo ágil y AVANCE CONSTANTE.

${contextWindow}
BLUEPRINT A EJECUTAR AHORA: ${blueprint}
${historyContextBlock}
${activePhysicalState}

INSTRUCCIONES CRÍTICAS (¡CUMPLE ESTRICTAMENTE!):
1. **AVANCE CRONOLÓGICO:** Tienes PROHIBIDO repetir las acciones o diálogos del [TEXTO INMEDIATAMENTE ANTERIOR]. Genera lo que ocurre estrictamente DESPUÉS de esa última palabra.
2. **MEMORIA DE INTENCIONES:** Lee los [HITOS YA CUMPLIDOS]. Tienes prohibido volver a narrar, planificar o repetir diálogos sobre esas intenciones. Asume que ya ocurrieron.
3. **CONFINAMIENTO LÓGICO:** Estás atado al [ESTADO ACTIVO]. No inventes objetos mágicamente ni revivas elementos destruidos o alejados en los hitos.
${reprimenda}

Escribe tu texto final envuelto en <texto></texto>.`;

            const draftRes = await this.callModel("Eres un novelista que JAMÁS repite texto y respeta la física de los objetos.", writerPrompt, "nova-fast", 3, 0.65);
            draft = this.extractCleanText(draftRes) || draftRes;

            // Invocar al Agente Validador
            const validation = await this.validateContinuity(draft, activePhysicalState, ledgerLog);
            if (validation.aprobado) {
                aprobado = true;
            } else {
                reprimenda = `\n[¡ALERTA DE CONTINUIDAD! Tu intento anterior falló por esto: "${validation.fallo}". CORRIGE ESTO OBLIGATORIAMENTE].`;
                console.warn(`Reintento de escritura (Intento ${intentos}). Fallo detectado: ${validation.fallo}`);
            }
        }

        // FASE CRÍTICA: Pulido final
        const criticPrompt = `ROL: Editor de Estilo Implacable.
TEXTO ANTERIOR: "...${immediateContext ? immediateContext.slice(-200) : ''}"
BORRADOR A PULIR:
"${draft}"

REGLAS DE EDICIÓN:
1. ANTI-ECO RADICAL: Si tu primera línea dice lo mismo que el TEXTO ANTERIOR, elimínala.
2. CORTA LA PAJA: Elimina el relleno poético estático. Prioriza la acción y el diálogo.
3. RITMO: Combina frases robóticas.
Devuelve ÚNICAMENTE el texto final mejorado dentro de <texto></texto>.`;

        const finalRes = await this.callModel("Eres un editor implacable contra las redundancias.", criticPrompt, "nova-fast", 3, 0.4);
        return this.extractCleanText(finalRes);
    },

    async generateFullBookSerial(eventsQueue, progressCallback = null, bookContext = "") {
        if (eventsQueue && !Array.isArray(eventsQueue) && Array.isArray(eventsQueue.events)) {
            eventsQueue = eventsQueue.events;
        }

        const globalStates = await this.simulateGlobalState(eventsQueue, progressCallback);
        const finalChapters = [];
        let rollingSummary = bookContext; 
        
        let chapterLedger = []; // El Libro Mayor de Intenciones

        for (let i = 0; i < eventsQueue.length; i++) {
            const event = eventsQueue[i];
            const state = globalStates[i];
            const chapterTitle = event.description || event.title || `Capítulo ${i + 1}`;
            
            if (progressCallback) progressCallback('writing', i + 1, eventsQueue.length);
            
            let chapterText = "";
            let immediateContext = ""; 

            let activeSceneState = {
                ubicacion_exacta: state.location,
                personajes_presentes: state.characters || [],
                objetos_visibles: state.objects_in_play || []
            };

            const momentsToProcess = (event.moments && event.moments.length > 0) ? event.moments : [{ text: event.description, visualPrompt: "Cinematic lighting" }];

            for (let j = 0; j < momentsToProcess.length; j++) {
                const moment = momentsToProcess[j];
                const semanticData = await this.auditBeatResources(moment.text, state);
                const ledgerLog = chapterLedger.join('\n'); // Pasar el historial acumulado

                const beatText = await this.generateBeatText(moment, state, chapterTitle, immediateContext, ledgerLog, semanticData, activeSceneState);
                
                if (beatText) {
                    // Ensamblado determinista sin costuras (Solución 1A)
                    chapterText = this.mergeOverlappingText(chapterText, beatText);
                    
                    // Actualizar ventana deslizante para el siguiente latido
                    immediateContext = chapterText.slice(-1000); 
                    
                    // Extraer hitos reales (Solución 2A)
                    const newHitos = await this.extractLedger(beatText);
                    chapterLedger.push(newHitos);
                    
                    // Actualizar físicas (Solución 3B)
                    activeSceneState = await this.trackMicroState(beatText, activeSceneState);
                }
            }
            
            if (progressCallback) progressCallback('reviewing', i + 1, eventsQueue.length);
            
            const stateUpdate = await this.updateWorldState(chapterText);
            rollingSummary += (rollingSummary ? " " : "") + stateUpdate.resumen_capitulo;

            if (stateUpdate.mutaciones && stateUpdate.mutaciones.length > 0) {
                for (let mut of stateUpdate.mutaciones) {
                    if (window.ai && window.ai.applyMutation) {
                        await window.ai.applyMutation(mut.entidad, mut.cambio);
                    }
                }
            }

            finalChapters.push({
                id: event.id,
                title: chapterTitle,
                text: chapterText
            });
            
            chapterLedger = []; // Resetear el Ledger para el nuevo capítulo
        }

        return finalChapters;
    }
};

window.BookAI2 = BookAI2;