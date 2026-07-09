// --- cronologia/escaleta/generators.image.js ---
// MÓDULO DE GENERACIÓN DE IMÁGENES (EXTENSIÓN DE GENERATORS CON ROUTER COMFYUI LOCAL / POLLINATIONS CLOUD)

Object.assign(Generators, {
    
    async generateImageForTake(takeId) {
        const take = EscaletaCore.data.takes.find(t => t.id === takeId);
        if (!take) return;
        
        const imageProvider = localStorage.getItem('escaleta_image_provider') || 'pollinations';
        const model = document.getElementById('image-model-select').value;
        const aspectSelect = document.getElementById('video-aspect-select');
        
        const isPortrait = aspectSelect && aspectSelect.value === 'portrait';
        const isSquare = aspectSelect && aspectSelect.value === 'square';

        const card = document.getElementById(`card-${takeId}`);
        const statusBadge = card.querySelector('.video-status'); 
        
        if(statusBadge) { 
            statusBadge.className = 'status-badge loading'; 
            statusBadge.innerText = imageProvider === 'comfyui' ? 'COMFYUI...' : 'DIBUJANDO...'; 
        }
        
        try {
            const prompt = take.visual_prompt; 
            let blob = null;

            if (imageProvider === 'comfyui') {
                // ==========================================================
                // ENRUTADOR COMFYUI LOCAL (Mapeado directo de DatosStudio)
                // ==========================================================
                const comfyBaseUrl = "http://127.0.0.1:8188";
                const clientId = crypto.randomUUID();

                const checkpoint = document.getElementById('cfg-comfy-model')?.value || "juggernautXL_ragnarokBy.safetensors";
                const promptNeg = document.getElementById('cfg-comfy-neg')?.value || "bad anatomy, blurry, watermark, worst quality";
                
                let width = 1280;
                let height = 720;
                
                if (isPortrait) {
                    width = 720;
                    height = 1280;
                } else if (isSquare) {
                    width = 1024;
                    height = 1024;
                }

                const widthCfg = parseInt(document.getElementById('cfg-comfy-width')?.value || width.toString());
                const heightCfg = parseInt(document.getElementById('cfg-comfy-height')?.value || height.toString());
                const steps = parseInt(document.getElementById('cfg-comfy-steps')?.value || "6");
                const cfg = parseFloat(document.getElementById('cfg-comfy-cfg')?.value || "2.0");
                const sampler = document.getElementById('cfg-comfy-sampler')?.value || "dpmpp_sde";

                const promptWorkflow = {
                    "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": checkpoint } },
                    "5": { "class_type": "EmptyLatentImage", "inputs": { "batch_size": 1, "width": widthCfg, "height": heightCfg } },
                    "6": { "class_type": "CLIPTextEncode", "inputs": { "text": prompt, "clip": ["4", 1] } },
                    "7": { "class_type": "CLIPTextEncode", "inputs": { "text": promptNeg, "clip": ["4", 1] } },
                    "3": {
                        "class_type": "KSampler",
                        "inputs": {
                            "seed": Math.floor(Math.random() * 1000000000), "steps": steps, "cfg": cfg,
                            "sampler_name": sampler, "scheduler": "normal", "denoise": 1,
                            "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]
                        }
                    },
                    "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] } },
                    "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "escaleta_studio_art", "images": ["8", 0] } }
                };

                blob = await new Promise((resolve, reject) => {
                    const wsUrl = comfyBaseUrl.replace('http://', 'ws://') + `/ws?clientId=${clientId}`;
                    const ws = new WebSocket(wsUrl);

                    ws.onopen = async () => {
                        try {
                            const response = await fetch(`${comfyBaseUrl}/prompt`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ prompt: promptWorkflow, client_id: clientId })
                            });
                            if (!response.ok) throw new Error("Estructura del pipeline rechazada por ComfyUI.");
                            const responseData = await response.json();
                            const promptId = responseData.prompt_id;

                            ws.onmessage = async (event) => {
                                const message = JSON.parse(event.data);
                                if (message.type === 'executed' && message.data.prompt_id === promptId) {
                                    const output = message.data.output;
                                    if (output.images && output.images.length > 0) {
                                        const imgObj = output.images[0];
                                        const imgUrl = `${comfyBaseUrl}/view?filename=${imgObj.filename}&subfolder=${imgObj.subfolder}&type=${imgObj.type}`;
                                        const imgRes = await fetch(imgUrl);
                                        const fileBlob = await imgRes.blob();
                                        ws.close();
                                        resolve(fileBlob);
                                    } else {
                                        ws.close();
                                        reject(new Error("ComfyUI no generó ninguna imagen."));
                                    }
                                }
                            };
                        } catch(err) {
                            ws.close();
                            reject(err);
                        }
                    };
                    ws.onerror = () => reject(new Error("No se pudo conectar con ComfyUI en el puerto 8188."));
                });

            } else {
                // ==========================================================
                // ENRUTADOR CLOUD (POLLINATIONS)
                // ==========================================================
                let width = 1280;
                let height = 720;
                if (isPortrait) {
                    width = 720;
                    height = 1280;
                } else if (isSquare) {
                    width = 1024;
                    height = 1024;
                }

                if (!ai.apiKey) throw new Error("Requiere Login en Pollinations.");
                const seed = Math.floor(Math.random() * 1000000);
                const safePrompt = encodeURIComponent(prompt);
                
                let url = `https://gen.pollinations.ai/image/${safePrompt}?model=${model}&width=${width}&height=${height}&seed=${seed}&nologo=true`;
                if (ai.apiKey) url += `&key=${ai.apiKey}`;

                const response = await fetch(url);
                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                blob = await response.blob();
            }

            // --- GUARDADO DE ASSETS ---
            const filename = `IMG_${takeId}.jpg`;
            await EscaletaCore.saveMediaFile(blob, filename);

            take.image_file = filename;
            take.imageBlobUrl = URL.createObjectURL(blob);
            take.aspectRatio = isSquare ? 'square' : (isPortrait ? 'portrait' : 'landscape');
            
            take.video_file = null;
            take.videoBlobUrl = null;
            
            EscaletaCore.triggerAutoSave();
            
            if(statusBadge) { statusBadge.className = 'status-badge success'; statusBadge.innerText = 'LISTO'; }
            const imgPreview = card.querySelector('.take-image-preview');
            if (imgPreview) imgPreview.src = take.imageBlobUrl;
            else EscaletaUI.renderTakes(EscaletaCore.data.takes);

        } catch (e) {
            console.error(e);
            if(statusBadge) { statusBadge.className = 'status-badge error'; statusBadge.innerText = 'FALLO'; }
            throw e;
        }
    },

    async generateAllImages() {
        const takes = EscaletaCore.data.takes.filter(t => !t.video_file && !t.image_file);
        if (takes.length === 0) return alert("Todas las tomas ya tienen imagen o video.");
        
        const imageProvider = localStorage.getItem('escaleta_image_provider') || 'pollinations';
        const isComfy = imageProvider === 'comfyui';
        
        // Ajustamos el tamaño del lote si es ComfyUI Local para evitar asfixiar el hardware
        const BATCH_SIZE = isComfy ? 1 : 7;
        const infoModeText = isComfy ? "COMFYUI LOCAL secuencial de 1 en 1" : "POLLINATIONS CLOUD en lotes de 7";

        if (!confirm(`Se generarán ${takes.length} imágenes usando ${infoModeText}. ¿Continuar?`)) return;

        EscaletaUI.toggleLoading(true, "PRODUCCIÓN DE IMÁGENES", "Iniciando secuencia de ilustración...");
        
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < takes.length; i += BATCH_SIZE) {
            const chunk = takes.slice(i, i + BATCH_SIZE);
            
            EscaletaUI.toggleLoading(true, `LOTE DE IMÁGENES`, `Procesando de ${i+1} a ${Math.min(i + BATCH_SIZE, takes.length)} de ${takes.length}...`);
            EscaletaUI.updateProgressBar((i / takes.length) * 100);

            const promises = chunk.map(async (take) => {
                const card = document.getElementById(`card-${take.id}`);
                if(card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                try {
                    await this.generateImageForTake(take.id);
                    successCount++;
                } catch (err) {
                    console.warn(`[BATCH] Error en toma ${take.id}.`, err);
                    failCount++;
                }
            });

            await Promise.all(promises);
            
            // Si es cloud aplicamos Cooldown, si es local dejamos que la cola respire un segundo
            const coolDelay = isComfy ? 1000 : 2000;
            if (i + BATCH_SIZE < takes.length) {
                const sub = document.getElementById('loading-subtitle');
                if(sub) sub.innerText = `Lote finalizado. Descanso de control (${coolDelay/1000}s)...`;
                await new Promise(r => setTimeout(r, coolDelay));
            }
        }

        EscaletaUI.toggleLoading(false);
        alert(`Ilustración Finalizada.\n\n✅ Éxitos: ${successCount}\n❌ Fallos: ${failCount}`);
    }
});