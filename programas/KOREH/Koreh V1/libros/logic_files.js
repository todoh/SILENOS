// --- LÓGICA DE ARCHIVOS Y ORQUESTACIÓN ---
// Extendemos el objeto core base
Object.assign(core, {
    
    async confirmFolderSelection() {
        if (!ui.selectedFolderHandle) {
            ui.log("Por favor selecciona una carpeta.", "error");
            return;
        }

        ui.toggleFileSelector(); // Cerrar modal
        ui.log("Escaneando contenido de carpeta...", "info");

        const loadedFiles = [];
        
        try {
            for await (const entry of ui.selectedFolderHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                    try {
                        const file = await entry.getFile();
                        const text = await file.text();
                        loadedFiles.push({
                            title: entry.name,
                            content: JSON.parse(text), 
                            id: entry.name
                        });
                    } catch (err) {
                        console.warn("Error leyendo archivo:", entry.name);
                    }
                }
            }
            
            if (loadedFiles.length === 0) {
                ui.log("Carpeta vacía o sin archivos JSON válidos.", "error");
                return;
            }

            this.parseData(loadedFiles);

        } catch (e) {
            ui.log("Error de acceso al sistema de archivos.", "error");
            console.error(e);
        }
    },

    parseData(nodes) {
        document.getElementById('chat-container').innerHTML = '';
        this.projectData = { timeline: null, knowledgeBase: [], eventsQueue: [], currentEventIndex: 0, currentMomentIndex: 0, runningContext: "Inicio de la historia.", lastParagraphs: "", processedMoments: 0, totalMoments: 0 };
        
        ui.log(`Analizando ${nodes.length} archivos...`, "info");
        let foundTimeline = false;
        let foundEntities = 0;

        nodes.forEach(n => {
            try {
                let c = n.content; 
                const isTimelineFile = n.title.includes("TIMELINE") || (c.events && Array.isArray(c.events));
                const isEntityFile = n.title.includes("ENT_") || (c.name && c.visualDesc);

                if (isTimelineFile) {
                    this.projectData.timeline = c;
                    ui.log(`Timeline cargada: ${n.title}`, "success");
                    foundTimeline = true;
                } else if (isEntityFile) {
                    this.projectData.knowledgeBase.push({ id: n.id, name: c.name || n.title, data: c });
                    foundEntities++;
                }
            } catch(e) { }
        });

        if (foundTimeline && this.projectData.timeline.events) {
            this.projectData.eventsQueue = this.projectData.timeline.events.sort((a,b) => (a.time||0)-(b.time||0));
            
            this.projectData.eventsQueue.forEach(e => {
                if (!e.moments || !e.moments.length) e.moments = [{ text: e.description }];
                this.projectData.totalMoments += e.moments.length;
                e.detectedContext = []; 
            });

            document.getElementById('start-btn').disabled = false;
            ui.log(`Carga completa: ${this.projectData.eventsQueue.length} escenas y ${foundEntities} entidades.`, "ready");
            document.getElementById('prog-text').innerText = "Sistema Listo";
        } else {
            ui.log("ERROR: Falta 'TIMELINE_DATA.json'", "error");
            ui.log("Ejecuta primero el EXTRACTOR.", "info");
        }
    },

    async saveToBook(eventIndex, eventTitle, textContent) {
        if (!this.bookFileHandle) return;

        if (!this.bookData.chapters[eventIndex]) {
            this.bookData.chapters[eventIndex] = {
                title: eventTitle,
                paragraphs: []
            };
        }

        const newParagraphs = textContent.split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0);

        this.bookData.chapters[eventIndex].paragraphs.push(...newParagraphs);

        try {
            const writable = await this.bookFileHandle.createWritable();
            await writable.write(JSON.stringify(this.bookData, null, 4));
            await writable.close();
        } catch (err) {
            ui.log("Error en autoguardado JSON.", "error");
            console.error(err);
        }
    },

    async startProduction() {
        if (!ui.selectedFolderHandle) {
            ui.log("No hay carpeta seleccionada para guardar.", "error");
            return;
        }

        document.getElementById('start-btn').disabled = true;
        
        // 1. GENERAR TÍTULO
        let bookTitle = await this.generateBookTitle(); 
        
        // 2. FORZAR NOMBRE DE ARCHIVO BASADO EN TÍTULO
        // Convertimos "El Título del Libro" a "El_Titulo_del_Libro"
        let safeName = String(bookTitle)
            .replace(/[^a-z0-9áéíóúñÁÉÍÓÚÑ ]/gi, '') // Solo letras y números
            .trim()
            .replace(/\s+/g, '_'); // Espacios a guiones bajos
            
        let finalFilename = safeName + ".json";

        try {
            ui.log(`Creando fichero: ${finalFilename}`, "info");
            
            // Intentar crear con el nombre exacto del título
            try {
                this.bookFileHandle = await ui.selectedFolderHandle.getFileHandle(finalFilename, { create: true });
            } catch (creationError) {
                // Si falla (por caracteres raros que se nos pasaron), fallback seguro
                console.warn("Fallo nombre basado en título, usando fallback...", creationError);
                finalFilename = "Novela_" + Date.now() + ".json";
                this.bookFileHandle = await ui.selectedFolderHandle.getFileHandle(finalFilename, { create: true });
                ui.log(`Nombre cambiado por seguridad a: ${finalFilename}`, "architect");
            }
            
            this.bookData = {
                title: bookTitle, 
                author: "OmniGen v5.3 AI",
                genre: "Narrativa Líquida",
                created: new Date().toISOString(),
                chapters: []
            };

            const writable = await this.bookFileHandle.createWritable();
            await writable.write(JSON.stringify(this.bookData, null, 4));
            await writable.close();
            
            ui.log(`Libro iniciado: "${bookTitle}"`, "success");
            
            // Iniciar proceso
            this.linkDataToEvents();
            this.processStep(); 

        } catch (e) {
            ui.log("Error FATAL creando archivo. Revisa permisos.", "error");
            console.error(e);
            document.getElementById('start-btn').disabled = false;
        }
    }
});