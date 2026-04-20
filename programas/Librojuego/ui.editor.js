// Archivo: Librojuego/ui.editor.js

const Editor = {
    loadNode(id) {
        const node = Core.getNode(id);
        if (!node) return this.hide();

        document.getElementById('node-empty-state').classList.add('hidden');
        const editor = document.getElementById('node-editor');
        editor.classList.remove('hidden');
        setTimeout(() => editor.classList.remove('opacity-0'), 10);

        document.getElementById('edit-node-id').value = node.id;
        document.getElementById('edit-node-text').value = node.text;

        let scoreInput = document.getElementById('edit-node-score-view');
        if (!scoreInput) {
            const textArea = document.getElementById('edit-node-text');
            textArea.insertAdjacentHTML('beforebegin', `
                <div class="mb-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Impacto de Score (+/-)</label>
                    <input type="number" id="edit-node-score-view" class="liquid-input text-xs py-2 px-3 bg-[#f3f4f6] w-full mt-1" oninput="Editor.saveCurrent()">
                </div>
            `);
            scoreInput = document.getElementById('edit-node-score-view');
        }
        scoreInput.value = node.scoreImpact || 0;

        let nodeEffContainer = document.getElementById('edit-node-effect-container');
        if (!nodeEffContainer) {
            document.getElementById('edit-node-score-view').parentElement.insertAdjacentHTML('afterend', `<div id="edit-node-effect-container"></div>`);
            nodeEffContainer = document.getElementById('edit-node-effect-container');
        }

        const effTypeNode = node.eff?.type || '';
        const effOpNode = node.eff?.op || '';
        const effValNode = node.eff?.val || '';
        const globalItems = Core.book?.gameItems || Core.bookData?.gameItems || [];

        let effValNodeInput = `<input type="number" class="node-eff-val liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white" placeholder="Valor" value="${effValNode}" oninput="Editor.saveCurrent()">`;
        let deathTargetNodeInput = '';
        if (effTypeNode === 'item') {
            effValNodeInput = `<select class="node-eff-val liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white" onchange="Editor.saveCurrent()"><option value="" disabled ${!effValNode ? 'selected' : ''}>Objeto...</option>${globalItems.map(i => `<option value="${i}" ${i === effValNode ? 'selected' : ''}>${i}</option>`).join('')}</select>`;
        }
        if (effTypeNode === 'vida' && effOpNode === '-') {
            const dt = node.eff?.deathTarget || '';
            const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
            let opts = '<option value="">Si muere (0 Vida), ir a...</option>';
            allNodes.forEach(n => { opts += `<option value="${n.id}" ${n.id === dt ? 'selected' : ''}>${n.id}</option>`; });
            deathTargetNodeInput = `<select class="node-eff-death liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-red-50 text-red-700" onchange="Editor.saveCurrent()">${opts}</select>`;
        }

        nodeEffContainer.innerHTML = `
            <div class="mb-4 border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden">
                <div class="bg-blue-100/50 text-blue-700 text-[9px] font-bold p-1.5 px-3 uppercase tracking-wider flex items-center gap-1">
                    <i class="fa-solid fa-bolt"></i> Efecto del Nodo (Al llegar)
                </div>
                <div class="p-2 flex gap-1 items-center flex-wrap">
                    <select class="node-eff-type liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white text-gray-700" onchange="Editor.saveCurrent(); Editor.loadNode(Core.selectedNodeId);">
                        <option value="">Sin efecto</option>
                        <option value="vida" ${effTypeNode==='vida'?'selected':''}>Vida</option>
                        <option value="poder" ${effTypeNode==='poder'?'selected':''}>Poder</option>
                        <option value="item" ${effTypeNode==='item'?'selected':''}>Inventario</option>
                    </select>
                    <select class="node-eff-op liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white ${effTypeNode ? '' : 'hidden'}" onchange="Editor.saveCurrent(); Editor.loadNode(Core.selectedNodeId);">
                        ${effTypeNode === 'item' ? 
                            `<option value="ADD" ${effOpNode==='ADD'?'selected':''}>Añadir</option>
                             <option value="REM" ${effOpNode==='REM'?'selected':''}>Quitar</option>`
                        :
                            `<option value="+" ${effOpNode==='+'?'selected':''}>Sumar (+)</option>
                             <option value="-" ${effOpNode==='-'?'selected':''}>Restar (-)</option>`
                        }
                    </select>
                    ${effTypeNode ? effValNodeInput : ''}
                    ${deathTargetNodeInput}
                </div>
            </div>
        `;

        let visualTools = document.getElementById('edit-node-visual-tools');
        if (!visualTools) {
            document.getElementById('edit-choices-list').parentElement.insertAdjacentHTML('beforebegin', `
                <div id="edit-node-visual-tools" class="mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Arte del Nodo</span>
                        <div class="flex gap-2">
                            <button onclick="window.VisualEngine.triggerUpload(Core.selectedNodeId)" class="text-gray-400 hover:text-black transition-colors" title="Subir imagen desde PC">
                                <i class="fa-solid fa-upload"></i>
                            </button>
                            <button id="btn-delete-node-img" onclick="window.VisualEngine.deleteImage(Core.selectedNodeId)" class="text-gray-400 hover:text-red-500 transition-colors hidden" title="Borrar imagen actual">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div id="edit-node-img-preview" class="hidden w-full h-32 bg-cover bg-center rounded-lg mb-3 border border-gray-200"></div>
                    <button id="btn-illustrate-node" onclick="window.VisualEngine.illustrateNode(Core.selectedNodeId)" class="liquid-btn-primary w-full text-[10px] py-2 flex items-center justify-center gap-2">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> ILUSTRAR ESCENA (FLUX)
                    </button>
                    <button id="btn-illustrate-node-collage" onclick="window.VisualEngine.illustrateNodeCollage(Core.selectedNodeId)" class="liquid-btn-secondary w-full text-[10px] py-2 flex items-center justify-center gap-2 mt-2">
                        <i class="fa-solid fa-shapes"></i> COLLAGE KOREH
                    </button>
                    <input type="file" id="hidden-file-input" accept="image/*" class="hidden" onchange="window.VisualEngine.handleFileUpload(event)">
                </div>
            `);
            visualTools = document.getElementById('edit-node-visual-tools');
        }

        let audioTools = document.getElementById('edit-node-audio-tools');
        if (!audioTools) {
            document.getElementById('edit-choices-list').parentElement.insertAdjacentHTML('beforebegin', `
                <div id="edit-node-audio-tools" class="mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Locución del Nodo</span>
                        <button id="btn-delete-node-audio" onclick="window.AudioEngine.deleteAudio(Core.selectedNodeId)" class="text-gray-400 hover:text-red-500 transition-colors hidden" title="Borrar audio actual">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    <audio id="edit-node-audio-preview" controls class="w-full hidden mb-3 h-8"></audio>
                    <button id="btn-generate-node-audio" onclick="window.AudioEngine.generateNodeAudio(Core.selectedNodeId)" class="liquid-btn-primary w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-2 flex items-center justify-center gap-2 shadow-sm">
                        <i class="fa-solid fa-microphone"></i> GENERAR VOZ (TTS)
                    </button>
                </div>
            `);
            audioTools = document.getElementById('edit-node-audio-tools');
        }

        const preview = document.getElementById('edit-node-img-preview');
        const deleteBtn = document.getElementById('btn-delete-node-img');
        const illBtn = document.getElementById('btn-illustrate-node');
        const illCollageBtn = document.getElementById('btn-illustrate-node-collage');
        
        if (node._cachedImageUrl) {
            preview.style.backgroundImage = `url('${node._cachedImageUrl}')`;
            preview.classList.remove('hidden');
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
            preview.style.backgroundImage = 'none';
            if (deleteBtn) deleteBtn.classList.add('hidden');
        }

        if (illBtn) {
            if (window.VisualEngine.generatingNodes && window.VisualEngine.generatingNodes.has(node.id)) {
                illBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> GENERANDO...`;
                illBtn.disabled = true;
                illBtn.classList.add('opacity-50', 'cursor-not-allowed');
                if(illCollageBtn) {
                    illCollageBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ESPERA...`;
                    illCollageBtn.disabled = true;
                    illCollageBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            } else {
                illBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ILUSTRAR ESCENA (FLUX)`;
                illBtn.disabled = false;
                illBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                if(illCollageBtn) {
                    illCollageBtn.innerHTML = `<i class="fa-solid fa-shapes"></i> COLLAGE KOREH`;
                    illCollageBtn.disabled = false;
                    illCollageBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        }

        const audioPreview = document.getElementById('edit-node-audio-preview');
        const deleteAudioBtn = document.getElementById('btn-delete-node-audio');
        const genAudioBtn = document.getElementById('btn-generate-node-audio');
        
        if (node._cachedAudioUrl) {
            audioPreview.src = node._cachedAudioUrl;
            audioPreview.classList.remove('hidden');
            if (deleteAudioBtn) deleteAudioBtn.classList.remove('hidden');
        } else {
            audioPreview.classList.add('hidden');
            audioPreview.src = '';
            if (deleteAudioBtn) deleteAudioBtn.classList.add('hidden');
        }

        if (genAudioBtn) {
            if (window.AudioEngine.generatingNodes && window.AudioEngine.generatingNodes.has(node.id)) {
                genAudioBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> GENERANDO EN 2º PLANO...`;
                genAudioBtn.disabled = true;
                genAudioBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                genAudioBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> GENERAR VOZ (TTS)`;
                genAudioBtn.disabled = false;
                genAudioBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        this.renderChoices(node);
    },

    hide() {
        document.getElementById('node-editor').classList.add('opacity-0');
        setTimeout(() => {
            document.getElementById('node-editor').classList.add('hidden');
            document.getElementById('node-empty-state').classList.remove('hidden');
        }, 300);
    },

    renderChoices(node) {
        const list = document.getElementById('edit-choices-list');
        list.innerHTML = '';

        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.nodes) bookBase.nodes = [];
        if (!bookBase.gameItems) bookBase.gameItems = [];
        if (!bookBase.initialState) bookBase.initialState = { vida: 10, poder: 10, inventario: [] };

        let optionsHtml = '<option value="" disabled selected>Conectar con...</option>';
        bookBase.nodes.forEach(n => {
            optionsHtml += `<option value="${n.id}">${n.id}</option>`;
        });

        const items = bookBase.gameItems;

        node.choices.forEach((c, idx) => {
            const div = document.createElement('div');
            div.className = "flex flex-col gap-2 bg-[#ffffff] p-3 rounded-2xl choice-item-block border border-gray-100 shadow-sm";
            let selectHtml = optionsHtml.replace(`value="${c.targetId}"`, `value="${c.targetId}" selected`);

            const condType = c.cond?.type || '';
            const condOp = c.cond?.op || '';
            const condVal = c.cond?.val || '';

            const effType = c.eff?.type || '';
            const effOp = c.eff?.op || '';
            const effVal = c.eff?.val || '';
            const effDeath = c.eff?.deathTarget || '';

            let condValInput = `<input type="number" class="cond-val liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white" placeholder="Valor" value="${condVal}" oninput="Editor.saveCurrent()">`;
            if (condType === 'item') {
                condValInput = `<select class="cond-val liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white" onchange="Editor.saveCurrent()"><option value="" disabled ${!condVal ? 'selected' : ''}>Objeto...</option>${items.map(i => `<option value="${i}" ${i === condVal ? 'selected' : ''}>${i}</option>`).join('')}</select>`;
            }

            let effValInput = `<input type="number" class="eff-val liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white" placeholder="Valor" value="${effVal}" oninput="Editor.saveCurrent()">`;
            let effDeathInput = '';
            if (effType === 'item') {
                effValInput = `<select class="eff-val liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white" onchange="Editor.saveCurrent()"><option value="" disabled ${!effVal ? 'selected' : ''}>Objeto...</option>${items.map(i => `<option value="${i}" ${i === effVal ? 'selected' : ''}>${i}</option>`).join('')}</select>`;
            }
            if (effType === 'vida' && effOp === '-') {
                const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
                let opts = '<option value="">Si muere (0 Vida), ir a...</option>';
                allNodes.forEach(n => { opts += `<option value="${n.id}" ${n.id === effDeath ? 'selected' : ''}>${n.id}</option>`; });
                effDeathInput = `<select class="eff-death liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-red-50 text-red-700" onchange="Editor.saveCurrent()">${opts}</select>`;
            }

            div.innerHTML = `
                <div class="flex gap-2 items-center">
                    <input type="text" placeholder="Acción (Ej: Abrir puerta)" class="choice-text-input liquid-input text-xs py-2 px-3 bg-[#f3f4f6] font-bold text-indigo-900 border" value="${c.text || ''}" oninput="Editor.saveCurrent()">
                    <button onclick="Editor.removeChoice(${idx})" class="text-gray-400 hover:text-red-500 shrink-0 p-2"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-arrow-turn-down text-gray-300 ml-2"></i>
                    <select class="choice-target-select liquid-input text-xs py-2 px-3 bg-[#f3f4f6] font-bold w-full border" onchange="Editor.saveCurrent()">
                        ${selectHtml}
                    </select>
                </div>
                
                <div class="mt-2 flex flex-col gap-2">
                    <div class="border border-red-200 rounded-lg bg-red-50/30 overflow-hidden">
                        <div class="bg-red-100/50 text-red-700 text-[9px] font-bold p-1.5 px-3 uppercase tracking-wider flex items-center gap-1">
                            <i class="fa-solid fa-lock"></i> Condición de aparición
                        </div>
                        <div class="p-2 flex gap-1 items-center">
                            <select class="cond-type liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white text-gray-700" onchange="Editor.updateChoiceUI()">
                                <option value="">Siempre visible</option>
                                <option value="vida" ${condType==='vida'?'selected':''}>Vida</option>
                                <option value="poder" ${condType==='poder'?'selected':''}>Poder</option>
                                <option value="item" ${condType==='item'?'selected':''}>Inventario</option>
                            </select>
                            <select class="cond-op liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white ${condType ? '' : 'hidden'}" onchange="Editor.saveCurrent()">
                                ${condType === 'item' ? 
                                    `<option value="HAS" ${condOp==='HAS'?'selected':''}>Tiene</option>
                                     <option value="!HAS" ${condOp==='!HAS'?'selected':''}>No tiene</option>` 
                                : 
                                    `<option value=">" ${condOp==='>'?'selected':''}>Mayor que</option>
                                     <option value="<" ${condOp==='<'?'selected':''}>Menor que</option>
                                     <option value="==" ${condOp==='=='?'selected':''}>Igual a</option>`
                                }
                            </select>
                            ${condType ? condValInput : ''}
                        </div>
                    </div>

                    <div class="border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden">
                        <div class="bg-blue-100/50 text-blue-700 text-[9px] font-bold p-1.5 px-3 uppercase tracking-wider flex items-center gap-1">
                            <i class="fa-solid fa-bolt"></i> Efecto al seleccionar
                        </div>
                        <div class="p-2 flex gap-1 items-center flex-wrap">
                            <select class="eff-type liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white text-gray-700" onchange="Editor.updateChoiceUI()">
                                <option value="">Sin efecto</option>
                                <option value="vida" ${effType==='vida'?'selected':''}>Vida</option>
                                <option value="poder" ${effType==='poder'?'selected':''}>Poder</option>
                                <option value="item" ${effType==='item'?'selected':''}>Inventario</option>
                            </select>
                            <select class="eff-op liquid-input text-[10px] h-8 py-0 px-2 w-1/3 border bg-white ${effType ? '' : 'hidden'}" onchange="Editor.saveCurrent(); Editor.updateChoiceUI();">
                                ${effType === 'item' ? 
                                    `<option value="ADD" ${effOp==='ADD'?'selected':''}>Añadir</option>
                                     <option value="REM" ${effOp==='REM'?'selected':''}>Quitar</option>`
                                :
                                    `<option value="+" ${effOp==='+'?'selected':''}>Sumar (+)</option>
                                     <option value="-" ${effOp==='-'?'selected':''}>Restar (-)</option>`
                                }
                            </select>
                            ${effType ? effValInput : ''}
                            ${effDeathInput}
                        </div>
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
    },

    updateChoiceUI() {
        this.saveCurrent();
        const node = Core.getNode(Core.selectedNodeId);
        if (node) this.renderChoices(node);
    },

    addChoice() {
        const node = Core.getNode(Core.selectedNodeId);
        if (node) {
            node.choices.push({ text: "", targetId: "" });
            this.renderChoices(node);
            if(typeof Canvas !== 'undefined') Canvas.renderEdges();
            if(Core.scheduleSave) Core.scheduleSave();
        }
    },

    removeChoice(index) {
        const node = Core.getNode(Core.selectedNodeId);
        if (node) {
            node.choices.splice(index, 1);
            this.renderChoices(node);
            this.saveCurrent();
        }
    },

    saveCurrent() {
        const id = document.getElementById('edit-node-id').value;
        const node = Core.getNode(id);
        if (!node) return;

        node.text = document.getElementById('edit-node-text').value;
        const scoreInput = document.getElementById('edit-node-score-view');
        if(scoreInput) node.scoreImpact = parseInt(scoreInput.value) || 0;

        const nodeEffType = document.querySelector('.node-eff-type')?.value;
        const nodeEffOp = document.querySelector('.node-eff-op')?.value;
        const nodeEffVal = document.querySelector('.node-eff-val')?.value;
        const nodeEffDeath = document.querySelector('.node-eff-death')?.value;

        if (nodeEffType) {
            node.eff = {
                type: nodeEffType,
                op: nodeEffOp || (nodeEffType === 'item' ? 'ADD' : '+'),
                val: nodeEffVal || ''
            };
            if (nodeEffType === 'vida' && node.eff.op === '-' && nodeEffDeath) {
                node.eff.deathTarget = nodeEffDeath;
            }
        } else {
            delete node.eff;
        }

        const choiceDivs = document.getElementById('edit-choices-list').querySelectorAll('.choice-item-block');
        node.choices = [];
        
        choiceDivs.forEach(div => {
            const textInput = div.querySelector('.choice-text-input');
            const targetSelect = div.querySelector('.choice-target-select');
            
            const condType = div.querySelector('.cond-type').value;
            const condOp = div.querySelector('.cond-op')?.value;
            const condVal = div.querySelector('.cond-val')?.value;

            const effType = div.querySelector('.eff-type').value;
            const effOp = div.querySelector('.eff-op')?.value;
            const effVal = div.querySelector('.eff-val')?.value;
            const effDeath = div.querySelector('.eff-death')?.value;

            let choice = { 
                text: textInput ? textInput.value : "", 
                targetId: targetSelect ? targetSelect.value : "" 
            };
            
            if (condType) {
                choice.cond = { 
                    type: condType, 
                    op: condOp || (condType === 'item' ? 'HAS' : '>'), 
                    val: condVal || '' 
                };
            }
            if (effType) {
                choice.eff = { 
                    type: effType, 
                    op: effOp || (effType === 'item' ? 'ADD' : '+'), 
                    val: effVal || '' 
                };
                if (effType === 'vida' && choice.eff.op === '-' && effDeath) {
                    choice.eff.deathTarget = effDeath;
                }
            }
            
            node.choices.push(choice);
        });
        
        if (typeof Canvas !== 'undefined') {
            Canvas.renderNodes();
            Canvas.renderEdges();
        }
        if (Core.scheduleSave) Core.scheduleSave();
    }
};