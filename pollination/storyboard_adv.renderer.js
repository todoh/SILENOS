// --- storyboard_adv.renderer.js ---
// MOTOR DE RENDERIZADO VISUAL (MODELO: KLEIN) PARA SILENOS

const SbAdvRenderer = {
    
    getDimensions(format) {
        switch (format) {
            case 'portrait': return { w: 768, h: 1344 };
            case 'square': return { w: 1024, h: 1024 };
            case 'landscape': default: return { w: 1344, h: 768 };
        }
    },

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    async generateImage(visualPrompt, format) {
        const apiKey = localStorage.getItem('pollinations_api_key') || "";
        const dim = this.getDimensions(format);
        const seed = Math.floor(Math.random() * 9999999);
        const safePrompt = encodeURIComponent(visualPrompt);
        
        // Uso estricto del modelo "klein"
        let url = `https://gen.pollinations.ai/image/${safePrompt}?model=klein&width=${dim.w}&height=${dim.h}&seed=${seed}&nologo=true`;
        
        if (apiKey) {
            url += `&key=${apiKey}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            throw new Error(`Error en motor Klein: ${response.status} - ${errText}`);
        }
        
        const blob = await response.blob();
        return await this.blobToBase64(blob);
    }
};