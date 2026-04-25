// Archivo: Librojuego/visual.engine.js

window.VisualEngine = {
    currentRatio: 'portrait',
    uploadingNodeId: null,
    generatingNodes: new Set(), // Registro de tareas de imagen en segundo plano

    setRatio(ratio) {
        this.currentRatio = ratio;
        document.querySelectorAll('[id^="btn-ratio-"]').forEach(b => {
            b.classList.remove('bg-gray-200');
            b.classList.add('bg-[#f3f4f6]');
        });
        const btn = document.getElementById(`btn-ratio-${ratio}`);
        if(btn) {
            btn.classList.remove('bg-[#f3f4f6]');
            btn.classList.add('bg-gray-200');
        }
    },

    getDimensions() {
        switch(this.currentRatio) {
            case 'portrait': return { w: 768, h: 1344 };
            case 'square': return { w: 1024, h: 1024 };
            case 'landscape': default: return { w: 1344, h: 768 };
        }
    },

    triggerUpload(nodeId) {
        if (!Core.targetHandle) {
            return alert("Selecciona una carpeta raíz primero en el menú superior para poder guardar la imagen en disco.");
        }
        this.uploadingNodeId = nodeId;
        const fileInput = document.getElementById('hidden-file-input');
        if (fileInput) {
            fileInput.click();
        }
    },

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.uploadingNodeId) return;

        const nodeId = this.uploadingNodeId;
        const node = Core.getNode(nodeId);
        if (!node) return;

        try {
            UI.setLoading(true, "Subiendo y Procesando Imagen...", 50, "Reescalando a 1920px", 50);

            // Reescalar y mejorar usando la clase ImageProcessor (JPG Forzado)
            const processedBlob = await window.ImageProcessor.process(file, 1920, 0.15);
            
            const filename = `IMG_UPLOAD_${nodeId}_${Date.now()}.jpg`;
            
            const fileHandle = await Core.targetHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(processedBlob);
            await writable.close();

            node.imageUrl = filename;
            node.imagePrompt = "Imagen cargada manualmente desde el PC."; 
            node._cachedImageUrl = URL.createObjectURL(processedBlob);

            Core.scheduleSave();

            if (typeof Canvas !== 'undefined') Canvas.renderNodes();
            if (typeof Editor !== 'undefined') Editor.loadNode(nodeId);

        } catch (error) {
            console.error("Caos Visual al subir imagen:", error);
            alert("Fallo al guardar la imagen: " + error.message);
        } finally {
            event.target.value = "";
            this.uploadingNodeId = null;
            UI.setLoading(false);
        }
    },

    async deleteImage(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node || !node.imageUrl) return;

        const confirmDelete = confirm("¿Seguro que deseas borrar la imagen de este nodo? Se eliminará definitivamente de la carpeta.");
        if (!confirmDelete) return;

        try {
            UI.setLoading(true, "Borrando Imagen...", 50, "Eliminando archivo físico", 50);
            
            if (Core.targetHandle) {
                try {
                    await Core.targetHandle.removeEntry(node.imageUrl);
                } catch (e) {
                    console.warn("No se pudo borrar el archivo físico. Tal vez ya fue borrado a mano: ", e);
                }
            }

            delete node.imageUrl;
            delete node.imagePrompt;
            delete node._cachedImageUrl;

            Core.scheduleSave();

            if (typeof Canvas !== 'undefined') Canvas.renderNodes();
            if (typeof Editor !== 'undefined') Editor.loadNode(nodeId);

        } catch (error) {
            console.error("Caos Visual al borrar imagen:", error);
            alert("Fallo al borrar la imagen: " + error.message);
        } finally {
            UI.setLoading(false);
        }
    },

    async illustrateMassive() {
        const bible = Core.bookData?.visualBible || Core.book?.visualBible;
        let isValid = false;
        
        if (typeof bible === 'string') {
            isValid = bible.trim().length > 15;
        } else if (typeof bible === 'object' && bible !== null) {
            isValid = (bible.style || bible.characters || bible.places || bible.flora_fauna || bible.objects_tech || '').length > 10;
        }

        if (!isValid) {
            return alert("Debes forjar (o escribir) primero la Biblia Visual antes de ilustrar masivamente. El motor necesita este lore estético para mantener la coherencia.");
        }

        if (!Core.targetHandle) {
            return alert("Selecciona una carpeta raíz primero en el menú superior para guardar las imágenes.");
        }

        const countInput = document.getElementById('visual-nodes-count');
        const targetCount = parseInt(countInput.value) || 10;

        const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
        let candidates = allNodes.filter(n => !n.imageUrl && n.text && n.text.length > 10);
        
        if (candidates.length === 0) {
            return alert("Todos los nodos ya están ilustrados o no hay nodos válidos en la obra.");
        }

        candidates.sort((a, b) => b.text.length - a.text.length);

        if (allNodes.length > 0) {
            const startId = allNodes[0].id;
            const startIndex = candidates.findIndex(n => n.id === startId);
            if (startIndex > 0) {
                const startNode = candidates.splice(startIndex, 1)[0];
                candidates.unshift(startNode);
            }
        }

        candidates = candidates.slice(0, targetCount);

        const confirmMassive = confirm(`¿Estás seguro de lanzar la ilustración en paralelo de ${candidates.length} nodos? El proceso consumirá recursos en segundo plano.`);
        if (!confirmMassive) return;

        const BATCH_SIZE = 16;
        let processedCount = 0;

        try {
            UI.setLoading(true, `Ilustración Masiva Iniciada...`, 0, `Preparando ${candidates.length} nodos`, 0);

            for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
                const batch = candidates.slice(i, i + BATCH_SIZE);
                
                let pct = (processedCount / candidates.length) * 100;
                UI.setLoading(true, `Ilustrando ${candidates.length} nodos...`, pct, `Procesando Lote ${Math.floor(i/BATCH_SIZE)+1} (${batch.length} imágenes en paralelo)`, pct);

                await Promise.all(batch.map(node => this.illustrateNode(node.id)));
                
                processedCount += batch.length;
                
                if (i + BATCH_SIZE < candidates.length) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            UI.setLoading(true, "¡Ilustración Masiva Completada!", 100, "Guardando datos", 100);
            setTimeout(() => {
                UI.setLoading(false);
                alert(`¡Éxito! Se han ilustrado ${processedCount} nodos de tu librojuego.`);
            }, 1000);

        } catch (error) {
            console.error("Caos en Ilustración Masiva:", error);
            alert("El proceso de ilustración por lotes se detuvo debido a un error: " + error.message);
            UI.setLoading(false);
        }
    },

    async illustrateMissing() {
        const bible = Core.bookData?.visualBible || Core.book?.visualBible;
        let isValid = false;
        
        if (typeof bible === 'string') {
            isValid = bible.trim().length > 15;
        } else if (typeof bible === 'object' && bible !== null) {
            isValid = (bible.style || bible.characters || bible.places || bible.flora_fauna || bible.objects_tech || '').length > 10;
        }

        if (!isValid) {
            return alert("Debes forjar (o escribir) primero la Biblia Visual antes de ilustrar masivamente. El motor necesita este lore estético para mantener la coherencia.");
        }

        if (!Core.targetHandle) {
            return alert("Selecciona una carpeta raíz primero en el menú superior para guardar las imágenes.");
        }

        const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
        let candidates = allNodes.filter(n => !n.imageUrl && n.text && n.text.length > 10);
        
        if (candidates.length === 0) {
            return alert("Todos los nodos ya están ilustrados o no hay nodos válidos en la obra.");
        }

        const confirmMassive = confirm(`¿Estás seguro de lanzar la ilustración en paralelo de TODOS los ${candidates.length} nodos faltantes? Se procesarán en lotes de 10.`);
        if (!confirmMassive) return;

        const BATCH_SIZE = 10;
        let processedCount = 0;

        try {
            UI.setLoading(true, `Ilustración Faltantes Iniciada...`, 0, `Preparando ${candidates.length} nodos`, 0);

            for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
                const batch = candidates.slice(i, i + BATCH_SIZE);
                
                let pct = (processedCount / candidates.length) * 100;
                UI.setLoading(true, `Ilustrando ${candidates.length} nodos faltantes...`, pct, `Procesando Lote ${Math.floor(i/BATCH_SIZE)+1} (${batch.length} imágenes en paralelo)`, pct);

                await Promise.all(batch.map(node => this.illustrateNode(node.id)));
                
                processedCount += batch.length;
                
                if (i + BATCH_SIZE < candidates.length) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            UI.setLoading(true, "¡Ilustración Faltantes Completada!", 100, "Guardando datos", 100);
            setTimeout(() => {
                UI.setLoading(false);
                alert(`¡Éxito! Se han ilustrado ${processedCount} nodos faltantes de tu librojuego.`);
            }, 1000);

        } catch (error) {
            console.error("Caos en Ilustración Faltantes:", error);
            alert("El proceso se detuvo debido a un error: " + error.message);
            UI.setLoading(false);
        }
    },

    async illustrateNode(nodeId) {
        if (this.generatingNodes.has(nodeId)) {
            console.warn(`[VisualEngine] El nodo ${nodeId} ya está en proceso de ilustración.`);
            return;
        }

        const node = Core.getNode(nodeId);
        if (!node) return;

        if (!Core.targetHandle) {
            return alert("Selecciona una carpeta raíz primero en el menú superior para poder guardar la imagen en disco.");
        }

        const engine = document.getElementById('visual-engine-select')?.value || 'pollinations';

        this.generatingNodes.add(nodeId);
        
        const btn = document.getElementById('btn-illustrate-node');
        if (btn && Core.selectedNodeId === nodeId) {
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> GENERANDO EN 2º PLANO...`;
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        try {
            console.log(`[Segundo Plano] Calculando Prompt Visual para el nodo ${nodeId}...`);
            // ACTUALIZACIÓN DE REFERENCIA A AIVisual2
            const prompt = await window.AIVisual2.generateNodePrompt(nodeId);
            
            console.log(`[Segundo Plano] Ejecutando render (${engine}) para el nodo ${nodeId}...`);
            
            let blob;
            let extension = "jpg";

            if (engine === 'pollinations') {
                const dim = this.getDimensions();
                const model = document.getElementById('visual-model')?.value || 'flux';
                const safePrompt = encodeURIComponent(prompt);
                const seed = Math.floor(Math.random() * 9999999);
                let url = `https://gen.pollinations.ai/image/${safePrompt}?model=${model}&width=${dim.w}&height=${dim.h}&seed=${seed}&nologo=true`;
                
                const apiKey = window.Koreh.Core.getAuthKey();
                if (apiKey) url += `&key=${apiKey}`;

                const response = await fetch(url);
                if (!response.ok) throw new Error("API Error / Fallo en el servidor gráfico de Pollinations.");

                blob = await response.blob();
            } else if (engine === 'comfyui') {
                const comfyUrl = document.getElementById('comfyui-url')?.value || 'http://127.0.0.1:8188';
                const comfyModel = document.getElementById('comfyui-model')?.value || 'sd_xl_turbo_1.0_fp16.safetensors';
                const comfySteps = parseInt(document.getElementById('comfyui-steps')?.value) || 20;
                const comfyCfg = parseFloat(document.getElementById('comfyui-cfg')?.value) || 8.0;
                const comfySampler = document.getElementById('comfyui-sampler')?.value || 'euler';
                const comfyWidth = parseInt(document.getElementById('comfyui-width')?.value) || 1024;
                const comfyHeight = parseInt(document.getElementById('comfyui-height')?.value) || 1024;
                
                const clientId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                const seed = Math.floor(Math.random() * 10000000000);

                const promptWorkflow = {
                    "3": {
                        "class_type": "KSampler",
                        "inputs": {
                            "seed": seed,
                            "steps": comfySteps,
                            "cfg": comfyCfg,
                            "sampler_name": comfySampler,
                            "scheduler": "normal",
                            "denoise": 1,
                            "model": ["4", 0],
                            "positive": ["6", 0],
                            "negative": ["7", 0],
                            "latent_image": ["5", 0]
                        }
                    },
                    "4": {
                        "class_type": "CheckpointLoaderSimple",
                        "inputs": {
                            "ckpt_name": comfyModel
                        }
                    },
                    "5": {
                        "class_type": "EmptyLatentImage",
                        "inputs": {
                            "batch_size": 1,
                            "width": comfyWidth,
                            "height": comfyHeight
                        }
                    },
                    "6": {
                        "class_type": "CLIPTextEncode",
                        "inputs": {
                            "text": prompt,
                            "clip": ["4", 1]
                        }
                    },
                    "7": {
                        "class_type": "CLIPTextEncode",
                        "inputs": {
                            "text": "bad anatomy, blurry, watermark, worst quality, messy, deformed, ugly, missing limbs",
                            "clip": ["4", 1]
                        }
                    },
                    "8": {
                        "class_type": "VAEDecode",
                        "inputs": {
                            "samples": ["3", 0],
                            "vae": ["4", 2]
                        }
                    },
                    "9": {
                        "class_type": "SaveImage",
                        "inputs": {
                            "filename_prefix": "librojuego_gen",
                            "images": ["8", 0]
                        }
                    }
                };

                blob = await new Promise((resolve, reject) => {
                    const wsUrl = comfyUrl.replace("http://", "ws://").replace("https://", "wss://") + `/ws?clientId=${clientId}`;
                    const ws = new WebSocket(wsUrl);
                    
                    ws.onopen = async () => {
                        try {
                            const response = await fetch(`${comfyUrl}/prompt`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ prompt: promptWorkflow, client_id: clientId })
                            });

                            if (!response.ok) throw new Error(`ERROR ComfyUI: ${response.status}`);

                            const responseData = await response.json();
                            const promptId = responseData.prompt_id;

                            ws.onmessage = async (event) => {
                                const message = JSON.parse(event.data);
                                
                                if (message.type === 'executed' && message.data.prompt_id === promptId) {
                                    const outputImages = message.data.output.images;
                                    if (outputImages && outputImages.length > 0) {
                                        const imageObj = outputImages[0];
                                        const imageUrl = `${comfyUrl}/view?filename=${imageObj.filename}&subfolder=${imageObj.subfolder}&type=${imageObj.type}`;
                                        
                                        const imgResponse = await fetch(imageUrl);
                                        if (!imgResponse.ok) throw new Error("Fallo al descargar la imagen final desde ComfyUI.");
                                        const imgBlob = await imgResponse.blob();
                                        
                                        ws.close();
                                        resolve(imgBlob);
                                    } else {
                                        ws.close();
                                        reject(new Error("ComfyUI no devolvió imágenes en el output."));
                                    }
                                }
                            };
                        } catch (err) {
                            ws.close();
                            reject(err);
                        }
                    };

                    ws.onerror = () => {
                        reject(new Error("Error conectando al WebSocket de ComfyUI. Verifica que ComfyUI esté ejecutándose en la URL especificada y permita el acceso CORS (--cors-header *)."));
                    };
                });
            }

            // PROCESAR Y ESCALAR LA IMAGEN A 1920PX
            console.log(`[Segundo Plano] Mejorando y escalando a 1920px (Conservando formato)...`);
            blob = await window.ImageProcessor.process(blob, 1920, 0.15); // Leve sharpening
            extension = "jpg"; // Forzamos JPG de alta calidad

            console.log(`[Segundo Plano] Guardando imagen generada en disco (${nodeId})...`);
            const filename = `IMG_${nodeId}_${Date.now()}.${extension}`;
            const fileHandle = await Core.targetHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            node.imageUrl = filename;
            node.imagePrompt = prompt;
            node._cachedImageUrl = URL.createObjectURL(blob); 

            Core.scheduleSave();

            if (typeof Canvas !== 'undefined') Canvas.renderNodes();
            if (typeof Editor !== 'undefined' && Core.selectedNodeId === nodeId) {
                Editor.loadNode(nodeId);
            }
            
            console.log(`[Segundo Plano] ¡Éxito! Imagen del nodo ${nodeId} lista.`);

        } catch (error) {
            console.error("Caos Visual en hilo secundario:", error);
            alert(`Fallo en 2º plano al generar la imagen del nodo ${nodeId}:\n${error.message}`);
        } finally {
            this.generatingNodes.delete(nodeId);
            
            if (Core.selectedNodeId === nodeId) {
                const currentBtn = document.getElementById('btn-illustrate-node');
                if (currentBtn) {
                    currentBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ILUSTRAR ESCENA`;
                    currentBtn.disabled = false;
                    currentBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        }
    },

    // ========================================================
    // MOTOR KOREH COLLAGE NATIVO (BYPASS SILENOS 4 FS)
    // ========================================================
    async illustrateNodeCollage(nodeId) {
        if (this.generatingNodes && this.generatingNodes.has(nodeId)) {
            console.warn(`[VisualEngine] El nodo ${nodeId} ya está en proceso.`);
            return;
        }

        const node = Core.getNode(nodeId);
        if (!node || !node.text) {
            return alert("El nodo no existe o no tiene texto narrativo para ilustrar.");
        }

        if (!Core.targetHandle) {
            return alert("Selecciona la carpeta raíz de tu proyecto Librojuego primero.");
        }

        // Validación y bypass nativo Silenos 4
        if (!Core.rootHandle) {
            return alert("Error crítico: El entorno no ha montado la raíz de Silenos (rootHandle no detectado).");
        }

        this.generatingNodes.add(nodeId);

        const btnEditor = document.getElementById('btn-illustrate-node-collage');
        if (btnEditor && Core.selectedNodeId === nodeId) {
            btnEditor.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> CREANDO COLLAGE...`;
            btnEditor.disabled = true;
            btnEditor.classList.add('opacity-50', 'cursor-not-allowed');
        }

        try {
            console.log(`[Koreh] Iniciando Collage para nodo ${nodeId}...`);
            
            let korehDir = null;
            
            try { korehDir = await Core.rootHandle.getDirectoryHandle('Koreh'); } catch(e) {}
            if (!korehDir) {
                try { korehDir = await Core.rootHandle.getDirectoryHandle('koreh'); } catch(e) {}
            }
            if (!korehDir) {
                try { korehDir = await Core.targetHandle.getDirectoryHandle('Koreh'); } catch(e) {}
            }
            if (!korehDir) {
                try { korehDir = await Core.targetHandle.getDirectoryHandle('koreh'); } catch(e) {}
            }

            if (!korehDir) {
                throw new Error("No se encontró la carpeta 'Koreh' (o 'koreh') ni en la raíz de Silenos ni dentro de la carpeta de tu proyecto.");
            }
            
            if (typeof window.KorehCollage === 'undefined') {
                try {
                    const scriptHandle = await korehDir.getFileHandle('koreh.collage.js');
                    const scriptFile = await scriptHandle.getFile();
                    const scriptText = await scriptFile.text();
                    
                    const scriptEl = document.createElement('script');
                    scriptEl.textContent = scriptText;
                    document.head.appendChild(scriptEl);
                    console.log("[VisualEngine] Librería KorehCollage inyectada en caliente.");
                } catch(e) {
                    throw new Error(`Carpeta Koreh encontrada, pero falló al leer 'koreh.collage.js'. Detalle: ${e.message}`);
                }
            }

            let galeriaHandle = null;
            let availableAssets = [];
            try {
                try {
                    galeriaHandle = await korehDir.getDirectoryHandle('Galeria');
                } catch (e) {
                    galeriaHandle = await korehDir.getDirectoryHandle('galeria');
                }

                for await (const entry of galeriaHandle.values()) {
                    if (entry.kind === 'file' && entry.name.match(/\.(png|svg|jpe?g)$/i)) {
                        availableAssets.push(entry.name);
                    }
                }
            } catch (e) {
                console.warn("[VisualEngine] No se pudo acceder directamente a la carpeta Galería dentro de Koreh. Asegúrate de que exista y se llame 'Galeria' o 'galeria'.");
            }

            if (availableAssets.length === 0) {
                throw new Error("La Galería en 'Koreh/Galeria' está vacía o no existe. Añade gráficos para que Koreh pueda componer.");
            }

            const llmCallerWrapper = async (sys, usr) => {
                return await window.Koreh.Text.generateWithRetry(sys, usr, {
                    model: 'nova-fast', 
                    jsonMode: true,
                    temperature: 0.8
                }, (d) => d && d.elements && Array.isArray(d.elements));
            };

            const customAssetLoader = async (src) => {
                if (!galeriaHandle) throw new Error("Acceso a Galería restringido en ejecución.");
                const fileHandle = await galeriaHandle.getFileHandle(src);
                const file = await fileHandle.getFile();
                const url = URL.createObjectURL(file);
                
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        URL.revokeObjectURL(url); 
                        resolve(img);
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(url);
                        reject(new Error(`Corrupción al cargar el gráfico: ${src}`));
                    };
                    img.src = url;
                });
            };

            const dim = this.getDimensions();

            let blob = await window.KorehCollage.generate(node.text, {
                llmCaller: llmCallerWrapper,
                assetLoader: customAssetLoader, 
                availableAssets: availableAssets,
                width: dim.w,
                height: dim.h
            });

            // PROCESAR Y ESCALAR EL COLLAGE A 1920PX
            console.log(`[Koreh] Mejorando y escalando a 1920px (Conservando formato)...`);
            blob = await window.ImageProcessor.process(blob, 1920, 0.15);
            const extension = "jpg";

            const filename = `COLLAGE_${nodeId}_${Date.now()}.${extension}`;
            
            const fileHandle = await Core.targetHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            node.imageUrl = filename;
            node.imagePrompt = "Collage procedural generado por Koreh Engine.";
            node._cachedImageUrl = URL.createObjectURL(blob); 

            if (Core.scheduleSave) Core.scheduleSave();

            if (typeof Canvas !== 'undefined') Canvas.renderNodes();
            if (typeof Editor !== 'undefined' && Core.selectedNodeId === nodeId) {
                Editor.loadNode(nodeId);
            }
            
            console.log(`[Koreh] ¡Éxito! Collage del nodo ${nodeId} almacenado.`);

        } catch (error) {
            console.error("Caos Visual en hilo Koreh:", error);
            alert(`Fallo al generar Collage Koreh del nodo ${nodeId}:\n${error.message}`);
        } finally {
            this.generatingNodes.delete(nodeId);
            
            if (Core.selectedNodeId === nodeId) {
                const currentBtn = document.getElementById('btn-illustrate-node-collage');
                if (currentBtn) {
                    currentBtn.innerHTML = `<i class="fa-solid fa-shapes"></i> COLLAGE KOREH`;
                    currentBtn.disabled = false;
                    currentBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        }
    }
};