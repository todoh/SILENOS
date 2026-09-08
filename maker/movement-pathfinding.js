// movement-pathfinding.js - ALGORITMOS DE BUSQUEDA DE RUTAS, A* Y COLISIONES DE LÍNEA
class MovementPathfinding {
    static checkLineCollision(engine, x1, y1, x2, y2, elem = engine.player) {
        const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (engine.gridSize / 2));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            const origin = engine.pivotToOrigin(px, py, elem);
            if (engine.checkCollision(origin.x, origin.y, elem)) {
                return true;
            }
        }
        return false;
    }

    static findPathAStar(engine, startX, startY, targetX, targetY, elem = engine.player) {
        const dim = getStageDimensions();
        const cols = Math.floor(dim.width / engine.gridSize);
        const rows = Math.floor(dim.height / engine.gridSize);
        const startNode = {
            col: Math.floor(startX / engine.gridSize),
            row: Math.floor(startY / engine.gridSize),
            x: startX,
            y: startY,
            g: 0, h: 0, f: 0,
            parent: null
        };
        const targetNode = {
            col: Math.floor(targetX / engine.gridSize),
            row: Math.floor(targetY / engine.gridSize),
            x: targetX, y: targetY
        };
        const openList = [startNode];
        const closedSet = new Set();
        let iterations = 0;
        const maxIterations = 1500;

        while (openList.length > 0 && iterations < maxIterations) {
            iterations++;
            let currentIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < openList[currentIndex].f) currentIndex = i;
            }
            const current = openList.splice(currentIndex, 1)[0];
            const key = `${current.col}_${current.row}`;
            closedSet.add(key);

            if (current.col === targetNode.col && current.row === targetNode.row) {
                const rawPath = [];
                let curr = current;
                while (curr) {
                    rawPath.push({ x: curr.x, y: curr.y });
                    curr = curr.parent;
                }
                rawPath.reverse();
                return MovementPathfinding.smoothPath(engine, rawPath, elem);
            }

            const neighbors = [
                { dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
                { dc: -1, dr: -1 }, { dc: 1, dr: -1 }, { dc: -1, dr: 1 }, { dc: 1, dr: 1 }
            ];

            for (const n of neighbors) {
                const neighborCol = current.col + n.dc;
                const neighborRow = current.row + n.dr;
                if (neighborCol < 0 || neighborRow < 0 || neighborCol >= cols || neighborRow >= rows) continue;

                const neighborKey = `${neighborCol}_${neighborRow}`;
                if (closedSet.has(neighborKey)) continue;

                const nodeX = neighborCol * engine.gridSize + engine.gridSize / 2;
                const nodeY = neighborRow * engine.gridSize + engine.gridSize / 2;
                const origin = engine.pivotToOrigin(nodeX, nodeY, elem);

                if (engine.checkCollision(origin.x, origin.y, elem)) continue;

                const isDiagonal = n.dc !== 0 && n.dr !== 0;
                const distCost = isDiagonal ? 1.414 : 1.0;
                const gCost = current.g + distCost;

                let neighbor = openList.find(item => item.col === neighborCol && item.row === neighborRow);
                if (!neighbor) {
                    const hCost = Math.hypot(nodeX - targetX, nodeY - targetY) / engine.gridSize;
                    neighbor = {
                        col: neighborCol,
                        row: neighborRow,
                        x: nodeX, y: nodeY,
                        g: gCost, h: hCost, f: gCost + hCost,
                        parent: current
                    };
                    openList.push(neighbor);
                } else if (gCost < neighbor.g) {
                    neighbor.g = gCost;
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = current;
                }
            }
        }
        return null;
    }

    static smoothPath(engine, path, elem = engine.player) {
        if (!path || path.length <= 2) return path;
        const smoothed = [path[0]];
        let currentIdx = 0;

        while (currentIdx < path.length - 1) {
            let furthestIdx = currentIdx + 1;
            for (let nextIdx = currentIdx + 2; nextIdx < path.length; nextIdx++) {
                const start = path[currentIdx];
                const target = path[nextIdx];
                if (!MovementPathfinding.checkLineCollision(engine, start.x, start.y, target.x, target.y, elem)) {
                    furthestIdx = nextIdx;
                }
            }
            smoothed.push(path[furthestIdx]);
            currentIdx = furthestIdx;
        }
        return smoothed;
    }
}