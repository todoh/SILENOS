// --- cronologia/ai.js ---
// REFACTORIZADO: Adaptación absoluta para usar DatosStudio Router Local Engine (Ollama/window.Koreh.Text)

const cronoAI = {
    selectedModel: localStorage.getItem('koreh_selected_ollama_model') || 'qwen3.5:cloud',
    contextHandle: null,
    inventory: [], 
    inventoryFiles: [], 

    init() {
        this.syncModelFromStudio();
    },

    syncModelFromStudio() {
        this.selectedModel = localStorage.getItem('koreh_selected_ollama_model') || 'qwen3.5:cloud';
        this.log(`Modelo Ollama sincronizado: ${this.selectedModel.toUpperCase()}`, "info");
    },

    log(msg, type='info') {
        const c = document.getElementById('ai-console');
        if (!c) return;
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

    // CAMBIO RADICAL: Llama al core local de Datos Studio
    async callModel(system, user, temp = 0.7, unusedModel = null) {
        this.syncModelFromStudio();
        // window.Koreh.Text maneja internamente las temperaturas y formatos si se activa jsonMode
        const configOptions = {
            model: this.selectedModel,
            jsonMode: system.toLowerCase().includes('json') || user.toLowerCase().includes('json')
        };
        return await window.Koreh.Text.generate(system, user, configOptions);
    },

    cleanJSON(str) {
        if (!str) return "{}";
        if (typeof str === 'object') return JSON.stringify(str);
        return window.Koreh.Text.cleanJSON(str);
    },

    async setContext(dirHandle) {
        this.contextHandle = dirHandle;
        await this.scanInventory();
    },

    async scanInventory() {
        if (!this.contextHandle) return;
        
        this.inventory = [];
        this.inventoryFiles = [];
        let count = 0;

        const scan = async (handle) => {
            for await (const entry of handle.values()) {
                if (entry.kind === 'directory') {
                    await scan(entry);
                } else if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.includes('TIMELINE') && !entry.name.includes('VISUAL_BIBLE') && !entry.name.includes('RESUMEN_GLOBAL') && !entry.name.includes('TRAMAS_GLOBAL')) {
                    try {
                        const f = await entry.getFile();
                        const t = await f.text();
                        const json = JSON.parse(t);
                        
                        const name = json.name || json.title || entry.name.replace('.json','');
                        const type = json.type || "Entidad";
                        
                        let contentData = "";
                        if (json.visualDesc) contentData += `Visual: ${json.visualDesc}. `;
                        if (json.desc) contentData += `Historia: ${json.desc}. `;
                        
                        const textRep = `[${type}] ${name}: ${contentData.substring(0, 500)}`;
                        this.inventory.push(textRep);
                        this.inventoryFiles.push({ handle: entry, data: json, name: name });
                        count++;
                    } catch(e) {}
                }
            }
        };

        await scan(this.contextHandle);
        
        const counter = document.getElementById('ai-context-count');
        if (counter) counter.innerText = `${count} ITEMS`;
        
        const list = document.getElementById('ai-inventory-list');
        if (list) {
            list.innerHTML = '';
            this.inventory.forEach(item => {
                const s = document.createElement('span');
                s.className = 'asset-tag truncate max-w-[150px] text-[9px] border bg-white p-1'; 
                s.innerText = item.split(':')[0]; 
                list.appendChild(s);
            });
        }
    },

    async extractEntitiesFromText(text) {
        if (!this.contextHandle) return;
        this.log("Iniciando Extractor de Entidades Local...", "brain");
        
        const prompt = `Analiza este texto narrativo y extrae personajes, lugares y objetos. Devuelve estrictamente un objeto JSON.
        FORMATO JSON:
        {
            "entities": [
                { "name": "Nombre", "type": "Personaje|Lugar|Objeto", "desc": "Descripción", "visualDesc": "Detailed prompt in English" }
            ]
        }
        TEXTO: "${text.substring(0, 3000)}"`;

        try {
            const res = await this.callModel("Eres un analizador semántico JSON puro.", prompt);
            const parsed = typeof res === 'string' ? JSON.parse(this.cleanJSON(res)) : res;
            const entities = parsed.entities || [];

            if (entities.length > 0) {
                let filesAdded = false;
                for (let ent of entities) {
                    const exists = this.inventoryFiles.find(f => f.name.toLowerCase() === ent.name.toLowerCase());
                    if (!exists) {
                        const cleanName = ent.name.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
                        const filename = `${cleanName}_${Date.now()}.json`;
                        const fileHandle = await this.contextHandle.getFileHandle(filename, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(JSON.stringify(ent, null, 2));
                        await writable.close();
                        filesAdded = true;
                    }
                }
                if (filesAdded) await this.scanInventory();
            }
        } catch(e) {
            this.log("Aviso: El extractor local omitió entidades redundantes.", "warn");
        }
    },

    async generateSmartPremise() {
        const guidance = document.getElementById('genesis-direction').value;
        const output = document.getElementById('genesis-output');
        const resultArea = document.getElementById('genesis-result-area');

        this.log("Calculando variables literarias locales...", "brain");
        
        const system = "Eres un editor literario. Genera una premisa estructurada basada en los insumos.";
        const user = `Inventario actual del mundo:\n${this.inventory.join('\n')}\nDirectriz del autor: ${guidance || 'Libre'}`;
        
        try {
            const finalPremise = await this.callModel(system, user);
            if(resultArea) resultArea.classList.remove('hidden');
            if(output) output.value = finalPremise;
            this.log("Premisa generada con éxito.", "success");
        } catch(e) {
            alert("Error en génesis local: " + e.message);
        }
    },

    detectChaptersLogic(text) {
        const normalizedText = text.replace(/\r\n/g, '\n');
        const lines = normalizedText.split('\n');
        let chapters = [];
        let currentChapter = { id: 1, title: 'Inicio', content: '' };
        
        const hasCapitulos = /(?:^|\n)[#\*\>\s]*(cap[ií]tulo|episodio|escena)\b/im.test(normalizedText);
        const regexCapitulo = /^(?:[#\*\>\s]*)(cap[ií]tulo|episodio|escena)\s+([0-9]+)?(.*)/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            let isSeparator = hasCapitulos ? regexCapitulo.test(line) : (line.startsWith('#') && line.length < 50);

            if (isSeparator) {
                if (currentChapter.content.trim().length > 0) {
                    chapters.push({...currentChapter});
                }
                currentChapter = {
                    id: chapters.length + 1,
                    title: line.replace(/^[#\s]+/, ''),
                    content: line + '\n' 
                };
            } else {
                currentChapter.content += line + '\n';
            }
        }
        if (currentChapter.content.trim().length > 0) chapters.push(currentChapter);
        return chapters.filter(c => c.content.trim().length > 5);
    },

    async runPipeline() {
        const promptDocument = document.getElementById('ai-prompt').value; 
        if(!promptDocument) return alert("Pega un índice o escaleta primero.");
        
        window.ui.toggleLoading(true, "FASE 1: EXTRACCIÓN SEMÁNTICA LOCAL", "Procesando Lore...");

        try {
            await this.extractEntitiesFromText(promptDocument);
            const rawChapters = this.detectChaptersLogic(promptDocument);
            const finalEvents = [];

            for (let i = 0; i < rawChapters.length; i++) {
                const chapter = rawChapters[i];
                window.ui.toggleLoading(true, `FASE 2: CONSTRUYENDO CAPÍTULO ${i+1}/${rawChapters.length}`);

                const sysPrompt = "Eres un arquitecto de guiones. Devuelve estrictamente un objeto JSON con clave 'subpartes'.";
                const userPrompt = `Estructura este capítulo en subpartes narrativas:\n"${chapter.content}"\n\nFORMATO JSON ESPERADO:\n{"subpartes": [{"instruccion": "Descripción detallada del latido..."}]}`;
                
                const res = await this.callModel(sysPrompt, userPrompt);
                const parsed = typeof res === 'string' ? JSON.parse(this.cleanJSON(res)) : res;
                const subpartes = parsed.subpartes || [{ instruccion: chapter.content }];

                const momentsData = subpartes.map((sp, idx) => {
                    // Generamos prompts técnicos en inglés dinámicamente
                    const keywords = sp.instruccion.substring(0, 60).replace(/"/g, '');
                    return {
                        id: Date.now() + idx + Math.floor(Math.random() * 100),
                        text: sp.instruccion,
                        visualPrompt: `${keywords}, digital art, detailed background, cinematic cinematic lighting, masterpiece`,
                        image64: null,
                        aspectRatio: 'landscape'
                    };
                });

                finalEvents.push({
                    id: 'evt-' + Date.now() + i,
                    time: i + 1,
                    description: chapter.title,
                    moments: momentsData,
                    customPrompt: `Contexto global del capítulo: ${chapter.title}`
                });
            }

            window.mainCrono.loadEvents(finalEvents);
            window.mainCrono.saveData();
            window.ui.toggleLoading(false);
            window.ui.toggleAIModal();
            this.log("Estructura de la novela creada con Ollama local.", "success");
            
        } catch(e) {
            console.error(e);
            window.ui.toggleLoading(false);
            alert("Error en el pipeline local: " + e.message);
        }
    }
};

window.cronoAI = cronoAI;
window.addEventListener('load', () => cronoAI.init());