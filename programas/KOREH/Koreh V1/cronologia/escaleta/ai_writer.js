// --- cronologia/escaleta/ai_writer.js ---
// GUIONISTA TÉCNICO & DIRECTOR DE ARTE (V3.8 - LITERAL SUBSTITUTION PROTOCOL)

const AiWriter = {

    async generateStructure(manualContext = null) {
        if (!ai.apiKey) return alert("Conecta la API Key primero (Botón 'Conectar IA').");
        if (!EscaletaCore.rootHandle) return alert("Carga un proyecto primero.");
    
        // 1. Obtener Narrativa
        let storyContext = "";
        let sourceMode = "";
    
        if (manualContext && manualContext.trim().length > 0) {
            storyContext = manualContext;
            sourceMode = "MANUAL";
        } else {
            try {
                const handle = await EscaletaCore.rootHandle.getFileHandle('TIMELINE_DATA.json');
                const file = await handle.getFile();
                const json = JSON.parse(await file.text());
                if (json.events && json.events.length > 0) {
                    storyContext = json.events.map(e => `[${e.description}]: ${(e.moments||[]).map(m=>m.text).join(" ")}`).join("\n\n");
                }
                sourceMode = "JSON";
            } catch (e) { console.warn(e); }
        }
    
        if (!storyContext) return alert("No hay historia para procesar.");
        if (sourceMode === "MANUAL") EscaletaUI.toggleScriptModal();
    
        // --- INICIO DEL PIPELINE ---
        
        try {
            // =================================================================================
            // FASE 1: DESGLOSE DE ENTIDADES (IDENTIFICACIÓN)
            // =================================================================================
            EscaletaUI.toggleLoading(true, "FASE 1/3: ANÁLISIS FORENSE", "Identificando todos los elementos visuales...");
            
            // Recorte de seguridad
            const safeContextVFX = storyContext.length > 15000 ? storyContext.substring(0, 15000) + "...(truncado)" : storyContext;

            const extractPrompt = `
            ACTÚA COMO: Supervisor de VFX.
            
            TEXTO: "${safeContextVFX}"
            
            TAREA: Lista CADA personaje, lugar y objeto importante mencionado.
            
            SALIDA JSON: { "entities": ["Nombre1", "LugarA", "ObjetoX"] }
            `;
            
            const extractRes = await ai.callModel(extractPrompt, "Extrae las entidades visuales.", 0.1, 'openai-large');
            const entities = JSON.parse(ai.cleanJSON(extractRes)).entities || [];
            
            console.log("Entidades detectadas:", entities);

            // =================================================================================
            // FASE 2: DEFINICIÓN HIPER-DETALLADA (SI FALTA EN BIBLIA)
            // =================================================================================
            const newAssetsToDefine = [];
            
            // Filtrar qué nos falta
            for (const entity of entities) {
                const existingDesc = CoherenceEngine.getDetailedPromptFor(entity);
                if (!existingDesc) {
                    newAssetsToDefine.push(entity);
                }
            }

            if (newAssetsToDefine.length > 0) {
                EscaletaUI.toggleLoading(true, "FASE 2/3: DEPARTAMENTO DE ARTE", `Definiendo ${newAssetsToDefine.length} nuevos activos...`);
                
                const safeContextArt = storyContext.length > 5000 ? storyContext.substring(0, 5000) : storyContext;

                const definitionPrompt = `
                ACTÚA COMO: Director de Arte de Cine.
                
                CONTEXTO: "${safeContextArt}"
                ENTIDADES: ${newAssetsToDefine.join(', ')}
                
                TAREA: Genera descripción visual "TEXT-TO-VIDEO OPTIMIZED".
                
                REGLAS:
                1. NO USES NOMBRES en la descripción (No digas "Ana es...", di "Una mujer alta con...").
                2. SE OBSESIVO con los detalles físicos.
                
                SALIDA JSON: { "assets": [{ "name": "Nombre", "visual_signature": "descripción..." }] }`;

                const defRes = await ai.callModel(definitionPrompt, "Diseña los activos visuales.", 0.6, 'openai-fast');
                const newAssets = JSON.parse(ai.cleanJSON(defRes)).assets || [];
                
                await CoherenceEngine.appendToBible(newAssets);
            }

            // =================================================================================
            // FASE 3: GENERACIÓN DE TOMAS (FUSIÓN MECÁNICA / LITERAL)
            // =================================================================================
            EscaletaUI.toggleLoading(true, "FASE 3/3: RODAJE VIRTUAL", "Incrustando descripciones literales...");

            // Construimos un DICCIONARIO DE REEMPLAZO EXPLÍCITO
            const replacementRules = entities.map(e => {
                const desc = CoherenceEngine.getDetailedPromptFor(e) || "Generic visual.";
                // Limpiamos la descripción de saltos de línea para que no rompa el prompt
                const cleanDesc = desc.replace(/(\r\n|\n|\r)/gm, " ");
                return `SI APARECE: "${e}" O SU ROL -> SUSTITUIR POR: "${cleanDesc}"`;
            }).join("\n");

            const SAFE_LIMIT = 25000;
            const finalStoryContext = storyContext.length > SAFE_LIMIT 
                ? storyContext.substring(0, SAFE_LIMIT) + "..." 
                : storyContext;

            const scriptPrompt = `
            ACTÚA COMO: Un compilador de Prompts para Video (Grok/Sora).
            
            TABLA DE SUSTITUCIÓN VISUAL (OBLIGATORIA):
            ${replacementRules}
            
            HISTORIA:
            "${finalStoryContext}"
            
            === INSTRUCCIONES DE FUSIÓN VISUAL (MODO ESTRICTO) ===

            TU TAREA: Reescribir la historia escena por escena para la cámara.

            REGLA #1: ELIMINACIÓN DE NOMBRES Y ROLES
            En el campo 'visual_prompt', ESTÁ PROHIBIDO escribir nombres propios (Ej: "Imhotep") o roles genéricos (Ej: "El joven obrero", "El protagonista").
            
            REGLA #2: INYECCIÓN LITERAL
            Cada vez que un personaje actúe, DEBES COPIAR Y PEGAR su descripción de la TABLA DE SUSTITUCIÓN.
            
            Ejemplo Malo: "The young laborer's back is visible." (Grok no sabe cómo es ese obrero).
            Ejemplo Bueno: "Close up of [PEGAR DESCRIPCIÓN DEL OBRERO AQUÍ: muscular young man with copper skin...]'s bare back..."

            REGLA #3: CONTEXTO AMBIENTAL PERSISTENTE
            Todas las tomas deben incluir el entorno (iluminación, fondo). No dejes elementos flotando en la nada.

            ---

            FORMATO JSON DE SALIDA:
            {
                "takes": [
                    {
                        "visual_prompt": "Descripción visual FINAL en INGLÉS (Sin nombres, con descripciones físicas completas pegadas)...",
                        "narration_text": "Narración en ESPAÑOL (Aquí SÍ usa los nombres propios para que se entienda la historia). Una o dos frases bien formadas. Si la toma es conceptual o artistica.. no descriabas el suceso en si si no un texto que acompañe a la escena, por ejmplo: La toma es una cascaada que conecta un momento con otro.. pues no dices cae agua por la cascada .. sino que puedes poner un comentario relaccionando el video con el contenido narrativo de la historia. El narrador tiene que sonar natural"
                    }
                ]
            }`;

            const scriptRes = await ai.callModel(scriptPrompt, "Genera la escaleta con sustitución literal.", 0.5, 'openai-large');
            const json = JSON.parse(ai.cleanJSON(scriptRes));

            if (!json.takes) throw new Error("JSON inválido.");

            // Convertir a formato interno
            const newTakes = json.takes.map((t, idx) => ({
                id: `take-${Date.now()}-${idx}`,
                sequence_order: idx + 1,
                visual_prompt: t.visual_prompt, 
                narration_text: t.narration_text,
                duration: 5.0,
                video_file: null,
                audio_file: null
            }));

            EscaletaCore.data.takes = newTakes;
            EscaletaCore.saveToDisk();
            EscaletaUI.renderTakes(newTakes);
            EscaletaUI.updateStats();

            EscaletaUI.toggleLoading(false);
            alert(`Proceso completado.\n- Entidades Analizadas: ${entities.length}\n- Tomas Generadas: ${newTakes.length}`);

        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            if (e.message.includes("401")) {
                alert("Error 401: Sesión caducada o texto demasiado largo. Intenta reconectar la IA.");
            } else {
                alert("Error en el proceso: " + e.message);
            }
        }
    }
};