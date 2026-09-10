// render.js - SISTEMA DE RENDERIZADO Y GENERACIÓN DEL ESCENARIO
let _lastRenderSceneId = null;
let _lastIsPlayMode = null;

function renderStage(instantCamera = false) {
    const stage = document.getElementById('stage');
    const fadeOverlay = document.getElementById('fade-overlay');
    if (!stage) return;

    const dim = getStageDimensions();
    const widthPx = dim.width + 'px';
    const heightPx = dim.height + 'px';
    if (stage.style.width !== widthPx) stage.style.width = widthPx;
    if (stage.style.height !== heightPx) stage.style.height = heightPx;

    const is3DView = isIsometricView || (cameraState.pitch !== undefined && cameraState.pitch !== 0) || (cameraState.rotation !== undefined && cameraState.rotation !== 0);
    const pitch = isIsometricView || is3DView ? (cameraState.pitch !== undefined ? cameraState.pitch : 60) : 0;
    const yaw = isIsometricView || is3DView ? (cameraState.rotation !== undefined ? cameraState.rotation : 0) : 0;

    if (is3DView) {
        if (!stage.classList.contains('is-mode-7')) stage.classList.add('is-mode-7');
    } else {
        if (stage.classList.contains('is-mode-7')) stage.classList.remove('is-mode-7');
    }

    const scene = projectData.scenes[currentSceneId];
    if (!scene) return;

    // Si cambió la escena o el modo de juego/editor, reseteamos el contenedor una sola vez
    const sceneOrModeChanged = (_lastRenderSceneId !== currentSceneId || _lastIsPlayMode !== isPlayMode);
    _lastRenderSceneId = currentSceneId;
    _lastIsPlayMode = isPlayMode;

    if (sceneOrModeChanged) {
        stage.innerHTML = '';
        if (fadeOverlay) stage.appendChild(fadeOverlay);
    } else {
        if (fadeOverlay && !stage.contains(fadeOverlay)) {
            stage.appendChild(fadeOverlay);
        }
        const oldWp = document.getElementById('stage-waypoints-overlay');
        if (oldWp) oldWp.remove();
    }

    // Mapa de elementos válidos a renderizar
    const activeElemMap = new Map();
    scene.elements.forEach(elem => {
        if (elem.type === 'fondo') {
            elem.x = 0;
            elem.y = 0;
            elem.width = dim.width;
            elem.height = dim.height;
        }

        if (isPlayMode && !checkCondition(elem.condition)) {
            return;
        }
        activeElemMap.set(elem.id, elem);
    });

    // Elimina del DOM únicamente los elementos que ya no existen en la escena
    const existingNodes = Array.from(stage.querySelectorAll('.stage-element'));
    existingNodes.forEach(node => {
        const nodeId = node.id.replace('stage-el-', '');
        if (!activeElemMap.has(nodeId)) {
            node.remove();
        }
    });

    // Actualiza en sitio o crea los nodos DOM necesarios sin reconstruir la escena entera
    scene.elements.forEach(elem => {
        if (!activeElemMap.has(elem.id)) return;

        let baseRotation = elem.rotation || 0;
        if (elem.isPlayer && isPlayMode && typeof movementEngine !== 'undefined' && movementEngine.facingAngle !== undefined) {
            baseRotation = movementEngine.facingAngle;
        }

        const renderSig = `${elem.image}_${elem.textContent}_${elem.textColor}_${elem.fontSize}_${elem.isText}_${elem.type}_${elem.billboardMode}_${elem.hasSkeletalAnim}_${elem.wallHeight}_${elem.wallDepth}_${selectedElementId === elem.id}_${activeCropElemId === elem.id}_${isPlayMode}_${is3DView}`;

        let el = document.getElementById(`stage-el-${elem.id}`);
        if (el && el.dataset.renderSig === renderSig) {
            applyTransformsAndStyles(el, elem, is3DView, baseRotation, yaw);
        } else {
            const newEl = renderElement(elem, dim, is3DView, yaw);
            newEl.dataset.renderSig = renderSig;
            if (el) {
                stage.replaceChild(newEl, el);
            } else {
                stage.appendChild(newEl);
            }
        }
    });

    if (!isPlayMode) {
        if (typeof setupEditorPixelPerfectSelection === 'function') {
            setupEditorPixelPerfectSelection();
        }
        if (selectedElementId) {
            const selectedElem = scene.elements.find(e => e.id === selectedElementId);
            if (selectedElem && selectedElem.movePattern === 'waypoints') {
                renderWaypointsOverlayOnStage(selectedElem);
            }
        }
    }

    if (isPlayMode) {
        if (typeof setupPixelPerfectClicks === 'function') {
            setupPixelPerfectClicks();
        }
    }

    fitStage(instantCamera);
}

function renderElement(elem, dim, is3DView, yaw) {
    const isIdleBreathing = isPlayMode && elem.isPlayer && !elem.hasSkeletalAnim;

    const el = document.createElement('div');
    el.className = `stage-element layer-${elem.type} ${elem.isText ? 'text-element' : ''} ${elem.id === selectedElementId && !isPlayMode ? 'selected' : ''} ${isIdleBreathing ? 'breathing-idle' : ''}`;
    el.id = `stage-el-${elem.id}`;

    let baseRotation = elem.rotation || 0;

    if (elem.isPlayer && isPlayMode && typeof movementEngine !== 'undefined' && movementEngine.facingAngle !== undefined) {
        baseRotation = movementEngine.facingAngle;
    }

    applyTransformsAndStyles(el, elem, is3DView, baseRotation, yaw);
    
    if ((elem.hasCollision || elem.isPlayer) && !isPlayMode) {
        renderCollisionGizmo(el, elem);
    }

    renderElementContent(el, elem, is3DView);

    if (!isPlayMode) {
        renderTransformControls(el, elem);
    } else {
        if (elem.type === 'entidad' && !elem.isPlayer) el.style.cursor = 'pointer';
    }

    return el;
}

function applyTransformsAndStyles(el, elem, is3DView, baseRotation, yaw) {
    const billboardMode = elem.billboardMode || 'camera';

    let transformStr = '';
    if (is3DView) {
        if (elem.type === 'fondo') {
            if (!el.classList.contains('mode7-ground')) el.classList.add('mode7-ground');
            transformStr = `rotate(${baseRotation}deg)`;
        } else {
            if (!el.classList.contains('mode7-billboard')) el.classList.add('mode7-billboard');
            if (el.style.transformStyle !== 'preserve-3d') el.style.transformStyle = 'preserve-3d';

            if (billboardMode === 'cross_x' && !elem.isText) {
                transformStr = `rotateX(-90deg) rotate(${baseRotation}deg)`;
            } else if (billboardMode === 'fixed') {
                transformStr = `rotateX(-90deg) rotate(${baseRotation}deg)`;
            } else if (billboardMode === 'flat' || billboardMode === 'plano') {
                el.classList.remove('mode7-billboard');
                if (!el.classList.contains('mode7-ground')) el.classList.add('mode7-ground');
                transformStr = `rotate(${baseRotation}deg)`;
            } else if (billboardMode === 'muro' || billboardMode === 'wall') {
                el.classList.remove('mode7-billboard');
                transformStr = `rotate(${baseRotation}deg)`;
            } else {
                transformStr = `rotateX(-90deg) rotateZ(${-yaw}deg) rotate(${baseRotation}deg)`;
            }
        }
    } else {
        el.classList.remove('mode7-billboard', 'mode7-ground');
        transformStr = `rotate(${baseRotation}deg)`;
    }

    if (el.style.transform !== transformStr) {
        el.style.transform = transformStr;
    }

    let zIdx = 10;
    if (elem.type === 'fondo') {
        zIdx = 10;
    } else if (elem.isGroundTexture || elem.billboardMode === 'flat') {
        zIdx = 20; 
    } else {
        const bottomY = Math.round((elem.y || 0) + (elem.height || 0));
        zIdx = 100 + bottomY;
    }

    const zIdxStr = String(zIdx);
    if (el.style.zIndex !== zIdxStr) {
        el.style.zIndex = zIdxStr;
    }

    const leftStr = elem.x + 'px';
    if (el.style.left !== leftStr) el.style.left = leftStr;

    const topStr = elem.y + 'px';
    if (el.style.top !== topStr) el.style.top = topStr;

    const widthStr = elem.width + 'px';
    if (el.style.width !== widthStr) el.style.width = widthStr;

    const heightStr = elem.height + 'px';
    if (el.style.height !== heightStr) el.style.height = heightStr;

    if (isPlayMode) {
        if (el.style.pointerEvents !== 'none') el.style.pointerEvents = 'none';
    } else {
        if (el.style.pointerEvents !== '') el.style.pointerEvents = '';
    }
}

function renderCollisionGizmo(el, elem) {
    const colGizmo = document.createElement('div');
    colGizmo.className = 'collision-box-gizmo';

    const cW = elem.collisionW !== undefined ? elem.collisionW : elem.width;
    const cH = elem.collisionH !== undefined ? elem.collisionH : elem.height;
    const cX = elem.collisionX !== undefined ? elem.collisionX : Math.round((elem.width - cW) / 2);
    const cY = elem.collisionY !== undefined ? elem.collisionY : (elem.height - cH);

    elem.collisionW = cW;
    elem.collisionH = cH;
    elem.collisionX = cX;
    elem.collisionY = cY;

    colGizmo.style.cssText = `
        position: absolute;
        left: ${cX}px;
        top: ${cY}px;
        width: ${cW}px;
        height: ${cH}px;
        border: 2px dashed #ff9500;
        background: rgba(255, 149, 0, 0.25);
        box-sizing: border-box;
        z-index: 10000;
        pointer-events: auto;
        cursor: move;
    `;

    colGizmo.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.classList.contains('handle-col-resize')) return;
        e.stopPropagation();
        let startX = e.clientX;
        let startY = e.clientY;
        let initialColX = elem.collisionX;
        let initialColY = elem.collisionY;
        let rafId = null;

        const onMouseMove = (ev) => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const { finalScale } = getCanvasWorldCoordinates(ev);
                const deltaX = (ev.clientX - startX) / finalScale;
                const deltaY = (ev.clientY - startY) / finalScale;

                elem.collisionX = Math.round(initialColX + deltaX);
                elem.collisionY = Math.round(initialColY + deltaY);

                colGizmo.style.left = elem.collisionX + 'px';
                colGizmo.style.top = elem.collisionY + 'px';

                if (typeof updatePropertiesPanel === 'function') {
                    updatePropertiesPanel();
                }
            });
        };

        const onMouseUp = () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            autoSaveJSON();
            renderStage();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });

    const colResizeHandle = document.createElement('div');
    colResizeHandle.className = 'handle-col-resize';
    colResizeHandle.style.cssText = `
        position: absolute;
        right: -5px;
        bottom: -5px;
        width: 10px;
        height: 10px;
        background: #ff9500;
        border: 1px solid #ffffff;
        border-radius: 2px;
        cursor: nwse-resize;
        z-index: 10001;
        pointer-events: auto;
    `;
    colGizmo.appendChild(colResizeHandle);
    el.appendChild(colGizmo);

    colResizeHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        let startX = e.clientX;
        let startY = e.clientY;
        let startW = elem.collisionW;
        let startH = elem.collisionH;
        let rafId = null;

        const onMouseMove = (ev) => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const { finalScale } = getCanvasWorldCoordinates(ev);
                const deltaX = (ev.clientX - startX) / finalScale;
                const deltaY = (ev.clientY - startY) / finalScale;

                let newW = Math.max(4, Math.round(startW + deltaX));
                let newH = Math.max(4, Math.round(startH + deltaY));

                elem.collisionW = newW;
                elem.collisionH = newH;

                colGizmo.style.width = newW + 'px';
                colGizmo.style.height = newH + 'px';

                if (typeof updatePropertiesPanel === 'function') {
                    updatePropertiesPanel();
                }
            });
        };

        const onMouseUp = () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            autoSaveJSON();
            renderStage();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });
}

function renderElementContent(el, elem, is3DView) {
    const billboardMode = elem.billboardMode || 'camera';

    if (elem.hasSkeletalAnim && !elem.isText && typeof skeletalAnimationEngine !== 'undefined') {
        const asset = assetsMap[elem.image];
        const rawImg = new Image();
        rawImg.src = asset ? (asset.dataUrl || asset.url) : elem.image;

        if (rawImg.complete && rawImg.naturalWidth > 0) {
            const deformedCanvas = skeletalAnimationEngine.renderDeformedImage(
                rawImg, elem, elem.skeletalClip || 'humanoid_idle', Date.now()
            );
            deformedCanvas.style.width = '100%';
            deformedCanvas.style.height = '100%';
            deformedCanvas.style.display = 'block';
            el.appendChild(deformedCanvas);
        } else {
            rawImg.onload = () => renderStage();
        }
    } else if (is3DView && elem.type !== 'fondo' && (billboardMode === 'muro' || billboardMode === 'wall') && !elem.isText) {
        const asset = assetsMap[elem.image];
        const imgSrc = asset ? (asset.dataUrl || asset.url) : elem.image;
        const W = elem.width;
        const D = elem.height; 
        const H = elem.wallHeight !== undefined ? elem.wallHeight : 100; 

        const createFace = (w, h, transform, filterStr) => {
            const face = document.createElement('div');
            face.style.cssText = `position: absolute; left: 0; top: 0; width: ${w}px; height: ${h}px; transform-origin: 0 0; transform: ${transform}; transform-style: preserve-3d; backface-visibility: visible; ${filterStr ? `filter: ${filterStr};` : ''}`;
            face.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;display:block;pointer-events:none;object-fit:fill;">`;
            return face;
        };

        el.appendChild(createFace(W, D, `translateZ(${H}px)`, 'brightness(1.05)'));
        el.appendChild(createFace(W, D, `translateZ(0px)`, 'brightness(0.6)'));
        el.appendChild(createFace(W, H, `translateY(${D}px) rotateX(90deg)`, 'brightness(0.95)'));
        el.appendChild(createFace(W, H, `rotateX(90deg)`, 'brightness(0.75)'));
        el.appendChild(createFace(D, H, `rotateY(90deg) rotateZ(90deg)`, 'brightness(0.85)'));
        el.appendChild(createFace(D, H, `translateX(${W}px) rotateY(90deg) rotateZ(90deg)`, 'brightness(0.9)'));

    } else if (is3DView && elem.type !== 'fondo' && billboardMode === 'cross_x' && !elem.isText) {
        const asset = assetsMap[elem.image];
        const imgSrc = asset ? asset.url : elem.image;
        const plane1 = document.createElement('div');
        plane1.className = 'mode7-cross-plane';
        plane1.style.transform = 'rotateY(0deg)';
        plane1.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;display:block;pointer-events:none;object-fit:fill;">`;
        const plane2 = document.createElement('div');
        plane2.className = 'mode7-cross-plane';
        plane2.style.transform = 'rotateY(90deg)';
        plane2.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;display:block;pointer-events:none;object-fit:fill;">`;
        el.appendChild(plane1);
        el.appendChild(plane2);
    } else if (elem.isText) {
        el.textContent = elem.textContent || '';
        el.style.fontSize = (elem.fontSize || 24) + 'px';
        el.style.fontFamily = elem.fontFamily || 'Arial, sans-serif';
        el.style.color = elem.textColor || '#1d1d1f';

        const outline = elem.textOutline ? `-1px -1px 0 ${elem.textOutlineColor || '#000'}, 1px -1px 0 ${elem.textOutlineColor || '#000'}, -1px 1px 0 ${elem.textOutlineColor || '#000'}, 1px 1px 0 ${elem.textOutlineColor || '#000'}` : '';
        const shadow = elem.textShadow ? `0px 4px 8px ${elem.textShadowColor || 'rgba(0,0,0,0.5)'}` : '';
        const glow = elem.textGlow ? `0px 0px 12px ${elem.textGlowColor || '#0071e3'}` : '';
        const textEffects = [outline, shadow, glow].filter(Boolean).join(', ');
        el.style.textShadow = textEffects || 'none';
    } else {
        const img = document.createElement('img');
        const asset = assetsMap[elem.image];
        img.src = asset ? asset.url : elem.image;
        el.appendChild(img);
    }
}

function renderTransformControls(el, elem) {
    const rotateHandle = document.createElement('div');
    rotateHandle.className = 'handle-rotate';
    el.appendChild(rotateHandle);

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'handle-resize';
    el.appendChild(resizeHandle);

    if (typeof setupTransformControls === 'function') {
        setupTransformControls(el, elem, rotateHandle, resizeHandle);
    }

    if (activeCropElemId === elem.id && typeof renderCropGizmo === 'function') {
        renderCropGizmo(el, elem);
    }
}

function renderWaypointsOverlayOnStage(elem) {
    const stage = document.getElementById('stage');
    const viewport = document.getElementById('viewport-container');
    if (!stage || !viewport) return;

    if (!elem.waypoints) elem.waypoints = [];

    const overlay = document.createElement('div');
    overlay.id = 'stage-waypoints-overlay';
    overlay.style.cssText = `
        position: absolute; inset: 0; pointer-events: none; z-index: 90000;
    `;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'width:100%; height:100%; position:absolute; top:0; left:0; pointer-events:none;';

    const colW = elem.collisionW !== undefined ? elem.collisionW : elem.width;
    const colH = elem.collisionH !== undefined ? elem.collisionH : elem.height;
    const offX = elem.collisionX !== undefined ? elem.collisionX : Math.round((elem.width - colW) / 2);
    const offY = elem.collisionY !== undefined ? elem.collisionY : (elem.height - colH);

    const originPivot = {
        x: elem.x + offX + colW / 2,
        y: elem.y + offY + colH
    };

    const points = [originPivot, ...elem.waypoints];

    if (points.length > 1) {
        let pathStr = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            pathStr += ` L ${points[i].x} ${points[i].y}`;
        }
        if (elem.waypointLoop === 'loop' && points.length > 2) {
            pathStr += ` Z`;
        }

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', pathStr);
        pathEl.setAttribute('stroke', '#0071e3');
        pathEl.setAttribute('stroke-width', '3');
        pathEl.setAttribute('stroke-dasharray', '6 4');
        pathEl.setAttribute('fill', 'none');
        svg.appendChild(pathEl);
    }

    overlay.appendChild(svg);

    elem.waypoints.forEach((wp, index) => {
        const node = document.createElement('div');
        node.className = 'waypoint-node-gizmo';
        node.style.cssText = `
            position: absolute; left: ${wp.x - 12}px; top: ${wp.y - 12}px;
            width: 24px; height: 24px; border-radius: 50%;
            background: #0071e3; color: white; border: 2px solid #ffffff;
            font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3); cursor: grab; pointer-events: auto; z-index: 90001;
        `;
        node.textContent = index + 1;

        node.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            node.style.cursor = 'grabbing';
            let startX = e.clientX;
            let startY = e.clientY;
            let initialX = wp.x;
            let initialY = wp.y;

            const onMouseMove = (ev) => {
                const { finalScale } = getCanvasWorldCoordinates(ev);
                const dx = (ev.clientX - startX) / finalScale;
                const dy = (ev.clientY - startY) / finalScale;

                wp.x = Math.round(initialX + dx);
                wp.y = Math.round(initialY + dy);
                renderStage();
            };

            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                autoSaveJSON();
                if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });

        node.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            elem.waypoints.splice(index, 1);
            autoSaveJSON();
            renderStage();
            if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
        });

        overlay.appendChild(node);
    });

    if (isRouteEditingMode) {
        stage.style.cursor = 'crosshair';
        overlay.style.pointerEvents = 'auto';
        overlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('waypoint-node-gizmo')) return;
            e.stopPropagation();
            const { clickX, clickY } = getCanvasWorldCoordinates(e);
            elem.waypoints.push({ x: clickX, y: clickY });
            autoSaveJSON();
            renderStage();
            if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
        });
    }

    stage.appendChild(overlay);
}