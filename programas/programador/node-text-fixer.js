NodeRegistry.register('text-fixer', {
    label: 'ENSAMBLADOR TEXTO',
    inputs: ['in_prefix', 'in_main', 'in_suffix'], // Entradas nombradas
    outputs: ['out_1'],
    defaults: { prefix: "", text: "", suffix: "" },

    render: (node) => {
        return `
            <div class="flex flex-col gap-2 relative">
                <div class="flex flex-col">
                    <label class="text-[8px] text-gray-400 font-bold ml-1">PREFIJO</label>
                    <textarea class="node-input" rows="1" data-key="prefix" placeholder="Opcional...">${node.data.prefix || ''}</textarea>
                </div>

                <div class="flex flex-col">
                    <label class="text-[8px] text-indigo-500 font-bold ml-1">TEXTO PRINCIPAL</label>
                    <textarea class="node-input bg-indigo-50 border-indigo-100 focus:border-indigo-500 focus:bg-white" rows="2" data-key="text" placeholder="Escribe o conecta cable...">${node.data.text || ''}</textarea>
                </div>

                <div class="flex flex-col">
                    <label class="text-[8px] text-gray-400 font-bold ml-1">SUFIJO</label>
                    <textarea class="node-input" rows="1" data-key="suffix" placeholder="Opcional...">${node.data.suffix || ''}</textarea>
                </div>
            </div>`;
    },

    execute: async (node, _ignore, logic) => {
        // Ignoramos inputData automático porque usamos puertos específicos
        // Usamos el helper de Logic para pedir datos a puertos concretos
        
        let mainTxt = (await logic.getInputData(node.id, 'in_main')) || (node.data.text || "");
        let prefixTxt = (await logic.getInputData(node.id, 'in_prefix')) || (node.data.prefix || "");
        let suffixTxt = (await logic.getInputData(node.id, 'in_suffix')) || (node.data.suffix || "");

        return [String(prefixTxt), String(mainTxt), String(suffixTxt)]
                .filter(txt => txt && txt.trim() !== "") 
                .join(" ");
    }
});