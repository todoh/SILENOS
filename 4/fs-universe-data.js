// --- FS-UNIVERSE-DATA.JS (DATA LOADING & MANAGEMENT) ---

Universe.loadDirectory = async function(dirHandle) {
    this.currentHandle = dirHandle;
    this.nodes = [];
    
    // --- CORRECCIÓN CÁMARA ---
    this.camera.targetX = 0;
    this.camera.targetY = 0;
    this.camera.targetZoom = 1;

    const entries = [];
    for await (const entry of dirHandle.values()) {
        entries.push(entry);
    }

    // Crear nodos base
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const type = entry.kind === 'directory' ? 'dir' : this.detectType(entry.name);
        
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

    this.sortNodes(false); 
};

Universe.detectType = function(name) {
    if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (name.match(/\.(mp4|webm|ogg|mov|m4v)$/i)) return 'video';
    if (name.endsWith('.js') || name.endsWith('.html') || name.endsWith('.css')) return 'code';
    if (name.endsWith('.json')) return 'file'; 
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
            // --- MANEJO ESPECIAL PARA ARCHIVOS SVG ---
            if (node.entry.name.toLowerCase().endsWith('.svg')) {
                const text = await file.text();
                // Usamos un data URI para que Image lo interprete inmediatamente sin problemas
                const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
                const img = new Image();
                img.src = dataUrl;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                // El canvas soporta dibujar HTMLImageElement directamente
                node.preview = img;
            } else {
                const bmp = await createImageBitmap(file);
                node.preview = bmp;
            }
        } catch (e) {
            console.warn("Image preview failed", e);
        }

    } else if (node.type === 'video') {
        try {
            const file = await node.entry.getFile();
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.playsInline = true;
            video.crossOrigin = "anonymous";
            video.currentTime = 1; 

            await new Promise((resolve, reject) => {
                video.onloadeddata = () => {
                     if(video.currentTime !== 1) video.currentTime = 1;
                };
                video.onseeked = () => resolve();
                video.onerror = () => reject();
                setTimeout(resolve, 2000); 
            });

            const bmp = await createImageBitmap(video);
            node.preview = bmp;
            
            URL.revokeObjectURL(video.src);
            video.remove();
        } catch (e) {
            console.warn("Video preview failed", e);
        }
    } else if (node.entry.name.endsWith('.json')) {
        try {
            const file = await node.entry.getFile();
            const text = await file.text();
            const json = JSON.parse(text);

            if (json.imagen64 && typeof json.imagen64 === 'string' && json.imagen64.length > 100) {
                const img = new Image();
                
                const src = json.imagen64.startsWith('data:') 
                    ? json.imagen64 
                    : `data:image/png;base64,${json.imagen64}`;
                
                img.src = src;
                
                await img.decode(); 
                const bmp = await createImageBitmap(img);
                
                node.preview = bmp;
                node.type = 'data'; 
                node.targetR = 40; 
            }
        } catch (e) {}
    }
};

Universe.sortNodes = function(toggleMode = true) {
    if (toggleMode) {
        this.sortMode = this.sortMode === 'name' ? 'type' : 'name';
        if (typeof showToast === 'function') showToast(`SORT BY: ${this.sortMode.toUpperCase()}`);
    }

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

    const total = this.nodes.length;
    const cols = Math.ceil(Math.sqrt(total)); 
    const spacing = 180; 
    
    const gridWidth = cols * spacing;
    const startX = -gridWidth / 2 + (spacing / 2);
    
    for (let i = 0; i < total; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const targetX = startX + (col * spacing);
        const targetY = (-Math.ceil(total/cols) * spacing / 2) + (row * spacing);
        
        this.nodes[i].homeX = targetX;
        this.nodes[i].homeY = targetY;
    }

    this.camera.targetX = 0;
    this.camera.targetY = 0;
};