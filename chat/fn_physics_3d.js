// fn_physics_3d.js
// Módulo de Controles de Cámara en Primera Persona y Físicas Voxel 3D

import { vec3Create, vec3Add, vec3Normalize, vec3Cross } from './fn_math_3d.js';

export function createFirstPersonCamera(domElement = window) {
  const camera = {
    position: vec3Create(0, 10, 0),
    yaw: 0,
    pitch: 0,
    sensitivity: 0.002
  };

  let isLocked = false;

  function onMouseMove(e) {
    if (!isLocked) return;
    camera.yaw -= e.movementX * camera.sensitivity;
    camera.pitch -= e.movementY * camera.sensitivity;
    camera.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, camera.pitch));
  }

  if (domElement.requestPointerLock) {
    domElement.addEventListener('click', () => domElement.requestPointerLock());
    document.addEventListener('pointerlockchange', () => {
      isLocked = document.pointerLockElement === domElement;
    });
  }

  window.addEventListener('mousemove', onMouseMove);

  return {
    camera,
    getForwardVector() {
      return vec3Normalize(vec3Create(), vec3Create(
        Math.sin(camera.yaw) * Math.cos(camera.pitch),
        Math.sin(camera.pitch),
        Math.cos(camera.yaw) * Math.cos(camera.pitch)
      ));
    },
    getRightVector() {
      const forward = this.getForwardVector();
      return vec3Normalize(vec3Create(), vec3Cross(vec3Create(), forward, vec3Create(0, 1, 0)));
    }
  };
}

export function applyPhysics3D(entity, dt, world, options = {}) {
  const gravity = options.gravity !== undefined ? options.gravity : -20;
  
  entity.vy = (entity.vy || 0) + gravity * dt;

  entity.x = (entity.x || 0) + (entity.vx || 0) * dt;
  entity.y = (entity.y || 0) + entity.vy * dt;
  entity.z = (entity.z || 0) + (entity.vz || 0) * dt;

  // Detección simple de suelo AABB con bloques sólidos
  const feetX = Math.floor(entity.x);
  const feetY = Math.floor(entity.y);
  const feetZ = Math.floor(entity.z);

  if (world.getBlock(feetX, feetY, feetZ) > 0) {
    entity.y = feetY + 1;
    entity.vy = 0;
    entity.isGrounded = true;
  } else {
    entity.isGrounded = false;
  }
}