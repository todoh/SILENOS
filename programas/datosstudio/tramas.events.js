/**
 * TRAMAS EVENTS - Manejador de interacciones y entrada
 */
const TramasEvents = {
    init() {
        const canvas = window.TramasCanvas.canvas;
        canvas.addEventListener('mousedown', e => this.handleMouseDown(e));
        window.addEventListener('mousemove', e => this.handleMouseMove(e));
        window.addEventListener('mouseup', e => this.handleMouseUp(e));
        canvas.addEventListener('wheel', e => this.handleWheel(e), { passive: false });
        window.addEventListener('keydown', e => this.handleKeyDown(e));
        
        // Manejador de Doble Clic para invocar la IA en el nodo específico
        canvas.addEventListener('dblclick', e => this.handleDoubleClick(e));
    },

    handleDoubleClick(e) {
        if (!window.app?.tramas) return;
        const state = window.TramasState;
        const config = window.TramasConfig;
        const rect = window.TramasCanvas.canvas.getBoundingClientRect();
        const worldPos = state.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

        const nodes = app.tramas.filter(n => n.type !== 'Region');
        let clickedNode = null;

        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            if (worldPos.x >= node.x && worldPos.x <= node.x + config.nodeWidth && worldPos.y >= node.y && worldPos.y <= node.y + config.nodeHeight) {
                clickedNode = node; break;
            }
        }

        // Si hacemos doble clic en un nodo de evento, abrimos el modal de IA
        if (clickedNode && window.TramasUI) {
            window.TramasUI.openExpandModal(clickedNode.id);
        }
    },

    handleMouseDown(e) {
        if (!window.app?.tramas) return;
        const state = window.TramasState;
        const config = window.TramasConfig;
        const rect = window.TramasCanvas.canvas.getBoundingClientRect();
        const worldPos = state.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

        let clickedNode = null;
        let clickedPort = null;
        const nodes = app.tramas.filter(n => n.type !== 'Region');
        const regions = app.tramas.filter(n => n.type === 'Region');

        // 1. Buscar colisiones en nodos primero
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            const port = window.TramasConnections.getPortAt(worldPos.x, worldPos.y, node, config.nodeWidth, config.nodeHeight);
            if (port) { clickedPort = port; clickedNode = node; break; }
            if (worldPos.x >= node.x && worldPos.x <= node.x + config.nodeWidth && worldPos.y >= node.y && worldPos.y <= node.y + config.nodeHeight) {
                clickedNode = node; break;
            }
        }

        // 2. Buscar en regiones (solo cabecera de 40px)
        if (!clickedNode) {
            for (let i = regions.length - 1; i >= 0; i--) {
                const r = regions[i];
                if (worldPos.x >= r.x && worldPos.x <= r.x + (r.width || 600) && worldPos.y >= r.y && worldPos.y <= r.y + 40) {
                    clickedNode = r; break;
                }
            }
        }

        // --- MANEJO DE CLIC DERECHO ---
        if (e.button === 2) {
            e.preventDefault(); // CORRECCIÓN: Evitar que se dispare el menú contextual del navegador
            
            if (clickedNode && clickedNode.type !== 'Region') {
                // Si el clic derecho cae sobre un nodo, abrimos el modal de IA
                if (window.TramasUI) {
                    window.TramasUI.openExpandModal(clickedNode.id);
                }
            } else {
                // Si cae en el vacío, iniciamos la selección múltiple (caja)
                state.isSelecting = true;
                state.selectionStartWorld = { ...worldPos };
                state.selectionCurrentWorld = { ...worldPos };
                if (!e.shiftKey) state.selectedNodes.clear();
                window.TramasUI.closeInspector();
            }
            return;
        }

        // --- MANEJO DE CLIC IZQUIERDO ---
        if (clickedPort === 'out') {
            state.isConnecting = true;
            state.connectionStartNodeId = clickedNode.id;
        } else if (clickedNode) {
            if (!state.selectedNodes.has(clickedNode.id)) {
                if (!e.shiftKey) state.selectedNodes.clear();
                state.selectedNodes.add(clickedNode.id);
            }
            state.isDraggingNode = true;
            state.draggedNodeId = clickedNode.id;
            if (state.selectedNodes.size === 1) window.TramasUI.openInspector(clickedNode.id);
        } else {
            // Check para borrar conexiones
            const conn = window.TramasConnections.getHoveredConnection(worldPos.x, worldPos.y, nodes, config.nodeWidth, config.nodeHeight);
            if (conn) {
                const from = nodes.find(n => n.id === conn.from);
                from.connections = from.connections.filter(id => id !== conn.to);
                app.saveTramas();
            } else {
                state.isDraggingCanvas = true;
                state.selectedNodes.clear();
                window.TramasUI.closeInspector();
            }
        }

        state.lastMouseX = e.clientX - rect.left;
        state.lastMouseY = e.clientY - rect.top;
        window.TramasCanvas.render();
    },

    handleMouseMove(e) {
        const state = window.TramasState;
        const config = window.TramasConfig;
        const rect = window.TramasCanvas.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = state.screenToWorld(mouseX, mouseY);

        const dx = mouseX - state.lastMouseX;
        const dy = mouseY - state.lastMouseY;

        // Hover de conexiones
        if (!state.isDraggingCanvas && !state.isDraggingNode && !state.isConnecting) {
            const nodes = app.tramas.filter(n => n.type !== 'Region');
            state.hoveredConnection = window.TramasConnections.getHoveredConnection(worldPos.x, worldPos.y, nodes, config.nodeWidth, config.nodeHeight);
        }

        if (state.isSelecting) {
            state.selectionCurrentWorld = worldPos;
        } else if (state.isDraggingCanvas) {
            state.panX += dx;
            state.panY += dy;
        } else if (state.isDraggingNode) {
            const dxW = dx / state.zoom;
            const dyW = dy / state.zoom;
            let moved = new Set();
            
            state.selectedNodes.forEach(id => {
                const n = app.tramas.find(node => node.id === id);
                if (n && !moved.has(n.id)) {
                    n.x += dxW; n.y += dyW; moved.add(n.id);
                    // Mover hijos de Región
                    if (n.type === 'Region') {
                        app.tramas.filter(child => child.type !== 'Region' && 
                            child.x >= n.x - dxW && child.x <= n.x - dxW + (n.width || 600) &&
                            child.y >= n.y - dyW && child.y <= n.y - dyW + (n.height || 400))
                        .forEach(c => { if(!moved.has(c.id)){ c.x += dxW; c.y += dyW; moved.add(c.id); }});
                    }
                }
            });
        }

        state.lastMouseX = mouseX;
        state.lastMouseY = mouseY;
        state.currentMouseX = worldPos.x;
        state.currentMouseY = worldPos.y;
        window.TramasCanvas.render();
    },

    handleMouseUp(e) {
        const state = window.TramasState;
        const config = window.TramasConfig;
        
        // Completar Conexión
        if (state.isConnecting && state.connectionStartNodeId) {
            const rect = window.TramasCanvas.canvas.getBoundingClientRect();
            const worldPos = state.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
            const nodes = app.tramas.filter(n => n.type !== 'Region');
            
            const target = nodes.find(n => n.id !== state.connectionStartNodeId && 
                (window.TramasConnections.getPortAt(worldPos.x, worldPos.y, n, config.nodeWidth, config.nodeHeight) === 'in' ||
                 (worldPos.x >= n.x && worldPos.x <= n.x + config.nodeWidth && worldPos.y >= n.y && worldPos.y <= n.y + config.nodeHeight)));

            if (target) {
                const startNode = nodes.find(n => n.id === state.connectionStartNodeId);
                if (startNode && !startNode.connections.includes(target.id)) {
                    startNode.connections.push(target.id);
                    app.saveTramas();
                }
            }
        }

        if (state.isSelecting) {
            const minX = Math.min(state.selectionStartWorld.x, state.selectionCurrentWorld.x);
            const maxX = Math.max(state.selectionStartWorld.x, state.selectionCurrentWorld.x);
            const minY = Math.min(state.selectionStartWorld.y, state.selectionCurrentWorld.y);
            const maxY = Math.max(state.selectionStartWorld.y, state.selectionCurrentWorld.y);
            app.tramas.forEach(n => {
                const nw = n.width || config.nodeWidth;
                const nh = n.height || config.nodeHeight;
                if (n.x < maxX && n.x + nw > minX && n.y < maxY && n.y + nh > minY) state.selectedNodes.add(n.id);
            });
        }
        
        if (state.isDraggingNode) app.saveTramas();
        state.reset();
        window.TramasCanvas.render();
    },

    handleWheel(e) {
        e.preventDefault();
        const state = window.TramasState;
        const zoomAmount = -e.deltaY * 0.001;
        state.zoom = Math.max(0.2, Math.min(state.zoom + zoomAmount, 3));
        window.TramasCanvas.render();
    },

    handleKeyDown(e) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        if ((e.key === 'Delete' || e.key === 'Backspace') && window.TramasState.selectedNodes.size > 0) {
            window.TramasUI.deleteCurrentOmega();
        }
    }
};

window.TramasEvents = TramasEvents;