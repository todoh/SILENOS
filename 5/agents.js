// live gemini/agents.js
// ─── PARALLEL AGENTS SYSTEM (CORE & ORCHESTRATION) ──────────────────────

const parallelAgents = {
    isAnalyzing: false,

    cleanJSON(str) {
        if(!str) return "{}";
        str = str.replace(/```json/gi, '').replace(/```/g, '');
        const firstBracket = str.indexOf('[');
        const firstBrace = str.indexOf('{');
        const lastBracket = str.lastIndexOf(']');
        const lastBrace = str.lastIndexOf('}');
        
        let start = -1;
        let end = -1;

        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            start = firstBrace;
            end = lastBrace;
        } else if (firstBracket !== -1) {
            start = firstBracket;
            end = lastBracket;
        }

        if (start !== -1 && end !== -1 && end > start) {
            return str.substring(start, end + 1);
        }
        return str; 
    },

    async callAgent(systemPrompt, userText) {
        // LLAMADAS REST DESACTIVADAS. SOLO OPERA GEMINI LIVE.
        // Se devuelve null para que el sistema ignore silenciosamente este ciclo.
        return null;
    },

    async saveAnalysisFile(filename, jsonData) {
        if (!analysisHandle || !jsonData) return;
        try {
            const fileHandle = await analysisHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(jsonData, null, 2));
            await writable.close();
        } catch (e) {
            console.error(`Error guardando ${filename}:`, e);
        }
    },

    async runAll() {
        if (!apiKey || !fullConversationText.trim() || this.isAnalyzing) return;
        this.isAnalyzing = true;

        try {
            let existingCoreMemory = {};
            if (analysisHandle) {
                try {
                    const memHandle = await analysisHandle.getFileHandle('memoria_core.json');
                    const memFile = await memHandle.getFile();
                    existingCoreMemory = JSON.parse(await memFile.text());
                } catch(e) {}
            }

            const MAX_CONTEXT_LENGTH = 12000;
            const contextToAnalyze = fullConversationText.length > MAX_CONTEXT_LENGTH 
                ? fullConversationText.substring(fullConversationText.length - MAX_CONTEXT_LENGTH) 
                : fullConversationText;

            const [clasificacion, resumenInterno, informeVoz, memoriaCore] = await Promise.all([
                this.classify(contextToAnalyze),
                this.summarizeInternal(contextToAnalyze),
                this.generateVoiceReport(contextToAnalyze),
                this.updateLongTermMemory(contextToAnalyze, existingCoreMemory)
            ]);

            const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
            
            if (clasificacion) await this.saveAnalysisFile(`clasificacion-${dateStr}.json`, clasificacion);
            if (resumenInterno) await this.saveAnalysisFile(`resumen_interno-${dateStr}.json`, resumenInterno);
            if (informeVoz) await this.saveAnalysisFile(`informe_voz-${dateStr}.json`, informeVoz);
            if (memoriaCore) await this.saveAnalysisFile('memoria_core.json', memoriaCore);

        } catch (err) {
            console.error('Error en la ejecución de agentes paralelos:', err);
        } finally {
            this.isAnalyzing = false;
        }
    }
};

let agentsInterval = null;

function startParallelAgents() {
    if (agentsInterval) clearInterval(agentsInterval);
    agentsInterval = setInterval(() => {
        if (isConnected && apiKey) parallelAgents.runAll();
    }, 20000); 
}

function stopParallelAgents() {
    if (agentsInterval) clearInterval(agentsInterval);
}