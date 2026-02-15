// --- LOGIC.JS ---

window.Logic = {
    nodes: [],
    connections: [],
    nodeCounter: 0,
    isExecuting: false,

    init() {
        // Setup inicial (puede cargar un grafo guardado en v2)
    },

    createNode(type, x, y) {
        this.nodeCounter++;
        const id = `node_${this.nodeCounter}`;
        
        const node = {
            id: id,
            type: type,
            x: x,
            y: y,
            data: this.getDefaultData(type),
            inputs: this.getInputsForType(type),
            outputs: this.getOutputsForType(type)
        };

        this.nodes.push(node);
        return node;
    },

    getDefaultData(type) {
        switch(type) {
            case 'input': return { value: "Escribe tu prompt aquí..." };
            case 'ai-text': return { model: "openai-large", system: "Eres un asistente útil." };
            // ACTUALIZADO: Defaults para ratio y chroma
            case 'ai-image': return { model: "flux", ratio: "landscape", chroma: false };
            case 'folder': return { handle: null, pathName: "Seleccionar Carpeta", filename: "resultado" };
            default: return {};
        }
    },

    getInputsForType(type) {
        if (type === 'input') return [];
        return ['in_1']; // Estándar 1 entrada para simplificar v1
    },

    getOutputsForType(type) {
        if (type === 'folder') return [];
        return ['out_1'];
    },

    removeNode(id) {
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.connections = this.connections.filter(c => c.from !== id && c.to !== id);
        UI.renderConnections(); // Refresh cables
    },

    // NUEVO: Borrar cable específico (usado por clic derecho)
    removeConnectionObject(connectionObj) {
        this.connections = this.connections.filter(c => c !== connectionObj);
        window.app.log("Cable desconectado.", "info");
        UI.renderConnections();
    },

    addConnection(fromId, fromPort, toId, toPort) {
        // Evitar duplicados y bucles básicos
        const exists = this.connections.find(c => c.to === toId && c.toPort === toPort);
        if (exists) {
            // Reemplazar conexión existente en el puerto de entrada (solo 1 cable por entrada)
            this.connections = this.connections.filter(c => c !== exists);
        }
        if (fromId === toId) return; // No auto-conexión

        this.connections.push({ from: fromId, fromPort, to: toId, toPort });
        window.app.log(`Conectado: ${fromId} -> ${toId}`);
    },

    // --- EJECUCIÓN DEL FLUJO ---
    async executeFlow() {
        if (this.isExecuting) return;
        this.isExecuting = true;
        window.app.log("Iniciando ejecución...", "info");
        
        const btn = document.getElementById('btn-execute');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PROCESANDO';

        try {
            // 1. Encontrar nodos finales (Folders)
            const targets = this.nodes.filter(n => n.type === 'folder');
            if (targets.length === 0) throw new Error("No hay nodos de SALIDA (Carpeta).");

            // 2. Ejecutar hacia atrás (Pull)
            for (const target of targets) {
                await this.processNode(target.id);
            }
            
            window.app.log("Ejecución completada.", "success");

        } catch (e) {
            console.error(e);
            window.app.log(`Error: ${e.message}`, "error");
        } finally {
            this.isExecuting = false;
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-play text-[10px]"></i> EJECUTAR FLUJO';
        }
    },

    async processNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) throw new Error(`Nodo ${nodeId} perdido.`);

        // Resolver input (si tiene)
        let inputData = null;
        if (node.inputs.length > 0) {
            const conn = this.connections.find(c => c.to === nodeId);
            if (conn) {
                // Recursividad: Procesar el nodo anterior
                inputData = await this.processNode(conn.from);
            }
        }

        // Ejecutar lógica según tipo
        window.app.log(`Procesando ${node.type} (${node.id})...`);
        
        switch (node.type) {
            case 'input':
                return node.data.value; // Retorna string

            case 'ai-text':
                if (!inputData) throw new Error("Generador de texto necesita entrada.");
                return await AIText.generate(inputData, node.data); // Retorna string

            case 'ai-image':
                if (!inputData) throw new Error("Generador de imagen necesita prompt.");
                return await AIImage.generate(inputData, node.data); // Retorna Blob/Base64

            case 'folder':
                if (!inputData) throw new Error("Carpeta vacía. Conecta algo.");
                if (!node.data.handle) throw new Error("Carpeta no seleccionada en el nodo.");
                await this.saveToFolder(node, inputData);
                return true;
        }
    },

    async saveToFolder(node, content) {
        const handle = node.data.handle;
        const prefix = node.data.filename || "resultado";
        
        try {
            let filename, blob;

            if (typeof content === 'string') {
                // Es Texto -> JSON
                filename = `${prefix}_${Date.now()}.json`;
                const jsonContent = JSON.stringify({ content: content, date: new Date() }, null, 2);
                blob = new Blob([jsonContent], { type: 'application/json' });
            } else if (content instanceof Blob) {
                // Es Imagen -> PNG/JPG
                const ext = content.type.split('/')[1] || 'png';
                filename = `${prefix}_${Date.now()}.${ext}`;
                blob = content;
            } else {
                 throw new Error("Formato de datos no soportado para guardar.");
            }

            const fileHandle = await handle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            window.app.log(`Guardado: ${filename}`, "success");

        } catch (e) {
            throw new Error(`Fallo al guardar en disco: ${e.message}`);
        }
    }
};