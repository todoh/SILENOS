// --- UI-NODES.JS ---
// Gestión Visual de Nodos (Drag & Drop y Renderizado)

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
                const pos = this.getCanvasWorldPos(e.clientX, e.clientY);
                const node = Logic.createNode(type, pos.x, pos.y);
                this.renderNode(node);
            }
        });
    },

    // --- NODOS ---
    setupNodeInteractions() {
        // Configuraciones globales si fueran necesarias
    },

    renderNode(node) {
        // AHORA: Usamos el Registry
        const def = NodeRegistry.get(node.type);

        const el = document.createElement('div');
        el.id = node.id;
        el.className = 'koreh-node';
        el.dataset.type = node.type;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
        
        // Estilos específicos (podrían moverse al registry styles si quisieras ir más allá)
        if (node.type === 'text-fixer') el.style.borderTop = "3px solid #6366f1"; 
        if (node.type === 'ai-text') el.style.borderTop = "3px solid #000";
        if (node.type === 'ai-image') el.style.borderTop = "3px solid #9ca3af";
        if (node.type === 'folder') el.style.borderTop = "3px solid #fbbf24";
        if (node.type === 'input') el.style.borderTop = "3px solid #e5e5e5";
        if (node.type === 'viewer') el.style.borderTop = "3px solid #a855f7";

        // Renderizado del contenido interno
        const content = def.render(node);
        const label = def.label || node.type.toUpperCase();
        
        el.innerHTML = `
            <div class="node-header" onmousedown="UI.startNodeDrag(event, '${node.id}')">
                <span>${label}</span>
                <button onclick="UI.deleteNode('${node.id}')" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="node-body">
                ${content}
            </div>
        `;

        // Renderizado de Puertos (Inputs)
        if (node.inputs && node.inputs.length > 0) {
            node.inputs.forEach((portName, index) => {
                const pIn = document.createElement('div');
                pIn.className = 'port port-in';
                pIn.dataset.port = portName;
                pIn.title = portName;
                
                const total = node.inputs.length;
                const topPercent = ((index + 1) / (total + 1)) * 100;
                pIn.style.top = `${topPercent}%`;
                
                pIn.onmouseup = (e) => this.finishConnection(e, node.id, portName);
                el.appendChild(pIn);
            });
        }

        // Renderizado de Puertos (Outputs)
        if (node.outputs && node.outputs.length > 0) {
            node.outputs.forEach((portName, index) => {
                const pOut = document.createElement('div');
                pOut.className = 'port port-out';
                pOut.dataset.port = portName;
                
                const total = node.outputs.length;
                const topPercent = ((index + 1) / (total + 1)) * 100;
                pOut.style.top = `${topPercent}%`;

                pOut.onmousedown = (e) => this.startConnection(e, node.id, portName);
                el.appendChild(pOut);
            });
        }

        this.nodesLayer.appendChild(el);
        this.bindNodeInputs(node);
    },

    bindNodeInputs(node) {
        const el = document.getElementById(node.id);
        const inputs = el.querySelectorAll('input, textarea, select');
        inputs.forEach(inp => {
            inp.addEventListener('input', (e) => {
                if (e.target.type === 'checkbox') {
                    node.data[e.target.dataset.key] = e.target.checked;
                } else {
                    node.data[e.target.dataset.key] = e.target.value;
                }
            });
            inp.addEventListener('mousedown', (e) => e.stopPropagation()); 
        });
    },

    deleteNode(id) {
        Logic.removeNode(id);
        const el = document.getElementById(id);
        if (el) el.remove();
    },

    // --- MOVER NODOS (Sin cambios) ---
    startNodeDrag(e, id) {
        e.stopPropagation();
        this.draggedNodeId = id;
        
        const el = document.getElementById(id);
        const rect = el.getBoundingClientRect();
        
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
        
        const mouseWorld = this.getCanvasWorldPos(e.clientX, e.clientY);
        
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