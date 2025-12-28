 
window.KorehIA = {
    Z: {
        async call(userPrompt, systemPrompt = "", config = {}) {
            const settings = {
                model: config.model || "gemma-3-27b-it",
                maxRetries: config.maxRetries || 10,
                temperature: config.temperature ?? 0.7
            };

            let keyList = [];
            if (typeof AIService !== 'undefined') {
                // [CORRECCIÓN] Obtenemos todas las llaves, no solo una
                keyList = AIService.getAllKeys();
            }

            // Validación de existencia en el SET (O)
            if (keyList.length === 0) {
                throw new Error("Koreh: No hay API Keys disponibles. Ejecuta el Configurador de API.");
            }

            const delay = ms => new Promise(res => setTimeout(res, ms));
            let lastError = null;

            for (let attempt = 0; attempt < settings.maxRetries; attempt++) {
                const currentKey = keyList[attempt % keyList.length];
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${currentKey}`;

                const payload = {
                    contents: [{
                        role: "user",
                        parts: [{ 
                            text: (systemPrompt ? `=== SYSTEM ===\n${systemPrompt}\n\n` : "") + `=== INPUT ===\n${userPrompt}` 
                        }]
                    }],
                    generationConfig: { temperature: settings.temperature }
                };

                try {
                    const res = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(`API Error (${res.status}): ${errData.error?.message || res.statusText}`);
                    }
                    
                    const data = await res.json();
                    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        throw new Error("Respuesta vacía de la IA.");
                    }

                    return data.candidates[0].content.parts[0].text;

                } catch (error) {
                    lastError = error;
                    console.warn(`Koreh: Intento ${attempt + 1} fallido. Rotando llave...`);
                    if (attempt < settings.maxRetries - 1) await delay(500 + (attempt * 200)); 
                }
            }

            throw new Error(`Koreh: Fallo total tras ${settings.maxRetries} disparos. ${lastError.message}`);
        },

        async getList(data, quantity, instructions) {
            const prompt = `DATOS: ${data}\nINSTR: ${instructions}\nGenera un JSON array de strings con EXACTAMENTE ${quantity} elementos.`;
            const raw = await this.call(prompt, "Responde solo en JSON estricto: [\"a\", \"b\"]");
            try {
                const first = raw.indexOf('[');
                const last = raw.lastIndexOf(']');
                return JSON.parse(raw.substring(first, last + 1));
            } catch (e) { return []; }
        }
      ,

        // G -> Granularidad: Extrae una lista JSON de un texto
        async getList(data, quantity, instructions) {
            const prompt = `DATOS: ${data}\nINSTR: ${instructions}\nGenera un JSON array de strings con EXACTAMENTE ${quantity} elementos. Ejemplo: ["punto1", "punto2"]`;
            const raw = await this.call(prompt, "Solo respondes en JSON estricto.");
            
            // Limpieza mejorada de JSON
            try {
                const firstBrace = raw.indexOf('[');
                const lastBrace = raw.lastIndexOf(']');
                let clean = raw;
                if (firstBrace !== -1 && lastBrace !== -1) {
                    clean = raw.substring(firstBrace, lastBrace + 1);
                }
                clean = clean.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(clean);
            } catch (e) {
                console.error("Koreh: Error parseando lista:", e);
                return [];
            }
        },

        // I -> Identidad: Genera un título corto para un contenido
        async getTitle(text) {
            const prompt = `Genera un título muy corto (max 4 palabras) y descriptivo. Sin puntuación: ${text.substring(0, 500)}`;
            let title = await this.call(prompt, "Eres un experto en síntesis.");
            return title.replace(/[\\/\?\%\*\:\|\"\<\>\.]/g, "").trim();
        }
    },

    // ==========================================
    // SECCIÓN H: COHERENCIA (Escritura en Disco)
    // ==========================================
    H: {
        saveNarrative(title, tag, content) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'narrative');

            if (!item) {
                item = FileSystem.createNarrative(title, 'desktop');
            }

            item.content = { 
                tag: tag.toUpperCase(), 
                text: content.trim() 
            };

            FileSystem.save();
            
            // Actualización visual en tiempo real
            if (typeof NarrativeManager !== 'undefined' && typeof openWindows !== 'undefined') {
                const wins = openWindows.filter(w => w.id === item.id || w.fileId === item.id);
                wins.forEach(win => NarrativeManager.renderInWindow(win.id, item.id));
            }
            if (typeof refreshSystemViews === 'function') refreshSystemViews();
            
            return item.id;
        }
    }
};

console.log("Koreh-IA V8.1: Modo Metralleta activo en Sección Z.");