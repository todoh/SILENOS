// --- FS-UNIVERSE-DATA.JS (DATA LOADING & MANAGEMENT) ---
/**
 * Gestión de datos del sistema de archivos para Universe.
 * Carga directorios, ordena nodos y procesa metadatos.
 */

Universe.loadDirectory = async function(dirHandle) {
    this.currentHandle = dirHandle;
    this.nodes = [];
    
    // Reset cámara suavemente
    this.camera.targetX = this.width / 2;
    this.camera.targetY = this.height / 2;
    this.camera.targetZoom = 1;

    const entries = [];
    for await (const entry of dirHandle.values()) {
        entries.push(entry);
    }

    // Crear nodos base
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const type = entry.kind === 'directory' ? 'dir' : this.detectType(entry.name);
        
        // Tamaño base
        let r = type === 'dir' ? 50 : 25; 

        const node = {
            id: i,
            entry: entry,
            type: type,
            x: 0,
            y: 0,
            vx: 0, vy: 0, 
            r: r,
            targetR: r, 
            label: entry.name,
            color: type === 'dir' ? '#000000' : '#FFFFFF',
            preview: null, 
            childCount: 0 
        };

        this.nodes.push(node);
        this.enrichNode(node);
    }

    // Aplicar ordenación inicial y layout
    this.sortNodes(false); 
};

Universe.detectType = function(name) {
    if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (name.endsWith('.js') || name.endsWith('.html') || name.endsWith('.css')) return 'code';
    return 'file';
};

Universe.enrichNode = async function(node) {
    if (node.type === 'dir') {
        try {
            let count = 0;
            for await (const _ of node.entry.values()) {
                count++;
                if (count > 50) break; 
            }
            node.childCount = count;
            node.targetR = 50 + (Math.log(count + 1) * 5);
        } catch (e) { console.warn("Access denied to subfolder", e); }
    } else if (node.type === 'image') {
        try {
            const file = await node.entry.getFile();
            const bmp = await createImageBitmap(file);
            node.preview = bmp;
        } catch (e) {}
    }
};

Universe.sortNodes = function(toggleMode = true) {
    if (toggleMode) {
        this.sortMode = this.sortMode === 'name' ? 'type' : 'name';
        if (typeof showToast === 'function') showToast(`SORT BY: ${this.sortMode.toUpperCase()}`);
    }

    // 1. Ordenar el array lógico
    this.nodes.sort((a, b) => {
        if (this.sortMode === 'type') {
            if (a.type !== b.type) {
                if (a.type === 'dir') return -1;
                if (b.type === 'dir') return 1;
                return a.type.localeCompare(b.type);
            }
        }
        return a.label.localeCompare(b.label);
    });

    // 2. Calcular posiciones en CUADRÍCULA (GRID)
    const total = this.nodes.length;
    const cols = Math.ceil(Math.sqrt(total)); 
    
    // --- CAMBIO: ESPACIO AUMENTADO A 180 ---
    const spacing = 180; 
    
    const gridWidth = cols * spacing;
    const startX = -gridWidth / 2 + (spacing / 2);
    
    for (let i = 0; i < total; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const targetX = startX + (col * spacing);
        const targetY = (-Math.ceil(total/cols) * spacing / 2) + (row * spacing);
        
        // Asignamos una fuerza fuerte hacia esa posición
        this.nodes[i].homeX = targetX;
        this.nodes[i].homeY = targetY;
    }
};