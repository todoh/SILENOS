// Archivo: Librojuego/canvas.engine.js

window.Canvas = window.Canvas || {};

Object.assign(window.Canvas, {
    mode: 'classic', // 'classic' o 'map'
    zoom: 1,
    isDragging: false,
    dragNodeId: null,
    dragStartX: 0, dragStartY: 0,
    nodeStartX: 0, nodeStartY: 0,

    isPanning: false,
    panX: 0, panY: 0,
    panStartX: 0, panStartY: 0,

    isRightDragging: false,
    rightDragSourceId: null,
    currentMouseX: 0,
    currentMouseY: 0,
    
    rightClickStartX: 0,
    rightClickStartY: 0,

    // Coordenadas guardadas para crear nodos con click derecho
    clickCanvasX: 0,
    clickCanvasY: 0,

    // Variables Modo Mapa
    isDraggingMapEl: false,
    isResizingArea: false,
    dragMapElId: null,
    dragMapElType: null,

    init() {
        const container = document.getElementById('canvas-container');
        container.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));
        container.addEventListener('mousemove', this.onMouseMove.bind(this));
        container.addEventListener('mouseup', this.onMouseUp.bind(this));
        container.addEventListener('mouseleave', this.onMouseUp.bind(this));
        container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        
        container.addEventListener('contextmenu', e => e.preventDefault());

        // Ocultar menú de canvas al hacer click normal en la pantalla
        document.addEventListener('click', (e) => {
            if (e.button !== 2 && this.hideCanvasMenu) this.hideCanvasMenu();
        });
    },

    centerView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyPan();
    },

    toggleMode() {
        this.mode = this.mode === 'classic' ? 'map' : 'classic';
        const reorderBtn = document.getElementById('btn-reorder-nodes');
        const mapToolbar = document.getElementById('map-toolbar');
        const modeBtn = document.getElementById('btn-canvas-mode');

        if (this.mode === 'map') {
            if(reorderBtn) reorderBtn.classList.add('hidden');
            if(mapToolbar) mapToolbar.classList.remove('hidden');
            modeBtn.innerHTML = '<i class="fa-solid fa-sitemap"></i>';
            modeBtn.classList.add('bg-indigo-600', 'text-white');
            modeBtn.classList.remove('bg-white', 'text-indigo-600');
        } else {
            if(reorderBtn) reorderBtn.classList.remove('hidden');
            if(mapToolbar) mapToolbar.classList.add('hidden');
            modeBtn.innerHTML = '<i class="fa-solid fa-map"></i>';
            modeBtn.classList.remove('bg-indigo-600', 'text-white');
            modeBtn.classList.add('bg-white', 'text-indigo-600');
        }
        this.render();
    },

    onWheel(e) {
        e.preventDefault();
        
        // 1. Obtener la posición del ratón relativa al contenedor
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 2. Calcular en qué punto del "mundo real" (sin escalar) está el ratón
        const worldX = (mouseX - this.panX) / this.zoom;
        const worldY = (mouseY - this.panY) / this.zoom;

        // 3. Calcular la nueva escala de zoom
        const zoomIntensity = 0.001;
        const wheel = e.deltaY < 0 ? 1 : -1;
        let newZoom = this.zoom + (wheel * zoomIntensity * Math.abs(e.deltaY));
        newZoom = Math.max(0.05, Math.min(newZoom, 2));

        // 4. Ajustar el paneo (desplazamiento) para que ese mismo punto del mundo siga bajo el ratón
        this.panX = mouseX - (worldX * newZoom);
        this.panY = mouseY - (worldY * newZoom);

        // 5. Aplicar la escala y mover visualmente
        this.zoom = newZoom;
        this.applyPan();
    },

    applyPan() {
        const transformStr = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        const nodesContainer = document.getElementById('canvas-nodes');
        const edgesContainer = document.getElementById('canvas-edges');
        const mapContainer = document.getElementById('canvas-map-layer');
        
        if (nodesContainer) { nodesContainer.style.transformOrigin = "0 0"; nodesContainer.style.transform = transformStr; }
        if (edgesContainer) { edgesContainer.style.transformOrigin = "0 0"; edgesContainer.style.transform = transformStr; }
        if (mapContainer) { mapContainer.style.transformOrigin = "0 0"; mapContainer.style.transform = transformStr; }
    },

    onCanvasMouseDown(e) {
        // Detectar si el click derecho es en un área vacía (el fondo)
        if (e.button === 2) {
            e.preventDefault();
            if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
            
            // Calculamos la posición real en el lienzo eliminando el paneo y el zoom
            const rect = document.getElementById('canvas-container').getBoundingClientRect();
            const canvasX = ((e.clientX - rect.left) - this.panX) / this.zoom;
            const canvasY = ((e.clientY - rect.top) - this.panY) / this.zoom;
            
            if(this.showCanvasMenu) this.showCanvasMenu(e.clientX, e.clientY, canvasX, canvasY);
            return;
        }

        // Si es un click normal izquierdo, cerramos menús e iniciamos paneo
        if (e.button !== 0) return;
        
        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
        if(this.hideCanvasMenu) this.hideCanvasMenu();

        this.isPanning = true;
        this.panStartX = e.clientX - this.panX;
        this.panStartY = e.clientY - this.panY;
        document.getElementById('canvas-container').style.cursor = 'grabbing';
    },

    onMouseDown(e, id) {
        if (e.button === 2) {
            e.stopPropagation();
            this.isRightDragging = true;
            this.rightDragSourceId = id;
            
            this.rightClickStartX = e.clientX;
            this.rightClickStartY = e.clientY;

            const rect = document.getElementById('canvas-container').getBoundingClientRect();
            this.currentMouseX = ((e.clientX - rect.left) - this.panX) / this.zoom;
            this.currentMouseY = ((e.clientY - rect.top) - this.panY) / this.zoom;
            return;
        }

        if (e.button !== 0) return;
        e.stopPropagation(); 
        
        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
        if(this.hideCanvasMenu) this.hideCanvasMenu();

        Core.selectNode(id);
        this.isDragging = true;
        this.dragNodeId = id;
        
        const node = Core.getNode(id);
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.nodeStartX = node.x;
        this.nodeStartY = node.y;
    },

    onMapElementDown(e, id, type) {
        if (e.button !== 0) return;
        e.stopPropagation();
        if(this.hideCanvasMenu) this.hideCanvasMenu();
        this.isDraggingMapEl = true;
        this.dragMapElId = id;
        this.dragMapElType = type;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        const bookBase = Core.book || Core.bookData || {};
        const elements = bookBase.mapElements || { areas: [], emojis: [] };
        const arr = type === 'area' ? elements.areas : elements.emojis;
        const el = arr.find(a => a.id === id);
        if (el) {
            this.nodeStartX = el.x;
            this.nodeStartY = el.y;
        }
    },

    onResizeDown(e, id) {
        e.stopPropagation();
        if(this.hideCanvasMenu) this.hideCanvasMenu();
        this.isResizingArea = true;
        this.dragMapElId = id;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.mapElements) return;
        const area = bookBase.mapElements.areas.find(a => a.id === id);
        if (area) {
            this.nodeStartX = area.width; 
            this.nodeStartY = area.height; 
        }
    },

    onMouseMove(e) {
        const rect = document.getElementById('canvas-container').getBoundingClientRect();
        this.currentMouseX = ((e.clientX - rect.left) - this.panX) / this.zoom;
        this.currentMouseY = ((e.clientY - rect.top) - this.panY) / this.zoom;

        if (this.isRightDragging) {
            this.renderEdges(); 
            return;
        }

        if (this.isPanning) {
            this.panX = e.clientX - this.panStartX;
            this.panY = e.clientY - this.panStartY;
            this.applyPan();
            return;
        }

        const bookBase = Core.book || Core.bookData || {};

        if (this.isResizingArea && this.dragMapElId) {
            if (!bookBase.mapElements) return;
            const area = bookBase.mapElements.areas.find(a => a.id === this.dragMapElId);
            if (area) {
                const dx = (e.clientX - this.dragStartX) / this.zoom;
                const dy = (e.clientY - this.dragStartY) / this.zoom;
                area.width = Math.max(50, this.nodeStartX + dx);
                area.height = Math.max(50, this.nodeStartY + dy);
                this.renderMapElements();
            }
            return;
        }

        if (this.isDraggingMapEl && this.dragMapElId) {
            if (!bookBase.mapElements) return;
            const arr = this.dragMapElType === 'area' ? bookBase.mapElements.areas : bookBase.mapElements.emojis;
            const el = arr.find(a => a.id === this.dragMapElId);
            if (el) {
                const dx = (e.clientX - this.dragStartX) / this.zoom;
                const dy = (e.clientY - this.dragStartY) / this.zoom;
                el.x = this.nodeStartX + dx;
                el.y = this.nodeStartY + dy;
                this.renderMapElements();
            }
            return;
        }

        if (!this.isDragging || !this.dragNodeId) return;
        const node = Core.getNode(this.dragNodeId);
        if (node) {
            const dx = (e.clientX - this.dragStartX) / this.zoom;
            const dy = (e.clientY - this.dragStartY) / this.zoom;
            
            node.x = this.nodeStartX + dx;
            node.y = this.nodeStartY + dy;
            
            if (!bookBase.nodes) return;
            const el = document.getElementById('canvas-nodes').children[bookBase.nodes.indexOf(node)];
            if(el) {
                el.style.left = `${node.x}px`;
                el.style.top = `${node.y}px`;
            }
            this.renderEdges();
        }
    },

    onMouseUp(e) {
        if (this.isResizingArea || this.isDraggingMapEl) {
            if (Core.scheduleSave) Core.scheduleSave();
            this.isResizingArea = false;
            this.isDraggingMapEl = false;
            this.dragMapElId = null;
            this.dragMapElType = null;
            return;
        }

        if (this.isRightDragging) {
            const dist = Math.hypot(e.clientX - this.rightClickStartX, e.clientY - this.rightClickStartY);
            
            if (dist < 5) {
                this.isRightDragging = false;
                const sourceId = this.rightDragSourceId;
                this.rightDragSourceId = null;
                this.renderEdges();
                document.getElementById('canvas-container').style.cursor = 'default';
                
                Core.selectNode(sourceId);
                if (typeof window.ContextMenu !== 'undefined') {
                    window.ContextMenu.show(e.clientX, e.clientY, sourceId);
                }
                return;
            }

            const rect = document.getElementById('canvas-container').getBoundingClientRect();
            this.currentMouseX = ((e.clientX - rect.left) - this.panX) / this.zoom;
            this.currentMouseY = ((e.clientY - rect.top) - this.panY) / this.zoom;

            const bookBase = Core.book || Core.bookData || {};
            if (bookBase.nodes) {
                const targetNode = bookBase.nodes.find(n => 
                    this.currentMouseX >= n.x && this.currentMouseX <= n.x + 220 &&
                    this.currentMouseY >= n.y && this.currentMouseY <= n.y + 280
                );

                if (targetNode && targetNode.id !== this.rightDragSourceId) {
                    const sourceNode = Core.getNode(this.rightDragSourceId);
                    if (sourceNode) {
                        if (!sourceNode.choices) sourceNode.choices = [];
                        sourceNode.choices.push({ text: "Continuar...", targetId: targetNode.id, effs: [] });
                        if (Core.scheduleSave) Core.scheduleSave();
                        if (typeof Editor !== 'undefined' && Core.selectedNodeId === sourceNode.id) {
                            Editor.loadNode(sourceNode.id);
                        }
                    }
                }
            }

            this.isRightDragging = false;
            this.rightDragSourceId = null;
            this.renderEdges();
            document.getElementById('canvas-container').style.cursor = 'default';
            return;
        }

        if (this.isDragging) if(Core.scheduleSave) Core.scheduleSave(); 
        this.isDragging = false;
        this.dragNodeId = null;
        this.isPanning = false;
        document.getElementById('canvas-container').style.cursor = 'default';
    }
});