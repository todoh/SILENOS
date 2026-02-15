// --- AI STUDIO: CEREBRO NARRATIVO AVANZADO (V2 - Strict Mode) ---

const PromptTemplates = {
    // Estilo Global (Se inyecta en todo)
    GLOBAL_STYLE: " FOTORREALISTA ",

    // Plantillas de Escenario (Fondos)
    BACKGROUND: {
        EXTERIOR: "wide angle establishing shot, [SETTING], horizon line visible, detailed sky, weather [WEATHER],  ",
        INTERIOR: "wide shot of a room, [SETTING], cross-section view, visible walls and floor, furniture, indoor lighting,  ",
        CLOSEUP: "extreme close up background, blurred [SETTING] details, abstract texture, focus on foreground, "
    },

    // Plantillas de Sprites (Personajes/Objetos)
    SPRITE: {
        CHARACTER: "full body character, [NAME], [DESC], standing pose, facing forward, isolated on pure vivid green background, hex color #00FF00, no shadows, crisp vector lines",
        OBJECT: "isolated object, [NAME], [DESC], simple prop, isolated on pure vivid green background, hex color #00FF00, no shadows",
        FACE: "headshot only, [NAME], [DESC], expressive face, [EMOTION], isolated on pure vivid green background, hex color #00FF00"
    }
};

window.AIStudio = {
    
    // TAREA 1: CLASIFICACIÓN
    async classifyScene(text) {
        const prompt = `
        ACTÚA COMO: Director de Cine.
        ANALIZA ESTA ESCENA: "${text}"
        DEFINE: 1. TIPO ("INTERIOR"/"EXTERIOR"/"CLOSEUP"). 2. AMBIENTE. 3. CLIMA/MOOD.
        JSON RESPUESTA: { "type": "...", "setting": "...", "mood": "..." }
        `;
        try {
            return await window.Koreh.Text.generate("JSON ONLY", prompt, { model: 'gemini-fast', jsonMode: true });
        } catch (e) { return { type: "EXTERIOR", setting: "Generic", mood: "Day" }; }
    },

    // TAREA 2: DESGLOSE (OPTIMIZADO PARA REDUCIR CANTIDAD)
    async breakdownAssets(text, existingDataNames) {
        const prompt = `
        ACTÚA COMO: Productor de Animación Tacaño (Budget Optimizer).
        GUION: "${text}"
        INVENTARIO DISPONIBLE: ${JSON.stringify(existingDataNames)}
        
        TAREA: Lista SOLO los elementos INDISPENSABLES para la acción.
        
        REGLAS ESTRICTAS (CRITICAL):
        1. FUSIONA OBJETOS: No separes ropa ni armas del personaje. 
           MAL: ["Ninja", "Espada", "Mascara"]. 
           BIEN: ["Ninja holding sword wearing mask"].
        2. IGNORA EL FONDO: Árboles, nubes, edificios van al BACKGROUND, NO son sprites.
        3. CANTIDAD: Para una escena simple (ej: "Ninja vs Samurai"), genera MÁXIMO 2-4 SPRITES.
        4. Si coincide con INVENTARIO, usa el nombre exacto en "ref_id".
        
        JSON RESPUESTA: 
        { "assets": [ { "name": "...", "category": "CHARACTER|OBJECT", "visual_action": "...", "size": "medium", "ref_id": "..." } ] }
        `;
        
        // Usamos 'openai-large' (GPT-4o/Turbo) porque entiende mejor las instrucciones negativas ("No hagas X")
        return await window.Koreh.Text.generate("JSON ONLY", prompt, { model: 'openai-large', jsonMode: true });
    },

    // TAREA 3: CONSTRUCCIÓN DE PROMPTS
    constructPrompts(classification, assetList, existingDataFull) {
        const masterPlan = { backgroundPrompt: "", sprites: [] };

        // Fondo
        let bgTemplate = PromptTemplates.BACKGROUND[classification.type] || PromptTemplates.BACKGROUND.EXTERIOR;
        masterPlan.backgroundPrompt = bgTemplate
            .replace("[SETTING]", classification.setting)
            .replace("[WEATHER]", classification.mood)
             + ", " + PromptTemplates.GLOBAL_STYLE;

        // Sprites
        // Filtro de seguridad: Si la IA alucina y manda más de 6, cortamos por lo sano
        const safeList = assetList.slice(0, 6); 

        masterPlan.sprites = safeList.map(item => {
            let finalVisualDesc = item.visual_action;
            if (item.ref_id) {
                const knownData = existingDataFull.find(d => d.name === item.ref_id);
                if (knownData && knownData.visualDesc) {
                    finalVisualDesc = `${knownData.visualDesc}, action: ${item.visual_action}`;
                }
            }

            let spriteTemplate = PromptTemplates.SPRITE[item.category] || PromptTemplates.SPRITE.OBJECT;
            const finalPrompt = spriteTemplate
                .replace("[NAME]", item.name)
                .replace("[DESC]", finalVisualDesc)
                .replace("[EMOTION]", classification.mood)
                 + ", " + PromptTemplates.GLOBAL_STYLE;

            return {
                name: item.name,
                prompt: finalPrompt,
                size: item.size,
                category: item.category
            };
        });

        return masterPlan;
    },

    // TAREA 4: LAYOUT (Espacial)
    async calculateLayout(canvasW, canvasH, spritesData, classification) {
        const prompt = `
        ACTÚA COMO: Director de Fotografía.
        CANVAS: ${canvasW}x${canvasH}. TIPO: ${classification.type}.
        ELEMENTOS: ${JSON.stringify(spritesData.map(s => ({ name: s.name, size: s.size })))}
        
        REGLAS:
        - Personajes principales enfrentados (izquierda vs derecha) si hay conflicto.
        - Suelo en Y=${canvasH * 0.75}.
        - Distribuye horizontalmente para llenar el encuadre.
        
        JSON: { "layout": [{ "name": "...", "x": 0, "y": 0, "scale_factor": 1.0 }] }
        `;

        try {
            const res = await window.Koreh.Text.generate("JSON ONLY", prompt, { model: 'gemini-fast', jsonMode: true });
            return res.layout;
        } catch (e) { return []; }
    }
};