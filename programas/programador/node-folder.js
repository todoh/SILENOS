NodeRegistry.register('folder', {
    label: 'SALIDA CARPETA',
    inputs: ['in_1'], // En realidad acepta múltiples, pero Logic lo gestiona
    outputs: [],
    defaults: { handle: null, pathName: "Seleccionar Carpeta", filename: "resultado" },

    render: (node) => {
        return `
            <div class="flex flex-col gap-2">
                <button class="btn-nordic w-full flex justify-between items-center" onclick="UI.openFolderSelect('${node.id}')">
                    <span class="truncate w-20">${node.data.pathName}</span>
                    <i class="fa-solid fa-folder"></i>
                </button>
                <input class="node-input" value="${node.data.filename}" data-key="filename" placeholder="Nombre archivo">
            </div>`;
    },

    execute: async (node, _ignore, logic) => {
        if (!node.data.handle) throw new Error("Carpeta no seleccionada en el nodo.");
        
        // Obtener TODAS las conexiones entrantes (es un nodo colector)
        const incomingConnections = logic.getIncomingConnections(node.id);
        if (incomingConnections.length === 0) throw new Error("Carpeta vacía. Conecta algo.");

        window.app.log(`Guardando ${incomingConnections.length} elementos...`);
        
        // Procesar y guardar cada conexión
        for (const conn of incomingConnections) {
            const dataToSave = await logic.processNode(conn.from);
            await saveToFolderInternal(node, dataToSave);
        }
        return true; 
    }
});

// Helper privado para este archivo (o podría ser método del objeto)
async function saveToFolderInternal(node, content) {
    const handle = node.data.handle;
    const prefix = node.data.filename || "resultado";
    
    try {
        let filename, blob;
        const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        if (typeof content === 'string') {
            filename = `${prefix}_${uniqueSuffix}.json`;
            const jsonContent = JSON.stringify({ content: content, date: new Date() }, null, 2);
            blob = new Blob([jsonContent], { type: 'application/json' });
        } else if (content instanceof Blob) {
            const ext = content.type.split('/')[1] || 'png';
            filename = `${prefix}_${uniqueSuffix}.${ext}`;
            blob = content;
        } else {
             throw new Error("Formato de datos no soportado para guardar.");
        }

        const fileHandle = await handle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        window.app.log(`Guardado en disco: ${filename}`, "success");

    } catch (e) {
        throw new Error(`Fallo I/O: ${e.message}`);
    }
}