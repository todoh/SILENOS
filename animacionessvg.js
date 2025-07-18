// --- VARIABLES GLOBALES ---
const svgCanvas = document.getElementById('svg-canvas');
const shapesContainer = document.getElementById('shapes-container');
const colorPicker = document.getElementById('color-picker');
const deleteBtn = document.getElementById('delete-btn');
const timelineSlider = document.getElementById('timeline-slider');
const timeLabel = document.getElementById('time-label');
const playBtn = document.getElementById('play-btn');
const toast = document.getElementById('toast');
const durationInput = document.getElementById('duration-input');
const layerList = document.getElementById('layer-list');
const importInput = document.getElementById('import-input');
const transformControls = document.getElementById('transform-controls');
const selectionActions = document.getElementById('selection-actions');
const keyframeMenu = document.getElementById('keyframe-menu');

window.escenasSvg = []; 
let escenaActivaIndex = -1; 
let animationData = {}; 

let selectedShape = null;
let shapeCounter = 0;
let isDragging = false;
let isTransforming = false;
let transformAction = {};
let dragOffset = { x: 0, y: 0 };
let activeKeyframe = { shape: null, time: null };
let DURATION = 5000;
timelineSlider.max = DURATION;
let animationFrameId = null;


// ==================================================
// --- GESTIÓN DE ESCENAS ---
// ==================================================

function guardarEscenaActual() {
    if (escenaActivaIndex === -1 || !window.escenasSvg[escenaActivaIndex]) return;
    const escenaActual = window.escenasSvg[escenaActivaIndex];
    escenaActual.animationData = JSON.parse(JSON.stringify(animationData));
    escenaActual.duration = DURATION;
    escenaActual.shapesHTML = shapesContainer.innerHTML;
}

function cargarEscena(index) {
    if (index < 0 || index >= window.escenasSvg.length) return;
    
    guardarEscenaActual();
    const escenaACargar = window.escenasSvg[index];
    escenaActivaIndex = index;

    stopAnimation();
    deselectAll();
    shapesContainer.innerHTML = '';
    
    shapesContainer.innerHTML = escenaACargar.shapesHTML;
    animationData = JSON.parse(JSON.stringify(escenaACargar.animationData || {}));
    DURATION = escenaACargar.duration || 5000;
    
    let maxId = -1;
    if (window.escenasSvg && window.escenasSvg.length > 0) {
        window.escenasSvg.forEach(escena => {
            if (escena.animationData) {
                Object.keys(escena.animationData).forEach(id => {
                    const num = parseInt(id.replace('shape-', ''), 10);
                    if (!isNaN(num) && num > maxId) maxId = num;
                });
            }
        });
    }
    shapeCounter = maxId + 1;

    Array.from(shapesContainer.children).forEach(shape => {
        shape.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (isTransforming) return;
            selectShape(shape);
            isDragging = true;
            const mousePos = getMousePosition(e);
            const currentTransforms = getShapeTransforms(shape);
            dragOffset = { x: mousePos.x - currentTransforms.x, y: mousePos.y - currentTransforms.y };
        });
    });

    durationInput.value = DURATION / 1000;
    timelineSlider.max = DURATION;
    timelineSlider.value = 0;
    timeLabel.textContent = '0.0s';
    
    renderLayerList();
    updateStateAtTime(0);
    showToast(`Escena "${escenaACargar.nombre}" cargada.`, false);
    renderizarListaDeEscenas();
}

function crearNuevaEscena() {
    const nombreEscena = prompt("Nombre para la nueva escena:", `Animación ${window.escenasSvg.length + 1}`);
    if (!nombreEscena || nombreEscena.trim() === '') return;
    guardarEscenaActual();
    const nuevaEscena = {
        nombre: nombreEscena,
        animationData: {},
        duration: 5000,
        shapesHTML: ''
    };
    window.escenasSvg.push(nuevaEscena);
    cargarEscena(window.escenasSvg.length - 1);
}

function eliminarEscena(index) {
    if (index < 0 || index >= window.escenasSvg.length) return;
    const nombreEscena = window.escenasSvg[index].nombre;
    if (confirm(`¿Estás seguro de que quieres eliminar la escena "${nombreEscena}"?`)) {
        window.escenasSvg.splice(index, 1);
        if (escenaActivaIndex === index) {
            if (window.escenasSvg.length > 0) cargarEscena(0);
            else {
                escenaActivaIndex = -1;
                animationData = {};
                shapesContainer.innerHTML = '';
                renderLayerList();
            }
        } else if (escenaActivaIndex > index) {
            escenaActivaIndex--;
        }
        renderizarListaDeEscenas();
    }
}

function renderizarListaDeEscenas() {
    const container = document.getElementById('lista-escenas-svg-container');
    if (!container) return;
    container.innerHTML = '';
    window.escenasSvg.forEach((escena, index) => {
        const item = document.createElement('div');
        item.className = 'escena-svg-item';
        if (index === escenaActivaIndex) item.style.backgroundColor = '#eef2ff';
        
        const loadBtn = document.createElement('button');
        loadBtn.className = 'load-btn';
        loadBtn.textContent = escena.nombre;
        loadBtn.onclick = () => {
            cargarEscena(index);
            document.getElementById('lista-escenas-svg-popup').classList.add('hidden');
        };

        const deleteSceneBtn = document.createElement('button');
        deleteSceneBtn.className = 'delete-scene-btn';
        deleteSceneBtn.innerHTML = '&#x1F5D1;';
        deleteSceneBtn.title = `Eliminar escena ${escena.nombre}`;
        deleteSceneBtn.onclick = (e) => {
            e.stopPropagation();
            eliminarEscena(index);
        };
        
        item.appendChild(loadBtn);
        item.appendChild(deleteSceneBtn);
        container.appendChild(item);
    });
}

// ==================================================
// --- FUNCIONES DE LA APLICACIÓN ---
// ==================================================

function getShapeTransforms(shape) {
    const data = animationData[shape.id];
    if (data && data.current) return { ...data.current };
    const defaults = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, fill: '#000000' };
    const bbox = shape.getBBox();
    defaults.x = bbox.x + bbox.width / 2;
    defaults.y = bbox.y + bbox.height / 2;
    defaults.fill = shape.getAttribute('fill');
    return defaults;
}

function applyTransforms(shape, transforms) {
    const bbox = shape.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const { x, y, rotation, scaleX, scaleY } = transforms;
    const transformString = `translate(${x}, ${y}) rotate(${rotation}) scale(${scaleX}, ${scaleY}) translate(${-cx}, ${-cy})`;
    shape.setAttribute('transform', transformString);
    if (transforms.fill && shape.tagName !== 'g' && shape.tagName !== 'image') {
        shape.setAttribute('fill', transforms.fill);
    }
    if(animationData[shape.id]) {
        animationData[shape.id].current = { ...transforms };
    }
    if (selectedShape === shape) {
        updateTransformControls();
    }
}

function updateTransformControls() {
    if (!selectedShape) {
        transformControls.style.visibility = 'hidden';
        return;
    }
    transformControls.style.visibility = 'visible';
    const bbox = selectedShape.getBBox();
    const outline = document.getElementById('transform-box-outline');
    outline.setAttribute('x', bbox.x);
    outline.setAttribute('y', bbox.y);
    outline.setAttribute('width', bbox.width);
    outline.setAttribute('height', bbox.height);
    const handles = {
        'top-left': { x: bbox.x, y: bbox.y }, 'top-middle': { x: bbox.x + bbox.width / 2, y: bbox.y }, 'top-right': { x: bbox.x + bbox.width, y: bbox.y },
        'middle-left': { x: bbox.x, y: bbox.y + bbox.height / 2 }, 'middle-right': { x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2 },
        'bottom-left': { x: bbox.x, y: bbox.y + bbox.height }, 'bottom-middle': { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height }, 'bottom-right': { x: bbox.x + bbox.width, y: bbox.y + bbox.height }
    };
    document.querySelectorAll('.resize-handle').forEach(handle => {
        const type = handle.dataset.handle;
        handle.setAttribute('x', handles[type].x - 5);
        handle.setAttribute('y', handles[type].y - 5);
    });
    const rotLine = document.getElementById('rotation-line');
    const rotHandle = document.getElementById('rotation-handle');
    const rotHandleX = bbox.x + bbox.width / 2;
    const rotHandleY = bbox.y - 30;
    rotLine.setAttribute('x1', rotHandleX); rotLine.setAttribute('y1', bbox.y);
    rotLine.setAttribute('x2', rotHandleX); rotLine.setAttribute('y2', rotHandleY);
    rotHandle.setAttribute('cx', rotHandleX); rotHandle.setAttribute('cy', rotHandleY);
    transformControls.setAttribute('transform', selectedShape.getAttribute('transform'));
}

const getMousePosition = (evt) => {
    const CTM = svgCanvas.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return { x: (evt.clientX - CTM.e) / CTM.a, y: (evt.clientY - CTM.f) / CTM.d };
};
const showToast = (message, isError = true) => {
    toast.textContent = message;
    toast.className = `show`;
    toast.style.backgroundColor = isError ? '#ef4444' : '#22c55e';
    setTimeout(() => toast.classList.remove('show'), 3000);
};

function deselectAll() {
    if (selectedShape) selectedShape.classList.remove('selected-shape');
    selectedShape = null;
    transformControls.style.visibility = 'hidden';
    selectionActions.classList.add('hidden');
    selectionActions.classList.remove('flex');
    document.querySelectorAll('.layer-item.selected').forEach(item => item.classList.remove('selected'));
}

function selectShape(shape) {
    deselectAll();
    selectedShape = shape;
    shape.classList.add('selected-shape');
    selectionActions.classList.remove('hidden');
    selectionActions.classList.add('flex');
    const layerItem = document.querySelector(`.layer-item[data-shape-id="${shape.id}"]`);
    if (layerItem) layerItem.classList.add('selected');
    const transforms = getShapeTransforms(shape);
    if (transforms.fill && !['g', 'image'].includes(shape.tagName)) {
        colorPicker.value = transforms.fill;
    }
    updateTransformControls();
}

function registerShape(shape) {
    const shapeId = `shape-${shapeCounter++}`;
    shape.setAttribute('id', shapeId);
    shapesContainer.appendChild(shape);
    const initialTransforms = {
        x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0,
        fill: shape.getAttribute('fill') || '#3b82f6'
    };
    animationData[shapeId] = { keyframes: [], current: initialTransforms };
    applyTransforms(shape, initialTransforms);
    shape.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (isTransforming) return;
        selectShape(shape);
        isDragging = true;
        const mousePos = getMousePosition(e);
        const currentTransforms = getShapeTransforms(shape);
        dragOffset = { x: mousePos.x - currentTransforms.x, y: mousePos.y - currentTransforms.y };
    });
    renderLayerList();
    return shape;
}

function createShape(type) {
    const shape = document.createElementNS('http://www.w3.org/2000/svg', type);
    shape.setAttribute('fill', colorPicker.value);
    if (type === 'rect') {
        shape.setAttribute('x', 50); shape.setAttribute('y', 50);
        shape.setAttribute('width', 100); shape.setAttribute('height', 100);
    } else if (type === 'circle') {
        shape.setAttribute('cx', 100); shape.setAttribute('cy', 100);
        shape.setAttribute('r', 50);
    }
    const newShape = registerShape(shape);
    const newTransforms = getShapeTransforms(newShape);
    const canvasRect = svgCanvas.getBoundingClientRect();
    newTransforms.x = canvasRect.width / 2;
    newTransforms.y = canvasRect.height / 2;
    applyTransforms(newShape, newTransforms);
    selectShape(newShape);
}

function renderLayerList() {
    if (!layerList) return;
    layerList.innerHTML = '';
    const allShapes = Array.from(shapesContainer.children).reverse();
    allShapes.forEach(shape => {
        const shapeId = shape.id;
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item p-2 border rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer';
        layerItem.dataset.shapeId = shapeId;
        if (selectedShape === shape) layerItem.classList.add('selected');
        let keyframesHTML = '';
        const animInfo = animationData[shapeId];
        if (animInfo && animInfo.keyframes) {
            animInfo.keyframes.forEach(kf => {
                const left = (kf.time / DURATION) * 100;
                keyframesHTML += `<div class="keyframe-marker" style="left: ${left}%;" data-time="${kf.time}"></div>`;
            });
        }
        let shapeName = shape.tagName;
        if(shape.tagName === 'g') shapeName = 'Grupo';
        else if(shape.tagName === 'image') shapeName = 'Imagen';
        layerItem.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="font-medium text-sm capitalize">${shapeName} #${shapeId.split('-')[1]}</span>
                <div class="flex items-center gap-1">
                    <button class="layer-up-btn p-1 rounded hover:bg-gray-200" title="Mover arriba">↑</button>
                    <button class="layer-down-btn p-1 rounded hover:bg-gray-200" title="Mover abajo">↓</button>
                </div>
            </div>
            <div class="timeline-track h-4 bg-gray-200 mt-2 rounded-full relative">${keyframesHTML}</div>`;
        const track = layerItem.querySelector('.timeline-track');
        Array.from(track.children).forEach(marker => {
            marker.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const time = parseInt(marker.dataset.time);
                showKeyframeMenu(shape, time, e.pageX, e.pageY);
            });
        });
        layerItem.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.classList.contains('keyframe-marker')) return;
            selectShape(shape);
        });
        layerItem.querySelector('.layer-up-btn').addEventListener('click', () => moveLayer(shape, 'up'));
        layerItem.querySelector('.layer-down-btn').addEventListener('click', () => moveLayer(shape, 'down'));
        layerList.appendChild(layerItem);
    });
}

function moveLayer(shape, direction) {
    const currentNextSibling = shape.nextElementSibling;
    const currentPrevSibling = shape.previousElementSibling;
    if (direction === 'up' && currentNextSibling) {
        shapesContainer.insertBefore(shape, currentNextSibling.nextElementSibling);
    } else if (direction === 'down' && currentPrevSibling) {
        shapesContainer.insertBefore(shape, currentPrevSibling);
    }
    renderLayerList();
}

document.getElementById('import-svg-btn').addEventListener('click', () => {
    importInput.accept = 'image/svg+xml';
    importInput.click();
});
document.getElementById('import-img-btn').addEventListener('click', () => {
    importInput.accept = 'image/png, image/jpeg';
    importInput.click();
});

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type === "image/svg+xml") handleSvgImport(file);
    else if (file.type.startsWith("image/")) handleImageImport(file);
    else showToast("Tipo de archivo no soportado.");
    e.target.value = '';
});

function handleImageImport(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            svgImage.setAttribute('width', img.width);
            svgImage.setAttribute('height', img.height);
            svgImage.setAttribute('href', event.target.result);
            const newShape = registerShape(svgImage);
            centerAndScaleShape(newShape);
            selectShape(newShape);
            showToast('Imagen importada con éxito.', false);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function handleSvgImport(file) {
     const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(event.target.result, "image/svg+xml");
            const importedSvg = doc.documentElement;
            if (importedSvg.tagName.toLowerCase() !== 'svg') {
                showToast("El archivo no es un SVG válido."); return;
            }
            const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            Array.from(importedSvg.children).forEach(child => wrapper.appendChild(child.cloneNode(true)));
            const newShape = registerShape(wrapper);
            centerAndScaleShape(newShape);
            selectShape(newShape);
            showToast(`SVG importado.`, false);
        } catch (error) {
            showToast("Error al procesar el archivo SVG."); console.error("SVG Parse Error:", error);
        }
    };
    reader.readAsText(file);
}

document.getElementById('add-rect-btn').addEventListener('click', () => createShape('rect'));
document.getElementById('add-circle-btn').addEventListener('click', () => createShape('circle'));

deleteBtn.addEventListener('click', () => {
    if (selectedShape) {
        delete animationData[selectedShape.id];
        selectedShape.remove();
        deselectAll();
        renderLayerList();
    }
});

document.getElementById('flip-h-btn').addEventListener('click', () => {
    if (!selectedShape) return;
    const transforms = getShapeTransforms(selectedShape);
    transforms.scaleX *= -1;
    applyTransforms(selectedShape, transforms);
});

document.getElementById('flip-v-btn').addEventListener('click', () => {
    if (!selectedShape) return;
    const transforms = getShapeTransforms(selectedShape);
    transforms.scaleY *= -1;
    applyTransforms(selectedShape, transforms);
});

svgCanvas.addEventListener('mousedown', (e) => { if (e.target === svgCanvas) deselectAll(); });
window.addEventListener('mousemove', (e) => {
    if (!isDragging && !isTransforming) return;
    e.preventDefault();
    const mousePos = getMousePosition(e);
    if (isDragging && selectedShape) {
        const newTransforms = getShapeTransforms(selectedShape);
        newTransforms.x = mousePos.x - dragOffset.x;
        newTransforms.y = mousePos.y - dragOffset.y;
        applyTransforms(selectedShape, newTransforms);
    } else if (isTransforming && selectedShape) {
        if (!transformAction || !transformAction.type) return;
        const { type, startX, startY, initialTransform, bbox, center, anchor } = transformAction;
        const newTransforms = { ...initialTransform };
        if (type === 'rotate') {
            const currentAngle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x) * 180 / Math.PI;
            const startAngle = Math.atan2(startY - center.y, startX - center.x) * 180 / Math.PI;
            newTransforms.rotation = initialTransform.rotation + (currentAngle - startAngle);
        } else {
            const rad = -initialTransform.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            let dx = mousePos.x - anchor.x;
            let dy = mousePos.y - anchor.y;
            let localDx = dx * cos + dy * sin;
            let localDy = -dx * sin + dy * cos;
            if (type.includes('left')) localDx *= -1;
            if (type.includes('top')) localDy *= -1;
            let newWidth = bbox.width * initialTransform.scaleX + localDx;
            let newHeight = bbox.height * initialTransform.scaleY + localDy;
            if (e.shiftKey && type.includes('-')) {
                const ratio = Math.max(Math.abs(newWidth / bbox.width), Math.abs(newHeight / bbox.height));
                newWidth = bbox.width * ratio;
                newHeight = bbox.height * ratio;
            }
            newTransforms.scaleX = newWidth / bbox.width;
            newTransforms.scaleY = newHeight / bbox.height;
            const centerOffsetX = (newWidth - bbox.width * initialTransform.scaleX) / 2;
            const centerOffsetY = (newHeight - bbox.height * initialTransform.scaleY) / 2;
            newTransforms.x = initialTransform.x + (centerOffsetX * cos - centerOffsetY * sin);
            newTransforms.y = initialTransform.y + (centerOffsetX * sin + centerOffsetY * cos);
        }
        applyTransforms(selectedShape, newTransforms);
    }
});
window.addEventListener('mouseup', () => {
    if (isTransforming && transformAction.type === 'rotate') {
        document.getElementById('rotation-handle').style.cursor = 'grab';
    }
    isDragging = false;
    isTransforming = false;
});
transformControls.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    const handleType = e.target.id === 'rotation-handle' ? 'rotate' : e.target.dataset.handle;
    if (!handleType || !selectedShape) return;
    isTransforming = true;
    isDragging = false;
    const mousePos = getMousePosition(e);
    const bbox = selectedShape.getBBox();
    const matrix = selectedShape.transform.baseVal.consolidate().matrix;
    const getCorner = (x, y) => new DOMPoint(x, y).matrixTransform(matrix);
    const corners = {
        'top-left': getCorner(bbox.x, bbox.y), 'top-right': getCorner(bbox.x + bbox.width, bbox.y),
        'bottom-left': getCorner(bbox.x, bbox.y + bbox.height), 'bottom-right': getCorner(bbox.x + bbox.width, bbox.y + bbox.height),
        'top-middle': getCorner(bbox.x + bbox.width / 2, bbox.y), 'bottom-middle': getCorner(bbox.x + bbox.width / 2, bbox.y + bbox.height),
        'middle-left': getCorner(bbox.x, bbox.y + bbox.height / 2), 'middle-right': getCorner(bbox.x + bbox.width, bbox.y + bbox.height / 2)
    };
    const centerPt = getCorner(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
    const oppositeCorners = {
        'top-left': 'bottom-right', 'top-right': 'bottom-left', 'bottom-left': 'top-right', 'bottom-right': 'top-left',
        'top-middle': 'bottom-middle', 'bottom-middle': 'top-middle', 'middle-left': 'middle-right', 'middle-right': 'middle-left'
    };
    transformAction = {
        type: handleType, startX: mousePos.x, startY: mousePos.y,
        initialTransform: getShapeTransforms(selectedShape), bbox: bbox,
        center: centerPt, anchor: corners[oppositeCorners[handleType]]
    };
    if(transformAction.type === 'rotate') e.target.style.cursor = 'grabbing';
});

document.getElementById('set-keyframe-btn').addEventListener('click', () => {
    if (!selectedShape) { showToast('Por favor, selecciona una forma.'); return; }
    const time = parseInt(timelineSlider.value);
    const shapeId = selectedShape.id;
    const keyframes = animationData[shapeId].keyframes;
    const newKf = { time, attrs: getShapeTransforms(selectedShape), easing: 'linear' };
    const existingKfIndex = keyframes.findIndex(kf => kf.time === time);
    if (existingKfIndex > -1) keyframes[existingKfIndex].attrs = newKf.attrs;
    else {
        keyframes.push(newKf);
        keyframes.sort((a, b) => a.time - b.time);
    }
    renderLayerList();
});

function showKeyframeMenu(shape, time, x, y) {
    activeKeyframe = { shape, time };
    const kf = animationData[shape.id].keyframes.find(k => k.time === time);
    document.getElementById('easing-select').value = kf.easing || 'linear';
    keyframeMenu.style.left = `${x}px`;
    keyframeMenu.style.top = `${y}px`;
    keyframeMenu.style.display = 'block';
}

document.getElementById('delete-keyframe-btn').addEventListener('click', () => {
    const { shape, time } = activeKeyframe;
    if (shape && time !== null) {
        const keyframes = animationData[shape.id].keyframes;
        const index = keyframes.findIndex(kf => kf.time === time);
        if (index > -1) {
            keyframes.splice(index, 1);
            renderLayerList();
        }
    }
    keyframeMenu.style.display = 'none';
});

document.getElementById('easing-select').addEventListener('change', (e) => {
    const { shape, time } = activeKeyframe;
    if (shape && time !== null) {
        const kf = animationData[shape.id].keyframes.find(k => k.time === time);
        if (kf) kf.easing = e.target.value;
    }
});

document.addEventListener('click', (e) => {
    if (!keyframeMenu.contains(e.target)) {
        keyframeMenu.style.display = 'none';
    }
});

function updateStateAtTime(time) {
    Object.keys(animationData).forEach(shapeId => {
        const shape = document.getElementById(shapeId);
        const keyframes = animationData[shapeId]?.keyframes;
        if (!shape || !keyframes || keyframes.length === 0) return;
        let kf1 = keyframes.filter(kf => kf.time <= time).pop();
        let kf2 = keyframes.find(kf => kf.time > time);
        if (!kf1 && !kf2) return;
        if (!kf1) { applyTransforms(shape, kf2.attrs); return; }
        if (!kf2) { applyTransforms(shape, kf1.attrs); return; }
        const easing = kf1.easing || 'linear';
        let t = (kf2.time - kf1.time === 0) ? 1 : (time - kf1.time) / (kf2.time - kf1.time);
        if (easing === 'steps') {
            const hops = 15, subSteps = 5;
            const hopStartT = Math.floor(t * hops) / hops;
            const hopEndT = (Math.floor(t * hops) + 1) / hops;
            const progressInHop = (t - hopStartT) * hops;
            const easedProgress = progressInHop < 0.5 ? 2 * progressInHop * progressInHop : 1 - Math.pow(-2 * progressInHop + 2, 2) / 2;
            t = hopStartT + (hopEndT - hopStartT) * easedProgress;
        } else if (easing === 'ease-in-out') {
            t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
        const interpolated = {};
        for (const key in kf1.attrs) {
            if (typeof kf1.attrs[key] === 'number') {
                interpolated[key] = kf1.attrs[key] + (kf2.attrs[key] - kf1.attrs[key]) * t;
            } else {
                interpolated[key] = (t < 1) ? kf1.attrs[key] : kf2.attrs[key];
            }
        }
        applyTransforms(shape, interpolated);
    });
}

timelineSlider.addEventListener('input', (e) => {
    stopAnimation();
    timeLabel.textContent = (e.target.value / 1000).toFixed(1) + 's';
    updateStateAtTime(parseInt(e.target.value));
});

durationInput.addEventListener('change', (e) => {
    const newDuration = parseFloat(e.target.value) * 1000;
    if (!isNaN(newDuration) && newDuration > 0) {
        DURATION = newDuration;
        timelineSlider.max = DURATION;
        renderLayerList();
    }
});

function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        playBtn.textContent = 'Play';
        playBtn.classList.remove('bg-red-500');
        playBtn.classList.add('bg-indigo-500');
    }
}

playBtn.addEventListener('click', () => {
    if (animationFrameId) { stopAnimation(); return; }
    playBtn.textContent = 'Stop';
    playBtn.classList.remove('bg-indigo-500');
    playBtn.classList.add('bg-red-500');
    const currentTime = timelineSlider.value >= DURATION ? 0 : timelineSlider.value;
    timelineSlider.value = currentTime;
    const startTime = performance.now() - currentTime;
    function animationLoop(timestamp) {
        const elapsedTime = timestamp - startTime;
        if (elapsedTime >= DURATION) {
            timelineSlider.value = DURATION;
            updateStateAtTime(DURATION);
            stopAnimation();
            return;
        }
        timelineSlider.value = elapsedTime;
        timeLabel.textContent = (elapsedTime / 1000).toFixed(1) + 's';
        updateStateAtTime(elapsedTime);
        animationFrameId = requestAnimationFrame(animationLoop);
    }
    animationFrameId = requestAnimationFrame(animationLoop);
});

// --- INICIO DE LA CORRECCIÓN ---
// La función de exportación ha sido reescrita para ser más precisa.
document.getElementById('export-btn3').addEventListener('click', () => {
    const finalSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    finalSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const canvasRect = svgCanvas.getBoundingClientRect();
    finalSvg.setAttribute('width', '1920');
    finalSvg.setAttribute('height', '1080');
    finalSvg.setAttribute('viewBox', `0 0 ${canvasRect.width} ${canvasRect.height}`);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    let cssRules = '';

    const shapesClone = shapesContainer.cloneNode(true);
    
    Array.from(shapesClone.children).forEach(shapeInClone => {
        const shapeId = shapeInClone.id;
        const animInfo = animationData[shapeId];
        if (!animInfo || animInfo.keyframes.length < 1) return;

        shapeInClone.removeAttribute('class');
        shapeInClone.removeAttribute('transform');
        
        const bbox = document.getElementById(shapeId).getBBox();
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;

        const animationName = `anim-${shapeId}`;
        let keyframesRule = `@keyframes ${animationName} {\n`;
        
        const keyframeMap = new Map();

        // Función para generar la cadena de transformación CSS
        const getTransformString = (attrs) => {
            return `translate(${attrs.x}px, ${attrs.y}px) rotate(${attrs.rotation}deg) scale(${attrs.scaleX}, ${attrs.scaleY})`;
        };

        // Interpolar y añadir keyframes para suavizar la animación
        for (let i = 0; i < animInfo.keyframes.length; i++) {
            const kf1 = animInfo.keyframes[i];
            const kf2 = animInfo.keyframes[i + 1];
            
            // Añadir el keyframe original
            const percentage1 = (kf1.time / DURATION) * 100;
            keyframeMap.set(percentage1, `  ${percentage1.toFixed(2)}% { transform: ${getTransformString(kf1.attrs)}; fill: ${kf1.attrs.fill}; }`);

            if (kf2) {
                const segmentDuration = kf2.time - kf1.time;
                if (segmentDuration <= 0) continue;
                
                // Añadir puntos intermedios para mayor fidelidad
                const steps = 20; // Más pasos para una curva más suave
                for (let j = 1; j <= steps; j++) {
                    let t = j / steps;
                    const intermediateTime = kf1.time + segmentDuration * t;
                    const interpolatedAttrs = {};
                    for (const key in kf1.attrs) {
                        if (typeof kf1.attrs[key] === 'number') {
                            interpolatedAttrs[key] = kf1.attrs[key] + (kf2.attrs[key] - kf1.attrs[key]) * t;
                        } else {
                            interpolatedAttrs[key] = kf1.attrs[key];
                        }
                    }
                     interpolatedAttrs.fill = (t < 0.5) ? kf1.attrs.fill : kf2.attrs.fill;
                    
                    const intermediatePercentage = (intermediateTime / DURATION) * 100;
                    keyframeMap.set(intermediatePercentage, `  ${intermediatePercentage.toFixed(2)}% { transform: ${getTransformString(interpolatedAttrs)}; fill: ${interpolatedAttrs.fill}; }`);
                }
            }
        }

        // --- CORRECCIÓN CLAVE ---
        // Asegurarse de que el último estado se mantenga hasta el 100%
        const lastKeyframe = animInfo.keyframes[animInfo.keyframes.length - 1];
        if (lastKeyframe) {
             const lastPercentage = (lastKeyframe.time / DURATION) * 100;
             if(lastPercentage < 100) {
                keyframeMap.set(100, `  100% { transform: ${getTransformString(lastKeyframe.attrs)}; fill: ${lastKeyframe.attrs.fill}; }`);
             }
        }
        
        // Ordenar y construir la regla de keyframes
        const sortedKeys = Array.from(keyframeMap.keys()).sort((a,b) => a - b);
        sortedKeys.forEach(key => {
            keyframesRule += keyframeMap.get(key) + '\n';
        });

        keyframesRule += '}\n';
        cssRules += keyframesRule;

        // Aplicar la animación al elemento
        cssRules += `#${shapeId} { 
            animation: ${animationName} ${DURATION / 1000}s linear infinite;
            transform-origin: ${cx}px ${cy}px; /* Usar transform-origin para mayor precisión */
        }\n`;
    });
    
    if (cssRules) {
        style.textContent = cssRules;
        defs.appendChild(style);
        finalSvg.appendChild(defs);
    }
    finalSvg.appendChild(shapesClone);

    const svgData = new XMLSerializer().serializeToString(finalSvg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animacion-corregida.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
// --- FIN DE LA CORRECCIÓN ---


function centerAndScaleShape(shape) {
    const transforms = getShapeTransforms(shape);
    const canvasRect = svgCanvas.getBoundingClientRect();
    transforms.x = canvasRect.width / 2;
    transforms.y = canvasRect.height / 2;
    const bbox = shape.getBBox();
    if (bbox.width === 0 || bbox.height === 0) {
         applyTransforms(shape, transforms);
         return;
    }
    const maxWidth = canvasRect.width * 0.9;
    const maxHeight = canvasRect.height * 0.9;
    const scaleX = maxWidth / bbox.width;
    const scaleY = maxHeight / bbox.height;
    const scale = Math.min(scaleX, scaleY);
    if (scale < 1) {
        transforms.scaleX = scale;
        transforms.scaleY = scale;
    }
    applyTransforms(shape, transforms);
}

function openDatoImageModal() {
    const modal = document.createElement('div');
    modal.id = 'dato-image-import-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.75); backdrop-filter: blur(5px);
        z-index: 1002; display: flex; justify-content: center; align-items: center;
        padding: 20px; box-sizing: border-box;
    `;
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: white; padding: 25px; border-radius: 12px;
        width: 100%; max-width: 900px; height: 90%; max-height: 700px;
        overflow-y: auto; display: flex; flex-direction: column; position: relative;
    `;
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        position: absolute; top: 10px; right: 15px; cursor: pointer;
        background: none; border: none; font-size: 2rem; color: #555;
    `;
    closeButton.onclick = () => document.body.removeChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 20px;
    `;
    const personajes = document.querySelectorAll('#listapersonajes .personaje');
    let datosConImagenEncontrados = 0;
    personajes.forEach(personaje => {
        const img = personaje.querySelector('.personaje-visual img');
        const nombreInput = personaje.querySelector('input.nombreh');
        const nombre = nombreInput ? nombreInput.value : 'Sin nombre';
        if (img && img.src && !img.src.endsWith('/')) {
            datosConImagenEncontrados++;
            const item = document.createElement('div');
            item.style.cssText = `cursor: pointer; text-align: center; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s;`;
            item.onmouseover = () => { item.style.transform = 'scale(1.05)'; };
            item.onmouseout = () => { item.style.transform = 'scale(1)'; };
            item.onclick = async () => {
                try {
                    const response = await fetch(img.src);
                    const blob = await response.blob();
                    const fileName = nombre.replace(/[^a-zA-Z0-9.-]/g, '_') + '.png';
                    const file = new File([blob], fileName, { type: blob.type });
                    handleImageImport(file);
                    document.body.removeChild(modal);
                } catch (error) {
                    console.error("Error al procesar la imagen del dato:", error);
                    showToast("No se pudo importar la imagen seleccionada.");
                }
            };
            const itemImg = document.createElement('img');
            itemImg.src = img.src;
            itemImg.style.cssText = 'width: 100%; height: 150px; object-fit: cover; background-color: #f0f0f0;';
            const itemName = document.createElement('p');
            itemName.textContent = nombre;
            itemName.style.cssText = 'margin: 10px 5px; font-weight: 500; font-size: 14px;';
            item.appendChild(itemImg);
            item.appendChild(itemName);
            gridContainer.appendChild(item);
        }
    });
    if (datosConImagenEncontrados === 0) {
        gridContainer.innerHTML = '<p style="color: #555; text-align: center; grid-column: 1 / -1;">No se encontraron Datos con imágenes para importar.</p>';
    }
    modalContent.appendChild(closeButton);
    modalContent.appendChild(gridContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

document.addEventListener('DOMContentLoaded', () => {
    const importDatoBtn = document.getElementById('import-dato-img-btn');
    if (importDatoBtn) importDatoBtn.addEventListener('click', openDatoImageModal);
    const selectorBtn = document.getElementById('selector-escena-svg-btn');
    const popup = document.getElementById('lista-escenas-svg-popup');
    const crearBtn = document.getElementById('crear-nueva-escena-svg-btn');
    if (selectorBtn && popup && crearBtn) {
        selectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.classList.toggle('hidden');
            if (!popup.classList.contains('hidden')) renderizarListaDeEscenas();
        });
        crearBtn.addEventListener('click', () => {
            crearNuevaEscena();
            popup.classList.add('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!popup.contains(e.target) && e.target !== selectorBtn) {
                popup.classList.add('hidden');
            }
        });
    }
    if (window.escenasSvg.length === 0) {} 
    else {
        cargarEscena(0);
    }
});
