/* SILENOS 3/three-entities.js */
// H -> Coherencia: Gestión de Entidades 3D con Actualización de Contenido Dinámico

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
            
            // 1. Hitbox para interacción
            const geometry = new THREE.BoxGeometry(100, 100, 10);
            const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
            const hitMesh = new THREE.Mesh(geometry, material);
            hitMesh.userData = { id: file.id, lastInteraction: Date.now() };
            group.add(hitMesh);

            // 2. Elemento de Icono
            const iconDiv = document.createElement('div');
            iconDiv.dataset.id = file.id; 
            iconDiv.className = 'desktop-icon-3d pointer-events-auto select-none flex items-center justify-center';
            iconDiv.style.cssText = `
                width: 90px; height: 90px; background: #e0e5ec;
                border-radius: 24px; box-shadow: 10px 10px 20px #b8b9be, -10px -10px 20px #ffffff;
                display: flex; align-items: center; justify-content: center;
                font-size: 2.4rem; border: 1px solid rgba(255,255,255,0.4);  
                font-weight: 200; color: #1f1f1fff; transition: border 0.3s, box-shadow 0.3s;
            `;
            
            this.updateIconDOM(iconDiv, file);

            const iconObj = new THREE.CSS3DObject(iconDiv);
            group.add(iconObj);

            // 3. Etiqueta de Nombre (Label)
            const labelDiv = document.createElement('div');
            labelDiv.className = 'pointer-events-none select-none';
            labelDiv.innerHTML = `
                <div class="mt-4 px-2 py-1 bg-black/5 backdrop-blur-sm rounded-xl max-w-[140px] text-center">
                    <span style="font-family: 'Montserrat'; font-size: 17px; color: #1f1f1fff;" class="line-clamp-3 leading-tight break-words">${file.title}</span>
                </div>
            `;
            const labelObj = new THREE.CSS3DObject(labelDiv);
            labelObj.position.set(0, -75, 0); 
            group.add(labelObj);

            group.position.set(file.x - (window.innerWidth / 2), -file.y + (window.innerHeight / 2), 0);
            ThreeCore.scene.add(group);
            this.objects.set(file.id, group);
            
            if (typeof SelectionManager !== 'undefined' && SelectionManager.isSelected(file.id)) {
                iconDiv.classList.add('icon-selected');
            }

            ThreeCore.needsRender = true;
        } finally {
            this.pending.delete(file.id);
        }
    },

    // Función auxiliar para actualizar el aspecto visual del icono sin recrear el objeto
    updateIconDOM(iconDiv, file) {
        if (file.type === 'image' && file.content) {
            iconDiv.style.fontSize = '0';
            iconDiv.style.overflow = 'hidden';
            iconDiv.innerHTML = `<img src="${file.content}" style="width:100%; height:100%; object-fit:cover; border-radius:20px; pointer-events:none;">`;
        } else if (file.type === 'executable' || file.type === 'program') {
            const firstChar = Array.from(file.title || " ")[0] || "⚙️";
            iconDiv.innerText = firstChar;
            iconDiv.style.fontSize = '2.4rem';
        } else {
            iconDiv.innerText = this.getEmojiByType(file.type);
            iconDiv.style.fontSize = '2.4rem';
        }
    },

    renderFiles() {
        let moving = false;
        const now = Date.now();
        const currentIdsOnDesktop = this.cachedFiles.map(f => f.id);
        
        // Limpieza de eliminados
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

        // Actualización de existentes y creación de nuevos
        this.cachedFiles.forEach(file => {
            if (!this.objects.has(file.id)) {
                this.createIconElement(file);
                moving = true; 
                return;
            }

            const group = this.objects.get(file.id);
            const iconObj = group.children[1];
            const labelObj = group.children[2];

            // --- ACTUALIZACIÓN PROFUNDA DE CONTENIDO (NOMBRES) ---
            // Buscamos el span del nombre y lo actualizamos si ha cambiado en el FileSystem
            const labelSpan = labelObj.element.querySelector('span');
            if (labelSpan && labelSpan.innerText !== file.title) {
                labelSpan.innerText = file.title;
                
                // Si es un programa, su icono (la letra inicial) también debe cambiar
                if (file.type === 'executable' || file.type === 'program') {
                    this.updateIconDOM(iconObj.element, file);
                }
                moving = true;
            }

            // --- ANIMACIÓN Y POSICIONAMIENTO ---
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
            
            // Aplicar flotación suave
            iconObj.position.y = wave; 
            labelObj.position.y = -75 + wave; 
            
            if (boost > 1) moving = true;
        });

        return moving;
    }
};