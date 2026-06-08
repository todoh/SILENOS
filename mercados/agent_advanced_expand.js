// agent_advanced_expand.js
// --- MÓDULO IA: EXPANSION PROFUNDA DE RAMAS NARRATIVAS (AUTOMATIZADO Y SINCRONIZADO) ---

let expandBriefing = null;

function openExpand() {
    if (!window.selectedNode) { 
        alert('Selecciona un nodo primero.'); 
        return; 
    }
    openAssistPanel('IA · Expandir nodo');
    expandBriefing = null;
    renderExpandStep1();
}

function renderExpandStep1() {
    const n = window.selectedNode;
    const ctx = buildLocalContext(n.id);
    const body = document.getElementById('assist-body');

    body.innerHTML = `
        ${assistSection('Nodo de partida', `
            <div class="font-bold uppercase">${n.title}</div>
            <div class="text-[10px] opacity-70">${(n.content || '(sin contenido)').substring(0, 200)}${(n.content || '').length > 200 ? '…' : ''}</div>
        `)}
        ${assistSection('Contexto detectado en el grafo', `
            <div>Profundidad actual: <b>${ctx.stats.depthFromRoot}</b></div>
            <div>Hijos ramificados: <b>${ctx.directChildren.length}</b></div>
        `)}
        <div class="grid grid-cols-2 gap-2">
            ${assistField('Ramas a crear', 'expand-count', '2', '')}
            ${assistField('Profundidad por rama', 'expand-depth', '1', '')}
        </div>
        ${assistField('Sesgo/Dirección narrativa', 'expand-bias', '', 'ej: una opción violenta, otra diplomática y sigilosa', true)}
    `;

    const btn = document.getElementById('assist-primary');
    btn.textContent = 'Lanzar Expansión Automática';
    btn.disabled = false;
    btn.onclick = runExpandPipelineAutomated;
}

async function runExpandPipelineAutomated() {
    const sourceNode = window.selectedNode;
    if (!sourceNode) return;

    const thinker = document.getElementById('assist-thinker').value;
    const writer = document.getElementById('assist-writer').value;
    const count = parseInt(document.getElementById('expand-count').value, 10) || 2;
    const depth = parseInt(document.getElementById('expand-depth').value, 10) || 1;
    const bias = document.getElementById('expand-bias').value.trim();

    if (!thinker || !writer) { 
        setAssistStatus('Falta configurar los modelos (Pensador/Escritor)', true); 
        return; 
    }

    setAssistStatus('Calculando ramificaciones estructurales...');
    document.getElementById('assist-primary').disabled = true;

    // --- BARRA EN EL CANVAS: INYECCIÓN INMEDIATA EN EL NODO SELECCIONADO ---
    if (typeof createTask === 'function') {
        const rootTask = createTask(sourceNode.id, 'Arquitecto', 'Pensando ramas...');
        if (typeof activeTasks !== 'undefined' && !activeTasks.has(sourceNode.id)) {
            activeTasks.set(sourceNode.id, rootTask);
        }
        updateTask(sourceNode.id, 5, 'Analizando topología...');
    }

    // Ticker visual que fuerza el repintado de la barra debajo del nodo de partida en el Canvas
    let structuralProgress = 5;
    const structuralInterval = setInterval(() => {
        if (structuralProgress < 95) {
            structuralProgress += Math.floor(Math.random() * 5) + 2;
            if (structuralProgress > 95) structuralProgress = 95;
            if (typeof updateTask === 'function') {
                updateTask(sourceNode.id, structuralProgress, `Pensando estructura...`);
            }
        }
    }, 150);

    try {
        const ctx = buildLocalContext(sourceNode.id);
        const ctxText = formatContextForPrompt(ctx);

        const thinkPrompt = `Eres un arquitecto y analista narrativo experto en diseño estructural de librojuegos interactivos.
Tu misión es planificar exactamente ${count} ramas de decisión alternativas partiendo del nodo actual.

${ctxText}

INSTRUCCIONES ESTRUCTURALES EXIGIDAS:
- Cada rama debe ofrecer un curso de acción radicalmente diferente.
- El texto de la opción ("label") debe ser una acción en infinitivo o imperativo.
- NO repitas ni te aproximes conceptualmente a las opciones ya usadas listadas en el contexto.
- Cada rama contendrá una cadena secuencial de ${depth} nodos de profundidad.
- ${bias ? `Debes ceñirte estrictamente a este sesgo sugerido por el autor: ${bias}` : 'Busca máxima variedad de elecciones.'}

Devuelve EXCLUSIVAMENTE un objeto JSON perfectamente válido, sin markdown, sin triples comillas y sin texto introductorio:
{
  "briefing": { "currentTone": "Tono psicológico y ambiental imperante", "inventory": [], "knownCharacters": [], "openThreads": [] },
  "branches": [
    {
      "type": "Naturaleza de la acción",
      "label": "Texto exacto de la decisión que pulsará el lector en mayúsculas",
      "rationale": "Justificación de por qué esta opción es interesante",
      "nodes": [
        { "id": "b1n1", "title": "Título sugerido para el paso", "summary": "Descripción detallada en un párrafo de lo que ocurre en este nodo.", "isEnding": false, "tonalShift": "Variación estilística del tono" }
      ]
    }
  ]
}`;

        const raw = await ollamaGenerate(thinker, thinkPrompt, true);
        
        // Finalizamos la barra del nodo raíz estructural ya que el modelo Pensador respondió
        clearInterval(structuralInterval);
        if (typeof updateTask === 'function' && typeof finishTask === 'function') {
            updateTask(sourceNode.id, 100, 'Estructura lista');
            finishTask(sourceNode.id);
        }

        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('El modelo pensador no devolvió un bloque JSON legible');
        
        expandBriefing = JSON.parse(m[0]);
        expandBriefing.branches = expandBriefing.branches.filter(b => {
            const lbl = (b.label || '').toLowerCase().trim();
            return !ctx.existingLabels.some(ex => labelsAreSimilar(lbl, ex.toLowerCase()));
        });

        if (!expandBriefing.branches.length) {
            throw new Error('Las ramas propuestas duplican opciones existentes. Reintenta.');
        }

        // --- SIEMBRA E INYECCIÓN AUTOMÁTICA EN SEGUNDO PLANO ---
        setAssistStatus('Sembrando nodos y enlazando al grafo...');
        
        const b = expandBriefing.briefing || {};
        const currentTone = b.currentTone || 'Mantener tono tenso';
        const branchesToCreate = expandBriefing.branches;

        const baseX = sourceNode.x + 260;
        let yCursor = sourceNode.y - ((branchesToCreate.length - 1) * 90);

        const writerSystem = `Eres un escritor de librojuegos. Tono: ${currentTone}. Solo prosa literaria descarnada sin opciones finales ni metareferencias.`;
        const ctxPathStr = buildLocalContext(sourceNode.id).mainPath.map(p => `[${p.title}] ${(p.content || '').substring(0, 120)}`).join(' → ');

        branchesToCreate.forEach(branch => {
            const idMap = {};
            
            // 1. Crear estructuras visuales fantasmas inmediatamente [generando...]
            (branch.nodes || []).forEach((bn, j) => {
                const newId = genId('exp');
                idMap[bn.id] = newId;
                data.nodes.push({
                    id: newId, 
                    x: baseX + j * 260, 
                    y: yCursor,
                    title: bn.title || 'Paso Inteligente', 
                    content: '[Generando prosa narratológica...]',
                    isEnding: !!bn.isEnding, 
                    tags: [], 
                    color: null, 
                    endingType: null, 
                    notes: ""
                });

                // Registrar la tarea global en activeTasks pasándole el ID del nuevo nodo fantasma creado
                if (typeof createTask === 'function') {
                    const task = createTask(newId, 'Expandir', `Escribiendo: ${bn.title || 'Paso Inteligente'}`);
                    if (typeof activeTasks !== 'undefined' && !activeTasks.has(newId)) {
                        activeTasks.set(newId, task);
                    }
                    updateTask(newId, 5, 'En cola de escritura...');
                }
            });

            // 2. Conectar la primera rama al nodo raíz original
            const firstId = idMap[branch.nodes?.[0]?.id];
            if (firstId) {
                data.connections.push({ from: sourceNode.id, to: firstId, label: branch.label || '' });
            }
            
            // 3. Enlazar la profundidad secuencial de la rama si posee más de un nodo
            if (!branch.connections?.length && (branch.nodes || []).length > 1) {
                for (let j = 0; j < branch.nodes.length - 1; j++) {
                    data.connections.push({ from: idMap[branch.nodes[j].id], to: idMap[branch.nodes[j + 1].id], label: '' });
                }
            }
            yCursor += 140;

            // 4. Disparar hilos generativos asíncronos en background sin bloquear la UI
            generateBranchChainAsync(branch, idMap, writer, writerSystem, ctxPathStr);
        });
        
        // Guardar cambios del grafo sembrado, actualizar visualización y cerrar asistente
        saveLogic();
        if (typeof autoLayoutLogic === 'function') autoLayoutLogic();
        if (typeof fitToScreen === 'function') fitToScreen();
        
        setAssistStatus('¡Ramas acopladas con éxito!');
        setTimeout(() => { 
            closeAssistPanel(); 
        }, 1000);

    } catch (e) {
        clearInterval(structuralInterval);
        if (typeof finishTask === 'function') finishTask(sourceNode.id);
        setAssistStatus('ERROR: ' + e.message, true);
        document.getElementById('assist-primary').disabled = false;
    }
}

async function generateBranchChainAsync(branch, idMap, writer, writerSystem, initialCtx) {
    let previousContext = initialCtx;
    for (let j = 0; j < (branch.nodes || []).length; j++) {
        const bn = branch.nodes[j];
        const realId = idMap[bn.id];
        const realNode = data.nodes.find(n => n.id === realId);
        if (!realNode) continue;

        // Recuperar la tarea global registrada previamente
        const globalTask = typeof activeTasks !== 'undefined' ? activeTasks.get(realId) : null;
        const signal = globalTask ? globalTask.controller.signal : null;

        // --- TICKER DE PROGRESO INTEGRADO Y FORZADO ---
        let simulatedProgress = 10;
        if (typeof updateTask === 'function') {
            updateTask(realId, simulatedProgress, 'Redactando prosa...');
        }

        const progressInterval = setInterval(() => {
            if (simulatedProgress < 92) {
                simulatedProgress += Math.floor(Math.random() * 4) + 2; 
                if (simulatedProgress > 92) simulatedProgress = 92;
                if (typeof updateTask === 'function') {
                    updateTask(realId, simulatedProgress, 'Modelando oraciones...');
                }
            }
        }, 250);

        const writerPrompt = `HISTORIAL DE HECHOS CRONOLÓGICOS PREVIOS:
${previousContext}

ACCIÓN SELECCIONADA POR EL LECTOR PARA LLEGAR AQUÍ: "${branch.label}"
MODIFICADOR ESTILÍSTICO EXIGIDO: ${bn.tonalShift || 'Mantener tono tenso'}

INSTRUCCIONES DE REDACCIÓN:
Redacta el contenido de este nodo titulado "${bn.title}".
En este fragmento concreto ocurre lo siguiente de forma estricta: ${bn.summary}.
Redacta exactamente UN (1) párrafo literario denso, inmersivo y altamente sensorial. 
Devuelve DIRECTAMENTE la prosa, sin títulos, sin preámbulos, sin comillas y sin opciones al final.`;

        try {
            const out = await ollamaGenerate(writer, writerPrompt, false, writerSystem, signal);
            clearInterval(progressInterval); 

            realNode.content = (out || '').trim();
            saveLogic(); 
            
            if (typeof updateTask === 'function' && typeof finishTask === 'function') {
                updateTask(realId, 100, 'Completado');
                setTimeout(() => finishTask(realId), 1000);
            }
            previousContext += ` → [${bn.title}] ${realNode.content.substring(0, 100)}`;
        } catch (e) {
            clearInterval(progressInterval); 
            if (typeof updateTask === 'function' && typeof finishTask === 'function') {
                if (e.name === 'AbortError') updateTask(realId, 0, 'Abortado');
                else updateTask(realId, 0, 'Error de ejecución');
                setTimeout(() => finishTask(realId), 2000);
            }
            break; 
        }
    }
}