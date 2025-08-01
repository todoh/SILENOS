// --- LÓGICA DE EJECUCIÓN ---

// Convertimos la función a 'async' para poder usar 'await' dentro
async function pRunAutomation() {
    if (!pOutputDiv) {
        console.error("Panel de salida no encontrado.");
        return;
    }
    pOutputDiv.textContent = '';
    
    const pInDegree = {};
    const pAdj = {};
    const pNodeValues = {};

    for (const pNodeId in pNodes) {
        pInDegree[pNodeId] = 0;
        pAdj[pNodeId] = [];
    }

    pConnections.forEach(pConn => {
        pAdj[pConn.from].push(pConn.to);
        pInDegree[pConn.to]++;
    });

    const pQueue = Object.keys(pInDegree).filter(id => pInDegree[id] === 0);
    
    if (pQueue.length === 0 && Object.keys(pNodes).length > 0) {
        pOutputDiv.textContent = 'Error: Ciclo detectado o no hay nodo de inicio.';
        return;
    }

    let pProcessedCount = 0;
    while (pQueue.length > 0) {
        const pNodeId = pQueue.shift();
        const pNode = pNodes[pNodeId];
        pProcessedCount++;

        const pInputs = pConnections.filter(c => c.to === pNodeId).map(c => pNodeValues[c.from]);
        
        // AÑADIMOS 'await' AQUÍ.
        // Esto hará que la ejecución espere si la función 'process' es asíncrona (como la de la IA).
        // Para las funciones síncronas, no tendrá ningún efecto.
        pNodeValues[pNodeId] = await pNode.def.process(pNode, pInputs);
        
        if (pAdj[pNodeId]) {
            pAdj[pNodeId].forEach(pNeighborId => {
                pInDegree[pNeighborId]--;
                if (pInDegree[pNeighborId] === 0) {
                    pQueue.push(pNeighborId);
                }
            });
        }
    }
    
    if (pProcessedCount < Object.keys(pNodes).length) {
        pOutputDiv.textContent += "\nError: Ciclo detectado, no todos los nodos se ejecutaron.";
    }
}