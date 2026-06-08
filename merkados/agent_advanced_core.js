// agent_advanced_core.js
// --- CONTROLADOR CENTRAL Y UTILIDADES DEL ASISTENTE AVANZADO ---

function initAdvancedAgentUI() {
    const tb = `
    <div id="agent-adv-toolbar" class="hidden absolute z-30 bg-white border border-black flex shadow-[3px_3px_0px_rgba(0,0,0,1)]">
        <button onclick="openExpand()" class="text-[9px] uppercase font-bold px-3 py-2 border-r border-black hover:bg-black hover:text-white" title="Generar ramas hijas inteligentes">+ Expandir</button>
        <button onclick="openSuggestOptions()" class="text-[9px] uppercase font-bold px-3 py-2 border-r border-black hover:bg-black hover:text-white" title="Proponer nuevas opciones de decisión">⋯ Sugerir</button>
        <button onclick="openRewrite()" class="text-[9px] uppercase font-bold px-3 py-2 border-r border-black hover:bg-black hover:text-white" title="Reescribir el contenido del nodo">↻ Reescribir</button>
        <button onclick="openFillEmpty()" class="text-[9px] uppercase font-bold px-3 py-2 hover:bg-black hover:text-white" title="Rellenar todos los nodos vacíos">▣ Rellenar</button>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', tb);
}

function updateAdvToolbar() {
    const bar = document.getElementById('agent-adv-toolbar');
    if (!bar) return;
    if (!window.selectedNode || typeof data === 'undefined' || !data.nodes?.length || typeof camera === 'undefined') {
        bar.classList.add('hidden');
        return;
    }
    bar.classList.remove('hidden');
    const n = window.selectedNode;
    const sx = n.x * camera.zoom + camera.x;
    const sy = n.y * camera.zoom + camera.y;
    bar.style.left = sx + 'px';
    bar.style.top = Math.max(8, sy - 40) + 'px';
}

function labelsAreSimilar(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    const wa = new Set(a.toLowerCase().replace(/[^\wáéíóúñü\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4));
    const wb = new Set(b.toLowerCase().replace(/[^\wáéíóúñü\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4));
    if (!wa.size || !wb.size) return false;
    let common = 0;
    wa.forEach(w => { if (wb.has(w)) common++; });
    const jaccard = common / (wa.size + wb.size - common);
    return jaccard >= 0.5;
}

// Bucle de reposicionamiento de la interfaz flotante
setInterval(updateAdvToolbar, 100);

document.addEventListener('DOMContentLoaded', () => setTimeout(initAdvancedAgentUI, 600));