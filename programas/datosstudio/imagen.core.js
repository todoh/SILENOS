// --- IMAGEN CORE (GENERACIÓN Y SUBIDA DE IMAGEN INDIVIDUAL - Refactorizado para archivos separados) ---

DataStudio.prototype.generateImageForItem = async function(filename, data, handle, globalStyle, chromaOverride = null) {
    try {
        const isChroma = (chromaOverride !== null) ? chromaOverride : ChromaUI.isEnabled();
        
        let fullPrompt = `${data.name}, ${data.visualDesc}, ${globalStyle}, high quality, masterpiece`;
        if (isChroma) fullPrompt += ChromaUI.getPromptSuffix();
        else fullPrompt += ", white background"; 

        const selectedModel = document.getElementById('global-image-model') ? document.getElementById('global-image-model').value : 'klein';

        let blob = await window.Koreh.Image.generate(fullPrompt, {
            model: selectedModel,
            width: 1024,
            height: 1024,
            nologo: true
        });

        if (isChroma) {
            blob = await ChromaCore.process(blob);
        }

        // Determinar extensión y crear archivo separado
        let ext = 'png';
        if (blob.type === 'image/jpeg') ext = 'jpg';
        if (blob.type === 'image/webp') ext = 'webp';
        
        const imgFilename = filename.replace('.json', `.${ext}`);
        
        // Si ya tenía un archivo físico, intentar sobreescribirlo/limpiarlo (por seguridad del FileSystem)
        if (data.imageFile) {
            try { await this.targetHandle.removeEntry(data.imageFile); } catch(e){}
        }

        const imgHandle = await this.targetHandle.getFileHandle(imgFilename, { create: true });
        const imgWritable = await imgHandle.createWritable();
        await imgWritable.write(blob);
        await imgWritable.close();

        // Enrutar JSON
        data.imageFile = imgFilename;
        data.imagen64 = null; 

        // Sobrescribir JSON
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();

        // Actualizar visual en memoria
        const displayUrl = URL.createObjectURL(blob);
        const memoryItem = this.items.find(i => i.name === filename);
        if (memoryItem) {
            memoryItem.data.imageFile = imgFilename;
            memoryItem.data.imagen64 = null;
            memoryItem.displayImage = displayUrl; 
        }
        
        this.processingIds.delete(filename);
        Utils.log(`Imagen creada como archivo: ${imgFilename}`, "success");
        
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
        Utils.log(`Fallo imagen: ${data.name} - ${e.message}`, "error");
        this.renderGrid(); 
    }
};

DataStudio.prototype.generateImage = async function() {
    if(!window.Koreh.Core.getAuthKey()) return ui.alert("Falta API Key");
    
    const prompt = document.getElementById('inp-visual').value;
    const title = document.getElementById('inp-title').value;
    if(!prompt) return ui.alert("Falta prompt visual.");

    const isChroma = ChromaUI.isEnabled();
    const selectedModel = document.getElementById('global-image-model') ? document.getElementById('global-image-model').value : 'klein';
    
    ui.setLoading(true, isChroma ? `Generando sin fondo (${selectedModel})...` : `Generando imagen (${selectedModel})...`);
    
    try {
        let fullPrompt = `${title}, ${prompt}, high quality, masterpiece`;
        if (isChroma) fullPrompt += ChromaUI.getPromptSuffix();
        else fullPrompt += ", white background";

        let blob = await window.Koreh.Image.generate(fullPrompt, {
            model: selectedModel,
            nologo: true
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
            ui.setLoading(true, "Enrutando imagen en JSON...");
            const writable = await this.currentFileHandle.createWritable();
            await writable.write(JSON.stringify(this.currentData, null, 2));
            await writable.close();
            
            Utils.log(`Generación guardada físicamente en: ${imgFilename}`, "success");
            this.renderGrid();
        }

    } catch(e) { 
        ui.alert("Error: " + e.message); 
    } finally { 
        ui.setLoading(false); 
    }
};

// NUEVA FUNCIÓN: Subida manual de imagen y almacenamiento como archivo local
DataStudio.prototype.uploadImage = async function(event) {
    if (!this.currentFileHandle) return ui.alert("Abre un dato primero para subirle una imagen.");
    
    const file = event.target.files[0];
    if (!file) return;
    
    ui.setLoading(true, "Subiendo y guardando imagen física...");
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