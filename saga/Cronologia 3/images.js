// --- cronologia/images.js --- 
// REFACTORIZADO: Usa ComfyUI Local o Pollinations Cloud a través de window.Koreh.Image de Datos Studio 
// OPTIMIZACIÓN ABSOLUTA: Almacenamiento binario en disco de imágenes cronológicas para evitar saturación de JSON y colisiones de estado cacheado.
const ImgGen = {
    async generateSingle(eventId, momentId) {
        const ev = window.mainCrono.data.events.find(e => e.id === eventId);
        if (!ev) return;
        let m = momentId ? ev.moments.find(x => x.id === momentId) : ev.moments[0];
        if (!m || !m.visualPrompt) return alert("Falta el prompt visual de la subparte.");
        const safeId = String(m.id).replace('.', '-');
        const paintBtn = document.getElementById(`btn-gen-${safeId}`);
        
        if(paintBtn) {
            paintBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> GENERANDO';
            paintBtn.disabled = true;
        }
        try {
            const width = m.aspectRatio === 'portrait' ? 720 : 1280;
            const height = m.aspectRatio === 'portrait' ? 1280 : 720;
            
            let fullPrompt = m.visualPrompt;
            if (window.ChromaUI && window.ChromaUI.isEnabled()) {
                fullPrompt += window.ChromaUI.getPromptSuffix();
            }
            
            const selectedModel = localStorage.getItem('koreh_selected_image_model') || 'flux';

            // Forzar generación como BLOB directo para guardar de forma limpia en disco
            const blobImage = await window.Koreh.Image.generate(fullPrompt, {
                returnType: 'blob', 
                model: selectedModel,
                width: width,
                height: height
            });

            let ext = 'png';
            if (blobImage.type === 'image/jpeg') ext = 'jpg';
            if (blobImage.type === 'image/webp') ext = 'webp';

            const targetFilename = `crono_img_${ev.id}_${m.id}.${ext}`;
            
            // Adquisición fresca del rootHandle para evitar InvalidStateError por referencias cacheadas
            const activeRoot = window.mainCrono.rootHandle || window.ui.selectedFolderHandle || (window.app && window.app.targetHandle);
            if (!activeRoot) throw new Error("No hay acceso al repositorio raíz.");

            if (m.imageFile) {
                try { await activeRoot.removeEntry(m.imageFile); } catch(e){}
            }

            const imgHandle = await activeRoot.getFileHandle(targetFilename, { create: true });
            const imgWritable = await imgHandle.createWritable();
            await imgWritable.write(blobImage);
            await imgWritable.close();

            m.imageFile = targetFilename;
            m.image64 = null; 
            
            if (m.displayUrl) URL.revokeObjectURL(m.displayUrl);
            m.displayUrl = URL.createObjectURL(blobImage);
            
            await window.mainCrono.saveData();
            window.timeline.renderEvents();
            
            if (window.uiCrono && typeof window.uiCrono.showInspector === 'function') {
                window.uiCrono.showInspector(ev);
            } else if (window.mainCrono && typeof window.mainCrono.showInspector === 'function') {
                window.mainCrono.showInspector(ev);
            }
        } catch(e) {
            console.error(e);
            alert("Error en la generación de imagen: " + e.message);
        } finally {
            if(paintBtn) {
                paintBtn.innerHTML = '<i class="fa-solid fa-paintbrush"></i> PINTAR';
                paintBtn.disabled = false;
            }
        }
    },

    async generateBatch() {
        const momentsToGen = [];
        window.mainCrono.data.events.forEach(ev => {
            if (ev.moments) {
                ev.moments.forEach(m => {
                    if (m.visualPrompt && !m.imageFile && !m.image64) {
                        momentsToGen.push({ ev, m });
                    }
                });
            }
        });
        if(momentsToGen.length === 0) return alert("Todo está ilustrado.");
        const mode = await this.askBatchMode(momentsToGen.length);
        if (!mode) return;

        const selectedEngine = localStorage.getItem('koreh_image_engine') || 'comfyui';
        const engineLabel = selectedEngine.toUpperCase();

        const activeRoot = window.mainCrono.rootHandle || window.ui.selectedFolderHandle || (window.app && window.app.targetHandle);
        if (!activeRoot) return alert("Error crítico: No se puede acceder a la carpeta raíz.");

        window.ui.toggleLoading(true, `RÉGIMEN MASIVO ${engineLabel}`, `Procesando lote de ${momentsToGen.length} imágenes...`);
        
        try {
            // Mitigación de InvalidStateError masivo: Dividir las 45+ imágenes en tandas pequeñas de procesamiento asíncrono ordenado
            const BATCH_SIZE = 3;
            for (let i = 0; i < momentsToGen.length; i += BATCH_SIZE) {
                const chunk = momentsToGen.slice(i, i + BATCH_SIZE);
                
                const chunkPromises = chunk.map(async (item) => {
                    if (mode === 'force-landscape') item.m.aspectRatio = 'landscape';
                    if (mode === 'force-portrait') item.m.aspectRatio = 'portrait';
                    const w = item.m.aspectRatio === 'portrait' ? 720 : 1280;
                    const h = item.m.aspectRatio === 'portrait' ? 1280 : 720;
                    
                    let fullPrompt = item.m.visualPrompt;
                    if (window.ChromaUI && window.ChromaUI.isEnabled()) {
                        fullPrompt += window.ChromaUI.getPromptSuffix();
                    }
                    
                    const selectedModel = localStorage.getItem('koreh_selected_image_model') || 'flux';

                    const blobImage = await window.Koreh.Image.generate(fullPrompt, {
                        returnType: 'blob',
                        model: selectedModel,
                        width: w,
                        height: h
                    });

                    let ext = 'png';
                    if (blobImage.type === 'image/jpeg') ext = 'jpg';
                    if (blobImage.type === 'image/webp') ext = 'webp';

                    const targetFilename = `crono_img_${item.ev.id}_${item.m.id}.${ext}`;
                    
                    if (item.m.imageFile) {
                        try { await activeRoot.removeEntry(item.m.imageFile); } catch(err){}
                    }

                    const imgHandle = await activeRoot.getFileHandle(targetFilename, { create: true });
                    const imgWritable = await imgHandle.createWritable();
                    await imgWritable.write(blobImage);
                    await imgWritable.close();

                    item.m.imageFile = targetFilename;
                    item.m.image64 = null;
                    if (item.m.displayUrl) URL.revokeObjectURL(item.m.displayUrl);
                    item.m.displayUrl = URL.createObjectURL(blobImage);
                });

                await Promise.all(chunkPromises);
                
                // Guardado intermedio refrescando descriptores de disco para no corromper la caché de la API del navegador
                await window.mainCrono.saveData();
                window.timeline.renderEvents();
                
                window.ui.toggleLoading(true, `RÉGIMEN MASIVO ${engineLabel}`, `Procesadas ${Math.min(i + BATCH_SIZE, momentsToGen.length)} de ${momentsToGen.length} imágenes...`);
            }

            const activeId = window.ui.selectedEventId || window.uiCrono.selectedEventId;
            if (activeId) {
                const activeEv = window.mainCrono.data.events.find(e => e.id === activeId);
                if (activeEv && window.uiCrono) window.uiCrono.showInspector(activeEv);
            }
            alert(`¡Lote completado exitosamente por el motor ${engineLabel}!`);
        } catch(e) {
            console.error(e);
            alert("Fallo masivo en procesamiento paralelo: " + e.message);
        } finally {
            window.ui.toggleLoading(false);
        }
    },

    askBatchMode(count) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = "fixed inset-0 bg-black/50 z-[200] flex items-center justify-center backdrop-blur-sm";
            overlay.innerHTML = `
                <div class="bg-white p-6 w-[350px] flex flex-col gap-4">
                    <div class="text-center">
                        <h3 class="font-bold text-sm uppercase tracking-wider">Ilustrar Lote (${count})</h3>
                        <p class="text-[11px] text-gray-400 mt-1">Elige el formato forzado para el generador:</p>
                    </div>
                    <button id="mode-mixed" class="btn-nordic w-full justify-between">Respetar Individual <i class="fa-solid fa-shuffle"></i></button>
                    <button id="mode-landscape" class="btn-nordic w-full justify-between">Todo Horizontal (16:9) <i class="fa-solid fa-image"></i></button>
                    <button id="mode-portrait" class="btn-nordic w-full justify-between">Todo Vertical (9:16) <i class="fa-solid fa-mobile-screen"></i></button>
                    <button id="mode-cancel" class="text-xs text-red-500 underline mt-2">Cancelar</button>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#mode-mixed').onclick = () => { overlay.remove(); resolve('mixed'); };
            overlay.querySelector('#mode-landscape').onclick = () => { overlay.remove(); resolve('force-landscape'); };
            overlay.querySelector('#mode-portrait').onclick = () => { overlay.remove(); resolve('force-portrait'); };
            overlay.querySelector('#mode-cancel').onclick = () => { overlay.remove(); resolve(null); };
        });
    }
};

window.ImgGen = ImgGen;