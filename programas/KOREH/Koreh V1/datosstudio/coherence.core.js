// --- SISTEMA DE COHERENCIA Y CONTEXTO (Refactorizado con Librerías Koreh) ---

const Coherence = {
    FILE_NAME: 'RESUMEN_GLOBAL.json',

    // Obtiene el contenido actual del archivo de resumen o lo crea si no existe
    getSummaryData: async () => {
        if (!app.targetHandle) return [];
        try {
            const fileHandle = await app.targetHandle.getFileHandle(Coherence.FILE_NAME);
            const file = await fileHandle.getFile();
            const text = await file.text();
            return JSON.parse(text);
        } catch (e) {
            return [];
        }
    },

    saveSummaryData: async (data) => {
        if (!app.targetHandle) return;
        try {
            const fileHandle = await app.targetHandle.getFileHandle(Coherence.FILE_NAME, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        } catch (e) {
            console.error("Error guardando resumen global:", e);
        }
    },

    // Genera un resumen conciso usando IA
    generateSingleSummary: async (itemData) => {
        // Check rápido de auth (la librería valida a fondo)
        if (!window.Koreh.Core.getAuthKey()) return null;

        const prompt = `
            ANALIZA ESTE DATO JSON Y CREA UN RESUMEN DE CONTEXTO  (Máx 5 frases).
            DATO: ${JSON.stringify(itemData)}
            
            SALIDA ESPERADA (Solo JSON):
            {
                "name": "${itemData.name}",
                "type": "${itemData.type}",
                "summary": "Breve descripción narrativa.",
                "visualKey": "Rasgos visuales clave."
            }
        `;

        try {
            // CORRECCIÓN: Usamos 'gemini-fast' en lugar de 'gemini-1.5-flash'
            const result = await window.Koreh.Text.generate(
                'Output JSON only.', 
                prompt, 
                { model: 'gemini-fast', jsonMode: true }
            );
            return result;

        } catch (e) {
            console.error("Fallo al generar resumen IA:", e);
            // Fallback manual para que no rompa el flujo
            return {
                name: itemData.name,
                type: itemData.type,
                summary: itemData.desc ? itemData.desc.substring(0, 100) : "Sin descripción",
                visualKey: itemData.visualDesc ? itemData.visualDesc.substring(0, 50) : "N/A"
            };
        }
    },

    updateItem: async (itemData) => {
        const newSummary = await Coherence.generateSingleSummary(itemData);
        if (!newSummary) return;

        let currentSummaries = await Coherence.getSummaryData();
        const index = currentSummaries.findIndex(i => i.name === itemData.name);
        if (index !== -1) {
            currentSummaries[index] = newSummary;
        } else {
            currentSummaries.push(newSummary);
        }
        await Coherence.saveSummaryData(currentSummaries);
    },

    removeItem: async (name) => {
        let currentSummaries = await Coherence.getSummaryData();
        const filtered = currentSummaries.filter(i => i.name !== name);
        if (currentSummaries.length !== filtered.length) {
            await Coherence.saveSummaryData(filtered);
        }
    },

    getContextString: async () => {
        const data = await Coherence.getSummaryData();
        if (data.length === 0) return "No hay contexto previo.";
        return data.map(i => `[${i.type}] ${i.name}: ${i.summary} (Visual: ${i.visualKey})`).join("\n");
    }
};