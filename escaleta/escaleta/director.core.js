// --- cronologia/escaleta/director.core.js ---
// NÚCLEO LÓGICO DE DIRECCIÓN (V6.8 - INYECCIÓN ANATÓMICA Y COMPRESIÓN SELECTIVA DIRECTA DESDE NEXUS SAGA)

const DirectorCore = {
    
    // =========================================================================
    // FASE 1: PRE-PRODUCCIÓN (CONSOLIDACIÓN EN INGLÉS PASANDO POR ALTO LA CREACIÓN LOCAL)
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
            - Si el usuario definió algo en la "Biblia Manual", tradúcelo, amplíalo e hiper-detállalo usando la estructura obligatoria de abajo.
            
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
            
            // Inyectamos a la biblia local por compatibilidad de visualización del árbol NLE
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
    // FASE 2: RODAJE DE ACTO MODULAR
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
                contextStr = `LA PELÍCULA YA ESTÁ EN MARCHA. Últimas tomas:\n${lastTakes.map(t => `- Visual: ${t.visual_prompt}\n- Narrador: ${t.narration_text}`).join('\n')}`;
                previousAction = lastTakes[lastTakes.length - 1].video_file ? "Acción de video continua." : "Composición de imagen fija.";
            }

            const availableAssets = (window.app && window.app.items) ? window.app.items.map(i => i.data.name).join(', ') : '';
            const audioGuidance = data.global.audioStyle ? `DIRECTRICES SONORAS GLOBALES: "${data.global.audioStyle}"` : "Ninguna.";

            // Filtro idiomático previo de estilo global
            let translatedGlobalStyle = "cinematic setting";
            if (data.global.globalStyle && data.global.globalStyle.trim().length > 0) {
                EscaletaUI.toggleLoading(true, "TRADUCIENDO PARÁMETROS", "Traduciendo el estilo visual global al inglés...");
                const transPrompt = `Translate the following art style directives from Spanish to clear, technical English prompt tags. Do not include introductory text, explanations, or quotes. Output ONLY the translated tags comma-separated.\n\nTEXT TO TRANSLATE: "${data.global.globalStyle}"`;
                const transRes = await ai.callModel("You are a professional film prompt translator. Translate from Spanish to English perfectly.", transPrompt, 0.1, 'gemini-fast');
                if (transRes && transRes.trim().length > 0) {
                    translatedGlobalStyle = transRes.trim().replace(/^"+|"+$/g, '');
                }
            }

            EscaletaUI.toggleLoading(true, `RODANDO ACTO ${actIndex + 1} (${outputMode.toUpperCase()})`, `Trazando cinemática y diseño sonoro modular...`);
            EscaletaUI.updateProgressBar(10);

            const directorPrompt = `
            ACTÚA COMO: Un Guionista Técnico y Director de Cine cinematográfico experto en composición y prompts de difusión.
            INTERRUPTOR DE FORMATO MASTER: El usuario ha configurado el sistema en **MODO: ${outputMode.toUpperCase()}**.
            ${outputMode === 'video' ? 
               `REGLA DE FORMATO (VIDEO): 'visual_prompt' debe plasmar una ESCENA CINEMÁTICA EN MOVIMIENTO CONTINUO. Describe trayectorias de cámara dinámicas, acciones físicas fluidas y transformaciones espaciales en tiempo real.` :
               `REGLA DE FORMATO (IMAGE): 'visual_prompt' debe plasmar un FOTOGRAMA CLAVE ESTÁTICO (Keyframe Illustration / Graphic Novel Panel). Describe composiciones fijas, posturas corporales congeladas, planos americanos o de cuerpo entero ambientales, y congelación del espacio tridimensional para capturar el instante absoluto.`
            }
            MEMORIA INYECTADA: ${contextStr}
            ACCIÓÓN INMEDIATA ANTERIOR: "${previousAction}"
            ACTIVOS DISPONIBLES: [${availableAssets}]
            ${audioGuidance}
            
            SINOPSIS DEL ACTO: "${act.synopsis}"
            GUION BASE: "${act.text.substring(0, 15000)}"
            
            === REGLAS ABSOLUTAS DE IDIOMA Y SINTAXIS JSON ===
            1. 'visual_prompt' DEBE ESTAR COMPLETAMENTE EN INGLÉS. Prohibida cualquier palabra en español en este campo.
            2. 'narration_text' DEBE ESTAR COMPLETAMENTE EN ESPAÑOL. Es la prosa fluida de voz en off.
            3. NO INVENTES DIÁLOGOS ni textos literarios abstractos dentro de 'visual_prompt'.
            4. FILTRADO DE REPETICIONES: En 'visual_prompt', si un personaje va a realizar una acción, escribe su acción de forma directa, concisa y fluida sin repetir su identificador ni meter preámbulos.
            
            === REGLAS DE ARQUITECTURA VISUAL (ANTI-RETRATOS) ===
            - COMPOSTURA DE ESCENA: Redacta la acción o composición de forma directa describiendo el entorno de fondo y la escala de plano amplia (*wide angle*, *medium full shot*, *environmental portrait*). Está estrictamente prohibido crear macros flotantes de rostros. NUNCA escribas nombres sin el tag @.
            
            INSTRUCCIONES DE DESGLOSE:
            1. Divide la escena en exactamente ${act.targetTakes} tomas secuenciales.
            2. 'narration_text': Texto de locución fluido en ESPAÑOL.
            3. 'visual_prompt': Acción o composición cinematográfica pura en INGLÉS integrando obligatoriamente las etiquetas @ de los activos participantes (Ej: "@manuel walks near the dark dock...").
            4. 'audio_mode': Decide el modo sonoro ('custom' para diálogos hablados, 'diegetic' para efectos puros).
            5. 'audio_custom_prompt': Si es 'custom', escribe el diálogo exacto en ESPAÑOL junto a los efectos clave.
            6. 'audio_voice_lock': Nombre del personaje de la Biblia que habla si aplica.
            
            IMPORTANTE: RESPONDE SOLO CON EL JSON VÁLIDO. CERO EXPLICACIONES EXTERNAS.
            SALIDA JSON:
            { "takes": [{ "visual_prompt": "Cinematic composition in ENGLISH with tags like @manuel...", "narration_text": "Texto completo en ESPAÑOL...", "audio_mode": "diegetic", "audio_custom_prompt": "", "audio_voice_lock": null }] }`;

            const dirRes = await ai.callModel(directorPrompt, "Genera la estructura cinemática o estática adaptada al interruptor de formato.", 0.4, null);
            
            EscaletaUI.updateProgressBar(45);
            let dirCleanRes = ai.cleanJSON(dirRes);
            const dirLastBrace = dirCleanRes.lastIndexOf('}');
            if (dirLastBrace !== -1) dirCleanRes = dirCleanRes.substring(0, dirLastBrace + 1);
            
            dirCleanRes = dirCleanRes.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, function(match, p1) {
                return '"' + p1.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ") + '"';
            });
            dirCleanRes = dirCleanRes.replace(/\\'/g, "'");
            
            const sceneStructure = JSON.parse(dirCleanRes);
            if (!sceneStructure.takes || sceneStructure.takes.length === 0) throw new Error("Estructura JSON no contiene array de tomas.");

            // =================================================================================
            // CROSS-REFERENCING FORENSE COHERENTE CON NEXUS SAGA window.app.items
            // =================================================================================
            EscaletaUI.toggleLoading(true, `RODANDO ACTO ${actIndex + 1} (COMPILACIÓN)`, `Inyectando firmas desde window.app.items de Nexus Saga...`);
            EscaletaUI.updateProgressBar(50);
            
            const currentTotal = EscaletaCore.data.takes.length;
            let globalStyleModifiers = "";
            
            if (outputMode === 'video') {
                globalStyleModifiers = ` --- STYLE: Cinematic film scene, (${translatedGlobalStyle}:1.1), dynamic camera movement, real-time speed execution, fluid movement, 8k, seamless motion`;
            } else {
                globalStyleModifiers = ` --- STYLE: Masterful cinematic keyframe photograph, (${translatedGlobalStyle}:1.1), static crisp composition, environmental portrait view, full body capture, architectural alignment, 8k resolution`;
            }

            const nexusItems = (window.app && window.app.items) ? window.app.items : [];
            const newTakes = [];

            for (let idx = 0; idx < sceneStructure.takes.length; idx++) {
                const t = sceneStructure.takes[idx];
                const isFirstOfAct = idx === 0;
                
                let rawPrompt = t.visual_prompt || "Cinematic scene";
                let characterSpecs = [];

                if (!rawPrompt.toLowerCase().includes("shot") && !rawPrompt.toLowerCase().includes("angle") && !rawPrompt.toLowerCase().includes("portrait")) {
                    rawPrompt = (outputMode === 'video' ? "Cinematic wide shot, " : "Cinematic environmental portrait, ") + rawPrompt;
                }

                // Inyección anatómica trasera unificada cruzando con window.app.items
                nexusItems.forEach(item => {
                    const nameKey = item.data.name || item.data.title;
                    if (!nameKey) return;

                    const cleanKey = nameKey.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                    const descriptionValue = item.data.visualDesc || item.data.desc || "";

                    if (descriptionValue) {
                        let cleanDesc = String(descriptionValue).replace(/(\r\n|\n|\r)/gm, " ").trim();
                        
                        // Compresión forense trasera anti-saturación de tokens redundantes
                        cleanDesc = cleanDesc.replace(/RGB:\s*\[?[0-9\s,]+\]?/gi, '');
                        cleanDesc = cleanDesc.replace(/biological age \d+,?/gi, '');
                        cleanDesc = cleanDesc.replace(/exhibiting subtle discoloration and minor abrasions consistent with prolonged exposure to corrosive environments/gi, 'weathered');
                        cleanDesc = cleanDesc.replace(/micro fine wrinkles concentrated around the orbital and nasocial folds/gi, 'subtle facial wrinkles');
                        cleanDesc = cleanDesc.replace(/individual strands exhibiting realistic curl and movement under simulated wind conditions/gi, '');
                        cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();

                        const tokenStr = `@${cleanKey}`;
                        const rxRawName = new RegExp(`\\b${nameKey}\\b`, "gi");
                        let isPresent = false;

                        if (rawPrompt.toLowerCase().includes(tokenStr)) {
                            rawPrompt = rawPrompt.replace(new RegExp(tokenStr, "gi"), nameKey);
                            isPresent = true;
                        } else if (rxRawName.test(rawPrompt)) {
                            rawPrompt = rawPrompt.replace(rxRawName, nameKey);
                            isPresent = true;
                        }

                        if (isPresent) {
                            characterSpecs.push(`[${nameKey.toUpperCase()}: ${cleanDesc}]`);
                        }
                    }
                });

                // Limpieza de redundancia inline
                nexusItems.forEach(item => {
                    const nameKey = item.data.name || item.data.title;
                    if (!nameKey) return;
                    const rxDuplicateCheck = new RegExp(`${nameKey}\\s+is\\s+${nameKey}`, 'gi');
                    if (rxDuplicateCheck.test(rawPrompt)) {
                        rawPrompt = rawPrompt.replace(rxDuplicateCheck, nameKey);
                    }
                });

                let finalVisualPrompt = `ACTION COMPOSITION: ${rawPrompt}${globalStyleModifiers}`;
                if (characterSpecs.length > 0) {
                    finalVisualPrompt += ` --- CHARACTER CHARACTERISTICS & LOOKS: ${characterSpecs.join(", ")}`;
                }

                const finalNegativePrompt = "portrait, close-up, headshot, close up shot, macro profile portrait, single face focus, micro facial crop, cropped head, low quality, bad anatomy, deformed, text, watermark, bad graphics";

                newTakes.push({
                    id: `take-ACT${actIndex}-${Date.now()}-${idx}`,
                    sequence_order: currentTotal + idx + 1,
                    visual_prompt: finalVisualPrompt, 
                    negative_prompt: finalNegativePrompt,
                    narration_text: t.narration_text || "Narración de escena.", 
                    duration: 5.0,
                    video_file: null,
                    image_file: null,
                    audio_file: null,
                    act_marker: isFirstOfAct ? `INICIO ACTO ${actIndex + 1}: ${act.title || 'Sin Título'}` : null,
                    audio_mode: t.audio_mode === 'custom' ? 'custom' : 'diegetic',
                    audio_custom_prompt: t.audio_custom_prompt || '',
                    audio_voice_lock: t.audio_voice_lock || ''
                });

                const progressPercent = 50 + Math.round((idx + 1) / sceneStructure.takes.length * 50);
                EscaletaUI.updateProgressBar(progressPercent);
            }

            EscaletaCore.data.takes = [...EscaletaCore.data.takes, ...newTakes];
            EscaletaCore.saveToDisk();
            EscaletaUI.renderTakes(EscaletaCore.data.takes);
            EscaletaUI.updateStats();
            DirectorUI.markActSuccess(actIndex);
            EscaletaUI.toggleLoading(false);
            
            EscaletaUI.jumpToAct(newTakes[0].id);
        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            alert(`Error rodando el Acto ${actIndex + 1}: ` + e.message);
        }
    },

    async runAllActs() {
        const data = DirectorUI.getFormData();
        if (!confirm(`Se generarán y refinarán los prompts de ${data.acts.length} actos en formato ${data.global.outputMode.toUpperCase()}. ¿Continuar?`)) return;
        for (let i = 0; i < data.acts.length; i++) {
            await this.generateAct(i);
            await new Promise(r => setTimeout(r, 2000));
        }
        alert("¡Rodaje Automático y Refinado Finalizado con Datos de Nexus Saga!");
        DirectorUI.toggleModal(); 
    }
};

window.DirectorCore = DirectorCore;