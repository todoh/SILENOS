/**
 * TRAMAS CANVAS - Orquestador Maestro (Versión Refactorizada)
 */
const TramasCanvas = {
    canvas: null,

    init() {
        this.canvas = document.getElementById('tramas-canvas');
        if (!this.canvas) return;

        // Evitar menú contextual
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Inicializar Módulos en orden
        window.TramasState.init(this.canvas);
        window.TramasRender.init(this.canvas);
        window.TramasEvents.init();

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.render();
    },

    resize() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.render();
    },

    render() {
        window.TramasRender.drawAll();
    },

    // Proxies para compatibilidad con botones de UI
    zoomIn() { window.TramasState.zoom = Math.min(window.TramasState.zoom + 0.2, 3); this.render(); },
    zoomOut() { window.TramasState.zoom = Math.max(window.TramasState.zoom - 0.2, 0.3); this.render(); },
    resetView() { window.TramasState.init(this.canvas); this.render(); },
    screenToWorld(x, y) { return window.TramasState.screenToWorld(x, y); }
};

window.TramasCanvas = TramasCanvas;
// Auto-inicio
window.addEventListener('load', () => setTimeout(() => TramasCanvas.init(), 1000));