// movement-entities.js - LÓGICA DE MOVIMIENTO AUTÓNOMO DE ENTIDADES (WANDER Y WAYPOINTS)
class MovementEntities {
    static updateEntitiesMovement(engine) {
        const scene = projectData.scenes[currentSceneId];
        if (!scene) return;
        const now = Date.now();
        const entitySpeed = Math.max(1, Math.round(engine.maxSpeed * 0.5));

        scene.elements.forEach(elem => {
            if (elem.isPlayer || elem.type !== 'entidad' || !checkCondition(elem.condition)) {
                return;
            }
            if (elem.movePattern === 'random') {
                MovementEntities.handleRandomWander(engine, elem, entitySpeed, now);
            } else if (elem.movePattern === 'waypoints') {
                MovementEntities.handleWaypointsPatrol(engine, elem, entitySpeed);
            }
        });
    }

    static handleRandomWander(engine, elem, entitySpeed, now) {
        let ePath = engine.entityPaths.get(elem.id) || [];
        let nextTime = engine.entityTimers.get(elem.id) || 0;

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

            if (!MovementPathfinding.checkLineCollision(engine, startPivotX, startPivotY, targetX, targetY, elem)) {
                const destOrigin = engine.pivotToOrigin(targetX, targetY, elem);
                ePath = [{ x: destOrigin.x, y: destOrigin.y }];
            } else {
                const computed = MovementPathfinding.findPathAStar(engine, startPivotX, startPivotY, targetX, targetY, elem);
                if (computed) {
                    ePath = computed.map(p => engine.pivotToOrigin(p.x, p.y, elem));
                }
            }

            if (ePath && ePath.length > 0) {
                engine.entityPaths.set(elem.id, ePath);
            } else {
                engine.entityTimers.set(elem.id, now + 1000 + Math.random() * 2000);
            }
        } else if (ePath.length > 0) {
            MovementEntities.moveEntityAlongPath(engine, elem, ePath, entitySpeed, () => {
                engine.entityPaths.delete(elem.id);
                engine.entityTimers.set(elem.id, now + 1500 + Math.random() * 3000);
            });
        }
    }

    static handleWaypointsPatrol(engine, elem, entitySpeed) {
        if (!elem.waypoints || elem.waypoints.length === 0) return;
        let ePath = engine.entityPaths.get(elem.id) || [];
        let currentIndex = engine.entityWaypointIndex.get(elem.id) ?? 0;
        let direction = engine.entityWaypointDirection.get(elem.id) ?? 1;

        if (ePath.length === 0) {
            const targetWp = elem.waypoints[currentIndex];
            if (!targetWp) return;

            const colW = elem.collisionW !== undefined ? elem.collisionW : elem.width;
            const colH = elem.collisionH !== undefined ? elem.collisionH : elem.height;
            const offX = elem.collisionX !== undefined ? elem.collisionX : Math.round((elem.width - colW) / 2);
            const offY = elem.collisionY !== undefined ? elem.collisionY : (elem.height - colH);

            const startPivotX = elem.x + offX + colW / 2;
            const startPivotY = elem.y + offY + colH;

            if (!MovementPathfinding.checkLineCollision(engine, startPivotX, startPivotY, targetWp.x, targetWp.y, elem)) {
                const destOrigin = engine.pivotToOrigin(targetWp.x, targetWp.y, elem);
                ePath = [{ x: destOrigin.x, y: destOrigin.y }];
            } else {
                const computed = MovementPathfinding.findPathAStar(engine, startPivotX, startPivotY, targetWp.x, targetWp.y, elem);
                if (computed) {
                    ePath = computed.map(p => engine.pivotToOrigin(p.x, p.y, elem));
                }
            }

            if (ePath && ePath.length > 0) {
                engine.entityPaths.set(elem.id, ePath);
            }
        } else {
            MovementEntities.moveEntityAlongPath(engine, elem, ePath, entitySpeed, () => {
                engine.entityPaths.delete(elem.id);
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
                engine.entityWaypointIndex.set(elem.id, currentIndex);
                engine.entityWaypointDirection.set(elem.id, direction);
            });
        }
    }

    static moveEntityAlongPath(engine, elem, ePath, speed, onTargetReached) {
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

            if (!engine.checkCollision(nextX, nextY, elem)) {
                elem.x = nextX;
                elem.y = nextY;
            } else {
                engine.entityPaths.delete(elem.id);
            }
        }
        engine.syncElementDOM(elem);
    }
}