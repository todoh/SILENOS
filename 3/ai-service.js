// SILENOS 3/ai-service.js
// --- SERVICIO CENTRAL DE INTELIGENCIA (POLLINATIONS AI CORE) ---

window.AIService = {
    // --- ESTADO Y CONFIGURACIÓN ---
    state: {
        apiKey: null,
        isAuthenticated: false,
        config: {
            // Modelos de Texto
            textModelFast: 'openai',     // Rápido y eficiente (GPT-4o-mini eq)
            textModelSlow: 'qwen-coder', // Lento y profundo (Razonamiento/Código)
            
            // Modelos de Imagen
            imageModelFast: 'flux',      // Generación estándar rápida
            imageModelSlow: 'turbo'      // Alta fidelidad (o midjourney si disponible)
        }
    },

    // --- INICIALIZACIÓN ---
    init() {
        this.loadSettings();
        console.log("🚀 AIService: Pollinations Core Iniciado", this.state.isAuthenticated ? "ONLINE" : "OFFLINE");
        
        // Exponer el servicio globalmente de forma segura
        window.PollinationsCore = this;
    },

    loadSettings() {
        // Cargar Key
        const key = localStorage.getItem('pollinations_api_key');
        if (key) {
            this.state.apiKey = key;
            this.state.isAuthenticated = true;
        }

        // Cargar Configuración de Modelos
        const savedConfig = localStorage.getItem('silenos_ai_config');
        if (savedConfig) {
            try {
                this.state.config = { ...this.state.config, ...JSON.parse(savedConfig) };
            } catch(e) { console.error("Error cargando config IA", e); }
        }
    },

    saveSettings(newConfig) {
        if (newConfig) {
            this.state.config = { ...this.state.config, ...newConfig };
            localStorage.setItem('silenos_ai_config', JSON.stringify(this.state.config));
        }
    },

    // --- GESTIÓN DE SESIÓN (LOGIN/LOGOUT) ---
    setKey(key) {
        if (!key) return;
        this.state.apiKey = key;
        this.state.isAuthenticated = true;
        localStorage.setItem('pollinations_api_key', key);
        console.log("🔐 AIService: Llave de Pollinations guardada.");
        // Disparar evento para que la UI se actualice si está escuchando
        window.dispatchEvent(new Event('ai-auth-changed'));
    },

    logout() {
        this.state.apiKey = null;
        this.state.isAuthenticated = false;
        localStorage.removeItem('pollinations_api_key');
        console.log("🔒 AIService: Sesión cerrada.");
        window.dispatchEvent(new Event('ai-auth-changed'));
    },

    // --- NÚCLEO DE GENERACIÓN (TEXTO) ---
    async generateText(prompt, systemPrompt = "Eres un asistente útil.", mode = 'fast') {
        // 1. Selección de modelo según velocidad
        const model = mode === 'slow' ? this.state.config.textModelSlow : this.state.config.textModelFast;
        
        // 2. Construcción de mensajes
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
        ];

        console.log(`🧠 AI Request (${mode}):`, model);

        try {
            // 3. Llamada API (Soporta modo sin key con limitaciones, o con key)
            const headers = { 'Content-Type': 'application/json' };
            if (this.state.isAuthenticated) {
                headers['Authorization'] = `Bearer ${this.state.apiKey}`;
            }

            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: mode === 'slow' ? 0.7 : 0.5 // Más creativo en modo lento
                })
            });

            if (!response.ok) throw new Error(`Pollinations Error: ${response.status}`);
            
            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error("❌ Error en Generación de Texto:", error);
            return `[ERROR DE IA: ${error.message}]`;
        }
    },

    // --- NÚCLEO DE GENERACIÓN (IMAGEN) ---
    async generateImage(prompt, mode = 'fast') {
        const model = mode === 'slow' ? this.state.config.imageModelSlow : this.state.config.imageModelFast;
        const seed = Math.floor(Math.random() * 1000000);
        const width = 1024;
        const height = 1024;
        
        console.log(`🎨 Image Request (${mode}):`, model);

        // Construcción de URL (Pollinations usa GET para imágenes normalmente)
        const encodedPrompt = encodeURIComponent(prompt);
        let url = `https://pollinations.ai/p/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}`;
        
        if (mode === 'slow') {
            url += "&enhance=true"; // Flag para mejorar calidad si el modelo lo soporta
        }

        return url; // Retorna la URL de la imagen directamente
    }
};

// Auto-arranque
window.AIService.init();