// movement.js - MOTOR DE MOVIMIENTO CON ACELERACIÓN, DECELERACIÓN Y COMPROBACIÓN OMNIDIRECCIONAL
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
        this.entityPaths = new Map();
        this.entityTimers = new Map();
        this.entityWaypointIndex = new Map();
        this.entityWaypointDirection = new Map();
        this.setupHoldClickListeners();
    }

    init() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.isMoving = false;
        this.isMouseDown = false;
        this.currentSpeed = 0;
        this.path = [];
        this.pendingTargetEntity = null;
        this.entityPaths.clear();
        this.entityTimers.clear();
        this.entityWaypointIndex.clear();
        this.entityWaypointDirection.clear();

        const dim = getStageDimensions();
        this.gridSize = getGridSizeForDimensions(dim.width, dim.height);
        this.maxSpeed = Math.max(5, Math.round(this.gridSize / 3));

        const scene = projectData.scenes[currentSceneId];
        if (!scene) return;
        this.player = scene.elements.find(e => e.isPlayer);
        this.startLoop();
    }

    stop() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.isMoving = false;
        this.isMouseDown = false;
        this.currentSpeed = 0;
        this.path = [];
        this.pendingTargetEntity = null;
        this.entityPaths.clear();
        this.entityTimers.clear();
        this.entityWaypointIndex.clear();
        this.entityWaypointDirection.clear();
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
        const stage = document.getElementById('stage');
        if (!stage) return;
        const stageRect = stage.getBoundingClientRect();
        const dim = getStageDimensions();
        const scaleX = dim.width / stageRect.width;
        const scaleY = dim.height / stageRect.height;
        const clickX = (e.clientX - stageRect.left) * scaleX;
        const clickY = (e.clientY - stageRect.top) * scaleY;

        if (this.lastTargetX !== null && Math.hypot(clickX - this.lastTargetX, clickY - this.lastTargetY) < 8) {
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

        // Holguras ajustadas al tamaño del colisionador del jugador para prevenir colisiones en cualquier ángulo
        const marginYTop = Math.min(maxDist * 0.7, 30);
        const marginYBottom = Math.min(maxDist * 0.9, pBox.h + 10);
        const marginX = Math.min(maxDist * 0.9, (pBox.w / 2) + 10);

        const candidates = [
            { x: box.x + box.w / 2, y: box.y - marginYTop },                      // Arriba
            { x: box.x + box.w / 2, y: box.y + box.h + marginYBottom },           // Abajo
            { x: box.x - marginX, y: box.y + box.h / 2 },                         // Izquierda
            { x: box.x + box.w + marginX, y: box.y + box.h / 2 },                 // Derecha
            { x: box.x - marginX, y: box.y - marginYTop },                        // Arriba-Izquierda
            { x: box.x + box.w + marginX, y: box.y - marginYTop },                // Arriba-Derecha
            { x: box.x - marginX, y: box.y + box.h + marginYBottom },             // Abajo-Izquierda
            { x: box.x + box.w + marginX, y: box.y + box.h + marginYBottom }      // Abajo-Derecha
        ];

        // Validar ignorando la colisión del propio objeto objetivo al buscar la ruta de llegada
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

    setTarget(targetX, targetY) {
        if (!this.player) return;
        const startPivot = this.getPlayerPivot();
        if (!this.checkLineCollision(startPivot.x, startPivot.y, targetX, targetY, this.player)) {
            const destOrigin = this.pivotToOrigin(targetX, targetY, this.player);
            this.path = [{ x: destOrigin.x, y: destOrigin.y }];
            this.isMoving = true;
            return;
        }
        const computedPath = this.findPathAStar(startPivot.x, startPivot.y, targetX, targetY, this.player);
        if (computedPath && computedPath.length > 0) {
            this.path = computedPath.map(p => this.pivotToOrigin(p.x, p.y, this.player));
            this.isMoving = true;
        }
    }

    startLoop() {
        const update = () => {
            if (isPlayMode) {
                if (this.player) {
                    if (this.isMoving || this.currentSpeed > 0.05) {
                        this.updatePosition();
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
                this.updateEntitiesMovement();
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
            }
            return;
        }
        const target = this.path[0];
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const totalDistance = Math.hypot(dx, dy);

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
                this.path = [];
                this.isMoving = false;
                this.currentSpeed = 0;
            }
        }
        this.syncElementDOM(this.player);
    }

    updateEntitiesMovement() {
        const scene = projectData.scenes[currentSceneId];
        if (!scene) return;
        const now = Date.now();
        const entitySpeed = Math.max(1, Math.round(this.maxSpeed * 0.5));
        scene.elements.forEach(elem => {
            if (elem.isPlayer || elem.type !== 'entidad' || !checkCondition(elem.condition)) {
                return;
            }
            if (elem.movePattern === 'random') {
                this.handleRandomWander(elem, entitySpeed, now);
            } else if (elem.movePattern === 'waypoints') {
                this.handleWaypointsPatrol(elem, entitySpeed);
            }
        });
    }

    handleRandomWander(elem, entitySpeed, now) {
        let ePath = this.entityPaths.get(elem.id) || [];
        let nextTime = this.entityTimers.get(elem.id) || 0;
        if (ePath.length === 0 && now >= nextTime) {
            const radius = elem.wanderRadius || 150;
            const originX = elem.originX !== undefined ? elem.originX : elem.x;
            const originY = elem.originY !== undefined ? elem.originY : elem.y;
            if (elem.originX === undefined) { elem.originX = elem.x; elem.originY = elem.y; }
            const randAngle = Math.random() * Math.PI * 2;
            const randDist = Math.random() * radius;
            const targetX = Math.max(0, originX + Math.cos(randAngle) * randDist);
            const targetY = Math.max(0, originY + Math.sin(randAngle) * randDist);

            const colW = elem.collisionW !== undefined ? elem.collisionW : elem.width;
            const colH = elem.collisionH !== undefined ? elem.collisionH : elem.height;
            const offX = elem.collisionX !== undefined ? elem.collisionX : Math.round((elem.width - colW) / 2);
            const offY = elem.collisionY !== undefined ? elem.collisionY : (elem.height - colH);

            const startPivotX = elem.x + offX + colW / 2;
            const startPivotY = elem.y + offY + colH;

            if (!this.checkLineCollision(startPivotX, startPivotY, targetX, targetY, elem)) {
                const destOrigin = this.pivotToOrigin(targetX, targetY, elem);
                ePath = [{ x: destOrigin.x, y: destOrigin.y }];
            } else {
                const computed = this.findPathAStar(startPivotX, startPivotY, targetX, targetY, elem);
                if (computed) {
                    ePath = computed.map(p => this.pivotToOrigin(p.x, p.y, elem));
                }
            }
            if (ePath && ePath.length > 0) {
                this.entityPaths.set(elem.id, ePath);
            } else {
                this.entityTimers.set(elem.id, now + 1000 + Math.random() * 2000);
            }
        } else if (ePath.length > 0) {
            this.moveEntityAlongPath(elem, ePath, entitySpeed, () => {
                this.entityPaths.delete(elem.id);
                this.entityTimers.set(elem.id, now + 1500 + Math.random() * 3000);
            });
        }
    }

    handleWaypointsPatrol(elem, entitySpeed) {
        if (!elem.waypoints || elem.waypoints.length === 0) return;
        let ePath = this.entityPaths.get(elem.id) || [];
        let currentIndex = this.entityWaypointIndex.get(elem.id) ?? 0;
        let direction = this.entityWaypointDirection.get(elem.id) ?? 1;

        if (ePath.length === 0) {
            const targetWp = elem.waypoints[currentIndex];
            if (!targetWp) return;
            const colW = elem.collisionW !== undefined ? elem.collisionW : elem.width;
            const colH = elem.collisionH !== undefined ? elem.collisionH : elem.height;
            const offX = elem.collisionX !== undefined ? elem.collisionX : Math.round((elem.width - colW) / 2);
            const offY = elem.collisionY !== undefined ? elem.collisionY : (elem.height - colH);

            const startPivotX = elem.x + offX + colW / 2;
            const startPivotY = elem.y + offY + colH;

            if (!this.checkLineCollision(startPivotX, startPivotY, targetWp.x, targetWp.y, elem)) {
                const destOrigin = this.pivotToOrigin(targetWp.x, targetWp.y, elem);
                ePath = [{ x: destOrigin.x, y: destOrigin.y }];
            } else {
                const computed = this.findPathAStar(startPivotX, startPivotY, targetWp.x, targetWp.y, elem);
                if (computed) {
                    ePath = computed.map(p => this.pivotToOrigin(p.x, p.y, elem));
                }
            }
            if (ePath && ePath.length > 0) {
                this.entityPaths.set(elem.id, ePath);
            }
        } else {
            this.moveEntityAlongPath(elem, ePath, entitySpeed, () => {
                this.entityPaths.delete(elem.id);
                const totalWps = elem.waypoints.length;
                const loopType = elem.waypointLoop || 'loop';
                if (loopType === 'loop') {
                    currentIndex = (currentIndex + 1) % totalWps;
                } else if (loopType === 'pingpong') {
                    if (direction === 1 && currentIndex >= totalWps - 1) {
                        direction = -1;
                    } else if (direction === -1 && currentIndex <= 0) {
                        direction = 1;
                    }
                    currentIndex += direction;
                } else if (loopType === 'once') {
                    if (currentIndex < totalWps - 1) {
                        currentIndex++;
                    }
                }
                this.entityWaypointIndex.set(elem.id, currentIndex);
                this.entityWaypointDirection.set(elem.id, direction);
            });
        }
    }

    moveEntityAlongPath(elem, ePath, speed, onTargetReached) {
        const target = ePath[0];
        const dx = target.x - elem.x;
        const dy = target.y - elem.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= speed) {
            elem.x = target.x;
            elem.y = target.y;
            ePath.shift();
            if (ePath.length === 0) {
                if (onTargetReached) onTargetReached();
            }
        } else {
            const vx = (dx / distance) * speed;
            const vy = (dy / distance) * speed;
            let nextX = elem.x + vx;
            let nextY = elem.y + vy;
            if (!this.checkCollision(nextX, nextY, elem)) {
                elem.x = nextX;
                elem.y = nextY;
            } else {
                this.entityPaths.delete(elem.id);
            }
        }
        this.syncElementDOM(elem);
    }

    checkLineCollision(x1, y1, x2, y2, elem = this.player) {
        const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (this.gridSize / 2));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            const origin = this.pivotToOrigin(px, py, elem);
            if (this.checkCollision(origin.x, origin.y, elem)) {
                return true;
            }
        }
        return false;
    }

    findPathAStar(startX, startY, targetX, targetY, elem = this.player) {
        const dim = getStageDimensions();
        const cols = Math.floor(dim.width / this.gridSize);
        const rows = Math.floor(dim.height / this.gridSize);

        const startNode = {
            col: Math.floor(startX / this.gridSize),
            row: Math.floor(startY / this.gridSize),
            x: startX,
            y: startY,
            g: 0, h: 0, f: 0,
            parent: null
        };
        const targetNode = {
            col: Math.floor(targetX / this.gridSize),
            row: Math.floor(targetY / this.gridSize),
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
                return this.smoothPath(rawPath, elem);
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

                const nodeX = neighborCol * this.gridSize + this.gridSize / 2;
                const nodeY = neighborRow * this.gridSize + this.gridSize / 2;
                const origin = this.pivotToOrigin(nodeX, nodeY, elem);

                if (this.checkCollision(origin.x, origin.y, elem)) continue;

                const isDiagonal = n.dc !== 0 && n.dr !== 0;
                const distCost = isDiagonal ? 1.414 : 1.0;
                const gCost = current.g + distCost;

                let neighbor = openList.find(item => item.col === neighborCol && item.row === neighborRow);
                if (!neighbor) {
                    const hCost = Math.hypot(nodeX - targetX, nodeY - targetY) / this.gridSize;
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

    smoothPath(path, elem = this.player) {
        if (!path || path.length <= 2) return path;
        const smoothed = [path[0]];
        let currentIdx = 0;
        while (currentIdx < path.length - 1) {
            let furthestIdx = currentIdx + 1;
            for (let nextIdx = currentIdx + 2; nextIdx < path.length; nextIdx++) {
                const start = path[currentIdx];
                const target = path[nextIdx];
                if (!this.checkLineCollision(start.x, start.y, target.x, target.y, elem)) {
                    furthestIdx = nextIdx;
                }
            }
            smoothed.push(path[furthestIdx]);
            currentIdx = furthestIdx;
        }
        return smoothed;
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

    checkCollision(newX, newY, elem = this.player) {
        return this.checkCollisionIgnoringEntity(newX, newY, elem, null);
    }

    checkCollisionIgnoringEntity(newX, newY, elem = this.player, ignoreEntityId = null) {
        const scene = projectData.scenes[currentSceneId];
        if (!scene || !elem) return false;
        const box = this.getColliderBox(elem, newX, newY);
        const dim = getStageDimensions();
        if (box.x < 0 || box.y < 0 || (box.x + box.w) > dim.width || (box.y + box.h) > dim.height) {
            return true;
        }
        return scene.elements.some(other => {
            if (other.id === elem.id || other.id === ignoreEntityId) return false;
            if (!other.hasCollision) return false;
            if (isPlayMode && !checkCondition(other.condition)) return false;
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
            this.pendingTargetEntity = null;
            this.path = [];
            this.isMoving = false;
            this.currentSpeed = 0;
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

    syncElementDOM(elem) {
        if (!elem) return;
        const el = document.getElementById(`stage-el-${elem.id}`);
        if (el) {
            el.style.left = `${elem.x}px`;
            el.style.top = `${elem.y}px`;
            const bottomY = Math.round(elem.y + elem.height);
            el.style.zIndex = 100 + bottomY;
        }
    }
}

const movementEngine = new MovementEngine();