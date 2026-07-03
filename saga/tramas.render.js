/**  
 * TRAMAS RENDER - Motor de dibujo especializado con Soporte de Doble Entorno Din mico (ONSD Integrado)
 */ 
window.TramasRender = {     
    ctx: null,     
    canvas: null,     
    imageCache: {},      
    
    init(canvas) {         
        this.canvas = canvas;         
        this.ctx = canvas.getContext('2d');         
        this.imageCache = {};     
    },     
    
    clear() {         
        // DETECCI N DIN MICA: Comprobamos si est  activo el modo oscuro en el documento
        const isDark = document.documentElement.classList.contains('dark');         
        this.ctx.fillStyle = isDark ? '#000000' : '#f9fafb';         
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);     
    },     
    
    drawAll() {         
        if (!this.ctx || !window.app?.tramas) return;         
        const state = window.TramasState;         
        const config = window.TramasConfig;         
        this.clear();         
        this.ctx.save();         
        this.ctx.translate(state.panX, state.panY);         
        this.ctx.scale(state.zoom, state.zoom);         
        this.drawGrid();         
        
        const regions = app.tramas.filter(n => n.type === 'Region');         
        const nodes = app.tramas.filter(n => n.type !== 'Region');         
        
        // 1. DIBUJAR REGIONES         
        regions.forEach(r => this.drawRegion(r));         
        
        // 2. DIBUJAR CONEXIONES         
        this.ctx.globalAlpha = 1.0;         
        nodes.forEach(node => {             
            if (!node.connections) return;             
            node.connections.forEach(targetId => {                 
                const target = nodes.find(n => n.id === targetId);                 
                if (target) {                     
                    const isHovered = state.hoveredConnection?.from === node.id && state.hoveredConnection?.to === targetId;                                                                           
                    if (state.filterMode) {                         
                        if (state.filterMode === 'thread' && node.threadName !== state.filterValue) {                             
                            this.ctx.globalAlpha = 0.08;                         
                        } else if (state.filterMode !== 'thread') {                             
                            this.ctx.globalAlpha = 0.15;                         
                        }                     
                    } else {                         
                        this.ctx.globalAlpha = 1.0;                     
                    }                     
                    const lineColor = node.threadName ? node.threadColor : null;                     
                    window.TramasConnections.drawConnection(this.ctx, node, target, config.nodeWidth, config.nodeHeight, isHovered, lineColor);                     
                    this.ctx.globalAlpha = 1.0;                  
                }             
            });         
        });         
        
        // 3. DIBUJAR NODOS OMEGA         
        nodes.forEach(node => {             
            this.drawNode(node);             
            window.TramasConnections.drawPorts(this.ctx, node, config.nodeWidth, config.nodeHeight);         
        });         
        
        // 4. FEEDBACK VISUAL TEMPORAL         
        if (state.isSelecting) this.drawSelectionBox();         
        if (state.isConnecting) this.drawTempLine();         
        this.ctx.restore();         
        this.drawUIOverlay();     
    },     
    
    drawGrid() {         
        const state = window.TramasState;         
        const spacing = window.TramasConfig.gridSpacing;         
        const dotSize = 2 / state.zoom;         
        const startX = -state.panX / state.zoom - spacing;         
        const startY = -state.panY / state.zoom - spacing;         
        const endX = (this.canvas.width - state.panX) / state.zoom + spacing;         
        const endY = (this.canvas.height - state.panY) / state.zoom + spacing;         
        
        const isDark = document.documentElement.classList.contains('dark');         
        this.ctx.fillStyle = isDark ? '#27272a' : '#e5e7eb';                  
        for (let x = startX; x < endX; x += spacing) {             
            for (let y = startY; y < endY; y += spacing) {                 
                this.ctx.fillRect(x, y, dotSize, dotSize);             
            }         
        }     
    },     
    
    drawNode(node) {         
        const state = window.TramasState;         
        const config = window.TramasConfig;         
        const isSelected = state.selectedNodes.has(node.id) || window.TramasUI?.selectedNodeId === node.id;         
        const isDark = document.documentElement.classList.contains('dark');                  
        let isDimmed = false;         
        if (state.filterMode === 'pov') isDimmed = !node.dataRefs?.includes(state.filterValue);         
        if (state.filterMode === 'tension') isDimmed = node.tension !== 5;         
        if (state.filterMode === 'status') isDimmed = node.status !== 'Completado';         
        if (state.filterMode === 'thread') isDimmed = node.threadName !== state.filterValue;         
        this.ctx.globalAlpha = isDimmed && state.filterMode ? 0.08 : 1.0;         
        
        // Cuerpo y Sombra adaptada din micamente
        this.ctx.fillStyle = isDark ? '#09090b' : '#ffffff';         
        this.ctx.shadowColor = isSelected ? (isDark ? 'rgba(129, 140, 248, 0.4)' : 'rgba(99, 102, 241, 0.3)') : (isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.08)');         
        this.ctx.shadowBlur = isSelected ? 20 : 12;         
        this.ctx.beginPath();         
        this.ctx.roundRect(node.x, node.y, config.nodeWidth, config.nodeHeight, 8);         
        this.ctx.fill();         
        this.ctx.shadowColor = 'transparent';         
        
        // Borde         
        this.ctx.lineWidth = isSelected ? 2 : 1;         
        this.ctx.strokeStyle = isSelected ? (isDark ? '#818cf8' : '#6366f1') : (node.status === 'Completado' ? '#10b981' : (isDark ? '#27272a' : '#e5e7eb'));         
        this.ctx.stroke();         
        
        // Cabecera         
        const typeColor = config.typeColors[node.type] || config.typeColors['General'];         
        this.ctx.fillStyle = typeColor;         
        this.ctx.beginPath();         
        this.ctx.roundRect(node.x, node.y, config.nodeWidth, 18, [8, 8, 0, 0]);         
        this.ctx.fill();         
        this.ctx.fillStyle = '#ffffff';         
        this.ctx.font = 'bold 9px Roboto';         
        this.ctx.textAlign = 'left';         
        this.ctx.fillText(node.type.toUpperCase(), node.x + 12, node.y + 12);         
        
        // Contador de Datos Vinculados         
        const refsCount = node.dataRefs ? node.dataRefs.length : 0;         
        if (refsCount > 0) {             
            this.ctx.fillStyle = isDark ? '#27272a' : '#1f2937';             
            this.ctx.beginPath();             
            this.ctx.arc(node.x + config.nodeWidth - 14, node.y + 9, 6, 0, Math.PI * 2);             
            this.ctx.fill();             
            this.ctx.fillStyle = '#ffffff';             
            this.ctx.font = 'bold 8px Roboto';             
            this.ctx.textAlign = 'center';             
            this.ctx.fillText(refsCount, node.x + config.nodeWidth - 14, node.y + 12);         }         
            
        // BADGE DE HILO NARRATIVO         
        if (node.threadName) {             
            this.ctx.font = 'bold 8px Roboto';             
            const text = node.threadName.toUpperCase();             
            const textWidth = this.ctx.measureText(text).width + 16;             
            const pillX = node.x + config.nodeWidth - textWidth + 10;              
            const pillY = node.y - 10;             
            this.ctx.fillStyle = node.threadColor || '#8b5cf6';             
            this.ctx.shadowColor = 'rgba(0,0,0,0.1)';             
            this.ctx.shadowBlur = 4;             
            this.ctx.beginPath();             
            this.ctx.roundRect(pillX, pillY, textWidth, 18, 9);             
            this.ctx.fill();             
            this.ctx.shadowColor = 'transparent';             
            this.ctx.fillStyle = isDark ? '#000000' : '#ffffff';             
            this.ctx.textAlign = 'center';             
            this.ctx.fillText(text, pillX + (textWidth / 2), pillY + 12);         
        }         
        
        // T tulo con alto contraste din mico        
        this.ctx.fillStyle = isDark ? '#f4f4f5' : '#111827';         
        this.ctx.font = '600 12px Roboto';         
        this.ctx.textAlign = 'left';         
        this.ctx.fillText(node.name?.substring(0, 22) || "Sin Nombre", node.x + 12, node.y + 36);         
        
        // Estado y Metadatos         
        this.ctx.fillStyle = node.status === 'Completado' ? '#10b981' : (node.status === 'Activo' ? '#3b82f6' : '#9ca3af');         
        this.ctx.font = '9px JetBrains Mono';         
        let statusIcon = node.status === 'Completado' ? '  ' : (node.status === 'Activo' ? '  ' : '  ');         
        this.ctx.fillText(statusIcon + (node.status || 'Borrador'), node.x + 12, node.y + 49);         
        
        if (node.timestamp || node.duration) {             
            this.ctx.fillStyle = '#6b7280';             
            this.ctx.font = '8px Roboto';             
            this.ctx.fillText("  " + (node.timestamp || '') + " " + (node.duration || ''), node.x + 12, node.y + 63);         
        }         
        if (node.pov) {             
            this.ctx.fillStyle = isDark ? '#fbbf24' : '#ca8a04';             
            this.ctx.font = 'bold 8px Roboto';             
            this.ctx.fillText("  POV: " + node.pov.substring(0, 15), node.x + 12, node.y + 75);         
        }         
        
        // Puntos de Tensi n         
        const tension = node.tension || 1;         
        for(let i = 0; i < 5; i++) {             
            this.ctx.beginPath();             
            this.ctx.arc(node.x + (config.nodeWidth/2) - 16 + (i*8), node.y + config.nodeHeight - 9, 2.5, 0, Math.PI * 2);             
            this.ctx.fillStyle = i < tension ? typeColor : (isDark ? '#27272a' : '#f3f4f6');             
            this.ctx.fill();         
        }         
        
        // BURBUJAS DE IMAGEN (Con bordes e hilos de contraste optimizados)        
        if (node.dataRefs && node.dataRefs.length > 0) {             
            const bubbleRadius = 11;             
            const bubbleOverlap = 6;             
            const maxRowWidth = config.nodeWidth - 24;                           
            let baseBubbleY = node.y + config.nodeHeight - bubbleRadius - 16;              
            if (node.pov || node.timestamp) {                 
                baseBubbleY = node.y + config.nodeHeight - bubbleRadius - 22;             
            }             
            node.dataRefs.forEach((refId, index) => {                 
                const foundItem = window.app.items.find(i => i.name === refId);                                  
                const bubblesPerRow = Math.floor(maxRowWidth / (bubbleRadius * 2 - bubbleOverlap));                 
                const currentRow = Math.floor(index / bubblesPerRow);                 
                const currentColumn = index % bubblesPerRow;                 
                const currentBubbleX = node.x + 12 + currentColumn * (bubbleRadius * 2 - bubbleOverlap);                 
                const currentBubbleY = baseBubbleY - currentRow * (bubbleRadius * 2 + 4);                 
                this.ctx.beginPath();                 
                this.ctx.arc(currentBubbleX, currentBubbleY, bubbleRadius, 0, Math.PI * 2);                 
                this.ctx.fillStyle = isDark ? '#18181b' : '#ffffff';                 
                this.ctx.fill();                 
                
                // Alineaci n de borde: claro en modo oscuro, oscuro en modo claro
                this.ctx.strokeStyle = node.pov === refId ? '#eab308' : (isDark ? '#52525b' : '#e5e7eb');                 
                this.ctx.lineWidth = node.pov === refId ? 2 : 1;                 
                this.ctx.stroke();                 
                if (foundItem) {                     
                    const imgUrl = foundItem.displayImage || foundItem.data.imagen64;                     
                    if (imgUrl) {                         
                        if (!this.imageCache[imgUrl]) {                             
                            const img = new Image();                             
                            img.src = imgUrl;                             
                            img.onload = () => {                                 
                                this.imageCache[imgUrl] = img;                                 
                                if (window.TramasCanvas && window.TramasCanvas.render) window.TramasCanvas.render();                             
                            };                         
                        } else {                             
                            const loadedImg = this.imageCache[imgUrl];                             
                            this.ctx.save();                             
                            this.ctx.beginPath();                             
                            this.ctx.arc(currentBubbleX, currentBubbleY, bubbleRadius - 0.5, 0, Math.PI * 2);                             
                            this.ctx.clip();                             
                            this.ctx.drawImage(loadedImg, currentBubbleX - bubbleRadius, currentBubbleY - bubbleRadius, bubbleRadius * 2, bubbleRadius * 2);                             
                            this.ctx.restore();                         
                        }                     
                    } else {                         
                        this.ctx.fillStyle = isDark ? '#a1a1aa' : '#6b7280';                         
                        this.ctx.font = 'bold 8px Roboto';                         
                        this.ctx.textBaseline = 'middle';                         
                        this.ctx.textAlign = 'center';                         
                        const letter = (foundItem.data.type || 'G').substring(0, 1).toUpperCase();                         
                        this.ctx.fillText(letter, currentBubbleX, currentBubbleY);                         
                        this.ctx.textBaseline = 'alphabetic';                     
                    }                 
                }             
            });         
        }         
        this.ctx.globalAlpha = 1.0;     
    },     
    
    drawRegion(region) {         
        const state = window.TramasState;         
        const isSelected = state.selectedNodes.has(region.id);         
        const isDark = document.documentElement.classList.contains('dark');         
        const w = region.width || 600;         
        const h = region.height || 400;         
        this.ctx.globalAlpha = state.filterMode ? 0.05 : 1.0;                  
        
        // Obtener el mapeo de color din mico desde la configuraci n
        const matchingColorConfig = window.TramasConfig.regionColors.find(c => c.light === region.color || c.dark === region.color);
        if (matchingColorConfig) {
            this.ctx.fillStyle = isDark ? matchingColorConfig.dark : matchingColorConfig.light;
        } else {
            this.ctx.fillStyle = isDark ? '#000000' : (region.color || '#f3f4f6');         
        }
        
        this.ctx.beginPath();         
        this.ctx.roundRect(region.x, region.y, w, h, 8);         
        this.ctx.fill();                  
        this.ctx.strokeStyle = isSelected ? '#6366f1' : (isDark ? '#27272a' : '#e5e7eb');         
        this.ctx.lineWidth = isSelected ? 3 : 1;         
        this.ctx.stroke();         
        this.ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)';         
        this.ctx.beginPath();         
        this.ctx.roundRect(region.x, region.y, w, 40, [8, 8, 0, 0]);         
        this.ctx.fill();         
        this.ctx.fillStyle = isDark ? '#a1a1aa' : '#6b7280';         
        this.ctx.font = 'bold 16px Roboto';         
        this.ctx.fillText((region.name || "NUEVO ACTO").toUpperCase(), region.x + 20, region.y + 26);     
    },     
    
    drawSelectionBox() {         
        const state = window.TramasState;         
        this.ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';         
        this.ctx.strokeStyle = '#6366f1';         
        this.ctx.setLineDash([5 / state.zoom, 5 / state.zoom]);         
        const minX = Math.min(state.selectionStartWorld.x, state.selectionCurrentWorld.x);         
        const minY = Math.min(state.selectionStartWorld.y, state.selectionCurrentWorld.y);         
        const w = Math.abs(state.selectionCurrentWorld.x - state.selectionStartWorld.x);         
        const h = Math.abs(state.selectionCurrentWorld.y - state.selectionStartWorld.y);         
        this.ctx.fillRect(minX, minY, w, h);         
        this.ctx.strokeRect(minX, minY, w, h);         
        this.ctx.setLineDash([]);     
    },     
    
    drawTempLine() {         
        const state = window.TramasState;         
        const config = window.TramasConfig;         
        const startNode = app.tramas.find(n => n.id === state.connectionStartNodeId);         
        if (startNode) {             
            window.TramasConnections.drawTempConnection(this.ctx, startNode, state.currentMouseX, state.currentMouseY, config.nodeWidth, config.nodeHeight);         
        }     
    },     
    
    drawUIOverlay() {         
        const isDark = document.documentElement.classList.contains('dark');         
        this.ctx.globalAlpha = 1.0;         
        this.ctx.fillStyle = isDark ? '#71717a' : '#9ca3af';         
        this.ctx.font = '10px Roboto';         
        this.ctx.fillText("Clic derecho para selecci n m ltiple. SUPR para borrar.", 20, this.canvas.height - 20);     
    } 
};