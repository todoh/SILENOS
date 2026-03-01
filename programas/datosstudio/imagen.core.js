// --- IMAGEN CORE (GENERACIÓN INDIVIDUAL - Refactorizado) ---

DataStudio.prototype.generateImageForItem = async function(filename, data, handle, globalStyle, chromaOverride = null) {
    try {
        const isChroma = (chromaOverride !== null) ? chromaOverride : ChromaUI.isEnabled();
        
        // 1. PREPARAR PROMPT
        let fullPrompt = `${data.name}, ${data.visualDesc}, ${globalStyle}, high quality, masterpiece`;
        if (isChroma) fullPrompt += ChromaUI.getPromptSuffix();
        else fullPrompt += ", white background"; 

        // 2. GENERACIÓN (Usando Librería)
        // La librería nos devuelve un BLOB directamente
        let blob = await window.Koreh.Image.generate(fullPrompt, {
            model: 'klein-large',
            width: 1024,
            height: 1024,
            nologo: true
        });

        // 3. PROCESAMIENTO CHROMA (Core Logic)
        if (isChroma) {
            blob = await ChromaCore.process(blob);
        }

        const base64 = await Utils.blobToBase64(blob);

        // 4. GUARDADO AUTOMÁTICO Y LIMPIEZA DE ANTERIOR
        // Borramos explícitamente la referencia anterior para asegurar que se sobrescribe limpio
        data.imagen64 = null; 
        
        // Asignamos la nueva imagen (Reescritura de ruta de datos)
        data.imagen64 = base64;

        // Sobrescribimos el archivo JSON completo inmediatamente
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();

        // 5. ACTUALIZAR MEMORIA VIVA Y REVISAR RUTA VISUAL
        const memoryItem = this.items.find(i => i.name === filename);
        if (memoryItem) {
            memoryItem.data.imagen64 = base64; 
        }
        
        this.processingIds.delete(filename);
        Utils.log(`Imagen guardada y reescrita: ${data.name}`, "success");
        
        // Actualizar editor si está abierto (Feedback visual inmediato)
        if (this.currentFileHandle && this.currentFileHandle.name === filename) {
            this.currentData.imagen64 = base64;
            const bgStyle = isChroma ? 'style="background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px;"' : '';
            
            const container = document.getElementById('editor-img-container');
            container.innerHTML = ''; // Limpiar contenedor
            container.innerHTML = `<img src="${base64}" class="w-full h-full object-contain" ${bgStyle}>`;
        }
        
        // Renderizar Grid para revisar que la ruta de la imagen es correcta en la galería
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
    ui.setLoading(true, isChroma ? "Generando sin fondo..." : "Generando imagen...");
    
    try {
        let fullPrompt = `${title}, ${prompt}, high quality, masterpiece`;
        if (isChroma) fullPrompt += ChromaUI.getPromptSuffix();
        else fullPrompt += ", white background";

        // Usar Librería
        let blob = await window.Koreh.Image.generate(fullPrompt, {
            model: 'klein-large',
            nologo: true
        });

        if (isChroma) {
            blob = await ChromaCore.process(blob);
        }

        const base64 = await Utils.blobToBase64(blob);
        
        // PASO 1: BORRAR ANTERIOR (Limpiar referencia antigua)
        this.currentData.imagen64 = null;
        
        // PASO 2: ASIGNAR NUEVA (Reescribir data)
        this.currentData.imagen64 = base64;
        
        // PASO 3: ACTUALIZACIÓN VISUAL (Revisión inmediata)
        const bgStyle = isChroma ? 'style="background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px;"' : '';
        const container = document.getElementById('editor-img-container');
        container.innerHTML = '';
        container.innerHTML = `<img src="${base64}" class="w-full h-full object-contain" ${bgStyle}>`;

        // PASO 4: GUARDADO AUTOMÁTICO DE ARCHIVO
        if(this.currentFileHandle) {
            ui.setLoading(true, "Guardando y reescribiendo...");
            
            const writable = await this.currentFileHandle.createWritable();
            await writable.write(JSON.stringify(this.currentData, null, 2));
            await writable.close();
            
            Utils.log("Imagen guardada en disco correctamente.", "success");
            
            // PASO 5: REVISAR RUTAS EN GRID
            this.renderGrid();
        }

    } catch(e) { 
        ui.alert("Error: " + e.message); 
    } finally { 
        ui.setLoading(false); 
    }
};