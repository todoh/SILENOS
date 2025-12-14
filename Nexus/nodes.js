/**
 * NODES.JS
 * Definición geométrica y semántica.
 * Ajustado con paleta de colores "Mate" para fondo claro.
 */

class NodeSystem {
    constructor() {
        this.nodes = [];
        this.radius = 45;     // Ligeramente más grandes para el estilo soft
        this.hexRadius = 160; 
    }

    generateNodes(cx, cy) {
        this.nodes = [];

        // COLORES MATE (Para fondo blanco)
        const C_GOLD = '#d4ac0d';   // Z - Oro oscuro
        const C_CYAN = '#00acc1';   // Estructura - Cian mate
        const C_RED  = '#d63031';   // IA/Variable - Rojo mate

        // 1. NODO CENTRAL (Z - Conocimiento/Sistema)
        this.nodes.push(this._createNode('Z', 'SISTEMA', 'SYSTEM', cx, cy, C_GOLD));

        const angles = [0, 60, 120, 180, 240, 300];

        // 2. ANILLO INTERIOR (Estructura Base)
        const innerLayer = [
            { id: 'M', name: 'Material (Mundo)' },
            { id: 'K', name: 'Camino (Tiempo)' },
            { id: 'L', name: 'Límite (Leyes)' },
            { id: 'G', name: 'Granularidad (Bio)' },
            { id: 'H', name: 'Coherencia (Soc)' },
            { id: 'R', name: 'Resonancia (Cult)' }
        ];

        angles.forEach((deg, i) => {
            const rad = deg * (Math.PI / 180);
            const x = cx + Math.cos(rad) * this.hexRadius;
            const y = cy + Math.sin(rad) * this.hexRadius;
            this.nodes.push(this._createNode(innerLayer[i].id, innerLayer[i].name, 'TEMPLATE', x, y, C_CYAN));
        });

        // 3. ANILLO EXTERIOR (Dinámicas)
        const outerLayer = [
            { id: 'I', name: 'Individualidad', type: 'TEMPLATE', color: C_CYAN },
            { id: 'J', name: 'Juegos (Sim)', type: 'AI', color: C_RED },        
            { id: 'O', name: 'Conjunto (Facc)', type: 'TEMPLATE', color: C_CYAN },
            { id: 'P', name: 'Potencial (Obj)', type: 'TEMPLATE', color: C_CYAN },
            { id: 'X', name: 'Incógnita (Orac)', type: 'AI', color: C_RED },    
            { id: 'A', name: 'Acción (Trama)', type: 'TEMPLATE', color: C_CYAN }  
        ];

        angles.forEach((deg, i) => {
            const rad = deg * (Math.PI / 180);
            // Multiplicamos por 2 para el segundo anillo
            const x = cx + Math.cos(rad) * (this.hexRadius * 2);
            const y = cy + Math.sin(rad) * (this.hexRadius * 2);
            this.nodes.push(this._createNode(outerLayer[i].id, outerLayer[i].name, outerLayer[i].type, x, y, outerLayer[i].color));
        });

        return this.nodes;
    }

    _createNode(id, name, type, x, y, color) {
        return {
            id,
            label: id,
            name,
            type,
            x,
            y,
            color,
            radius: this.radius
        };
    }

    checkClick(mx, my) {
        for (let node of this.nodes) {
            const dist = Math.hypot(mx - node.x, my - node.y);
            if (dist < node.radius) {
                return node;
            }
        }
        return null;
    }
}