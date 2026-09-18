// export-runtime-core.js - SUBMÓDULO DE EXPORTACIÓN CON LIBRERÍA DE RUNTIME DE SCRIPTING
function buildExportRuntimeCore(assetsData) {
    return `
        const CAMERA_SETTINGS = {
            minPitch: 40,
            maxPitch: 88,
            headScreenOffsetPx: 350,
            zoomLerp: 0.12,
            cameraLerp: 0.08
        };
        const projectData = ` + JSON.stringify(projectData) + `;
        const assetsData = ` + JSON.stringify(assetsData || {}) + `;
        const canvasCache = {};
        let currentSceneId = projectData.startScene || Object.keys(projectData.scenes)[0];
        let gameState = { variables: {} };
        let cameraState = { zoom: 1, targetZoom: 1, focusX: 0, focusY: 0, panX: 0, panY: 0, rotation: 0, pitch: 60, minZoom: 0.5, maxZoom: 3.0 };
        const isPlayMode = true;
        let isIsometricView = true;
        let cachedViewportDimensions = { width: 0, height: 0 };

        // SCRIPTING RUNTIME INCUSTADO EN JUEGO EXPORTADO
        class ExportElementScriptRuntime {
            constructor() {
                this.compiledScripts = new Map();
            }

            createSandboxEvaluator(codeString, parameterNames = ['self', 'scene', 'variables', 'input', 'audio', 'interface', 'dt']) {
                if (!codeString || !codeString.trim()) return null;
                try {
                    const shadowGlobals = "const window=undefined; const document=undefined; const fetch=undefined;";
                    return new Function(...parameterNames, shadowGlobals + "\\n" + codeString);
                } catch (e) {
                    console.error("[ScriptSyntaxError]", e);
                    return null;
                }
            }

            compileElementScripts(elem) {
                if (!elem) return;
                if (!elem.state || typeof elem.state !== 'object') elem.state = {};
                const scriptData = elem.customScript || {
                    init: elem.scriptInit || '',
                    update: elem.scriptUpdate || '',
                    interact: elem.scriptInteract || '',
                    destroy: elem.scriptDestroy || ''
                };

                this.compiledScripts.set(elem.id, {
                    onInit: scriptData.init ? this.createSandboxEvaluator(scriptData.init) : null,
                    onUpdate: scriptData.update ? this.createSandboxEvaluator(scriptData.update, ['self', 'scene', 'variables', 'input', 'audio', 'interface', 'dt']) : null,
                    onInteract: scriptData.interact ? this.createSandboxEvaluator(scriptData.interact, ['self', 'scene', 'variables', 'input', 'audio', 'interface', 'player']) : null,
                    onDestroy: scriptData.destroy ? this.createSandboxEvaluator(scriptData.destroy) : null,
                    initialized: false
                });
            }

            buildContext(elem) {
                const currentScene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
                const selfObj = {
                    get id() { return elem.id; },
                    get x() { return elem.x; }, set x(v) { elem.x = Number(v) || 0; },
                    get y() { return elem.y; }, set y(v) { elem.y = Number(v) || 0; },
                    get width() { return elem.width; }, set width(v) { elem.width = Number(v) || 1; },
                    get height() { return elem.height; }, set height(v) { elem.height = Number(v) || 1; },
                    get rotation() { return elem.rotation || 0; }, set rotation(v) { elem.rotation = Number(v) || 0; },
                    get opacity() { return elem.opacity !== undefined ? elem.opacity : 1; }, set opacity(v) { elem.opacity = Math.max(0, Math.min(1, Number(v))); },
                    get state() { return elem.state; },
                    setPosition: (x, y) => { elem.x = Number(x); elem.y = Number(y); },
                    setSize: (w, h) => { elem.width = Number(w); elem.height = Number(h); }
                };

                const sceneAPI = {
                    id: currentSceneId,
                    getElement: (id) => {
                        const found = currentScene?.elements?.find(e => e.id === id);
                        return found ? this.buildContext(found).self : null;
                    }
                };

                const variablesAPI = {
                    get: (key) => gameState.variables[key],
                    set: (key, val) => { gameState.variables[key] = val; }
                };

                const interfaceAPI = {
                    showDialog: (text) => {
                        const box = document.getElementById('dialog-box');
                        const txt = document.getElementById('dialog-text');
                        if (box && txt) { txt.textContent = text; box.style.display = 'block'; }
                    }
                };

                return { self: selfObj, scene: sceneAPI, variables: variablesAPI, input: {}, audio: {}, interface: interfaceAPI };
            }

            runInit(elem) {
                if (!this.compiledScripts.has(elem.id)) this.compileElementScripts(elem);
                const compiled = this.compiledScripts.get(elem.id);
                if (compiled && compiled.onInit && !compiled.initialized) {
                    try {
                        const ctx = this.buildContext(elem);
                        compiled.onInit(ctx.self, ctx.scene, ctx.variables, ctx.input, ctx.audio, ctx.interface);
                    } catch (e) { console.error(e); }
                    compiled.initialized = true;
                }
            }

            runUpdate(elem, dt) {
                if (!this.compiledScripts.has(elem.id)) this.compileElementScripts(elem);
                const compiled = this.compiledScripts.get(elem.id);
                if (!compiled) return;
                if (!compiled.initialized && compiled.onInit) this.runInit(elem);
                if (compiled.onUpdate) {
                    try {
                        const ctx = this.buildContext(elem);
                        compiled.onUpdate(ctx.self, ctx.scene, ctx.variables, ctx.input, ctx.audio, ctx.interface, dt);
                    } catch (e) { console.error(e); }
                }
            }

            runInteract(elem, player) {
                if (!this.compiledScripts.has(elem.id)) this.compileElementScripts(elem);
                const compiled = this.compiledScripts.get(elem.id);
                if (compiled && compiled.onInteract) {
                    try {
                        const ctx = this.buildContext(elem);
                        compiled.onInteract(ctx.self, ctx.scene, ctx.variables, ctx.input, ctx.audio, ctx.interface, player);
                    } catch (e) { console.error(e); }
                }
            }
        }

        const elementScriptRuntime = new ExportElementScriptRuntime();

        function updateViewportCache() {
            const viewport = document.getElementById('viewport-container');
            if (viewport) {
                cachedViewportDimensions.width = viewport.clientWidth;
                cachedViewportDimensions.height = viewport.clientHeight;
            }
        }

        function togglePerspectiveMode() {
            isIsometricView = !isIsometricView;
            const btn = document.getElementById('view-toggle-btn');
            if (btn) {
                btn.textContent = isIsometricView ? 'Modo: 2.5D' : 'Modo: 2D';
                btn.classList.toggle('active', isIsometricView);
            }
            if (isIsometricView) {
                if (cameraState.pitch === undefined || cameraState.pitch === 0) {
                    cameraState.pitch = 60;
                }
            } else {
                cameraState.pitch = 0;
                cameraState.rotation = 0;
            }
            renderStage(false);
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
                const hasItem = (typeof inventoryManager !== 'undefined' && inventoryManager) ? inventoryManager.hasItem(cond.itemId) : false;
                if (cond.itemState === 'has') return hasItem;
                if (cond.itemState === 'not_has') return !hasItem;
            }
            return true;
        }

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
            
            const refWidth = (projectData && projectData.baseWidth) ? parseInt(projectData.baseWidth, 10) : 1920;
            const refHeight = (projectData && projectData.baseHeight) ? parseInt(projectData.baseHeight, 10) : 1080;
            const baseScale = Math.min(vw / refWidth, vh / refHeight);
            const finalScale = baseScale * cameraState.zoom;
            
            const fx = cameraState.focusX !== undefined ? cameraState.focusX : (dim.width / 2);
            const fy = cameraState.focusY !== undefined ? cameraState.focusY : (dim.height / 2);
            
            const pitch = isIsometricView ? (cameraState.pitch !== undefined ? cameraState.pitch : 60) : 0;
            const yaw = isIsometricView ? (cameraState.rotation !== undefined ? cameraState.rotation : 0) : 0;
            const screenOffsetY = getScreenOffsetY();
            
            const dyCenter = mouseY - (vh / 2);
            const perspectiveD = 1200;
            let X2, Y2;
            
            if (isIsometricView && Math.abs(pitch) > 0.1) {
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
            
            const refWidth = (projectData && projectData.baseWidth) ? parseInt(projectData.baseWidth, 10) : 1920;
            const refHeight = (projectData && projectData.baseHeight) ? parseInt(projectData.baseHeight, 10) : 1080;
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
            
            const player = scene ? (scene.elements.find(e => e.isPlayer) || scene.elements.find(e => e.type === 'entidad')) : null;
            
            if (player) {
                if (isIsometricView) {
                    const targetPitch = CAMERA_SETTINGS.minPitch + (CAMERA_SETTINGS.maxPitch - CAMERA_SETTINGS.minPitch) * zoomRatio;
                    if (cameraState.pitch === undefined) cameraState.pitch = 60;
                    cameraState.pitch += (targetPitch - cameraState.pitch) * CAMERA_SETTINGS.zoomLerp;
                } else {
                    cameraState.pitch = 0;
                }
                const targetFocusX = player.x + (player.width / 2);
                const targetFocusY = player.y + player.height;
                screenOffsetY = CAMERA_SETTINGS.headScreenOffsetPx * zoomRatio;
                if (instantCamera) {
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
            cameraState.rotation = 0;
            cameraState.pitch = 60;
            cameraState.minZoom = 0.5;
            cameraState.maxZoom = 3.0;
        }

        function setupCameraControls() {
            const viewport = document.getElementById('viewport-container');
            if (!viewport || viewport.dataset.cameraControlsAttached) return;
            viewport.dataset.cameraControlsAttached = "true";
            
            let isPanning = false;
            let isRotating = false;
            let startPanX = 0, startPanY = 0;
            let panAnimationFrame = null;
            
            viewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
                const currentTarget = cameraState.targetZoom !== undefined ? cameraState.targetZoom : cameraState.zoom;
                cameraState.targetZoom = Math.max(cameraState.minZoom, Math.min(cameraState.maxZoom, currentTarget * zoomFactor));
                fitStage(false);
            }, { passive: false });
            
            viewport.addEventListener('mousedown', (e) => {
                if (e.target.closest('#view-toggle-btn') || e.target.closest('#btn-quick-save') || e.target.closest('#main-game-menu')) return;
                if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
                    isRotating = true;
                    startPanX = e.clientX;
                    viewport.style.cursor = 'grabbing';
                } else if (e.button === 1) {
                    isPanning = true;
                    startPanX = e.clientX;
                    startPanY = e.clientY;
                    viewport.style.cursor = 'grabbing';
                }
            });
            
            window.addEventListener('mousemove', (e) => {
                if (!isPanning && !isRotating) return;
                if (panAnimationFrame) cancelAnimationFrame(panAnimationFrame);
                panAnimationFrame = requestAnimationFrame(() => {
                    if (isRotating && isIsometricView) {
                        const deltaX = e.clientX - startPanX;
                        cameraState.rotation = (cameraState.rotation + deltaX * 0.5) % 360;
                        startPanX = e.clientX;
                        renderStage(false);
                    } else if (isPanning) {
                        const vw = cachedViewportDimensions.width || window.innerWidth;
                        const vh = cachedViewportDimensions.height || window.innerHeight;
                        const refWidth = (projectData && projectData.baseWidth) ? parseInt(projectData.baseWidth, 10) : 1920;
                        const refHeight = (projectData && projectData.baseHeight) ? parseInt(projectData.baseHeight, 10) : 1080;
                        const baseScale = Math.min(vw / refWidth, vh / refHeight);
                        const finalScale = baseScale * cameraState.zoom;
                        const pitch = isIsometricView ? (cameraState.pitch !== undefined ? cameraState.pitch : 60) : 0;
                        const cosAngle = Math.max(0.1, Math.cos(pitch * Math.PI / 180));
                        const deltaX = (e.clientX - startPanX) / finalScale;
                        const deltaY = (e.clientY - startPanY) / (finalScale * cosAngle);
                        cameraState.focusX -= deltaX;
                        cameraState.focusY -= deltaY;
                        startPanX = e.clientX;
                        startPanY = e.clientY;
                        fitStage(false);
                    }
                });
            });
            
            window.addEventListener('mouseup', () => {
                if (isPanning || isRotating) {
                    isPanning = false;
                    isRotating = false;
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
            
            const pitch = isIsometricView ? (cameraState.pitch !== undefined ? cameraState.pitch : 60) : 0;
            const yaw = isIsometricView ? (cameraState.rotation !== undefined ? cameraState.rotation : 0) : 0;
            
            if (isIsometricView) {
                stage.classList.add('is-mode-7');
            } else {
                stage.classList.remove('is-mode-7');
            }
            
            const scene = projectData.scenes[currentSceneId];
            if (!scene) return;
            
            scene.elements.forEach(elem => {
                if (!checkCondition(elem.condition)) {
                    return;
                }
                const el = document.createElement('div');
                el.className = 'stage-element layer-' + elem.type + (elem.isText ? ' text-element' : '');
                el.id = 'stage-el-' + elem.id;
                const posX = Math.round(elem.x);
                const posY = Math.round(elem.y);
                el.style.left = posX + 'px';
                el.style.top = posY + 'px';
                el.style.width = elem.width + 'px';
                el.style.height = elem.height + 'px';
                if (elem.opacity !== undefined) el.style.opacity = elem.opacity;

                const baseRotation = elem.rotation || 0;
                const billboardMode = elem.billboardMode || 'camera';
                
                if (isIsometricView) {
                    if (elem.type === 'fondo') {
                        el.classList.add('mode7-ground');
                        el.style.transformStyle = 'preserve-3d';
                        el.style.transform = 'rotate(' + baseRotation + 'deg)';
                    } else {
                        el.classList.add('mode7-billboard');
                        el.style.transformStyle = 'preserve-3d';
                        if (billboardMode === 'cross_x' && !elem.isText) {
                            el.style.transform = 'rotateX(-90deg) rotate(' + baseRotation + 'deg)';
                        } else if (billboardMode === 'fixed') {
                            el.style.transform = 'rotateX(-90deg) rotate(' + baseRotation + 'deg)';
                        } else if (billboardMode === 'flat' || billboardMode === 'plano' || billboardMode === 'suelo') {
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
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.display = 'block';
                    img.style.pointerEvents = 'none';
                    img.style.objectFit = 'fill';
                    el.appendChild(img);
                }
                if (elem.type === 'entidad' && !elem.isPlayer) el.style.cursor = 'pointer';
                stage.appendChild(el);
            });
            setupExportedPixelClicks();
            if (typeof movementEngine !== 'undefined' && movementEngine) {
                movementEngine.init();
            }
            fitStage(instantCamera);
        }

        function setupExportedPixelClicks() {
            const viewport = document.getElementById('viewport-container');
            if (!viewport || viewport.dataset.pixelClickAttached) return;
            viewport.dataset.pixelClickAttached = "true";
            viewport.addEventListener('click', (e) => {
                if (e.shiftKey) return;
                if (e.target.closest('#game-ui') || e.target.closest('#inventory-bar') || e.target.closest('#dialog-box') || e.target.closest('#view-toggle-btn') || e.target.closest('#btn-quick-save') || e.target.closest('#main-game-menu')) return;
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

            // Invocación del Lifecycle Script onInteract
            const scene = projectData.scenes[currentSceneId];
            const player = scene ? scene.elements.find(e => e.isPlayer) : null;
            if (typeof elementScriptRuntime !== 'undefined') {
                elementScriptRuntime.runInteract(elem, player);
            }

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
            renderStage(false);
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
                renderStage(false);
                setTimeout(() => {
                    if (fadeOverlay) fadeOverlay.style.opacity = '0';
                }, 50);
            }, 400);
        }
    `;
}