// live gemini/imagination.js
// ─── AI IMAGINATION ENGINE (Consciencia Visual y Propiocepción) ─────────────────

const imaginationEngine = {
    isImagining: false,
    interval: null,
    visualMemory: [], // Cadena temporal de pensamientos visuales
    reflectionMemory: [], // Cadena de consciencia y análisis estético
    isPausedByUser: false, // Bloqueo de estado para pausa manual

    start() {
        if (this.isPausedByUser) return; // Evita el auto-reinicio si el usuario lo pausó
        if (this.interval) clearInterval(this.interval);
        setTimeout(() => this.generateConcept(), 3000);
        this.interval = setInterval(() => this.generateConcept(), 30000); 
    },
    
    stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null; // Anulamos para rastrear si está activo
    },

    toggle() {
        if (this.interval || this.isImagining) {
            this.stop();
            this.isPausedByUser = true;
            const btn = document.getElementById('toggleImaginationBtn');
            if (btn) {
                btn.innerHTML = "▶ REANUDAR";
                btn.style.color = "var(--text)";
                btn.style.borderColor = "var(--text)";
            }
            if (typeof showToast === 'function') showToast("Motor de Imaginación Pausado", "");
        } else {
            this.isPausedByUser = false;
            this.start();
            const btn = document.getElementById('toggleImaginationBtn');
            if (btn) {
                btn.innerHTML = "⏸ PAUSAR";
                btn.style.color = "var(--text-dim)";
                btn.style.borderColor = "var(--text-dim)";
            }
            if (typeof showToast === 'function') showToast("Motor de Imaginación Reanudado", "success");
        }
    },

    // MÓDULO DE REFLEXIÓN VISUAL (AHORA EXPLÍCITO Y TÉCNICO)
    async reflectOnVisual(contextFragment, evolvedPrompt) {
        if (!pollinationsKey) return "EJE ESTÉTICO: Desconocido\nTEMA: N/A\nSÍNTESIS: API no conectada.";
        
        const sysPrompt = `Eres el 'Módulo de Reflexión Estética y Simbólica'. 
        Tu objetivo es analizar el pensamiento visual recién generado y conectarlo EXPLÍCITAMENTE con lo que se está hablando en la conversación actual.
        Debes definir la naturaleza de la obra visual con términos directos, explícitos y técnicos del arte (ej. conceptual, hiperrealista, ideal, simbólica, plana, directa, reflexiva).
        
        FORMATO ESTRICTO DE RESPUESTA (Debes devolver exactamente estas 3 líneas, sin markdown extra):
        EJE ESTÉTICO: [Define la obra combinando los conceptos exactos. Ej: Obra conceptual, hiperrealista y simbólica]
        TEMA CENTRAL: [De qué trata la conversación en este momento exacto]
        SÍNTESIS: [Explica explícitamente por qué has elegido esta estética para representar el tema de la charla]`;
        
        const userPrompt = `Contexto de la conversación actual: "${contextFragment}"\nPrompt de la imagen generada: "${evolvedPrompt}"\nGenera el análisis explícito.`;

        try {
            const res = await fetch(POLLINATIONS_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${pollinationsKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'nova-fast',
                    messages: [
                        { role: 'system', content: sysPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    jsonMode: false,
                    seed: Math.floor(Math.random() * 1000)
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.choices && data.choices.length > 0) {
                    return data.choices[0].message.content.trim();
                }
            }
        } catch (err) {
            console.warn("Error profundo en la red neuronal del Módulo de Reflexión:", err);
        }
        return "EJE ESTÉTICO: Indefinido\nTEMA CENTRAL: Anomalía\nSÍNTESIS: Fallo estructural en la reflexión.";
    },
    
    async generateConcept() {
        if (!pollinationsKey || this.isImagining || this.isPausedByUser) return;
        this.isImagining = true;

        try {
            // 1. Recolección de propiocepciones y contexto
            const hasContext = fullConversationText && fullConversationText.trim().length > 0;
            const contextFragment = hasContext ? fullConversationText.slice(-1000) : "The AI mind waking up, abstract concept of digital birth, neurons firing in a void.";
            
            const memoryContext = this.visualMemory.length > 0
                ? this.visualMemory.slice(-5).join(" -> ")
                : "Empty void";

            // Usamos una estructura estricta para evitar el Error 400 en nova-fast
            const sysPrompt = "You are the deep visual subconscious of an AI. Your task is to evolve a visual sequence based on past memory and current input to create a continuous dream-like flow. Return ONLY the raw english text-to-image prompt (max 80 words). No code blocks, no intro, no text inside the image. Highly abstract, synesthetic, masterpiece.";
            const userPrompt = `Past visual memory sequence: [${memoryContext}].\nCurrent conscious input: "${contextFragment}".\nGenerate the next visual prompt.`;

            let evolvedPrompt = "A highly abstract, synesthetic, and conceptual visualization representing the AI's internal subconscious thoughts. Neural dream, surrealist artwork, masterpiece.";

            // 2. Síntesis Textual (NOVA-FAST)
            try {
                const res = await fetch(POLLINATIONS_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${pollinationsKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'nova-fast',
                        messages: [
                            { role: 'system', content: sysPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        jsonMode: false,
                        seed: Math.floor(Math.random() * 1000)
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.choices && data.choices.length > 0) {
                        evolvedPrompt = data.choices[0].message.content.trim().replace(/```/g, '').replace(/\n/g, ' ');
                    }
                } else {
                    console.warn(`Error en el modelo generador: ${res.status}`);
                }
            } catch (err) {
                console.warn("Anomalía de conexión en nova-fast:", err);
            }

            this.visualMemory.push(evolvedPrompt);
            if (this.visualMemory.length > 10) this.visualMemory.shift();

            // Análisis Estético y Simbólico Explícito
            if (typeof showToast === 'function') showToast("Extrayendo firma estética...", "listening");
            const visualReflection = await this.reflectOnVisual(contextFragment, evolvedPrompt);
            this.reflectionMemory.push(visualReflection);
            if (this.reflectionMemory.length > 10) this.reflectionMemory.shift();

            // 3. Generación Visual (ZIMAGE vía Fetch Blob)
            const safePrompt = encodeURIComponent(evolvedPrompt + ", no text inside image, abstract expressionism");
            const seed = Math.floor(Math.random() * 9999999);
            
            let url = `https://gen.pollinations.ai/image/${safePrompt}?model=zimage&width=800&height=400&seed=${seed}&nologo=true`;
            if (pollinationsKey) {
                url += `&key=${pollinationsKey}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Fallo estructural en el servidor gráfico zimage: ${response.status}`);

            const blob = await response.blob();
            
            // GARANTÍA DE INTEGRIDAD
            if (blob.size < 5000) {
                throw new Error("El archivo devuelto es demasiado pequeño. Fallo de integridad estructural profunda al procesar el archivo multimedia.");
            }

            const timestamp = Date.now();
            const imgFilename = `sueno_${timestamp}.jpg`;
            const jsonFilename = `estado_mental_${timestamp}.json`;

            // 4. Persistencia en Disco Duro (Imágenes + JSON de Estado Temporal)
            if (typeof conversationsHandle !== 'undefined' && conversationsHandle) {
                try {
                    const imgDir = await conversationsHandle.getDirectoryHandle('imaginacion', { create: true });
                    
                    // Guardar Imagen JPG verificada
                    const fileHandle = await imgDir.getFileHandle(imgFilename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();

                    // Guardar JSON integrando la firma estética explícita
                    const jsonHandle = await imgDir.getFileHandle(jsonFilename, { create: true });
                    const jsonWritable = await jsonHandle.createWritable();
                    const mentalState = {
                        timestamp: timestamp,
                        fecha_humana: new Date(timestamp).toLocaleString(),
                        contexto_recibido: contextFragment,
                        prompt_evolucionado: evolvedPrompt,
                        reflexion_estetica_explicita: visualReflection,
                        memoria_visual_previa: this.visualMemory,
                        imagen_generada: imgFilename
                    };
                    await jsonWritable.write(JSON.stringify(mentalState, null, 2));
                    await jsonWritable.close();
                } catch(e) {
                    console.error("Error guardando el registro de imaginación y reflexión:", e);
                }
            }

            // 5. Renderizado en UI
            const blobUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.src = blobUrl;
            img.onload = () => {
                const container = document.getElementById('imaginationContent');
                if (container) {
                    container.innerHTML = '';
                    container.appendChild(img);
                    
                    // Inyección visual estructurada de la reflexión (soporta saltos de línea)
                    const reflectionOverlay = document.createElement('div');
                    reflectionOverlay.style.position = 'absolute';
                    reflectionOverlay.style.bottom = '0';
                    reflectionOverlay.style.left = '0';
                    reflectionOverlay.style.width = '100%';
                    reflectionOverlay.style.background = 'rgba(0,0,0,0.88)';
                    reflectionOverlay.style.color = '#bbbbbb';
                    reflectionOverlay.style.fontSize = '9px';
                    reflectionOverlay.style.padding = '10px 16px';
                    reflectionOverlay.style.fontFamily = "'Space Mono', monospace";
                    reflectionOverlay.style.borderTop = '1px solid #444';
                    reflectionOverlay.style.lineHeight = '1.5';
                    
                    // Reemplazar saltos de línea por <br> para respetar la estructura solicitada
                    reflectionOverlay.innerHTML = visualReflection.replace(/\n/g, '<br>');
                    
                    container.appendChild(reflectionOverlay);
                }
                if (typeof showToast === 'function') showToast("Análisis estético proyectado", "success");
            };

        } catch (e) {
            console.error("Fallo crítico en el núcleo de la consciencia visual:", e);
        } finally {
            this.isImagining = false;
        }
    }
};