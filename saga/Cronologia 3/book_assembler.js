// Archivo: cronologia/book_assembler.js
// Propósito: Motor de Ensamblado que invoca la Arquitectura PARALELA o EN SERIE con Simulación Agéntica.

const BookAssembler = {
    data: {
        fileHandle: null,
        bookData: {}, 
        eventsQueue: [],
        processedMoments: 0,
        estimatedTotal: 0
    },

    // --- PRODUCCIÓN PARALELA (ORIGINAL) ---
    async startProduction() {
        if (!this.prepareEnvironment()) return;

        this.data.estimatedTotal = this.data.eventsQueue.length * 4; 
        this.setupBookJSON("Novela Generada (Paralelo)");
        
        try {
            this.data.fileHandle = await ui.selectedFolderHandle.getFileHandle(this.getSafeFilename(this.data.bookData.title), { create: true });
        } catch (e) { return alert("Error al crear el archivo."); }

        document.getElementById('book-loading-overlay').classList.remove('hidden');
        this.updateUI("INICIANDO PARALELO", `Preparando motor lógico para ${this.data.eventsQueue.length} capítulos...`);

        try {
            const finalChapters = await BookAI.generateFullBookParallel(
                this.data.eventsQueue, 
                (phase, id, current, total) => this.handleProgress(phase, current, total)
            );

            await this.finalizeAndSave(finalChapters);
        } catch (error) {
            console.error("Error crítico en la producción paralela:", error);
            this.updateUI("ERROR", "Fallo durante la generación masiva.");
        }
    },

    // --- NUEVO: PRODUCCIÓN EN SERIE (SECUENCIAL) ---
    async startProductionSerial() {
        if (!this.prepareEnvironment()) return;

        // Estimamos 3 fases por evento en serie (Simulación, Escritura, Revisión)
        this.data.estimatedTotal = this.data.eventsQueue.length * 3; 
        this.setupBookJSON("Novela Generada (Serie)");

        try {
            this.data.fileHandle = await ui.selectedFolderHandle.getFileHandle(this.getSafeFilename(this.data.bookData.title), { create: true });
        } catch (e) { return alert("Error al crear el archivo."); }

        document.getElementById('book-loading-overlay').classList.remove('hidden');
        this.updateUI("INICIANDO SERIE", `Preparando escritura secuencial para ${this.data.eventsQueue.length} capítulos...`);

        try {
            if (typeof BookAI2 === 'undefined') throw new Error("BookAI2 no está cargado. Revisa script en HTML.");
            
            const finalChapters = await BookAI2.generateFullBookSerial(
                this.data.eventsQueue, 
                (phase, current, total) => this.handleProgress(phase, current, total)
            );

            await this.finalizeAndSave(finalChapters);
        } catch (error) {
            console.error("Error crítico en la producción en serie:", error);
            this.updateUI("ERROR", "Fallo durante la generación secuencial.");
        }
    },

    // --- UTILIDADES COMPARTIDAS ---
    prepareEnvironment() {
        if (typeof timeline === 'undefined' || !timeline.events || timeline.events.length === 0) {
            alert("No hay eventos en la cronología. Crea o carga un proyecto primero.");
            return false;
        }
        if (!ui.selectedFolderHandle) {
            alert("No hay una carpeta de proyecto vinculada. Selecciona una carpeta primero.");
            return false;
        }
        this.data.eventsQueue = JSON.parse(JSON.stringify(timeline.events)).sort((a,b) => (a.time||0)-(b.time||0));
        this.data.processedMoments = 0;
        return true;
    },

    setupBookJSON(title) {
        this.data.bookData = {
            title: title,
            author: "OmniGen AI",
            genre: "Narrativa Líquida",
            created: new Date().toISOString(),
            chapters: []
        };
    },

    getSafeFilename(title) {
        return String(title).replace(/[^a-z0-9áéíóúñÁÉÍÓÚÑ ]/gi, '').trim().replace(/\s+/g, '_') + "_" + Date.now() + ".json";
    },

    handleProgress(phase, current, total) {
        this.data.processedMoments++;
        if (phase === 'simulation') {
            this.updateUI("SIMULACIÓN LÓGICA", `Calculando variables de estado (Capítulo ${current}/${total})...`);
        } else if (phase === 'writing') {
            this.updateUI("ESCRITURA", `Redactando Capítulo ${current}/${total}...`);
        } else if (phase === 'connecting') {
            this.updateUI("COSTURA ORGÁNICA", `Generando puentes externos de transición (${current}/${total})...`);
        } else if (phase === 'reviewing') {
            this.updateUI("PULIDO CRÍTICO", `Corrector de estilo editando Capítulo ${current}/${total}...`);
        }
    },

    async finalizeAndSave(finalChapters) {
        this.updateUI("GUARDANDO", "Estructurando archivo JSON final...");
        this.data.bookData.chapters = finalChapters.map(ch => ({
            title: ch.title,
            paragraphs: ch.text.split('\n').map(p => p.trim()).filter(p => p.length > 0)
        }));

        await this.saveContent();

        this.updateUI("FINALIZADO", "Libro ensamblado con continuidad absoluta.");
        document.getElementById('book-mode-text').innerText = "COMPLETADO";
        document.getElementById('book-mode-text').className = "text-[10px] font-bold text-green-600 uppercase bg-green-100 px-2 py-1 rounded";
        setTimeout(() => document.getElementById('book-loading-overlay').classList.add('hidden'), 3000);
    },

    async saveContent() {
        if (!this.data.fileHandle) return;
        try {
            const writable = await this.data.fileHandle.createWritable();
            await writable.write(JSON.stringify(this.data.bookData, null, 4));
            await writable.close();
        } catch (e) {
            console.error("Error escribiendo JSON", e);
        }
    },

    updateUI(mode, subtext) {
        const subtextElem = document.getElementById('book-status-subtext');
        if(subtextElem) subtextElem.innerText = subtext;
        
        const modeElem = document.getElementById('book-mode-text');
        if(modeElem) {
            modeElem.innerText = mode;
            if(mode.includes("ESCRITURA")) modeElem.className = "text-[10px] font-bold text-indigo-600 uppercase bg-indigo-100 px-2 py-1 rounded shadow-sm border border-indigo-200 animate-pulse";
            else if(mode === "SIMULACIÓN LÓGICA") modeElem.className = "text-[10px] font-bold text-purple-600 uppercase bg-purple-100 px-2 py-1 rounded shadow-sm border border-purple-200";
            else if(mode === "COSTURA ORGÁNICA") modeElem.className = "text-[10px] font-bold text-teal-600 uppercase bg-teal-100 px-2 py-1 rounded shadow-sm border border-teal-200";
            else if(mode === "PULIDO CRÍTICO") modeElem.className = "text-[10px] font-bold text-amber-600 uppercase bg-amber-100 px-2 py-1 rounded shadow-sm border border-amber-200 animate-pulse";
            else if(mode === "GUARDANDO") modeElem.className = "text-[10px] font-bold text-blue-600 uppercase bg-blue-100 px-2 py-1 rounded";
            else modeElem.className = "text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded";
        }

        const p = Math.floor((this.data.processedMoments / this.data.estimatedTotal) * 100) || 0;
        const progressBar = document.getElementById('book-progress-bar');
        const progressPercent = document.getElementById('book-progress-percent');
        const progressStats = document.getElementById('book-progress-stats');
        
        if(progressBar) progressBar.style.width = Math.min(100, p) + "%";
        if(progressPercent) progressPercent.innerText = Math.min(100, p) + "%";
        if(progressStats) progressStats.innerText = `${this.data.processedMoments} Ciclos Procesados`;
    }
};