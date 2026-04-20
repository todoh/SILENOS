// live gemini/agents_tasks.js
// ─── PARALLEL AGENTS SYSTEM (SPECIFIC TASKS & PROMPTS) ──────────────────────

// Extendemos el objeto parallelAgents principal con las tareas específicas
Object.assign(parallelAgents, {
    async classify(text) {
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-classifier', true);
        const prompt = `Eres un agente clasificador trabajando para el asistente principal "VOZ SILENOS". Analiza la conversación y devuelve un JSON con las siguientes claves: 
        "tema_principal" (string), "emocion_dominante" (string), "etiquetas" (array de strings, max 5).`;
        const result = await this.callAgent(prompt, text);
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-classifier', false);
        return result;
    },

    async summarizeInternal(text) {
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-summarizer', true);
        const prompt = `Eres un agente de estructuración interna para el asistente "VOZ SILENOS". Analiza la conversación y extrae los datos clave para guardarlos en su memoria a corto/medio plazo. 
        Devuelve un JSON con: "entidades_mencionadas" (array), "hechos_clave" (array), "requiere_seguimiento" (booleano).`;
        const result = await this.callAgent(prompt, text);
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-summarizer', false);
        return result;
    },

    async generateVoiceReport(text) {
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-voicereport', true);
        const prompt = `Eres un agente consultor psicológico para "VOZ SILENOS", el modelo de voz principal. Crea un reporte detallado sobre cómo debe comportarse VOZ en su próxima respuesta en base al contexto emocional. 
        Devuelve un JSON con: "tono_sugerido" (string), "contexto_inmediato" (string, resumen de 1 linea de lo último hablado), "instruccion_secreta" (string, consejo interno para el modelo).`;
        const result = await this.callAgent(prompt, text);
        if (typeof updateProcessStatus === 'function') updateProcessStatus('proc-voicereport', false);
        return result;
    },

    async updateLongTermMemory(text, existingMemory) {
        const prompt = `Eres el Agente Bibliotecario de la Memoria a Largo Plazo de "VOZ SILENOS". 
        Tu objetivo es construir un perfil humano, profundo y persistente del usuario a través del tiempo.
        MEMORIA ACTUAL EXISTENTE: ${JSON.stringify(existingMemory)}
        NUEVA CONVERSACIÓN A ANALIZAR: "${text}"
        Instrucciones: Fusiona la memoria existente con los nuevos datos. Actualiza gustos, detalles personales, proyectos en curso o hechos vitales. Si hay información antigua irrelevante, descártala. Sé MUY CONCISO para no saturar la memoria.
        Devuelve un JSON exacto y bien cerrado con estas claves: "perfil_psicologico" (string), "datos_personales" (array), "preferencias_y_gustos" (array), "proyectos_historia" (array).`;
        const result = await this.callAgent(prompt, "Analiza y consolida la memoria a largo plazo.");
        return result;
    }
});