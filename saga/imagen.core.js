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
            container.innerHTML = `<img src="${displayUrl}" class="w-full h-full object-contain" ${bgStyle}>`;
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
    const prompt = document.getElementById('inp-visual').value;
    const title = document.getElementById('inp-title').value;
    if(!prompt) return ui.alert("Falta prompt visual.");

    const isChroma = ChromaUI.isEnabled();
    const selectedModel = localStorage.getItem('koreh_selected_image_model') || 'flux';
    
    ui.setLoading(true, `Encolando prompt en Motor de Imagen Estandarizado (${selectedModel})...`);
    
    try {
        let fullPrompt = `${title}, ${prompt}, high quality, masterpiece`;
        if (isChroma) fullPrompt += ChromaUI.getPromptSuffix();

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
        
        const imgFilename = this.currentFileHandle.name.replace('.json', `.${ext}`);

        if (this.currentData.imageFile) {
            try { await this.targetHandle.removeEntry(this.currentData.imageFile); } catch(e){}
        }

        const imgHandle = await this.targetHandle.getFileHandle(imgFilename, { create: true });
        const imgWritable = await imgHandle.createWritable();
        await imgWritable.write(blob);
        await imgWritable.close();

        this.currentData.imageFile = imgFilename;
        this.currentData.imagen64 = null;
        
        const displayUrl = URL.createObjectURL(blob);
        const bgStyle = isChroma ? 'style="background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px;"' : '';
        const container = document.getElementById('editor-img-container');
        container.innerHTML = `<img src="${displayUrl}" class="w-full h-full object-contain" ${bgStyle}>`;

        const memoryItem = this.items.find(i => i.name === this.currentFileHandle.name);
        if (memoryItem) {
            memoryItem.data.imageFile = imgFilename;
            memoryItem.data.imagen64 = null;
            memoryItem.displayImage = displayUrl;
        }

        if(this.currentFileHandle) {
            ui.setLoading(true, "Enrutando imagen local...");
            const writable = await this.currentFileHandle.createWritable();
            await writable.write(JSON.stringify(this.currentData, null, 2));
            await writable.close();
            
            Utils.log(`Generación del motor guardada en: ${imgFilename}`, "success");
            this.renderGrid();
        }

    } catch(e) { 
        ui.alert("Fallo del Motor de Imagen: " + e.message); 
    } finally { 
        ui.setLoading(false); 
    }
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
        container.innerHTML = `<img src="${displayUrl}" class="w-full h-full object-contain">`;

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