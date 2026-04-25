// Archivo: Librojuego/ui.views.js

window.UI = window.UI || {};

Object.assign(window.UI, {
    switchTab(tab) {
        const panels = ['project', 'items', 'canvas', 'ai', 'canon', 'visual', 'audio', 'video'];
        
        panels.forEach(p => {
            const panelEl = document.getElementById(`panel-${p}`);
            const btnEl = document.getElementById(`tab-btn-${p}`);
            if (panelEl) panelEl.classList.add('hidden');
            if (btnEl) btnEl.className = "text-[11px] font-bold text-gray-400 hover:text-black transition-colors";
        });

        const activePanel = document.getElementById(`panel-${tab}`);
        const activeBtn = document.getElementById(`tab-btn-${tab}`);
        
        if (activePanel) activePanel.classList.remove('hidden');
        if (activeBtn) activeBtn.className = "text-[11px] font-bold text-black transition-colors";
    },

    toggleBottomBar() {
        const bar = document.getElementById('bottom-bar');
        const btnIcon = document.querySelector('#btn-toggle-bottom-bar i');
        
        if (bar.classList.contains('collapsed')) {
            bar.classList.remove('collapsed');
            if(btnIcon) {
                btnIcon.classList.remove('fa-chevron-up');
                btnIcon.classList.add('fa-chevron-down');
            }
        } else {
            bar.classList.add('collapsed');
            if(btnIcon) {
                btnIcon.classList.remove('fa-chevron-down');
                btnIcon.classList.add('fa-chevron-up');
            }
        }
        
        // Repintar edges del canvas tras la animación para ajustar las líneas
        setTimeout(() => {
            if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
        }, 310);
    },

    toggleFolderModal() {
        // Usamos el acceso directo de almacenamiento sin desplegar el modal viejo
        if (Core.selectProjectFolder) {
            Core.selectProjectFolder();
        }
    },

    setLoading(isLoading, msg = "Cargando...", totalPct = null, subMsg = "", subPct = null) {
        const overlay = document.getElementById('loading-overlay');
        const msgEl = document.getElementById('loading-msg');
        
        if (!overlay) return;

        if (isLoading) {
            overlay.classList.remove('hidden');
            overlay.classList.add('flex', 'flex-col', 'items-center', 'justify-center');
            
            if (msgEl && msg) msgEl.innerText = msg;

            let progressContainer = document.getElementById('koreh-progress-bars');
            if (!progressContainer) {
                progressContainer = document.createElement('div');
                progressContainer.id = 'koreh-progress-bars';
                progressContainer.className = 'w-full max-w-md mt-6 flex flex-col gap-4 px-4';
                progressContainer.innerHTML = `
                    <div class="flex flex-col gap-1 w-full">
                        <div class="flex justify-between text-sm text-white font-bold w-full">
                            <span id="kp-total-msg" class="truncate pr-2 w-3/4">Progreso Total</span>
                            <span id="kp-total-val" class="w-1/4 text-right">0%</span>
                        </div>
                        <div class="w-full bg-gray-800 rounded-full h-3 border border-gray-600 shadow-inner overflow-hidden">
                            <div id="kp-total-bar" class="bg-gradient-to-r from-indigo-600 to-purple-500 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 w-full">
                        <div class="flex justify-between text-xs text-gray-300 w-full">
                            <span id="kp-sub-msg" class="truncate pr-2 w-3/4">Subproceso</span>
                            <span id="kp-sub-val" class="w-1/4 text-right">0%</span>
                        </div>
                        <div class="w-full bg-gray-800 rounded-full h-2 shadow-inner overflow-hidden">
                            <div id="kp-sub-bar" class="bg-gradient-to-r from-blue-400 to-cyan-300 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                `;
                overlay.appendChild(progressContainer);
            }

            progressContainer.classList.remove('hidden');

            if (totalPct !== null) {
                document.getElementById('kp-total-msg').innerText = msg;
                document.getElementById('kp-total-val').innerText = Math.round(totalPct) + '%';
                document.getElementById('kp-total-bar').style.width = Math.round(totalPct) + '%';
            }
            if (subPct !== null) {
                document.getElementById('kp-sub-msg').innerText = subMsg;
                document.getElementById('kp-sub-val').innerText = Math.round(subPct) + '%';
                document.getElementById('kp-sub-bar').style.width = Math.round(subPct) + '%';
            }
        } else {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            const pc = document.getElementById('koreh-progress-bars');
            if (pc) pc.classList.add('hidden');
        }
    }
});