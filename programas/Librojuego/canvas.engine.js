// Archivo: Librojuego/canvas.engine.js

window.Canvas = {
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
        const zoomIntensity = 0.001;
        const wheel = e.deltaY < 0 ? 1 : -1;
        let newZoom = this.zoom + (wheel * zoomIntensity * Math.abs(e.deltaY));
        this.zoom = Math.max(0.05, Math.min(newZoom, 2));
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

    render() {
        this.renderMapElements();
        this.renderNodes();
        this.renderEdges();
        this.applyPan();
    },

    renderMapElements() {
        const mapContainer = document.getElementById('canvas-map-layer');
        if (!mapContainer) return;
        mapContainer.innerHTML = '';
        
        if (!Core.book.mapElements) Core.book.mapElements = { areas: [], emojis: [] };
        const elements = Core.book.mapElements;
        
        elements.areas.forEach(area => {
            const el = document.createElement('div');
            el.className = `canvas-area absolute border-2 border-dashed flex items-center justify-center pointer-events-auto ${this.mode === 'map' ? 'cursor-grab hover:border-indigo-500 hover:shadow-lg' : ''}`;
            el.style.left = `${area.x}px`;
            el.style.top = `${area.y}px`;
            el.style.width = `${area.width}px`;
            el.style.height = `${area.height}px`;
            
            // Añadimos la descripción como tooltip
            if (area.description) el.title = area.description;
            
            const hex = area.color || '#3b82f6';
            let r = 59, g = 130, b = 246; 
            if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
                let c = hex.substring(1).split('');
                if(c.length === 3) c= [c[0], c[0], c[1], c[1], c[2], c[2]];
                c= '0x'+c.join('');
                r= (c>>16)&255; g= (c>>8)&255; b= c&255;
            }
            el.style.backgroundColor = `rgba(${r},${g},${b},0.15)`;
            el.style.borderColor = `rgba(${r},${g},${b},0.8)`;
            
            el.innerHTML = `
                <span class="text-3xl font-bold opacity-30 select-none text-center pointer-events-none" style="color: ${hex}">${area.name || ''}</span>
                ${this.mode === 'map' ? `<div class="resize-handle absolute bottom-0 right-0 w-8 h-8 bg-[rgba(${r},${g},${b},0.8)] cursor-se-resize rounded-tl-xl pointer-events-auto hover:scale-110 transition-transform"></div>` : ''}
            `;
            
            if (this.mode === 'map') {
                el.addEventListener('mousedown', (e) => {
                    if (e.target.classList.contains('resize-handle')) {
                        this.onResizeDown(e, area.id);
                    } else {
                        this.onMapElementDown(e, area.id, 'area');
                    }
                });
                el.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.openMapElementModal(area.id, 'area');
                });
            }
            mapContainer.appendChild(el);
        });

        elements.emojis.forEach(marker => {
            const el = document.createElement('div');
            el.className = `canvas-emoji absolute flex flex-col items-center justify-center pointer-events-auto ${this.mode === 'map' ? 'cursor-grab hover:scale-110 transition-transform' : ''}`;
            el.style.left = `${marker.x}px`;
            el.style.top = `${marker.y}px`;
            el.style.transform = `translate(-50%, -50%)`; 
            
            // Añadimos la descripción como tooltip
            if (marker.description) el.title = marker.description;
            
            const size = marker.size || 64;
            const zoneSize = marker.zoneSize !== undefined ? marker.zoneSize : 0;
            
            el.innerHTML = `
                ${zoneSize > 0 ? `<div class="absolute border-2 border-indigo-400/50 border-dashed bg-indigo-400/10 pointer-events-none rounded-xl" style="width: ${zoneSize}px; height: ${zoneSize}px; left: 50%; top: 50%; transform: translate(-50%, -50%);"></div>` : ''}
                <div style="font-size: ${size}px; line-height: 1; z-index: 10;" class="select-none pointer-events-none relative">${marker.emoji || '📍'}</div>
                ${marker.label ? `<div class="bg-black/70 text-white text-[12px] px-3 py-1.5 rounded-lg mt-2 whitespace-nowrap font-bold tracking-widest backdrop-blur-md pointer-events-none relative z-10">${marker.label}</div>` : ''}
            `;
            
            if (this.mode === 'map') {
                el.addEventListener('mousedown', (e) => this.onMapElementDown(e, marker.id, 'emoji'));
                el.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.openMapElementModal(marker.id, 'emoji');
                });
            }
            mapContainer.appendChild(el);
        });
    },

    renderNodes() {
        const container = document.getElementById('canvas-nodes');
        container.innerHTML = '';

        Core.book.nodes.forEach(node => {
            const el = document.createElement('div');
            const isSelected = Core.selectedNodeId === node.id;
            
            const borderClass = node.isPin ? 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border border-[#f3f4f6]';
            
            el.className = `canvas-node pointer-events-auto ${isSelected ? 'selected' : ''} ${borderClass}`;
            el.style.left = `${node.x}px`;
            el.style.top = `${node.y}px`;
            
            let imgHtml = '';
            if (node._cachedImageUrl) {
                imgHtml = `<div class="node-image" style="background-image: url('${node._cachedImageUrl}')"></div>`;
            }

            let writingIndicator = '';
            if (typeof AIEnhancer !== 'undefined' && AIEnhancer.generatingNodes.has(node.id)) {
                writingIndicator = `
                    <div class="absolute top-2 right-2 text-indigo-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md z-20" title="Auto-escribiendo en 2º plano...">
                        <i class="fa-solid fa-pen-nib fa-bounce text-sm"></i>
                    </div>
                `;
            }

            let effectIndicator = '';
            if (node.eff && node.eff.type) {
                let nodeEffStr = node.eff.type === 'item'
                    ? (node.eff.op === 'ADD' ? 'Consigues el objeto ' : 'Pierdes el objeto ') + node.eff.val
                    : (node.eff.op === '+' ? 'Ganas ' : 'Pierdes ') + node.eff.val + ' de ' + node.eff.type;
                effectIndicator = `
                    <div class="absolute top-2 left-2 text-yellow-500 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md z-20" title="Consecuencia al llegar: ${nodeEffStr}">
                        <i class="fa-solid fa-bolt text-xs"></i>
                    </div>
                `;
            }

            let pinIndicator = '';
            if (node.isPin) {
                pinIndicator = `
                    <div class="absolute -top-3 -right-3 text-yellow-600 bg-yellow-100 rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-30 border border-yellow-300" title="Destino: ${node.pinName}">
                        <i class="fa-solid fa-thumbtack"></i>
                    </div>
                `;
            }

            let startIndicator = '';
            if (node.isStartNode) {
                startIndicator = `
                    <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 text-purple-600 bg-purple-100 rounded-full px-3 py-1 flex items-center justify-center shadow-lg z-30 border border-purple-300 text-[10px] font-bold whitespace-nowrap" title="Nodo Inicial">
                        <i class="fa-solid fa-flag mr-1"></i> INICIO
                    </div>
                `;
            }

            el.innerHTML = `
                ${startIndicator}
                ${pinIndicator}
                ${effectIndicator}
                ${writingIndicator}
                ${imgHtml}
                <div class="font-bold text-sm mb-2 truncate ${isSelected ? 'text-white' : 'text-black'}">${node.isPin && node.pinName ? '📍 ' + node.pinName : node.id}</div>
                <div class="node-text-preview">${node.text || 'Sin texto...'}</div>
            `;

            el.addEventListener('mousedown', (e) => this.onMouseDown(e, node.id));
            container.appendChild(el);
        });
    },

    renderEdges() {
        const svg = document.getElementById('canvas-edges');
        let paths = '';

        Core.book.nodes.forEach(node => {
            if (node.choices) {
                node.choices.forEach(choice => {
                    const target = Core.getNode(choice.targetId);
                    if (target) {
                        const x1 = node.x + 110; 
                        const y1 = node.y + 140;  
                        const x2 = target.x + 110;
                        const y2 = target.y + 140;

                        const dx = Math.abs(x2 - x1) * 0.5;
                        paths += `<path class="edge-path" d="M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}" />`;

                        if ((choice.cond && choice.cond.type) || (choice.eff && choice.eff.type)) {
                            const midX = (x1 + x2) / 2;
                            const midY = (y1 + y2) / 2;

                            let badges = '';
                            if (choice.cond && choice.cond.type) {
                                let condStr = choice.cond.type === 'item' 
                                    ? (choice.cond.op === 'HAS' ? 'Tener el objeto ' : 'No tener el objeto ') + choice.cond.val 
                                    : 'Tener ' + (choice.cond.op === '>' ? 'más de ' : (choice.cond.op === '<' ? 'menos de ' : 'exactamente ')) + choice.cond.val + ' de ' + choice.cond.type;
                                badges += `<div style="background:#fee2e2; color:#ef4444; border:1px solid #fca5a5; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; pointer-events:auto;" title="Requisito: ${condStr}"><i class="fa-solid fa-lock"></i></div>`;
                            }
                            if (choice.eff && choice.eff.type) {
                                let effStr = choice.eff.type === 'item'
                                    ? (choice.eff.op === 'ADD' ? 'Consigues el objeto ' : 'Pierdes el objeto ') + choice.eff.val
                                    : (choice.eff.op === '+' ? 'Ganas ' : 'Pierdes ') + choice.eff.val + ' de ' + choice.eff.type;
                                badges += `<div style="background:#dbeafe; color:#3b82f6; border:1px solid #93c5fd; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; pointer-events:auto;" title="Consecuencia: ${effStr}"><i class="fa-solid fa-bolt"></i></div>`;
                            }
                            
                            if (badges) {
                                paths += `
                                <foreignObject x="${midX - 25}" y="${midY - 12}" width="50" height="24">
                                    <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex; justify-content:center; gap:4px; width:100%; height:100%;">
                                        ${badges}
                                    </div>
                                </foreignObject>`;
                            }
                        }
                    }
                });
            }
        });

        if (this.isRightDragging && this.rightDragSourceId) {
            const source = Core.getNode(this.rightDragSourceId);
            if (source) {
                const x1 = source.x + 110;
                const y1 = source.y + 140;
                const x2 = this.currentMouseX;
                const y2 = this.currentMouseY;

                const dx = Math.abs(x2 - x1) * 0.5;
                paths += `<path class="edge-path" style="stroke: #6366f1; stroke-dasharray: 5,5;" d="M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}" />`;
            }
        }

        svg.innerHTML = paths;
    },

    onCanvasMouseDown(e) {
        if (e.button !== 0) return;
        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();

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
        this.isDraggingMapEl = true;
        this.dragMapElId = id;
        this.dragMapElType = type;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        const elements = Core.book.mapElements || { areas: [], emojis: [] };
        const arr = type === 'area' ? elements.areas : elements.emojis;
        const el = arr.find(a => a.id === id);
        this.nodeStartX = el.x;
        this.nodeStartY = el.y;
    },

    onResizeDown(e, id) {
        e.stopPropagation();
        this.isResizingArea = true;
        this.dragMapElId = id;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        const area = Core.book.mapElements.areas.find(a => a.id === id);
        this.nodeStartX = area.width; 
        this.nodeStartY = area.height; 
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

        if (this.isResizingArea && this.dragMapElId) {
            if (!Core.book.mapElements) return;
            const area = Core.book.mapElements.areas.find(a => a.id === this.dragMapElId);
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
            if (!Core.book.mapElements) return;
            const arr = this.dragMapElType === 'area' ? Core.book.mapElements.areas : Core.book.mapElements.emojis;
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
            
            const el = document.getElementById('canvas-nodes').children[Core.book.nodes.indexOf(node)];
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

            const targetNode = Core.book.nodes.find(n => 
                this.currentMouseX >= n.x && this.currentMouseX <= n.x + 220 &&
                this.currentMouseY >= n.y && this.currentMouseY <= n.y + 280
            );

            if (targetNode && targetNode.id !== this.rightDragSourceId) {
                const sourceNode = Core.getNode(this.rightDragSourceId);
                if (sourceNode) {
                    if (!sourceNode.choices) sourceNode.choices = [];
                    sourceNode.choices.push({ text: "Continuar...", targetId: targetNode.id });
                    if (Core.scheduleSave) Core.scheduleSave();
                    if (typeof Editor !== 'undefined' && Core.selectedNodeId === sourceNode.id) {
                        Editor.loadNode(sourceNode.id);
                    }
                }
            }

            this.isRightDragging = false;
            this.rightDragSourceId = null;
            this.renderEdges();
            document.getElementById('canvas-container').style.cursor = 'default';
            return;
        }

        if (this.isDragging) Core.scheduleSave(); 
        this.isDragging = false;
        this.dragNodeId = null;
        this.isPanning = false;
        document.getElementById('canvas-container').style.cursor = 'default';
    },

    reorderNodes() {
        if (!Core.book || !Core.book.nodes || Core.book.nodes.length === 0) return;

        const nodes = Core.book.nodes;
        let levels = {};
        let visited = new Set();
        
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

        let queue = nodes.filter(n => inDegree[n.id] === 0);
        if (queue.length === 0) queue.push(nodes[0]); 

        let currentLevel = 0;
        
        while (queue.length > 0) {
            let nextQueue = [];
            levels[currentLevel] = [];

            for (let node of queue) {
                if (!visited.has(node.id)) {
                    visited.add(node.id);
                    levels[currentLevel].push(node);

                    if (node.choices) {
                        for (let c of node.choices) {
                            let target = nodes.find(n => n.id === c.targetId);
                            if (target && !visited.has(target.id) && !nextQueue.includes(target)) {
                                nextQueue.push(target);
                            }
                        }
                    }
                }
            }
            queue = nextQueue;
            currentLevel++;
        }

        let orphans = nodes.filter(n => !visited.has(n.id));
        if (orphans.length > 0) {
            levels[currentLevel] = orphans;
        }

        const X_SPACING = 380;
        const Y_SPACING = 320;

        for (let level in levels) {
            let lvlNodes = levels[level];
            let startY = 100 - ((lvlNodes.length - 1) * Y_SPACING) / 2;
            
            for (let i = 0; i < lvlNodes.length; i++) {
                lvlNodes[i].x = 100 + (parseInt(level) * X_SPACING);
                lvlNodes[i].y = startY + (i * Y_SPACING);
            }
        }

        this.render();
        if (Core.scheduleSave) Core.scheduleSave();
    },

    addArea() {
        if (!Core.book.mapElements) Core.book.mapElements = { areas: [], emojis: [] };
        const rect = document.getElementById('canvas-container').getBoundingClientRect();
        const x = (-this.panX + rect.width / 2) / this.zoom - 250;
        const y = (-this.panY + rect.height / 2) / this.zoom - 250;

        Core.book.mapElements.areas.push({
            id: `area_${Math.random().toString(36).substr(2, 5)}`,
            x: x, y: y,
            width: 500, height: 500,
            color: '#3b82f6',
            name: 'Nueva Área',
            description: ''
        });
        if (Core.scheduleSave) Core.scheduleSave();
        this.renderMapElements();
    },

    addEmoji() {
        if (!Core.book.mapElements) Core.book.mapElements = { areas: [], emojis: [] };
        const rect = document.getElementById('canvas-container').getBoundingClientRect();
        const x = (-this.panX + rect.width / 2) / this.zoom;
        const y = (-this.panY + rect.height / 2) / this.zoom;

        Core.book.mapElements.emojis.push({
            id: `emoji_${Math.random().toString(36).substr(2, 5)}`,
            x: x, y: y,
            emoji: '📍',
            size: 64,
            zoneSize: 200, 
            label: 'Ubicación',
            description: ''
        });
        if (Core.scheduleSave) Core.scheduleSave();
        this.renderMapElements();
    },

    openMapElementModal(id, type) {
        const elements = Core.book.mapElements || { areas: [], emojis: [] };
        const el = (type === 'area' ? elements.areas : elements.emojis).find(a => a.id === id);
        if (!el) return;

        document.getElementById('map-el-id').value = id;
        document.getElementById('map-el-type').value = type;
        
        document.getElementById('map-el-name').value = type === 'area' ? el.name : el.label;
        document.getElementById('map-el-desc').value = el.description || '';
        
        if (type === 'area') {
            document.getElementById('map-el-color-container').classList.remove('hidden');
            document.getElementById('map-el-emoji-container').classList.add('hidden');
            document.getElementById('map-el-size-container').classList.add('hidden');
            document.getElementById('map-el-zone-container').classList.add('hidden');
            document.getElementById('map-el-color').value = el.color || '#3b82f6';
        } else {
            document.getElementById('map-el-color-container').classList.add('hidden');
            document.getElementById('map-el-emoji-container').classList.remove('hidden');
            document.getElementById('map-el-size-container').classList.remove('hidden');
            document.getElementById('map-el-zone-container').classList.remove('hidden');
            
            document.getElementById('map-el-emoji').value = el.emoji || '📍';
            document.getElementById('map-el-size').value = el.size || 64;
            document.getElementById('map-el-zone').value = el.zoneSize !== undefined ? el.zoneSize : 200;
        }

        const modal = document.getElementById('map-element-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    closeMapModal() {
        const modal = document.getElementById('map-element-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    },

    saveMapElement() {
        const id = document.getElementById('map-el-id').value;
        const type = document.getElementById('map-el-type').value;
        const elements = Core.book.mapElements || { areas: [], emojis: [] };
        const el = (type === 'area' ? elements.areas : elements.emojis).find(a => a.id === id);
        
        if (el) {
            el.description = document.getElementById('map-el-desc').value;
            
            if (type === 'area') {
                el.name = document.getElementById('map-el-name').value;
                el.color = document.getElementById('map-el-color').value;
            } else {
                el.label = document.getElementById('map-el-name').value;
                el.emoji = document.getElementById('map-el-emoji').value;
                el.size = parseInt(document.getElementById('map-el-size').value) || 64;
                el.zoneSize = parseInt(document.getElementById('map-el-zone').value) || 0;
            }
            if (Core.scheduleSave) Core.scheduleSave();
            this.renderMapElements();
        }
        this.closeMapModal();
    },

    deleteMapElement() {
        const id = document.getElementById('map-el-id').value;
        const type = document.getElementById('map-el-type').value;
        if (!Core.book.mapElements) return;

        if (type === 'area') {
            Core.book.mapElements.areas = Core.book.mapElements.areas.filter(a => a.id !== id);
        } else {
            Core.book.mapElements.emojis = Core.book.mapElements.emojis.filter(a => a.id !== id);
        }
        
        if (Core.scheduleSave) Core.scheduleSave();
        this.renderMapElements();
        this.closeMapModal();
    }
};