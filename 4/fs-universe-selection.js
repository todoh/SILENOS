// --- FS-UNIVERSE-SELECTION.JS (MULTI-SELECTION LOGIC) ---
/**
 * Lógica para la selección múltiple de nodos.
 * Maneja la caja de selección y el estado de los nodos seleccionados.
 */

Universe.selection = {
    active: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
};

Universe.selectedNodes = [];

// Añadir un nodo a la selección (si no está ya)
Universe.selectNode = function(node, addToExisting = false) {
    if (!addToExisting) {
        this.selectedNodes = [];
    }
    if (!this.selectedNodes.includes(node)) {
        this.selectedNodes.push(node);
    }
};

// Alternar selección (para Shift + Click en nodo)
Universe.toggleNodeSelection = function(node) {
    if (this.selectedNodes.includes(node)) {
        this.selectedNodes = this.selectedNodes.filter(n => n !== node);
    } else {
        this.selectedNodes.push(node);
    }
};

// Limpiar selección
Universe.clearSelection = function() {
    this.selectedNodes = [];
};

// Iniciar caja de selección (Coordenadas de pantalla)
Universe.startSelectionBox = function(x, y) {
    this.selection.active = true;
    this.selection.startX = x;
    this.selection.startY = y;
    this.selection.endX = x;
    this.selection.endY = y;
};

// Actualizar caja mientras se mueve el mouse
Universe.updateSelectionBox = function(x, y) {
    if (!this.selection.active) return;
    this.selection.endX = x;
    this.selection.endY = y;
};

// Finalizar caja y calcular qué nodos cayeron dentro
Universe.endSelectionBox = function(addToExisting = false) {
    if (!this.selection.active) return;

    // Calcular rectángulo de selección en coordenadas de pantalla
    // Usamos Math.min/max para normalizar la dirección del arrastre (izquierda/derecha/arriba/abajo)
    const sx = Math.min(this.selection.startX, this.selection.endX);
    const sy = Math.min(this.selection.startY, this.selection.endY);
    const sw = Math.abs(this.selection.endX - this.selection.startX);
    const sh = Math.abs(this.selection.endY - this.selection.startY);

    // Si el cuadro es muy pequeño, lo ignoramos (evita clicks falsos o micro-arrastres)
    if (sw < 5 && sh < 5) {
        this.selection.active = false;
        return;
    }

    if (!addToExisting) {
        this.clearSelection();
    }

    // Comprobar colisión de cada nodo con la caja de selección
    for (const node of this.nodes) {
        // 1. Obtener centro del nodo en pantalla
        const screenPos = this.worldToScreen(node.x, node.y);
        
        // 2. Calcular radio visual del nodo (afectado por ZOOM)
        // Esto es crucial para que la selección funcione al tocar los bordes del icono
        const screenRadius = node.r * this.camera.zoom;

        // 3. Definir la caja (Bounding Box) del Nodo en pantalla
        const nodeLeft = screenPos.x - screenRadius;
        const nodeRight = screenPos.x + screenRadius;
        const nodeTop = screenPos.y - screenRadius;
        const nodeBottom = screenPos.y + screenRadius;

        // 4. Definir la caja de Selección
        const boxLeft = sx;
        const boxRight = sx + sw;
        const boxTop = sy;
        const boxBottom = sy + sh;

        // 5. Detectar Intersección AABB (Axis-Aligned Bounding Box)
        // Se tocan si se solapan en ambos ejes (X e Y)
        const intersects = (nodeLeft < boxRight) && 
                           (nodeRight > boxLeft) && 
                           (nodeTop < boxBottom) && 
                           (nodeBottom > boxTop);

        if (intersects) {
            if (!this.selectedNodes.includes(node)) {
                this.selectedNodes.push(node);
            }
        }
    }

    this.selection.active = false;
};

// Helper: Convertir Mundo -> Pantalla
// Necesario para comparar la posición de los nodos con la caja del mouse (que está en px de pantalla)
Universe.worldToScreen = function(wx, wy) {
    const rect = this.canvas.getBoundingClientRect();
    
    // Formula inversa a getNodeAtScreenPos
    const rawX = (wx - this.camera.x) * this.camera.zoom + this.width / 2;
    const rawY = (wy - this.camera.y) * this.camera.zoom + this.height / 2;

    return { x: rawX + rect.left, y: rawY + rect.top };
};

// Dibujar la caja (se llama desde render)
Universe.drawSelectionOverlay = function() {
    if (this.selection.active) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Ajustamos coordenadas para dibujar relativo al 0,0 del canvas
        const startX = this.selection.startX - rect.left;
        const startY = this.selection.startY - rect.top;
        const endX = this.selection.endX - rect.left;
        const endY = this.selection.endY - rect.top;
        
        const width = endX - startX;
        const height = endY - startY;

        this.ctx.save();
        // IMPORTANTE: Reseteamos la transformación para dibujar en píxeles de pantalla 1:1
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); 
        
        this.ctx.beginPath(); 
        this.ctx.strokeStyle = '#ff0000'; // Rojo estilo suizo
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]); // Línea punteada
        this.ctx.strokeRect(startX, startY, width, height);
        
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
        this.ctx.fillRect(startX, startY, width, height);
        
        this.ctx.restore();
    }
};