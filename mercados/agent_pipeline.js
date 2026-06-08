// agent_pipeline.js
// --- AGENTE OLLAMA/GEMINI: PIPELINE DE GENERACIÓN SECUENCIAL SEGURA Y CONTROLADA ---

function buildSystemPrompt(opts) {
    const povMap = { '1': 'primera persona (yo)', '2': 'segunda persona (tú)', '3': 'tercera persona' };
    return `Eres un escritor experto de librojuegos interactivos de estilo brutalista y maduro. Idioma: español. Persona narrativa: ${povMap[opts.pov] || 'segunda persona'}. Protagonista: ${opts.protagonist || 'el lector'}. Tono y atmósfera: ${opts.tone}. Reglas adicionales: ${opts.rules || 'ninguna'}. NUNCA rompas la cuarta pared y cíñete estrictamente a las variables de juego asignadas al esqueleto.`;
}

function validateAgentPlan(plan) {
    if (!plan || !Array.isArray(plan.nodes)) throw new Error("Estructura de nodos no es un array válido.");
    if (!Array.isArray(plan.connections)) plan.connections = [];
    return plan;
}

function cleanAndParseNarrativeJSON(rawText) {
    let clean = rawText.trim();
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
    }
    clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    try {
        return JSON.parse(clean);
    } catch (primaryError) {
        console.warn("[PARSER RESCATE] Reconstruyendo strings...", primaryError);
        try {
            let escaped = clean.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
            return JSON.parse(escaped);
        } catch (secondaryError) {
            try {
                let superClean = clean
                    .replace(/\\"/g, '"')
                    .replace(/(?!\s*")"/g, '\\"');
                superClean = superClean
                    .replace(/{\s*\\"/g, '{"')
                    .replace(/\\"\s*:/g, '":')
                    .replace(/:\s*\\"/g, ':"')
                    .replace(/\\"\s*,/g, '",')
                    .replace(/,"/g, ',"')
                    .replace(/\\"\s*}/g, '"}')
                    .replace(/\\"\s*\]/g, '"]');
                return JSON.parse(superClean);
            } catch (finalError) {
                throw new Error("Sintaxis JSON insalvable en la respuesta del modelo.");
            }
        }
    }
}

/* ============================================================================================ */
/* NUEVA PIPELINE MAESTRA V4: GENERACIÓN IRREGULAR CONTROLADA POR PRESUPUESTO GLOBAL DE NODOS    */
/* ============================================================================================ */
async function executeFractalGenerationPipeline(opts, statusEl) {
    if (statusEl) statusEl.innerText = "[FASE 1] Inicializando Presupuesto Estructural Irregular...";
    
    const shortTheme = opts.theme.substring(0, 20).trim();
    newProjectLogic("Crónica Irregular - " + (shortTheme || "Estable"));
    handleLoadProject(currentId);

    // 1. CONFIGURACIÓN DEL PRESUPUESTO GLOBAL DE NODOS (NODE BUDGETING)
    const userDefinedLimit = parseInt(document.getElementById('panel-agent-depth')?.value, 10) || 10;
    // Forzamos un rango operativo sensato protegiendo el ecosistema vivo
    const maxGlobalNodes = Math.min(370, Math.max(5, userDefinedLimit));
    let totalNodesGenerated = 0;

    // 2. Crear el único Nodo Raíz Inicial de manera atómica
    const rootId = genId('ag_seq');
    const rootNode = {
        id: rootId,
        x: 100,
        y: 300,
        title: "EL ORIGEN",
        content: "[Generando prosa inicial...]",
        isEnding: false,
        tags: ["Inicio"],
        color: null,
        notes: "Nodo Raíz Estructural",
        rewards: { inventory: [], flags: [], metrics: { survival: 100, ethics: 0, efficiency: 100 } }
    };
    data.nodes.push(rootNode);
    totalNodesGenerated++;
    saveLogic();

    // Cola de ejecución secuencial estricta: { nodeId: string, currentDepth: number }
    const generationQueue = [{ nodeId: rootId, currentDepth: 0 }];
    const maxTargetDepth = Math.min(15, Math.max(5, Math.ceil(maxGlobalNodes / 1.8)));
    const systemWriter = buildSystemPrompt(opts);

    // Inyector de modificadores dramáticos estocásticos para romper la monotonía de la prosa literaria
    const sensorySeeds = ["claustrofobia ambiental", "foco táctil y visceral", "detalles sonoros opresivos", "percepción olfativa y orgánica", "tensión psicológica cruda"];
    const syntacticSeeds = ["frases quirúrgicas cortas y cortantes en presente", "prosa densa con oraciones subordinadas descriptivas", "ritmo acelerado de peligro inmediato", "narración seca, minimalista y directa"];

    // Bucle controlado de expansión asimétrica por JS
    while (generationQueue.length > 0) {
        if (agentState.abort) throw new Error("Generación abortada por intervención del usuario.");

        const currentTask = generationQueue.shift();
        const activeNode = data.nodes.find(n => n.id === currentTask.nodeId);
        if (!activeNode) continue;

        const depth = currentTask.currentDepth;

        if (statusEl) {
            statusEl.innerText = `[PROCESANDO] ${activeNode.title} | Nodos: ${totalNodesGenerated}/${maxGlobalNodes} | Profundidad: ${depth}`;
        }

        // --- SUB-FASE A: REDACCIÓN DE LA PROSA CON INYECCIÓN DE SEMILLAS DRAMÁTICAS ---
        const localCtx = buildLocalContext(activeNode.id);
        const slidingHistory = localCtx.mainPath.slice(0, -1).map(p => `[${p.title}] ${(p.content || '').substring(0, 120)}...`).join(' -> ');
        
        const taskProse = createTask(activeNode.id, 'Escritor', `Escribiendo: ${activeNode.title}`);
        updateTask(activeNode.id, 30, 'Inyectando semillas líricas...');

        // Selección estocástica pura basada en el ID matemático del nodo para garantizar variabilidad absoluta
        const sensoryModifier = sensorySeeds[Math.abs(activeNode.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % sensorySeeds.length];
        const syntacticModifier = syntacticSeeds[Math.abs(activeNode.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % syntacticSeeds.length];

        const writePrompt = `HISTORIAL CRONOLÓGICO ACUMULADO: ${slidingHistory || "Inicio del librojuego."}
ENTORNO INMEDIATO: Estás en el paso titulado "${activeNode.title}".
DESCRIPCIÓN OPERATIVA DEL PASO: ${activeNode.notes || "Transición narrativa relevante."}

TAREA LITERARIA: Redacta un fragmento de prosa inmersiva y sensorial para este nodo.
REGLAS DE ESTILO OBLIGATORIAS:
- Aplica un foco de variación basado en: ${sensoryModifier}.
- Configura el ritmo de las oraciones usando: ${syntacticModifier}.
- Si el contexto implica desplazamientos o transiciones lineales simples, consúmelas y redáctalas por completo dentro de este párrafo para mantener el dinamismo.
- Devuelve DIRECTAMENTE la prosa pura literaria. PROHIBIDO incluir selectores markdown, títulos, opciones numéricas o menús de decisión.`;

        try {
            const proseOut = await ollamaGenerate(opts.fast, writePrompt, false, systemWriter, taskProse.controller.signal);
            activeNode.content = (proseOut || '').trim();
            saveLogic();
            updateTask(activeNode.id, 100, 'Consolidado');
            finishTask(activeNode.id);
        } catch (e) {
            abortTask(activeNode.id);
            console.error(`Fallo lírico en nodo ${activeNode.id}`, e);
            throw new Error(`Fallo crítico de comunicación con el modelo de prosa (${opts.fast}): ${e.message}`);
        }

        // --- CÁLCULO DE ELASTICIDAD Y ATRICIÓN DE LA RED (SISTEMA IRREGULAR ASIMÉTRICO) ---
        const nodesLeft = maxGlobalNodes - totalNodesGenerated;
        
        // Determinar si forzamos el final prematuro de la rama
        let forceEnding = false;
        if (activeNode.isEnding) {
            forceEnding = true;
        } else if (nodesLeft <= 2 || depth >= maxTargetDepth) {
            forceEnding = true;
        } else if (depth > 2) {
            // Factor de atrición aleatoria: a mayor profundidad, mayor probabilidad de resolución abrupta o muerte táctica
            const attritionProbability = (depth / maxTargetDepth) * 0.45;
            if (Math.random() < attritionProbability) {
                forceEnding = true;
            }
        }

        if (forceEnding) {
            activeNode.isEnding = true;
            activeNode.tags = ["Final"];
            activeNode.color = "#7f1d1d";
            saveLogic();
            continue; 
        }

        // --- SUB-FASE B: ARQUITECTURA DE OPCIONES (MÍNIMO 2, MÁXIMO 3 - PROHIBIDO CAMINOS LINEALES) ---
        const taskSchema = createTask(activeNode.id, 'Arquitecto', `Planificando ramificaciones...`);
        
        // Decisión estocástica regulada: bifurcación doble o triple según presupuesto restante
        const allowedBranchesCount = (nodesLeft >= 3 && Math.random() > 0.65) ? 3 : 2;
        const isCriticalLimit = (nodesLeft <= allowedBranchesCount + 1 || depth === maxTargetDepth - 1);

        let architectPrompt = `Eres un arquitecto de sistemas y diseñador de librojuegos interactivos de rol. Debes crear el esqueleto de decisiones para el nodo actual de la red.
CONTEXTO DEL PASO:
- Título: ${activeNode.title}
- Prosa literaria consolidada: ${activeNode.content}
- Profundidad en la rama actual: ${depth} de un máximo estimado de ${maxTargetDepth}.

REGLAS CRÍTICAS DE ARQUITECTURA TOPOLÓGICA:
${isCriticalLimit ? `- MANDATO ABSOLUTO: Estás en el límite crítico del presupuesto de nodos. Debes diseñar exactamente ${allowedBranchesCount} opciones que lleven obligatoriamente a CONCLUSIONES FINALES O MUERTES (isEnding: true).` : `- Diseña exactamente ${allowedBranchesCount} opciones de decisión altamente contrastadas y asimétricas que abran caminos tridimensionales.`}
- REGLA DE INTERACTIVIDAD RADICAL: Está terminantemente prohibido generar una sola opción. Cada bifurcación propuesta debe ser real, divergente y con consecuencias directas en la trama.

Devuelve EXCLUSIVAMENTE un objeto JSON perfectamente válido, sin markdown ni triples comillas:
{
  "branches": [
    {
      "label": "ACCIÓN DETONANTE EN MAYÚSCULAS",
      "nextTitle": "TÍTULO CORTO DE 2 PALABRAS",
      "summary": "Descripción sucinta de lo que descubrirá o sufrirá el lector al llegar a este nodo.",
      "isEnding": ${isCriticalLimit ? 'true' : 'false'}
    }
  ]
}`;

        try {
            const schemaRaw = await ollamaGenerate(opts.strong, architectPrompt, true, null, taskSchema.controller.signal);
            const schemaData = cleanAndParseNarrativeJSON(schemaRaw);
            finishTask(activeNode.id);

            if (schemaData && Array.isArray(schemaData.branches) && schemaData.branches.length >= 2) {
                // Validación estricta anti-lineal: si el modelo intentó violar la regla devolviendo 1 sola opción, forzamos mutación doble inmediata
                const verifiedBranches = schemaData.branches;
                const totalBranches = verifiedBranches.length;

                for (let bIdx = 0; bIdx < totalBranches; bIdx++) {
                    // Si un brote asíncrono excede el presupuesto global estricto mientras se procesa la cola, redirigimos a final atómico
                    if (totalNodesGenerated >= maxGlobalNodes) {
                        verifiedBranches[bIdx].isEnding = true;
                    }

                    const branch = verifiedBranches[bIdx];
                    const childId = genId('ag_seq');
                    
                    const posX = activeNode.x + 260;
                    const posY = activeNode.y - ((totalBranches - 1) * 70) + (bIdx * 140);

                    const childNode = {
                        id: childId,
                        x: posX,
                        y: posY,
                        title: branch.nextTitle ? branch.nextTitle.toUpperCase() : `PASO ${totalNodesGenerated + 1}`,
                        content: "[Esqueleto reservado en cola secuencial irregular...]",
                        isEnding: !!branch.isEnding,
                        tags: branch.isEnding ? ["Final"] : [],
                        color: branch.isEnding ? "#7f1d1d" : null,
                        notes: branch.summary || "",
                        rewards: { inventory: [], flags: [], metrics: { survival: 100, ethics: 0, efficiency: 100 } }
                    };

                    data.nodes.push(childNode);
                    data.connections.push({ from: activeNode.id, to: childId, label: branch.label || "CONTINUAR EXPLORACIÓN" });
                    totalNodesGenerated++;
                    saveLogic();

                    // Solo añadimos a la cola de expansión si no es un nodo final consolidado
                    if (!childNode.isEnding) {
                        generationQueue.push({ nodeId: childId, currentDepth: depth + 1 });
                    }
                }
            } else {
                // Plan de rescate topológico en caso de JSON inválido o violación de regla: forzar clausura atómica bilateral (0 opciones)
                console.warn(`[RESCATE PIPELINE] El modelo arquitecto devolvió ramas insuficientes. Forzando nodos terminales.`);
                activeNode.isEnding = true;
                activeNode.tags = ["Final Autoclausurado"];
                activeNode.color = "#7f1d1d";
                saveLogic();
            }
        } catch (err) {
            finishTask(activeNode.id);
            console.error("Fallo crítico en el paso de arquitectura secuencial irregular:", err);
            throw new Error(`Fallo crítico de estructura con el modelo arquitecto (${opts.strong}): ${err.message}`);
        }

        if (typeof autoLayoutLogic === 'function') autoLayoutLogic();
        if (typeof fitToScreen === 'function') fitToScreen();
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (statusEl) statusEl.innerText = `¡Crónica irregular asimétrica construida con éxito! Total de nodos: ${data.nodes.length}`;
}

/* ============================================================================================ */
/* PIPELINE CLÁSICA 2: SOPORTE DE COMPATIBILIDAD RETROACTIVA MODAL                             */
/* ============================================================================================ */
async function executeGenerationPipeline(opts, statusEl, progFill = null) {
    if (statusEl) statusEl.innerText = "[Máster] Redirigiendo flujo hacia el motor secuencial estable...";
    if (progFill) progFill.style.width = '10%';
    await executeFractalGenerationPipeline(opts, statusEl);
    if (progFill) progFill.style.width = '100%';
}

/* ============================================================================================ */
/* PUENTE DE VINCULACIÓN CON LA INTERFAZ UI (PANEL) - ID MAPS CORRECTOS DE MERKADOS             */
/* ============================================================================================ */
async function startAgentGenerationFromPanel() {
    console.log("[UI] Lanzando pipeline de generación secuencial asimétrica irregular...");
    
    const statusEl = document.getElementById('panel-agent-status') || document.getElementById('agent-status') || { set innerText(t) { console.log(t); } };
    const progFill = document.getElementById('agent-progress-fill');

    const modelThinkerEl = document.getElementById('panel-agent-thinker') || document.getElementById('agent-strong-model');
    const modelWriterEl = document.getElementById('panel-agent-writer') || document.getElementById('agent-fast-model');

    const opts = {
        theme: document.getElementById('panel-agent-theme')?.value || document.getElementById('agent-theme')?.value || "Mundo Fractal",
        pov: document.getElementById('panel-agent-pov')?.value || document.getElementById('agent-pov')?.value || "2",
        protagonist: document.getElementById('panel-agent-protagonist')?.value || document.getElementById('agent-protagonist')?.value || "El Navegante",
        tone: document.getElementById('panel-agent-tone')?.value || document.getElementById('agent-tone')?.value || "Brutalista, opresivo",
        rules: document.getElementById('panel-agent-rules')?.value || document.getElementById('agent-rules')?.value || "Ninguna",
        strong: modelThinkerEl ? modelThinkerEl.value : "",
        fast: modelWriterEl ? modelWriterEl.value : ""
    };

    if (!opts.strong || !opts.fast) {
        statusEl.innerText = "ERROR: Selecciona un modelo válido en el panel antes de generar.";
        return;
    }

    if (typeof agentState !== 'undefined') {
        agentState.abort = false;
    } else {
        window.agentState = { abort: false };
    }

    try {
        await executeGenerationPipeline(opts, statusEl, progFill);
    } catch (error) {
        console.error("[FALLO DETECTADO EN EJECUCIÓN MAESTRA]", error);
        statusEl.innerText = `${error.message}`;
    }
}

window.startAgentGenerationFromPanel = startAgentGenerationFromPanel;