// validation.js
// --- VALIDACIÓN DE LA RED NARRATIVA ---

function analyzeNetwork() {
    const nodes = data.nodes;
    const conns = data.connections;
    const incoming = {}, outgoing = {};
    nodes.forEach(n => { incoming[n.id] = []; outgoing[n.id] = []; });
    conns.forEach(c => {
        if (outgoing[c.from]) outgoing[c.from].push(c.to);
        if (incoming[c.to]) incoming[c.to].push(c.from);
    });

    const roots = nodes.filter(n => incoming[n.id].length === 0);
    const endings = nodes.filter(n => outgoing[n.id].length === 0);
    const orphans = nodes.filter(n => incoming[n.id].length === 0 && outgoing[n.id].length === 0);

    // Inalcanzables desde primera raíz
    const reachable = new Set();
    if (roots.length > 0) {
        const stack = [roots[0].id];
        while (stack.length) {
            const id = stack.pop();
            if (reachable.has(id)) continue;
            reachable.add(id);
            (outgoing[id] || []).forEach(t => stack.push(t));
        }
    }
    const unreachable = nodes.filter(n => !reachable.has(n.id));

    // Detección de ciclos (DFS)
    const cycles = [];
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = {};
    nodes.forEach(n => color[n.id] = WHITE);
    function dfs(nodeId, path) {
        color[nodeId] = GRAY;
        for (const next of (outgoing[nodeId] || [])) {
            if (color[next] === GRAY) {
                cycles.push([...path.slice(path.indexOf(next)), next]);
            } else if (color[next] === WHITE) {
                dfs(next, [...path, next]);
            }
        }
        color[nodeId] = BLACK;
    }
    nodes.forEach(n => { if (color[n.id] === WHITE) dfs(n.id, [n.id]); });

    // Conexiones rotas (apuntan a nodos inexistentes)
    const nodeIds = new Set(nodes.map(n => n.id));
    const brokenConns = conns.filter(c => !nodeIds.has(c.from) || !nodeIds.has(c.to));

    // Opciones sin label
    const unlabeled = conns.filter(c => !c.label || !c.label.trim());

    return { roots, endings, orphans, unreachable, cycles, brokenConns, unlabeled, totalNodes: nodes.length, totalConns: conns.length };
}

function showValidationReport() {
    const r = analyzeNetwork();
    const modal = document.getElementById('validation-modal');
    const body = document.getElementById('validation-body');

    const wordCount = data.nodes.reduce((s, n) => s + (n.content || '').split(/\s+/).filter(Boolean).length, 0);

    body.innerHTML = `
        <div class="grid grid-cols-4 gap-2 mb-4">
            ${statCard('Nodos', r.totalNodes)}
            ${statCard('Conexiones', r.totalConns)}
            ${statCard('Raíces', r.roots.length, r.roots.length === 0 ? 'red' : (r.roots.length > 1 ? 'amber' : ''))}
            ${statCard('Finales', r.endings.length)}
            ${statCard('Palabras', wordCount)}
            ${statCard('Huérfanos', r.orphans.length, r.orphans.length > 0 ? 'amber' : '')}
            ${statCard('Inalcanzables', r.unreachable.length, r.unreachable.length > 0 ? 'red' : '')}
            ${statCard('Ciclos', r.cycles.length, r.cycles.length > 0 ? 'amber' : '')}
        </div>

        ${listSection('Nodos inalcanzables desde la raíz', r.unreachable, 'red')}
        ${listSection('Nodos huérfanos (sin entradas ni salidas)', r.orphans, 'amber')}
        ${listSection('Finales del librojuego', r.endings, '')}
        ${listSection('Opciones sin texto', r.unlabeled.map(c => {
            const fn = data.nodes.find(n => n.id === c.from);
            const tn = data.nodes.find(n => n.id === c.to);
            return { id: c.from, title: `${fn?.title || '?'} → ${tn?.title || '?'}` };
        }), 'amber')}

        ${r.brokenConns.length ? `
            <div class="border border-red-500 p-3 mb-3">
                <p class="text-[10px] uppercase font-bold text-red-500 mb-2">${r.brokenConns.length} conexiones rotas</p>
                <button onclick="cleanBrokenConnections()" class="text-[10px] uppercase border border-red-500 text-red-500 px-3 py-1 hover:bg-red-500 hover:text-white">Limpiar</button>
            </div>` : ''}
    `;
    modal.classList.remove('hidden');
}

function statCard(label, value, tone = '') {
    const colors = {
        red: 'border-red-500 text-red-500',
        amber: 'border-amber-500 text-amber-600',
        '': 'border-black'
    };
    return `<div class="border ${colors[tone]} p-2 text-center">
        <div class="text-[8px] uppercase opacity-60 tracking-wider">${label}</div>
        <div class="text-lg font-bold">${value}</div>
    </div>`;
}

function listSection(title, items, tone) {
    if (!items || items.length === 0) return '';
    const color = tone === 'red' ? 'border-red-500' : tone === 'amber' ? 'border-amber-500' : 'border-black';
    return `
        <div class="border ${color} p-3 mb-2">
            <p class="text-[10px] uppercase font-bold mb-2">${title} (${items.length})</p>
            <ul class="space-y-1">
                ${items.slice(0, 12).map(n => `
                    <li>
                        <button onclick="closeValidation(); centerOnNode(data.nodes.find(nd => nd.id === '${n.id}'))"
                                class="text-[10px] hover:underline text-left w-full truncate">
                            ▸ ${n.title || '(sin título)'}
                        </button>
                    </li>
                `).join('')}
                ${items.length > 12 ? `<li class="text-[9px] opacity-50 italic">+ ${items.length - 12} más...</li>` : ''}
            </ul>
        </div>
    `;
}

function closeValidation() {
    document.getElementById('validation-modal').classList.add('hidden');
}

function cleanBrokenConnections() {
    const ids = new Set(data.nodes.map(n => n.id));
    const before = data.connections.length;
    data.connections = data.connections.filter(c => ids.has(c.from) && ids.has(c.to));
    saveLogic();
    flashSaveIndicator(`LIMPIADAS ${before - data.connections.length}`);
    showValidationReport();
}

function initValidationUI() {
    const html = `
    <div id="validation-modal" class="hidden fixed inset-0 bg-white/95 z-50 flex items-center justify-center backdrop-blur-sm">
        <div class="bg-white border border-black w-[700px] max-h-[80vh] overflow-y-auto p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <div class="flex justify-between items-center mb-6 border-b border-black pb-2">
                <h2 class="text-xs font-bold tracking-widest uppercase">Diagnóstico de la Red</h2>
                <button onclick="closeValidation()" class="text-[10px] uppercase border border-black px-3 py-1 hover:bg-black hover:text-white">✕</button>
            </div>
            <div id="validation-body"></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initValidationUI, 100));
