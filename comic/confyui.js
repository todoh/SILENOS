const SagaComfy = {
    clientId: "saga_comic_" + Math.random().toString(36).substring(2, 9),
    ws: null,
    
    getBaseUrl() {
        return document.getElementById('comfy-url')?.value.replace(/\/$/, '') || 'http://127.0.0.1:8188';
    },
    
    initWebSocket() {
        return new Promise((resolve, reject) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) return resolve(this.ws);
            const baseUrl = this.getBaseUrl();
            const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws?clientId=${this.clientId}`;
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => resolve(this.ws);
            this.ws.onerror = (err) => reject(new Error("No se pudo conectar con ComfyUI WebSocket."));
            this.ws.onclose = () => { this.ws = null; };
        });
    },

    async uploadBase64(base64) {
        const baseUrl = this.getBaseUrl();
        const blob = await fetch(base64).then(r => r.blob());
        const formData = new FormData();
        const filename = "saga_ingrediente_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7) + ".png";
        formData.append('image', blob, filename);
        formData.append('overwrite', 'true');
        
        const res = await fetch(`${baseUrl}/upload/image`, {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) throw new Error("Error subiendo ingrediente a ComfyUI");
        const data = await res.json();
        return data.name;
    },

    async renderPrompt(promptText, width, height, steps, ingredientsBase64List = []) {
        const baseUrl = this.getBaseUrl();
        const ws = await this.initWebSocket();
        const seed = Math.floor(Math.random() * 1e15);

        // 1. Subir ingredientes activos
        const uploadedIngredients = [];
        for (const b64 of ingredientsBase64List) {
            if (b64) {
                const name = await this.uploadBase64(b64);
                uploadedIngredients.push(name);
            }
        }

        // 2. Construir Grafo Flux.2 Klein 4B Multi-Ingredientes
        const promptGraph = {};
        let nodeCounter = 1;
        const getNextId = () => (nodeCounter++).toString();

        const unetId = getNextId();
        promptGraph[unetId] = { class_type: "UNETLoader", inputs: { unet_name: "flux-2-klein-4b-fp8.safetensors", weight_dtype: "default" } };

        const clipId = getNextId();
        promptGraph[clipId] = { class_type: "CLIPLoader", inputs: { clip_name: "qwen_3_4b_fp8_mixed.safetensors", type: "flux2", device: "default" } };

        const vaeId = getNextId();
        promptGraph[vaeId] = { class_type: "VAELoader", inputs: { vae_name: "flux2-vae.safetensors" } };

        const posEncodeId = getNextId();
        promptGraph[posEncodeId] = { class_type: "CLIPTextEncode", inputs: { clip: [clipId, 0], text: promptText } };

        const negZeroId = getNextId();
        promptGraph[negZeroId] = { class_type: "ConditioningZeroOut", inputs: { conditioning: [posEncodeId, 0] } };

        let currentPosCond = [posEncodeId, 0];
        let currentNegCond = [negZeroId, 0];

        // 3. Inyectar ingredientes en ReferenceLatent
        if (uploadedIngredients.length > 0) {
            uploadedIngredients.forEach(imgName => {
                const loadImgId = getNextId();
                promptGraph[loadImgId] = { class_type: "LoadImage", inputs: { image: imgName, upload: "image" } };

                const scaleImgId = getNextId();
                promptGraph[scaleImgId] = { class_type: "ImageScaleToTotalPixels", inputs: { upscale_method: "nearest-exact", megapixels: 1, resolution_steps: 1, image: [loadImgId, 0] } };

                const vaeEncodeId = getNextId();
                promptGraph[vaeEncodeId] = { class_type: "VAEEncode", inputs: { pixels: [scaleImgId, 0], vae: [vaeId, 0] } };

                const refPosId = getNextId();
                promptGraph[refPosId] = { class_type: "ReferenceLatent", inputs: { conditioning: currentPosCond, latent: [vaeEncodeId, 0] } };

                const refNegId = getNextId();
                promptGraph[refNegId] = { class_type: "ReferenceLatent", inputs: { conditioning: currentNegCond, latent: [vaeEncodeId, 0] } };

                currentPosCond = [refPosId, 0];
                currentNegCond = [refNegId, 0];
            });
        }

        const emptyLatentId = getNextId();
        promptGraph[emptyLatentId] = { class_type: "EmptyFlux2LatentImage", inputs: { width: width, height: height, batch_size: 1 } };

        const samplerSelectId = getNextId();
        promptGraph[samplerSelectId] = { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } };

        const schedulerId = getNextId();
        promptGraph[schedulerId] = { class_type: "Flux2Scheduler", inputs: { steps: steps, width: width, height: height } };

        const noiseId = getNextId();
        promptGraph[noiseId] = { class_type: "RandomNoise", inputs: { noise_seed: seed } };

        const guiderId = getNextId();
        promptGraph[guiderId] = { class_type: "CFGGuider", inputs: { model: [unetId, 0], positive: currentPosCond, negative: currentNegCond, cfg: 1 } };

        const samplerId = getNextId();
        promptGraph[samplerId] = { class_type: "SamplerCustomAdvanced", inputs: { noise: [noiseId, 0], guider: [guiderId, 0], sampler: [samplerSelectId, 0], sigmas: [schedulerId, 0], latent_image: [emptyLatentId, 0] } };

        const vaeDecodeId = getNextId();
        promptGraph[vaeDecodeId] = { class_type: "VAEDecode", inputs: { samples: [samplerId, 0], vae: [vaeId, 0] } };

        const saveImageId = getNextId();
        promptGraph[saveImageId] = { class_type: "SaveImage", inputs: { filename_prefix: "saga_comic_flux", images: [vaeDecodeId, 0] } };

        return new Promise(async (resolve, reject) => {
            let targetPromptId = null;

            const messageHandler = async (event) => {
                if (typeof event.data === 'string') {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'executed' && msg.data.node === saveImageId && msg.data.prompt_id === targetPromptId) {
                        ws.removeEventListener('message', messageHandler);
                        const imgData = msg.data.output.images[0];
                        const imgUrl = `${baseUrl}/view?filename=${encodeURIComponent(imgData.filename)}&subfolder=${encodeURIComponent(imgData.subfolder)}&type=${encodeURIComponent(imgData.type)}`;
                        
                        try {
                            const res = await fetch(imgUrl);
                            if (!res.ok) throw new Error("No se pudo descargar la imagen servida por ComfyUI.");
                            
                            // Conversión limpia a DataURL Base64 para evitar errores de renderizado en Canvas / DOM
                            const arrayBuffer = await res.arrayBuffer();
                            let binary = '';
                            const bytes = new Uint8Array(arrayBuffer);
                            const len = bytes.byteLength;
                            for (let i = 0; i < len; i++) {
                                binary += String.fromCharCode(bytes[i]);
                            }
                            const base64String = btoa(binary);
                            const mimeType = imgData.filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
                            const finalDataUrl = `data:${mimeType};base64,${base64String}`;

                            resolve(finalDataUrl);
                        } catch (err) { 
                            reject(err); 
                        }
                    }
                }
            };

            ws.addEventListener('message', messageHandler);

            try {
                const res = await fetch(`${baseUrl}/prompt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptGraph, client_id: this.clientId })
                });

                if (!res.ok) {
                    ws.removeEventListener('message', messageHandler);
                    reject(new Error("ComfyUI rechazó la solicitud."));
                    return;
                }
                const data = await res.json();
                targetPromptId = data.prompt_id;
            } catch (err) {
                ws.removeEventListener('message', messageHandler);
                reject(err);
            }
        });
    }
};

window.SagaComfy = SagaComfy;