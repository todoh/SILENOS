/**  
 * AI IMAGE - Módulo de Generación de Imágenes (ComfyUI WebSocket Engine, Pollinations Cloud Router & Fooocus Engine)  
 * Dependencia: ai.core.js  
 * Espacio de nombres: window.Koreh.Image  
 * Versión: 5.0 - Integración de Motor Local Fooocus  
 */
window.Koreh = window.Koreh || {};
window.Koreh.Image = {
    async generate(prompt, config = {}) {
        if (!window.Koreh.Core) throw new Error("Koreh.Core no cargado.");
                 
        const imageEngine = localStorage.getItem('koreh_image_engine') || 'comfyui';
        
        // --- ENRUTAMIENTO: PROVEEDOR FOOOCUS LOCAL ---
        if (imageEngine === 'fooocus') {
            const stepsCount = config.steps || 4;
            const loraModel = localStorage.getItem('koreh_fooocus_lora') || 'sdxl_lightning_4step.safetensors';
            
            const payload = {
                data: [
                    prompt,                              // Positive prompt
                    "",                                  // Negative prompt
                    "None",                              // Styles
                    "Speed",                             // Performance
                    "1024×1024",                         // Resolution
                    1,                                   // Image number
                    1.5,                                 // CFG Scale
                    stepsCount,                          // Steps
                    -1,                                  // Seed (-1 = Random)
                    0.0,                                 // Image Sharpness
                    loraModel,                           // LoRA 1 Name
                    1.0,                                 // LoRA 1 Weight
                    "None",                              // LoRA 2 Name
                    0.0,                                 // LoRA 2 Weight
                    false,                               // Input image checkbox
                    "",                                  // Input image path
                    "None",                              // Refiner
                    "juggernautXL_v8Rundiffusion.safetensors" // Modelo forzado cargado en Fooocus
                ],
                fn_index: 21
            };

            const response = await fetch('http://127.0.0.1:7865/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.data && result.data[2] && result.data[2].value) {
                const imageUrl = result.data[2].value;
                const fullImgUrl = imageUrl.startsWith('http') ? imageUrl : `http://127.0.0.1:7865/file=${imageUrl}`;
                const imgRes = await fetch(fullImgUrl);
                const blob = await imgRes.blob();
                
                if (config.returnType === 'base64') {
                    return await this.blobToBase64(blob);
                }
                return blob;
            } else {
                throw new Error("Error en la estructura de respuesta de Fooocus");
            }
        }

        // --- ENRUTAMIENTO PRIMARIO: PROVEEDOR POLLINATIONS ---
        if (imageEngine === 'pollinations') {
            let assignedModel = config.model || localStorage.getItem('koreh_selected_image_model') || 'flux';
            const width = config.width || 1024;
            const height = config.height || 1024;
            const seed = config.seed || Math.floor(Math.random() * 1000000000);
                         
            const authKey = window.Koreh.Core.getAuthKey();
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const cleanPrompt = encodeURIComponent(prompt.trim());
                                         
                    let targetUrl = `https://gen.pollinations.ai/image/${cleanPrompt}?model=${assignedModel}&width=${width}&height=${height}&seed=${seed}&nologo=true`;
                    if (authKey) targetUrl += `&key=${authKey}`;
                                         
                    const res = await fetch(targetUrl);
                                         
                    if (!res.ok) {
                        throw new Error(`Fallo Status: ${res.status}`);
                    }
                    const blob = await res.blob();
                    if (config.returnType === 'base64') {
                        return await this.blobToBase64(blob);
                    }
                    return blob;
                } catch (error) {
                    console.warn(`Intento ${attempt} fallido con el modelo de imagen [${assignedModel}]: ${error.message}`);
                                         
                    if (attempt === 1) {
                        console.log("Servidor Pollinations inestable (500). Aplicando mitigación: Cambiando a modelo base 'flux'...");
                        assignedModel = 'flux'; 
                        await new Promise(resolve => setTimeout(resolve, 1500)); 
                    } else {
                        throw new Error(`Fallo definitivo en la API de Imágenes de Pollinations.`);
                    }
                }
            }
        }

        // --- PROVEEDOR POR DEFECTO: COMFYUI LOCAL ENGINE ---
        const comfyBaseUrl = window.Koreh.Core.config.comfyUrl;
        const clientId = crypto.randomUUID();
        const checkpoint = config.checkpoint || document.getElementById('comfy-model')?.value || "juggernautXL_ragnarokBy.safetensors";
        const promptNeg = config.negativePrompt || document.getElementById('comfy-neg-prompt')?.value || "bad anatomy, blurry, watermark, worst quality";
        const width = config.width || parseInt(document.getElementById('comfy-width')?.value || "1024");
        const height = config.height || parseInt(document.getElementById('comfy-height')?.value || "1024");
        const steps = config.steps || 24;
        const cfg = config.cfg || 2.0;
        const sampler = config.sampler || "dpmpp_sde";
        
        let promptWorkflow = {
            "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": checkpoint } },
            "5": { "class_type": "EmptyLatentImage", "inputs": { "batch_size": 1, "width": width, "height": height } },
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
            "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "koreh_studio_art", "images": ["8", 0] } }
        };

        return new Promise((resolve, reject) => {
            try {
                const wsUrl = comfyBaseUrl.replace('http://', 'ws://') + `/ws?clientId=${clientId}`;
                const ws = new WebSocket(wsUrl);
                ws.onopen = async () => {
                    const response = await fetch(`${comfyBaseUrl}/prompt`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ prompt: promptWorkflow, client_id: clientId })
                    });
                    if (!response.ok) {
                        ws.close();
                        reject(new Error("AI_IMAGE_ERROR: Estructura del pipeline rechazada por ComfyUI."));
                        return;
                    }
                    const responseData = await response.json();
                    const promptId = responseData.prompt_id;
                    ws.onmessage = async (event) => {
                        const message = JSON.parse(event.data);
                                                 
                        if (message.type === 'executed' && message.data.prompt_id === promptId) {
                            const output = message.data.output;
                            if (output.images && output.images.length > 0) {
                                const imgObj = output.images[0];
                                const imgUrl = `${comfyBaseUrl}/view?filename=${imgObj.filename}&subfolder=${imgObj.subfolder}&type=${imgObj.type}`;
                                                                 
                                try {
                                    const imgRes = await fetch(imgUrl);
                                    const blob = await imgRes.blob();
                                    ws.close();
                                    if (config.returnType === 'base64') {
                                        const base64 = await this.blobToBase64(blob);
                                        resolve(base64);
                                    } else {
                                        resolve(blob);
                                    }
                                } catch (err) {
                                    ws.close();
                                    reject(err);
                                }
                            } else {
                                ws.close();
                                reject(new Error("ComfyUI no generó ninguna imagen en la cola del nodo final."));
                            }
                        }
                    };
                };
                ws.onerror = (e) => {
                    reject(new Error("WebSocket Error: No se pudo enlazar con ComfyUI en el puerto 8188."));
                };
            } catch (err) {
                reject(err);
            }
        });
    },
    blobToBase64: function(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};
