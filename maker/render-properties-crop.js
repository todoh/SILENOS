// render-properties-crop.js - HERRAMIENTA DE RECORTE INLINE
function openInlineCropTool(elem) {
    let inlineCropSection = document.getElementById('inline-crop-section');
    const propsContent = document.getElementById('props-content');
    if (!propsContent) return;

    if (!inlineCropSection) {
        inlineCropSection = document.createElement('div');
        inlineCropSection.id = 'inline-crop-section';
        inlineCropSection.style.cssText = 'display: flex; flex-direction: column; gap: 8px; background: #1e1e24; padding: 10px; border-radius: 8px; color: white; margin-top: 8px; border: 1px solid #333;';
        propsContent.appendChild(inlineCropSection);
    }

    const asset = typeof assetsMap !== 'undefined' ? assetsMap[elem.image] : null;
    if (!asset) {
        alert("No hay una imagen válida para recortar.");
        return;
    }

    inlineCropSection.style.display = 'flex';
    inlineCropSection.innerHTML = `
        <div style="font-size: 10px; font-weight: bold; color: #34c759; display: flex; justify-content: space-between; align-items: center;">
            <span>RECORTE DE IMAGEN INLINE</span>
            <button id="btn-close-inline-crop" style="background:none; border:none; color:white; font-size:14px; cursor:pointer;">&times;</button>
        </div>
        <div style="width: 100%; height: 160px; background: #2a2a32; border-radius: 6px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; border: 1px dashed #555;">
            <canvas id="inline-crop-canvas" width="220" height="150" style="max-width: 100%; max-height: 100%; cursor: crosshair; object-fit: contain;"></canvas>
        </div>
        <span style="font-size: 9px; color: #aaa; text-align: center;">Arrastra con el ratón sobre la imagen para seleccionar el área.</span>
        <button class="btn" id="btn-apply-inline-crop" style="background: #34c759; color: white; border: none; font-weight: 600; padding: 6px; font-size: 10px; cursor: pointer;">Aplicar Recorte</button>
    `;

    document.getElementById('btn-close-inline-crop').onclick = () => {
        inlineCropSection.style.display = 'none';
    };

    const canvas = document.getElementById('inline-crop-canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    let cropRect = null;
    let isDragging = false;
    let startPos = { x: 0, y: 0 };

    const drawPreview = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!img.complete || img.naturalWidth === 0) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (cropRect) {
            ctx.strokeStyle = '#34c759';
            ctx.lineWidth = 2;
            ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
            ctx.fillStyle = 'rgba(52, 199, 89, 0.25)';
            ctx.fillRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        }
    };

    img.onload = () => drawPreview();
    img.src = asset.dataUrl || asset.url;

    canvas.onmousedown = (e) => {
        const rect = canvas.getBoundingClientRect();
        startPos = {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
        isDragging = true;
        cropRect = { x: startPos.x, y: startPos.y, w: 0, h: 0 };
    };

    canvas.onmousemove = (e) => {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        const currX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const currY = (e.clientY - rect.top) * (canvas.height / rect.height);
        cropRect.x = Math.min(startPos.x, currX);
        cropRect.y = Math.min(startPos.y, currY);
        cropRect.w = Math.abs(currX - startPos.x);
        cropRect.h = Math.abs(currY - startPos.y);
        drawPreview();
    };

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (cropRect && (cropRect.w < 5 || cropRect.h < 5)) {
                cropRect = null;
                drawPreview();
            }
        }
    }, { once: true });

    document.getElementById('btn-apply-inline-crop').onclick = async () => {
        if (!cropRect || cropRect.w <= 0 || cropRect.h <= 0) {
            alert("Por favor selecciona un área válida sobre la imagen para recortar.");
            return;
        }

        const scaleX = img.naturalWidth / canvas.width;
        const scaleY = img.naturalHeight / canvas.height;

        const realX = Math.round(cropRect.x * scaleX);
        const realY = Math.round(cropRect.y * scaleY);
        const realW = Math.round(cropRect.w * scaleX);
        const realH = Math.round(cropRect.h * scaleY);

        const cCanvas = document.createElement('canvas');
        cCanvas.width = realW;
        cCanvas.height = realH;
        const cCtx = cCanvas.getContext('2d');
        cCtx.drawImage(img, realX, realY, realW, realH, 0, 0, realW, realH);

        cCanvas.toBlob(async (blob) => {
            const newFileName = `crop_${Date.now()}.png`;
            await registerAsset(newFileName, blob, true);

            if (typeof dirHandle !== 'undefined' && dirHandle) {
                try {
                    const newFileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                    const writable = await newFileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } catch (err) {
                    console.error("Error guardando recorte en disco:", err);
                }
            }

            elem.image = newFileName;
            elem.width = realW;
            elem.height = realH;

            inlineCropSection.style.display = 'none';
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (typeof updateElementsUI === 'function') updateElementsUI();
            updatePropertiesPanel();
        }, 'image/png');
    };
}