 // fn_spatial.js
// Módulo de Particionado Espacial, Spatial Hash Grid y Culling 2D

export class SpatialHashGrid {
  constructor(bounds, cellSize = 128) {
    this.bounds = bounds;
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _getKey(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return `${col},${row}`;
  }

  clear() {
    this.cells.clear();
  }

  insert(entity) {
    const startCol = Math.floor(entity.x / this.cellSize);
    const endCol = Math.floor((entity.x + entity.w) / this.cellSize);
    const startRow = Math.floor(entity.y / this.cellSize);
    const endRow = Math.floor((entity.y + entity.h) / this.cellSize);

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        const key = `${c},${r}`;
        if (!this.cells.has(key)) {
          this.cells.set(key, []);
        }
        this.cells.get(key).push(entity);
      }
    }
  }

  getNearby(entity) {
    const nearby = new Set();
    const startCol = Math.floor(entity.x / this.cellSize);
    const endCol = Math.floor((entity.x + entity.w) / this.cellSize);
    const startRow = Math.floor(entity.y / this.cellSize);
    const endRow = Math.floor((entity.y + entity.h) / this.cellSize);

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        const key = `${c},${r}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            if (cell[i] !== entity) {
              nearby.add(cell[i]);
            }
          }
        }
      }
    }
    return Array.from(nearby);
  }
}

export function isAABBIntersecting(rectA, rectB) {
  return (
    rectA.x < rectB.x + rectB.w &&
    rectA.x + rectA.w > rectB.x &&
    rectA.y < rectB.y + rectB.h &&
    rectA.y + rectA.h > rectB.y
  );
}

export function getVisibleViewportBounds(camera, canvasWidth, canvasHeight, bufferMargin = 64) {
  return {
    x: camera.x - bufferMargin,
    y: camera.y - bufferMargin,
    w: canvasWidth / camera.zoom + bufferMargin * 2,
    h: canvasHeight / camera.zoom + bufferMargin * 2
  };
}