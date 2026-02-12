// --- FS-UNIVERSE-INPUT.JS (EVENT HANDLERS) ---
/**
 * Manejo de eventos de entrada (Mouse/Touch/Wheel).
 * Gestiona clics, arrastres, zoom y menús contextuales.
 */

Universe.handleInputStart = function(e) {
    // 0. Prevenir comportamientos del navegador si es necesario
    if (e.shiftKey) e.preventDefault(); 

    // 1. Guardar estado inicial
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.isMouseDown = true;
    
    // 2. Detectar nodo bajo el mouse
    const node = this.getNodeAtScreenPos(e.clientX, e.clientY);

    // --- CLICK DERECHO (Menú Contextual) ---
    if (e.button === 2) {
        this.handleRightClick(e);
        return; 
    }

    // --- CLICK IZQUIERDO ---
    if (e.button === 0) {
        
        // ==> MODO SELECCIÓN (Tecla SHIFT pulsada) <==
        if (e.shiftKey) {
            if (node) {
                // Shift + Click en Nodo -> Toggle (Añadir/Quitar)
                this.toggleNodeSelection(node);
                this.draggedNode = null; 
            } else {
                // Shift + Click en Vacío -> CAJA DE SELECCIÓN
                if (this.startSelectionBox) {
                    this.startSelectionBox(e.clientX, e.clientY);
                }
            }
            this.isCameraDragging = false;
            return; // Salimos aquí para no activar arrastre normal
        }

        // ==> MODO NORMAL (Sin Shift) <==
        if (node) {
            // Click en Nodo
            // Si NO está seleccionado, limpiar otros y seleccionarlo
            if (!this.selectedNodes.includes(node)) {
                this.clearSelection();
                this.selectNode(node);
            }
            
            // Preparar arrastre de nodo(s)
            this.draggedNode = node;
            this.isCameraDragging = false;
            this.canvas.style.cursor = 'grabbing';
        } else {
            // Click en Vacío -> Mover Cámara
            this.clearSelection(); 
            this.draggedNode = null;
            this.isCameraDragging = true;
            this.canvas.style.cursor = 'grabbing';
        }
    }
};

Universe.handleInputMove = function(e) {
    // 1. ¿Estamos haciendo una caja de selección? (PRIORIDAD MÁXIMA)
    if (this.selection && this.selection.active) {
        this.updateSelectionBox(e.clientX, e.clientY);
        return;
    }

    if (!this.isMouseDown) return;

    // Umbral (Deadzone) para evitar micro-movimientos
    const distFromStart = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
    if (distFromStart < 5) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;

    // 2. Mover Nodos (Solo si NO tenemos Shift pulsado)
    if (this.draggedNode && !e.shiftKey) {
        const worldDx = dx / this.camera.zoom;
        const worldDy = dy / this.camera.zoom;
        
        // Si el nodo arrastrado es parte de la selección, movemos TODO el grupo
        if (this.selectedNodes && this.selectedNodes.includes(this.draggedNode)) {
            for (const n of this.selectedNodes) {
                n.x += worldDx;
                n.y += worldDy;
                n.homeX = n.x;
                n.homeY = n.y;
            }
        } else {
            // Mover solo este nodo
            this.draggedNode.x += worldDx;
            this.draggedNode.y += worldDy;
            this.draggedNode.homeX = this.draggedNode.x;
            this.draggedNode.homeY = this.draggedNode.y;
        }

    } else if (this.isCameraDragging) {
        // 3. Mover Cámara
        this.camera.targetX -= dx / this.camera.zoom;
        this.camera.targetY -= dy / this.camera.zoom;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
};

Universe.handleInputEnd = function(e) {
    // 1. Finalizar Caja de Selección
    if (this.selection && this.selection.active) {
        this.endSelectionBox(true); // 'true' = Añadir a selección existente
        this.isMouseDown = false;
        return;
    }

    // Resetear estados de arrastre
    this.draggedNode = null;
    this.isCameraDragging = false;
    if (this.canvas) this.canvas.style.cursor = 'grab';

    // 2. Click Simple (Abrir archivo)
    // Solo si no nos hemos movido (distancia < 5px)
    const distMoved = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
    
    if (distMoved < 5 && e.button === 0) {
        const node = this.getNodeAtScreenPos(e.clientX, e.clientY);
        
        if (node) {
            // Si era Shift, el toggle ya se hizo en Start.
            // Si NO es Shift, gestionamos click simple
            if (!e.shiftKey) {
                // Si hacemos click simple en un nodo seleccionado,
                // reducimos la selección solo a él y lo abrimos.
                this.clearSelection();
                this.selectNode(node);
                this.activateNode(node);
            }
        }
    }

    this.isMouseDown = false;
};

Universe.handleRightClick = function(e) {
    const node = this.getNodeAtScreenPos(e.clientX, e.clientY);
    let targets = null;

    if (node) {
        if (this.selectedNodes && this.selectedNodes.includes(node)) {
            // Click derecho en selección -> Acciones para todos
            targets = this.selectedNodes.map(n => n.entry);
        } else {
            // Click derecho en uno suelto -> Seleccionar solo ese
            this.clearSelection();
            this.selectNode(node);
            targets = [node.entry];
        }
    } else {
        targets = null;
    }

    if (typeof Actions !== 'undefined' && Actions.openContextMenu) {
        Actions.openContextMenu(e.clientX, e.clientY, targets, this.currentHandle);
    }
};

Universe.handleWheel = function(e) {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    let newZoom = this.camera.targetZoom * (1 + delta);
    newZoom = Math.max(0.1, Math.min(newZoom, 5));
    this.camera.targetZoom = newZoom;
};