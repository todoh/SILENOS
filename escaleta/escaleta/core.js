// --- cronologia/escaleta/core.js ---
// GESTOR DE ESTADO Y SISTEMA DE ARCHIVOS

const EscaletaCore = {
    data: {
        project_name: "Sin Título",
        takes: [] 
    },
    rootHandle: null,
    escaletaHandle: null, 
    saveTimer: null,

    init() {
        console.log("Escaleta Core v1.0 Inicializado");
    },

    // --- CARGA DE PROYECTO ---
    async loadProject(folderHandle) {
        this.rootHandle = folderHandle;
        
        try {
            EscaletaUI.toggleLoading(true, "CARGANDO PROYECTO", "Leyendo estructura de archivos...");

            // 1. Escaneo de Coherencia (Biblias y JSONs)
            await CoherenceEngine.scanProject(folderHandle);

            // 2. Intentar cargar ESCALETA_DATA.json (Datos propios)
            try {
                this.escaletaHandle = await folderHandle.getFileHandle('ESCALETA_DATA.json', { create: true });
                const file = await this.escaletaHandle.getFile();
                const text = await file.text();
                if (text.trim()) {
                    this.data = JSON.parse(text);
                } else {
                    this.data = { project_name: folderHandle.name, takes: [] };
                }
            } catch (e) {
                console.warn("Creando nuevo ESCALETA_DATA.json");
                this.data = { project_name: folderHandle.name, takes: [] };
            }

            // 3. Hidratar Blobs
            await this.hydrateMediaAssets();

            // 4. Renderizar UI
            EscaletaUI.renderTakes(this.data.takes);
            EscaletaUI.updateStats();
            EscaletaUI.updateProjectName(folderHandle.name);

            EscaletaUI.toggleLoading(false);

        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            alert("Error cargando proyecto: " + e.message);
        }
    },

    async hydrateMediaAssets() {
        if (!this.data.takes) return;
        
        for (const take of this.data.takes) {
            // Video
            if (take.video_file) {
                try {
                    const handle = await this.rootHandle.getFileHandle(take.video_file);
                    const file = await handle.getFile();
                    take.videoBlobUrl = URL.createObjectURL(file);
                } catch (e) { console.warn(`Video perdido: ${take.video_file}`); }
            }
            // Imagen
            if (take.image_file) {
                try {
                    const handle = await this.rootHandle.getFileHandle(take.image_file);
                    const file = await handle.getFile();
                    take.imageBlobUrl = URL.createObjectURL(file);
                } catch (e) { console.warn(`Imagen perdida: ${take.image_file}`); }
            }
            // Audio
            if (take.audio_file) {
                try {
                    const handle = await this.rootHandle.getFileHandle(take.audio_file);
                    const file = await handle.getFile();
                    take.audioBlobUrl = URL.createObjectURL(file);
                    take.audioBlob = file; 
                } catch (e) { console.warn(`Audio perdido: ${take.audio_file}`); }
            }
        }
    },

    // --- GUARDADO ---
    triggerAutoSave() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        const status = document.getElementById('auth-status-text');
        if(status) status.innerText = "GUARDANDO...";
        
        this.saveTimer = setTimeout(() => this.saveToDisk(), 2000);
    },

    async saveToDisk() {
        if (!this.rootHandle) return;
        try {
            if (!this.escaletaHandle) {
                this.escaletaHandle = await this.rootHandle.getFileHandle('ESCALETA_DATA.json', { create: true });
            }
            
            const cleanData = JSON.parse(JSON.stringify(this.data));
            cleanData.takes.forEach(t => {
                delete t.videoBlobUrl;
                delete t.imageBlobUrl;
                delete t.audioBlobUrl;
            });

            const writable = await this.escaletaHandle.createWritable();
            await writable.write(JSON.stringify(cleanData, null, 2));
            await writable.close();
            
            const status = document.getElementById('auth-status-text');
            if(status) status.innerText = "ONLINE (GUARDADO)";
            setTimeout(() => { if(status) status.innerText = "ONLINE"; }, 2000);

        } catch (e) {
            console.error("Error guardando:", e);
            alert("Error al guardar cambios.");
        }
    },

    // --- UTILIDADES ---
    updateTake(id, field, value) {
        const take = this.data.takes.find(t => t.id === id);
        if (take) {
            take[field] = value;
            this.triggerAutoSave();
        }
    },

    toggleActMarker(id) {
        const take = this.data.takes.find(t => t.id === id);
        if (!take) return;
        
        if (take.act_marker) {
            delete take.act_marker;
        } else {
            take.act_marker = "NUEVO ACTO";
        }
        
        this.saveToDisk();
        EscaletaUI.renderTakes(this.data.takes);
    },

    // --- NUEVO: BORRAR ACTO COMPLETO ---
    deleteActAndTakes(startTakeId) {
        if (!confirm("¿Seguro que deseas eliminar TODO EL ACTO y todas las tomas (escenas) que contiene? Esta acción no se puede deshacer.")) return;
        
        const startIndex = this.data.takes.findIndex(t => t.id === startTakeId);
        if (startIndex === -1) return;

        let endIndex = startIndex + 1;
        // Buscar la siguiente toma que tenga un marcador de acto (o llegar al final)
        while (endIndex < this.data.takes.length && !this.data.takes[endIndex].act_marker) {
            endIndex++;
        }

        // Eliminar desde el índice inicial hasta el final del acto
        this.data.takes.splice(startIndex, endIndex - startIndex);
        
        // Reordenar secuencias
        this.data.takes.forEach((t, idx) => t.sequence_order = idx + 1);
        
        this.saveToDisk();
        EscaletaUI.renderTakes(this.data.takes);
        EscaletaUI.updateStats();
    },

    // --- NUEVO: ORDENAR ACTOS ALFABÉTICAMENTE ---
    sortActsAlphabetically() {
        if (!confirm("¿Quieres ordenar todos los actos alfabéticamente según su nombre?\nLas tomas sueltas que no pertenezcan a ningún acto se agruparán al principio.")) return;

        const acts = [];
        let currentAct = { name: "", takes: [] }; // Para tomas sin acto inicial

        // Agrupar tomas por Acto
        for (const take of this.data.takes) {
            if (take.act_marker) {
                // Si ya había un acto recopilándose, lo guardamos
                if (currentAct.takes.length > 0) {
                    acts.push(currentAct);
                }
                // Empezamos nuevo acto (guardamos el nombre en minúsculas para el sort)
                currentAct = { name: take.act_marker.trim().toLowerCase(), takes: [take] };
            } else {
                currentAct.takes.push(take);
            }
        }
        if (currentAct.takes.length > 0) {
            acts.push(currentAct);
        }

        // Separar tomas huérfanas (sin nombre) de los actos nombrados
        const orphans = acts.filter(a => a.name === "");
        const namedActs = acts.filter(a => a.name !== "");

        // Ordenar alfabéticamente los actos nombrados
        namedActs.sort((a, b) => a.name.localeCompare(b.name));

        // Reensamblar el array global
        const sortedTakes = [];
        orphans.forEach(act => sortedTakes.push(...act.takes));
        namedActs.forEach(act => sortedTakes.push(...act.takes));

        // Aplicar y reindexar
        this.data.takes = sortedTakes;
        this.data.takes.forEach((t, idx) => t.sequence_order = idx + 1);

        this.saveToDisk();
        EscaletaUI.renderTakes(this.data.takes);
        EscaletaUI.updateStats();
    },

    // --- COPIAR TODOS LOS PROMPTS (GLOBAL) ---
    async copyAllPrompts() {
        if (!this.data.takes || this.data.takes.length === 0) return alert("No hay tomas para copiar.");
        // AÑADIDO: .join('\n\n') para saltos de línea dobles
        const prompts = this.data.takes.map(t => t.visual_prompt).filter(Boolean).join('\n\n');
        try {
            await navigator.clipboard.writeText(prompts);
            alert("Todos los prompts copiados al portapapeles.");
        } catch (err) {
            console.error('Error al copiar: ', err);
            alert("Error al copiar al portapapeles.");
        }
    },

    // --- COPIAR PROMPTS DE UN ACTO ESPECÍFICO ---
    async copyActPrompts(startTakeId) {
        if (!this.data.takes || this.data.takes.length === 0) return;
        
        const startIndex = this.data.takes.findIndex(t => t.id === startTakeId);
        if (startIndex === -1) return;

        let endIndex = startIndex + 1;
        while (endIndex < this.data.takes.length && !this.data.takes[endIndex].act_marker) {
            endIndex++;
        }

        const actTakes = this.data.takes.slice(startIndex, endIndex);
        // AÑADIDO: .join('\n\n') para saltos de línea dobles
        const prompts = actTakes.map(t => t.visual_prompt).filter(Boolean).join('\n\n');
        
        try {
            await navigator.clipboard.writeText(prompts);
            alert(`Prompts del acto copiados al portapapeles (${actTakes.length} tomas).`);
        } catch (err) {
            console.error('Error al copiar: ', err);
            alert("Error al copiar al portapapeles.");
        }
    },

    addTake(targetId = null, position = 'after') {
        const newTake = {
            id: `take-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            sequence_order: 0, 
            visual_prompt: "Nueva escena visual... (describe el plano)",
            narration_text: "Nuevo texto de narrador...",
            duration: 5.0,
            video_file: null,
            image_file: null,
            audio_file: null,
            audio_mode: 'diegetic',
            audio_custom_prompt: '',
            audio_voice_lock: ''
        };

        if (targetId) {
            const index = this.data.takes.findIndex(t => t.id === targetId);
            if (index !== -1) {
                if (position === 'before') {
                    this.data.takes.splice(index, 0, newTake);
                } else {
                    this.data.takes.splice(index + 1, 0, newTake);
                }
            } else {
                this.data.takes.push(newTake);
            }
        } else {
            this.data.takes.push(newTake);
        }

        this.data.takes.forEach((t, idx) => t.sequence_order = idx + 1);
        
        this.saveToDisk();
        EscaletaUI.renderTakes(this.data.takes);
        EscaletaUI.updateStats();
    },

    deleteTake(id) {
        if (!confirm("¿Seguro que deseas eliminar esta toma de la escaleta?")) return;
        
        this.data.takes = this.data.takes.filter(t => t.id !== id);
        this.data.takes.forEach((t, idx) => t.sequence_order = idx + 1);
        
        this.saveToDisk();
        EscaletaUI.renderTakes(this.data.takes);
        EscaletaUI.updateStats();
    },

    async saveMediaFile(blob, filename) {
        if (!this.rootHandle) return;
        try {
            const handle = await this.rootHandle.getFileHandle(filename, { create: true });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return filename;
        } catch (e) {
            console.error(`Error guardando archivo ${filename}:`, e);
            throw e;
        }
    },

    async attachLocalMedia(takeId, file, type) {
        const take = this.data.takes.find(t => t.id === takeId);
        if (!take) return;

        try {
            EscaletaUI.toggleLoading(true, `IMPORTANDO ${type.toUpperCase()}`, "Copiando archivo a Silenos...");
            
            const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : (type === 'image' ? 'jpg' : 'mp3'));
            let prefix = 'AUD';
            if (type === 'video') prefix = 'VID';
            else if (type === 'image') prefix = 'IMG';

            const filename = `${prefix}_${takeId}_LOCAL.${ext}`;
            
            await this.saveMediaFile(file, filename);

            if (type === 'video') {
                take.video_file = filename;
                take.videoBlobUrl = URL.createObjectURL(file);
                take.image_file = null;
                take.imageBlobUrl = null;
            } else if (type === 'image') {
                take.image_file = filename;
                take.imageBlobUrl = URL.createObjectURL(file);
                take.video_file = null;
                take.videoBlobUrl = null;
            } else {
                take.audio_file = filename;
                take.audioBlobUrl = URL.createObjectURL(file);
                take.audioBlob = file; 
            }
            
            this.triggerAutoSave();
            
            EscaletaUI.renderTakes(this.data.takes);
            Inspector.selectTake(takeId); 
            EscaletaUI.toggleLoading(false);
            
        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            alert(`Error al importar el archivo de ${type}: ` + e.message);
        }
    }
};

window.EscaletaCore = EscaletaCore;