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
    await executeSingleNodeIllustrationAsync(window.selectedNode);
}

/**
 * FUNCIÓN CENTRALIZADA ASÍNCRONA PARA ILUSTRAR UN NODO INDIVIDUAL
 * Extraída para permitir ejecuciones concurrentes masivas controladas por lotes.
 */
async function executeSingleNodeIllustrationAsync(node) {
    let basePromptText = node.content || node.title;
    if (!basePromptText.trim()) return;

    const width = parseInt(document.getElementById('comfy-width')?.value || "512");
    const height = parseInt(document.getElementById('comfy-height')?.value || "512");
    const prompterModel = document.getElementById('comfy-prompt-model')?.value || document.getElementById('assist-thinker')?.value || (agentState?.models?.[0]) || null;

    const task = typeof createTask === 'function' ? createTask(node.id, 'Ilustración', `Arte: ${node.title.substring(0,10)}`) : null;
    if (task) updateTask(node.id, 10, 'Canon & Estilo...');

    let finalPromptPos = "";
    const entityRegex = /@\w+/g;
    const detectedEntities = basePromptText.match(entityRegex);

    if (prompterModel) {
        if (task) updateTask(node.id, 20, 'Prompt a Inglés...');
        const canonSource = data.visualBible || "";
        const globalStyle = data.visualStyle || "";
        let contextCanonData = "";

        if (detectedEntities && detectedEntities.length > 0) {
            detectedEntities.forEach(ent => {
                const lines = canonSource.split('\n');
                const matchLine = lines.find(l => l.toUpperCase().startsWith(ent.toUpperCase()));
                if (matchLine) contextCanonData += `${matchLine}\n`;
            });
        }

        const systemInstructions = "You are an expert prompt engineer for Stable Diffusion and visual models. You output exclusively in ENGLISH.";
        let expansionPrompt = `The author is writing a text in Spanish and wants to generate an illustration for this section.\nSPANISH TEXT CONTENT TO ILLUSTRATE:\n"${basePromptText}"\n`;

        if (globalStyle.trim()) expansionPrompt += `\nMANDATORY GLOBAL VISUAL STYLE / ARTISTIC DIRECTION:\n"${globalStyle}"\n`;
        if (contextCanonData.trim()) expansionPrompt += `\nVISUAL BIBLE DICTIONARY CODES:\n${contextCanonData}\nCRITICAL INSTRUCTION: Extract atmosphere, fuse with matching codes.\n`;

        expansionPrompt += `\nTASK: Translate into single cohesive English prompt. Append artistic style. Output ONLY raw keywords, no markdown.`;

        try {
            if (typeof ollamaGenerate === 'function') {
                const expandedPromptResponse = await ollamaGenerate(prompterModel, expansionPrompt, false, systemInstructions, task?.controller?.signal);
                if (expandedPromptResponse && expandedPromptResponse.trim()) {
                    finalPromptPos = expandedPromptResponse.trim();
                }
            }
        } catch (thinkError) {
            console.warn("[KOREH CANON] Falló traducción por IA, usando fallback.", thinkError);
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
        if (task) updateTask(node.id, 50, 'Pollinations Cloud...');
        const pModel = document.getElementById('pollinations-model')?.value || 'flux';
        const seed = Math.floor(Math.random() * 9999999);
        let url = `https://gen.pollinations.ai/image/${encodeURIComponent(finalPromptPos)}?model=${pModel}&width=${width}&height=${height}&seed=${seed}&nologo=true`;
        if (agentState.pollinationsApiKey) url += `&key=${agentState.pollinationsApiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Fallo en API de Pollinations.");
            const blob = await response.blob();
            
            await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const encodedData = reader.result;
                    node.image = encodedData;
                    if (typeof saveMediaToFileSystem === 'function') {
                        saveMediaToFileSystem(node.id, encodedData).then(() => {
                            saveLogic();
                            if (window.selectedNode && window.selectedNode.id === node.id) openEditor('node', window.selectedNode);
                            if (task) {
                                updateTask(node.id, 100, 'Listo');
                                setTimeout(() => finishTask(node.id), 500);
                            }
                            resolve();
                        }).catch(reject);
                    } else {
                        resolve();
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error("Fallo generativo en nube: ", err.message);
            if (task) finishTask(node.id);
        }
        return;
    }

    // --- FLUJO LOCAL TRADICIONAL (COMFYUI) ---
    if (task) updateTask(node.id, 40, 'Pipeline ComfyUI...');
    const checkpoint = document.getElementById('comfy-model')?.value || "dreamshaperXL_lightningDPMSDE.safetensors";
    const promptNeg = document.getElementById('comfy-neg-prompt')?.value || "";
    const clientId = crypto.randomUUID();

    let promptWorkflow = {
        "4": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": checkpoint } },
        "5": { "class_type": "EmptyLatentImage", "inputs": { "batch_size": 1, "width": width, "height": height } },
        "6": { "class_type": "CLIPTextEncode", "inputs": { "text": finalPromptPos, "clip": ["4", 1] } },
        "7": { "class_type": "CLIPTextEncode", "inputs": { "text": promptNeg, "clip": ["4", 1] } },
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": Math.floor(Math.random() * 1000000000), "steps": 14, "cfg": 2.0,
                "sampler_name": "dpmpp_sde", "scheduler": "normal", "denoise": 1,
                "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]
            }
        },
        "8": { "class_type": "VAEDecode", "inputs": { "samples": ["3", 0], "vae": ["4", 2] } },
        "9": { "class_type": "SaveImage", "inputs": { "filename_prefix": "koreh_node_art", "images": ["8", 0] } }
    };

    try {
        await new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://127.0.0.1:8188/ws?clientId=${clientId}`);
            ws.onopen = async () => {
                if (task) updateTask(node.id, 50, 'En Cola...');
                const response = await fetch(`http://127.0.0.1:8188/prompt`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: promptWorkflow, client_id: clientId })
                });

                if (!response.ok) { ws.close(); return reject(new Error("Fallo en pipeline.")); }
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
                                        if (window.selectedNode && window.selectedNode.id === node.id) openEditor('node', window.selectedNode);
                                        if (task) {
                                            updateTask(node.id, 100, 'Listo');
                                            setTimeout(() => finishTask(node.id), 500);
                                        }
                                        ws.close();
                                        resolve();
                                    });
                                } else {
                                    ws.close();
                                    resolve();
                                }
                            };
                            img.src = imgUrl;
                        }
                    }
                };
            };
            ws.onerror = () => { ws.close(); reject(new Error("Error WebSocket.")); };
        });
    } catch(err) {
        console.error("Fallo generativo local: ", err.message);
        if (task) finishTask(node.id);
    }
}

/**
 * NUEVA FUNCIÓN: ILUSTRAR TODOS LOS NODOS VACÍOS EN RONDAS CONCURRENTES DE 20
 */
async function illustrateAllUnillustratedNodes() {
    const unillustrated = data.nodes.filter(n => !n.image && n.content && n.content.trim() !== "");
    if (!unillustrated.length) {
        alert("Todos los nodos válidos ya se encuentran ilustrados en el espacio activo.");
        return;
    }

    const voiceStatus = document.getElementById('panel-agent-status') || document.getElementById('voiceStatusText');
    const oldText = voiceStatus ? voiceStatus.innerText : "ONLINE";
    
    if (voiceStatus) voiceStatus.innerText = `ILUSTRANDO: 0/${unillustrated.length}`;

    // Procesamiento en bloques/rondas estrictas de 20 paralelos max
    const ROUND_SIZE = 20;
    for (let i = 0; i < unillustrated.length; i += ROUND_SIZE) {
        const currentBatch = unillustrated.slice(i, i + ROUND_SIZE);
        if (voiceStatus) voiceStatus.innerText = `RONDA IA: ${i + 1}-${Math.min(i + ROUND_SIZE, unillustrated.length)} de ${unillustrated.length}`;
        
        // Ejecución concurrente controlada por Promesas en paralelo
        await Promise.all(currentBatch.map(node => executeSingleNodeIllustrationAsync(node)));
    }

    if (voiceStatus) voiceStatus.innerText = oldText;
    alert(`Proceso masivo finalizado con éxito. Se procesaron ${unillustrated.length} ilustraciones.`);
}

/**
 * NUEVA FUNCIÓN: FILTRADO INTELIGENTE E ILUSTRACIÓN SELECTIVA POR ANÁLISIS DE LA IA
 */
async function illustrateInterestingNodesByIA() {
    const countInput = document.getElementById('voiceInterestCount');
    const limit = parseInt(countInput?.value || "3", 10) || 3;

    if (!data.nodes.length) {
        alert("El librojuego no posee nodos.");
        return;
    }

    const prompterModel = document.getElementById('assist-thinker')?.value || document.getElementById('comfy-prompt-model')?.value || (agentState?.models?.[0]) || null;
    if (!prompterModel) {
        alert("Configura un modelo en el Asistente/Config antes de continuar.");
        return;
    }

    const voiceStatus = document.getElementById('panel-agent-status') || document.getElementById('voiceStatusText');
    const oldText = voiceStatus ? voiceStatus.innerText : "ONLINE";
    if (voiceStatus) voiceStatus.innerText = "IA EVALUANDO GRAFO...";

    try {
        // 1. Serializar el librojuego entero en 1 sola llamada estructurada utilizando el algoritmo BFS del sistema
        let serializedStory = `PROYECTO: ${data.name}\n\n`;
        data.nodes.forEach(n => {
            serializedStory += `ID: "${n.id}"\nTÍTULO: "${n.title}"\nPROSA: ${n.content || '(Vacío)'}\n---\n`;
        });

        // 2. Construir prompt analítico para la IA
        const evaluationPrompt = `Eres un ingeniero narrativo y director de arte de novelas visuales. Tu misión es leer el librojuego completo provisto a continuación y seleccionar exactamente un máximo de ${limit} nodos que sean los más críticos, dramáticos, con giros argumentales potentes o de alto impacto de interés para ser ilustrados.\n\n${serializedStory}\n\nDevuelve EXCLUSIVAMENTE un objeto JSON válido, sin decoradores ni markdown, que contenga un array de strings con los IDs exactos elegidos:\n{ "selectedIds": ["id1", "id2"] }`;

        const rawJson = await ollamaGenerate(prompterModel, evaluationPrompt, true);
        const match = rawJson.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("La IA no devolvió un JSON con nodos de interés válidos.");
        
        const parsedResult = JSON.parse(match[0]);
        if (!parsedResult || !Array.isArray(parsedResult.selectedIds)) {
            throw new Error("Formato inválido de IDs de interés.");
        }

        const targetIds = parsedResult.selectedIds;
        const nodesToIllustrate = data.nodes.filter(n => targetIds.includes(n.id) && !n.image);

        if (!nodesToIllustrate.length) {
            if (voiceStatus) voiceStatus.innerText = oldText;
            alert("La IA seleccionó nodos que ya poseían ilustraciones o IDs redundantes. Inténtalo de nuevo.");
            return;
        }

        if (voiceStatus) voiceStatus.innerText = `ILUSTRANDO ${nodesToIllustrate.length} SELECCIONES IA...`;
        
        // 3. Ilustrar de golpe en paralelo todos los nodos marcados por el interés ontológico del modelo
        await Promise.all(nodesToIllustrate.map(node => executeSingleNodeIllustrationAsync(node)));

        if (voiceStatus) voiceStatus.innerText = oldText;
        alert(`La IA analizó la obra entera y acopló ${nodesToIllustrate.length} ilustraciones artísticas concurrentes.`);

    } catch (e) {
        console.error(e);
        if (voiceStatus) voiceStatus.innerText = oldText;
        alert("Fallo en el filtrado inteligente: " + e.message);
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