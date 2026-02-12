// --- FS-UNIVERSE-DRAW.JS (VISUALS ONLY) ---
/**
 * Renderizado visual del Universo.
 * Contiene el bucle de dibujo, la rejilla y los nodos.
 */

Universe.draw = function() {
    if (!this.ctx) return;

    // 1. Fondo
    this.ctx.fillStyle = '#f0f0f0'; 
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // 2. Rejilla
    this.drawGrid();

    // 3. Nodos (Afectados por cámara)
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    for (const node of this.nodes) {
        this.drawNode(node);
    }
    this.ctx.restore();

    // 4. Interfaz Superior (Caja de Selección) - SIN afectación de cámara
    if (this.drawSelectionOverlay) {
        this.drawSelectionOverlay();
    }
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
    const size = node.r * 2;
    const half = node.r;
    
    // Verificar si está seleccionado
    const isSelected = this.selectedNodes && this.selectedNodes.includes(node);

    this.ctx.beginPath();
    this.ctx.rect(node.x - half, node.y - half, size, size);
    
    // Estilos base del nodo
    if (node.type === 'dir') {
        this.ctx.fillStyle = '#000000';
        this.ctx.fill();
        this.ctx.strokeStyle = isSelected ? '#ff0000' : '#000000';
        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.stroke();
    } else {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.strokeStyle = isSelected ? '#ff0000' : '#000000';
        this.ctx.lineWidth = isSelected ? 3 : 1;
        this.ctx.stroke();
    }

    // CLIPPING (CONTENIDO INTERNO)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(node.x - half, node.y - half, size, size);
    this.ctx.clip(); 

    // --- CONTENIDO DEL NODO ---
    // AHORA SOPORTA VIDEO TAMBIÉN
    if ((node.type === 'image' || node.type === 'video') && node.preview) {
        try {
            const ratio = Math.max(size / node.preview.width, size / node.preview.height);
            const w = node.preview.width * ratio;
            const h = node.preview.height * ratio;
            this.ctx.drawImage(node.preview, node.x - w/2, node.y - h/2, w, h);
            
            // Si es video, dibujar overlay de PLAY
            if (node.type === 'video') {
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                this.ctx.fillRect(node.x - half, node.y - half, size, size);
                
                // Triángulo Play
                this.ctx.beginPath();
                const playSize = size * 0.3;
                this.ctx.moveTo(node.x - playSize/3, node.y - playSize/2);
                this.ctx.lineTo(node.x + playSize/1.5, node.y);
                this.ctx.lineTo(node.x - playSize/3, node.y + playSize/2);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fill();
            }

        } catch(e) {}

    } else if (node.type === 'dir') {
        if (node.childCount > 0) {
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            const miniSize = size * 0.4;
            this.ctx.fillRect(node.x - miniSize/2, node.y - miniSize/2, miniSize, miniSize);
        }

    } else if (node.type === 'code' || node.type === 'file') {
        // Lógica especial HTML: Letra inicial
        if (node.label.toLowerCase().endsWith('.html') || node.label.toLowerCase().endsWith('.htm')) {
            this.ctx.fillStyle = '#000000';
            this.ctx.font = `900 ${size * 0.6}px "Inter", "Arial", sans-serif`; 
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const char = node.label.charAt(0).toUpperCase();
            this.ctx.fillText(char, node.x, node.y + (size * 0.05));
        } else {
            // Archivo normal: Líneas abstractas
            this.ctx.fillStyle = '#e5e5e5';
            const lines = 5;
            const lh = size * 0.6 / lines;
            const startY = node.y - size * 0.2;
            for(let k=0; k<lines; k++) {
                const lw = size * 0.6; 
                this.ctx.fillRect(node.x - lw/2, startY + k*lh * 1.5, lw, lh);
            }
        }
    }
    this.ctx.restore();

    // --- ETIQUETAS EXTERNAS (LABELS) ---
    if (isSelected || this.camera.zoom * node.r > 20) {
        const fontSize = Math.max(10, node.r/3.5);
        this.ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const charLimit = 14; 
        const lines = node.label.match(new RegExp('.{1,' + charLimit + '}', 'g')) || [node.label];
        
        const lineHeight = fontSize + 4;
        const totalHeight = lines.length * lineHeight;
        
        let maxLineWidth = 0;
        lines.forEach(line => {
            const w = this.ctx.measureText(line).width;
            if (w > maxLineWidth) maxLineWidth = w;
        });

        const padding = 6;
        const labelY = node.y + half + 6; 
        
        this.ctx.fillStyle = isSelected ? '#ff0000' : (node.type === 'dir' ? '#ffffff' : '#000000');
        this.ctx.fillRect(
            node.x - maxLineWidth/2 - padding, 
            labelY, 
            maxLineWidth + (padding*2), 
            totalHeight + padding
        );
        
        this.ctx.fillStyle = isSelected ? '#ffffff' : (node.type === 'dir' ? '#000000' : '#ffffff');
        
        lines.forEach((line, i) => {
            const yPos = labelY + (padding/2) + (lineHeight/2) + (i * lineHeight);
            this.ctx.fillText(line, node.x, yPos);
        });
    }
};