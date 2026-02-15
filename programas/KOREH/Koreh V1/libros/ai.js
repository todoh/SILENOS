const AI = {
    async call(systemRole, userText, temp = 0.7) {
        if (!Sys || !Sys.authKey) {
            ui.log("Clave de autorización no encontrada.", "error");
            throw new Error("Auth Required");
        }
        
        const modelName = document.getElementById('modelSelect').value.trim() || 'openai-large';
        
        try {
            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST', 
                headers: { 
                    'Authorization': `Bearer ${Sys.authKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    model: modelName, 
                    messages: [ 
                        { role: 'system', content: systemRole }, 
                        { role: 'user', content: userText } 
                    ],
                    // AJUSTES PARA HUMANIZAR:
                    temperature: temp,          // 0.7 es equilibrio creatividad/coherencia
                    frequency_penalty: 0.6,     // Reduce drásticamente la repetición de palabras
                    presence_penalty: 0.4,      // Evita bucles de conceptos
                    max_tokens: 2000            // Permite respuestas largas si es necesario
                })
            });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) { 
            throw error; 
        }
    }
};