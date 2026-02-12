
const WindowInteraction = { initialized: false, // Flag para evitar listeners duplicados

state: {
    isDragging: false,
    isResizing: false,
    targetWindowId: null,
    
    // Coordenadas iniciales del MOUSE
    mouseX: 0,
    mouseY: 0,

    // Coordenadas iniciales del ELEMENTO (Relativas al padre)
    elmX: 0,
    elmY: 0,
    elmW: 0,
    elmH: 0,

    resizeDir: null // 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
},

init() {
    if (this.initialized) return; // FIX: Evitar doble inicialización

    // Listeners Globales para suavidad (se añaden a window, no al elemento)
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    this.initialized = true;
    console.log("⚙️ WindowInteraction: Physics Engine Loaded");
},

// --- DRAGGING (MOVER) ---
startDrag(e, windowId) {
    // Si la ventana está maximizada, no permitir arrastre (o implementar lógica de des-maximizar)
    const winEl = document.getElementById(windowId);
    if (winEl.getAttribute('data-maximized') === 'true') return;

    this.state.isDragging = true;
    this.state.targetWindowId = windowId;
    
    // 1. Guardamos posición inicial del mouse
    this.state.mouseX = e.clientX;
    this.state.mouseY = e.clientY;

    // 2. Guardamos posición inicial del elemento RELATIVA AL PADRE (Offset)
    // Esto corrige el salto causado por el Header o márgenes del contenedor
    this.state.elmX = winEl.offsetLeft;
    this.state.elmY = winEl.offsetTop;

    // Activar overlay para que los iframes no se coman el evento mousemove
    this.toggleIframeOverlay(windowId, true);
    
    // Traer al frente
    if (window.WindowManager) window.WindowManager.focusWindow(windowId);
},

// --- RESIZING (REDIMENSIONAR) ---
startResize(e, windowId, direction) {
    e.stopPropagation(); // Evita que empiece el Drag
    const winEl = document.getElementById(windowId);
    
    this.state.isResizing = true;
    this.state.targetWindowId = windowId;
    this.state.resizeDir = direction;
    
    // 1. Guardamos mouse inicial
    this.state.mouseX = e.clientX;
    this.state.mouseY = e.clientY;
    
    // 2. Guardamos geometría inicial (Offset para posición, Client/Offset para tamaño)
    this.state.elmX = winEl.offsetLeft;
    this.state.elmY = winEl.offsetTop;
    this.state.elmW = winEl.offsetWidth;
    this.state.elmH = winEl.offsetHeight;

    this.toggleIframeOverlay(windowId, true);
    if (window.WindowManager) window.WindowManager.focusWindow(windowId);
},

// --- EVENT LOOP ---
handleMouseMove(e) {
    if (this.state.isDragging) {
        this.processDrag(e);
    } else if (this.state.isResizing) {
        this.processResize(e);
    }
},

handleMouseUp() {
    if (this.state.targetWindowId) {
        this.toggleIframeOverlay(this.state.targetWindowId, false);
    }
    
    this.state.isDragging = false;
    this.state.isResizing = false;
    this.state.targetWindowId = null;
    this.state.resizeDir = null;
    
    // Reset cursor
    document.body.style.cursor = 'default';
},

// --- LÓGICA DE MOVIMIENTO ---
processDrag(e) {
    const winEl = document.getElementById(this.state.targetWindowId);
    if (!winEl) return;

    // Calculamos DELTA (cuánto se ha movido el ratón desde el clic inicial)
    const dx = e.clientX - this.state.mouseX;
    const dy = e.clientY - this.state.mouseY;

    // Aplicamos ese delta a la posición original relativa
    let newLeft = this.state.elmX + dx;
    let newTop = this.state.elmY + dy;

    // Limites básicos (no salir por arriba negativo)
    if (newTop < 0) newTop = 0;

    winEl.style.left = `${newLeft}px`;
    winEl.style.top = `${newTop}px`;
},

// --- LÓGICA DE REDIMENSIÓN ---
processResize(e) {
    const winEl = document.getElementById(this.state.targetWindowId);
    if (!winEl) return;

    const deltaX = e.clientX - this.state.mouseX;
    const deltaY = e.clientY - this.state.mouseY;
    const dir = this.state.resizeDir;

    let newWidth = this.state.elmW;
    let newHeight = this.state.elmH;
    let newLeft = this.state.elmX;
    let newTop = this.state.elmY;

    // Ancho mínimo
    const MIN_W = 200;
    const MIN_H = 100;

    // Cálculos según dirección
    if (dir.includes('e')) newWidth = this.state.elmW + deltaX;
    if (dir.includes('s')) newHeight = this.state.elmH + deltaY;
    
    if (dir.includes('w')) {
        // Hacia la izquierda: cambiamos ancho Y posición
        // Si el nuevo ancho es válido, movemos la izquierda
        if (this.state.elmW - deltaX >= MIN_W) {
            newWidth = this.state.elmW - deltaX;
            newLeft = this.state.elmX + deltaX;
        }
    }
    
    if (dir.includes('n')) {
        // Hacia arriba: cambiamos alto Y posición
        if (this.state.elmH - deltaY >= MIN_H) {
            newHeight = this.state.elmH - deltaY;
            newTop = this.state.elmY + deltaY;
        }
    }

    // Aplicar (con restricción de mínimos)
    if (newWidth >= MIN_W) {
        winEl.style.width = `${newWidth}px`;
        if (dir.includes('w')) winEl.style.left = `${newLeft}px`;
    }
    
    if (newHeight >= MIN_H) {
        winEl.style.height = `${newHeight}px`;
        if (dir.includes('n')) winEl.style.top = `${newTop}px`;
    }
},

toggleIframeOverlay(windowId, show) {
    const winEl = document.getElementById(windowId);
    if (winEl) {
        const overlay = winEl.querySelector('.window-overlay');
        if (overlay) overlay.style.display = show ? 'block' : 'none';
    }
}
}; 