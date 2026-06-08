// voice_spatial.js
// --- EXTENSIONES DE ANÁLISIS ESPACIAL, TRAZADO BFS Y EDICIÓN ESTRUCTURAL ---

function serializeFullStoryBFS() {
    if (typeof data === 'undefined' || !data.nodes || data.nodes.length === 0) {
        return "La crónica actual está vacía. No hay nodos que leer.";
    }
    
    let roots = data.nodes.filter(n => !data.connections.some(c => c.to === n.id));
    if (roots.length === 0) roots = [data.nodes[0]];
    
    const visited = new Set();
    const queue = roots.map(r => r.id);
    let output = `Compilando lectura íntegra de la obra: ${data.name}.\n`;
    
    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        const node = data.nodes.find(n => n.id === currentId);
        if (!node) continue;
        
        output += `[Paso titulado: ${node.title}]. Prosa literaria: ${node.content || '(Sin contenido asignado)'}.\n`;
        
        const children = data.connections.filter(c => c.from === currentId);
        children.forEach(c => {
            if (!visited.has(c.to)) {
                output += `  - Opción disponible: "${c.label || 'Continuar exploración'}" que conduce al paso subsiguiente.\n`;
                queue.push(c.to);
            }
        });
    }
    return output;
}

function obtenerResumenEstructuralGrafo() {
    if (typeof data === 'undefined' || !data.nodes.length) return "ESTADO GRAFO: 0 nodos activos.";
    let s = `ESTADO GLOBAL DEL GRAFO DEL LIBROJUEGO:\n- Total de pasos: ${data.nodes.length}\n- Conexiones de flujo: ${data.connections.length}\nLISTA DE PASOS DISPONIBLES (ID y Títulos actuales):\n`;
    data.nodes.forEach(n => {
        s += `  * ID: "${n.id}" -> Título: "${n.title}" ${n.isEnding ? '[FINAL]' : ''}\n`;
    });
    s += `MAPA DE CONEXIONES ACTIVAS:\n`;
    data.connections.forEach(c => {
        s += `  * [ID: ${c.from}] --- Opción: "${c.label || 'Continuar'}" ---> [ID: ${c.to}]\n`;
    });
    return s;
}

function analyzeSpatialAngleOfNode(nodeId) {
    if (typeof buildLocalContext !== 'function') return "Error: Subsistema de análisis heurístico ausente.";
    
    const ctx = buildLocalContext(nodeId);
    if (!ctx) return "Nodo no identificado espacialmente en la topología activa.";
    
    let report = `Análisis espacial del nodo "${ctx.node.title}" (ID: ${ctx.node.id}):\n`;
    report += `- Posición en Canvas: Coordenada X ${Math.round(ctx.node.x)}, Coordenada Y ${Math.round(ctx.node.y)}.\n`;
    report += `- Nivel de profundidad lineal desde el origen: ${ctx.stats.depthFromRoot}.\n`;
    report += `- Grado de salida (Bifurcaciones directas): ${ctx.stats.outDegree} hijos consolidados.\n`;
    
    if (ctx.siblings.length > 0) {
        report += `- Rutas alternativas de nodos hermanos descubiertos en este mismo nivel: ${ctx.siblings.map(s => `"${s.title}" vía elección [${s.viaLabel}]`).join(', ')}.\n`;
    } else {
        report += `- No cuenta con desvíos o nodos hermanos en este paso.\n`;
    }
    
    if (ctx.descendants.length > 0) {
        report += `- Proyección del futuro narrativo (Descendientes directos mapeados): ${ctx.descendants.slice(0, 3).map(d => `"${d.title}" a profundidad +${d.depth}`).join(', ')}.\n`;
    }
    
    if (ctx.properNouns.length > 0) {
        report += `- Entidades y personajes vinculados al hilo cronológico: ${ctx.properNouns.join(', ')}.\n`;
    }
    
    return report;
}

function executeStructuralMutation(command) {
    try {
        if (!command || typeof command !== 'object') return false;
        let mutationDone = false;
        
        if (command.action === 'CREATE_NODE') {
            const newId = (typeof genId === 'function') ? genId('voice_n') : 'voice_' + Date.now();
            
            let baseNode = window.selectedNode;
            if (!baseNode && data.nodes && data.nodes.length > 0) {
                baseNode = data.nodes[data.nodes.length - 1];
            }
            
            const posX = baseNode ? baseNode.x + 280 : 300;
            const posY = baseNode ? baseNode.y + (Math.random() * 160 - 80) : 300;
            
            const newNode = {
                id: newId,
                x: posX,
                y: posY,
                title: (command.title || "Nuevo Paso").toUpperCase(),
                content: command.content || "",
                tags: [],
                color: null,
                isEnding: false,
                endingType: null,
                notes: command.notes || ""
            };
            
            data.nodes.push(newNode);
            
            if (command.connectFrom || (command.autoConnect && baseNode)) {
                const fromId = command.connectFrom || baseNode.id;
                data.connections.push({
                    from: fromId,
                    to: newId,
                    label: command.connectionLabel || "Continuar"
                });
            }
            
            window.selectedNode = newNode;
            if (typeof openEditor === 'function') openEditor('node', newNode);
            mutationDone = true;
        }
        
        else if (command.action === 'EDIT_NODE') {
            const targetId = command.nodeId || (window.selectedNode ? window.selectedNode.id : null);
            const node = data.nodes.find(n => n.id === targetId);
            if (node) {
                if (command.title) node.title = command.title.toUpperCase();
                if (command.content) node.content = command.content;
                if (command.notes) node.notes = command.notes;
                if (command.isEnding !== undefined) node.isEnding = !!command.isEnding;
                
                if (window.selectedNode && window.selectedNode.id === targetId) {
                    if (typeof openEditor === 'function') openEditor('node', node);
                }
                mutationDone = true;
            }
        }
        
        else if (command.action === 'CONNECT_NODES') {
            if (command.fromId && command.toId) {
                if (!data.connections.some(c => c.from === command.fromId && c.to === command.toId)) {
                    data.connections.push({
                        from: command.fromId,
                        to: command.toId,
                        label: command.label || ""
                    });
                    mutationDone = true;
                }
            }
        }
        
        else if (command.action === 'DELETE_CONNECTION') {
            if (command.fromId && command.toId) {
                data.connections = data.connections.filter(c => !(c.from === command.fromId && c.to === command.toId));
                mutationDone = true;
            }
        }
        
        else if (command.action === 'DELETE_NODE') {
            if (command.nodeId) {
                if (typeof deleteMediaFromDB === 'function') deleteMediaFromDB(command.nodeId);
                data.nodes = data.nodes.filter(n => n.id !== command.nodeId);
                data.connections = data.connections.filter(c => c.from !== command.nodeId && c.to !== command.nodeId);
                if (window.selectedNode && window.selectedNode.id === command.nodeId) {
                    window.selectedNode = null;
                    if (typeof closeEditor === 'function') closeEditor();
                }
                mutationDone = true;
            }
        }
        
        if (mutationDone) {
            if (typeof saveLogic === 'function') saveLogic();
            if (typeof autoLayoutLogic === 'function') autoLayoutLogic();
            
            const canvas = document.getElementById('flowCanvas');
            if (canvas) {
                if (typeof draw === 'function') draw();
                else if (typeof render === 'function') render();
                else if (typeof updateCanvas === 'function') updateCanvas();
                else if (typeof drawCanvas === 'function') drawCanvas();
                console.log("[CANVAS-MUTATOR] Ciclo de renderizado forzado tras comando de voz de forma exitosa.");
            }
            
            if (typeof fitToScreen === 'function') fitToScreen();
            return true;
        }
    } catch (e) {
        console.error("[MUTACIÓN VOZ] Error procesando cambios gráficos en background:", e);
    }
    return false;
}