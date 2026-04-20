// Archivo: Librojuego/ui.settings.js

window.UI = window.UI || {};

Object.assign(window.UI, {
    openSettingsModal() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.nodes) bookBase.nodes = [];
        if (!bookBase.gameItems) bookBase.gameItems = [];
        if (!bookBase.initialState) bookBase.initialState = { vida: 10, poder: 10, inventario: [] };

        document.getElementById('set-vida').value = bookBase.initialState.vida;
        document.getElementById('set-poder').value = bookBase.initialState.poder;
        this.renderSettingsItems();

        // Cargar ajustes de Ollama desde localStorage
        const ollamaConfig = JSON.parse(localStorage.getItem('ollama_config')) || { enabled: false, url: 'http://localhost:11434', logic: '', narrative: '' };
        document.getElementById('set-ollama-enabled').checked = ollamaConfig.enabled;
        document.getElementById('set-ollama-url').value = ollamaConfig.url;
        this.toggleOllamaSettings();
        if(ollamaConfig.enabled) {
            this.loadOllamaModels(ollamaConfig.logic, ollamaConfig.narrative);
        }

        const modal = document.getElementById('settings-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    closeSettingsModal() {
        const bookBase = Core.book || Core.bookData || {};
        const modal = document.getElementById('settings-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        bookBase.initialState.vida = parseInt(document.getElementById('set-vida').value) || 0;
        bookBase.initialState.poder = parseInt(document.getElementById('set-poder').value) || 0;
        
        // Guardar configuración de Ollama
        const ollamaConfig = {
            enabled: document.getElementById('set-ollama-enabled').checked,
            url: document.getElementById('set-ollama-url').value,
            logic: document.getElementById('set-ollama-logic').value,
            narrative: document.getElementById('set-ollama-narrative').value
        };
        localStorage.setItem('ollama_config', JSON.stringify(ollamaConfig));

        if(Core.scheduleSave) Core.scheduleSave();
        
        if (Core.selectedNodeId && typeof Editor !== 'undefined') {
            Editor.loadNode(Core.selectedNodeId);
        }
    },

    toggleOllamaSettings() {
        const isEnabled = document.getElementById('set-ollama-enabled').checked;
        const container = document.getElementById('ollama-settings-container');
        if (isEnabled) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
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
            console.error('Error cargando modelos de Ollama:', error);
            selectLogic.innerHTML = '<option value="">Error de conexión</option>';
            selectNarrative.innerHTML = '<option value="">Error de conexión</option>';
            alert("No se pudo conectar a Ollama. Asegúrate de que está en ejecución y tiene OLLAMA_ORIGINS=\"*\" configurado.");
        }
    },

    renderSettingsItems() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.gameItems) bookBase.gameItems = [];
        if (!bookBase.initialState) bookBase.initialState = { vida: 10, poder: 10, inventario: [] };

        const list = document.getElementById('settings-items-list');
        list.innerHTML = '';
        bookBase.gameItems.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-white p-2 rounded-xl border border-gray-200 text-xs font-bold";
            const isInitial = bookBase.initialState.inventario.includes(item);
            
            div.innerHTML = `
                <div class="flex items-center gap-3 w-full">
                    <span class="text-indigo-900 flex-1 truncate">${item}</span>
                    <label class="flex items-center gap-1 text-[9px] text-gray-500 cursor-pointer bg-gray-50 p-1 px-2 rounded-lg border border-gray-100 hover:bg-gray-100">
                        <input type="checkbox" onchange="UI.toggleInitialItem('${item}', this.checked)" ${isInitial ? 'checked' : ''}>
                        Item de inicio
                    </label>
                </div>
                <button onclick="UI.removeGameItem(${idx})" class="text-red-400 hover:text-red-600 px-3"><i class="fa-solid fa-trash"></i></button>
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
                if(c.eff && c.eff.type === 'item' && c.eff.val === item) delete c.eff;
            });
        });
        this.renderSettingsItems();
    },

    toggleInitialItem(item, checked) {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.initialState) bookBase.initialState = { vida: 10, poder: 10, inventario: [] };

        if (checked) {
            if (!bookBase.initialState.inventario.includes(item)) {
                bookBase.initialState.inventario.push(item);
            }
        } else {
            bookBase.initialState.inventario = bookBase.initialState.inventario.filter(i => i !== item);
        }
    }
});