// Archivo: Librojuego/ai.visual.js

window.AIVisual = {
    isUpdateMode: false,

    openModal(isUpdate = false) {
        this.isUpdateMode = isUpdate;
        const modal = document.getElementById('visual-bible-modal');
        const btnSubmit = document.getElementById('btn-submit-visual-modal');
        
        if (btnSubmit) {
            if (this.isUpdateMode) {
                btnSubmit.innerHTML = `<i class="fa-solid fa-plus"></i> Añadir Novedades a la Biblia`;
            } else {
                btnSubmit.innerHTML = `<i class="fa-solid fa-book-open-reader"></i> Forjar Biblia Visual de Cero`;
            }
        }

        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    },
    
    closeModal() {
        const modal = document.getElementById('visual-bible-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },
    
    submitModal() {
        const input = document.getElementById('visual-bible-instructions');
        const customInstructions = input ? input.value : "";
        this.closeModal();
        this.generateVisualBible(customInstructions, this.isUpdateMode);
    },

    saveManualBible() {
        const bible = {
            style: document.getElementById('vb-style')?.value || '',
            characters: document.getElementById('vb-characters')?.value || '',
            places: document.getElementById('vb-places')?.value || '',
            flora_fauna: document.getElementById('vb-flora_fauna')?.value || '',
            objects_tech: document.getElementById('vb-objects_tech')?.value || '',
            clothing: document.getElementById('vb-clothing')?.value || '',
            magic_fx: document.getElementById('vb-magic_fx')?.value || ''
        };
        
        if (Core.bookData) Core.bookData.visualBible = bible;
        if (Core.book) Core.book.visualBible = bible;
        if (Core.scheduleSave) Core.scheduleSave();
    },
    
    loadManualBible(bibleData) {
        if (!bibleData) return;
        if (typeof bibleData === 'string') {
            const el = document.getElementById('vb-style');
            if (el) el.value = bibleData;
        } else {
            if (document.getElementById('vb-style')) document.getElementById('vb-style').value = bibleData.style || '';
            if (document.getElementById('vb-characters')) document.getElementById('vb-characters').value = bibleData.characters || '';
            if (document.getElementById('vb-places')) document.getElementById('vb-places').value = bibleData.places || '';
            if (document.getElementById('vb-flora_fauna')) document.getElementById('vb-flora_fauna').value = bibleData.flora_fauna || '';
            if (document.getElementById('vb-objects_tech')) document.getElementById('vb-objects_tech').value = bibleData.objects_tech || '';
            if (document.getElementById('vb-clothing')) document.getElementById('vb-clothing').value = bibleData.clothing || '';
            if (document.getElementById('vb-magic_fx')) document.getElementById('vb-magic_fx').value = bibleData.magic_fx || '';
        }
    },

    async generateVisualBible(customInstructions = "", isUpdate = false) {
        const actionMsg = isUpdate ? "Extrayendo Novedades..." : "Fase 1: Extrayendo Taxonomía Visual...";
        UI.setLoading(true, actionMsg, 10, "Analizando trama y listando elementos", 20);
        
        try {
            const bookTitle = Core.bookData?.title || Core.book?.title || "Sin título";
            const nodes = Core.bookData?.nodes || Core.book?.nodes || [];
            
            if (nodes.length === 0) return alert("Aún no hay nodos de historia para analizar.");

            const contextNodes = nodes.slice(0, 15).map(n => n.text).join(" | ");

            const instructionsText = customInstructions.trim() 
                ? `\nINSTRUCCIONES ESTRICTAS DEL USUARIO (SÍGUELAS AL PIE DE LA LETRA PARA AFINAR EL LORE VISUAL):\n"${customInstructions}"\n` 
                : "";

            const currentBibleObj = {
                style: document.getElementById('vb-style')?.value || '',
                characters: document.getElementById('vb-characters')?.value || '',
                places: document.getElementById('vb-places')?.value || '',
                flora_fauna: document.getElementById('vb-flora_fauna')?.value || '',
                objects_tech: document.getElementById('vb-objects_tech')?.value || '',
                clothing: document.getElementById('vb-clothing')?.value || '',
                magic_fx: document.getElementById('vb-magic_fx')?.value || ''
            };

            let sysPromptTaxonomy = "Eres un Director de Arte y Worldbuilder. Analiza la historia y define el estilo visual global. Además, extrae listas de nombres de elementos clave explícitos en el texto que requieran diseño visual. OBLIGATORIO: En la categoría 'characters', DEBES incluir siempre a un 'Protagonista Principal (El Jugador)' para garantizar que tenga una hoja de diseño única, ya que la historia suele estar en segunda persona. Devuelve ESTRICTAMENTE JSON PURO." + 
                (customInstructions.trim() ? " Debes obedecer incondicionalmente las INSTRUCCIONES ESTRICTAS DEL USUARIO a la hora de determinar el estilo y los elementos." : "");
            
            let userPromptTaxonomy = `
                Título: ${bookTitle}
                Contexto argumental: ${contextNodes.substring(0, 3000)}
                ${instructionsText}
            `;

            if (isUpdate) {
                sysPromptTaxonomy = "Eres un Director de Arte y Worldbuilder. Analiza la historia y extrae SOLO los NUEVOS elementos clave que NO estén ya mencionados en la Biblia Visual actual. MANTÉN el estilo global. Devuelve ESTRICTAMENTE JSON PURO.";
                userPromptTaxonomy += `\n\nBIBLIA VISUAL ACTUAL (NO repitas bajo ningún concepto elementos que ya estén descritos aquí):\n`;
                userPromptTaxonomy += `Estilo: ${currentBibleObj.style}\n`;
                userPromptTaxonomy += `Personajes actuales: ${currentBibleObj.characters}\n`;
                userPromptTaxonomy += `Lugares actuales: ${currentBibleObj.places}\n`;
                userPromptTaxonomy += `Flora/Fauna actual: ${currentBibleObj.flora_fauna}\n`;
                userPromptTaxonomy += `Objetos/Tech actuales: ${currentBibleObj.objects_tech}\n`;
                userPromptTaxonomy += `Ropa actual: ${currentBibleObj.clothing}\n`;
                userPromptTaxonomy += `Magia/FX actuales: ${currentBibleObj.magic_fx}\n`;
            }

            userPromptTaxonomy += `\nDevuelve un JSON con el 'style' global (MANTÉN el existente si estás actualizando) y arrays de NUEVOS nombres (conceptos cortos) de elementos para cada categoría. Si no hay elementos nuevos para una categoría, deja el array vacío:
            {
                "style": "Estilo artístico global (Ej: Cinematic, dark fantasy, iluminación dramática, paleta fría...)",
                "elements": {
                    "characters": ["Nombre o rol del nuevo personaje 1"],
                    "places": ["Lugar nuevo 1"],
                    "flora_fauna": ["Bestia nueva 1"],
                    "objects_tech": ["Arma nueva 1"],
                    "clothing": ["Estilo de armaduras nuevas"],
                    "magic_fx": ["Nuevo hechizo o aura"]
                }
            }`;

            const taxonomyData = await window.Koreh.Text.generateWithRetry(sysPromptTaxonomy, userPromptTaxonomy, {
                model: 'gemini-fast', 
                jsonMode: true,
                temperature: 0.6
            }, (data) => data && data.elements);

            const globalStyle = taxonomyData.style || currentBibleObj.style || "Cinematic, masterpiece";
            const elements = taxonomyData.elements || {};
            
            const finalBible = {
                style: globalStyle,
                characters: "",
                places: "",
                flora_fauna: "",
                objects_tech: "",
                clothing: "",
                magic_fx: ""
            };

            const categoriesToProcess = ['characters', 'places', 'flora_fauna', 'objects_tech', 'clothing', 'magic_fx'];
            let totalElements = 0;
            categoriesToProcess.forEach(cat => {
                if (elements[cat] && Array.isArray(elements[cat])) totalElements += elements[cat].length;
            });

            if (totalElements === 0) {
                 if (isUpdate) {
                     alert("No se encontraron elementos nuevos para añadir a la Biblia.");
                 } else {
                     this.loadManualBible(finalBible);
                 }
                 UI.setLoading(false);
                 return;
            }

            UI.setLoading(true, "Fase 2: Elaboración Profunda...", 30, `0/${totalElements} elementos diseñados`, 90);
            let processedElements = 0;

            const elaborateElement = async (category, elementName) => {
                let categoryInstructions = "";
                if (category === 'characters') {
                    categoryInstructions = `
                ENFOQUE OBLIGATORIO PARA PERSONAJES (FISONOMÍA ÚNICA Y SEPARADA):
                Para evitar mezclar conceptos, debes definir la anatomía paso a paso y con precisión absoluta:
                1) ROSTRO Y CABEZA: Define la forma exacta de la cara, color y textura del cabello, ojos, cicatrices o pintura.
                2) COMPLEXIÓN Y CUERPO: Tono de piel, constitución (atlética, esquelética), musculatura.
                3) VESTIMENTA: Ropa por capas, materiales exactos, colores, nivel de desgaste.`;
                } else if (category === 'flora_fauna') {
                    categoryInstructions = `ENFOQUE OBLIGATORIO PARA BESTIAS/FLORA: Anatomía detallada, tipo de cobertura (escamas, pelaje), paleta de colores, extremidades, tipo de ojos, garras/dientes.`;
                } else if (category === 'places') {
                    categoryInstructions = `ENFOQUE OBLIGATORIO PARA LUGARES/ENTORNOS: Arquitectura predominante, materiales de construcción exactos, paleta de color del paisaje, tipo de iluminación, atmósfera/clima.`;
                } else {
                    categoryInstructions = `ENFOQUE OBLIGATORIO PARA OBJETOS/VEHÍCULOS/ROPA: Forma geométrica principal, material exacto de fabricación, colores, texturas al tacto, nivel de óxido/desgaste/rotura y detalles decorativos.`;
                }

                const sysPromptElaborate = `Eres un Artista de Conceptos 3D de élite creando 'Fichas de Diseño' (Model Sheets) visuales AISLADOS.
                TU MISIÓN: Describir ÚNICAMENTE el aspecto visual físico del elemento solicitado con una precisión quirúrgica, inyectando realismo fisonómico y material.
                
                REGLA DE ORO:
                - ESTRICTAMENTE PROHIBIDO usar literatura, narrativa, acciones o verbos.
                - FORMATO OBLIGATORIO: Listado denso y descriptivo de rasgos visuales separados por comas.
                - ESTRICTAMENTE PROHIBIDO describir fondos o entornos para personajes u objetos. Aíslalos en un vacío gris.
                
                ${categoryInstructions}`;
                
                const userPromptElaborate = `
                    Estilo Visual Global del Universo: "${globalStyle}"
                    (Contexto narrativo de referencia): "${contextNodes.substring(0, 1500)}"
                    ${instructionsText}
                    
                    Categoría del Asset: ${category}
                    Elemento a diseñar y detallar minuciosamente: "${elementName}"

                    Genera ahora mismo el listado denso de etiquetas visuales.
                `;

                try {
                    const description = await window.Koreh.Text.generateWithRetry(sysPromptElaborate, userPromptElaborate, {
                        model: 'gemini-fast', 
                        jsonMode: false,
                        temperature: 0.3
                    }, (data) => data && data.length > 10);
                    
                    processedElements++;
                    let pct = 30 + ((processedElements / totalElements) * 65);
                    UI.setLoading(true, `Diseñando Asset: ${elementName}`, pct, `${processedElements}/${totalElements} elementos detallados`, pct);
                    
                    return `[${elementName.toUpperCase()}]: ${description.trim()}`;
                } catch (e) {
                    console.warn(`Error al detallar ${elementName}`, e);
                    return `[${elementName.toUpperCase()}]: (Fallo en la descripción visual).`;
                }
            };

            for (const cat of categoriesToProcess) {
                let existingContent = (isUpdate && currentBibleObj[cat]) ? currentBibleObj[cat] + "\n\n" : "";

                if (elements[cat] && Array.isArray(elements[cat]) && elements[cat].length > 0) {
                    const promises = elements[cat].map(async (el, index) => {
                        await new Promise(r => setTimeout(r, index * 300));
                        return elaborateElement(cat, el);
                    });
                    
                    const descriptions = await Promise.all(promises);
                    finalBible[cat] = existingContent + descriptions.join("\n\n");
                } else {
                    finalBible[cat] = existingContent + (isUpdate ? "" : "No se encontraron elementos destacables para esta categoría en el análisis inicial.");
                }

                finalBible[cat] = finalBible[cat].trim(); 
            }

            this.loadManualBible(finalBible);
            this.saveManualBible();

        } catch (error) {
            console.error(error);
            alert("Error del Agente de Lore Visual: " + error.message);
        } finally {
            UI.setLoading(false);
        }
    },

    parseBibleEntities(bibleObj) {
        const entities = {};
        const categories = ['characters', 'places', 'flora_fauna', 'objects_tech', 'clothing', 'magic_fx'];
        
        categories.forEach(cat => {
            const text = bibleObj[cat] || "";
            const regex = /\[(.*?)\]:\s*([\s\S]*?)(?=\n\[|$)/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                entities[match[1].trim().toUpperCase()] = match[2].trim();
            }
        });
        return entities;
    },

    async generateNodePrompt(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node) throw new Error("Nodo no encontrado en el núcleo.");

        let parentText = "";
        const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
        const parentNode = allNodes.find(n => n.choices && n.choices.some(c => c.targetId === nodeId));
        if (parentNode && parentNode.text) {
            parentText = parentNode.text;
        }

        let bible = Core.bookData?.visualBible || Core.book?.visualBible || {};
        if (typeof bible === 'string') bible = { style: bible, characters: "", places: "", flora_fauna: "", objects_tech: "", clothing: "", magic_fx: "" };
        
        const availableEntitiesMap = this.parseBibleEntities(bible);
        const availableNames = Object.keys(availableEntitiesMap);

        const sysPromptLinker = `Eres un Director de Cinematografía y Analista de Escenas.
        Tu misión es diseccionar la escena y decidir CÓMO debe ser ilustrada para tener el mayor impacto visual.
        
        REGLAS CRÍTICAS:
        1. FOCO PRINCIPAL: Decide de qué trata la imagen visualmente.
           - "PERSONAJE": Si la acción recae en un personaje, combate, diálogo o pose heroica.
           - "OBJETO": Si la escena describe examinar un artefacto, recoger un ítem, un puzzle, o un detalle minucioso.
           - "ENTORNO": Si la escena describe llegar a un nuevo lugar, un paisaje, arquitectura, o establecer contexto espacial.
        2. ENTIDADES: Identifica cuáles de las ENTIDADES DISPONIBLES aparecen. 
        3. CÁMARA ADAPTATIVA: Elige el plano que mejor encaje con el FOCO.
        
        Devuelve ESTRICTAMENTE JSON PURO.`;

        const geoContext = window.AISupport && typeof window.AISupport.getGeographicContext === 'function' ? window.AISupport.getGeographicContext(nodeId) : ""; 

        const userPromptLinker = `
            -- NODO PREVIO (Contexto de llegada): "${parentText ? parentText.substring(0, 600) : 'Comienzo.'}"
            -- NODO ACTUAL (Escena a ilustrar): "${node.text.substring(0, 1000)}"
            ${geoContext}

            -- ENTIDADES DISPONIBLES EN LA BIBLIA LORE: 
            [${availableNames.length > 0 ? availableNames.join(", ") : "Ninguna detectada"}]

            Devuelve este JSON exacto:
            {
                "foco_principal": "PERSONAJE, OBJETO o ENTORNO",
                "entidades_presentes": ["NombreExacto1", "NombreExacto2"],
                "plano_camara": "Plano coherente con el foco",
                "iluminacion_atmosfera": "Breve tag técnico de luz",
                "accion_visual_cruda": "Descripción pura y objetiva de lo que se ve en pantalla"
            }
        `;

        let linkData = { foco_principal: "PERSONAJE", entidades_presentes: [], plano_camara: "Medium Shot", iluminacion_atmosfera: "Cinematic lighting", accion_visual_cruda: "Escena genérica" };
        try {
            linkData = await window.Koreh.Text.generateWithRetry(sysPromptLinker, userPromptLinker, {
                model: 'gemini-fast', 
                jsonMode: true,
                temperature: 0.1 
            }, (d) => d && d.foco_principal && d.plano_camara);
        } catch (e) {
            console.warn("[Agente Visual] Falló detección de cámara y foco, usando valores por defecto.", e);
        }

        let literalInjections = "";
        if (linkData.entidades_presentes && Array.isArray(linkData.entidades_presentes)) {
            linkData.entidades_presentes.forEach(entityName => {
                if (!entityName) return;
                const nameUpper = entityName.toUpperCase();
                if (availableEntitiesMap[nameUpper]) {
                    literalInjections += `\n[LORE EXACT FOR ${nameUpper}]:\n"${availableEntitiesMap[nameUpper]}"\n`;
                }
            });
        }

        if (!literalInjections.trim()) {
            literalInjections = "No specific entities detected. Rely heavily on the 'Visual Scene Description'.";
        }

        const sysPromptArranger = `You are a Technical Prompt Composer for high-end diffusion models (FLUX).
        MISSION: Assemble a highly descriptive English prompt strictly enforcing the Global Style Anchor and the Primary Scene Focus.
        
        CRITICAL COMPOSITION RULES:
        1. GLOBAL STYLE ANCHOR: You MUST begin the prompt EXACTLY with the provided 'Global Artistic Style' string. Do not alter it, summarize it, or skip it.
        2. RESPECT THE FOCUS: The scene revolves around the PRIMARY FOCUS.
        3. LITERAL INTEGRATION: You MUST use the exact physical traits from the "LITERAL LORE" section for the entities involved. Blend them naturally.
        4. TAG FORMATTING: Use dense, comma-separated descriptive tags.
        5. RIGID STRUCTURE: [Global Artistic Style], [Camera Shot], [Visual Scene Description integrated with Literal Lore], [Lighting & Atmosphere].
        
        Return ONLY the final English prompt string. No markdown, no JSON, no explanations.`;

        const globalStyle = bible.style ? bible.style.trim() : 'Cinematic, masterpiece, highly detailed';

        const userPromptArranger = `
            Global Artistic Style: "${globalStyle}"
            PRIMARY FOCUS: "${linkData.foco_principal}"
            Camera & Framing: "${linkData.plano_camara}"
            Lighting & Atmosphere: "${linkData.iluminacion_atmosfera}"
            Visual Scene Description: "${linkData.accion_visual_cruda}"
            
            LITERAL LORE TO INJECT (Translate traits to English and apply them to the subjects):
            ${literalInjections}

            Write the final, cohesive, tag-based English prompt now. Start EXACTLY with: "${globalStyle}, "
        `;

        let finalPromptRaw = "";
        try {
            finalPromptRaw = await window.Koreh.Text.generateWithRetry(sysPromptArranger, userPromptArranger, {
                model: 'gemini-fast', 
                jsonMode: false,
                temperature: 0.3 
            }, (d) => d && d.length > 20);
        } catch (e) {
            console.warn("[Agente Visual] Fallo final en ensamblaje de prompt.", e);
            finalPromptRaw = `${globalStyle}, ${linkData.plano_camara}, ${linkData.accion_visual_cruda}, ${linkData.iluminacion_atmosfera}`;
        }

        let finalPrompt = finalPromptRaw.trim().replace(/\n/g, ' ');
        finalPrompt = finalPrompt.replace(/^"|"$/g, '').replace(/^```\w*\s*/, '').replace(/```$/, '');
        
        if (finalPrompt.length > 1300) finalPrompt = finalPrompt.substring(0, 1300);

        return finalPrompt;
    }
};