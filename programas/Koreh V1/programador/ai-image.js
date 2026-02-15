window.AIImage = {
    async generate(prompt, config) {
        const Sys = window.parent.SystemConfig;
        if (!Sys || !Sys.authKey) throw new Error("Falta API Key (Silenos Auth).");

        const width = config.width || 1024;
        const height = config.height || 1024;
        const model = config.model || 'flux';
        const seed = Math.floor(Math.random() * 999999);
        
        const safePrompt = encodeURIComponent(prompt);
        const url = `https://gen.pollinations.ai/image/${safePrompt}?model=${model}&width=${width}&height=${height}&seed=${seed}&nologo=true&key=${Sys.authKey}`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("API Image Error");
            return await res.blob(); // Devolvemos Blob para guardar directamente
        } catch (e) {
            throw e;
        }
    }
};