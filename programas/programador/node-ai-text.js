NodeRegistry.register('ai-text', {
    label: 'GENERADOR TEXTO',
    inputs: ['in_1'],
    outputs: ['out_1'],
    defaults: { model: "openai-large", system: "Eres un asistente útil." },

    render: (node) => {
        return `
            <div class="flex flex-col gap-2">
                <input class="node-input" value="${node.data.model}" data-key="model">
                <textarea class="node-input" rows="2" data-key="system">${node.data.system}</textarea>
            </div>`;
    },

    execute: async (node, inputData) => {
        if (!inputData) throw new Error("Generador de texto necesita entrada.");
        
        // Aquí llamamos a la librería AIText que ya tenías (ai-text.js)
        // Nota: Asegúrate de que AIText esté cargado globalmente
        return await window.AIText.generate(inputData, node.data);
    }
});