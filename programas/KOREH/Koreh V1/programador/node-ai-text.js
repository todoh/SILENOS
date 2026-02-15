window.UI.NodeRenderers['ai-text'] = {
    label: 'GENERADOR TEXTO',
    render: (node) => {
        return `
            <div class="flex flex-col gap-2">
                <input class="node-input" value="${node.data.model}" data-key="model">
                <textarea class="node-input" rows="2" data-key="system">${node.data.system}</textarea>
            </div>`;
    }
};