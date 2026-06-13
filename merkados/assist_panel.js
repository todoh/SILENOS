// assist_panel.js
// --- PANEL LATERAL DERECHO PARA ASISTENCIA IA, TAREAS EN PARALELO Y CONFIGURACIÓN RPG ---

const ASSIST_PANEL_W = 380;
const COMFY_URL = "http://127.0.0.1:8188";

function initAssistPanel() {
    const html = `
    <aside id="assist-panel" class="hidden fixed top-0 right-0 h-screen bg-white  z-30 flex flex-col" style="width:${ASSIST_PANEL_W}px">
        <header class="border-b border-black p-3 flex justify-between items-center shrink-0">
            <h2 class="text-[10px] uppercase tracking-widest font-bold" id="assist-title">Asistencia IA</h2>
            <div class="flex gap-1">
                <button onclick="toggleAssistPanel()" id="assist-minimize" class="text-[10px] uppercase border border-black px-2 py-0.5 hover:bg-black hover:text-white">−</button>
                <button onclick="closeAssistPanel()" class="text-[10px] uppercase border border-black px-2 py-0.5 hover:bg-black hover:text-white">✕</button>
            </div>
        </header>

        <div class="flex border-b border-black shrink-0">
            <button id="tab-config" onclick="switchAssistTab('config')" class="flex-1 text-[8px] uppercase font-bold py-2 hover:bg-gray-100 border-r border-black">Config</button>
            <button id="tab-agent" onclick="switchAssistTab('agent')" class="flex-1 text-[8px] uppercase font-bold py-2 bg-black text-white border-r border-black">Agente</button>
            <button id="tab-rpg" onclick="switchAssistTab('rpg')" class="flex-1 text-[8px] uppercase font-bold py-2 hover:bg-gray-100 border-r border-black">RPG</button>
            <button id="tab-media" onclick="switchAssistTab('media')" class="flex-1 text-[8px] uppercase font-bold py-2 hover:bg-gray-100 border-r border-black">ComfyUI</button>
            <button id="tab-canon" onclick="switchAssistTab('canon')" class="flex-1 text-[8px] uppercase font-bold py-2 hover:bg-gray-100 border-r border-black">Canon</button>
            <button id="tab-tasks" onclick="switchAssistTab('tasks')" class="flex-1 text-[8px] uppercase font-bold py-2 hover:bg-gray-100">Tareas (<span id="task-count">0</span>)</button>
        </div>

        <div id="assist-tab-config" class="hidden flex-grow flex flex-col min-h-0 overflow-hidden">
            <section class="border-b border-black p-3 shrink-0 bg-gray-50 space-y-2">
                <p class="text-[8px] uppercase opacity-50 tracking-wider">Credenciales de Motor Híbrido</p>
                <div>
                    <label class="text-[8px] uppercase font-bold block mb-0.5">Modo de Vista de Red</label>
                    <select id="koreh-api-mode" onchange="handleApiModeChange(this.value)" class="w-full text-[11px] border border-black p-1.5 outline-none bg-white font-mono">
                        <option value="local">Modo Mixto / Local (Ollama Habilitado)</option>
                        <option value="online">Online Estricto (Solo Nube)</option>
                    </select>
                </div>
                <div>
                    <label class="text-[8px] uppercase font-bold block mb-0.5">Google Gemini API Key</label>
                    <input type="password" id="koreh-gemini-key" value="${agentState.geminiApiKey}" oninput="handleGeminiKeyChange(this.value)" placeholder="AIzaSy..." class="w-full text-[11px] border border-black p-1.5 outline-none font-mono">
                </div>
                <div>
                    <label class="text-[8px] uppercase font-bold block mb-0.5">Pollinations API Key (Opcional)</label>
                    <input type="password" id="koreh-pollinations-key" value="${agentState.pollinationsApiKey || ''}" oninput="handlePollinationsKeyChange(this.value)" placeholder="Key de autenticación..." class="w-full text-[11px] border border-black p-1.5 outline-none font-mono">
                </div>
            </section>

            <section class="border-b border-black p-3 shrink-0">
                <p class="text-[8px] uppercase opacity-50 tracking-wider mb-2">Modelos Asignados por Tarea</p>
                <div class="space-y-2">
                    <div>
                        <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Arquitecto / Pensador (Estructura JSON)</label>
                        <div class="flex gap-1 items-center w-full">
                            <select id="assist-thinker" class="w-full text-[11px] border border-black p-1.5 outline-none bg-white font-mono block"></select>
                        </div>
                    </div>
                    <div>
                        <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Escritor / Prosa (Rellenado Lírico)</label>
                        <div class="flex gap-1 items-center w-full">
                            <select id="assist-writer" class="w-full text-[11px] border border-black p-1.5 outline-none bg-white font-mono block"></select>
                        </div>
                    </div>
                </div>
            </section>

            <div id="assist-body" class="flex-grow overflow-y-auto p-3 space-y-3 min-h-0"></div>

            <footer class="border-t border-black p-3 shrink-0 space-y-2">
                <div id="assist-status" class="text-[9px] uppercase font-bold text-center min-h-[14px] opacity-60">Listo.</div>
                <div class="flex gap-2">
                    <button id="assist-primary" class="w-full text-[10px] uppercase font-bold bg-black text-white border border-black px-3 py-2 hover:bg-gray-800 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">Acción</button>
                </div>
            </footer>
        </div>

        <div id="assist-tab-agent" class="hidden flex-grow flex flex-col min-h-0 overflow-y-auto p-3 space-y-3 bg-white">
            <p class="text-[8px] uppercase opacity-50 tracking-wider">Generador Estructural Iterativo Híbrido</p>
            
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Arquitecto (Nube/Gemini)</label>
                    <select id="panel-agent-thinker" class="w-full text-xs border border-black p-1.5 outline-none font-mono bg-white block"></select>
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Escritor (Local/Ollama)</label>
                    <select id="panel-agent-writer" class="w-full text-xs border border-black p-1.5 outline-none font-mono bg-white block"></select>
                </div>
            </div>

            <div>
                <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Premisa Global del Universo</label>
                <textarea id="panel-agent-theme" class="w-full text-xs border border-black p-2 outline-none resize-none h-16 font-mono" placeholder="Ej: Una expedición minera atrapada en una megaestructura cuántica..."></textarea>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Nodos Totales (Máx 370)</label>
                    <input type="number" id="panel-agent-depth" value="10" min="4" max="370" class="w-full text-xs border border-black p-1.5 outline-none text-center font-mono">
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Ramificación</label>
                    <input type="text" value="DOBLE EXPANSIÓN (Fijo)" class="w-full text-[8px] border border-black p-2 outline-none text-center font-bold bg-gray-100 select-none" disabled>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Protagonista</label>
                    <input type="text" id="panel-agent-protagonist" value="El Navegante" class="w-full text-xs border border-black p-1.5 outline-none font-mono">
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Persp. Narrativa</label>
                    <select id="panel-agent-pov" class="w-full text-xs border border-black p-1.5 outline-none font-mono bg-white">
                        <option value="2">Segunda (Tú)</option>
                        <option value="1">Primera (Yo)</option>
                        <option value="3">Tercera persona</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Tono y Atmósfera</label>
                <input type="text" id="panel-agent-tone" value="Brutalista, opresivo, existencial" class="w-full text-xs border border-black p-2 outline-none font-mono">
            </div>

            <div>
                <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Reglas Clínicas / Exclusiones</label>
                <input type="text" id="panel-agent-rules" placeholder="Ej: Sin magia de fantasía clásica. Evita clichés." class="w-full text-xs border border-black p-2 outline-none font-mono">
            </div>

            <div id="panel-agent-status" class="text-[9px] uppercase font-bold text-center py-1 bg-gray-50 border border-dashed border-black/30 opacity-70">Agente Listo.</div>

            <button onclick="startAgentGenerationFromPanel()" id="panel-agent-go-btn" class="w-full text-[10px] uppercase font-bold bg-black text-white border border-black p-2.5 hover:bg-gray-800 shadow-[3px_3px_0px_rgba(0,0,0,1)] transition">
                ⚡ Desplegar Red Completa en Paralelo
            </button>
            <button onclick="abortAgent()" id="panel-agent-abort-btn" class="hidden w-full text-[10px] uppercase font-bold border border-red-600 text-red-600 p-2 hover:bg-red-600 hover:text-white transition">
                Abortar Simulación
            </button>

            <div class="border-t border-black mt-4 pt-3 space-y-2 bg-gray-50 p-2 border shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <p class="text-[8px] uppercase font-bold tracking-wider opacity-60">Optimización de Estilo en Serie</p>
                <div>
                    <label class="text-[8px] uppercase font-bold block mb-0.5">Extensión Requerida</label>
                    <select id="panel-serial-rw-length" class="w-full text-xs border border-black p-1.5 outline-none bg-white font-mono">
                        <option value="corto">Corto (2-3 frases quirúrgicas)</option>
                        <option value="medio" selected>Medio (1 párrafo denso)</option>
                        <option value="largo">Largo (2-3 párrafos descriptivos)</option>
                    </select>
                </div>
                <div>
                    <label class="text-[8px] uppercase font-bold block mb-0.5">Directrices narrativas unificadas</label>
                    <input type="text" id="panel-serial-rw-tone" value="Hazlo crudo, gótico y en tiempo presente." class="w-full text-xs border border-black p-1.5 outline-none font-mono">
                </div>
                <button onclick="executeSerialRewriteFromPanel()" class="w-full text-[9px] uppercase font-bold bg-zinc-900 text-white p-2 hover:bg-zinc-700 transition">
                    ↻ Reescribir Obra Completa (Secuencial)
                </button>
            </div>
        </div>

        <div id="assist-tab-rpg" class="hidden flex-grow flex flex-col min-h-0 overflow-y-auto p-3 space-y-4 bg-white">
            <p class="text-[8px] uppercase opacity-50 tracking-wider">Parámetros Globales RPG Iniciales</p>
            <div class="grid grid-cols-3 gap-2">
                <div>
                    <label class="text-[9px] uppercase font-bold block mb-1">Vida Inicial</label>
                    <input type="number" id="rpg-init-health" class="w-full text-xs border border-black p-1.5 font-mono outline-none text-center" oninput="saveRPGGlobal()">
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold block mb-1">Vida Máxima</label>
                    <input type="number" id="rpg-init-maxhealth" class="w-full text-xs border border-black p-1.5 font-mono outline-none text-center" oninput="saveRPGGlobal()">
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold block mb-1">Oro Inicial</label>
                    <input type="number" id="rpg-init-gold" class="w-full text-xs border border-black p-1.5 font-mono outline-none text-center" oninput="saveRPGGlobal()">
                </div>
            </div>

            <div class="border-t border-black pt-3 flex flex-col flex-grow min-h-0">
                <p class="text-[8px] uppercase opacity-50 tracking-wider mb-2">Base de Datos de Objetos del Sistema</p>
                <div class="flex gap-1 mb-2">
                    <input type="text" id="rpg-new-item" placeholder="ID u Objeto (Ej: LLAVE_PLATA)" class="flex-1 text-xs border border-black px-2 py-1 outline-none font-mono">
                    <button onclick="addGlobalItemSystem()" class="text-[10px] uppercase bg-black text-white px-3 font-bold border border-black hover:bg-gray-800">Añadir</button>
                </div>
                <ul id="rpg-global-items-list" class="flex-grow overflow-y-auto border border-black bg-gray-50 p-2 space-y-1 font-mono text-xs"></ul>
            </div>
        </div>

        <div id="assist-tab-media" class="hidden flex-grow flex flex-col min-h-0 overflow-y-auto p-3 space-y-3 bg-white">
            <p class="text-[8px] uppercase opacity-50 tracking-wider">Configuración Central de Ilustraciones</p>
            <div>
                <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Motor de Generación Visual</label>
                <select id="media-engine-mode" onchange="handleMediaModeChange(this.value)" class="w-full text-[11px] border border-black p-1.5 outline-none bg-white font-mono">
                    <option value="local">ComfyUI Local (Puerto 8188)</option>
                    <option value="pollinations">Pollinations AI Cloud</option>
                </select>
            </div>
            
            <div id="comfy-local-settings" class="space-y-3">
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Modelo Prompter IA</label>
                    <select id="comfy-prompt-model" class="w-full text-[11px] border border-black p-1.5 outline-none bg-white font-mono block"></select>
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Modelo (Checkpoint)</label>
                    <input type="text" id="comfy-model" value="dreamshaperXL_lightningDPMSDE.safetensors" class="w-full text-[11px] border border-black p-1.5 outline-none">
                </div>
            </div>

            <div id="pollinations-cloud-settings" class="space-y-3 hidden">
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Modelo Cloud (Pollinations)</label>
                    <select id="pollinations-model" class="w-full text-[11px] border border-black p-1.5 outline-none bg-white font-mono">
                        <option value="flux">Flux Schnell (Estándar)</option>
                        <option value="zimage">Z-Image Turbo</option>
                        <option value="klein">FLUX.2 Klein 4B</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Prompt Negativo Global</label>
                <textarea id="comfy-neg-prompt" class="w-full text-[11px] border border-black p-1.5 outline-none h-12">bad anatomy, blurry, watermark, worst quality, messy</textarea>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Ancho</label>
                    <select id="comfy-width" class="w-full text-[11px] border border-black p-1.5 outline-none bg-white">
                        <option value="512">512</option>
                        <option value="768">768</option>        
                        <option value="1024">1024</option>
                        <option value="1280" selected>1280</option>
                        <option value="1600">1600</option>
                    </select>
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Alto</label>
                    <select id="comfy-height" class="w-full text-[11px] border border-black p-1.5 outline-none bg-white">
                        <option value="512">512</option> 
                        <option value="720">720</option>
                        <option value="768">768</option>
                        <option value="900" selected>900</option>
                        <option value="1024">1024</option>
                    </select>
                </div>
            </div>
            <button id="media-diagnose-btn" onclick="diagnoseComfyBackend()" class="w-full text-[9px] uppercase border border-red-800 text-red-800 p-2 hover:bg-red-800 hover:text-white transition">Diagnosticar ComfyUI</button>
        </div>

        <div id="assist-tab-canon" class="hidden flex-grow flex flex-col min-h-0 overflow-y-auto p-3 space-y-3 bg-white">
            <p class="text-[8px] uppercase opacity-50 tracking-wider">Dirección Estilística y Lore del Universo (Canon Visual)</p>
            <div class="shrink-0">
                <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Estilo Visual General de la Obra</label>
                <input type="text" id="panel-style-text" oninput="saveCanonFromPanel()" class="w-full text-xs border border-black p-2 outline-none font-mono" placeholder="Ej: tarantino style, gritty 90s cinema...">
            </div>
            <div class="flex-grow flex flex-col min-h-0">
                <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Entidades Registradas</label>
                <textarea id="panel-canon-text" oninput="saveCanonFromPanel()" class="w-full flex-grow text-xs font-mono border border-black p-2 outline-none resize-none min-h-[240px]" placeholder="Ej:&#10;@LOLA: 1girl, speleologist..."></textarea>
            </div>
        </div>

        <div id="tab-tasks-panel" class="hidden flex-grow overflow-y-auto p-3 bg-gray-50 flex-col min-h-0">
            <div id="assist-tasks-list" class="space-y-2"></div>
        </div>
    </aside>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    
    setTimeout(() => {
        const selMode = document.getElementById('koreh-api-mode');
        if (selMode) selMode.value = agentState.apiMode;
        
        const mediaEngine = document.getElementById('media-engine-mode');
        if (mediaEngine) {
            mediaEngine.value = agentState.mediaMode || 'local';
            handleMediaModeChange(mediaEngine.value);
        }
        
        fetchOllamaModels();
    }, 50);
}

/**
 * NUEVA PIPELINE: REESCRITURA SECUENCIAL EN SERIE PRESERVANDO EL ARROBA (@) DEL CANON
 */
async function executeSerialRewriteFromPanel() {
    if (!data || !data.nodes || data.nodes.length === 0) {
        alert("El grafo está vacío. No hay nodos para optimizar.");
        return;
    }

    const writerModel = document.getElementById('panel-agent-writer')?.value || document.getElementById('assist-writer')?.value;
    if (!writerModel) {
        alert("Por favor, selecciona un modelo de Escritura en el panel antes de reescribir.");
        return;
    }

    const rwLength = document.getElementById('panel-serial-rw-length').value;
    const rwTone = document.getElementById('panel-serial-rw-tone').value.trim();
    const statusEl = document.getElementById('panel-agent-status');

    if (typeof switchAssistTab === 'function') switchAssistTab('tasks');

    // 1. Calcular orden cronológico topológico puro usando la función bfsOrder nativa de agent_network.js
    let sortedIds = [];
    if (typeof bfsOrder === 'function') {
        sortedIds = bfsOrder(data);
    } else {
        sortedIds = data.nodes.map(n => n.id);
    }

    const lenMap = { 
        corto: '2-3 frases quirúrgicas e impactantes', 
        medio: 'un único párrafo denso, literario y maduro de 5-8 líneas', 
        largo: 'dos párrafos descriptivos completos y altamente inmersivos' 
    };

    if (statusEl) statusEl.innerText = `Iniciando reescritura de ${sortedIds.length} nodos...`;

    // 2. Iteración secuencial controlada nodo por nodo para evitar colapsar hilos de inferencia local
    for (let i = 0; i < sortedIds.length; i++) {
        const currentId = sortedIds[i];
        const node = data.nodes.find(n => n.id === currentId);
        if (!node || !node.content || !node.content.trim()) continue;

        if (statusEl) statusEl.innerText = `Reescribiendo: ${node.title} (${i + 1}/${sortedIds.length})`;

        const task = typeof createTask === 'function' ? createTask(node.id, 'Reescribir Serie', `Estilizando: ${node.title}`) : null;
        if (task) updateTask(node.id, 20, 'Analizando Canon estructural...');

        // 3. Extraer y rastrear tokens con @ (Ej: @LOLA, @MONTAÑA) para exigir al prompt que los conserve intactos
        const entityRegex = /@\w+/g;
        const entitiesFound = node.content.match(entityRegex) || [];
        const uniqueEntities = Array.from(new Set(entitiesFound));

        let canonMandate = "";
        if (uniqueEntities.length > 0) {
            canonMandate = `\nMANDATO CRÍTICO DE CANON ONTOLÓGICO:\nEl texto actual contiene las siguientes palabras clave o entidades del sistema: ${uniqueEntities.join(', ')}.\n¡DEBES MANTENER E INYECTAR ESTOS COMPONENTES EXACTAMENTE IGUAL, PRESERVANDO EL CARÁCTER ARROBA (@) PEGADO A LA ENTIDAD EN LA MISMA UBICACIÓN CONCEPTUAL! No alteres su sintaxis ni elimines el símbolo @.`;
        }

        const localCtx = typeof buildLocalContext === 'function' ? buildLocalContext(node.id) : null;
        const pathText = localCtx ? localCtx.mainPath.slice(0, -1).map(p => `[${p.title}] ${(p.content || '').substring(0, 80)}`).join(' → ') : '';

        const prompt = `Reescribe estilísticamente el fragmento del librojuego interactivo basándote en su prosa actual, incrementando la madurez léxica sin alterar los hechos reales acontecidos.

TÍTULO DEL PASO: ${node.title}
PROSA ACTUAL A OPTIMIZAR:\n${node.content}

ÓRDENES DE ESTILO DIRECTAS DEL AUTOR:\n${rwTone || 'Mejorar fluidez, madurez y ritmo oracional.'}
LONGITUD EXIGIDA: ${lenMap[rwLength]}
${canonMandate}

CONTEXTO CRONOLÓGICO PREVIO DE NAVEGACIÓN:
${pathText || '(Nodo Inicial u Origen de la Obra)'}

Devuelve EXCLUSIVAMENTE la prosa corregida. Está terminantemente prohibido incluir títulos, metadatos, introducciones o sugerencias de opciones de decisión al final.`;

        const signal = task ? task.controller.signal : null;

        try {
            // Llamada maestra síncrona/bloqueante en el bucle para preservar el hilo ordenado
            const responseOut = await ollamaGenerate(writerModel, prompt, false, null, signal);
            
            if (responseOut && responseOut.trim()) {
                node.content = responseOut.trim();
                
                // Si el nodo modificado coincide con el editor activo en pantalla, actualizamos el text-area en vivo
                if (window.selectedNode && window.selectedNode.id === node.id) {
                    const cEl = document.getElementById('node-content');
                    if (cEl) cEl.value = node.content;
                }
                
                if (typeof saveLogic === 'function') await saveLogic();
            }

            if (task) {
                updateTask(node.id, 100, 'Completado');
                setTimeout(() => finishTask(node.id), 500);
            }
        } catch (e) {
            console.error(`[REESCRITURA SERIE] Fallo en nodo ${node.id}:`, e);
            if (task) {
                updateTask(node.id, 0, 'Fallo de inferencia');
                setTimeout(() => finishTask(node.id), 1000);
            }
        }
    }

    if (statusEl) statusEl.innerText = "Agente Listo.";
    alert(`Reescritura en serie finalizada con éxito. Se procesó la obra completa (${sortedIds.length} nodos).`);
}

function saveRPGGlobal() {
    if (typeof data === 'undefined') return;
    data.initialMetrics.health = parseInt(document.getElementById('rpg-init-health').value, 10) || 10;
    data.initialMetrics.maxHealth = parseInt(document.getElementById('rpg-init-maxhealth').value, 10) || 10;
    data.initialMetrics.gold = parseInt(document.getElementById('rpg-init-gold').value, 10) || 0;
    saveLogic();
}

function addGlobalItemSystem() {
    const input = document.getElementById('rpg-new-item');
    const val = input.value.trim().toUpperCase();
    if (!val || typeof data === 'undefined') return;
    if (!data.globalItems.includes(val)) {
        data.globalItems.push(val);
        saveLogic();
        renderRPGGlobalList();
    }
    input.value = '';
}

function removeGlobalItemSystem(item) {
    if (typeof data === 'undefined') return;
    data.globalItems = data.globalItems.filter(i => i !== item);
    saveLogic();
    renderRPGGlobalList();
}

function removeGlobalItemSystem(item) {
    if (typeof data === 'undefined') return;
    data.globalItems = data.globalItems.filter(i => i !== item);
    saveLogic();
    renderRPGGlobalList();
}

function renderRPGGlobalList() {
    const list = document.getElementById('rpg-global-items-list');
    if (!list || typeof data === 'undefined') return;
    list.innerHTML = '';
    data.globalItems.forEach(item => {
        list.innerHTML += `
            <li class="flex justify-between items-center bg-white p-1 border border-black mb-1">
                <span>${item}</span>
                <button onclick="removeGlobalItemSystem('${item}')" class="text-red-500 hover:underline font-bold px-1 text-[10px]">✕</button>
            </li>`;
    });
}

function syncRPGGlobalToPanel() {
    if (typeof data === 'undefined') return;
    const h = document.getElementById('rpg-init-health');
    const mh = document.getElementById('rpg-init-maxhealth');
    const g = document.getElementById('rpg-init-gold');
    if(h) h.value = data.initialMetrics.health;
    if(mh) mh.value = data.initialMetrics.maxHealth;
    if(g) g.value = data.initialMetrics.gold;
    renderRPGGlobalList();
}

function handleApiModeChange(val) {
    agentState.apiMode = val;
    localStorage.setItem('koreh_api_mode', val);
    fetchOllamaModels();
}

function handleGeminiKeyChange(val) {
    agentState.geminiApiKey = val.trim();
    localStorage.setItem('koreh_gemini_key', agentState.geminiApiKey);
}

function handlePollinationsKeyChange(val) {
    agentState.pollinationsApiKey = val.trim();
    localStorage.setItem('koreh_pollinations_key', agentState.pollinationsApiKey);
}

function handleMediaModeChange(val) {
    agentState.mediaMode = val;
    localStorage.setItem('koreh_media_mode', val);
    
    const localSection = document.getElementById('comfy-local-settings');
    const cloudSection = document.getElementById('pollinations-cloud-settings');
    const diagnoseBtn = document.getElementById('media-diagnose-btn');
    
    if (val === 'pollinations') {
        if (localSection) localSection.classList.add('hidden');
        if (cloudSection) cloudSection.classList.remove('hidden');
        if (diagnoseBtn) diagnoseBtn.classList.add('hidden');
    } else {
        if (localSection) localSection.className = localSection.className.replace('hidden', '').trim();
        if (cloudSection) cloudSection.classList.add('hidden');
        if (diagnoseBtn) diagnoseBtn.className = diagnoseBtn.className.replace('hidden', '').trim();
    }
}

function openAssistPanel(title) {
    document.getElementById('assist-panel').classList.remove('hidden');
    document.getElementById('assist-title').textContent = title;
    document.getElementById('assist-status').textContent = 'Listo.';
    switchAssistTab('config');

    window.assistPanelOffset = ASSIST_PANEL_W;
    if (typeof resize === 'function') resize();
    populateAssistModels();
    syncCanonToPanel();
    syncRPGGlobalToPanel();
}

function closeAssistPanel() {
    document.getElementById('assist-panel').classList.add('hidden');
    window.assistPanelOffset = 0;
    if (typeof resize === 'function') resize();
}

let assistMinimized = false;
function toggleAssistPanel() {
    assistMinimized = !assistMinimized;
    const panel = document.getElementById('assist-panel');
    if (assistMinimized) {
        panel.style.width = '40px';
        document.querySelectorAll('#assist-panel > *:not(header)').forEach(el => el.style.display = 'none');
        document.getElementById('assist-title').style.display = 'none';
        window.assistPanelOffset = 40;
        document.getElementById('assist-minimize').textContent = '+';
    } else {
        panel.style.width = ASSIST_PANEL_W + 'px';
        document.querySelectorAll('#assist-panel > *').forEach(el => el.style.display = '');
        document.getElementById('assist-title').style.display = '';
        window.assistPanelOffset = ASSIST_PANEL_W;
        document.getElementById('assist-minimize').textContent = '−';
    }
    if (typeof resize === 'function') resize();
}

function switchAssistTab(tab) {
    const tConfig = document.getElementById('assist-tab-config');
    const tAgent = document.getElementById('assist-tab-agent');
    const tRPG = document.getElementById('assist-tab-rpg');
    const tMedia = document.getElementById('assist-tab-media');
    const tCanon = document.getElementById('assist-tab-canon');
    const tTasks = document.getElementById('tab-tasks-panel');
    
    const bConfig = document.getElementById('tab-config');
    const bAgent = document.getElementById('tab-agent');
    const bRPG = document.getElementById('tab-rpg');
    const bMedia = document.getElementById('tab-media');
    const bCanon = document.getElementById('tab-canon');
    const bTasks = document.getElementById('tab-tasks');

    if (tConfig) tConfig.classList.add('hidden');
    if (tAgent) tAgent.classList.add('hidden');
    if (tRPG) tRPG.classList.add('hidden');
    if (tMedia) tMedia.classList.add('hidden');
    if (tCanon) tCanon.classList.add('hidden');
    if (tTasks) tTasks.classList.add('hidden');
    
    if (bConfig) bConfig.classList.remove('bg-black', 'text-white');
    if (bAgent) bAgent.classList.remove('bg-black', 'text-white');
    if (bRPG) bRPG.classList.remove('bg-black', 'text-white');
    if (bMedia) bMedia.classList.remove('bg-black', 'text-white');
    if (bCanon) bCanon.classList.remove('bg-black', 'text-white');
    if (bTasks) bTasks.classList.remove('bg-black', 'text-white');

    if (tab === 'config' && tConfig) {
        tConfig.classList.remove('hidden');
        bConfig.classList.add('bg-black', 'text-white');
    } else if (tab === 'agent' && tAgent) {
        tAgent.classList.remove('hidden');
        bAgent.classList.add('bg-black', 'text-white');
    } else if (tab === 'rpg' && tRPG) {
        tRPG.classList.remove('hidden');
        bRPG.classList.add('bg-black', 'text-white');
        syncRPGGlobalToPanel();
    } else if (tab === 'media' && tMedia) {
        tMedia.classList.remove('hidden');
        bMedia.classList.add('bg-black', 'text-white');
    } else if (tab === 'canon' && tCanon) {
        tCanon.classList.remove('hidden');
        bCanon.classList.add('bg-black', 'text-white');
        syncCanonToPanel();
    } else if (tab === 'tasks' && tTasks) {
        tTasks.classList.remove('hidden');
        bTasks.classList.add('bg-black', 'text-white');
        renderTasksPanel();
    }
}

function syncCanonToPanel() {
    const txtArea = document.getElementById('panel-canon-text');
    const styleInput = document.getElementById('panel-style-text');
    if (typeof data === 'undefined') return;
    
    if (styleInput) styleInput.value = data.visualStyle || "";

    if (txtArea) {
        if (typeof data.visualBible === 'object' && data.visualBible !== null) {
            let compiled = "";
            Object.keys(data.visualBible).forEach(k => {
                if (k !== 'style' && k !== 'camera' && data.visualBible[k]) {
                    compiled += data.visualBible[k] + "\n";
                }
            });
            txtArea.value = compiled.trim();
        } else {
            txtArea.value = data.visualBible || "";
        }
    }
}

function saveCanonFromPanel() {
    const txtArea = document.getElementById('panel-canon-text');
    const styleInput = document.getElementById('panel-style-text');
    if (typeof data === 'undefined') return;
    
    if (txtArea) data.visualBible = txtArea.value;
    if (styleInput) data.visualStyle = styleInput.value;
    
    if (typeof saveLogic === 'function') saveLogic();
}

async function diagnoseComfyBackend() {
    setAssistStatus("Consultando ComfyUI...");
    try {
        const response = await fetch(`${COMFY_URL}/object_info`);
        if (!response.ok) throw new Error();
        alert("DIAGNÓSTICO COMPLETADO: Backend de ComfyUI en línea.");
        setAssistStatus("ComfyUI en línea.");
    } catch(e) {
        alert("ERROR: No se detecta ComfyUI en el puerto 8188");
        setAssistStatus("Error de conexión ComfyUI", true);
    }
}

function renderTasksPanel() {
    const container = document.getElementById('assist-tasks-list');
    const countSpan = document.getElementById('task-count');
    if (countSpan) countSpan.textContent = activeTasks.size;

    if (!container) return;

    if (activeTasks.size === 0) {
        container.innerHTML = '<div class="text-[9px] uppercase opacity-40 text-center p-4">No hay tareas generativas en curso</div>';
        return;
    }

    let html = '';
    for (const [nodeId, task] of activeTasks.entries()) {
        const n = data.nodes.find(nd => nd.id === nodeId);
        const focusTitle = n ? n.title : nodeId;
        html += `
        <div class="  p-2 mb-2 bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <div class="flex justify-between items-center mb-1">
                <span class="text-[9px] font-bold uppercase truncate pr-2" title="${focusTitle}">
                    [${task.type}] ${task.title}
                </span>
                <button onclick="abortTask('${nodeId}')" class="text-[8px] uppercase font-bold border border-red-500 text-red-500 px-1.5 py-0.5 hover:bg-red-500 hover:text-white transition">✕</button>
            </div>
            <div class="flex justify-between items-center mb-1">
                <div class="text-[8px] uppercase opacity-60 truncate">${task.status}</div>
            </div>
            <div class="w-full h-1 bg-gray-200">
                <div class="h-full bg-black transition-all duration-300" style="width:${task.progress}%"></div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

function populateAssistModels() {
    if (!agentState?.models?.length) return;
    populateSelectorsWithModels(agentState.models);
}

function setAssistStatus(msg, isError = false) {
    const el = document.getElementById('assist-status');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('text-red-500', isError);
}

function assistSection(title, content) {
    return `<section class="  bg-gray-50">
        <header class="text-[8px] uppercase tracking-wider font-bold   px-2 py-1 bg-white">${title}</header>
        <div class="p-2 text-[11px] space-y-1">${content}</div>
    </section>`;
}

function assistField(label, id, value = '', placeholder = '', textarea = false) {
    const safeVal = String(value).replace(/"/g, '&quot;');
    if (textarea) {
        return `<div>
            <label class="text-[8px] uppercase opacity-60 block mb-0.5">${label}</label>
            <textarea id="${id}" class="w-full text-[11px]   p-1.5 outline-none resize-none" rows="3" placeholder="${placeholder}">${value}</textarea>
        </div>`;
    }
    return `<div>
        <label class="text-[8px] uppercase opacity-60 block mb-0.5">${label}</label>
        <input id="${id}" type="text" value="${safeVal}" placeholder="${placeholder}" class="w-full text-[11px]   p-1.5 outline-none">
    </div>`;
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initAssistPanel, 400));