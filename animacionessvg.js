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
        
        let selectedShape = null;
        let shapeCounter = 0;
        let isDragging = false;
        let isTransforming = false;
        let transformAction = {};
        let dragOffset = { x: 0, y: 0 };
        let activeKeyframe = { shape: null, time: null };
        const animationData = {};
        let DURATION = 5000;
        timelineSlider.max = DURATION;
        let animationFrameId = null;

        // --- FUNCIONES DE TRANSFORMACIÓN ---
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

        // --- LÓGICA DE LA APLICACIÓN ---
        const getMousePosition = (evt) => {
            const CTM = svgCanvas.getScreenCTM();
            if (!CTM) return { x: 0, y: 0 };
            return { x: (evt.clientX - CTM.e) / CTM.a, y: (evt.clientY - CTM.f) / CTM.d };
        };
        const showToast = (message, isError = true) => {
            toast.textContent = message;
            toast.className = `bg-${isError ? 'red' : 'green'}-500 show`;
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
        
        // --- GESTIÓN DE CAPAS Y EVENTOS DE UI ---
        function renderLayerList() {
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
                    <div class="timeline-track h-4 bg-gray-200 mt-2 rounded-full relative">
                        ${keyframesHTML}
                    </div>`;
                
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

        // --- IMPORTACIÓN ---
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
                    // Aplica el centrado y escalado automático
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
                    // Aplica el centrado y escalado automático
                    centerAndScaleShape(newShape);

                    selectShape(newShape);
                    showToast(`SVG importado.`, false);
                } catch (error) {
                    showToast("Error al procesar el archivo SVG."); console.error("SVG Parse Error:", error);
                }
            };
            reader.readAsText(file);
        }

        // --- EVENT LISTENERS PRINCIPALES ---
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

        svgCanvas.addEventListener('mousedown', (e) => {
            if (e.target === svgCanvas) deselectAll();
        });

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

                    let localDx = dx * cos - dy * sin;
                    let localDy = dx * sin + dy * cos;

                    if (type.includes('left')) localDx *= -1;
                    if (type.includes('top')) localDy *= -1;

                    let newWidth = localDx;
                    let newHeight = localDy;
                    
                    if (type.includes('middle')) {
                        if (type.includes('left') || type.includes('right')) newHeight = bbox.height * (initialTransform.scaleY);
                        else newWidth = bbox.width * (initialTransform.scaleX);
                    }

                    if (e.shiftKey && type.includes('-')) {
                        const ratio = Math.max(Math.abs(newWidth / bbox.width), Math.abs(newHeight / bbox.height));
                        newWidth = bbox.width * ratio;
                        newHeight = bbox.height * ratio;
                    }
                    
                    newTransforms.scaleX = newWidth / bbox.width;
                    newTransforms.scaleY = newHeight / bbox.height;
                    
                    const newCenter = { x: anchor.x + (dx / 2), y: anchor.y + (dy / 2) };
                    const centerOffset = { x: newCenter.x - center.x, y: newCenter.y - center.y };
                    
                    newTransforms.x = initialTransform.x + centerOffset.x;
                    newTransforms.y = initialTransform.y + centerOffset.y;
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

        // --- LÓGICA DE KEYFRAMES Y ANIMACIÓN ---
        document.getElementById('set-keyframe-btn').addEventListener('click', () => {
            if (!selectedShape) { showToast('Por favor, selecciona una forma.'); return; }
            const time = parseInt(timelineSlider.value);
            const shapeId = selectedShape.id;
            const keyframes = animationData[shapeId].keyframes;
            const newKf = { time, attrs: getShapeTransforms(selectedShape), easing: 'linear' };
            const existingKfIndex = keyframes.findIndex(kf => kf.time === time);
            if (existingKfIndex > -1) {
                keyframes[existingKfIndex].attrs = newKf.attrs;
            } else {
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
                const keyframes = animationData[shape.id].keyframes;
                const kf = keyframes.find(k => k.time === time);
                if (kf) {
                    kf.easing = e.target.value;
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!keyframeMenu.contains(e.target)) {
                keyframeMenu.style.display = 'none';
            }
        });

        // --- UPDATE: Lógica de animación en tiempo real (Refactorizada) ---
        function updateStateAtTime(time) {
            Object.keys(animationData).forEach(shapeId => {
                const shape = document.getElementById(shapeId);
                const keyframes = animationData[shapeId]?.keyframes;
                if (!shape || !keyframes || keyframes.length === 0) return;

                // Encuentra el keyframe anterior (o actual) y el siguiente
                let kf1 = keyframes.filter(kf => kf.time <= time).pop();
                let kf2 = keyframes.find(kf => kf.time > time);

                // Casos extremos
                if (!kf1 && !kf2) return; // No hay keyframes
                if (!kf1) { applyTransforms(shape, kf2.attrs); return; } // Antes del primer keyframe
                if (!kf2) { applyTransforms(shape, kf1.attrs); return; } // Después del último keyframe

                const easing = kf1.easing || 'linear';
                let t = (kf2.time - kf1.time === 0) ? 1 : (time - kf1.time) / (kf2.time - kf1.time);
                
                // Ajusta el progreso 't' según el tipo de movimiento
                if (easing === 'steps') {
                    const numberOfHops = 15; // Número de saltos entre keyframes
                    // Progreso 't' al inicio y fin del salto actual
                    const previousHopT = Math.floor(t * numberOfHops) / numberOfHops;
                    const nextHopT = (Math.floor(t * numberOfHops) + 1) / numberOfHops;
                    // Duración del salto actual (en términos de t)
                    const hopSegmentDuration = 1 / numberOfHops;
                    // Progreso (0 a 1) DENTRO del salto actual
                    const progressWithinHop = (t - previousHopT) / hopSegmentDuration;
                    // Aplicar una curva de suavizado a este progreso interno
                    const smoothedProgress = progressWithinHop < 0.5 ? 2 * progressWithinHop * progressWithinHop : 1 - Math.pow(-2 * progressWithinHop + 2, 2) / 2;
                    // Calcular el progreso 't' final, que combina el salto con el suavizado interno
                    t = Math.min(previousHopT + (nextHopT - previousHopT) * smoothedProgress, 1.0);
                } else if (easing === 'ease-in-out') {
                    // Fórmula de suavizado
                    t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                }
                // Para 'linear', se usa el valor original de 't'

                // Interpola los atributos basado en el progreso 't' calculado
                const interpolated = {};
                for (const key in kf1.attrs) {
                    if (typeof kf1.attrs[key] === 'number') {
                        interpolated[key] = kf1.attrs[key] + (kf2.attrs[key] - kf1.attrs[key]) * t;
                    } else {
                        // Valores no numéricos (como el color) cambian de golpe al final del segmento
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
                playBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                playBtn.classList.add('bg-indigo-500', 'hover:bg-indigo-600');
            }
        }
        
        playBtn.addEventListener('click', () => {
            if (animationFrameId) { stopAnimation(); return; }
            playBtn.textContent = 'Stop';
            playBtn.classList.remove('bg-indigo-500', 'hover:bg-indigo-600');
            playBtn.classList.add('bg-red-500', 'hover:bg-red-600');
            // Si la animación está al final, la reinicia
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

        // --- UPDATE: Lógica de exportación corregida ---
      // --- UPDATE: Lógica de exportación corregida ---
        document.getElementById('export-btn3').addEventListener('click', () => {
            const finalSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            finalSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            const canvasRect = svgCanvas.getBoundingClientRect();
            // finalSvg.setAttribute('width', canvasRect.width);
            // finalSvg.setAttribute('height', canvasRect.height);
            finalSvg.setAttribute('width', 1920);
            finalSvg.setAttribute('height', 1080);
            finalSvg.setAttribute('viewBox', `0 0 ${canvasRect.width} ${canvasRect.height}`);

            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            let cssRules = '';

            const shapesClone = shapesContainer.cloneNode(true);
            
            Array.from(shapesClone.children).forEach(shapeInClone => {
                const shapeId = shapeInClone.id;
                const animInfo = animationData[shapeId];
                if (!animInfo || animInfo.keyframes.length < 2) return;

                shapeInClone.removeAttribute('class');
                shapeInClone.removeAttribute('transform');
                
                const bbox = document.getElementById(shapeId).getBBox();
                const cx = bbox.x + bbox.width / 2;
                const cy = bbox.y + bbox.height / 2;

                const animationName = `anim-${shapeId}`;
                let keyframesRule = `@keyframes ${animationName} {\n`;
                
                const keyframeRules = {}; 

                const addRule = (time, attrs) => {
                    const percentage = (time / DURATION) * 100;
                    if (percentage < 0 || percentage > 100) return;
                    
                    // Esta es la misma lógica de transformación que en `applyTransforms`, que es correcta.
                    const transform = `translate(${attrs.x}px, ${attrs.y}px) rotate(${attrs.rotation}deg) scale(${attrs.scaleX}, ${attrs.scaleY}) translate(${-cx}px, ${-cy}px)`;
                    const fill = (shapeInClone.tagName !== 'g' && shapeInClone.tagName !== 'image') ? `fill: ${attrs.fill};` : '';

                    // --- FIX --- Se ha eliminado la propiedad 'transform-origin' que causaba el conflicto.
                    keyframeRules[percentage.toFixed(3)] = `  ${percentage.toFixed(2)}% { transform: ${transform}; ${fill} }\n`;
                };

                // El resto del código que "hornea" los keyframes para los easings no necesita cambios.
                for (let i = 0; i < animInfo.keyframes.length; i++) {
                    const kf1 = animInfo.keyframes[i];
                    const kf2 = animInfo.keyframes[i + 1];
                    
                    addRule(kf1.time, kf1.attrs);

                    if (kf2) {
                        const easing = kf1.easing || 'linear';
                        const segmentDuration = kf2.time - kf1.time;
                        if (segmentDuration <= 0) continue;

                        if (easing === 'steps') {
                            const hops = 15;
                            const subSteps = 5;

                            for (let j = 0; j < hops; j++) {
                                const hopStartT = j / hops;
                                const hopEndT = (j + 1) / hops;
                                const hopStartAttrs = {}, hopEndAttrs = {};
                                for (const key in kf1.attrs) {
                                    if (typeof kf1.attrs[key] === 'number') {
                                        hopStartAttrs[key] = kf1.attrs[key] + (kf2.attrs[key] - kf1.attrs[key]) * hopStartT;
                                        hopEndAttrs[key] = kf1.attrs[key] + (kf2.attrs[key] - kf1.attrs[key]) * hopEndT;
                                    } else { hopStartAttrs[key] = kf1.attrs[key]; hopEndAttrs[key] = kf1.attrs[key]; }
                                }
                                hopStartAttrs.fill = kf1.attrs.fill; hopEndAttrs.fill = kf1.attrs.fill;
                                for (let k = 0; k <= subSteps; k++) {
                                    let subProgress = k / subSteps;
                                    let easedSubProgress = subProgress < 0.5 ? 2 * subProgress * subProgress : 1 - Math.pow(-2 * subProgress + 2, 2) / 2;
                                    const subStepTime = (kf1.time + segmentDuration * hopStartT) + (segmentDuration / hops) * subProgress;
                                    const subStepAttrs = {};
                                    for (const key in hopStartAttrs) {
                                        if (typeof hopStartAttrs[key] === 'number') {
                                            subStepAttrs[key] = hopStartAttrs[key] + (hopEndAttrs[key] - hopStartAttrs[key]) * easedSubProgress;
                                        } else { subStepAttrs[key] = hopStartAttrs[key]; }
                                    }
                                    subStepAttrs.fill = hopStartAttrs.fill;
                                    addRule(subStepTime, subStepAttrs);
                                }
                            }
                            addRule(kf2.time, kf2.attrs);

                        } else if (easing === 'ease-in-out') {
                            const steps = 20;
                            for (let j = 1; j <= steps; j++) {
                                let t = j / steps;
                                const eased_t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                                const intermediateTime = kf1.time + segmentDuration * t;
                                const interpolatedAttrs = {};
                                for (const key in kf1.attrs) {
                                    if (typeof kf1.attrs[key] === 'number') {
                                        interpolatedAttrs[key] = kf1.attrs[key] + (kf2.attrs[key] - kf1.attrs[key]) * eased_t;
                                    } else { interpolatedAttrs[key] = kf1.attrs[key]; }
                                }
                                interpolatedAttrs.fill = (eased_t < 1) ? kf1.attrs.fill : kf2.attrs.fill;
                                addRule(intermediateTime, interpolatedAttrs);
                            }
                        }
                    }
                }
                
                Object.keys(keyframeRules).sort((a,b) => parseFloat(a) - parseFloat(b)).forEach(key => {
                    keyframesRule += keyframeRules[key];
                });

                keyframesRule += '}\n';
                cssRules += keyframesRule;
                cssRules += `#${shapeId} { animation: ${animationName} ${DURATION / 1000}s linear infinite; }\n`;
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
       
        
function centerAndScaleShape(shape) {
            // Obtener las transformaciones iniciales y las dimensiones del lienzo
            const transforms = getShapeTransforms(shape);
            const canvasRect = svgCanvas.getBoundingClientRect();
            
            // 1. Centrar el objeto en el lienzo
            transforms.x = canvasRect.width / 2;
            transforms.y = canvasRect.height / 2;

            // Obtener el cuadro delimitador (bounding box) del objeto sin transformar
            const bbox = shape.getBBox();

            // Si el objeto no tiene dimensiones, no se puede escalar
            if (bbox.width === 0 || bbox.height === 0) {
                 applyTransforms(shape, transforms); // Solo aplicar centrado y salir
                 return;
            }

            // 2. Calcular la escala para que quepa en el 90% del lienzo si es necesario
            const maxWidth = canvasRect.width * 0.9;
            const maxHeight = canvasRect.height * 0.9;

            const scaleX = maxWidth / bbox.width;
            const scaleY = maxHeight / bbox.height;
            
            // Usar el factor de escala más pequeño para mantener la relación de aspecto
            const scale = Math.min(scaleX, scaleY);
            
            // Solo aplicar la escala si el objeto es más grande que el área permitida (escala < 1)
            if (scale < 1) {
                transforms.scaleX = scale;
                transforms.scaleY = scale;
            }
            
            // 3. Aplicar las transformaciones de posición y escala
            applyTransforms(shape, transforms);
        }
// --- NUEVA FUNCIONALIDAD PARA IMPORTAR IMAGEN DESDE DATOS ---

/**
 * Abre un modal que muestra todos los "Datos" del proyecto que tienen una imagen,
 * permitiendo al usuario seleccionar uno para importarlo al lienzo de animación.
 */
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

            // ▼▼▼ INICIO DE LA CORRECCIÓN ▼▼▼
            item.onclick = async () => {
                try {
                    // La función handleImageImport espera un objeto File.
                    // Convertimos la URL de la imagen (que puede ser local/base64) a un objeto File.
                    const response = await fetch(img.src);
                    const blob = await response.blob();
                    const fileName = nombre.replace(/[^a-zA-Z0-9.-]/g, '_') + '.png';
                    const file = new File([blob], fileName, { type: blob.type });
                    
                    // Llamamos a la función de importación existente con el objeto File correcto.
                    handleImageImport(file);
                    
                    document.body.removeChild(modal);
                } catch (error) {
                    console.error("Error al procesar la imagen del dato:", error);
                    showToast("No se pudo importar la imagen seleccionada.");
                }
            };
            // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲

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

// --- EVENT LISTENER PARA EL NUEVO BOTÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicialización del resto de la UI
    renderLayerList();

    // Listener para el nuevo botón
    const importDatoBtn = document.getElementById('import-dato-img-btn');
    if (importDatoBtn) {
        importDatoBtn.addEventListener('click', openDatoImageModal);
    }
});

// --- EVENT LISTENER PARA EL NUEVO BOTÓN ---
// Este código debe ejecutarse después de que el DOM esté completamente cargado.
document.addEventListener('DOMContentLoaded', () => {
    const importDatoBtn = document.getElementById('import-dato-img-btn');
    if (importDatoBtn) {
        importDatoBtn.addEventListener('click', openDatoImageModal);
    }
});

        // Inicialización
        renderLayerList();


        