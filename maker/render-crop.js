// render-crop.js - MÓDULO PARA EL HERRAMIENTAL Y GIZMO DE RECORTE DE IMÁGENES
let activeCropElemId = null;

function renderCropGizmo(el, elem) {
    let cropBox = elem._cropBox || { x: 0, y: 0, w: elem.width, h: elem.height };
    elem._cropBox = cropBox;
    
    const cropGizmo = document.createElement('div');
    cropGizmo.className = 'crop-overlay-gizmo';
    cropGizmo.style.left = `${cropBox.x}px`;
    cropGizmo.style.top = `${cropBox.y}px`;
    cropGizmo.style.width = `${cropBox.w}px`;
    cropGizmo.style.height = `${cropBox.h}px`;
    
    ['nw', 'ne', 'se', 'sw'].forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `crop-handle ${pos}`;
        cropGizmo.appendChild(handle);
        
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            let startX = e.clientX;
            let startY = e.clientY;
            let startCrop = { ...cropBox };
            
            const onMouseMove = (ev) => {
                let dx = ev.clientX - startX;
                let dy = ev.clientY - startY;
                
                if (pos.includes('e')) cropBox.w = Math.max(10, Math.min(elem.width - startCrop.x, startCrop.w + dx));
                if (pos.includes('s')) cropBox.h = Math.max(10, Math.min(elem.height - startCrop.y, startCrop.h + dy));
                if (pos.includes('w')) {
                    let newW = Math.max(10, startCrop.w - dx);
                    let newX = startCrop.x + (startCrop.w - newW);
                    if (newX >= 0) { cropBox.x = newX; cropBox.w = newW; }
                }
                if (pos.includes('n')) {
                    let newH = Math.max(10, startCrop.h - dy);
                    let newY = startCrop.y + (startCrop.h - newH);
                    if (newY >= 0) { cropBox.y = newY; cropBox.h = newH; }
                }
                
                cropGizmo.style.left = `${cropBox.x}px`;
                cropGizmo.style.top = `${cropBox.y}px`;
                cropGizmo.style.width = `${cropBox.w}px`;
                cropGizmo.style.height = `${cropBox.h}px`;
            };
            
            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    });
    
    cropGizmo.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('crop-handle') || e.target.tagName === 'BUTTON') return;
        e.stopPropagation();
        let startX = e.clientX;
        let startY = e.clientY;
        let startXPos = cropBox.x;
        let startYPos = cropBox.y;
        
        const onMouseMove = (ev) => {
            let dx = ev.clientX - startX;
            let dy = ev.clientY - startY;
            
            cropBox.x = Math.max(0, Math.min(elem.width - cropBox.w, Math.round(startXPos + dx)));
            cropBox.y = Math.max(0, Math.min(elem.height - cropBox.h, Math.round(startYPos + dy)));
            
            cropGizmo.style.left = `${cropBox.x}px`;
            cropGizmo.style.top = `${cropBox.y}px`;
        };
        
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });
    
    const actionsBar = document.createElement('div');
    actionsBar.className = 'crop-actions-bar';
    
    const btnApply = document.createElement('button');
    btnApply.textContent = 'Aplicar';
    btnApply.style.cssText = 'background:#34c759; color:white; font-weight:600;';
    btnApply.onclick = (e) => {
        e.stopPropagation();
        applyCropToElement(elem);
    };
    
    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancelar';
    btnCancel.style.cssText = 'background:#ff3b30; color:white;';
    btnCancel.onclick = (e) => {
        e.stopPropagation();
        activeCropElemId = null;
        delete elem._cropBox;
        renderStage();
    };
    
    actionsBar.appendChild(btnApply);
    actionsBar.appendChild(btnCancel);
    cropGizmo.appendChild(actionsBar);
    
    el.appendChild(cropGizmo);
}

async function applyCropToElement(elem) {
    if (!elem._cropBox) return;
    const asset = assetsMap[elem.image];
    if (!asset) return;
    
    const img = new Image();
    img.src = asset.dataUrl || asset.url;
    await new Promise(res => img.onload = res);
    
    const scaleX = img.naturalWidth / elem.width;
    const scaleY = img.naturalHeight / elem.height;
    
    const cropX = Math.round(elem._cropBox.x * scaleX);
    const cropY = Math.round(elem._cropBox.y * scaleY);
    const cropW = Math.round(elem._cropBox.w * scaleX);
    const cropH = Math.round(elem._cropBox.h * scaleY);
    
    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    
    canvas.toBlob(async (blob) => {
        const newFileName = `crop_${Date.now()}.png`;
        await registerAsset(newFileName, blob, true);
        
        if (typeof dirHandle !== 'undefined' && dirHandle) {
            try {
                const newFileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            } catch (err) {
                console.error("Error guardando recortada en disco:", err);
            }
        }
        
        elem.image = newFileName;
        elem.x += elem._cropBox.x;
        elem.y += elem._cropBox.y;
        elem.width = elem._cropBox.w;
        elem.height = elem._cropBox.h;
        delete elem._cropBox;
        activeCropElemId = null;
        
        autoSaveJSON();
        renderStage();
        updatePropertiesPanel();
    }, 'image/png');
}