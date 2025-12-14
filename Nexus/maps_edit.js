/* NEXUS SILENOS/maps_edit.js */
/**
 * MAP EDITOR V6.2 - GRAPHICS ENGINE + UNDO/REDO
 * Canvas, Render Loop, Geometría y Eventos de Ratón.
 * Incluye soporte para imagen de fondo, transparencia y Control Z/Y.
 */

class MapEditor {
    constructor(system) {
        this.system = system;
        this.canvas = null;
        this.ctx = null;
        
        // Estado
        this.tool = 'SELECT';
        this.currentTerrain = 'plain';
        this.camera = { x: 50, y: 50, zoom: 0.8 };
        
        // Interacción
        this.selection = null; // { type: 'poi'|'poly', obj: ref }
        this.hoverVertex = null;
        this.dragVertex = null;
        
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.lastMouse = { x: 0, y: 0 };
        this.drawingPoly = [];

        // --- SISTEMA UNDO / REDO ---
        this.history = [];      // Pila de estados pasados
        this.future = [];       // Pila de estados futuros (para rehacer)
        this.maxHistory = 50;   // Límite de pasos para no saturar memoria

        this.patterns = {};
        
        // Cache de imagen de fondo
        this.bgImage = new Image();
        this.lastBgSrc = null;
    }

    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.generatePatterns();
        
        // Observers y Listeners
        new ResizeObserver(() => this.resizeCanvas()).observe(this.canvas.parentElement);
        this.bindCanvasEvents();
        this.resizeCanvas();

        // Start Loop
        const animate = () => {
            if (this.canvas.isConnected) {
                this.draw();
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    bindCanvasEvents() {
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        window.addEventListener('mousemove', e => this.onMouseMove(e));
        window.addEventListener('mouseup', e => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
        this.canvas.addEventListener('dblclick', e => this.onDoubleClick(e));

        // --- LISTENER DE TECLADO (GLOBAL) ---
        window.addEventListener('keydown', (e) => {
            // Solo actuar si este editor está activo y visible
            if (!this.system.activeMapId) return;

            // CTRL + Z (Deshacer)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.undo();
            }
            // CTRL + Y (Rehacer)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            }
        });
    }

    // --- SISTEMA DE HISTORIAL (SNAPSHOTS) ---

    /**
     * Guarda el estado ACTUAL del mapa antes de realizar un cambio.
     * Llamar a esto justo antes de modificar datos (mousedown, crear objeto, etc).
     */
    takeSnapshot() {
        const map = this.system.getActiveMap();
        if (!map) return;

        // Clonado profundo del mapa actual
        const state = JSON.parse(JSON.stringify(map));
        
        this.history.push(state);
        
        // Limitar tamaño del historial
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Al hacer una nueva acción, el futuro se borra (ya no puedes rehacer lo antiguo)
        this.future = [];
    }

    undo() {
        if (this.history.length === 0) {
            this.system.notify("Nada que deshacer.");
            return;
        }

        // 1. Guardar estado actual en el futuro (para poder rehacer)
        const currentMap = this.system.getActiveMap();
        this.future.push(JSON.parse(JSON.stringify(currentMap)));

        // 2. Recuperar el último estado del pasado
        const previousState = this.history.pop();
        
        // 3. Restaurar
        this.restoreState(previousState);
        this.system.notify("Deshacer");
    }

    redo() {
        if (this.future.length === 0) {
            this.system.notify("Nada que rehacer.");
            return;
        }

        // 1. Guardar estado actual en el historial (volver a pasado)
        const currentMap = this.system.getActiveMap();
        this.history.push(JSON.parse(JSON.stringify(currentMap)));

        // 2. Recuperar estado del futuro
        const nextState = this.future.pop();

        // 3. Restaurar
        this.restoreState(nextState);
        this.system.notify("Rehacer");
    }

    restoreState(state) {
        if (!state) return;
        
        // Buscar el mapa en la saga y reemplazarlo completamente
        const maps = this.system.sagaData.maps;
        const index = maps.findIndex(m => m.id === state.id);
        
        if (index !== -1) {
            maps[index] = state;
            // Guardar en disco
            this.system.saveData();
            // Limpiar selección para evitar errores de referencia
            this.deselect(); 
            // Si la UI tiene listas que dependen de esto, refrescar
            if(this.system.ui) this.system.ui.refreshList();
        }
    }

    // --- LOGICA DE ESTADO ---

    setTool(toolName) {
        this.tool = toolName;
        if(this.tool !== 'SELECT') this.deselect();
        this.canvas.style.cursor = this.tool === 'PAN' ? 'grab' : (this.tool === 'SELECT' ? 'default' : 'crosshair');
    }

    setTerrain(type) {
        // Si hay selección, esto modifica datos -> Guardar Snapshot
        if (this.selection && this.selection.type === 'poly') {
            this.takeSnapshot();
        }
        
        this.currentTerrain = type;
        if (this.selection && this.selection.type === 'poly') {
            this.updateSelectionProp('type', type);
        }
    }

    selectObject(type, obj) {
        this.selection = { type, obj };
        this.tool = 'SELECT';
        this.system.ui.updatePropPanel(this.selection);
        this.system.ui.updateToolbarUI();
    }

    deselect() {
        this.selection = null;
        this.system.ui.updatePropPanel(null); // Volver a propiedades de mapa
    }

    updateSelectionProp(key, value) {
        if (this.selection) {
            // Nota: Si esto se llama input-by-input (onInput), mejor no hacer snapshot en cada letra.
            // Idealmente el snapshot se hace en 'onFocus' del input, pero aquí lo simplificamos.
            // Para ediciones grandes, usa takeSnapshot antes de llamar a esto.
            this.selection.obj[key] = value;
            this.system.saveData();
        }
    }

    moveLayer(direction) {
        if (!this.selection || this.selection.type !== 'poly') return;
        
        this.takeSnapshot(); // Guardar antes de mover capa

        const map = this.system.getActiveMap();
        const arr = map.polygons;
        const idx = arr.indexOf(this.selection.obj);
        
        if (idx === -1) return;
        
        const [item] = arr.splice(idx, 1);
        if (direction === 'FRONT') arr.push(item);
        else arr.unshift(item);

        this.system.saveData();
        this.system.notify(direction === 'FRONT' ? "Capa al frente" : "Capa al fondo");
    }

    resetCamera() {
        // Intentar centrar un poco
        this.camera = { x: 50, y: 50, zoom: 0.5 };
    }

    // --- GRAFICOS & DIBUJO ---

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
    }

    generatePatterns() {
        const createPat = (drawFn) => {
            const c = document.createElement('canvas');
            c.width = 20; c.height = 20;
            const x = c.getContext('2d');
            drawFn(x);
            return this.ctx.createPattern(c, 'repeat');
        };

        this.patterns.water = createPat((x) => {
            x.fillStyle = '#d4e6f1'; x.fillRect(0,0,20,20);
            x.strokeStyle = '#a9cce3'; x.beginPath(); x.moveTo(0,10); x.lineTo(20,10); x.stroke();
        });
        this.patterns.forest = createPat((x) => {
            x.fillStyle = '#d5f5e3'; x.fillRect(0,0,20,20);
            x.fillStyle = '#82e0aa'; x.beginPath(); x.arc(10,10,2,0,Math.PI*2); x.fill();
        });
        this.patterns.mountain = createPat((x) => {
            x.fillStyle = '#f2f3f4'; x.fillRect(0,0,20,20);
            x.strokeStyle = '#bdc3c7'; x.beginPath(); x.moveTo(0,20); x.lineTo(20,0); x.stroke();
        });
        this.patterns.danger = createPat((x) => {
            x.fillStyle = '#fadbd8'; x.fillRect(0,0,20,20);
            x.strokeStyle = '#e6b0aa'; x.beginPath(); x.moveTo(0,0); x.lineTo(20,20); x.stroke();
        });
        this.patterns.plain = createPat((x) => { x.fillStyle = '#ffffff'; x.fillRect(0,0,20,20); });
        
        // Patrón para el Grid de fondo
        this.patterns.grid = createPat((x) => {
            x.fillStyle = '#ffffff'; x.fillRect(0,0,20,20);
            x.fillStyle = '#f0f0f0'; x.beginPath(); x.arc(10,10,1,0,Math.PI*2); x.fill();
        });
    }

    draw() {
        // 1. Limpiar pantalla con color de "vacío" (fuera del mapa)
        this.ctx.fillStyle = '#bdc3c7'; // Gris oscuro para el "escritorio"
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const map = this.system.getActiveMap();
        if (!map) {
            this.ctx.textAlign = 'center'; 
            this.ctx.fillStyle = '#555';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText("SELECCIONA O CREA UN MAPA", this.canvas.width/2, this.canvas.height/2);
            return;
        }

        // Definir dimensiones
        const mapW = map.width || 2000;
        const mapH = map.height || 1500;

        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        // 2. DIBUJAR "PAPEL" (Área del Mapa)
        // Sombra del papel
        this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 10;
        this.ctx.shadowOffsetY = 10;
        
        // Base Blanca o Grid
        this.ctx.fillStyle = this.patterns.grid || '#fff';
        this.ctx.fillRect(0, 0, mapW, mapH);
        
        this.ctx.shadowColor = 'transparent'; // Reset sombra

        // 2.1 IMAGEN DE FONDO (Si existe)
        if (map.backgroundImage) {
            // Cargar imagen solo si ha cambiado
            if (this.lastBgSrc !== map.backgroundImage) {
                this.bgImage.src = map.backgroundImage;
                this.lastBgSrc = map.backgroundImage;
            }
            // Dibujar si está lista
            if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
                this.ctx.drawImage(this.bgImage, 0, 0, mapW, mapH);
            }
        }
        
        // Borde del papel
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0, 0, mapW, mapH);

        // 3. Polígonos
        map.polygons.forEach(poly => {
            const isSelected = (this.selection && this.selection.obj === poly);

            this.ctx.beginPath();
            if(poly.points.length) {
                this.ctx.moveTo(poly.points[0].x, poly.points[0].y);
                for(let i=1; i<poly.points.length; i++) this.ctx.lineTo(poly.points[i].x, poly.points[i].y);
            }
            this.ctx.closePath();

            this.ctx.save(); // Guardar estado para transparencia
            
            // APLICAR TRANSPARENCIA AL RELLENO
            // Esto permite ver la imagen de fondo a través del terreno
            this.ctx.globalAlpha = 0.65; 
            
            this.ctx.fillStyle = this.patterns[poly.type] || this.patterns.plain;
            this.ctx.fill();
            
            this.ctx.restore(); // Restaurar opacidad (1.0) para los bordes

            this.ctx.lineWidth = isSelected ? 2 : 1;
            this.ctx.strokeStyle = isSelected ? '#00acc1' : 'rgba(0,0,0,0.2)';
            this.ctx.stroke();

            // Puntos de control si seleccionado
            if (isSelected) {
                this.ctx.fillStyle = 'white';
                this.ctx.strokeStyle = '#00acc1';
                this.ctx.lineWidth = 2;
                const handleSize = 6 / this.camera.zoom;
                poly.points.forEach(p => {
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, handleSize, 0, Math.PI*2);
                    this.ctx.fill();
                    this.ctx.stroke();
                });
            }
        });

        // 4. Dibujo en curso
        if (this.drawingPoly.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.drawingPoly[0].x, this.drawingPoly[0].y);
            this.drawingPoly.forEach(p => this.ctx.lineTo(p.x, p.y));
            // Hilo elástico
            const wMouse = this.toWorld(this.lastMouse.x, this.lastMouse.y);
            this.ctx.lineTo(wMouse.x, wMouse.y);

            this.ctx.strokeStyle = '#00acc1';
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // 5. POIs (Siempre opacos encima de todo)
        map.pois.forEach(poi => {
            const isSelected = (this.selection && this.selection.obj === poi);
            const scaleFix = 1 / this.camera.zoom; 

            this.ctx.save();
            this.ctx.translate(poi.x, poi.y);
            this.ctx.scale(scaleFix, scaleFix);

            // Sombra
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.beginPath(); this.ctx.arc(0, 3, 6, 0, Math.PI*2); this.ctx.fill();

            // Pin
            this.ctx.fillStyle = isSelected ? '#00acc1' : '#e74c3c';
            this.ctx.beginPath(); this.ctx.arc(0, 0, 6, 0, Math.PI*2); this.ctx.fill();
            this.ctx.strokeStyle = 'white'; this.ctx.lineWidth = 2; this.ctx.stroke();

            // Label
            this.ctx.font = 'bold 12px Arial';
            const labelW = this.ctx.measureText(poi.label).width;
            this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
            this.ctx.fillRect(-labelW/2 - 4, -24, labelW + 8, 16);
            this.ctx.fillStyle = '#333';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(poi.label, 0, -12);

            this.ctx.restore();
        });

        this.ctx.restore();
    }

    // --- MATEMÁTICAS ---

    toWorld(sx, sy) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (sx - rect.left - this.camera.x) / this.camera.zoom,
            y: (sy - rect.top - this.camera.y) / this.camera.zoom
        };
    }

    pointInPoly(p, vs) {
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i].x, yi = vs[i].y;
            const xj = vs[j].x, yj = vs[j].y;
            const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // --- EVENTOS DE RATÓN (PROCESADOS) ---

    onMouseDown(e) {
        if (!this.system.activeMapId) return;
        
        const wPos = this.toWorld(e.clientX, e.clientY);
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.isDragging = true;
        this.dragStart = { ...wPos };

        const map = this.system.getActiveMap();

        if (this.tool === 'SELECT') {
            // 1. Vértices (Prioridad Alta)
            if (this.selection && this.selection.type === 'poly') {
                const poly = this.selection.obj;
                const hitRadius = 10 / this.camera.zoom;
                const vIdx = poly.points.findIndex(p => Math.hypot(p.x - wPos.x, p.y - wPos.y) < hitRadius);
                if (vIdx !== -1) {
                    this.takeSnapshot(); // SNAPSHOT: Inicio arrastre vértice
                    this.dragVertex = { poly, index: vIdx };
                    return;
                }
            }
            
            // 2. POIs
            const hitPoi = map.pois.slice().reverse().find(p => Math.hypot(p.x - wPos.x, p.y - wPos.y) < 15 / this.camera.zoom);
            if (hitPoi) {
                // Si vamos a arrastrar el POI, hay que guardar, pero mousedown no garantiza arrastre.
                // Guardamos snapshot preventivo si es POI seleccionado. 
                // Mejor: guardamos snapshot siempre que "agarramos" algo modificable.
                this.takeSnapshot(); // SNAPSHOT: Posible movimiento de POI
                this.selectObject('poi', hitPoi);
                return;
            }

            // 3. Polígonos
            const hitPoly = map.polygons.slice().reverse().find(poly => this.pointInPoly(wPos, poly.points));
            if (hitPoly) {
                this.takeSnapshot(); // SNAPSHOT: Posible movimiento de Polígono
                this.selectObject('poly', hitPoly);
                return;
            }

            // Nada -> Pan temporal (No requiere snapshot)
            this.deselect();
            this.tool = 'PAN_TEMP';
            this.canvas.style.cursor = 'grabbing';

        } else if (this.tool === 'POINT') {
            const label = prompt("Nombre del lugar:", "Nuevo Punto");
            if (label) {
                this.takeSnapshot(); // SNAPSHOT: Creación de POI
                const poi = { x: wPos.x, y: wPos.y, label, type: 'dot' };
                map.pois.push(poi);
                this.system.saveData();
                this.selectObject('poi', poi);
                this.setTool('SELECT'); // Volver a select
            }
        } else if (this.tool === 'POLY') {
            // No hacemos snapshot en cada punto del polígono, 
            // sino cuando se cierra (en onDoubleClick).
            this.drawingPoly.push(wPos);
        }
    }

    onMouseMove(e) {
        if (!this.canvas.isConnected) return;
        const wPos = this.toWorld(e.clientX, e.clientY);
        this.system.ui.updateCoords(wPos.x, wPos.y, this.camera.zoom);

        if (!this.isDragging) return;

        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };

        if (this.dragVertex) {
            // Editando vértice
            const { poly, index } = this.dragVertex;
            poly.points[index].x += dx / this.camera.zoom;
            poly.points[index].y += dy / this.camera.zoom;
        } 
        else if (this.tool === 'PAN' || this.tool === 'PAN_TEMP') {
            this.camera.x += dx;
            this.camera.y += dy;
        }
        else if (this.tool === 'SELECT' && this.selection) {
            // Mover objeto completo
            const dWorldX = dx / this.camera.zoom;
            const dWorldY = dy / this.camera.zoom;

            if (this.selection.type === 'poi') {
                this.selection.obj.x += dWorldX;
                this.selection.obj.y += dWorldY;
            } else if (this.selection.type === 'poly') {
                this.selection.obj.points.forEach(p => {
                    p.x += dWorldX;
                    p.y += dWorldY;
                });
            }
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.dragVertex = null;
        if (this.tool === 'PAN_TEMP') {
            this.tool = 'SELECT';
            this.canvas.style.cursor = 'default';
        }
        this.system.saveData();
    }

    onWheel(e) {
        if (!this.system.activeMapId) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        const factor = 1 + (delta * 0.1);

        // Zoom al ratón
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const wx = (mx - this.camera.x) / this.camera.zoom;
        const wy = (my - this.camera.y) / this.camera.zoom;

        this.camera.zoom = Math.max(0.1, Math.min(5, this.camera.zoom * factor));
        this.camera.x = mx - wx * this.camera.zoom;
        this.camera.y = my - wy * this.camera.zoom;
        
        this.system.ui.updateCoords(wx, wy, this.camera.zoom);
    }

    onDoubleClick(e) {
        if (this.tool === 'POLY' && this.drawingPoly.length > 2) {
            this.takeSnapshot(); // SNAPSHOT: Finalizar creación de Polígono
            
            const map = this.system.getActiveMap();
            const newPoly = {
                type: this.currentTerrain,
                points: [...this.drawingPoly]
            };
            map.polygons.push(newPoly);
            this.drawingPoly = [];
            this.system.saveData();
            this.selectObject('poly', newPoly);
            this.setTool('SELECT');
        }
    }
}