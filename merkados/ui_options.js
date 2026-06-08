// ui_options.js
// --- GESTIÓN DEL PANEL DE OPCIONES Y CONEXIONES ENTRE NODOS ---

function renderOptionsPanel(node) {
    const list = document.getElementById('options-list');
    list.innerHTML = '';
    const outgoing = data.connections.filter(c => c.from === node.id);

    if (outgoing.length === 0) {
        list.innerHTML = `
            <div class="flex h-full items-center justify-center">
                <p class="text-[10px] italic opacity-40 text-center">
                    Sin opciones salientes.<br>Click derecho en este nodo y arrastra hacia otro para conectar.
                </p>
            </div>`;
        optionsPanel.classList.remove('hidden');
        return;
    }

    outgoing.forEach((c) => {
        const targetNode = data.nodes.find(n => n.id === c.to);
        const targetTitle = targetNode ? targetNode.title : `Nodo ${c.to}`;

        const row = document.createElement('div');
        row.className = "flex items-center gap-3 border-b border-gray-100 pb-2";
        row.innerHTML = `
            <div class="flex flex-col shrink-0 w-24">
                <span class="text-[7px] uppercase opacity-40 tracking-wider">Destino</span>
                <span class="text-[10px] font-bold truncate uppercase cursor-pointer hover:underline" onclick="centerOnNode(data.nodes.find(n => n.id === '${c.to}'))">${targetTitle}</span>
            </div>
            <div class="flex-grow">
                <span class="text-[7px] uppercase opacity-40 tracking-wider block">Texto de la Opción / Acción</span>
                <input type="text"
                       value="${(c.label || '').replace(/"/g, '&quot;')}"
                       placeholder="Ej: Abrir la puerta misteriosa..."
                       class="w-full text-xs border-b border-transparent focus:border-black outline-none py-0.5"
                       oninput="handleUpdateConnectionLabel('${c.from}', '${c.to}', this.value)">
            </div>
            <button onclick="handleDeleteConnection('${c.from}', '${c.to}')"
                    class="text-[9px] text-red-500 hover:text-black hover:underline uppercase py-1 shrink-0">
                Eliminar
            </button>
        `;
        list.appendChild(row);
    });
    optionsPanel.classList.remove('hidden');
}

function handleUpdateConnectionLabel(fromId, toId, value) {
    updateConnectionLabelLogic(fromId, toId, value);
}

function handleDeleteConnection(fromId, toId) {
    deleteConnectionLogic(fromId, toId);
    if (window.selectedNode) renderOptionsPanel(window.selectedNode);
}