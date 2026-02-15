window.AIText = {
    async generate(prompt, config) {
        const Sys = window.parent.SystemConfig;
        if (!Sys || !Sys.authKey) throw new Error("Falta API Key (Silenos Auth).");

        const model = config.model || 'openai-large';
        const system = config.system || "Eres un asistente útil.";

        try {
            const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Sys.authKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (!res.ok) throw new Error(`API Text Error: ${res.status}`);
            const data = await res.json();
            return data.choices[0].message.content;

        } catch (e) {
            throw e;
        }
    }
};