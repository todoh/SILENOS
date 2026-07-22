/**
 * CRONO AI PROMPT - Módulo de Reescritura de Prompts en 3 Pasos
 * Espacio de nombres: window.CronoAIPrompt
 * Versión: 3.8 - Economía de Entidades y Restricción de Máximo Detalle Asimétrico
 */
window.CronoAIPrompt = {
    async rewrite(eventId, momentId) {
        const ev = window.mainCrono.data.events.find(e => e.id === eventId);
        const m = ev.moments.find(x => x.id === momentId);
        if (!m || !m.text) return alert("La subparte no tiene texto descriptivo.");
        const safeId = String(m.id).replace('.', '-');
        const btn = document.getElementById(`btn-rewrite-${safeId}`);
        const originalHtml = btn ? btn.innerHTML : '';
        
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i>';
            btn.disabled = true;
        }
        try {
            // --- PASO 1: DETECCIÓN DE DATOS Y TRADUCCIÓN DE CONTEXTO ---
            const inventoryNames = window.app.items.map(i => i.data.name);
            const step1System = "Eres un analista de coherencia y traductor técnico. Identifica qué elementos de la lista aparecen en el texto. Devuelve un JSON con la clave 'detectados' conteniendo un array de nombres.";
            const step1User = `LISTA DE REFERENCIAS: ${JSON.stringify(inventoryNames)}\nTEXTO DE LA ESCENA EN ESPAÑOL: "${m.text}"`;
            
            let detectedData = await window.Koreh.Text.generate(step1System, step1User, { jsonMode: true });
            if (typeof detectedData === 'string') detectedData = JSON.parse(window.Koreh.Text.cleanJSON(detectedData));
            
            const foundNames = detectedData.detectados || [];
            
            // Recopilamos las definiciones técnicas de la base de datos
            const visualContext = window.app.items
                .filter(i => foundNames.includes(i.data.name))
                .map(i => `[ENTITY: ${i.data.name}] Physical Description: ${i.data.visualDesc}`)
                .join("\n");

            // --- PASO 2: ENSAMBLADO TÉCNICO EN INGLÉS (REEMPLAZO DE NOMBRES) ---
            const step2System = "You are a Technical Art Director specialized in Stable Diffusion tokens. Your goal is to translate the scene action to English and describe the scene by REPLACING character names with their DETAILED physical descriptions. Everything must be in English using tag/token syntax (comma-separated descriptive concepts).";
            const step2User = `SCENE ACTION (Spanish): "${m.text}"\nVISUAL LORE / DESCRIPTIONS (English):\n${visualContext || 'Generic appearance'}\n\nTask: Rewrite the action in English as a highly detailed local SDXL prompt. Replace all names with their precise physical attributes. Prioritize core subjects first, then environmental details, lighting, and textures. Use clean comma-separated style.`;
            const draftPrompt = await window.Koreh.Text.generate(step2System, text2User = step2User, { jsonMode: false });

            // --- PASO 3: REFINADO FINAL Y ENFOCADO A MODELO LOCAL (JUGGERNAUT XL) ---
            const step3System = "You are a Prompt Engineer specialized in Juggernaut XL and local SDXL models. You must output ONLY the final token-based prompt string in English. Strictly NO Spanish, NO introductions, NO explanations.";
            const step3User = `
                DRAFT PROMPT: "${draftPrompt}"
                
                STRICT REWRITE RULES FOR JUGGERNAUT XL / LOCAL ENGINES:
                1. STRUCTURE: Arrange keywords from most important to least important (Subject, Action, Background Environment, Materials/Textures, Cinematic Lighting, Camera/Lens setup).
                2. NO PROSE: Avoid long conversational sentences. Use descriptive, heavy tags and tokens separated by commas (e.g., instead of "a man sitting near a window with sunlight hitting his face", use "1man, sitting, near window, sharp volumetric sunlight, dramatic rim lighting, intricate details").
                3. ANONYMITY: Ensure NO proper names remain. Use explicit physical visual descriptions.
                4. MODEL TRIGGERS: Emphasize micro-textures, photorealism triggers, and materials explicitly.
                 5. NO CHAT: Output only the prompt string.
                6. SUFFIX: Append exactly this sequence at the very end: "photorrealist style, juggernautxl style , masterpiece, 8k, highly detailed, sharp focus, cinematic lighting, intricate textures".
                
                OUTPUT FORMAT: Pure string, no quotes, no conversational text.
            `;
            let finalPrompt = await window.Koreh.Text.generate(step3System, step3User, { jsonMode: false });
            
            // Limpieza manual de residuos de conversación
            finalPrompt = finalPrompt.replace(/^(Okay|Sure|Here|Optimized|Prompt|Result|Output).*?:\s*/i, '');
            finalPrompt = finalPrompt.replace(/^["']|["']$/g, '');
            
            m.visualPrompt = finalPrompt.trim();
            window.mainCrono.saveData();
            window.mainCrono.showInspector(ev);

        } catch (e) {
            console.error(e);
            alert("Error en el flujo de reescritura: " + e.message);
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }
        }
    }
};