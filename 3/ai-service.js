// SILENOS 3/ai-service.js
// --- SERVICIO DE COMUNICACIÓN CON IA (PROMPTS Y API + LOCAL LLM) ---

// 1. Definimos el servicio y lo anclamos EXPLÍCITAMENTE a window para que las apps/iframes lo vean.
window.AIService = {
    apiKeys: [],
    currentKeyIndex: 0,
    
    // --- ESTADO LOCAL LLM (WebGPU) ---
    localEngine: null,
    useLocal: false,
    modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    isModelLoaded: false,

    init() {
        const savedKeys = localStorage.getItem('silenos_api_keys');
        if (savedKeys) {
            try {
                this.apiKeys = JSON.parse(savedKeys);
                console.log(`📡 AIService: ${this.apiKeys.length} llaves cargadas.`);
            } catch (e) {
                this.apiKeys = [];
            }
        }
    },

    setApiKeys(keysString) {
        if (!keysString) return;
        const newKeys = Array.isArray(keysString) 
            ? keysString 
            : keysString.split(',').map(k => k.trim()).filter(k => k);
        
        this.apiKeys = newKeys;
        localStorage.setItem('silenos_api_keys', JSON.stringify(this.apiKeys));
        console.log("✅ Memoria de API sincronizada:", this.apiKeys.length, "llaves.");
    },

    getApiKey() {
        if (this.apiKeys.length === 0) return null;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        return this.apiKeys[this.currentKeyIndex];
    },

    getAllKeys() {
        return this.apiKeys.length > 0 ? this.apiKeys : [];
    },

    hasKeys() {
        // Si usamos local, siempre "tenemos llaves" (el modelo)
        if (this.useLocal && this.isModelLoaded) return true;
        return this.apiKeys.length > 0;
    },

    // --- FUNCIONES LOCAL LLM ---

    async initLocalModel(progressCallback) {
        if (this.localEngine) {
            this.isModelLoaded = true;
            this.useLocal = true;
            return true;
        }
        
        try {
            console.log("🦙 Cargando WebLLM...");
            // Importación dinámica para compatibilidad
            const webllm = await import("https://esm.run/@mlc-ai/web-llm");
            
            this.localEngine = await webllm.CreateMLCEngine(
                this.modelId,
                { initProgressCallback: progressCallback }
            );
            
            this.isModelLoaded = true;
            this.useLocal = true;
            console.log("🦙 Llama 3.2 Cargado y Listo.");
            return true;
        } catch (e) {
            console.error("Error fatal cargando WebLLM:", e);
            throw e;
        }
    },

    async streamChat(messages, onChunk) {
        if (!this.localEngine) throw new Error("Modelo Local no cargado.");
        
        const completion = await this.localEngine.chat.completions.create({
            messages,
            stream: true,
            temperature: 0.7,
        });

        for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) onChunk(content);
        }
    },
    
    // Generación de planes (usado por AIWorker)
    async generatePlan(prompt, context, numChapters, model) {
        // Prompt del sistema para estructurar libros
        const systemPrompt = `Eres un arquitecto de novelas experto. 
        Tu tarea es crear un plan estructural (JSON) para un libro basado en la idea del usuario.
        
        FORMATO JSON REQUERIDO:
        {
            "title": "Título sugerido",
            "chapters": [
                { "title": "Nombre Cap 1", "summary": "Resumen detallado de qué pasa aquí..." },
                ... hasta ${numChapters} capítulos
            ]
        }
        
        Contexto adicional: ${context.substring(0, 2000)}`;

        // Pasamos el modelo recibido a callAI
        const responseText = await this.callAI(systemPrompt, prompt, model);
        return this.parseJSON(responseText);
    },

    // Escritura de capítulos (usado por AIWorker)
    async writeChapterContent(title, summary, context, prevContext, step, total, model) {
        const systemPrompt = `Eres un escritor fantasma de best-sellers.
        Estás escribiendo el capítulo ${step} de ${total}: "${title}".
        
        Resumen del capítulo: ${summary}
        
        Contexto Global (Datos): ${context.substring(0, 3000)}
        Contexto Inmediato (Anterior): ${prevContext}
        
        Escribe el contenido del capítulo en formato Markdown. Sé inmersivo, detallado y creativo.
        Usa párrafos claros. NO pongas el título del capítulo otra vez, solo el contenido.`;

        // Pasamos el modelo recibido a callAI
        return await this.callAI(systemPrompt, "Escribe el capítulo ahora.", model);
    },

    // --- NÚCLEO HÍBRIDO ---

    // Aceptamos 'model' como tercer argumento, con un default por si no se pasa
    async callAI(system, user, model = "gemma-3-27b-it") {
        // 1. RUTA LOCAL (Si está activa)
        if (this.useLocal && this.isModelLoaded && this.localEngine) {
            try {
                const messages = [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ];
                // Respuesta completa (no streaming) para compatibilidad con el sistema
                const reply = await this.localEngine.chat.completions.create({
                    messages,
                    stream: false, // Bloqueante para el sistema
                    temperature: 0.7
                });
                return reply.choices[0].message.content;
            } catch (e) {
                console.error("Error en Inferencia Local:", e);
                // Fallback a API si falla local
                console.log("⚠️ Fallo local, intentando API...");
            }
        }

        // 2. RUTA NUBE (Gemini API)
        const key = this.getApiKey();
        if (!key) throw new Error("No hay API Keys configuradas ni modelo local activo.");

        // Usamos la variable 'model' en la URL en lugar de tenerla fija
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: system + "\n\n" + user }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(`API Error ${res.status} (${model}): ${errData.error?.message || res.statusText}`);
        }
        
        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    },

    parseJSON(str) {
        try {
            str = str.replace(/```json/g, '').replace(/```/g, '');
            const first = str.indexOf('{');
            const last = str.lastIndexOf('}');
            if (first !== -1 && last !== -1) str = str.substring(first, last + 1);
            return JSON.parse(str);
        } catch (e) { return null; }
    }
};

// Inicialización
window.AIService.init();