// Archivo: Librojuego/ai.visual2.js

window.AIVisual2 = {
    parseBibleEntities(bibleObj) {
        const entities = {};
        const categories = ['characters', 'places', 'flora_fauna', 'objects_tech', 'clothing', 'magic_fx'];
        categories.forEach(cat => {
            const text = bibleObj[cat] || "";
            // Regex ultra robusto: atrapa @ETIQUETA seguida opcionalmente de dos puntos y recoge la descripción
            const regex = /@([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)[ \t]*:?\s*([\s\S]*?)(?=\n\s*@|$)/gi;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const tagName = '@' + match[1].trim().toUpperCase();
                entities[tagName] = match[2].trim();
            }
        });
        return entities;
    },

    /**
     * Llama a la IA para fusionar los rasgos base con la situación, con reglas estrictas ANTI-CLONES.
     */
    async adaptEntityToContext(entityName, baseTags, contextText) {
        const sysPrompt = `Eres un Director de Arte experto en prompts (tags) para IA de imágenes.
        Tu misión es adaptar visualmente una entidad a su contexto actual.
        REGLAS DE ORO ANTI-MUTACIONES (Doble cara, clones, extremidades extra):
        1. Devuelve SOLO etiquetas en inglés separadas por comas. Cero literatura.
        2. PROHIBIDO USAR NOMBRES PROPIOS.
        3. EL TAG MÁGICO: Si estás adaptando a un personaje individual, DEBES incluir obligatoriamente el tag "solo" (ej: "1boy, solo", "1girl, solo", "1monster, solo"). Esto es VITAL para evitar caras dobles.
        4. NO REPITAS CONCEPTOS: Si dices "1boy", prohíbido añadir "man", "male" o "guy".
        5. AISLAMIENTO ESTRICTO: Describe SOLO a esta entidad. Si es un lugar, describe el lugar SIN PERSONAS.
        6. Mantén la fisonomía base intacta , detalla todo lo que la escena conserve de la entidad y añade ropa/pose/detalles de la escena actual.`;

        const userPrompt = `
            ENTIDAD A ADAPTAR: ${entityName}
            RASGOS BASE (Biblia): ${baseTags}
            ESCENA ACTUAL (Texto): "${contextText}"
            
            Genera los tags físicos adaptados EXCLUSIVAMENTE para esta entidad y escena, aplicando las reglas anti-mutaciones:
        `;

        let adaptedTags = await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, {
            model: 'gemini-fast', jsonMode: false, temperature: 0.1 
        }, (d) => d && d.length > 5);

        return adaptedTags.replace(/\n/g, '').trim();
    },

    async generateNodePrompt(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node) throw new Error("Nodo no encontrado.");

        let bible = Core.bookData?.visualBible || Core.book?.visualBible || {};
        if (typeof bible === 'string') bible = { style: bible };
        
        const entitiesMap = this.parseBibleEntities(bible);
        
        // --- PASO 0: DETECCIÓN EXPLÍCITA DE ETIQUETAS EN EL TEXTO DEL NODO ---
        const textRegex = /@[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g;
        const foundTagsMatch = node.text.match(textRegex) || [];
        const explicitTagsInText = [...new Set(foundTagsMatch.map(t => t.toUpperCase()))]
                                   .filter(t => entitiesMap[t]);

        // --- PASO 1: EL ANALISTA DE COMPOSICIÓN ---
        const sysPromptLinker = `Eres un Director de Fotografía experto en encuadres. 
        REGLAS ESTRICTAS DE CANON:
        1. REGLA DE ORO: En la imagen SOLO PUEDEN APARECER las entidades que te pasaremos en la lista "ENTIDADES EXPLICITAS". Si un personaje no está en esa lista, está TERMINANTEMENTE PROHIBIDO que aparezca, incluido el protagonista.
        2. Identifica UN (1) SUJETO PRINCIPAL eligiéndolo ÚNICAMENTE de la lista "ENTIDADES EXPLICITAS". Si la lista está vacía, déjalo en blanco "".
        3. Clasifica la cámara: FIRST_PERSON_POV o THIRD_PERSON.
        4. "action_tags": SOLO verbos y objetos (ej: "running, holding sword"). PROHIBIDO usar sustantivos de sujetos o personajes aquí.
        5. "environment_tags": SOLO paisaje y clima. PROHIBIDO mencionar seres vivos aquí.
        6. "other_entities": Lista otras entidades presentes, eligiéndolas SIEMPRE de la lista "ENTIDADES EXPLICITAS" y que no sean el main_subject.
        Devuelve JSON PURO.`;

        const userPromptLinker = `
            TEXTO DEL NODO: "${node.text}"
            ENTIDADES EXPLICITAS (SOLO PUEDES ELEGIR DE AQUÍ, ES UNA LEY ESTRICTA): [${explicitTagsInText.join(", ")}]

            {
                "main_subject": "ETIQUETA_CON_ARROBA o vacío",
                "camera_type": "FIRST_PERSON_POV o THIRD_PERSON",
                "other_entities": ["OTRAS_ETIQUETAS_DE_LA_LISTA"],
                "environment_tags": "tags de entorno puramente inanimado",
                "action_tags": "tags de accion (solo verbos, sin sujetos)"
            }
        `;

        let composition = await window.Koreh.Text.generateWithRetry(sysPromptLinker, userPromptLinker, {
            model: 'gemini-fast', jsonMode: true, temperature: 0.1 
        }, (d) => d && typeof d.main_subject !== 'undefined');

        // --- PASO 1.5: FUSIÓN DE ETIQUETAS Y LIMPIEZA ANTI-DUPLICADOS ---
        let mainSub = composition.main_subject ? composition.main_subject.toUpperCase() : "";
        if (mainSub && !mainSub.startsWith('@')) mainSub = '@' + mainSub;

        // Filtro de seguridad máximo: si la IA se inventa un main_subject que no está en las etiquetas explícitas, lo anulamos
        if (mainSub && !explicitTagsInText.includes(mainSub)) {
            mainSub = "";
        }

        // Si no hay sujeto principal válido, pero tenemos etiquetas explícitas, forzamos la primera como principal
        if (!mainSub && explicitTagsInText.length > 0) {
            mainSub = explicitTagsInText[0];
        }

        let finalEntities = new Set();
        
        // Forzamos la inclusión de TODAS y SOLO las etiquetas explícitas encontradas
        explicitTagsInText.forEach(t => finalEntities.add(t));
        
        // Retiramos el sujeto principal de la lista de secundarios para no duplicar
        if (mainSub) finalEntities.delete(mainSub);
        
        const otherEntitiesClean = Array.from(finalEntities);

        // --- PASO 2: ADAPTACIÓN CONTEXTUAL DE ENTIDADES ---
        const adaptedEntities = {};
        const adaptPromises = [];
        
        if (mainSub && entitiesMap[mainSub]) {
            // Si la cámara es 1ª persona y el main es el protagonista, no lo dibujamos frontalmente
            if (!(mainSub === "@PROTAGONISTA" && composition.camera_type === "FIRST_PERSON_POV")) {
                adaptPromises.push(
                    this.adaptEntityToContext(mainSub, entitiesMap[mainSub], node.text)
                    .then(tags => adaptedEntities[mainSub] = tags)
                );
            }
        } else if (mainSub) {
            adaptedEntities[mainSub] = mainSub; 
        }

        otherEntitiesClean.forEach(name => {
            if (entitiesMap[name] && !adaptedEntities[name]) {
                adaptPromises.push(
                    this.adaptEntityToContext(name, entitiesMap[name], node.text)
                    .then(tags => adaptedEntities[name] = tags)
                );
            }
        });

        if (adaptPromises.length > 0) {
            console.log(`Aplicando reglas anti-mutaciones a ${adaptPromises.length} entidades explícitas...`);
            await Promise.all(adaptPromises);
        }

        // --- PASO 3: CONSTRUCCIÓN DE PROMPT FINAL DIRECTO ---
        let promptParts = [];
        
        if (composition.camera_type === "FIRST_PERSON_POV") {
            promptParts.push("first-person view, POV, looking through eyes, empty foreground, realism, photorealistic");
        } else {
            promptParts.push("wide shot, cinematic shot, realism, photorealistic");
        }

        if (mainSub && adaptedEntities[mainSub]) {
            promptParts.push(adaptedEntities[mainSub]); 
        }

        if (composition.action_tags) {
            let cleanAction = composition.action_tags.replace(/\b(man|woman|boy|girl|person|people|creature|human)\b/gi, '').trim();
            if (cleanAction) promptParts.push(cleanAction);
        }

        if (composition.environment_tags) promptParts.push(composition.environment_tags);

        otherEntitiesClean.forEach(name => {
            if (adaptedEntities[name]) {
                promptParts.push(`(background element, ${adaptedEntities[name]}:0.4)`);
            }
        });

        if (bible.style) promptParts.push(bible.style.trim());

        let finalPrompt = promptParts.filter(p => p).join(", ");
        finalPrompt = finalPrompt
            .replace(/\s+/g, ' ')           
            .replace(/, ,+/g, ',')           
            .replace(/,(?=\s*,)/g, '')      
            .trim();
        
        while(finalPrompt.includes(', ,')) finalPrompt = finalPrompt.replace(/, ,/g, ',');
        if (finalPrompt.startsWith(',')) finalPrompt = finalPrompt.substring(1).trim();
        if (finalPrompt.endsWith(',')) finalPrompt = finalPrompt.substring(0, finalPrompt.length - 1).trim();
        
        console.log("PROMPT FINAL ESTRICTO:", finalPrompt);
        return finalPrompt.substring(0, 1500);
    }
};