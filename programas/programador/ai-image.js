window.AIImage = {
    async generate(prompt, config) {
        const Sys = window.parent.SystemConfig;
        if (!Sys || !Sys.authKey) throw new Error("Falta API Key (Silenos Auth).");

        // Configuración de dimensiones basada en el ratio seleccionado
        let width = 1024;
        let height = 1024;

        // Interpretamos el ratio que viene del nodo
        switch (config.ratio) {
            case 'landscape': // 16:9
                width = 1280;
                height = 720;
                break;
            case 'portrait': // 9:16
                width = 720;
                height = 1280;
                break;
            case 'square': // 1:1
            default:
                width = 1024;
                height = 1024;
                break;
        }

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