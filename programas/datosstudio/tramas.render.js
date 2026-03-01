/**
 * TRAMAS RENDER - Motor de dibujo especializado (Restaurado)
 */
const TramasRender = {
    ctx: null,
    canvas: null,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    },

    clear() {
        this.ctx.fillStyle = '#f9fafb';
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
                    window.TramasConnections.drawConnection(this.ctx, node, target, config.nodeWidth, config.nodeHeight, isHovered);
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

        this.ctx.fillStyle = '#e5e7eb';
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
        
        // Filtros y Atenuación
        let isDimmed = false;
        if (state.filterMode === 'pov') isDimmed = !node.dataRefs?.includes(state.filterValue);
        if (state.filterMode === 'tension') isDimmed = node.tension !== 5;
        this.ctx.globalAlpha = isDimmed && state.filterMode ? 0.2 : 1.0;

        // Cuerpo y Sombra
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(0,0,0,0.08)';
        this.ctx.shadowBlur = isSelected ? 20 : 12;
        this.ctx.beginPath();
        this.ctx.roundRect(node.x, node.y, config.nodeWidth, config.nodeHeight, 8);
        this.ctx.fill();
        this.ctx.shadowColor = 'transparent';

        // Borde
        this.ctx.lineWidth = isSelected ? 2 : 1;
        this.ctx.strokeStyle = isSelected ? '#6366f1' : (node.status === 'Completado' ? '#10b981' : '#e5e7eb');
        this.ctx.stroke();

        // Cabecera
        const typeColor = config.typeColors[node.type] || config.typeColors['General'];
        this.ctx.fillStyle = typeColor;
        this.ctx.beginPath();
        this.ctx.roundRect(node.x, node.y, config.nodeWidth, 18, [8, 8, 0, 0]);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 9px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(node.type.toUpperCase(), node.x + 12, node.y + 12);

        // Contador de Datos Vinculados
        const refsCount = node.dataRefs ? node.dataRefs.length : 0;
        if (refsCount > 0) {
            this.ctx.fillStyle = '#1f2937';
            this.ctx.beginPath();
            this.ctx.arc(node.x + config.nodeWidth - 14, node.y + 9, 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 8px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(refsCount, node.x + config.nodeWidth - 14, node.y + 12);
        }

        // Título
        this.ctx.fillStyle = '#111827';
        this.ctx.font = '600 12px Inter';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(node.name?.substring(0, 22) || "Sin Nombre", node.x + 12, node.y + 36);

        // Estado y Metadatos (Reloj, POV, Tensión)
        this.ctx.fillStyle = node.status === 'Completado' ? '#10b981' : (node.status === 'Activo' ? '#3b82f6' : '#9ca3af');
        this.ctx.font = '9px JetBrains Mono';
        let statusIcon = node.status === 'Completado' ? '✓ ' : (node.status === 'Activo' ? '▶ ' : '✎ ');
        this.ctx.fillText(statusIcon + (node.status || 'Borrador'), node.x + 12, node.y + 49);

        if (node.timestamp || node.duration) {
            this.ctx.fillStyle = '#6b7280';
            this.ctx.font = '8px Inter';
            this.ctx.fillText("🕒 " + (node.timestamp || '') + " " + (node.duration || ''), node.x + 12, node.y + 63);
        }

        if (node.pov) {
            this.ctx.fillStyle = '#ca8a04';
            this.ctx.font = 'bold 8px Inter';
            this.ctx.fillText("📷 POV: " + node.pov.substring(0, 15), node.x + 12, node.y + 75);
        }

        // Puntos de Tensión
        const tension = node.tension || 1;
        for(let i = 0; i < 5; i++) {
            this.ctx.beginPath();
            this.ctx.arc(node.x + (config.nodeWidth/2) - 16 + (i*8), node.y + config.nodeHeight - 9, 2.5, 0, Math.PI * 2);
            this.ctx.fillStyle = i < tension ? typeColor : '#f3f4f6';
            this.ctx.fill();
        }
    },

    drawRegion(region) {
        const state = window.TramasState;
        const isSelected = state.selectedNodes.has(region.id);
        const w = region.width || 600;
        const h = region.height || 400;

        this.ctx.globalAlpha = state.filterMode ? 0.15 : 1.0;
        this.ctx.fillStyle = region.color || '#f3f4f6';
        this.ctx.beginPath();
        this.ctx.roundRect(region.x, region.y, w, h, 8);
        this.ctx.fill();
        
        this.ctx.strokeStyle = isSelected ? '#6366f1' : '#e5e7eb';
        this.ctx.lineWidth = isSelected ? 3 : 1;
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(0,0,0,0.05)';
        this.ctx.beginPath();
        this.ctx.roundRect(region.x, region.y, w, 40, [8, 8, 0, 0]);
        this.ctx.fill();

        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = 'bold 16px Inter';
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
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.font = '10px Inter';
        this.ctx.fillText("Clic derecho para selección múltiple. SUPR para borrar.", 20, this.canvas.height - 20);
    }
};

window.TramasRender = TramasRender;