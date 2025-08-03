// --- MANEJO DE CONEXIONES ---

function pCreateConnection(pFromData, pToData, pRecord = true) {
    if (typeof LeaderLine === 'undefined') {
        console.error("[P-DEBUG] pCreateConnection: ¡LeaderLine library NO está cargada!");
        return null;
    }

    const { nodeId: pFromNodeId, index: pFromIndex } = pFromData;
    const { nodeId: pToNodeId, index: pToIndex } = pToData;

    const pFromNode = pNodes[pFromNodeId];
    const pToNode = pNodes[pToNodeId];
    if (!pFromNode || !pToNode) return null;

    // Evita que una entrada reciba más de una conexión
    if (pConnections.some(pC => pC.to.nodeId === pToNodeId && pC.to.index === pToIndex)) {
        console.warn(`[P-DEBUG] El conector de entrada ${pToIndex} del nodo ${pToNodeId} ya tiene una conexión.`);
        return null;
    }

    const pStartEl = pFromNode.element.querySelector(`.p-connector.p-output[data-index="${pFromIndex}"]`);
    const pEndEl = pToNode.element.querySelector(`.p-connector.p-input[data-index="${pToIndex}"]`);
    if (!pStartEl || !pEndEl) return null;

   const pLine = new LeaderLine(pStartEl, pEndEl, {
    parent: pCanvas, color: '#8e44ad', size: 3, path: 'fluid',
    startSocket: 'right', endSocket: 'left'
   });

    const pConnection = { from: pFromData, to: pToData, line: pLine };
    pConnections.push(pConnection);
    if (pRecord) pRecordHistory();
    return pConnection;
}

/**
 * --- FUNCIÓN CORREGIDA ---
 * Dibuja la cantidad correcta de conectores para un nodo, basándose en su definición.
 * Ahora soporta múltiples entradas y salidas.
 */
function pAddConnectors(pNode) {
    const totalInputs = pNode.def.inputs || 0;
    const totalOutputs = pNode.def.outputs || 0;
    const inputNames = pNode.def.inputNames || [];
    const outputNames = pNode.def.outputNames || [];

    // Bucle para crear todos los conectores de ENTRADA
    for (let i = 0; i < totalInputs; i++) {
        const pInput = document.createElement('div');
        pInput.className = 'p-connector p-input';
        pInput.dataset.nodeId = pNode.id;
        pInput.dataset.type = 'input';
        pInput.dataset.index = i;
        pInput.title = inputNames[i] || `Entrada ${i + 1}`; // Añade un tooltip con el nombre

        // Calcula la posición vertical para distribuir los conectores
        pInput.style.top = `${((i + 1) / (totalInputs + 1)) * 100}%`;
        
        pNode.element.appendChild(pInput);
        pInput.addEventListener('click', pOnConnectorClick);
    }
    
    // Bucle para crear todos los conectores de SALIDA
    for (let i = 0; i < totalOutputs; i++) {
        const pOutput = document.createElement('div');
        pOutput.className = 'p-connector p-output';
        pOutput.dataset.nodeId = pNode.id;
        pOutput.dataset.type = 'output';
        pOutput.dataset.index = i;
        pOutput.title = outputNames[i] || `Salida ${i + 1}`; // Añade un tooltip con el nombre

        // Calcula la posición vertical
        pOutput.style.top = `${((i + 1) / (totalOutputs + 1)) * 100}%`;
        
        pNode.element.appendChild(pOutput);
        pOutput.addEventListener('click', pOnConnectorClick);
    }
}


function pOnConnectorClick(pE) {
    pE.stopPropagation();
    const pConnector = pE.target;
    const pConnectorData = {
        nodeId: pConnector.dataset.nodeId,
        index: parseInt(pConnector.dataset.index, 10),
        type: pConnector.dataset.type
    };
    
    if (pConnectorData.type === 'output') {
        if (pActiveLine) pActiveLine.remove();
        pStartConnector = pConnector;
        
        const rect = pCanvas.getBoundingClientRect();
        const initialX = (pE.clientX - rect.left) / pZoomLevel;
        const initialY = (pE.clientY - rect.top) / pZoomLevel;

       pActiveLine = new LeaderLine(pConnector, LeaderLine.pointAnchor(pCanvas, {x: initialX, y: initialY}), {
        parent: pCanvas, color: '#8e44ad', size: 3, 
        path: 'fluid', endPlug: 'arrow1'
       });

        pCanvas.addEventListener('mousemove', pMoveActiveLine);
        pCanvas.addEventListener('mouseup', pEndActiveLine, { once: true });

    } else if (pConnectorData.type === 'input' && pActiveLine) {
        const startConnectorData = {
            nodeId: pStartConnector.dataset.nodeId,
            index: parseInt(pStartConnector.dataset.index, 10)
        };

        if (startConnectorData.nodeId !== pConnectorData.nodeId) {
            pCreateConnection(startConnectorData, pConnectorData, true);
        }
        pEndActiveLine(pE);
    }
}

function pMoveActiveLine(pE) {
    if (!pActiveLine) return;
    const rect = pCanvas.getBoundingClientRect();
    const x = (pE.clientX - rect.left) / pZoomLevel;
    const y = (pE.clientY - rect.top) / pZoomLevel;
    pActiveLine.setOptions({ end: LeaderLine.pointAnchor(pCanvas, { x, y }) });
}

function pEndActiveLine(pE) {
    // Si soltamos el ratón sobre un conector, la lógica de pOnConnectorClick ya se encarga.
    // Esto previene que se borre la línea justo después de crearla.
    if (pE && pE.target.classList.contains('p-connector')) return; 

    if (pActiveLine) {
        pActiveLine.remove();
        pActiveLine = null;
    }
    pStartConnector = null;
    if (pCanvas) pCanvas.removeEventListener('mousemove', pMoveActiveLine);
}

document.addEventListener('keydown', (pE) => {
    if (pE.key === 'Escape' && pActiveLine) pEndActiveLine(pE);
});

function pUpdateAllConnections() {
    pConnections.forEach(pConn => {
        try { 
            if(pConn.line) pConn.line.position();
        } catch (pE) { /* Ignorar errores de LeaderLine si un elemento no es visible */ }
    });
}
