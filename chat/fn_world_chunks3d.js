// fn_world_chunks3d.js
// Módulo de Gestión de Chunks Voxel 3D y Mallado Oculto (Culled Mesh Generation)

export class VoxelWorld3D {
  constructor(chunkSize = 16) {
    this.chunkSize = chunkSize;
    this.chunks = new Map();
  }

  _getChunkKey(cx, cy, cz) {
    return `${cx},${cy},${cz}`;
  }

  getBlock(x, y, z) {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = this._getChunkKey(cx, cy, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return 0;

    const lx = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const ly = ((y % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const lz = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;

    const index = lx + ly * this.chunkSize + lz * this.chunkSize * this.chunkSize;
    return chunk[index];
  }

  setBlock(x, y, z, type) {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = this._getChunkKey(cx, cy, cz);

    if (!this.chunks.has(key)) {
      if (type === 0) return;
      this.chunks.set(key, new Uint8Array(this.chunkSize * this.chunkSize * this.chunkSize));
    }

    const lx = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const ly = ((y % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const lz = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;

    const index = lx + ly * this.chunkSize + lz * this.chunkSize * this.chunkSize;
    this.chunks.get(key)[index] = type;
  }

  generateChunkGeometry(cx, cy, cz) {
    const positions = [];
    const normals = [];
    const chunkX = cx * this.chunkSize;
    const chunkY = cy * this.chunkSize;
    const chunkZ = cz * this.chunkSize;

    const faces = [
      { dir: [0, 1, 0],  corners: [[0,1,1], [1,1,1], [1,1,0], [0,1,0]] }, // Arriba
      { dir: [0, -1, 0], corners: [[0,0,0], [1,0,0], [1,0,1], [0,0,1]] }, // Abajo
      { dir: [0, 0, 1],  corners: [[0,0,1], [1,0,1], [1,1,1], [0,1,1]] }, // Frente
      { dir: [0, 0, -1], corners: [[1,0,0], [0,0,0], [0,1,0], [1,1,0]] }, // Atrás
      { dir: [1, 0, 0],  corners: [[1,0,1], [1,0,0], [1,1,0], [1,1,1]] }, // Derecha
      { dir: [-1, 0, 0], corners: [[0,0,0], [0,0,1], [0,1,1], [0,1,0]] }  // Izquierda
    ];

    for (let x = 0; x < this.chunkSize; x++) {
      for (let y = 0; y < this.chunkSize; y++) {
        for (let z = 0; z < this.chunkSize; z++) {
          const gx = chunkX + x, gy = chunkY + y, gz = chunkZ + z;
          const block = this.getBlock(gx, gy, gz);
          if (block === 0) continue;

          for (const face of faces) {
            const nx = gx + face.dir[0], ny = gy + face.dir[1], nz = gz + face.dir[2];
            if (this.getBlock(nx, ny, nz) === 0) {
              const [c0, c1, c2, c3] = face.corners;
              const quad = [
                [gx + c0[0], gy + c0[1], gz + c0[2]],
                [gx + c1[0], gy + c1[1], gz + c1[2]],
                [gx + c2[0], gy + c2[1], gz + c2[2]],
                [gx + c0[0], gy + c0[1], gz + c0[2]],
                [gx + c2[0], gy + c2[1], gz + c2[2]],
                [gx + c3[0], gy + c3[1], gz + c3[2]]
              ];

              for (const pos of quad) {
                positions.push(...pos);
                normals.push(...face.dir);
              }
            }
          }
        }
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals)
    };
  }
}