// render-transform.js - CONTROLES DE TRANSFORMACIÓN (ARRASTRE, ESCALADO Y ROTACIÓN DE ELEMENTOS)
function setupTransformControls(el, data, rotateHandle, resizeHandle) {
    let isDragging = false, isResizing = false, isRotating = false;
    let startX, startY, startW, startH, startAngle;
    let startElemX, startElemY;
    let rafId = null;

    el._startDragFunction = (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startElemX = data.x;
        startElemY = data.y;
    };

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
            const { finalScale } = getCanvasWorldCoordinates(e);

            if (isDragging) {
                const deltaX = (e.clientX - startX) / finalScale;
                const deltaY = (e.clientY - startY) / finalScale;
                data.x = Math.round(startElemX + deltaX);
                data.y = Math.round(startElemY + deltaY);
                el.style.left = data.x + 'px';
                el.style.top = data.y + 'px';
                if (data.type !== 'fondo') {
                    const bottomY = Math.round(data.y + data.height);
                    el.style.zIndex = 100 + bottomY;
                }
            } else if (isResizing) {
                const asset = assetsMap[data.image];
                const deltaX = (e.clientX - startX) / finalScale;
                const deltaY = (e.clientY - startY) / finalScale;
                let newW = Math.max(20, Math.round(startW + deltaX));
                let newH = Math.max(20, Math.round(startH + deltaY));

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
            if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
        }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}