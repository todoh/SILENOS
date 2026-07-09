// --- cronologia/escaleta/coherence.js ---
// MOTOR DE COHERENCIA AUDIOVISUAL (SCANNER, INJECTOR & EDITOR) - V5.0 (Tokens sin Espacios)

const CoherenceEngine = {
    inventory: {}, // Mapa: "clave_sin_espacios" -> { originalName: "...", visual: "...", audio: "..." }
    detectedKeys: [], 
    bibleKeys: new Set(),
    bibleHandle: null, 

    async scanProject(rootHandle) {
        this.inventory = {};
        this.detectedKeys = [];
        this.bibleKeys = new Set();
        
        // 1. Buscar y Priorizar VISUAL_BIBLE.json
        try {
            this.bibleHandle = await rootHandle.getFileHandle('VISUAL_BIBLE.json', { create: true });
            const file = await this.bibleHandle.getFile();
            const text = await file.text();
            
            let assets = [];
            if (text.trim()) {
                const json = JSON.parse(text);
                assets = Array.isArray(json) ? json : (json.assets || []);
            }
            
            console.log(`📖 Biblia Audiovisual detectada: ${assets.length} activos.`);

            assets.forEach(a => {
                const desc = a.visual_signature || a.visualDesc || a.visual_tags;
                const audioDesc = a.audio_signature || a.audioDesc || "";
                if (a.name && desc) {
                    this.addToInventory(a.name, desc, audioDesc, true);
                }
            });
            
        } catch (e) {
            console.warn("Error leyendo VISUAL_BIBLE.json", e);
        }

        // 2. Escaneo Recursivo de Archivos JSON Sueltos
        await this.recursiveScan(rootHandle);
        
        // Render UI
        this.renderCoherenceUI();
    },

    async recursiveScan(dirHandle, depth = 0) {
        if (depth > 3) return;
        
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                await this.recursiveScan(entry, depth + 1);
            } else if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                if (entry.name.includes('TIMELINE') || entry.name.includes('ESCALETA') || entry.name.includes('VISUAL_BIBLE')) continue;
                try {
                    const file = await entry.getFile();
                    const text = await file.text();
                    const json = JSON.parse(text);
                    const visual = json.visual_signature || json.visualDesc || json.visual_tags;
                    const audio = json.audio_signature || json.audioDesc || "";
                    const name = json.name || json.title || entry.name.replace('.json','');
                    if (visual && name) this.addToInventory(name, visual, audio, false);
                } catch (e) { }
            }
        }
    },

    addToInventory(name, desc, audioDesc, isBible = false) {
        if (!name || !desc) return;
        // Normalización estricta: quitamos espacios y caracteres especiales para crear un token unívoco
        const key = name.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '').trim();
        
        if (isBible) this.bibleKeys.add(key);

        if (!this.inventory[key]) {
            this.inventory[key] = { originalName: name, visual: desc, audio: audioDesc || "" };
            if (!this.detectedKeys.includes(key)) this.detectedKeys.push(key);
        } else {
            // Actualizamos si hay descripciones más ricas
            if (this.inventory[key].visual.length < desc.length) {
                this.inventory[key].visual = desc;
            }
            if (audioDesc && this.inventory[key].audio.length < audioDesc.length) {
                this.inventory[key].audio = audioDesc;
            }
        }
    },

    async appendToBible(newAssets) {
        if (!this.bibleHandle || newAssets.length === 0) return;

        try {
            // Leer actual
            const file = await this.bibleHandle.getFile();
            const text = await file.text();
            let currentAssets = [];
            if (text.trim()) {
                const json = JSON.parse(text);
                currentAssets = Array.isArray(json) ? json : (json.assets || []);
            }

            // Añadir nuevos (evitando duplicados por token normalizado)
            newAssets.forEach(newItem => {
                const newKey = newItem.name.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '').trim();
                const exists = currentAssets.find(a => a.name.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '').trim() === newKey);
                
                if (exists) {
                    if (newItem.visual_signature && newItem.visual_signature.length > (exists.visual_signature || "").length) {
                        exists.visual_signature = newItem.visual_signature;
                    }
                    if (newItem.audio_signature && newItem.audio_signature.length > (exists.audio_signature || "").length) {
                        exists.audio_signature = newItem.audio_signature;
                    }
                } else {
                    currentAssets.push(newItem);
                }
                // Actualizar memoria local también
                this.addToInventory(newItem.name, newItem.visual_signature, newItem.audio_signature, true);
            });

            // Guardar disco
            const writable = await this.bibleHandle.createWritable();
            await writable.write(JSON.stringify({ assets: currentAssets }, null, 2));
            await writable.close();
            
            this.renderCoherenceUI();
            console.log("Biblia Audiovisual actualizada con éxito.");

        } catch (e) {
            console.error("Error guardando en Biblia:", e);
        }
    },

    async saveBibleFull(assetsArray) {
        if (!this.bibleHandle) {
            if (!EscaletaCore.rootHandle) return;
            this.bibleHandle = await EscaletaCore.rootHandle.getFileHandle('VISUAL_BIBLE.json', { create: true });
        }

        try {
            const writable = await this.bibleHandle.createWritable();
            await writable.write(JSON.stringify({ assets: assetsArray }, null, 2));
            await writable.close();
            
            // Refrescar memoria local
            this.inventory = {};
            this.detectedKeys = [];
            this.bibleKeys = new Set();
            
            assetsArray.forEach(a => {
                this.addToInventory(a.name, a.visual_signature, a.audio_signature, true);
            });
            
            this.renderCoherenceUI();
            console.log("Biblia Audiovisual guardada con éxito (Editor Manual).");
            alert("Biblia Visual guardada correctamente en VISUAL_BIBLE.json.");
            
        } catch (e) {
            console.error("Error guardando Biblia completa:", e);
            alert("Error al guardar la Biblia.");
        }
    },

    getDetailedPromptFor(name) {
        if (!name) return null;
        const key = name.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '').trim();
        const match = this.detectedKeys.find(k => k === key || k.includes(key) || key.includes(k));
        if (match) return this.inventory[match].visual;
        return null; 
    },

    getAudioPromptFor(name) {
        if (!name) return null;
        const key = name.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '').trim();
        const match = this.detectedKeys.find(k => k === key || k.includes(key) || key.includes(k));
        if (match) return this.inventory[match].audio;
        return null; 
    },

    renderCoherenceUI() {
        const list = document.getElementById('coherence-list');
        if (!list) return;
        list.innerHTML = '';
        
        if (this.detectedKeys.length === 0) {
            list.innerHTML = '<div class="text-[10px] text-gray-400 italic text-center p-4">Sin datos en memoria.</div>';
            return;
        }

        const sortedKeys = [...this.detectedKeys].sort();

        sortedKeys.forEach(key => {
            const visualDesc = this.inventory[key].visual;
            const audioDesc = this.inventory[key].audio;
            const originalName = this.inventory[key].originalName;
            
            const isFromBible = this.bibleKeys.has(key);
            const borderClass = isFromBible ? "border-indigo-200 bg-indigo-50/30" : "border-gray-200 bg-white";
            const iconHtml = isFromBible ? `<i class="fa-solid fa-book-bookmark text-indigo-500 mr-1"></i>` : `<i class="fa-regular fa-file text-gray-400 mr-1"></i>`;

            const audioHtml = audioDesc ? `<div class="mt-1 text-[9px] text-blue-500 border-t border-indigo-100/50 pt-1 flex items-start gap-1"><i class="fa-solid fa-microphone mt-0.5"></i> <span class="leading-tight">${audioDesc}</span></div>` : '';

            const el = document.createElement('div');
            el.className = `text-[10px] ${borderClass} border p-2 rounded shadow-sm hover:border-indigo-400 transition-colors group relative`;
            
            el.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-slate-700 uppercase flex items-center">${iconHtml} ${originalName} <span class="text-indigo-400 text-[8px] font-mono lowercase ml-1">(@${key})</span></span>
                </div>
                <div class="text-gray-500 leading-tight h-8 overflow-hidden relative">
                    ${visualDesc}
                    <div class="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-white to-transparent"></div>
                </div>
                ${audioHtml}
            `;
            
            el.title = `TOKEN: @${key}\nVISUAL: ${visualDesc}\n\nAUDIO: ${audioDesc || 'Sin definir'}`; 
            list.appendChild(el);
        });
        
        const stats = document.createElement('div');
        stats.className = "text-[9px] text-gray-400 text-center mt-2 pt-2 border-t border-gray-100";
        stats.innerText = `${this.detectedKeys.length} Activos Definidos`;
        list.appendChild(stats);
    }
};

const CoherenceUI = {
    openEditor() {
        if (!EscaletaCore.rootHandle) return alert("Carga un proyecto primero para poder editar su Biblia Visual.");
        document.getElementById('bible-editor-modal').classList.remove('hidden');
        this.renderEditor();
    },
    
    closeEditor() {
        document.getElementById('bible-editor-modal').classList.add('hidden');
    },
    
    renderEditor() {
        const container = document.getElementById('bible-editor-container');
        container.innerHTML = '';
        
        const keys = CoherenceEngine.detectedKeys.sort();
        
        if (keys.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 mt-10" id="empty-bible-msg">La biblia está vacía o no hay activos escaneados. Añade un nuevo elemento.</div>';
        }
        
        keys.forEach(key => {
            const asset = CoherenceEngine.inventory[key];
            const cleanName = asset.originalName;
            container.appendChild(this.createAssetCard(cleanName, asset.visual, asset.audio));
        });
    },
    
    createAssetCard(name = "", visual = "", audio = "") {
        const el = document.createElement('div');
        el.className = "bible-asset-card bg-white p-6 border border-gray-200 shadow-sm rounded mb-4 relative group hover:border-indigo-300 transition-colors";
        el.innerHTML = `
            <button onclick="this.parentElement.remove()" class="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors" title="Eliminar Elemento"><i class="fa-solid fa-trash text-lg"></i></button>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mr-8">
                <div class="col-span-1 md:col-span-2">
                    <label class="label-text text-indigo-600 font-bold mb-1"><i class="fa-solid fa-tag mr-1"></i> ID / Nombre del Elemento</label>
                    <input type="text" class="asset-name config-input font-bold text-gray-800 text-sm bg-gray-50 p-2 rounded border border-gray-200" value="${name.replace(/"/g, '&quot;')}" placeholder="Ej: John Doe, Bar La Perla...">
                </div>
                <div>
                    <label class="label-text text-orange-600 font-bold mb-1"><i class="fa-solid fa-eye mr-1"></i> Firma Visual (Prompts) <span class="text-[9px] font-normal text-gray-400 lowercase">- Ingresa los tags visuales.</span></label>
                    <textarea class="asset-visual config-input h-24 bg-gray-50 p-3 rounded border border-gray-200 text-xs font-mono resize-y" placeholder="1boy, wearing a black coat, intricate details...">${visual}</textarea>
                </div>
                <div>
                    <label class="label-text text-blue-600 font-bold mb-1"><i class="fa-solid fa-microphone mr-1"></i> Firma de Audio <span class="text-[9px] font-normal text-gray-400 lowercase">- Opcional (Si es un personaje).</span></label>
                    <textarea class="asset-audio config-input h-24 bg-gray-50 p-3 rounded border border-gray-200 text-xs font-mono resize-y" placeholder="Deep raspy voice, calm tone...">${audio}</textarea>
                </div>
            </div>
        `;
        return el;
    },
    
    addNewAsset() {
        const container = document.getElementById('bible-editor-container');
        const emptyMsg = document.getElementById('empty-bible-msg');
        if (emptyMsg) emptyMsg.remove();
        
        container.prepend(this.createAssetCard());
    },
    
    async saveBible() {
        const container = document.getElementById('bible-editor-container');
        const cards = container.querySelectorAll('.bible-asset-card');
        const newAssets = [];
        
        cards.forEach(card => {
            const name = card.querySelector('.asset-name').value.trim();
            const visual = card.querySelector('.asset-visual').value.trim();
            const audio = card.querySelector('.asset-audio').value.trim();
            
            if (name && visual) {
                newAssets.push({
                    name: name,
                    visual_signature: visual,
                    audio_signature: audio
                });
            }
        });
        
        await CoherenceEngine.saveBibleFull(newAssets);
        this.closeEditor();
    }
};

window.CoherenceEngine = CoherenceEngine;
window.CoherenceUI = CoherenceUI;