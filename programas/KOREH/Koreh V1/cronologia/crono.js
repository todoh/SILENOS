// --- crono.js: SISTEMA DE VISUALIZACIÓN (ADAPTATIVO) ---

class TimelineSystem {
    constructor() {
        this.zoom = 50; // Pixels per unit
        this.panX = 0;
        this.events = [];
        this.container = document.getElementById('timeline-container');
        this.viewport = document.getElementById('viewport-layer');
        this.ruler = document.getElementById('ruler-ticks');
        this.axis = document.getElementById('track-axis');
        
        this.isDragging = false;
        this.startX = 0;
        
        this.initInteraction();
    }

    initInteraction() {
        // Pan Canvas
        this.container.addEventListener('mousedown', e => {
            if (e.target.closest('.evt-group')) return; 
            this.isDragging = true;
            this.startX = e.clientX;
            this.container.style.cursor = 'grabbing';
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

        // Zoom Wheel
        this.container.addEventListener('wheel', e => {
            e.preventDefault();
            const zoomSensitivity = 0.001 * this.zoom;
            const delta = -e.deltaY * zoomSensitivity;
            const newZoom = Math.max(5, Math.min(500, this.zoom + delta));
            
            // Zoom hacia el ratón
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const worldX = (mouseX - this.panX) / this.zoom;
            
            this.panX = mouseX - (worldX * newZoom);
            this.zoom = newZoom;
            
            this.renderAll();
        }, { passive: false });
        
        // Doble click para crear evento
        this.container.addEventListener('dblclick', e => {
            if (e.target.closest('.evt-group')) return;
            const rect = this.container.getBoundingClientRect();
            const worldX = (e.clientX - rect.left - this.panX) / this.zoom;
            main.createEventAt(parseFloat(worldX.toFixed(1)));
        });
    }

    setData(events) {
        this.events = events;
        this.renderAll(); // Forzar render completo
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
    }

    renderAll() {
        this.renderRuler();
        this.renderEvents();
        this.renderTransforms();
    }

    renderRuler() {
        this.ruler.innerHTML = '';
        const width = this.container.clientWidth;
        // Rango visible
        const startVal = -this.panX / this.zoom;
        const endVal = (width - this.panX) / this.zoom;
        
        // Determinar intervalo visual
        let interval = 1;
        if (this.zoom < 20) interval = 5;
        if (this.zoom < 10) interval = 10;
        
        const startLoop = Math.floor(startVal / interval) * interval;
        const endLoop = Math.ceil(endVal / interval) * interval;

        for (let i = startLoop; i <= endLoop; i += interval) {
            const pos = i * this.zoom;
            const tick = document.createElement('div');
            tick.className = 'tick major';
            tick.style.left = `${pos}px`;
            
            const label = document.createElement('div');
            label.className = 'tick-label';
            label.innerText = i;
            tick.appendChild(label);
            
            this.ruler.appendChild(tick);
        }
    }

    renderEvents() {
        // Limpiar eventos del DOM
        document.querySelectorAll('.evt-group').forEach(e => e.remove());
        
        if (this.events.length > 0) {
            const min = Math.min(...this.events.map(e => e.time));
            const max = Math.max(...this.events.map(e => e.time));
            this.axis.style.left = `${min * this.zoom}px`;
            this.axis.style.width = `${Math.max(1, (max - min) * this.zoom)}px`;
        }

        this.events.forEach((ev, idx) => {
            const isSelected = ui.selectedEventId === ev.id;
            const isUp = idx % 2 === 0;
            const pos = ev.time * this.zoom;
            
            const el = document.createElement('div');
            el.className = `evt-group ${isSelected ? 'selected' : ''}`;
            el.style.left = `${pos}px`;
            el.dataset.id = ev.id;
            
            // Lógica de drag
            el.onmousedown = (e) => {
                e.stopPropagation();
                main.selectEvent(ev.id);
                main.startEventDrag(e, ev.id);
            };

            const stemH = 60;
            const stemStyle = isUp ? `height:${stemH}px; bottom: 0;` : `height:${stemH}px; top: 0;`;
            const cardStyle = isUp ? `bottom: ${stemH + 8}px; transform-origin: bottom center;` : `top: ${stemH + 8}px; transform-origin: top center;`;

            // --- LÓGICA DE IMAGEN ADAPTATIVA ---
            let imgHtml = '';
            if (ev.image64) {
                // Si es vertical ('portrait'), usamos h-64 (256px) en vez de h-24 (96px)
                const isPortrait = ev.aspectRatio === 'portrait';
                const imgClass = isPortrait 
                    ? "w-full h-48 object-cover mt-2 border border-gray-100 rounded-sm" // Estilo Vertical (Alto)
                    : "w-full h-24 object-cover mt-2 border border-gray-100 rounded-sm"; // Estilo Horizontal (Cinemático)
                
                imgHtml = `<img src="${ev.image64}" class="${imgClass}">`;
            }
            // -----------------------------------

            el.innerHTML = `
                <div class="evt-stem" style="${stemStyle}"></div>
                <div class="evt-dot"></div>
                <div class="evt-card" style="${cardStyle}">
                    <div class="evt-time">${ev.time.toFixed(1)}</div>
                    <div class="evt-title">${ev.description || 'Sin título'}</div>
                    ${imgHtml}
                </div>
            `;
            
            this.viewport.appendChild(el);
        });
    }
}

// Instanciar globalmente
const timeline = new TimelineSystem();