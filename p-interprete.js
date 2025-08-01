// ================================================================= //
//        p-interprete.js - Lógica de Interpretación de Planos       //
// ================================================================= //

/**
 * Carga un plano (nodos y conexiones) en el lienzo desde un objeto de estado.
 * Esta función es el núcleo del intérprete de JSON.
 * Depende de funciones globales como pClearCanvas, pAddNode, pCreateConnection, etc.,
 * que deben ser definidas en otros archivos (p-main.js, p-ui.js, p-conexion.js).
 * @param {object} state El objeto que contiene la definición del plano con nodos y conexiones.
 */
function pLoadBlueprint(state) {
    // Valida que el objeto de estado tenga la estructura mínima necesaria.
    if (!state || !Array.isArray(state.nodes) || !Array.isArray(state.connections)) {
        alert('Error: El formato del JSON no es válido o está incompleto.');
        return;
    }
    
    // Limpia el lienzo para dibujar el nuevo plano.
    // Esta función debe estar disponible globalmente (definida en p-main.js).
    pClearCanvas();

    // Itera y crea cada nodo definido en el estado del plano.
    // pAddNode() debe estar disponible globalmente (definida en p-ui.js).
    state.nodes.forEach(nodeData => {
        pAddNode(nodeData.type, nodeData.id, nodeData.position, nodeData.state, false);
    });

    // Itera y crea cada conexión definida en el estado del plano.
    // pCreateConnection() debe estar disponible globalmente (definida en p-conexion.js).
    state.connections.forEach(connData => {
        pCreateConnection(connData.from, connData.to, false);
    });

    // Actualiza el contador global de IDs para evitar colisiones al crear nuevos nodos.
    // pNodeIdCounter y pNodes son variables globales (definidas en p-main.js).
    pNodeIdCounter = state.nodeIdCounter || Object.keys(pNodes).length;
    
    // Se usa un breve retraso para asegurar que el DOM se haya actualizado antes de dibujar las líneas.
    // pUpdateAllConnections() y pRecordHistory() deben estar disponibles globalmente.
    setTimeout(() => {
        pUpdateAllConnections();
        pRecordHistory(); // Guarda este estado cargado como un único paso en el historial.
    }, 100);
}
