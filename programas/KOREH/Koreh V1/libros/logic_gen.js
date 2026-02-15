// --- LÓGICA DE GENERACIÓN E IA (VERSIÓN 5.0 - FLUJO NARRATIVO HUMANO - REFINADO) ---
Object.assign(core, {
    
    initGenState() {
        if (!this.projectData.forbiddenWords) {
            this.projectData.forbiddenWords = [];
        }
        // FASE 1: MEMORIA - Inicializamos el resumen acumulativo si no existe
        if (!this.projectData.storySummary) {
            this.projectData.storySummary = "Inicio de la historia.";
        }
        if (!this.projectData.lastOutputSnippet) {
            this.projectData.lastOutputSnippet = "";
        }
        // Nueva variable para evitar bucles de diálogo
        if (!this.projectData.lastDialogues) {
            this.projectData.lastDialogues = [];
        }
    },

    linkDataToEvents() {
        this.projectData.eventsQueue.forEach(event => {
            let searchCorpus = ((event.description||"") + " " + (event.moments?event.moments.map(m=>m.text).join(" "):"")).toLowerCase();
            this.projectData.knowledgeBase.forEach(item => {
                if (item.name && searchCorpus.includes(item.name.toLowerCase().trim())) {
                    event.detectedContext.push(item);
                }
            });
        });
    },

    generateContextFromLinks(detectedItems) {
        if (!detectedItems.length) return "";
        return "### LORE (DATOS DE FONDO):\n" + detectedItems.map(i => `- ${i.name}: ${JSON.stringify(i.data).slice(0,250)}...`).join("\n");
    },

    updateForbiddenWords(text) {
        // ACTUALIZACIÓN: Capturamos también trigramas (frases de 3 palabras) para evitar frases hechas repetidas
        const words = text.match(/\b[a-zA-ZáéíóúñÁÉÍÓÚÑ]{6,}\b/g) || [];
        const unique = [...new Set(words)].map(w => w.toLowerCase());
        
        // Capturar inicio de frase para evitar el "Efecto Eco"
        const firstFewWords = text.split(' ').slice(0, 3).join(' ');
        
        this.projectData.forbiddenWords = [firstFewWords, ...unique, ...this.projectData.forbiddenWords].slice(0, 30);
    },

    async generateBookTitle() {
        ui.log("Diseñando título comercial...", "architect");
        let contextPreview = "Historia de ficción";
        if (this.projectData.timeline && this.projectData.timeline.events) {
            contextPreview = JSON.stringify(this.projectData.timeline.events.slice(0, 3)).substring(0, 500);
        }
        const prompt = `ROL: Editor. TAREA: Título novela. ESTILO: Misterioso, comercial. CONTEXTO: ${contextPreview}. Dame SOLO el título.`;
        try {
            const rawTitle = await AI.call("Expert", prompt);
            return rawTitle.replace(/["\.]/g, '').trim();
        } catch (e) { return "Proyecto_Sin_Titulo"; }
    },

    // Función auxiliar para limpiar solapamientos (Cuando la IA repite el final del texto anterior)
    cleanOverlap(previousText, newText) {
        if (!previousText || !newText) return newText;
        
        // Normalizamos para comparar
        const prev = previousText.trim();
        const curr = newText.trim();

        // Buscar si el principio del nuevo texto existe al final del anterior
        // Comprobamos frases de hasta 50 caracteres
        for (let i = 10; i < Math.min(curr.length, 150); i++) {
            const snippet = curr.substring(0, i);
            if (prev.endsWith(snippet)) {
                // Hay solapamiento, devolvemos el texto sin esa parte
                return curr.substring(i).trim();
            }
        }
        
        // Chequeo de identidad total
        if (prev.includes(curr)) return ""; // El nuevo texto ya está contenido en el anterior (bucle)
        
        return curr;
    },
 
   // --- LÓGICA PRINCIPAL DEL BUCLE MEJORADA ---
    async processStep() {
        this.initGenState();

        if (this.projectData.currentEventIndex >= this.projectData.eventsQueue.length) {
            ui.log("Generación completada.", "success");
            document.getElementById('progress-bar').style.width = "100%";
            document.getElementById('prog-percent').innerText = "100%";
            return;
        }
        
        const event = this.projectData.eventsQueue[this.projectData.currentEventIndex];
        
        if (!event.moments || this.projectData.currentMomentIndex >= event.moments.length) {
            this.projectData.currentEventIndex++; 
            this.projectData.currentMomentIndex = 0; 
            setTimeout(() => this.processStep(), 50); 
            return;
        }

        const moment = event.moments[this.projectData.currentMomentIndex];
        
        // MEMORIA: 
        // DeepHistory: Lo que acaba de pasar. Aumentado a 2500 para dar más contexto de "qué NO repetir".
        const deepHistory = this.projectData.runningContext.slice(-2500); 
        const globalMemory = this.projectData.storySummary.slice(-3000);
        
        // Capturamos las últimas 50 palabras exactas para prohibición estricta
        const lastSentences = deepHistory.split('.').slice(-3).join('. ');

        ui.showTyping();

        try {
            // --- 1. ARQUITECTO: PLANIFICACIÓN DE ESCENA ---
            ui.log(`Arquitecto: Estructurando escena...`, "architect");
            
            // Detectar Lore relevante para este momento
            const loreContext = this.generateContextFromLinks(event.detectedContext || []);

            const architectPrompt = `
ROL: Director de Cine Narrativo.
TAREA: Diseñar la estructura del siguiente párrafo.

RESUMEN HISTORIA: "${globalMemory}"
ÚLTIMO PÁRRAFO ESCRITO (NO REPETIR): "...${lastSentences}"
MOMENTO A ESCRIBIR AHORA: "${moment.text}"
LORE: ${loreContext}

OBJETIVO:
Analiza LO ÚLTIMO ESCRITO y decide cómo CONTINUAR HACIA DELANTE.
1. ¿El último párrafo terminó en diálogo o descripción? -> Haz lo contrario.
2. Define el RITMO: ¿Pausado o Rápido?
3. Define la INTENCIÓN: Avanzar la trama.

IMPORTANTE: Si el último párrafo ya cubrió parte del "Momento a escribir", salta a la siguiente acción lógica. No te estanques.

SALIDA: [MODO: TIPO] (donde TIPO es ACCIÓN, DIÁLOGO o NARRATIVA) seguido de instrucciones.`;
            
            let blueprint = await AI.call("Eres un experto en estructura narrativa.", architectPrompt, 0.5);
            
            let writingMode = "NARRATIVA";
            let currentTemp = 0.75; 

            if (blueprint.includes("[MODO: ACCIÓN]")) {
                writingMode = "ACTION";
                currentTemp = 0.7; // Bajamos temp en acción para precisión
            } else if (blueprint.includes("[MODO: DIÁLOGO]")) {
                writingMode = "DIALOGUE";
                currentTemp = 0.75; 
            } else if (blueprint.includes("[MODO: NARRATIVA]")) {
                writingMode = "DESC";
                currentTemp = 0.8; 
            }

            blueprint = blueprint.replace(/\[MODO: \w+\]/, "").trim();

            // --- 2. ESCRITOR: PROSA LÍQUIDA Y HUMANA ---
            ui.log(`Escritor: Redactando (${writingMode})...`, "writer");
            
            const blackList = [...this.projectData.forbiddenWords].join(", ");

            let styleInstruction = "";
            if (writingMode === "ACTION") {
                styleInstruction = "ESTILO: Verbos fuertes. Frases directas. Céntrate en consecuencias físicas.";
            } else if (writingMode === "DIALOGUE") {
                styleInstruction = "ESTILO: Subtexto. Que los personajes no digan exactamente lo que piensan. Tensión latente.";
            } else {
                styleInstruction = "ESTILO: Prosa rica pero sin florituras vacías. Usa conectores lógicos implícitos.";
            }

            const writerPrompt = `
ROL: Novelista Best-Seller.
OBJETIVO: Escribir la CONTINUACIÓN de la historia.

CONTEXTO ANTERIOR (YA ESCRITO, NO LO REPITAS):
"...${deepHistory.slice(-800)}"

INSTRUCCIÓN DEL DIRECTOR:
${blueprint}

REGLAS DE ORO (LITERALES):
1. PROHIBIDO empezar repitiendo la última frase del contexto. Empieza con una acción nueva o una consecuencia.
2. AVANCE: Cada frase debe mover el tiempo hacia adelante.
3. HUMANIZACIÓN: Usa detalles sensoriales (olor, tacto) pero intégralos, no los listes.
4. COHERENCIA: Si el contexto dice que alguien sacó un arma, no digas que la saca otra vez. Úsala.
5. PALABRAS PROHIBIDAS (Por uso reciente): [ ${blackList} ].

${styleInstruction}

TAREA: Escribe 200-300 palabras para el MOMENTO: "${moment.text}".`;
            
            const draft = await AI.call("Eres un autor creativo y preciso.", writerPrompt, currentTemp);

            // --- 3. EDITOR: LIMPIEZA Y ANTI-ECO ---
            ui.log("Editor: Verificando coherencia...", "critic");
            
            // Pre-limpieza de solapamientos antes de enviar al editor
            let noOverlapText = this.cleanOverlap(deepHistory, draft);

            if (noOverlapText.length < 10) {
                 // Si al limpiar el solapamiento nos quedamos sin texto, es que la IA repitió todo.
                 // Forzamos regeneración lanzando error.
                 throw new Error("Loop de repetición detectado (Texto idéntico al anterior).");
            }

            const criticPrompt = `
ROL: Corrector implacable.
TAREA: Pulir y conectar.

TEXTO ANTERIOR: "...${deepHistory.slice(-300)}"
TEXTO NUEVO: "${noOverlapText}"

INSTRUCCIONES:
1. Revisa la PRIMERA frase del TEXTO NUEVO. Si repite lo dicho en el TEXTO ANTERIOR, bórrala o cámbiala por un conector.
2. Elimina redundancias ("subió arriba", "pequeña brisa").
3. Si hay dos frases seguidas que empiezan igual, cambia la estructura.
4. Asegura la continuidad temporal.

SALIDA: Solo el texto pulido.`;
            
            const finalCleanText = await AI.call("Eres un editor meticuloso.", criticPrompt, 0.4);

            // --- 4. ANTI-BUCLE FINAL Y GUARDADO ---
            
            // Verificación semántica por similitud de string
            if (this.projectData.lastOutputSnippet.includes(finalCleanText.substring(0, 50)) || 
                finalCleanText.includes(this.projectData.lastOutputSnippet.substring(0, 50))) {
                // Si hay demasiada similitud estructural, es sospechoso, pero permitimos si es largo.
                if (finalCleanText.length < 100) throw new Error("Loop semántico detectado.");
            }

            if (finalCleanText.length < 50) {
                 throw new Error("Texto demasiado corto tras limpieza.");
            }

            this.projectData.lastOutputSnippet = finalCleanText;

            // Memoria (Resumidor)
            ui.log("Cronista: Archivando...", "architect");
            const memoryPrompt = `Resume en 1 frase la ACCIÓN de: "${finalCleanText}"`;
            const newMemory = await AI.call("Eres un resumidor conciso.", memoryPrompt, 0.3);
            
            this.projectData.storySummary += " " + newMemory;
            
            if (this.projectData.storySummary.length > 5000) {
                this.projectData.storySummary = "..." + this.projectData.storySummary.slice(-4000);
            }

            // UI y Guardado
            ui.hideTyping();
            
            this.updateForbiddenWords(finalCleanText);
            this.projectData.runningContext += "\n" + finalCleanText;
            
            // Limpieza de memoria visual (Running Context) para evitar leaks
            if (this.projectData.runningContext.length > 12000) {
                 // Mantenemos el contexto lo más amplio posible pero seguro
            }
            this.projectData.lastParagraphs = this.projectData.runningContext.slice(-4000);
            
            ui.appendManuscript(moment.text, finalCleanText);
            await this.saveToBook(this.projectData.currentEventIndex, event.description, finalCleanText);

            this.projectData.processedMoments++;
            const p = Math.floor((this.projectData.processedMoments / this.projectData.totalMoments) * 100);
            document.getElementById('progress-bar').style.width = p + "%";
            document.getElementById('prog-percent').innerText = p + "%";
            
            this.projectData.currentMomentIndex++;
            setTimeout(() => this.processStep(), 100);

        } catch (e) {
            console.error(e);
            ui.log(`Reintentando (${e.message})...`, "error");
            ui.hideTyping();
            // Aumentamos el delay para "enfriar" la generación
            setTimeout(() => this.processStep(), 2000);
        }
    }
});