// fn_math_3d.js
// Módulo de Álgebra Lineal, Vectores y Matrices 3D

export function vec3Create(x = 0, y = 0, z = 0) {
  return new Float32Array([x, y, z]);
}

export function vec3Add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}

export function vec3Sub(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}

export function vec3Normalize(out, a) {
  const len = Math.hypot(a[0], a[1], a[2]);
  if (len > 0) {
    out[0] = a[0] / len;
    out[1] = a[1] / len;
    out[2] = a[2] / len;
  }
  return out;
}

export function vec3Cross(out, a, b) {
  const ax = a[0], ay = a[1], az = a[2];
  const bx = b[0], by = b[1], bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

export function mat4Create() {
  const out = new Float32Array(16);
  out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
  return out;
}

export function mat4Perspective(out, fovInRad, aspect, near, far) {
  const f = 1.0 / Math.tan(fovInRad / 2);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function mat4LookAt(out, eye, center, up) {
  const z = vec3Normalize(vec3Create(), vec3Sub(vec3Create(), eye, center));
  const x = vec3Normalize(vec3Create(), vec3Cross(vec3Create(), up, z));
  const y = vec3Normalize(vec3Create(), vec3Cross(vec3Create(), z, x));

  out[0] = x[0]; out[4] = x[1]; out[8] = x[2]; out[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  out[1] = y[0]; out[5] = y[1]; out[9] = y[2]; out[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  out[2] = z[0]; out[6] = z[1]; out[10] = z[2]; out[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
  out[3] = 0;    out[7] = 0;    out[11] = 0;   out[15] = 1;
  return out;
}

export function raycastVoxel(origin, direction, maxDist, world) {
  let x = Math.floor(origin[0]);
  let y = Math.floor(origin[1]);
  let z = Math.floor(origin[2]);

  const dx = direction[0], dy = direction[1], dz = direction[2];
  const stepX = Math.sign(dx), stepY = Math.sign(dy), stepZ = Math.sign(dz);

  const tDeltaX = Math.abs(1 / dx), tDeltaY = Math.abs(1 / dy), tDeltaZ = Math.abs(1 / dz);
  let tMaxX = (stepX > 0 ? (x + 1 - origin[0]) : (origin[0] - x)) * tDeltaX;
  let tMaxY = (stepY > 0 ? (y + 1 - origin[1]) : (origin[1] - y)) * tDeltaY;
  let tMaxZ = (stepZ > 0 ? (z + 1 - origin[2]) : (origin[2] - z)) * tDeltaZ;

  let dist = 0;
  let faceNormal = vec3Create(0, 0, 0);

  while (dist <= maxDist) {
    const block = world.getBlock(x, y, z);
    if (block > 0) {
      return { hit: true, x, y, z, block, normal: faceNormal, distance: dist };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX; dist = tMaxX; tMaxX += tDeltaX; faceNormal = vec3Create(-stepX, 0, 0);
      } else {
        z += stepZ; dist = tMaxZ; tMaxZ += tDeltaZ; faceNormal = vec3Create(0, 0, -stepZ);
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY; dist = tMaxY; tMaxY += tDeltaY; faceNormal = vec3Create(0, -stepY, 0);
      } else {
        z += stepZ; dist = tMaxZ; tMaxZ += tDeltaZ; faceNormal = vec3Create(0, 0, -stepZ);
      }
    }
  }

  return { hit: false };
}