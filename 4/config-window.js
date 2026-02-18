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
            <link rel="stylesheet" href="styles.css">
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                /* Aseguramos scrollbar visible y estilo limpio */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #999; }
            </style>
        </head>
        <body class="bg-white p-5 select-none font-mono overflow-y-auto h-full">
            
            <div class="mb-8">
                <div class="font-bold text-sm mb-2 border-b-2 border-black pb-1 uppercase">
                    Pollinations.ai Auth
                    <span id="auth-status" class="inline-block px-1.5 py-0.5 text-[10px] border border-black ml-2 bg-red-100 text-red-800">DISCONNECTED</span>
                </div>
                <p class="text-xs mb-4 text-gray-500">Conecta para habilitar generación de IA en todo el sistema.</p>
                
                <div id="auth-controls">
                    <button id="btn-login" class="border border-black bg-white px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white w-full transition-all" onclick="handleLogin()">
                        <i class="fa-solid fa-bolt"></i> CONECTAR CUENTA
                    </button>
                    <button id="btn-logout" class="border border-red-600 text-red-600 bg-white px-2 py-1 text-xs font-bold uppercase hover:bg-red-600 hover:text-white w-full transition-all hidden" onclick="handleLogout()">
                        <i class="fa-solid fa-power-off"></i> DESCONECTAR
                    </button>
                </div>
            </div>
    
            <div class="mb-8">
                <div class="font-bold text-sm mb-2 border-b-2 border-black pb-1 uppercase">Google Gemini API</div>
                <p class="text-xs mb-2 text-gray-500">Motor para inteligencia general y razonamiento (Gemini 1.5/2.0).</p>
                
                <div class="bg-gray-50 p-3 border border-gray-200">
                    <label class="text-[10px] font-bold text-gray-400 block mb-1">API KEY</label>
                    <div class="flex gap-2">
                        <input type="password" id="inp-google-sys" class="border border-gray-300 p-1 text-xs w-full outline-none focus:border-black font-mono" placeholder="AIzaSy..." onchange="saveGoogleKey()">
                        <button class="border border-black bg-white px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white transition-all" onclick="saveGoogleKey()"><i class="fa-solid fa-floppy-disk"></i></button>
                    </div>
                    <p class="text-[9px] text-gray-400 mt-1 italic text-right" id="google-msg">Guardado en LocalStorage</p>
                </div>
            </div>
    
            <div class="mb-8">
                <div class="font-bold text-sm mb-2 border-b-2 border-black pb-1 uppercase">Airforce Video API (Multi-Key)</div>
                <p class="text-xs mb-2 text-gray-500">Motor para generación de video Grok (Escaleta AI).</p>
                <p class="text-[10px] mb-2 text-gray-400">Soporta "Modo Metralleta": Introduce múltiples keys separadas por comas.</p>
                
                <div class="bg-gray-50 p-3 border border-gray-200">
                    <label class="text-[10px] font-bold text-gray-400 block mb-1">API KEYS (Comma separated)</label>
                    <div class="flex gap-2">
                        <input type="password" id="inp-airforce-sys" class="border border-gray-300 p-1 text-xs w-full outline-none focus:border-black font-mono" placeholder="sk-key1, sk-key2, sk-key3..." onchange="saveAirforceKey()">
                        <button class="border border-black bg-white px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white transition-all" onclick="saveAirforceKey()"><i class="fa-solid fa-floppy-disk"></i></button>
                    </div>
                    <p class="text-[9px] text-gray-400 mt-1 italic text-right" id="airforce-msg">Guardado en LocalStorage</p>
                </div>
            </div>
    
            <div class="mb-8">
                <div class="font-bold text-sm mb-2 border-b-2 border-black pb-1 uppercase">System Update</div>
                <p class="text-xs mb-4 text-gray-500">Forzar descarga de la última versión de los programas base.</p>
                <button class="border border-black bg-white px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white w-full transition-all" onclick="handleUpdatePrograms()">
                    <i class="fa-solid fa-cloud-arrow-down"></i> ACTUALIZAR PROGRAMAS (FORCE)
                </button>
            </div>
    
            <div class="mb-8">
                <div class="font-bold text-sm mb-2 border-b-2 border-black pb-1 uppercase">System Variables</div>
                <div class="bg-gray-50 p-2 mb-4 border border-gray-200">
                    <div class="flex gap-2 mb-2">
                        <input type="text" id="new-key" placeholder="KEY (ej: OPENAI_KEY)" class="border border-gray-300 p-1 text-xs w-1/3 outline-none focus:border-black font-mono">
                        <input type="text" id="new-val" placeholder="VALUE" class="border border-gray-300 p-1 text-xs w-2/3 outline-none focus:border-black font-mono">
                    </div>
                    <button class="border border-black bg-white px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white w-full transition-all" onclick="addVar()">[ + ADD VARIABLE ]</button>
                </div>
    
                <div id="vars-list" class="flex flex-col gap-2">
                    </div>
            </div>

            <div class="h-10"></div>
    
            <script>
                // --- LOGICA INTERNA DEL IFRAME ---
                const Sys = window.parent.SystemConfig;
                const ParentWindow = window.parent;
    
                function render() {
                    renderAuth();
                    renderVars();
                    loadAirforceKey(); // Cargar la key de Airforce al iniciar
                    loadGoogleKey();   // Cargar la key de Google al iniciar
                }
    
                function renderAuth() {
                    const key = Sys.authKey;
                    const statusEl = document.getElementById('auth-status');
                    const btnLogin = document.getElementById('btn-login');
                    const btnLogout = document.getElementById('btn-logout');
    
                    if (key) {
                        statusEl.textContent = "CONNECTED";
                        statusEl.className = "inline-block px-1.5 py-0.5 text-[10px] border border-black ml-2 bg-green-100 text-green-800";
                        btnLogin.classList.add('hidden');
                        btnLogout.classList.remove('hidden');
                    } else {
                        statusEl.textContent = "DISCONNECTED";
                        statusEl.className = "inline-block px-1.5 py-0.5 text-[10px] border border-black ml-2 bg-red-100 text-red-800";
                        btnLogin.classList.remove('hidden');
                        btnLogout.classList.add('hidden');
                    }
                }
    
                // --- GESTIÓN GOOGLE API (NUEVO) ---
                window.loadGoogleKey = function() {
                    const key = localStorage.getItem('google_api_key') || '';
                    const inp = document.getElementById('inp-google-sys');
                    if(inp) inp.value = key;
                }
    
                window.saveGoogleKey = function() {
                    const inp = document.getElementById('inp-google-sys');
                    const msg = document.getElementById('google-msg');
                    const val = inp.value.trim();
                    
                    if(val) {
                        localStorage.setItem('google_api_key', val);
                        ParentWindow.googleapikey = val; // Variable global padre
                        msg.textContent = "KEY GUARDADA OK";
                        msg.classList.add('text-green-600');
                    } else {
                        localStorage.removeItem('google_api_key');
                        ParentWindow.googleapikey = null;
                        msg.textContent = "KEY ELIMINADA";
                        msg.classList.add('text-red-500');
                    }
    
                    setTimeout(() => {
                        msg.className = "text-[9px] text-gray-400 mt-1 italic text-right";
                        msg.textContent = "Guardado en LocalStorage";
                    }, 3000);
                }
    
                // --- GESTIÓN AIRFORCE ---
                window.loadAirforceKey = function() {
                    const key = localStorage.getItem('airforce_key') || '';
                    const inp = document.getElementById('inp-airforce-sys');
                    if(inp) inp.value = key;
                }
    
                window.saveAirforceKey = function() {
                    const inp = document.getElementById('inp-airforce-sys');
                    const msg = document.getElementById('airforce-msg');
                    const val = inp.value.trim();
                    
                    if(val) {
                        localStorage.setItem('airforce_key', val);
                        // Actualizar variable global en la ventana padre para efecto inmediato
                        ParentWindow.apikeyairforce = val; 
                        
                        // Detectar si son múltiples keys
                        const count = val.split(',').filter(k => k.trim()).length;
                        if (count > 1) {
                            msg.textContent = \`\${count} KEYS GUARDADAS (MODO METRALLETA ACTIVO)\`;
                            msg.classList.add('text-blue-600');
                        } else {
                            msg.textContent = "KEY ÚNICA GUARDADA";
                            msg.classList.add('text-green-600');
                        }
    
                    } else {
                        localStorage.removeItem('airforce_key');
                        ParentWindow.apikeyairforce = null;
                        msg.textContent = "KEY ELIMINADA";
                        msg.classList.add('text-red-500');
                    }
    
                    setTimeout(() => {
                        msg.className = "text-[9px] text-gray-400 mt-1 italic text-right";
                        msg.textContent = "Guardado en LocalStorage";
                    }, 3000);
                }
    
                // --- GESTIÓN VARIABLES ---
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
                        row.className = 'flex gap-2 mb-1 items-center group';
                        row.innerHTML = \`
                            <div class="w-1/3 text-xs font-bold truncate" title="\${key}">\${key}</div>
                            <div class="w-2/3 text-xs truncate bg-gray-100 p-1 select-all" title="\${val}">\${val}</div>
                            <button class="border border-red-500 text-red-500 bg-white px-2 py-0 h-6 text-[10px] hover:bg-red-500 hover:text-white" onclick="deleteVar('\${key}')">X</button>
                        \`;
                        list.appendChild(row);
                    }
                }
    
                // --- ACTIONS ---
                window.handleLogin = function() { Sys.login(); }
    
                window.handleLogout = function() {
                    if(confirm('¿Desconectar Pollinations?')) {
                        Sys.logout();
                        render();
                    }
                }
    
                window.handleUpdatePrograms = function() {
                    if(confirm('¿Sobreescribir todos los programas base con la última versión de GitHub? Se perderán cambios locales en /programas.')) {
                        if (ParentWindow.downloadGithubPrograms && ParentWindow.currentHandle) {
                            ParentWindow.downloadGithubPrograms(ParentWindow.currentHandle, true);
                        } else {
                            alert("Error: FileSystem no montado o función no disponible.");
                        }
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
    
                window.parent.addEventListener('silenos:config-updated', render);
                render();
            </script>
        </body>
        </html>
        `;
    }
};