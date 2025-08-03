// --- MANEJO DE NODOS Y UI ---

/**
 * --- FUNCIÓN CORREGIDA ---
 * Añade un nodo al lienzo y restaura su estado si se proporciona.
 */
function pAddNode(pType, pId = null, pPosition = null, pState = null, pRecord = true) {
    const pNodeId = pId || `p-node-${pNodeIdCounter++}`;
    if (pId) {
        const pExistingId = parseInt(pId.split('-')[2]);
        if (pExistingId >= pNodeIdCounter) pNodeIdCounter = pExistingId + 1;
    }

    const pNodeDef = pNodeDefinitions[pType];
    if (!pNodeDef) {
        console.error(`[P-DEBUG] Definición de nodo no encontrada para el tipo: ${pType}`);
        return;
    }

    const pNodeElement = document.createElement('div');
    pNodeElement.id = pNodeId;
    pNodeElement.className = 'p-node';
    
    if (pCanvas) {
        pCanvas.appendChild(pNodeElement);
    } else {
        console.error("[P-DEBUG] Error: El elemento p-canvas no se encontró en el DOM.");
        return;
    }
    
    pNodeElement.innerHTML = `<div class="p-node-header">${pNodeDef.title}</div><div class="p-node-content">${pNodeDef.content}</div>`;

    if (pPosition) {
        pNodeElement.style.left = `${pPosition.x}px`;
        pNodeElement.style.top = `${pPosition.y}px`;
    } else {
        if (pCanvasContainer) {
            const centerX = pCanvasContainer.scrollLeft + (pCanvasContainer.clientWidth / 2);
            const centerY = pCanvasContainer.scrollTop + (pCanvasContainer.clientHeight / 2);
            const finalX = (centerX / pZoomLevel) - (pNodeElement.offsetWidth / 2);
            const finalY = (centerY / pZoomLevel) - (pNodeElement.offsetHeight / 2);
            pNodeElement.style.left = `${finalX}px`;
            pNodeElement.style.top = `${finalY}px`;
        } else {
            pNodeElement.style.left = `2500px`;
            pNodeElement.style.top = `2500px`;
        }
    }

    // --- BLOQUE DE RESTAURACIÓN DE ESTADO CORREGIDO ---
    if (pState) {
        pNodeElement.querySelectorAll('[data-save]').forEach(pEl => {
            const key = pEl.getAttribute('data-save');
            if (pState[key] !== undefined) {
                // Aplicamos el valor según el tipo de elemento
                switch (pEl.type) {
                    case 'checkbox':
                        pEl.checked = pState[key]; // Restauramos el estado del checkbox
                        break;
                    case 'select-one':
                    case 'text':
                    case 'textarea':
                    case 'number':
                    default:
                        pEl.value = pState[key]; // Restauramos el valor de los demás
                        break;
                }
            }
        });
    }
    
    const pNode = { id: pNodeId, element: pNodeElement, type: pType, def: pNodeDef };
    pNodes[pNodeId] = pNode;

    pAddConnectors(pNode);
    pMakeDraggable(pNodeElement);
    
    pNodeElement.addEventListener('contextmenu', (pE) => {
        pE.preventDefault();
        if (confirm(`¿Estás seguro de que quieres eliminar el nodo "${pNodeDef.title}"?`)) {
            pRemoveNode(pNodeId);
        }
    });

    if (pRecord) {
        pRecordHistory();
    }
    return pNode;
}


function pRemoveNode(pNodeId) {
    const pNodeToRemove = pNodes[pNodeId];
    if (!pNodeToRemove) return;

    pConnections = pConnections.filter(pConn => {
        if (pConn.from === pNodeId || pConn.to === pNodeId) {
            if (pConn.line) pConn.line.remove();
            return false;
        }
        return true;
    });

    pNodeToRemove.element.remove();
    delete pNodes[pNodeId];
    pRecordHistory();
}

function pMakeDraggable(pElement) {
    let pPos1 = 0, pPos2 = 0, pPos3 = 0, pPos4 = 0;
    const header = pElement.querySelector('.p-node-header');
    (header || pElement).onmousedown = pDragMouseDown;

    function pDragMouseDown(pE) {
        // Permitir arrastrar solo con el botón izquierdo y si no se está interactuando con un conector o un campo de formulario
        if (pE.button !== 0 || pE.target.classList.contains('p-connector') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(pE.target.tagName)) return;
        pE.preventDefault();
        pE.stopPropagation();
        pPos3 = pE.clientX;
        pPos4 = pE.clientY;
        document.onmouseup = pCloseDragElement;
        document.onmousemove = pElementDrag;
    }

    function pElementDrag(pE) {
        pE.preventDefault();
        pPos1 = (pPos3 - pE.clientX) / pZoomLevel;
        pPos2 = (pPos4 - pE.clientY) / pZoomLevel;
        pPos3 = pE.clientX;
        pPos4 = pE.clientY;
        pElement.style.top = `${pElement.offsetTop - pPos2}px`;
        pElement.style.left = `${pElement.offsetLeft - pPos1}px`;
        pUpdateAllConnections();
    }

    function pCloseDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        pRecordHistory();
    }
}

// --- FUNCIONES DE ZOOM Y PAN ---

function pApplyZoom(newZoom) {
    pZoomLevel = Math.max(0.5, Math.min(newZoom, 1.8));
    if (pCanvas) {
        pCanvas.style.transformOrigin = '0 0';
        pCanvas.style.transform = `scale(${pZoomLevel})`;
    }
    const pZoomIndicator = document.getElementById('p-zoom-level-indicator');
    if (pZoomIndicator) {
        pZoomIndicator.textContent = `${Math.round(pZoomLevel * 100)}%`;
    }
    setTimeout(pUpdateAllConnections, 0);
}

function pHandleZoom(event) {
    event.preventDefault();
    const zoomIntensity = 0.1;
    const direction = event.deltaY < 0 ? 1 : -1;
    const newZoom = pZoomLevel + direction * zoomIntensity;
    pApplyZoom(newZoom);
}

function pCenterView() {
    if (pCanvasContainer && pCanvas) {
        pCanvasContainer.scrollLeft = (pCanvas.offsetWidth * pZoomLevel - pCanvasContainer.clientWidth) / 2;
        pCanvasContainer.scrollTop = (pCanvas.offsetHeight * pZoomLevel - pCanvasContainer.clientHeight) / 2;
    }
}

function pInitUI() {
    const pZoomInBtn = document.getElementById('p-zoom-in-btn');
    const pZoomOutBtn = document.getElementById('p-zoom-out-btn');
    
    if (pCanvasContainer && pZoomInBtn && pZoomOutBtn) {
        pCanvas.style.width = '5000px';
        pCanvas.style.height = '5000px';

        pZoomInBtn.addEventListener('click', () => pApplyZoom(pZoomLevel + 0.1));
        pZoomOutBtn.addEventListener('click', () => pApplyZoom(pZoomLevel - 0.1));
        pCanvasContainer.addEventListener('wheel', pHandleZoom, { passive: false });
        
        // --- LÓGICA DE PANNING (ARRASTRE) ---
        let isPanning = false;
        let startX, startY, startScrollLeft, startScrollTop;

        const handlePanning = (e) => {
            if (!isPanning) return;
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            pCanvasContainer.scrollLeft = startScrollLeft - dx;
            pCanvasContainer.scrollTop = startScrollTop - dy;
        };

        const stopPanning = () => {
            if (!isPanning) return;
            isPanning = false;
            pCanvas.style.cursor = 'grab';
            document.removeEventListener('mousemove', handlePanning);
            document.removeEventListener('mouseup', stopPanning);
        };

        pCanvas.addEventListener('mousedown', (e) => {
            // Iniciar panning solo si se hace clic en el fondo del canvas
            if (e.target === pCanvas) {
                isPanning = true;
                pCanvas.style.cursor = 'grabbing';
                startX = e.clientX;
                startY = e.clientY;
                startScrollLeft = pCanvasContainer.scrollLeft;
                startScrollTop = pCanvasContainer.scrollTop;
                e.preventDefault();

                document.addEventListener('mousemove', handlePanning);
                document.addEventListener('mouseup', stopPanning);
            }
        });
        
        pCanvas.style.cursor = 'grab';
        pCanvasContainer.addEventListener('scroll', pUpdateAllConnections);
    }
}
