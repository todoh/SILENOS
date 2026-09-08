// render-events.js - MANEJO DE EVENTOS, RAYCASTING DE PÍXELES Y CLICS EN MODO JUEGO
function setupPixelPerfectClicks() {
    const stage = document.getElementById('stage');
    if (!stage || stage.dataset.pixelClickAttached) return;
    stage.dataset.pixelClickAttached = "true";
        
    stage.addEventListener('click', (e) => {
        if (!isPlayMode || e.shiftKey) return;
        if (e.target.closest('#game-ui') || e.target.closest('#inventory-bar') || e.target.closest('#dialog-box')) return;
        
        const { clickX, clickY } = getCanvasWorldCoordinates(e);
        
        const scene = projectData.scenes[currentSceneId];
        if (!scene) return;
        
        // Ordenamos de mayor a menor zIndex visual (y + height)
        const elementsToCheck = [...scene.elements]
            .filter(elem => !elem.isPlayer && elem.type === 'entidad' && elem.triggerType !== 'passive' && checkCondition(elem.condition))
            .sort((a, b) => ((b.y + b.height) - (a.y + a.height)));
            
        let clickedEntity = null;
        for (const elem of elementsToCheck) {
            if (isPixelOpaque(elem, clickX, clickY)) {
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
                    } else if (typeof movementEngine !== 'undefined') {
                        movementEngine.setTargetWithCallback(closestX, closestY, clickedEntity);
                    }
                } else {
                    handleEntityInteraction(clickedEntity);
                }
            }
        } else if (typeof movementEngine !== 'undefined') {
            movementEngine.setTarget(clickX, clickY);
        }
    });
}

function isPixelOpaque(elem, clickX, clickY) {
    if (elem.isPlayer) return false;
    // 1. Verificación por caja de colisión rectangular directa
    if (elem.hasCollision || elem.collisionW !== undefined) {
        const box = typeof movementEngine !== 'undefined' ? movementEngine.getColliderBox(elem) : { x: elem.x, y: elem.y, w: elem.width, h: elem.height };
        if (clickX >= box.x && clickX <= box.x + box.w && clickY >= box.y && clickY <= box.y + box.h) {
            return true;
        }
    }
    // 2. Verificación exacta del área visual de la imagen en base a rotación y píxeles opacos
    const rad = -elem.rotation * (Math.PI / 180);
    const centerX = elem.x + elem.width / 2;
    const centerY = elem.y + elem.height / 2;
    const dx = clickX - centerX;
    const dy = clickY - centerY;
    const localX = (dx * Math.cos(rad) - dy * Math.sin(rad)) + elem.width / 2;
    const localY = (dx * Math.sin(rad) + dy * Math.cos(rad)) + elem.height / 2;

    if (localX < 0 || localX > elem.width || localY < 0 || localY > elem.height) return false;
    if (elem.isText) return true;

    const asset = assetsMap[elem.image];
    if (!asset || !asset.dataUrl) return true;

    if (!asset.canvas) {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = asset.dataUrl;
        if (!img.complete) return true;
        canvas.width = img.naturalWidth || elem.width || 100;
        canvas.height = img.naturalHeight || elem.height || 100;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        asset.canvas = canvas;
        asset.ctx = ctx;
    }

    const imgX = Math.floor((localX / elem.width) * asset.canvas.width);
    const imgY = Math.floor((localY / elem.height) * asset.canvas.height);

    try {
        const pixelData = asset.ctx.getImageData(imgX, imgY, 1, 1).data;
        return pixelData[3] > 10;
    } catch (err) {
        return true;
    }
}