// --- LOGIC2.JS (DEEPSEEK AI INTEGRATION) ---
window.DeepSeekAI = {
    async generate({ prompt, system = "Eres un asistente útil y experto.", temperature = 0.7, model = 'deepseek-chat', history = [] }) {
        // Recuperar la llave desde el LocalStorage (ingresada en el Config-Window)
        const apiKey = localStorage.getItem('deepseek_api_key') || (window.parent && window.parent.deepseekapikey) || '';
        
        if (!apiKey) {
            throw new Error("Autenticación denegada: Configura tu API Key de DeepSeek en el panel de Sistema (CFG).");
        }
        
        // Estructurar los mensajes basándonos en el historial
        const messages = history.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
        }));
        
        if (system) {
            messages.unshift({ role: 'system', content: system });
        }
        
        // Añadir el prompt actual del usuario
        messages.push({ role: 'user', content: prompt });
        
        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model, // Permite recibir 'deepseek-chat' (Fast) o 'deepseek-reasoner' (Pro)
                    messages: messages,
                    temperature: temperature,
                    max_tokens: 4096
                })
            });
            
            if (!response.ok) {
                let errorMsg = response.statusText;
                try {
                    const errData = await response.json();
                    if (errData.error && errData.error.message) {
                        errorMsg = errData.error.message;
                    }
                } catch(e) { } // Fallback si no hay JSON en el error
                
                throw new Error(`API de DeepSeek respondió con error: ${response.status} - ${errorMsg}`);
            }
            
            const data = await response.json();
            
            return {
                text: data.choices[0].message.content,
                usage: data.usage
            };
            
        } catch (e) {
            console.error("Fallo profundo en la capa DeepSeekAI:", e);
            throw e;
        }
    }
};