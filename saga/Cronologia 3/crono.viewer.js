// Abrir Canvas: Cronologia 3/crono.viewer.js
/* --- CronoViewer - Visor modal a pantalla completa para imágenes y narrativa de eventos --- */
class CronoViewerSystem {
    constructor() {
        this.isOpen = false;
        this.currentEventId = null;
        this.currentMomentId = null;
        this.flatMoments = [];
        this.currentIndex = -1;
        this.initDOM();
        this.initEvents();
    }

    initDOM() {
        if (document.getElementById('crono-viewer-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'crono-viewer-modal';
        modal.className = 'fixed inset-0 z-[9999] bg-black hidden flex-col justify-between items-center select-none overflow-hidden cursor-pointer';
        modal.innerHTML = `
            <!-- Fullscreen Background Image -->
            <img id="cv-image" src="" class="absolute inset-0 w-full h-full object-contain z-0 transition-all duration-200 pointer-events-none">
            <!-- Top Controls Overlay -->
            <div class="relative w-full flex justify-between items-center p-6 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
                <div class="flex items-center gap-3 text-white font-mono text-xs">
                    <span id="cv-counter" class="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 font-bold">0 / 0</span>
                    <span id="cv-event-title" class="text-white font-sans text-sm font-medium tracking-wide drop-shadow-md"></span>
                </div>
                <button id="cv-btn-close" class="text-white/80 hover:text-white text-2xl transition-colors p-2 focus:outline-none drop-shadow-md pointer-events-auto">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <!-- Navigation Buttons Overlay -->
            <button id="cv-btn-prev" class="absolute left-6 top-1/2 -translate-y-1/2 z-30 text-white/70 hover:text-white text-4xl transition-colors p-4 focus:outline-none bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-sm border border-white/10 pointer-events-auto">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button id="cv-btn-next" class="absolute right-6 top-1/2 -translate-y-1/2 z-30 text-white/70 hover:text-white text-4xl transition-colors p-4 focus:outline-none bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-sm border border-white/10 pointer-events-auto">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
            <!-- Bottom Description Overlay (White Box floating over the image) -->
            <div class="relative w-full max-w-4xl p-6 z-20 flex justify-center mb-6 pointer-events-none">
                <div class="w-full bg-white/95 backdrop-blur-md text-black p-6 rounded-xl shadow-2xl border border-gray-200/80 max-h-48 overflow-y-auto pointer-events-auto" onclick="event.stopPropagation()">
                    <p id="cv-text" class="text-base leading-relaxed font-sans font-normal text-gray-900"></p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.modal = modal;
        this.imgEl = modal.querySelector('#cv-image');
        this.textEl = modal.querySelector('#cv-text');
        this.titleEl = modal.querySelector('#cv-event-title');
        this.counterEl = modal.querySelector('#cv-counter');
    }

    initEvents() {
        const btnClose = this.modal.querySelector('#cv-btn-close');
        const btnPrev = this.modal.querySelector('#cv-btn-prev');
        const btnNext = this.modal.querySelector('#cv-btn-next');

        if (btnClose) btnClose.onclick = (e) => { e.stopPropagation(); this.close(); };
        if (btnPrev) btnPrev.onclick = (e) => { e.stopPropagation(); this.prev(); };
        if (btnNext) btnNext.onclick = (e) => { e.stopPropagation(); this.next(); };

        // Cerrar haciendo clic (izquierdo o derecho) en cualquier parte del modal
        this.modal.addEventListener('click', () => this.close());
        this.modal.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.close();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
        });
    }

    buildFlatMoments() {
        this.flatMoments = [];
        if (!window.mainCrono || !window.mainCrono.data || !window.mainCrono.data.events) return;
        
        const events = [...window.mainCrono.data.events].sort((a, b) => a.time - b.time);
        events.forEach(ev => {
            if (ev.moments && ev.moments.length > 0) {
                ev.moments.forEach(m => {
                    this.flatMoments.push({
                        eventId: ev.id,
                        eventTitle: ev.description || 'Sin título',
                        eventTime: ev.time,
                        momentId: m.id,
                        text: m.text || '',
                        src: m.displayUrl || m.image64 || ''
                    });
                });
            } else {
                this.flatMoments.push({
                    eventId: ev.id,
                    eventTitle: ev.description || 'Sin título',
                    eventTime: ev.time,
                    momentId: null,
                    text: ev.description || '',
                    src: ''
                });
            }
        });
    }

    open(eventId, momentId = null) {
        this.buildFlatMoments();
        if (this.flatMoments.length === 0) return;

        if (momentId !== null && momentId !== undefined) {
            this.currentIndex = this.flatMoments.findIndex(item => item.eventId === eventId && String(item.momentId) === String(momentId));
        } else {
            this.currentIndex = this.flatMoments.findIndex(item => item.eventId === eventId);
        }
        if (this.currentIndex === -1) this.currentIndex = 0;
        
        this.isOpen = true;
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        this.render();
    }

    close() {
        this.isOpen = false;
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
    }

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.render();
        }
    }

    next() {
        if (this.currentIndex < this.flatMoments.length - 1) {
            this.currentIndex++;
            this.render();
        }
    }

    render() {
        const item = this.flatMoments[this.currentIndex];
        if (!item) return;
        this.imgEl.src = item.src || '';
        this.imgEl.style.display = item.src ? 'block' : 'none';
        this.textEl.innerText = item.text || 'Sin descripción detallada para este momento.';
        this.titleEl.innerText = `[T: ${item.eventTime}] ${item.eventTitle}`;
        this.counterEl.innerText = `${this.currentIndex + 1} / ${this.flatMoments.length}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.CronoViewer = new CronoViewerSystem();
});