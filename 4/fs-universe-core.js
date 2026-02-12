// --- FS-UNIVERSE-CORE.JS (BASE & STATE) ---
/**
 * Núcleo del motor Universe.
 * Define el estado global, la cámara y la inicialización del Canvas.
 */

window.Universe = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    
    // Control de estado
    initialized: false,
    animationId: null,

    // Estado de la cámara
    camera: { x: 0, y: 0, zoom: 1, targetZoom: 1, targetX: 0, targetY: 0 },
    
    // Datos globales
    nodes: [], 
    selectedNodes: [], // NUEVO: Lista de nodos seleccionados
    currentHandle: null,
    sortMode: 'name', 
    
    // Configuración física global
    friction: 0.9,
    spring: 0.05,
    
    // --- ESTADOS DE INTERACCIÓN ACTUALIZADOS ---
    draggedNode: null,      
    isCameraDragging: false, 
    
    startX: 0, startY: 0,
    lastMouseX: 0, lastMouseY: 0,
    isMouseDown: false,
    
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Limpiar Canvas previo
        const existingCanvas = container.querySelector('#universe-canvas');
        if (existingCanvas) existingCanvas.remove();

        // Crear Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'universe-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '0'; 
        this.canvas.style.cursor = 'grab';
        
        container.insertBefore(this.canvas, container.firstChild);
        this.ctx = this.canvas.getContext('2d', { alpha: false }); 

        // --- GESTIÓN DE EVENTOS ---
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        // Usamos window para mousemove/up para que no se rompa si sales del canvas
        window.addEventListener('mousemove', (e) => {
            if(this.initialized) this.handleInputMove(e);
        });
        window.addEventListener('mouseup', (e) => {
            if(this.initialized) this.handleInputEnd(e);
        });

        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        // Bloquear menú contextual nativo y usar el nuestro condicionalmente
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault(); 
            // Si venimos de un arrastre de selección, NO mostrar menú
            if (this.selection && this.selection.suppressMenu) {
                this.selection.suppressMenu = false; // Resetear flag
                return;
            }
            this.handleRightClick(e);
        });

        if (!this.initialized) {
            window.addEventListener('resize', () => this.resize());
            this.initialized = true;
            console.log("🌌 Universe Engine: Global Listeners Attached");
        }

        this.resize();
        this.startAnimation(); 
        console.log("🌌 Universe Engine: Canvas Initialized");
    },

    resize() {
        if (!this.canvas) return;
        this.width = this.canvas.parentElement.clientWidth;
        this.height = this.canvas.parentElement.clientHeight;
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
    }
};