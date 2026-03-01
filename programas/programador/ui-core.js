// --- UI-CORE.JS ---
window.UI = {
    canvas: null,
    viewport: null,
    svgLayer: null,
    nodesLayer: null,
    
    // Viewport State
    view: { x: 0, y: 0, zoom: 1 },
    isPanning: false,
    lastMouse: { x: 0, y: 0 },

    // State
    draggedNodeId: null,
    dragOffset: { x:0, y:0 },
    isConnecting: false,
    tempConnection: null,
    currentNodeSelectingFolder: null,

    // Bindings
    _boundNodeMove: null, _boundNodeUp: null, _boundConnectMove: null, _boundConnectUp: null, _boundPanMove: null, _boundPanUp: null,

    init() {
        this.canvas = document.getElementById('canvas-container');
        this.viewport = document.getElementById('viewport');
        this.svgLayer = document.getElementById('connections-layer');
        this.nodesLayer = document.getElementById('nodes-layer');

        this.setupDragDrop();
        this.setupCanvasInteractions();
        this.setupNodeInteractions();

        document.getElementById('btn-execute').addEventListener('click', () => Logic.executeFlow());
        
        this.resetView();
    },

    resetView() {
        this.view = { x: 0, y: 0, zoom: 1 };
        this.updateViewport();
    },

    updateViewport() {
        this.viewport.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`;
    },

    getCanvasWorldPos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left - this.view.x) / this.view.zoom;
        const y = (clientY - rect.top - this.view.y) / this.view.zoom;
        return { x, y };
    },
    
    // --- NUEVO: Limpiar Canvas completo para cargar plano ---
    clearCanvas() {
        this.nodesLayer.innerHTML = '';
        this.svgLayer.innerHTML = '';
        // Reset View opcional, preferimos mantener zoom usuario o guardarlo en JSON
    },

    // --- PAN & ZOOM ---
    setupCanvasInteractions() {
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const newZoom = Math.min(Math.max(0.1, this.view.zoom + delta), 5); 
            this.view.zoom = newZoom;
            this.updateViewport();
        }, { passive: false });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.target === this.canvas || e.target === this.viewport || e.target === this.svgLayer || e.target.id === 'viewport') {
                this.isPanning = true;
                this.lastMouse = { x: e.clientX, y: e.clientY };
                
                this._boundPanMove = this.onPanMove.bind(this);
                this._boundPanUp = this.onPanUp.bind(this);
                
                window.addEventListener('mousemove', this._boundPanMove);
                window.addEventListener('mouseup', this._boundPanUp);
                this.canvas.style.cursor = 'grabbing';
            }
        });
    },

    onPanMove(e) {
        if (!this.isPanning) return;
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.view.x += dx;
        this.view.y += dy;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.updateViewport();
    },

    onPanUp() {
        this.isPanning = false;
        window.removeEventListener('mousemove', this._boundPanMove);
        window.removeEventListener('mouseup', this._boundPanUp);
        this.canvas.style.cursor = 'crosshair';
    }
};