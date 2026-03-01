// --- datosstudio/tramas.connections.js ---
// LÓGICA SEPARADA PARA PUERTOS Y CONEXIONES (BEZIER)

const TramasConnections = {
    portRadius: 6,

    // --- DIBUJO DE PUERTOS ---
    drawPorts(ctx, node, nodeWidth, nodeHeight) {
        ctx.lineWidth = 2;

        // Puerto de Entrada (Izquierda)
        ctx.fillStyle = '#f9fafb';
        ctx.strokeStyle = '#10b981'; // Verde esmeralda
        ctx.beginPath();
        ctx.arc(node.x, node.y + nodeHeight / 2, this.portRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Puerto de Salida (Derecha)
        ctx.fillStyle = '#f9fafb';
        ctx.strokeStyle = '#6366f1'; // Índigo
        ctx.beginPath();
        ctx.arc(node.x + nodeWidth, node.y + nodeHeight / 2, this.portRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    },

    // --- DETECCIÓN DE HIT EN PUERTO ---
    getPortAt(worldX, worldY, node, nodeWidth, nodeHeight) {
        const inX = node.x;
        const inY = node.y + nodeHeight / 2;
        const outX = node.x + nodeWidth;
        const outY = node.y + nodeHeight / 2;

        // Margen generoso para facilitar el clic
        const hitRadius = this.portRadius + 6; 

        if (Math.hypot(worldX - inX, worldY - inY) <= hitRadius) return 'in';
        if (Math.hypot(worldX - outX, worldY - outY) <= hitRadius) return 'out';
        return null;
    },

    // --- DIBUJO DE CONEXIÓN (BEZIER CÚBICO) ---
    drawConnection(ctx, fromNode, toNode, nodeWidth, nodeHeight, isHovered) {
        const startX = fromNode.x + nodeWidth;
        const startY = fromNode.y + nodeHeight / 2;
        const endX = toNode.x;
        const endY = toNode.y + nodeHeight / 2;

        this.drawCubicBezier(ctx, startX, startY, endX, endY, isHovered);
    },

    drawTempConnection(ctx, startNode, currentX, currentY, nodeWidth, nodeHeight) {
        const startX = startNode.x + nodeWidth;
        const startY = startNode.y + nodeHeight / 2;
        
        ctx.setLineDash([5, 5]);
        this.drawCubicBezier(ctx, startX, startY, currentX, currentY, false, '#9ca3af');
        ctx.setLineDash([]);
    },

    drawCubicBezier(ctx, startX, startY, endX, endY, isHovered, forceColor = null) {
        // Puntos de control para la curva "S" horizontal
        const distance = Math.abs(endX - startX) * 0.5 + 20; 
        const cp1x = startX + distance;
        const cp1y = startY;
        const cp2x = endX - distance;
        const cp2y = endY;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        
        if (isHovered) {
            ctx.strokeStyle = '#ef4444'; // Rojo (indicando posible borrado)
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
            ctx.shadowBlur = 8;
        } else {
            ctx.strokeStyle = forceColor || '#8b5cf6'; // Morado por defecto
            ctx.lineWidth = 2.5;
            ctx.shadowColor = 'transparent';
        }
        ctx.stroke();
        ctx.shadowColor = 'transparent'; // Resetear sombra

        // Dibujar Flecha al final (justo antes de llegar al punto)
        this.drawArrow(ctx, endX, endY, cp2x, cp2y, isHovered ? '#ef4444' : (forceColor || '#8b5cf6'));
    },

    drawArrow(ctx, x, y, cpX, cpY, color) {
        // Calcular ángulo tangente en el punto final
        const angle = Math.atan2(y - cpY, x - cpX);
        const radius = 7;
        
        // Retrasamos la flecha un poco para que no se superponga con el puerto
        const offset = this.portRadius + 2;
        const adjustedX = x - offset * Math.cos(angle);
        const adjustedY = y - offset * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(adjustedX, adjustedY);
        ctx.lineTo(adjustedX - radius * Math.cos(angle - Math.PI/7), adjustedY - radius * Math.sin(angle - Math.PI/7));
        ctx.lineTo(adjustedX - radius * Math.cos(angle + Math.PI/7), adjustedY - radius * Math.sin(angle + Math.PI/7));
        ctx.fillStyle = color;
        ctx.fill();
    },

    // --- DETECCIÓN DE HIT EN CONEXIÓN ---
    getHoveredConnection(worldX, worldY, nodes, nodeWidth, nodeHeight) {
        for (let node of nodes) {
            if (!node.connections) continue;
            for (let targetId of node.connections) {
                const target = nodes.find(n => n.id === targetId);
                if (!target) continue;

                const startX = node.x + nodeWidth;
                const startY = node.y + nodeHeight / 2;
                const endX = target.x;
                const endY = target.y + nodeHeight / 2;

                if (this.isPointOnCubicBezier(worldX, worldY, startX, startY, endX, endY)) {
                    return { from: node.id, to: targetId };
                }
            }
        }
        return null;
    },

    isPointOnCubicBezier(px, py, x1, y1, x2, y2) {
        const distance = Math.abs(x2 - x1) * 0.5 + 20; 
        const cp1x = x1 + distance;
        const cp1y = y1;
        const cp2x = x2 - distance;
        const cp2y = y2;

        const steps = 30; // Muestreo de la curva
        let lastX = x1, lastY = y1;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const mt = 1 - t;
            const cx = mt*mt*mt*x1 + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*x2;
            const cy = mt*mt*mt*y1 + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*y2;

            const dist = this.distToSegment(px, py, lastX, lastY, cx, cy);
            if (dist < 8) return true; // Tolerancia de 8 pixeles

            lastX = cx;
            lastY = cy;
        }
        return false;
    },

    distToSegment(px, py, x1, y1, x2, y2) {
        const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }
};

window.TramasConnections = TramasConnections;