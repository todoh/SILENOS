// SAGA MINI - ENGINE PINTURA COMFYUI WEBSOCKET
window.Saga = window.Saga || {};
window.Saga.Comfy = {
    baseUrl: 'http://127.0.0.1:8188',
    clientId: "saga_mini_" + Math.random().toString(36).substring(2, 9),
    ws: null,

    // Sistema de cola en paralelo/secuencia
    queue: [],
    isProcessing: false,

    getSettings() {
        return {
            steps: parseInt(localStorage.getItem('saga_comfy_steps'), 10) || 6,
            width: parseInt(localStorage.getItem('saga_comfy_width'), 10) || 1024,
            height: parseInt(localStorage.getItem('saga_comfy_height'), 10) || 1024
        };
    },

    saveSettings(settings) {
        if (settings.steps) localStorage.setItem('saga_comfy_steps', settings.steps);
        if (settings.width) localStorage.setItem('saga_comfy_width', settings.width);
        if (settings.height) localStorage.setItem('saga_comfy_height', settings.height);
    },

    initWebSocket() {
        return new Promise((resolve, reject) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) return resolve(this.ws);
            
            const wsUrl = this.baseUrl.replace(/^http/, 'ws') + `/ws?clientId=${this.clientId}`;
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => resolve(this.ws);
            this.ws.onerror = (err) => reject(new Error("No se pudo conectar con ComfyUI WebSocket."));
            this.ws.onclose = () => { this.ws = null; };
        });
    },

    enqueueGeneration(filename, promptText, onComplete, onError) {
        this.queue.push({ filename, promptText, onComplete, onError });
        this.processQueue();
    },

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        const task = this.queue.shift();
        try {
            const blob = await this.executeSingleGeneration(task.promptText);
            if (task.onComplete) await task.onComplete(task.filename, blob);
        } catch (err) {
            console.error(`Error procesando generación para ${task.filename}:`, err);
            if (task.onError) task.onError(task.filename, err);
        } finally {
            this.isProcessing = false;
            this.processQueue();
        }
    },

    async executeSingleGeneration(promptText, widthOverride, heightOverride, stepsOverride) {
        const settings = this.getSettings();
        const width = widthOverride || settings.width;
        const height = heightOverride || settings.height;
        const steps = stepsOverride || settings.steps;
        const ws = await this.initWebSocket();
        
        const workflow = {
            "9": {
                "class_type": "SaveImage",
                "inputs": { "filename_prefix": "saga_mini", "images": ["57:8", 0] }
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
                "inputs": { "text": promptText, "clip": ["57:30", 0] }
            },
            "57:13": {
                "class_type": "EmptySD3LatentImage",
                "inputs": { "width": width, "height": height, "batch_size": 1 }
            },
            "57:11": {
                "class_type": "ModelSamplingAuraFlow",
                "inputs": { "shift": 3, "model": ["57:28", 0] }
            },
            "57:3": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": Math.floor(Math.random() * 1e15),
                    "steps": steps,
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

        return new Promise(async (resolve, reject) => {
            let targetPromptId = null;
            const messageHandler = async (event) => {
                if (typeof event.data === 'string') {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'executed' && msg.data.node === "9" && msg.data.prompt_id === targetPromptId) {
                        ws.removeEventListener('message', messageHandler);
                        const imgData = msg.data.output.images[0];
                        const imgUrl = `${this.baseUrl}/view?filename=${encodeURIComponent(imgData.filename)}&subfolder=${encodeURIComponent(imgData.subfolder)}&type=${encodeURIComponent(imgData.type)}`;
                        try {
                            const res = await fetch(imgUrl);
                            const blob = await res.blob();
                            resolve(blob);
                        } catch (err) {
                            reject(err);
                        }
                    }
                }
            };
            ws.addEventListener('message', messageHandler);
            try {
                const res = await fetch(`${this.baseUrl}/prompt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: workflow, client_id: this.clientId })
                });
                if (!res.ok) {
                    ws.removeEventListener('message', messageHandler);
                    reject(new Error("ComfyUI rechazó la estructura del pipeline."));
                    return;
                }
                const data = await res.json();
                targetPromptId = data.prompt_id;
            } catch (err) {
                ws.removeEventListener('message', messageHandler);
                reject(err);
            }
        });
    },

    async generateImage(promptText, widthOverride, heightOverride, stepsOverride) {
        return this.executeSingleGeneration(promptText, widthOverride, heightOverride, stepsOverride);
    }
};