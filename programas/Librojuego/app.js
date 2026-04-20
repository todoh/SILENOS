// Archivo: Librojuego/app.js

window.Core = window.Core || {};

Object.assign(window.Core, {
    book: { 
        title: "Nuevo Librojuego", 
        visualBible: "", 
        nodes: [],
        initialState: { vida: 10, poder: 10, inventario: [] },
        gameItems: [],
        mapElements: { areas: [], emojis: [] } // Soporte para Modo Mapa
    },
    selectedNodeId: null,
    currentNodeId: null,
    currentScore: 0,
    playerState: { vida: 10, poder: 10, inventario: [] },
    pendingDeathTarget: null, // Guardará el destino de muerte

    init() {
        if (this.initStorage) this.initStorage();

        if (!this.book.mapElements) this.book.mapElements = { areas: [], emojis: [] };

        if (this.book.nodes.length === 0) {
            this.addNode("Inicio", "Despiertas en un lugar desconocido...", 100, 100);
        }
        
        if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();

        if (this.rootHandle && typeof UI !== 'undefined' && UI.toggleFolderModal) {
            setTimeout(() => UI.toggleFolderModal(), 500);
        }
    },

    setTitle(title) { 
        this.book.title = title; 
        if (this.scheduleSave) this.scheduleSave(); 
    },

    addNode(id = null, text = "Nuevo nodo...", x = null, y = null) {
        const nodeId = id || `nodo_${Math.random().toString(36).substr(2, 5)}`;
        const px = x !== null ? x : (window.innerWidth / 2) - 110; 
        const py = y !== null ? y : (window.innerHeight / 2) - 140;

        this.book.nodes.push({ id: nodeId, text: text, choices: [], x: px, y: py, scoreImpact: 0 });
        if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
        this.selectNode(nodeId);
        if (this.scheduleSave) this.scheduleSave();
    },

    getNode(id) { 
        return this.book.nodes.find(n => n.id === id); 
    },

    selectNode(id) {
        this.selectedNodeId = id;
        if (typeof Canvas !== 'undefined' && Canvas.renderNodes) Canvas.renderNodes();
        if (typeof Editor !== 'undefined' && Editor.loadNode) Editor.loadNode(id);
    },

    deleteSelectedNode() {
        if (!this.selectedNodeId) return;
        this.book.nodes = this.book.nodes.filter(n => n.id !== this.selectedNodeId);
        this.book.nodes.forEach(n => { n.choices = n.choices.filter(c => c.targetId !== this.selectedNodeId); });
        this.selectedNodeId = null;
        if (typeof Editor !== 'undefined' && Editor.hide) Editor.hide();
        if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
        if (this.scheduleSave) this.scheduleSave();
    },

    startGame() {
        if (this.book.nodes.length > 0) {
            let startNode = this.book.nodes.find(n => n.isStartNode);
            if (!startNode) startNode = this.book.nodes[0];
            
            this.currentNodeId = startNode.id;
            this.currentScore = this.getNode(this.currentNodeId).scoreImpact || 0;
            this.pendingDeathTarget = null;
            
            const init = this.book.initialState || { vida: 10, poder: 10, inventario: [] };
            this.playerState = { vida: init.vida, poder: init.poder, inventario: [...init.inventario] };
            
            if (typeof UI !== 'undefined' && typeof UI.renderPlayer === 'function') UI.renderPlayer();
            if (typeof Player !== 'undefined' && Player.start) Player.start();
        } else {
            alert("El librojuego no tiene nodos.");
        }
    },

    makeChoice(targetId, effect = null) {
        const node = this.getNode(targetId);
        if (node) {
            this.currentNodeId = targetId;
            this.currentScore += (node.scoreImpact || 0);

            let deathTarget = null;
            const wasAlive = this.playerState.vida > 0;

            const checkDeath = (eff) => {
                if (eff && eff.type === 'vida' && eff.op === '-' && this.playerState.vida <= 0) {
                    if (eff.deathTarget) deathTarget = eff.deathTarget;
                }
            };

            const applyEff = (eff) => {
                if (!eff || !eff.type) return;
                if (eff.type === 'vida' || eff.type === 'poder') {
                    let val = Number(eff.val);
                    if (!isNaN(val)) {
                        if (eff.op === '+') this.playerState[eff.type] += val;
                        if (eff.op === '-') this.playerState[eff.type] -= val;
                    }
                } else if (eff.type === 'item') {
                    if (eff.op === 'ADD' && !this.playerState.inventario.includes(eff.val)) {
                        this.playerState.inventario.push(eff.val);
                    }
                    if (eff.op === 'REM') {
                        this.playerState.inventario = this.playerState.inventario.filter(i => i !== eff.val);
                    }
                }
            };

            // 1. Aplicar efecto de la decisión
            applyEff(effect);
            checkDeath(effect);
            
            // 2. Aplicar efecto pasivo del nodo de destino (al llegar)
            applyEff(node.eff);
            checkDeath(node.eff);

            // 3. Comprobar muerte y armar la ruta de destino
            if (wasAlive && this.playerState.vida <= 0) {
                if (!deathTarget) {
                    let nodes = this.book?.nodes || this.bookData?.nodes;
                    let startNode = nodes.find(n => n.isStartNode) || nodes[0];
                    deathTarget = startNode.id;
                }
                this.pendingDeathTarget = deathTarget;
            } else {
                this.pendingDeathTarget = null;
            }

            if (typeof UI !== 'undefined' && typeof UI.renderPlayer === 'function') UI.renderPlayer();
            if (typeof Player !== 'undefined' && typeof Player.render === 'function') Player.render();

        } else {
            alert("El nodo de destino no existe.");
        }
    }
});

window.addEventListener('load', () => {
    if (typeof Canvas !== 'undefined' && Canvas.init) Canvas.init();
    if (window.Core && window.Core.init) window.Core.init();
});