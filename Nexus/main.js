/**
 * MAIN.JS V3.0 - CHRONOS EDITION
 * - Zoom inteligente anclado al mouse (Mouse-Anchor Zoom).
 * - Barra lateral redimensionable dinámicamente.
 * - Separación de renderizado: UI (Fija) vs MUNDO (Móvil).
 */

class NexusApp {
    constructor() {
        this.canvas = document.getElementById('nexusCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // --- GESTORES ---
        // Asegúrate de que nodeSystem y uiManager existan y estén cargados
        this.nodeSystem = typeof NodeSystem !== 'undefined' ? new NodeSystem() : { generateNodes:()=>{}, checkClick:()=>null, nodes:[] };
        this.uiManager = typeof UIManager !== 'undefined' ? new UIManager() : { openNodeModal:()=>{} };

        // --- DIMENSIONES Y ESTADO ---
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // CONFIGURACIÓN DE LA BARRA LATERAL (La "franja de lugar")
        this.sidebarWidth = 250; // Ancho inicial
        this.sidebarMinWidth = 100;
        this.sidebarMaxWidth = 600;

        // --- CÁMARA Y ZOOM ---
        this.camera = {
            x: 0,           // Desplazamiento Pan X
            y: 0,           // Desplazamiento Pan Y
            scale: 1,       // Zoom actual
            minScale: 0.001,  // Zoom out máximo
            maxScale: 60,   // Zoom in máximo
            step: 1.9       // Velocidad del zoom
        };

        // --- INTERACCIÓN ---
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.dragThreshold = 5; 
        this.hasMoved = false;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // EVENTOS DEL MOUSE
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Regenerar nodos centrado en el espacio disponible (restando sidebar)
        const availableWidth = this.width - this.sidebarWidth;
        const centerX = this.sidebarWidth + (availableWidth / 2);
        const centerY = this.height / 2;
        
        // Si tienes una lógica específica para Timeline en nodes.js, se usará aquí
        if(this.nodeSystem.generateNodes) {
            this.nodeSystem.generateNodes(centerX, centerY);
        }
    }

    // --- TRANSFORMACIÓN DE COORDENADAS ---

    // Pantalla (Píxeles) -> Mundo Virtual (Coordenadas lógicas)
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.camera.x) / this.camera.scale,
            y: (screenY - this.camera.y) / this.camera.scale
        };
    }

    // Mundo Virtual -> Pantalla
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX * this.camera.scale) + this.camera.x,
            y: (worldY * this.camera.scale) + this.camera.y
        };
    }

    // --- MANEJO DE RUEDA (ZOOM VS RESIZE) ---

    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // CASO A: Estamos sobre la BARRA LATERAL -> Redimensionar Franja
        if (mouseX < this.sidebarWidth) {
            const delta = e.deltaY > 0 ? -20 : 20; // Dirección resize
            const newWidth = this.sidebarWidth + delta;
            
            // Limitamos el ancho mínimo y máximo
            this.sidebarWidth = Math.max(this.sidebarMinWidth, Math.min(this.sidebarMaxWidth, newWidth));
            return; // Salimos, no hacemos zoom
        }

        // CASO B: Estamos sobre el MUNDO -> Zoom Anclado al Mouse
        // 1. Calcular dónde está el mouse en el mundo ANTES de hacer zoom
        const worldPosBefore = this.screenToWorld(mouseX, mouseY);

        // 2. Aplicar nuevo Zoom
        const zoomDir = e.deltaY < 0 ? 1 : -1;
        let newScale = this.camera.scale + (zoomDir * this.camera.step * this.camera.scale);
        
        // Clamping (Límites de zoom)
        newScale = Math.max(this.camera.minScale, Math.min(this.camera.maxScale, newScale));

        // 3. ACTUALIZAR ESCALA
        this.camera.scale = newScale;

        // 4. CORRECCIÓN DE POSICIÓN (ANCHORING)
        // Queremos que worldPosBefore siga estando bajo mouseX, mouseY.
        // Fórmula: Pan = MouseScreen - (WorldPos * NuevoScale)
        this.camera.x = mouseX - (worldPosBefore.x * newScale);
        this.camera.y = mouseY - (worldPosBefore.y * newScale);
    }

    // --- MANEJO DE ARRASTRE Y CLICKS ---

    handleMouseDown(e) {
        this.isDragging = true;
        this.hasMoved = false;
        this.lastMouse = { x: e.clientX, y: e.clientY };
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        
        // Detectar si es un click o un arrastre
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.hasMoved = true;

        // Si estamos arrastrando la barra lateral (opcional: arrastre con click cerca del borde)
        // Por simplicidad, aquí arrastramos todo el mapa
        this.camera.x += dx;
        this.camera.y += dy;

        this.lastMouse = { x: e.clientX, y: e.clientY };
    }

    handleMouseUp(e) {
        this.isDragging = false;
        if (!this.hasMoved) this.handleClick(e);
    }

    handleClick(e) {
        const mouseX = e.clientX;
        
        // Si click en sidebar, ignorar click de nodo (o manejar lógica de sidebar)
        if (mouseX < this.sidebarWidth) return;

        // Click en mundo
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        const clickedNode = this.nodeSystem.checkClick(worldPos.x, worldPos.y);
        
        if (clickedNode) {
            this.uiManager.openNodeModal(clickedNode);
        }
    }

    // --- RENDERIZADO ---

    draw() {
        // 1. LIMPIAR PANTALLA
        this.ctx.fillStyle = '#f2f2f2';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. DIBUJAR MUNDO (Afectado por Cámara)
        this.ctx.save();
        // APLICAR TRANSFORMACIONES: TRANSLATE PRIMERO, LUEGO SCALE
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.scale, this.camera.scale);

        // --> AQUÍ SE DIBUJA TODO LO QUE SE MUEVE (Líneas de tiempo, nodos, etc)
        this._drawWorldContent();

        this.ctx.restore();

        // 3. DIBUJAR UI FIJA (Sidebar)
        // Esto se dibuja ENCIMA del mundo y NO se ve afectado por el zoom de la cámara
        this._drawFixedUI();
    }

    _drawWorldContent() {
        // DIBUJAR GRID DE FONDO (Opcional, ayuda a ver el movimiento)
        this._drawGrid();

        // DIBUJAR NODOS DEL SISTEMA
        // (Esto usa la lógica que ya tenías para dibujar nodos/líneas)
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#d1d1d1';
        
        const nodes = this.nodeSystem.nodes || [];
        
        // Conexiones
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];
                const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
                if (dist <= 350) { // Distancia de conexión aumentada para timeline
                    this.ctx.beginPath();
                    this.ctx.moveTo(n1.x, n1.y);
                    this.ctx.lineTo(n2.x, n2.y);
                    this.ctx.stroke();
                }
            }
        }

        // Nodos
        nodes.forEach(node => this._drawNeumorphicNode(node));
    }

    _drawFixedUI() {
        // Fondo de la barra lateral (Efecto cristal mate)
        this.ctx.fillStyle = 'rgba(242, 242, 242, 0.95)';
        this.ctx.shadowColor = 'rgba(0,0,0,0.1)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 5;
        this.ctx.fillRect(0, 0, this.sidebarWidth, this.height);
        
        this.ctx.shadowColor = 'transparent'; // Reset sombra

        // Línea divisoria
        this.ctx.strokeStyle = '#00acc1';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.sidebarWidth, 0);
        this.ctx.lineTo(this.sidebarWidth, this.height);
        this.ctx.stroke();

        // Texto informativo o Labels fijos
        this.ctx.fillStyle = '#00acc1';
        this.ctx.font = 'bold 12px Helvetica';
        this.ctx.textAlign = 'left';
        this.ctx.fillText("ZONA LUGARES (SCROLL PARA RESIZE)", 20, 30);
        
        // Aquí podrías iterar sobre tus "Lugares" si los tienes en datos
        // y dibujarlos fijos en Y pero en X siempre dentro del sidebar
    }

    _drawGrid() {
        // Solo para referencia visual del movimiento
        const size = 100;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.03)';
        this.ctx.lineWidth = 1;
        
        // Optimizacion: Dibujar solo en el área visible sería mejor, 
        // pero por simplicidad dibujamos un área grande
        const limit = 5000; 
        this.ctx.beginPath();
        for(let x = -limit; x <= limit; x+=size) {
            this.ctx.moveTo(x, -limit);
            this.ctx.lineTo(x, limit);
        }
        for(let y = -limit; y <= limit; y+=size) {
            this.ctx.moveTo(-limit, y);
            this.ctx.lineTo(limit, y);
        }
        this.ctx.stroke();
    }

    _drawNeumorphicNode(node) {
        // (TU CÓDIGO DE DIBUJO ORIGINAL DE NODOS SE MANTIENE IGUAL)
        const { x, y, radius, color, label, name } = node;
        
        // Sombra
        this.ctx.shadowOffsetX = 8; this.ctx.shadowOffsetY = 8;
        this.ctx.shadowBlur = 16; this.ctx.shadowColor = 'rgba(163, 177, 198, 0.5)';
        this.ctx.beginPath(); this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#f2f2f2'; this.ctx.fill();

        // Luz
        this.ctx.shadowOffsetX = -8; this.ctx.shadowOffsetY = -8;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 1)';
        this.ctx.beginPath(); this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowColor = 'transparent';

        // Borde
        this.ctx.strokeStyle = color; this.ctx.lineWidth = 1.5;
        this.ctx.beginPath(); this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Texto
        this.ctx.fillStyle = '#444444'; this.ctx.font = 'bold 14px Helvetica';
        this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, x, y - 5);
        this.ctx.font = '9px Helvetica'; this.ctx.fillStyle = '#888888';
        this.ctx.fillText(name, x, y + 15);
    }

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

 