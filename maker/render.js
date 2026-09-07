// render.js - RENDERIZADO COMPLETO DEL ESCENARIO Y CONTROL DE TRANSFORMACIONES
function renderStage() {
    const stage = document.getElementById('stage');
    const fadeOverlay = document.getElementById('fade-overlay');
    if (!stage) return;

    const dim = getStageDimensions();
    stage.style.width = dim.width + 'px';
    stage.style.height = dim.height + 'px';
    stage.innerHTML = '';

    if (fadeOverlay) stage.appendChild(fadeOverlay);

    const scene = projectData.scenes[currentSceneId];
    if (!scene) return;

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

        const el = document.createElement('div');
        el.className = `stage-element layer-${elem.type} ${elem.isText ? 'text-element' : ''} ${elem.id === selectedElementId && !isPlayMode ? 'selected' : ''}`;
        el.id = `stage-el-${elem.id}`;
        el.style.left = elem.x + 'px';
        el.style.top = elem.y + 'px';
        el.style.width = elem.width + 'px';
        el.style.height = elem.height + 'px';
        el.style.transform = `rotate(${elem.rotation || 0}deg)`;

        if (elem.type === 'fondo') {
            el.style.zIndex = 10;
        } else {
            const bottomY = Math.round((elem.y || 0) + (elem.height || 0));
            el.style.zIndex = 100 + bottomY;
        }
        if (isPlayMode) {
            el.style.pointerEvents = 'none';
        }

        // GIZMO Y EDICIÓN DE CAJA DE COLISIÓN (Editor)
        if ((elem.hasCollision || elem.isPlayer) && !isPlayMode) {
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
                cursor: move;
            `;
            colGizmo.addEventListener('mousedown', (e) => {
                if (e.button !== 0 || e.target.classList.contains('handle-col-resize')) return;
                e.stopPropagation();
                selectElement(elem.id);
                let startX = e.clientX;
                let startY = e.clientY;
                let startColX = elem.collisionX;
                let startColY = elem.collisionY;
                let rafId = null;

                const onMouseMove = (ev) => {
                    if (rafId) cancelAnimationFrame(rafId);
                    rafId = requestAnimationFrame(() => {
                        const deltaX = ev.clientX - startX;
                        const deltaY = ev.clientY - startY;
                        elem.collisionX = Math.round(startColX + deltaX);
                        elem.collisionY = Math.round(startColY + deltaY);
                        colGizmo.style.left = elem.collisionX + 'px';
                        colGizmo.style.top = elem.collisionY + 'px';
                        if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
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
                        const deltaX = ev.clientX - startX;
                        const deltaY = ev.clientY - startY;
                        let newW = Math.max(4, Math.round(startW + deltaX));
                        let newH = Math.max(4, Math.round(startH + deltaY));
                        elem.collisionW = newW;
                        elem.collisionH = newH;
                        colGizmo.style.width = newW + 'px';
                        colGizmo.style.height = newH + 'px';
                        if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
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

        if (elem.isText) {
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

        if (!isPlayMode) {
            const rotateHandle = document.createElement('div');
            rotateHandle.className = 'handle-rotate';
            el.appendChild(rotateHandle);

            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'handle-resize';
            el.appendChild(resizeHandle);

            setupTransformControls(el, elem, rotateHandle, resizeHandle);

            el.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                if (e.target === rotateHandle || e.target === resizeHandle || e.target.classList.contains('handle-col-resize') || e.target.classList.contains('collision-box-gizmo') || e.target.closest('.crop-overlay-gizmo')) return;
                selectElement(elem.id);
            });

            if (activeCropElemId === elem.id) {
                renderCropGizmo(el, elem);
            }
        } else {
            if (elem.type === 'entidad' && !elem.isPlayer) el.style.cursor = 'pointer';
        }

        stage.appendChild(el);
    });

    if (!isPlayMode && selectedElementId) {
        const selectedElem = scene.elements.find(e => e.id === selectedElementId);
        if (selectedElem && selectedElem.movePattern === 'waypoints') {
            renderWaypointsOverlayOnStage(selectedElem);
        }
    }

    if (isPlayMode) {
        setupPixelPerfectClicks();
        if (typeof movementEngine !== 'undefined') movementEngine.init();
    } else {
        if (typeof movementEngine !== 'undefined') movementEngine.stop();
    }

    fitStage();
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
                const dim = getStageDimensions();
                const padding = isPlayMode ? 0 : 40;
                const availableWidth = Math.max(100, viewport.clientWidth - padding);
                const availableHeight = Math.max(100, viewport.clientHeight - padding);
                const baseScale = Math.min(availableWidth / dim.width, availableHeight / dim.height);
                const effectiveScale = isPlayMode ? baseScale : Math.max(baseScale, 0.05);
                const finalScale = effectiveScale * cameraState.zoom;

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

            const dim = getStageDimensions();
            const padding = isPlayMode ? 0 : 40;
            const availableWidth = Math.max(100, viewport.clientWidth - padding);
            const availableHeight = Math.max(100, viewport.clientHeight - padding);
            const baseScale = Math.min(availableWidth / dim.width, availableHeight / dim.height);
            const effectiveScale = isPlayMode ? baseScale : Math.max(baseScale, 0.05);
            const finalScale = effectiveScale * cameraState.zoom;

            const baseCenterX = (viewport.clientWidth - (dim.width * finalScale)) / 2;
            const baseCenterY = (viewport.clientHeight - (dim.height * finalScale)) / 2;
            const currentPanX = baseCenterX + cameraState.panX;
            const currentPanY = baseCenterY + cameraState.panY;

            const viewportRect = viewport.getBoundingClientRect();
            const mouseViewportX = e.clientX - viewportRect.left;
            const mouseViewportY = e.clientY - viewportRect.top;

            const clickX = Math.round((mouseViewportX - currentPanX) / finalScale);
            const clickY = Math.round((mouseViewportY - currentPanY) / finalScale);

            elem.waypoints.push({ x: clickX, y: clickY });
            autoSaveJSON();
            renderStage();
            if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
        });
    }
    stage.appendChild(overlay);
}

function selectElement(id) {
    if (selectedElementId === id) return;
    if (selectedElementId) {
        const prevEl = document.getElementById(`stage-el-${selectedElementId}`);
        if (prevEl) prevEl.classList.remove('selected');
    }
    selectedElementId = id;
    if (selectedElementId) {
        const currentEl = document.getElementById(`stage-el-${selectedElementId}`);
        if (currentEl) currentEl.classList.add('selected');
    }
    activeCropElemId = null;
    renderStage();
    updatePropertiesPanel();
}

function setupTransformControls(el, data, rotateHandle, resizeHandle) {
    let isDragging = false, isResizing = false, isRotating = false;
    let startX, startY, startW, startH, startAngle;
    let rafId = null;

    el.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.shiftKey) return;
        if (e.target === rotateHandle || e.target === resizeHandle || e.target.classList.contains('handle-col-resize') || e.target.classList.contains('collision-box-gizmo') || e.target.closest('.crop-overlay-gizmo')) return;
        isDragging = true;
        startX = e.clientX - data.x;
        startY = e.clientY - data.y;
        e.stopPropagation();
    });

    resizeHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = data.width;
        startH = data.height;
        e.stopPropagation();
    });

    rotateHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isRotating = true;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) - (data.rotation * Math.PI / 180);
        e.stopPropagation();
    });

    const onMouseMove = (e) => {
        if (!isDragging && !isResizing && !isRotating) return;
        if (rafId) cancelAnimationFrame(rafId);

        rafId = requestAnimationFrame(() => {
            if (isDragging) {
                data.x = Math.round(e.clientX - startX);
                data.y = Math.round(e.clientY - startY);
                el.style.left = data.x + 'px';
                el.style.top = data.y + 'px';
                if (data.type !== 'fondo') {
                    const bottomY = Math.round(data.y + data.height);
                    el.style.zIndex = 100 + bottomY;
                }
            } else if (isResizing) {
                const asset = assetsMap[data.image];
                let newW = Math.max(20, Math.round(startW + (e.clientX - startX)));
                let newH = Math.max(20, Math.round(startH + (e.clientY - startY)));
                const shouldKeepAspect = e.shiftKey || data.keepAspect;

                if (shouldKeepAspect && asset) {
                    newH = Math.round(newW / asset.aspect);
                }
                data.width = newW;
                data.height = newH;
                el.style.width = data.width + 'px';
                el.style.height = data.height + 'px';
                if (data.isText) data._textCanvas = null;
                if (data.type !== 'fondo') {
                    const bottomY = Math.round(data.y + data.height);
                    el.style.zIndex = 100 + bottomY;
                }
            } else if (isRotating) {
                const rect = el.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const rad = Math.atan2(e.clientY - centerY, e.clientX - centerX) - startAngle;
                data.rotation = Math.round(rad * (180 / Math.PI));
                el.style.transform = `rotate(${data.rotation}deg)`;
            }
        });
    };

    const onMouseUp = () => {
        if (isDragging || isResizing || isRotating) {
            isDragging = isResizing = isRotating = false;
            if (rafId) cancelAnimationFrame(rafId);
            autoSaveJSON();
            renderStage();
        }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}