/* SILENOS 3/three-entities.js */
// H -> Coherencia: Gestión de Entidades 3D con Limpieza Atómica

const ThreeEntities = {
    objects: new Map(),
    cachedFiles: [],
    pending: new Set(),

    init() {
        window.addEventListener('fs-data-changed', () => {
            this.updateFileCache();
            ThreeCore.needsRender = true;
        });
        this.updateFileCache();
    },

    updateFileCache() {
        this.cachedFiles = FileSystem.getItems('desktop');
    },

    getEmojiByType(type) {
        const emojis = {
            'folder': '📁', 'book': '📖', 'program': '⚙️', 'executable': '🚀',
            'narrative': '📜', 'image': '🖼️', 'file': '📄', 'data': '📊'
        };
        return emojis[type] || '💠';
    },

    async createIconElement(file) {
        if (this.pending.has(file.id) || this.objects.has(file.id)) return;
        this.pending.add(file.id);

        try {
            const group = new THREE.Group();
            
            const geometry = new THREE.BoxGeometry(100, 100, 10);
            const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
            const hitMesh = new THREE.Mesh(geometry, material);
            hitMesh.userData = { id: file.id, lastInteraction: Date.now() };
            group.add(hitMesh);

            const iconDiv = document.createElement('div');
            iconDiv.dataset.id = file.id; 
            // H -> Se añade la clase desktop-icon-3d para el SelectionManager
            iconDiv.className = 'desktop-icon-3d pointer-events-auto select-none flex items-center justify-center';
            iconDiv.style.cssText = `
                width: 100px; height: 100px; background: #e0e5ec;
                border-radius: 24px; box-shadow: 10px 10px 20px #b8b9be, -10px -10px 20px #ffffff;
                display: flex; align-items: center; justify-content: center;
                font-size: 2.4rem; border: 1px solid rgba(255,255,255,0.4);  
                font-weight: 200; color: #7e7e7eff; transition: border 0.3s, box-shadow 0.3s;
            `;
            
            if (file.type === 'image' && file.content) {
                iconDiv.style.fontSize = '0';
                iconDiv.style.overflow = 'hidden';
                iconDiv.innerHTML = `<img src="${file.content}" style="width:100%; height:100%; object-fit:cover; border-radius:20px; pointer-events:none;">`;
            } else if (file.type === 'executable' || file.type === 'program') {
                const firstChar = Array.from(file.title || " ")[0] || "⚙️";
                iconDiv.innerText = firstChar;
            } else {
                iconDiv.innerText = this.getEmojiByType(file.type);
            }

            const iconObj = new THREE.CSS3DObject(iconDiv);
            group.add(iconObj);

            const labelDiv = document.createElement('div');
            labelDiv.className = 'pointer-events-none select-none';
            labelDiv.innerHTML = `
                <div class="mt-4 px-2 py-1 bg-black/5 backdrop-blur-sm rounded-xl max-w-[140px] text-center">
                    <span style="font-family: 'Montserrat' font-size:"37px" ; class="  line-clamp-3 leading-tight break-words">${file.title}</span>
                </div>
            `;
            const labelObj = new THREE.CSS3DObject(labelDiv);
            labelObj.position.set(0, -75, 0); 
            group.add(labelObj);

            group.position.set(file.x - (window.innerWidth / 2), -file.y + (window.innerHeight / 2), 0);
            ThreeCore.scene.add(group);
            this.objects.set(file.id, group);
            
            // Sincronizar estado visual si ya estaba seleccionado
            if (typeof SelectionManager !== 'undefined' && SelectionManager.isSelected(file.id)) {
                iconDiv.classList.add('icon-selected');
            }

            ThreeCore.needsRender = true;
        } finally {
            this.pending.delete(file.id);
        }
    },

    renderFiles() {
        let moving = false;
        const now = Date.now();
        const currentIdsOnDesktop = this.cachedFiles.map(f => f.id);
        const idsToRemove = [];

        for (let id of this.objects.keys()) {
            if (!currentIdsOnDesktop.includes(id)) idsToRemove.push(id);
        }

        idsToRemove.forEach(id => {
            const group = this.objects.get(id);
            if (group) {
                group.traverse(child => {
                    if (child.element && child.element.parentNode) child.element.parentNode.removeChild(child.element);
                });
                ThreeCore.scene.remove(group);
                this.objects.delete(id);
                moving = true;
            }
        });

        this.cachedFiles.forEach(file => {
            if (!this.objects.has(file.id)) {
                this.createIconElement(file);
                moving = true; 
                return;
            }

            const group = this.objects.get(file.id);
            const hitMesh = group.children[0];
            const targetX = file.x - (window.innerWidth / 2);
            const targetY = -file.y + (window.innerHeight / 2);
            const dx = targetX - group.position.x;
            const dy = targetY - group.position.y;

            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                group.position.x += dx * 0.15;
                group.position.y += dy * 0.15;
                moving = true;
            } else {
                group.position.x = targetX;
                group.position.y = targetY;
            }
            
            const timeSinceInteraction = now - hitMesh.userData.lastInteraction;
            const boost = Math.max(1, 2 * (1 - timeSinceInteraction / 2000));
            const wave = Math.sin(now * 0.002) * 2 * boost;
            group.children[1].position.y = wave; 
            group.children[2].position.y = -75 + wave; 
            if (boost > 1) moving = true;
        });

        return moving;
    }
};