// movement-pathfinding.js - ALGORITMOS AVANZADOS DE BÚSQUEDA DE RUTAS, A* CON MIN-HEAP Y SMOOTHING OPTIMIZADO

class MinHeap {
    constructor() {
        this.heap = [];
    }

    push(node) {
        this.heap.push(node);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = bottom;
            this._sinkDown(0);
        }
        return top;
    }

    size() {
        return this.heap.length;
    }

    _bubbleUp(index) {
        while (index > 0) {
            const parentIdx = (index - 1) >> 1;
            if (this.heap[index].f >= this.heap[parentIdx].f) break;
            const temp = this.heap[index];
            this.heap[index] = this.heap[parentIdx];
            this.heap[parentIdx] = temp;
            index = parentIdx;
        }
    }

    _sinkDown(index) {
        const length = this.heap.length;
        const node = this.heap[index];
        while (true) {
            let leftIdx = (index << 1) + 1;
            let rightIdx = (index << 1) + 2;
            let swapIdx = null;

            if (leftIdx < length) {
                if (this.heap[leftIdx].f < node.f) {
                    swapIdx = leftIdx;
                }
            }

            if (rightIdx < length) {
                if (
                    (swapIdx === null && this.heap[rightIdx].f < node.f) ||
                    (swapIdx !== null && this.heap[rightIdx].f < this.heap[leftIdx].f)
                ) {
                    swapIdx = rightIdx;
                }
            }

            if (swapIdx === null) break;
            this.heap[index] = this.heap[swapIdx];
            this.heap[swapIdx] = node;
            index = swapIdx;
        }
    }
}

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
        const dim = typeof getStageDimensions === 'function' ? getStageDimensions() : { width: 1920, height: 1080 };
        const cols = engine.sceneGridCols || Math.floor(dim.width / engine.gridSize);
        const rows = engine.sceneGridRows || Math.floor(dim.height / engine.gridSize);

        let targetCol = Math.floor(targetX / engine.gridSize);
        let targetRow = Math.floor(targetY / engine.gridSize);

        targetCol = Math.max(0, Math.min(cols - 1, targetCol));
        targetRow = Math.max(0, Math.min(rows - 1, targetRow));

        const startCol = Math.max(0, Math.min(cols - 1, Math.floor(startX / engine.gridSize)));
        const startRow = Math.max(0, Math.min(rows - 1, Math.floor(startY / engine.gridSize)));

        const startNode = {
            col: startCol,
            row: startRow,
            x: startX,
            y: startY,
            g: 0,
            h: 0,
            f: 0,
            parent: null
        };

        const openHeap = new MinHeap();
        const openMap = new Map();
        const closedSet = new Uint8Array(cols * rows);

        openHeap.push(startNode);
        openMap.set(startRow * cols + startCol, startNode);

        let bestNode = startNode;
        let minH = Math.hypot(startCol - targetCol, startRow - targetRow);

        let iterations = 0;
        const maxIterations = 25000;

        const neighbors = [
            { dc: 0, dr: -1, cost: 1.0 },
            { dc: 0, dr: 1, cost: 1.0 },
            { dc: -1, dr: 0, cost: 1.0 },
            { dc: 1, dr: 0, cost: 1.0 },
            { dc: -1, dr: -1, cost: 1.414 },
            { dc: 1, dr: -1, cost: 1.414 },
            { dc: -1, dr: 1, cost: 1.414 },
            { dc: 1, dr: 1, cost: 1.414 }
        ];

        const dx1 = startCol - targetCol;
        const dy1 = startRow - targetRow;

        while (openHeap.size() > 0 && iterations < maxIterations) {
            iterations++;
            const current = openHeap.pop();
            const currentIdx = current.row * cols + current.col;

            openMap.delete(currentIdx);

            if (closedSet[currentIdx] === 1) continue;
            closedSet[currentIdx] = 1;

            if (current.h < minH) {
                minH = current.h;
                bestNode = current;
            }

            if (current.col === targetCol && current.row === targetRow) {
                bestNode = current;
                break;
            }

            for (let i = 0; i < neighbors.length; i++) {
                const n = neighbors[i];
                const neighborCol = current.col + n.dc;
                const neighborRow = current.row + n.dr;

                if (neighborCol < 0 || neighborRow < 0 || neighborCol >= cols || neighborRow >= rows) continue;

                const neighborIdx = neighborRow * cols + neighborCol;
                if (closedSet[neighborIdx] === 1) continue;

                const nodeX = neighborCol * engine.gridSize + engine.gridSize / 2;
                const nodeY = neighborRow * engine.gridSize + engine.gridSize / 2;
                const origin = engine.pivotToOrigin(nodeX, nodeY, elem);

                if (engine.checkCollision(origin.x, origin.y, elem)) continue;

                const gCost = current.g + n.cost;

                // Heurística Octile con Tie-Breaking lineal
                const dx = Math.abs(neighborCol - targetCol);
                const dy = Math.abs(neighborRow - targetRow);
                const baseH = (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
                const cross = Math.abs(dx * dy1 - dx1 * dy);
                const hCost = baseH + cross * 0.001;

                const fCost = gCost + hCost;

                const existingNeighbor = openMap.get(neighborIdx);
                if (!existingNeighbor) {
                    const neighborNode = {
                        col: neighborCol,
                        row: neighborRow,
                        x: nodeX,
                        y: nodeY,
                        g: gCost,
                        h: baseH,
                        f: fCost,
                        parent: current
                    };
                    openHeap.push(neighborNode);
                    openMap.set(neighborIdx, neighborNode);
                } else if (gCost < existingNeighbor.g) {
                    existingNeighbor.g = gCost;
                    existingNeighbor.f = fCost;
                    existingNeighbor.parent = current;
                    openHeap.push(existingNeighbor);
                }
            }
        }

        const rawPath = [];
        let curr = bestNode;
        while (curr) {
            rawPath.push({ x: curr.x, y: curr.y });
            curr = curr.parent;
        }
        rawPath.reverse();

        if (rawPath.length <= 1) return null;

        return MovementPathfinding.smoothPath(engine, rawPath, elem);
    }

    static smoothPath(engine, path, elem = engine.player) {
        if (!path || path.length <= 2) return path;
        const smoothed = [path[0]];
        let currentIdx = 0;

        while (currentIdx < path.length - 1) {
            let furthestIdx = currentIdx + 1;
            const checkLimit = Math.min(path.length - 1, currentIdx + 20);

            for (let nextIdx = checkLimit; nextIdx > currentIdx + 1; nextIdx--) {
                const start = path[currentIdx];
                const target = path[nextIdx];
                if (!MovementPathfinding.checkLineCollision(engine, start.x, start.y, target.x, target.y, elem)) {
                    furthestIdx = nextIdx;
                    break;
                }
            }
            smoothed.push(path[furthestIdx]);
            currentIdx = furthestIdx;
        }
        return smoothed;
    }
}