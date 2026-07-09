// --- cronologia/escaleta/ai_writer.js ---
// GUIONISTA TÉCNICO & DIRECTOR DE ARTE (V6.1 - EXPANSIÓN ATÓMICA DE BEATS DE NOVELA)

const AiWriter = {
    // Auxiliar para escapar caracteres especiales de RegExp de forma segura
    _escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    // Compilador Semántico Unificado (Inyección Anatómica desde base de datos Nexus)
    _injectNexusLore(rawPrompt, activeItems) {
        let characterSpecs = [];
        let curatedPrompt = rawPrompt;

        if (!activeItems || activeItems.length === 0) return { prompt: curatedPrompt, specs: characterSpecs };

        activeItems.forEach(item => {
            const nameKey = item.data.name || item.data.title;
            if (!nameKey) return;

            const cleanKey = nameKey.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const descriptionValue = item.data.visualDesc || item.data.desc || "";

            if (descriptionValue) {
                // Algoritmo Forense de Compresión Trasera (Limpieza de ruido técnico)
                let cleanDesc = descriptionValue.replace(/(\r\n|\n|\r)/gm, " ").trim();
                cleanDesc = cleanDesc.replace(/RGB:\s*\[?[0-9\s,]+\]?/gi, '');
                cleanDesc = cleanDesc.replace(/biological age \d+,?/gi, '');
                cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();

                const tokenStr = `@${cleanKey}`;
                const escapedName = this._escapeRegExp(nameKey);
                const rxRawName = new RegExp(`\\b${escapedName}\\b`, "gi");
                let isPresent = false;

                // Validation e inyección segura por Token o Nombre plano
                if (curatedPrompt.toLowerCase().includes(tokenStr)) {
                    curatedPrompt = curatedPrompt.replace(new RegExp(this._escapeRegExp(tokenStr), "gi"), nameKey);
                    isPresent = true;
                } else if (rxRawName.test(curatedPrompt)) {
                    curatedPrompt = curatedPrompt.replace(rxRawName, nameKey);
                    isPresent = true;
                }

                if (isPresent) {
                    characterSpecs.push(`[${nameKey.toUpperCase()}: ${cleanDesc}]`);
                }
            }
        });

        // Limpieza de hilos redundantes inline generados por la IA ("X is X")
        activeItems.forEach(item => {
            const nameKey = item.data.name || item.data.title;
            if (!nameKey) return;
            const escapedName = this._escapeRegExp(nameKey);
            const rxDuplicateCheck = new RegExp(`${escapedName}\\s+is\\s+${escapedName}`, 'gi');
            if (rxDuplicateCheck.test(curatedPrompt)) {
                curatedPrompt = curatedPrompt.replace(rxDuplicateCheck, nameKey);
            }
        });

        return { prompt: curatedPrompt, specs: characterSpecs };
    },

    // Algoritmo Forense por Alta Densidad y Subpartes Semánticas
    detectChaptersLogic(text) {
        const normalizedText = text.replace(/\r\n/g, '\n');
        const lines = normalizedText.split('\n');
                
        let chapters = [];
        let currentChapter = { id: 1, title: 'Bloque Inicial', content: '' };
                
        const regexCapitulo = /^(?:[#\*\>\s]*)(cap[i ]tulo|episodio|escena|evento|subparte|bloque|momento|parte|acto|giro|fase)\s+([0-9]+|[IVXLCDMivxlcdm]+|[a-z ]+)?(?:[\.\-\:\s]+)?(.*)/i;
        const regexNumeroSolo = /^(?:[#\*\>\s]*)([0-9]+|[IVXLCDM]+)\s*[\.\-\:]\s*(.*)/; 
        const regexMayusculas = /^[^a-z]{4,60}$/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const matchCap = line.match(regexCapitulo);
            const matchNum = line.match(regexNumeroSolo);
            const isAllCapsTitle = regexMayusculas.test(line) && line.length > 3 && !line.endsWith('.');
            let isSeparator = (matchCap || (matchNum && line.length < 80) || isAllCapsTitle);
            if (isSeparator) {
                if (currentChapter.content.trim().length > 0) {
                    chapters.push({...currentChapter});
                }
                                
                let cleanTitle = line.replace(/^[#\*\>\s]+/, '').replace(/[\*]+$/, '').trim();
                currentChapter = {
                    id: chapters.length + 1,
                    title: cleanTitle.length > 80 ? cleanTitle.substring(0, 80) + "..." : cleanTitle,
                    content: line + '\n' 
                };
            } else {
                currentChapter.content += line + '\n';
            }
        }
                
        if (currentChapter.content.trim().length > 0) {
            chapters.push(currentChapter);
        }

        // Control Crítico de Fragmentación Acelerada Forzada (Átomos semánticos densos)
        if (chapters.length < 25 && text.length > 2000) {
            const paragraphs = text.split(/\n\s*\n/);
            chapters = [];
            let tempContent = "";
            let capId = 1;
                        
            for(let p of paragraphs) {
                if (!p.trim()) continue;
                tempContent += p + "\n\n";
                if(tempContent.length > 600) {
                    let firstLine = p.trim().split('\n')[0];
                    let inlineTitle = firstLine.length > 40 ? firstLine.substring(0, 40) + "..." : firstLine;
                    chapters.push({ id: capId, title: `Escena Atomizada ${capId}: ${inlineTitle}`, content: tempContent });
                    capId++;
                    tempContent = "";
                }
            }
            if(tempContent.trim().length > 0) {
                chapters.push({ id: capId, title: `Escena Atomizada ${capId}`, content: tempContent });
            }
        }
        return chapters.map((c, i) => ({...c, id: i + 1}));
    },

    async generateStructure(manualContext = null) {
        let json = null;
        let sourceMode = "";

        if (manualContext && manualContext.trim().length > 0) {
            try {
                json = JSON.parse(manualContext);
                sourceMode = "MANUAL_JSON";
            } catch(e) {
                return alert("El modo 'Desde Cronología' requiere cargar un archivo estructurado JSON válido.");
            }
        } else {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Cronología JSON',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false
                });
                
                const file = await fileHandle.getFile();
                json = JSON.parse(await file.text());
                sourceMode = "JSON";
            } catch (e) { 
                console.warn("Carga de archivo cancelada o errónea:", e);
                return;
            }
        }

        if (!json) return alert("No hay datos estructurados válidos para procesar.");
        if (sourceMode === "MANUAL_JSON") EscaletaUI.toggleScriptModal();

        try {
            EscaletaUI.toggleLoading(true, "INGESTIÓN MAPEO CRONOLOGÍA", "Sincronizando imágenes fidedignas desde la carpeta del proyecto...");
            EscaletaUI.updateProgressBar(20);

            let flatEvents = [];
            if (json.events && Array.isArray(json.events)) flatEvents = json.events;
            else if (Array.isArray(json)) flatEvents = json;

            if (flatEvents.length === 0) {
                EscaletaUI.toggleLoading(false);
                return alert("No se encontraron eventos en el JSON.");
            }

            const nexusItems = (window.app && window.app.items) ? window.app.items : [];
            const flatCuratedTakes = [];
            let globalIdx = 0;

            // Verificación forense del root handle para extracción local directa
            if (!EscaletaCore.rootHandle) {
                EscaletaUI.toggleLoading(false);
                return alert("Por favor, abre primero la carpeta de tu proyecto mediante el botón 'Cargar Proyecto' para sincronizar los archivos de imagen.");
            }

            for (let eventIdx = 0; eventIdx < flatEvents.length; eventIdx++) {
                const event = flatEvents[eventIdx];
                const momentsList = event.moments || event.subpartes || event.subparts || [];
                const eventTitle = event.description || event.title || `Bloque ${eventIdx + 1}`;

                // Función interna modificada para buscar y enlazar el archivo de imagen de forma nativa en la carpeta
                const processImage = async (img64, imageFile) => {
                    // Ruta A: Si viene un archivo nombrado en la cronología (Nuevo Formato)
                    if (imageFile && imageFile.trim().length > 0) {
                        try {
                            const handle = await EscaletaCore.rootHandle.getFileHandle(imageFile.trim());
                            const file = await handle.getFile();
                            return { file: imageFile.trim(), url: URL.createObjectURL(file) };
                        } catch (e) {
                            console.warn(`[Mapeo Forense] No se encontró el archivo físico "${imageFile}" en la raíz de la carpeta. Creando toma sin asset pre-cargado.`);
                            return { file: null, url: null };
                        }
                    }
                    
                    // Ruta B: Fallback heredado por compatibilidad si viene en base64 nativo
                    if (img64 && img64.trim().length > 0) {
                        try {
                            const base64Data = img64.includes(',') ? img64.split(',')[1] : img64;
                            const byteString = atob(base64Data);
                            const mime = img64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';
                            
                            const ab = new ArrayBuffer(byteString.length);
                            const ia = new Uint8Array(ab);
                            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                            const blob = new Blob([ab], {type: mime});
                            
                            const fileName = `IMG_PHYSICAL_FALLBACK_${Date.now()}_${Math.floor(Math.random()*1000)}.png`;
                            await EscaletaCore.saveMediaFile(blob, fileName);
                            return { file: fileName, url: URL.createObjectURL(blob) };
                        } catch (e) {
                            console.error("Error al convertir Base64 heredado:", e);
                            return { file: null, url: null };
                        }
                    }

                    return { file: null, url: null };
                };

                const processMoment = async (moment, mIdx, isSingle) => {
                    globalIdx++;
                    
                    // Combinar origen de metadatos de imagen priorizando el momento exacto
                    const targetImage64 = moment.image64 || event.image64 || null;
                    const targetImageFile = moment.imageFile || moment.image_file || event.imageFile || event.image_file || null;
                    
                    // Extraer los datos físicos del File System
                    const imgData = await processImage(targetImage64, targetImageFile);
                    
                    // Inyección de Lore
                    let rawPrompt = moment.visualPrompt || moment.visual_prompt || moment.instruction || event.visualPrompt || "Cinematic shot";
                    const injection = this._injectNexusLore(rawPrompt, nexusItems);
                    
                    flatCuratedTakes.push({
                        id: `take-${Date.now()}-${eventIdx}-${mIdx}-${Math.floor(Math.random()*100)}`,
                        sequence_order: globalIdx,
                        visual_prompt: injection.prompt + (injection.specs.length > 0 ? ` --- CHARACTER LOOKS: ${injection.specs.join(", ")}` : ""),
                        narration_text: moment.text || moment.description || event.text || "...",
                        duration: 5.0,
                        video_file: null,
                        image_file: imgData.file,
                        imageBlobUrl: imgData.url,
                        audio_file: null,
                        audio_mode: 'diegetic',
                        act_marker: (isSingle || mIdx === 0) ? `ACTO: ${eventTitle.toUpperCase()}` : null,
                        frase_salida: "La escena concluyó en silencio."
                    });
                };

                if (momentsList.length === 0) {
                    await processMoment(event, 0, true);
                } else {
                    for(let mIdx = 0; mIdx < momentsList.length; mIdx++) {
                        await processMoment(momentsList[mIdx], mIdx, false);
                    }
                }
            }

            // Continuidad de frases
            flatCuratedTakes.forEach((take, idx) => {
                if (idx > 0) take.visual_prompt = `[CONTINUITY FROM SCENE CONTEXT: ${flatCuratedTakes[idx-1].frase_salida}] ` + take.visual_prompt;
            });

            EscaletaCore.data.takes = flatCuratedTakes;
            EscaletaCore.saveToDisk();
            EscaletaUI.renderTakes(flatCuratedTakes);
            EscaletaUI.updateStats();
            EscaletaUI.toggleLoading(false);
            
            alert(`Mapeo físico completado: ${flatCuratedTakes.length} tomas creadas vinculando las imágenes de la carpeta de forma limpia.`);
        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            alert("Error en la creación física de activos: " + e.message);
        }
    },

    async generateComicStructure(manualContext = null) {
        if (!ai.apiKey) return alert("Conecta la API Key primero (Botón 'Conectar IA').");
        let storyContext = manualContext || "";
        if (!storyContext.trim()) return alert("No hay historia para procesar.");
        
        EscaletaUI.toggleComicModal();

        try {
            EscaletaUI.toggleLoading(true, "FASE 1/2: ANÁLISIS FORENSE (CÓMIC)", "Identificando todos los elements de viñeta...");
            
            const safeContextVFX = storyContext.length > 15000 ? storyContext.substring(0, 15000) + "...(truncado)" : storyContext;
            const extractPrompt = `
            ACTÚA COMO: Supervisor de VFX.
            TEXTO: "${safeContextVFX}"
            TAREA: Lista CADA personaje, lugar, vehículo y objeto importante mencionado.
            SALIDA JSON: { "entities": ["Nombre1", "LugarA", "CocheX"] }
            `;
            
            const extractRes = await ai.callModel(extractPrompt, "Extrae las entidades.", 0.1, null);
            const entities = JSON.parse(ai.cleanJSON(extractRes)).entities || [];

            EscaletaUI.toggleLoading(true, "FASE 2/2: DIBUJANDO VIÑETAS", "Generando estructura ágil de cómic...");
            
            const replacementRules = entities.map(e => {
                return `ACTIVO "${e}": Invócalo mediante su tag @${e.toLowerCase().replace(/\s+/g, '')}`;
            }).join("\n\n");

            const scriptPrompt = `
            ACTÚA COMO: Un Guionista de Cómics de Novela Gráfica y Director de Fotografía.
            BASE DE DATOS VISUAL:
            ${replacementRules}
            HISTORIA:
            "${storyContext.substring(0, 25000)}"
            
            === INSTRUCCIONES DE IDIOMA MANDATORIAS ===
            1. 'visual_prompt' DEBE ESTAR ESCRITO AL 100% EN INGLÉS TÉCNICO, haciendo uso de etiquetas @ para referirse a los elementos estables.
            2. 'narration_text' DEBE ESTAR ESCRITO AL 100% EN ESPAÑOL (Frase corta y contundente para cartela o voz en off de viñeta).
            FORMATO JSON DE SALIDA:
            {
                "takes": [
                    {
                        "visual_prompt": "Comic book illustration, static cinematic shot completely in ENGLISH integrating labels with @ for the main subject...",
                        "narration_text": "Frase corta, dramática y contundente en ESPAÑOL para la narración."
                    }
                ]
            }`;

            let json = null;
            let currentTemperature = 0.3;
            let attempts = 0;
            const maxAttempts = 3;
            let rawComicRes = "";

            while (attempts < maxAttempts) {
                try {
                    if (attempts === 0) {
                        rawComicRes = await ai.callModel(scriptPrompt, "Genera la escaleta de cómic separando el prompt visual en inglés y la narración corta en español.", currentTemperature, null);
                    } else {
                        console.warn(`[REINTENTO CÓMIC JSON] Intento ${attempts + 1} de reparación...`);
                        const repairSystem = `Actúa como un depurador JSON de alta fidelidad. Repara el JSON roto provisto equilibrando comillas dobles y corchetes, manteniendo la estructura limpia sin texto exterior.`;
                        rawComicRes = await ai.callModel(repairSystem, `JSON DAÑADO:\n${rawComicRes}`, 0.1, 'gemini-fast');
                    }
                    const sanitizedComicRes = this.robustCleanAndFixJSON(rawComicRes);
                    json = JSON.parse(sanitizedComicRes);
                    if (json && json.takes && Array.isArray(json.takes)) break;
                    else throw new Error("JSON Inválido en estructura.");
                } catch(e) {
                    attempts++;
                    currentTemperature += 0.2;
                    if (attempts >= maxAttempts) throw new Error("Fallo de parseo de Cómic final.");
                }
            }

            const nexusItems = (window.app && window.app.items) ? window.app.items : [];
            const newTakes = json.takes.map((t, idx) => {
                let rawPrompt = t.visual_prompt || "Comic book style";

                // Inyección anatómica centralizada
                const injection = this._injectNexusLore(rawPrompt, nexusItems);

                let finalVisualPrompt = `Comic book panel, WIDE VIEW SCENE: ${injection.prompt}`;
                if (injection.specs.length > 0) {
                    finalVisualPrompt += ` --- CHARACTER DETAILS: ${injection.specs.join(", ")}`;
                }

                return {
                    id: `comic-${Date.now()}-${idx}`,
                    sequence_order: idx + 1,
                    visual_prompt: finalVisualPrompt, 
                    narration_text: t.narration_text,
                    duration: 3.0, 
                    video_file: null,
                    image_file: null,
                    audio_file: null,
                    image64: null,
                    audio_mode: 'custom', 
                    audio_custom_prompt: '',
                    audio_voice_lock: ''
                };
            });

            EscaletaCore.data.takes = newTakes;
            EscaletaCore.saveToDisk();
            EscaletaUI.renderTakes(EscaletaCore.data.takes);
            EscaletaUI.updateStats();
            EscaletaUI.toggleLoading(false);
            alert(`Proceso Cómic completado con inyección de Nexus Saga.\n- Viñetas Generadas: ${newTakes.length}`);
        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            alert("Error en el proceso de Cómic: " + e.message);
        }
    },

    robustCleanAndFixJSON(str) {
        if (!str) return "{}";
        let clean = ai.cleanJSON(str).trim();
        // Limpieza controlada de strings sin machacar escapes estructurales nativos
        clean = clean.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, function(match, p1) {
            return '"' + p1.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ") + '"';
        });
        clean = clean.replace(/\\'/g, "'");
        return clean;
    }
};

window.AiWriter = AiWriter;