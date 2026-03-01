// --- PROGRAMADOR/NODE-GEMINI.JS ---

// Variable global para persistencia de la rotación de Keys
let currentKeyIndex = 0;

NodeRegistry.register('ai-gemini', {
    label: 'GOOGLE GEMINI',
    inputs: ['in_1', 'in_inst'], // in_1 = Datos, in_inst = Instrucción
    outputs: ['out_1'],
    defaults: { 
        model: "gemini-2.5-flash",
        instruction: "" 
    },

    render: (node) => {
        return `
            <div class="flex flex-col gap-2">
                <label class="text-[8px] text-blue-500 font-bold ml-1">MODELO</label>
                <select class="node-input" data-key="model">
                    <option value="gemini-2.5-flash" ${node.data.model==='gemini-2.5-flash'?'selected':''}>Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-flash-lite" ${node.data.model==='gemini-2.5-flash-lite'?'selected':''}>Gemini 2.5 Flash Lite</option>
                    <option value="gemma-3-27b-it" ${node.data.model==='gemma-3-27b-it'?'selected':''}>Gemma 3 27B</option>
                    <option value="gemini-3-flash-preview" ${node.data.model==='gemini-3-flash-preview'?'selected':''}>Gemini 3 Flash (Preview)</option>
                </select>

                <div class="flex flex-col">
                    <label class="text-[8px] text-gray-400 font-bold ml-1">INSTRUCCIÓN / SISTEMA</label>
                    <textarea class="node-input bg-yellow-50 border-yellow-100 focus:bg-white" rows="2" data-key="instruction" placeholder="Ej: Resume esto...">${node.data.instruction || ''}</textarea>
                </div>
                
                <div class="text-[8px] text-gray-400 text-right">Soporta Multi-Keys (CSV)</div>
            </div>`;
    },

    execute: async (node, inputData, logic) => {
        if (!inputData) throw new Error("Gemini necesita datos en la entrada principal (in_1).");

        // 1. Obtener Instrucción (Prioridad: Cable > Manual)
        // Usamos logic.getInputData para leer el puerto 'in_inst'
        const externalInstruction = await logic.getInputData(node.id, 'in_inst');
        const manualInstruction = node.data.instruction || "";
        
        // Si hay cable, usa el cable; si no, usa lo escrito en la caja
        const instruction = externalInstruction ? String(externalInstruction) : manualInstruction;

        // 2. Construir el Prompt Final
        // Si hay instrucción, la anteponemos a los datos
        let finalPrompt = "";
        if (instruction.trim() !== "") {
            finalPrompt = `${instruction}\n\n---\n\nDATOS DE ENTRADA:\n${String(inputData)}`;
        } else {
            finalPrompt = String(inputData);
        }

        // 3. Gestión de API Keys (Silenos Global)
        const rawKeys = window.parent.googleapikey || localStorage.getItem('google_ai_api_key_v2') || "";
        const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(k => k !== "");

        if (apiKeys.length === 0) {
            throw new Error("Falta Google API Key. Configura [CFG].");
        }

        const model = node.data.model || "gemini-2.5-flash";
        const maxRetries = 11;
        let attempts = 0;
        let lastError = null;

        // 4. Bucle de Ejecución (Rotación + Retry)
        while (attempts < maxRetries) {
            if (currentKeyIndex >= apiKeys.length) currentKeyIndex = 0;
            const currentKey = apiKeys[currentKeyIndex];
            
            if (attempts === 0) {
                window.app.log(`Gemini Procesando...`);
            } else {
                window.app.log(`Reintentando (Intento ${attempts+1}) con Key #${currentKeyIndex+1}...`, "warning");
            }

            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;

                const payload = {
                    contents: [{
                        parts: [{
                            text: finalPrompt
                        }]
                    }]
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.status === 429) throw { status: 429, message: "Quota Exceeded" };

                const data = await response.json();

                if (data.error) {
                    if (data.error.code === 429 || data.error.status === "RESOURCE_EXHAUSTED") {
                        throw { status: 429, message: data.error.message };
                    }
                    throw new Error("Google API: " + data.error.message);
                } 
                
                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                    return data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error("Respuesta vacía.");
                }

            } catch (e) {
                lastError = e;
                if (e.status === 429) {
                    attempts++;
                    currentKeyIndex++; 
                    if (currentKeyIndex >= apiKeys.length) currentKeyIndex = 0;

                    if (attempts < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        continue;
                    }
                } else {
                    throw e; 
                }
            }
        }

        throw new Error(`Fallo tras ${maxRetries} intentos. ${lastError ? lastError.message : ''}`);
    }
});