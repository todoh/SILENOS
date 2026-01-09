/* SILENOS 3/window-manager.js */
// --- Y -> CONFLUENCIA: GESTIÓN DE APLICACIONES Y HERRAMIENTAS ---

function openApp(appId) {
    if (appId === 'storage-tool') { openStorageWindow(); return; }
    if (appId === 'local-chat') { openLocalAIWindow(); return; } // <--- NUEVO LANZADOR

    const app = APPS.find(a => a.id === appId);
    if (!app) return;
    
    const existingWindow = openWindows.find(w => w.id === appId);
    if (existingWindow) {
        if (existingWindow.isMinimized) toggleMinimize(appId);
        focusWindow(appId);
        return;
    }

    zIndexCounter++;
    const winObj = {
        id: appId, appId: appId, type: 'app', zIndex: zIndexCounter,
        isMinimized: false, isMaximized: false, x: 50, y: 50
    };

    createWindowDOM(winObj, app);
    openWindows.push(winObj);
    if (window.lucide) lucide.createIcons();
}

// --- NUEVA VENTANA DE CHAT LOCAL (Llama 3.2) ---
function openLocalAIWindow() {
    const id = 'local-chat-window';
    const existing = openWindows.find(w => w.id === id);
    if (existing) { focusWindow(id); return; }

    zIndexCounter++;
    const winObj = {
        id: id, appId: 'local-chat', type: 'custom', title: "Llama 3.2 (WebGPU)", 
        icon: 'cpu', zIndex: zIndexCounter, x: 100, y: 80
    };

    createWindowDOM(winObj, { width: 800, height: 600 });
    openWindows.push(winObj);

    const winContent = document.querySelector(`#window-${id} .content-area`);
    if (!winContent) return;

    // Renderizamos la UI del Chat
    winContent.innerHTML = `
        <div class="flex flex-col h-full bg-slate-100 font-sans text-slate-800 relative overflow-hidden">
            <div class="bg-white shadow-sm p-3 flex items-center justify-between z-10 shrink-0">
                <div class="flex items-center gap-2">
                    <div class="bg-blue-600 text-white p-1.5 rounded-lg text-xs">AI</div>
                    <div>
                        <h2 class="font-bold text-sm">Modelo Local</h2>
                        <p class="text-[10px] text-slate-500">Ejecutándose en tu GPU</p>
                    </div>
                </div>
                <div id="llama-status" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                    Desconectado
                </div>
            </div>

            <div id="llama-loader" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/95 z-20 transition-all p-8">
                <div class="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center">
                    <div class="text-4xl text-blue-600 mb-4">⬇️</div>
                    <h3 class="text-lg font-bold mb-2">Cargar Llama 3.2</h3>
                    <p class="text-slate-600 mb-4 text-xs">
                        Esto descargará ~600MB en tu caché.
                    </p>
                    <div id="llama-progress-box" class="w-full bg-slate-200 rounded-full h-2 mb-2 hidden">
                        <div id="llama-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all" style="width: 0%"></div>
                    </div>
                    <p id="llama-progress-text" class="text-[10px] text-slate-500 h-3 mb-4"></p>
                    <button id="btn-load-llama" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-transform active:scale-95">
                        Descargar y Activar
                    </button>
                    <p id="llama-error" class="text-red-500 text-[10px] mt-2 hidden"></p>
                </div>
            </div>

            <div id="llama-messages" class="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                <div class="flex gap-2">
                    <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-[10px]">AI</div>
                    <div class="bg-white p-2.5 rounded-2xl rounded-tl-none text-xs max-w-[85%] shadow-sm">
                        ¡Hola! Soy Llama 3.2 ejecutándome localmente en Silenos. ¿En qué te ayudo?
                    </div>
                </div>
            </div>

            <div class="p-3 bg-white border-t border-slate-200 shrink-0">
                <form id="llama-form" class="flex gap-2">
                    <input type="text" id="llama-input" class="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors" placeholder="Escribe tu mensaje..." autocomplete="off">
                    <button type="submit" id="llama-send" class="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50">Enviar</button>
                </form>
            </div>
        </div>
    `;

    // --- LÓGICA DE LA VENTANA ---
    const loadBtn = winContent.querySelector('#btn-load-llama');
    const loader = winContent.querySelector('#llama-loader');
    const status = winContent.querySelector('#llama-status');
    const progBox = winContent.querySelector('#llama-progress-box');
    const progBar = winContent.querySelector('#llama-progress-bar');
    const progText = winContent.querySelector('#llama-progress-text');
    const form = winContent.querySelector('#llama-form');
    const input = winContent.querySelector('#llama-input');
    const messagesDiv = winContent.querySelector('#llama-messages');
    const errorMsg = winContent.querySelector('#llama-error');

    // Estado inicial
    if (typeof AIService !== 'undefined' && AIService.isModelLoaded) {
        loader.classList.add('hidden');
        status.textContent = "Modelo Listo";
        status.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700";
    }

    // 1. Cargar Modelo
    loadBtn.onclick = async () => {
        if (typeof AIService === 'undefined') return;
        
        loadBtn.disabled = true;
        loadBtn.classList.add('opacity-50');
        progBox.classList.remove('hidden');
        errorMsg.classList.add('hidden');

        try {
            await AIService.initLocalModel((report) => {
                progText.textContent = report.text;
                // Estimación de progreso
                let p = 0;
                if (report.progress) p = report.progress * 100;
                else if (report.text.includes("Loading")) p = 90;
                progBar.style.width = `${p}%`;
            });

            // Éxito
            loader.style.opacity = '0';
            setTimeout(() => loader.classList.add('hidden'), 500);
            status.textContent = "Modelo Listo";
            status.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700";

        } catch (e) {
            loadBtn.disabled = false;
            loadBtn.classList.remove('opacity-50');
            errorMsg.textContent = "Error: " + e.message;
            errorMsg.classList.remove('hidden');
        }
    };

    // 2. Enviar Mensaje
    form.onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        
        // UI User
        appendMessage(text, 'user');
        input.value = '';
        input.disabled = true;

        // UI AI Placeholder
        const aiMsgDiv = appendMessage("...", 'ai');
        let fullResponse = "";

        try {
            // Usamos streaming para mejor UX en el chat
            const history = [{ role: "system", content: "Eres un asistente útil y conciso." }, { role: "user", content: text }];
            
            await AIService.streamChat(history, (chunk) => {
                fullResponse += chunk;
                aiMsgDiv.textContent = fullResponse;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            });
            
        } catch (err) {
            aiMsgDiv.textContent += " [Error: " + err.message + "]";
            if (err.message.includes("no cargado")) loader.classList.remove('hidden');
        }

        input.disabled = false;
        input.focus();
    };

    function appendMessage(text, sender) {
        const isUser = sender === 'user';
        const div = document.createElement('div');
        div.className = `flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`;
        
        const bubbleColor = isUser ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border border-slate-200';
        
        div.innerHTML = `
            <div class="w-6 h-6 rounded-full ${isUser ? 'bg-slate-700' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0 text-xs text-white">
                ${isUser ? '<i data-lucide="user"></i>' : '<span class="text-blue-600">AI</span>'}
            </div>
            <div class="${bubbleColor} p-2.5 rounded-2xl ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'} text-xs max-w-[85%] shadow-sm break-words whitespace-pre-wrap">${text}</div>
        `;
        
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return div.querySelector('div:last-child'); // Retorna la burbuja de texto
    }
}

function openStorageWindow() {
    const id = 'storage-app';
    const existing = openWindows.find(w => w.id === id);
    if (existing) { focusWindow(id); return; }

    zIndexCounter++;
    const winObj = {
        id: id, appId: 'storage-tool', type: 'storage-tool', title: "Almacenamiento", 
        icon: 'hard-drive', zIndex: zIndexCounter, x: 200, y: 150
    };

    createWindowDOM(winObj, { width: 500, height: 600 });
    openWindows.push(winObj);
    if (typeof ImportManager !== 'undefined') ImportManager.renderInWindow(id);
}

function openConfigWindow() {
    const id = 'config-window';
    const existing = openWindows.find(w => w.id === id);
    if (existing) { focusWindow(id); return; }

    zIndexCounter++;
    const winObj = { id: id, type: 'config', title: "Configuración", icon: 'settings', zIndex: zIndexCounter, x: 200, y: 200 };
    createWindowDOM(winObj, { width: 400, height: 350 });
    openWindows.push(winObj);

    const winContent = document.querySelector(`#window-${id} .content-area`);
    if (winContent) {
        let currentKeys = '';
        if (typeof AIService !== 'undefined' && AIService.apiKeys) currentKeys = AIService.apiKeys.join(',');

        winContent.innerHTML = `
            <div class="p-6 flex flex-col gap-6 bg-[#f3f4f6] h-full">
                <div class="flex items-center gap-2 border-b border-gray-300 pb-2">
                    <i data-lucide="cpu" class="w-5 h-5 text-gray-500"></i>
                    <h3 class="text-sm font-bold text-gray-700">Ajustes del Sistema</h3>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase">Gemini API Keys (CSV)</label>
                    <input type="password" id="config-api-keys" class="neumorph-in p-3 text-xs outline-none" value="${currentKeys}"
                        onchange="if(typeof AIService !== 'undefined') AIService.setApiKeys(this.value)">
                </div>
                <div class="bg-blue-50 p-3 rounded border border-blue-100">
                    <h4 class="text-xs font-bold text-blue-700 mb-1">Estado Llama Local</h4>
                    <p class="text-[10px] text-blue-600">
                        ${(typeof AIService !== 'undefined' && AIService.isModelLoaded) 
                            ? "✅ Modelo cargado en memoria (WebGPU activo)" 
                            : "⚪ Modelo no cargado (Usa la App Llama Local)"}
                    </p>
                </div>
                <div class="mt-auto flex justify-end">
                    <button onclick="closeApp('${id}')" class="neumorph-btn px-6 py-2 text-xs font-bold text-gray-600">Cerrar</button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}