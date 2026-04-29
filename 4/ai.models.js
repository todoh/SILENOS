// --- AI.MODELS.JS (GESTOR DE MODELOS IA) ---
window.AIModels = {
    // Lista estática de modelos en la nube (Pollinations / Otros)
    cloudModels: [
        { id: 'qwen-safety', name: 'Qwen3Guard 8B' },
        { id: 'nova-fast', name: 'Nova Micro' },
        { id: 'nova', name: 'Nova 2 Lite' },
        { id: 'qwen-coder', name: 'Qwen3 Coder 30B' },
        { id: 'mistral', name: 'Mistral Small 3.2' },
        { id: 'openai', name: 'GPT-5.4 Nano' },
        { id: 'gemini-fast', name: 'Gemini 2.5 Flash Lite' },
        { id: 'gemini-search', name: 'Google Gemini 2.5 Flash Lite Search' },
        { id: 'openai-fast', name: 'GPT-5 Nano' },
        { id: 'qwen-vision', name: 'Qwen3 VL 30B A3B Thinking' },
        { id: 'gemini-flash-lite-3.1', name: 'Gemini 3.1 Flash Lite' },
        { id: 'perplexity-fast', name: 'Perplexity Sonar' },
        { id: 'grok', name: 'Grok 4.20 Non-Reasoning' },
        { id: 'openai-audio', name: 'GPT Audio Mini' },
        { id: 'minimax', name: 'MiniMax M2.7' },
        { id: 'midijourney', name: 'MIDIjourney' },
        { id: 'claude-fast', name: 'Claude Haiku 4.5' },
        { id: 'perplexity-reasoning', name: 'Perplexity Sonar Reasoning' },
        { id: 'deepseek', name: 'DeepSeek V4 Flash (Lite)' },
        { id: 'kimi', name: 'Moonshot Kimi K2.5' },
        { id: 'mistral-large', name: 'Mistral Large 3' },
        { id: 'gemini', name: 'Gemini 3 Flash' },
        { id: 'qwen-coder-large', name: 'Qwen3 Coder Next' },
        { id: 'glm', name: 'Z.ai GLM-5.1' },
        { id: 'qwen-large', name: 'Qwen3.6 Plus' },
        { id: 'openai-large', name: 'GPT-5.4' },
        { id: 'grok-large', name: 'Grok 4.20 Reasoning' },
        { id: 'deepseek-pro', name: 'DeepSeek V4 Pro' },
        { id: 'openai-audio-large', name: 'GPT Audio 1.5' },
        { id: 'claude', name: 'Claude Sonnet 4.6' },
        { id: 'kimi-k2.6', name: 'Moonshot Kimi K2.6' },
        { id: 'midijourney-large', name: 'MIDIjourney Large' },
        { id: 'gemini-large', name: 'Gemini 3.1 Pro' },
        { id: 'claude-large', name: 'Claude Opus 4.6' },
        { id: 'llama', name: 'Llama 3' },
        { id: 'search', name: 'Web Search Agent' }
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