// --- cronologia/storyboard.core.js ---
// MOTOR DE STORYBOARD Y CONSISTENCIA VISUAL (V4.0 - NARRATIVA VOICEOVER)
// REFACTORIZADO: Corrección absoluta del ReferenceError reemplazando 'ai' por los componentes nativos de window.Koreh

const Storyboard = {
    
    async analyzeAndGenerate(storyText) {
        // Validación de autenticación alineada con el Core centralizado
        const authKey = window.Koreh.Core ? window.Koreh.Core.getAuthKey() : '';
        if (window.Koreh.Core && window.Koreh.Core.config.apiMode === 'pollinations' && !authKey) {
            return alert("Conecta la IA primero. Falta clave de autenticación en la configuración global.");
        }
        if (!storyText) return alert("Escribe una historia primero.");

        const cleanStory = storyText.substring(0, 20000); 
        
        // Recuperar el inventario del buscador de cronoAI o la app principal de forma segura
        const inventoryList = (window.cronoAI && window.cronoAI.inventory) ? window.cronoAI.inventory : [];
        
        const existingAssets = window.mainCrono.visualBibleData || [];
        const hasMemory = existingAssets.length > 0;

        const getVisual = (asset) => {
            if (asset.visual_signature) return asset.visual_signature;
            if (asset.visualDesc) return asset.visualDesc;
            return "Descripción visual no disponible.";
        };

        try {
            window.ui.toggleLoading(true, "FASE 1: CONTINUIDAD VISUAL", hasMemory ? "Consultando VISUAL_BIBLE.json y detectando nuevos elementos..." : "Creando Biblia Visual desde cero...");

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

            // Reemplazo de ai.callModel por window.Koreh.Text.generate con jsonMode activo
            let bibleRes = await window.Koreh.Text.generate(
                "Eres un analizador semántico de dirección de arte. Devuelve estrictamente un objeto JSON.", 
                biblePrompt, 
                { jsonMode: true }
            );
            
            if (typeof bibleRes === 'string') bibleRes = JSON.parse(window.Koreh.Text.cleanJSON(bibleRes));
            const newAssets = bibleRes.new_assets || [];
            
            console.log(`Nuevos activos detectados: ${newAssets.length}`);
            
            const finalVisualBible = [...existingAssets];
            
            newAssets.forEach(newItem => {
                const exists = finalVisualBible.find(old => old.name.toLowerCase() === newItem.name.toLowerCase());
                if (!exists) {
                    finalVisualBible.push(newItem);
                }
            });

            // Guardado persistente a través de mainCrono (antiguo main que actúa como namespace)
            if (window.mainCrono && typeof window.mainCrono.saveData === 'function') {
                // Sincronizar en caliente el array interno de la biblia visual en disco
                if (window.mainCrono.visualBibleHandle) {
                    const writable = await window.mainCrono.visualBibleHandle.createWritable();
                    await writable.write(JSON.stringify(finalVisualBible, null, 2));
                    await writable.close();
                }
                window.mainCrono.visualBibleData = finalVisualBible;
            }

            window.currentVisualBible = finalVisualBible.map(x => ({ name: x.name, visual_tags: getVisual(x) }));
            if (typeof SbUI !== 'undefined' && SbUI.renderBible) {
                SbUI.renderBible(window.currentVisualBible);
            }

            window.ui.toggleLoading(true, "FASE 2: ESTRUCTURA LITERARIA", "Escribiendo guion de narrador y separando acciones técnicas...");

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

            let skeletonRes = await window.Koreh.Text.generate(
                "Eres un estructurador cinematográfico. Devuelve estrictamente un objeto JSON.", 
                skeletonPrompt, 
                { jsonMode: true }
            );
            
            if (typeof skeletonRes === 'string') skeletonRes = JSON.parse(window.Koreh.Text.cleanJSON(skeletonRes));
            const sceneSkeleton = skeletonRes.scenes || [];

            window.ui.toggleLoading(true, "FASE 3: INGENIERÍA DE PROMPTS 8K", "Generando prompts basados en la acción técnica...");

            const substitutionMap = finalVisualBible.map(a => 
                `- IDENTIFICADOR: "${a.name}"  >>>  SUSTITUIR POR: "${getVisual(a)}"`
            ).join('\n');

            const promptEngineeringPrompt = `
            ACTÚA COMO: Un "Traductor Visual".
            
            TU FUENTE DE VERDAT:
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

            let promptsRes = await window.Koreh.Text.generate(
                "You are an expert prompt builder. Return strictly valid pure JSON format.", 
                promptEngineeringPrompt, 
                { jsonMode: true }
            );
            
            if (typeof promptsRes === 'string') promptsRes = JSON.parse(window.Koreh.Text.cleanJSON(promptsRes));
            const promptList = promptsRes.prompts || [];
            
            const finalEvents = [];
            
            sceneSkeleton.forEach((scene, index) => {
                const visual = promptList[index] || "Error generating visual prompt.";
                
                finalEvents.push({
                    id: 'evt-' + Date.now() + Math.floor(Math.random() * 10000),
                    time: parseFloat(scene.time || (index + 1)),
                    description: scene.title || "Escena Storyboard",
                    moments: [{ 
                        id: Date.now() + Math.floor(Math.random() * 10000) + index, 
                        text: scene.narrator_text || scene.visual_action || "Acción sin texto...",
                        visualPrompt: visual.trim(),
                        image64: null,
                        aspectRatio: 'landscape'
                    }]
                });
            });

            // Carga y guardado determinista en el gestor de la línea temporal
            if (window.mainCrono) {
                await window.mainCrono.loadEvents(finalEvents);
                await window.mainCrono.saveData();
            }

            window.ui.toggleLoading(false);
            window.ui.toggleStoryboardModal(); // Cierra ventana de entrada
            
            // Apertura explícita de la función del canvas para actualizar toda la renderización de la escaleta
            if (window.timeline && typeof window.timeline.renderAll === 'function') {
                window.timeline.renderAll();
                window.timeline.resetView();
            }
            
            alert(`Storyboard Generado con Narrativa Literaria.\n\nSe han guardado ${newAssets.length} nuevos activos visuales.`);

        } catch (e) {
            console.error(e);
            window.ui.toggleLoading(false);
            alert("Error Crítico en Storyboard Core: " + e.message);
        }
    }
};

window.Storyboard = Storyboard; 