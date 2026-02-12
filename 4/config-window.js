// --- CONFIG-WINDOW.JS (UI RENDERER) ---

window.ConfigWindowUI = {
    
    open() {
        if (typeof WindowManager === 'undefined') return;
        
        // Generar el contenido HTML dinámico
        const content = this.generateHTML();
        
        // Abrir ventana usando el sistema nativo de Silenos
        WindowManager.openWindow('SYSTEM CONFIG', content, 'html');
    },

    generateHTML() {
        // Nota: Dentro del HTML string, usamos window.parent.SystemConfig
        // para acceder a la lógica definida en config-core.js
        
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                body { background-color: #ffffff; font-family: 'Courier New', monospace; padding: 20px; user-select: none; }
                .section-title { font-weight: 900; font-size: 14px; margin-bottom: 10px; border-bottom: 2px solid black; padding-bottom: 5px; text-transform: uppercase; }
                .btn { border: 1px solid black; background: white; padding: 5px 10px; font-size: 12px; cursor: pointer; text-transform: uppercase; font-weight: bold; transition: all 0.1s; }
                .btn:hover { background: black; color: white; }
                .btn-danger:hover { background: red; color: white; border-color: red; }
                .input-field { border: 1px solid #ccc; padding: 5px; font-family: 'Courier New'; font-size: 12px; width: 100%; outline: none; }
                .input-field:focus { border-color: black; }
                .var-row { display: flex; gap: 5px; margin-bottom: 5px; align-items: center; }
                .status-badge { display: inline-block; padding: 2px 6px; font-size: 10px; border: 1px solid black; margin-left: 10px; }
                .status-ok { background: #dcfce7; color: #166534; }
                .status-off { background: #fee2e2; color: #991b1b; }
            </style>
        </head>
        <body>
            
            <div class="mb-8">
                <div class="section-title">
                    Pollinations.ai Auth
                    <span id="auth-status" class="status-badge status-off">DISCONNECTED</span>
                </div>
                <p class="text-xs mb-4 text-gray-500">Conecta para habilitar generación de IA en todo el sistema.</p>
                
                <div id="auth-controls">
                    <button id="btn-login" class="btn w-full" onclick="handleLogin()">
                        <i class="fa-solid fa-bolt"></i> CONECTAR CUENTA
                    </button>
                    <button id="btn-logout" class="btn w-full btn-danger hidden" onclick="handleLogout()">
                        <i class="fa-solid fa-power-off"></i> DESCONECTAR
                    </button>
                </div>
            </div>

            <div class="mb-8">
                <div class="section-title">System Variables</div>
                <div class="bg-gray-50 p-2 mb-4 border border-gray-200">
                    <div class="flex gap-2 mb-2">
                        <input type="text" id="new-key" placeholder="KEY (ej: OPENAI_KEY)" class="input-field w-1/3">
                        <input type="text" id="new-val" placeholder="VALUE" class="input-field w-2/3">
                    </div>
                    <button class="btn w-full" onclick="addVar()">[ + ADD VARIABLE ]</button>
                </div>

                <div id="vars-list" class="flex flex-col gap-2">
                    </div>
            </div>

            <script>
                // --- LOGICA INTERNA DEL IFRAME ---
                const Sys = window.parent.SystemConfig;

                function render() {
                    renderAuth();
                    renderVars();
                }

                function renderAuth() {
                    const key = Sys.authKey;
                    const statusEl = document.getElementById('auth-status');
                    const btnLogin = document.getElementById('btn-login');
                    const btnLogout = document.getElementById('btn-logout');

                    if (key) {
                        statusEl.textContent = "CONNECTED";
                        statusEl.className = "status-badge status-ok";
                        btnLogin.classList.add('hidden');
                        btnLogout.classList.remove('hidden');
                    } else {
                        statusEl.textContent = "DISCONNECTED";
                        statusEl.className = "status-badge status-off";
                        btnLogin.classList.remove('hidden');
                        btnLogout.classList.add('hidden');
                    }
                }

                function renderVars() {
                    const list = document.getElementById('vars-list');
                    list.innerHTML = '';
                    const vars = Sys.getAllVars();
                    
                    if (Object.keys(vars).length === 0) {
                        list.innerHTML = '<div class="text-xs text-gray-400 text-center italic">// NO DATA</div>';
                        return;
                    }

                    for (const [key, val] of Object.entries(vars)) {
                        const row = document.createElement('div');
                        row.className = 'var-row group';
                        row.innerHTML = \`
                            <div class="w-1/3 text-xs font-bold truncate" title="\${key}">\${key}</div>
                            <div class="w-2/3 text-xs truncate bg-gray-100 p-1 select-all" title="\${val}">\${val}</div>
                            <button class="btn btn-danger px-2 py-0 h-6 flex items-center" onclick="deleteVar('\${key}')">X</button>
                        \`;
                        list.appendChild(row);
                    }
                }

                // --- ACTIONS ---
                window.handleLogin = function() {
                    Sys.login();
                }

                window.handleLogout = function() {
                    if(confirm('¿Desconectar Pollinations?')) {
                        Sys.logout();
                        render();
                    }
                }

                window.addVar = function() {
                    const k = document.getElementById('new-key').value.trim();
                    const v = document.getElementById('new-val').value.trim();
                    if (!k || !v) return alert("Key and Value required");
                    
                    Sys.setVar(k, v);
                    document.getElementById('new-key').value = '';
                    document.getElementById('new-val').value = '';
                    render();
                }

                window.deleteVar = function(key) {
                    if(confirm('Delete ' + key + '?')) {
                        Sys.deleteVar(key);
                        render();
                    }
                }

                // --- LISTENERS ---
                // Escuchar cambios desde el padre para actualizar en tiempo real
                window.parent.addEventListener('silenos:config-updated', render);
                
                // Init
                render();
            </script>
        </body>
        </html>
        `;
    }
};