// SILENOS 3/ai-service.js
// --- SERVICIO DE COMUNICACIÓN CON IA (PROMPTS Y API) ---

const AIService = {
    apiKeys: [],
    currentKeyIndex: 0,

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
        // Si recibimos un array directamente, lo usamos; si no, lo procesamos como string
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

    // [NUEVO] Permite a Koreh acceder al SET completo para la rotación masiva
    getAllKeys() {
        return this.apiKeys.length > 0 ? this.apiKeys : [];
    },

    hasKeys() {
        return this.apiKeys.length > 0;
    },

    async callAI(system, user) {
        const key = this.getApiKey();
        if (!key) throw new Error("No hay API Keys configuradas.");

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
            str = str.replace(/```json/g, '').replace(/```/g, '');
            const first = str.indexOf('{');
            const last = str.lastIndexOf('}');
            if (first !== -1 && last !== -1) str = str.substring(first, last + 1);
            return JSON.parse(str);
        } catch (e) { return null; }
    }
};

AIService.init();