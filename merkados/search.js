// search.js
// --- BÚSQUEDA DE NODOS (Ctrl+F) ---

let searchResults = [];
let searchIndex = 0;

function initSearchUI() {
    const html = `
    <div id="search-bar" class="hidden fixed top-4 left-1/2 -translate-x-1/2 bg-white border border-black px-3 py-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] z-40 flex items-center gap-2">
        <span class="text-[9px] uppercase font-bold opacity-60">Buscar</span>
        <input id="search-input" class="text-xs border-b border-black outline-none w-64 py-0.5" placeholder="título o contenido...">
        <span id="search-count" class="text-[9px] uppercase opacity-50 min-w-[40px] text-center">0/0</span>
        <button onclick="searchPrev()" class="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition">↑</button>
        <button onclick="searchNext()" class="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition">↓</button>
        <button onclick="closeSearch()" class="text-[10px] border border-black px-2 py-0.5 hover:bg-black hover:text-white transition">✕</button>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('search-input').addEventListener('input', (e) => runSearch(e.target.value));
    document.getElementById('search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.shiftKey ? searchPrev() : searchNext(); }
        if (e.key === 'Escape') closeSearch();
    });
}

function openSearch() {
    document.getElementById('search-bar').classList.remove('hidden');
    const inp = document.getElementById('search-input');
    inp.focus();
    inp.select();
}

function closeSearch() {
    document.getElementById('search-bar').classList.add('hidden');
    searchResults = [];
    searchIndex = 0;
    window.searchHighlightId = null;
}

function runSearch(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) {
        searchResults = [];
        window.searchHighlightId = null;
        document.getElementById('search-count').textContent = '0/0';
        return;
    }
    searchResults = data.nodes.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q)
    );
    searchIndex = 0;
    updateSearchUI();
    if (searchResults.length) centerOnNode(searchResults[0]);
}

function searchNext() {
    if (!searchResults.length) return;
    searchIndex = (searchIndex + 1) % searchResults.length;
    updateSearchUI();
    centerOnNode(searchResults[searchIndex]);
}

function searchPrev() {
    if (!searchResults.length) return;
    searchIndex = (searchIndex - 1 + searchResults.length) % searchResults.length;
    updateSearchUI();
    centerOnNode(searchResults[searchIndex]);
}

function updateSearchUI() {
    document.getElementById('search-count').textContent =
        searchResults.length ? `${searchIndex + 1}/${searchResults.length}` : '0/0';
    window.searchHighlightId = searchResults[searchIndex]?.id || null;
}

function centerOnNode(node) {
    if (!node || typeof camera === 'undefined') return;
    const cv = document.getElementById('flowCanvas');
    camera.zoom = Math.max(camera.zoom, 0.8);
    camera.x = cv.width / 2 - (node.x + 70) * camera.zoom;
    camera.y = cv.height / 2 - (node.y + 30) * camera.zoom;
    if (typeof updateGrid === 'function') updateGrid();
}

// --- FIT TO SCREEN ---
function fitToScreen() {
    if (!data.nodes.length || typeof camera === 'undefined') return;
    const cv = document.getElementById('flowCanvas');
    const xs = data.nodes.map(n => n.x);
    const ys = data.nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs) + 140;
    const minY = Math.min(...ys), maxY = Math.max(...ys) + 60;
    const w = maxX - minX, h = maxY - minY;
    const pad = 80;
    camera.zoom = Math.min((cv.width - pad * 2) / w, (cv.height - pad * 2) / h);
    camera.zoom = Math.max(0.1, Math.min(camera.zoom, 2));
    camera.x = cv.width / 2 - (minX + w / 2) * camera.zoom;
    camera.y = cv.height / 2 - (minY + h / 2) * camera.zoom;
    if (typeof updateGrid === 'function') updateGrid();
}

function resetZoom() {
    if (typeof camera === 'undefined') return;
    camera.zoom = 1;
    camera.x = 0;
    camera.y = 0;
    if (typeof updateGrid === 'function') updateGrid();
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initSearchUI, 100));
