// --- cronologia/escaleta/airforce.js ---
// PUENTE AIRFORCE "MODO METRALLETA" (ROTACIÓN DE KEYS AUTOMÁTICA)

const AirforceBridge = {
    baseUrl: "https://api.airforce/v1/images/generations",

    async generateVideo(prompt, width, height, apiKeyString, model = 'grok-imagine-video') {
        // 1. Parsing de Keys (Convertimos el string en array)
        if (!apiKeyString) throw new Error("Falta API Key.");
        
        // Separamos por comas y limpiamos espacios vacíos
        const keys = apiKeyString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        
        if (keys.length === 0) throw new Error("No hay API Keys válidas.");

        let lastError = null;

        // 2. BUCLE DE ROTACIÓN (Protocolo Metralleta)
        for (let i = 0; i < keys.length; i++) {
            const currentKey = keys[i];
            const attemptInfo = `[KEY ${i + 1}/${keys.length}]`;
            
            console.log(`✈️ ${attemptInfo} Iniciando generación...`);

            try {
                // Intentamos ejecutar con la key actual
                const resultBlob = await this.executeCall(currentKey, prompt, width, height, model);
                
                // Si llegamos aquí, fue un éxito. Retornamos inmediatamente.
                console.log(`✅ ${attemptInfo} ÉXITO.`);
                return resultBlob;

            } catch (error) {
                console.warn(`⚠️ ${attemptInfo} FALLÓ: ${error.message}`);
                lastError = error;

                // Si es la última key, ya no podemos hacer nada
                if (i === keys.length - 1) {
                    console.error("🔥 TODAS LAS KEYS HAN SIDO AGOTADAS/RECHAZADAS.");
                    throw new Error(`Airforce Exhausto: ${error.message}`);
                }

                // Si no es la última, esperamos 1 segundo y seguimos el bucle con la siguiente key
                console.log(`🔄 Rotando a la siguiente API Key...`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    },

    // Lógica interna de una sola llamada
    async executeCall(key, prompt, width, height, model) {
        const payload = {
            model: model, 
            prompt: prompt,
            size: `${width}x${height}`,
            n: 1,
            response_format: "url"
        };

        const response = await fetch(this.baseUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${key}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        // NOTA: Airforce a veces devuelve 200 OK pero con un JSON de error dentro.
        // Primero parseamos el JSON siempre.
        let data;
        try {
            data = await response.json();
        } catch (e) {
            // Si no es JSON, miramos el status
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
            throw new Error("Respuesta inválida (No JSON)");
        }

        // 3. ANÁLISIS DE ERRORES EXPLÍCITOS (Rate Limit / Credit)
        if (data.error) {
            const errMsg = data.error.message || JSON.stringify(data.error);
            // Lanzamos error para que el bucle lo capture y rote la key
            throw new Error(`API Error: ${errMsg}`); 
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        // 4. EXTRACCIÓN DE URL (Soporte multi-formato)
        let videoUrl = null;

        if (data.data && Array.isArray(data.data) && data.data.length > 0 && data.data[0].url) {
            videoUrl = data.data[0].url; // OpenAI Standard
        }
        else if (data.url) {
            videoUrl = data.url; // Flat format
        }
        else if (data.output && data.output.url) {
            videoUrl = data.output.url; // Replicate style
        }
        else if (data.video) {
            videoUrl = data.video; // Custom style
        }

        if (!videoUrl) {
            console.warn("JSON recibido sin URL:", data);
            throw new Error("La API respondió OK pero no devolvió ninguna URL de video.");
        }

        // 5. DESCARGA DEL BLOB
        // A veces la URL es válida pero da 404 momentáneo, aquí también podríamos reintentar, 
        // pero asumimos que si tenemos URL, la key funcionó.
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) throw new Error("No se pudo descargar el video generado (URL inaccesible).");

        return await videoResponse.blob();
    }
};