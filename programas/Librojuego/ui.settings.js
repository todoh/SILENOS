// Archivo: Librojuego/ui.settings.js

window.UI = window.UI || {};

Object.assign(window.UI, {
    openSettingsModal() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.nodes) bookBase.nodes = [];
        if (!bookBase.gameItems) bookBase.gameItems = [];
        if (!bookBase.initialState) bookBase.initialState = { vida: 10, vidaMax: 10, ataque: 5, defensa: 5, agilidad: 5, destreza: 5, inventario: [] };

        document.getElementById('set-vida').value = bookBase.initialState.vida ?? 10;
        document.getElementById('set-vidaMax').value = bookBase.initialState.vidaMax ?? 10;
        document.getElementById('set-ataque').value = bookBase.initialState.ataque ?? 5;
        document.getElementById('set-defensa').value = bookBase.initialState.defensa ?? 5;
        document.getElementById('set-agilidad').value = bookBase.initialState.agilidad ?? 5;
        document.getElementById('set-destreza').value = bookBase.initialState.destreza ?? 5;

        const ollamaConfig = JSON.parse(localStorage.getItem('ollama_config')) || { enabled: false, url: 'http://localhost:11434', logic: '', narrative: '' };
        document.getElementById('set-ollama-enabled').checked = ollamaConfig.enabled;
        document.getElementById('set-ollama-url').value = ollamaConfig.url;
        this.toggleOllamaSettings();
        if(ollamaConfig.enabled) {
            this.loadOllamaModels(ollamaConfig.logic, ollamaConfig.narrative);
        }

        const geminiConfig = JSON.parse(localStorage.getItem('gemini_config')) || { enabled: false, apikey: '', logic: 'gemini-2.5-flash', narrative: 'gemini-3.1-flash-lite' };
        document.getElementById('set-gemini-enabled').checked = geminiConfig.enabled;
        document.getElementById('set-gemini-apikey').value = geminiConfig.apikey;
        document.getElementById('set-gemini-logic').value = geminiConfig.logic;
        document.getElementById('set-gemini-narrative').value = geminiConfig.narrative;
        this.toggleGeminiSettings();

        const modal = document.getElementById('settings-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    closeSettingsModal() {
        const bookBase = Core.book || Core.bookData || {};
        const modal = document.getElementById('settings-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        bookBase.initialState.vida = parseInt(document.getElementById('set-vida').value) || 10;
        bookBase.initialState.vidaMax = parseInt(document.getElementById('set-vidaMax').value) || 10;
        bookBase.initialState.ataque = parseInt(document.getElementById('set-ataque').value) || 5;
        bookBase.initialState.defensa = parseInt(document.getElementById('set-defensa').value) || 5;
        bookBase.initialState.agilidad = parseInt(document.getElementById('set-agilidad').value) || 5;
        bookBase.initialState.destreza = parseInt(document.getElementById('set-destreza').value) || 5;
        
        const ollamaConfig = {
            enabled: document.getElementById('set-ollama-enabled').checked,
            url: document.getElementById('set-ollama-url').value,
            logic: document.getElementById('set-ollama-logic').value,
            narrative: document.getElementById('set-ollama-narrative').value
        };
        localStorage.setItem('ollama_config', JSON.stringify(ollamaConfig));

        const geminiConfig = {
            enabled: document.getElementById('set-gemini-enabled').checked,
            apikey: document.getElementById('set-gemini-apikey').value,
            logic: document.getElementById('set-gemini-logic').value,
            narrative: document.getElementById('set-gemini-narrative').value
        };
        localStorage.setItem('gemini_config', JSON.stringify(geminiConfig));

        if(Core.scheduleSave) Core.scheduleSave();
        
        if (Core.selectedNodeId && typeof Editor !== 'undefined') {
            Editor.loadNode(Core.selectedNodeId);
        }
    },

    toggleOllamaSettings() {
        const isEnabled = document.getElementById('set-ollama-enabled').checked;
        const container = document.getElementById('ollama-settings-container');
        if (isEnabled) container.classList.remove('hidden');
        else container.classList.add('hidden');
    },

    toggleGeminiSettings() {
        const isEnabled = document.getElementById('set-gemini-enabled').checked;
        const container = document.getElementById('gemini-settings-container');
        if (isEnabled) container.classList.remove('hidden');
        else container.classList.add('hidden');
    },

    async loadOllamaModels(selectedLogic = '', selectedNarrative = '') {
        const url = document.getElementById('set-ollama-url').value;
        const selectLogic = document.getElementById('set-ollama-logic');
        const selectNarrative = document.getElementById('set-ollama-narrative');
        
        selectLogic.innerHTML = '<option>Cargando...</option>';
        selectNarrative.innerHTML = '<option>Cargando...</option>';
        
        try {
            const response = await fetch(`${url}/api/tags`);
            const data = await response.json();
            
            selectLogic.innerHTML = '';
            selectNarrative.innerHTML = '';
            
            if (!data.models || data.models.length === 0) {
                selectLogic.innerHTML = '<option value="">Sin modelos</option>';
                selectNarrative.innerHTML = '<option value="">Sin modelos</option>';
                return;
            }
            
            data.models.forEach(model => {
                const opt1 = document.createElement('option');
                opt1.value = model.name;
                opt1.textContent = model.name;
                if (model.name === selectedLogic) opt1.selected = true;
                selectLogic.appendChild(opt1);
                
                const opt2 = document.createElement('option');
                opt2.value = model.name;
                opt2.textContent = model.name;
                if (model.name === selectedNarrative) opt2.selected = true;
                selectNarrative.appendChild(opt2);
            });
        } catch (error) {
            selectLogic.innerHTML = '<option value="">Error de conexión</option>';
            selectNarrative.innerHTML = '<option value="">Error de conexión</option>';
            alert("No se pudo conectar a Ollama.");
        }
    },

    renderSettingsItems() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.gameItems) bookBase.gameItems = [];
        if (!bookBase.initialState) bookBase.initialState = { vida: 10, vidaMax: 10, ataque: 5, defensa: 5, agilidad: 5, destreza: 5, inventario: [] };

        const list = document.getElementById('settings-items-list');
        if (!list) return;
        list.innerHTML = '';
        bookBase.gameItems.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 text-xs font-bold shadow-sm";
            
            let count = 0;
            bookBase.initialState.inventario.forEach(i => { if(i === item) count++; });
            
            div.innerHTML = `
                <div class="flex items-center gap-3 w-full">
                    <span class="text-indigo-900 flex-1 truncate text-sm">${item}</span>
                    <label class="flex items-center gap-2 text-[10px] text-gray-600 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                        INICIO: 
                        <input type="number" min="0" value="${count}" class="w-16 liquid-input h-8 py-0 px-2 border border-gray-200 font-bold text-center" onchange="UI.setInitialItemQty('${item}', this.value)">
                    </label>
                </div>
                <button onclick="UI.removeGameItem(${idx})" class="text-red-400 hover:text-red-600 px-4 ml-2"><i class="fa-solid fa-trash"></i></button>
            `;
            list.appendChild(div);
        });
    },

    addGameItem() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.gameItems) bookBase.gameItems = [];

        const input = document.getElementById('new-item-name');
        const val = input.value.trim();
        if (val && !bookBase.gameItems.includes(val)) {
            bookBase.gameItems.push(val);
            input.value = '';
            this.renderSettingsItems();
        }
    },

    removeGameItem(idx) {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.gameItems) return;

        const item = bookBase.gameItems[idx];
        bookBase.gameItems.splice(idx, 1);
        
        if (bookBase.initialState && bookBase.initialState.inventario) {
            bookBase.initialState.inventario = bookBase.initialState.inventario.filter(i => i !== item);
        }
        
        (bookBase.nodes || []).forEach(n => {
            n.choices.forEach(c => {
                if(c.cond && c.cond.type === 'item' && c.cond.val === item) delete c.cond;
                if(c.effs) {
                    c.effs = c.effs.filter(e => !(e.type === 'item' && e.val === item));
                }
            });
            if(n.effs) {
                n.effs = n.effs.filter(e => !(e.type === 'item' && e.val === item));
            }
        });
        this.renderSettingsItems();
    },

    setInitialItemQty(item, qty) {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.initialState) bookBase.initialState = { vida: 10, vidaMax: 10, ataque: 5, defensa: 5, agilidad: 5, destreza: 5, inventario: [] };
        
        let newInv = bookBase.initialState.inventario.filter(i => i !== item);
        let q = parseInt(qty) || 0;
        for(let i=0; i<q; i++) newInv.push(item);
        bookBase.initialState.inventario = newInv;
        if(Core.scheduleSave) Core.scheduleSave();
    }
});

// Renderizar al inicializar si el panel existe
window.addEventListener('load', () => {
    setTimeout(() => { if (window.UI && UI.renderSettingsItems) UI.renderSettingsItems(); }, 1000);
});