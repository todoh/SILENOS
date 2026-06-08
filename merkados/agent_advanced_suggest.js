// agent_advanced_suggest.js
// --- MÓDULO IA: SUGERENCIA SISTÉMICA DE OPCIONES DE DECISIÓN ---

let suggestBriefing = null;

function openSuggestOptions() {
    if (!window.selectedNode) { alert('Selecciona un nodo primero.'); return; }
    openAssistPanel('IA · Sugerir opciones');
    suggestBriefing = null;
    renderSuggestStep1();
}

function renderSuggestStep1() {
    const body = document.getElementById('assist-body');
    body.innerHTML = `
        ${assistField('Número de elecciones a idear', 'sug-count', '3', '')}
        ${assistField('Sesgo conceptual', 'sug-bias', '', 'ej: opciones arriesgadas o místicas', true)}
    `;
    const btn = document.getElementById('assist-primary');
    btn.textContent = '1/2 · Idear Decisiones';
    btn.onclick = runSuggestThink;
}

async function runSuggestThink() {
    const n = window.selectedNode;
    if (!n) return;
    const thinker = document.getElementById('assist-thinker').value;
    const count = parseInt(document.getElementById('sug-count').value, 10) || 3;
    const bias = document.getElementById('sug-bias').value.trim();

    if (!thinker) return;
    document.getElementById('assist-primary').disabled = true;
    setAssistStatus('Calculando ramificaciones...');

    try {
        const ctx = buildLocalContext(n.id);
        const prompt = `Actúa como diseñador sistémico de juegos de rol y librojuegos. 
Necesito proponer un abanico de exactamente ${count} opciones de decisión viables e ingeniosas desde el nodo actual.

${formatContextForPrompt(ctx)}

REGLAS DE DISEÑO:
- Las acciones deben abrir caminos tridimensionales. 
- PROHIBIDO repetir elecciones existentes.
- ${bias ? 'Sesgo temático obligatorio: ' + bias : 'Distribución homogénea de consecuencias.'}

Devuelve ÚNICAMENTE un JSON válido sin decoradores markdown:
{ 
  "briefing": { "currentTone": "Tono literario" }, 
  "options": [ 
    { "label": "ACCIÓN CLARA EN MAYÚSCULAS", "summary": "Qué descubrirá o sufrirá el lector al elegir esto en el siguiente paso.", "consequence": "Efecto a largo plazo en la trama" } 
  ] 
}`;

        const raw = await ollamaGenerate(thinker, prompt, true);
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('Estructura JSON corrupta');
        suggestBriefing = JSON.parse(m[0]);
        setAssistStatus('Opciones concebidas.');
        renderSuggestStep2();
    } catch (e) {
        setAssistStatus('ERROR: ' + e.message, true);
    } finally {
        document.getElementById('assist-primary').disabled = false;
    }
}

function renderSuggestStep2() {
    const b = suggestBriefing.briefing || {};
    document.getElementById('assist-body').innerHTML = `
        ${assistSection('Tono de Inyección', assistField('Tono', 'sb-tone', b.currentTone || '', ''))}
        ${assistSection(`Opciones Estructurales (${suggestBriefing.options.length})`,
            suggestBriefing.options.map((opt, i) => `
                <div class="border border-black bg-white p-2 mb-2">
                    <div class="flex items-center gap-2 mb-1">
                        <input type="checkbox" id="sug-keep-${i}" checked>
                        <input id="sug-label-${i}" value="${(opt.label || '').replace(/"/g, '&quot;')}" class="flex-1 text-[11px] font-bold border-b border-black outline-none">
                    </div>
                    <div class="text-[10px] mb-1"><b>Trama:</b> <input id="sug-sum-${i}" value="${(opt.summary || '').replace(/"/g, '&quot;')}" class="w-full text-[10px] border-b border-gray-300 outline-none"></div>
                </div>
            `).join('')
        )}
        <label class="flex items-center gap-2 text-[10px] uppercase font-bold">
            <input type="checkbox" id="sug-expand-write" checked> Redactar prosa literaria automáticamente
        </label>
    `;
    const btn = document.getElementById('assist-primary');
    btn.textContent = '2/2 · Acoplar al Grafo';
    btn.onclick = runSuggestApply;
}

function runSuggestApply() {
    if (!suggestBriefing) return;
    const sourceNode = window.selectedNode;
    const writeContent = document.getElementById('sug-expand-write').checked;
    const writer = document.getElementById('assist-writer').value;

    const selected = [];
    suggestBriefing.options.forEach((opt, i) => {
        if (!document.getElementById(`sug-keep-${i}`)?.checked) return;
        selected.push({ ...opt, label: document.getElementById(`sug-label-${i}`).value, summary: document.getElementById(`sug-sum-${i}`).value });
    });
    if (!selected.length) return;

    if (writeContent && typeof switchAssistTab === 'function') switchAssistTab('tasks');

    const baseX = sourceNode.x + 260;
    let y = sourceNode.y - ((selected.length - 1) * 70);
    const b = suggestBriefing.briefing;

    const created = [];
    selected.forEach(opt => {
        const newId = genId('sug');
        data.nodes.push({ id: newId, x: baseX, y: y, title: opt.label.substring(0, 30), content: writeContent ? '[Escribiendo prosa...]' : (opt.summary || ''), tags: [], color: null, isEnding: false, endingType: null, notes: "" });
        data.connections.push({ from: sourceNode.id, to: newId, label: opt.label });
        created.push({ id: newId, opt });
        y += 120;
    });
    saveLogic();

    if (writeContent && writer) {
        const writerSystem = `Eres un escritor literario descarnado de ficción interactiva. Tono: ${b.currentTone}. Prosa pura sin opciones extra.`;
        const ctxPath = buildLocalContext(sourceNode.id).mainPath.map(p => `[${p.title}] ${(p.content || '').substring(0, 100)}`).join(' → ');

        created.forEach(({ id, opt }) => {
            const task = typeof createTask === 'function' ? createTask(id, 'Sugerir', `Escribiendo: ${opt.label}`) : null;
            if (task) updateTask(id, 40, 'Redactando...');

            const writerPrompt = `CAMINO NARRATIVO PREVIO: ${ctxPath}\nDECISIÓN SELECCIONADA: "${opt.label}"\nDESARROLLO DE HECHOS DEL PASO: ${opt.summary}\n\nEscribe exactamente un párrafo de prosa inmersiva. No añadas títulos ni listas de acciones al final.`;
            const signal = task ? task.controller.signal : null;
            
            ollamaGenerate(writer, writerPrompt, false, writerSystem, signal).then(out => {
                const node = data.nodes.find(n => n.id === id);
                if (node) { node.content = (out || '').trim(); saveLogic(); }
                if (task) {
                    updateTask(id, 100, 'Listo');
                    setTimeout(() => finishTask(id), 1000);
                }
            }).catch(e => {
                if (task) {
                    updateTask(id, 0, 'Fallo');
                    setTimeout(() => finishTask(id), 2000);
                }
            });
        });
    }
}