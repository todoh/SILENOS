// --- cronologia/storyboard.core.js ---
// MOTOR DE STORYBOARD Y CONSISTENCIA VISUAL (V3.6 - FIX COMPATIBILIDAD Y TRADUCCIÓN)

const Storyboard = {
    
    // FASE MAESTRA: ANÁLISIS PROFUNDO Y GENERACIÓN
    async analyzeAndGenerate(storyText) {
        if (!ai.apiKey) return alert("Conecta la IA primero.");
        if (!storyText) return alert("Escribe una historia primero.");

        // Limpieza y preparación
        const cleanStory = storyText.substring(0, 20000); 
        const inventoryList = ai.inventory || [];
        
        // RECUPERAMOS LA MEMORIA VISUAL EXISTENTE (Si la hay)
        const existingAssets = main.visualBibleData || [];
        const hasMemory = existingAssets.length > 0;

        // --- HELPER CRÍTICO DE COMPATIBILIDAD ---
        // Busca visual_signature (nuevo) O visualDesc (archivos viejos como Arandela)
        const getVisual = (asset) => {
            if (asset.visual_signature) return asset.visual_signature;
            if (asset.visualDesc) return asset.visualDesc;
            return "Descripción visual no disponible.";
        };

        try {
            // =================================================================================
            // FASE 1: DEFINICIÓN DE ACTIVOS (INCREMENTAL)
            // =================================================================================
            ui.toggleLoading(true, "FASE 1: CONTINUIDAD VISUAL", hasMemory ? "Consultando VISUAL_BIBLE.json y detectando nuevos elementos..." : "Creando Biblia Visual desde cero...");

            // Convertimos la memoria existente en un string para la IA
            // USAMOS getVisual() AQUÍ PARA QUE LA IA ENTIENDA TUS ARCHIVOS ANTIGUOS
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
            2. Si aparecen personajes/lugares que YA ESTÁN en la "MEMORIA VISUAL EXISTENTE", NO LOS REDEFINAS. Ignóralos en la salida (usaremos la definición vieja).
            3. SOLO genera fichas para los NUEVOS elementos visuales que no existan en la memoria.
            
            PARA LOS NUEVOS ELEMENTOS:
            Define la APARIENCIA EXACTA E INMUTABLE.
            NO USES RESÚMENES. USA ADJETIVOS VISUALES CONCRETOS EN INGLÉS O ESPAÑOL (Preferiblemente términos visuales).
            
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
                        "visual_signature": "DESCRIPCIÓN MASIVA TIPO PROMPT. Ejemplo: (tall man, sharp jawline, scar on left cheek...)"
                    }
                ]
            }`;

            const bibleRes = await ai.callModel(biblePrompt, "Genera solo los NUEVOS activos visuales.", 0.2, 'openai-large');
            const newAssets = JSON.parse(ai.cleanJSON(bibleRes)).new_assets || [];
            
            console.log(`Nuevos activos detectados: ${newAssets.length}`);
            
            // --- FUSIÓN DE MEMORIA (MERGE) ---
            const finalVisualBible = [...existingAssets];
            
            newAssets.forEach(newItem => {
                // Verificar si ya existe (normalizamos a minúsculas para comparar)
                const exists = finalVisualBible.find(old => old.name.toLowerCase() === newItem.name.toLowerCase());
                if (!exists) {
                    finalVisualBible.push(newItem);
                }
            });

            // GUARDAR LA NUEVA BIBLIA COMPLETADA EN EL ARCHIVO JSON
            await main.saveVisualBible(finalVisualBible);

            // Actualizar UI - USANDO getVisual TAMBIÉN AQUÍ
            window.currentVisualBible = finalVisualBible.map(x => ({ name: x.name, visual_tags: getVisual(x) }));
            SbUI.renderBible(window.currentVisualBible);

            // =================================================================================
            // FASE 2: ESCALETA NARRATIVA
            // =================================================================================
            ui.toggleLoading(true, "FASE 2: ESTRUCTURA DE ESCENAS", "Desglosando la narrativa en momentos clave...");

            const skeletonPrompt = `
            ACTÚA COMO: Editor de Cine.
            
            HISTORIA:
            "${cleanStory}"
            
            TAREA:
            Divide la historia en una secuencia lógica de ESCENAS.
            Identifica QUÉ ACTIVOS (de la lista total) aparecen.
            
            LISTA TOTAL DE ACTIVOS DISPONIBLES:
            ${finalVisualBible.map(a => a.name).join(', ')}
            
            SALIDA JSON:
            {
                "scenes": [
                    { 
                        "time": 1.0, 
                        "title": "Título corto", 
                        "action_text": "Descripción narrativa...",
                        "assets_present": ["NombreExacto1", "NombreExacto2"] 
                    }
                ]
            }`;

            const skeletonRes = await ai.callModel(skeletonPrompt, "Genera la estructura de escenas.", 0.3, 'openai-large');
            const sceneSkeleton = JSON.parse(ai.cleanJSON(skeletonRes)).scenes;

            // =================================================================================
            // FASE 3: FUSIÓN GENERATIVA (TRADUCCIÓN VISUAL ESTRICTA)
            // =================================================================================
            ui.toggleLoading(true, "FASE 3: INGENIERÍA DE PROMPTS 8K", "Sustituyendo nombres por descripciones físicas...");

            // 1. CREAMOS EL MAPA DE SUSTITUCIÓN (USANDO getVisual PARA NO FALLAR)
            const substitutionMap = finalVisualBible.map(a => 
                `- IDENTIFICADOR: "${a.name}"  >>>  SUSTITUIR POR: "${getVisual(a)}"`
            ).join('\n');

            const promptEngineeringPrompt = `
            ACTÚA COMO: Un "Traductor Visual" para Motores de Renderizado (Stable Diffusion / Midjourney).
            
            OBJETIVO:
            Convertir escenas narrativas en PROMPTS DE IMAGEN PUROS.
            
            PROBLEMA CRÍTICO A EVITAR:
            El motor de render NO SABE quiénes son los personajes por su nombre.
            Si el prompt dice "Juan está corriendo", la imagen saldrá MAL porque la IA no sabe cómo es Juan.
            
            TU MISIÓN (SUSTITUCIÓN OBLIGATORIA):
            Debes reescribir cada escena ELIMINANDO LOS NOMBRES PROPIOS y reemplazándolos por su DESCRIPCIÓN FÍSICA del mapa de abajo.
            
            MAPA DE SUSTITUCIÓN (VISUAL BIBLE):
            ${substitutionMap}
            
            ESCENAS A TRADUCIR:
            ${JSON.stringify(sceneSkeleton)}
            
            REGLAS DE SALIDA (INGLÉS):
            1. JAMÁS incluyas el nombre del personaje en el prompt final (Ej: No escribas "Juan", escribe "A tall man with a scar...").
            2. Describe la acción + el entorno + la iluminación.
            3. Añade al final: "cinematic lighting, 8k, highly detailed, masterpiece".
            
            SALIDA JSON:
            {
                "prompts": [
                    "Prompt visual escena 1 (Sin nombres, solo descripciones)...",
                    "Prompt visual escena 2 (Sin nombres, solo descripciones)..."
                ]
            }`;

            const promptsRes = await ai.callModel(promptEngineeringPrompt, "Genera los Prompts Maestros.", 0.2, 'openai-large');
            const promptList = JSON.parse(ai.cleanJSON(promptsRes)).prompts;

            // =================================================================================
            // FASE 4: ENSAMBLAJE FINAL
            // =================================================================================
            
            const finalEvents = [];
            
            sceneSkeleton.forEach((scene, index) => {
                const visual = promptList[index] || "Error generating visual prompt.";
                
                finalEvents.push({
                    id: 'evt-' + Date.now() + Math.random(),
                    time: scene.time,
                    description: scene.title,
                    moments: [{ id: Date.now() + Math.random(), text: scene.action_text }],
                    image64: null,
                    visualPrompt: visual,
                    aspectRatio: 'landscape'
                });
            });

            main.loadEvents(finalEvents);
            main.saveData();

            ui.toggleLoading(false);
            ui.togglePremiseModal();
            alert(`Storyboard Generado y Biblia Visual Actualizada.\n\nSe han guardado ${newAssets.length} nuevos activos en VISUAL_BIBLE.json.`);

        } catch (e) {
            console.error(e);
            ui.toggleLoading(false);
            alert("Error Crítico en Storyboard Core: " + e.message);
        }
    }
};