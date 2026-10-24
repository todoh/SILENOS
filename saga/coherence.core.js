// --- SISTEMA DE COHERENCIA Y CONTEXTO (Modificado para evitar IA en segundo plano) ---

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

    // Genera un resumen conciso (SIN IA)
    generateSingleSummary: async (itemData) => {
        // Se ha eliminado la llamada a gemini-fast en segundo plano.
        // Ahora siempre devuelve el fallback manual directamente para no consumir saldo ni dar error 402.
        return {
            name: itemData.name,
            type: itemData.type,
            summary: itemData.desc ? itemData.desc.substring(0, 100) : "Sin descripción",
            visualKey: itemData.visualDesc ? itemData.visualDesc.substring(0, 50) : "N/A"
        };
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