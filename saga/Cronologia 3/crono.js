// Abrir Canvas: Cronologia 3/crono.js
// --- crono.js: SISTEMA DE VISUALIZACIÓN (ADAPTATIVO INTEGRADO) ---

class TimelineSystem {
    constructor() {
        this.zoom = 50; 
        this.panX = 0;
        this.events = [];
        this.markers = []; // Array para almacenar las posiciones horizontales (tiempo) de los marcadores
        this.container = document.getElementById('timeline-container');
        this.viewport = document.getElementById('viewport-layer');
        this.ruler = document.getElementById('ruler-ticks');
        this.axis = document.getElementById('track-axis');
        
        this.minimap = document.getElementById('timeline-minimap');
        this.minimapNodes = document.getElementById('minimap-nodes');
        this.minimapViewport = document.getElementById('minimap-viewport');
        
        this.isDragging = false;
        this.startX = 0;
        
        this.initInteraction();
    }

    initInteraction() {
        this.container.addEventListener('mousedown', e => {
            if (e.button === 0) { // Clic izquierdo para arrastrar
                if (e.target.closest('.evt-group-fixed') || e.target.closest('.timeline-minimap-fixed')) return; 
                this.isDragging = true;
                this.startX = e.clientX;
                this.container.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', e => {
            if (this.isDragging) {
                const dx = e.clientX - this.startX;
                this.panX += dx;
                this.startX = e.clientX;
                this.renderTransforms();
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.container.style.cursor = 'grab';
        });

        this.container.addEventListener('wheel', e => {
            e.preventDefault();
            const zoomSensitivity = 0.001 * this.zoom;
            const delta = -e.deltaY * zoomSensitivity;
            const newZoom = Math.max(5, Math.min(500, this.zoom + delta));
            
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const worldX = (mouseX - this.panX) / this.zoom;
            
            this.panX = mouseX - (worldX * newZoom);
            this.zoom = newZoom;
            
            this.renderAll();
        }, { passive: false });
        
        this.container.addEventListener('dblclick', e => {
            if (e.target.closest('.evt-group-fixed') || e.target.closest('.timeline-minimap-fixed')) return;
            const rect = this.container.getBoundingClientRect();
            const worldX = (e.clientX - rect.left - this.panX) / this.zoom;
            window.mainCrono.createEventAt(parseFloat(worldX.toFixed(1)));
        });

        // Evento de Clic Derecho para Añadir o Eliminar Marcadores
        this.container.addEventListener('contextmenu', e => {
            if (e.target.closest('.evt-group-fixed') || e.target.closest('.timeline-minimap-fixed')) return;
            e.preventDefault();

            const rect = this.container.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const worldTime = (clickX - this.panX) / this.zoom;

            // Tolerancia de selección en píxeles para borrar
            const tolerancePx = 12;
            const existingIndex = this.markers.findIndex(mTime => {
                const screenX = (mTime * this.zoom) + this.panX;
                return Math.abs(screenX - clickX) <= tolerancePx;
            });

            if (existingIndex !== -1) {
                // Si hay un marcador bajo el cursor, lo borramos
                this.markers.splice(existingIndex, 1);
            } else {
                // Si no hay ningún marcador, creamos uno nuevo en esa coordenada
                this.markers.push(parseFloat(worldTime.toFixed(2)));
            }

            // Mantenemos los marcadores ordenados cronológicamente
            this.markers.sort((a, b) => a - b);

            // Persistir los marcadores en el archivo del proyecto mediante mainCrono
            this.saveMarkersToProject();

            this.renderAll();
        });

        if (this.minimap) {
            this.minimap.addEventListener('mousedown', e => {
                this.jumpToMinimapRatio(e);
                const onMove = (mv) => this.jumpToMinimapRatio(mv);
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        }
    }

    saveMarkersToProject() {
        if (window.mainCrono && window.mainCrono.data) {
            window.mainCrono.data.markers = [...this.markers];
            if (typeof window.mainCrono.saveData === 'function') {
                window.mainCrono.saveData();
            }
        }
    }

    jumpToMinimapRatio(e) {
        if (this.events.length === 0) return;
        const rect = this.minimap.getBoundingClientRect();
        let ratio = (e.clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio)); 
        
        const minTime = Math.min(...this.events.map(ev => ev.time));
        const maxTime = Math.max(...this.events.map(ev => ev.time));
        let timeSpan = maxTime - minTime;
        if (timeSpan <= 0) timeSpan = 1; 
        
        const targetTime = minTime + (ratio * timeSpan);
        this.panX = (this.container.clientWidth / 2) - (targetTime * this.zoom);
        this.renderAll();
    }

    setData(events, markers = null) {
        this.events = events || [];
        if (Array.isArray(markers)) {
            this.markers = [...markers];
        }
        this.renderAll(); 
    }

    resetView() {
        if (this.events.length === 0) {
            this.panX = this.container.clientWidth / 2;
            this.renderAll();
            return;
        }
        const min = Math.min(...this.events.map(e => e.time));
        const max = Math.max(...this.events.map(e => e.time));
        const mid = (min + max) / 2;
        
        this.panX = (this.container.clientWidth / 2) - (mid * this.zoom);
        this.renderAll();
    }
    
    adjustZoom(delta) {
        this.zoom = Math.max(5, Math.min(500, this.zoom + delta));
        this.renderAll();
    }

    renderTransforms() {
        this.viewport.style.transform = `translate3d(${this.panX}px, 0, 0)`;
        this.ruler.style.transform = `translate3d(${this.panX}px, 0, 0)`;
        this.container.style.backgroundSize = `${this.zoom}px 100px`;
        this.container.style.backgroundPosition = `${this.panX}px 0`;
        this.renderMinimap(); 
    }

    renderAll() {
        this.renderRuler();
        this.renderMarkers();
        this.renderEvents();
        this.renderTransforms();
    }

    renderRuler() {
        this.ruler.innerHTML = '';
        const width = this.container.clientWidth;
        const startVal = -this.panX / this.zoom;
        const endVal = (width - this.panX) / this.zoom;
        
        let interval = 1;
        if (this.zoom < 20) interval = 5;
        if (this.zoom < 10) interval = 10;
        
        const startLoop = Math.floor(startVal / interval) * interval;
        const endLoop = Math.ceil(endVal / interval) * interval;

        for (let i = startLoop; i <= endLoop; i += interval) {
            const pos = i * this.zoom;
            const tick = document.createElement('div');
            tick.className = 'tick-fixed major';
            tick.style.left = `${pos}px`;
            
            const label = document.createElement('div');
            label.className = 'tick-label-fixed';
            label.innerText = i;
            tick.appendChild(label);
            
            this.ruler.appendChild(tick);
        }
    }

    renderMarkers() {
        document.querySelectorAll('.crono-marker-flag').forEach(el => el.remove());

        this.markers.sort((a, b) => a - b);

        this.markers.forEach((mTime, idx) => {
            const pos = mTime * this.zoom;

            const el = document.createElement('div');
            el.className = 'crono-marker-flag absolute top-0 flex flex-col items-center pointer-events-none z-30';
            el.style.left = `${pos}px`;
            el.style.transform = 'translateX(-50%)';

            const numberOrdinal = `${idx + 1}º`;

            el.innerHTML = `
              <div style="height: 50px"> </div> <div  class="bg-indigo-600 text-white font-mono text-[24px] font-bold px-1.5 py-0.5 rounded shadow-md border border-indigo-400 select-none">
                    ${numberOrdinal}
                </div>
                <div class="w-[2px] h-[calc(100vh-120px)] bg-indigo-500/50 border-r border-dashed border-indigo-400/80"></div>
            `;

            this.viewport.appendChild(el);
        });
    }

    renderMinimap() {
        if (!this.minimap || !this.minimapNodes) return;
        this.minimapNodes.innerHTML = '';
        if (this.events.length === 0) {
            if (this.minimapViewport) this.minimapViewport.style.display = 'none';
            return;
        }
        
        if (this.minimapViewport) this.minimapViewport.style.display = 'block';

        const minTime = Math.min(...this.events.map(ev => ev.time));
        const maxTime = Math.max(...this.events.map(ev => ev.time));
        let timeSpan = maxTime - minTime;
        if (timeSpan <= 0) timeSpan = 1; 
        
        this.events.forEach(ev => {
            const ratio = (ev.time - minTime) / timeSpan;
            const dot = document.createElement('div');
            dot.className = `minimap-node-fixed ${window.ui.selectedEventId === ev.id ? 'selected' : ''}`;
            dot.style.left = `${ratio * 100}%`;
            this.minimapNodes.appendChild(dot);
        });

        if (this.minimapViewport) {
            const containerWidth = this.container.clientWidth;
            const viewTimeSpan = containerWidth / this.zoom;
            let widthRatio = viewTimeSpan / timeSpan;
            widthRatio = Math.max(0.01, Math.min(1, widthRatio)); 
            const leftTime = -this.panX / this.zoom;
            let leftRatio = (leftTime - minTime) / timeSpan;
            
            this.minimapViewport.style.left = `${leftRatio * 100}%`;
            this.minimapViewport.style.width = `${widthRatio * 100}%`;
        }
    }

    renderEvents() {
        document.querySelectorAll('.evt-group-fixed').forEach(e => e.remove());
        
        if (this.events.length > 0) {
            const min = Math.min(...this.events.map(e => e.time));
            const max = Math.max(...this.events.map(e => e.time));
            this.axis.style.left = `${min * this.zoom}px`;
            this.axis.style.width = `${Math.max(1, (max - min) * this.zoom)}px`;
        }

        this.events.forEach((ev) => {
            const isSelected = window.ui.selectedEventId === ev.id;
            const pos = ev.time * this.zoom;
            
            const el = document.createElement('div');
            el.className = `evt-group-fixed ${isSelected ? 'selected' : ''}`;
            el.style.left = `${pos}px`;
            el.dataset.id = ev.id;
            
            el.onmousedown = (e) => {
                e.stopPropagation();
                window.mainCrono.selectEvent(ev.id);
                window.mainCrono.startEventDrag(e, ev.id);
            };

            const stemH = 60;
            const stemStyle = `height:${stemH}px; top: 0;`;
            const cardStyle = `top: ${stemH + 8}px; transform-origin: top center;`;

            let imgHtml = '';
            if (ev.moments && ev.moments.length > 0) {
                imgHtml = '<div class="flex flex-col gap-1 mt-2">';
                ev.moments.forEach(m => {
                    const srcTarget = m.displayUrl || m.image64;
                    if (srcTarget) {
                        const imgClass = m.aspectRatio === 'portrait' ? "w-full h-32 object-cover border" : "w-full h-16 object-cover border"; 
                        imgHtml += `<img src="${srcTarget}" class="${imgClass}">`;
                    }
                });
                imgHtml += '</div>';
            }

            el.innerHTML = `
                <div class="evt-stem-fixed" style="${stemStyle}"></div>
                <div class="evt-dot-fixed"></div>
                <div class="evt-card-fixed" style="${cardStyle}">
                    <div class="evt-time-fixed">${ev.time.toFixed(1)}</div>
                    <div class="evt-title-fixed text-black font-medium">${ev.description || 'Sin título'}</div>
                    ${imgHtml}
                </div>
            `;
            this.viewport.appendChild(el);
        });
    }
}

window.timeline = new TimelineSystem();