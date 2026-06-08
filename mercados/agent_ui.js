// agent_ui.js
// --- AGENTE OLLAMA: INTERFAZ DE USUARIO (MODAL Y PANEL LATERAL) ---

function initAgentUI() {
    const btnContainer = document.querySelector('.flex.flex-col.gap-2');
    if (btnContainer) {
        btnContainer.insertAdjacentHTML('beforeend', `
            <button onclick="openAgentModal()" class="text-[10px] uppercase border border-black p-2 bg-black text-white hover:bg-gray-800 transition mt-4 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                IA · Modal Generador
            </button>
        `);
    }

    const modalHTML = `
    <div id="agent-modal" class="hidden fixed inset-0 bg-white/90 z-50 flex items-center justify-center backdrop-blur-sm">
        <div class="bg-white border border-black w-[680px] max-h-[92vh] overflow-y-auto p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col">
            <h2 class="text-xs font-bold tracking-widest uppercase mb-4 border-b border-black pb-2">Agente Creador de Librojuegos</h2>

            <div class="p-3 bg-gray-50 border border-black mb-4 grid grid-cols-2 gap-3 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Servidor / Modo de Motor</label>
                    <select id="modal-koreh-api-mode" onchange="handleApiModeChange(this.value); document.getElementById('koreh-api-mode').value=this.value;" class="w-full text-xs border border-black p-2 outline-none bg-white font-mono">
                        <option value="local">Local (Ollama @ 127.0.0.1)</option>
                        <option value="online">Online (Gemini Cloud API)</option>
                    </select>
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-70 block mb-1">Google Gemini API Key</label>
                    <input id="modal-koreh-gemini-key" type="password" value="${agentState.geminiApiKey || ''}" oninput="handleGeminiKeyChange(this.value); document.getElementById('koreh-gemini-key').value=this.value;" placeholder="AIzaSy..." class="w-full text-xs border border-black p-2 outline-none font-mono">
                </div>
            </div>

            <div class="space-y-3 mb-4">
                <div class="flex gap-3">
                    <div class="flex-1">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Arquitecto (estructura)</label>
                        <select id="agent-strong-model" class="w-full text-xs border border-black p-2 outline-none"></select>
                    </div>
                    <div class="flex-1">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Escritor (prosa)</label>
                        <select id="agent-fast-model" class="w-full text-xs border border-black p-2 outline-none"></select>
                    </div>
                </div>

                <div>
                    <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Premisa / Sinopsis</label>
                    <textarea id="agent-theme" class="w-full text-xs border border-black p-2 outline-none resize-none h-16" placeholder="Ej: Exploración de unas ruinas bajo una montaña magnética..."></textarea>
                </div>

                <div class="flex gap-3">
                    <div class="flex-1">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Protagonista</label>
                        <input id="agent-protagonist" type="text" class="w-full text-xs border border-black p-2 outline-none" placeholder="Ej: Lola, una espeleóloga andaluza">
                    </div>
                    <div class="flex-1">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Persona narrativa</label>
                        <select id="agent-pov" class="w-full text-xs border border-black p-2 outline-none">
                            <option value="2">Segunda persona (tú)</option>
                            <option value="1">Primera persona (yo)</option>
                            <option value="3">Tercera persona</option>
                        </select>
                    </div>
                </div>

                <div class="flex gap-3">
                    <div class="flex-1">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Tono narrativo</label>
                        <input id="agent-tone" type="text" value="Oscuro, inmersivo, sensorial" class="w-full text-xs border border-black p-2 outline-none">
                    </div>
                    <div class="flex-1">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Ambientación / léxico</label>
                        <input id="agent-setting" type="text" placeholder="Ej: andaluz, ciencia ficción, fantasía clásica..." class="w-full text-xs border border-black p-2 outline-none">
                    </div>
                </div>

                <div class="flex gap-3">
                    <div class="w-20">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Nodos</label>
                        <input id="agent-depth" type="number" value="8" min="3" max="40" class="w-full text-xs border border-black p-2 outline-none text-center">
                    </div>
                    <div class="w-20">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Ramas</label>
                        <input id="agent-branches" type="number" value="2" min="2" max="2" class="w-full text-xs border border-black p-2 outline-none text-center bg-gray-100" disabled>
                    </div>
                    <div class="w-20">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Finales</label>
                        <input id="agent-endings" type="number" value="3" min="1" max="10" class="w-full text-xs border border-black p-2 outline-none text-center">
                    </div>
                    <div class="flex-1">
                        <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Longitud por nodo</label>
                        <select id="agent-length" class="w-full text-xs border border-black p-2 outline-none">
                            <option value="corto">Corto (2-3 frases)</option>
                            <option value="medio" selected>Medio (1 párrafo)</option>
                            <option value="largo">Largo (2-3 párrafos)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="text-[9px] uppercase font-bold opacity-60 block mb-1">Reglas adicionales / nombres a evitar</label>
                    <input id="agent-rules" type="text" class="w-full text-xs border border-black p-2 outline-none" placeholder="Ej: evita los nombres Kael y Elara. Sin violencia gráfica.">
                </div>
            </div>

            <div id="agent-status" class="text-[9px] uppercase font-bold text-center mb-3 min-h-[15px] opacity-60">Listo.</div>
            <div id="agent-progress-bar" class="w-full h-1 bg-gray-200 mb-3 hidden">
                <div id="agent-progress-fill" class="h-full bg-black transition-all" style="width:0%"></div>
            </div>

            <div class="flex justify-between items-center mt-auto border-t border-black pt-3">
                <span class="text-[8px] uppercase tracking-widest opacity-40">Koreh · Manuel Rodsua</span>
                <div class="flex gap-2">
                    <button onclick="abortAgent()" id="agent-abort-btn" class="hidden text-[10px] uppercase font-bold border border-red-500 text-red-500 px-4 py-2 hover:bg-red-500 hover:text-white">Abortar</button>
                    <button onclick="closeAgentModal()" class="text-[10px] uppercase font-bold border border-black px-4 py-2 hover:bg-gray-100">Cerrar</button>
                    <button onclick="startAgentGeneration()" id="agent-go-btn" class="text-[10px] uppercase font-bold bg-black text-white border border-black px-4 py-2 hover:bg-gray-800 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">Generar</button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    fetchOllamaModels();
}

function openAgentModal() {
    document.getElementById('agent-modal').classList.remove('hidden');
    document.getElementById('agent-status').innerText = "Listo.";
    
    // Sincronizar inputs del modal con el estado global antes de pintar
    const modalMode = document.getElementById('modal-koreh-api-mode');
    const modalKey = document.getElementById('modal-koreh-gemini-key');
    if (modalMode) modalMode.value = agentState.apiMode;
    if (modalKey) modalKey.value = agentState.geminiApiKey;
    
    if (!agentState.models.length) fetchOllamaModels();
}

function closeAgentModal() {
    document.getElementById('agent-modal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initAgentUI, 500));