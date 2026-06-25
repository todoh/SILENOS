// --- datosstudio/tramas.ui.core.js ---
// ESTADO CENTRAL Y FUNCIONES CORE DE UI (Arquitectura Blindada)

window.TramasUI = window.TramasUI || {};
window.TramasUI.selectedNodeId = window.TramasUI.selectedNodeId || null;
window.TramasUI.expandTargetId = window.TramasUI.expandTargetId || null;

window.TramasUI.createNewOmega = function() {
    if(!window.app.targetHandle) return ui.alert("Selecciona una carpeta primero en la pestaña Datos.");
    
    const centerWorld = window.TramasCanvas.screenToWorld(
        window.TramasCanvas.canvas.width / 2, 
        window.TramasCanvas.canvas.height / 2
    );

    const newNode = {
        id: `omega-${Date.now().toString(36)}`,
        name: "Nuevo Evento",
        type: "Desarrollo", 
        status: "Borrador",  
        tension: 2,          
        timestamp: "",       
        duration: "",        
        pov: null,           
        desc: "",            
        notes: "",
        threadName: "",
        threadColor: "#8b5cf6",           
        x: centerWorld.x - (window.TramasConfig.nodeWidth / 2),
        y: centerWorld.y - (window.TramasConfig.nodeHeight / 2),
        dataRefs: [], 
        connections: [] 
    };

    window.app.tramas.push(newNode);
    
    if (window.TramasState) {
        window.TramasState.selectedNodes.clear();
        window.TramasState.selectedNodes.add(newNode.id);
    }

    window.app.saveTramas();
    this.openInspector(newNode.id);
    window.TramasCanvas.render();
};

window.TramasUI.createNewRegion = function() {
    if(!window.app.targetHandle) return ui.alert("Selecciona una carpeta primero.");
    const centerWorld = window.TramasCanvas.screenToWorld(
        window.TramasCanvas.canvas.width / 2, 
        window.TramasCanvas.canvas.height / 2
    );
    const newNode = {
        id: `omega-${Date.now().toString(36)}`,
        name: "NUEVO ACTO",
        type: "Region",
        x: centerWorld.x - 300,
        y: centerWorld.y - 200,
        width: 600,
        height: 400,
        color: '#f3f4f6'
    };
    window.app.tramas.push(newNode);
    
    if (window.TramasState) {
        window.TramasState.selectedNodes.clear();
        window.TramasState.selectedNodes.add(newNode.id);
    }

    window.app.saveTramas();
    this.openInspector(newNode.id);
    window.TramasCanvas.render();
};

window.TramasUI.autoLayout = function() {
    if (!window.app.tramas || window.app.tramas.length === 0) return;
    
    const nodes = window.app.tramas.filter(n => n.type !== 'Region');
    if (nodes.length === 0) return;

    const nodeWidth = window.TramasConfig ? window.TramasConfig.nodeWidth : 180;
    const nodeHeight = window.TramasConfig ? window.TramasConfig.nodeHeight : 90;
    const spacingX = 60;
    const spacingY = 40;

    let inDegree = {};
    nodes.forEach(n => inDegree[n.id] = 0);
    nodes.forEach(n => {
        if (n.connections) {
            n.connections.forEach(targetId => {
                if (inDegree[targetId] !== undefined) inDegree[targetId]++;
            });
        }
    });

    let depths = {};
    nodes.forEach(n => depths[n.id] = 0);

    let changed = true;
    let iterations = 0;
    while (changed && iterations < 1000) {
        changed = false;
        iterations++;
        nodes.forEach(n => {
            if (n.connections) {
                n.connections.forEach(targetId => {
                    if (depths[targetId] < depths[n.id] + 1) {
                        depths[targetId] = depths[n.id] + 1;
                        changed = true;
                    }
                });
            }
        });
    }

    let levelMap = {};
    nodes.forEach(n => {
        let d = depths[n.id];
        if (!levelMap[d]) levelMap[d] = [];
        levelMap[d].push(n);
    });

    const startX = 50;
    const startY = 50;

    Object.keys(levelMap).forEach(depthStr => {
        let depth = parseInt(depthStr);
        let levelNodes = levelMap[depth];
        
        levelNodes.forEach((n, index) => {
            n.x = startX + depth * (nodeWidth + spacingX);
            n.y = startY + index * (nodeHeight + spacingY);
        });
    });

    window.app.saveTramas();
    if (window.TramasCanvas) {
        window.TramasCanvas.resetView(); 
        window.TramasCanvas.render();
    }
};

window.TramasUI.deleteCurrentOmega = function() {
    if (window.TramasState && window.TramasState.selectedNodes.size > 0) {
        ui.confirm(`¿Estás seguro de eliminar los ${window.TramasState.selectedNodes.size} elementos seleccionados?`, () => {
            window.TramasState.selectedNodes.forEach(id => {
                window.app.tramas.forEach(n => {
                    if (n.connections) n.connections = n.connections.filter(cid => cid !== id);
                });
            });
            
            window.app.tramas = window.app.tramas.filter(n => !window.TramasState.selectedNodes.has(n.id));
            
            window.TramasState.selectedNodes.clear();
            window.app.saveTramas();
            this.closeInspector();
            window.TramasCanvas.render();
        });
        return;
    }

    if (!this.selectedNodeId) return;
    ui.confirm("¿Estás seguro de eliminar este elemento? Se borrarán sus conexiones.", () => {
        window.app.tramas.forEach(n => {
            if (n.connections) {
                n.connections = n.connections.filter(id => id !== this.selectedNodeId);
            }
        });
        window.app.tramas = window.app.tramas.filter(n => n.id !== this.selectedNodeId);
        window.app.saveTramas();
        this.closeInspector();
        window.TramasCanvas.render();
    });
};

// Implementación de Modo Silencioso para evitar cortes durante el diseño
window.TramasUI.saveCurrentOmega = function(isAutoSave = false) {
    window.app.saveTramas();
    
    const btn = document.querySelector('#omega-sidebar-actions .btn-primary');
    if (!isAutoSave) {
        if (btn) {
            btn.innerText = "GUARDADO";
            btn.classList.add('bg-green-600');
            setTimeout(() => { 
                btn.innerText = "GUARDAR CAMBIOS"; 
                btn.classList.remove('bg-green-600'); 
            }, 1000);
        }
        window.TramasCanvas.render();
    } else {
        if (btn && btn.innerText === "ESPERANDO...") {
            btn.innerText = "Sincronizado";
            setTimeout(() => { 
                if (btn.innerText === "Sincronizado") btn.innerText = "GUARDAR CAMBIOS"; 
            }, 1000);
        }
    }
};