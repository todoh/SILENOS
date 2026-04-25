// Archivo: Librojuego/canvas.render.js

window.Canvas = window.Canvas || {};

Object.assign(window.Canvas, {

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
        
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.mapElements) bookBase.mapElements = { areas: [], emojis: [] };
        const elements = bookBase.mapElements;
        
        elements.areas.forEach(area => {
            const el = document.createElement('div');
            el.className = `canvas-area absolute border-2 border-dashed flex items-center justify-center pointer-events-auto ${this.mode === 'map' ? 'cursor-grab hover:border-indigo-500 hover:shadow-lg' : ''}`;
            el.style.left = `${area.x}px`;
            el.style.top = `${area.y}px`;
            el.style.width = `${area.width}px`;
            el.style.height = `${area.height}px`;
            
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
        if (!container) return;
        container.innerHTML = '';

        const bookBase = Core.book || Core.bookData || { nodes: [] };
        if (!bookBase.nodes) bookBase.nodes = [];

        bookBase.nodes.forEach(node => {
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
            if (typeof AIEnhancer !== 'undefined' && AIEnhancer.generatingNodes && AIEnhancer.generatingNodes.has(node.id)) {
                writingIndicator = `
                    <div class="absolute top-2 right-2 text-indigo-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md z-20" title="Auto-escribiendo en 2º plano...">
                        <i class="fa-solid fa-pen-nib fa-bounce text-sm"></i>
                    </div>
                `;
            }

            let structIndicator = '';
            const isGeneratingStruct = (typeof AIContext !== 'undefined' && AIContext.generatingNodes && AIContext.generatingNodes.has(node.id)) ||
                                       (typeof AIAdvanced !== 'undefined' && AIAdvanced.generatingNodes && AIAdvanced.generatingNodes.has(node.id)) ||
                                       (typeof AICombat !== 'undefined' && AICombat.generatingNodes && AICombat.generatingNodes.has(node.id));

            if (isGeneratingStruct) {
                structIndicator = `
                    <div class="absolute top-12 right-2 text-blue-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md z-20" title="Generando estructura / rutas en 2º plano...">
                        <i class="fa-solid fa-code-branch fa-fade text-sm"></i>
                    </div>
                `;
            }

            // NUEVOS: Indicadores visuales para el Lore y la Reesritura de Enlaces
            let loreIndicator = '';
            if (typeof AIAdvanced !== 'undefined' && AIAdvanced.extractingNodes && AIAdvanced.extractingNodes.has(node.id)) {
                loreIndicator = `
                    <div class="absolute right-2 text-purple-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md z-20" style="top: 88px" title="Extrayendo Lore Visual en 2º plano...">
                        <i class="fa-solid fa-book-journal-whills fa-fade text-sm"></i>
                    </div>
                `;
            }

            let linkIndicator = '';
            if (typeof AILinks !== 'undefined' && AILinks.generatingNodes && AILinks.generatingNodes.has(node.id)) {
                // Cálculo dinámico para que no se pise visualmente con el de Lore
                let topPos = (typeof AIAdvanced !== 'undefined' && AIAdvanced.extractingNodes && AIAdvanced.extractingNodes.has(node.id)) ? '128px' : '88px';
                linkIndicator = `
                    <div class="absolute right-2 text-teal-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md z-20" style="top: ${topPos}" title="Reescribiendo enlaces en 2º plano...">
                        <i class="fa-solid fa-link fa-fade text-sm"></i>
                    </div>
                `;
            }

            let effectIndicator = '';
            let effs = node.effs || (node.eff ? [node.eff] : []);
            if (effs.length > 0) {
                let texts = effs.map(eff => {
                     if(eff.type==='item') return (eff.op==='ADD'?'Consigues ':'Pierdes ')+(eff.qty>1?eff.qty+'x ':'')+eff.val;
                     return (eff.op==='+'?'Ganas ':'Pierdes ')+eff.val+' de '+eff.type;
                }).join(' | ');
                effectIndicator = `
                    <div class="absolute top-2 left-2 text-yellow-500 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md z-20" title="Consecuencias al llegar:\n${texts}">
                        <i class="fa-solid fa-bolt text-xs"></i>${effs.length > 1 ? `<span class="text-[8px] ml-0.5">${effs.length}</span>` : ''}
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
                ${structIndicator}
                ${loreIndicator}
                ${linkIndicator}
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
        if (!svg) return;
        let paths = '';

        const bookBase = Core.book || Core.bookData || { nodes: [] };
        if (!bookBase.nodes) bookBase.nodes = [];

        bookBase.nodes.forEach(node => {
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

                        let effs = choice.effs || (choice.eff ? [choice.eff] : []);
                        if ((choice.cond && choice.cond.type) || effs.length > 0) {
                            const midX = (x1 + x2) / 2;
                            const midY = (y1 + y2) / 2;

                            let badges = '';
                            if (choice.cond && choice.cond.type) {
                                let condStr = choice.cond.type === 'item' 
                                    ? (choice.cond.op === 'HAS' ? 'Tener el objeto ' : 'No tener el objeto ') + choice.cond.val 
                                    : 'Tener ' + (choice.cond.op === '>' ? 'más de ' : (choice.cond.op === '<' ? 'menos de ' : 'exactamente ')) + choice.cond.val + ' de ' + choice.cond.type;
                                badges += `<div style="background:#fee2e2; color:#ef4444; border:1px solid #fca5a5; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; pointer-events:auto;" title="Requisito: ${condStr}"><i class="fa-solid fa-lock"></i></div>`;
                            }
                            if (effs.length > 0) {
                                let effStr = effs.map(e => e.type==='item' ? ((e.op==='ADD'?'Consigues ':'Pierdes ')+(e.qty>1?e.qty+'x ':'')+e.val) : ((e.op==='+'?'Ganas ':'Pierdes ')+e.val+' '+e.type)).join(' | ');
                                badges += `<div style="background:#dbeafe; color:#3b82f6; border:1px solid #93c5fd; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; pointer-events:auto;" title="Consecuencias: ${effStr}"><i class="fa-solid fa-bolt"></i></div>`;
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
    }
});