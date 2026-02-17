// --- cronologia/escaleta/coherence.js ---
// MOTOR DE COHERENCIA VISUAL (SCANNER & INJECTOR) - V3 (HYPER-DETAIL SUPPORT)

const CoherenceEngine = {
    inventory: {}, // Mapa: "Nombre" -> "Descripción Visual HIPER DETALLADA"
    detectedKeys: [], 
    bibleKeys: new Set(),
    bibleHandle: null, // Guardamos referencia directa al archivo

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
            
            console.log(`📖 Biblia Visual detectada: ${assets.length} activos.`);

            assets.forEach(a => {
                // Soportar múltiples formatos, priorizando el más detallado
                const desc = a.visual_signature || a.visualDesc || a.visual_tags;
                if (a.name && desc) {
                    this.addToInventory(a.name, desc, true);
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
                    const name = json.name || json.title || entry.name.replace('.json','');
                    if (visual && name) this.addToInventory(name, visual, false);
                } catch (e) { }
            }
        }
    },

    addToInventory(name, desc, isBible = false) {
        if (!name || !desc) return;
        const key = name.toLowerCase().trim();
        
        if (isBible) this.bibleKeys.add(key);

        // LÓGICA V3: Siempre preferimos la descripción más larga (más detalle para Grok)
        if (!this.inventory[key] || this.inventory[key].length < desc.length) {
            this.inventory[key] = desc;
            if (!this.detectedKeys.includes(key)) this.detectedKeys.push(key);
        }
    },

    // --- NUEVO: MÉTODO PARA GUARDAR NUEVOS ACTIVOS EN LA BIBLIA ---
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

            // Añadir nuevos (evitando duplicados por nombre exacto)
            newAssets.forEach(newItem => {
                const exists = currentAssets.find(a => a.name.toLowerCase() === newItem.name.toLowerCase());
                if (exists) {
                    // Actualizamos si la nueva descripción es más larga
                    if (newItem.visual_signature.length > (exists.visual_signature || "").length) {
                        exists.visual_signature = newItem.visual_signature;
                    }
                } else {
                    currentAssets.push(newItem);
                }
                // Actualizar memoria local también
                this.addToInventory(newItem.name, newItem.visual_signature, true);
            });

            // Guardar disco
            const writable = await this.bibleHandle.createWritable();
            await writable.write(JSON.stringify(currentAssets, null, 2));
            await writable.close();
            
            this.renderCoherenceUI();
            console.log("Biblia Visual actualizada con éxito.");

        } catch (e) {
            console.error("Error guardando en Biblia:", e);
        }
    },

    // --- INYECCIÓN INTELIGENTE (NO TRUNCA NADA) ---
    getDetailedPromptFor(name) {
        const key = name.toLowerCase().trim();
        // Búsqueda aproximada si no hay match exacto
        const match = this.detectedKeys.find(k => k === key || k.includes(key) || key.includes(k));
        if (match) return this.inventory[match];
        return null; // No encontrado
    },

    renderCoherenceUI() {
        const list = document.getElementById('coherence-list');
        if (!list) return;
        list.innerHTML = '';
        
        if (this.detectedKeys.length === 0) {
            list.innerHTML = '<div class="text-[10px] text-gray-400 italic text-center p-4">Sin datos visuales.</div>';
            return;
        }

        const sortedKeys = [...this.detectedKeys].sort();

        sortedKeys.forEach(key => {
            const desc = this.inventory[key];
            const isFromBible = this.bibleKeys.has(key);
            const borderClass = isFromBible ? "border-indigo-200 bg-indigo-50/30" : "border-gray-200 bg-white";
            const iconHtml = isFromBible ? `<i class="fa-solid fa-book-bookmark text-indigo-500 mr-1"></i>` : `<i class="fa-regular fa-file text-gray-400 mr-1"></i>`;

            const el = document.createElement('div');
            el.className = `text-[10px] ${borderClass} border p-2 rounded shadow-sm hover:border-indigo-400 transition-colors group relative`;
            
            el.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-slate-700 uppercase flex items-center">${iconHtml} ${key}</span>
                </div>
                <div class="text-gray-500 leading-tight h-8 overflow-hidden relative">
                    ${desc}
                    <div class="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-white to-transparent"></div>
                </div>
            `;
            // Tooltip nativo completo
            el.title = desc; 
            list.appendChild(el);
        });
        
        const stats = document.createElement('div');
        stats.className = "text-[9px] text-gray-400 text-center mt-2 pt-2 border-t border-gray-100";
        stats.innerText = `${this.detectedKeys.length} Activos Definidos`;
        list.appendChild(stats);
    }
};