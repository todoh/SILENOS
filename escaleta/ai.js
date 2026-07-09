// --- cronologia/ai.js ---

const ai = {
    apiKey: localStorage.getItem('pollinations_api_key'),
    ollamaUrl: localStorage.getItem('escaleta_ollama_url') || 'http://127.0.0.1:11434/api',
    aiProvider: localStorage.getItem('escaleta_ai_provider') || 'pollinations', // 'pollinations' | 'ollama'
    pollinationsModel: localStorage.getItem('escaleta_pollinations_model') || 'gemini-fast', // Dynamic model selection
    contextHandle: null,
    inventory: [], 

    // --- AUTH ---
    login() {
        const redirectUrl = encodeURIComponent(window.location.href);
        window.open(`https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}`, 'PollinationsAuth', `width=500,height=700`);
    },

    init() {
        // DETECCIÓN DE CONTEXTO DE SUBPROCESO (POPUP)
        if (window.opener && (window.location.search || window.location.hash)) {
            const urlParams = new URLSearchParams(window.location.search || window.location.hash.replace('#', '?'));
            const key = urlParams.get('api_key') || urlParams.get('key');
            
            if (key) {
                window.opener.postMessage({ type: 'POLLI_AUTH_SUCCESS', key: key }, '*');
                window.close();
                return; 
            }
        }

        // CONTROLADOR DE MENSAJES EN EL HILO MAESTRO
        window.removeEventListener('message', this._handleAuthMessage);
        this._handleAuthMessage = (event) => {
            if (event.data && event.data.type === 'POLLI_AUTH_SUCCESS' && event.data.key) {
                this.apiKey = event.data.key;
                localStorage.setItem('pollinations_api_key', this.apiKey);
                this.log("Autenticación Exitosa.", "success");
                if (window.ui && typeof window.ui.updateAuthUI === 'function') {
                    window.ui.updateAuthUI(true);
                } else if (window.EscaletaUI && typeof window.EscaletaUI.updateAuthUI === 'function') {
                    window.EscaletaUI.updateAuthUI(true);
                }
            }
        };
        window.addEventListener('message', this._handleAuthMessage);

        if(this.apiKey) {
            if (window.ui && typeof window.ui.updateAuthUI === 'function') {
                window.ui.updateAuthUI(true);
            } else if (window.EscaletaUI && typeof window.EscaletaUI.updateAuthUI === 'function') {
                window.EscaletaUI.updateAuthUI(true);
            }
        }
        
        // Cargar modelos locales si Ollama está activo
        if (this.aiProvider === 'ollama') {
            setTimeout(() => { if(window.EscaletaUI) window.EscaletaUI.fetchOllamaModels(); }, 500);
        }
    },

    // --- UI HELPERS ---
    log(msg, type='info') {
        const c = document.getElementById('ai-console');
        if (!c) {
            console.log(`[AI LOG - ${type}]: ${msg}`);
            return;
        }
        const div = document.createElement('div');
        let colorClass = 'text-gray-500';
        
        if(type==='error') colorClass = 'text-red-500 font-bold';
        if(type==='success') colorClass = 'text-green-600';
        if(type==='warn') colorClass = 'text-amber-500';
        if(type==='brain') colorClass = 'text-purple-600 font-bold'; 
        if(type==='agent') colorClass = 'text-blue-500 font-mono text-[10px]'; 
        
        div.className = `mb-2 pb-2 border-b border-gray-100 ${colorClass} last:border-0`;
        div.innerHTML = `<span class="opacity-50 text-[9px] mr-2">${new Date().toLocaleTimeString()}</span> ${msg}`;
        c.prepend(div);
    },

    toggleLoading(show, text, subtext="") {
        const el = document.getElementById('ai-loading-overlay');
        if (!el) return;
        const txt = document.getElementById('ai-loading-text');
        const sub = document.getElementById('ai-loading-subtext');
        
        if(show) {
            el.classList.remove('hidden');
            el.classList.add('flex');
            if (txt) txt.innerText = text;
            if (sub) sub.innerText = subtext;
        } else {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
    },

    updateProgress(percent) {
        const el = document.getElementById('loading-bar');
        if (el) {
            el.style.width = percent + '%';
        } else {
            console.warn("Elemento 'loading-bar' no encontrado en el DOM.");
        }
    },
    
    updateTracker(phaseNumber, status) {
        const el = document.getElementById(`trk-phase-${phaseNumber}`);
        if (!el) return;
        const icon = el.querySelector('i');
        
        if (status === 'active') {
            el.classList.remove('opacity-40', 'text-green-600');
            el.classList.add('text-indigo-600', 'font-bold');
            if (icon) icon.className = "fa-solid fa-circle-notch fa-spin w-3 text-center";
        } else if (status === 'done') {
            el.classList.remove('text-indigo-600', 'font-bold', 'opacity-40');
            el.classList.add('text-green-600');
            if (icon) icon.className = "fa-solid fa-circle-check w-3 text-center";
        }
    },

    // --- API CORE (PROVEEDOR ROUTER HÍBRIDO) ---
    async callModel(system, user, temp = 0.7, model = null) {
        if (this.aiProvider === 'pollinations') {
            if (!this.apiKey) throw new Error("Requiere Login en Pollinations AI");
            const activeModel = model || this.pollinationsModel;
            try {
                const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        model: activeModel, 
                        temperature: temp,
                        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
                    })
                });
                if (!response.ok) throw new Error(`API Pollinations Error: ${response.status}`);
                const data = await response.json();
                return data.choices[0].message.content;
            } catch (e) { throw e; }
        } else {
            // MODO OLLAMA LOCAL
            try {
                const selectedLocalModel = localStorage.getItem('escaleta_selected_ollama_model') || 'qwen2.5:7b';
                const cleanUrl = this.ollamaUrl.endsWith('/') ? this.ollamaUrl.slice(0, -1) : this.ollamaUrl;
                
                const body = {
                    model: selectedLocalModel,
                    prompt: user,
                    system: system,
                    stream: false,
                    options: {
                        temperature: temp
                    }
                };

                if (system.toLowerCase().includes('json') || user.toLowerCase().includes('json')) {
                    body.format = "json";
                }

                const response = await fetch(`${cleanUrl}/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                if (!response.ok) throw new Error(`Ollama Local Error (Status: ${response.status})`);
                const data = await response.json();
                return data.response;
            } catch (e) { throw e; }
        }
    },

    cleanJSON(str) {
        if (!str) return "";
        str = str.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = str.indexOf('{');
        const firstBracket = str.indexOf('[');
        
        let first = -1;
        if (firstBrace !== -1 && firstBracket !== -1) first = Math.min(firstBrace, firstBracket);
        else if (firstBrace !== -1) first = firstBrace;
        else first = firstBracket;

        if (first !== -1) {
            const isObject = str[first] === '{';
            const last = isObject ? str.lastIndexOf('}') : str.lastIndexOf(']');
            if (last !== -1 && last > first) {
                return str.substring(first, last + 1);
            }
        }
        return str; 
    },

    // --- CONTEXT SCANNER ---
    async setContext(dirHandle) {
        this.contextHandle = dirHandle;
        this.log("Iniciando escaneo profundo de Datos Studio...", "info");
        await this.scanInventory();
    },

    async scanInventory() {
        if (!this.contextHandle) return;
        
        this.inventory = [];
        let count = 0;

        const scan = async (handle) => {
            for await (const entry of handle.values()) {
                if (entry.kind === 'directory') {
                    await scan(entry);
                } else if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.includes('TIMELINE') && !entry.name.includes('VISUAL_BIBLE')) {
                    try {
                        const f = await entry.getFile();
                        const t = await f.text();
                        const json = JSON.parse(t);
                        
                        const name = json.name || json.title || entry.name.replace('.json','');
                        const type = json.type || "Entidad";
                        
                        let contentData = "";
                        if (json.visualDesc) contentData += `Visual: ${json.visualDesc}. `;
                        if (json.lore) contentData += `Historia: ${json.lore}. `;
                        if (json.psychology) contentData += `Psicología: ${json.psychology}. `;
                        if (!contentData) contentData = JSON.stringify(json).substring(0, 1000);
                        
                        this.inventory.push(`[${type}] ${name}: ${contentData.substring(0, 1000)}`);
                        count++;
                    } catch(e) { console.warn("Skipping " + entry.name); }
                }
            }
        };

        await scan(this.contextHandle);
        
        const countEl = document.getElementById('ai-context-count');
        if (countEl) countEl.innerText = `${count} ITEMS`;
        const list = document.getElementById('ai-inventory-list');
        if (list) {
            list.innerHTML = '';
            this.inventory.forEach(item => {
                const s = document.createElement('span');
                s.className = 'asset-tag truncate max-w-[150px]'; 
                s.innerText = item.split(':')[0]; 
                s.title = item;
                list.appendChild(s);
            });
        }

        this.log(`Inventario cargado: ${count} entidades. Listas para Aislamiento de Contexto.`, "success");
    },

    // --- MOTOR "SWARM GENESIS" ---
    async generateSmartPremise() {
        if(this.aiProvider === 'pollinations' && !this.apiKey) return alert("Conecta la IA primero.");
        if(this.inventory.length === 0) return alert("Carga una carpeta con datos primero.");

        const guidanceEl = document.getElementById('genesis-direction');
        const guidance = guidanceEl ? guidanceEl.value : "";
        const btn = document.getElementById('btn-genesis');
        const output = document.getElementById('genesis-output');
        const resultArea = document.getElementById('genesis-result-area');
        const actions = document.getElementById('genesis-actions');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-network-wired fa-spin"></i> FASE 1: ANÁLISIS DE REALIDAD';
        }
        
        try {
            this.log(`Desplegando Analistas Rápidos bajo proveedor: ${this.aiProvider.toUpperCase()}...`, "brain");
            
            const commonContext = `CONTEXTO (INVENTARIO): ${this.inventory.join('\n')}. ${guidance ? `INTENCIÓN DEL USUARIO: "${guidance}"` : ""}`;

            const promptPsych = `Eres un ANALISTA. Analiza SOLO los PERSONAJES. Dame: 1. Qué quieren. 2. Qué les impide conseguirlo. 3. Dinámica actual.`;
            const promptSocio = `Eres un OBSERVADOR SOCIAL. Analiza el ENTORNO y la COMUNIDAD. Dame: 1. Cómo funciona este lugar. 2. Recursos vs Necesidades. 3. Conflicto latente.`;
            const promptLore = `Eres un INVENTARIADOR. Analiza los OBJETOS y LUGARES. Dame: 1. Herramientas clave. 2. Limitaciones físicas.`;

            const promises = [
                this.callModel(promptPsych, commonContext, 0.5, null), 
                this.callModel(promptSocio, commonContext, 0.5, null),
                this.callModel(promptLore, commonContext, 0.5, null)
            ];

            const [resPsych, resSocio, resLore] = await Promise.all(promises);

            this.log("Análisis recibido. Sintetizando...", "agent");
            if (btn) btn.innerHTML = '<i class="fa-solid fa-book fa-fade"></i> FASE 2: SINTETIZANDO PREMISA...';
            
            const directorPrompt = `Actúa como un EDITOR LITERARIO DE SENTIDO COMÚN.
            INSUMOS:
            - PERSONAJES: "${resPsych}"
            - ENTORNO: "${resSocio}"
            - ELEMENTOS: "${resLore}"
            TAREA: Escribe una PREMISA SÓLIDA y PROPORCIONAL a los datos.
            ESTRUCTURA DE SALIDA:
            # TÍTULO
            # LOGLINE
            # EL CONFLICTO CENTRAL
            # DINÁMICA DE PERSONAJES
            # ESTRUCTURA SUGERIDA`;

            const finalPremise = await this.callModel(directorPrompt, "Sintetiza la historia.", 0.6, null);
            
            if (resultArea) resultArea.classList.remove('hidden');
            if (output) output.value = finalPremise;
            if (actions) actions.classList.remove('hidden');
            if (resultArea) resultArea.scrollIntoView({ behavior: 'smooth' });
            
            this.log("Premisa generada con lógica y coherence.", "success");

        } catch(e) {
            console.error(e);
            this.log("Error en Génesis: " + e.message, "error");
            alert("Error: " + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-brain"></i> ANALIZAR DATOS Y SUGERIR';
            }
        }
    },

    // =================================================================================
    // ALGORITMO MODIFICADO: DETECCIÓN FORENSE POR ALTA DENSIDAD Y SUBPARTES SEMÁNTICAS
    // =================================================================================
    detectChaptersLogic(text) {
        const normalizedText = text.replace(/\r\n/g, '\n');
        const lines = normalizedText.split('\n');
        
        let chapters = [];
        let currentChapter = { id: 1, title: 'Bloque Inicial', content: '' };
        
        // Expresiones de corte robustas que incluyen subpartes, momentos, eventos y giros de trama
        const regexCapitulo = /^(?:[#\*\>\s]*)(cap[ií]tulo|episodio|escena|evento|subparte|bloque|momento|parte|acto|giro|fase)\s+([0-9]+|[IVXLCDMivxlcdm]+|[a-záéíóúÁÉÍÓÚ]+)?(?:[\.\-\:\s]+)?(.*)/i;
        const regexNumeroSolo = /^(?:[#\*\>\s]*)([0-9]+|[IVXLCDM]+)\s*[\.\-\:]\s*(.*)/; 
        const regexMayusculas = /^[^a-z]{4,60}$/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const matchCap = line.match(regexCapitulo);
            const matchNum = line.match(regexNumeroSolo);
            const isAllCapsTitle = regexMayusculas.test(line) && line.length > 3 && !line.endsWith('.');

            let isSeparator = (matchCap || (matchNum && line.length < 80) || isAllCapsTitle);

            if (isSeparator) {
                if (currentChapter.content.trim().length > 0) {
                    chapters.push({...currentChapter});
                }
                
                let cleanTitle = line.replace(/^[#\*\>\s]+/, '').replace(/[\*]+$/, '').trim();
                currentChapter = {
                    id: chapters.length + 1,
                    title: cleanTitle.length > 80 ? cleanTitle.substring(0, 80) + "..." : cleanTitle,
                    content: line + '\n' 
                };
            } else {
                currentChapter.content += line + '\n';
            }
        }
        
        if (currentChapter.content.trim().length > 0) {
            chapters.push(currentChapter);
        }

        // CONTROL CRÍTICO DE FRAGMENTACIÓN ACELERADA:
        // Si el texto es largo y la detección lineal dio pocos bloques (ej. colapsó subpartes),
        // forzamos una fragmentación semántica agresiva por tamaño de párrafo o recortes semánticos de 600 caracteres.
        if (chapters.length < 25 && text.length > 2000) {
            this.log("Estructura compacta detectada. Desplegando fraccionamiento semántico forzado por subpartes densas...", "warn");
            const paragraphs = text.split(/\n\s*\n/);
            chapters = [];
            let tempContent = "";
            let capId = 1;
            
            for(let p of paragraphs) {
                if (!p.trim()) continue;
                tempContent += p + "\n\n";
                // Bajamos el umbral a 600 caracteres para asegurar la atomización en al menos 30+ bloques independientes
                if(tempContent.length > 600) {
                    let firstLine = p.trim().split('\n')[0];
                    let inlineTitle = firstLine.length > 40 ? firstLine.substring(0, 40) + "..." : firstLine;
                    chapters.push({ id: capId, title: `Escena Atomizada ${capId}: ${inlineTitle}`, content: tempContent });
                    capId++;
                    tempContent = "";
                }
            }
            if(tempContent.trim().length > 0) {
                chapters.push({ id: capId, title: `Escena Atomizada ${capId}`, content: tempContent });
            }
        }

        return chapters.map((c, i) => ({...c, id: i + 1}));
    },

    async runPipeline() {
        if(this.aiProvider === 'pollinations' && !this.apiKey) return alert("Conecta la IA primero.");
        
        const promptDocument = document.getElementById('ai-prompt').value; 
        if(!promptDocument) return alert("Falta el Documento Maestro o Índice. Pégalo primero.");
        
        const btnRun = document.getElementById('btn-run-ai');
        if (btnRun) btnRun.disabled = true;

        try {
            this.updateTracker(1, 'active');
            this.toggleLoading(true, "FASE 1/5: INGESTIÓN LÓGICA DE ALTA DENSIDAD", "Atomizando subtramas y subpartes secuenciales...");
            this.updateProgress(10);
            this.log("Aplicando algoritmos de segmentación ultra-profunda...", "brain");

            const rawChapters = this.detectChaptersLogic(promptDocument);
            
            this.log(`Extracción completada de forma determinista: ${rawChapters.length} bloques identificados para renderizar.`, "success");
            this.updateTracker(1, 'done');

            this.updateTracker(2, 'active');
            this.toggleLoading(true, "FASE 2/5: AISLAMIENTO DE CONTEXTO", "Cruzando matriz en paralelo...");
            this.updateProgress(30);

            const inventoryText = this.inventory.join('\n');
            let completedContexts = 0;

            const phase2Promises = rawChapters.map(async (chapter) => {
                const prompt = `Eres un ANALISTA LITERARIO Y DOCUMENTALISTA TÉCNICO.
                
                TEXTO DEL CAPÍTULO:
                "${chapter.content.substring(0, 4000)}"

                INVENTARIO DE ACTIVOS DISPONIBLES:
                ${inventoryText || "Ninguno"}

                TAREA:
                1. Extrae una sinopsis clara de lo que ocurre en este bloque.
                2. Selecciona SOLO los identificadores del inventario que participan estrictamente en el texto.
                3. Identifica el escenario físico principal y los personajes explícitamente presentes.

                FORMATO JSON ESTRICTO:
                {
                    "synopsis": "Resumen detallado...",
                    "relevant_keys": ["Nombre 1", "Nombre 2"],
                    "escenario_principal": "Nombre del lugar exacto",
                    "personajes_presentes": ["Nombre de personaje 1"],
                    "elementos_mencionados": ["Objeto 1"]
                }`;

                try {
                    const res = await this.callModel(prompt, "Genera informe adaptado al capítulo con metadatos técnicos.", 0.2, null);
                    
                    let data = { synopsis: "Sinopsis por defecto.", relevant_keys: [], escenario_principal: "Desconocido", personajes_presentes: [], elementos_mencionados: [] };
                    try { data = JSON.parse(this.cleanJSON(res)); } catch(e) { }

                    let relevant_context = [];
                    if(data.relevant_keys && Array.isArray(data.relevant_keys) && this.inventory.length > 0) {
                        relevant_context = this.inventory.filter(invLine => {
                            const lineKey = invLine.split(':')[0].toLowerCase().trim();
                            return data.relevant_keys.some(k => lineKey.includes(k.toLowerCase().trim()) || k.toLowerCase().trim().includes(lineKey));
                        });
                    }

                    return {
                        id: chapter.id,
                        title: chapter.title,
                        synopsis: data.synopsis || chapter.content.substring(0, 150),
                        relevant_context: relevant_context,
                        escenario_principal: data.escenario_principal,
                        personajes_presentes: data.personajes_presentes,
                        elementos_mencionados: data.elementos_mencionados,
                        raw_content: chapter.content
                    };

                } catch (err) {
                    return { id: chapter.id, title: chapter.title, synopsis: chapter.content.substring(0, 150), relevant_context: [], escenario_principal: "Desconocido", personajes_presentes: [], elementos_mencionados: [], raw_content: chapter.content };
                } finally {
                    completedContexts++;
                    this.updateProgress(30 + ((completedContexts / rawChapters.length) * 20));
                }
            });

            const skeleton = await Promise.all(phase2Promises);
            
            this.updateTracker(2, 'done');
            this.log(`Fase 2 completada: Contextos aislados en matriz profunda de alta fidelidad.`, "success");

            this.updateTracker(5, 'active');
            this.log("Iniciando renderizado de arquitectura (Matriz Técnica de Alta Densidad)...", "brain");

            let completedRenders = 0;

            const phase5Promises = skeleton.map(async (chapter, index) => {
                // EXPANSIÓN MANDATORIA: Forzar a que cada sub-bloque contenga obligatoriamente de 3 a 6 beats independientes
                const writerSys = `Eres el DIRECTOR DE CINE, PSICOANALISTA Y ARQUITECTO DE LA NOVELA.
                Tu objetivo es desglosar la escena en una matriz de datos EXHAUSTIVA Y PROFUNDA, dejando listo un manual de instrucciones rico y detallado para que un escritor redacte la prosa final. NO INVENTES EVENTOS EXTERNOS, profundiza en lo que hay.
                
                TÍTULO: "${chapter.title}"
                SINOPSIS BASE: "${chapter.synopsis}"
                ESCENARIO: "${chapter.escenario_principal || 'Desconocido'}"
                PERSONAJES PRESENTES: "${(chapter.personajes_presentes || []).join(', ') || 'Desconocidos'}"
                
                DATOS DE CONTEXTO (INVENTARIO DEL USUARIO):
                ${chapter.relevant_context.join('\n') || "No hay datos adicionales. Usa la sinopsis."}
                
                REGLA DE ORO (CHUNKING CRÍTICO DE EXPANSIÓN): DEBES DIVIDIR obligatoriamente la sinopsis en una secuencia lógica de un MÍNIMO DE 3 y un MÁXIMO DE 6 "beats" (latidos/momentos) perfectamente diferenciados. ESTÁ ESTRICTAMENTE PROHIBIDO resumir la acción o comprimirla. Cada micro-acción o subparte debe ser un beat propio indexado.
                
                TAREA: Genera una MATRIZ DE DATOS TÉCNICA Y DE ALTA DENSIDAD en formato JSON ESTRICTO:
                {
                    "setup_tecnico": {
                        "locacion_explicita": "Lugar exacto (del inventario)",
                        "vector_tiempo": "Día / Noche / Salto temporal explícito",
                        "clima_atmosfera": "Detalles sensoriales del ambiente",
                        "elenco_activo": ["Personaje 1", "Personaje 2"],
                        "objetos_en_uso": ["Objeto 1 (en mano de Personaje 1)"]
                    },
                    "beats": [
                        { 
                            "coreografia_fisica": "Beat 1: Describe la acción de apertura detallada...", 
                            "subtexto_psicologico": "Las intenciones ocultas al iniciar...",
                            "participantes": ["Personaje 1"] 
                        },
                        { 
                            "coreografia_fisica": "Beat 2: Desarrollo del conflicto o interacción...", 
                            "subtexto_psicologico": "Cómo escala la tensión...",
                            "participantes": ["Personaje 1", "Personaje 2"] 
                        },
                        { 
                            "coreografia_fisica": "Beat 3: Desenlace de esta escena o clímax del bloque...", 
                            "subtexto_psicologico": "La nueva postura mental al terminar...",
                            "participantes": ["Personaje 2"] 
                        }
                    ],
                    "deltas_cambios": {
                        "cambio_de_paradigma": "Qué cambia irreversiblemente en el mundo o en la psique al terminar este bloque.",
                        "revelacion_clave": "Qué información nueva obtiene el lector o los personajes.",
                        "frase_bisagra_salida": "Escribe una ACCIÓN FÍSICA CLARA Y CONCISA de 1 sola frase con la que terminará EXACTAMENTE esta escena (ej: 'La puerta de roble se cerró de golpe.'). No uses reflexiones, solo acciones o sonidos directos que sirvan de puente."
                    },
                    "directrices_escritura": {
                        "tono_atmosferico": "Instrucciones de tono visual y emocional.",
                        "ritmo_narrativo": "Instrucciones de ritmo narrativo."
                    }
                }`;

                try {
                    const writeRes = await this.callModel(writerSys, "Genera la matriz de alta densidad en formato JSON estricto dividiendo la action en un minimo de 3 a 6 beats y define la frase_bisagra_salida.", 0.2, null);
                    
                    let archData = {
                        setup_tecnico: {},
                        beats: [{ coreografia_fisica: chapter.synopsis, subtexto_psicologico: "", participantes: [] }],
                        deltas_cambios: { frase_bisagra_salida: "La escena concluyó en silencio." },
                        directrices_escritura: {}
                    };

                    try { 
                        archData = JSON.parse(this.cleanJSON(writeRes)); 
                    } catch(e) {
                        console.warn("Fallo al parsear JSON del arquitecto, usando valores por defecto.", e);
                    }

                    const beatsArray = archData.beats || [{ coreografia_fisica: chapter.synopsis, subtexto_psicologico: "", participantes: [] }];
                    
                    const momentsData = beatsArray.map((b, beatIndex) => {
                        let combinedText = b.coreografia_fisica || b.toString();
                        if (b.subtexto_psicologico) combinedText += `\n[SUBTEXTO]: ${b.subtexto_psicologico}`;
                        return {
                            id: Date.now() + Math.random() + beatIndex,
                            text: combinedText,
                            participantes: b.participantes || []
                        };
                    });

                    const setup = archData.setup_tecnico || {};
                    const deltas = archData.deltas_cambios || {};
                    const guidelines = archData.directrices_escritura || {};

                    const masterPrompt = `=== SETUP TÉCNICO ===
Lugar: ${setup.locacion_explicita || chapter.escenario_principal}
Tiempo: ${setup.vector_tiempo || "Continuación"}
Clima/Atmósfera: ${setup.clima_atmosfera || "Estándar"}
Elenco: ${(setup.elenco_activo || chapter.personajes_presentes || []).join(', ')}
Objetos: ${(setup.objetos_en_uso || chapter.elementos_mencionados || []).join(', ')}

=== LORE Y DATOS ESTRICTOS (INMUTABLES) ===
${chapter.relevant_context.join('\n') || "Usar estrictamente la sinopsis sin inventar lore extra."}

=== DIRECTRICES DE ESCRITURA Y ENFOQUE ===
Tono Atmosférico: ${guidelines.tono_atmosferico || "Priorizar la descripción fidedigna."}
Ritmo Narrativo: ${guidelines.ritmo_narrativo || "Fluido y natural."}

=== BIBLIA DE CAMBIOS Y EVOLUCIÓN ===
Cambio de Paradigma: ${deltas.cambio_de_paradigma || "Sin cambios estructurales."}
Revelación Clave: ${deltas.revelacion_clave || "Ninguna."}`;

                    return {
                        id: 'evt-' + Date.now() + Math.random(),
                        time: index + 1, 
                        description: chapter.title, 
                        moments: momentsData,
                        image64: null,
                        setup_tecnico: setup,
                        deltas_cambios: deltas,
                        customPrompt: masterPrompt,
                        visualPrompt: masterPrompt,
                        prompt: masterPrompt
                    };

                } catch(err) {
                    console.warn("Fallo de red en capítulo:", chapter.title, err);
                    return { 
                        id: 'evt-' + Date.now() + Math.random(), 
                        time: index + 1, 
                        description: chapter.title, 
                        moments: [{ id: Date.now(), text: "Error. Resumen base: " + chapter.synopsis, participantes: [] }], 
                        setup_tecnico: {},
                        deltas_cambios: { frase_bisagra_salida: "La oscuridad lo cubrió todo." },
                        customPrompt: "Prioriza descripciones",
                        visualPrompt: "Atmósfera realista",
                        prompt: "Prioriza descripciones"
                    };
                } finally {
                    completedRenders++;
                    this.toggleLoading(true, `RENDERIZANDO ARQUITECTURA TÉCNICA DENSE (${completedRenders}/${skeleton.length})`, `Generando matriz ramificada de subpartes narrativas`);
                    this.updateProgress(50 + ((completedRenders / skeleton.length) * 50));
                }
            });

            const results = await Promise.all(phase5Promises);
            const finalEvents = results.sort((a, b) => a.time - b.time);

            for (let i = 0; i < finalEvents.length; i++) {
                finalEvents[i].frase_salida = finalEvents[i].deltas_cambios?.frase_bisagra_salida || "La escena concluyó en silencio absoluto.";
                if (i > 0) {
                    finalEvents[i].frase_entrada = finalEvents[i-1].frase_salida;
                } else {
                    finalEvents[i].frase_entrada = null;
                }
            }

            this.updateTracker(5, 'done');
            this.updateProgress(100);
            this.toggleLoading(true, "FINALIZANDO", "Ensamblando obra de forma determinista de alta densidad...");
            
            if (window.main && typeof window.main.loadEvents === 'function') window.main.loadEvents(finalEvents);
            if (window.main && typeof window.main.saveData === 'function') window.main.saveData();
            if (window.ui && typeof window.ui.toggleAIModal === 'function') window.ui.toggleAIModal();
            
            this.log(`Pipeline completado: ${finalEvents.length} bloques ramificados cruzados con el inventario de Silenos Studio.`, "success");
            
        } catch (e) {
            console.error(e);
            this.log("Error Crítico: " + e.message, "error");
            alert("Fallo en el sistema: " + e.message);
        } finally {
            this.toggleLoading(false);
            this.updateProgress(0);
            if (btnRun) btnRun.disabled = false;
        }
    }
};

window.addEventListener('load', () => ai.init());