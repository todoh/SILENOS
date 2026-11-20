// fn_world_chunks.js
// Módulo de Gestión de Chunks y Streaming Infinito para Mundo Abierto

export class ChunkManager {
  constructor(chunkSize = 16, tileSize = 32, renderDistance = 2) {
    this.chunkSize = chunkSize; // Unidades por chunk (16x16 tiles)
    this.tileSize = tileSize;   // Tamaño en píxeles de cada tile
    this.chunkPixelSize = chunkSize * tileSize;
    this.renderDistance = renderDistance; // Radio de chunks alrededor de la cámara
    this.loadedChunks = new Map();
  }

  getChunkCoords(worldX, worldY) {
    const chunkX = Math.floor(worldX / this.chunkPixelSize);
    const chunkY = Math.floor(worldY / this.chunkPixelSize);
    return { chunkX, chunkY };
  }

  update(cameraX, cameraY, generatorFn) {
    const { chunkX: centerCX, chunkY: centerCY } = this.getChunkCoords(cameraX, cameraY);
    const activeKeys = new Set();

    for (let cx = centerCX - this.renderDistance; cx <= centerCX + this.renderDistance; cx++) {
      for (let cy = centerCY - this.renderDistance; cy <= centerCY + this.renderDistance; cy++) {
        const key = `${cx},${cy}`;
        activeKeys.add(key);

        if (!this.loadedChunks.has(key)) {
          const newChunkData = generatorFn(cx, cy, this.chunkSize);
          this.loadedChunks.set(key, {
            cx,
            cy,
            worldX: cx * this.chunkPixelSize,
            worldY: cy * this.chunkPixelSize,
            data: newChunkData
          });
        }
      }
    }

    // Descarga de chunks fuera de rango para liberar memoria
    for (const [key, chunk] of this.loadedChunks.entries()) {
      if (!activeKeys.has(key)) {
        this.loadedChunks.delete(key);
      }
    }
  }

  getActiveChunks() {
    return Array.from(this.loadedChunks.values());
  }
}