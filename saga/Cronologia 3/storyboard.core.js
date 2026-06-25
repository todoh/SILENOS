// --- cronologia/storyboard.core.js ---
// MOTOR DE STORYBOARD Y CONSISTENCIA VISUAL (V4.0 - NARRATIVA VOICEOVER)

const Storyboard = {
    
    async analyzeAndGenerate(storyText) {
        if (!ai.apiKey) return alert("Conecta la IA primero.");
        if (!storyText) return alert("Escribe una historia primero.");

        const cleanStory = storyText.substring(0, 20000); 
        const inventoryList = ai.inventory || [];
        
        const existingAssets = main.visualBibleData || [];
        const hasMemory = existingAssets.length > 0;

        const getVisual = (asset) => {
            if (asset.visual_signature) return asset.visual_signature;
            if (asset.visualDesc) return asset.visualDesc;
            return "Descripción visual no disponible.";
        };

        try {
            ui.toggleLoading(true, "FASE 1: CONTINUIDAD VISUAL", hasMemory ? "Consultando VISUAL_BIBLE.json y detectando nuevos elementos..." : "Creando Biblia Visual desde cero...");

            const memoryString = JSON.stringify(existingAssets.map(a => ({ name: a.name, desc: getVisual(a) })));

            const biblePrompt = `
            ACTÚA COMO: Director de Arte y Diseñador de Vestuario obsesivo.
            
            HISTORIA DE ENTRADA:
            "${cleanStory}"
            
            MEMORIA VISUAL EXISTENTE (VISUAL_BIBLE.json):
            ${hasMemory ? memoryString : "NO HAY DATOS PREVIOS."}
            
            INVENTARIO DE DATOS (CONTEXTO):
            ${inventoryList.join('\n')}
            
            TAREA CRÍTICA (INCREMENTAL):
            1. Analiza la historia.
            2. Si aparecen personajes/lugares que YA ESTÁN en la "MEMORIA VISUAL EXISTENTE", NO LOS REDEFINAS. Ignóralos en la salida.
            3. SOLO genera fichas para los NUEVOS elementos visuales que no existan en la memoria.
            
            PARA LOS NUEVOS ELEMENTOS:
            Define la APARIENCIA EXACTA E INMUTABLE.
            NO USES RESÚMENES. USA ADJETIVOS VISUALES CONCRETOS EN INGLÉS O ESPAÑOL.
            
            CATEGORÍAS A EXTRAER:
            - PERSONAJES (Raza, Pelo, Ojos, Ropa Exacta, Armas).
            - LUGARES (Arquitectura, Colores, Luz).
            - OBJETOS (Material, Forma).

            SALIDA JSON (SOLO NUEVOS):
            {
                "new_assets": [
                    { 
                        "name": "NombreIdentificador", 
                        "type": "CHARACTER" | "LOCATION" | "OBJECT",
                        "visual_signature": "DESCRIPCIÓN MASIVA TIPO PROMPT..."
                    }
                ]
            }`;

            const bibleRes = await ai.callModel(biblePrompt, "Genera solo los NUEVOS activos visuales.", 0.2, 'claude-fast');
            const newAssets = JSON.parse(ai.cleanJSON(bibleRes)).new_assets || [];
            
            console.log(`Nuevos activos detectados: ${newAssets.length}`);
            
            const finalVisualBible = [...existingAssets];
            
            newAssets.forEach(newItem => {
                const exists = finalVisualBible.find(old => old.name.toLowerCase() === newItem.name.toLowerCase());
                if (!exists) {
                    finalVisualBible.push(newItem);
                }
            });

            await main.saveVisualBible(finalVisualBible);

            window.currentVisualBible = finalVisualBible.map(x => ({ name: x.name, visual_tags: getVisual(x) }));
            if (typeof SbUI !== 'undefined' && SbUI.renderBible) {
                SbUI.renderBible(window.currentVisualBible);
            }

            ui.toggleLoading(true, "FASE 2: ESTRUCTURA LITERARIA", "Escribiendo guion de narrador y separando acciones técnicas...");

            const skeletonPrompt = `
            ACTÚA COMO: Un Guionista de Documental Poético y Director Técnico.
            
            HISTORIA:
            "${cleanStory}"
            
            LISTA DE ACTIVOS:
            ${finalVisualBible.map(a => a.name).join(', ')}
            
            TAREA:
            Divide la historia en ESCENAS y genera DOS tipos de texto para cada una:
            
            1. "visual_action": Descripción fría, técnica y física. Qué se ve.
            2. "narrator_text": El texto LITERARIO y EMOCIONAL que acompaña a la imagen.
            
            SALIDA JSON:
            {
                "scenes": [
                    { 
                        "time": 1.0, 
                        "title": "Título corto", 
                        "visual_action": "Descripción técnica de la acción física...",
                        "narrator_text": "Texto literario final para el narrador...",
                        "assets_present": ["NombreExacto1", "NombreExacto2"] 
                    }
                ]
            }`;

            const skeletonRes = await ai.callModel(skeletonPrompt, "Genera la estructura con narración literaria.", 0.4, 'claude-fast');
            const sceneSkeleton = JSON.parse(ai.cleanJSON(skeletonRes)).scenes;

            ui.toggleLoading(true, "FASE 3: INGENIERÍA DE PROMPTS 8K", "Generando prompts basados en la acción técnica...");

            const substitutionMap = finalVisualBible.map(a => 
                `- IDENTIFICADOR: "${a.name}"  >>>  SUSTITUIR POR: "${getVisual(a)}"`
            ).join('\n');

            const promptEngineeringPrompt = `
            ACTÚA COMO: Un "Traductor Visual".
            
            TU FUENTE DE VERDAD:
            Usa ÚNICAMENTE el campo "visual_action" del JSON de entrada. IGNORA el campo "narrator_text".
            
            TU MISIÓN (SUSTITUCIÓN OBLIGATORIA):
            Debes reescribir la "visual_action" ELIMINANDO LOS NOMBRES PROPIOS y reemplazándolos por su DESCRIPCIÓN FÍSICA del mapa.
            
            MAPA DE SUSTITUCIÓN (VISUAL BIBLE):
            ${substitutionMap}
            
            ESCENAS A TRADUCIR:
            ${JSON.stringify(sceneSkeleton)}
            
            REGLAS DE SALIDA (INGLÉS):
            1. JAMÁS incluyas el nombre del personaje en el prompt final.
            2. Describe la acción + el entorno + la iluminación basándote en "visual_action".
            3. Añade al final: "cinematic lighting, 8k, highly detailed, masterpiece".
            
            SALIDA JSON:
            {
                "prompts": [
                    "Prompt visual escena 1...",
                    "Prompt visual escena 2..."
                ]
            }`;

            const promptsRes = await ai.callModel(promptEngineeringPrompt, "Genera los Prompts Maestros.", 0.2, 'claude-fast');
            const promptList = JSON.parse(ai.cleanJSON(promptsRes)).prompts;
            
            const finalEvents = [];
            
            sceneSkeleton.forEach((scene, index) => {
                const visual = promptList[index] || "Error generating visual prompt.";
                
                finalEvents.push({
                    id: 'evt-' + Date.now() + Math.floor(Math.random() * 10000),
                    time: scene.time,
                    description: scene.title,
                    moments: [{ 
                        id: Date.now() + Math.floor(Math.random() * 10000), 
                        text: scene.narrator_text || scene.visual_action,
                        visualPrompt: visual,
                        image64: null,
                        aspectRatio: 'landscape'
                    }]
                });
            });

            main.loadEvents(finalEvents);
            main.saveData();

            ui.toggleLoading(false);
            ui.togglePremiseModal();
            alert(`Storyboard Generado con Narrativa Literaria.\n\nSe han guardado ${newAssets.length} nuevos activos visuales.`);

        } catch (e) {
            console.error(e);
            ui.toggleLoading(false);
            alert("Error Crítico en Storyboard Core: " + e.message);
        }
    }
};