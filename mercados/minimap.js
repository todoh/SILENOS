// minimap.js
// --- MINIMAPA EN ESQUINA INFERIOR DERECHA DEL CANVAS ---

const MINIMAP_W = 180;
const MINIMAP_H = 120;

function initMinimap() {
    const html = `
    <div id="minimap-wrap" class="absolute bottom-4 right-4 border border-black bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] z-10">
        <div class="text-[8px] uppercase tracking-widest font-bold border-b border-black px-2 py-0.5 flex justify-between items-center">
            <span>Mapa</span>
            <button onclick="toggleMinimap()" class="hover:opacity-60" id="minimap-toggle">−</button>
        </div>
        <canvas id="minimap" width="${MINIMAP_W}" height="${MINIMAP_H}" class="cursor-pointer block"></canvas>
    </div>`;
    document.getElementById('canvas-container').insertAdjacentHTML('beforeend', html);

    const mini = document.getElementById('minimap');
    mini.addEventListener('click', handleMinimapClick);
}

let minimapCollapsed = false;
function toggleMinimap() {
    const c = document.getElementById('minimap');
    minimapCollapsed = !minimapCollapsed;
    c.style.display = minimapCollapsed ? 'none' : 'block';
    document.getElementById('minimap-toggle').textContent = minimapCollapsed ? '+' : '−';
}

function handleMinimapClick(e) {
    if (!data.nodes.length) return;
    const bb = getNodesBounds();
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = bb.minX + (mx / MINIMAP_W) * bb.width;
    const worldY = bb.minY + (my / MINIMAP_H) * bb.height;
    const cv = document.getElementById('flowCanvas');
    camera.x = cv.width / 2 - worldX * camera.zoom;
    camera.y = cv.height / 2 - worldY * camera.zoom;
    if (typeof updateGrid === 'function') updateGrid();
}

function getNodesBounds() {
    if (!data.nodes.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    data.nodes.forEach(n => {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + 140 > maxX) maxX = n.x + 140;
        if (n.y + 60 > maxY) maxY = n.y + 60;
    });
    const padX = 50, padY = 50;
    minX -= padX; minY -= padY; maxX += padX; maxY += padY;
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function renderMinimap() {
    if (minimapCollapsed) return;
    const c = document.getElementById('minimap');
    if (!c) return;
    const mctx = c.getContext('2d');
    mctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
    mctx.fillStyle = '#fafafa';
    mctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

    if (!data.nodes.length) return;
    const bb = getNodesBounds();
    const sx = MINIMAP_W / bb.width;
    const sy = MINIMAP_H / bb.height;

    // Conexiones
    mctx.strokeStyle = '#cccccc';
    mctx.lineWidth = 0.5;
    data.connections.forEach(c => {
        const n1 = data.nodes.find(n => n.id === c.from);
        const n2 = data.nodes.find(n => n.id === c.to);
        if (!n1 || !n2) return;
        mctx.beginPath();
        mctx.moveTo((n1.x + 70 - bb.minX) * sx, (n1.y + 30 - bb.minY) * sy);
        mctx.lineTo((n2.x + 70 - bb.minX) * sx, (n2.y + 30 - bb.minY) * sy);
        mctx.stroke();
    });

    // Nodos
    data.nodes.forEach(n => {
        const x = (n.x - bb.minX) * sx;
        const y = (n.y - bb.minY) * sy;
        const w = Math.max(2, 140 * sx);
        const h = Math.max(2, 60 * sy);
        if (n === window.selectedNode) mctx.fillStyle = '#000';
        else if (n.isEnding) mctx.fillStyle = '#dc2626';
        else mctx.fillStyle = '#000000aa';
        mctx.fillRect(x, y, w, h);
    });

    // Viewport
    const cv = document.getElementById('flowCanvas');
    const vpX = (-camera.x / camera.zoom - bb.minX) * sx;
    const vpY = (-camera.y / camera.zoom - bb.minY) * sy;
    const vpW = (cv.width / camera.zoom) * sx;
    const vpH = (cv.height / camera.zoom) * sy;
    mctx.strokeStyle = '#3b82f6';
    mctx.lineWidth = 1.5;
    mctx.strokeRect(vpX, vpY, vpW, vpH);
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initMinimap, 200));
