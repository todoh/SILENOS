/* SILENOS 3/prog-runtime.js */
class ProgRuntime {
    constructor(graph) {
        this.graph = graph;
        this.vars = {};
        this.buffers = {};
        this.gateInputs = {};
        this.nodeStates = {}; // Memoria para estados de inputs múltiples
        this.isRunning = false;
        this.isStopped = false; // [NUEVO] Bandera de parada manual
        this.overrides = {}; 
    }

    // [NUEVO] Método para forzar la detención
    stop() {
        if (this.isRunning) {
            this.isStopped = true;
            this.isRunning = false;
            this.graph.log("⏹ Ejecución detenida manualmente.");
            
            // Limpiar indicadores visuales de ejecución en el DOM
            document.querySelectorAll('.prog-node.executing').forEach(el => {
                el.classList.remove('executing');
            });
        }
    }

    async run(overrides = {}) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isStopped = false; // Resetear bandera
        
        // Resetear estados
        this.vars = {}; 
        this.buffers = {}; 
        this.gateInputs = {};
        this.nodeStates = {}; 
        
        this.overrides = overrides;
        
        const startNode = this.graph.nodes.find(n => n.type === 'start');
        if (!startNode) {
            this.graph.log("❌ Error: Falta nodo de Inicio");
            this.isRunning = false;
            return;
        }

        this.graph.log("▶ Ejecución iniciada");
        try {
            let initialInput = null;
            if (this.overrides['GLOBAL_INPUT']) initialInput = this.overrides['GLOBAL_INPUT'];

            await this.executeNode(startNode, initialInput);
            
            // Solo loguear completado si no fue detenido manualmente
            if (!this.isStopped) {
                this.graph.log("✅ Completado");
            }
        } catch (e) { 
            this.graph.log(`❌ Error: ${e.message}`); 
        } finally {
            this.isRunning = false;
        }
    }

    async executeNode(node, inputData = null, incomingPort = 'in') {
        // [NUEVO] Comprobación crítica: Si se ha pulsado STOP, cortamos aquí.
        if (this.isStopped) return;

        if (node.element) node.element.classList.add('executing');
        
        const def = NODE_REGISTRY[node.type];
        let outputData = inputData;
        let selectedBranch = null;

        // Lógica específica para compuertas nativas
        if (node.type === 'logic-gate') {
            if (!this.gateInputs[node.id]) this.gateInputs[node.id] = {};
            this.gateInputs[node.id][incomingPort] = (inputData !== null && inputData !== "");
        }

        const defaultFields = this.graph.extractNodeValues(node);
        const nodeOverrides = this.overrides[node.id] || {};
        const finalFields = { ...defaultFields, ...nodeOverrides };

        const ctx = {
            input: inputData,
            port: incomingPort,
            nodeId: node.id,
            fields: finalFields,
            log: (m) => this.graph.log(m),
            setBranch: (b) => selectedBranch = b,
            runtime: this,
            graph: this.graph
        };

        if (def && def.execute) {
            try {
                // Comprobamos de nuevo antes de ejecutar lógica pesada (como IA)
                if (this.isStopped) {
                    if (node.element) node.element.classList.remove('executing');
                    return;
                }

                outputData = await def.execute(ctx);
            } catch (err) {
                 this.graph.log(`Error en nodo ${node.type}: ${err.message}`);
                 throw err; // Propagar error para detener ejecución
            }
            
            if (outputData === null && node.type !== 'start') {
                if (node.element) node.element.classList.remove('executing');
                return;
            }
        }

        if (node.type === 'book-export') {
            this.handleBookExport(node, inputData, incomingPort);
        }
        if (node.type === 'json-export') {
            this.handleJsonExport(node, inputData, incomingPort);
        }

        // Pequeña pausa visual
        await new Promise(r => setTimeout(r, 50));
        
        if (node.element) node.element.classList.remove('executing');

        // [NUEVO] Comprobación final antes de seguir a los siguientes nodos
        if (this.isStopped) return;

        let outConns = this.graph.connections.filter(c => c.fromNode === node.id);
        
        // Filtro Legacy para nodos IF/Logic nativos que usan setBranch
        if (selectedBranch) outConns = outConns.filter(c => c.fromPort === selectedBranch);
        
        if (node.type === 'buffer' && incomingPort === 'add') return;

        // Ejecutar siguientes nodos
        await Promise.all(outConns.map(c => {
            // [NUEVO] Check de seguridad dentro del map
            if (this.isStopped) return;

            const next = this.graph.nodes.find(n => n.id === c.toNode);
            if (!next) return;

            // --- LÓGICA DE ROUTING INTELIGENTE (ESTRICTO) ---
            const isRoutingMap = outputData && typeof outputData === 'object' && !Array.isArray(outputData);
            let dataToSend = outputData;

            if (isRoutingMap) {
                if (c.fromPort in outputData) {
                    dataToSend = outputData[c.fromPort];
                } else {
                    return; 
                }
            }
            // ----------------------------------------------

            return this.executeNode(next, dataToSend, c.toPort);
        }));
    }

    handleBookExport(node, data, port) {
        if (!node.bookInstanceId) {
            const book = FileSystem.createBook("Libro Programado", 'desktop');
            node.bookInstanceId = book.id;
        }
        const book = FileSystem.getItem(node.bookInstanceId);
        if (!book) return;

        if (port === 'in-name') book.title = String(data);
        else if (port === 'in-chapter') book.content.chapters.push({ title: "Capítulo", paragraphs: [String(data)] });
        else if (port === 'in-paragraph') {
            if (book.content.chapters.length === 0) book.content.chapters.push({ title: "Capítulo 1", paragraphs: [] });
            book.content.chapters[book.content.chapters.length-1].paragraphs.push(String(data));
        }
        FileSystem.save();
    }

    handleJsonExport(node, data, port) {
        if (!node.dataInstanceId) {
            const newFile = FileSystem.createData("Dato Exportado", { info: "Esperando datos..." }, 'desktop');
            node.dataInstanceId = newFile.id;
        }
        
        const file = FileSystem.getItem(node.dataInstanceId);
        if (!file) return;

        if (port === 'nombre') {
            file.title = String(data);
        } else if (port === 'contenido') {
            if (typeof data === 'object') {
                file.content = data;
            } else {
                try {
                    file.content = JSON.parse(data);
                } catch (e) {
                    file.content = data;
                }
            }
        }
        FileSystem.save();
        if (typeof refreshSystemViews === 'function') refreshSystemViews();
    }
}