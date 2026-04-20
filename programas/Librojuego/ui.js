// Archivo: Librojuego/ui.js

/**
 * Controlador de la Interfaz de Usuario
 */
const UI = {
    switchView(view) {
        document.getElementById('view-editor').classList.add('hidden');
        document.getElementById('view-player').classList.add('hidden');
        
        document.getElementById('btn-tab-editor').className = "text-xs font-bold text-gray-400 pb-1 border-b-2 border-transparent hover:text-white transition-colors";
        document.getElementById('btn-tab-player').className = "text-xs font-bold text-gray-400 pb-1 border-b-2 border-transparent hover:text-white transition-colors";

        document.getElementById(`view-${view}`).classList.remove('hidden');
        document.getElementById(`btn-tab-${view}`).className = "text-xs font-bold text-indigo-400 pb-1 border-b-2 border-indigo-400 transition-colors";

        if (view === 'player') {
            Core.startGame();
        } else {
            this.renderNodeList();
        }
    },

    switchTab(tab) {
        document.getElementById('panel-canvas').classList.add('hidden');
        document.getElementById('panel-ai').classList.add('hidden');
        if(document.getElementById('panel-visual')) document.getElementById('panel-visual').classList.add('hidden');
        if(document.getElementById('panel-audio')) document.getElementById('panel-audio').classList.add('hidden');
        if(document.getElementById('panel-video')) document.getElementById('panel-video').classList.add('hidden');
        
        document.getElementById('tab-btn-canvas').className = "text-[11px] font-bold text-gray-400 hover:text-black transition-colors";
        document.getElementById('tab-btn-ai').className = "text-[11px] font-bold text-gray-400 hover:text-black transition-colors";
        if(document.getElementById('tab-btn-visual')) document.getElementById('tab-btn-visual').className = "text-[11px] font-bold text-gray-400 hover:text-black transition-colors";
        if(document.getElementById('tab-btn-audio')) document.getElementById('tab-btn-audio').className = "text-[11px] font-bold text-gray-400 hover:text-black transition-colors";
        if(document.getElementById('tab-btn-video')) document.getElementById('tab-btn-video').className = "text-[11px] font-bold text-gray-400 hover:text-black transition-colors";

        document.getElementById(`panel-${tab}`).classList.remove('hidden');
        document.getElementById(`tab-btn-${tab}`).className = "text-[11px] font-bold text-black transition-colors";
    },

    toggleFolderModal() {
        const modal = document.getElementById('folder-modal');
        modal.classList.toggle('hidden');
        if(!modal.classList.contains('hidden')) {
            modal.classList.add('flex');
            if(Core.scanRoot) Core.scanRoot();
        } else {
            modal.classList.remove('flex');
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

            // Inyectar contenedor de barras dobles dinámicamente si no existe
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
    },

    /* --- VISTA: EDITOR --- */
    renderNodeList() {
        const container = document.getElementById('nodes-list');
        if(!container) return;
        container.innerHTML = '';
        
        if(document.getElementById('manual-title')) {
            document.getElementById('manual-title').value = Core.bookData.title;
        }

        Core.bookData.nodes.forEach(node => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-white border border-gray-200 p-2 rounded text-xs";
            
            const truncText = node.text ? node.text.substring(0, 30) + "..." : "Sin texto";
            
            const isStart = node.isStartNode || (!Core.bookData.nodes.find(n => n.isStartNode) && Core.bookData.nodes[0].id === node.id);
            const scoreLabel = node.scoreImpact ? `<span class="text-blue-500 font-bold ml-2">[Score: ${node.scoreImpact > 0 ? '+' : ''}${node.scoreImpact}]</span>` : '';
            
            div.innerHTML = `
                <div class="flex-1 overflow-hidden cursor-pointer" onclick="UI.openNodeModal('${node.id}')">
                    <div class="font-bold text-indigo-900 truncate">
                        ${isStart ? '<i class="fa-solid fa-flag text-green-500 mr-1" title="Nodo Inicial"></i>' : ''}
                        ${node.id} <span class="text-gray-400 font-normal">(${node.choices.length} opciones)</span>
                        ${scoreLabel}
                    </div>
                    <div class="text-gray-500 truncate mt-1">${truncText}</div>
                </div>
                <button onclick="Core.deleteNode('${node.id}')" class="text-gray-300 hover:text-red-500 ml-2 px-2"><i class="fa-solid fa-trash"></i></button>
            `;
            container.appendChild(div);
        });
    },

    openNodeModal(id) {
        const node = Core.getNode(id);
        if (!node) return;

        document.getElementById('edit-node-id').value = node.id;
        document.getElementById('edit-node-idname').value = node.id;
        document.getElementById('edit-node-text').value = node.text;
        
        let scoreInput = document.getElementById('edit-node-score');
        if (!scoreInput) {
            const textContainer = document.getElementById('edit-node-text').parentElement;
            textContainer.insertAdjacentHTML('beforeend', `
                <div class="mt-2">
                    <label class="text-xs font-bold text-gray-700">Impacto en Puntuación:</label>
                    <input type="number" id="edit-node-score" class="w-full text-xs p-1 rounded border border-gray-300 mt-1" placeholder="Ej: 10 o -5">
                </div>
            `);
            scoreInput = document.getElementById('edit-node-score');
        }
        scoreInput.value = node.scoreImpact || 0;
        
        const choicesContainer = document.getElementById('edit-node-choices');
        choicesContainer.innerHTML = '';
        
        node.choices.forEach(c => this.appendChoiceEditor(c.text, c.targetId));

        document.getElementById('node-modal').classList.remove('hidden');
    },

    closeNodeModal() {
        document.getElementById('node-modal').classList.add('hidden');
    },

    appendChoiceEditor(text = "", targetId = "") {
        const container = document.getElementById('edit-node-choices');
        const div = document.createElement('div');
        div.className = "flex gap-2 items-center bg-gray-50 p-2 rounded border border-gray-200 choice-row";
        
        let optionsHtml = '<option value="">Selecciona destino...</option>';
        Core.bookData.nodes.forEach(n => {
            optionsHtml += `<option value="${n.id}" ${n.id === targetId ? 'selected' : ''}>${n.id}</option>`;
        });

        div.innerHTML = `
            <div class="flex-1 space-y-1">
                <input type="text" placeholder="Texto del botón (Ej: Abrir la puerta)" class="w-full text-xs p-1 rounded border border-gray-300 choice-text" value="${text}">
                <select class="w-full text-xs p-1 rounded border border-gray-300 choice-target text-indigo-700 font-bold">
                    ${optionsHtml}
                </select>
            </div>
            <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-red-500 p-2"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(div);
    },

    addChoiceToEditor() {
        this.appendChoiceEditor();
    },

    saveNodeModal() {
        const id = document.getElementById('edit-node-id').value;
        const text = document.getElementById('edit-node-text').value;
        const scoreImpact = parseInt(document.getElementById('edit-node-score').value) || 0;
        
        const choiceRows = document.querySelectorAll('.choice-row');
        const choices = [];
        
        choiceRows.forEach(row => {
            const cText = row.querySelector('.choice-text').value;
            const cTarget = row.querySelector('.choice-target').value;
            if (cText && cTarget) {
                choices.push({ text: cText, targetId: cTarget });
            }
        });

        Core.updateNode(id, text, choices, scoreImpact);
        this.closeNodeModal();
        this.renderNodeList();
    },

    /* --- VISTA: JUGADOR --- */
    renderPlayer() {
        if (!Core.currentNodeId) return;
        const node = Core.getNode(Core.currentNodeId);
        if (!node) return;

        let hudContainer = document.getElementById('player-hud');
        if (!hudContainer) {
            const titleElement = document.getElementById('player-title');
            titleElement.insertAdjacentHTML('afterend', `<div id="player-hud" class="text-sm font-bold text-blue-400 mb-4 bg-gray-900 p-2 rounded text-center"></div>`);
            hudContainer = document.getElementById('player-hud');
        }

        const isEndNode = (!node.choices || node.choices.length === 0);

        if (isEndNode) {
            const finalScore = Math.max(0, Math.min(100, Core.currentScore));
            hudContainer.innerHTML = `<span class="text-yellow-400 text-lg">CALIFICACIÓN FINAL: ${finalScore} / 100</span>`;
        } else {
            hudContainer.innerHTML = `Puntuación Actual: <span class="text-white">${Core.currentScore}</span>`;
        }

        document.getElementById('player-title').innerText = Core.bookData.title;
        
        const formattedText = node.text.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
        document.getElementById('player-text').innerHTML = formattedText;

        const choicesContainer = document.getElementById('player-choices');
        choicesContainer.innerHTML = '';

        if (!isEndNode) {
            node.choices.forEach(c => {
                const btn = document.createElement('button');
                btn.className = "choice-btn";
                btn.innerHTML = `<span>${c.text}</span> <i class="fa-solid fa-chevron-right"></i>`;
                btn.onclick = () => Core.makeChoice(c.targetId);
                choicesContainer.appendChild(btn);
            });
        } else {
            const btn = document.createElement('button');
            btn.className = "choice-btn justify-center bg-gray-900 text-white border-none";
            btn.innerHTML = `<span>FIN (Volver al inicio)</span> <i class="fa-solid fa-rotate-left ml-2"></i>`;
            btn.onclick = () => Core.startGame();
            choicesContainer.appendChild(btn);
        }

        const scrollArea = document.getElementById('player-scroll');
        if (scrollArea) scrollArea.scrollTop = 0;
    }
};