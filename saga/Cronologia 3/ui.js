// --- cronologia/ui.js ---
// INTERFAZ DE USUARIO (ACTUALIZADO: NAMESPACE INDEPENDIENTE PARA EVITAR COLISIONES)

const uiCrono = {
    selectedFolderHandle: null,
    selectedEventId: null,

    init() {
        const inpTime = document.getElementById('crono-inp-time');
        const inpTitle = document.getElementById('crono-inp-title');
        if (inpTime) {
            inpTime.addEventListener('input', (e) => window.mainCrono.updateSelected('time', parseFloat(e.target.value)));
        }
        if (inpTitle) {
            inpTitle.addEventListener('input', (e) => window.mainCrono.updateSelected('description', e.target.value));
        }
    },

    updateAuthUI(isConnected) {
        const btn = document.getElementById('auth-btn');
        if (btn) {
            btn.innerText = isConnected ? "ONLINE" : "CONECTAR IA";
            if(isConnected) btn.classList.add('text-green-500');
            else btn.classList.remove('text-green-500');
        }
    },

    toggleFileSelector() {
        const modal = document.getElementById('file-modal');
        if (modal) {
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) this.refreshFolderList();
        }
    },

    toggleAIModal() { document.getElementById('ai-modal').classList.toggle('hidden'); },
    togglePremiseModal() { document.getElementById('premise-modal').classList.toggle('hidden'); },
    toggleStoryboardModal() { document.getElementById('storyboard-modal').classList.toggle('hidden'); },

    toggleLoading(show, text, subtext="") {
        const el = document.getElementById('ai-loading-overlay');
        if (!el) return;
        if(show) {
            el.classList.remove('hidden');
            el.classList.add('flex');
            document.getElementById('ai-loading-text').innerText = text;
            document.getElementById('ai-loading-subtext').innerText = subtext;
        } else {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
    },

    async refreshFolderList() {
        const list = document.getElementById('folder-list'); 
        if (!list) return;
        list.innerHTML = '';
        const FS = window.parent;
        
        if (!FS || !FS.rootHandle) {
            list.innerHTML = '<div class="p-8 text-center text-xs text-red-400 font-light">Root Handle no accesible.</div>';
            return;
        }
        this.addFolderOption(list, FS.rootHandle, 'RAÍZ DEL PROYECTO', true);
        await this.scanDirRecursive(FS.rootHandle, list, 'ROOT');
    },

    async scanDirRecursive(dirHandle, listElement, pathString, depth = 0) {
        if (depth > 2) return; 
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                const currentPath = `${pathString} / ${entry.name}`;
                this.addFolderOption(listElement, entry, currentPath);
                await this.scanDirRecursive(entry, listElement, currentPath, depth + 1);
            }
        }
    },

    addFolderOption(container, handle, displayName, isRoot = false) {
        const el = document.createElement('div');
        const isSelected = this.selectedFolderHandle === handle;
        el.className = `px-6 py-3 cursor-pointer border-b border-gray-50 flex items-center gap-4 text-xs font-light transition-colors ${isSelected ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50'}`;
        el.innerHTML = `<i class="fa-solid ${isRoot?'fa-database':'fa-folder'} ${isRoot?'text-black':'text-gray-300'} text-[10px]"></i><span class="truncate w-full tracking-wide">${displayName}</span>`;
        el.onclick = () => {
            this.selectedFolderHandle = handle;
            const currentLabel = document.getElementById('current-folder-label');
            if (currentLabel) currentLabel.innerText = displayName.split('/').pop();
            Array.from(container.children).forEach(c => c.classList.remove('bg-gray-100', 'text-black'));
            el.classList.add('bg-gray-100', 'text-black');
        };
        container.appendChild(el);
    },

    showInspector(ev) {
        const emptyView = document.getElementById('inspector-crono-empty');
        const contentView = document.getElementById('inspector-crono-content');
        if (emptyView) emptyView.classList.add('hidden');
        if (contentView) contentView.classList.remove('hidden');

        const inpTime = document.getElementById('crono-inp-time');
        const inpTitle = document.getElementById('crono-inp-title');
        if (inpTime) inpTime.value = ev.time;
        if (inpTitle) inpTitle.value = ev.description || "";

        this.renderMoments(ev);
    },

    hideInspector() {
        const contentView = document.getElementById('inspector-crono-content');
        const emptyView = document.getElementById('inspector-crono-empty');
        if (contentView) contentView.classList.add('hidden');
        if (emptyView) emptyView.classList.remove('hidden');
    },

    async migrateOldCronoBase64() {
        if (!window.mainCrono.data.events) return;
        let migratedCount = 0;
        this.toggleLoading(true, "MIGRACIÓN CRONO DE EMERGENCIA", "Extrayendo Base64 de la Escaleta a Archivos Binarios...");
        
        try {
            for (let ev of window.mainCrono.data.events) {
                if (!ev.moments) continue;
                for (let m of ev.moments) {
                    if (m.image64 && m.image64.startsWith('data:image')) {
                        const res = await fetch(m.image64);
                        const blob = await res.blob();
                        let ext = 'png';
                        if (blob.type === 'image/jpeg') ext = 'jpg';
                        if (blob.type === 'image/webp') ext = 'webp';
                        
                        const targetFilename = `crono_img_${ev.id}_${m.id}.${ext}`;
                        const imgHandle = await window.mainCrono.rootHandle.getFileHandle(targetFilename, { create: true });
                        const imgWritable = await imgHandle.createWritable();
                        await imgWritable.write(blob);
                        await imgWritable.close();
                        
                        m.imageFile = targetFilename;
                        m.image64 = null;
                        m.displayUrl = URL.createObjectURL(blob);
                        migratedCount++;
                    }
                }
            }
            if (migratedCount > 0) {
                window.mainCrono.saveData();
                window.timeline.renderEvents();
                const oldPurgeBtn = document.getElementById('btn-purge-crono-json');
                if (oldPurgeBtn) oldPurgeBtn.remove();
                alert(`¡Éxito! Se purgaron y extrajeron ${migratedCount} imágenes incrustadas del JSON.`);
            } else {
                alert("La escaleta de tiempo activa ya se encuentra limpia y optimizada.");
            }
        } catch (e) {
            console.error(e);
            alert("Error en la purga: " + e.message);
        } finally {
            this.toggleLoading(false);
        }
    },

    renderMoments(ev) {
        const list = document.getElementById('crono-moments-list');
        if (!list) return;
        list.innerHTML = '';
        const moments = ev.moments || [];
        
        let hasInlinedImages = moments.some(m => m.image64 && m.image64.startsWith('data:image'));
        if (hasInlinedImages && !document.getElementById('btn-purge-crono-json')) {
            const purgeBtn = document.createElement('button');
            purgeBtn.id = 'btn-purge-crono-json';
            purgeBtn.className = "w-full text-center bg-amber-500 text-white font-bold text-[10px] py-2 mb-4 tracking-wider hover:bg-amber-600 transition-colors";
            purgeBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> DEPURAR BASE64 DEL JSON DE LA CRONOLOGÍA';
            purgeBtn.onclick = () => this.migrateOldCronoBase64();
            list.parentNode.insertBefore(purgeBtn, list);
        }
        
        moments.forEach((m, idx) => {
            if (!m.aspectRatio) m.aspectRatio = 'landscape';
            const safeId = String(m.id).replace('.', '-');
            const row = document.createElement('div');
            row.className = "p-3 border bg-white space-y-3 mb-4 shadow-sm rounded-sm flex flex-col";
            
            const srcTarget = m.displayUrl || m.image64 || '';
            let imgPreviewHtml = '';
            
            if (srcTarget) {
                const aspectClass = m.aspectRatio === 'portrait' ? 'aspect-[9/16]' : 'aspect-video';
                imgPreviewHtml = `
                    <div class="w-full ${aspectClass} bg-gray-100 border border-gray-100 overflow-hidden rounded-sm group relative cursor-zoom-in shadow-inner" 
                         onclick="if(window.ui && ui.zoomImage) ui.zoomImage('${srcTarget}')">
                        <img src="${srcTarget}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                             <i class="fa-solid fa-expand text-white opacity-0 group-hover:opacity-100 transition-opacity"></i>
                        </div>
                    </div>
                `;
            } else {
                imgPreviewHtml = `
                    <div class="w-full h-16 bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center rounded-sm text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors" onclick="document.getElementById('file-upload-${safeId}').click()">
                        <i class="fa-regular fa-image text-sm mb-1"></i>
                        <span class="text-[8px] uppercase tracking-widest font-bold">Añadir Ilustración</span>
                    </div>
                `;
            }

            row.innerHTML = `
                <div class="flex justify-between text-[10px] text-gray-400 font-bold">
                    <span>SUBPARTE ${idx+1}</span>
                    <button class="text-red-400 font-mono hover:text-red-600 transition-colors" id="btn-del-moment-${safeId}">ELIMINAR</button>
                </div>
                ${imgPreviewHtml}
                <input type="file" id="file-upload-${safeId}" class="hidden" accept="image/*">
                <textarea class="config-input text-xs font-sans w-full bg-gray-50 p-2 border border-gray-100 focus:bg-white" id="txt-desc-${safeId}" placeholder="Descripción de la acción...">${m.text || ''}</textarea>
                <div class="space-y-1">
                    <span class="label-text text-[8px] text-purple-400">PROMPT VISUAL</span>
                    <textarea class="config-input text-[10px] font-mono text-purple-700 bg-purple-50/40 p-2 border border-purple-100 focus:bg-white" id="txt-prompt-${safeId}" placeholder="Prompt visual...">${m.visualPrompt || ''}</textarea>
                </div>
                <div class="flex gap-2 items-center pt-1 border-t border-gray-50 mt-2">
                    <button id="btn-gen-${safeId}" class="bg-purple-600 hover:bg-purple-700 text-white text-[9px] px-3 py-1.5 uppercase font-bold transition-colors rounded-sm flex items-center gap-2">
                        <i class="fa-solid fa-paintbrush"></i> PINTAR
                    </button>
                    <button id="btn-rewrite-${safeId}" class="bg-blue-500 hover:bg-blue-600 text-white text-[9px] px-3 py-1.5 uppercase font-bold transition-colors rounded-sm flex items-center gap-2" title="Reescribir Prompt con IA">
                        <i class="fa-solid fa-wand-sparkles"></i>
                    </button>
                    <select id="sel-aspect-${safeId}" class="text-[9px] border border-gray-200 p-1 rounded-sm bg-white cursor-pointer ml-auto">
                        <option value="landscape" ${m.aspectRatio==='landscape'?'selected':''}>16:9</option>
                        <option value="portrait" ${m.aspectRatio==='portrait'?'selected':''}>9:16</option>
                    </select>
                </div>
            `;

            if (m.imageFile && !m.displayUrl) {
                window.mainCrono.rootHandle.getFileHandle(m.imageFile)
                    .then(h => h.getFile())
                    .then(file => {
                        m.displayUrl = URL.createObjectURL(file);
                        this.renderMoments(ev);
                        window.timeline.renderEvents();
                    }).catch(err => console.warn("Binario no encontrado para:", m.imageFile));
            }

            row.querySelector(`#txt-desc-${safeId}`).onchange = (e) => { m.text = e.target.value; window.mainCrono.saveData(); };
            row.querySelector(`#txt-prompt-${safeId}`).onchange = (e) => { m.visualPrompt = e.target.value; window.mainCrono.saveData(); };
            row.querySelector(`#btn-del-moment-${safeId}`).onclick = () => window.mainCrono.deleteMoment(idx);
            
            // ASIGNACIÓN ABSOLUTA EN VENTANA GLOBAL PARA EVITAR ERRORES DE SCOPE
            row.querySelector(`#btn-gen-${safeId}`).onclick = () => {
                if (window.ImgGen && typeof window.ImgGen.generateSingle === 'function') {
                    window.ImgGen.generateSingle(ev.id, m.id);
                } else {
                    console.error("Error crítico: window.ImgGen no está disponible o inicializado.");
                }
            };

            row.querySelector(`#btn-rewrite-${safeId}`).onclick = () => {
                if (window.mainCrono && typeof window.mainCrono.rewritePrompt === 'function') {
                    window.mainCrono.rewritePrompt(ev.id, m.id);
                } else {
                    console.error("Error crítico: window.mainCrono.rewritePrompt no disponible.");
                }
            };
            
            row.querySelector(`#sel-aspect-${safeId}`).onchange = (e) => {
                m.aspectRatio = e.target.value;
                window.mainCrono.saveData();
                window.timeline.renderEvents();
                this.renderMoments(ev);
            };

            const fUpload = row.querySelector(`#file-upload-${safeId}`);
            if (fUpload) {
                fUpload.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const ext = file.name.split('.').pop() || 'png';
                    const targetFilename = `crono_img_${ev.id}_${m.id}.${ext}`;
                    
                    if (m.imageFile) {
                        try { await window.mainCrono.rootHandle.removeEntry(m.imageFile); } catch(err){}
                    }
                    const imgHandle = await window.mainCrono.rootHandle.getFileHandle(targetFilename, { create: true });
                    const imgWritable = await imgHandle.createWritable();
                    await imgWritable.write(file);
                    await imgWritable.close();
                    
                    m.imageFile = targetFilename;
                    m.image64 = null;
                    m.displayUrl = URL.createObjectURL(file);
                    
                    window.mainCrono.saveData();
                    window.timeline.renderEvents();
                    this.renderMoments(ev);
                };
            }

            list.appendChild(row);
        });
    }
};

window.uiCrono = uiCrono;
document.addEventListener('DOMContentLoaded', () => { if(window.uiCrono) window.uiCrono.init(); });