// --- AI.MODELS.JS (GESTOR DE MODELOS IA) ---
window.AIModels = {
    // Lista estática de modelos en la nube (Pollinations / Otros)
    // Ordenados por coste de salida (Output) de menor a mayor
    cloudModels: [
        { id: 'qwen-safety', name: 'Qwen3Guard 8B ($0.01 / $0.01)' },
        { id: 'nova-fast', name: 'Nova Micro ($0.04 / $0.15)' },
        { id: 'mistral', name: 'Mistral Small 3.2 ($0.08 / $0.20)' },
        { id: 'qwen-coder', name: 'Qwen3 Coder 30B ($0.06 / $0.22)' },
        { id: 'deepseek', name: 'DeepSeek V4 Flash (Lite) ($0.13 / $0.26)' },
        { id: 'llama-scout', name: 'Meta Llama 4 Scout ($0.08 / $0.30)' },
        { id: 'gemma', name: 'Gemma 4 26B A4B ($0.08 / $0.34)' },
        { id: 'openai-fast', name: 'GPT-5 Nano ($0.05 / $0.40)' },
        { id: 'qwen-vision', name: 'Qwen3 VL 30B A3B Instruct ($0.13 / $0.52)' },
        { id: 'mistral-4', name: 'Mistral Small 4 ($0.15 / $0.60)' },
        { id: 'llama', name: 'Meta Llama 3.3 70B ($0.71 / $0.71)' },
        { id: 'llama-maverick', name: 'Meta Llama 4 Maverick ($0.25 / $1.00)' },
        { id: 'perplexity-fast', name: 'Perplexity Sonar ($1.00 / $1.00)' },
        { id: 'gemini-fast', name: 'Gemini 2.5 Flash Lite ($0.30 / $1.20)' },
        { id: 'gemini-search', name: 'Google Gemini 2.5 Flash Lite Search ($0.30 / $1.20)' },
        { id: 'minimax', name: 'MiniMax M2.7 ($0.30 / $1.20)' },
        { id: 'openai', name: 'GPT-5.4 Nano ($0.20 / $1.25)' },
        { id: 'mistral-large', name: 'Mistral Large 3 ($0.50 / $1.50)' },
        { id: 'gemini-flash-lite-3.1', name: 'Gemini 3.1 Flash Lite ($0.38 / $2.25)' },
        { id: 'qwen-coder-large', name: 'Qwen3 Coder Next ($0.45 / $2.25)' },
        { id: 'openai-audio', name: 'GPT Audio Mini ($0.60 / $2.40)' },
        { id: 'qwen-vision-pro', name: 'Qwen3 VL 235B A22B Thinking ($0.26 / $2.60)' },
        { id: 'nova', name: 'Nova 2 Lite ($0.33 / $2.75)' },
        { id: 'kimi', name: 'Moonshot Kimi K2.5 ($0.60 / $3.00)' },
        { id: 'qwen-large', name: 'Qwen3.6 Plus ($0.50 / $3.00)' },
        { id: 'glm', name: 'Z.ai GLM-5.1 ($1.00 / $3.20)' },
        { id: 'deepseek-pro', name: 'DeepSeek V4 Pro ($1.74 / $3.48)' },
        { id: 'kimi-k2.6', name: 'Moonshot Kimi K2.6 ($0.95 / $4.00)' },
        { id: 'gemini', name: 'Gemini 3 Flash ($0.75 / $4.50)' },
        { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini ($0.75 / $4.50)' },
        { id: 'claude-fast', name: 'Claude Haiku 4.5 ($1.11 / $5.50)' },
        { id: 'midijourney', name: 'MIDIjourney ($1.11 / $5.50)' },
        { id: 'grok', name: 'Grok 4.20 Non-Reasoning ($2.00 / $6.00)' },
        { id: 'grok-large', name: 'Grok 4.20 Reasoning ($2.00 / $6.00)' },
        { id: 'perplexity-reasoning', name: 'Perplexity Sonar Reasoning ($2.00 / $8.00)' },
        { id: 'openai-audio-large', name: 'GPT Audio 1.5 ($2.50 / $10.00)' },
        { id: 'openai-large', name: 'GPT-5.4 ($2.50 / $15.00)' },
        { id: 'claude', name: 'Claude Sonnet 4.6 ($3.30 / $16.50)' },
        { id: 'gemini-large', name: 'Gemini 3.1 Pro ($3.00 / $18.00)' },
        { id: 'claude-large', name: 'Claude Opus 4.6 ($5.50 / $27.50)' },
        { id: 'claude-opus-4.7', name: 'Claude Opus 4.7 ($5.50 / $27.50)' },
        { id: 'midijourney-large', name: 'MIDIjourney Large ($5.50 / $27.50)' },
        { id: 'gpt-5.5', name: 'GPT-5.5 ($5.00 / $30.00)' },
        { id: 'polly', name: 'Polly by @Itachi-1824 (Alpha)' }
    ],

    // Función genérica para poblar cualquier select
    populateSelect(selectElementId, modelsArray) {
        const select = document.getElementById(selectElementId);
        if (!select) return;
        
        select.innerHTML = '';
        modelsArray.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            select.appendChild(opt);
        });
    },

    // Escáner asíncrono para Ollama en Localhost
    async scanOllama(selectElementId) {
        const select = document.getElementById(selectElementId);
        if (!select) return;
        select.innerHTML = '<option>Buscando en localhost:11434...</option>';
        
        try {
            // Recuperamos la URL configurada o usamos la de por defecto
            const ollamaConfig = JSON.parse(localStorage.getItem('ollama_config')) || {};
            let url = ollamaConfig.url;
            
            // Corrección profunda: Validar explícitamente strings nulos o "undefined"
            if (!url || url === 'undefined' || url === 'null') {
                url = 'http://localhost:11434';
            }

            const response = await fetch(`${url}/api/tags`);
            if (!response.ok) throw new Error("Ollama no responde");
            
            const data = await response.json();
            
            if (data.models && data.models.length > 0) {
                const ollamaModels = data.models.map(m => ({ id: m.name, name: m.name }));
                this.populateSelect(selectElementId, ollamaModels);
                return ollamaModels;
            } else {
                select.innerHTML = '<option disabled>Ollama activo pero sin modelos instalados.</option>';
                return [];
            }
        } catch (error) {
            console.warn("Error escaneando Ollama:", error);
            select.innerHTML = '<option disabled>Error: ¿Ollama está en ejecución?</option>';
            return [];
        }
    }
};