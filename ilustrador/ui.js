export function appendLog(text) {
    const consoleOutput = document.getElementById('console-output');
    const time = new Date().toLocaleTimeString();
    consoleOutput.innerHTML += `<div class="border-l-2 border-emerald-800 pl-2"><span class="text-slate-500">[${time}]</span> ${text}</div>`;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

export function setPipelineStatus(stepDesc, progressPct, badgeState = "active") {
    const pipelineStepText = document.getElementById('pipeline-step-text');
    const pipelineProgress = document.getElementById('pipeline-progress');
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');

    pipelineStepText.innerText = stepDesc;
    pipelineProgress.style.width = `${progressPct}%`;
    
    if (badgeState === "active") {
        statusBadge.className = "bg-amber-950 text-amber-300 border border-amber-800 text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-2";
        statusText.innerText = "Compilando...";
    } else if (badgeState === "complete") {
        statusBadge.className = "bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-2";
        statusText.innerText = "Finalizado";
        pipelineStepText.innerText = "Proceso Concluido con Éxito";
    } else {
        statusBadge.className = "bg-slate-800 text-slate-400 text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-2";
        statusText.innerText = "Inerte";
    }
}

export function crearCardNodoUI(idNodo, tituloNodo) {
    const galleryContainer = document.getElementById('gallery-container');
    const div = document.createElement('div');
    div.id = `card-nodo-${idNodo}`;
    div.className = "bg-[#1e293b] border border-[#334155] rounded p-3 flex flex-col justify-between space-y-2 h-44 overflow-hidden shadow-md transition-all";
    div.innerHTML = `
        <div>
            <div class="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>ID: ${idNodo}</span>
                <span id="card-status-${idNodo}" class="text-slate-400">En Cola</span>
            </div>
            <h4 class="text-xs font-bold text-white mt-1 truncate">${tituloNodo}</h4>
        </div>
        <div id="card-preview-zone-${idNodo}" class="w-full flex-1 bg-black/30 rounded flex items-center justify-center text-[11px] text-slate-500 italic overflow-hidden">
            Esperando pipeline...
        </div>
    `;
    galleryContainer.appendChild(div);
}

export function actualizarCardNodoStatus(idNodo, estadoTxt, colorClase, base64Src = null) {
    const statusLabel = document.getElementById(`card-status-${idNodo}`);
    const chromaToggle = document.getElementById('chroma-toggle');
    if (statusLabel) {
        statusLabel.className = `text-[10px] font-semibold uppercase ${colorClase}`;
        statusLabel.innerText = estadoTxt;
    }

    const previewZone = document.getElementById(`card-preview-zone-${idNodo}`);
    const cardContainer = document.getElementById(`card-nodo-${idNodo}`);
    if (previewZone && base64Src) {
        if (chromaToggle.checked) {
            cardContainer.classList.add('transparency-bg');
        } else {
            cardContainer.classList.remove('transparency-bg');
        }
        previewZone.innerHTML = `<img src="${base64Src}" class="w-full h-full object-contain transition-opacity duration-300">`;
    } else if (previewZone) {
        previewZone.innerText = estadoTxt;
    }
}