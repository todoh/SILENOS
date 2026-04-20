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
        try {
            const res = await fetch(POLLINATIONS_API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${pollinationsKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    model: 'nova-fast', 
                    messages: [
                        { 
                            role: 'system', 
                            content: systemPrompt + ' OBLIGATORIO: Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido, corto y perfectamente cerrado. No incluyas bloques de código markdown (como ```json), ni saludos, ni texto adicional.' 
                        }, 
                        { role: 'user', content: userText }
                    ],
                    jsonMode: true,
                    seed: Math.floor(Math.random() * 1000)
                })
            });
            
            if (!res.ok) return null;
            
            const data = await res.json();
            if (data.choices && data.choices.length > 0) {
                let content = data.choices[0].message.content.trim();
                content = this.cleanJSON(content);
                
                // Protección profunda contra truncamiento por límite de tokens
                try {
                    return JSON.parse(content);
                } catch (parseError) {
                    console.warn("El agente IA generó un JSON incompleto o truncado por límite de tokens. Se omite este ciclo de análisis silenciosamente.", parseError.message);
                    return null;
                }
            }
            return null;
        } catch(e) {
            console.error("Error de red o API en llamada al agente Pollinations:", e);
            return null;
        }
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
        if (!pollinationsKey || !fullConversationText.trim() || this.isAnalyzing) return;
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

            // PROTECCIÓN PROFUNDA: Limitamos el contexto al histórico más reciente 
            // para evitar desbordamiento del prompt y truncamiento del JSON de respuesta.
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
        if (isConnected && pollinationsKey) parallelAgents.runAll();
    }, 180000); 
    
    // Disparamos el bucle de imaginación al conectar (requiere que imagination.js esté cargado)
    if (typeof imaginationEngine !== 'undefined') {
        imaginationEngine.start();
    }
}

function stopParallelAgents() {
    if (agentsInterval) clearInterval(agentsInterval);
    if (typeof imaginationEngine !== 'undefined') {
        imaginationEngine.stop();
    }
}