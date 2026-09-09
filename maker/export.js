// export.js - MÓDULO EXCLUSIVO PARA LA EXPORTACIÓN DEL JUEGO AUTOEJECUTABLE (.HTML)

function exportStandaloneHTML() {
    const usedAssetKeys = new Set();
    
    if (projectData.scenes) {
        Object.values(projectData.scenes).forEach(scene => {
            if (scene.elements) {
                scene.elements.forEach(elem => {
                    if (!elem.isText && elem.image) {
                        usedAssetKeys.add(elem.image);
                    }
                    if (elem.transformAsset) {
                        const savedConfig = projectData.savedElementsConfig || {};
                        if (savedConfig[elem.transformAsset] && savedConfig[elem.transformAsset].image) {
                            usedAssetKeys.add(savedConfig[elem.transformAsset].image);
                        } else if (assetsMap[elem.transformAsset]) {
                            usedAssetKeys.add(elem.transformAsset);
                        }
                    }
                });
            }
        });
    }

    if (projectData.savedElementsConfig) {
        Object.values(projectData.savedElementsConfig).forEach(savedElem => {
            if (!savedElem.isText && savedElem.image) {
                usedAssetKeys.add(savedElem.image);
            }
        });
    }

    if (projectData.itemsConfig) {
        Object.values(projectData.itemsConfig).forEach(item => {
            if (item.imageAsset) {
                usedAssetKeys.add(item.imageAsset);
            }
        });
    }

    const assetsData = {};
    usedAssetKeys.forEach(key => {
        if (assetsMap[key] && assetsMap[key].dataUrl) {
            assetsData[key] = assetsMap[key].dataUrl;
        }
    });

    const runtimeScript = `
        const CAMERA_SETTINGS = {
            minPitch: 40,
            maxPitch: 88,
            headScreenOffsetPx: 350,
            zoomLerp: 0.12,
            cameraLerp: 0.15
        };

        const projectData = ` + JSON.stringify(projectData) + `;
        const assetsData = ` + JSON.stringify(assetsData) + `;
        const canvasCache = {};
        let currentSceneId = projectData.startScene || Object.keys(projectData.scenes)[0];
        let gameState = { variables: {} };
        let cameraState = { zoom: 1, targetZoom: 1, focusX: 0, focusY: 0, panX: 0, panY: 0, minZoom: 0.5, maxZoom: 3.0 };
        const isPlayMode = true;
        const isIsometricView = false;
        let cachedViewportDimensions = { width: 0, height: 0 };

        function updateViewportCache() {
            const viewport = document.getElementById('viewport-container');
            if (viewport) {
                cachedViewportDimensions.width = viewport.clientWidth;
                cachedViewportDimensions.height = viewport.clientHeight;
            }
        }

        function getStageDimensions() {
            const ratio = projectData.aspectRatio || "horizontal";
            if (ratio === "custom") {
                return { 
                    width: Math.max(100, parseInt(projectData.customWidth, 10) || 1920), 
                    height: Math.max(100, parseInt(projectData.customHeight, 10) || 1080) 
                };
            }
            if (ratio === "vertical") return { width: 540, height: 960 };
            if (ratio === "square") return { width: 720, height: 720 };
            if (ratio === "horizontal") return { width: 960, height: 540 };
            if (ratio === "medium") return { width: 1920, height: 1080 };
            if (ratio === "large") return { width: 1920, height: 1920 };
            if (ratio === "giant") return { width: 7680, height: 4320 };
            if (ratio === "immense") return { width: 12000, height: 8000 };
            if (ratio === "extreme") return { width: 20000, height: 20000 };
            return { width: 960, height: 540 };
        }

        function initRuntimeVariables() {
            gameState.variables = {};
            if (projectData.variablesConfig) {
                Object.keys(projectData.variablesConfig).forEach(key => {
                    const conf = projectData.variablesConfig[key];
                    let val = conf.value;
                    if (conf.type === 'boolean') {
                        val = val === true || val === 'true';
                    } else if (conf.type === 'number') {
                        val = Number(val) || 0;
                    }
                    gameState.variables[key] = val;
                });
            }
        }

        function checkCondition(cond) {
            if (!cond || cond.type === 'none' || !cond.type) return true;
            if (cond.type === 'variable') {
                if (!cond.varId) return true;
                const currentVal = gameState.variables[cond.varId];
                let targetVal = cond.targetVal;
                const varConfig = projectData.variablesConfig ? projectData.variablesConfig[cond.varId] : null;
                const varType = varConfig ? varConfig.type : 'string';
                if (varType === 'boolean') {
                    targetVal = targetVal === true || targetVal === 'true';
                } else if (varType === 'number') {
                    targetVal = Number(targetVal) || 0;
                }
                const op = cond.op || '==';
                if (op === '==') return currentVal == targetVal;
                if (op === '!=') return currentVal != targetVal;
                if (op === '>') return currentVal > targetVal;
                if (op === '<') return currentVal < targetVal;
                return true;
            }
            if (cond.type === 'inventory') {
                if (!cond.itemId) return true;
                const hasItem = inventoryManager.hasItem(cond.itemId);
                if (cond.itemState === 'has') return hasItem;
                if (cond.itemState === 'not_has') return !hasItem;
            }
            return true;
        }

        class InventoryManager {
            constructor() {
                this.items = [];
                this.maxStack = 99;
                this.isOpen = false;
            }
            addItem(itemId, amount = 1) {
                if (!itemId) return false;
                const existingItem = this.items.find(item => item.id === itemId && item.count < this.maxStack);
                if (existingItem) {
                    const spaceLeft = this.maxStack - existingItem.count;
                    if (amount <= spaceLeft) {
                        existingItem.count += amount;
                        this.render();
                        return true;
                    } else {
                        existingItem.count = this.maxStack;
                        amount -= spaceLeft;
                    }
                }
                while (amount > 0) {
                    const addCount = Math.min(amount, this.maxStack);
                    this.items.push({ id: itemId, count: addCount });
                    amount -= addCount;
                }
                this.render();
                return true;
            }
            removeItem(itemId, amount = 1) {
                if (!itemId) return false;
                for (let i = this.items.length - 1; i >= 0; i--) {
                    if (this.items[i].id === itemId) {
                        if (this.items[i].count > amount) {
                            this.items[i].count -= amount;
                            amount = 0;
                            break;
                        } else {
                            amount -= this.items[i].count;
                            this.items.splice(i, 1);
                        }
                    }
                    if (amount <= 0) break;
                }
                this.render();
                return amount <= 0;
            }
            hasItem(itemId) {
                if (!itemId) return false;
                return this.items.some(item => item.id === itemId && item.count > 0);
            }
            clear() {
                this.items = [];
                this.isOpen = false;
                this.render();
            }
            toggle() {
                this.isOpen = !this.isOpen;
                this.render();
            }
            render() {
                const inventoryBar = document.getElementById('inventory-bar');
                if (!inventoryBar) return;
                inventoryBar.innerHTML = '';
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'inv-toggle-btn ' + (this.isOpen ? 'active' : '');
                toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" ry="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path><line x1="12" y1="12" x2="12" y2="12.01"></line></svg>';
                const totalItemsCount = this.items.reduce((acc, curr) => acc + curr.count, 0);
                if (totalItemsCount > 0) {
                    const totalBadge = document.createElement('span');
                    totalBadge.className = 'inv-total-badge';
                    totalBadge.textContent = totalItemsCount;
                    toggleBtn.appendChild(totalBadge);
                }
                toggleBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.toggle();
                };
                inventoryBar.appendChild(toggleBtn);
                const panel = document.createElement('div');
                panel.className = 'inv-drawer ' + (this.isOpen ? 'open' : '');
                if (this.items.length === 0) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.className = 'inv-empty-msg';
                    emptyMsg.textContent = 'Vacío';
                    panel.appendChild(emptyMsg);
                } else {
                    this.items.forEach((itemData) => {
                        const slot = document.createElement('div');
                        slot.className = 'inv-slot has-item';
                        const itemConfig = projectData.itemsConfig ? projectData.itemsConfig[itemData.id] : null;
                        const assetKey = itemConfig ? itemConfig.imageAsset : itemData.id;
                        const assetDataUrl = assetsData[assetKey] || assetsData[itemData.id];
                        if (assetDataUrl) {
                            const img = document.createElement('img');
                            img.src = assetDataUrl;
                            slot.appendChild(img);
                        } else {
                            const placeholder = document.createElement('span');
                            placeholder.className = 'inv-placeholder';
                            placeholder.textContent = itemData.id.substring(0, 3).toUpperCase();
                            slot.appendChild(placeholder);
                        }
                        if (itemData.count > 1) {
                            const badge = document.createElement('span');
                            badge.className = 'inv-badge';
                            badge.textContent = itemData.count;
                            slot.appendChild(badge);
                        }
                        panel.appendChild(slot);
                    });
                }
                inventoryBar.appendChild(panel);
            }
        }
        const inventoryManager = new InventoryManager();

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
                this.gridSize = 16;
                this.maxSpeed = 6;
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
                    if (e.button !== 0 || e.shiftKey) return;
                    if (e.target.closest('#game-ui') || e.target.closest('#inventory-bar') || e.target.closest('#dialog-box')) {
                        return;
                    }
                    const stage = document.getElementById('stage');
                    if (!stage || !stage.contains(e.target)) return;
                    this.isMouseDown = true;
                    this.processMouseTarget(e);
                });
                window.addEventListener('mousemove', (e) => {
                    if (!this.isMouseDown) return;
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
                    if (!checkCondition(other.condition)) return false;
                    const otherBox = this.getColliderBox(other);
                    return (
                        box.x < otherBox.x + otherBox.w &&
                        box.x + box.w > otherBox.x &&
                        box.y < otherBox.y + otherBox.h &&
                        box.y + box.h > otherBox.y
                    );
                });
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
                    x: startX, y: startY,
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
                const maxIterations = 10000;
                while (openList.length > 0 && iterations < maxIterations) {
                    iterations++;
                    let currentIndex = 0;
                    for (let i = 1; i < openList.length; i++) {
                        if (openList[i].f < openList[currentIndex].f) currentIndex = i;
                    }
                    const current = openList.splice(currentIndex, 1)[0];
                    const key = current.col + '_' + current.row;
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
                        const neighborKey = neighborCol + '_' + neighborRow;
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
            startLoop() {
                const update = () => {
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
                const el = document.getElementById('stage-el-' + elem.id);
                if (el) {
                    el.style.left = elem.x + 'px';
                    el.style.top = elem.y + 'px';
                    const bottomY = Math.round(elem.y + elem.height);
                    el.style.zIndex = 100 + bottomY;
                }
            }
        }
        const movementEngine = new MovementEngine();

        function getScreenOffsetY() {
            if (!isPlayMode) return 0;
            const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
            const player = scene && scene.elements ? scene.elements.find(e => e.isPlayer) : null;
            if (!player) return 0;
            const minZ = cameraState.minZoom || 0.5;
            const maxZ = cameraState.maxZoom || 3.0;
            const zoomRatio = Math.max(0, Math.min(1, (cameraState.zoom - minZ) / (maxZ - minZ)));
            const headOffset = typeof CAMERA_SETTINGS !== 'undefined' ? CAMERA_SETTINGS.headScreenOffsetPx : 350;
            return headOffset * zoomRatio;
        }

        function getCanvasWorldCoordinates(e) {
            const viewport = document.getElementById('viewport-container');
            const dim = getStageDimensions();
            if (!viewport || !dim.width || !dim.height) return { clickX: 0, clickY: 0, finalScale: 1 };
            const viewportRect = viewport.getBoundingClientRect();
            const mouseX = e.clientX - viewportRect.left;
            const mouseY = e.clientY - viewportRect.top;
            const vw = cachedViewportDimensions.width || viewport.clientWidth || window.innerWidth;
            const vh = cachedViewportDimensions.height || viewport.clientHeight || window.innerHeight;
            const refWidth = 1920;
            const refHeight = 1080;
            const baseScale = Math.min(vw / refWidth, vh / refHeight);
            const finalScale = baseScale * cameraState.zoom;
            const fx = cameraState.focusX !== undefined ? cameraState.focusX : (dim.width / 2);
            const fy = cameraState.focusY !== undefined ? cameraState.focusY : (dim.height / 2);
            
            const is3DView = isIsometricView || (cameraState.pitch !== undefined && cameraState.pitch !== 0) || (cameraState.rotation !== undefined && cameraState.rotation !== 0);
            const pitch = is3DView ? (cameraState.pitch !== undefined ? cameraState.pitch : (isIsometricView ? 60 : 0)) : 0;
            const yaw = is3DView ? (cameraState.rotation !== undefined ? cameraState.rotation : 0) : 0;

            const screenOffsetY = getScreenOffsetY();
            const dyCenter = mouseY - (vh / 2);
            const perspectiveD = 1200;

            let X2, Y2;

            if (is3DView && Math.abs(pitch) > 0.1) {
                const pitchRad = pitch * (Math.PI / 180);
                const sinPitch = Math.sin(pitchRad);
                const cosPitch = Math.cos(pitchRad);

                let denomY = perspectiveD * cosPitch + dyCenter * sinPitch;
                if (Math.abs(denomY) < 0.001) denomY = 0.001 * (denomY < 0 ? -1 : 1);

                Y2 = (perspectiveD * (dyCenter - screenOffsetY)) / (finalScale * denomY);
                X2 = ((mouseX - (vw / 2)) * (perspectiveD - finalScale * Y2 * sinPitch)) / (perspectiveD * finalScale);
            } else {
                X2 = (mouseX - (vw / 2)) / finalScale;
                Y2 = (dyCenter - screenOffsetY) / finalScale;
            }

            const yawRad = yaw * (Math.PI / 180);
            const cosYaw = Math.cos(yawRad);
            const sinYaw = Math.sin(yawRad);

            const worldDx = X2 * cosYaw + Y2 * sinYaw;
            const worldDy = -X2 * sinYaw + Y2 * cosYaw;

            const clickX = Math.round(fx + worldDx);
            const clickY = Math.round(fy + worldDy);

            return { clickX, clickY, finalScale };
        }

        function fitStage(instantCamera = false) {
            const stage = document.getElementById('stage');
            if (!stage) return;
            if (cachedViewportDimensions.width === 0) {
                updateViewportCache();
            }
            const dim = getStageDimensions();
            stage.style.width = dim.width + 'px';
            stage.style.height = dim.height + 'px';
            stage.style.position = 'absolute';
            stage.style.left = '0px';
            stage.style.top = '0px';
            stage.style.margin = '0';
            stage.style.transformOrigin = '0 0';
            
            const vw = cachedViewportDimensions.width || window.innerWidth;
            const vh = cachedViewportDimensions.height || window.innerHeight;
            const refWidth = 1920;
            const refHeight = 1080;
            const baseScale = Math.min(vw / refWidth, vh / refHeight);
            if (cameraState.targetZoom === undefined) cameraState.targetZoom = cameraState.zoom;
            cameraState.zoom += (cameraState.targetZoom - cameraState.zoom) * CAMERA_SETTINGS.zoomLerp;
            const finalScale = baseScale * cameraState.zoom;
            
            if (cameraState.focusX === undefined || cameraState.focusX === null) {
                cameraState.focusX = dim.width / 2;
            }
            if (cameraState.focusY === undefined || cameraState.focusY === null) {
                cameraState.focusY = dim.height / 2;
            }
            const minZ = cameraState.minZoom || 0.5;
            const maxZ = cameraState.maxZoom || 3.0;
            const zoomRatio = Math.max(0, Math.min(1, (cameraState.zoom - minZ) / (maxZ - minZ)));
            let screenOffsetY = 0;
            
            const scene = projectData.scenes[currentSceneId];
            const player = scene ? scene.elements.find(e => e.isPlayer) : null;
            if (player) {
                if (isIsometricView) {
                    const targetPitch = CAMERA_SETTINGS.minPitch + (CAMERA_SETTINGS.maxPitch - CAMERA_SETTINGS.minPitch) * zoomRatio;
                    if (cameraState.pitch === undefined) cameraState.pitch = 60;
                    cameraState.pitch += (targetPitch - cameraState.pitch) * CAMERA_SETTINGS.zoomLerp;
                }
                const targetFocusX = player.x + (player.width / 2);
                const targetFocusY = player.y + player.height;
                screenOffsetY = CAMERA_SETTINGS.headScreenOffsetPx * zoomRatio;
                
                if (instantCamera || (cameraState.focusX === dim.width / 2 && cameraState.focusY === dim.height / 2)) {
                    cameraState.focusX = targetFocusX;
                    cameraState.focusY = targetFocusY;
                } else {
                    cameraState.focusX += (targetFocusX - cameraState.focusX) * CAMERA_SETTINGS.cameraLerp;
                    cameraState.focusY += (targetFocusY - cameraState.focusY) * CAMERA_SETTINGS.cameraLerp;
                }
            }

            const fx = cameraState.focusX;
            const fy = cameraState.focusY;
            const pitch = isIsometricView ? (cameraState.pitch !== undefined ? cameraState.pitch : 60) : 0;
            const yaw = isIsometricView ? (cameraState.rotation !== undefined ? cameraState.rotation : 0) : 0;
            const centerY = (vh / 2) + screenOffsetY;
            
            if (isIsometricView) {
                stage.style.transform = 'translate3d(' + (vw / 2) + 'px, ' + centerY + 'px, 0px) scale(' + finalScale + ') rotateX(' + pitch + 'deg) rotateZ(' + yaw + 'deg) translate3d(' + (-fx) + 'px, ' + (-fy) + 'px, 0px)';
            } else {
                stage.style.transform = 'translate3d(' + (vw / 2) + 'px, ' + centerY + 'px, 0px) scale(' + finalScale + ') translate3d(' + (-fx) + 'px, ' + (-fy) + 'px, 0px)';
            }
        }

        function resetCamera() {
            const dim = getStageDimensions();
            cameraState.zoom = 1.0;
            cameraState.targetZoom = 1.0;
            cameraState.focusX = dim.width / 2;
            cameraState.focusY = dim.height / 2;
            cameraState.panX = 0;
            cameraState.panY = 0;
            cameraState.minZoom = 0.5;
            cameraState.maxZoom = 3.0;
        }

        function setupCameraControls() {
            const viewport = document.getElementById('viewport-container');
            if (!viewport || viewport.dataset.cameraControlsAttached) return;
            viewport.dataset.cameraControlsAttached = "true";
            let isPanning = false;
            let startPanX = 0, startPanY = 0;
            let panAnimationFrame = null;
            viewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
                const currentTarget = cameraState.targetZoom !== undefined ? cameraState.targetZoom : cameraState.zoom;
                cameraState.targetZoom = Math.max(cameraState.minZoom, Math.min(cameraState.maxZoom, currentTarget * zoomFactor));
                fitStage();
            }, { passive: false });
            viewport.addEventListener('mousedown', (e) => {
                if (e.button === 1 || (e.button === 0 && e.shiftKey) || e.button === 2) {
                    isPanning = true;
                    startPanX = e.clientX;
                    startPanY = e.clientY;
                    viewport.style.cursor = 'grabbing';
                }
            });
            window.addEventListener('mousemove', (e) => {
                if (!isPanning) return;
                if (panAnimationFrame) cancelAnimationFrame(panAnimationFrame);
                panAnimationFrame = requestAnimationFrame(() => {
                    const vw = cachedViewportDimensions.width || window.innerWidth;
                    const vh = cachedViewportDimensions.height || window.innerHeight;
                    const refWidth = 1920;
                    const refHeight = 1080;
                    const baseScale = Math.min(vw / refWidth, vh / refHeight);
                    const finalScale = baseScale * cameraState.zoom;
                    const pitch = cameraState.pitch !== undefined ? cameraState.pitch : 60;
                    const cosAngle = Math.max(0.1, Math.cos(pitch * Math.PI / 180));
                    const deltaX = (e.clientX - startPanX) / finalScale;
                    const deltaY = (e.clientY - startPanY) / (finalScale * cosAngle);
                    cameraState.focusX -= deltaX;
                    cameraState.focusY -= deltaY;
                    startPanX = e.clientX;
                    startPanY = e.clientY;
                    fitStage();
                });
            });
            window.addEventListener('mouseup', () => {
                if (isPanning) {
                    isPanning = false;
                    viewport.style.cursor = 'default';
                }
            });
            viewport.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            }, true);
        }

        function renderStage(instantCamera = false) {
            const stage = document.getElementById('stage');
            const fadeOverlay = document.getElementById('fade-overlay');
            if (!stage) return;
            const dim = getStageDimensions();
            stage.style.width = dim.width + 'px';
            stage.style.height = dim.height + 'px';
            stage.innerHTML = '';
            if (fadeOverlay) stage.appendChild(fadeOverlay);
            const pitch = cameraState.pitch !== undefined ? cameraState.pitch : 60;
            const yaw = cameraState.rotation !== undefined ? cameraState.rotation : 0;
            
            if (isIsometricView) {
                stage.classList.add('is-mode-7');
            } else {
                stage.classList.remove('is-mode-7');
            }
            
            const scene = projectData.scenes[currentSceneId];
            if (!scene) return;
            scene.elements.forEach(elem => {
                if (elem.type === 'fondo') {
                    elem.x = 0;
                    elem.y = 0;
                    elem.width = dim.width;
                    elem.height = dim.height;
                }
                if (!checkCondition(elem.condition)) {
                    return;
                }
                const el = document.createElement('div');
                el.className = 'stage-element layer-' + elem.type + (elem.isText ? ' text-element' : '');
                el.id = 'stage-el-' + elem.id;
                el.style.left = elem.x + 'px';
                el.style.top = elem.y + 'px';
                el.style.width = elem.width + 'px';
                el.style.height = elem.height + 'px';
                const baseRotation = elem.rotation || 0;
                const billboardMode = elem.billboardMode || 'camera';
                
                if (isIsometricView) {
                    if (elem.type === 'fondo') {
                        el.classList.add('mode7-ground');
                        el.style.transform = 'rotate(' + baseRotation + 'deg)';
                    } else {
                        el.classList.add('mode7-billboard');
                        el.style.transformStyle = 'preserve-3d';
                        if (billboardMode === 'cross_x' && !elem.isText) {
                            el.style.transform = 'rotateX(-90deg) rotate(' + baseRotation + 'deg)';
                        } else if (billboardMode === 'fixed') {
                            el.style.transform = 'rotateX(-90deg) rotate(' + baseRotation + 'deg)';
                        } else if (billboardMode === 'flat' || billboardMode === 'plano') {
                            el.classList.remove('mode7-billboard');
                            el.classList.add('mode7-ground');
                            el.style.transform = 'rotate(' + baseRotation + 'deg)';
                        } else if (billboardMode === 'muro' || billboardMode === 'wall') {
                            el.classList.remove('mode7-billboard');
                            el.style.transform = 'rotate(' + baseRotation + 'deg)';
                        } else {
                            el.style.transform = 'rotateX(-90deg) rotateZ(' + (-yaw) + 'deg) rotate(' + baseRotation + 'deg)';
                        }
                    }
                } else {
                    el.style.transform = 'rotate(' + baseRotation + 'deg)';
                }

                if (elem.type === 'fondo') {
                    el.style.zIndex = 10;
                } else {
                    const bottomY = Math.round((elem.y || 0) + (elem.height || 0));
                    el.style.zIndex = 100 + bottomY;
                }

                if (isIsometricView && elem.type !== 'fondo' && (billboardMode === 'muro' || billboardMode === 'wall') && !elem.isText) {
                    const assetDataUrl = assetsData[elem.image] || elem.image;
                    const W = elem.width;
                    const D = elem.wallDepth !== undefined ? elem.wallDepth : elem.height;
                    const H = elem.wallHeight !== undefined ? elem.wallHeight : elem.height;
                    const createFace = (w, h, transform, filterStr) => {
                        const face = document.createElement('div');
                        face.style.cssText = 'position: absolute; left: 0; top: 0; width: ' + w + 'px; height: ' + h + 'px; transform-origin: 0 0; transform: ' + transform + '; transform-style: preserve-3d; backface-visibility: visible; ' + (filterStr ? 'filter: ' + filterStr + ';' : '');
                        face.innerHTML = '<img src="' + assetDataUrl + '" style="width:100%;height:100%;display:block;pointer-events:none;object-fit:fill;">';
                        return face;
                    };
                    el.appendChild(createFace(W, D, 'translateZ(' + H + 'px)', 'brightness(1.05)'));
                    el.appendChild(createFace(W, D, 'translateZ(0px)', 'brightness(0.6)'));
                    el.appendChild(createFace(W, H, 'translateY(' + D + 'px) rotateX(-90deg)', 'brightness(0.95)'));
                    el.appendChild(createFace(W, H, 'rotateX(-90deg)', 'brightness(0.75)'));
                    el.appendChild(createFace(D, H, 'rotateY(90deg) rotateZ(90deg)', 'brightness(0.85)'));
                    el.appendChild(createFace(D, H, 'translateX(' + W + 'px) rotateY(90deg) rotateZ(90deg)', 'brightness(0.9)'));
                } else if (isIsometricView && elem.type !== 'fondo' && billboardMode === 'cross_x' && !elem.isText) {
                    const assetDataUrl = assetsData[elem.image] || elem.image;
                    const plane1 = document.createElement('div');
                    plane1.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; transform-origin: bottom center; transform: rotateY(0deg); transform-style: preserve-3d;';
                    plane1.innerHTML = '<img src="' + assetDataUrl + '" style="width:100%;height:100%;display:block;pointer-events:none;object-fit:fill;">';
                    const plane2 = document.createElement('div');
                    plane2.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; transform-origin: bottom center; transform: rotateY(90deg); transform-style: preserve-3d;';
                    plane2.innerHTML = '<img src="' + assetDataUrl + '" style="width:100%;height:100%;display:block;pointer-events:none;object-fit:fill;">';
                    el.appendChild(plane1);
                    el.appendChild(plane2);
                } else if (elem.isText) {
                    el.textContent = elem.textContent || '';
                    el.style.fontSize = (elem.fontSize || 24) + 'px';
                    el.style.fontFamily = elem.fontFamily || 'Arial, sans-serif';
                    el.style.color = elem.textColor || '#1d1d1f';
                    const outline = elem.textOutline ? '-1px -1px 0 ' + (elem.textOutlineColor || '#000') + ', 1px -1px 0 ' + (elem.textOutlineColor || '#000') + ', -1px 1px 0 ' + (elem.textOutlineColor || '#000') + ', 1px 1px 0 ' + (elem.textOutlineColor || '#000') : '';
                    const shadow = elem.textShadow ? '0px 4px 8px ' + (elem.textShadowColor || 'rgba(0,0,0,0.5)') : '';
                    const glow = elem.textGlow ? '0px 0px 12px ' + (elem.textGlowColor || '#0071e3') : '';
                    const textEffects = [outline, shadow, glow].filter(Boolean).join(', ');
                    el.style.textShadow = textEffects || 'none';
                } else {
                    const img = document.createElement('img');
                    img.src = assetsData[elem.image] || elem.image;
                    el.appendChild(img);
                }
                if (elem.type === 'entidad' && !elem.isPlayer) el.style.cursor = 'pointer';
                stage.appendChild(el);
            });
            setupExportedPixelClicks();
            movementEngine.init();
            fitStage(instantCamera);
        }

        function setupExportedPixelClicks() {
            const stage = document.getElementById('stage');
            if (!stage || stage.dataset.pixelClickAttached) return;
            stage.dataset.pixelClickAttached = "true";
            stage.addEventListener('click', (e) => {
                if (e.shiftKey) return;
                if (e.target.closest('#game-ui') || e.target.closest('#inventory-bar') || e.target.closest('#dialog-box')) return;
                const { clickX, clickY } = getCanvasWorldCoordinates(e);
                const scene = projectData.scenes[currentSceneId];
                if (!scene) return;
                const elementsToCheck = [...scene.elements]
                    .filter(elem => !elem.isPlayer && elem.type === 'entidad' && elem.triggerType !== 'passive' && checkCondition(elem.condition))
                    .sort((a, b) => ((b.y + b.height) - (a.y + a.height)));
                let clickedEntity = null;
                for (const elem of elementsToCheck) {
                    if (isPixelOpaqueExported(elem, clickX, clickY)) {
                        clickedEntity = elem;
                        break;
                    }
                }
                if (clickedEntity) {
                    const trigger = clickedEntity.triggerType || 'click_distance';
                    if (trigger === 'click_distance') {
                        handleEntityInteraction(clickedEntity);
                    } else if (trigger === 'click_proximity') {
                        const player = scene.elements.find(e => e.isPlayer && checkCondition(e.condition));
                        if (player) {
                            const pPivot = movementEngine.getPlayerPivot();
                            const interactionDistance = clickedEntity.interactionDistance || 100;
                            const box = movementEngine.getColliderBox(clickedEntity);
                            const closestX = Math.max(box.x, Math.min(pPivot.x, box.x + box.w));
                            const closestY = Math.max(box.y, Math.min(pPivot.y, box.y + box.h));
                            const dist = Math.hypot(pPivot.x - closestX, pPivot.y - closestY);
                            if (dist <= interactionDistance) {
                                handleEntityInteraction(clickedEntity);
                            } else {
                                movementEngine.setTargetWithCallback(closestX, closestY, clickedEntity);
                            }
                        } else {
                            handleEntityInteraction(clickedEntity);
                        }
                    }
                } else {
                    movementEngine.setTarget(clickX, clickY);
                }
            });
        }

        function isPixelOpaqueExported(elem, clickX, clickY) {
            if (elem.isPlayer) return false;
            if (elem.hasCollision || elem.collisionW !== undefined) {
                const box = movementEngine.getColliderBox(elem);
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
            const dataUrl = assetsData[elem.image] || elem.image;
            if (!dataUrl) return true;
            if (!canvasCache[elem.image]) {
                const canvas = document.createElement('canvas');
                const img = new Image();
                img.src = dataUrl;
                if (!img.complete) return true;
                canvas.width = img.naturalWidth || elem.width;
                canvas.height = img.naturalHeight || elem.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);
                canvasCache[elem.image] = { canvas, ctx };
            }
            const cache = canvasCache[elem.image];
            const imgX = Math.floor((localX / elem.width) * cache.canvas.width);
            const imgY = Math.floor((localY / elem.height) * cache.canvas.height);
            try {
                const pixelData = cache.ctx.getImageData(imgX, imgY, 1, 1).data;
                return pixelData[3] > 10;
            } catch (err) {
                return true;
            }
        }

        function handleEntityInteraction(elem) {
            if (!elem || elem._isProcessingInteraction) return;
            elem._isProcessingInteraction = true;
            movementEngine.pendingTargetEntity = null;
            movementEngine.path = [];
            movementEngine.isMoving = false;
            movementEngine.currentSpeed = 0;
            const dialogBox = document.getElementById('dialog-box');
            const dialogText = document.getElementById('dialog-text');
            if (elem.setVariable && elem.setVariable.varId) {
                const varId = elem.setVariable.varId;
                const conf = projectData.variablesConfig ? projectData.variablesConfig[varId] : null;
                let val = elem.setVariable.value;
                if (conf) {
                    if (conf.type === 'boolean') {
                        val = val === 'true' || val === '1' || val === true;
                    } else if (conf.type === 'number') {
                        val = Number(val) || 0;
                    }
                }
                gameState.variables[varId] = val;
            }
            if (elem.addItem) {
                const itemsToAdd = Array.isArray(elem.addItem) 
                    ? elem.addItem 
                    : elem.addItem.split(',').map(s => s.trim()).filter(Boolean);
                itemsToAdd.forEach(id => inventoryManager.addItem(id, 1));
            }
            if (elem.removeItem) {
                const itemsToRemove = Array.isArray(elem.removeItem) 
                    ? elem.removeItem 
                    : elem.removeItem.split(',').map(s => s.trim()).filter(Boolean);
                itemsToRemove.forEach(id => inventoryManager.removeItem(id, 1));
            }
            if (elem.transformAsset) {
                const savedConfig = projectData.savedElementsConfig || {};
                if (savedConfig[elem.transformAsset]) {
                    const targetSavedElem = savedConfig[elem.transformAsset];
                    if (targetSavedElem.isText) {
                        elem.isText = true;
                        elem.textContent = targetSavedElem.textContent || '';
                        elem.textColor = targetSavedElem.textColor;
                    } else {
                        elem.isText = false;
                        elem.image = targetSavedElem.image;
                    }
                    if (targetSavedElem.width) elem.width = targetSavedElem.width;
                    if (targetSavedElem.height) elem.height = targetSavedElem.height;
                } else {
                    elem.image = elem.transformAsset;
                }
            }
            let elementDestroyed = false;
            if (elem.destroyOnInteract) {
                const currentScene = projectData.scenes[currentSceneId];
                if (currentScene && currentScene.elements) {
                    currentScene.elements = currentScene.elements.filter(e => e.id !== elem.id);
                    elementDestroyed = true;
                }
            }
            if (elem.dialog) {
                if (dialogText) dialogText.textContent = elem.dialog;
                if (dialogBox) {
                    dialogBox.style.display = 'block';
                    const closeOnOutsideClick = (e) => {
                        if (!dialogBox.contains(e.target)) {
                            dialogBox.style.display = 'none';
                            document.removeEventListener('click', closeOnOutsideClick, true);
                        }
                    };
                    setTimeout(() => {
                        document.addEventListener('click', closeOnOutsideClick, true);
                    }, 10);
                }
            }
            renderStage(true);
            if (elem.targetScene && projectData.scenes[elem.targetScene]) {
                changeSceneWithTransition(elem.targetScene, elem.targetX, elem.targetY);
            }
            if (!elementDestroyed) {
                setTimeout(() => {
                    delete elem._isProcessingInteraction;
                }, 200);
            }
        }

        function changeSceneWithTransition(targetSceneId, targetX = null, targetY = null) {
            const fadeOverlay = document.getElementById('fade-overlay');
            if (fadeOverlay) fadeOverlay.style.opacity = '1';
            setTimeout(() => {
                if (projectData.scenes) {
                    let currentPlayer = null;
                    let currentSceneOwner = null;
                    for (const [sKey, sc] of Object.entries(projectData.scenes)) {
                        if (sc.elements) {
                            const p = sc.elements.find(e => e.isPlayer);
                            if (p) {
                                currentPlayer = p;
                                currentSceneOwner = sKey;
                                break;
                            }
                        }
                    }
                    if (currentPlayer) {
                        if (currentSceneOwner !== targetSceneId) {
                            projectData.scenes[currentSceneOwner].elements = projectData.scenes[currentSceneOwner].elements.filter(e => e.id !== currentPlayer.id);
                            if (!projectData.scenes[targetSceneId].elements) projectData.scenes[targetSceneId].elements = [];
                            projectData.scenes[targetSceneId].elements.push(currentPlayer);
                        }
                        if (targetX !== null && targetX !== undefined && targetX !== '') {
                            currentPlayer.x = parseInt(targetX, 10);
                        }
                        if (targetY !== null && targetY !== undefined && targetY !== '') {
                            currentPlayer.y = parseInt(targetY, 10);
                        }
                    }
                }
                currentSceneId = targetSceneId;
                resetCamera();
                renderStage(true);
                setTimeout(() => {
                    if (fadeOverlay) fadeOverlay.style.opacity = '0';
                }, 50);
            }, 400);
        }

        window.addEventListener('resize', () => {
            updateViewportCache();
            fitStage();
        });

        document.addEventListener('DOMContentLoaded', () => {
            initRuntimeVariables();
            updateViewportCache();
            setupCameraControls();
            const viewport = document.getElementById('viewport-container');
            if (viewport && typeof ResizeObserver !== 'undefined') {
                const ro = new ResizeObserver(() => {
                    updateViewportCache();
                    fitStage();
                });
                ro.observe(viewport);
            }
            renderStage(true);
            inventoryManager.render();
        });
    `;

    const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aventura KOREH</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
            -webkit-font-smoothing: antialiased;
        }
        body {
            background-color: #000000;
            color: #1d1d1f;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            height: 100vh;
            width: 100vw;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
        #viewport-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            cursor: default;
            background: #000;
            overflow: hidden;
            perspective: 1200px;
            perspective-origin: 50% 50%;
        }
        #stage {
            background: #ffffff;
            position: absolute;
            overflow: visible;
            transform-origin: 0 0;
            transform-style: preserve-3d;
        }
        #stage.is-mode-7 {
            transform-style: preserve-3d;
            background: transparent !important;
        }
        .mode7-ground {
            transform-style: preserve-3d;
            transform-origin: center center;
        }
        .mode7-billboard {
            transform-origin: bottom center !important;
            transform-style: preserve-3d;
        }
        .stage-element {
            position: absolute;
            transform-origin: bottom center;
            will-change: transform, left, top;
        }
        .stage-element.text-element {
            display: flex;
            align-items: center;
            justify-content: center;
            word-break: break-word;
            white-space: pre-wrap;
            line-height: 1.2;
        }
        .stage-element img {
            width: 100%;
            height: 100%;
            pointer-events: none;
            display: block;
            object-fit: fill;
        }
        #game-ui {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 100000;
            display: block;
        }
        #dialog-box {
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            width: 75%;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 16px;
            padding: 20px;
            color: #1d1d1f;
            font-size: 14px;
            line-height: 1.5;
            pointer-events: auto;
            display: none;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
        }
        .btn {
            background: #0071e3;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            float: right;
            margin-top: 12px;
        }
        #inventory-bar {
            position: absolute;
            top: 16px;
            right: 16px;
            display: flex;
            align-items: center;
            flex-direction: row-reverse;
            gap: 10px;
            pointer-events: auto;
            z-index: 100000;
        }
        .inv-toggle-btn {
            position: relative;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: #000000;
            border: none;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
            transition: transform 0.2s ease;
            flex-shrink: 0;
        }
        .inv-toggle-btn:hover {
            transform: scale(1.05);
        }
        .inv-total-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ff3b30;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            border: 2px solid #000000;
        }
        .inv-drawer {
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 0;
            opacity: 0;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0;
            border-radius: 14px;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            transition: all 0.3s ease;
            white-space: nowrap;
            scrollbar-width: none;
        }
        .inv-drawer::-webkit-scrollbar {
            display: none;
        }
        .inv-drawer.open {
            max-width: 400px;
            opacity: 1;
            padding: 6px 10px;
        }
        .inv-slot {
            position: relative;
            min-width: 38px;
            width: 38px;
            height: 38px;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .inv-slot img {
            max-width: 75%;
            max-height: 75%;
            object-fit: contain;
        }
        .inv-badge {
            position: absolute;
            bottom: -2px;
            right: -2px;
            background: #0071e3;
            color: #ffffff;
            font-size: 8px;
            font-weight: 700;
            padding: 2px 4px;
            border-radius: 4px;
        }
        .inv-placeholder {
            font-size: 9px;
            font-weight: 700;
            color: #ffffff;
        }
        .inv-empty-msg {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            padding: 0 8px;
        }
        #fade-overlay {
            position: absolute;
            inset: 0;
            background: #000000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s ease;
            z-index: 200000;
        }
    </style>
</head>
<body>
    <div id="viewport-container">
        <div id="stage"></div>
        <div id="game-ui">
            <div id="inventory-bar"></div>
            <div id="dialog-box">
                <p id="dialog-text"></p>
            </div>
        </div>
        <div id="fade-overlay"></div>
    </div>
    <script>
    ` + runtimeScript + `
    </script>
</body>
</html>`;

    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'juego_koreh_exportado.html';
    a.click();
    URL.revokeObjectURL(a.href);
}