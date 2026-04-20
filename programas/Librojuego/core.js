// Archivo: Librojuego/core.js

const Core = {
    bookData: {
        title: "Nuevo Librojuego",
        nodes: [],
        initialState: { vida: 10, poder: 10, inventario: [] },
        gameItems: [], 
        mapElements: { areas: [], emojis: [] } 
    },
    currentNodeId: null,
    currentScore: 0, 
    playerState: { vida: 10, poder: 10, inventario: [] }, 
    pendingDeathTarget: null,

    init() {
        if (!this.bookData.initialState) this.bookData.initialState = { vida: 10, poder: 10, inventario: [] };
        if (!this.bookData.gameItems) this.bookData.gameItems = [];
        if (!this.bookData.mapElements) this.bookData.mapElements = { areas: [], emojis: [] };

        if (this.bookData.nodes.length === 0) {
            this.addNode("node_1", "Despiertas en una habitación oscura. Frente a ti hay dos puertas.", 0);
        }
    },

    setTitle(title) {
        this.bookData.title = title || "Sin Título";
    },

    addNode(id, text = "", scoreImpact = 0) {
        const newNode = {
            id: id,
            text: text,
            scoreImpact: scoreImpact, 
            choices: []
        };
        this.bookData.nodes.push(newNode);
        return newNode;
    },

    addEmptyNode() {
        const nextId = `node_${this.bookData.nodes.length + 1}_${Math.random().toString(36).substr(2,4)}`;
        this.addNode(nextId, "Escribe el texto aquí...", 0);
        if (typeof UI !== 'undefined' && typeof UI.renderNodeList === 'function') UI.renderNodeList();
    },

    getNode(id) {
        return this.bookData.nodes.find(n => n.id === id);
    },

    updateNode(id, text, choices, scoreImpact = 0) {
        const node = this.getNode(id);
        if (node) {
            node.text = text;
            node.choices = choices;
            node.scoreImpact = scoreImpact;
        }
    },

    deleteNode(id) {
        this.bookData.nodes = this.bookData.nodes.filter(n => n.id !== id);
        this.bookData.nodes.forEach(n => {
            n.choices = n.choices.filter(c => c.targetId !== id);
        });
        if (typeof UI !== 'undefined' && typeof UI.renderNodeList === 'function') UI.renderNodeList();
    },

    loadBook(data) {
        this.bookData = data;
        if (!this.bookData.initialState) this.bookData.initialState = { vida: 10, poder: 10, inventario: [] };
        if (!this.bookData.gameItems) this.bookData.gameItems = [];
        if (!this.bookData.mapElements) this.bookData.mapElements = { areas: [], emojis: [] };

        if (this.bookData.nodes.length > 0) {
            this.currentNodeId = this.bookData.nodes[0].id;
        }
    },

    startGame() {
        if (this.bookData.nodes.length > 0) {
            let startNode = this.bookData.nodes.find(n => n.isStartNode);
            if (!startNode) startNode = this.bookData.nodes[0];

            this.currentNodeId = startNode.id; 
            this.currentScore = startNode.scoreImpact || 0; 
            this.pendingDeathTarget = null;
            
            const init = this.bookData.initialState || { vida: 10, poder: 10, inventario: [] };
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

            applyEff(effect);
            checkDeath(effect);
            
            applyEff(node.eff);
            checkDeath(node.eff);

            if (wasAlive && this.playerState.vida <= 0) {
                if (!deathTarget) {
                    let startNode = this.bookData.nodes.find(n => n.isStartNode) || this.bookData.nodes[0];
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
};