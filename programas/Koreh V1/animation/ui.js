window.ui = {
    canvas: null,
    ctx: null,
    sprites: [], // { id, img, x, y, width, height, isBg, zIndex }
    selectedSprite: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    resizeHandleSize: 12,
    dragSrcEl: null,
    currentGenTab: 'bg', // 'bg' o 'sprite'

    init() {
        this.canvas = document.getElementById('stage-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Listeners Canvas
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        // Prevent context menu on right click for drag
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        this.updateAuthUI();
        if (window.parent && window.parent.addEventListener) {
            window.parent.addEventListener('silenos:config-updated', () => this.updateAuthUI());
        }
    },

    // --- RENDERIZADO ---
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Ordenar por Z-Index ascendente (menor Z se pinta primero = atrás)
        const sorted = [...this.sprites].sort((a, b) => a.zIndex - b.zIndex);

        sorted.forEach(s => {
            if (!s.img) return;
            
            this.ctx.save();
            // Sombra simple para destacar elementos si se desea
            // this.ctx.shadowColor = "rgba(0,0,0,0.1)"; this.ctx.shadowBlur = 5;

            this.ctx.drawImage(s.img, s.x, s.y, s.width, s.height);
            this.ctx.restore();
            
            // UI de Selección
            if (this.selectedSprite === s) {
                this.ctx.strokeStyle = '#3b82f6'; // Azul selección
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(s.x, s.y, s.width, s.height);
                
                // Handle Resize (Esquina inferior derecha)
                this.ctx.fillStyle = '#3b82f6';
                this.ctx.beginPath();
                this.ctx.rect(s.x + s.width - this.resizeHandleSize, s.y + s.height - this.resizeHandleSize, this.resizeHandleSize, this.resizeHandleSize);
                this.ctx.fill();
            }
        });
    },

    // --- GESTIÓN DE SPRITES UNIFICADA (FONDOS Y OBJETOS) ---
    async addSprite(blob, props) {
        const img = await this.createImageFromBlob(blob);
        
        // 1. Calcular Dimensiones
        let targetW, targetH;
        
        if (props.width && props.height) {
            // Dimensiones forzadas (ej: fondo de escena completa)
            targetW = props.width;
            targetH = props.height;
        } else {
            // Dimensiones basadas en escala y aspect ratio
            let scale = 0.4; // Default medium
            if (props.size === 'tiny') scale = 0.15;
            if (props.size === 'small') scale = 0.25;
            if (props.size === 'large') scale = 0.6;
            if (props.size === 'huge') scale = 0.85;
            if (props.customScale) scale = props.customScale;

            const ratio = img.width / img.height;
            targetH = this.canvas.height * scale;
            targetW = targetH * ratio;
        }

        // 2. Calcular Posición
        let targetX = props.x !== undefined && props.x !== null ? props.x : (this.canvas.width / 2) - (targetW / 2);
        let targetY = props.y !== undefined && props.y !== null ? props.y : (this.canvas.height - targetH - 50);

        // 3. Calcular Z-Index Inicial
        // Si es BG, intentamos ponerlo al fondo (-100). Si no, arriba del todo.
        let initialZ = 0;
        if (props.isBg) {
             // Encontrar el Z más bajo actual
             const minZ = this.sprites.length > 0 ? Math.min(...this.sprites.map(s => s.zIndex)) : 0;
             initialZ = Math.min(-100, minZ - 1); // Asegurar que va detrás
        } else {
             // Encontrar el Z más alto actual
             const maxZ = this.sprites.length > 0 ? Math.max(...this.sprites.map(s => s.zIndex)) : 0;
             initialZ = Math.max(100, maxZ + 1); // Asegurar que va delante
        }

        const newSprite = {
            id: props.name,
            img: img,
            x: targetX,
            y: targetY,
            width: targetW,
            height: targetH,
            isBg: !!props.isBg, // Marcamos si es fondo conceptualmente
            zIndex: initialZ
        };

        this.sprites.push(newSprite);
        this.selectedSprite = newSprite;
        
        this.recalculateZIndices(); // Normalizar Z-indexs
        this.render();
        this.updateSidebarList(newSprite.id);
    },

    removeSprite(spriteId) {
        this.sprites = this.sprites.filter(s => s.id !== spriteId);
        if (this.selectedSprite && this.selectedSprite.id === spriteId) {
            this.selectedSprite = null;
        }
        this.render();
        this.updateSidebarList();
    },

    clearScene() {
        this.sprites = [];
        this.selectedSprite = null;
        this.render();
        this.updateSidebarList();
    },

    createImageFromBlob(blob) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = URL.createObjectURL(blob);
        });
    },

    // --- INTERACTIVIDAD MOUSE (Ahora incluye Fondos) ---
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    },

    isOverHandle(pos, s) {
        return pos.x >= s.x + s.width - this.resizeHandleSize &&
               pos.x <= s.x + s.width &&
               pos.y >= s.y + s.height - this.resizeHandleSize &&
               pos.y <= s.y + s.height;
    },

    onMouseDown(e) {
        if(e.button !== 0) return; // Solo click izquierdo
        const pos = this.getMousePos(e);
        
        // 1. Chequear resize handle del seleccionado
        if (this.selectedSprite && this.isOverHandle(pos, this.selectedSprite)) {
            this.isResizing = true;
            return;
        }

        // 2. Hit Detection (De arriba hacia abajo visualmente)
        // Ordenamos descendente por Z para chequear primero los que están "delante"
        const sortedForHit = [...this.sprites].sort((a, b) => b.zIndex - a.zIndex);
        
        // ¡YA NO FILTRAMOS !s.isBg! Ahora todo es seleccionable.
        const hit = sortedForHit.find(s => 
            pos.x >= s.x && pos.x <= s.x + s.width &&
            pos.y >= s.y && pos.y <= s.y + s.height
        );

        if (hit) {
            this.selectedSprite = hit;
            this.isDragging = true;
            this.dragOffset = { x: pos.x - hit.x, y: pos.y - hit.y };
            this.render();
            this.updateSidebarList(hit.id);
        } else {
            this.selectedSprite = null;
            this.render();
            // Deseleccionar visualmente en la lista
            document.querySelectorAll('.asset-item').forEach(el => el.classList.remove('border-black', 'bg-gray-50'));
        }
    },

    onMouseMove(e) {
        const pos = this.getMousePos(e);

        if (this.isResizing && this.selectedSprite) {
            // Mantener aspect ratio si se presiona Shift (opcional, por ahora libre)
            const newW = Math.max(50, pos.x - this.selectedSprite.x);
            const newH = Math.max(50, pos.y - this.selectedSprite.y);
            this.selectedSprite.width = newW;
            this.selectedSprite.height = newH;
            this.render();
            return;
        }

        if (this.isDragging && this.selectedSprite) {
            this.selectedSprite.x = pos.x - this.dragOffset.x;
            this.selectedSprite.y = pos.y - this.dragOffset.y;
            this.render();
            return;
        }

        // Cursor
        let cursor = 'default';
        if (this.selectedSprite && this.isOverHandle(pos, this.selectedSprite)) cursor = 'nwse-resize';
        else if ([...this.sprites].some(s => pos.x >= s.x && pos.x <= s.x+s.width && pos.y >= s.y && pos.y <= s.y+s.height)) cursor = 'move';
        
        this.canvas.style.cursor = cursor;
    },

    onMouseUp() {
        this.isDragging = false;
        this.isResizing = false;
    },

    // --- UI HELPERS & CAPAS ---
    toggleFolderModal() {
        const modal = document.getElementById('folder-modal');
        modal.classList.toggle('hidden');
        if(!modal.classList.contains('hidden')) logic.scanRoot();
    },

    setGenTab(tab) {
        this.currentGenTab = tab;
        document.getElementById('gen-btn-bg').classList.toggle('active', tab === 'bg');
        document.getElementById('gen-btn-sprite').classList.toggle('active', tab === 'sprite');
        // Cambiar placeholder según el tab
        document.getElementById('asset-prompt').placeholder = tab === 'bg' ? "Ej: Playa tropical al amanecer..." : "Ej: Un robot oxidado...";
    },

    setLoading(active, text, subtext = "") {
        const loader = document.getElementById('sidebar-loader');
        if(active) {
            loader.classList.remove('hidden');
            loader.classList.add('flex');
            document.getElementById('loader-text').innerText = text;
            document.getElementById('loader-subtext').innerText = subtext;
        } else {
            loader.classList.add('hidden');
            loader.classList.remove('flex');
        }
    },

    updateAuthUI() {
        if (!window.parent || !window.parent.SystemConfig) return;
        const Sys = window.parent.SystemConfig;
        const ind = document.getElementById('status-indicator');
        const txt = document.getElementById('status-text');
        if(Sys && Sys.authKey) {
            ind.className = "w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]";
            txt.innerText = "ONLINE";
        } else {
            ind.className = "w-1.5 h-1.5 rounded-full bg-red-500";
            txt.innerText = "OFFLINE";
        }
    },

    // Actualiza la lista de capas (Drag & Drop ordering)
    updateSidebarList(selectedId) {
        const list = document.getElementById('assets-list');
        list.innerHTML = '';
        
        if(this.sprites.length === 0) {
            list.innerHTML = '<div class="text-[10px] text-gray-300 text-center italic py-4 border border-dashed border-gray-100 rounded">Escena vacía</div>';
            document.getElementById('assets-count').innerText = `0 ITEMS`;
            return;
        }

        // Orden visual: Z más alto primero (arriba en la lista)
        const visualOrder = [...this.sprites].sort((a, b) => b.zIndex - a.zIndex);

        visualOrder.forEach(s => {
            const div = document.createElement('div');
            // Añadimos clase 'is-bg' si es fondo para diferenciarlo visualmente un poco
            div.className = `asset-item ${s.isBg ? 'is-bg' : ''} ${s.id === selectedId ? '!border-blue-500 bg-blue-50' : ''}`;
            div.draggable = true;
            div.dataset.id = s.id;

            div.innerHTML = `
                <div class="w-8 h-8 bg-gray-100 flex items-center justify-center overflow-hidden rounded-sm shrink-0 pointer-events-none border border-gray-200 icon-container">
                    ${s.isBg ? '<i class="fa-solid fa-image text-gray-300"></i>' : ''}
                </div>
                <div class="flex flex-col overflow-hidden pointer-events-none">
                    <span class="text-[10px] font-bold uppercase truncate w-32" title="${s.id}">${s.id}</span>
                    <span class="text-[9px] text-gray-400 flex items-center gap-1">
                        ${s.isBg ? '<span class="bg-gray-200 px-1 rounded text-[8px]">FONDO</span>' : ''} Z:${s.zIndex}
                    </span>
                </div>
                <i class="fa-solid fa-trash-can trash-btn hover:bg-red-50 rounded-full px-2 py-1" title="Eliminar Capa"></i>
            `;
            
            if (s.img) {
                const thumb = document.createElement('canvas');
                thumb.width = 32; thumb.height = 32;
                // Dibujar la imagen en el canvas miniatura
                thumb.getContext('2d').drawImage(s.img, 0,0,32,32);
                const iconCont = div.querySelector('.icon-container');
                iconCont.innerHTML = '';
                iconCont.appendChild(thumb);
            }

            div.onclick = (e) => {
                if(e.target.classList.contains('trash-btn')) return;
                this.selectedSprite = s;
                this.render();
                this.updateSidebarList(s.id);
            };

            div.querySelector('.trash-btn').onclick = (e) => {
                e.stopPropagation();
                if(confirm(`¿Eliminar la capa "${s.id}"?`)) this.removeSprite(s.id);
            };

            // --- DRAG AND DROP (Capas) ---
            div.addEventListener('dragstart', (e) => {
                this.dragSrcEl = div;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', s.id);
                div.classList.add('dragging');
            });
            div.addEventListener('dragend', () => div.classList.remove('dragging'));
            div.addEventListener('dragover', (e) => e.preventDefault());
            div.addEventListener('drop', (e) => {
                e.stopPropagation();
                const sourceId = e.dataTransfer.getData('text/plain');
                if (sourceId !== s.id) this.reorderSprites(sourceId, s.id);
                return false;
            });

            list.appendChild(div);
        });
        
        document.getElementById('assets-count').innerText = `${this.sprites.length} ITEMS`;
    },

    reorderSprites(sourceId, targetId) {
        // Lista visual actual (descendente Z)
        let visualList = [...this.sprites].sort((a, b) => b.zIndex - a.zIndex);
        
        const srcIdx = visualList.findIndex(s => s.id === sourceId);
        const tgtIdx = visualList.findIndex(s => s.id === targetId);
        if (srcIdx < 0 || tgtIdx < 0) return;

        // Mover en la lista visual
        const [movedItem] = visualList.splice(srcIdx, 1);
        visualList.splice(tgtIdx, 0, movedItem);

        // Reasignar Z-Indices (El primero de la lista visual tiene el Z más alto)
        const maxZ = 1000;
        visualList.forEach((sprite, i) => {
            sprite.zIndex = maxZ - i;
        });

        this.render();
        this.updateSidebarList(sourceId);
    },

    recalculateZIndices() {
        // Normaliza los Z-index para que estén espaciados uniformemente
        if(this.sprites.length === 0) return;
        const sorted = [...this.sprites].sort((a, b) => a.zIndex - b.zIndex);
        sorted.forEach((s, i) => s.zIndex = (i + 1) * 10); // Ej: 10, 20, 30...
    },

    captureCanvas() {
        if(!logic.targetHandle) return alert("Selecciona carpeta primero para guardar.");
        // Deseleccionar antes de capturar para que no salga el marco azul
        const prevSelected = this.selectedSprite;
        this.selectedSprite = null;
        this.render();

        this.canvas.toBlob(async (blob) => {
            const filename = `SCENE_CAPTURE_${Date.now()}.png`;
            await logic.saveToDisk(filename, blob);
            
            // Restaurar selección
            this.selectedSprite = prevSelected;
            this.render();
            await logic.loadExistingData(); // Refrescar biblioteca
        }, 'image/png', 1.0); // Calidad máxima
    }
};