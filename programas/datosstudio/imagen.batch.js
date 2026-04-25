// Archivo: datosstudio/imagen.batch.js
// --- MOTOR DE GÉNESIS (LOTE + ILUSTRAR TODO + DATABASE ROUTER) ---
// REFACTORIZADO CON KOREH LIBRARY + PARALLEL ORCHESTRATOR + BLINDAJE ARRAY

DataStudio.prototype.generateBatch = async function() {
    if(!this.targetHandle) return ui.alert("Selecciona carpeta.");
    if(!window.Koreh.Core.getAuthKey()) return ui.alert("API Key no conectada.");

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
            if (!window.DatabaseGenerator) throw new Error("Falta el módulo DatabaseGenerator.");
            await window.DatabaseGenerator.runBatch(premise, count, type, visualStyle, isChroma, this);
            return; 
        }

        Utils.log(`Iniciando Orquestador Lote: ${count} hilos en paralelo (${mode})...`, "info");

        const coherenceContext = await Coherence.getContextString();
        
        let promptVisualStyle = visualStyle;
        if (isChroma) promptVisualStyle += " (Object isolated on simple background for easy cutout)";

        const generateSingleItem = async (index) => {
            let selectedModel = 'openai'; 
            let prompt = "";
            const seed = Math.random().toString(36).slice(2); 
            
            const constraints = `
                ESTILO VISUAL: "${promptVisualStyle}"
                FORMATO: JSON Object puro: {"name": "...", "type": "${type}", "desc": "...", "visualDesc": "..."}
                NOTA: Genera solo 1 ítem. Seed: ${seed}. Sé creativo, evita duplicados y sé conciso.
            `;

            if (mode === 'real') {
                prompt = `ROL: Historiador. TAREA: Describir 1 elemento REAL de "${type}" sobre: "${premise}".
                CONTEXTO: ${coherenceContext}
                RESTRICCIONES: Dato verídico y específico. ${constraints}`;
            } else if (mode === 'search') {
                selectedModel = 'perplexity-reasoning';
                prompt = `ROL: Buscador Web. TAREA: Buscar 1 dato ACTUAL/CURIOSO de "${type}" sobre: "${premise}".
                ${constraints}`;
            } else {
                prompt = `ROL: Worldbuilder. TAREA: Inventar 1 entidad ÚNICA de "${type}" sobre: "${premise}".
                CONTEXTO: ${coherenceContext}
                ${constraints}`;
            }

            const isPerplexity = selectedModel.includes('perplexity');

            try {
                let result = await window.Koreh.Text.generate(
                    'Output JSON Object only.', 
                    prompt, 
                    { model: selectedModel, jsonMode: !isPerplexity }
                );

                if (typeof result === 'string') {
                    result = JSON.parse(Utils.cleanJSON(result));
                }
                
                if (Array.isArray(result)) return result[0];
                return result;

            } catch (err) {
                console.warn(`Error en hilo de texto ${index}:`, err);
                return null; 
            }
        };

        const textPromises = Array.from({ length: count }, (_, i) => generateSingleItem(i));
        const results = await Promise.all(textPromises);
        
        const items = results.filter(r => r !== null);

        if (items.length === 0) throw new Error("La IA no generó ningún dato válido.");

        Utils.log(`Recibidos ${items.length} conceptos válidos. Procesando imágenes...`, "success");

        const imagePromises = items.map(async (item) => {
            const rawName = item.name || "sin_nombre_" + Date.now();
            const cleanName = rawName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${cleanName}_${Date.now()}.json`;

            const fileHandle = await this.targetHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            const itemData = { ...item, imagen64: null, imageFile: null };
            await writable.write(JSON.stringify(itemData, null, 2));
            await writable.close();
            
            Coherence.updateItem(itemData); 

            this.processingIds.add(filename);
            return this.generateImageForItem(filename, itemData, fileHandle, visualStyle, isChroma);
        });

        await Promise.all(imagePromises);

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

// --- ILUSTRAR TODO (CON BATCHING REAL) ---
DataStudio.prototype.illustrateAll = async function() {
    if(!this.targetHandle) return ui.alert("Abre una carpeta primero.");
    if(!window.Koreh.Core.getAuthKey()) return ui.alert("API Key Offline.");
    
    // FILTRO ACTUALIZADO: Comprobar que no tengan ni Base64 ni archivo de imagen físico
    const targets = this.items.filter(i => (!i.data.imagen64 || i.data.imagen64.length < 200) && !i.data.imageFile);
    if(targets.length === 0) return ui.alert("Todo está ilustrado.");
    
    const isChroma = ChromaUI.isEnabled();
    const modeText = isChroma ? "SIN FONDO (PNG)" : "CON FONDO (JPG)";

    ui.confirm(`¿Ilustrar ${targets.length} elementos (${modeText})?`, async () => {
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