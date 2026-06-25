/**
 * BOOK GEMINI STANDALONE CORE
 * Motor de Ensamblado de Libros en Serie con Relevo XML, Soporte de Retomas y Streaming Directo con Gemini
 * VERSIÓN REFACTORIZADA 5.1 - ESPERAS ESTRUCTURALES DE 3 SEGUNDOS Y BLINDAJE DE CONTINUIDAD
 */
window.GeminiBookAssembler = {
    session: null,
    abortController: null, // Evita peticiones huérfanas en segundo plano

    // Utilidad interna para forzar retrasos asíncronos controlados (Rate Limiting)
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Conector Avanzado con Gemini de Google usando Server-Sent Events (SSE) y Reintentos Exponenciales
    async callGeminiAPI(systemPrompt, userPrompt, jsonMode = false, onChunk = null) {
        const apiKey = document.getElementById("gemini-book-api-key")?.value.trim() || localStorage.getItem('koreh_gemini_book_api_key');
        if (!apiKey) {
            throw new Error("API Key de Gemini no configurada en los parámetros de la obra.");
        }

        const model = "gemini-3.1-flash-lite";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

        let finalUserPrompt = userPrompt;
        if (jsonMode) {
            finalUserPrompt += "\nOutput strictly valid pure JSON raw format without codeblocks.";
        }

        const contents = [];
        if (systemPrompt) {
            contents.push({ role: "user", parts: [{ text: `System Instructions: ${systemPrompt}` }] });
            contents.push({ role: "model", parts: [{ text: "Understood. I will follow those instructions precisely." }] });
        }
        contents.push({ role: "user", parts: [{ text: finalUserPrompt }] });

        // Cancelar cualquier proceso previo idéntico para evitar colisiones
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        const MAX_RETRIES = 5;
        let attempt = 0;
        let delay = 2000;
        let bufferSSE = ""; // Búfer intermedio para mitigar fragmentación de tokens JSON/XML

        while (attempt < MAX_RETRIES) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: contents }),
                    signal: this.abortController.signal
                });

                if (!res.ok) {
                    const errorData = await res.text();
                    // Errores no recuperables de autenticación o saldo: Abortar inmediatamente sin quemar ciclos
                    if (res.status === 401 || res.status === 402 || res.status === 403) {
                        throw new Error(`FALLO_CRITICO_AUTENTICACION (Status ${res.status}): ${errorData}`);
                    }
                    throw new Error(`Error HTTP ${res.status}: ${errorData}`);
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let fullText = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    bufferSSE += decoder.decode(value, { stream: true });
                    const lines = bufferSSE.split('\n');
                    
                    // Preservar la última línea si no está completa (fragmentación de red)
                    bufferSSE = lines.pop() || "";
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6).trim();
                            if (dataStr === '[DONE]' || !dataStr) continue;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                                    const textChunk = data.candidates[0].content.parts[0].text;
                                    fullText += textChunk;
                                    if (onChunk) onChunk(textChunk, fullText);
                                }
                            } catch (e) {
                                // Fragmento JSON corrupto temporalmente por corte de línea, se ignora en el búfer deslizante
                            }
                        }
                    }
                }
                
                this.abortController = null;
                return fullText;

            } catch (err) {
                if (err.name === 'AbortError') {
                    throw new Error("Compilación abortada explícitamente por el usuario o por cambio de contexto.");
                }
                if (err.message.includes("FALLO_CRITICO_AUTENTICACION")) {
                    throw err;
                }
                attempt++;
                if (attempt >= MAX_RETRIES) {
                    throw new Error(`Fallo definitivo en Gateway de Gemini tras ${MAX_RETRIES} intentos: ${err.message}`);
                }
                this.logTerminal(`Error de conexión (${err.message}). Reintentando (${attempt}/${MAX_RETRIES}) en ${delay/1000}s...`, "warn");
                await new Promise(r => setTimeout(r, delay));
                delay *= 2; 
            }
        }
    },

    cleanJSON(str) {
        if (!str) return "{}";
        let clean = str.replace(/```json/g, "").replace(/```/g, "").trim();
        const firstOpen = clean.indexOf("{");
        const lastClose = clean.lastIndexOf("}");
        if (firstOpen !== -1 && lastClose !== -1) {
            return clean.substring(firstOpen, lastClose + 1);
        }
        return clean;
    },

    extractText(response) {
        // Extracción XML robusta con tolerancia a la omisión eventual de tags por la IA
        const match = response.match(/<texto>([\s\S]*?)<\/texto>/i);
        if (match) return match[1].trim();
        
        // Limpieza de marcadores markdown residuales si fallaron los tags XML
        return response.replace(/^```[\s\S]*?\n/gi, '').replace(/```$/g, '').trim();
    },

    mergeText(oldT, newT) {
        if (!oldT) return newT.trim();
        return oldT.trimEnd() + "\n\n" + newT.trimStart();
    },

    // ALGORITMO DE CONEXIÓN ORGÁNICA (Evita el efecto Frankenstein entre capítulos)
    async generateOrganicConnector(textA, textB, styleStyle) {
        this.logTerminal("Temporizando canal... Esperando 3 segundos de cortesía antes del conector...");
        await this.sleep(3000); // Espera obligatoria antes de invocar la costura intermedia

        this.logTerminal("Tejiendo costura de transición fluida...");
        const sysConnector = "Eres un novelista experto en puentes narrativos. Tu misión es armonizar el salto de espacio, tiempo o temperatura emocional entre dos fragmentos sin ser redundante.";
        let userConnector = `ESTILO LITERARIO DE LA OBRA: ${styleStyle}\n\n`;
        userConnector += `ÚLTIMO PÁRRAFO DEL CAPÍTULO ANTERIOR:\n"...${textA.slice(-800)}"\n\n`;
        userConnector += `PRIMER PÁRRAFO DEL NUEVO CAPÍTULO:\n"${textB.slice(0, 800)}..."\n\n`;
        userConnector += `TAREA: Escribe 1 o 2 párrafos de transición fluida que unan orgánicamente ambos bloques. Envuelve el resultado en <texto></texto>.`;

        try {
            const res = await this.callGeminiAPI(sysConnector, userConnector, false, null);
            return this.extractText(res);
        } catch (e) {
            this.logTerminal("Aviso: No se pudo generar el conector sofisticado. Usando costura estándar.", "warn");
            return "";
        }
    },

    logTerminal(msg, type = "info") {
        const term = document.getElementById("gemini-book-terminal");
        if (!term) return;

        const div = document.createElement("div");
        if (type === "error") {
            div.className = "text-red-500 font-bold";
        } else if (type === "success") {
            div.className = "text-emerald-400 font-bold";
        } else if (type === "warn") {
            div.className = "text-amber-400";
        } else {
            div.className = "text-green-300";
        }

        const timeStr = new Date().toLocaleTimeString();
        div.innerText = `> [${timeStr}] ${msg}`;
        
        term.appendChild(div);
        term.scrollTop = term.scrollHeight;
    },

    async startProduction() {
        const savedKey = localStorage.getItem('koreh_gemini_book_api_key');
        if (savedKey && document.getElementById("gemini-book-api-key")) {
            document.getElementById("gemini-book-api-key").value = savedKey;
        }

        if (!window.mainCrono || !window.mainCrono.data || !window.mainCrono.data.events || window.mainCrono.data.events.length === 0) {
            return alert("No hay eventos cargados en la cronología activa. Primero crea o importa un timeline.");
        }

        const btn = document.getElementById("btn-gemini-book-generate");
        const isResume = btn.classList.contains("btn-resume");

        // Lock de UI para evitar mutaciones accidentales en caliente durante el bucle secuencial
        if (window.app) {
            this.toggleUINodesLock(true);
        }

        if (!isResume || !this.session) {
            const events = JSON.parse(JSON.stringify(window.mainCrono.data.events)).sort((a, b) => (a.time || 0) - (b.time || 0));
            this.session = {
                title: document.getElementById("gemini-book-title").value || "Novela Nexus",
                author: document.getElementById("gemini-book-author").value || "Manuel Rodsua",
                style: document.getElementById("gemini-book-style").value || "Prosa madura, fluida",
                events: events,
                currentIndex: 0,
                finalText: "",
                ledger: [], // Libro Mayor de intenciones consumadas
                plan: null
            };
            this.logTerminal("Iniciando nueva compilación en serie...");
        } else {
            this.logTerminal("Retomando compilación interrumpida desde el último punto seguro...");
        }

        btn.disabled = true;
        btn.innerText = "PROCESANDO MANUSCRITO...";
        
        const statusUi = document.getElementById("gemini-book-engine-status");
        statusUi.innerText = "GENERANDO";
        statusUi.className = "font-bold text-rose-500 animate-pulse";

        try {
            await this.runPipelineLoop();
        } catch (err) {
            console.error(err);
            this.logTerminal("Error crítico en la ejecución del pipeline: " + err.message, "error");
            
            btn.disabled = false;
            btn.innerText = "RETOMAR CONSTRUCCIÓN";
            btn.classList.add("btn-resume");
            
            statusUi.innerText = "PAUSADO";
            statusUi.className = "font-bold text-amber-500";
            this.toggleUINodesLock(false);
        }
    },

    toggleUINodesLock(lock) {
        const inputs = ['gemini-book-title', 'gemini-book-author', 'gemini-book-style', 'gemini-book-api-key'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = lock;
        });
    },

    async autoSaveIntermediateBackup() {
        // Salvaguarda persistente en caliente dentro del repositorio local para mitigar pérdidas por cierres fortuitos
        if (!window.app || !window.app.targetHandle) return;
        try {
            const cleanTitle = this.session.title.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `backup_manuscript_${cleanTitle}.json`;
            const fileHandle = await window.app.targetHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify({
                currentIndex: this.session.currentIndex,
                ledger: this.session.ledger,
                plan: this.session.plan,
                finalText: this.session.finalText,
                timestamp: new Date().toISOString()
            }, null, 2));
            await writable.close();
            this.logTerminal("Punto de control e historial guardados a disco de forma segura.", "info");
        } catch (e) {
            console.warn("No se pudo realizar el autoguardado intermedio en disco:", e.message);
        }
    },

    async runPipelineLoop() {
        const s = this.session;
        const total = s.events.length;

        if (!s.plan) {
            this.logTerminal("Temporizando canal... Esperando 3 segundos antes de trazar el Plan de Enfoque...");
            await this.sleep(3000); // Espera inicial obligatoria

            this.logTerminal("Analizando cronología completa para trazar el Plan de Enfoque...");
            const systemPlan = "Eres un director editorial y analista literario. Tu objetivo es estudiar la cronología suministrada y trazar un plan estructural unificado de partes y capítulos.";
            const userPlan = `Título: ${s.title}\nAutor: ${s.author}\nEstilo: ${s.style}\nCronología Estructural:\n${JSON.stringify(s.events, null, 2)}`;
            
            const planDiv = document.createElement("div");
            planDiv.className = "text-gray-400 italic mb-2 border-l border-gray-700 pl-2";
            document.getElementById("gemini-book-terminal").appendChild(planDiv);

            const rawPlan = await this.callGeminiAPI(systemPlan, userPlan, false, (chunk, acc) => {
                planDiv.innerText = acc;
                document.getElementById("gemini-book-terminal").scrollTop = document.getElementById("gemini-book-terminal").scrollHeight;
            });
            s.plan = rawPlan;
            this.logTerminal("Plan de Enfoque de la obra consolidado con éxito.", "success");
            await this.autoSaveIntermediateBackup();
        }

        for (let i = s.currentIndex; i < total; i++) {
            const ev = s.events[i];
            const escenaTitulo = ev.description || "Escena sin título";
            this.logTerminal(`Procesando Evento ${i + 1}/${total}: ${escenaTitulo}...`);

            // --- EXTRACCIÓN ROBUSTA DE PERSONAJES POR COHERENCIA DE RED ---
            let charactersContext = "No hay descripciones específicas de personajes registradas para este nodo.";
            if (window.app && window.app.tramas) {
                // Comparación flexible insensible a mayúsculas y acentos para evitar el descarte de elenco
                const normalizedEvDesc = escenaTitulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const omegaNode = window.app.tramas.find(n => {
                    const normName = n.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return normalizedEvDesc.includes(normName) || normName.includes(normalizedEvDesc);
                });

                if (omegaNode && omegaNode.dataRefs && omegaNode.dataRefs.length > 0) {
                    const descriptions = [];
                    omegaNode.dataRefs.forEach(refId => {
                        const dbItem = window.app.items.find(item => item.name === refId);
                        if (dbItem && dbItem.data && dbItem.data.type === "Personaje") {
                            const name = dbItem.data.name || "Desconocido";
                            const visualDesc = dbItem.data.visualDesc || "Sin descripción";
                            const lore = dbItem.data.desc || "Sin lore";
                            descriptions.push(`- PERSONAJE: ${name}. Rasgos Físicos/Rol: ${visualDesc}. Lore: ${lore}`);
                        }
                    });
                    if (descriptions.length > 0) {
                        charactersContext = descriptions.join("\n");
                    }
                }
            }

            // --- PROCESAMIENTO GRANULAR POR LATIDOS (BEATS / MOMENTS) ---
            const momentsToProcess = (ev.moments && ev.moments.length > 0) ? ev.moments : [{ text: ev.description }];
            let accumulatedChapterText = "";

            for (let mIdx = 0; mIdx < momentsToProcess.length; mIdx++) {
                const moment = momentsToProcess[mIdx];
                
                this.logTerminal(`Temporizando canal... Esperando 3 segundos reglamentarios antes de redactar latido ${mIdx + 1}...`);
                await this.sleep(3000); // Espera obligatoria de 3 segundos entre llamadas secuenciales del bucle literario

                this.logTerminal(`-> Redactando plano secuencial ${mIdx + 1}/${momentsToProcess.length}...`);

                // VENTANA DESLIZANTE SENSATA PARA EL LEDGER: Evita el desborde de tokens manteniendo solo los últimos 6 hitos
                const slidingLedger = s.ledger.slice(-6).join("\n") || "Inicio de la obra.";

                const sysWriter = "Eres un novelista de élite. Escribes prosa inmersiva, literaria y madura. Evitas redundancias y avanzas la trama basándote en los antecedentes permitidos.";
                
                let userWriter = `PLAN EDITORIAL GLOBAL: ${s.plan}\n\n`;
                userWriter += `ANTECEDENTES INMEDIATOS (LEDGER DESLIZANTE):\n${slidingLedger}\n\n`;
                if (accumulatedChapterText) {
                    userWriter += `TEXTO PREVIO DEL MISMO CAPÍTULO:\n"...${accumulatedChapterText.slice(-1200)}"\n\n`;
                }
                userWriter += `ELENCO DE PERSONAJES PRESENTES EN EL PLANO:\n${charactersContext}\n\n`;
                userWriter += `ESTILO LITERARIO EXIGIDO: ${s.style}\n\n`;
                userWriter += `ACCIÓN EXACTA A REDACTAR AHORA (MOMENTO): "${moment.text}"\n`;
                if (moment.visualPrompt) userWriter += `RASGOS VISUALES CINE EN ENTORNO: "${moment.visualPrompt}"\n`;
                userWriter += `\nINSTRUCCIONES DE RELEVO:\n`;
                userWriter += `1. Avanza cronológicamente. Prohibido repetir la misma acción o diálogo ya narrado en el texto previo.\n`;
                userWriter += `2. Si hay personajes en escena, describe sutilmente sus movimientos o lenguaje corporal basándote en su elenco.\n`;
                userWriter += `3. Envuelve tu respuesta literaria pura estrictamente dentro de las etiquetas <texto> y </texto>.`;

                let draftBeat = "";
                let attempt = 0;
                const maxRetries = 3;
                let successBeat = false;

                const blockDiv = document.createElement("div");
                blockDiv.className = "bg-gray-800 p-4 border-l-2 border-rose-500 my-2 text-gray-100 rounded-sm";
                document.getElementById("gemini-book-terminal").appendChild(blockDiv);

                while (attempt < maxRetries && !successBeat) {
                    attempt++;
                    try {
                        const response = await this.callGeminiAPI(sysWriter, userWriter, false, (chunk, acc) => {
                            blockDiv.innerHTML = `<strong>[STREAM BEAT ${mIdx + 1}] ${escenaTitulo}</strong><br><br>${acc.replace(/\n/g, "<br>")}`;
                            document.getElementById("gemini-book-terminal").scrollTop = document.getElementById("gemini-book-terminal").scrollHeight;
                        });

                        draftBeat = this.extractText(response);
                        if (draftBeat.length > 30) {
                            successBeat = true;
                        } else {
                            this.logTerminal("Latido devuelto demasiado corto, reintentando...", "warn");
                        }
                    } catch (fetchErr) {
                        this.logTerminal(`Error en intento de latido ${attempt}: ${fetchErr.message}`, "warn");
                        await new Promise(r => setTimeout(r, 2000 * attempt));
                    }
                }

                if (!successBeat) {
                    throw new Error(`Fallo definitivo en la construcción del latido ${mIdx + 1} de la escena [${escenaTitulo}].`);
                }

                accumulatedChapterText = this.mergeText(accumulatedChapterText, draftBeat);
                blockDiv.innerHTML = `<strong>[LATIDO COMPILADO ${mIdx + 1}] ${escenaTitulo}</strong><br><br>${draftBeat.replace(/\n/g, "<br>")}`;

                // Registrar hito específico consumado en el Libro Mayor
                s.ledger.push(`- Consumado en [${escenaTitulo}]: ${moment.text.substring(0, 120)}...`);
            }

            // APLICAR TRANSICIÓN ORGÁNICA: Unir el capítulo nuevo con el corpus general suavizando costuras (incluye su propio sleep interno)
            if (s.finalText && accumulatedChapterText) {
                const conector = await this.generateOrganicConnector(s.finalText, accumulatedChapterText, s.style);
                if (conector) {
                    s.finalText = s.finalText.trimEnd() + "\n\n" + conector.trim() + "\n\n### CAPÍTULO: " + escenaTitulo + "\n\n" + accumulatedChapterText;
                } else {
                    s.finalText = this.mergeText(s.finalText, "### CAPÍTULO: " + escenaTitulo + "\n\n" + accumulatedChapterText);
                }
            } else {
                s.finalText = this.mergeText(s.finalText, "### CAPÍTULO: " + escenaTitulo + "\n\n" + accumulatedChapterText);
            }
            
            s.currentIndex = i + 1;
            this.updateProgressUI();
            await this.autoSaveIntermediateBackup(); // Persistencia ante apagones o caídas
        }

        this.logTerminal("¡PROCESO FINALIZADO CON ÉXITO! Libro completamente ensamblado.", "success");
        
        const btnGen = document.getElementById("btn-gemini-book-generate");
        btnGen.disabled = false;
        btnGen.innerText = "COMPILAR CON GEMINI";
        btnGen.classList.remove("btn-resume");
        
        document.getElementById("btn-gemini-book-download").disabled = false;
        
        const finalStatus = document.getElementById("gemini-book-engine-status");
        finalStatus.innerText = "FINALIZADO";
        finalStatus.className = "font-bold text-green-500";
        this.toggleUINodesLock(false);
    },

    updateProgressUI() {
        if (!this.session) return;
        const current = this.session.currentIndex;
        const total = this.session.events.length;
        const pct = Math.floor((current / total) * 100) || 0;
        document.getElementById("gemini-book-progress-text").innerText = `${current} / ${total}`;
        document.getElementById("gemini-book-progress-bar").style.width = `${pct}%`;
    },

    downloadBook() {
        if (!this.session || !this.session.finalText) return;
        const content = `TITULO: ${this.session.title}\nAUTOR: ${this.session.author}\n\n${this.session.finalText}`;
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        const safeTitle = this.session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        a.download = `Libro_Gemini_${safeTitle}.txt`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Carga e inicialización automática de tokens guardados en el ecosistema
window.addEventListener('load', () => {
    const savedKey = localStorage.getItem('koreh_gemini_book_api_key');
    if (savedKey && document.getElementById("gemini-book-api-key")) {
        document.getElementById("gemini-book-api-key").value = savedKey;
    }
});