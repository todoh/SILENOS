// --- NODE-REGISTRY.JS ---
// Sistema central para registrar tipos de nodos sin tocar el núcleo.

window.NodeRegistry = {
    definitions: {},

    register(type, definition) {
        // Estructura esperada de definition:
        // {
        //    label: "Nombre",
        //    inputs: ["in_1"],
        //    outputs: ["out_1"],
        //    defaults: { ... },
        //    render: (node) => string (HTML),
        //    execute: async (node, inputData, logicInstance) => result
        // }
        this.definitions[type] = definition;
        console.log(`Nodo registrado: ${type}`);
    },

    get(type) {
        const def = this.definitions[type];
        if (!def) {
            console.error(`Definición de nodo no encontrada para: ${type}`);
            return this.getFallbackDefinition(type);
        }
        return def;
    },

    getFallbackDefinition(type) {
        return {
            label: `UNKNOWN (${type})`,
            inputs: ['in_1'],
            outputs: ['out_1'],
            defaults: {},
            render: (node) => `<div class="p-2 text-red-500">Tipo desconocido</div>`,
            execute: async () => null
        };
    }
};