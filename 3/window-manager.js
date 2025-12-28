/* SILENOS 3/window-manager.js */
// --- Y -> CONFLUENCIA: GESTIÓN DE APLICACIONES Y HERRAMIENTAS ---

function openApp(appId) {
    if (appId === 'storage-tool') { openStorageWindow(); return; }

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
                <div class="mt-auto flex justify-end">
                    <button onclick="closeApp('${id}')" class="neumorph-btn px-6 py-2 text-xs font-bold text-gray-600">Cerrar</button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}