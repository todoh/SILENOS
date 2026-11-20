// fn_game_core.js
// Módulo Core de Motores, Física 2D, Input Manager y Bucle de Juego para la IA

/**
 * Crea un bucle de juego con acumulador temporal y compensación de DeltaTime.
 */
export function createGameLoop({ update, render, targetFps = 60 }) {
  let lastTime = performance.now();
  let accumulator = 0;
  const step = 1 / targetFps;
  let animationFrameId = null;
  let isRunning = false;

  function loop(currentTime) {
    if (!isRunning) return;
    let deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (deltaTime > 0.25) deltaTime = 0.25;
    accumulator += deltaTime;

    while (accumulator >= step) {
      if (typeof update === 'function') update(step);
      accumulator -= step;
    }

    const alpha = accumulator / step;
    if (typeof render === 'function') render(alpha);

    animationFrameId = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      lastTime = performance.now();
      accumulator = 0;
      animationFrameId = requestAnimationFrame(loop);
    },
    stop() {
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    }
  };
}

/**
 * Máquina de Estados Finitos (FSM).
 */
export function createStateMachine(initialState = 'boot') {
  let currentState = initialState;
  const states = new Map();

  return {
    addState(name, { onEnter, onUpdate, onExit }) {
      states.set(name, { onEnter, onUpdate, onExit });
    },
    changeState(newStateName, payload = null) {
      if (!states.has(newStateName)) return;
      const current = states.get(currentState);
      if (current && typeof current.onExit === 'function') {
        current.onExit();
      }
      currentState = newStateName;
      const next = states.get(currentState);
      if (next && typeof next.onEnter === 'function') {
        next.onEnter(payload);
      }
    },
    update(dt) {
      const state = states.get(currentState);
      if (state && typeof state.onUpdate === 'function') {
        state.onUpdate(dt);
      }
    },
    getCurrentState() {
      return currentState;
    }
  };
}

/**
 * Gestor unificado de entradas (Teclado y Ratón).
 */
export function createInputManager(targetElement = window) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, isDown: false, clicked: false };

  function onKeyDown(e) {
    keys.add(e.code);
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseMove(e) {
    const rect = targetElement.getBoundingClientRect ? targetElement.getBoundingClientRect() : { left: 0, top: 0 };
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  function onMouseDown() {
    mouse.isDown = true;
    mouse.clicked = true;
  }

  function onMouseUp() {
    mouse.isDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  if (targetElement && targetElement.addEventListener) {
    targetElement.addEventListener('mousemove', onMouseMove);
    targetElement.addEventListener('mousedown', onMouseDown);
    targetElement.addEventListener('mouseup', onMouseUp);
  }

  return {
    isKeyDown(code) {
      return keys.has(code);
    },
    getMouse() {
      const state = { ...mouse };
      mouse.clicked = false;
      return state;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (targetElement && targetElement.removeEventListener) {
        targetElement.removeEventListener('mousemove', onMouseMove);
        targetElement.removeEventListener('mousedown', onMouseDown);
        targetElement.removeEventListener('mouseup', onMouseUp);
      }
    }
  };
}

/**
 * Física Euler 2D con fricción y gravedad.
 */
export function applyPhysics2D(entity, dt, options = {}) {
  const gravity = options.gravity !== undefined ? options.gravity : 980;
  const friction = options.friction !== undefined ? options.friction : 0.9;
  const maxSpeedX = options.maxSpeedX !== undefined ? options.maxSpeedX : 500;
  const maxSpeedY = options.maxSpeedY !== undefined ? options.maxSpeedY : 1200;

  if (entity.vx === undefined) entity.vx = 0;
  if (entity.vy === undefined) entity.vy = 0;
  if (entity.ax === undefined) entity.ax = 0;
  if (entity.ay === undefined) entity.ay = 0;

  entity.vx += entity.ax * dt;
  entity.vy += (entity.ay + gravity) * dt;

  entity.vx *= Math.pow(friction, dt * 60);

  if (Math.abs(entity.vx) > maxSpeedX) entity.vx = Math.sign(entity.vx) * maxSpeedX;
  if (Math.abs(entity.vy) > maxSpeedY) entity.vy = Math.sign(entity.vy) * maxSpeedY;

  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;

  entity.ax = 0;
  entity.ay = 0;
}

/**
 * Resuelve colisiones AABB entre dos rectángulos.
 */
export function resolveAABBCollision(rectA, rectB, bounce = 0) {
  const dx = (rectA.x + rectA.w / 2) - (rectB.x + rectB.w / 2);
  const dy = (rectA.y + rectA.h / 2) - (rectB.y + rectB.h / 2);
  const combinedHalfWidths = (rectA.w + rectB.w) / 2;
  const combinedHalfHeights = (rectA.h + rectB.h) / 2;

  if (Math.abs(dx) < combinedHalfWidths && Math.abs(dy) < combinedHalfHeights) {
    const overlapX = combinedHalfWidths - Math.abs(dx);
    const overlapY = combinedHalfHeights - Math.abs(dy);

    if (overlapX < overlapY) {
      if (dx > 0) {
        rectA.x += overlapX;
        if (rectA.vx < 0) rectA.vx = -rectA.vx * bounce;
      } else {
        rectA.x -= overlapX;
        if (rectA.vx > 0) rectA.vx = -rectA.vx * bounce;
      }
      return 'horizontal';
    } else {
      if (dy > 0) {
        rectA.y += overlapY;
        if (rectA.vy < 0) rectA.vy = -rectA.vy * bounce;
      } else {
        rectA.y -= overlapY;
        if (rectA.vy > 0) rectA.vy = -rectA.vy * bounce;
      }
      return 'vertical';
    }
  }
  return null;
}

export function mathLerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function mathClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}