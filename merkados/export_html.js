// export_html.js
// --- EXPORTACI N A HTML JUGABLE AUTOCONTENIDO ---
// Genera un  nico .html con todo el librojuego embebido. Sin dependencias externas.
// Est tica minimalista brutalista adaptada a formato Novela Visual Inmersiva con Panel Paralelo.
function exportPlayableHTML() {
    if (!data.nodes.length) {
        alert('El proyecto est  vac o.');
        return;
    }
    const startNode = data.nodes.find(n => !data.connections.some(c => c.to === n.id)) || data.nodes[0];
    const safeData = {
        name: data.name,
        nodes: data.nodes.map(n => ({
            id: n.id,
            title: n.title || '',
            content: n.content || '',
            isEnding: !!n.isEnding,
            image: n.image || null
        })),
        connections: data.connections.map(c => ({
            from: c.from,
            to: c.to,
            label: c.label || ''
        })),
        startId: startNode.id
    };
    const html = `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.name)}</title>
<style>
:root[data-theme="dark"] {
    --bg: #0a0a0a;
    --fg: #f0f0f0;
    --box-bg: rgba(0, 0, 0, 0.9);
    --border-color: rgba(255, 255, 255, 0.15);
    --prose-color: #e5e7eb;
    --btn-bg: rgba(255, 255, 255, 0.04);
}
:root[data-theme="light"] {
    --bg: #f5f5f5;
    --fg: #1a1a1a;
    --box-bg: rgba(255, 255, 255, 0.95);
    --border-color: rgba(0, 0, 0, 0.15);
    --prose-color: #2a2a2a;
    --btn-bg: rgba(0, 0, 0, 0.03);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    background: var(--bg);
    color: var(--fg);
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
    transition: background 0.3s, color 0.3s;
}
/* Fondo de pantalla completa corregido para evitar distorsiones */
#visual-bg {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    background-color: #000000;
    transition: background-image 0.5s ease-in-out;
    z-index: 1;
}
#visual-bg-overlay {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(128,128,128,0.1) 1px, transparent 1px);
    background-size: 16px 16px;
    pointer-events: none;
}
/* Barra superior */
.top-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
    padding: 14px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
}
.top-bar h1 { font-size: 11px; font-weight: 900; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
.top-bar-actions { display: flex; gap: 8px; }
.btn-mini {
    border: 1px solid var(--border-color);
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    color: #fff;
    padding: 5px 12px;
    font-size: 9px;
    text-transform: uppercase;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: 1px;
    transition: all 0.2s;
}
:root[data-theme="light"] .btn-mini {
    background: rgba(255,255,255,0.7);
    color: #000;
}
.btn-mini:hover { background: var(--fg); color: var(--bg); border-color: var(--fg); }
/* Distribuci n e Interfaz reducida en altura */
main {
    position: relative;
    z-index: 5;
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 16px;
}
.interface-wrap {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
}
.node-box {
    background: var(--box-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
    padding: 20px;
    box-shadow: 0 4px 30px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: row; /* Colocaci n horizontal */
    gap: 24px;
    max-height: 35vh; /* Altura compacta */
    animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}
/* Columna de Texto */
.text-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
}
.node-header {
    display: flex;
    align-items: center;
    gap: 8px;
    border-b: 1px solid var(--border-color);
    padding-bottom: 6px;
}
.node-indicator {
    height: 5px; width: 5px; background: var(--fg); border-radius: 50%;
}
h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 900;
}
.ending-badge {
    font-size: 7px;
    border: 1px solid #ef4444;
    color: #ef4444;
    padding: 1px 6px;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-left: auto;
    font-weight: bold;
}
.content {
    font-family: 'Georgia', serif;
    font-size: 15px;
    line-height: 1.65;
    color: var(--prose-color);
    white-space: pre-wrap;
    overflow-y: auto;
    padding-right: 6px;
}
.content::-webkit-scrollbar { width: 3px; }
.content::-webkit-scrollbar-thumb { background: var(--border-color); }
/* Columna de Decisiones (A la derecha) - Se limpia el desbordamiento horizontal y se permite multi-l nea */
.options-column {
    width: 340px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    border-left: 1px solid var(--border-color);
    padding-left: 20px;
    gap: 6px;
    overflow-y: auto;
    overflow-x: hidden;
}
.opt-btn {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border-color);
    background: var(--btn-bg);
    color: var(--fg);
    padding: 10px 14px;
    text-align: left;
    font-family: inherit;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    justify-content: space-between;
    align-items: center;
    white-space: normal;
    word-break: break-word;
}
.opt-btn:hover {
    background: var(--fg);
    color: var(--bg);
    border-color: var(--fg);
    transform: translateX(3px);
}
.opt-arrow { opacity: 0; font-family: monospace; transition: opacity 0.15s; margin-left: 8px; flex-shrink: 0; }
.opt-btn:hover .opt-arrow { opacity: 1; }
.end-block {
    text-align: center;
    padding: 8px 0;
}
.end-text {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #ef4444;
    margin-bottom: 8px;
    font-weight: bold;
}
.path-info {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.3;
    display: flex;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 4px;
}
@media (max-width: 768px) {
    .node-box { flex-direction: column; max-height: 70vh; gap: 14px; }
    .options-column { width: 100%; border-left: none; border-t: 1px solid var(--border-color); padding-left: 0; padding-top: 14px; }
}
</style>
</head>
<body>
<div id="visual-bg"><div id="visual-bg-overlay"></div></div>
<div class="top-bar">
    <h1>${escapeHtml(data.name)}</h1>
    <div class="top-bar-actions">
        <button class="btn-mini" onclick="toggleTheme()">  Tema</button>
        <button class="btn-mini" id="history-back-btn" style="display:none;" onclick="goBack()">Atr s</button>
        <button class="btn-mini" onclick="restart()">Reiniciar</button>
    </div>
</div>
<main>
    <div class="interface-wrap" id="app"></div>
</main>
<script>
const STORY = ${JSON.stringify(safeData)};
let history = [];
function escapeHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    root.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}
function render(nodeId, fromHistory) {
    const node = STORY.nodes.find(n => n.id === nodeId);
    if (!node) return;
         
    if (!fromHistory) history.push(nodeId);
         
    const bgEl = document.getElementById('visual-bg');
    if (node.image) {
        bgEl.style.backgroundImage = "url('" + node.image + "')";
    } else {
        bgEl.style.backgroundImage = "none";
    }
    document.getElementById('history-back-btn').style.display = history.length > 1 ? 'block' : 'none';
    const outgoing = STORY.connections.filter(c => c.from === nodeId);
    const app = document.getElementById('app');
    let html = '<div class="node-box">';
         
    // Columna de Texto (Izquierda)
    html += '<div class="text-column">';
    html += '<div class="node-header">';
    html += '<span class="node-indicator"></span>';
    html += '<h2>' + escapeHtml(node.title) + '</h2>';
    if (node.isEnding) html += '<span class="ending-badge">Final</span>';
    html += '</div>';
    html += '<div class="content">' + escapeHtml(node.content).replace(/\\n/g, '<br>') + '</div>';
    html += '<div class="path-info"><span>Paso ' + history.length + '</span><span>' + STORY.name + '</span></div>';
    html += '</div>';
         
    // Columna de Decisiones (Derecha)
    html += '<div class="options-column">';
    if (outgoing.length > 0) {
        outgoing.forEach(c => {
            const label = c.label || 'Continuar';
            html += '<button class="opt-btn" onclick="render(\\'' + c.to + '\\')"><span>' + escapeHtml(label) + '</span><span class="opt-arrow">&rarr;</span></button>';
        });
    } else {
        html += '<div class="end-block">';
        html += '<div class="end-text">Recorrido Terminado</div>';
        html += '<button class="btn-mini" onclick="restart()">Reiniciar Cr nica</button>';
        html += '</div>';
    }
    html += '</div>';
    html += '</div>';
    app.innerHTML = html;
}
function goBack() {
    if (history.length < 2) return;
    history.pop();
    const prev = history.pop();
    render(prev);
}
function restart() {
    history = [];
    render(STORY.startId);
}
(function init() {
    render(STORY.startId);
})();
</script>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${data.name.replace(/\s+/g, '_')}_NovelaVisual.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
function escapeHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}