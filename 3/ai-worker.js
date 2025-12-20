// SILENOS 3/ai-worker.js
// --- GESTOR DE COLA Y FLUJO DE TRABAJO (LOGIC SIDE) ---

const AIWorker = {
    queue: [],
    isProcessing: false,
    
    // Estado del Contexto (Archivos arrastrados)
    activeContextFiles: new Set(),

    init() {
        // Loop del procesador
        setInterval(() => this.processQueue(), 1000);
    },

    // --- GESTIÓN DE CONTEXTO ---
    
    addFileToContext(fileId) {
        this.activeContextFiles.add(fileId);
        this.renderContextList();
    },

    removeFileFromContext(fileId) {
        this.activeContextFiles.delete(fileId);
        this.renderContextList();
    },

    clearContext() {
        this.activeContextFiles.clear();
        this.renderContextList();
    },

    renderContextList() {
        const container = document.getElementById('ai-context-list');
        if (!container) return;

        container.innerHTML = '';
        if (this.activeContextFiles.size === 0) {
            container.innerHTML = '<div class="text-xs text-gray-400 italic p-2">Arrastra archivos o carpetas aquí...</div>';
            return;
        }

        this.activeContextFiles.forEach(id => {
            const item = FileSystem.getItem(id);
            if (!item) return;
            
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between bg-white/50 px-2 py-1 rounded mb-1 text-xs';
            div.innerHTML = `
                <div class="flex items-center gap-2 truncate">
                    <i data-lucide="${item.icon}" class="${item.color} w-3 h-3"></i>
                    <span class="truncate max-w-[120px]">${item.title}</span>
                </div>
                <button onclick="AIWorker.removeFileFromContext('${id}')" class="text-red-500 hover:text-red-700">×</button>
            `;
            container.appendChild(div);
        });
        if (window.lucide) lucide.createIcons();
    },

    // --- RECURSIVIDAD Y EXTRACCIÓN ---

    getRecursiveContext(fileId) {
        let text = "";
        const item = FileSystem.getItem(fileId);
        if (!item) return "";

        if (item.type === 'narrative') {
            text += `[${item.content.tag || 'DATA'}] ${item.title}: ${item.content.text}\n\n`;
        } else if (item.type === 'folder') {
            const children = FileSystem.getItems(item.id);
            children.forEach(child => {
                text += this.getRecursiveContext(child.id);
            });
        } else if (item.type === 'file' && item.content) {
             text += `[DATA] ${item.title}: ${JSON.stringify(item.content)}\n\n`;
        }
        return text;
    },

    async buildFullContext() {
        let fullText = "";
        for (const id of this.activeContextFiles) {
            fullText += this.getRecursiveContext(id);
        }
        return fullText;
    },

    // --- CREACIÓN DE TRABAJO ---

    async createJob(prompt, numChapters = 5) {
        if (!prompt) return alert("Escribe una idea para el guion/libro.");
        if (!AIService.hasKeys()) return alert("Configura tus API Keys en Ajustes primero.");

        const contextData = await this.buildFullContext();
        
        // Crear el Libro contenedor inmediatamente
        const newBook = FileSystem.createBook(prompt.substring(0, 20) || "Nuevo Libro IA", 'desktop');
        newBook.content.chapters = [];
        FileSystem.save();
        refreshAllViews();

        const job = {
            id: Date.now(),
            bookId: newBook.id,
            prompt: prompt,
            targetChapters: parseInt(numChapters) || 5, // Nuevo parámetro
            context: contextData,
            status: 'pending', 
            progress: 0,
            logs: "En cola...",
            totalChapters: 0
        };

        this.queue.push(job);
        this.renderQueue();
    },

    // --- PROCESADOR ---

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        const job = this.queue.find(j => j.status === 'pending');
        if (!job) return;

        this.isProcessing = true;
        job.status = 'planning';
        this.renderQueue();

        try {
            await this.executeJob(job);
        } catch (error) {
            console.error(error);
            job.status = 'error';
            job.logs = "Error: " + error.message;
        }

        this.isProcessing = false;
        this.renderQueue();
    },

    async executeJob(job) {
        const updateJob = (msg, prog) => {
            job.logs = msg;
            job.progress = prog;
            this.renderQueue();
        };

        // 1. PLANIFICACIÓN (Delegado a AIService)
        updateJob(`Planificando ${job.targetChapters} capítulos...`, 10);
        
        const planData = await AIService.generatePlan(job.prompt, job.context, job.targetChapters);
        
        if (!planData || !planData.chapters) throw new Error("Fallo al generar plan estructural.");

        // Actualizar título del libro (Refrescamos referencia por seguridad)
        FileSystem.init(); 
        FileSystem.updateItem(job.bookId, { title: planData.title || "Libro IA Generado" });
        
        // 2. ESCRITURA
        const chapters = planData.chapters;
        job.totalChapters = chapters.length;
        
        // Limpiar libro inicialmente
        const initialBookRef = FileSystem.getItem(job.bookId);
        if(initialBookRef) {
            initialBookRef.content.chapters = [];
            FileSystem.save();
        }

        for (let i = 0; i < chapters.length; i++) {
            const cap = chapters[i];
            const step = i + 1;
            
            updateJob(`Escribiendo Cap ${step}/${chapters.length}: ${cap.title}`, 20 + ((step / chapters.length) * 80));

            // CORRECCIÓN CRÍTICA: Obtenemos el libro fresco del sistema de archivos en CADA iteración.
            // Esto evita que la referencia se pierda si FileSystem.init() fue llamado por otro proceso.
            FileSystem.init(); 
            const currentBook = FileSystem.getItem(job.bookId);
            
            if (!currentBook) throw new Error("El libro destino ha desaparecido.");

            // Contexto acumulativo (últimos 1500 caracteres del capítulo anterior)
            let prevContext = "";
            if (currentBook.content.chapters.length > 0) {
                const lastCap = currentBook.content.chapters[currentBook.content.chapters.length - 1];
                const fullLastText = lastCap.paragraphs.join("\n");
                prevContext = fullLastText.substring(Math.max(0, fullLastText.length - 1500));
            }

            // Llamada al servicio para escribir
            const content = await AIService.writeChapterContent(
                cap.title, 
                cap.summary, 
                job.context, 
                prevContext, 
                step, 
                chapters.length
            );
            
            // Guardar capítulo en la referencia fresca
            currentBook.content.chapters.push({
                title: cap.title,
                paragraphs: content.split('\n\n').filter(p => p.trim().length > 0)
            });
            FileSystem.save();
            
            // Refrescar UI inmediatamente si el libro está abierto
            if (typeof BookManager !== 'undefined' && typeof openWindows !== 'undefined') {
                // Buscamos ventanas que tengan este bookId (ya sea por ID directo o propiedad fileId)
                const wins = openWindows.filter(w => w.id === job.bookId || w.fileId === job.bookId);
                wins.forEach(win => {
                    BookManager.renderContent(win.id, job.bookId);
                });
            }
        }

        job.status = 'completed';
        updateJob("¡Completado!", 100);
    },

    // --- RENDER UI ---
    
    renderQueue() {
        const container = document.getElementById('ai-queue-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.queue.slice().reverse().forEach(job => {
            const el = document.createElement('div');
            el.className = 'bg-white p-2 rounded mb-2 shadow-sm border border-gray-100';
            
            let statusColor = 'bg-gray-200';
            if (job.status === 'planning' || job.status === 'writing') statusColor = 'bg-blue-500';
            if (job.status === 'completed') statusColor = 'bg-green-500';
            if (job.status === 'error') statusColor = 'bg-red-500';

            el.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-bold text-gray-700 truncate w-2/3">${job.prompt}</span>
                    <span class="text-[10px] text-gray-500 uppercase">${job.status}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
                    <div class="${statusColor} h-1.5 rounded-full transition-all duration-500" style="width: ${job.progress}%"></div>
                </div>
                <div class="text-[10px] text-gray-400 truncate">${job.logs}</div>
            `;
            container.appendChild(el);
        });
    }
};

AIWorker.init();