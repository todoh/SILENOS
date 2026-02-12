// --- FS-UNIVERSE-UTILS.JS (LOGIC HELPERS) ---
/**
 * Utilidades lógicas para el universo.
 * Detección de colisiones (Raycasting) y activación de nodos.
 */

Universe.getNodeAtScreenPos = function(screenX, screenY) {
    if (!this.canvas) return null;
    
    const rect = this.canvas.getBoundingClientRect();
    const rawX = screenX - rect.left;
    const rawY = screenY - rect.top;

    // Convertir coordenada de pantalla a coordenadas de mundo
    const worldX = (rawX - this.width / 2) / this.camera.zoom + this.camera.x;
    const worldY = (rawY - this.height / 2) / this.camera.zoom + this.camera.y;

    // Buscar colisión inversa (de arriba a abajo para seleccionar el que se ve encima)
    for (let i = this.nodes.length - 1; i >= 0; i--) {
        const node = this.nodes[i];
        
        // Usamos un radio ligeramente mayor para facilitar el click (Hitbox padding)
        const hitRadius = node.r * 1.1; 
        
        if (worldX >= node.x - hitRadius && worldX <= node.x + hitRadius &&
            worldY >= node.y - hitRadius && worldY <= node.y + hitRadius) {
            return node;
        }
    }
    return null;
};

Universe.activateNode = function(node) {
    // Si tenemos múltiples seleccionados, el click simple NO abre ventanas masivamente
    if (this.selectedNodes.length > 1) return;

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