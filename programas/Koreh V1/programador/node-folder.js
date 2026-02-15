window.UI.NodeRenderers['folder'] = {
    label: 'SALIDA CARPETA',
    render: (node) => {
        return `
            <div class="flex flex-col gap-2">
                <button class="btn-nordic w-full flex justify-between items-center" onclick="UI.openFolderSelect('${node.id}')">
                    <span class="truncate w-20">${node.data.pathName}</span>
                    <i class="fa-solid fa-folder"></i>
                </button>
                <input class="node-input" value="${node.data.filename}" data-key="filename" placeholder="Nombre archivo">
            </div>`;
    }
};