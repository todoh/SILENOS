/* NEXUS SILENOS/chronos_view.js */
/**
 * CHRONOS VIEW (VISTA GRÁFICA)
 * Motor de renderizado en Canvas, gestión de cámara e input de ratón.
 */

export class ChronosView {
    constructor(manager) {
        this.manager = manager;
        this.canvas = document.getElementById('chronosCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Cámara
        this.view = {
            offsetX: 100,
            offsetY: 150,
            zoom: 1,
            rowHeight: 120,
            groupHeaderHeight: 40
        };

        // Interacción
        this.dragging = {
            active: false, type: null, targetPlace: null, targetEvent: null, lastX: 0, lastY: 0
        };

        // Cache de renderizado
        this.renderList = [];

        this.bindEvents();
        this.fitViewToRange();
        
        // Iniciar Loop
        requestAnimationFrame(() => this.loop());
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    fitViewToRange() {
        const start = parseFloat(this.manager.projectMeta.timeStart) || 0;
        const end = parseFloat(this.manager.projectMeta.timeEnd) || 100;
        let range = end - start;
        if (range === 0) range = 100; 
        const padding = 50; 
        const availableWidth = this.canvas.width - (padding * 2);
        this.view.zoom = availableWidth / range;
        this.view.offsetX = padding - (start * this.view.zoom);
    }

    recalcRenderList() {
        this.renderList = [];
        const groups = this.manager.groups;
        const places = this.manager.places;

        // 1. Grupos y sus hijos
        groups.forEach(g => {
            this.renderList.push({ type: 'GROUP_HEADER', data: g });
            if (!g.collapsed) {
                const lanes = places.filter(p => p.groupId === g.id);
                lanes.forEach(l => {
                    this.renderList.push({ type: 'LANE', data: l, parentGroup: g });
                });
            }
        });

        // 2. Huérfanos
        const orphans = places.filter(p => !p.groupId || !groups.find(g => g.id === p.groupId));
        orphans.forEach(l => {
            this.renderList.push({ type: 'LANE', data: l, parentGroup: null });
        });
    }

    // --- LOOP DE RENDERIZADO ---

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        
        let currentY = this.view.offsetY;

        this.renderList.forEach(item => {
            if (item.type === 'GROUP_HEADER') {
                this.drawGroupPipeline(item.data, currentY);
                currentY += item.data.collapsed ? 50 : 40; 
            } else if (item.type === 'LANE') {
                this.drawLane(item.data, currentY, item.parentGroup);
                currentY += this.view.rowHeight;
            }
        });

        requestAnimationFrame(() => this.loop());
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        this.ctx.lineWidth = 1;
        let step = 10;
        if (this.view.zoom > 10) step = 1;
        else if (this.view.zoom > 2) step = 5;
        else if (this.view.zoom < 0.1) step = 100;

        const startK = Math.floor(this.screenToK(0));
        const endK = Math.ceil(this.screenToK(this.canvas.width));
        
        if (!isFinite(startK) || !isFinite(endK)) return;

        const firstLineK = Math.floor(startK / step) * step;

        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';

        for (let k = firstLineK; k <= endK; k += step) {
            const x = this.view.offsetX + (k * this.view.zoom);
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
            this.ctx.fillText(k, x, 15);
        }
    }

    drawGroupPipeline(group, y) {
        const height = group.collapsed ? 40 : 30;
        const width = this.canvas.width;
        
        // Gradiente
        const grad = this.ctx.createLinearGradient(0, y, 0, y + height);
        grad.addColorStop(0, group.color || '#636e72');
        grad.addColorStop(0.5, '#b2bec3');
        grad.addColorStop(1, group.color || '#636e72');
        
        this.ctx.fillStyle = grad;
        const drawHeight = group.collapsed ? 36 : 24;
        
        this.ctx.beginPath();
        if (this.ctx.roundRect) this.ctx.roundRect(-20, y, width + 40, drawHeight, 10);
        else this.ctx.rect(-20, y, width + 40, drawHeight); // Fallback
        this.ctx.fill();

        // Texto Nombre
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        const icon = group.collapsed ? '▶' : '▼';
        const text = `${icon} ${group.name.toUpperCase()}`;
        this.ctx.fillText(text, 20, y + (drawHeight/2) + 5);

        // --- NUEVO: Icono de Edición (⚙) ---
        // Calculamos dónde termina el texto para poner el icono al lado
        const textWidth = this.ctx.measureText(text).width;
        const gearX = 20 + textWidth + 15;
        const gearY = y + (drawHeight/2) + 5;
        
        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.font = '16px Arial'; 
        this.ctx.fillText("⚙", gearX, gearY); // Icono de engranaje

        // Guardamos posición aproximada en el objeto grupo para el click (chapuza funcional para no recalcular en mousedown)
        group._editIconHitbox = { x: gearX, y: gearY - 10, w: 20, h: 20 };

        // Resumen Eventos (Si colapsado)
        if (group.collapsed) {
            const childLanes = this.manager.places.filter(p => p.groupId === group.id);
            childLanes.forEach(lane => {
                lane.events.forEach(evt => {
                    const x = this.view.offsetX + (evt.k * this.view.zoom);
                    if(x < 0 || x > width) return;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y + (drawHeight/2), 4, 0, Math.PI*2);
                    this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    this.ctx.fill();
                });
            });
            this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText("(Click para expandir)", width - 20, y + (drawHeight/2) + 4);
        }
    }

    drawLane(place, y, parentGroup) {
        const h = this.view.rowHeight;
        const indent = parentGroup ? 20 : 0;
        const midY = y + (h / 2);

        // Fondo
        this.ctx.fillStyle = parentGroup ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)';
        this.ctx.fillRect(0, y, this.canvas.width, h - 10);
        
        // Conexiones de grupo
        if (parentGroup) {
            this.ctx.strokeStyle = parentGroup.color || '#ccc';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(10, y - 10);
            this.ctx.lineTo(10, y + h);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(10, midY);
            this.ctx.lineTo(20, midY);
            this.ctx.stroke();
        }

        // Línea central
        this.ctx.beginPath();
        this.ctx.moveTo(indent, midY);
        this.ctx.lineTo(this.canvas.width, midY);
        this.ctx.strokeStyle = place.color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Etiquetas
        this.ctx.fillStyle = place.color;
        this.ctx.font = 'bold 14px Helvetica';
        this.ctx.textAlign = 'left';
        let nameDisplay = place.name.toUpperCase();
        if(place.linkedDbId) nameDisplay = "🔗 " + nameDisplay;
        this.ctx.fillText(nameDisplay, indent + 20, y + 30);

        // Engranaje
        this.ctx.beginPath();
        this.ctx.arc(indent + 30, y + 50, 8, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.fillText('⚙', indent + 24.5, y + 53.5);

        // Eventos
        place.events.forEach(evt => {
            const x = this.view.offsetX + (evt.k * this.view.zoom);
            if(x < -50 || x > this.canvas.width + 50) return;

            // Nodo base
            this.ctx.beginPath();
            this.ctx.arc(x, midY, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.fill();
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = place.color;
            this.ctx.stroke();

            // Texto
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(evt.title, x, midY - 15);
            
            this.ctx.fillStyle = '#999';
            this.ctx.font = '10px monospace';
            this.ctx.fillText(Math.round(evt.k), x, midY + 22);

            if(evt.mapLocation) this.ctx.fillText("📍", x, midY + 45);
            if((evt.characters?.length > 0) || (evt.stages?.length > 0)) {
                this.ctx.fillStyle = place.color;
                this.ctx.beginPath();
                this.ctx.arc(x, midY + 32, 2, 0, Math.PI*2);
                this.ctx.fill();
            }

            if(this.dragging.targetEvent === evt) {
                this.ctx.beginPath();
                this.ctx.arc(x, midY, 12, 0, Math.PI*2);
                this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                this.ctx.stroke();
            }
        });
        this.ctx.textAlign = 'left';
    }

    screenToK(screenX) {
        return (screenX - this.view.offsetX) / this.view.zoom;
    }

    onMouseDown(e) {
        const mx = e.clientX;
        const my = e.clientY;
        let currentY = this.view.offsetY;

        for (let item of this.renderList) {
            
            if (item.type === 'GROUP_HEADER') {
                const h = item.data.collapsed ? 50 : 40;
                
                // --- NUEVO: Detectar Click en el icono de edición ---
                if (item.data._editIconHitbox) {
                    const box = item.data._editIconHitbox;
                    // Ampliamos un poco el área de click (hitbox generoso)
                    if (mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h) {
                        this.manager.ui.editGroup(item.data);
                        return;
                    }
                }

                if (my >= currentY && my <= currentY + h) {
                    if (mx < 300) { // Toggle Colapso (si no diste al icono)
                        item.data.collapsed = !item.data.collapsed;
                        this.manager.io.saveData();
                        this.recalcRenderList();
                        return;
                    }
                }
                currentY += h;
            } 
            else if (item.type === 'LANE') {
                const place = item.data;
                const h = this.view.rowHeight;
                const indent = item.parentGroup ? 20 : 0;
                const midY = currentY + (h / 2);

                if (my >= currentY && my <= currentY + h) {
                    // Click en Engranaje
                    if (Math.hypot(mx - (indent + 30), my - (currentY + 50)) < 15) {
                        this.manager.ui.openPlaceEditor(place);
                        return;
                    }

                    // Click en Evento
                    for (let evt of place.events) {
                        const ex = this.view.offsetX + (evt.k * this.view.zoom);
                        if (Math.hypot(mx - ex, my - midY) < 15) {
                            this.dragging.active = true;
                            this.dragging.type = 'EVENT';
                            this.dragging.targetEvent = evt;
                            this.dragging.targetPlace = place;
                            this.dragging.lastX = mx;
                            return;
                        }
                    }
                }
                currentY += h;
            }
        }

        // Si no click en nada -> PAN
        this.dragging.active = true;
        this.dragging.type = 'PAN';
        this.dragging.lastX = mx;
        this.dragging.lastY = my;
        this.canvas.style.cursor = 'grabbing';
    }

    onMouseMove(e) {
        if (!this.dragging.active) return;
        const mx = e.clientX;
        const my = e.clientY;
        const dx = mx - this.dragging.lastX;
        const dy = my - this.dragging.lastY;

        if (this.dragging.type === 'PAN') {
            this.view.offsetX += dx;
            this.view.offsetY += dy;
        } else if (this.dragging.type === 'EVENT') {
            const dk = dx / this.view.zoom;
            this.dragging.targetEvent.k += dk;
            const evtTimeInp = document.getElementById('evtTime');
            if(evtTimeInp && !document.getElementById('eventModal').classList.contains('hidden')) {
                evtTimeInp.value = Math.round(this.dragging.targetEvent.k);
            }
        }

        this.dragging.lastX = mx;
        this.dragging.lastY = my;
    }

    onMouseUp(e) {
        if (!this.dragging.active) return;
        if (this.dragging.type === 'EVENT') {
            this.manager.io.saveData();
            this.manager.ui.openEventEditor(this.dragging.targetEvent, this.dragging.targetPlace);
        }
        this.dragging.active = false;
        this.dragging.targetEvent = null;
        this.dragging.type = null;
        this.canvas.style.cursor = 'grab';
    }

    onWheel(e) {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const mx = e.clientX;
        const kMouse = this.screenToK(mx); 
        const newZoom = this.view.zoom - (e.deltaY * zoomSpeed);
        this.view.zoom = Math.max(0.1, Math.min(50, newZoom));
        this.view.offsetX = mx - (kMouse * this.view.zoom);
    }

    onDoubleClick(e) {
        const mx = e.clientX;
        const my = e.clientY;
        
        let currentY = this.view.offsetY;
        let foundLane = null;

        for(let item of this.renderList) {
            if (item.type === 'GROUP_HEADER') {
                currentY += item.data.collapsed ? 50 : 40;
            } else if (item.type === 'LANE') {
                if (my >= currentY && my <= currentY + this.view.rowHeight) {
                    foundLane = item.data;
                    break;
                }
                currentY += this.view.rowHeight;
            }
        }

        if (foundLane) {
            const kVal = this.screenToK(mx);
            const newEvt = {
                id: 'evt_' + Date.now(),
                k: kVal,
                title: 'Nuevo Suceso',
                desc: '',
                characters: [],
                stages: []
            };
            foundLane.events.push(newEvt);
            this.manager.io.saveData();
            this.manager.ui.toast(`Evento creado en: ${foundLane.name} (T: ${Math.round(kVal)})`);
        }
    }
}