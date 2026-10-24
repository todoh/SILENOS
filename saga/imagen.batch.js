// Archivo: datosstudio/imagen.batch.js 
// --- MOTOR DE G NESIS (LOTE + ILUSTRAR TODO + DATABASE ROUTER) --- 

DataStudio.prototype.generateBatch = async function() {     
    if(!this.targetHandle) return ui.alert("Selecciona carpeta.");     
    const mode = document.getElementById('gen-mode').value;     
    const premise = document.getElementById('gen-premise').value;     
    let visualStyle = document.getElementById('gen-visual').value;     
    const type = document.getElementById('gen-type').value;          
    let count = parseInt(document.getElementById('gen-count').value);     
    if (isNaN(count) || count < 1) count = 1;     
    if(!premise) return ui.alert("Escribe una premisa.");     
    const isChroma = ChromaUI.isEnabled();     
    const btn = document.getElementById('btn-gen-batch');     
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> GENERANDO...';          
    try {         
        if (mode === 'database') {             
            if (!window.DatabaseGenerator) throw new Error("Falta el m dulo DatabaseGenerator.");             
            await window.DatabaseGenerator.runBatch(premise, count, type, visualStyle, isChroma, this);             
            return;          
        }         
        Utils.log(`Iniciando Orquestador Lote: ${count} hilos en paralelo (${mode})...`, "info");         
        const coherenceContext = await Coherence.getContextString();                  
        let promptVisualStyle = visualStyle;         
        if (isChroma) promptVisualStyle += " (Object isolated on simple background for easy cutout)";         
        // --- CREACI N INMEDIATA DE NODOS FANTASMA EN CANVAS F SICO ---         
        const placeholders = [];         
        for (let i = 0; i < count; i++) {             
            const placeholderFilename = `placeholder_gen_${Date.now()}_${i}.json`;             
            const mockData = {                 
                name: `Creando concepto ${i + 1}...`,                 
                type: type,                 
                desc: "La IA est  procesando el texto de la premisa y estructurando sus propiedades enciclop dicas...",                 
                visualDesc: "",                 
                imagen64: null,                 
                imageFile: null             
            };             
            const fileHandle = await this.targetHandle.getFileHandle(placeholderFilename, { create: true });             
            const writable = await fileHandle.createWritable();             
            await writable.write(JSON.stringify(mockData, null, 2));             
            await writable.close();             
            const itemObj = { handle: fileHandle, data: mockData, name: placeholderFilename, displayImage: null };             
            this.items.push(itemObj);             
            this.processingIds.add(placeholderFilename);             
            placeholders.push(itemObj);         
        }         
        // Pintar instant neamente los esqueletos vac os en la pantalla         
        this.renderGrid();         
        ui.toggleGenerator(); // Cierra el panel lateral para ver la actualizaci n del canvas         
        const generateSingleItem = async (index, placeholderItem) => {             
            const seed = Math.random().toString(36).slice(2);                                       
            // CONSTRICCIONES E IDIOMA LOCAL             
            const constraints = `                 ESTILO VISUAL: "${promptVisualStyle}"                 FORMATO: JSON Object puro: {"name": "...", "type": "${type}", "desc": "...", "visualDesc": "..."}                 NOTA: Genera solo 1  tem. Seed: ${seed}. S  creativo, evita duplicados y s  conciso.                                                   REGLA ABSOLUTA DE IDIOMA: El campo 'visualDesc' DEBE estar escrito COMPLETAMENTE EN INGL S (English language). Traduce cualquier concepto f sico o descripci n si es necesario para que sea apto para un generador de im genes. El resto de campos ('name', 'desc') deben permanecer en espa             `;             
            let prompt = "";             
            if (mode === 'real') {                 
                prompt = `ROL: Historiador y Director de Arte. TAREA: Describir 1 elemento REAL de "${type}" sobre: "${premise}".                 CONTEXTO: ${coherenceContext}                 RESTRICCIONES: Dato ver dico y espec fico. ${constraints}`;             
            } else {                 
                prompt = `ROL: Arquitecto de Worldbuilding y Director de Arte. TAREA: Inventar 1 entidad  NICA de "${type}" sobre: "${premise}".                 CONTEXTO: ${coherenceContext}                 ${constraints}`;             
            }             
            try {                 
                let result = await window.Koreh.Text.generate(                     
                    'Output pure JSON Object only. Remember that the value of the "visualDesc" property MUST be strictly in English language.',                      
                    prompt,                      
                    { jsonMode: true }                 
                );                 
                if (typeof result === 'string') {                     
                    result = JSON.parse(Utils.cleanJSON(result));                 
                }                                  
                let finalRes = Array.isArray(result) ? result[0] : result;                 
                if (!finalRes) throw new Error("Salida inv lida de la IA");                 
                // Actualizar texto del placeholder en vivo en la UI                 
                placeholderItem.data.name = finalRes.name || placeholderItem.data.name;                 
                placeholderItem.data.desc = finalRes.desc || placeholderItem.data.desc;                 
                placeholderItem.data.visualDesc = finalRes.visualDesc || "";                 
                this.renderGrid();                 
                // Guardar datos e iniciar la generaci n de la imagen                 
                const rawName = finalRes.name || "sin_nombre_" + Date.now();                 
                const cleanName = rawName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();                 
                const filename = `${cleanName}_${Date.now()}.json`;                 
                try {                     
                    await this.targetHandle.removeEntry(placeholderItem.name);                 
                } catch(e) {}                 
                const fileHandle = await this.targetHandle.getFileHandle(filename, { create: true });                 
                const writable = await fileHandle.createWritable();                 
                const itemData = { ...finalRes, imagen64: null, imageFile: null };                 
                await writable.write(JSON.stringify(itemData, null, 2));                 
                await writable.close();                                  
                if (typeof Coherence !== 'undefined') Coherence.updateItem(itemData);                 
                this.processingIds.delete(placeholderItem.name);                 
                this.processingIds.add(filename);                 
                placeholderItem.handle = fileHandle;                 
                placeholderItem.name = filename;                 
                placeholderItem.data = itemData;                 
                this.renderGrid();                 
                await this.generateImageForItem(filename, itemData, fileHandle, visualStyle, isChroma);             
            } catch (err) {                 
                console.warn(`Error en hilo de texto ${index}:`, err);                 
                this.processingIds.delete(placeholderItem.name);                 
                this.items = this.items.filter(i => i.name !== placeholderItem.name);                 
                this.renderGrid();             
            }         
        };         
        const textPromises = placeholders.map((placeholder, idx) => generateSingleItem(idx, placeholder));         
        await Promise.all(textPromises);                  
        await this.loadFiles();         
        Utils.log("Lote completado.", "success");     
    } catch(e) {         
        console.error(e);         
        Utils.log("Error Lote: " + e.message, "error");         
        ui.alert("Error generando lote (Ver consola).");     
    } finally {         
        btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> GENERAR LOTE';     
    } 
};

DataStudio.prototype.illustrateAll = async function() {     
    if(!this.targetHandle) return ui.alert("Selecciona carpeta.");              
    const targets = this.items.filter(i => (!i.data.imagen64 || i.data.imagen64.length < 200) && !i.data.imageFile);     
    if(targets.length === 0) return ui.alert("Todo est  ilustrado.");              
    const isChroma = ChromaUI.isEnabled();     
    const modeText = isChroma ? "SIN FONDO (PNG)" : "CON FONDO (JPG)";     
    ui.confirm(` Ilustrar ${targets.length} elementos (${modeText})?`, async () => {         
        const btn = document.getElementById('btn-illustrate-all');         
        btn.disabled = true;          
        const originalBtnText = btn.innerHTML;         
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-[10px]"></i> Procesando...';         
        const BATCH_SIZE = 5;                            
        const chunkArray = (arr, size) =>             
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>                 
                arr.slice(i * size, i * size + size)             
            );         
        const chunks = chunkArray(targets, BATCH_SIZE);         
        Utils.log(`Cola de trabajo: ${targets.length} items en ${chunks.length} tandas.`, "info");         
        for (let i = 0; i < chunks.length; i++) {              
            const chunk = chunks[i];              
            Utils.log(`>>> Procesando Tanda ${i+1}/${chunks.length} (${chunk.length} imgs)...`, "info");                            
            chunk.forEach(item => app.processingIds.add(item.name));              
            app.renderGrid();               
            const promises = chunk.map(item => {                  
                return app.generateImageForItem(item.name, item.data, item.handle, "", isChroma);               
            });              
            await Promise.allSettled(promises);              
            await app.loadFiles();          
        }         
        Utils.log("Proceso masivo finalizado.", "success");         
        btn.disabled = false; btn.innerHTML = originalBtnText;     
    }); 
};

// --- NUEVA OPCIÓN: GENERAR PROMPTS VISUALES EN BLANCO EN TANDAS DE 15 ---
DataStudio.prototype.createBlankVisualPrompts = async function() {
    if (!window.mainCrono || !window.mainCrono.data || !window.mainCrono.data.events) {
        return ui.alert("El módulo de cronología no está activo o no contiene eventos.");
    }

    // Buscamos momentos con prompt visual en blanco o vacío
    const blankMoments = [];
    window.mainCrono.data.events.forEach(ev => {
        if (ev.moments) {
            ev.moments.forEach(m => {
                if (!m.visualPrompt || m.visualPrompt.trim() === "") {
                    blankMoments.push({ eventId: ev.id, moment: m });
                }
            });
        }
    });

    if (blankMoments.length === 0) {
        return ui.alert("No se encontraron momentos con Visual Prompts en blanco.");
    }

    ui.confirm(`¿Deseas crear ${blankMoments.length} Visual Prompts usando la IA en tandas de 15?`, async () => {
        const btn = document.getElementById('btn-create-blank-prompts');
        const originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-[10px]"></i> Escribiendo...';

        const BATCH_SIZE = 15;
        const chunkArray = (arr, size) =>
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        const chunks = chunkArray(blankMoments, BATCH_SIZE);
        Utils.log(`[Crono Prompts] Iniciando reescritura masiva de ${blankMoments.length} prompts en ${chunks.length} tandas.`, "info");

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            Utils.log(`>>> Procesando Tanda de Prompts ${i + 1}/${chunks.length} (${chunk.length} ítems)...`, "info");

            // Mapeamos cada ítem al método exacto de reescritura de CronoAIPrompt
            const promises = chunk.map(item => {
                return window.CronoAIPrompt.rewrite(item.eventId, item.moment.id);
            });

            // Procesamos la tanda de 15 en paralelo exacto
            await Promise.allSettled(promises);
        }

        Utils.log("[Crono Prompts] Finalizada la creación de todos los prompts vacíos.", "success");
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
        ui.alert(`Se han procesado con éxito ${blankMoments.length} prompts vacíos.`);
    });
};