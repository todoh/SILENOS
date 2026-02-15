// --- LÓGICA DE GENERACIÓN E IA (VERSIÓN 5.0 - FLUJO NARRATIVO HUMANO) ---
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
        const words = text.match(/\b[a-zA-ZáéíóúñÁÉÍÓÚÑ]{7,}\b/g) || [];
        const unique = [...new Set(words)].map(w => w.toLowerCase());
        this.projectData.forbiddenWords = [...unique, ...this.projectData.forbiddenWords].slice(0, 20);
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
        
        // MEMORIA: Usamos un slice más inteligente.
        // DeepHistory: Lo que acaba de pasar (para continuidad inmediata)
        // GlobalMemory: El resumen general (para coherencia a largo plazo)
        const deepHistory = this.projectData.runningContext.slice(-2000); 
        const globalMemory = this.projectData.storySummary.slice(-3000);

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
LO ÚLTIMO ESCRITO: "${deepHistory.slice(-500)}"
MOMENTO A ESCRIBIR AHORA: "${moment.text}"
LORE: ${loreContext}

OBJETIVO:
Analiza LO ÚLTIMO ESCRITO y decide cómo CONTINUAR (no repetir).
1. ¿El último párrafo terminó en diálogo o descripción? -> Haz lo contrario para equilibrar.
2. Define el RITMO: ¿Pausado (descripción) o Rápido (acción)?
3. Define la INTENCIÓN: ¿Revelar información, crear tensión o desarrollar personaje?

SALIDA: [MODO: TIPO] (donde TIPO es ACCIÓN, DIÁLOGO o NARRATIVA) seguido de una instrucción precisa para el escritor sobre cómo AVANZAR la trama.`;
            
            let blueprint = await AI.call("Eres un experto en estructura narrativa.", architectPrompt, 0.5);
            
            let writingMode = "NARRATIVA";
            let currentTemp = 0.75; 

            if (blueprint.includes("[MODO: ACCIÓN]")) {
                writingMode = "ACTION";
                currentTemp = 0.65; 
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
            
            // Palabras prohibidas dinámicas (para evitar repetición cercana)
            const blackList = [...this.projectData.forbiddenWords].join(", ");

            let styleInstruction = "";
            
            // AJUSTE DE ESTILO PARA EVITAR EL EFECTO "ROBOT/HEMINGWAY"
            // Buscamos fluidez, conectores lógicos y variedad de longitud de frase.
            if (writingMode === "ACTION") {
                styleInstruction = "ESTILO: Dinámico pero claro. Usa verbos fuertes. Céntrate en la física de la acción y sus consecuencias inmediatas.";
            } else if (writingMode === "DIALOGUE") {
                styleInstruction = "ESTILO: Naturalista. Usa subtexto. Evita saludos innecesarios. Que el diálogo revele conflicto o información nueva.";
            } else {
                styleInstruction = "ESTILO: Prosa literaria rica. MEZCLA frases largas y complejas con frases cortas para dar ritmo. Usa conectores lógicos implícitos. Evita el estilo telegráfico.";
            }

            const writerPrompt = `
ROL: Novelista Best-Seller (Humano, no IA).
OBJETIVO: Escribir la continuación exacta de la historia.

CONTEXTO INMEDIATO (Lo que acaba de pasar):
"...${deepHistory.slice(-1000)}"

INSTRUCCIÓN DEL DIRECTOR:
${blueprint}

REGLAS ABSOLUTAS:
1. CONTINUIDAD: Tu texto debe empezar fluyendo desde la última frase del contexto, (sin incluirla osea sin repetir texto). No empieces una escena nueva si ya estamos en una.
2. NO REPITAS: No describas lo que ya se ha descrito en el contexto. AVANZA LA ACCIÓN.
3. HUMANIZACIÓN: Usa imperfecciones, dudas, detalles sucios. Evita la perfección estéril.
4. VARIEDAD SINTÁCTICA: No uses siempre Sujeto + Verbo. Usa oraciones subordinadas. Rompe el ritmo.
5. PROHIBIDO: Palabras repetidas recientemente: [ ${blackList} ].
6. SENSORIAL: Incluye al menos un detalle de tacto u olfato, pero intégralo en la acción, no hagas una lista.

${styleInstruction}

TAREA: Escribe 200-300 palabras que CONTINÚEN la historia basándote en el MOMENTO: "${moment.text}".`;
            
            // Usamos temp un poco más alta para generar variedad y creatividad humana
            const draft = await AI.call("Eres un autor humano, imperfecto y creativo.", writerPrompt, currentTemp);

            // --- 3. EDITOR: LIMPIEZA Y COHESIÓN ---
            ui.log("Editor: Puliendo estilo...", "critic");
            
            // El editor ahora se encarga de que los "parches" de texto no se noten
            const criticPrompt = `
ROL: Corrector de Estilo Literario.
TAREA: Mejorar la fluidez y naturalidad.

TEXTO PREVIO (Referencia): "...${deepHistory.slice(-200)}"
NUEVO TEXTO (A corregir): "${draft}"

INSTRUCCIONES:
1. Verifica que el NUEVO TEXTO encaje suavemente con el TEXTO PREVIO. Si hay un salto brusco, añade un conector o reformula la primera frase.
2. Elimina repeticiones de palabras cercanas.
3. Si hay frases demasiado cortas y seguidas (efecto robot), únelas para crear oraciones más complejas y elegantes.
4. Asegura que no se esté repitiendo información que ya se dijo hace poco.

SALIDA: Solo el texto final pulido y listo para imprimir.`;
            
            const finalCleanText = await AI.call("Eres un editor meticuloso.", criticPrompt, 0.4);

            // --- 4. ANTI-BUCLE Y GUARDADO ---
            
            // Verificación de repetición semántica simple
            if (finalCleanText.trim() === this.projectData.lastOutputSnippet.trim()) {
                throw new Error("Loop idéntico detectado.");
            }

            // Verificación de longitud mínima (evita fragmentos rotos)
            if (finalCleanText.length < 80) {
                 // Si es muy corto, a veces es mejor simplemente unirlo sin error, pero aquí forzamos calidad
                 throw new Error("Texto demasiado corto/pobre.");
            }

            this.projectData.lastOutputSnippet = finalCleanText;

            // Memoria (Resumidor)
            ui.log("Cronista: Archivando en memoria...", "architect");
            const memoryPrompt = `Resume en 1 frase qué ACCIÓN nueva ha ocurrido aquí: "${finalCleanText}"`;
            const newMemory = await AI.call("Eres un resumidor conciso.", memoryPrompt, 0.3);
            
            this.projectData.storySummary += " " + newMemory;
            
            // Limpiamos memoria antigua para no saturar token limits en futuras iteraciones
            if (this.projectData.storySummary.length > 5000) {
                this.projectData.storySummary = "..." + this.projectData.storySummary.slice(-4000);
            }

            // UI y Guardado
            ui.hideTyping();
            
            this.updateForbiddenWords(finalCleanText);
            this.projectData.runningContext += "\n" + finalCleanText;
            
            // Mantenemos el runningContext limpio para que no crezca infinitamente en memoria RAM visual
            if (this.projectData.runningContext.length > 10000) {
                 // No borramos runningContext real porque se usa para el archivo, 
                 // pero lastParagraphs se actualiza con slicing.
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
            ui.log("Ajustando narrativa (reintento)...", "error");
            ui.hideTyping();
            // Penalización temporal al reintentar para cambiar el output
            setTimeout(() => this.processStep(), 1500);
        }
    }
});