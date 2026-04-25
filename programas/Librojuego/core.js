// Archivo: Librojuego/core.js

window.Core = window.Core || {};

Object.assign(window.Core, {
    // Funciones complementarias para la UI Clásica y Agentes

    addEmptyNode() {
        const nextId = `node_${this.book.nodes.length + 1}_${Math.random().toString(36).substr(2,4)}`;
        this.addNode(nextId, "Escribe el texto aquí...", null, null);
        
        if (typeof UI !== 'undefined' && typeof UI.renderNodeList === 'function') {
            UI.renderNodeList();
        }
    },

    updateNode(id, text, choices, scoreImpact = 0) {
        const node = this.getNode(id);
        if (node) {
            node.text = text;
            node.choices = choices;
            node.scoreImpact = scoreImpact;
            if (this.scheduleSave) this.scheduleSave();
        }
    },

    deleteNode(id) {
        if (!this.book || !this.book.nodes) return;
        
        // Eliminar el nodo
        this.book.nodes = this.book.nodes.filter(n => n.id !== id);
        
        // Eliminar referencias a este nodo en otras opciones
        this.book.nodes.forEach(n => {
            if (n.choices) {
                n.choices = n.choices.filter(c => c.targetId !== id);
            }
        });
        
        // Limpiar la selección si es el nodo actual
        if (this.selectedNodeId === id) {
            this.selectedNodeId = null;
            if (typeof Editor !== 'undefined' && Editor.hide) Editor.hide();
        }

        // Refrescar las vistas
        if (typeof UI !== 'undefined' && typeof UI.renderNodeList === 'function') UI.renderNodeList();
        if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
        if (this.scheduleSave) this.scheduleSave();
    },

    loadBook(data) {
        this.book = data;
        
        // Asegurar estructuras predeterminadas
        if (!this.book.initialState) this.book.initialState = { vida: 10, poder: 10, inventario: [] };
        if (!this.book.gameItems) this.book.gameItems = [];
        if (!this.book.mapElements) this.book.mapElements = { areas: [], emojis: [] };

        if (this.book.nodes.length > 0) {
            this.currentNodeId = this.book.nodes[0].id;
        }
        
        if (this.scheduleSave) this.scheduleSave();
    }
});