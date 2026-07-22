// Abrir Canvas: ai.image.js
/**
 * AI IMAGE - Módulo de Generación de Imágenes (ComfyUI Engine, Pollinations Router, Fooocus & Runware Engine)
 * Dependencia: ai.core.js
 * Espacio de nombres: window.Koreh.Image
 */
window.Koreh = window.Koreh || {};
window.Koreh.Image = {
    async generate(prompt, config = {}) {
        if (!window.Koreh.Core) throw new Error("Koreh.Core no cargado.");
        
        const imageEngine = localStorage.getItem('koreh_image_engine') || 'comfyui';
        
        // --- ENRUTAMIENTO: PROVEEDOR RUNWARE.COM ---
        if (imageEngine === 'runware') {
            const apiKey = window.Koreh.Core.getAuthKey('runware');
            if (!apiKey) {
                throw new Error("API Key de Runware no configurada. Introduce tu apikey en la configuración.");
            }
            const width = config.width || 1344;
            const height = config.height || 768;
            const steps = config.steps || 4;
            const taskUUID = crypto.randomUUID();
            const requestBody = [
                {
                    "taskType": "imageInference",
                    "taskUUID": taskUUID,
                    "model": "runware:twinflow-z-image-turbo@0",
                    "positivePrompt": prompt,
                    "width": width,
                    "height": height,
                    "steps": steps,
                    "numberResults": 1,
                    "deliveryMethod": "sync"
                }
            ];
            const response = await fetch('https://api.runware.ai/v1', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error en el servidor Runware (${response.status}): ${errorText}`);
            }
            const result = await response.json();
            if (result && result.data && result.data.length > 0) {
                const taskResult = result.data[0];
                if (taskResult.imageURL) {
                    const imgRes = await fetch(taskResult.imageURL);
                    const blob = await imgRes.blob();
                    if (config.returnType === 'base64') {
                        return await this.blobToBase64(blob);
                    }
                    return blob;
                } else if (taskResult.error) {
                    throw new Error(`Error de Runware: ${taskResult.error}`);
                } else {
                    throw new Error('No se recibió ninguna URL de imagen en la respuesta de Runware.');
                }
            } else {
                throw new Error('La respuesta de la API de Runware no contiene el formato esperado.');
            }
        }

        // --- ENRUTAMIENTO: PROVEEDOR FOOOCUS LOCAL ---
        if (imageEngine === 'fooocus') {
            const stepsCount = config.steps || 4;
            const loraModel = localStorage.getItem('koreh_fooocus_lora') || 'sdxl_lightning_4step.safetensors';
            
            const payload = {
                data: [
                    prompt,                                  // Positive prompt
                    "",                                      // Negative prompt
                    "None",                                  // Styles
                    "Speed",                                 // Performance
                    "1024 1024",                             // Resolution
                    1,                                       // Image number
                    1.5,                                     // CFG Scale
                    stepsCount,                              // Steps
                    -1,                                      // Seed (-1 = Random)
                    0.0,                                     // Image Sharpness
                    loraModel,                               // LoRA 1 Name
                    1.0,                                     // LoRA 1 Weight
                    "None",                                  // LoRA 2 Name
                    0.0,                                     // LoRA 2 Weight
                    false,                                   // Input image checkbox
                    "",                                      // Input image path
                    "None",                                  // Refiner
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

        // --- PROVEEDOR POR DEFECTO: COMFYUI LOCAL ENGINE (EXACTO A CONEXION CONFYUI.HTML) ---
        const comfyBaseUrl = (localStorage.getItem('koreh_comfy_local_url') || window.Koreh.Core.config.comfyUrl || 'http://127.0.0.1:8188').replace(/\/$/, "");
        const clientId = "client_" + Math.random().toString(36).substring(2, 15);
        
        const unetName = config.unet || localStorage.getItem('koreh_comfy_unet_model') || document.getElementById('chat-img-unet')?.value || "z_image_turbo_int8_convrot.safetensors";
        const clipName = config.clip || localStorage.getItem('koreh_comfy_clip_model') || document.getElementById('chat-img-clip')?.value || "qwen_3_4b_int8_convrot.safetensors";
        const vaeName = config.vae || localStorage.getItem('koreh_comfy_vae_model') || document.getElementById('chat-img-vae')?.value || "ae.safetensors";
        
        const width = config.width || parseInt(document.getElementById('comfy-width')?.value || document.getElementById('chat-img-width')?.value || "1920");
        const height = config.height || parseInt(document.getElementById('comfy-height')?.value || document.getElementById('chat-img-height')?.value || "1088");
        const steps = config.steps || parseInt(document.getElementById('comfy-steps')?.value || document.getElementById('chat-img-steps')?.value || "10");
        const cfg = config.cfg || parseFloat(document.getElementById('comfy-cfg')?.value || document.getElementById('chat-img-cfg')?.value || "1.0");
        const sampler = config.sampler || document.getElementById('comfy-sampler')?.value || document.getElementById('chat-img-sampler')?.value || "res_multistep";

        // Estructura idéntica al pipeline Z-Image Turbo de CONEXION CONFYUI.html
        let promptWorkflow = {
            "9": {
                "class_type": "SaveImage",
                "inputs": {
                    "filename_prefix": "z-image-turbo",
                    "images": ["57:8", 0]
                }
            },
            "57:30": {
                "class_type": "CLIPLoader",
                "inputs": {
                    "clip_name": clipName,
                    "type": "lumina2",
                    "device": "default"
                }
            },
            "57:29": {
                "class_type": "VAELoader",
                "inputs": {
                    "vae_name": vaeName
                }
            },
            "57:33": {
                "class_type": "ConditioningZeroOut",
                "inputs": {
                    "conditioning": ["57:27", 0]
                }
            },
            "57:8": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["57:3", 0],
                    "vae": ["57:29", 0]
                }
            },
            "57:28": {
                "class_type": "UNETLoader",
                "inputs": {
                    "unet_name": unetName,
                    "weight_dtype": "default"
                }
            },
            "57:27": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": prompt,
                    "clip": ["57:30", 0]
                }
            },
            "57:13": {
                "class_type": "EmptySD3LatentImage",
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                }
            },
            "57:11": {
                "class_type": "ModelSamplingAuraFlow",
                "inputs": {
                    "shift": 3,
                    "model": ["57:28", 0]
                }
            },
            "57:3": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": Math.floor(Math.random() * 1e15),
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": sampler,
                    "scheduler": "simple",
                    "denoise": 1,
                    "model": ["57:11", 0],
                    "positive": ["57:27", 0],
                    "negative": ["57:33", 0],
                    "latent_image": ["57:13", 0]
                }
            }
        };

        return new Promise((resolve, reject) => {
            try {
                const wsUrl = comfyBaseUrl.replace(/^http/, 'ws') + `/ws?clientId=${clientId}`;
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
                        if (typeof event.data === 'string') {
                            const message = JSON.parse(event.data);
                            if (message.type === 'executed' && message.data.node === "9" && message.data.prompt_id === promptId) {
                                const output = message.data.output;
                                if (output.images && output.images.length > 0) {
                                    const imgObj = output.images[0];
                                    const imgUrl = `${comfyBaseUrl}/view?filename=${encodeURIComponent(imgObj.filename)}&subfolder=${encodeURIComponent(imgObj.subfolder)}&type=${encodeURIComponent(imgObj.type)}`;
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
                        }
                    };
                };
                ws.onerror = (e) => {
                    reject(new Error("WebSocket Error: No se pudo enlazar con ComfyUI en el puerto indicado."));
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