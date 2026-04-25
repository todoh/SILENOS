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

        this.renderNodeEffects(node);

        let visualTools = document.getElementById('edit-node-visual-tools');
        if (!visualTools) {
            document.getElementById('edit-choices-list').parentElement.insertAdjacentHTML('beforebegin', `
                <div id="edit-node-visual-tools" style="display: flex; position: fixed; background: #FFFFFF40; top: 0px; left: 0px;" class="mb-4 gap-1 p-3 rounded-2xl border border-gray-100">
                    <div id="edit-node-img-preview" class="w-80 h-64 rounded-lg mb-3 bg-contain bg-center bg-no-repeat cursor-pointer hover:opacity-80 transition-opacity" style="background-image: url('tu-imagen.jpg');" onclick="Editor.toggleImageFullscreen()" title="Clic para ampliar imagen"></div>
                    <div class="flex gap-2">
                        <button onclick="window.VisualEngine.triggerUpload(Core.selectedNodeId)" class="text-gray-400 hover:text-black transition-colors" title="Subir imagen desde PC"><i class="fa-solid fa-upload"></i></button>
                        <button id="btn-delete-node-img" onclick="window.VisualEngine.deleteImage(Core.selectedNodeId)" class="text-gray-400 hover:text-red-500 transition-colors hidden" title="Borrar imagen actual"><i class="fa-solid fa-trash"></i></button>
                        <button id="btn-illustrate-node" onclick="window.VisualEngine.illustrateNode(Core.selectedNodeId)" class=" w-full text-[10px] py-2 flex items-center justify-center gap-2"><i class="fa-solid fa-wand-magic-sparkles"></i></button>
                    </div>
                    <input type="file" id="hidden-file-input" accept="image/*" class="hidden" onchange="window.VisualEngine.handleFileUpload(event)">
                </div>
            `);
        }

        let audioTools = document.getElementById('edit-node-audio-tools');
        if (!audioTools) {
            document.getElementById('edit-choices-list').parentElement.insertAdjacentHTML('beforebegin', `
                <div id="edit-node-audio-tools" class="mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Locución del Nodo</span>
                        <button id="btn-delete-node-audio" onclick="window.AudioEngine.deleteAudio(Core.selectedNodeId)" class="text-gray-400 hover:text-red-500 transition-colors hidden" title="Borrar audio actual"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    <audio id="edit-node-audio-preview" controls class="w-full hidden mb-3 h-8"></audio>
                    <button id="btn-generate-node-audio" onclick="window.AudioEngine.generateNodeAudio(Core.selectedNodeId)" class="liquid-btn-primary w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-2 flex items-center justify-center gap-2 shadow-sm">
                        <i class="fa-solid fa-microphone"></i> GENERAR VOZ (TTS)
                    </button>
                </div>
            `);
        }

        const preview = document.getElementById('edit-node-img-preview');
        const deleteBtn = document.getElementById('btn-delete-node-img');
        const illBtn = document.getElementById('btn-illustrate-node');
        
        if (node._cachedImageUrl) {
            if(preview) { preview.style.backgroundImage = `url('${node._cachedImageUrl}')`; preview.classList.remove('hidden'); }
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        } else {
            if(preview) { preview.classList.add('hidden'); preview.style.backgroundImage = 'none'; }
            if (deleteBtn) deleteBtn.classList.add('hidden');
        }

        if (illBtn) {
            if (window.VisualEngine.generatingNodes && window.VisualEngine.generatingNodes.has(node.id)) {
                illBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> GENERANDO...`;
                illBtn.disabled = true;
                illBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                illBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i>`;
                illBtn.disabled = false;
                illBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        const audioPreview = document.getElementById('edit-node-audio-preview');
        const deleteAudioBtn = document.getElementById('btn-delete-node-audio');
        const genAudioBtn = document.getElementById('btn-generate-node-audio');
        
        if (node._cachedAudioUrl) {
            if(audioPreview) { audioPreview.src = node._cachedAudioUrl; audioPreview.classList.remove('hidden'); }
            if (deleteAudioBtn) deleteAudioBtn.classList.remove('hidden');
        } else {
            if(audioPreview) { audioPreview.classList.add('hidden'); audioPreview.src = ''; }
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

        this.setupAutocomplete();
        this.renderChoices(node);
    },

    setupAutocomplete() {
        // Inicialización global única para atrapar todo evento de input
        if (!window._canonAutocompleteInitialized) {
            window._canonAutocompleteInitialized = true;
            
            document.body.addEventListener('input', (e) => {
                const target = e.target;
                if (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target.type === 'text')) {
                    Editor.handleAutocompleteInput(e, target);
                }
            });
            
            // Cierra el menú si se hace clic fuera del autocompletado
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#canon-autocomplete-dropdown')) {
                    Editor.hideAutocompleteDropdown();
                }
            });
        }
    },

    handleAutocompleteInput(e, targetInput) {
        try {
            const text = targetInput.value;
            const cursorPos = targetInput.selectionStart;
            if (cursorPos === null || cursorPos === undefined) return;

            // Extraer texto hasta el cursor y buscar si se está escribiendo una etiqueta @...
            const textBeforeCursor = text.substring(0, cursorPos);
            const match = textBeforeCursor.match(/@\S*$/);

            if (match) {
                const searchStr = match[0]; 
                const startIndex = match.index;
                const canonTags = this.getCanonTags();
                
                // Filtrar las etiquetas del Canon
                const filtered = canonTags.filter(t => t.toLowerCase().startsWith(searchStr.toLowerCase()));

                if (filtered.length > 0) {
                    this.showAutocompleteDropdown(filtered, targetInput, startIndex, searchStr.length);
                } else {
                    this.hideAutocompleteDropdown();
                }
            } else {
                this.hideAutocompleteDropdown();
            }
        } catch (err) {
            // Ignorar fallos en inputs especiales que no soporten selectionStart
        }
    },

    getCanonTags() {
        const bible = Core.book?.visualBible || Core.bookData?.visualBible || {};
        const tags = new Set();
        // Regex robusto: Atrapa cualquier @ seguido de letras, números, guiones bajos o tildes. Ignora si tiene o no dos puntos.
        const regex = /@[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g;
        Object.values(bible).forEach(text => {
            if (typeof text === 'string') {
                let m;
                while ((m = regex.exec(text)) !== null) {
                    tags.add(m[0]);
                }
            }
        });
        return Array.from(tags);
    },

    showAutocompleteDropdown(tags, targetInput, startIndex, searchLen) {
        let dropdown = document.getElementById('canon-autocomplete-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'canon-autocomplete-dropdown';
            dropdown.className = 'fixed bg-white border border-indigo-200 rounded-xl shadow-2xl z-[10000] max-h-48 overflow-y-auto flex flex-col text-xs font-bold';
            document.body.appendChild(dropdown);
        }

        dropdown.innerHTML = '';
        
        const header = document.createElement('div');
        header.className = 'px-3 py-2 bg-indigo-50 border-b border-indigo-100 text-[9px] uppercase tracking-widest text-indigo-700 font-bold sticky top-0';
        header.innerHTML = '<i class="fa-solid fa-book-journal-whills"></i> Elementos del Canon';
        dropdown.appendChild(header);

        tags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'px-3 py-2 text-left hover:bg-indigo-600 hover:text-white text-gray-700 transition-colors w-full cursor-pointer border-b border-gray-50';
            btn.innerText = tag;
            btn.onclick = (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                
                const val = targetInput.value;
                const before = val.substring(0, startIndex);
                const after = val.substring(startIndex + searchLen);
                
                targetInput.value = before + tag + ' ' + after;
                
                this.hideAutocompleteDropdown();
                targetInput.focus();
                targetInput.selectionStart = targetInput.selectionEnd = before.length + tag.length + 1;
                
                // Forzar el evento de actualización para que Editor.saveCurrent lo registre
                const inputEvent = new Event('input', { bubbles: true });
                targetInput.dispatchEvent(inputEvent);
                
                // Por si el evento era onchange
                const changeEvent = new Event('change', { bubbles: true });
                targetInput.dispatchEvent(changeEvent);
            };
            dropdown.appendChild(btn);
        });

        // Posicionar el menú exactamente debajo del Input/Textarea disparador
        const rect = targetInput.getBoundingClientRect();
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.top = `${rect.bottom + 5}px`;
        // Evitamos que quede muy estrecho
        dropdown.style.width = `${Math.max(rect.width, 200)}px`;
        dropdown.classList.remove('hidden');
    },

    hideAutocompleteDropdown() {
        const dropdown = document.getElementById('canon-autocomplete-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
    },

    toggleImageFullscreen() {
        const preview = document.getElementById('edit-node-img-preview');
        if (!preview || preview.classList.contains('hidden')) return;
        
        const bgImage = preview.style.backgroundImage;
        if (!bgImage || bgImage === 'none') return;

        let overlay = document.getElementById('fullscreen-img-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fullscreen-img-overlay';
            overlay.className = 'fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center cursor-zoom-out p-4 md:p-12 opacity-0 transition-opacity duration-300 backdrop-blur-sm';
            overlay.onclick = () => {
                overlay.classList.add('opacity-0');
                setTimeout(() => overlay.remove(), 300);
            };
            document.body.appendChild(overlay);
        }

        const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
        const imgUrl = urlMatch ? urlMatch[1] : '';

        overlay.innerHTML = `<img src="${imgUrl}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />`;
        
        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0');
        });
    },

    hide() {
        const ed = document.getElementById('node-editor');
        if(ed) ed.classList.add('opacity-0');
        setTimeout(() => {
            if(ed) ed.classList.add('hidden');
            const state = document.getElementById('node-empty-state');
            if(state) state.classList.remove('hidden');
        }, 300);
    },

    renderNodeEffects(node) {
        let container = document.getElementById('edit-node-effect-container');
        if(!container) return;
        let effs = node.effs || (node.eff ? [node.eff] : []);
        
        let html = `
        <div class="mb-4 border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden">
            <div class="bg-blue-100/50 text-blue-700 text-[9px] font-bold p-1.5 px-3 uppercase tracking-wider flex items-center justify-between">
                <span><i class="fa-solid fa-bolt"></i> Efectos del Nodo (Al llegar)</span>
                <button onclick="Editor.addNodeEffect()" class="text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded shadow-sm"><i class="fa-solid fa-plus"></i></button>
            </div>
            <div class="flex flex-col gap-2 p-2" id="node-effects-list">
        `;

        if (effs.length === 0) {
            html += `<div class="text-[10px] text-gray-400 text-center italic" id="empty-node-effs">Sin efectos adicionales</div>`;
        } else {
            effs.forEach((eff) => {
                html += this.generateEffectHTMLRow('node', eff);
            });
        }

        html += `</div></div>`;
        container.innerHTML = html;
    },

    addNodeEffect() {
        this.saveCurrent(); 
        const node = Core.getNode(Core.selectedNodeId);
        if(!node) return;
        if(!node.effs && node.eff) node.effs = [node.eff];
        if(!node.effs) node.effs = [];
        
        node.effs.push({ type: 'vida', op: '-', val: '1', qty: 1 });
        delete node.eff;
        
        this.renderNodeEffects(node);
        this.saveCurrent();
    },

    addChoiceEffect(choiceIdx) {
        this.saveCurrent(); 
        const node = Core.getNode(Core.selectedNodeId);
        if(!node || !node.choices[choiceIdx]) return;
        let choice = node.choices[choiceIdx];
        if(!choice.effs && choice.eff) choice.effs = [choice.eff];
        if(!choice.effs) choice.effs = [];
        
        choice.effs.push({ type: 'vida', op: '-', val: '1', qty: 1 });
        delete choice.eff;
        
        this.renderChoices(node);
        this.saveCurrent();
    },

    generateEffectHTMLRow(context, eff, choiceIdx = null) {
        const type = eff.type || '';
        const op = eff.op || '';
        const val = eff.val || '';
        const qty = eff.qty || 1;
        const dt = eff.deathTarget || '';
        
        const globalItems = Core.book?.gameItems || Core.bookData?.gameItems || [];
        const isChoice = context === 'choice';
        const prefixCls = isChoice ? `choice-eff` : `node-eff`;
        
        // Inputs ahora son text, compatibles con @ y variables textuales
        let valInput = `<input type="text" class="eff-val liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white" placeholder="Valor" value="${val}" onchange="Editor.saveCurrent()">`;
        let qtyInput = '';
        if (type === 'item') {
            valInput = `<select class="eff-val liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white" onchange="Editor.saveCurrent()"><option value="" disabled ${!val ? 'selected' : ''}>Objeto...</option>${globalItems.map(i => `<option value="${i}" ${i === val ? 'selected' : ''}>${i}</option>`).join('')}</select>`;
            qtyInput = `<input type="number" class="eff-qty liquid-input text-[10px] h-8 py-0 px-2 w-16 border bg-white" title="Cantidad" min="1" value="${qty}" onchange="Editor.saveCurrent()">`;
        }
        
        let moduleUI = '';
        let hideBasicInputs = false;

        if (type === 'module_combat') {
            hideBasicInputs = true;
            const eName = eff.enemyName || 'Orco';
            const sVida = eff.stats?.vida || 15;
            const sAtk = eff.stats?.ataque || 6;
            const sDef = eff.stats?.defensa || 3;
            const sAgi = eff.stats?.agilidad || 4;
            const sDes = eff.stats?.destreza || 4;
            const winT = eff.winTargetId || '';
            const loseT = eff.loseTargetId || '';

            const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
            let opts = '<option value="">Ninguno / Fin</option>';
            allNodes.forEach(n => { opts += `<option value="${n.id}">${n.id}</option>`; });

            moduleUI = `
            <div class="w-full mt-2 p-2 bg-red-50 border border-red-200 rounded text-[10px]">
                <div class="font-bold text-red-700 mb-1"><i class="fa-solid fa-khanda"></i> Stats del Enemigo</div>
                <input type="text" class="eff-enemy-name liquid-input text-[10px] h-6 py-0 px-2 w-full mb-1 border bg-white" placeholder="Nombre" value="${eName}" onchange="Editor.saveCurrent()">
                <div class="flex gap-1 mb-1 text-center">
                    <input type="number" class="eff-stat-hp liquid-input text-[10px] h-6 py-0 px-1 w-1/5 border bg-white text-red-600 font-bold" title="Vida (HP)" value="${sVida}" onchange="Editor.saveCurrent()">
                    <input type="number" class="eff-stat-atk liquid-input text-[10px] h-6 py-0 px-1 w-1/5 border bg-white text-orange-600 font-bold" title="Ataque (ATK)" value="${sAtk}" onchange="Editor.saveCurrent()">
                    <input type="number" class="eff-stat-def liquid-input text-[10px] h-6 py-0 px-1 w-1/5 border bg-white text-blue-600 font-bold" title="Defensa (DEF)" value="${sDef}" onchange="Editor.saveCurrent()">
                    <input type="number" class="eff-stat-agi liquid-input text-[10px] h-6 py-0 px-1 w-1/5 border bg-white text-green-600 font-bold" title="Agilidad (AGI)" value="${sAgi}" onchange="Editor.saveCurrent()">
                    <input type="number" class="eff-stat-des liquid-input text-[10px] h-6 py-0 px-1 w-1/5 border bg-white text-purple-600 font-bold" title="Destreza (DEX)" value="${sDes}" onchange="Editor.saveCurrent()">
                </div>
                <div class="flex gap-1 mt-2">
                    <div class="w-1/2">
                        <span class="text-green-600 font-bold block mb-1">Si Ganas ir a:</span>
                        <select class="eff-win-target liquid-input text-[10px] h-6 py-0 px-1 w-full border bg-white" onchange="Editor.saveCurrent()">${opts.replace(`value="${winT}"`, `value="${winT}" selected`)}</select>
                    </div>
                    <div class="w-1/2">
                        <span class="text-red-600 font-bold block mb-1">Si Mueres ir a:</span>
                        <select class="eff-lose-target liquid-input text-[10px] h-6 py-0 px-1 w-full border bg-white" onchange="Editor.saveCurrent()">${opts.replace(`value="${loseT}"`, `value="${loseT}" selected`)}</select>
                    </div>
                </div>
            </div>`;
        } else if (type === 'module_shop') {
            hideBasicInputs = true;
            const iName = eff.itemName || '';
            const iPrice = eff.itemPrice || 10;
            
            let itemOpts = '<option value="" disabled selected>Objeto a vender...</option>';
            globalItems.forEach(i => { itemOpts += `<option value="${i}" ${i===iName?'selected':''}>${i}</option>`; });

            moduleUI = `
            <div class="w-full mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px]">
                <div class="font-bold text-yellow-700 mb-1"><i class="fa-solid fa-coins"></i> Tienda (Requiere el objeto "Oro")</div>
                <div class="flex gap-1">
                    <select class="eff-shop-item liquid-input text-[10px] h-6 py-0 px-1 w-2/3 border bg-white" onchange="Editor.saveCurrent()">${itemOpts}</select>
                    <input type="number" class="eff-shop-price liquid-input text-[10px] h-6 py-0 px-1 w-1/3 border bg-white text-yellow-700 font-bold" title="Precio en Oro" placeholder="Precio" value="${iPrice}" onchange="Editor.saveCurrent()">
                </div>
            </div>`;
        }

        let dtInput = '';
        if (type === 'vida' && op === '-') {
            const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
            let opts = '<option value="">Si muere, ir a...</option>';
            allNodes.forEach(n => { opts += `<option value="${n.id}" ${n.id === dt ? 'selected' : ''}>${n.id}</option>`; });
            dtInput = `<select class="eff-death liquid-input text-[10px] h-8 py-0 px-2 w-full mt-1 border bg-red-50 text-red-700" onchange="Editor.saveCurrent()">${opts}</select>`;
        }

        return `
            <div class="${prefixCls}-item flex flex-col bg-white border border-gray-200 p-1.5 rounded relative">
                <button onclick="this.parentElement.remove(); Editor.saveAndReload();" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] hover:bg-red-700 z-10"><i class="fa-solid fa-xmark"></i></button>
                <div class="flex gap-1 items-center w-full">
                    <select class="eff-type liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white text-gray-700" onchange="Editor.saveAndReload()">
                        <option value="" class="font-bold">-- Básico --</option>
                        <option value="vida" ${type==='vida'?'selected':''}>Vida</option>
                        <option value="vidaMax" ${type==='vidaMax'?'selected':''}>Vida Máxima</option>
                        <option value="ataque" ${type==='ataque'?'selected':''}>Ataque</option>
                        <option value="defensa" ${type==='defensa'?'selected':''}>Defensa</option>
                        <option value="agilidad" ${type==='agilidad'?'selected':''}>Agilidad</option>
                        <option value="destreza" ${type==='destreza'?'selected':''}>Destreza</option>
                        <option value="item" ${type==='item'?'selected':''}>Objeto</option>
                        <option value="" disabled></option>
                        <option value="" class="font-bold">-- Módulos Avanzados --</option>
                        <option value="module_combat" ${type==='module_combat'?'selected':''}>⚔️ Combate Dinámico</option>
                        <option value="module_shop" ${type==='module_shop'?'selected':''}>💰 Tienda</option>
                    </select>
                    
                    ${!hideBasicInputs ? `
                    <select class="eff-op liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white ${!type ? 'hidden' : ''}" onchange="Editor.saveAndReload()">
                        ${type === 'item' ? 
                            `<option value="ADD" ${op==='ADD'?'selected':''}>Añadir</option>
                             <option value="REM" ${op==='REM'?'selected':''}>Quitar</option>`
                        :
                            `<option value="+" ${op==='+'?'selected':''}>Sumar</option>
                             <option value="-" ${op==='-'?'selected':''}>Restar</option>`
                        }
                    </select>
                    ${type ? valInput : ''}
                    ${qtyInput}
                    ` : ''}
                </div>
                ${dtInput}
                ${moduleUI}
            </div>
        `;
    },

    renderChoices(node) {
        const list = document.getElementById('edit-choices-list');
        if(!list) return;
        list.innerHTML = '';

        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.nodes) bookBase.nodes = [];
        if (!bookBase.gameItems) bookBase.gameItems = [];

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
            const condQty = c.cond?.qty || '';

            // Input en formato texto para que acepte variables y etiquetas @
            let condValInput = `<input type="text" class="cond-val liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white" placeholder="Valor" value="${condVal}" oninput="Editor.saveCurrent()">`;
            let condQtyInput = '';

            if (condType === 'item') {
                condValInput = `<select class="cond-val liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white" onchange="Editor.saveAndReload()"><option value="" disabled ${!condVal ? 'selected' : ''}>Objeto...</option>${items.map(i => `<option value="${i}" ${i === condVal ? 'selected' : ''}>${i}</option>`).join('')}</select>`;
                if (condOp === '>' || condOp === '<' || condOp === '==') {
                    condQtyInput = `<input type="text" class="cond-qty liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white" placeholder="Cant./Obj." value="${condQty}" oninput="Editor.saveCurrent()">`;
                }
            } else if (['vida', 'vidaMax', 'ataque', 'defensa', 'agilidad', 'destreza'].includes(condType)) {
                condValInput = `<input type="text" class="cond-val liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white" placeholder="Valor" value="${condVal}" oninput="Editor.saveCurrent()">`;
            }

            let effs = c.effs || (c.eff ? [c.eff] : []);
            let effsHtml = '';
            effs.forEach((eff) => {
                effsHtml += this.generateEffectHTMLRow('choice', eff, idx);
            });

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
                            <select class="cond-type liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white text-gray-700" onchange="Editor.saveAndReload()">
                                <option value="">Siempre visible</option>
                                <option value="vida" ${condType==='vida'?'selected':''}>Vida</option>
                                <option value="vidaMax" ${condType==='vidaMax'?'selected':''}>Vida Máxima</option>
                                <option value="ataque" ${condType==='ataque'?'selected':''}>Ataque</option>
                                <option value="defensa" ${condType==='defensa'?'selected':''}>Defensa</option>
                                <option value="agilidad" ${condType==='agilidad'?'selected':''}>Agilidad</option>
                                <option value="destreza" ${condType==='destreza'?'selected':''}>Destreza</option>
                                <option value="item" ${condType==='item'?'selected':''}>Inventario</option>
                            </select>
                            <select class="cond-op liquid-input text-[10px] h-8 py-0 px-2 flex-1 border bg-white ${condType ? '' : 'hidden'}" onchange="Editor.saveAndReload()">
                                ${condType === 'item' ? 
                                    `<option value="HAS" ${condOp==='HAS'?'selected':''}>Tiene</option>
                                     <option value="!HAS" ${condOp==='!HAS'?'selected':''}>No tiene</option>
                                     <option value=">" ${condOp==='>'?'selected':''}>Mayor que</option>
                                     <option value="<" ${condOp==='<'?'selected':''}>Menor que</option>
                                     <option value="==" ${condOp==='=='?'selected':''}>Igual a</option>` 
                                : 
                                    `<option value=">" ${condOp==='>'?'selected':''}>Mayor que</option>
                                     <option value="<" ${condOp==='<'?'selected':''}>Menor que</option>
                                     <option value="==" ${condOp==='=='?'selected':''}>Igual a</option>`
                                }
                            </select>
                            ${condType ? condValInput : ''}
                            ${condType === 'item' && (condOp === '>' || condOp === '<' || condOp === '==') ? condQtyInput : ''}
                        </div>
                    </div>

                    <div class="border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden">
                        <div class="bg-blue-100/50 text-blue-700 text-[9px] font-bold p-1.5 px-3 uppercase tracking-wider flex items-center justify-between">
                            <span><i class="fa-solid fa-bolt"></i> Múltiples Efectos al seleccionar</span>
                            <button onclick="Editor.addChoiceEffect(${idx})" class="text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded shadow-sm"><i class="fa-solid fa-plus"></i></button>
                        </div>
                        <div class="flex flex-col gap-2 p-2">
                            ${effs.length === 0 ? `<div class="text-[10px] text-gray-400 text-center italic">Sin efectos</div>` : effsHtml}
                        </div>
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
    },

    saveAndReload() {
        this.saveCurrent();
        if (Core.selectedNodeId) {
            this.loadNode(Core.selectedNodeId);
        }
    },

    addChoice() {
        this.saveCurrent(); 
        const node = Core.getNode(Core.selectedNodeId);
        if (node) {
            node.choices.push({ text: "", targetId: "", effs: [] });
            this.renderChoices(node);
            this.saveCurrent();
            if(typeof Canvas !== 'undefined') Canvas.renderEdges();
        }
    },

    removeChoice(index) {
        this.saveCurrent();
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

        const extractEffectData = (eDiv, eType) => {
            let eff = { type: eType };
            
            if (eType === 'module_combat') {
                eff.enemyName = eDiv.querySelector('.eff-enemy-name')?.value || 'Enemigo';
                eff.stats = {
                    vida: parseInt(eDiv.querySelector('.eff-stat-hp')?.value) || 10,
                    ataque: parseInt(eDiv.querySelector('.eff-stat-atk')?.value) || 5,
                    defensa: parseInt(eDiv.querySelector('.eff-stat-def')?.value) || 2,
                    agilidad: parseInt(eDiv.querySelector('.eff-stat-agi')?.value) || 3,
                    destreza: parseInt(eDiv.querySelector('.eff-stat-des')?.value) || 3
                };
                eff.winTargetId = eDiv.querySelector('.eff-win-target')?.value || '';
                eff.loseTargetId = eDiv.querySelector('.eff-lose-target')?.value || '';
            } else if (eType === 'module_shop') {
                eff.itemName = eDiv.querySelector('.eff-shop-item')?.value || '';
                eff.itemPrice = parseInt(eDiv.querySelector('.eff-shop-price')?.value) || 10;
            } else {
                eff.op = eDiv.querySelector('.eff-op')?.value || '';
                eff.val = eDiv.querySelector('.eff-val')?.value || '';
                eff.qty = eDiv.querySelector('.eff-qty') ? parseInt(eDiv.querySelector('.eff-qty').value) || 1 : 1;
                const eDt = eDiv.querySelector('.eff-death') ? eDiv.querySelector('.eff-death').value : '';
                if (eType === 'vida' && eff.op === '-' && eDt) eff.deathTarget = eDt;
            }
            return eff;
        };

        const nodeEffDivs = document.getElementById('node-effects-list')?.querySelectorAll('.node-eff-item');
        if (nodeEffDivs) {
            node.effs = [];
            nodeEffDivs.forEach(div => {
                const type = div.querySelector('.eff-type').value;
                if (!type) return;
                node.effs.push(extractEffectData(div, type));
            });
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
            const condQty = div.querySelector('.cond-qty')?.value;

            let choice = { 
                text: textInput ? textInput.value : "", 
                targetId: targetSelect ? targetSelect.value : "",
                effs: []
            };
            
            if (condType) {
                choice.cond = { 
                    type: condType, 
                    op: condOp || (condType === 'item' ? 'HAS' : '>'), 
                    val: condVal || '' 
                };
                if (condType === 'item' && condQty !== undefined) {
                    choice.cond.qty = condQty;
                }
            }
            
            const effItems = div.querySelectorAll('.choice-eff-item');
            effItems.forEach(eDiv => {
                const eType = eDiv.querySelector('.eff-type').value;
                if (!eType) return;
                choice.effs.push(extractEffectData(eDiv, eType));
            });
            delete choice.eff;
            
            node.choices.push(choice);
        });
        
        window.Canvas = window.Canvas || {};
        if (typeof window.Canvas.renderNodes === 'function') {
            window.Canvas.renderNodes();
            window.Canvas.renderEdges();
        }
        
        if (Core.scheduleSave) Core.scheduleSave();
    }
};