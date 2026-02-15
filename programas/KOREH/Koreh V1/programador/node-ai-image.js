window.UI.NodeRenderers['ai-image'] = {
    label: 'GENERADOR IMAGEN',
    render: (node) => {
        // Recuperamos valores guardados o defaults
        const currentRatio = node.data.ratio || 'landscape';
        const isChroma = node.data.chroma ? 'checked' : '';

        return `
             <div class="flex flex-col gap-2">
                <select class="node-input" data-key="model">
                    <option value="flux" ${node.data.model==='flux'?'selected':''}>Flux Schnell</option>
                    <option value="zimage" ${node.data.model==='zimage'?'selected':''}>Z-Image Turbo</option>
                    <option value="imagen-4" ${node.data.model==='imagen-4'?'selected':''}>Imagen 4 (api.airforce)</option>
                    <option value="klein" ${node.data.model==='klein'?'selected':''}>FLUX.2 Klein 4B</option>
                    <option value="klein-large" ${node.data.model==='klein-large'?'selected':''}>FLUX.2 Klein 9B</option>
                    <option value="gptimage" ${node.data.model==='gptimage'?'selected':''}>GPT Image 1 Mini</option>
                </select>
                
                <div class="flex gap-1">
                    <select class="node-input" data-key="ratio">
                        <option value="square" ${currentRatio==='square'?'selected':''}>Cuadrado (1:1)</option>
                        <option value="landscape" ${currentRatio==='landscape'?'selected':''}>Paisaje (16:9)</option>
                        <option value="portrait" ${currentRatio==='portrait'?'selected':''}>Retrato (9:16)</option>
                    </select>
                </div>

                <div class="flex items-center justify-between bg-gray-50 p-1 border border-gray-100 rounded">
                    <span class="text-[9px] text-gray-500 font-bold ml-1">CHROMA KEY</span>
                    <input type="checkbox" class="mr-1" data-key="chroma" ${isChroma}>
                </div>
            </div>`;
    }
};