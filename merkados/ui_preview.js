// ui_preview.js
// --- SISTEMA DE PREVISUALIZACI N INMERSIVA (NOVELA VISUAL) ---
let previewHistory = [];
let previewTheme = 'dark';

function togglePreviewTheme() {
    previewTheme = previewTheme === 'dark' ? 'light' : 'dark';
    const container = document.getElementById('preview-dialog-container');
    const titleText = document.getElementById('preview-title-text');
    const proseText = document.getElementById('preview-prose-text');
    const themeBtn = document.getElementById('preview-theme-btn');
         
    if (container) {
        if (previewTheme === 'light') {
            container.className = "bg-white/95 backdrop-blur-md border border-black/20 p-4 shadow-[0_0_30px_rgba(0,0,0,0.15)] flex flex-col md:flex-row gap-4 max-h-[35vh]";
            if (titleText) titleText.className = "text-black text-xs font-black tracking-widest uppercase";
            if (proseText) proseText.className = "text-gray-800 font-serif text-[14px] leading-relaxed overflow-y-auto pr-2 scrollbar";
            if (themeBtn) themeBtn.textContent = "  CLARO";
            document.querySelectorAll('.preview-opt-btn').forEach(b => {
                b.className = "preview-opt-btn w-full text-left border border-black/20 bg-black/5 text-black/90 px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-black hover:text-white hover:border-black transition-all duration-150 flex items-center justify-between group whitespace-normal break-words";
            });
        } else {
            container.className = "bg-black/90 backdrop-blur-md border border-white/20 p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col md:flex-row gap-4 max-h-[35vh]";
            if (titleText) titleText.className = "text-white text-xs font-black tracking-widest uppercase";
            if (proseText) proseText.className = "text-gray-200 font-serif text-[14px] leading-relaxed overflow-y-auto pr-2 scrollbar";
            if (themeBtn) themeBtn.textContent = "  OSCURO";
            document.querySelectorAll('.preview-opt-btn').forEach(b => {
                b.className = "preview-opt-btn w-full text-left border border-white/20 bg-white/5 text-white/90 px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-white hover:text-black hover:border-white transition-all duration-150 flex items-center justify-between group whitespace-normal break-words";
            });
        }
    }
}

function startPreview(startId = null) {
    if (data.nodes.length === 0) {
        alert("No hay nodos para previsualizar.");
        return;
    }
    let startNode;
    if (startId) startNode = data.nodes.find(n => n.id === startId);
    if (!startNode) {
        startNode = data.nodes.find(n => !data.connections.some(c => c.to === n.id)) || data.nodes[0];
    }
    previewHistory = [];
    renderPreviewNode(startNode.id);
    document.getElementById('preview-modal').classList.remove('hidden');
}

function renderPreviewNode(nodeId, fromHistory = false) {
    const node = data.nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (!fromHistory) previewHistory.push(nodeId);
    const modal = document.getElementById('preview-modal');
    const contentText = (node.content || '').replace(/\n/g, '<br>');
    const outgoing = data.connections.filter(c => c.from === nodeId);
    modal.className = "fixed inset-0 bg-[#000000] z-50 overflow-hidden flex flex-col justify-end select-text";
         
    let backgroundStyle = "";
    if (node.image) {
        backgroundStyle = `style="background-image: url('${node.image}'); background-size: contain; background-position: center; background-repeat: no-repeat; background-color: #000000;"`;
    }
    const isLight = previewTheme === 'light';
    const boxClass = isLight 
         ? "bg-white/95 backdrop-blur-md border border-black/20 p-4 shadow-[0_0_30px_rgba(0,0,0,0.15)] flex flex-col md:flex-row gap-4 max-h-[35vh]" 
         : "bg-black/90 backdrop-blur-md border border-white/20 p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col md:flex-row gap-4 max-h-[35vh]";
         
    const titleClass = isLight ? "text-black text-xs font-black tracking-widest uppercase" : "text-white text-xs font-black tracking-widest uppercase";
    const proseClass = isLight ? "text-gray-800 font-serif text-[14px] leading-relaxed overflow-y-auto pr-2 scrollbar" : "text-gray-200 font-serif text-[14px] leading-relaxed overflow-y-auto pr-2 scrollbar";
    const buttonStyle = isLight 
         ? "preview-opt-btn w-full text-left border border-black/20 bg-black/5 text-black/90 px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-black hover:text-white hover:border-black transition-all duration-150 flex items-center justify-between group whitespace-normal break-words"
         : "preview-opt-btn w-full text-left border border-white/20 bg-white/5 text-white/90 px-3 py-2 text-[11px] font-bold uppercase tracking-wider hover:bg-white hover:text-black hover:border-white transition-all duration-150 flex items-center justify-between group whitespace-normal break-words";
    let html = `
        <div class="absolute inset-0 transition-all duration-500" ${backgroundStyle}>
            ${!node.image ? `<div class="w-full h-full flex items-center justify-center opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>` : ''}
        </div>
        <div class="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-auto">
            <div class="text-white text-[10px] uppercase tracking-widest font-bold drop-shadow">
                ${data.name} &middot; <span class="opacity-60">Paso ${previewHistory.length}</span>
            </div>
            <div class="flex gap-2">
                <button id="preview-theme-btn" onclick="togglePreviewTheme()" class="text-white text-[9px] uppercase font-bold border border-white/40 px-3 py-1 bg-black/40 backdrop-blur-sm hover:bg-white hover:text-black transition">${isLight ? '  CLARO' : '  OSCURO'}</button>
                ${previewHistory.length > 1 ? `<button onclick="previewBack()" class="text-white text-[9px] uppercase font-bold border border-white/40 px-3 py-1 bg-black/40 backdrop-blur-sm hover:bg-white hover:text-black transition">  Volver</button>` : ''}
                <button onclick="closePreviewModal()" class="text-white text-[9px] uppercase font-bold border border-white/40 px-3 py-1 bg-black/40 backdrop-blur-sm hover:bg-white hover:text-black transition">  Salir</button>
            </div>
        </div>
        <div class="w-full max-w-6xl mx-auto px-4 pb-4 z-10 pointer-events-auto">
            <div id="preview-dialog-container" class="${boxClass}">
                <div class="flex-1 flex flex-col gap-2 min-w-0">
                    <div class="flex items-center gap-2 border-b ${isLight ? 'border-black/10' : 'border-white/10'} pb-1 shrink-0">
                        <span class="h-1.5 w-1.5 ${isLight ? 'bg-black' : 'bg-white'} animate-pulse"></span>
                        <h3 id="preview-title-text" class="${titleClass}">${node.title}</h3>
                        ${node.isEnding ? '<span class="text-[7px] font-bold tracking-widest uppercase border border-red-500 text-red-500 px-1.5 py-0.5 ml-auto">Final</span>' : ''}
                    </div>
                    <div id="preview-prose-text" class="${proseClass}">
                        ${contentText || `<span class="italic opacity-30 uppercase text-[9px]">Sin prosa literaria en este nodo.</span>`}
                    </div>
                </div>
                <div class="w-full md:w-[320px] shrink-0 flex flex-col justify-start border-t md:border-t-0 md:border-l ${isLight ? 'border-black/10 md:pl-4' : 'border-white/10 md:pl-4'} pt-2 md:pt-0 gap-1.5 overflow-y-auto max-h-[24vh]">
    `;
    if (outgoing.length > 0) {
        outgoing.forEach(c => {
            const label = c.label || "Avanzar...";
            html += `
                <button onclick="renderPreviewNode('${c.to}')" class="${buttonStyle}">
                    <span class="flex-1 pr-2">${label}</span>
                    <span class="opacity-50 group-hover:opacity-100 transition-opacity font-sans flex-shrink-0">&rarr;</span>
                </button>`;
        });
    } else {
        html += `
            <div class="text-center py-1 flex flex-col items-center justify-center gap-1.5">
                <p class="text-[9px] uppercase text-red-500 tracking-widest font-bold">Trayecto Concluido</p>
                <button onclick="startPreview()" class="text-[9px] uppercase font-bold border ${isLight ? 'border-black text-black' : 'border-white text-white'} px-4 py-1.5 bg-transparent hover:bg-white hover:text-black transition">Reiniciar</button>
            </div>`;
    }
    html += `
                </div>
            </div>
        </div>
    `;
    modal.innerHTML = html;
    modal.scrollTo(0, 0);
}

function previewBack() {
    if (previewHistory.length < 2) return;
    previewHistory.pop();
    const prev = previewHistory.pop();
    renderPreviewNode(prev, true);
}

function closePreviewModal() {
    document.getElementById('preview-modal').classList.add('hidden');
    previewHistory = [];
}