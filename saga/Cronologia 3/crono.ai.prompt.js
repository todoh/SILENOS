/**
 * CRONO AI PROMPT - Módulo de Reescritura de Prompts en 3 Pasos
 * Espacio de nombres: window.CronoAIPrompt
 * Versión: 3.0 - Traducción Obligatoria a Inglés y Sustitución Detallada
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
            
            // Recopilamos las definiciones técnicas de la base de datos (ya suelen estar en inglés o se fuerzan aquí)
            const visualContext = window.app.items
                .filter(i => foundNames.includes(i.data.name))
                .map(i => `[ENTITY: ${i.data.name}] Physical Description: ${i.data.visualDesc}`)
                .join("\n");

            // --- PASO 2: ENSAMBLADO TÉCNICO EN INGLÉS (REEMPLAZO DE NOMBRES) ---
            const step2System = "You are a Technical Art Director. Your goal is to translate the scene action to English and describe the scene by REPLACING character names with their DETAILED physical descriptions provided in the LORE. Everything must be in English.";
            const step2User = `SCENE ACTION (Spanish): "${m.text}"\nVISUAL LORE / DESCRIPTIONS (English):\n${visualContext || 'Generic appearance'}\n\nTask: Rewrite the action in English as a visual prompt. Replace all names with their physical attributes. Include materials, lighting, and textures.`;

            const draftPrompt = await window.Koreh.Text.generate(step2System, step2User, { jsonMode: false });

            // --- PASO 3: REFINADO FINAL Y LIMPIEZA DE IDIOMA ---
            const step3System = "You are a Prompt Professional. You must output ONLY the final prompt in English. Strictly NO Spanish, NO introductions, NO explanations.";
            const step3User = `
                DRAFT PROMPT: "${draftPrompt}"
                
                STRICT RULES:
                1. LANGUAGE: All content must be in ENGLISH.
                2. NO NAMES: Ensure NO proper names remain. Use the physical descriptions instead.
                3. TECHNICAL: Describe materials, cinematic lighting, and textures.
                4. NO CHAT: Output only the prompt string.
                5. SUFFIX: Add "masterpiece, 8k, highly detailed, cinematic" at the very end.
                
                OUTPUT FORMAT: Pure string, no quotes.
            `;

            let finalPrompt = await window.Koreh.Text.generate(step3System, step3User, { jsonMode: false });
            
            // Limpieza manual de residuos de conversación
            finalPrompt = finalPrompt.replace(/^(Okay|Sure|Here|Optimized|Prompt|Result).*?:\s*/i, '');
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