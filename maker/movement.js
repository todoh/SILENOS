// movement.js - MÓDULO OPTIMIZADO CON MÁSCARA DE COLISIÓN, RECALCULO Y MANIOBRA DE DESATASCO ALEATORIO

const collisionMasksCache = new Map();

/**
 * Obtiene o genera una máscara de opacidad en RAM (Uint8Array de 1 byte por píxel)
 * a partir de los datos visuales de la imagen base.
 */
function getOrCreateCollisionMask(asset) {
    if (!asset || !asset.dataUrl) return null;
         
    if (collisionMasksCache.has(asset)) {
        return collisionMasksCache.get(asset);
    }
    if (!asset.canvas) {
        const img = new Image();
        img.src = asset.dataUrl;
        if (!img.complete || img.naturalWidth === 0) return null;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        asset.canvas = canvas;
        asset.ctx = ctx;
    }
    const w = asset.canvas.width;
    const h = asset.canvas.height;
    try {
        const imageData = asset.ctx.getImageData(0, 0, w, h);
        const pixels = imageData.data;
        const mask = new Uint8Array(w * h);
        for (let i = 0, j = 3; i < mask.length; i++, j += 4) {
            mask[i] = pixels[j] > 10 ? 1 : 0;
        }
        const maskData = { mask, width: w, height: h };
        collisionMasksCache.set(asset, maskData);
        return maskData;
    } catch (err) {
        console.error("Error al precalcular máscara de colisión de píxeles:", err);
        return null;
    }
}

/**
 * Comprobación ultra-rápida de opacidad de píxel en RAM sin tocar la GPU ni llamar a getImageData
 */
function isPixelOpaque(elem, clickX, clickY) {
    if (!elem || elem.isPlayer) return false;
    if (elem.hasCollision || elem.collisionW !== undefined) {
        const box = typeof movementEngine !== 'undefined' 
             ? movementEngine.getColliderBox(elem) 
             : { x: elem.x, y: elem.y, w: elem.width, h: elem.height };
                     
        if (clickX >= box.x && clickX <= box.x + box.w && clickY >= box.y && clickY <= box.y + box.h) {
            return true;
        }
    }
    const rad = -elem.rotation * (Math.PI / 180);
    const centerX = elem.x + elem.width / 2;
    const centerY = elem.y + elem.height / 2;
    const dx = clickX - centerX;
    const dy = clickY - centerY;
    const localX = (dx * Math.cos(rad) - dy * Math.sin(rad)) + elem.width / 2;
    const localY = (dx * Math.sin(rad) + dy * Math.cos(rad)) + elem.height / 2;
    if (localX < 0 || localX > elem.width || localY < 0 || localY > elem.height) return false;
    if (elem.isText) return true;
    const asset = assetsMap[elem.image];
    if (!asset) return true;
    const maskData = getOrCreateCollisionMask(asset);
    if (!maskData) return true;
    const imgX = Math.floor((localX / elem.width) * maskData.width);
    const imgY = Math.floor((localY / elem.height) * maskData.height);
    if (imgX < 0 || imgX >= maskData.width || imgY < 0 || imgY >= maskData.height) return false;
    const index = imgY * maskData.width + imgX;
    return maskData.mask[index] === 1;
}

function checkPixelOpacityForEditor(elem, clickX, clickY) {
    return isPixelOpaque(elem, clickX, clickY);
}

class MovementEngine {
    constructor() {
        this.player = null;
        this.path = [];
        this.maxSpeed = 6;
        this.currentSpeed = 0;
        this.acceleration = 0.35;
        this.deceleration = 0.45;
        this.stoppingDistance = 40;
        this.gridSize = 16;
        this.isMoving = false;
        this.isMouseDown = false;
        this.animFrameId = null;
        this.lastTargetX = null;
        this.lastTargetY = null;
        this.pendingTargetEntity = null;
        this.facingAngle = 0;
        this.entityPaths = new Map();
        this.entityTimers = new Map();
        this.entityWaypointIndex = new Map();
        this.entityWaypointDirection = new Map();

        // Control de destino final y recálculo automático de ruta
        this.finalDestinationX = null;
        this.finalDestinationY = null;
        this.recalcCount = 0;
        this.maxRecalcs = 3;

        // Maniobra de desatasco con pasos aleatorios libres
        this.unstuckCount = 0;
        this.maxUnstuckAttempts = 5;
        this.isUnstuckStep = false;

        // Máscara de Colisiones de Escenario precalculada O(1)
        this.sceneCollisionGrid = null;
        this.sceneGridCols = 0;
        this.sceneGridRows = 0;

        this.setupHoldClickListeners();
    }

    init() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.resetMovementState();
        this.entityPaths.clear();
        this.entityTimers.clear();
        this.entityWaypointIndex.clear();
        this.entityWaypointDirection.clear();
        this.gridSize = 16;
        this.maxSpeed = 6;

        const scene = projectData.scenes[currentSceneId];
        if (!scene) return;
        this.player = scene.elements.find(e => e.isPlayer);
        if (this.player) {
            this.facingAngle = this.player.rotation || 0;
        }

        // Precalcular la máscara de colisión estática del escenario
        this.buildSceneCollisionMask();

        if (isPlayMode) {
            fitStage(true);
        }
        this.startLoop();
    }

    stop() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.resetMovementState();
        this.entityPaths.clear();
        this.entityTimers.clear();
        this.entityWaypointIndex.clear();
        this.entityWaypointDirection.clear();
        this.sceneCollisionGrid = null;
    }

    resetMovementState() {
        this.isMoving = false;
        this.isMouseDown = false;
        this.currentSpeed = 0;
        this.path = [];
        this.pendingTargetEntity = null;
        this.finalDestinationX = null;
        this.finalDestinationY = null;
        this.recalcCount = 0;
        this.unstuckCount = 0;
        this.isUnstuckStep = false;
    }

    /**
     * Construye la Máscara de Colisiones del Escenario en una matriz Uint8Array O(1)
     */
    buildSceneCollisionMask() {
        const dim = typeof getStageDimensions === 'function' ? getStageDimensions() : { width: 1920, height: 1080 };
        this.sceneGridCols = Math.ceil(dim.width / this.gridSize);
        this.sceneGridRows = Math.ceil(dim.height / this.gridSize);
        this.sceneCollisionGrid = new Uint8Array(this.sceneGridCols * this.sceneGridRows);

        const scene = projectData.scenes[currentSceneId];
        if (!scene || !scene.elements) return;

        scene.elements.forEach(other => {
            if (other.isPlayer || !other.hasCollision) return;
            if (isPlayMode && typeof checkCondition === 'function' && !checkCondition(other.condition)) return;

            const box = this.getColliderBox(other);
            const startCol = Math.max(0, Math.floor(box.x / this.gridSize));
            const endCol = Math.min(this.sceneGridCols - 1, Math.floor((box.x + box.w) / this.gridSize));
            const startRow = Math.max(0, Math.floor(box.y / this.gridSize));
            const endRow = Math.min(this.sceneGridRows - 1, Math.floor((box.y + box.h) / this.gridSize));

            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    this.sceneCollisionGrid[r * this.sceneGridCols + c] = 1;
                }
            }
        });
    }

    setupHoldClickListeners() {
        window.addEventListener('mousedown', (e) => {
            if (!isPlayMode || e.button !== 0 || e.shiftKey) return;
            if (e.target.closest('#game-ui') || e.target.closest('#inventory-bar') || e.target.closest('#dialog-box')) {
                return;
            }
            const stage = document.getElementById('stage');
            if (!stage || !stage.contains(e.target)) return;
            this.isMouseDown = true;
            this.processMouseTarget(e);
        });
        window.addEventListener('mousemove', (e) => {
            if (!isPlayMode || !this.isMouseDown) return;
            this.processMouseTarget(e);
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isMouseDown = false;
            }
        });
    }

    processMouseTarget(e) {
        const coords = getCanvasWorldCoordinates(e);
        const clickX = coords.clickX;
        const clickY = coords.clickY;
        if (this.lastTargetX !== null && Math.hypot(clickX - this.lastTargetX, clickY - this.lastTargetY) < 12) {
            return;
        }
        this.lastTargetX = clickX;
        this.lastTargetY = clickY;
        this.setTarget(clickX, clickY);
    }

    getPlayerPivot(overrideX = this.player?.x || 0, overrideY = this.player?.y || 0) {
        if (!this.player) return { x: 0, y: 0 };
        const box = this.getColliderBox(this.player, overrideX, overrideY);
        return {
            x: box.x + box.w / 2,
            y: box.y + box.h
        };
    }

    pivotToOrigin(pivotX, pivotY, elem = this.player) {
        if (!elem) return { x: pivotX, y: pivotY };
        const colW = elem.collisionW !== undefined ? elem.collisionW : elem.width;
        const colH = elem.collisionH !== undefined ? elem.collisionH : elem.height;
        const offX = elem.collisionX !== undefined ? elem.collisionX : Math.round((elem.width - colW) / 2);
        const offY = elem.collisionY !== undefined ? elem.collisionY : (elem.height - colH);
        return {
            x: pivotX - (colW / 2) - offX,
            y: pivotY - colH - offY
        };
    }

    getApproachPointForEntity(entity) {
        if (!this.player || !entity) return null;
        const pPivot = this.getPlayerPivot();
        const box = this.getColliderBox(entity);
        const pBox = this.getColliderBox(this.player);
        const maxDist = entity.interactionDistance || 100;
        const marginYTop = Math.min(maxDist * 0.7, 30);
        const marginYBottom = Math.min(maxDist * 0.9, pBox.h + 10);
        const marginX = Math.min(maxDist * 0.9, (pBox.w / 2) + 10);
        const candidates = [
            { x: box.x + box.w / 2, y: box.y - marginYTop },
            { x: box.x + box.w / 2, y: box.y + box.h + marginYBottom },
            { x: box.x - marginX, y: box.y + box.h / 2 },
            { x: box.x + box.w + marginX, y: box.y + box.h / 2 },
            { x: box.x - marginX, y: box.y - marginYTop },
            { x: box.x + box.w + marginX, y: box.y - marginYTop },
            { x: box.x - marginX, y: box.y + box.h + marginYBottom },
            { x: box.x + box.w + marginX, y: box.y + box.h + marginYBottom }
        ];
        const validCandidates = candidates.filter(pt => {
            const origin = this.pivotToOrigin(pt.x, pt.y, this.player);
            return !this.checkCollisionIgnoringEntity(origin.x, origin.y, this.player, entity.id);
        });
        if (validCandidates.length === 0) {
            const closestX = Math.max(box.x, Math.min(pPivot.x, box.x + box.w));
            const closestY = Math.max(box.y, Math.min(pPivot.y, box.y + box.h));
            return { x: closestX, y: closestY };
        }
        validCandidates.sort((a, b) => {
            const distA = Math.hypot(pPivot.x - a.x, pPivot.y - a.y);
            const distB = Math.hypot(pPivot.x - b.x, pPivot.y - b.y);
            return distA - distB;
        });
        return validCandidates[0];
    }

    setTargetWithCallback(targetX, targetY, entity) {
        this.pendingTargetEntity = entity;
        const approachPoint = this.getApproachPointForEntity(entity);
        if (approachPoint) {
            this.setTarget(approachPoint.x, approachPoint.y);
        } else {
            this.setTarget(targetX, targetY);
        }
    }

    /**
     * Da un pequeño paso aleatorio en una dirección libre para desatascar al personaje
     */
    tryUnstuckManeuver() {
        if (!this.player || this.unstuckCount >= this.maxUnstuckAttempts) {
            this.resetMovementState();
            return false;
        }

        const distance = this.gridSize * (1.5 + Math.random() * 1.5);
        const attempts = 16;
        
        for (let i = 0; i < attempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const testX = this.player.x + Math.cos(angle) * distance;
            const testY = this.player.y + Math.sin(angle) * distance;

            if (!this.checkCollision(testX, testY, this.player)) {
                this.unstuckCount++;
                this.recalcCount = 0;
                this.isUnstuckStep = true;
                this.path = [{ x: testX, y: testY }];
                this.isMoving = true;
                return true;
            }
        }

        this.resetMovementState();
        return false;
    }

    setTarget(targetX, targetY, isRecalculation = false) {
        if (!this.player) return;

        if (!isRecalculation) {
            this.finalDestinationX = targetX;
            this.finalDestinationY = targetY;
            this.recalcCount = 0;
            this.unstuckCount = 0;
            this.isUnstuckStep = false;
        }

        const startPivot = this.getPlayerPivot();
        if (!MovementPathfinding.checkLineCollision(this, startPivot.x, startPivot.y, targetX, targetY, this.player)) {
            const destOrigin = this.pivotToOrigin(targetX, targetY, this.player);
            this.path = [{ x: destOrigin.x, y: destOrigin.y }];
            this.isMoving = true;
            return;
        }

        const computedPath = MovementPathfinding.findPathAStar(this, startPivot.x, startPivot.y, targetX, targetY, this.player);
        if (computedPath && computedPath.length > 0) {
            this.path = computedPath.map(p => this.pivotToOrigin(p.x, p.y, this.player));
            this.isMoving = true;
        } else {
            if (this.finalDestinationX !== null && this.finalDestinationY !== null && this.unstuckCount < this.maxUnstuckAttempts) {
                this.tryUnstuckManeuver();
            } else {
                this.resetMovementState();
            }
        }
    }

    startLoop() {
        const update = () => {
            if (isPlayMode) {
                if (this.player) {
                    if (this.isMoving || this.currentSpeed > 0.05) {
                        this.updatePosition();
                    } else {
                        this.syncElementDOM(this.player, false);
                    }
                    if (typeof fitStage === 'function') {
                        fitStage();
                    }
                    this.checkProximityTriggers();
                    this.checkPassiveTriggers();
                } else {
                    if (typeof fitStage === 'function') {
                        fitStage();
                    }
                }
                if (typeof MovementEntities !== 'undefined') {
                    MovementEntities.updateEntitiesMovement(this);
                }
            }
            this.animFrameId = requestAnimationFrame(update);
        };
        this.animFrameId = requestAnimationFrame(update);
    }

    updatePosition() {
        if (!this.path || this.path.length === 0) {
            this.currentSpeed = Math.max(0, this.currentSpeed - this.deceleration);
            if (this.currentSpeed <= 0.05) {
                this.currentSpeed = 0;
                this.isMoving = false;

                if (this.isUnstuckStep) {
                    this.isUnstuckStep = false;
                    if (this.finalDestinationX !== null && this.finalDestinationY !== null) {
                        this.setTarget(this.finalDestinationX, this.finalDestinationY, true);
                        return;
                    }
                }

                this.resetMovementState();
            }
            this.syncElementDOM(this.player, this.isMoving);
            return;
        }

        const target = this.path[0];
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const totalDistance = Math.hypot(dx, dy);

        if (totalDistance > 0.1) {
            const rad = Math.atan2(dy, dx);
            this.facingAngle = rad * (180 / Math.PI);
            if (this.player) {
                this.player.rotation = Math.round(this.facingAngle);
            }
        }

        let desiredSpeed = this.maxSpeed;
        if (this.path.length === 1 && totalDistance < this.stoppingDistance) {
            desiredSpeed = this.maxSpeed * (totalDistance / this.stoppingDistance);
        }

        if (this.currentSpeed < desiredSpeed) {
            this.currentSpeed = Math.min(desiredSpeed, this.currentSpeed + this.acceleration);
        } else {
            this.currentSpeed = Math.max(desiredSpeed, this.currentSpeed - this.deceleration);
        }

        if (totalDistance <= Math.max(1, this.currentSpeed)) {
            this.player.x = target.x;
            this.player.y = target.y;
            this.path.shift();
            if (this.path.length === 0) {
                this.isMoving = false;

                if (this.isUnstuckStep) {
                    this.isUnstuckStep = false;
                    if (this.finalDestinationX !== null && this.finalDestinationY !== null) {
                        this.setTarget(this.finalDestinationX, this.finalDestinationY, true);
                        return;
                    }
                }

                this.resetMovementState();
            }
        } else {
            const vx = (dx / totalDistance) * this.currentSpeed;
            const vy = (dy / totalDistance) * this.currentSpeed;
            let nextX = this.player.x + vx;
            let nextY = this.player.y + vy;

            if (!this.checkCollision(nextX, nextY, this.player)) {
                this.player.x = nextX;
                this.player.y = nextY;
            } else {
                if (this.finalDestinationX !== null && this.finalDestinationY !== null) {
                    if (this.recalcCount < this.maxRecalcs) {
                        this.recalcCount++;
                        this.currentSpeed = 0;
                        this.path = [];
                        this.setTarget(this.finalDestinationX, this.finalDestinationY, true);
                    } else if (this.unstuckCount < this.maxUnstuckAttempts) {
                        this.tryUnstuckManeuver();
                    } else {
                        this.resetMovementState();
                    }
                } else {
                    this.resetMovementState();
                }
            }
        }
        this.syncElementDOM(this.player, this.isMoving);
    }

    getColliderBox(elem, overrideX = elem.x, overrideY = elem.y) {
        const w = elem.collisionW !== undefined ? elem.collisionW : elem.width;
        const h = elem.collisionH !== undefined ? elem.collisionH : elem.height;
        const offX = elem.collisionX !== undefined ? elem.collisionX : Math.round((elem.width - w) / 2);
        const offY = elem.collisionY !== undefined ? elem.collisionY : (elem.height - h);
        return {
            x: overrideX + offX,
            y: overrideY + offY,
            w: w,
            h: h
        };
    }

    /**
     * Comprobación O(1) mediante Máscara de Colisión de Escenario
     */
    checkCollision(newX, newY, elem = this.player) {
        return this.checkCollisionIgnoringEntity(newX, newY, elem, null);
    }

    checkCollisionIgnoringEntity(newX, newY, elem = this.player, ignoreEntityId = null) {
        const scene = projectData.scenes[currentSceneId];
        if (!scene || !elem) return false;
        const box = this.getColliderBox(elem, newX, newY);
        const dim = typeof getStageDimensions === 'function' ? getStageDimensions() : { width: 1920, height: 1080 };

        if (box.x < 0 || box.y < 0 || (box.x + box.w) > dim.width || (box.y + box.h) > dim.height) {
            return true;
        }

        if (this.sceneCollisionGrid && this.sceneGridCols > 0) {
            const startCol = Math.max(0, Math.floor(box.x / this.gridSize));
            const endCol = Math.min(this.sceneGridCols - 1, Math.floor((box.x + box.w) / this.gridSize));
            const startRow = Math.max(0, Math.floor(box.y / this.gridSize));
            const endRow = Math.min(this.sceneGridRows - 1, Math.floor((box.y + box.h) / this.gridSize));

            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    if (this.sceneCollisionGrid[r * this.sceneGridCols + c] === 1) {
                        if (ignoreEntityId) {
                            return scene.elements.some(other => {
                                if (other.id === elem.id || other.id === ignoreEntityId) return false;
                                if (!other.hasCollision) return false;
                                if (isPlayMode && typeof checkCondition === 'function' && !checkCondition(other.condition)) return false;
                                const otherBox = this.getColliderBox(other);
                                return (
                                    box.x < otherBox.x + otherBox.w &&
                                    box.x + box.w > otherBox.x &&
                                    box.y < otherBox.y + otherBox.h &&
                                    box.y + box.h > otherBox.y
                                );
                            });
                        }
                        return true;
                    }
                }
            }
            return false;
        }

        return scene.elements.some(other => {
            if (other.id === elem.id || other.id === ignoreEntityId) return false;
            if (!other.hasCollision) return false;
            if (isPlayMode && typeof checkCondition === 'function' && !checkCondition(other.condition)) return false;
            const otherBox = this.getColliderBox(other);
            return (
                box.x < otherBox.x + otherBox.w &&
                box.x + box.w > otherBox.x &&
                box.y < otherBox.y + otherBox.h &&
                box.y + box.h > otherBox.y
            );
        });
    }

    checkProximityTriggers() {
        if (!this.pendingTargetEntity || !this.player) return;
        const pPivot = this.getPlayerPivot();
        const entity = this.pendingTargetEntity;
        const box = this.getColliderBox(entity);
        const pBox = this.getColliderBox(this.player);
        const closestX = Math.max(box.x, Math.min(pPivot.x, box.x + box.w));
        const closestY = Math.max(box.y, Math.min(pPivot.y, box.y + box.h));
        const dist = Math.hypot(pPivot.x - closestX, pPivot.y - closestY);
        const baseDistance = entity.interactionDistance || 100;
        const effectiveDistance = Math.max(baseDistance, pBox.h + 15, (pBox.w / 2) + 15);
        if (dist <= effectiveDistance) {
            const elemToTrigger = this.pendingTargetEntity;
            this.resetMovementState();
            handleEntityInteraction(elemToTrigger);
        }
    }

    checkPassiveTriggers() {
        const scene = projectData.scenes[currentSceneId];
        if (!scene || !this.player) return;
        const pPivot = this.getPlayerPivot();
        const pBox = this.getColliderBox(this.player);
        scene.elements.forEach(elem => {
            if (elem.type === 'entidad' && elem.triggerType === 'passive' && checkCondition(elem.condition)) {
                const box = this.getColliderBox(elem);
                const closestX = Math.max(box.x, Math.min(pPivot.x, box.x + box.w));
                const closestY = Math.max(box.y, Math.min(pPivot.y, box.y + box.h));
                const dist = Math.hypot(pPivot.x - closestX, pPivot.y - closestY);
                const baseDistance = elem.interactionDistance || 100;
                const effectiveDistance = Math.max(baseDistance, pBox.h + 15, (pBox.w / 2) + 15);
                if (dist <= effectiveDistance) {
                    if (!elem._passiveTriggered) {
                        elem._passiveTriggered = true;
                        handleEntityInteraction(elem);
                    }
                } else {
                    elem._passiveTriggered = false;
                }
            }
        });
    }

    syncElementDOM(elem, isMoving = false) {
        if (!elem) return;
        const el = document.getElementById(`stage-el-${elem.id}`);
        if (!el) return;
        const leftStr = elem.x + 'px';
        if (el.style.left !== leftStr) el.style.left = leftStr;
        const topStr = elem.y + 'px';
        if (el.style.top !== topStr) el.style.top = topStr;
        const bottomY = Math.round(elem.y + elem.height);
        const zIndexStr = String(100 + bottomY);
        if (el.style.zIndex !== zIndexStr) el.style.zIndex = zIndexStr;

        const angle = (elem.isPlayer && this.facingAngle !== undefined) 
             ? this.facingAngle 
             : (elem.rotation || 0);
        const yaw = (typeof cameraState !== 'undefined' && cameraState.rotation !== undefined) ? cameraState.rotation : 0;
        const is3DView = (typeof isIsometricView !== 'undefined' && isIsometricView) || 
                          (typeof cameraState !== 'undefined' && ((cameraState.pitch !== undefined && cameraState.pitch !== 0) || (cameraState.rotation !== undefined && cameraState.rotation !== 0)));
        let transformStr = '';

        if (is3DView) {
            const mode = elem.billboardMode || 'camera';
            if (elem.type === 'fondo' || mode === 'flat' || mode === 'plano' || mode === 'suelo') {
                if (el.classList.contains('mode7-billboard')) el.classList.remove('mode7-billboard');
                if (!el.classList.contains('mode7-ground')) el.classList.add('mode7-ground');
                transformStr = `rotate(${angle}deg)`;
            } else if (mode === 'camera') {
                if (!el.classList.contains('mode7-billboard')) el.classList.add('mode7-billboard');
                if (el.style.transformStyle !== 'preserve-3d') el.style.transformStyle = 'preserve-3d';

                const normalizedAngle = ((angle % 360) + 360) % 360;
                const relAngle = ((normalizedAngle - yaw) % 360 + 360) % 360;
                const isFacingLeft = (relAngle > 90 && relAngle < 270);
                const scaleX = isFacingLeft ? -1 : 1;
                transformStr = `rotateZ(${-yaw}deg) rotateX(-90deg) scaleX(${scaleX})`;
            } else if (mode === 'cross_x') {
                if (!el.classList.contains('mode7-billboard')) el.classList.add('mode7-billboard');
                if (el.style.transformStyle !== 'preserve-3d') el.style.transformStyle = 'preserve-3d';
                transformStr = `rotateZ(${angle - 90}deg) rotateX(-90deg)`;
            } else if (mode === 'muro' || mode === 'wall') {
                if (el.classList.contains('mode7-billboard')) el.classList.remove('mode7-billboard');
                transformStr = `rotate(${angle}deg)`;
            } else {
                if (!el.classList.contains('mode7-billboard')) el.classList.add('mode7-billboard');
                if (el.style.transformStyle !== 'preserve-3d') el.style.transformStyle = 'preserve-3d';
                transformStr = `rotateZ(${angle - 90}deg) rotateX(-90deg)`;
            }
        } else {
            transformStr = `rotate(${angle}deg)`;
        }

        if (el.style.transform !== transformStr) el.style.transform = transformStr;
        if (elem.isPlayer) {
            if (isMoving) {
                if (el.classList.contains('breathing-idle')) el.classList.remove('breathing-idle');
                if (!el.classList.contains('south-park-walk')) el.classList.add('south-park-walk');
            } else {
                if (el.classList.contains('south-park-walk')) el.classList.remove('south-park-walk');
                if (typeof isPlayMode !== 'undefined' && isPlayMode) {
                    if (!el.classList.contains('breathing-idle')) el.classList.add('breathing-idle');
                } else {
                    if (el.classList.contains('breathing-idle')) el.classList.remove('breathing-idle');
                }
            }
        } else {
            if (el.classList.contains('south-park-walk')) el.classList.remove('south-park-walk');
            if (el.classList.contains('breathing-idle')) el.classList.remove('breathing-idle');
        }
    }
}

const movementEngine = new MovementEngine();