// --- cronologia/escaleta/director.core.js ---
// NÚCLEO LÓGICO DE DIRECCIÓN (V7.0 - PIPELINE EN 2 ETAPAS EN LOTES DE 10 TOMAS)
const DirectorCore = {
    
    // =========================================================================
    // FASE 1: PRE-PRODUCCIÓN (CONSOLIDACIÓN EN INGLÉS)
    // =========================================================================
    async runPreProduction() {
        if (!ai.apiKey) return alert("Conecta la API Key primero (Botón 'Conectar IA').");
        if (!EscaletaCore.rootHandle) return alert("Debes Cargar un Proyecto para poder guardar la Biblia.");
        
        const data = DirectorUI.getFormData();
        if (!data.artBible && !data.global.premise) return alert("Escribe al menos la premisa o la biblia manual.");
        
        EscaletaUI.toggleLoading(true, "PRE-PRODUCCIÓN", "Analizando el guion global y construyendo la anatomía macroscópica de los activos...");
        
        try {
            const allTextSample = data.acts.map(a => a.text.substring(0, 1000)).join('\n');
            const safeContext = allTextSample.substring(0, 15000);
            const extractionPrompt = `
            ACTÚA COMO: Director de Casting de Hollywood, Supervisor de Arte Digital e Ingeniero Forense de Prompts.
            BIBLIA MANUAL DEL USUARIO (Prioridad Absoluta):
            "${data.artBible}"
            PREMISA GLOBAL: "${data.global.premise}"
            MUESTRA DEL GUION:
            "${safeContext}"
            
            TAREA:
            Consolida una Biblia Audiovisual "TEXT-TO-VIDEO / TEXT-TO-IMAGE OPTIMIZED" donde absolutamente TODO esté redactado en INGLÉS TÉCNICO.
            - Si el usuario definió algo en la "Biblia Manual", tradúcelo, amplíalo e híper-detállalo usando la estructura obligatoria de abajo.
            
            ESTRUCTURA VISUAL OBLIGATORIA PARA PERSONAJES (DEBE ESTAR EN INGLÉS, SIN OMITIR NADA CON EXTREMO MIRAMIENTO POR EL DETALLE FACIAL):
            1. BASE SUBJECT: (e.g., "1man", "1girl") especifica etnia exacta, edad biológica precisa y complexión física (e.g., "mesomorphic build, angular features").
            2. FACIAL ANATOMY & EYE GEOMETRY (CRITICAL): Textura y poros realistas de la piel (e.g., "ultra sharp skin pores, micro fine wrinkles, hyperdetailed weathered epidermis"), forma exacta de la mandíbula, pómulos esculpidos, micro-detalles definitivos de los ojos (color exacto del iris, patrón geométrico de la retina, forma nítida de párpados, cejas detalladas filamento por filamento), vello facial milimétrico si tiene, cicatrices epidérmicas claras, lunares o marcas dermatológicas fijas.
            3. HAIR TEXTURE: Tipo exacto de cabello, peinado estructural, longitud, color con reflejos y comportamiento físico.
            4. HIGH-FIDELITY CLOTHING: Describe la ropa por capas, especificando materiales, telas texturizadas, colores exactos y nivel de desgaste o suciedad.
            5. ACCESSORIES & GEAR: Joyas, marcas corporales inmutables o equipamiento con texturas físicas táctiles.
            
            ESTRUCTURA VISUAL OBLIGATORIA PARA LUGARES / VEHÍCULOS / OBJETOS (EN INGLÉS):
            1. Tipo, modelo, arquitectura exacta, geometría espacial, materiales base, paleta de colores, condiciones de iluminación intrínseca, suciedad, polvo, imperfecciones de superficie y nivel de degradación física.
            
            ESTRUCTURA SONORA OBLIGATORIA (SÓLO PERSONAJES - EN INGLÉS):
            Define la firma acústica exacta en el campo 'audio_signature': tipo de voz, timbre, tono habitual, edad vocal y acento específico. Para objetos o lugares, déjalo vacío ("").
            
            REGLAS VITALES DE COHERENCIA:
            1. ESTÁ PROHIBIDO USAR EL NOMBRE PROPIO del personaje o entidad dentro de sus firmas ('visual_signature' y 'audio_signature'). Usa descripciones físicas puras.
            2. No uses palabras abstractas vacías como "photorealistic", "beautiful", "epic" o "ultra detailed". Usa nombres de materiales y descripciones anatómicas tangibles.
            3. RESPONDE ÚNICA Y EXCLUSIVAMENTE CON EL CÓDIGO JSON VÁLIDO. SIN TEXTO DE INTRODUCCIÓN NI EXPLICACIONES.
            
            SALIDA JSON ESTRICTA: { "assets": [{ "name": "NombreOriginalEnEspañol", "visual_signature": "...", "audio_signature": "..." }] }
            `;
            
            const res = await ai.callModel(extractionPrompt, "Genera la Biblia Audiovisual Maestra en Inglés Técnico de Alta Densidad.", 0.3, null);
            
            let cleanRes = ai.cleanJSON(res);
            const lastBrace = cleanRes.lastIndexOf('}');
            if (lastBrace !== -1) {
                cleanRes = cleanRes.substring(0, lastBrace + 1);
            }
            const newAssets = JSON.parse(cleanRes).assets || [];
            
            await CoherenceEngine.appendToBible(newAssets);
            
            EscaletaUI.toggleLoading(false);
            DirectorUI.unlockRodaje();
            alert(`Pre-Producción Lista.\nSe han consolidado ${newAssets.length} activos con micro-detalles en la biblia de costura.`);
        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            alert("Error en Pre-Producción: " + e.message);
        }
    },

    // =========================================================================
    // FASE 2: RODAJE DE ACTO MODULAR (ITERACIÓN DE 10 EN 10 TOMAS EN 2 ETAPAS)
    // =========================================================================
    async generateAct(actIndex) {
        if (!ai.apiKey) return alert("Conecta la API Key.");
        
        const data = DirectorUI.getFormData();
        const act = data.acts[actIndex];
        if (!act || !act.text) return alert("Este acto no tiene texto de guion.");
        const outputMode = data.global.outputMode || 'video';

        try {
            let contextStr = "ESTE ES EL INICIO DE LA PELÍCULA.";
            let previousAction = "Ninguna (Primera toma).";
            
            if (EscaletaCore.data.takes.length > 0) {
                const lastTakes = EscaletaCore.data.takes.slice(-3);
                contextStr = `LA PELÍCULA YA ESTÁ EN MARCHA. Últimas tomas:\n${lastTakes.map(t => `- Visual: ${t.visual_prompt}\n- Narrador:${t.narration_text}`).join('\n')}`;
                previousAction = lastTakes[lastTakes.length - 1].video_file ? "Acción de video continua." : "Composición de imagen fija.";
            }

            // Recopilar todos los activos disponibles de CoherenceEngine y window.app.items
            const allAssetsMap = new Map();
            if (window.CoherenceEngine && CoherenceEngine.inventory) {
                Object.keys(CoherenceEngine.inventory).forEach(key => {
                    const item = CoherenceEngine.inventory[key];
                    if (item && item.originalName) {
                        const normKey = item.originalName.toLowerCase().replace(/[^a-z0-9]/g, '');
                        allAssetsMap.set(normKey, {
                            name: item.originalName,
                            visualDesc: item.visual || "",
                            audioDesc: item.audio || ""
                        });
                    }
                });
            }
            if (window.app && window.app.items && Array.isArray(window.app.items)) {
                window.app.items.forEach(item => {
                    const nameKey = item.data?.name || item.data?.title;
                    const descriptionValue = item.data?.visualDesc || item.data?.desc || "";
                    if (nameKey) {
                        const normKey = nameKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (!allAssetsMap.has(normKey)) {
                            allAssetsMap.set(normKey, {
                                name: nameKey,
                                visualDesc: descriptionValue,
                                audioDesc: ""
                            });
                        }
                    }
                });
            }

            const availableAssetsSummary = Array.from(allAssetsMap.values()).map(a => `- @${a.name.toLowerCase().replace(/[^a-z0-9]/g, '')} (${a.name}): ${a.visualDesc.substring(0, 150)}...`).join('\n');

            const audioGuidance = data.global.audioStyle ? `DIRECTRICES SONORAS GLOBALES: "${data.global.audioStyle}"` : "Ninguna.";
            let translatedGlobalStyle = "cinematic setting";
            if (data.global.globalStyle && data.global.globalStyle.trim().length > 0) {
                EscaletaUI.toggleLoading(true, "TRADUCIENDO PARÁMETROS", "Traduciendo el estilo visual global al inglés...");
                const transPrompt = `Translate the following art style directives from Spanish to clear, technical English prompt tags. Do not include introductory text, explanations, or quotes. Output ONLY the translated tags comma-separated.\n\nTEXT TO TRANSLATE: "${data.global.globalStyle}"`;
                const transRes = await ai.callModel("You are a professional film prompt translator. Translate from Spanish to English perfectly.", transPrompt, 0.1, 'gemini-fast');
                if (transRes && transRes.trim().length > 0) {
                    translatedGlobalStyle = transRes.trim().replace(/^"+|"+$/g, '');
                }
            }

            const totalTargetTakes = parseInt(act.targetTakes) || 50;
            const CHUNK_SIZE = 10;
            const totalChunks = Math.ceil(totalTargetTakes / CHUNK_SIZE);
            const currentTotalBeforeAct = EscaletaCore.data.takes.length;
            const newTakes = [];

            let globalStyleModifiers = "";
            if (outputMode === 'video') {
                globalStyleModifiers = ` --- STYLE: Cinematic film scene, (${translatedGlobalStyle}:1.1), dynamic camera movement, real-time speed execution, fluid movement, 8k, seamless motion`;
            } else {
                globalStyleModifiers = ` --- STYLE: Masterful cinematic keyframe photograph, (${translatedGlobalStyle}:1.1), static crisp composition, environmental portrait view, full body capture, architectural alignment, 8k resolution`;
            }

            // Iteración en lotes de 10 en 10 tomas
            for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
                const chunkStart = chunkIdx * CHUNK_SIZE;
                const takesInThisChunk = Math.min(CHUNK_SIZE, totalTargetTakes - chunkStart);
                const chunkNumber = chunkIdx + 1;

                EscaletaUI.toggleLoading(
                    true, 
                    `RODANDO ACTO ${actIndex + 1} (LOTE ${chunkNumber}/${totalChunks})`, 
                    `Llamada 1/2: Planificación de narración, diálogos y detección de Biblia Visual...`
                );
                EscaletaUI.updateProgressBar(Math.round((chunkIdx / totalChunks) * 100));

                // Contexto acumulado de tomas previas
                let accumulatedContext = contextStr;
                if (newTakes.length > 0) {
                    const recentTakes = newTakes.slice(-3);
                    accumulatedContext += `\nÚLTIMAS TOMAS GENERADAS EN ESTE ACTO:\n` + recentTakes.map((t) => `- Toma ${t.sequence_order}: [Visual] ${t.visual_prompt} | [Narración] ${t.narration_text}`).join('\n');
                }

                // =========================================================================
                // LLAMADA 1: PLANIFICACIÓN (DETECTAR ELEMENTOS DE BIBLIA VISUAL + DIÁLOGOS/NARRACIÓN)
                // =========================================================================
                const call1Prompt = `
                ACTÚA COMO: Guionista Narrativo y Director de Casting/Escena.
                SINOPSIS DEL ACTO: "${act.synopsis}"
                PREMISA GLOBAL: "${data.global.premise}"
                GUION COMPLETO DEL ACTO:
                "${act.text.substring(0, 15000)}"

                CONTEXTO PREVIO Y TOMAS ANTERIORES:
                ${accumulatedContext}

                ELEMENTOS Y PERSONAJES DISPONIBLES EN LA BIBLIA VISUAL:
                ${availableAssetsSummary || "No hay elementos predefinidos en la Biblia."}

                ${audioGuidance}

                TAREA PARA ESTA LLAMADA 1:
                Escribe exactamente las próximas ${takesInThisChunk} tomas (de la toma ${chunkStart + 1} a la toma ${chunkStart + takesInThisChunk} de un total de ${totalTargetTakes} tomas).
                Para CADA una de las ${takesInThisChunk} tomas:
                1. Analiza qué ocurre en el guion en esta secuencia.
                2. Encuentra e identifica explícitamente TODOS los elementos, personajes y lugares de la Biblia Visual que participan o aparecen en esta toma específica.
                3. Escribe el texto narrativo o diálogo completo EN ESPAÑOL ('narration_text'). PROHIBIDO usar el símbolo @ o arrobas en el texto narrativo en español.
                4. Define el modo de audio ('diegetic' para efectos puros de ambiente, 'custom' para diálogos o voz específica), 'audio_custom_prompt' y 'audio_voice_lock' (nombre exacto del personaje que habla).

                RESPONDE ÚNICAMENTE CON EL SIGUIENTE JSON VÁLIDO:
                {
                  "takes_plan": [
                    {
                      "take_index": 1,
                      "scene_summary": "Resumen conciso de la acción física en este tramo...",
                      "detected_entities": ["NombreEntidad1", "NombreEntidad2"],
                      "narration_text": "Texto narrativo o diálogo directo en español sin arrobas...",
                      "audio_mode": "diegetic",
                      "audio_custom_prompt": "",
                      "audio_voice_lock": null
                    }
                  ]
                }`;

                const call1Res = await ai.callModel(call1Prompt, "Genera la planificación y textos narrativos en español para este lote de 10 tomas.", 0.3, null);

                let cleanCall1 = ai.cleanJSON(call1Res);
                const lastBrace1 = cleanCall1.lastIndexOf('}');
                if (lastBrace1 !== -1) cleanCall1 = cleanCall1.substring(0, lastBrace1 + 1);

                cleanCall1 = cleanCall1.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, function(match, p1) {
                    return '"' + p1.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ") + '"';
                }).replace(/\\'/g, "'");

                let planData = { takes_plan: [] };
                try {
                    planData = JSON.parse(cleanCall1);
                } catch (errPlan) {
                    console.warn("Fallo parseando JSON de Llamada 1, reintentando estructurado por defecto:", errPlan);
                }

                const plannedTakes = planData.takes_plan || [];

                EscaletaUI.toggleLoading(
                    true, 
                    `RODANDO ACTO ${actIndex + 1} (LOTE ${chunkNumber}/${totalChunks})`, 
                    `Llamada 2/2: Generación de Prompts Visuales en Inglés integrando la Biblia Visual...`
                );

                // Preparamos el contexto visual detallado de los elementos detectados en la llamada 1
                let chunkEntitiesContext = "";
                const entitiesInChunkSet = new Set();
                plannedTakes.forEach(pt => {
                    if (pt.detected_entities && Array.isArray(pt.detected_entities)) {
                        pt.detected_entities.forEach(entName => {
                            const norm = entName.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (allAssetsMap.has(norm)) {
                                entitiesInChunkSet.add(norm);
                            }
                        });
                    }
                });

                if (entitiesInChunkSet.size > 0) {
                    chunkEntitiesContext = "DETALLES TÉCNICOS INMUTABLES DE LA BIBLIA VISUAL PARA ESTE LOTE:\n" + 
                        Array.from(entitiesInChunkSet).map(normKey => {
                            const asset = allAssetsMap.get(normKey);
                            return `[ENTIDAD: @${normKey} (${asset.name})]: ${asset.visualDesc}`;
                        }).join('\n');
                } else {
                    chunkEntitiesContext = "DETALLES DE LA BIBLIA VISUAL DISPONIBLES:\n" + availableAssetsSummary;
                }

                // =========================================================================
                // LLAMADA 2: ELABORACIÓN DE PROMPTS VISUALES EN INGLÉS CON CONTEXTO VISUAL
                // =========================================================================
                const call2Prompt = `
                ACTÚA COMO: Director de Fotografía y Supervisor de Arte/VFX.
                INTERRUPTOR DE FORMATO MASTER: **MODO: ${outputMode.toUpperCase()}**.
                ${outputMode === 'video' ? 
                    "REGLA DE FORMATO (VIDEO): 'visual_prompt' debe plasmar una ESCENA CINEMÁTICA EN MOVIMIENTO CONTINUO. Describe trayectorias de cámara dinámicas, acciones físicas fluidas y transformaciones espaciales en tiempo real." : 
                    "REGLA DE FORMATO (IMAGE): 'visual_prompt' debe plasmar un FOTOGRAMA CLAVE ESTÁTICO (Keyframe Illustration / Graphic Novel Panel). Describe composiciones fijas, posturas corporales congeladas, planos americanos o de cuerpo entero ambientales."
                }

                DATA GENERADA EN LA LLAMADA 1 (PLAN DE TOMAS Y DIÁLOGOS):
                ${JSON.stringify(plannedTakes, null, 2)}

                INFORMACIÓN TÉCNICA DETALLADA DE LA BIBLIA VISUAL:
                ${chunkEntitiesContext}

                CONTEXTO GENERAL Y CONTINUIDAD:
                ${accumulatedContext}

                REGLAS ABSOLUTAS PARA CADA TOMA:
                1. 'visual_prompt' DEBE ESTAR COMPLETAMENTE EN INGLÉS TÉCNICO.
                2. Integra obligatoriamente los identificadores @nombreentidad de los activos participantes (Ej: "@manuel walks near @puertodemotril...").
                3. No inventes diálogos ni textos dentro de 'visual_prompt'.
                4. Redacta encuadres amplios y composiciones cinematográficas (*wide angle*, *medium full shot*, *environmental portrait*). Prohibido macros flotantes de rostros.

                RESPONDE ÚNICAMENTE CON EL SIGUIENTE JSON VÁLIDO:
                {
                  "visual_takes": [
                    {
                      "take_index": 1,
                      "visual_prompt": "Cinematic shot in TECHNICAL ENGLISH integrating @tags for entities..."
                    }
                  ]
                }`;

                const call2Res = await ai.callModel(call2Prompt, "Genera los prompts visuales en inglés utilizando la data del plan previo y la Biblia Visual.", 0.4, null);

                let cleanCall2 = ai.cleanJSON(call2Res);
                const lastBrace2 = cleanCall2.lastIndexOf('}');
                if (lastBrace2 !== -1) cleanCall2 = cleanCall2.substring(0, lastBrace2 + 1);

                cleanCall2 = cleanCall2.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, function(match, p1) {
                    return '"' + p1.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ") + '"';
                }).replace(/\\'/g, "'");

                let visualData = { visual_takes: [] };
                try {
                    visualData = JSON.parse(cleanCall2);
                } catch (errVis) {
                    console.warn("Fallo parseando JSON de Llamada 2, reintentando estructurado:", errVis);
                }

                const visualTakes = visualData.visual_takes || [];

                // =========================================================================
                // ENSAMBLADO Y CRUCE FINAL DE DATA DE AMBAS LLAMADAS
                // =========================================================================
                for (let i = 0; i < takesInThisChunk; i++) {
                    const planItem = plannedTakes[i] || {};
                    const visItem = visualTakes[i] || {};

                    let rawPrompt = visItem.visual_prompt || planItem.scene_summary || "Cinematic scene";
                    let characterSpecs = [];

                    if (!rawPrompt.toLowerCase().includes("shot") && !rawPrompt.toLowerCase().includes("angle") && !rawPrompt.toLowerCase().includes("portrait")) {
                        rawPrompt = (outputMode === 'video' ? "Cinematic wide shot, " : "Cinematic environmental portrait, ") + rawPrompt;
                    }

                    // Inyección anatómica de la Biblia Visual y reemplazo de tokens @ por Nombre Real
                    allAssetsMap.forEach((asset, normKey) => {
                        const nameKey = asset.name;
                        const descriptionValue = asset.visualDesc;
                        if (!nameKey || !descriptionValue) return;

                        let cleanDesc = String(descriptionValue).replace(/(\r\n|\n|\r)/gm, " ").trim();
                        cleanDesc = cleanDesc.replace(/RGB:\s*\[?[0-9\s,]+\]?/gi, '');
                        cleanDesc = cleanDesc.replace(/biological age \d+,?/gi, '');
                        cleanDesc = cleanDesc.replace(/exhibiting subtle discoloration and minor abrasions consistent with prolonged exposure to corrosive environments/gi, 'weathered');
                        cleanDesc = cleanDesc.replace(/micro fine wrinkles concentrated around the orbital and nasocial folds/gi, 'subtle facial wrinkles');
                        cleanDesc = cleanDesc.replace(/individual strands exhibiting realistic curl and movement under simulated wind conditions/gi, '');
                        cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();

                        const tokenStr = `@${normKey}`;
                        const escapedName = nameKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const rxToken = new RegExp(`@${normKey}\\b|@${escapedName.replace(/\s+/g, '')}\\b`, "gi");
                        const rxRawName = new RegExp(`\\b${escapedName}\\b`, "gi");
                        let isPresent = false;

                        if (rxToken.test(rawPrompt)) {
                            rawPrompt = rawPrompt.replace(rxToken, nameKey);
                            isPresent = true;
                        } else if (rawPrompt.toLowerCase().includes(tokenStr)) {
                            rawPrompt = rawPrompt.replace(new RegExp(tokenStr, "gi"), nameKey);
                            isPresent = true;
                        } else if (rxRawName.test(rawPrompt)) {
                            isPresent = true;
                        }

                        if (isPresent) {
                            characterSpecs.push(`[${nameKey.toUpperCase()}: ${cleanDesc}]`);
                        }
                    });

                    // Eliminar cualquier @ residual
                    rawPrompt = rawPrompt.replace(/@([a-zA-Z0-9_]+)/g, '$1').replace(/@/g, '');
                    let cleanNarrationText = (planItem.narration_text || "Narración de escena.").replace(/@/g, '').trim();

                    let finalVisualPrompt = `ACTION COMPOSITION: ${rawPrompt}${globalStyleModifiers}`;
                    if (characterSpecs.length > 0) {
                        finalVisualPrompt += ` --- CHARACTER CHARACTERISTICS & LOOKS: ${characterSpecs.join(", ")}`;
                    }

                    const finalNegativePrompt = "portrait, close-up, headshot, close up shot, macro profile portrait, single face focus, micro facial crop, cropped head, low quality, bad anatomy, deformed, text, watermark, bad graphics";
                    const isFirstOfAct = (chunkIdx === 0 && i === 0);

                    newTakes.push({
                        id: `take-ACT${actIndex}-${Date.now()}-${chunkIdx}-${i}`,
                        sequence_order: currentTotalBeforeAct + newTakes.length + 1,
                        visual_prompt: finalVisualPrompt,
                        negative_prompt: finalNegativePrompt,
                        narration_text: cleanNarrationText,
                        duration: 5.0,
                        video_file: null,
                        image_file: null,
                        audio_file: null,
                        act_marker: isFirstOfAct ? `INICIO ACTO ${actIndex + 1}: ${act.title || 'Sin Título'}` : null,
                        audio_mode: planItem.audio_mode === 'custom' ? 'custom' : 'diegetic',
                        audio_custom_prompt: (planItem.audio_custom_prompt || '').replace(/@/g, ''),
                        audio_voice_lock: (planItem.audio_voice_lock || '').replace(/@/g, '')
                    });
                }
            }

            EscaletaCore.data.takes = [...EscaletaCore.data.takes, ...newTakes];
            EscaletaCore.saveToDisk();
            EscaletaUI.renderTakes(EscaletaCore.data.takes);
            EscaletaUI.updateStats();
            DirectorUI.markActSuccess(actIndex);
            EscaletaUI.toggleLoading(false);
            
            if (newTakes.length > 0) {
                EscaletaUI.jumpToAct(newTakes[0].id);
            }
        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            alert(`Error rodando el Acto ${actIndex + 1}: ` + e.message);
        }
    },

    async runAllActs() {
        const data = DirectorUI.getFormData();
        if (!confirm(`Se generarán y refinarán los prompts de ${data.acts.length} actos en formato ${data.global.outputMode.toUpperCase()} en lotes de 10 tomas en 2 etapas. ¿Continuar?`)) return;
        
        for (let i = 0; i < data.acts.length; i++) {
            await this.generateAct(i);
            await new Promise(r => setTimeout(r, 2000));
        }
        
        alert("¡Rodaje Automático y Refinado Finalizado en Lotes de 10 Tomas!");
        DirectorUI.toggleModal();
    }
};

window.DirectorCore = DirectorCore;