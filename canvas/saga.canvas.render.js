// saga.canvas.render.js
// SAGA MINI - MOTOR DE RENDERIZADO 2D CANVAS (OPTIMIZADO CON CULLING)
window.Saga = window.Saga || {};
window.Saga.Canvas = window.Saga.Canvas || {};

Object.assign(window.Saga.Canvas, {
    loop() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Limpiar Canvas
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        // =========================================================================
        // OPTIMIZACIÓN CRÍTICA: CULLING (CÁLCULO DEL ÁREA VISIBLE DEL VIEWPORT)
        // =========================================================================
        const viewMinX = -this.panX / this.zoom;
        const viewMinY = -this.panY / this.zoom;
        const viewMaxX = (w - this.panX) / this.zoom;
        const viewMaxY = (h - this.panY) / this.zoom;

        // 1. Dibujar Cuadrícula de Puntos (Limitada estrictamente a la vista)
        this.drawDotsGrid(viewMinX, viewMinY, viewMaxX, viewMaxY);

        // 2. Dibujar Guías de la Regla Temporal
        this.drawRulerGuides(viewMinY, viewMaxY);

        // 3. Dibujar Zonas (Solo las visibles)
        for (let i = 0; i < this.regions.length; i++) {
            const r = this.regions[i];
            if (r.x + r.w >= viewMinX && r.x <= viewMaxX &&
                r.y + r.h >= viewMinY && r.y <= viewMaxY) {
                this.drawRegion(r);
            }
        }

        // Fast-lookup para dibujar conexiones rápidamente
        const visibleNodes = [];
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (node.x + node.w >= viewMinX && node.x <= viewMaxX &&
                node.y + node.h >= viewMinY && node.y <= viewMaxY) {
                visibleNodes.push(node);
            }
        }

        // 4. Dibujar Conexiones (Líneas entre nodos)
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (!node.connections || node.connections.length === 0) continue;

            for (let j = 0; j < node.connections.length; j++) {
                const targetId = node.connections[j];
                const target = this.nodes.find(n => n.id === targetId);
                
                // Dibujar si al menos uno de los dos nodos es visible
                if (target && (visibleNodes.includes(node) || visibleNodes.includes(target))) {
                    this.drawConnection(node, target);
                }
            }
        }

        // Conexión interactiva en arrastre
        if (this.connectingNode) {
            const worldMouse = this.screenToWorld(this.lastMouse.x, this.lastMouse.y);
            this.drawCubicBezier(
                this.connectingNode.x + this.connectingNode.w,
                this.connectingNode.y + this.connectingNode.h / 2,
                worldMouse.x, worldMouse.y, '#1a73e8', true
            );
        }

        // 5. Dibujar Nodos Visibles (Culling Aplicado)
        for (let i = 0; i < visibleNodes.length; i++) {
            this.drawNode(visibleNodes[i]);
        }

        // Caja de selección múltiple (Derecha + Arrastre)
        if (this.isBoxSelecting) {
            this.drawSelectionBox();
        }

        this.ctx.restore();

        // 6. UI Fija sobre el Viewport (No afectada por el Zoom/Pan del Canvas)
        this.drawHorizontalRulerUI();
        this.drawMinimap();

        requestAnimationFrame(() => this.loop());
    },

    drawDotsGrid(minX, minY, maxX, maxY) {
        this.ctx.fillStyle = '#dadce0';
        const spacing = 24;

        const startX = Math.floor(minX / spacing) * spacing - spacing;
        const startY = Math.floor(minY / spacing) * spacing - spacing;
        const dotRadius = 1.2 / this.zoom;

        for (let x = startX; x < maxX; x += spacing) {
            for (let y = startY; y < maxY; y += spacing) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    },

    drawRulerGuides(minY, maxY) {
        if (!this.rulerMarkers || this.rulerMarkers.length === 0) return;

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(26, 115, 232, 0.35)';
        this.ctx.lineWidth = 1.5 / this.zoom;
        this.ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);

        for (let i = 0; i < this.rulerMarkers.length; i++) {
            const m = this.rulerMarkers[i];
            const worldX = this.dateToWorldX(m.date);
            
            this.ctx.beginPath();
            this.ctx.moveTo(worldX, minY);
            this.ctx.lineTo(worldX, maxY);
            this.ctx.stroke();
        }
        this.ctx.restore();
    },

    drawHorizontalRulerUI() {
        const h = this.rulerHeight || 36;
        const w = this.canvas.width;
        const monthsNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const rulerPan = this.getRulerPanX();

        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.strokeStyle = '#dadce0';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, h);
        this.ctx.lineTo(w, h);
        this.ctx.stroke();

        if (this.focalWarpActive) {
            const focalSx = this.focalWorldX * this.zoom + rulerPan;
            const radiusSx = this.focalRadius * this.zoom;
            const grad = this.ctx.createRadialGradient(focalSx, h / 2, 0, focalSx, h / 2, radiusSx);
            grad.addColorStop(0, 'rgba(26, 115, 232, 0.25)');
            grad.addColorStop(0.7, 'rgba(26, 115, 232, 0.08)');
            grad.addColorStop(1, 'rgba(26, 115, 232, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.fillRect(focalSx - radiusSx, 0, radiusSx * 2, h);

            this.ctx.strokeStyle = 'rgba(26, 115, 232, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([2, 2]);
            this.ctx.strokeRect(focalSx - radiusSx, 0, radiusSx * 2, h);
            this.ctx.setLineDash([]);
        }

        const monthWidthPx = this.pxPerMonth * this.zoom;
        this.ctx.fillStyle = '#5f6368';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        const startDate = this.worldXToDate((-rulerPan) / this.zoom);
        const endDate = this.worldXToDate((w - rulerPan) / this.zoom);

        if (monthWidthPx >= 15) {
            let currYear = startDate.getFullYear();
            let currMonth = startDate.getMonth();
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth();

            while (currYear < endYear || (currYear === endYear && currMonth <= endMonth + 1)) {
                const stepDate = new Date(currYear, currMonth, 1);
                const wx = this.dateToWorldX(stepDate);
                const sx = wx * this.zoom + rulerPan;

                if (sx >= -50 && sx <= w + 50) {
                    const isJanuary = currMonth === 0;
                    this.ctx.strokeStyle = isJanuary ? '#1a73e8' : '#bdc1c6';
                    this.ctx.lineWidth = isJanuary ? 1.5 : 1;

                    this.ctx.beginPath();
                    this.ctx.moveTo(sx, isJanuary ? h - 16 : h - 10);
                    this.ctx.lineTo(sx, h);
                    this.ctx.stroke();

                    if (monthWidthPx >= 35) {
                        const labelText = isJanuary ? `Ene ${currYear}` : monthsNames[currMonth];
                        this.ctx.fillStyle = isJanuary ? '#1a73e8' : '#5f6368';
                        this.ctx.font = isJanuary ? 'bold 10px sans-serif' : '10px sans-serif';
                        this.ctx.fillText(labelText, sx, 6);
                    } else if (isJanuary) {
                        this.ctx.fillStyle = '#1a73e8';
                        this.ctx.font = 'bold 10px sans-serif';
                        this.ctx.fillText(currYear.toString(), sx, 6);
                    }
                }
                currMonth++;
                if (currMonth > 11) {
                    currMonth = 0;
                    currYear++;
                }
            }
        } else {
            let yearStep = 1;
            const yearWidthPx = monthWidthPx * 12;
            if (yearWidthPx < 40) yearStep = 5;
            if (yearWidthPx < 15) yearStep = 10;
            if (yearWidthPx < 6)  yearStep = 50;
            if (yearWidthPx < 1.5) yearStep = 100;

            const startYear = Math.floor(startDate.getFullYear() / yearStep) * yearStep;
            const endYear = Math.ceil(endDate.getFullYear() / yearStep) * yearStep;

            for (let y = startYear; y <= endYear; y += yearStep) {
                const stepDate = new Date(y, 0, 1);
                const wx = this.dateToWorldX(stepDate);
                const sx = wx * this.zoom + rulerPan;

                if (sx >= -50 && sx <= w + 50) {
                    this.ctx.strokeStyle = '#9aa0a6';
                    this.ctx.beginPath();
                    this.ctx.moveTo(sx, h - 14);
                    this.ctx.lineTo(sx, h);
                    this.ctx.stroke();

                    this.ctx.fillStyle = '#202124';
                    this.ctx.font = 'bold 10px sans-serif';
                    this.ctx.fillText(y.toString(), sx, 6);
                }
            }
        }

        if (this.rulerMarkers && this.rulerMarkers.length > 0) {
            for (let i = 0; i < this.rulerMarkers.length; i++) {
                const m = this.rulerMarkers[i];
                const wx = this.dateToWorldX(m.date);
                const sx = wx * this.zoom + rulerPan;

                if (sx < -50 || sx > w + 50) continue;

                const isHovered = this.hoveredMarker && this.hoveredMarker.id === m.id;
                const markerColor = isHovered ? '#1557b0' : '#1a73e8';

                this.ctx.fillStyle = markerColor;
                this.ctx.beginPath();
                this.ctx.moveTo(sx - 6, 2);
                this.ctx.lineTo(sx + 6, 2);
                this.ctx.lineTo(sx + 6, h - 8);
                this.ctx.lineTo(sx, h - 1);
                this.ctx.lineTo(sx - 6, h - 8);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.font = 'bold 10px sans-serif';
                const textMetrics = this.ctx.measureText(m.label);
                const badgeW = textMetrics.width + 10;
                const badgeH = 16;
                const badgeX = sx - badgeW / 2;
                const badgeY = h + 4;

                this.ctx.fillStyle = markerColor;
                this.ctx.beginPath();
                this.ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
                this.ctx.fill();

                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(m.label, sx, badgeY + badgeH / 2);
            }
        }

        const btnW = 120;
        const btnH = 22;
        const btnX = w - btnW - 10;
        const btnY = (h - btnH) / 2;
        const isLocked = this.isRulerLocked;

        this.ctx.fillStyle = isLocked ? '#e8f0fe' : '#f1f3f4';
        this.ctx.strokeStyle = isLocked ? '#1a73e8' : '#dadce0';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(btnX, btnY, btnW, btnH, 6);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = isLocked ? '#1a73e8' : '#5f6368';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(isLocked ? "LÍNEA FIJA" : "LÍNEA LIBRE", btnX + btnW / 2, btnY + btnH / 2);

        this.ctx.restore();
    },

    drawMinimap() {
        const size = 180;
        const margin = 16;
        const x = margin;
        const y = this.canvas.height - size - margin;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.strokeStyle = '#dadce0';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, 12);
        this.ctx.fill();
        this.ctx.stroke();

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        if (this.nodes.length === 0 && this.regions.length === 0) {
            minX = -500; minY = -500; maxX = 500; maxY = 500;
        } else {
            for (let i = 0; i < this.nodes.length; i++) {
                const n = this.nodes[i];
                if (n.x < minX) minX = n.x;
                if (n.y < minY) minY = n.y;
                if (n.x + n.w > maxX) maxX = n.x + n.w;
                if (n.y + n.h > maxY) maxY = n.y + n.h;
            }
            for (let i = 0; i < this.regions.length; i++) {
                const r = this.regions[i];
                if (r.x < minX) minX = r.x;
                if (r.y < minY) minY = r.y;
                if (r.x + r.w > maxX) maxX = r.x + r.w;
                if (r.y + r.h > maxY) maxY = r.y + r.h;
            }
        }

        const viewMin = this.screenToWorld(0, 0);
        const viewMax = this.screenToWorld(this.canvas.width, this.canvas.height);
        minX = Math.min(minX, viewMin.x);
        minY = Math.min(minY, viewMin.y);
        maxX = Math.max(maxX, viewMax.x);
        maxY = Math.max(maxY, viewMax.y);

        const pad = 200;
        minX -= pad; minY -= pad; maxX += pad; maxY += pad;
        const worldW = maxX - minX;
        const worldH = maxY - minY;
        const mapScale = Math.min((size - 16) / worldW, (size - 16) / worldH);
        const offsetX = x + (size - worldW * mapScale) / 2;
        const offsetY = y + (size - worldH * mapScale) / 2;

        const toMapX = (wx) => offsetX + (wx - minX) * mapScale;
        const toMapY = (wy) => offsetY + (wy - minY) * mapScale;

        this.ctx.beginPath();
        this.ctx.roundRect(x + 2, y + 2, size - 4, size - 4, 10);
        this.ctx.clip();

        this.ctx.fillStyle = 'rgba(232, 240, 254, 0.6)';
        this.ctx.strokeStyle = '#34a853';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.regions.length; i++) {
            const r = this.regions[i];
            const rx = toMapX(r.x);
            const ry = toMapY(r.y);
            const rw = r.w * mapScale;
            const rh = r.h * mapScale;
            this.ctx.fillRect(rx, ry, rw, rh);
            this.ctx.strokeRect(rx, ry, rw, rh);
        }

        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            const nx = toMapX(n.x);
            const ny = toMapY(n.y);
            const nw = Math.max(3, n.w * mapScale);
            const nh = Math.max(3, n.h * mapScale);
            const isSelected = this.selectedNodeId === n.id || (this.selectedNodeIds && this.selectedNodeIds.includes(n.id));

            this.ctx.fillStyle = isSelected ? '#1a73e8' : '#5f6368';
            this.ctx.fillRect(nx, ny, nw, nh);
        }

        const vx = toMapX(viewMin.x);
        const vy = toMapY(viewMin.y);
        const vw = (viewMax.x - viewMin.x) * mapScale;
        const vh = (viewMax.y - viewMin.y) * mapScale;

        this.ctx.strokeStyle = '#1a73e8';
        this.ctx.lineWidth = 1.5;
        this.ctx.fillStyle = 'rgba(26, 115, 232, 0.08)';
        this.ctx.fillRect(vx, vy, vw, vh);
        this.ctx.strokeRect(vx, vy, vw, vh);

        this.ctx.restore();
    },

    drawRegion(region) {
        const isSelected = this.selectedRegionId === region.id;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = isSelected ? '#1e8e3e' : '#e8eaed';
        this.ctx.lineWidth = isSelected ? 2 : 1;

        this.ctx.beginPath();
        this.ctx.roundRect(region.x, region.y, region.w, region.h, 12);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#f1f3f4';
        this.ctx.beginPath();
        this.ctx.roundRect(region.x, region.y, region.w, 28, [12, 12, 0, 0]);
        this.ctx.fill();

        this.ctx.fillStyle = '#137333';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.fillText(region.name.toUpperCase(), region.x + 12, region.y + 18);

        this.ctx.fillStyle = isSelected ? '#1e8e3e' : '#bdc1c6';
        this.ctx.beginPath();
        this.ctx.moveTo(region.x + region.w - 10, region.y + region.h);
        this.ctx.lineTo(region.x + region.w, region.y + region.h - 10);
        this.ctx.lineTo(region.x + region.w, region.y + region.h);
        this.ctx.fill();
    },

    drawConnection(from, to) {
        const x1 = from.x + from.w;
        const y1 = from.y + from.h / 2;
        const x2 = to.x;
        const y2 = to.y + to.h / 2;
        this.drawCubicBezier(x1, y1, x2, y2, '#1a73e8');
    },

    drawCubicBezier(x1, y1, x2, y2, color, isDashed = false) {
        const dist = Math.abs(x2 - x1) * 0.5 + 20;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.bezierCurveTo(x1 + dist, y1, x2 - dist, y2, x2, y2);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        if (isDashed) this.ctx.setLineDash([4, 4]);
        this.ctx.stroke();
        if (isDashed) this.ctx.setLineDash([]);
    },

    drawNode(node) {
        const isSelected = this.selectedNodeId === node.id || (this.selectedNodeIds && this.selectedNodeIds.includes(node.id));
        const radius = 12;
        const img = this.imageCache[node.displayUrl];

        if (img && img.naturalWidth && img.naturalHeight) {
            const aspect = img.naturalWidth / img.naturalHeight;
            const baseSize = 160;
            if (aspect >= 1) {
                node.w = baseSize;
                node.h = baseSize / aspect;
            } else {
                node.h = baseSize;
                node.w = baseSize * aspect;
            }
        }

        // Optimización de Sombras
        if (!isSelected) {
            this.ctx.shadowColor = 'rgba(60, 64, 67, 0.12)';
            this.ctx.shadowBlur = 6;
            this.ctx.shadowOffsetY = 2;
        } else {
            this.ctx.shadowColor = 'rgba(26, 115, 232, 0.4)';
            this.ctx.shadowBlur = 12;
            this.ctx.shadowOffsetY = 4;
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.roundRect(node.x, node.y, node.w, node.h, radius);
        this.ctx.clip();

        // 1. Dibujar Imagen o Placeholder
        if (img) {
            const imgAspect = img.naturalWidth / img.naturalHeight;
            const nodeAspect = node.w / node.h;
            let renderW, renderH, offsetX, offsetY;

            if (imgAspect > nodeAspect) {
                renderH = node.h;
                renderW = node.h * imgAspect;
                offsetX = node.x - (renderW - node.w) / 2;
                offsetY = node.y;
            } else {
                renderW = node.w;
                renderH = node.w / imgAspect;
                offsetX = node.x;
                offsetY = node.y - (renderH - node.h) / 2;
            }
            this.ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
        } else {
            this.ctx.fillStyle = '#e8eaed';
            this.ctx.fillRect(node.x, node.y, node.w, node.h);

            this.ctx.fillStyle = '#9aa0a6';
            this.ctx.font = 'bold 36px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText((node.title[0] || '?').toUpperCase(), node.x + node.w / 2, node.y + node.h / 2 - 10);
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
        }

        // 2. Degradado Superior
        const topGradHeight = Math.min(40, node.h * 0.35);
        const topGrad = this.ctx.createLinearGradient(node.x, node.y, node.x, node.y + topGradHeight);
        topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
        topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = topGrad;
        this.ctx.fillRect(node.x, node.y, node.w, topGradHeight);

        // 3. Renderizado de la Fecha
        const nodeCenterX = node.x + node.w / 2;
        
        // Cargar/recachear fecha en el objeto si es necesario para evitar recalcular en cada tick
        if (!node._cachedDateStr || node._cachedX !== node.x) {
            node._cachedX = node.x;
            const nodeDate = this.worldXToDate(nodeCenterX);
            node._cachedDateStr = this.formatDateLabel(nodeDate, 'day');
        }

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(node._cachedDateStr, nodeCenterX, node.y + 8);

        // 4. Degradado Inferior
        const gradHeight = Math.min(56, node.h * 0.5);
        const grad = this.ctx.createLinearGradient(node.x, node.y + node.h - gradHeight, node.x, node.y + node.h);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(node.x, node.y + node.h - gradHeight, node.w, gradHeight);

        // 5. Nombre del Nodo
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.fillText(node.title.substring(0, 20), node.x + 10, node.y + node.h - 12);

        this.ctx.restore();

        // 6. Borde y Puerto de Conexión
        this.ctx.shadowColor = 'transparent';
        this.ctx.strokeStyle = isSelected ? '#1a73e8' : 'rgba(0,0,0,0.08)';
        this.ctx.lineWidth = isSelected ? 2.5 : 1;
        this.ctx.beginPath();
        this.ctx.roundRect(node.x, node.y, node.w, node.h, radius);
        this.ctx.stroke();

        this.ctx.fillStyle = isSelected ? '#1a73e8' : '#5f6368';
        this.ctx.beginPath();
        this.ctx.arc(node.x + node.w, node.y + node.h / 2, 4.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
    },

    drawSelectionBox() {
        const x = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
        const y = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
        const w = Math.abs(this.boxSelectEnd.x - this.boxSelectStart.x);
        const h = Math.abs(this.boxSelectEnd.y - this.boxSelectStart.y);

        this.ctx.fillStyle = 'rgba(26, 115, 232, 0.12)';
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeStyle = '#1a73e8';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.setLineDash([]);
    },

    async exportCanvas4K() {
        const targetWidth = 7680;
        const targetHeight = 4320;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = targetWidth;
        offCanvas.height = targetHeight;
        const offCtx = offCanvas.getContext('2d');

        const origCtx = this.ctx;
        const origPanX = this.panX;
        const origPanY = this.panY;
        const origZoom = this.zoom;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        if (this.nodes.length === 0 && this.regions.length === 0) {
            minX = 0; minY = 0; maxX = 1200; maxY = 800;
        } else {
            for (let i = 0; i < this.nodes.length; i++) {
                const n = this.nodes[i];
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x + n.w);
                maxY = Math.max(maxY, n.y + n.h);
            }
            for (let i = 0; i < this.regions.length; i++) {
                const r = this.regions[i];
                minX = Math.min(minX, r.x);
                minY = Math.min(minY, r.y);
                maxX = Math.max(maxX, r.x + r.w);
                maxY = Math.max(maxY, r.y + r.h);
            }
        }

        const padding = 120;
        minX -= padding; minY -= padding; maxX += padding; maxY += padding;

        const contentW = maxX - minX;
        const contentH = maxY - minY;
        const scaleX = targetWidth / contentW;
        const scaleY = targetHeight / contentH;
        const exportZoom = Math.min(scaleX, scaleY);

        const exportPanX = (targetWidth - contentW * exportZoom) / 2 - minX * exportZoom;
        const exportPanY = (targetHeight - contentH * exportZoom) / 2 - minY * exportZoom;

        this.ctx = offCtx;
        this.panX = exportPanX;
        this.panY = exportPanY;
        this.zoom = exportZoom;

        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, targetWidth, targetHeight);

        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);

        const exportMinX = -this.panX / this.zoom;
        const exportMinY = -this.panY / this.zoom;
        const exportMaxX = (targetWidth - this.panX) / this.zoom;
        const exportMaxY = (targetHeight - this.panY) / this.zoom;

        this.drawDotsGrid(exportMinX, exportMinY, exportMaxX, exportMaxY);
        this.drawRulerGuides(exportMinY, exportMaxY);

        for (let i = 0; i < this.regions.length; i++) {
            this.drawRegion(this.regions[i]);
        }

        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            for (let j = 0; j < node.connections.length; j++) {
                const target = this.nodes.find(n => n.id === node.connections[j]);
                if (target) this.drawConnection(node, target);
            }
        }

        for (let i = 0; i < this.nodes.length; i++) {
            this.drawNode(this.nodes[i]);
        }

        this.ctx.restore();
        this.drawHorizontalRulerUI();

        this.ctx = origCtx;
        this.panX = origPanX;
        this.panY = origPanY;
        this.zoom = origZoom;

        const dataUrl = offCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `saga_canvas_8k_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});