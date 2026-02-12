// --- FS-UNIVERSE-PHYSICS.JS (SIMULATION & LAYOUT) ---
/**
 * Motor físico y loop de animación.
 * Maneja las fuerzas de atracción, repulsión y movimientos de cámara.
 */

Universe.startAnimation = function() {
    if (this.animationId) {
        cancelAnimationFrame(this.animationId);
    }
    this.animate();
};

Universe.animate = function() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.updatePhysics();
    this.draw(); 
};

Universe.updatePhysics = function() {
    // Física de Cámara
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;

    for (let i = 0; i < this.nodes.length; i++) {
        const a = this.nodes[i];
        
        // Si estamos arrastrando este nodo, ignorar fuerzas de posición (Home)
        if (this.draggedNode === a) {
            a.vx = 0;
            a.vy = 0;
            continue; 
        }

        a.r += (a.targetR - a.r) * 0.05;

        // 1. Atracción al "Home" (Posición ordenada o soltada manualmente)
        if (a.homeX !== undefined) {
            a.x += (a.homeX - a.x) * 0.1; 
            a.y += (a.homeY - a.y) * 0.1;
        }

        // 2. Repulsión entre elementos (Collision)
        for (let j = i + 1; j < this.nodes.length; j++) {
            const b = this.nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Radio efectivo (ligeramente menor al visual para permitir agrupamiento)
            const minDist = a.r + b.r + 5; 

            if (dist < minDist && dist > 0) {
                const force = (minDist - dist) / dist * 0.05; 
                const fx = dx * force;
                const fy = dy * force;

                // Si uno está siendo arrastrado, el otro se aparta
                if (this.draggedNode !== a) {
                    a.x -= fx;
                    a.y -= fy;
                }
                if (this.draggedNode !== b) {
                    b.x += fx;
                    b.y += fy;
                }
            }
        }
        
        // Fricción
        a.vx *= 0.9;
        a.vy *= 0.9;
        a.x += a.vx;
        a.y += a.vy;
    }
};

Universe.organizeLayout = function() {
    // Layout inicial en CUADRÍCULA
    const total = this.nodes.length;
    if (total === 0) return;

    const cols = Math.ceil(Math.sqrt(total)); 
    
    // --- CAMBIO: ESPACIO AUMENTADO A 180 ---
    const spacing = 180; 
    
    const gridWidth = cols * spacing;
    const startX = -gridWidth / 2 + (spacing / 2);
    
    for (let i = 0; i < total; i++) {
        const node = this.nodes[i];
        const col = i % cols;
        const row = Math.floor(i / cols);

        const targetX = startX + (col * spacing);
        const targetY = (-Math.ceil(total/cols) * spacing / 2) + (row * spacing);
        
        // Si es la primera carga (0,0), teleportar
        if (node.x === 0 && node.y === 0) {
            node.x = targetX;
            node.y = targetY;
        } 
        
        node.homeX = targetX;
        node.homeY = targetY;
    }
};