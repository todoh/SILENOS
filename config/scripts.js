/* 3/config/scripts.js */
window.ScriptManager = {
    scripts: [],
    currentScriptId: null,

    // --- CICLO DE VIDA ---

    init: function() {
        this.loadScripts();
        this.renderList();
        this.setupListeners();
    },

    // Llamado por boot.js al inicio
    runStartupScripts: function() {
        this.loadScripts();
        console.log("🚀 [SCRIPT MANAGER] Iniciando secuencia de scripts de usuario...");
        
        // Filtrar activos y ordenar por prioridad (orden)
        const toRun = this.scripts
            .filter(s => s.active)
            .sort((a, b) => a.order - b.order);

        toRun.forEach(script => {
            try {
                console.log(`▶ Ejecutando: ${script.name}`);
                // Usamos new Function para ejecutar en el scope global de window
                const func = new Function(script.code);
                func.call(window);
            } catch (err) {
                console.error(`❌ Error en script '${script.name}':`, err);
            }
        });
        
        console.log(`✅ [SCRIPT MANAGER] ${toRun.length} scripts ejecutados.`);
    },

    // --- GESTIÓN DE DATOS ---

    loadScripts: function() {
        const raw = localStorage.getItem('silenos_user_scripts');
        if (raw) {
            try {
                this.scripts = JSON.parse(raw);
            } catch (e) {
                this.scripts = [];
            }
        } else {
            this.scripts = [];
        }
    },

    saveScripts: function() {
        localStorage.setItem('silenos_user_scripts', JSON.stringify(this.scripts));
        this.showNotification("Scripts guardados correctamente");
    },

    createScript: function() {
        const newScript = {
            id: Date.now().toString(),
            name: "Nuevo Script " + (this.scripts.length + 1),
            code: "// Escribe tu código aquí\nconsole.log('Hola Silenos');",
            active: true,
            order: this.scripts.length
        };
        this.scripts.push(newScript);
        this.saveScripts();
        this.renderList();
        this.selectScript(newScript.id);
    },

    deleteScript: function(id) {
        if (!confirm("¿Borrar este script?")) return;
        this.scripts = this.scripts.filter(s => s.id !== id);
        
        if (this.currentScriptId === id) {
            this.currentScriptId = null;
            document.getElementById('script-editor-area').value = "";
            document.getElementById('script-name-input').value = "";
            document.getElementById('editor-panel').classList.add('opacity-50', 'pointer-events-none');
        }
        
        this.saveScripts();
        this.renderList();
    },

    // --- UI INTERACTION ---

    setupListeners: function() {
        const btnAdd = document.getElementById('btn-add-script');
        if (btnAdd) btnAdd.addEventListener('click', () => this.createScript());

        const btnSave = document.getElementById('btn-save-script-content');
        if (btnSave) btnSave.addEventListener('click', () => this.saveCurrentContent());

        // Auto-guardado al cambiar nombre
        const nameInput = document.getElementById('script-name-input');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                if (this.currentScriptId) {
                    const script = this.scripts.find(s => s.id === this.currentScriptId);
                    if (script) script.name = e.target.value;
                    this.renderListItem(script); // Actualizar solo el nombre en la lista
                }
            });
            // Guardar en disco al perder foco
            nameInput.addEventListener('blur', () => this.saveScripts());
        }
    },

    selectScript: function(id) {
        this.currentScriptId = id;
        const script = this.scripts.find(s => s.id === id);
        if (!script) return;

        // Habilitar panel
        const panel = document.getElementById('editor-panel');
        panel.classList.remove('opacity-50', 'pointer-events-none');

        // Llenar datos
        document.getElementById('script-name-input').value = script.name;
        document.getElementById('script-editor-area').value = script.code;

        // Resaltar en lista
        document.querySelectorAll('.script-item').forEach(el => el.classList.remove('bg-indigo-600/20', 'border-indigo-500'));
        const activeItem = document.getElementById(`script-item-${id}`);
        if (activeItem) activeItem.classList.add('bg-indigo-600/20', 'border-indigo-500');
    },

    saveCurrentContent: function() {
        if (!this.currentScriptId) return;
        const script = this.scripts.find(s => s.id === this.currentScriptId);
        if (script) {
            script.code = document.getElementById('script-editor-area').value;
            script.name = document.getElementById('script-name-input').value;
            this.saveScripts();
        }
    },

    toggleActive: function(id, event) {
        event.stopPropagation();
        const script = this.scripts.find(s => s.id === id);
        if (script) {
            script.active = !script.active;
            this.saveScripts();
            this.renderList(); // Re-render para actualizar iconos visuales
        }
    },

    moveScript: function(id, direction, event) {
        event.stopPropagation();
        const index = this.scripts.findIndex(s => s.id === id);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            // Swap orden property y array position
            const tempOrder = this.scripts[index].order;
            this.scripts[index].order = this.scripts[index-1].order;
            this.scripts[index-1].order = tempOrder;
            
            [this.scripts[index], this.scripts[index-1]] = [this.scripts[index-1], this.scripts[index]];
        } 
        else if (direction === 'down' && index < this.scripts.length - 1) {
            const tempOrder = this.scripts[index].order;
            this.scripts[index].order = this.scripts[index+1].order;
            this.scripts[index+1].order = tempOrder;

            [this.scripts[index], this.scripts[index+1]] = [this.scripts[index+1], this.scripts[index]];
        }

        // Re-normalizar indices por seguridad
        this.scripts.forEach((s, i) => s.order = i);
        
        this.saveScripts();
        this.renderList();
    },

    renderList: function() {
        const container = document.getElementById('scripts-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.scripts.sort((a, b) => a.order - b.order).forEach(script => {
            const div = document.createElement('div');
            div.id = `script-item-${script.id}`;
            div.className = `script-item p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-all flex items-center gap-3 mb-2 ${this.currentScriptId === script.id ? 'bg-indigo-600/20 border-indigo-500' : ''}`;
            div.onclick = () => this.selectScript(script.id);

            div.innerHTML = `
                <div class="flex flex-col gap-1">
                    <button onclick="window.ScriptManager.moveScript('${script.id}', 'up', event)" class="text-xs text-slate-500 hover:text-white"><i class="fa-solid fa-chevron-up"></i></button>
                    <button onclick="window.ScriptManager.moveScript('${script.id}', 'down', event)" class="text-xs text-slate-500 hover:text-white"><i class="fa-solid fa-chevron-down"></i></button>
                </div>
                
                <div class="flex-1 overflow-hidden">
                    <h4 class="font-bold text-sm truncate ${script.active ? 'text-white' : 'text-slate-500 line-through'}">${script.name}</h4>
                    <span class="text-[10px] font-mono text-slate-500">${script.code.length} chars</span>
                </div>

                <div class="flex gap-2">
                    <button onclick="window.ScriptManager.toggleActive('${script.id}', event)" class="w-8 h-8 rounded hover:bg-slate-700 flex items-center justify-center ${script.active ? 'text-green-400' : 'text-slate-600'}" title="Activar/Desactivar">
                        <i class="fa-solid ${script.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button onclick="window.ScriptManager.deleteScript('${script.id}')" class="w-8 h-8 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 flex items-center justify-center transition-colors">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    renderListItem: function(script) {
        // Optimización para actualizar solo nombre sin repintar todo (opcional)
        const el = document.querySelector(`#script-item-${script.id} h4`);
        if (el) el.textContent = script.name;
    },

    showNotification: function(msg) {
        // Simple feedback visual temporal
        const btn = document.getElementById('btn-save-script-content');
        if(btn) {
            const original = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-check"></i> GUARDADO`;
            btn.classList.add('bg-green-600', 'text-white');
            setTimeout(() => {
                btn.innerHTML = original;
                btn.classList.remove('bg-green-600', 'text-white');
            }, 1500);
        }
    }
};