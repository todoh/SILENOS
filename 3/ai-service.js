// SILENOS 3/ai-service.js
// --- SERVICIO DE COMUNICACIÓN CON IA (PROMPTS Y API) ---

const AIService = {
    apiKeys: [],
    currentKeyIndex: 0,

    init() {
        // Cargar keys guardadas
        const savedKeys = localStorage.getItem('silenos_api_keys');
        if (savedKeys) this.apiKeys = JSON.parse(savedKeys);
    },

    setApiKeys(keysString) {
        this.apiKeys = keysString.split(',').map(k => k.trim()).filter(k => k);
        localStorage.setItem('silenos_api_keys', JSON.stringify(this.apiKeys));
    },

    getApiKey() {
        if (this.apiKeys.length === 0) return null;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        return this.apiKeys[this.currentKeyIndex];
    },

    hasKeys() {
        return this.apiKeys.length > 0;
    },

    // --- MÉTODOS DE GENERACIÓN (PROMPTS) ---

    async generatePlan(prompt, context, targetChapters) {
        const systemPrompt = `Eres un Arquitecto Narrativo.
        Tu objetivo: Crear un esquema de una novela/guion basado en el INPUT y el CONTEXTO.
        IMPORTANTE: Debes estructurar la historia en EXACTAMENTE ${targetChapters} CAPÍTULOS.
        
        Output JSON (Estricto, sin markdown): 
        { 
            "title": "Título de la Obra", 
            "chapters": [ 
                { "title": "Capítulo 1: [Nombre]", "summary": "Resumen detallado de lo que ocurre..." }, 
                ... 
            ] 
        }`;
        
        const userPrompt = `INPUT USUARIO: ${prompt}\n\nCONTEXTO ADICIONAL:\n${context.substring(0, 10000)}`;

        const raw = await this.callAI(systemPrompt, userPrompt);
        return this.parseJSON(raw);
    },

    async writeChapterContent(chapterTitle, chapterSummary, globalContext, prevContext, step, total) {
        const systemPrompt = `Eres un Escritor Experto. Estás escribiendo el CAPÍTULO ${step} de ${total}.
        
        TÍTULO DEL CAPÍTULO: ${chapterTitle}
        RESUMEN DE LA TRAMA: ${chapterSummary}
        
        CONTEXTO GLOBAL: ${globalContext.substring(0, 5000)}
        ${prevContext ? `LO QUE OCURRIÓ JUSTO ANTES: ...${prevContext}` : ''}
        
        INSTRUCCIONES:
        1. Escribe directamente el contenido narrativo (prosa).
        2. No uses introducciones tipo "Aquí está el capítulo" ni markdown de código.
        3. Estilo: Inmersivo, detallado y coherente.`;

        return await this.callAI(systemPrompt, "Escribe el contenido del capítulo ahora.");
    },

    // --- FUNCIÓN BASE ---

    async callAI(system, user) {
        const key = this.getApiKey();
        if (!key) throw new Error("No hay API Keys configuradas en Ajustes.");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${key}`;
        
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
            throw new Error(`API Error ${res.status}: ${errData.error?.message || res.statusText}`);
        }
        
        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    },

    parseJSON(str) {
        try {
            // Limpieza básica por si la IA devuelve bloques de código markdown
            str = str.replace(/```json/g, '').replace(/```/g, '');
            const first = str.indexOf('{');
            const last = str.lastIndexOf('}');
            if (first !== -1 && last !== -1) {
                str = str.substring(first, last + 1);
            }
            return JSON.parse(str);
        } catch (e) { 
            console.error("Error parseando JSON de IA:", str);
            return null; 
        }
    }
};

AIService.init();