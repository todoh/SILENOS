window.UI.NodeRenderers['input'] = {
    label: 'ENTRADA TEXTO',
    render: (node) => {
        return `<textarea class="node-input" rows="4" data-key="value">${node.data.value}</textarea>`;
    }
};