// --- UI-CORE.JS ---
// Inicialización, Estado Global y Navegación del Canvas

window.UI = {
    canvas: null,
    viewport: null,
    svgLayer: null,
    nodesLayer: null,
    
    // Viewport State
    view: { x: 0, y: 0, zoom: 1 },
    isPanning: false,
    lastMouse: { x: 0, y: 0 },

    // Drag State (Nodes) - Inicializados aquí para acceso global
    draggedNodeId: null,
    dragOffset: { x:0, y:0 },
    
    // Referencias para limpiar eventos
    _boundNodeMove: null,
    _boundNodeUp: null,
    _boundConnectMove: null,
    _boundConnectUp: null,
    _boundPanMove: null,
    _boundPanUp: null,

    // Connections State
    isConnecting: false,
    tempConnection: null,

    // Modal State
    currentNodeSelectingFolder: null,

    init() {
        this.canvas = document.getElementById('canvas-container');
        this.viewport = document.getElementById('viewport');
        this.svgLayer = document.getElementById('connections-layer');
        this.nodesLayer = document.getElementById('nodes-layer');

        // Estos métodos se cargarán desde los otros módulos
        this.setupDragDrop();
        this.setupCanvasInteractions(); // Pan & Zoom (definido aquí abajo)
        this.setupNodeInteractions();

        // Botón ejecutar
        document.getElementById('btn-execute').addEventListener('click', () => Logic.executeFlow());
        
        // Centrar vista inicial
        this.resetView();
    },

    resetView() {
        this.view = { x: 0, y: 0, zoom: 1 };
        this.updateViewport();
    },

    updateViewport() {
        this.viewport.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`;
    },

    // --- CONVERSIÓN COORDENADAS (Pantalla -> Mundo) ---
    getCanvasWorldPos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        // Restamos la posición del canvas, restamos el pan y dividimos por zoom
        const x = (clientX - rect.left - this.view.x) / this.view.zoom;
        const y = (clientY - rect.top - this.view.y) / this.view.zoom;
        return { x, y };
    },

    // --- PAN & ZOOM ---
    setupCanvasInteractions() {
        // Zoom con Rueda
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            // Limitar zoom entre 0.1x y 5x
            const newZoom = Math.min(Math.max(0.1, this.view.zoom + delta), 5); 
            
            this.view.zoom = newZoom;
            this.updateViewport();
        }, { passive: false });

        // Pan con Clic Izquierdo en Fondo
        this.canvas.addEventListener('mousedown', (e) => {
            // Solo si clickea en el fondo (canvas, viewport o svg vacío)
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