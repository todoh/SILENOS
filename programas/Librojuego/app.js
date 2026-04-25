// Archivo: Librojuego/app.js

window.Core = window.Core || {};

Object.assign(window.Core, {
    book: { 
        title: "Nuevo Librojuego", 
        visualBible: "", 
        nodes: [],
        initialState: { vida: 10, vidaMax: 10, ataque: 5, defensa: 5, agilidad: 5, destreza: 5, inventario: [] },
        gameItems: [],
        mapElements: { areas: [], emojis: [] }
    },
    selectedNodeId: null,
    currentNodeId: null,
    currentScore: 0,
    playerState: { vida: 10, vidaMax: 10, ataque: 5, defensa: 5, agilidad: 5, destreza: 5, inventario: [] },
    pendingDeathTarget: null, 

    init() {
        if (this.initStorage) this.initStorage();

        if (!this.book.mapElements) this.book.mapElements = { areas: [], emojis: [] };

        if (this.book.nodes.length === 0) {
            this.addNode("Inicio", "Despiertas en un lugar desconocido...", 100, 100);
        }
        
        if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
    },

    setTitle(title) { 
        this.book.title = title; 
        if (this.scheduleSave) this.scheduleSave(); 
    },

    addNode(id = null, text = "Nuevo nodo...", x = null, y = null) {
        const nodeId = id || `nodo_${Math.random().toString(36).substr(2, 5)}`;
        const px = x !== null ? x : (window.innerWidth / 2) - 110; 
        const py = y !== null ? y : (window.innerHeight / 2) - 140;

        this.book.nodes.push({ id: nodeId, text: text, choices: [], effs: [], x: px, y: py, scoreImpact: 0 });
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
            let startNode = this.book.nodes.find(n => n.isStartNode) || this.book.nodes[0];
            
            this.currentNodeId = startNode.id;
            this.currentScore = this.getNode(this.currentNodeId).scoreImpact || 0;
            this.pendingDeathTarget = null;
            
            const init = this.book.initialState || { vida: 10, vidaMax: 10, ataque: 5, defensa: 5, agilidad: 5, destreza: 5, inventario: [] };
            this.playerState = { 
                vida: init.vida ?? 10, 
                vidaMax: init.vidaMax ?? 10, 
                ataque: init.ataque ?? 5, 
                defensa: init.defensa ?? 5, 
                agilidad: init.agilidad ?? 5, 
                destreza: init.destreza ?? 5, 
                inventario: [...(init.inventario || [])] 
            };
            
            if (typeof UI !== 'undefined' && typeof UI.renderPlayer === 'function') UI.renderPlayer();
            if (typeof Player !== 'undefined' && Player.start) Player.start();
        } else {
            alert("El librojuego no tiene nodos.");
        }
    },

    makeChoice(targetId, effectsList = null) {
        const node = this.getNode(targetId);
        if (node) {
            this.currentNodeId = targetId;
            this.currentScore += (node.scoreImpact || 0);

            let deathTarget = null;
            const wasAlive = this.playerState.vida > 0;

            const applyEffs = (effs) => {
                const list = Array.isArray(effs) ? effs : (effs ? [effs] : []);
                list.forEach(eff => {
                    if (!eff || !eff.type) return;
                    if (['vida', 'vidaMax', 'ataque', 'defensa', 'agilidad', 'destreza'].includes(eff.type)) {
                        let val = Number(eff.val);
                        if (!isNaN(val)) {
                            if (eff.op === '+') this.playerState[eff.type] += val;
                            if (eff.op === '-') this.playerState[eff.type] -= val;
                        }
                    } else if (eff.type === 'item') {
                        let qty = Number(eff.qty) || 1;
                        if (eff.op === 'ADD') {
                            for(let i=0; i<qty; i++) this.playerState.inventario.push(eff.val);
                        }
                        if (eff.op === 'REM') {
                            for(let i=0; i<qty; i++) {
                                const idx = this.playerState.inventario.indexOf(eff.val);
                                if (idx > -1) this.playerState.inventario.splice(idx, 1);
                            }
                        }
                    }
                });
                
                if (this.playerState.vida > this.playerState.vidaMax) {
                    this.playerState.vida = this.playerState.vidaMax;
                }
            };

            const checkDeath = (effs) => {
                const list = Array.isArray(effs) ? effs : (effs ? [effs] : []);
                list.forEach(eff => {
                    if (eff && eff.type === 'vida' && eff.op === '-' && this.playerState.vida <= 0) {
                        if (eff.deathTarget) deathTarget = eff.deathTarget;
                    }
                });
            };

            applyEffs(effectsList);
            checkDeath(effectsList);
            
            const nodeEffs = node.effs || (node.eff ? [node.eff] : []);
            applyEffs(nodeEffs);
            checkDeath(nodeEffs);

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