// live gemini/gamebook_canvas.js
// ─── LIBROJUEGO STUDIO: CANVAS & FÍSICAS (gamebook_canvas.js) ─────────────────

Object.assign(window.gamebookUI, {
    // Físicas del lienzo
    zoom: 1, panX: 0, panY: 0,
    isPanning: false, panStartX: 0, panStartY: 0,
    // Físicas de nodos
    isDragging: false, dragNodeId: null, dragStartX: 0, dragStartY: 0,
    nodeStartX: 0, nodeStartY: 0, _boundWheel: null,

    initCanvas() {
        const container = document.getElementById('gbCanvasContainer');
        if (!this._boundWheel) {
            this._boundWheel = this.onWheel.bind(this);
            container.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));
            container.addEventListener('mousemove', this.onMouseMove.bind(this));
            container.addEventListener('mouseup', this.onMouseUp.bind(this));
            container.addEventListener('mouseleave', this.onMouseUp.bind(this));
            container.addEventListener('wheel', this._boundWheel, { passive: false });
        }
        if (typeof makeDraggable === 'function') {
            makeDraggable(document.getElementById('gamebookModal'), document.getElementById('gbModalHeader'));
        }
    },

    onWheel(e) {
        e.preventDefault();
        const zoomIntensity = 0.001;
        const wheel = e.deltaY < 0 ? 1 : -1;
        let newZoom = this.zoom + (wheel * zoomIntensity * Math.abs(e.deltaY));
        this.zoom = Math.max(0.1, Math.min(newZoom, 2));
        this.applyPan();
    },

    applyPan() {
        const transformStr = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        document.getElementById('gbNodes').style.transform = transformStr;
        document.getElementById('gbEdges').style.transform = transformStr;
    },

    resetView() {
        this.panX = 0; this.panY = 0; this.zoom = 1;
        this.applyPan();
    },

    autoLayout() {
        if (!this.data.nodes || this.data.nodes.length === 0) return;
        const nodes = this.data.nodes;

        // 1. Calcular grados de entrada (inDegree) para encontrar los nodos raíz
        let inDegree = {};
        nodes.forEach(n => inDegree[n.id] = 0);
        nodes.forEach(n => {
            if (n.choices) {
                n.choices.forEach(c => {
                    if (inDegree[c.targetId] !== undefined) {
                        inDegree[c.targetId]++;
                    }
                });
            }
        });

        // Los nodos sin entradas son raíces. Si todo es un bucle, tomamos el primer nodo.
        let roots = nodes.filter(n => inDegree[n.id] === 0);
        if (roots.length === 0 && nodes.length > 0) roots = [nodes[0]];

        // 2. Búsqueda en Anchura (BFS) para asignar profundidades sin caer en bucles infinitos
        let depths = {};
        nodes.forEach(n => depths[n.id] = -1); // -1 significa no visitado
        
        let queue = roots.map(r => ({ node: r, depth: 0 }));
        queue.forEach(q => depths[q.node.id] = 0);

        while (queue.length > 0) {
            let current = queue.shift();
            if (current.node.choices) {
                current.node.choices.forEach(c => {
                    let targetNode = nodes.find(n => n.id === c.targetId);
                    // Solo asignamos profundidad la primera vez que tocamos el nodo
                    if (targetNode && depths[targetNode.id] === -1) {
                        depths[targetNode.id] = current.depth + 1;
                        queue.push({ node: targetNode, depth: current.depth + 1 });
                    }
                });
            }
        }

        // Si quedaron nodos huérfanos sin conectar, los ponemos en la primera columna
        nodes.forEach(n => {
            if (depths[n.id] === -1) depths[n.id] = 0;
        });

        // 3. Agrupar en columnas y asignar coordenadas físicas
        const cols = {};
        nodes.forEach(n => {
            const d = depths[n.id];
            if (!cols[d]) cols[d] = [];
            cols[d].push(n);
        });

        const startX = 50;
        const gapX = 300; 
        const gapY = 140; 

        // Calcular la altura máxima para centrar dinámicamente
        let maxColNodes = 0;
        Object.keys(cols).forEach(d => {
            if (cols[d].length > maxColNodes) maxColNodes = cols[d].length;
        });
        const maxColHeight = maxColNodes * gapY;

        Object.keys(cols).forEach(d => {
            const colNodes = cols[d];
            const colHeight = colNodes.length * gapY;
            const startY = 50 + (maxColHeight - colHeight) / 2;

            colNodes.forEach((n, idx) => {
                n.x = startX + (parseInt(d) * gapX);
                n.y = startY + (idx * gapY);
            });
        });

        this.resetView();
        this.render();
        this.autoSave();
        if (typeof showToast === 'function') showToast('Nodos ordenados (Algoritmo BFS aplicado) ✨', 'success');
    },

    renderNodes() {
        const container = document.getElementById('gbNodes');
        container.innerHTML = '';

        if (!this.data.nodes) this.data.nodes = [];

        this.data.nodes.forEach(node => {
            const el = document.createElement('div');
            const isSelected = this.selectedNodeId === node.id;
            
            el.className = `gb-node ${isSelected ? 'selected' : ''}`;
            el.id = `gb-node-dom-${node.id}`;
            el.style.left = `${node.x || 0}px`;
            el.style.top = `${node.y || 0}px`;
            
            const choicesCount = node.choices ? node.choices.length : 0;
            const previewText = node.text ? node.text.substring(0, 90) + '...' : 'Sin texto...';

            let imgHtml = '';
            if (node._cachedImageUrl) {
                imgHtml = `<div class="gb-node-image" style="background-image: url('${node._cachedImageUrl}')"></div>`;
            }

            el.innerHTML = `
                <div class="gb-node-header">
                    <span class="gb-node-title">${node.id}</span>
                    <span class="gb-node-badge">${choicesCount} opt</span>
                </div>
                ${imgHtml}
                <div class="gb-node-text">${previewText}</div>
            `;

            el.addEventListener('mousedown', (e) => this.onNodeMouseDown(e, node.id));
            container.appendChild(el);
        });
    },

    renderEdges() {
        const svg = document.getElementById('gbEdges');
        const markerColor = '#888888';
        
        let defs = `
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="${markerColor}" />
                </marker>
            </defs>
        `;
        let paths = '';

        let outCount = {};
        let inCount = {};
        (this.data.nodes || []).forEach(node => {
            outCount[node.id] = 0;
            if (node.choices) {
                node.choices.forEach(choice => {
                    inCount[choice.targetId] = (inCount[choice.targetId] || 0) + 1;
                });
            }
        });

        let currentIn = {};
        let currentOut = {};

        (this.data.nodes || []).forEach(node => {
            if (node.choices) {
                node.choices.forEach(choice => {
                    const target = this.data.nodes.find(n => n.id === choice.targetId);
                    if (target) {
                        currentOut[node.id] = (currentOut[node.id] || 0) + 1;
                        currentIn[target.id] = (currentIn[target.id] || 0) + 1;

                        const totalOut = node.choices.length;
                        const totalIn = inCount[target.id] || 1;
                        
                        const outIndex = currentOut[node.id];
                        const inIndex = currentIn[target.id];

                        // Separar los puntos de anclaje para evitar superposición
                        const y1Offset = totalOut > 1 ? (outIndex - (totalOut + 1) / 2) * 15 : 0;
                        const y2Offset = totalIn > 1 ? (inIndex - (totalIn + 1) / 2) * 15 : 0;

                        const x1 = (node.x || 0) + 220; 
                        const y1 = (node.y || 0) + 50 + y1Offset;  
                        const x2 = (target.x || 0);
                        const y2 = (target.y || 0) + 50 + y2Offset;

                        let dx = Math.abs(x2 - x1) * 0.6;
                        
                        let cp1x = x1 + dx;
                        let cp1y = y1;
                        let cp2x = x2 - dx;
                        let cp2y = y2;

                        // Curvas dinámicas con topes de seguridad (para que no salgan de la pantalla)
                        if (x1 > x2) {
                            // Conexión en retroceso (bucle circular)
                            const swing = Math.min(Math.abs(x1 - x2) * 0.2, 200);
                            cp1x = x1 + 80;
                            cp1y = y1 + 100 + swing;
                            cp2x = x2 - 80;
                            cp2y = y2 + 100 + swing;
                        } else if (x2 - x1 > 350) {
                            // Salto hacia adelante entre múltiples columnas (curva por arriba)
                            const swing = Math.min((x2 - x1) * 0.15, 250);
                            cp1y -= swing;
                            cp2y -= swing;
                        }

                        paths += `<path class="gb-path" d="M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}" marker-end="url(#arrowhead)" />`;
                    }
                });
            }
        });
        svg.innerHTML = defs + paths;
    },

    onCanvasMouseDown(e) {
        if (e.button !== 0) return;
        this.isPanning = true;
        this.panStartX = e.clientX - this.panX;
        this.panStartY = e.clientY - this.panY;
    },

    onNodeMouseDown(e, id) {
        if (e.button !== 0) return;
        e.stopPropagation(); 
        
        this.selectedNodeId = id;
        this.updateEditorPanel();
        
        document.querySelectorAll('.gb-node').forEach(el => el.classList.remove('selected'));
        const activeNode = document.getElementById(`gb-node-dom-${id}`);
        if(activeNode) activeNode.classList.add('selected');
        
        this.isDragging = true;
        this.dragNodeId = id;
        
        const node = this.data.nodes.find(n => n.id === id);
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.nodeStartX = node.x || 0;
        this.nodeStartY = node.y || 0;
    },

    onMouseMove(e) {
        if (this.isPanning) {
            this.panX = e.clientX - this.panStartX;
            this.panY = e.clientY - this.panStartY;
            this.applyPan();
            return;
        }

        if (this.isDragging && this.dragNodeId) {
            const node = this.data.nodes.find(n => n.id === this.dragNodeId);
            if (node) {
                const dx = (e.clientX - this.dragStartX) / this.zoom;
                const dy = (e.clientY - this.dragStartY) / this.zoom;
                node.x = this.nodeStartX + dx;
                node.y = this.nodeStartY + dy;
                
                const domNode = document.getElementById(`gb-node-dom-${node.id}`);
                if (domNode) {
                    domNode.style.left = `${node.x}px`;
                    domNode.style.top = `${node.y}px`;
                }
                this.renderEdges();
            }
        }
    },

    onMouseUp() {
        if (this.isDragging) {
            this.autoSave(); 
        }
        this.isDragging = false;
        this.dragNodeId = null;
        this.isPanning = false;
    }
});