// --- UI-NODES.JS ---
// Gestión de Nodos, Drag & Drop y Movimiento (CORE)

// Inicializamos el registro de renderizadores
window.UI.NodeRenderers = {};

Object.assign(window.UI, {
    // --- ARRASTRAR DESDE SIDEBAR (Drag & Drop) ---
    setupDragDrop() {
        const items = document.querySelectorAll('.node-draggable');
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('type', item.dataset.type);
            });
        });

        this.canvas.addEventListener('dragover', (e) => e.preventDefault());

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            if (type) {
                // Calcular posición correcta en el mundo (considerando zoom/pan)
                const pos = this.getCanvasWorldPos(e.clientX, e.clientY);
                const node = Logic.createNode(type, pos.x, pos.y);
                this.renderNode(node);
            }
        });
    },

    // --- NODOS ---
    setupNodeInteractions() {
        // Los eventos se asignan dinámicamente en renderNode
    },

    renderNode(node) {
        // Verificamos si existe un renderizador específico para este tipo
        const renderer = this.NodeRenderers[node.type];
        if (!renderer) {
            console.error(`No renderer found for type: ${node.type}`);
            return;
        }

        const el = document.createElement('div');
        el.id = node.id;
        el.className = 'koreh-node';
        el.dataset.type = node.type;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;

        // Delegamos el contenido y la etiqueta al archivo específico del nodo
        const content = renderer.render(node);
        const label = renderer.label || node.type.toUpperCase();
        
        el.innerHTML = `
            <div class="node-header" onmousedown="UI.startNodeDrag(event, '${node.id}')">
                <span>${label}</span>
                <button onclick="UI.deleteNode('${node.id}')" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="node-body">
                ${content}
            </div>
        `;

        // Añadir puerto de entrada si corresponde
        if (node.inputs.length > 0) {
            const pIn = document.createElement('div');
            pIn.className = 'port port-in';
            pIn.dataset.port = 'in_1';
            pIn.onmouseup = (e) => this.finishConnection(e, node.id, 'in_1');
            el.appendChild(pIn);
        }

        // Añadir puerto de salida si corresponde
        if (node.outputs.length > 0) {
            const pOut = document.createElement('div');
            pOut.className = 'port port-out';
            pOut.dataset.port = 'out_1';
            pOut.onmousedown = (e) => this.startConnection(e, node.id, 'out_1');
            el.appendChild(pOut);
        }

        this.nodesLayer.appendChild(el);
        this.bindNodeInputs(node);
    },

    bindNodeInputs(node) {
        const el = document.getElementById(node.id);
        const inputs = el.querySelectorAll('input, textarea, select');
        inputs.forEach(inp => {
            // Vinculación genérica basada en data-key
            // CORRECCION CHECKBOX: Detectar si es checkbox para guardar 'checked' en vez de 'value'
            inp.addEventListener('input', (e) => {
                if (e.target.type === 'checkbox') {
                    node.data[e.target.dataset.key] = e.target.checked;
                } else {
                    node.data[e.target.dataset.key] = e.target.value;
                }
            });
            // Evitar arrastrar el nodo si escribimos en el input
            inp.addEventListener('mousedown', (e) => e.stopPropagation()); 
        });
    },

    deleteNode(id) {
        Logic.removeNode(id);
        const el = document.getElementById(id);
        if (el) el.remove();
    },

    // --- MOVER NODOS ---
    startNodeDrag(e, id) {
        e.stopPropagation();
        this.draggedNodeId = id;
        
        const el = document.getElementById(id);
        const rect = el.getBoundingClientRect();
        
        // Guardar offset visual (screen pixels)
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        
        this._boundNodeMove = this.onNodeMove.bind(this);
        this._boundNodeUp = this.onNodeUp.bind(this);

        window.addEventListener('mousemove', this._boundNodeMove);
        window.addEventListener('mouseup', this._boundNodeUp);
    },

    onNodeMove(e) {
        if (!this.draggedNodeId) return;
        const el = document.getElementById(this.draggedNodeId);
        
        // Convertir ratón actual a coordenadas mundo
        const mouseWorld = this.getCanvasWorldPos(e.clientX, e.clientY);
        
        // Ajustar el offset escalado por el zoom
        const offsetWorldX = this.dragOffset.x / this.view.zoom;
        const offsetWorldY = this.dragOffset.y / this.view.zoom;

        const newX = mouseWorld.x - offsetWorldX;
        const newY = mouseWorld.y - offsetWorldY;

        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
        
        const node = Logic.nodes.find(n => n.id === this.draggedNodeId);
        if(node) { node.x = newX; node.y = newY; }

        this.renderConnections();
    },

    onNodeUp() {
        this.draggedNodeId = null;
        if (this._boundNodeMove) window.removeEventListener('mousemove', this._boundNodeMove);
        if (this._boundNodeUp) window.removeEventListener('mouseup', this._boundNodeUp);
    }
});