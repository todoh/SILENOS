// --- cronologia/escaleta/generators.image.js ---
// MÓDULO DE GENERACIÓN DE IMÁGENES (EXTENSIÓN DE GENERATORS CON PIPELINE COMFYUI Z-IMAGE Y POLLINATIONS)
Object.assign(Generators, {
         
    async generateImageForTake(takeId) {
        const take = EscaletaCore.data.takes.find(t => t.id === takeId);
        if (!take) return;
                 
        const imageProvider = localStorage.getItem('escaleta_image_provider') || 'pollinations';
        const model = document.getElementById('image-model-select')?.value || 'flux';
        const aspectSelect = document.getElementById('video-aspect-select');
                 
        const isPortrait = aspectSelect && aspectSelect.value === 'portrait';
        const isSquare = aspectSelect && aspectSelect.value === 'square';
        const card = document.getElementById(`card-${takeId}`);
        const statusBadge = card ? card.querySelector('.video-status') : null;
                  
        if (statusBadge) { 
            statusBadge.className = 'status-badge loading'; 
            statusBadge.innerText = imageProvider === 'comfyui' ? 'COMFYUI...' : 'DIBUJANDO...'; 
        }
                 
        try {
            const prompt = take.visual_prompt; 
            let blob = null;

            if (imageProvider === 'comfyui') {
                // ==========================================================
                // ENRUTADOR COMFYUI LOCAL (FLUJO EXACTO GEMINI Y CONFYUI.html)
                // ==========================================================
                const comfyBaseUrl = "http://127.0.0.1:8188";
                const clientId = "saga_escaleta_" + Math.random().toString(36).substring(2, 9);
                                 
                let defaultWidth = 1024;
                let defaultHeight = 1024;
                                 
                if (isPortrait) {
                    defaultWidth = 720;
                    defaultHeight = 1280;
                } else if (isSquare) {
                    defaultWidth = 1024;
                    defaultHeight = 1024;
                } else {
                    defaultWidth = 1280;
                    defaultHeight = 720;
                }

                const widthCfg = parseInt(document.getElementById('cfg-comfy-width')?.value || defaultWidth.toString(), 10);
                const heightCfg = parseInt(document.getElementById('cfg-comfy-height')?.value || defaultHeight.toString(), 10);
                const stepsCfg = parseInt(document.getElementById('cfg-comfy-steps')?.value || "6", 10);

                // Workflow exacto de GEMINI Y CONFYUI.html
                const promptWorkflow = {
                    "9": {
                        "class_type": "SaveImage",
                        "inputs": { "filename_prefix": "escaleta_studio_art", "images": ["57:8", 0] }
                    },
                    "57:30": {
                        "class_type": "CLIPLoader",
                        "inputs": { "clip_name": "qwen_3_4b_fp8_mixed.safetensors", "type": "lumina2", "device": "default" }
                    },
                    "57:29": {
                        "class_type": "VAELoader",
                        "inputs": { "vae_name": "ae.safetensors" }
                    },
                    "57:33": {
                        "class_type": "ConditioningZeroOut",
                        "inputs": { "conditioning": ["57:27", 0] }
                    },
                    "57:8": {
                        "class_type": "VAEDecode",
                        "inputs": { "samples": ["57:3", 0], "vae": ["57:29", 0] }
                    },
                    "57:28": {
                        "class_type": "UNETLoader",
                        "inputs": { "unet_name": "z_image_turbo_int8_convrot.safetensors", "weight_dtype": "default" }
                    },
                    "57:27": {
                        "class_type": "CLIPTextEncode",
                        "inputs": { "text": prompt, "clip": ["57:30", 0] }
                    },
                    "57:13": {
                        "class_type": "EmptySD3LatentImage",
                        "inputs": { "width": widthCfg, "height": heightCfg, "batch_size": 1 }
                    },
                    "57:11": {
                        "class_type": "ModelSamplingAuraFlow",
                        "inputs": { "shift": 3, "model": ["57:28", 0] }
                    },
                    "57:3": {
                        "class_type": "KSampler",
                        "inputs": {
                            "seed": Math.floor(Math.random() * 1e15),
                            "steps": stepsCfg,
                            "cfg": 1.0,
                            "sampler_name": "res_multistep",
                            "scheduler": "simple",
                            "denoise": 1,
                            "model": ["57:11", 0],
                            "positive": ["57:27", 0],
                            "negative": ["57:33", 0],
                            "latent_image": ["57:13", 0]
                        }
                    }
                };

                blob = await new Promise((resolve, reject) => {
                    const wsUrl = comfyBaseUrl.replace(/^http/, 'ws') + `/ws?clientId=${clientId}`;
                    const ws = new WebSocket(wsUrl);
                    let targetPromptId = null;

                    ws.onopen = async () => {
                        try {
                            const response = await fetch(`${comfyBaseUrl}/prompt`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ prompt: promptWorkflow, client_id: clientId })
                            });
                            if (!response.ok) {
                                ws.close();
                                reject(new Error("ComfyUI rechazó la estructura del pipeline."));
                                return;
                            }
                            const responseData = await response.json();
                            targetPromptId = responseData.prompt_id;
                        } catch (err) {
                            ws.close();
                            reject(err);
                        }
                    };

                    const messageHandler = async (event) => {
                        if (typeof event.data === 'string') {
                            try {
                                const msg = JSON.parse(event.data);
                                if (msg.type === 'executed' && msg.data.node === "9" && msg.data.prompt_id === targetPromptId) {
                                    ws.removeEventListener('message', messageHandler);
                                    const imgData = msg.data.output.images[0];
                                    const imgUrl = `${comfyBaseUrl}/view?filename=${encodeURIComponent(imgData.filename)}&subfolder=${encodeURIComponent(imgData.subfolder)}&type=${encodeURIComponent(imgData.type)}`;
                                    
                                    const imgRes = await fetch(imgUrl);
                                    const fileBlob = await imgRes.blob();
                                    ws.close();
                                    resolve(fileBlob);
                                }
                            } catch (e) {
                                console.warn("[ComfyUI WebSocket Error]:", e);
                            }
                        }
                    };

                    ws.addEventListener('message', messageHandler);

                    ws.onerror = () => {
                        reject(new Error("No se pudo conectar con ComfyUI WebSocket en el puerto 8188."));
                    };
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
                         
            if (statusBadge) { 
                statusBadge.className = 'status-badge success'; 
                statusBadge.innerText = 'LISTO'; 
            }
            const imgPreview = card ? card.querySelector('.take-image-preview') : null;
            if (imgPreview) imgPreview.src = take.imageBlobUrl;
            else EscaletaUI.renderTakes(EscaletaCore.data.takes);
        } catch (e) {
            console.error(e);
            if (statusBadge) { 
                statusBadge.className = 'status-badge error'; 
                statusBadge.innerText = 'FALLO'; 
            }
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
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                 
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
                if (sub) sub.innerText = `Lote finalizado. Descanso de control (${coolDelay/1000}s)...`;
                await new Promise(r => setTimeout(r, coolDelay));
            }
        }
        EscaletaUI.toggleLoading(false);
        alert(`Ilustración Finalizada.\n\nÉxitos: ${successCount}\nFallos: ${failCount}`);
    }
});