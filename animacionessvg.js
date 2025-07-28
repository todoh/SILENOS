// ==================================================
// --- CONSTANTES Y ESTADO DE LA APLICACIÓN ---
// ==================================================

// --- Constantes del Motor de Animación ---
const LOGICAL_WIDTH = 1920;
const LOGICAL_HEIGHT = 1080;

// --- Declaraciones de Variables de Elementos del DOM (se asignarán después de cargar la página) ---
let svgCanvas, shapesContainer, colorPicker, deleteBtn, timelineSlider, timeLabel, playBtn, toast, durationInput, layerList, importInput, transformControls, selectionActions, keyframeMenu;

// --- Estado de la Aplicación ---
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
let animationFrameId = null;

// ==================================================
// --- GESTIÓN DE ESCENAS ---
// ==================================================

function guardarEscenaActual() {
    if (escenaActivaIndex === -1 || !window.escenasSvg[escenaActivaIndex] || !shapesContainer) return;
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
            if (window.escenasSvg.length > 0) {
                 cargarEscena(Math.max(0, index - 1));
            } else {
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
            const popup = document.getElementById('lista-escenas-svg-popup');
            if(popup) popup.classList.add('hidden');
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
// --- FUNCIONES DE LA APLICACIÓN (MOTOR GRÁFICO Y UTILIDADES) ---
// ==================================================

function getShapeTransforms(shape) {
    const data = animationData[shape.id];
    if (data && data.current) return { ...data.current };
    const defaults = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, fill: '#000000' };
    try {
        const bbox = shape.getBBox();
        defaults.x = bbox.x + bbox.width / 2;
        defaults.y = bbox.y + bbox.height / 2;
    } catch(e) { /* Elemento aún no renderizado */ }
    defaults.fill = shape.getAttribute('fill');
    return defaults;
}

/**
 * Aplica transformaciones a un elemento, escalando las coordenadas lógicas al tamaño real del canvas.
 * @param {SVGElement} shape - El elemento a transformar.
 * @param {object} transforms - Objeto con transformaciones lógicas {x, y, rotation, scaleX, scaleY, fill}.
 */
function applyTransforms(shape, transforms) {
    if (!shape || !svgCanvas) return;

    // Obtener el tamaño real del canvas de visualización
    const actualWidth = svgCanvas.clientWidth;
    const actualHeight = svgCanvas.clientHeight;

    // Calcular los factores de escala
    const scaleFactorX = actualWidth / LOGICAL_WIDTH;
    const scaleFactorY = actualHeight / LOGICAL_HEIGHT;

    // Escalar las coordenadas lógicas a las coordenadas de visualización
    const displayX = transforms.x * scaleFactorX;
    const displayY = transforms.y * scaleFactorY;

    // La escala del objeto también debe ser ajustada por el factor de escala promedio para mantener proporciones
    const avgScaleFactor = (scaleFactorX + scaleFactorY) / 2;
    const displayScaleX = transforms.scaleX * avgScaleFactor;
    const displayScaleY = transforms.scaleY * avgScaleFactor;

    const { rotation } = transforms;

    // El BBox se usa para encontrar el centro del objeto en su propio sistema de coordenadas
    const bbox = shape.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    
    const transformString = `translate(${displayX}, ${displayY}) rotate(${rotation}) scale(${displayScaleX}, ${displayScaleY}) translate(${-cx}, ${-cy})`;
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
    if (!selectedShape || !transformControls) return;
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
    if (!svgCanvas) return { x: 0, y: 0 };
    const CTM = svgCanvas.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return { x: (evt.clientX - CTM.e) / CTM.a, y: (evt.clientY - CTM.f) / CTM.d };
};

const showToast = (message, isError = true) => {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `show`;
    toast.style.backgroundColor = isError ? '#ef4444' : '#22c55e';
    setTimeout(() => toast.classList.remove('show'), 3000);
};

function deselectAll() {
    if (selectedShape) selectedShape.classList.remove('selected-shape');
    selectedShape = null;
    if (transformControls) transformControls.style.visibility = 'hidden';
    if (selectionActions) {
        selectionActions.classList.add('hidden');
        selectionActions.classList.remove('flex');
    }
    document.querySelectorAll('.layer-item.selected').forEach(item => item.classList.remove('selected'));
}

function selectShape(shape) {
    deselectAll();
    selectedShape = shape;
    shape.classList.add('selected-shape');
    if (selectionActions) {
        selectionActions.classList.remove('hidden');
        selectionActions.classList.add('flex');
    }
    const layerItem = document.querySelector(`.layer-item[data-shape-id="${shape.id}"]`);
    if (layerItem) layerItem.classList.add('selected');
    const transforms = getShapeTransforms(shape);
    if (transforms.fill && !['g', 'image'].includes(shape.tagName) && colorPicker) {
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
        if(!shapeId) return;
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

function centerAndScaleShape(shape) {
    const transforms = getShapeTransforms(shape);
    const canvasRect = svgCanvas.getBoundingClientRect();
    transforms.x = LOGICAL_WIDTH / 2;
    transforms.y = LOGICAL_HEIGHT / 2;
    const bbox = shape.getBBox();
    if (bbox.width === 0 || bbox.height === 0) {
         applyTransforms(shape, transforms);
         return;
    }
    const maxWidth = LOGICAL_WIDTH * 0.9;
    const maxHeight = LOGICAL_HEIGHT * 0.9;
    const scaleX = maxWidth / bbox.width;
    const scaleY = maxHeight / bbox.height;
    const scale = Math.min(scaleX, scaleY);
    if (scale < 1) {
        transforms.scaleX = scale;
        transforms.scaleY = scale;
    }
    applyTransforms(shape, transforms);
}

function showKeyframeMenu(shape, time, x, y) {
    activeKeyframe = { shape, time };
    const kf = animationData[shape.id].keyframes.find(k => k.time === time);
    if (keyframeMenu) {
        document.getElementById('easing-select').value = kf.easing || 'linear';
        keyframeMenu.style.left = `${x}px`;
        keyframeMenu.style.top = `${y}px`;
        keyframeMenu.style.display = 'block';
    }
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

// ==================================================
// --- MOTOR DE ANIMACIÓN Y REPRODUCCIÓN ---
// ==================================================

function updateStateAtTime(time) {
    for (const shapeId in animationData) {
        const shape = document.getElementById(shapeId);
        const keyframes = animationData[shapeId]?.keyframes;

        if (!shape || !keyframes || keyframes.length === 0) continue;

        let kf1 = null, kf2 = null;

        for (let i = keyframes.length - 1; i >= 0; i--) {
            if (keyframes[i].time <= time) {
                kf1 = keyframes[i];
                break;
            }
        }

        for (let i = 0; i < keyframes.length; i++) {
            if (keyframes[i].time > time) {
                kf2 = keyframes[i];
                break;
            }
        }

        if (kf1 && !kf2) {
            applyTransforms(shape, kf1.attrs);
        } else if (!kf1 && kf2) {
            applyTransforms(shape, kf2.attrs);
        } else if (kf1 && kf2) {
            const segmentDuration = kf2.time - kf1.time;
            const progress = (segmentDuration === 0) ? 1 : (time - kf1.time) / segmentDuration;
            const interpolatedAttrs = {};
            for (const key in kf1.attrs) {
                if (typeof kf1.attrs[key] === 'number' && typeof kf2.attrs[key] === 'number') {
                    interpolatedAttrs[key] = kf1.attrs[key] + (kf2.attrs[key] - kf1.attrs[key]) * progress;
                } else {
                    interpolatedAttrs[key] = kf1.attrs[key];
                }
            }
            applyTransforms(shape, interpolatedAttrs);
        }
    }
}

function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (playBtn) {
        playBtn.textContent = 'Play';
        playBtn.classList.remove('bg-red-500');
        playBtn.classList.add('bg-indigo-500');
    }
}

function syncPlaybackControls(nuevaDuracionMs) {
    console.log(`Sincronizando controles a nueva duración: ${nuevaDuracionMs}ms`);
    stopAnimation();
    DURATION = nuevaDuracionMs;

    if (timelineSlider) {
        timelineSlider.max = DURATION;
        timelineSlider.value = 0;
    }
    if (timeLabel) {
        timeLabel.textContent = '0.0s';
    }
    if (durationInput) {
        durationInput.value = (DURATION / 1000).toFixed(2);
    }

    renderLayerList();
    updateStateAtTime(0);
}

// ==================================================
// --- INICIALIZACIÓN Y EVENT LISTENERS (SECCIÓN CORREGIDA Y UNIFICADA) ---
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Asignación de Elementos del DOM ---
    svgCanvas = document.getElementById('svg-canvas');
    shapesContainer = document.getElementById('shapes-container');
    colorPicker = document.getElementById('color-picker');
    deleteBtn = document.getElementById('delete-btn');
    timelineSlider = document.getElementById('timeline-slider');
    timeLabel = document.getElementById('time-label');
    playBtn = document.getElementById('play-btn');
    toast = document.getElementById('toast');
    durationInput = document.getElementById('duration-input');
    layerList = document.getElementById('layer-list');
    importInput = document.getElementById('import-input');
    transformControls = document.getElementById('transform-controls');
    selectionActions = document.getElementById('selection-actions');
    keyframeMenu = document.getElementById('keyframe-menu');

    // --- Configuración Inicial ---
    if (window.escenasSvg && window.escenasSvg.length > 0) {
        cargarEscena(0);
    } else {
        renderizarListaDeEscenas();
    }

    if (timelineSlider) {
        timelineSlider.max = DURATION;
        timelineSlider.value = 0;
    }
    if (durationInput) {
        durationInput.value = (DURATION / 1000).toFixed(2);
    }

    // --- Listeners de Controles Principales ---
    const addRectBtn = document.getElementById('add-rect-btn');
    if (addRectBtn) addRectBtn.addEventListener('click', () => createShape('rect'));
    
    const addCircleBtn = document.getElementById('add-circle-btn');
    if (addCircleBtn) addCircleBtn.addEventListener('click', () => createShape('circle'));

    if (deleteBtn) deleteBtn.addEventListener('click', () => {
        if (selectedShape) {
            delete animationData[selectedShape.id];
            selectedShape.remove();
            deselectAll();
            renderLayerList();
        }
    });

    const setKeyframeBtn = document.getElementById('set-keyframe-btn');
    if (setKeyframeBtn) setKeyframeBtn.addEventListener('click', () => {
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

    // --- Listeners de la Línea de Tiempo ---
    if (timelineSlider) timelineSlider.addEventListener('input', (e) => {
        stopAnimation();
        const currentTime = parseInt(e.target.value, 10);
        if (timeLabel) {
            timeLabel.textContent = (currentTime / 1000).toFixed(1) + 's';
        }
        updateStateAtTime(currentTime);
    });

    if (durationInput) durationInput.addEventListener('change', (e) => {
        const newDuration = parseFloat(e.target.value) * 1000;
        if (!isNaN(newDuration) && newDuration > 0) {
            DURATION = newDuration;
            timelineSlider.max = DURATION;
            renderLayerList();
        }
    });

    if (playBtn) playBtn.addEventListener('click', () => {
        if (animationFrameId) {
            stopAnimation();
            return;
        }

        playBtn.textContent = 'Stop';
        playBtn.classList.remove('bg-indigo-500');
        playBtn.classList.add('bg-red-500');

        let currentTime = parseInt(timelineSlider.value, 10);
        if (currentTime >= DURATION) {
            currentTime = 0;
        }
        const startTime = performance.now() - currentTime;

        function animationLoop(timestamp) {
            const elapsedTime = timestamp - startTime;
            if (elapsedTime >= DURATION) {
                timelineSlider.value = DURATION;
                timeLabel.textContent = (DURATION / 1000).toFixed(1) + 's';
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

    // --- Listeners de Interacción con el Canvas ---
    if (svgCanvas) svgCanvas.addEventListener('mousedown', (e) => { if (e.target === svgCanvas) deselectAll(); });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging && !isTransforming) return;
        e.preventDefault();
        const mousePos = getMousePosition(e);
        if (isDragging && selectedShape) {
            const newTransforms = getShapeTransforms(selectedShape);
            newTransforms.x = mousePos.x;
            newTransforms.y = mousePos.y;
            applyTransforms(selectedShape, newTransforms);
        } else if (isTransforming && selectedShape) {
            // Lógica de transformación (rotar, escalar)
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        isTransforming = false;
    });

    if (transformControls) transformControls.addEventListener('mousedown', (e) => {
        // Lógica para iniciar la transformación
    });

    // --- Listeners de Importación y Exportación ---
    const importSvgBtn = document.getElementById('import-svg-btn');
    if (importSvgBtn) importSvgBtn.addEventListener('click', () => {
        if (importInput) {
            importInput.accept = 'image/svg+xml';
            importInput.click();
        }
    });

    const importImgBtn = document.getElementById('import-img-btn');
    if (importImgBtn) importImgBtn.addEventListener('click', () => {
        if (importInput) {
            importInput.accept = 'image/png, image/jpeg';
            importInput.click();
        }
    });
    
    if (importInput) importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type === "image/svg+xml") handleSvgImport(file);
        else if (file.type.startsWith("image/")) handleImageImport(file);
        else showToast("Tipo de archivo no soportado.");
        e.target.value = '';
    });

    const importDatoBtn = document.getElementById('import-dato-img-btn');
    if (importDatoBtn) importDatoBtn.addEventListener('click', openDatoImageModal);
    
    // --- Listeners de Menús y Popups ---
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
            if (popup && !popup.contains(e.target) && e.target !== selectorBtn) {
                popup.classList.add('hidden');
            }
        });
    }
    
    if (keyframeMenu) {
        document.addEventListener('click', (e) => {
            if (!keyframeMenu.contains(e.target)) {
                keyframeMenu.style.display = 'none';
            }
        });
    }

    // --- Listener para Sincronización con IA ---
    document.addEventListener('escenaIACargada', (e) => {
        console.log("Evento 'escenaIACargada' recibido.");
        if (e.detail && typeof e.detail.duracionMs === 'number') {
            syncPlaybackControls(e.detail.duracionMs);
        }
    });
});
