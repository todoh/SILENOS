// ui_images.js
// --- GESTIÓN DE ELEMENTOS MULTIMEDIA E INTEGRACIÓN CON COMFYUI Y POLLINATIONS ---

function renderNodeMediaContainer(item) {
    const mediaContainer = document.getElementById('node-media-container');
    if (!mediaContainer) return;
    
    if (item.image) {
        mediaContainer.innerHTML = `
            <div class="relative w-full h-20 border border-black mb-2 bg-gray-100 flex items-center justify-center overflow-hidden">
                <img src="${item.image}" class="max-w-full max-h-full object-contain cursor-zoom-in" onclick="openFullscreenImage(this.src)" title="Click para ver en grande">
                <button onclick="removeNodeImage()" class="absolute top-1 right-1 bg-black text-white text-[8px] p-1 uppercase">✕</button>
            </div>`;
    } else {
        mediaContainer.innerHTML = `
            <div class="flex gap-1 mb-2">
                <button onclick="document.getElementById('node-image-upload').click()" class="flex-1 text-[8px] border border-black p-1 uppercase hover:bg-gray-100">↑ Subir PC</button>
                <button onclick="generateComfyImageForNode()" class="flex-grow text-[8px] bg-black text-white p-1 uppercase hover:bg-gray-800">⚡ Generar IA</button>
            </div>
            <input type="file" id="node-image-upload" class="hidden" accept="image/*" onchange="uploadNodeImage(event)">
        `;
    }
}

function uploadNodeImage(event) {
    const file = event.target.files[0];
    if (!file || !window.selectedNode) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        window.selectedNode.image = e.target.result;
        if (typeof saveMediaToFileSystem === 'function') {
            saveMediaToFileSystem(window.selectedNode.id, e.target.result).then(() => {
                saveLogic();
                openEditor('node', window.selectedNode);
            });
        }
    };
    reader.readAsDataURL(file);
}

function removeNodeImage() {
    if (!window.selectedNode) return;
    const targetId = window.selectedNode.id;
    window.selectedNode.image = null;
    if (typeof deleteMediaFromFileSystem === 'function') {
        deleteMediaFromFileSystem(targetId).then(() => {
            saveLogic();
            openEditor('node', window.selectedNode);
        });
    }
}

async function generateComfyImageForNode() {
    if (!window.selectedNode) return;
    const node = window.selectedNode;
    let basePromptText = node.content || node.title;
    
    if (!basePromptText.trim()) {
        alert("Escribe contenido en el fragmento para usarlo como prompt.");
        return;
    }

    const width = parseInt(document.getElementById('comfy-width')?.value || "512");
    const height = parseInt(document.getElementById('comfy-height')?.value || "512");
    const prompterModel = document.getElementById('comfy-prompt-model')?.value || document.getElementById('assist-thinker')?.value || (agentState?.models?.[0]) || null;

    const task = typeof createTask === 'function' ? createTask(node.id, 'Ilustración', 'Generando Arte...') : null;
    if (task) updateTask(node.id, 10, 'Analizando Canon y Estilo...');

    let finalPromptPos = "";
    const entityRegex = /@\w+/g;
    const detectedEntities = basePromptText.match(entityRegex);

    if (prompterModel) {
        if (task) updateTask(node.id, 20, 'Traduciendo y aplicando estilo global a inglés...');
        
        const canonSource = data.visualBible || "";
        const globalStyle = data.visualStyle || "";
        let contextCanonData = "";

        if (detectedEntities && detectedEntities.length > 0) {
            detectedEntities.forEach(ent => {
                const lines = canonSource.split('\n');
                const matchLine = lines.find(l => l.toUpperCase().startsWith(ent.toUpperCase()));
                if (matchLine) {
                    contextCanonData += `${matchLine}\n`;
                }
            });
        }

        const systemInstructions = "You are an expert prompt engineer for Stable Diffusion and visual models. You output exclusively in ENGLISH.";
        
        let expansionPrompt = `The author is writing a text in Spanish and wants to generate an illustration for this section.
SPANISH TEXT CONTENT TO ILLUSTRATE:
"${basePromptText}"
`;

        if (globalStyle.trim()) {
            expansionPrompt += `
MANDATORY GLOBAL VISUAL STYLE / ARTISTIC DIRECTION:
"${globalStyle}"
`;
        }

        if (contextCanonData.trim()) {
            expansionPrompt += `
VISUAL BIBLE DICTIONARY CODES (Use these exact English visual descriptions for matching symbols):
${contextCanonData}

CRITICAL INSTRUCTION: Extract the scene's atmosphere, detect the entities invoked with '@', and fuse them perfectly with their corresponding visual descriptions from the dictionary.
`;
        }

        expansionPrompt += `
TASK:
Translate the core concepts of the Spanish text into a single, cohesive, visually dense prompt optimized for Stable Diffusion.
CRITICAL MANDATE 1: You MUST forcefully integrate and append the MANDATORY GLOBAL VISUAL STYLE descriptors into the final rendering instruction so the image matches this artistic aesthetic.
CRITICAL MANDATE 2: The entire response MUST be in ENGLISH. Do not include any explanations, introductory text, metadata, or markdown wrap. Return ONLY the final tags and descriptive keywords separated by commas.`;

        try {
            if (typeof ollamaGenerate === 'function') {
                const expandedPromptResponse = await ollamaGenerate(prompterModel, expansionPrompt, false, systemInstructions, task?.controller?.signal);
                if (expandedPromptResponse && expandedPromptResponse.trim()) {
                    finalPromptPos = expandedPromptResponse.trim();
                    console.log("[KOREH CANON & ESTILO] Prompt procesado a inglés por IA con éxito:", finalPromptPos);
                }
            }
        } catch (thinkError) {
            console.warn("[KOREH CANON] Falló la traducción asistida por IA, usando fallback.", thinkError);
            if (thinkError.name === 'AbortError') {
                if (task) finishTask(node.id);
                return;
            }
        }
    }

    if (!finalPromptPos.trim()) {
        finalPromptPos = basePromptText + (data.visualStyle ? `, ${data.visualStyle}` : "");
    }

    // --- ENRUTAMIENTO DE MOTOR VISUAL ---
    if (agentState.mediaMode === 'pollinations') {
        if (task) updateTask(node.id, 50, 'Conectando con Pollinations Cloud...');
        const pModel = document.getElementById('pollinations-model')?.value || 'flux';
        const seed = Math.floor(Math.random() * 9999999);
        
        let url = `https://gen.pollinations.ai/image/${encodeURIComponent(finalPromptPos)}?model=${pModel}&width=${width}&height=${height}&seed=${seed}&nologo=true`;
        if (agentState.pollinationsApiKey) {
            url += `&key=${agentState.pollinationsApiKey}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Fallo en la API de Pollinations.");
            const blob = await response.blob();
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const encodedData = reader.result;
                node.image = encodedData;
                if (typeof saveMediaToFileSystem === 'function') {
                    saveMediaToFileSystem(node.id, encodedData).then(() => {
                        saveLogic();
                        if (window.selectedNode && window.selectedNode.id === node.id) {
                            openEditor('node', window.selectedNode);
                        }
                        if (task) {
                            updateTask(node.id, 100, 'Completado Cloud');
                            setTimeout(() => finishTask(node.id), 500);
                        }
                    });
                }
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            alert("Fallo generativo en nube: " + err.message);
            if (task) finishTask(node.id);
        }
        return;
    }

    // --- FLUJO LOCAL TRADICIONAL (COMFYUI) ---
    if (task) updateTask(node.id, 40, 'Renderizando en Pipeline...');
    const checkpoint = document.getElementById('comfy-model')?.value || "dreamshaperXL_lightningDPMSDE.safetensors";
    const promptNeg = document.getElementById('comfy-neg-prompt')?.value || "";
    const steps = 14;
    const cfg = 2.0;
    const sampler = "dpmpp_sde";
    const clientId = crypto.randomUUID();

    let promptWorkflow = {
        "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": checkpoint } },
        "5": { "class_type": "EmptyLatentImage", "inputs": { "batch_size": 1, "width": width, "height": height } },
        "6": { "class_type": "CLIPTextEncode", "inputs": { "text": finalPromptPos, "clip": ["4", 1] } },
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
        "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "koreh_node_art", "images": ["8", 0] } }
    };

    try {
        const ws = new WebSocket(`ws://127.0.0.1:8188/ws?clientId=${clientId}`);
        ws.onopen = async () => {
            if (task) updateTask(node.id, 50, 'En cola de ComfyUI...');
            const response = await fetch(`http://127.0.0.1:8188/prompt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: promptWorkflow, client_id: clientId })
            });

            if (!response.ok) throw new Error("Fallo en la estructura del pipeline.");
            const responseData = await response.json();
            const promptId = responseData.prompt_id;

            ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'progress' && task) {
                    updateTask(node.id, Math.floor((message.data.value / message.data.max) * 40) + 50, `Progreso: ${message.data.value}/${message.data.max}`);
                }
                if (message.type === 'executed' && message.data.prompt_id === promptId) {
                    const output = message.data.output;
                    if (output.images) {
                        const imgObj = output.images[0];
                        const imgUrl = `http://127.0.0.1:8188/view?filename=${imgObj.filename}&subfolder=${imgObj.subfolder}&type=${imgObj.type}`;
                        
                        const img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.onload = () => {
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = img.width;
                            tempCanvas.height = img.height;
                            tempCanvas.getContext('2d').drawImage(img, 0, 0);
                            const encodedData = tempCanvas.toDataURL('image/png');
                            
                            node.image = encodedData;
                            if (typeof saveMediaToFileSystem === 'function') {
                                saveMediaToFileSystem(node.id, encodedData).then(() => {
                                    saveLogic();
                                    if (window.selectedNode && window.selectedNode.id === node.id) {
                                        openEditor('node', window.selectedNode);
                                    }
                                    if (task) {
                                        updateTask(node.id, 100, 'Completado');
                                        setTimeout(() => finishTask(node.id), 500);
                                    }
                                    ws.close();
                                });
                            }
                        };
                        img.src = imgUrl;
                    }
                }
            };
        };
        ws.onerror = () => { throw new Error("ComfyUI desconectado o error en el WebSocket."); };
    } catch(err) {
        alert("Fallo generativo: " + err.message);
        if (task) finishTask(node.id);
    }
}

function openFullscreenImage(src) {
    if (!src) return;
    const modal = document.getElementById('image-fullscreen-modal');
    const img = document.getElementById('image-fullscreen-target');
    img.src = src;
    modal.classList.remove('hidden');
}

function closeFullscreenImage() {
    const modal = document.getElementById('image-fullscreen-modal');
    modal.classList.add('hidden');
    document.getElementById('image-fullscreen-target').src = '';
}