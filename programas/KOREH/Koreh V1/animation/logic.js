window.logic = {
    targetHandle: null,
    existingData: [], // JSONs para memoria IA
    
    async init() {
        const FS = window.parent;
        if(FS && FS.rootHandle) {
            this.rootHandle = FS.rootHandle;
            this.scanRoot();
        }
    },

    // --- SISTEMA DE ARCHIVOS ---
    async scanRoot() {
        const list = document.getElementById('folder-list'); list.innerHTML = '';
        this.addFolderOption(list, this.rootHandle, 'ROOT', true);
        await this.scanDirRecursive(this.rootHandle, list, 'ROOT');
    },

    async scanDirRecursive(dirHandle, listElement, pathString, depth = 0) {
        if (depth > 2) return;
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                const currentPath = `${pathString}/${entry.name}`;
                this.addFolderOption(listElement, entry, currentPath);
                await this.scanDirRecursive(entry, listElement, currentPath, depth + 1);
            }
        }
    },

    addFolderOption(container, handle, displayName, isRoot) {
        const el = document.createElement('div');
        el.className = "px-6 py-4 cursor-pointer border-b border-gray-50 flex items-center gap-4 text-xs font-medium text-gray-700 hover:bg-blue-50 transition group";
        el.innerHTML = `<i class="fa-solid fa-folder text-blue-200 group-hover:text-blue-500 transition"></i> ${displayName}`;
        el.onclick = async () => {
            this.targetHandle = handle;
            document.getElementById('current-folder-label').innerText = displayName.split('/').pop();
            ui.toggleFolderModal();
            await this.loadExistingData();
        };
        container.appendChild(el);
    },

    // --- CARGA DE DATOS Y BIBLIOTECA VISUAL ---
    async loadExistingData() {
        this.existingData = [];
        if (!this.targetHandle) return;
        
        ui.setLoading(true, "Actualizando Biblioteca...");
        const grid = document.getElementById('library-grid');
        grid.innerHTML = '';
        let pngCount = 0;

        for await (const entry of this.targetHandle.values()) {
            if (entry.kind !== 'file') continue;

            // 1. Cargar JSONs para memoria de IA
            if (entry.name.endsWith('.json')) {
                try {
                    const f = await entry.getFile();
                    const t = await f.text();
                    const json = JSON.parse(t);
                    if (json.name && (json.visualDesc || json.desc)) {
                        this.existingData.push(json);
                    }
                } catch(e) {}
            }
            
            // 2. Cargar PNGs para Biblioteca Visual (Miniaturas)
            if (entry.name.toLowerCase().endsWith('.png')) {
                pngCount++;
                try {
                    const file = await entry.getFile();
                    const imgUrl = URL.createObjectURL(file); // Crear URL local para la miniatura

                    const thumb = document.createElement('div');
                    thumb.className = 'library-thumb animate-fade-in';
                    thumb.title = entry.name;
                    thumb.innerHTML = `
                        <img src="${imgUrl}" loading="lazy">
                        <span>${entry.name.substring(0, 15)}...</span>
                    `;
                    thumb.onclick = () => this.importSpriteToScene(entry.name);
                    
                    // Limpieza de memoria al quitar el elemento
                    thumb.addEventListener('DOMNodeRemoved', () => URL.revokeObjectURL(imgUrl));
                    grid.appendChild(thumb);

                } catch (e) { console.error("Error cargando miniatura", entry.name, e); }
            }
        }
        
        if(pngCount === 0) {
            grid.innerHTML = '<div class="col-span-4 text-[10px] text-gray-400 text-center italic pt-8">Carpeta vacía (sin PNGs)</div>';
        }

        ui.setLoading(false);
        console.log(`Memoria cargada: ${this.existingData.length} entidades IA, ${pngCount} imágenes.`);
    },

    async importSpriteToScene(fileName) {
        if (!this.targetHandle) return;
        try {
            ui.setLoading(true, "Importando Asset...");
            const fileHandle = await this.targetHandle.getFileHandle(fileName);
            const blob = await fileHandle.getFile();

            // Heurística simple para detectar si es fondo
            const isBg = fileName.toLowerCase().includes('bg_') || fileName.toLowerCase().includes('background');

            await ui.addSprite(blob, {
                name: fileName.replace('.png', ''),
                isBg: isBg,
                // Si es fondo, intentamos que ocupe toda la pantalla inicialmente
                width: isBg ? ui.canvas.width : null,
                height: isBg ? ui.canvas.height : null,
                x: isBg ? 0 : null,
                y: isBg ? 0 : null
            });
            
            ui.setLoading(false);
        } catch (e) {
            console.error("Error importando:", e);
            ui.setLoading(false);
            alert("Error al cargar: " + e.message);
        }
    },

    // --- NUEVO: GENERADOR DE ASSETS INDIVIDUALES (PARALELO) ---
    async generateCustomAssets() {
        if (!this.targetHandle) return alert("Selecciona una carpeta primero para guardar los resultados.");
        
        const type = ui.currentGenTab; // 'bg' o 'sprite'
        const promptText = document.getElementById('asset-prompt').value;
        const qtyInput = document.getElementById('asset-qty');
        let qty = parseInt(qtyInput.value) || 1;
        qty = Math.max(1, Math.min(4, qty)); // Limitar entre 1 y 4

        if (!promptText) return alert("Escribe una descripción para el asset.");

        ui.setLoading(true, `Generando ${qty} ${type === 'bg' ? 'Fondo(s)' : 'Sprite(s)'}...`, "Procesamiento en Paralelo");

        const promises = [];
        const baseName = type === 'bg' ? 'custom_bg' : 'custom_sprite';

        for (let i = 0; i < qty; i++) {
            const name = `${baseName}_${Date.now()}_${i}`;
            const isTransparent = (type === 'sprite');
            
            // Ajustar prompt según el tipo
            let finalPrompt = promptText;
            if (type === 'bg') {
                finalPrompt += ", wide shot background, detailed scene, no characters, PHOTORREALIST";
            } else {
                finalPrompt += ", isolated character/object on pure vivid green background, hex #00FF00, full body view, PHOTORREALIST";
            }

            // Añadir al pool de promesas
            promises.push(
                this.generateAsset(name, finalPrompt, isTransparent)
                    .then(blob => ({ name, blob, isTransparent })) // Retornar resultado
            );
        }

        try {
            // Esperar a que todas terminen
            const results = await Promise.all(promises);

            // Importar a la escena automáticamente una vez generados
            ui.setLoading(true, "Importando a escena...");
            for (const res of results) {
                 await ui.addSprite(res.blob, {
                    name: res.name,
                    isBg: type === 'bg',
                    // Si es BG, que ocupe pantalla. Si es sprite, tamaño medio por defecto.
                    width: type === 'bg' ? ui.canvas.width : null,
                    height: type === 'bg' ? ui.canvas.height : null,
                    x: type === 'bg' ? 0 : null,
                    y: type === 'bg' ? 0 : null,
                    size: type !== 'bg' ? 'medium' : null
                });
            }
            
            // Actualizar la biblioteca para ver las nuevas miniaturas
            await this.loadExistingData();

        } catch (e) {
            console.error(e);
            alert("Error en la generación paralela: " + e.message);
        } finally {
            ui.setLoading(false);
            // Limpiar inputs
            document.getElementById('asset-prompt').value = '';
            qtyInput.value = '1';
        }
    },

    // --- FLUJO DE PRODUCCIÓN DE ESCENA COMPLETA (MODIFICADO) ---
    async analyzeAndGenerate() {
        if (!this.targetHandle) return alert("Selecciona carpeta primero.");
        const text = document.getElementById('scene-input').value;
        if (!text) return alert("Describe la escena.");

        ui.clearScene(); // Limpiar antes de nueva escena
        const assetNames = this.existingData.map(d => d.name);

        try {
            // 1. INTELIGENCIA
            ui.setLoading(true, "Fase 1: Análisis de Guión...", "Director IA + Guionista IA");
            const [classification, breakdown] = await Promise.all([
                AIStudio.classifyScene(text),
                AIStudio.breakdownAssets(text, assetNames)
            ]);
            const masterPlan = AIStudio.constructPrompts(classification, breakdown.assets, this.existingData);
            
            // 2. PRODUCCIÓN PARALELA
            ui.setLoading(true, `Fase 2: Producción Simultánea (${masterPlan.sprites.length + 1} Assets)...`, "Generando Imágenes + Layout");

            const bgPromise = this.generateAsset(`bg_${Date.now()}`, masterPlan.backgroundPrompt, false)
                .then(blob => ({ isBg: true, name: 'scene_bg', blob }));

            const spritePromises = masterPlan.sprites.map(s => 
                this.generateAsset(s.name, s.prompt, true)
                    .then(blob => ({ isBg: false, ...s, blob }))
            );

            const layoutPromise = AIStudio.calculateLayout(1280, 720, masterPlan.sprites, classification);

            const [bgResult, layout, ...spriteResults] = await Promise.all([
                bgPromise, layoutPromise, ...spritePromises
            ]);

            // 3. ENSAMBLAJE
            ui.setLoading(true, "Ensamblando Escena...", "Componiendo Capas");

            // Añadir Fondo (Ahora es un sprite más, pero marcado como bg)
            await ui.addSprite(bgResult.blob, {
                name: bgResult.name,
                isBg: true,
                width: ui.canvas.width, height: ui.canvas.height, x:0, y:0
            });

            // Añadir Sprites
            for (const s of spriteResults) {
                const pos = layout.find(l => l.name === s.name) || { x: 100, y: 100, scale_factor: 1 };
                let baseScale = 1.0; 
                if (s.size === 'tiny') baseScale = 0.5;
                if (s.size === 'huge') baseScale = 2.0;

                await ui.addSprite(s.blob, {
                    name: s.name, isBg: false,
                    size: s.size, x: pos.x, y: pos.y,
                    customScale: pos.scale_factor * baseScale
                });
            }
            
            await this.loadExistingData(); // Refrescar biblioteca al final

        } catch (e) {
            console.error(e);
            alert("Error crítico en producción: " + e.message);
        } finally {
            ui.setLoading(false);
        }
    },

    // Helper unificado de generación y guardado
    async generateAsset(name, prompt, isTransparent) {
        const cleanName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${cleanName}.png`; // Quitamos el timestamp aquí, ya viene en el nombre

        // 1. Generar Imagen (Flux)
        let blob = await window.Koreh.Image.generate(prompt, {
            model: 'klein-large', 
            width: isTransparent ? 1024 : 1344, 
            height: isTransparent ? 1024 : 768,
            nologo: true,
            seed: Math.floor(Math.random() * 9999999) // Semilla aleatoria para evitar duplicados en paralelo
        });

        // 2. Procesar Transparencia (Chroma) si es necesario
        if (isTransparent) {
            blob = await window.Chroma.process(blob);
        }

        // 3. Guardar en disco (Fire & Forget para velocidad)
        this.saveToDisk(fileName, blob);

        return blob;
    },

    async saveToDisk(fileName, blob) {
        try {
            const fileHandle = await this.targetHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            console.log("Guardado:", fileName);
        } catch (e) { console.warn("Fallo al guardar archivo:", e); }
    }
};