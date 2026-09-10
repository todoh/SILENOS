// generation-ai.js - GENERACIÓN DE ASSETS IA CON COMFYUI Y GEMINI (IMAGEN / SVG)
document.addEventListener('DOMContentLoaded', () => {
    const genPreset = document.getElementById('gen-preset');
    const genWidth = document.getElementById('gen-width');
    const genHeight = document.getElementById('gen-height');
    const genSteps = document.getElementById('gen-steps');
    const genEngine = document.getElementById('gen-engine');
    const groupComfySettings = document.getElementById('group-comfy-settings');
    const containerGenSteps = document.getElementById('container-gen-steps');
    const containerComfyUrl = document.getElementById('container-comfy-url');
    const btnTranslatePrompt = document.getElementById('btn-translate-prompt');

    // Manejador para traducir el prompt al inglés usando la API Key de Gemini
    if (btnTranslatePrompt) {
        btnTranslatePrompt.addEventListener('click', async () => {
            const promptInput = document.getElementById('gen-prompt');
            const promptText = promptInput.value.trim();
            if (!promptText) {
                alert('Por favor introduce un texto para traducir.');
                return;
            }
            const apiKey = localStorage.getItem('koreh_gemini_book_api_key') || '';
            if (!apiKey) {
                alert('Por favor, configura tu API Key de Gemini desde el botón "Config Gemini" arriba a la derecha.');
                return;
            }
            const originalTextBtn = btnTranslatePrompt.textContent;
            btnTranslatePrompt.textContent = "Traduciendo...";
            btnTranslatePrompt.disabled = true;
            try {
                const translatedText = await translatePromptToEnglish(promptText, apiKey);
                promptInput.value = translatedText;
            } catch (err) {
                console.error("Error al traducir el prompt:", err);
                alert(`Error al traducir: ${err.message}`);
            } finally {
                btnTranslatePrompt.textContent = originalTextBtn;
                btnTranslatePrompt.disabled = false;
            }
        });
    }

    // Manejador del cambio de motor de generación
    if (genEngine) {
        genEngine.addEventListener('change', () => {
            const engine = genEngine.value;
            if (engine === 'comfyui') {
                if (groupComfySettings) groupComfySettings.style.display = 'block';
                if (containerGenSteps) containerGenSteps.style.display = 'flex';
                if (containerComfyUrl) containerComfyUrl.style.display = 'flex';
            } else if (engine === 'gemini_img') {
                if (groupComfySettings) groupComfySettings.style.display = 'block';
                if (containerGenSteps) containerGenSteps.style.display = 'none';
                if (containerComfyUrl) containerComfyUrl.style.display = 'none';
            } else if (engine === 'gemini_svg') {
                if (groupComfySettings) groupComfySettings.style.display = 'none';
            }
        });
    }

    if (genPreset) {
        genPreset.addEventListener('change', () => {
            const val = genPreset.value;
            if (val === 'gemini_default') {
                genWidth.value = '1024';
                genHeight.value = '1024';
                genSteps.value = '6';
            } else if (val === 'high_res') {
                genWidth.value = '1280';
                genHeight.value = '1280';
                genSteps.value = '20';
            } else if (val === 'pixel_fast') {
                genWidth.value = '512';
                genHeight.value = '512';
                genSteps.value = '4';
            }
        });
    }

    const btnGenerate = document.getElementById('btn-generate-asset');
    const genStatus = document.getElementById('gen-status');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
            let promptText = document.getElementById('gen-prompt').value.trim();
            if (!promptText) {
                alert('Por favor introduce una descripción o prompt para generar.');
                return;
            }
            const engine = genEngine ? genEngine.value : 'comfyui';
            const chromaMode = document.getElementById('gen-chroma-mode').value;
            const appendChromaPrompt = document.getElementById('gen-append-chroma-prompt').checked;
            const tolerance = parseInt(document.getElementById('gen-chroma-tolerance').value, 10);
            const feather = parseInt(document.getElementById('gen-edge-feather').value, 10);

            if (appendChromaPrompt && chromaMode !== 'none') {
                let colorInstruction = "";
                if (chromaMode === 'green') {
                    colorInstruction = "isolated on a solid green chroma key background";
                } else if (chromaMode === 'blue') {
                    colorInstruction = "isolated on a solid blue chroma key background";
                } else if (chromaMode === 'white') {
                    colorInstruction = "isolated on a solid plain white background";
                }
                if (colorInstruction) {
                    promptText += `, ${colorInstruction}`;
                }
            }

            try {
                let rawBlob = null;
                let isSvg = false;
                if (engine === 'comfyui') {
                    const width = parseInt(genWidth.value, 10);
                    const height = parseInt(genHeight.value, 10);
                    const steps = parseInt(genSteps.value, 10);
                    const comfyUrl = document.getElementById('gen-comfy-url').value.replace(/\/$/, '') || 'http://127.0.0.1:8188';
                    genStatus.textContent = "Conectando con ComfyUI...";
                    rawBlob = await executeComfyGeneration(promptText, width, height, steps, comfyUrl);
                } else if (engine === 'gemini_img') {
                    const apiKey = localStorage.getItem('koreh_gemini_book_api_key') || '';
                    if (!apiKey) {
                        alert('Por favor, configura tu API Key de Gemini desde el botón "Config Gemini" arriba a la derecha.');
                        return;
                    }
                    genStatus.textContent = "Generando imagen con Gemini...";
                    rawBlob = await executeGeminiImageGeneration(promptText, apiKey);
                } else if (engine === 'gemini_svg') {
                    const apiKey = localStorage.getItem('koreh_gemini_book_api_key') || '';
                    if (!apiKey) {
                        alert('Por favor, configura tu API Key de Gemini desde el botón "Config Gemini" arriba a la derecha.');
                        return;
                    }
                    genStatus.textContent = "Generando SVG vectorial con Gemini...";
                    rawBlob = await executeGeminiSvgGeneration(promptText, apiKey);
                    isSvg = true;
                }

                let processedBlob = rawBlob;
                if (!isSvg && chromaMode !== 'none') {
                    genStatus.textContent = "Procesando recorte Chroma y bordes...";
                    processedBlob = await applyChromaKey(rawBlob, chromaMode, tolerance, feather);
                }

                const extension = isSvg ? 'svg' : 'png';
                const fileName = `gen_${Date.now()}.${extension}`;
                await registerAsset(fileName, processedBlob, true);

                if (dirHandle) {
                    try {
                        const newFileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                        const writable = await newFileHandle.createWritable();
                        await writable.write(processedBlob);
                        await writable.close();
                    } catch (err) {
                        console.error("Error guardando el asset en la carpeta local:", err);
                    }
                }

                genStatus.textContent = "¡Asset generado y guardado!";
                setTimeout(() => { genStatus.textContent = ""; }, 3000);
            } catch (err) {
                console.error(err);
                genStatus.textContent = `Error: ${err.message}`;
            }
        });
    }
});

// ==========================================
// TRADUCCIÓN DE PROMPT A INGLÉS (GEMINI)
// ==========================================
async function translatePromptToEnglish(text, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: `Translate the following image generation prompt into clear, precise English. Return ONLY the translation text without explanations or markdown quotes:\n\n${text}` }]
            }
        ]
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error Gemini Translation: ${res.status} - ${errText}`);
    }
    const data = await res.json();
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!translatedText) {
        throw new Error("No se recibió respuesta de traducción de Gemini.");
    }
    return translatedText;
}

// ==========================================
// GENERACIÓN A COMFYUI
// ==========================================
async function executeComfyGeneration(promptText, width, height, steps, baseUrl) {
    const clientId = "koreh_gen_" + Math.random().toString(36).substring(2, 9);
    const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws?clientId=${clientId}`;
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = () => reject(new Error("No se pudo conectar vía WebSocket con ComfyUI."));
    });

    const workflow = {
        "9": {
            "class_type": "SaveImage",
            "inputs": { "filename_prefix": "koreh_asset", "images": ["57:8", 0] }
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
                    ws.close();
                    const imgData = msg.data.output.images[0];
                    const imgUrl = `${baseUrl}/view?filename=${encodeURIComponent(imgData.filename)}&subfolder=${encodeURIComponent(imgData.subfolder)}&type=${encodeURIComponent(imgData.type)}`;
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
            const res = await fetch(`${baseUrl}/prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: workflow, client_id: clientId })
            });
            if (!res.ok) {
                ws.removeEventListener('message', messageHandler);
                ws.close();
                reject(new Error("ComfyUI rechazó la ejecución de la tarea."));
                return;
            }
            const data = await res.json();
            targetPromptId = data.prompt_id;
        } catch (err) {
            ws.removeEventListener('message', messageHandler);
            ws.close();
            reject(err);
        }
    });
}

// ==========================================
// GENERACIÓN DE IMAGEN CON GEMINI
// ==========================================
async function executeGeminiImageGeneration(promptText, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`;
    const payload = {
        prompt: promptText,
        config: {
            numberOfImages: 1,
            outputMimeType: "image/png",
            aspectRatio: "1:1"
        }
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error Gemini Imagen: ${res.status} - ${errText}`);
    }
    const data = await res.json();
    const base64Bytes = data.generatedImages?.[0]?.image?.imageBytes;
    if (!base64Bytes) {
        throw new Error("No se recibió la imagen de la API de Gemini.");
    }
    const byteCharacters = atob(base64Bytes);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/png' });
}

// ==========================================
// ALGORITMO DE CROPEO Y RECORTE PREVIO DE SVG
// ==========================================
async function cropSVG(svgString) {
    if (!svgString || typeof svgString !== 'string') return svgString;
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg) return svgString;

        // 1. Eliminar capas de fondo completas (rectángulos transparentes, blancos o vacíos)
        const allRects = doc.querySelectorAll('rect');
        allRects.forEach(rect => {
            const fill = (rect.getAttribute('fill') || '').toLowerCase().trim();
            const style = (rect.getAttribute('style') || '').toLowerCase();
            const opacity = rect.getAttribute('opacity') || rect.getAttribute('fill-opacity');
            const isTransparent = fill === 'none' || fill === 'transparent' || opacity === '0' ||
                                  fill === 'white' || fill === '#fff' || fill === '#ffffff' ||
                                  style.includes('fill:none') || style.includes('fill: transparent') || style.includes('fill:#ffffff') || style.includes('fill: white');
            
            const w = rect.getAttribute('width');
            const h = rect.getAttribute('height');
            if (isTransparent && (w === '100%' || parseFloat(w) >= 100)) {
                rect.remove();
            }
        });

        let viewBoxAttr = svg.getAttribute('viewBox');
        let vbX = 0, vbY = 0, vbW = 512, vbH = 512;
        if (viewBoxAttr) {
            const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
            if (parts.length === 4 && !parts.some(isNaN) && parts[2] > 0 && parts[3] > 0) {
                [vbX, vbY, vbW, vbH] = parts;
            }
        } else {
            const wAttr = parseFloat(svg.getAttribute('width'));
            const hAttr = parseFloat(svg.getAttribute('height'));
            if (!isNaN(wAttr) && wAttr > 0) vbW = wAttr;
            if (!isNaN(hAttr) && hAttr > 0) vbH = hAttr;
            svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
        }

        // 2. Renderizado en alta resolución para inspección pixel-perfect
        const canvasW = 1024;
        const canvasH = Math.max(1, Math.round(1024 * (vbH / vbW))) || 1024;
        const cleanedSvgString = new XMLSerializer().serializeToString(doc);
        const blob = new Blob([cleanedSvgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = url;
        });
        URL.revokeObjectURL(url);

        if (!img.complete || img.naturalWidth === 0) {
            return svgString;
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.drawImage(img, 0, 0, canvasW, canvasH);

        const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
        const data = imageData.data;
        let minX = canvasW, minY = canvasH, maxX = -1, maxY = -1;

        for (let y = 0; y < canvasH; y++) {
            for (let x = 0; x < canvasW; x++) {
                const alpha = data[(y * canvasW + x) * 4 + 3];
                if (alpha > 5) { // Umbral de opacidad para detectar trazos semi-transparentes
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        // Si el gráfico está totalmente vacío o cubre todo sin distinción
        if (maxX < minX || maxY < minY) {
            return svgString;
        }

        const scaleX = vbW / canvasW;
        const scaleY = vbH / canvasH;

        // Margen de seguridad del 1%
        const marginX = Math.max(0.2, vbW * 0.01);
        const marginY = Math.max(0.2, vbH * 0.01);

        let newVbX = vbX + minX * scaleX - marginX;
        let newVbY = vbY + minY * scaleY - marginY;
        let newVbW = (maxX - minX + 1) * scaleX + marginX * 2;
        let newVbH = (maxY - minY + 1) * scaleY + marginY * 2;

        newVbX = Math.round(newVbX * 100) / 100;
        newVbY = Math.round(newVbY * 100) / 100;
        newVbW = Math.round(newVbW * 100) / 100;
        newVbH = Math.round(newVbH * 100) / 100;

        svg.setAttribute('viewBox', `${newVbX} ${newVbY} ${newVbW} ${newVbH}`);
        svg.setAttribute('width', `${newVbW}`);
        svg.setAttribute('height', `${newVbH}`);

        return new XMLSerializer().serializeToString(doc);
    } catch (err) {
        console.warn("Error cropeando SVG previo:", err);
        return svgString;
    }
}

// ==========================================
// GENERACIÓN DE SVG VECTORIAL CON GEMINI
// ==========================================
async function executeGeminiSvgGeneration(promptText, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const systemInstruction = "Eres un diseñador gráfico experto en código SVG vectorial para videojuegos 2D. " +
        "Genera ÚNICAMENTE código SVG válido, limpio, autocontenido e independiente para la siguiente descripción. " +
        "NO incluyas ningún tipo de fondo, recuadro ni rectángulo contenedor detrás del elemento. " +
        "IMPORTANTE: Devuelve SOLO el código SVG dentro de un bloque markdown ```xml ... ``` sin comentarios ni explicaciones adicionales.";
    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: `${systemInstruction}\n\nDescripción del asset: ${promptText}` }]
            }
        ]
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error Gemini SVG: ${res.status} - ${errText}`);
    }
    const data = await res.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = responseText.match(/<svg[\s\S]*?<\/svg>/i);
    if (!match) {
        throw new Error("Gemini no devolvió un elemento <svg> válido.");
    }
    let svgContent = match[0];
    if (typeof cropSVG === 'function') {
        svgContent = await cropSVG(svgContent);
    }
    return new Blob([svgContent], { type: 'image/svg+xml' });
}

// ==========================================
// ALGORITMO CHROMA KEY Y SUAVIZADO
// ==========================================
function applyChromaKey(imageBlob, mode, tolerance, feather) {
    return new Promise((resolve) => {
        if (mode === 'none') {
            resolve(imageBlob);
            return;
        }
        const img = new Image();
        const url = URL.createObjectURL(imageBlob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const tolVal = tolerance;
            const featherVal = Math.max(0, feather);

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                let isTarget = false;
                let diff = 0;

                if (mode === 'green') {
                    diff = g - Math.max(r, b);
                    if (g > 40 && diff > (100 - tolVal)) {
                        isTarget = true;
                    }
                } else if (mode === 'blue') {
                    diff = b - Math.max(r, g);
                    if (b > 40 && diff > (100 - tolVal)) {
                        isTarget = true;
                    }
                } else if (mode === 'white') {
                    const brightness = (r + g + b) / 3;
                    const colorDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
                    if (brightness > (255 - tolVal) && colorDiff < 25) {
                        isTarget = true;
                        diff = brightness - (255 - tolVal);
                    }
                }

                if (isTarget) {
                    if (featherVal > 0 && diff < (tolVal * 0.3)) {
                        const alphaRatio = diff / (tolVal * 0.3);
                        data[i + 3] = Math.round(data[i + 3] * alphaRatio);
                    } else {
                        data[i + 3] = 0;
                    }
                }
            }
            ctx.putImageData(imgData, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        };
        img.src = url;
    });
}