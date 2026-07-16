// Catálogos Dinámicos y Estáticos Incorporados
export let MODELOS_POLLINATIONS = [];

/**
 * Recupera de forma dinámica el catálogo de modelos de texto de Pollinations AI
 * Ordena situando los modelos marcados como "free" (gratuitos) al principio.
 */
export async function fetchDynamicPollinationsTextModels() {
    try {
        const response = await fetch("https://gen.pollinations.ai/text/models");
        if (!response.ok) throw new Error("Error en la respuesta del servidor de modelos de texto.");
        const data = await response.json();
        
        const models = data.map(m => {
            const name = m.name || m.id || m;
            const tag = m.id || m.name || m;
            return { name: name, tag: tag };
        });

        // Ordenación de gratis ("free") a de pago / comunidad
        models.sort((a, b) => {
            const aFree = a.name.toLowerCase().includes('free') || a.tag.toLowerCase().includes('free');
            const bFree = b.name.toLowerCase().includes('free') || b.tag.toLowerCase().includes('free');
            if (aFree && !bFree) return -1;
            if (!aFree && bFree) return 1;
            return a.name.localeCompare(b.name);
        });

        MODELOS_POLLINATIONS = models;
        return models;
    } catch (e) {
        console.error("No se pudieron sincronizar los modelos de texto de Pollinations:", e);
        return [];
    }
}

export const MODELOS_GEMINI = [
    { name: "Gemini 3 Flash", tag: "gemini-3-flash" },
    { name: "Gemini 3.1 Flash Lite", tag: "gemini-3.1-flash-lite" },
    { name: "Gemini 2.5 Flash Lite", tag: "gemini-2.5-flash-lite" },
    { name: "Gemini 3.5 Flash", tag: "gemini-3.5-flash" },
    { name: "Gemma 4 31B", tag: "gemma-4-31b-it" }
];