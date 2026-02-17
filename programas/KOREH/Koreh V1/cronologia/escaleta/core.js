
// --- cronologia/escaleta/core.js ---
// GESTOR DE ESTADO Y SISTEMA DE ARCHIVOS

const EscaletaCore = {
data: {
project_name: "Sin Título",
takes: [] // Array de objetos { id, visual_prompt, narration_text, video_file, audio_file, ... }
},
rootHandle: null,
escaletaHandle: null, // Referencia al archivo ESCALETA_DATA.json
saveTimer: null,

init() {
    console.log("Escaleta Core v1.0 Inicializado");
    // Intentar recuperar handle de la sesión anterior si es posible (limitado por seguridad del navegador)
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

        // 3. Hidratar Blobs (Recuperar URLs de videos/audios si existen)
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

// Recupera los archivos físicos mp4/mp3 y genera URLs locales
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
        // Audio
        if (take.audio_file) {
            try {
                const handle = await this.rootHandle.getFileHandle(take.audio_file);
                const file = await handle.getFile();
                take.audioBlobUrl = URL.createObjectURL(file);
                take.audioBlob = file; // Necesario para el exporter
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
        // Aseguramos que tenemos el handle
        if (!this.escaletaHandle) {
            this.escaletaHandle = await this.rootHandle.getFileHandle('ESCALETA_DATA.json', { create: true });
        }
        
        // Preparamos datos (limpiamos URLs temporales blob: que no sirven al recargar)
        const cleanData = JSON.parse(JSON.stringify(this.data));
        cleanData.takes.forEach(t => {
            delete t.videoBlobUrl;
            delete t.audioBlobUrl;
            // audioBlob no se clona en JSON.stringify, así que estamos seguros
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
}
};
