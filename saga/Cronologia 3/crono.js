// Abrir Canvas: Cronologia 3/crono.js
/* --- crono.js: SISTEMA DE VISUALIZACIÓN OPTIMIZADO Y ESTABLE DE CRONOLOGÍA --- */
class TimelineSystem {
    constructor() {
        this.zoom = 50;
        this.panX = 0;
        this.events = [];
        this.markers = [];
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
        if (!this.container) return;

        // Desplazamiento del Canvas por Arrastre (Pan)
        this.container.addEventListener('mousedown', e => {
            if (e.button === 0) {
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
            if (this.container) this.container.style.cursor = 'grab';
        });

        // Zoom por Rueda de Ratón Invariante respecto al Punto del Cursor
        this.container.addEventListener('wheel', e => {
            e.preventDefault();
            const deltaSign = Math.sign(e.deltaY);
            const zoomFactor = deltaSign > 0 ? 0.88 : 1.14;
            
            const newZoom = Math.max(0.2, Math.min(1000, this.zoom * zoomFactor));
            if (newZoom === this.zoom) return;

            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            const worldX = (mouseX - this.panX) / this.zoom;
            
            this.panX = mouseX - (worldX * newZoom);
            this.zoom = newZoom;
            this.updatePositionsOnly();
            this.renderRuler();
            this.renderTransforms();
        }, { passive: false });

        // Creación de eventos por Doble Clic
        this.container.addEventListener('dblclick', e => {
            if (e.target.closest('.evt-group-fixed') || e.target.closest('.timeline-minimap-fixed')) return;
            const rect = this.container.getBoundingClientRect();
            const worldX = (e.clientX - rect.left - this.panX) / this.zoom;
            if (window.mainCrono && typeof window.mainCrono.createEventAt === 'function') {
                window.mainCrono.createEventAt(parseFloat(worldX.toFixed(1)));
            }
        });

        // Marcadores por Clic Derecho en zona libre
        this.container.addEventListener('contextmenu', e => {
            if (e.target.closest('.evt-group-fixed') || e.target.closest('.timeline-minimap-fixed')) return;
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const worldTime = (clickX - this.panX) / this.zoom;
            const tolerancePx = 12;

            const existingIndex = this.markers.findIndex(mTime => {
                const screenX = (mTime * this.zoom) + this.panX;
                return Math.abs(screenX - clickX) <= tolerancePx;
            });

            if (existingIndex !== -1) {
                this.markers.splice(existingIndex, 1);
            } else {
                this.markers.push(parseFloat(worldTime.toFixed(2)));
            }
            this.markers.sort((a, b) => a - b);
            this.saveMarkersToProject();
            this.renderAll();
        });

        // Interacción con Minimapa
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
        if (this.events.length === 0 || !this.minimap) return;
        const rect = this.minimap.getBoundingClientRect();
        let ratio = (e.clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio));

        const minTime = Math.min(...this.events.map(ev => ev.time));
        const maxTime = Math.max(...this.events.map(ev => ev.time));
        let timeSpan = maxTime - minTime;
        if (timeSpan <= 0) timeSpan = 1;

        const targetTime = minTime + (ratio * timeSpan);
        if (this.container) {
            this.panX = (this.container.clientWidth / 2) - (targetTime * this.zoom);
        }
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
        if (!this.container) return;
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
        const factor = delta > 0 ? 1.25 : 0.8;
        const newZoom = Math.max(0.2, Math.min(1000, this.zoom * factor));
        if (newZoom === this.zoom || !this.container) return;

        const centerX = this.container.clientWidth / 2;
        const worldX = (centerX - this.panX) / this.zoom;
        this.zoom = newZoom;
        this.panX = centerX - (worldX * this.zoom);
        this.updatePositionsOnly();
        this.renderRuler();
        this.renderTransforms();
    }

    renderTransforms() {
        if (this.viewport) this.viewport.style.transform = `translate3d(${this.panX}px, 0, 0)`;
        if (this.ruler) this.ruler.style.transform = `translate3d(${this.panX}px, 0, 0)`;
        if (this.container) {
            this.container.style.backgroundSize = `${this.zoom}px 100px`;
            this.container.style.backgroundPosition = `${this.panX}px 0`;
        }
        this.applyCulling();
        this.renderMinimap();
    }

    applyCulling() {
        document.querySelectorAll('.evt-group-fixed').forEach(el => {
            el.style.display = 'flex';
        });
    }

    updatePositionsOnly() {
        if (this.events.length > 0 && this.axis) {
            const min = Math.min(...this.events.map(e => e.time));
            const max = Math.max(...this.events.map(e => e.time));
            this.axis.style.left = `${min * this.zoom}px`;
            this.axis.style.width = `${Math.max(1, (max - min) * this.zoom)}px`;
        }

        document.querySelectorAll('.evt-group-fixed').forEach(el => {
            const time = parseFloat(el.dataset.time);
            if (!isNaN(time)) {
                el.style.transform = `translateX(${time * this.zoom}px)`;
            }
        });

        document.querySelectorAll('.crono-marker-flag').forEach(el => {
            const time = parseFloat(el.dataset.time);
            if (!isNaN(time)) {
                el.style.left = `${time * this.zoom}px`;
            }
        });
    }

    renderAll() {
        this.renderRuler();
        this.renderMarkers();
        this.renderEvents();
        this.renderTransforms();
    }

    renderRuler() {
        if (!this.ruler || !this.container) return;
        this.ruler.innerHTML = '';
        const width = this.container.clientWidth || window.innerWidth;
        const startVal = -this.panX / this.zoom;
        const endVal = (width - this.panX) / this.zoom;

        let interval = 1;
        if (this.zoom < 20) interval = 5;
        if (this.zoom < 10) interval = 10;
        if (this.zoom > 150) interval = 0.5;

        const startLoop = Math.floor(startVal / interval) * interval;
        const endLoop = Math.ceil(endVal / interval) * interval;

        for (let i = startLoop; i <= endLoop; i += interval) {
            const pos = i * this.zoom;
            const tick = document.createElement('div');
            tick.className = 'tick-fixed major';
            tick.style.left = `${pos}px`;

            const label = document.createElement('div');
            label.className = 'tick-label-fixed';
            label.innerText = Number(i.toFixed(2));

            tick.appendChild(label);
            this.ruler.appendChild(tick);
        }
    }

    renderMarkers() {
        if (!this.viewport) return;
        document.querySelectorAll('.crono-marker-flag').forEach(el => el.remove());
        this.markers.sort((a, b) => a - b);
        this.markers.forEach((mTime, idx) => {
            const pos = mTime * this.zoom;
            const el = document.createElement('div');
            el.className = 'crono-marker-flag absolute top-0 flex flex-col items-center pointer-events-none z-30';
            el.dataset.time = mTime;
            el.style.left = `${pos}px`;
            el.style.transform = 'translateX(-50%)';

            const numberOrdinal = `${idx + 1}º`;
            el.innerHTML = `
                <div style="height: 50px"></div>
                <div class="bg-indigo-600 text-white font-mono text-[24px] font-bold px-1.5 py-0.5 rounded shadow-md border border-indigo-400 select-none">
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

        const selectedId = window.ui ? window.ui.selectedEventId : null;

        this.events.forEach(ev => {
            const ratio = (ev.time - minTime) / timeSpan;
            const dot = document.createElement('div');
            dot.className = `minimap-node-fixed ${selectedId === ev.id ? 'selected' : ''}`;
            dot.style.left = `${ratio * 100}%`;
            this.minimapNodes.appendChild(dot);
        });

        if (this.minimapViewport && this.container) {
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
        if (!this.viewport) return;
        document.querySelectorAll('.evt-group-fixed').forEach(e => e.remove());

        if (this.events.length > 0 && this.axis) {
            const min = Math.min(...this.events.map(e => e.time));
            const max = Math.max(...this.events.map(e => e.time));
            this.axis.style.left = `${min * this.zoom}px`;
            this.axis.style.width = `${Math.max(1, (max - min) * this.zoom)}px`;
        }

        const selectedId = window.ui ? window.ui.selectedEventId : null;

        this.events.forEach((ev) => {
            const isSelected = selectedId === ev.id;
            const pos = ev.time * this.zoom;

            const el = document.createElement('div');
            el.className = `evt-group-fixed ${isSelected ? 'selected' : ''}`;
            el.dataset.id = ev.id;
            el.dataset.time = ev.time;
            el.style.left = '0px';
            el.style.transform = `translateX(${pos}px)`;
            el.style.willChange = 'transform';

            el.onmousedown = (e) => {
                e.stopPropagation();
                if (window.mainCrono) {
                    if (typeof window.mainCrono.selectEvent === 'function') window.mainCrono.selectEvent(ev.id);
                    if (typeof window.mainCrono.startEventDrag === 'function') window.mainCrono.startEventDrag(e, ev.id);
                }
            };

            const stemH = 40;
            const stemStyle = `height:${stemH}px; top: 0;`;
            const cardStyle = `top: ${stemH + 8}px; transform-origin: top center;`;

            let imgHtml = '';
            if (ev.moments && ev.moments.length > 0) {
                imgHtml = '<div class="flex flex-col gap-1 mt-2">';
                ev.moments.forEach(m => {
                    const srcTarget = m.displayUrl || m.image64;
                    if (srcTarget) {
                        const imgClass = m.aspectRatio === 'portrait' ? "w-full h-32 object-cover border hover:opacity-90 transition-opacity cursor-pointer bg-gray-100 select-none" : "w-full h-20 object-cover border hover:opacity-90 transition-opacity cursor-pointer bg-gray-100 select-none";
                        imgHtml += `<img src="${srcTarget}" draggable="false" loading="lazy" decoding="async" class="${imgClass}" style="will-change: transform; transform: translateZ(0); -webkit-user-drag: none; user-drag: none;" onclick="event.stopPropagation(); if(window.CronoViewer){ window.CronoViewer.open('${ev.id}', '${m.id}'); }" oncontextmenu="event.preventDefault(); event.stopPropagation(); if(window.CronoViewer){ window.CronoViewer.open('${ev.id}', '${m.id}'); }">`;
                    }
                });
                imgHtml += '</div>';
            }

            el.innerHTML = `
                <div class="evt-stem-fixed" style="${stemStyle}"></div>
                <div class="evt-dot-fixed"></div>
                <div class="evt-card-fixed" style="${cardStyle}">
                    <div class="evt-time-fixed">${parseFloat(ev.time).toFixed(1)}</div>
                    <div class="evt-title-fixed text-black font-medium">${ev.description || 'Sin título'}</div>
                    ${imgHtml}
                </div>
            `;

            const cardBody = el.querySelector('.evt-card-fixed');
            if (cardBody) {
                cardBody.onclick = (e) => {
                    e.stopPropagation();
                    if (window.CronoViewer) {
                        window.CronoViewer.open(ev.id);
                    }
                };
            }

            this.viewport.appendChild(el);
        });

        this.applyCulling();
    }
}

window.timeline = new TimelineSystem();