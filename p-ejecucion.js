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
}// --- LÓGICA DE EJECUCIÓN (CORREGIDA) ---

/**
 * Ejecuta el flujo de automatización definido en el lienzo.
 * Esta versión está corregida para manejar la nueva estructura de conexiones
 * con múltiples entradas/salidas y conectores indexados.
 */
async function pRunAutomation() {
    if (!pOutputDiv) {
        console.error("Panel de salida no encontrado.");
        return;
    }
    pOutputDiv.innerHTML = 'Iniciando ejecución...<br>'; // Limpia y da feedback inicial

    const pInDegree = {};
    const pAdj = {};
    const pNodeValues = {};

    // 1. Inicializar grados de entrada y listas de adyacencia para todos los nodos.
    for (const pNodeId in pNodes) {
        pInDegree[pNodeId] = 0;
        pAdj[pNodeId] = [];
    }

    // 2. Construir el grafo (listas de adyacencia y grados de entrada) a partir de las conexiones.
    //    Usa `pConn.from.nodeId` y `pConn.to.nodeId` para manejar la nueva estructura.
    pConnections.forEach(pConn => {
        const fromNodeId = pConn.from.nodeId;
        const toNodeId = pConn.to.nodeId;

        // Asegurarse de que los nodos de la conexión todavía existen.
        if (pAdj[fromNodeId] && pInDegree[toNodeId] !== undefined) {
            pAdj[fromNodeId].push(toNodeId);
            pInDegree[toNodeId]++;
        }
    });

    // 3. Encontrar todos los nodos sin conexiones de entrada para iniciar la ordenación topológica.
    const pQueue = Object.keys(pInDegree).filter(id => pInDegree[id] === 0);
    
    if (pQueue.length === 0 && Object.keys(pNodes).length > 0) {
        pOutputDiv.innerHTML += '<span style="color: red;">Error: Ciclo detectado o no hay nodo de inicio (un nodo sin entradas).</span>';
        return;
    }

    // 4. Procesar los nodos en orden.
    let pProcessedCount = 0;
    while (pQueue.length > 0) {
        const pNodeId = pQueue.shift();
        const pNode = pNodes[pNodeId];

        if (!pNode) continue; // Si el nodo fue eliminado, saltar.

        pProcessedCount++;

        // 5. Recopilar las entradas para el nodo actual en el orden correcto.
        //    Esto es crucial para nodos con múltiples entradas.
        const pInputs = [];
        const pInputConnections = pConnections.filter(c => c.to.nodeId === pNodeId);
        
        // Ordenar las conexiones por el índice del conector de entrada (c.to.index).
        pInputConnections.sort((a, b) => a.to.index - b.to.index);

        // Construir el array de entradas en el orden correcto.
        pInputConnections.forEach(conn => {
            pInputs[conn.to.index] = pNodeValues[conn.from.nodeId];
        });
        
        try {
            // 6. Ejecutar la lógica de procesamiento del nodo.
            pNodeValues[pNodeId] = await pNode.def.process(pNode, pInputs);
        } catch (error) {
            console.error(`Error al procesar el nodo ${pNodeId}:`, error);
            pOutputDiv.innerHTML += `<br><span style="color: red;">Error en nodo '${pNode.def.title}' (${pNodeId}): ${error.message}</span>`;
            return; // Detener la ejecución si un nodo falla.
        }
        
        // 7. Añadir los nodos siguientes (vecinos) a la cola si ya han recibido todas sus entradas.
        if (pAdj[pNodeId]) {
            pAdj[pNodeId].forEach(pNeighborId => {
                pInDegree[pNeighborId]--;
                if (pInDegree[pNeighborId] === 0) {
                    pQueue.push(pNeighborId);
                }
            });
        }
    }
    
    // 8. Comprobar si todos los nodos se procesaron (detección final de ciclos).
    if (pProcessedCount < Object.keys(pNodes).length) {
        pOutputDiv.innerHTML += '<br><span style="color: red;">Error: Ciclo detectado. No todos los nodos se ejecutaron.</span>';
    } else {
        pOutputDiv.innerHTML += '<br><span style="color: green; font-weight: bold;">Ejecución completada.</span>';
    }
}
