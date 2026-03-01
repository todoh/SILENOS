// Definición completa: Visual + Lógica
NodeRegistry.register('input', {
    label: 'ENTRADA TEXTO',
    inputs: [],
    outputs: ['out_1'],
    defaults: { value: "Escribe tu prompt aquí..." },

    render: (node) => {
        return `<textarea class="node-input" rows="4" data-key="value">${node.data.value}</textarea>`;
    },

    execute: async (node) => {
        // Simplemente devuelve lo que el usuario escribió
        return node.data.value;
    }
});