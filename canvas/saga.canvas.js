// saga.canvas.js
window.Saga = window.Saga || {};
window.Saga.Canvas = {
    canvas: null,
    ctx: null,
    panX: 0,
    panY: 0,
    zoom: 1,
    nodes: [],
    regions: [],
    imageCache: {},

    // =========================================================================
    // CONFIGURACIÓN DE CRONOLOGÍA / REGLA TEMPORAL PRECISA
    // =========================================================================
    rulerHeight: 36,
    rulerMarkers: [], // Objetos: { id, date: Date, label }
    hoveredMarker: null,
    draggedMarker: null,
    isRulerPanning: false, // Arrastre horizontal exclusivo de la cronología
    rulerPanStartX: 0,
    rulerPanHasDragged: false,
    rulerPanX: 0, // Desplazamiento propio de la regla independiente del canvas

    // Parámetros de escala temporal base:
    timelineBaseYear: 2000, 
    pxPerMonth: 12, // Densidad temporal base
    isRulerLocked: false, // BLOQUEO DE ESCALA TEMPORAL (Fija directamente al Canvas libre)

    // =========================================================================
    // DILATACIÓN DINÁMICA FOCAL (TIME WARP LENS)
    // =========================================================================
    focalWarpActive: false,
    focalWorldX: 0,
    focalRadius: 300,
    warpIntensity: 2.5,

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loadTimelineConfig();
        this.bindEvents();
        if (typeof this.loop === 'function') {
            this.loop();
        } else {
            console.warn("Saga.Canvas.loop aún no está cargado.");
        }
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    saveTimelineConfig() {
        try {
            const payload = {
                timelineBaseYear: this.timelineBaseYear,
                pxPerMonth: this.pxPerMonth,
                isRulerLocked: this.isRulerLocked,
                rulerPanX: this.rulerPanX,
                rulerMarkers: (this.rulerMarkers || []).filter(Boolean).map(m => ({
                    id: m.id,
                    date: m.date instanceof Date ? m.date.toISOString() : m.date,
                    label: m.label
                }))
            };
            localStorage.setItem('saga_timeline_config', JSON.stringify(payload));
        } catch (e) {
            console.error("Error guardando la configuración de cronología:", e);
        }
    },

    loadTimelineConfig() {
        try {
            const stored = localStorage.getItem('saga_timeline_config');
            if (!stored) return;
            const data = JSON.parse(stored);
            if (typeof data.timelineBaseYear === 'number') this.timelineBaseYear = data.timelineBaseYear;
            if (typeof data.pxPerMonth === 'number') this.pxPerMonth = data.pxPerMonth;
            if (typeof data.isRulerLocked === 'boolean') this.isRulerLocked = data.isRulerLocked;
            if (typeof data.rulerPanX === 'number') this.rulerPanX = data.rulerPanX;
            if (Array.isArray(data.rulerMarkers)) {
                this.rulerMarkers = data.rulerMarkers.filter(Boolean).map(m => ({
                    id: m.id,
                    date: new Date(m.date),
                    label: m.label
                }));
            }
        } catch (e) {
            console.error("Error cargando la configuración de cronología:", e);
        }
    },

    applyFocalWarp(worldX) {
        if (!this.focalWarpActive) return worldX;
        const dist = worldX - this.focalWorldX;
        const absDist = Math.abs(dist);
        if (absDist > this.focalRadius) {
            const sign = Math.sign(dist);
            const maxExpansion = (this.warpIntensity - 1) * (this.focalRadius * 0.7);
            return worldX + sign * maxExpansion;
        }
        const norm = dist / this.focalRadius;
        const factor = Math.pow(1 - Math.pow(norm, 2), 2); 
        const offset = dist * (this.warpIntensity - 1) * factor;
        return worldX + offset;
    },

    getRulerPanX() {
        return this.isRulerLocked ? this.panX : this.rulerPanX;
    },

    worldXToDate(rawWorldX) {
        const totalMonths = rawWorldX / this.pxPerMonth;
        const baseDate = new Date(this.timelineBaseYear, 0, 1);
        const targetDate = new Date(baseDate.getTime());
        const wholeMonths = Math.floor(totalMonths);
        const fractionMonth = totalMonths - wholeMonths;
        targetDate.setMonth(targetDate.getMonth() + wholeMonths);
        targetDate.setDate(targetDate.getDate() + Math.round(fractionMonth * 30));
        return targetDate;
    },

    dateToWorldX(date) {
        const baseDate = new Date(this.timelineBaseYear, 0, 1);
        const diffYears = date.getFullYear() - baseDate.getFullYear();
        const diffMonths = date.getMonth();
        const diffDays = date.getDate() - 1;
        const totalMonths = diffYears * 12 + diffMonths + (diffDays / 30);
        const linearWorldX = totalMonths * this.pxPerMonth;
        return this.applyFocalWarp(linearWorldX);
    },

    formatDateLabel(date, detailLevel = 'month') {
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        if (detailLevel === 'day') {
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        } else if (detailLevel === 'month') {
            return `${months[date.getMonth()]} ${date.getFullYear()}`;
        }
        return `${date.getFullYear()}`;
    },

    syncNodesFromCore() {
        const coreItems = window.Saga.Core.items || [];
        const width = 160;
        const height = 160;
        if (window.Saga.Core.tramas) {
            this.regions = window.Saga.Core.tramas
                .filter(t => t && t.type === 'Region')
                .map(r => ({
                    id: r.id,
                    name: r.name || "Zona",
                    x: r.x || 100,
                    y: r.y || 100,
                    w: r.width || r.w || 400,
                    h: r.height || r.h || 300
                }));
        }
        this.nodes = coreItems.filter(Boolean).map((item, index) => {
            const existing = (this.nodes || []).find(n => n && n.id === item.filename);
            const defaultX = 100 + (index % 5) * 200;
            const defaultY = 100 + Math.floor(index / 5) * 200;
            const x = existing ? existing.x : (item.data && item.data.x !== undefined ? item.data.x : defaultX);
            const y = existing ? existing.y : (item.data && item.data.y !== undefined ? item.data.y : defaultY);
            if (item.displayUrl && !this.imageCache[item.displayUrl]) {
                const img = new Image();
                img.src = item.displayUrl;
                img.onload = () => { this.imageCache[item.displayUrl] = img; };
            }
            return {
                id: item.filename,
                title: (item.data && item.data.name) || "Sin nombre",
                type: (item.data && item.data.type) || "Dato",
                desc: (item.data && item.data.desc) || "",
                visualDesc: (item.data && item.data.visualDesc) || "",
                tags: (item.data && item.data.tags) || [],
                displayUrl: item.displayUrl,
                connections: (item.data && item.data.connections) || [],
                x, y, w: width, h: height
            };
        });
    },

    saveRegionsToCore() {
        const regionsPayload = (this.regions || []).filter(Boolean).map(r => ({
            id: r.id,
            name: r.name,
            type: 'Region',
            x: r.x,
            y: r.y,
            width: r.w,
            height: r.h
        }));
        window.Saga.Core.saveRegions(regionsPayload);
    },

    saveAllNodePositions() {
        (this.nodes || []).forEach(node => {
            if (!node || !node.id) return;
            const item = window.Saga.Core.items.find(i => i && i.filename === node.id);
            if (item && item.data) {
                item.data.x = node.x;
                item.data.y = node.y;
                window.Saga.Core.saveNodeData(item.filename, item.data);
            }
        });
    },

    applyTimelineOffsetToData() {
        const deltaWorldX = (this.rulerPanX - this.panX) / this.zoom;
        if (Math.abs(deltaWorldX) < 0.001) return;
        if (window.app) window.app.pushState();
        (this.nodes || []).forEach(node => {
            if (node && typeof node.x !== 'undefined') {
                node.x -= deltaWorldX;
            }
        });
        (this.regions || []).forEach(region => {
            if (region && typeof region.x !== 'undefined') {
                region.x -= deltaWorldX;
            }
        });
        this.rulerPanX = this.panX;
        this.saveAllNodePositions();
        this.saveRegionsToCore();
    },

    screenToWorld(sx, sy) {
        return {
            x: (sx - this.panX) / this.zoom,
            y: (sy - this.panY) / this.zoom
        };
    },

    worldToScreen(wx, wy) {
        return {
            x: wx * this.zoom + this.panX,
            y: wy * this.zoom + this.panY
        };
    },

    getNodeRegion(node) {
        if (!node || typeof node.x === 'undefined') return null;
        const centerX = node.x + node.w / 2;
        const centerY = node.y + node.h / 2;
        return (this.regions || []).find(r => 
            r &&
            centerX >= r.x && centerX <= r.x + r.w &&
            centerY >= r.y && centerY <= r.y + r.h
        );
    },

    addRulerMarker(worldX) {
        const calculatedDate = this.worldXToDate(worldX);
        const formattedDefaultDate = calculatedDate.toISOString().substring(0, 10);
        const userInput = prompt(
            `Asignar Fecha/Hito Temporal:\n(Formato AAAA-MM-DD o etiqueta personalizada)`,
            formattedDefaultDate
        );
        if (userInput === null || userInput.trim() === "") return;
        let finalDate = calculatedDate;
        let label = userInput.trim();
        const dateParsed = new Date(userInput);
        if (!isNaN(dateParsed.getTime())) {
            finalDate = dateParsed;
            label = this.formatDateLabel(dateParsed, 'day');
        }
        this.rulerMarkers.push({
            id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            date: finalDate,
            label: label
        });
        this.saveTimelineConfig();
    },

    removeRulerMarker(id) {
        this.rulerMarkers = (this.rulerMarkers || []).filter(m => m && m.id !== id);
        this.saveTimelineConfig();
    },

    // =========================================================================
    // NAVEGACIÓN VÍA MINIMAPA
    // =========================================================================
    getMinimapBounds() {
        const size = 180;
        const margin = 16;
        const x = margin;
        const y = this.canvas.height - size - margin;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        if (this.nodes.length === 0 && this.regions.length === 0) {
            minX = -500; minY = -500; maxX = 500; maxY = 500;
        } else {
            this.nodes.forEach(n => {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x + n.w);
                maxY = Math.max(maxY, n.y + n.h);
            });
            this.regions.forEach(r => {
                minX = Math.min(minX, r.x);
                minY = Math.min(minY, r.y);
                maxX = Math.max(maxX, r.x + r.w);
                maxY = Math.max(maxY, r.y + r.h);
            });
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

        return { x, y, size, minX, minY, worldW, worldH, mapScale, offsetX, offsetY };
    },

    checkMinimapClick(screenX, screenY) {
        const m = this.getMinimapBounds();
        if (screenX >= m.x && screenX <= m.x + m.size && screenY >= m.y && screenY <= m.y + m.size) {
            const targetWorldX = m.minX + (screenX - m.offsetX) / m.mapScale;
            const targetWorldY = m.minY + (screenY - m.offsetY) / m.mapScale;

            this.panX = (this.canvas.width / 2) - (targetWorldX * this.zoom);
            this.panY = (this.canvas.height / 2) - (targetWorldY * this.zoom);
            if (this.isRulerLocked) {
                this.rulerPanX = this.panX;
            }
            return true;
        }
        return false;
    },

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                this.focalWarpActive = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.focalWarpActive = false;
            }
        });
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.isRightDragging) {
                this.isRightDragging = false;
                return;
            }
            if (e.clientY <= this.rulerHeight) {
                const screenX = e.clientX;
                const rulerPan = this.getRulerPanX();
                const marker = (this.rulerMarkers || []).find(m => {
                    if (!m) return false;
                    const wx = this.dateToWorldX(m.date);
                    const sx = wx * this.zoom + rulerPan;
                    return Math.abs(screenX - sx) <= 12;
                });
                if (marker) {
                    if (confirm(`¿Eliminar hito temporal "${marker.label}"?`)) {
                        this.removeRulerMarker(marker.id);
                    }
                }
                return;
            }
            const world = this.screenToWorld(e.clientX, e.clientY);
            this.ctxMenuWorldPos = world;
            const menuGlobal = document.getElementById('ctx-menu');
            const nodeMenu = document.getElementById('ctx-menu-node');
            const zoneMenu = document.getElementById('ctx-menu-zone');
            if (menuGlobal) menuGlobal.classList.add('hidden');
            if (nodeMenu) nodeMenu.classList.add('hidden');
            if (zoneMenu) zoneMenu.classList.add('hidden');
            const node = (this.nodes || []).find(n => 
                n && world.x >= n.x && world.x <= n.x + n.w &&
                world.y >= n.y && world.y <= n.y + n.h
            );
            if (node) {
                this.selectedNodeId = node.id;
                this.selectedRegionId = null;
                if (nodeMenu) {
                    nodeMenu.style.left = `${e.clientX}px`;
                    nodeMenu.style.top = `${e.clientY}px`;
                    nodeMenu.classList.remove('hidden');
                }
                return;
            }
            const region = (this.regions || []).find(r => 
                r && world.x >= r.x && world.x <= r.x + r.w &&
                world.y >= r.y && world.y <= r.y + r.h
            );
            if (region) {
                this.selectedRegionId = region.id;
                this.selectedNodeId = null;
                if (zoneMenu) {
                    zoneMenu.style.left = `${e.clientX}px`;
                    zoneMenu.style.top = `${e.clientY}px`;
                    zoneMenu.classList.remove('hidden');
                }
                return;
            }
            if (menuGlobal) {
                menuGlobal.style.left = `${e.clientX}px`;
                menuGlobal.style.top = `${e.clientY}px`;
                menuGlobal.classList.remove('hidden');
            }
        });
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.checkMinimapClick(e.clientX, e.clientY)) {
                return;
            }

            if (e.clientY <= this.rulerHeight && e.button === 0) {
                const screenX = e.clientX;
                if (screenX >= this.canvas.width - 130 && screenX <= this.canvas.width - 10) {
                    if (!this.isRulerLocked) {
                        this.applyTimelineOffsetToData();
                    } else {
                        this.rulerPanX = this.panX;
                    }
                    this.isRulerLocked = !this.isRulerLocked;
                    this.saveTimelineConfig();
                    return; 
                }
                const rulerPan = this.getRulerPanX();
                const clickedMarker = (this.rulerMarkers || []).find(m => {
                    if (!m) return false;
                    const wx = this.dateToWorldX(m.date);
                    const sx = wx * this.zoom + rulerPan;
                    return Math.abs(screenX - sx) <= 12;
                });
                if (clickedMarker) {
                    this.draggedMarker = clickedMarker;
                } else {
                    this.isRulerPanning = true;
                    this.rulerPanStartX = e.clientX;
                    this.rulerPanHasDragged = false;
                }
                this.lastMouse = { x: e.clientX, y: e.clientY };
                return;
            }
            const world = this.screenToWorld(e.clientX, e.clientY);
            if (e.button === 2) {
                this.isBoxSelecting = true;
                this.isRightDragging = false;
                this.boxSelectStart = world;
                this.boxSelectEnd = world;
                this.lastMouse = { x: e.clientX, y: e.clientY };
                return;
            }
            if (e.button !== 0) return;
            for (let i = (this.nodes || []).length - 1; i >= 0; i--) {
                const node = this.nodes[i];
                if (!node || typeof node.x === 'undefined') continue;
                const outPortX = node.x + node.w;
                const outPortY = node.y + node.h / 2;
                if (Math.hypot(world.x - outPortX, world.y - outPortY) <= 10) {
                    this.connectingNode = node;
                    return;
                }
                if (world.x >= node.x && world.x <= node.x + node.w &&
                    world.y >= node.y && world.y <= node.y + node.h) {
                    
                    if (window.app) window.app.pushState();
                    if (Array.isArray(this.selectedNodeIds) && this.selectedNodeIds.includes(node.id)) {
                        this.draggedGroupNodes = this.nodes.filter(n => n && this.selectedNodeIds.includes(n.id));
                    } else {
                        this.selectedNodeIds = [];
                        this.draggedGroupNodes = [];
                        this.draggedNode = node;
                    }
                    this.selectedNodeId = node.id;
                    this.selectedRegionId = null;
                    this.lastMouse = { x: e.clientX, y: e.clientY };
                    if (window.app && window.app.openEditDataDrawer) {
                        window.app.openEditDataDrawer(node);
                    }
                    return;
                }
            }
            this.selectedNodeIds = [];
            this.draggedGroupNodes = [];
            for (let i = (this.regions || []).length - 1; i >= 0; i--) {
                const r = this.regions[i];
                if (!r || typeof r.x === 'undefined') continue;
                const handleX = r.x + r.w - 12;
                const handleY = r.y + r.h - 12;
                if (world.x >= handleX && world.x <= r.x + r.w && world.y >= handleY && world.y <= r.y + r.h) {
                    if (window.app) window.app.pushState();
                    this.resizingRegion = r;
                    this.selectedRegionId = r.id;
                    this.selectedNodeId = null;
                    this.lastMouse = { x: e.clientX, y: e.clientY };
                    return;
                }
                if (world.x >= r.x && world.x <= r.x + r.w && world.y >= r.y && world.y <= r.y + r.h) {
                    if (window.app) window.app.pushState();
                    this.draggedRegion = r;
                    this.selectedRegionId = r.id;
                    this.selectedNodeId = null;
                    this.draggedChildren = (this.nodes || []).filter(n => 
                        n && n.x >= r.x && n.x + n.w <= r.x + r.w &&
                        n.y >= r.y && n.y + n.h <= r.y + r.h
                    );
                    this.lastMouse = { x: e.clientX, y: e.clientY };
                    if (world.y <= r.y + 28) {
                        if (window.app && window.app.openEditZoneDrawer) {
                            window.app.openEditZoneDrawer(r);
                        }
                    }
                    return;
                }
            }
            this.isPanning = true;
            this.selectedNodeId = null;
            this.selectedRegionId = null;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        this.canvas.addEventListener('mousemove', (e) => {
            const dx = e.clientX - (this.lastMouse ? this.lastMouse.x : e.clientX);
            const dy = e.clientY - (this.lastMouse ? this.lastMouse.y : e.clientY);
            const worldPosMouse = this.screenToWorld(e.clientX, 0);
            this.focalWorldX = worldPosMouse.x;
            if (this.isRulerPanning) {
                if (Math.abs(e.clientX - this.rulerPanStartX) > 4) {
                    this.rulerPanHasDragged = true;
                }
                
                if (this.isRulerLocked) {
                    this.panX += dx;
                    this.rulerPanX = this.panX;
                } else {
                    this.rulerPanX += dx;
                }
                
                this.lastMouse = { x: e.clientX, y: e.clientY };
                return;
            }
            if (this.draggedMarker) {
                const rulerPan = this.getRulerPanX();
                const worldX = (e.clientX - rulerPan) / this.zoom;
                this.draggedMarker.date = this.worldXToDate(worldX);
                this.lastMouse = { x: e.clientX, y: e.clientY };
                return;
            }
            if (e.clientY <= this.rulerHeight) {
                const screenX = e.clientX;
                const rulerPan = this.getRulerPanX();
                this.hoveredMarker = (this.rulerMarkers || []).find(m => {
                    if (!m) return false;
                    const wx = this.dateToWorldX(m.date);
                    const sx = wx * this.zoom + rulerPan;
                    return Math.abs(screenX - sx) <= 12;
                }) || null;
            } else {
                this.hoveredMarker = null;
            }
            if (this.isBoxSelecting) {
                if (Math.hypot(dx, dy) > 2) {
                    this.isRightDragging = true;
                }
                this.boxSelectEnd = this.screenToWorld(e.clientX, e.clientY);
            } else if (Array.isArray(this.draggedGroupNodes) && this.draggedGroupNodes.length > 0) {
                const wx = dx / this.zoom;
                const wy = dy / this.zoom;
                this.draggedGroupNodes.forEach(node => {
                    if (node && typeof node.x !== 'undefined') {
                        node.x += wx;
                        node.y += wy;
                    }
                });
            } else if (this.draggedNode && typeof this.draggedNode.x !== 'undefined') {
                this.draggedNode.x += dx / this.zoom;
                this.draggedNode.y += dy / this.zoom;
            } else if (this.resizingRegion) {
                this.resizingRegion.w = Math.max(150, this.resizingRegion.w + dx / this.zoom);
                this.resizingRegion.h = Math.max(100, this.resizingRegion.h + dy / this.zoom);
            } else if (this.draggedRegion) {
                const wx = dx / this.zoom;
                const wy = dy / this.zoom;
                this.draggedRegion.x += wx;
                this.draggedRegion.y += wy;
                if (Array.isArray(this.draggedChildren)) {
                    this.draggedChildren.forEach(child => {
                        if (child && typeof child.x !== 'undefined') {
                            child.x += wx;
                            child.y += wy;
                        }
                    });
                }
            } else if (this.isPanning) {
                this.panX += dx;
                if (this.isRulerLocked) {
                    this.rulerPanX = this.panX;
                }
                this.panY += dy;
            }
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isRulerPanning) {
                this.isRulerPanning = false;
                this.saveTimelineConfig();
            }
            if (this.draggedMarker) {
                this.draggedMarker = null;
                this.saveTimelineConfig();
            }
            if (this.isBoxSelecting) {
                this.isBoxSelecting = false;
                const minX = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
                const maxX = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
                const minY = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
                const maxY = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);
                if (Math.abs(maxX - minX) > 5 || Math.abs(maxY - minY) > 5) {
                    const selected = (this.nodes || []).filter(n => 
                        n && n.x + n.w >= minX && n.x <= maxX &&
                        n.y + n.h >= minY && n.y <= maxY
                    );
                    this.selectedNodeIds = selected.map(n => n.id);
                    if (this.selectedNodeIds.length > 0) {
                        this.selectedNodeId = this.selectedNodeIds[0];
                    }
                }
            }
            if (this.connectingNode) {
                const world = this.screenToWorld(e.clientX, e.clientY);
                const target = (this.nodes || []).find(n => 
                    n && n !== this.connectingNode &&
                    world.x >= n.x && world.x <= n.x + n.w &&
                    world.y >= n.y && world.y <= n.y + n.h
                );
                if (target) {
                    if (!this.connectingNode.connections.includes(target.id)) {
                        if (window.app) window.app.pushState();
                        this.connectingNode.connections.push(target.id);
                        const item = window.Saga.Core.items.find(i => i && i.filename === this.connectingNode.id);
                        if (item && item.data) {
                            item.data.connections = this.connectingNode.connections;
                            window.Saga.Core.saveNodeData(item.filename, item.data);
                        }
                    }
                }
            }
            if (Array.isArray(this.draggedGroupNodes) && this.draggedGroupNodes.length > 0) {
                this.draggedGroupNodes.forEach(node => {
                    if (!node || !node.id) return;
                    const item = window.Saga.Core.items.find(i => i && i.filename === node.id);
                    if (item && item.data) {
                        item.data.x = node.x;
                        item.data.y = node.y;
                        window.Saga.Core.saveNodeData(item.filename, item.data);
                    }
                });
            }
            if (this.draggedNode && this.draggedNode.id) {
                const item = window.Saga.Core.items.find(i => i && i.filename === this.draggedNode.id);
                if (item && item.data) {
                    item.data.x = this.draggedNode.x;
                    item.data.y = this.draggedNode.y;
                    window.Saga.Core.saveNodeData(item.filename, item.data);
                }
            }
            if (this.draggedRegion && Array.isArray(this.draggedChildren) && this.draggedChildren.length > 0) {
                this.draggedChildren.forEach(child => {
                    if (!child || !child.id) return;
                    const item = window.Saga.Core.items.find(i => i && i.filename === child.id);
                    if (item && item.data) {
                        item.data.x = child.x;
                        item.data.y = child.y;
                        window.Saga.Core.saveNodeData(item.filename, item.data);
                    }
                });
            }
            if (this.draggedRegion || this.resizingRegion) {
                this.saveRegionsToCore();
            }
            this.draggedNode = null;
            this.draggedGroupNodes = [];
            this.draggedRegion = null;
            this.resizingRegion = null;
            this.draggedChildren = [];
            this.isPanning = false;
            this.connectingNode = null;
        });
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.clientY <= this.rulerHeight) {
                if (!this.isRulerLocked) {
                    const factor = e.deltaY < 0 ? 1.15 : 0.85;
                    const oldPxPerMonth = this.pxPerMonth;
                    const newPxPerMonth = Math.max(0.05, Math.min(oldPxPerMonth * factor, 500));
                    const rulerPan = this.getRulerPanX();
                    const mouseWorldX = (e.clientX - rulerPan) / this.zoom;
                    this.pxPerMonth = newPxPerMonth;
                    this.rulerPanX = e.clientX - (mouseWorldX * (newPxPerMonth / oldPxPerMonth) * this.zoom);
                    this.saveTimelineConfig();
                }
                return;
            }
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.max(0.1, Math.min(this.zoom * zoomFactor, 5));
            this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
            this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
            if (this.isRulerLocked) {
                this.rulerPanX = this.panX;
            }
            this.zoom = newZoom;
        }, { passive: false });
    }
};