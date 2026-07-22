// Abrir Canvas: logic.ui.js
// --- GESTIÓN DE UI ---
const ui = {
    toggleTheme: () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('koreh_theme', isDark ? 'dark' : 'light');
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            btn.innerHTML = isDark ? '<i class="fa-solid fa-sun text-[11px]"></i>' : '<i class="fa-solid fa-moon text-[11px]"></i>';
        }
        if (window.TramasCanvas && typeof window.TramasCanvas.render === 'function') {
            window.TramasCanvas.render();
        }
    },
    switchTab: (tabId) => {
        const tabDatos = document.getElementById('tab-datos');
        const tabTramas = document.getElementById('tab-tramas');
        const tabCrono = document.getElementById('tab-cronologia');
        const tabIO = document.getElementById('tab-io');
        const tabLibros = document.getElementById('tab-libros');
        const cronoToolbar = document.getElementById('crono-toolbar');
        
        if (tabDatos) tabDatos.classList.add('hidden');
        if (tabTramas) tabTramas.classList.add('hidden');
        if (tabCrono) tabCrono.classList.add('hidden');
        if (tabIO) tabIO.classList.add('hidden');
        if (tabLibros) tabLibros.classList.add('hidden');
        if (cronoToolbar) cronoToolbar.classList.add('hidden');
        
        const btnDatos = document.getElementById('btn-tab-datos');
        const btnTramas = document.getElementById('btn-tab-tramas');
        const btnCrono = document.getElementById('btn-tab-cronologia');
        const btnIO = document.getElementById('btn-tab-io');
        const btnLibros = document.getElementById('btn-tab-libros');
        
        if (btnDatos) {
            btnDatos.classList.remove('border-black', 'text-black', 'border-white', 'text-white');
            btnDatos.classList.add('border-transparent', 'text-gray-400');
        }
        if (btnTramas) {
            btnTramas.classList.remove('border-black', 'text-black', 'border-white', 'text-white');
            btnTramas.classList.add('border-transparent', 'text-gray-400');
        }
        if (btnCrono) {
            btnCrono.classList.remove('border-black', 'text-black', 'border-white', 'text-white');
            btnCrono.classList.add('border-transparent', 'text-gray-400');
        }
        if (btnIO) {
            btnIO.classList.remove('border-black', 'text-black', 'border-white', 'text-white');
            btnIO.classList.add('border-transparent', 'text-gray-400');
        }
        if (btnLibros) {
            btnLibros.classList.remove('border-black', 'text-black', 'border-white', 'text-white');
            btnLibros.classList.add('border-transparent', 'text-gray-400');
        }
        const targetTab = document.getElementById(`tab-${tabId}`);
        if (targetTab) targetTab.classList.remove('hidden');
        
        const btn = document.getElementById(`btn-tab-${tabId}`);
        if (btn) {
            const isDark = document.documentElement.classList.contains('dark');
            btn.classList.add(isDark ? 'border-white' : 'border-black');
            btn.classList.remove('border-transparent', 'text-gray-400');
        }
        
        if (tabId === 'datos' && typeof app !== 'undefined') {
            app.renderGrid();
        }
        if (tabId === 'tramas' && typeof window.TramasCanvas !== 'undefined') {
            window.TramasCanvas.resize(); 
        }
        if (tabId === 'cronologia') {
            if (cronoToolbar) cronoToolbar.classList.remove('hidden');
            if (window.timeline) {
                window.timeline.renderAll();
            }
        }
        if (tabId === 'io' && window.KorehIO) {
            window.KorehIO.refreshTargetTimelineSelect();
        }
        if (tabId === 'libros' && window.KorehIO && typeof window.KorehIO.refreshTargetTimelineSelect === 'function') {
            window.KorehIO.refreshTargetTimelineSelect();
        }
    },
    toggleFolderModal: () => {
        const modal = document.getElementById('folder-modal');
        if (modal) {
            modal.classList.toggle('hidden');
            if(!modal.classList.contains('hidden') && typeof app !== 'undefined') {
                app.scanRoot();
            }
        }
    },
    toggleNameModal: () => {
        const modal = document.getElementById('name-modal');
        const input = document.getElementById('new-item-name');
        if (modal) {
            modal.classList.toggle('hidden');
            if(!modal.classList.contains('hidden') && input) {
                input.value = '';
                setTimeout(() => input.focus(), 100);
            }
        }
    },
    toggleImageConfigModal: () => {
        const modal = document.getElementById('image-config-modal');
        if (modal) {
            modal.classList.toggle('hidden');
        }
    },
    toggleOllamaConfigModal: () => {
        const modal = document.getElementById('ollama-config-modal');
        if (modal) {
            modal.classList.toggle('hidden');
        }
    },
    toggleGenerator: () => {
        const sidebar = document.getElementById('generator-sidebar');
        const btn = document.getElementById('btn-toggle-gen');
        if (sidebar) sidebar.classList.toggle('open');
        if (btn) {
            btn.classList.toggle('bg-black');
            btn.classList.toggle('text-white');
        }
    },
    openSidebar: () => {
        const sidebar = document.getElementById('editor-sidebar');
        if (sidebar) sidebar.classList.add('open');
    },
    closeSidebar: async () => {
        if (typeof app !== 'undefined' && app.saveTimer) {
            clearTimeout(app.saveTimer);
            app.saveTimer = null;
            await app.saveCurrentItem(true);
        }
        const sidebar = document.getElementById('editor-sidebar');
        if (sidebar) sidebar.classList.remove('open');
        if (typeof app !== 'undefined') app.currentFileHandle = null; 
    },
    setLoading: (loading, msg = "Procesando...") => {
        const loader = document.getElementById('sidebar-loader');
        if (loader) {
            const span = loader.querySelector('span');
            if (span) span.innerText = msg;
            if(loading) loader.classList.add('active'); else loader.classList.remove('active');
        }
    },
    fetchOllamaModels: async () => {
        const select = document.getElementById('ollama-text-model');
        if (!select) return;
        const baseUrl = localStorage.getItem('koreh_ollama_local_url') || 'http://127.0.0.1:11434/api';
        try {
            const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const res = await fetch(`${cleanUrl}/tags`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            select.innerHTML = '';
            if (data.models && data.models.length > 0) {
                const savedSelected = localStorage.getItem('koreh_selected_ollama_model') || '';
                data.models.forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model.name;
                    opt.innerText = model.name.toUpperCase();
                    if (model.name === savedSelected) opt.selected = true;
                    select.appendChild(opt);
                });
                if (!select.value && select.options.length > 0) {
                    localStorage.setItem('koreh_selected_ollama_model', select.options[0].value);
                }
            } else {
                select.innerHTML = '<option value="">SIN MODELOS LOCALES</option>';
            }
        } catch (e) {
            console.warn("No se pudo conectar con Ollama para listar los modelos:", baseUrl);
            select.innerHTML = '<option value="">OFFLINE / DESCONECTADO</option>';
        }
    },
    handleImageEngineChange: () => {
        const engine = document.getElementById('global-image-engine')?.value || 'comfyui';
        const modelSelect = document.getElementById('global-image-model');
        const comfyParamsBlock = document.getElementById('box-config-comfyui-params');
        if (!modelSelect) return;
        modelSelect.innerHTML = '';

        if (engine === 'runware') {
            if (comfyParamsBlock) comfyParamsBlock.classList.remove('hidden');
            const opt = document.createElement('option');
            opt.value = 'runware:twinflow-z-image-turbo@0';
            opt.innerText = 'TWINFLOW Z-IMAGE TURBO (RUNWARE)';
            modelSelect.appendChild(opt);

            // Ajustar automáticamente parámetros requeridos
            const wInput = document.getElementById('comfy-width');
            const hInput = document.getElementById('comfy-height');
            const stepsInput = document.getElementById('comfy-steps');
            if (wInput) wInput.value = "1344";
            if (hInput) hInput.value = "768";
            if (stepsInput) stepsInput.value = "4";

            const loraBox = document.getElementById('box-config-fooocus-lora');
            if (loraBox) loraBox.remove();
        } else if (engine === 'fooocus') {
            if (comfyParamsBlock) comfyParamsBlock.classList.remove('hidden');
            const opt = document.createElement('option');
            opt.value = 'juggernautXL_v8Rundiffusion.safetensors';
            opt.innerText = 'JUGGERNAUT XL (FOOOCUS)';
            modelSelect.appendChild(opt);
            
            let loraBox = document.getElementById('box-config-fooocus-lora');
            if (!loraBox && comfyParamsBlock) {
                loraBox = document.createElement('div');
                loraBox.id = 'box-config-fooocus-lora';
                loraBox.className = 'mt-2';
                loraBox.innerHTML = `
                    <span class="label-text">LoRA Acelerador (Fooocus)</span>
                    <select id="fooocus-lora-select" onchange="localStorage.setItem('koreh_fooocus_lora', this.value);" class="config-input text-xs font-bold bg-transparent text-black dark:text-white border-b">
                        <option value="sdxl_lightning_4step.safetensors">SDXL Lightning (4 Steps)</option>
                        <option value="lcm_xl.safetensors">LCM SDXL</option>
                    </select>
                `;
                comfyParamsBlock.parentNode.insertBefore(loraBox, comfyParamsBlock.nextSibling);
            }
            const savedLora = localStorage.getItem('koreh_fooocus_lora') || 'sdxl_lightning_4step.safetensors';
            const loraSelect = document.getElementById('fooocus-lora-select');
            if (loraSelect) loraSelect.value = savedLora;
        } else {
            const loraBox = document.getElementById('box-config-fooocus-lora');
            if (loraBox) loraBox.remove();
            
            if (engine === 'pollinations') {
                if (comfyParamsBlock) comfyParamsBlock.classList.add('hidden');
                
                const models = [
                    { val: 'flux', label: 'Flux Schnell' },
                    { val: 'zimage', label: 'Z-Image Turbo' },
                    { val: 'gptimage', label: 'gptimage' },
                    { val: 'klein', label: 'klein' },
                    { val: 'nova-canvas', label: 'nova-canvas' },
                    { val: 'kontext', label: 'kontext' },
                    { val: 'gpt-image-2', label: 'gpt-image-2' },
                    { val: 'gptimage-large', label: 'gptimage-large' }
                ];
                const savedModel = localStorage.getItem('koreh_selected_image_model') || 'flux';
                models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.val;
                    opt.innerText = m.label.toUpperCase();
                    if (m.val === savedModel) opt.selected = true;
                    modelSelect.appendChild(opt);
                });
            } else {
                if (comfyParamsBlock) comfyParamsBlock.classList.remove('hidden');
                const comfyModels = [
                    { val: 'juggernautXL_ragnarokBy.safetensors', label: 'JUGGERNAUT XL (COMFY)' },
                    { val: 'dreamshaperXL_lightningDPMSDE.safetensors', label: 'DREAMSHAPER XL LIGHTNING' },
                    { val: 'flux-2-klein-base-4b-fp8.safetensors', label: 'FLUX 2 KLEIN BASE' }
                ];
                const savedModel = localStorage.getItem('koreh_selected_image_model') || 'juggernautXL_ragnarokBy.safetensors';
                comfyModels.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.val;
                    opt.innerText = m.label.toUpperCase();
                    if (m.val === savedModel) opt.selected = true;
                    modelSelect.appendChild(opt);
                });
            }
        }
    },
    updateAuthUI: () => {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        const ollamaLocalInp = document.getElementById('ollama-local-url');
        const ollamaCloudInp = document.getElementById('ollama-cloud-url');
        const modeSelector = document.getElementById('koreh-api-mode');
        const imageEngineSelector = document.getElementById('global-image-engine');
        const keyInput = document.getElementById('pollinations-api-key-inp');
        const geminiKeyInput = document.getElementById('gemini-api-key-inp');
        const runwareKeyInput = document.getElementById('runware-api-key-inp');
        
        if (modeSelector) {
            modeSelector.value = localStorage.getItem('koreh_api_mode') || 'local';
        }
        if (imageEngineSelector) {
            imageEngineSelector.value = localStorage.getItem('koreh_image_engine') || 'comfyui';
        }
        if (keyInput) {
            keyInput.value = localStorage.getItem('pollinations_api_key') || '';
        }
        if (geminiKeyInput) {
            geminiKeyInput.value = localStorage.getItem('koreh_gemini_book_api_key') || '';
        }
        if (runwareKeyInput) {
            runwareKeyInput.value = localStorage.getItem('koreh_runware_api_key') || '';
        }
        if (ollamaLocalInp) {
            const savedLocalUrl = localStorage.getItem('koreh_ollama_local_url') || 'http://127.0.0.1:11434/api';
            ollamaLocalInp.value = savedLocalUrl;
        }
        if (ollamaCloudInp) {
            const savedCloudUrl = localStorage.getItem('koreh_ollama_cloud_url') || 'http://127.0.0.1:11434/api';
            ollamaCloudInp.value = savedCloudUrl;
        }
        ui.fetchOllamaModels();
        ui.handleModeChangeChangeVisibility();
        ui.handleImageEngineChange();
        
        const savedTheme = localStorage.getItem('koreh_theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
            const btn = document.getElementById('theme-toggle-btn');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-sun text-[11px]"></i>';
        }
        if (!indicator || !text) return;
        const currentMode = localStorage.getItem('koreh_api_mode') || 'local';
        indicator.className = "w-1.5 h-1.5 rounded-full bg-black dark:bg-white";
        
        if (currentMode === 'local') {
            text.innerText = "LOCAL ENGINE";
        } else if (currentMode === 'pollinations') {
            text.innerText = "POLLINATION ENGINE";
        } else if (currentMode === 'gemini') {
            text.innerText = "GEMINI NATIVE ENGINE";
        }
        text.className = "text-[10px] font-medium text-black dark:text-white uppercase tracking-wider";
    },
    handleModeChangeChangeVisibility: () => {
        const currentMode = localStorage.getItem('koreh_api_mode') || 'local';
        const ollamaBox = document.getElementById('box-config-ollama');
        const pollinationsBox = document.getElementById('box-config-pollinations');
        
        if (currentMode === 'pollinations' || currentMode === 'gemini') {
            if (ollamaBox) ollamaBox.classList.add('hidden');
            if (pollinationsBox) pollinationsBox.classList.remove('hidden');
        } else {
            if (ollamaBox) document.getElementById('box-config-ollama')?.classList.remove('hidden');
            if (pollinationsBox) pollinationsBox.classList.add('hidden');
        }
    },
    alert: (msg) => {
        const modal = document.getElementById('msg-modal');
        const content = document.getElementById('msg-content');
        const actions = document.getElementById('msg-actions');
        if (!modal || !content || !actions) return;
        content.innerText = msg;
        actions.innerHTML = `
            <button onclick="document.getElementById('msg-modal').classList.add('hidden')" class="btn-primary w-24">OK</button>
        `;
        modal.classList.remove('hidden');
    },
    confirm: (msg, onYes) => {
        const modal = document.getElementById('msg-modal');
        const content = document.getElementById('msg-content');
        const actions = document.getElementById('msg-actions');
        if (!modal || !content || !actions) return;
        content.innerText = msg;
        actions.innerHTML = '';
        const btnCancel = document.createElement('button');
        btnCancel.className = "btn-nordic text-gray-400 border-none hover:bg-gray-50 dark:hover:bg-gray-800";
        btnCancel.innerText = "CANCELAR";
        btnCancel.onclick = () => modal.classList.add('hidden');
        const btnOk = document.createElement('button');
        btnOk.className = "btn-primary w-24";
        btnOk.innerText = "ACEPTAR";
        btnOk.onclick = () => {
            modal.classList.add('hidden');
            onYes();
        };
        actions.appendChild(btnCancel);
        actions.appendChild(btnOk);
        modal.classList.remove('hidden');
    },
    toggleFileSelector() {
        if(window.uiCrono) window.uiCrono.toggleFileSelector();
    },
    toggleLoading(show, text, subtext="") {
        if(window.uiCrono) window.uiCrono.toggleLoading(show, text, subtext);
    },
    zoomImage: (src) => {
        let overlay = document.getElementById('ui-zoom-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ui-zoom-overlay';
            overlay.className = "fixed inset-0 bg-white/95 dark:bg-gray-950/95 z-[9999] flex items-center justify-center cursor-zoom-out opacity-0 transition-opacity duration-200 backdrop-blur-sm";
            overlay.innerHTML = `<img id="ui-zoom-img" src="" class="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl border border-gray-100 dark:border-gray-800">`;
            overlay.onclick = () => {
                overlay.classList.remove('opacity-100');
                overlay.classList.add('opacity-0');
                setTimeout(() => overlay.classList.add('hidden'), 200);
            };
            document.body.appendChild(overlay);
        }
        const img = document.getElementById('ui-zoom-img');
        if (img) img.src = src;
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            overlay.classList.add('opacity-100');
        }, 10);
    },
    triggerDirectoryPicker: async () => {
        if (typeof app !== 'undefined') {
            ui.toggleFolderModal();
            await app.selectDirectoryAPI();
        }
    },
    renderContextMenu: (x, y, itemIndex = null) => {
        ui.closeContextMenu();
        const menu = document.createElement('div');
        menu.id = 'datos-context-menu';
        menu.className = 'fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl py-1 z-[200] min-w-[160px] font-sans text-xs text-gray-700 dark:text-gray-300';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        if (itemIndex !== null) {
            menu.innerHTML = `
                <div onclick="ui.closeContextMenu(); app.duplicateItemAtIndex(${itemIndex});" class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-2"><i class="fa-regular fa-copy text-gray-400"></i> DUPLICAR DATO</div>
                <div onclick="ui.closeContextMenu(); app.deleteItemAtIndex(${itemIndex});" class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-red-500 flex items-center gap-2"><i class="fa-regular fa-trash-can text-red-400"></i> ELIMINAR DATO</div>
                <div class="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                <div onclick="ui.closeContextMenu(); app.createNewItem();" class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-2"><i class="fa-solid fa-plus text-gray-400"></i> CREAR NUEVO</div>
            `;
        } else {
            menu.innerHTML = `
                <div onclick="ui.closeContextMenu(); app.createNewItem();" class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-2"><i class="fa-solid fa-plus text-gray-400"></i> CREAR NUEVO DATO</div>
            `;
        }
        document.body.appendChild(menu);
        const closeHandler = () => {
            ui.closeContextMenu();
            document.removeEventListener('click', closeHandler);
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
    },
    closeContextMenu: () => {
        const existing = document.getElementById('datos-context-menu');
        if (existing) existing.remove();
    },
    toggleAIModal() { document.getElementById('ai-modal').classList.toggle('hidden'); },
    togglePremiseModal() { document.getElementById('premise-modal').classList.toggle('hidden'); },
    toggleStoryboardModal() { document.getElementById('storyboard-modal').classList.toggle('hidden'); }
};
window.ui = ui;