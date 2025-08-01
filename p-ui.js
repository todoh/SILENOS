// --- MANEJO DE NODOS Y UI ---

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
        // --- LÓGICA MODIFICADA PARA POSICIONAR EN EL CURSOR ---
        // --- LÓGICA MODIFICADA PARA POSICIONAR EN EL CENTRO DE LA VISTA ---
if (pCanvasContainer) {
    // Calcular el centro del área visible del contenedor sumando el scroll y la mitad del ancho/alto visible
    const centerX = pCanvasContainer.scrollLeft + (pCanvasContainer.clientWidth / 2);
    const centerY = pCanvasContainer.scrollTop + (pCanvasContainer.clientHeight / 2);

    // Ajustar la posición calculada por el nivel de zoom actual
    const finalX = centerX / pZoomLevel;
    const finalY = centerY / pZoomLevel;
    
    pNodeElement.style.left = `${finalX}px`;
    pNodeElement.style.top = `${finalY}px`;
} else {
            pNodeElement.style.left = `2500px`;
            pNodeElement.style.top = `2500px`;
        }
    }

    if (pState) {
        pNodeElement.querySelectorAll('[data-save]').forEach(pEl => {
            if (pState[pEl.getAttribute('data-save')] !== undefined) {
                pEl.value = pState[pEl.getAttribute('data-save')];
            }
        });
    }
    
    const pNode = { id: pNodeId, element: pNodeElement, type: pType, def: pNodeDef };
    pNodes[pNodeId] = pNode;

    pAddConnectors(pNode);
    pMakeDraggable(pNodeElement);
    
    pNodeElement.addEventListener('contextmenu', (pE) => {
        pE.preventDefault();
        pRemoveNode(pNodeId);
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
        if (pE.button !== 0 || pE.target.classList.contains('p-connector') || pE.target.tagName === 'INPUT') return;
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
        pCanvasContainer.scrollLeft = (pCanvas.offsetWidth - pCanvasContainer.clientWidth) / 2;
        pCanvasContainer.scrollTop = (pCanvas.offsetHeight - pCanvasContainer.clientHeight) / 2;
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
        
        pCanvasContainer.addEventListener('mousemove', (e) => {
            const rect = pCanvasContainer.getBoundingClientRect();
            pLastMousePosition.x = e.clientX - rect.left;
            pLastMousePosition.y = e.clientY - rect.top;
        });

        // --- LÓGICA DE PANNING (ARRASTRE) CORREGIDA Y MEJORADA ---
        let isPanning = false;
        let startX, startY, startScrollLeft, startScrollTop;

        const handlePanning = (e) => {
            if (!isPanning) return;
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            pCanvasContainer.scrollLeft = startScrollLeft - dx;
            pCanvasContainer.scrollTop = startScrollTop - dy;
            // No es necesario llamar a pUpdateAllConnections aquí,
            // el evento 'scroll' ya lo hace.
        };

        const stopPanning = () => {
            if (!isPanning) return;
            isPanning = false;
            pCanvas.style.cursor = 'grab';
            document.removeEventListener('mousemove', handlePanning);
            document.removeEventListener('mouseup', stopPanning);
        };

        pCanvas.addEventListener('mousedown', (e) => {
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
