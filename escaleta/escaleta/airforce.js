// --- cronologia/escaleta/airforce.js ---
// PUENTE AIRFORCE V4.3 - SISTEMA DE COLAS INTELIGENTE Y UI 100% FIABLE

const AirforceBridge = {
    baseUrl: "https://api.airforce/v1/images/generations",
    keyUsageStats: {},
    _globalLock: 0, 

    updateMonitorUI() {
        const apiKeyString = window.apikeyairforce || localStorage.getItem('airforce_key') || "";
        const dropdown = document.getElementById('apikey-monitor-dropdown');
        const statusBtn = document.getElementById('apikey-monitor-status');
        
        // Verificamos el estado del switch
        const rotationSwitch = document.getElementById('airforce-rotation-switch');
        const useRotation = rotationSwitch ? rotationSwitch.checked : true;
        
        if (!dropdown || !statusBtn) return;

        if (!apiKeyString) {
            dropdown.innerHTML = '<div class="p-4 text-xs text-gray-400 text-center">Sin keys configuradas</div>';
            statusBtn.innerHTML = "0/0 Listas";
            return;
        }
        
        let keys = apiKeyString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        if (keys.length === 0) return;
        
        // Si no rotamos, mostramos solo la primera llave en la UI
        if (!useRotation) {
            keys = [keys[0]];
        }

        // Renderizado del dropdown solo si cambian las keys o el modo (optimización del DOM)
        const renderStateId = apiKeyString + (useRotation ? "-rot" : "-static");
        if (dropdown.dataset.renderedKeys !== renderStateId) {
            let html = '';
            keys.forEach((key, idx) => {
                const shortKey = key.substring(0, 4) + '...' + key.substring(key.length - 4);
                html += `
                    <div id="api-key-row-${idx}" class="px-4 py-3 border-b border-gray-100 flex flex-col gap-1 transition-colors">
                        <div class="flex justify-between items-center text-[10px] font-mono">
                            <span class="text-gray-700 font-bold">Key ${useRotation ? idx + 1 : 'Principal'} <span class="text-gray-400 font-normal">(${shortKey})</span></span>
                            <span id="api-key-status-${idx}" class="font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1"></span>
                        </div>
                        <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1 shadow-inner">
                            <div id="api-key-bar-${idx}" class="h-full transition-all duration-500 ease-linear rounded-r-full"></div>
                        </div>
                    </div>
                `;
            });
            dropdown.innerHTML = html;
            dropdown.dataset.renderedKeys = renderStateId;
        }

        let readyCount = 0;
        let minRemaining = 999;
        const now = Date.now();
        // Si no hay rotación, anulamos el cooldown en la UI
        const COOLDOWN_SEC = useRotation ? 62 : 0;

        keys.forEach((key, idx) => {
            const lastUsed = this.keyUsageStats[key] || 0;
            
            // Calculamos cuándo estará (o estuvo) lista la llave basándonos en su último uso (tiempo real absoluto)
            const nextAvailable = lastUsed === 0 ? 0 : lastUsed + (COOLDOWN_SEC * 1000);
            const remainingMs = Math.max(0, nextAvailable - now);
            const remainingSec = Math.ceil(remainingMs / 1000);
            const isReady = remainingSec === 0;
            
            if (isReady) readyCount++;
            else if (remainingSec < minRemaining) minRemaining = remainingSec;

            const row = document.getElementById(`api-key-row-${idx}`);
            const statusText = document.getElementById(`api-key-status-${idx}`);
            const bar = document.getElementById(`api-key-bar-${idx}`);

            if (row && statusText && bar) {
                if (isReady) {
                    // LLAVE FRESCA Y LISTA PARA USAR (VERDE)
                    row.className = "px-4 py-3 border-b border-gray-100 flex flex-col gap-1 hover:bg-gray-50 transition-colors bg-green-50/30";
                    statusText.className = "text-green-600 font-bold tracking-widest bg-green-100 px-2 py-0.5 rounded shadow-sm";
                    statusText.innerHTML = useRotation ? "LISTA" : "SIN LÍMITE";
                    bar.className = "h-full bg-green-500 w-full";
                    bar.style.width = "100%";
                } else {
                    // LLAVE ENFRIÁNDOSE O EN COLA (NARANJA)
                    let percent = 100 - Math.min(100, (remainingSec / COOLDOWN_SEC) * 100);
                    if (percent < 0) percent = 0;
                    
                    row.className = "px-4 py-3 border-b border-gray-100 flex flex-col gap-1 hover:bg-gray-50 transition-colors bg-orange-50/30";
                    statusText.className = "text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded shadow-sm flex items-center gap-1";
                    statusText.innerHTML = `<i class="fa-solid fa-clock text-[8px]"></i> ${remainingSec}s`;
                    bar.className = "h-full bg-orange-400 transition-all duration-500 ease-linear rounded-r-full";
                    bar.style.width = `${percent}%`;
                }
            }
        });

        // ACTUALIZACIÓN DEL BOTÓN PRINCIPAL
        const parentBtn = statusBtn.closest('button');
        const icon = parentBtn ? parentBtn.querySelector('i') : null;

        if (parentBtn) {
            let baseClasses = "btn-nordic w-full justify-center flex items-center gap-2 px-4 shadow-sm transition-all duration-300 ";
            
            if (readyCount === 0) {
                // Estado: AGOTADAS (Muestra la que menos tiempo le queda en rojo)
                parentBtn.className = baseClasses + "bg-red-50 text-red-700 border-red-300 hover:bg-red-100";
                statusBtn.innerHTML = `AGOTADAS (${minRemaining}s)`;
                if (icon) icon.className = "fa-solid fa-hourglass-half fa-spin text-red-500";
            } else {
                // Estado: VERDE (En cuanto al menos 1 llave está lista)
                parentBtn.className = baseClasses + "bg-green-50 text-green-700 border-green-300 hover:bg-green-100";
                if (!useRotation) {
                    statusBtn.innerHTML = "MODO ESTÁTICO";
                } else {
                    statusBtn.innerHTML = readyCount === keys.length ? `TODAS LISTAS (${readyCount})` : `LISTAS (${readyCount}/${keys.length})`;
                }
                if (icon) icon.className = "fa-solid fa-circle-check text-green-600";
            }
        }
    },

    async generateVideo(prompt, width, height, apiKeyString, model = 'grok-imagine-video') {
        // Bloqueo ultra-corto para evitar dobles clics accidentales literales del usuario
        if (Date.now() - this._globalLock < 500) {
            await new Promise(r => setTimeout(r, 500));
        }
        this._globalLock = Date.now();

        if (!apiKeyString) throw new Error("Falta API Key.");
        let keys = apiKeyString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        if (keys.length === 0) throw new Error("No hay API Keys válidas.");

        // Verificamos el estado del switch para esta ejecución
        const rotationSwitch = document.getElementById('airforce-rotation-switch');
        const useRotation = rotationSwitch ? rotationSwitch.checked : true;

        if (!useRotation) {
            // Si no hay rotación, forzamos usar solo la primera llave
            keys = [keys[0]];
        }

        const MAX_ATTEMPTS = useRotation ? 6 : 3;      
        const RETRY_DELAY = 9000;    
        // Si no hay rotación, el cooldown es 0 para ignorar el límite de tiempo
        const COOLDOWN_SEC = useRotation ? 62 : 0;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            
            let currentKey = null;

            // Bucle Atómico: Busca la llave que ya esté lista y haya pasado los 62s fijos.
            // Si ninguna lo ha hecho, espera el tiempo residual hasta los 62s y vuelve a buscar.
            while (!currentKey) {
                // ORDENACIÓN: Buscamos la llave más fresca (la que más tiempo lleve sin usarse)
                keys.sort((a, b) => (this.keyUsageStats[a] || 0) - (this.keyUsageStats[b] || 0));
                
                const candidateKey = keys[0];
                const lastUsed = this.keyUsageStats[candidateKey] || 0;
                const elapsed = Date.now() - lastUsed;

                if (elapsed >= (COOLDOWN_SEC * 1000)) {
                    // ¡Encontrada! Asignamos el tiempo AHORA de forma atómica para que nadie más se la quite
                    this.keyUsageStats[candidateKey] = Date.now();
                    currentKey = candidateKey;
                } else {
                    // Calculamos exactamente lo que le falta a la mejor llave para los 62s
                    const timeToWaitMs = (COOLDOWN_SEC * 1000) - elapsed;
                    const sub = document.getElementById('loading-subtitle');
                    if (sub) sub.innerText = `Enfriando API Key (${Math.ceil(timeToWaitMs/1000)}s)...`;
                    
                    this.updateMonitorUI();
                    
                    // Esperamos esos milisegundos más un pequeño margen y el bucle vuelve a comprobar
                    await new Promise(r => setTimeout(r, timeToWaitMs + 100));
                }
            }

            this.updateMonitorUI();

            try {
                const resultBlob = await this.executeCall(currentKey, prompt, width, height, model);
                return resultBlob;
            } catch (error) {
                if (attempt === MAX_ATTEMPTS - 1) {
                    throw new Error(`Airforce Exhausto tras varios intentos: ${error.message}`);
                }
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
    },

    async executeCall(key, prompt, width, height, model) {
        // 1. Limpieza absoluta de la llave (elimina espacios invisibles, saltos de línea y "Bearer " duplicados)
        let cleanKey = key.trim().replace(/^Bearer\s+/i, '');

        const payload = {
            model: model, 
            prompt: prompt,
            size: `${width}x${height}`,
            n: 1,
            response_format: "url"
        };

        console.log(`[DEBUG PROFUNDO] Enviando a Airforce -> Model: ${model} | Key (limpia): ...${cleanKey.slice(-6)} | Size: ${width}x${height}`);

        const response = await fetch(this.baseUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${cleanKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        // 2. Leemos la respuesta en texto plano ANTES de parsearla para ver qué nos oculta el proxy
        const rawText = await response.text();
        console.log(`[DEBUG PROFUNDO] Respuesta cruda del servidor:`, rawText);

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            throw new Error(`Respuesta no-JSON de Airforce. HTTP ${response.status}: ${rawText.substring(0,100)}`);
        }

        // 3. Manejo del error
        if (data.error) {
            const errMsg = data.error.message || JSON.stringify(data.error);
            throw new Error(`[Airforce Backend Error]: ${errMsg}`); 
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        let videoUrl = null;
        if (data.data && data.data[0]?.url) videoUrl = data.data[0].url;
        else if (data.url) videoUrl = data.url;
        else if (data.output?.url) videoUrl = data.output.url;
        else if (data.video) videoUrl = data.video;

        if (!videoUrl) {
            throw new Error("La API respondió OK pero no devolvió URL de video.");
        }

        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) throw new Error("URL de video inaccesible (404/403).");

        return await videoResponse.blob();
    }
};

// =========================================================================
// BUCLE GLOBAL INDESTRUCTIBLE
// =========================================================================
// Este intervalo se ejecuta de forma autónoma cada segundo exacto,
// asegurando que la UI cuente hacia atrás fluidamente.
setInterval(() => {
    try {
        if (typeof AirforceBridge !== 'undefined' && document.getElementById('apikey-monitor-status')) {
            AirforceBridge.updateMonitorUI();
        }
    } catch(e) {
        console.warn("Error silencioso en el monitor de Airforce:", e);
    }
}, 1000);

// Para compatibilidad hacia atrás si hay llamadas residuales a initMonitor()
AirforceBridge.initMonitor = () => { AirforceBridge.updateMonitorUI(); };