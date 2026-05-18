// --- AI.MODELS.JS (GESTOR DE MODELOS IA) ---
window.AIModels = {
    // Lista estática de modelos en la nube (Pollinations / Otros)
    cloudModels: [
        { id: 'qwen-safety', name: 'Qwen3Guard 8B' },
        { id: 'nova-fast', name: 'Nova Micro' },
        { id: 'qwen-coder', name: 'Qwen3 Coder 30B' },
        { id: 'mistral', name: 'Mistral Small 3.2' },
        { id: 'llama-scout', name: 'Meta Llama 4 Scout' },
        { id: 'openai', name: 'GPT-5.4 Nano' },
        { id: 'mistral-4', name: 'Mistral Small 4' },
        { id: 'gemini-flash-lite-3.1', name: 'Gemini 3.1 Flash Lite' },
        { id: 'gemini-fast', name: 'Gemini 2.5 Flash Lite' },
        { id: 'qwen-vision', name: 'Qwen3 VL 30B A3B Instruct' },
        { id: 'perplexity-fast', name: 'Perplexity Sonar' },
        { id: 'llama', name: 'Meta Llama 3.3 70B' },
        { id: 'gemini-search', name: 'Google Gemini 2.5 Flash Lite Search' },
        { id: 'gemma', name: 'Gemma 4 26B A4B' },
        { id: 'nova', name: 'Nova 2 Lite' },
        { id: 'openai-fast', name: 'GPT-5 Nano' },
        { id: 'llama-maverick', name: 'Meta Llama 4 Maverick' },
        { id: 'deepseek', name: 'DeepSeek V4 Flash (Lite)' },
        { id: 'minimax', name: 'MiniMax M2.7' },
        { id: 'openai-audio', name: 'GPT Audio Mini' },
        { id: 'midijourney', name: 'MIDIjourney' },
        { id: 'qwen-vision-pro', name: 'Qwen3 VL 235B A22B Thinking' },
        { id: 'kimi', name: 'Moonshot Kimi K2.5' },
        { id: 'mistral-large', name: 'Mistral Large 3' },
        { id: 'qwen-coder-large', name: 'Qwen3 Coder Next' },
        { id: 'claude-fast', name: 'Claude Haiku 4.5' },
        { id: 'gemini', name: 'Gemini 3 Flash' },
        { id: 'perplexity-reasoning', name: 'Perplexity Sonar Reasoning' },
        { id: 'grok-large', name: 'Grok 4.20 Reasoning' },
        { id: 'glm', name: 'Z.ai GLM-5.1' },
        { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
        { id: 'grok', name: 'Grok 4.20 Non-Reasoning' },
        { id: 'openai-large', name: 'GPT-5.4' },
        { id: 'kimi-k2.6', name: 'Moonshot Kimi K2.6' },
        { id: 'qwen-large', name: 'Qwen3.6 Plus' },
        { id: 'deepseek-pro', name: 'DeepSeek V4 Pro' },
        { id: 'gpt-5.5', name: 'GPT-5.5' },
        { id: 'gemini-large', name: 'Gemini 3.1 Pro' },
        { id: 'claude', name: 'Claude Sonnet 4.6' },
        { id: 'claude-large', name: 'Claude Opus 4.6' },
        { id: 'claude-opus-4.7', name: 'Claude Opus 4.7' },
        { id: 'openai-audio-large', name: 'GPT Audio 1.5' },
        { id: 'midijourney-large', name: 'MIDIjourney Large' },
        { id: 'polly', name: 'Polly by @Itachi-1824' }
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