// --- LOGIC.JS ---
// Motor de Ejecución Genérico y Gestión del Grafo

window.Logic = {
    nodes: [],
    connections: [],
    nodeCounter: 0,
    isExecuting: false,

    init() {
        console.log("Logic Engine (Modular) Initialized");
    },

    // --- SERIALIZACIÓN ---

    serializeState() {
        return {
            app: "koreh-blueprint",
            version: "1.4", // Versión modular
            timestamp: new Date().toISOString(),
            nodeCounter: this.nodeCounter,
            nodes: this.nodes.map(n => {
                const safeData = { ...n.data };
                // Eliminamos handles de FileSystem al serializar por seguridad/compatibilidad
                if (safeData.handle) delete safeData.handle; 
                return {
                    id: n.id,
                    type: n.type,
                    x: n.x,
                    y: n.y,
                    data: safeData
                };
            }),
            connections: this.connections
        };
    },

    loadState(data) {
        if (!data || !data.nodes) throw new Error("Archivo de plano inválido.");

        this.nodes = [];
        this.connections = [];
        this.nodeCounter = data.nodeCounter || 0;

        // Restaurar nodos usando el Registro para inputs/outputs correctos
        data.nodes.forEach(n => {
            const def = NodeRegistry.get(n.type);
            
            // Reconstruir estructura en memoria
            const node = {
                id: n.id,
                type: n.type,
                x: n.x,
                y: n.y,
                data: n.data || {},
                inputs: def.inputs || [], // Usar definición actual
                outputs: def.outputs || [],
                cachedResult: null
            };
            this.nodes.push(node);
        });

        this.connections = data.connections || [];

        if(window.UI && window.UI.clearCanvas) UI.clearCanvas();
        this.nodes.forEach(n => UI.renderNode(n));
        UI.renderConnections();

        window.app.log(`Plano cargado: ${this.nodes.length} nodos.`, "success");
    },

    // --- GESTIÓN DE NODOS ---

    createNode(type, x, y) {
        const def = NodeRegistry.get(type);
        this.nodeCounter++;
        const id = `node_${this.nodeCounter}`;
        
        // Clonar defaults para no modificar la referencia original
        const initialData = JSON.parse(JSON.stringify(def.defaults || {}));

        const node = {
            id: id,
            type: type,
            x: x,
            y: y,
            data: initialData,
            inputs: def.inputs || [],
            outputs: def.outputs || [],
            cachedResult: null
        };

        this.nodes.push(node);
        return node;
    },

    removeNode(id) {
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.connections = this.connections.filter(c => c.from !== id && c.to !== id);
        UI.renderConnections(); 
    },

    // --- GESTIÓN DE CONEXIONES ---

    removeConnectionObject(connectionObj) {
        this.connections = this.connections.filter(c => c !== connectionObj);
        window.app.log("Cable desconectado.", "info");
        UI.renderConnections();
    },

    addConnection(fromId, fromPort, toId, toPort) {
        const targetNode = this.nodes.find(n => n.id === toId);
        // Ya no hardcodeamos si es 'folder', permitimos lógica genérica de múltiples entradas si el nodo lo soporta
        // Por defecto, asumimos que un puerto de entrada solo acepta un cable, salvo que el diseño del nodo diga lo contrario.
        // Mantenemos la lógica "folder" como caso especial o permitimos múltiple por defecto.
        // Para mantener compatibilidad estricta con tu versión anterior:
        
        const isMultiInput = targetNode && targetNode.type === 'folder'; 

        if (!isMultiInput) {
            const exists = this.connections.find(c => c.to === toId && c.toPort === toPort);
            if (exists) {
                this.connections = this.connections.filter(c => c !== exists);
            }
        }

        const duplicate = this.connections.find(c => c.from === fromId && c.to === toId && c.toPort === toPort);
        if (duplicate) return;

        if (fromId === toId) return;

        this.connections.push({ from: fromId, fromPort, to: toId, toPort });
        window.app.log(`Conectado: ${fromId} -> ${toId}`);
    },

    // --- EJECUCIÓN (CORE ENGINE) ---

    async executeFlow() {
        if (this.isExecuting) return;
        this.isExecuting = true;
        
        this.nodes.forEach(n => n.cachedResult = null);

        window.app.log("Iniciando ejecución modular...", "info");
        const btn = document.getElementById('btn-execute');
        if(btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PROCESANDO';
        }

        try {
            // Buscamos nodos que NO tengan salidas (nodos finales) o explícitamente marcados como objetivos
            // En la versión anterior eran 'folder' o 'viewer'. Ahora buscamos nodos sin outputs o que el registro los marque.
            // Para mantener compatibilidad con tus archivos existentes:
            const targets = this.nodes.filter(n => n.type === 'folder' || n.type === 'viewer');
            
            if (targets.length === 0) throw new Error("No hay nodos de SALIDA (Carpeta o Visor).");

            window.app.log(`Detectados ${targets.length} objetivos finales.`);

            await Promise.all(targets.map(target => this.processNode(target.id)));
            
            window.app.log("Flujo completado con éxito.", "success");

        } catch (e) {
            console.error(e);
            window.app.log(`Error: ${e.message}`, "error");
        } finally {
            this.isExecuting = false;
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-play text-[10px]"></i> EJECUTAR FLUJO';
            }
        }
    },

    async processNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) throw new Error(`Nodo ${nodeId} perdido.`);

        if (node.cachedResult !== null && node.cachedResult !== undefined) {
            return node.cachedResult;
        }

        // Obtener definición del Registro
        const def = NodeRegistry.get(node.type);

        // Resolución de Entradas (Genérico)
        let inputData = null;
        
        // Si el nodo tiene una entrada estándar 'in_1', intentamos resolverla automáticamente
        if (node.inputs.includes('in_1')) {
            const conn = this.connections.find(c => c.to === nodeId && c.toPort === 'in_1');
            if (conn) {
                inputData = await this.processNode(conn.from);
            }
        }

        window.app.log(`Procesando ${def.label || node.type} (${node.id})...`);
        
        // DELEGACIÓN: Ejecutamos la lógica específica del nodo
        // Pasamos 'this' (Logic) para que el nodo pueda pedir más conexiones si es complejo (como text-fixer)
        const result = await def.execute(node, inputData, this);

        node.cachedResult = result;
        return result;
    },
    
    // Helper para que los nodos busquen inputs específicos (necesario para text-fixer)
    async getInputData(nodeId, portName) {
        const conn = this.connections.find(c => c.to === nodeId && c.toPort === portName);
        if (conn) {
            return await this.processNode(conn.from);
        }
        return null;
    },
    
    // Helper para obtener todas las conexiones entrantes (necesario para folder)
    getIncomingConnections(nodeId) {
        return this.connections.filter(c => c.to === nodeId);
    }
};