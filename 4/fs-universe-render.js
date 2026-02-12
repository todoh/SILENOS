// --- FS-UNIVERSE-RENDER.JS (DRAWING & INPUT) ---
/**
 * Renderizado visual y manejo de eventos de entrada (Mouse/Touch).
 * Dibuja los nodos estilo suizo y procesa clics.
 */

Universe.draw = function() {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#f0f0f0'; 
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.drawGrid();

    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    for (const node of this.nodes) {
        this.drawNode(node);
    }

    this.ctx.restore();
};

Universe.drawGrid = function() {
    const gridSize = 100 * this.camera.zoom;
    const offsetX = (this.width / 2 - this.camera.x * this.camera.zoom) % gridSize;
    const offsetY = (this.height / 2 - this.camera.y * this.camera.zoom) % gridSize;

    this.ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    for (let x = offsetX; x < this.width; x += gridSize) {
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
    }
    for (let y = offsetY; y < this.height; y += gridSize) {
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
    }
    this.ctx.stroke();
};

Universe.drawNode = function(node) {
    // --- DIBUJADO CUADRADO (SWISS STYLE) ---
    const size = node.r * 2;
    const half = node.r;
    
    this.ctx.beginPath();
    this.ctx.rect(node.x - half, node.y - half, size, size);
    
    if (node.type === 'dir') {
        this.ctx.fillStyle = '#000000';
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    } else {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(node.x - half, node.y - half, size, size);
    this.ctx.clip(); 

    if (node.type === 'image' && node.preview) {
        try {
            const ratio = Math.max(size / node.preview.width, size / node.preview.height);
            const w = node.preview.width * ratio;
            const h = node.preview.height * ratio;
            this.ctx.drawImage(node.preview, node.x - w/2, node.y - h/2, w, h);
        } catch(e) {}
    } else if (node.type === 'dir') {
        if (node.childCount > 0) {
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            const miniSize = size * 0.4;
            this.ctx.fillRect(node.x - miniSize/2, node.y - miniSize/2, miniSize, miniSize);
        }
    } else if (node.type === 'code' || node.type === 'file') {
        this.ctx.fillStyle = '#e5e5e5';
        const lines = 5;
        const lh = size * 0.6 / lines;
        const startY = node.y - size * 0.2;
        for(let k=0; k<lines; k++) {
            const lw = size * 0.6; 
            this.ctx.fillRect(node.x - lw/2, startY + k*lh * 1.5, lw, lh);
        }
    }

    this.ctx.restore();

    // --- ETIQUETAS (LABELS) ---
    if (this.camera.zoom * node.r > 20) {
        this.ctx.font = `bold ${Math.max(10, node.r/3.5)}px "Courier New", monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const text = node.label;
        const textMetrics = this.ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = node.r/3.5 + 4;

        this.ctx.fillStyle = node.type === 'dir' ? '#ffffff' : '#000000';
        const labelY = node.y + half + textHeight; 
        
        this.ctx.fillRect(node.x - textWidth/2 - 4, labelY - textHeight/2, textWidth + 8, textHeight);
        
        this.ctx.fillStyle = node.type === 'dir' ? '#000000' : '#ffffff';
        this.ctx.fillText(text, node.x, labelY);
    }
};

// --- INPUT HANDLERS (UPDATED FOR DRAG & DROP) ---

Universe.handleInputStart = function(e) {
    if (e.button === 2) return; 

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.isMouseDown = true;
    
    // 1. Detectar si clickamos un nodo
    const node = this.getNodeAtScreenPos(e.clientX, e.clientY);
    
    if (node) {
        // Modo: ARRASTRAR NODO
        this.draggedNode = node;
        this.isCameraDragging = false;
        this.canvas.style.cursor = 'grabbing';
    } else {
        // Modo: ARRASTRAR CÁMARA
        this.draggedNode = null;
        this.isCameraDragging = true;
        this.canvas.style.cursor = 'grabbing';
    }
};

Universe.handleInputMove = function(e) {
    if (!this.isMouseDown) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;

    if (this.draggedNode) {
        // --- MOVIMIENTO DE NODO ---
        // Convertir delta de pantalla a delta de mundo
        const worldDx = dx / this.camera.zoom;
        const worldDy = dy / this.camera.zoom;
        
        // Mover nodo visualmente
        this.draggedNode.x += worldDx;
        this.draggedNode.y += worldDy;
        
        // ACTUALIZAR HOME: Esto hace que el nodo se "quede" donde lo soltamos
        // y la física no lo devuelva a su sitio original.
        this.draggedNode.homeX = this.draggedNode.x;
        this.draggedNode.homeY = this.draggedNode.y;

    } else if (this.isCameraDragging) {
        // --- MOVIMIENTO DE CÁMARA (PAN) ---
        this.camera.targetX -= dx / this.camera.zoom;
        this.camera.targetY -= dy / this.camera.zoom;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
};

Universe.handleInputEnd = function(e) {
    // Si estábamos arrastrando un nodo, lo soltamos
    if (this.draggedNode) {
        this.draggedNode = null;
    }
    
    // Si NO movimos mucho el mouse, cuenta como CLIC
    // Solo si no fue un arrastre de cámara significativo
    const distMoved = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
    
    if (distMoved < 5 && !this.isCameraDragging && e.button !== 2) {
        // Fue un click limpio en un nodo (porque isCameraDragging es false si empezamos en un nodo)
        // Ojo: handleInputStart decide quién es target.
        const node = this.getNodeAtScreenPos(e.clientX, e.clientY);
        if (node) {
            this.activateNode(node);
        }
    }

    this.isMouseDown = false;
    this.isCameraDragging = false;
    if (this.canvas) this.canvas.style.cursor = 'grab';
};

Universe.handleRightClick = function(e) {
    const node = this.getNodeAtScreenPos(e.clientX, e.clientY);
    
    if (typeof Actions !== 'undefined' && Actions.openContextMenu) {
        Actions.openContextMenu(e.clientX, e.clientY, node ? node.entry : null, this.currentHandle);
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

Universe.getNodeAtScreenPos = function(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const rawX = screenX - rect.left;
    const rawY = screenY - rect.top;

    const worldX = (rawX - this.width / 2) / this.camera.zoom + this.camera.x;
    const worldY = (rawY - this.height / 2) / this.camera.zoom + this.camera.y;

    // Detectar colisión RECTANGULAR (AABB)
    for (let i = this.nodes.length - 1; i >= 0; i--) {
        const node = this.nodes[i];
        const half = node.r; 
        
        if (worldX >= node.x - half && worldX <= node.x + half &&
            worldY >= node.y - half && worldY <= node.y + half) {
            return node;
        }
    }
    return null;
};

Universe.activateNode = function(node) {
    if (node.type === 'dir') {
        if (typeof WindowManager !== 'undefined') {
            WindowManager.openWindow(node.entry.name, node.entry, 'dir');
        }
    } else {
        if (typeof handleOpenFile === 'function') {
            handleOpenFile(node.entry);
        }
    }
};