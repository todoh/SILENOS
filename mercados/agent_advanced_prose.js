// agent_advanced_prose.js
// --- MÓDULO IA: REESCRITURA DE ESTILO Y RELLENADO DE PROSA ---

function openRewrite() {
    if (!window.selectedNode) { alert('Selecciona un nodo primero.'); return; }
    openAssistPanel('IA · Reescribir nodo');
    const n = window.selectedNode;
    const ctx = buildLocalContext(n.id);
    
    document.getElementById('assist-body').innerHTML = `
        ${assistSection('Contenido actual', `<div class="text-[10px]">${(n.content || '(vacío)').substring(0, 300)}...</div>`)}
        <div>
            <label class="text-[8px] uppercase opacity-60 block mb-0.5">Extensión estilística</label>
            <select id="rw-length-sel" class="w-full text-[11px] border border-black p-1.5 outline-none">
                <option value="corto">Corto (2-3 frases quirúrgicas)</option>
                <option value="medio" selected>Medio (1 párrafo denso)</option>
                <option value="largo">Largo (2 párrafos descriptivos)</option>
            </select>
        </div>
        ${assistField('Directrices de estilo / Corrección', 'rw-tone', '', 'ej: hazlo mucho más gótico, claustrofóbico y en tiempo presente', true)}
        <details class="border border-black bg-white mt-2">
            <summary class="text-[9px] uppercase font-bold p-2 cursor-pointer">Contexto Inyectado</summary>
            <pre class="text-[9px] p-2 max-h-40 overflow-y-auto whitespace-pre-wrap">${formatContextForPrompt(ctx).replace(/</g, '&lt;')}</pre>
        </details>
    `;
    const btn = document.getElementById('assist-primary');
    btn.textContent = 'Reescribir en Paralelo';
    btn.onclick = runRewrite;
}

function runRewrite() {
    const n = window.selectedNode;
    if (!n) return;
    const writer = document.getElementById('assist-writer').value;
    const tone = document.getElementById('rw-tone').value;
    const len = document.getElementById('rw-length-sel').value;
    if (!writer) return;

    if (typeof switchAssistTab === 'function') switchAssistTab('tasks');
    const task = typeof createTask === 'function' ? createTask(n.id, 'Reescribir', `Estilizando: ${n.title}`) : null;
    if (task) updateTask(n.id, 20, 'Analizando prosa...');

    const ctx = buildLocalContext(n.id);
    const pathText = ctx.mainPath.slice(0, -1).map(p => `[${p.title}] ${(p.content || '').substring(0, 100)}`).join(' → ');
    
    const lenMap = { corto: '2-3 frases impactantes', medio: 'un párrafo literario de 5-8 líneas', largo: 'dos párrafos descriptivos completos' };

    const prompt = `Reescribe estilísticamente la prosa del nodo actual respetando los hechos.
TÍTULO DEL PASO: ${n.title}
CONTENIDO TEXTUAL A MEJORAR:\n${n.content}

ÓRDENES DE ESTILO DEL AUTOR:\n${tone || 'Mejorar fluidez narratológica y madurez léxica.'}
LONGITUD REQUERIDA EXPLICITAMENTE: ${lenMap[len]}

CONGRUENCIA DEL ENTORNO:
- Camino cronológico previo: ${pathText || '(Inicio de la obra)'}
- Nodos futuros ya consolidados (PROHIBIDO CONTRADECIR): ${ctx.descendants.slice(0, 3).map(d => d.title).join(', ') || '(Línea libre)'}

Devuelve exclusivamente la nueva prosa literaria corregida. Sin títulos, sin metadatos y sin sugerir opciones de decisión al final.`;

    const signal = task ? task.controller.signal : null;
    ollamaGenerate(writer, prompt, false, null, signal).then(out => {
        const nd = data.nodes.find(ndx => ndx.id === n.id);
        if (nd) {
            nd.content = (out || '').trim();
            saveLogic();
            if (window.selectedNode && window.selectedNode.id === n.id) {
                const cEl = document.getElementById('node-content');
                if (cEl) cEl.value = nd.content;
            }
        }
        if (task) {
            updateTask(n.id, 100, 'Listo');
            setTimeout(() => finishTask(n.id), 1000);
        }
    }).catch(e => {
        if (task) {
            updateTask(n.id, 0, 'Fallo');
            setTimeout(() => finishTask(n.id), 2000);
        }
    });
}

function openFillEmpty() {
    openAssistPanel('IA · Rellenar nodos vacíos');
    const empty = data.nodes.filter(n => !n.content || !n.content.trim() || n.content === '[generando...]' || n.content === '[esperando IA...]' || n.content === '[escribiendo…]');
    
    document.getElementById('assist-body').innerHTML = `
        ${assistSection('Inspección de Nodos', `<div>Se han detectado <b>${empty.length}</b> nodos sin contenido en la red actual.</div>`)}
        ${assistField('Tono unificado exigido', 'fill-tone', '', 'ej: prosa seca, cortante, misteriosa', true)}
    `;
    const btn = document.getElementById('assist-primary');
    btn.textContent = `Lanzar ${empty.length} hilos concurrentes`;
    btn.onclick = () => runFillEmpty(empty);
}

function runFillEmpty(emptyNodes) {
    if (!emptyNodes.length) return;
    const writer = document.getElementById('assist-writer').value;
    const tone = document.getElementById('fill-tone').value;
    if (!writer) return;

    if (typeof switchAssistTab === 'function') switchAssistTab('tasks');

    emptyNodes.forEach(n => {
        const task = typeof createTask === 'function' ? createTask(n.id, 'Rellenar', `Rellenando: ${n.title}`) : null;
        if (task) updateTask(n.id, 25, 'Inyectando...');
        
        const ctx = buildLocalContext(n.id);
        const pathText = ctx.mainPath.slice(0, -1).map(p => `[${p.title}] ${(p.content || '').substring(0, 100)}`).join(' → ');
        
        const prompt = `Redacta la prosa de este nodo basándote estrictamente en su título y la trayectoria del juego.
TÍTULO DEL PASO: ${n.title}
TONO LITERARIO EXIGIDO: ${tone || 'Estilo inmersivo maduro.'}

CONTEXTO DEL GRAFO:
- Trayectoria recorrida previa: ${pathText || '(Nodo de inicio)'}
- Siguientes pasos prefijados: ${ctx.descendants.slice(0, 3).map(d => d.title).join(', ') || '(Línea abierta)'}

Devuelve ÚNICAMENTE la prosa narrativa para este fragmento (máximo un párrafo extenso). PROHIBIDO añadir cualquier texto adicional, títulos, notas o botones de acción en la salida.`;

        const signal = task ? task.controller.signal : null;
        ollamaGenerate(writer, prompt, false, null, signal).then(out => {
            const nd = data.nodes.find(ndx => ndx.id === n.id);
            if (nd) { nd.content = (out || '').trim(); saveLogic(); }
            if (task) {
                updateTask(n.id, 100, 'Listo');
                setTimeout(() => finishTask(n.id), 1000);
            }
        }).catch(e => {
            if (task) {
                updateTask(n.id, 0, 'Error');
                setTimeout(() => finishTask(n.id), 2000);
            }
        });
    });
}