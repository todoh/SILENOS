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
                });
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
        const projectData = ` + JSON.stringify(projectData) + `;
        const assetsData = ` + JSON.stringify(assetsData) + `;
        const canvasCache = {};
        let currentSceneId = projectData.startScene || Object.keys(projectData.scenes)[0];
        let gameState = { variables: {} };
        let cameraState = { zoom: 1, panX: 0, panY: 0, minZoom: 0.1, maxZoom: 5.0 };
        const isPlayMode = true;

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

        function getGridSizeForDimensions(width, height) {
            const maxDim = Math.max(width, height);
            if (maxDim <= 1920) return 16;
            if (maxDim <= 4320) return 32;
            if (maxDim <= 8000) return 64;
            return 128;
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

        class MovementEngine {
            constructor() {
                this.player = null;
                this.path = [];
                this.speed = 4;
                this.gridSize = 16;
                this.isMoving = false;
                this.isMouseDown = false;
                this.animFrameId = null;
                this.lastTargetX = null;
                this.lastTargetY = null;
                this.pendingTargetEntity = null;
                this.entityPaths = new Map();
                this.entityTimers = new Map();
                this.setupHoldClickListeners();
            }
            init() {
                if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
                this.isMoving = false;
                this.isMouseDown = false;
                this.path = [];
                this.pendingTargetEntity = null;
                this.entityPaths.clear();
                this.entityTimers.clear();
                
                const dim = getStageDimensions();
                this.gridSize = getGridSizeForDimensions(dim.width, dim.height);
                this.speed = Math.max(4, Math.round(this.gridSize / 4));
                const scene = projectData.scenes[currentSceneId];
                if (!scene) return;
                this.player = scene.elements.find(e => e.isPlayer);
                this.startLoop();
            }
            stop() {
                if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
                this.isMoving = false;
                this.isMouseDown = false;
                this.path = [];
                this.pendingTargetEntity = null;
                this.entityPaths.clear();
                this.entityTimers.clear();
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
            setTargetWithCallback(targetX, targetY, entity) {
                this.pendingTargetEntity = entity;
                this.setTarget(targetX, targetY);
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
                    if (this.player) {
                        if (this.isMoving) {
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
                    this.isMoving = false;
                    return;
                }
                const target = this.path[0];
                const dx = target.x - this.player.x;
                const dy = target.y - this.player.y;
                const distance = Math.hypot(dx, dy);
                if (distance <= this.speed) {
                    this.player.x = target.x;
                    this.player.y = target.y;
                    this.path.shift();
                    if (this.path.length === 0) {
                        this.isMoving = false;
                    }
                } else {
                    const vx = (dx / distance) * this.speed;
                    const vy = (dy / distance) * this.speed;
                    let nextX = this.player.x + vx;
                    let nextY = this.player.y + vy;
                    if (!this.checkCollision(nextX, nextY, this.player)) {
                        this.player.x = nextX;
                        this.player.y = nextY;
                    } else {
                        this.path = [];
                        this.isMoving = false;
                    }
                }
                this.syncElementDOM(this.player);
            }
            updateEntitiesMovement() {
                const scene = projectData.scenes[currentSceneId];
                if (!scene) return;
                const now = Date.now();
                const entitySpeed = Math.max(1, Math.round(this.speed * 0.5));
                scene.elements.forEach(elem => {
                    if (elem.isPlayer || elem.type !== 'entidad' || elem.movePattern !== 'random' || !checkCondition(elem.condition)) {
                        return;
                    }
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
                        const target = ePath[0];
                        const dx = target.x - elem.x;
                        const dy = target.y - elem.y;
                        const distance = Math.hypot(dx, dy);
                        if (distance <= entitySpeed) {
                            elem.x = target.x;
                            elem.y = target.y;
                            ePath.shift();
                            if (ePath.length === 0) {
                                this.entityPaths.delete(elem.id);
                                this.entityTimers.set(elem.id, now + 1500 + Math.random() * 3000);
                            }
                        } else {
                            const vx = (dx / distance) * entitySpeed;
                            const vy = (dy / distance) * entitySpeed;
                            let nextX = elem.x + vx;
                            let nextY = elem.y + vy;
                            if (!this.checkCollision(nextX, nextY, elem)) {
                                elem.x = nextX;
                                elem.y = nextY;
                            } else {
                                this.entityPaths.delete(elem.id);
                                this.entityTimers.set(elem.id, now + 1000 + Math.random() * 2000);
                            }
                        }
                        this.syncElementDOM(elem);
                    }
                });
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
                const maxIterations = 1500;
                while (openList.length > 0 && iterations < maxIterations) {
                    iterations++;
                    let currentIndex = 0;
                    for (let i = 1; i < openList.length; i++) {
                        if (openList[i].f < openList[currentIndex].f) currentIndex = i;
                    }
                    const current = openList.splice(currentIndex, 1)[0];
                    const key = \`\${current.col}_\${current.row}\`;
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
                        const neighborKey = \`\${neighborCol}_\${neighborRow}\`;
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
                const scene = projectData.scenes[currentSceneId];
                if (!scene || !elem) return false;
                const box = this.getColliderBox(elem, newX, newY);
                const dim = getStageDimensions();
                if (box.x < 0 || box.y < 0 || (box.x + box.w) > dim.width || (box.y + box.h) > dim.height) {
                    return true;
                }
                return scene.elements.some(other => {
                    if (other.id === elem.id) return false;
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
            checkProximityTriggers() {
                if (!this.pendingTargetEntity || !this.player) return;
                const pPivot = this.getPlayerPivot();
                const entity = this.pendingTargetEntity;
                const box = this.getColliderBox(entity);
                const closestX = Math.max(box.x, Math.min(pPivot.x, box.x + box.w));
                const closestY = Math.max(box.y, Math.min(pPivot.y, box.y + box.h));
                const dist = Math.hypot(pPivot.x - closestX, pPivot.y - closestY);
                const interactionDistance = entity.interactionDistance || 100;
                if (dist <= interactionDistance) {
                    const elemToTrigger = this.pendingTargetEntity;
                    this.pendingTargetEntity = null;
                    this.path = [];
                    this.isMoving = false;
                    handleEntityInteraction(elemToTrigger);
                }
            }
            checkPassiveTriggers() {
                const scene = projectData.scenes[currentSceneId];
                if (!scene || !this.player) return;
                const pPivot = this.getPlayerPivot();
                scene.elements.forEach(elem => {
                    if (elem.type === 'entidad' && elem.triggerType === 'passive' && checkCondition(elem.condition)) {
                        const box = this.getColliderBox(elem);
                        const closestX = Math.max(box.x, Math.min(pPivot.x, box.x + box.w));
                        const closestY = Math.max(box.y, Math.min(pPivot.y, box.y + box.h));
                        const dist = Math.hypot(pPivot.x - closestX, pPivot.y - closestY);
                        const interactionDistance = elem.interactionDistance || 100;
                        if (dist <= interactionDistance) {
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
                const el = document.getElementById(\`stage-el-\${elem.id}\`);
                if (el) {
                    el.style.left = \`\${elem.x}px\`;
                    el.style.top = \`\${elem.y}px\`;
                    const bottomY = Math.round(elem.y + elem.height);
                    el.style.zIndex = 100 + bottomY;
                }
            }
        }
        const movementEngine = new MovementEngine();

        function fitStage() {
            const stage = document.getElementById('stage');
            const viewport = document.getElementById('viewport-container');
            if (!stage || !viewport) return;
            const dim = getStageDimensions();
            stage.style.width = dim.width + 'px';
            stage.style.height = dim.height + 'px';
            const baseScale = Math.min(viewport.clientWidth / dim.width, viewport.clientHeight / dim.height);
            const finalScale = baseScale * cameraState.zoom;
            const player = projectData.scenes[currentSceneId]?.elements?.find(e => e.isPlayer);
            if (player) {
                const playerCenterX = player.x + (player.width / 2);
                const playerCenterY = player.y + (player.height / 2);
                const targetPanX = (viewport.clientWidth / 2) - (playerCenterX * finalScale);
                const targetPanY = (viewport.clientHeight / 2) - (playerCenterY * finalScale);
                if (cameraState.panX === 0 && cameraState.panY === 0) {
                    cameraState.panX = targetPanX;
                    cameraState.panY = targetPanY;
                } else {
                    cameraState.panX += (targetPanX - cameraState.panX) * 0.15;
                    cameraState.panY += (targetPanY - cameraState.panY) * 0.15;
                }
                stage.style.transformOrigin = '0 0';
                stage.style.transform = 'translate(' + cameraState.panX + 'px, ' + cameraState.panY + 'px) scale(' + finalScale + ')';
            } else {
                const centerX = (viewport.clientWidth - (dim.width * finalScale)) / 2;
                const centerY = (viewport.clientHeight - (dim.height * finalScale)) / 2;
                cameraState.panX = centerX;
                cameraState.panY = centerY;
                stage.style.transformOrigin = '0 0';
                stage.style.transform = 'translate(' + centerX + 'px, ' + centerY + 'px) scale(' + finalScale + ')';
            }
        }

        function resetCamera() {
            cameraState.zoom = 1;
            cameraState.panX = 0;
            cameraState.panY = 0;
        }

        function setupCameraControls() {
            const viewport = document.getElementById('viewport-container');
            let isPanning = false;
            let startPanX = 0, startPanY = 0;
            viewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
                cameraState.zoom = Math.max(cameraState.minZoom, Math.min(cameraState.maxZoom, cameraState.zoom * zoomFactor));
                fitStage();
            }, { passive: false });
            viewport.addEventListener('mousedown', (e) => {
                if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                    isPanning = true;
                    startPanX = e.clientX - cameraState.panX;
                    startPanY = e.clientY - cameraState.panY;
                    e.preventDefault();
                }
            });
            window.addEventListener('mousemove', (e) => {
                if (!isPanning) return;
                cameraState.panX = e.clientX - startPanX;
                cameraState.panY = e.clientY - startPanY;
                fitStage();
            });
            window.addEventListener('mouseup', () => {
                if (isPanning) isPanning = false;
            });
        }

        function renderStage() {
            const stage = document.getElementById('stage');
            const fadeOverlay = document.getElementById('fade-overlay');
            const dim = getStageDimensions();
            stage.style.width = dim.width + 'px';
            stage.style.height = dim.height + 'px';
            stage.innerHTML = '';
            const bgClipLayer = document.createElement('div');
            bgClipLayer.id = 'stage-background-clip';
            bgClipLayer.style.cssText = 'position:absolute; top:0; left:0; width:' + dim.width + 'px; height:' + dim.height + 'px; overflow:hidden; pointer-events:none; z-index:10;';
            stage.appendChild(bgClipLayer);
            if (fadeOverlay) stage.appendChild(fadeOverlay);
            const scene = projectData.scenes[currentSceneId];
            if (!scene) return;
            scene.elements.forEach(elem => {
                if (!checkCondition(elem.condition)) return;
                const el = document.createElement('div');
                el.className = 'stage-element layer-' + elem.type + (elem.isText ? ' text-element' : '');
                el.id = 'stage-el-' + elem.id;
                el.style.left = elem.x + 'px';
                el.style.top = elem.y + 'px';
                el.style.width = elem.width + 'px';
                el.style.height = elem.height + 'px';
                el.style.transform = 'rotate(' + (elem.rotation || 0) + 'deg)';
                if (elem.type === 'fondo') {
                    el.style.zIndex = 10;
                } else {
                    const bottomY = Math.round((elem.y || 0) + (elem.height || 0));
                    el.style.zIndex = 100 + bottomY;
                }
                if (elem.isText) {
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
                if (elem.type === 'entidad') el.style.cursor = 'pointer';
                if (elem.type === 'fondo') {
                    el.style.pointerEvents = 'auto';
                    bgClipLayer.appendChild(el);
                } else {
                    stage.appendChild(el);
                }
            });
            setupExportedPixelClicks();
            movementEngine.init();
            fitStage();
        }

        function setupExportedPixelClicks() {
            const stage = document.getElementById('stage');
            if (!stage || stage.dataset.pixelClickAttached) return;
            stage.dataset.pixelClickAttached = "true";
            stage.addEventListener('click', (e) => {
                if (e.shiftKey) return;
                if (e.target.closest('#game-ui') || e.target.closest('#inventory-bar') || e.target.closest('#dialog-box')) return;
                const stageRect = stage.getBoundingClientRect();
                const dim = getStageDimensions();
                const scaleX = dim.width / stageRect.width;
                const scaleY = dim.height / stageRect.height;
                const clickX = (e.clientX - stageRect.left) * scaleX;
                const clickY = (e.clientY - stageRect.top) * scaleY;
                const scene = projectData.scenes[currentSceneId];
                if (!scene) return;
                const elementsToCheck = [...scene.elements]
                    .filter(elem => elem.type === 'entidad' && elem.triggerType !== 'passive' && checkCondition(elem.condition))
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
                        const player = scene.elements.find(e => e.isPlayer);
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
            renderStage();
            if (elem.targetScene && projectData.scenes[elem.targetScene]) {
                changeSceneWithTransition(elem.targetScene, elem.targetX, elem.targetY);
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
                renderStage();
                setTimeout(() => {
                    if (fadeOverlay) fadeOverlay.style.opacity = '0';
                }, 50);
            }, 400);
        }

        window.addEventListener('resize', fitStage);
        document.addEventListener('DOMContentLoaded', () => {
            initRuntimeVariables();
            setupCameraControls();
            renderStage();
            inventoryManager.render();
        });
    `;
    const htmlTemplate = `<!DOCTYPE html> <html lang="es"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Aventura KOREH</title> <style> * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-font-smoothing: antialiased; } body { background-color: #000000; color: #1d1d1f; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; height: 100vh; width: 100vw; display: flex; justify-content: center; align-items: center; overflow: hidden; } #viewport-container { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; position: relative; cursor: grab; background: #000; } #stage { background: #ffffff; position: absolute; overflow: visible; transform-origin: center center; } .stage-element { position: absolute; transform-origin: center center; will-change: transform, left, top; } .stage-element.text-element { display: flex; align-items: center; justify-content: center; word-break: break-word; white-space: pre-wrap; line-height: 1.2; } .stage-element img { width: 100%; height: 100%; pointer-events: none; display: block; object-fit: fill; } #game-ui { position: absolute; inset: 0; pointer-events: none; z-index: 100000; display: block; } #dialog-box { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); width: 75%; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 16px; padding: 20px; color: #1d1d1f; font-size: 14px; line-height: 1.5; pointer-events: auto; display: none; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15); } .btn { background: #0071e3; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; float: right; margin-top: 12px; } #inventory-bar { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; flex-direction: row-reverse; gap: 10px; pointer-events: auto; z-index: 100000; } .inv-toggle-btn { position: relative; width: 42px; height: 42px; border-radius: 12px; background: #000000; border: none; color: #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); transition: transform 0.2s ease; flex-shrink: 0; } .inv-toggle-btn:hover { transform: scale(1.05); } .inv-total-badge { position: absolute; top: -4px; right: -4px; background: #ff3b30; color: #ffffff; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid #000000; } .inv-drawer { display: flex; align-items: center; gap: 8px; max-width: 0; opacity: 0; overflow-x: auto; overflow-y: hidden; padding: 0; border-radius: 14px; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: all 0.3s ease; white-space: nowrap; scrollbar-width: none; } .inv-drawer::-webkit-scrollbar { display: none; } .inv-drawer.open { max-width: 400px; opacity: 1; padding: 6px 10px; } .inv-slot { position: relative; min-width: 38px; width: 38px; height: 38px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; } .inv-slot img { max-width: 75%; max-height: 75%; object-fit: contain; } .inv-badge { position: absolute; bottom: -2px; right: -2px; background: #0071e3; color: #ffffff; font-size: 8px; font-weight: 700; padding: 2px 4px; border-radius: 4px; } .inv-empty-msg { font-size: 11px; color: rgba(255, 255, 255, 0.6); padding: 0 8px; } #fade-overlay { position: absolute; inset: 0; background: #000000; opacity: 0; pointer-events: none; transition: opacity 0.4s ease; z-index: 200000; } </style> </head> <body> <div id="viewport-container"> <div id="stage"></div> <div id="game-ui"> <div id="inventory-bar"></div> <div id="dialog-box"> <p id="dialog-text"></p> </div> </div> <div id="fade-overlay"></div> </div> <script> ` + runtimeScript + ` </script> </body> </html>`;
    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'juego_koreh_exportado.html';
    a.click();
    URL.revokeObjectURL(a.href);
}