// Archivo: Librojuego/canvas.tools.js

window.Canvas = window.Canvas || {};

Object.assign(window.Canvas, {

    // Funciones para el menú flotante del Canvas
    showCanvasMenu(screenX, screenY, canvasX, canvasY) {
        let menu = document.getElementById('canvas-context-menu');
        if (!menu) return;

        this.clickCanvasX = canvasX;
        this.clickCanvasY = canvasY;

        menu.style.left = `${screenX}px`;
        menu.style.top = `${screenY}px`;
        menu.classList.remove('hidden');
        
        setTimeout(() => {
            menu.classList.remove('opacity-0');
            // Ajuste para evitar que se salga por la derecha o abajo
            const rect = menu.getBoundingClientRect();
            let newLeft = screenX;
            let newTop = screenY;
            
            if (rect.right > window.innerWidth) newLeft = window.innerWidth - rect.width - 10;
            if (rect.bottom > window.innerHeight) newTop = window.innerHeight - rect.height - 10;
            
            menu.style.left = `${newLeft}px`;
            menu.style.top = `${newTop}px`;
        }, 10);
    },

    hideCanvasMenu() {
        let menu = document.getElementById('canvas-context-menu');
        if (menu && !menu.classList.contains('hidden')) {
            menu.classList.add('opacity-0');
            setTimeout(() => menu.classList.add('hidden'), 150);
        }
    },

    createNodeAtContext() {
        if (typeof Core !== 'undefined' && Core.addNode) {
            Core.addNode(null, "Nuevo evento en la historia...", this.clickCanvasX, this.clickCanvasY);
        }
        this.hideCanvasMenu();
    },

    reorderNodes() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.nodes || bookBase.nodes.length === 0) return;

        const nodes = bookBase.nodes;
        let levels = {};
        let visited = new Set();
        
        let inDegree = {};
        nodes.forEach(n => inDegree[n.id] = 0);
        nodes.forEach(n => {
            if (n.choices) {
                n.choices.forEach(c => {
                    if (inDegree[c.targetId] !== undefined) {
                        inDegree[c.targetId]++;
                    }
                });
            }
        });

        let queue = nodes.filter(n => inDegree[n.id] === 0);
        if (queue.length === 0) queue.push(nodes[0]); 

        let currentLevel = 0;
        
        while (queue.length > 0) {
            let nextQueue = [];
            levels[currentLevel] = [];

            for (let node of queue) {
                if (!visited.has(node.id)) {
                    visited.add(node.id);
                    levels[currentLevel].push(node);

                    if (node.choices) {
                        for (let c of node.choices) {
                            let target = nodes.find(n => n.id === c.targetId);
                            if (target && !visited.has(target.id) && !nextQueue.includes(target)) {
                                nextQueue.push(target);
                            }
                        }
                    }
                }
            }
            queue = nextQueue;
            currentLevel++;
        }

        let orphans = nodes.filter(n => !visited.has(n.id));
        if (orphans.length > 0) {
            levels[currentLevel] = orphans;
        }

        const X_SPACING = 380;
        const Y_SPACING = 320;

        for (let level in levels) {
            let lvlNodes = levels[level];
            let startY = 100 - ((lvlNodes.length - 1) * Y_SPACING) / 2;
            
            for (let i = 0; i < lvlNodes.length; i++) {
                lvlNodes[i].x = 100 + (parseInt(level) * X_SPACING);
                lvlNodes[i].y = startY + (i * Y_SPACING);
            }
        }

        this.render();
        if (Core.scheduleSave) Core.scheduleSave();
    },

    addArea() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.mapElements) bookBase.mapElements = { areas: [], emojis: [] };
        const rect = document.getElementById('canvas-container').getBoundingClientRect();
        const x = (-this.panX + rect.width / 2) / this.zoom - 250;
        const y = (-this.panY + rect.height / 2) / this.zoom - 250;

        bookBase.mapElements.areas.push({
            id: `area_${Math.random().toString(36).substr(2, 5)}`,
            x: x, y: y,
            width: 500, height: 500,
            color: '#3b82f6',
            name: 'Nueva Área',
            description: ''
        });
        if (Core.scheduleSave) Core.scheduleSave();
        this.renderMapElements();
    },

    addEmoji() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.mapElements) bookBase.mapElements = { areas: [], emojis: [] };
        const rect = document.getElementById('canvas-container').getBoundingClientRect();
        const x = (-this.panX + rect.width / 2) / this.zoom;
        const y = (-this.panY + rect.height / 2) / this.zoom;

        bookBase.mapElements.emojis.push({
            id: `emoji_${Math.random().toString(36).substr(2, 5)}`,
            x: x, y: y,
            emoji: '📍',
            size: 64,
            zoneSize: 200, 
            label: 'Ubicación',
            description: ''
        });
        if (Core.scheduleSave) Core.scheduleSave();
        this.renderMapElements();
    },

    openMapElementModal(id, type) {
        const bookBase = Core.book || Core.bookData || {};
        const elements = bookBase.mapElements || { areas: [], emojis: [] };
        const el = (type === 'area' ? elements.areas : elements.emojis).find(a => a.id === id);
        if (!el) return;

        document.getElementById('map-el-id').value = id;
        document.getElementById('map-el-type').value = type;
        
        document.getElementById('map-el-name').value = type === 'area' ? el.name : el.label;
        document.getElementById('map-el-desc').value = el.description || '';
        
        if (type === 'area') {
            document.getElementById('map-el-color-container').classList.remove('hidden');
            document.getElementById('map-el-emoji-container').classList.add('hidden');
            document.getElementById('map-el-size-container').classList.add('hidden');
            document.getElementById('map-el-zone-container').classList.add('hidden');
            document.getElementById('map-el-color').value = el.color || '#3b82f6';
        } else {
            document.getElementById('map-el-color-container').classList.add('hidden');
            document.getElementById('map-el-emoji-container').classList.remove('hidden');
            document.getElementById('map-el-size-container').classList.remove('hidden');
            document.getElementById('map-el-zone-container').classList.remove('hidden');
            
            document.getElementById('map-el-emoji').value = el.emoji || '📍';
            document.getElementById('map-el-size').value = el.size || 64;
            document.getElementById('map-el-zone').value = el.zoneSize !== undefined ? el.zoneSize : 200;
        }

        const modal = document.getElementById('map-element-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    closeMapModal() {
        const modal = document.getElementById('map-element-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    },

    saveMapElement() {
        const id = document.getElementById('map-el-id').value;
        const type = document.getElementById('map-el-type').value;
        const bookBase = Core.book || Core.bookData || {};
        const elements = bookBase.mapElements || { areas: [], emojis: [] };
        const el = (type === 'area' ? elements.areas : elements.emojis).find(a => a.id === id);
        
        if (el) {
            el.description = document.getElementById('map-el-desc').value;
            
            if (type === 'area') {
                el.name = document.getElementById('map-el-name').value;
                el.color = document.getElementById('map-el-color').value;
            } else {
                el.label = document.getElementById('map-el-name').value;
                el.emoji = document.getElementById('map-el-emoji').value;
                el.size = parseInt(document.getElementById('map-el-size').value) || 64;
                el.zoneSize = parseInt(document.getElementById('map-el-zone').value) || 0;
            }
            if (Core.scheduleSave) Core.scheduleSave();
            this.renderMapElements();
        }
        this.closeMapModal();
    },

    deleteMapElement() {
        const id = document.getElementById('map-el-id').value;
        const type = document.getElementById('map-el-type').value;
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.mapElements) return;

        if (type === 'area') {
            bookBase.mapElements.areas = bookBase.mapElements.areas.filter(a => a.id !== id);
        } else {
            bookBase.mapElements.emojis = bookBase.mapElements.emojis.filter(a => a.id !== id);
        }
        
        if (Core.scheduleSave) Core.scheduleSave();
        this.renderMapElements();
        this.closeMapModal();
    }
});