/* SILENOS 3/prog-connection-system.js */

class ProgConnectionSystem {
    constructor(svgLayer, owner) {
        this.svg = svgLayer;
        this.owner = owner;
    }

    render() {
        this.svg.querySelectorAll('.prog-conn-line').forEach(l => l.remove());
        this.owner.connections.forEach(conn => {
            const p1 = this.owner.getPortCenter(conn.fromNode, conn.fromPort);
            const p2 = this.owner.getPortCenter(conn.toNode, conn.toPort);
            if (p1 && p2) {
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.classList.add('prog-conn-line');
                const d = this.calculateBezier(p1.x, p1.y, p2.x, p2.y);
                path.setAttribute("d", d);
                path.setAttribute("stroke", conn.fromPort === 'true' ? '#22c55e' : (conn.fromPort === 'false' ? '#ef4444' : '#888'));
                path.setAttribute("stroke-width", "4");
                path.setAttribute("fill", "none");
                path.setAttribute("marker-end", `url(#arrow-${this.owner.windowId})`);
                
                // [FIX] Habilitar interacción del ratón en el path (el SVG padre tiene pointer-events: none)
                path.style.pointerEvents = "visibleStroke";
                path.style.cursor = "pointer";

                // [FIX] Añadido stopPropagation para evitar conflicto con menú global
                path.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation(); 
                    if(confirm("¿Eliminar conexión?")) this.owner.removeConnection(conn);
                };
                
                this.svg.prepend(path);
            }
        });
    }

    calculateBezier(x1, y1, x2, y2) {
        const dist = Math.abs(x2 - x1) * 0.5;
        return `M ${x1} ${y1} C ${x1 + dist} ${y1}, ${x2 - dist} ${y2}, ${x2} ${y2}`;
    }
}