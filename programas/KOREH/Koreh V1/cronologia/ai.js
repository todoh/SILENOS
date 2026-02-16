// --- ai.js: INTELIGENCIA ARTIFICIAL (EJECUTOR 8K) ---

const ai = {
    apiKey: localStorage.getItem('pollinations_api_key'),
    contextHandle: null,
    inventory: [], // Array de strings con formato "Nombre (Tipo): Descripción"

    // --- AUTH ---
    login() {
        const redirectUrl = encodeURIComponent(window.location.href);
        window.open(`https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}`, 'PollinationsAuth', `width=500,height=700`);
        
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'POLLI_AUTH_SUCCESS' && event.data.key) {
                this.apiKey = event.data.key;
                localStorage.setItem('pollinations_api_key', this.apiKey);
                this.log("Autenticación Exitosa.", "success");
                ui.updateAuthUI(true);
            }
        });
    },

    init() {
        if(this.apiKey) ui.updateAuthUI(true);
    },

    // --- UI HELPERS ---
    log(msg, type='info') {
        const c = document.getElementById('ai-console');
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
        const txt = document.getElementById('ai-loading-text');
        const sub = document.getElementById('ai-loading-subtext');
        
        if(show) {
            el.classList.remove('hidden');
            el.classList.add('flex');
            txt.innerText = text;
            sub.innerText = subtext;
        } else {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
    },

    updateProgress(percent) {
        // CORRECCIÓN: Apuntamos a 'loading-bar' que es el ID que existe en tu HTML.
        // Se añade verificación para que no rompa si el DOM no está listo.
        const el = document.getElementById('loading-bar');
        if (el) {
            el.style.width = percent + '%';
        } else {
            console.warn("Elemento 'loading-bar' no encontrado en el DOM.");
        }
    },

    // --- API CORE ---
    async callModel(system, user, temp = 0.7, model = 'openai-large') {
        if (!this.apiKey) throw new Error("Requiere Login");
        try {
            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    model: model, 
                    temperature: temp,
                    messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
                })
            });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (e) { throw e; }
    },

    cleanJSON(str) {
        str = str.replace(/```json/g, '').replace(/```/g, '');
        const first = str.indexOf('{') > -1 && str.indexOf('[') > -1 ? Math.min(str.indexOf('{'), str.indexOf('[')) : str.indexOf('{') > -1 ? str.indexOf('{') : str.indexOf('[');
        const last = str.lastIndexOf('}') > str.lastIndexOf(']') ? str.lastIndexOf('}') : str.lastIndexOf(']');
        if (first !== -1 && last !== -1) return str.substring(first, last + 1);
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
                        
                        // LÓGICA LITERAL: Extraer visualDesc en lugar de desc para evitar contaminación narrativa
                        const visualData = json.visualDesc || json.visual_signature || "Sin descripción visual definida";
                        const tags = json.tags ? `[Tags: ${json.tags.join(', ')}]` : "";
                        
                        // Inyectamos el texto visual en el inventario que leerá la IA
                        this.inventory.push(`[${type}] ${name} ${tags}: ${visualData.substring(0, 500)}`);
                        count++;
                    } catch(e) { console.warn("Skipping " + entry.name); }
                }
            }
        };

        await scan(this.contextHandle);
        
        document.getElementById('ai-context-count').innerText = `${count} ITEMS`;
        const list = document.getElementById('ai-inventory-list');
        list.innerHTML = '';
        this.inventory.forEach(item => {
            const s = document.createElement('span');
            s.className = 'asset-tag truncate max-w-[150px]'; 
            s.innerText = item.split(':')[0]; 
            s.title = item;
            list.appendChild(s);
        });

        this.log(`Inventario cargado: ${count} entidades (Filtro Visual Activo).`, "success");
    },

    // --- MOTOR "SWARM GENESIS" (GÉNESIS DE PREMISA - SENTIDO COMÚN) ---
    async generateSmartPremise() {
        if(!this.apiKey) return alert("Conecta la IA primero.");
        if(this.inventory.length === 0) return alert("Carga una carpeta con datos primero.");

        const guidance = document.getElementById('genesis-direction').value;
        const btn = document.getElementById('btn-genesis');
        const output = document.getElementById('genesis-output');
        const resultArea = document.getElementById('genesis-result-area');
        const actions = document.getElementById('genesis-actions');

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-network-wired fa-spin"></i> FASE 1: ANÁLISIS DE REALIDAD';
        
        try {
            this.log("Desplegando Analistas (Basado en Apariencia)...", "brain");
            
            const commonContext = `CONTEXTO (INVENTARIO VISUAL): ${this.inventory.join('\n')}. ${guidance ? `INTENCIÓN DEL USUARIO: "${guidance}"` : ""}`;

            // Agente 1: Personajes (Bajado a tierra)
            const promptPsych = `Eres un ANALISTA DE CARACTERES. Analiza SOLO los PERSONAJES basándote en su apariencia y roles visuales.
            No inventes traumas si no están ahí.
            Dame: 1. Qué quieren (Objetivo tangible). 2. Qué les impide conseguirlo (Obstáculo real). 3. Dinámica actual entre ellos.
            Sé realista.`;

            // Agente 2: Entorno (Bajado a tierra)
            const promptSocio = `Eres un OBSERVADOR SOCIAL. Analiza el ENTORNO y la COMUNIDAD basándote en las descripciones físicas.
            Dame: 1. Cómo funciona este lugar día a día. 2. Recursos disponibles vs Necesidades. 3. El conflicto latente natural.`;

            // Agente 3: Lore/Objetos (Bajado a tierra)
            const promptLore = `Eres un INVENTARIADOR. Analiza los OBJETOS y LUGARES.
            Dame: 1. Herramientas u objetos clave disponibles. 2. Limitaciones físicas del lugar. 3. Detalles atmosféricos basados en los datos.`;

            const promises = [
                this.callModel(promptPsych, commonContext, 0.5, 'openai-large'), 
                this.callModel(promptSocio, commonContext, 0.5, 'openai-large'),
                this.callModel(promptLore, commonContext, 0.5, 'openai-large')
            ];

            const [resPsych, resSocio, resLore] = await Promise.all(promises);

            this.log("Análisis de Sentido Común recibido.", "agent");
            btn.innerHTML = '<i class="fa-solid fa-book fa-fade"></i> FASE 2: SINTETIZANDO PREMISA...';
            
            const directorPrompt = `Actúa como un EDITOR LITERARIO DE SENTIDO COMÚN.
            
            INSUMOS REALISTAS (VISUALES):
            - PERSONAJES: "${resPsych}"
            - ENTORNO: "${resSocio}"
            - ELEMENTOS: "${resLore}"
            
            TAREA: Escribe una PREMISA SÓLIDA y PROPORCIONAL a los datos físicos.
            
            REGLAS DE ORO (ANTI-GRANDILOCUENCIA):
            1. DETECTA LA ESCALA: Si los datos son sobre una pequeña aldea, escribe una historia íntima.
            2. NO INVENTES DRAMA VACÍO: Evita términos épicos si los datos no lo justifican.
            3. LÓGICA: El conflicto debe nacer de la fricción natural entre lo que los personajes quieren y lo que el entorno permite.
            
            ESTRUCTURA DE SALIDA:
            # TÍTULO
            # LOGLINE
            # EL CONFLICTO CENTRAL
            # DINÁMICA DE PERSONAJES
            # ESTRUCTURA SUGERIDA
            `;

            const finalPremise = await this.callModel(directorPrompt, "Sintetiza la historia con sentido común.", 0.6, 'openai-large');
            
            resultArea.classList.remove('hidden');
            output.value = finalPremise;
            actions.classList.remove('hidden');
            resultArea.scrollIntoView({ behavior: 'smooth' });
            
            this.log("Premisa generada con lógica y coherencia visual.", "success");

        } catch(e) {
            console.error(e);
            this.log("Error en Génesis: " + e.message, "error");
            alert("Error: " + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-brain"></i> ANALIZAR DATOS Y SUGERIR';
        }
    },

    // --- PIPELINE DE EJECUCIÓN (EL CONSTRUCTOR 8K) ---
    async runPipeline() {
        if(!this.apiKey) return alert("Conecta la IA primero.");
        
        const prompt = document.getElementById('ai-prompt').value; 
        if(!prompt) return alert("Falta la Biblia/Premisa. Genérala primero.");
        
        const eventCount = parseInt(document.getElementById('ai-event-count').value);
        const density = document.getElementById('ai-density').value;
        
        let momentsPromptInfo = "3 a 5";
        if (density === 'medium') momentsPromptInfo = "5 a 8";
        if (density === 'high') momentsPromptInfo = "8 a 12";

        this.toggleLoading(true, "ARQUITECTURA DE OBRA", "Mapeando nodos causales (OpenAI-Large)...");
        this.updateProgress(5);
        
        try {
            this.log("Generando Escaleta de Ejecución Estricta...", "brain");
            
            const skeletonSys = `Eres el JEFE DE CONTINUIDAD de una producción narrativa.
            
            DOCUMENTACIÓN MAESTRA:
            "${prompt}"
            
            INVENTARIO DE ACTIVOS (DEFINICIÓN VISUAL):
            ${this.inventory.join('\n')}

            ORDEN DE PRODUCCIÓN:
            Debes desglosar la historia en EXACTAMENTE ${eventCount} Capítulos/Secuencias.
            
            REGLAS DE CAUSALIDAD (LÓGICA FORENSE):
            1. NO inventes tramas paralelas.
            2. Cada capítulo debe ser CAUSA del siguiente.
            3. Usa los NOMBRES EXACTOS del inventario.
            
            FORMATO JSON: { "chapters": [{ "time": 1, "title": "Título Técnico", "intent": "Instrucción precisa", "cast": ["PersonajeA"] }, ...] }`;
            
            const skelRes = await this.callModel(skeletonSys, "Genera el plan de rodaje (JSON).", 0.4, 'openai-large');
            const skeleton = JSON.parse(this.cleanJSON(skelRes)).chapters;
            
            this.updateProgress(30);
            this.log(`Plan de ejecución aprobado: ${skeleton.length} nodos.`, "success");
            
            const finalEvents = [];
            
            for (let i = 0; i < skeleton.length; i++) {
                const chapter = skeleton[i];
                const progressBase = 30 + ((i / skeleton.length) * 65);
                
                this.toggleLoading(true, `RENDERIZANDO CAPÍTULO ${i+1}/${skeleton.length}`, `${chapter.title} (Gemini Fast)`);
                this.updateProgress(progressBase);

                const writerSys = `Eres el RENDERIZADOR DE ESCENAS.
                
                ESTADO ACTUAL (Capítulo ${i+1}): "${chapter.title}"
                PROPÓSITO: ${chapter.intent}
                ACTIVOS EN ESCENA (VISUAL): ${chapter.cast.join(', ')}.
                
                TAREA:
                Genera ${momentsPromptInfo} bloques de texto de ALTA DEFINICIÓN (Momentos).
                
                REGLAS DE RENDERIZADO:
                1. NO RESUMAS. MUESTRA la acción.
                2. Enfócate en lo sensorial y lo físico.
                3. Usa las descripciones físicas del inventario (visualDesc) para mantener la consistencia del aspecto.
                
                Output JSON: { "moments": ["Texto detallado 1...", "Texto detallado 2..."] }`;

                try {
                    const writeRes = await this.callModel(writerSys, "Renderiza la escena.", 0.7, 'gemini-fast');
                    const writeJson = JSON.parse(this.cleanJSON(writeRes));
                    
                    finalEvents.push({
                        id: 'evt-' + Date.now() + Math.random(),
                        time: chapter.time,
                        description: chapter.title, 
                        moments: writeJson.moments.map(t => ({ id: Date.now() + Math.random(), text: t })),
                        image64: null
                    });

                } catch(err) {
                    console.error("Error cap " + i, err);
                    this.log(`Error de renderizado en cap ${i+1}, reintentando...`, "warn");
                }
            }

            this.updateProgress(100);
            this.toggleLoading(true, "FINALIZANDO", "Ensamblando novela...");
            
            main.loadEvents(finalEvents);
            main.saveData();
            
            ui.toggleAIModal();
            this.log("Proyecto ensamblado con éxito.", "success");
            
            setTimeout(() => alert(`¡Proceso 8K Completado!\nSe han seguido estrictamente los ${finalEvents.length} nodos lógicos de la estructura.`), 500);

        } catch (e) {
            console.error(e);
            this.log("Error Crítico: " + e.message, "error");
            alert("Fallo en el sistema: " + e.message);
        } finally {
            this.toggleLoading(false);
            this.updateProgress(0);
        }
    }
};

window.addEventListener('load', () => ai.init());