// --- MANEJO DE CONEXIONES ---

function pCreateConnection(pFromNodeId, pToNodeId, pRecord = true) {
    if (typeof LeaderLine === 'undefined') {
        console.error("[P-DEBUG] pCreateConnection: ¡LeaderLine library NO está cargada!");
        return null;
    }

    const pFromNode = pNodes[pFromNodeId];
    const pToNode = pNodes[pToNodeId];
    if (!pFromNode || !pToNode) return null;

    if (pConnections.some(pC => pC.to === pToNodeId)) {
        console.warn(`[P-DEBUG] El nodo de destino ${pToNodeId} ya tiene una conexión.`);
        return null;
    }

    const pStartEl = pFromNode.element.querySelector('.p-connector.p-output');
    const pEndEl = pToNode.element.querySelector('.p-connector.p-input');
    if (!pStartEl || !pEndEl) return null;

   const pLine = new LeaderLine(pStartEl, pEndEl, {
    parent: pCanvas, color: '#8e44ad', size: 3, path: 'fluid',
    startSocket: 'right', endSocket: 'left'
   });

    const pConnection = { from: pFromNodeId, to: pToNodeId, line: pLine };
    pConnections.push(pConnection);
    if (pRecord) pRecordHistory();
    return pConnection;
}

function pAddConnectors(pNode) {
    if (pNode.def.inputs > 0) {
        const pInput = document.createElement('div');
        pInput.className = 'p-connector p-input';
        pInput.dataset.nodeId = pNode.id;
        pInput.dataset.type = 'input';
        pNode.element.appendChild(pInput);
        pInput.addEventListener('click', pOnConnectorClick);
    }
    if (pNode.def.outputs > 0) {
        const pOutput = document.createElement('div');
        pOutput.className = 'p-connector p-output';
        pOutput.dataset.nodeId = pNode.id;
        pOutput.dataset.type = 'output';
        pNode.element.appendChild(pOutput);
        pOutput.addEventListener('click', pOnConnectorClick);
    }
}

function pOnConnectorClick(pE) {
    pE.stopPropagation();
    const pConnector = pE.target;
    const pNodeId = pConnector.dataset.nodeId;
    const pType = pConnector.dataset.type;
    
    if (pType === 'output') {
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

    } else if (pType === 'input' && pActiveLine) {
        if (pStartConnector.dataset.nodeId !== pNodeId) {
            pCreateConnection(pStartConnector.dataset.nodeId, pNodeId, true);
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
        } catch (pE) { /* Ignore errors */ }
    });
}
