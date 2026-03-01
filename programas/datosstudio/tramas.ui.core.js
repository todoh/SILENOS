// --- datosstudio/tramas.ui.core.js ---
// ESTADO CENTRAL Y FUNCIONES CORE DE UI (Creación, Layout, Guardado)

window.TramasUI = window.TramasUI || {
    selectedNodeId: null,
    expandTargetId: null
};

Object.assign(window.TramasUI, {
    createNewOmega() {
        if(!app.targetHandle) return ui.alert("Selecciona una carpeta primero en la pestaña Datos.");
        
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
            x: centerWorld.x - (window.TramasConfig.nodeWidth / 2),
            y: centerWorld.y - (window.TramasConfig.nodeHeight / 2),
            dataRefs: [], 
            connections: [] 
        };

        app.tramas.push(newNode);
        
        // CORRECCIÓN: Referencia correcta al estado de selección
        if (window.TramasState) {
            window.TramasState.selectedNodes.clear();
            window.TramasState.selectedNodes.add(newNode.id);
        }

        app.saveTramas();
        this.openInspector(newNode.id);
        window.TramasCanvas.render();
    },

    createNewRegion() {
        if(!app.targetHandle) return ui.alert("Selecciona una carpeta primero.");
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
        app.tramas.push(newNode);
        
        // CORRECCIÓN: Referencia correcta al estado de selección
        if (window.TramasState) {
            window.TramasState.selectedNodes.clear();
            window.TramasState.selectedNodes.add(newNode.id);
        }

        app.saveTramas();
        this.openInspector(newNode.id);
        window.TramasCanvas.render();
    },

    autoLayout() {
        if (!app.tramas || app.tramas.length === 0) return;
        
        const nodes = app.tramas.filter(n => n.type !== 'Region');
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

        app.saveTramas();
        if (window.TramasCanvas) {
            window.TramasCanvas.resetView(); 
            window.TramasCanvas.render();
        }
    },

    deleteCurrentOmega() {
        // CORRECCIÓN CLAVE: Se cambia la referencia errónea de window.TramasCanvas.selectedNodes a window.TramasState.selectedNodes
        if (window.TramasState && window.TramasState.selectedNodes.size > 0) {
            ui.confirm(`¿Estás seguro de eliminar los ${window.TramasState.selectedNodes.size} elementos seleccionados?`, () => {
                window.TramasState.selectedNodes.forEach(id => {
                    // Limpiar conexiones entrantes hacia los nodos borrados
                    app.tramas.forEach(n => {
                        if (n.connections) n.connections = n.connections.filter(cid => cid !== id);
                    });
                });
                
                // Filtrar el array global de tramas
                app.tramas = app.tramas.filter(n => !window.TramasState.selectedNodes.has(n.id));
                
                window.TramasState.selectedNodes.clear();
                app.saveTramas();
                this.closeInspector();
                window.TramasCanvas.render();
            });
            return;
        }

        // Fallback para borrado desde el inspector (un solo nodo)
        if (!this.selectedNodeId) return;
        ui.confirm("¿Estás seguro de eliminar este elemento? Se borrarán sus conexiones.", () => {
            app.tramas.forEach(n => {
                if (n.connections) {
                    n.connections = n.connections.filter(id => id !== this.selectedNodeId);
                }
            });
            app.tramas = app.tramas.filter(n => n.id !== this.selectedNodeId);
            app.saveTramas();
            this.closeInspector();
            window.TramasCanvas.render();
        });
    },

    saveCurrentOmega() {
        app.saveTramas();
        
        const btn = document.querySelector('#omega-sidebar-actions .btn-primary');
        if (btn) {
            btn.innerText = "GUARDADO";
            btn.classList.add('bg-green-600');
            setTimeout(() => { 
                btn.innerText = "GUARDAR CAMBIOS"; 
                btn.classList.remove('bg-green-600'); 
            }, 1000);
        }
        window.TramasCanvas.render();
    }
});