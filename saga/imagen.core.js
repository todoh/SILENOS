// --- IMAGEN CORE (GENERACIÓN Y SUBIDA DE IMAGEN INDIVIDUAL - Refactorizado para Motores Locales y Cloud) ---

DataStudio.prototype.generateImageForItem = async function(filename, data, handle, globalStyle, chromaOverride = null) {
    try {
        const isChroma = (chromaOverride !== null) ? chromaOverride : ChromaUI.isEnabled();
        let basePrompt = data.visualDesc || data.name || "concept art masterpiece";
        
        let fullPrompt = `${data.name}, ${basePrompt}`;
        if (globalStyle) fullPrompt += `, ${globalStyle}`;
        if (isChroma) fullPrompt += ChromaUI.getPromptSuffix();

        const selectedModel = localStorage.getItem('koreh_selected_image_model') || 'flux';

        const width = parseInt(document.getElementById('comfy-width')?.value || "1024");
        const height = parseInt(document.getElementById('comfy-height')?.value || "1024");
        const steps = parseInt(document.getElementById('comfy-steps')?.value || "6");
        const cfg = parseFloat(document.getElementById('comfy-cfg')?.value || "2.0");
        const sampler = document.getElementById('comfy-sampler')?.value || "dpmpp_sde";

        let blob = await window.Koreh.Image.generate(fullPrompt, {
            checkpoint: document.getElementById('comfy-model')?.value || "juggernautXL_ragnarokBy.safetensors",
            model: selectedModel,
            width: width,
            height: height,
            steps: steps,
            cfg: cfg,
            sampler: sampler
        });

        if (isChroma) {
            blob = await ChromaCore.process(blob);
        }

        let ext = 'png';
        if (blob.type === 'image/jpeg') ext = 'jpg';
        if (blob.type === 'image/webp') ext = 'webp';
        
        const imgFilename = filename.replace('.json', `.${ext}`);
        
        if (data.imageFile) {
            try { await this.targetHandle.removeEntry(data.imageFile); } catch(e){}
        }

        const imgHandle = await this.targetHandle.getFileHandle(imgFilename, { create: true });
        const imgWritable = await imgHandle.createWritable();
        await imgWritable.write(blob);
        await imgWritable.close();

        data.imageFile = imgFilename;
        data.imagen64 = null; 

        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();

        const displayUrl = URL.createObjectURL(blob);
        const memoryItem = this.items.find(i => i.name === filename);
        if (memoryItem) {
            memoryItem.data.imageFile = imgFilename;
            memoryItem.data.imagen64 = null;
            memoryItem.displayImage = displayUrl; 
        }
        
        this.processingIds.delete(filename);
        Utils.log(`Imagen creada exitosamente por el Motor de Imagen: ${imgFilename}`, "success");
        
        if (this.currentFileHandle && this.currentFileHandle.name === filename) {
            this.currentData.imageFile = imgFilename;
            this.currentData.imagen64 = null;
            const bgStyle = isChroma ? 'style="background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px;"' : '';
            
            const container = document.getElementById('editor-img-container');
            if (container) {
                container.innerHTML = `<img src="${displayUrl}" class="w-full h-full object-contain" ${bgStyle}>`;
            }
        }
        
        this.renderGrid();

    } catch(e) {
        console.error(e);
        this.processingIds.delete(filename);
        Utils.log(`Fallo crítico de render en Motor de Imagen: ${data.name} - ${e.message}`, "error");
        this.renderGrid(); 
    }
};

DataStudio.prototype.generateImage = async function() {
    // Captura estricta e inmutable de los datos del archivo que lanza la petición en este instante
    if (!this.currentFileHandle) return ui.alert("No hay ningún archivo abierto para generarle una imagen.");
    
    const targetFilename = this.currentFileHandle.name;
    const targetData = JSON.parse(JSON.stringify(this.currentData)); // Clonación de seguridad del estado actual
    const targetHandle = this.currentFileHandle;

    const prompt = document.getElementById('inp-visual').value;
    const title = document.getElementById('inp-title').value;
    if(!prompt) return ui.alert("Falta prompt visual.");

    const isChroma = ChromaUI.isEnabled();
    const selectedModel = localStorage.getItem('koreh_selected_image_model') || 'flux';
    
    // En lugar de congelar toda la interfaz con ui.setLoading(true), registramos el ID en procesamiento paralelo
    if (!this.processingIds) this.processingIds = new Set();
    this.processingIds.add(targetFilename);
    
    // Notificación ligera en el log y refresco de rejilla para que pinte el icono de carga sobre el ítem
    Utils.log(`Generando en segundo plano para [${title}] usando (${selectedModel})...`, "info");
    this.renderGrid();
    
    // Si sigue abierto este mismo archivo en el inspector, damos feedback visual en el contenedor de imagen
    if (this.currentFileHandle && this.currentFileHandle.name === targetFilename) {
        const container = document.getElementById('editor-img-container');
        if (container) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center gap-2 text-indigo-500 animate-pulse h-full w-full bg-gray-50 dark:bg-gray-900/50">
                    <i class="fa-solid fa-spinner fa-spin text-3xl"></i>
                    <span class="text-[10px] uppercase font-bold tracking-wider">Generando Imagen Paralela...</span>
                </div>
            `;
        }
    }
    
    // Ejecución asíncrona desacoplada del hilo de UI principal
    (async () => {
        try {
            let fullPrompt = `${title}, ${prompt}, high quality, masterpiece`;
            if (isChroma) fullPrompt += ChromaUI.getPromptSuffix();

            let width = parseInt(document.getElementById('comfy-width')?.value || "1024");
            let height = parseInt(document.getElementById('comfy-height')?.value || "1024");
            
            const imgFormat = document.getElementById('inp-img-format')?.value || 'square';
            if (imgFormat === 'vertical') {
                width = 768;
                height = 1344;
            } else if (imgFormat === 'horizontal') {
                width = 1344;
                height = 768;
            } else if (imgFormat === 'square') {
                width = 1024;
                height = 1024;
            }

            const steps = parseInt(document.getElementById('comfy-steps')?.value || "6");
            const cfg = parseFloat(document.getElementById('comfy-cfg')?.value || "2.0");
            const sampler = document.getElementById('comfy-sampler')?.value || "dpmpp_sde";

            let blob = await window.Koreh.Image.generate(fullPrompt, {
                checkpoint: document.getElementById('comfy-model')?.value || "juggernautXL_ragnarokBy.safetensors",
                model: selectedModel,
                width: width,
                height: height,
                steps: steps,
                cfg: cfg,
                sampler: sampler
            });

            if (isChroma) {
                blob = await ChromaCore.process(blob);
            }

            let ext = 'png';
            if (blob.type === 'image/jpeg') ext = 'jpg';
            if (blob.type === 'image/webp') ext = 'webp';
            
            const imgFilename = targetFilename.replace('.json', `.${ext}`);

            if (targetData.imageFile) {
                try { await this.targetHandle.removeEntry(targetData.imageFile); } catch(e){}
            }

            const imgHandle = await this.targetHandle.getFileHandle(imgFilename, { create: true });
            const imgWritable = await imgHandle.createWritable();
            await imgWritable.write(blob);
            await imgWritable.close();

            targetData.imageFile = imgFilename;
            targetData.imagen64 = null;
            
            const writable = await targetHandle.createWritable();
            await writable.write(JSON.stringify(targetData, null, 2));
            await writable.close();

            const displayUrl = URL.createObjectURL(blob);

            // Sincronizar en memoria del elemento originario sin importar cuál esté abierto actualmente
            const memoryItem = this.items.find(i => i.name === targetFilename);
            if (memoryItem) {
                memoryItem.data.imageFile = imgFilename;
                memoryItem.data.imagen64 = null;
                memoryItem.displayImage = displayUrl;
            }

            // Si el usuario VOLVIÓ a tener este mismo elemento abierto en pantalla al terminar, le actualizamos la UI en caliente
            if (this.currentFileHandle && this.currentFileHandle.name === targetFilename) {
                this.currentData.imageFile = imgFilename;
                this.currentData.imagen64 = null;
                const bgStyle = isChroma ? 'style="background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px;"' : '';
                const container = document.getElementById('editor-img-container');
                if (container) {
                    container.innerHTML = `<img src="${displayUrl}" class="w-full h-full object-contain cursor-zoom-in" onclick="if(typeof ui !== 'undefined' && ui.zoomImage) ui.zoomImage(this.src)" ${bgStyle}>`;
                }
            }

            Utils.log(`Generación paralela guardada con éxito en: ${imgFilename}`, "success");

        } catch(err) {
            console.error(err);
            Utils.log(`Error en generación paralela para ${targetFilename}: ${err.message}`, "error");
        } finally {
            this.processingIds.delete(targetFilename);
            this.renderGrid();
        }
    })();
};

DataStudio.prototype.uploadImage = async function(event) {
    if (!this.currentFileHandle) return ui.alert("Abre un dato primero para subirle una imagen.");
    
    const file = event.target.files[0];
    if (!file) return;
    
    ui.setLoading(true, "Guardando imagen física...");
    try {
        const ext = file.name.split('.').pop() || 'png';
        const imgFilename = this.currentFileHandle.name.replace('.json', `.${ext}`);
        
        if (this.currentData.imageFile) {
            try { await this.targetHandle.removeEntry(this.currentData.imageFile); } catch(e){}
        }

        const imgHandle = await this.targetHandle.getFileHandle(imgFilename, { create: true });
        const imgWritable = await imgHandle.createWritable();
        await imgWritable.write(file);
        await imgWritable.close();

        this.currentData.imageFile = imgFilename;
        this.currentData.imagen64 = null;
        
        const displayUrl = URL.createObjectURL(file);
        const memoryItem = this.items.find(i => i.name === this.currentFileHandle.name);
        if (memoryItem) {
            memoryItem.data.imageFile = imgFilename;
            memoryItem.data.imagen64 = null;
            memoryItem.displayImage = displayUrl;
        }

        const container = document.getElementById('editor-img-container');
        if (container) {
            container.innerHTML = `<img src="${displayUrl}" class="w-full h-full object-contain">`;
        }

        const writable = await this.currentFileHandle.createWritable();
        await writable.write(JSON.stringify(this.currentData, null, 2));
        await writable.close();

        this.renderGrid();
        Utils.log(`Imagen subida y enrutada a ${imgFilename}.`, "success");
    } catch(e) {
        console.error(e);
        ui.alert("Error subiendo imagen: " + e.message);
    } finally {
        ui.setLoading(false);
        event.target.value = ''; 
    }
};