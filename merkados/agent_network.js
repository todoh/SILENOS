// agent_network.js
// --- CONTROL DE RED DE AGENTES: ENRUTAMIENTO DUAL OLLAMA / GEMINI / OLLAMA CLOUD ---

const OLLAMA_URL = 'http://127.0.0.1:11434/api';
// Puedes cambiar esta URL por la IP de tu servidor en la nube o configurar un input en las opciones
const OLLAMA_CLOUD_URL = localStorage.getItem('koreh_ollama_cloud_url') || 'http://127.0.0.1:11434/api';

const agentState = {
    models: [],
    abort: false,
    apiMode: localStorage.getItem('koreh_api_mode') || 'local',
    geminiApiKey: localStorage.getItem('koreh_gemini_key') || '',
    pollinationsApiKey: localStorage.getItem('koreh_pollinations_key') || '',
    mediaMode: localStorage.getItem('koreh_media_mode') || 'local'
};

async function fetchOllamaModels() {
    // Modelos estándar online (Nube directa de Google)
    const onlineModels = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite", "gemma-4-26b-it", "gemma-4-31b-it"];
    
    // Tus modelos Cloud exactos detectados en tu instancia de Ollama
    const ollamaCloudModels = [
        "kimi-k2.6:cloud", 
        "glm-5.1:cloud", 
        "qwen3.5:cloud", 
        "nemotron-3-super:cloud", 
        "gemma4:31b-cloud"
    ];

    if (agentState.apiMode === 'online') {
        const totalOnline = [...onlineModels, ...ollamaCloudModels];
        populateSelectorsWithModels(totalOnline);
        agentState.models = totalOnline;
        restoreModelFavorites();
        return;
    }

    try {
        let localModels = [];
        try {
            const res = await fetch(`${OLLAMA_URL}/tags`, { signal: AbortSignal.timeout(1500) });
            if (res.ok) {
                const json = await res.json();
                localModels = json.models.map(m => m.name);
            }
        } catch (eLocal) {
            console.warn("Ollama local no responded a tiempo para tags locales.");
        }
        
        // Intentamos también recuperar dinámicamente los modelos del Ollama Cloud remoto si es un endpoint distinto
        let remoteModels = [...ollamaCloudModels];
        try {
            if (OLLAMA_CLOUD_URL !== OLLAMA_URL) {
                const resCloud = await fetch(`${OLLAMA_CLOUD_URL}/tags`, { signal: AbortSignal.timeout(1500) });
                if (resCloud.ok) {
                    const jsonCloud = await resCloud.json();
                    const fetchedRemote = jsonCloud.models.map(m => m.name);
                    if (fetchedRemote.length > 0) remoteModels = fetchedRemote;
                }
            }
        } catch (e) {
            console.warn("Servidor Ollama Cloud dinámico no disponible. Usando mapeo de tags por defecto.");
        }
        
        // Unificamos las listas asegurando que tus modelos Cloud específicos estén siempre presentes
        const totalList = [...new Set([...localModels, ...onlineModels, ...remoteModels, ...ollamaCloudModels])];
        populateSelectorsWithModels(totalList);
        agentState.models = totalList;
        restoreModelFavorites();

    } catch (e) {
        console.warn("Fallo general en la recolección de modelos. Usando lista de respaldo.");
        const totalFallback = [...onlineModels, ...ollamaCloudModels];
        populateSelectorsWithModels(totalFallback);
        agentState.models = totalFallback;
        restoreModelFavorites();
    }
}

function populateSelectorsWithModels(list) {
    const s1 = document.getElementById('agent-strong-model');
    const s2 = document.getElementById('agent-fast-model');
    const p1 = document.getElementById('panel-agent-thinker');
    const p2 = document.getElementById('panel-agent-writer');
    const th = document.getElementById('assist-thinker');
    const wr = document.getElementById('assist-writer');
    const cm = document.getElementById('comfy-prompt-model');

    [s1, s2, p1, p2, th, wr, cm].forEach(sel => {
        if (!sel) return;
        const oldVal = sel.value;
        sel.innerHTML = '';
        list.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.innerText = m.toUpperCase();
            sel.appendChild(opt);
        });
        if (list.includes(oldVal)) sel.value = oldVal;
    });
}

function restoreModelFavorites() {
    ['agent-strong-model', 'agent-fast-model', 'panel-agent-thinker', 'panel-agent-writer', 'assist-thinker', 'assist-writer'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const saved = localStorage.getItem('fav_' + id);
        if (saved && agentState.models.includes(saved)) {
            el.value = saved;
        }
    });
}

function saveModelFavorites() {
    ['agent-strong-model', 'agent-fast-model', 'panel-agent-thinker', 'panel-agent-writer', 'assist-thinker', 'assist-writer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) localStorage.setItem('fav_' + id, el.value);
    });
}

/**
 * Función Maestra de Generación de Contenido.
 * Enruta la petición de forma inteligente hacia Ollama Local, Gemini Cloud o Ollama Cloud remoto.
 */
async function ollamaGenerate(modelName, prompt, isJsonMode = false, systemPrompt = "", signal = null) {
    if (agentState.abort) throw new Error("Operación abortada por directiva de usuario.");

    saveModelFavorites();

    const lowerModel = modelName.toLowerCase();

    // Enrutamiento granular e independiente por modelo
    if (lowerModel.includes('gemini')) {
        return await callGeminiAPI(modelName, prompt, isJsonMode, systemPrompt, signal);
    } else if (lowerModel.includes(':cloud') || lowerModel.includes('-cloud') || lowerModel.includes('cloud')) {
        return await callOllamaCloudAPI(modelName, prompt, isJsonMode, systemPrompt, signal);
    } else {
        return await callOllamaAPI(modelName, prompt, isJsonMode, systemPrompt, signal);
    }
}

/**
 * Conector optimizado para la API de Gemini (Google AI Studio)
 */
async function callGeminiAPI(modelName, prompt, isJsonMode, systemPrompt, signal) {
    const apiKey = agentState.geminiApiKey || localStorage.getItem('koreh_gemini_key');
    if (!apiKey) {
        throw new Error("Falta la API Key de Gemini. Configúrala en el panel de opciones de la barra superior o lateral.");
    }

    let targetModel = "gemini-3.1-flash-lite"; 
    if (modelName.includes("lite") || modelName.includes("3.1")) {
        targetModel = "gemini-3.1-flash-lite"; 
    } else if (modelName.includes("2.5")) {
        targetModel = "gemini-3.1-flash-lite";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
    const contents = [{
        role: "user",
        parts: [{ text: prompt }]
    }];

    const body = {
        contents: contents,
        generationConfig: {
            temperature: isJsonMode ? 0.1 : 0.7,
            maxOutputTokens: isJsonMode ? 4000 : 1500
        }
    };

    if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    if (isJsonMode) {
        body.generationConfig.responseMimeType = "application/json";
    }

    const fetchOpts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
    if (signal) fetchOpts.signal = signal;

    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `Código de estado HTTP: ${res.status}`;
        throw new Error(`Error en API de Gemini: ${errMsg}`);
    }

    const data = await res.json();
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Gemini no devolvió ninguna respuesta válida.");
    }

    return data.candidates[0].content.parts[0].text;
}

/**
 * Conector para la API remota de Ollama en la Nube
 */
async function callOllamaCloudAPI(modelName, prompt, isJsonMode, systemPrompt, signal) {
    const body = {
        model: modelName,
        prompt: prompt,
        stream: false,
        options: {
            temperature: isJsonMode ? 0.0 : 0.7
        }
    };

    if (systemPrompt) body.system = systemPrompt;
    if (isJsonMode) body.format = "json";

    const fetchOpts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
    if (signal) fetchOpts.signal = signal;

    const res = await fetch(`${OLLAMA_CLOUD_URL}/generate`, fetchOpts);
    if (!res.ok) throw new Error(`Fallo en la API Cloud de Ollama Remoto (Status: ${res.status})`);
    
    const json = await res.json();
    return json.response;
}

/**
 * Conector clásico para la API nativa de Ollama Local
 */
async function callOllamaAPI(modelName, prompt, isJsonMode, systemPrompt, signal) {
    const body = {
        model: modelName,
        prompt: prompt,
        stream: false,
        options: {
            temperature: isJsonMode ? 0.0 : 0.7
        }
    };

    if (systemPrompt) body.system = systemPrompt;
    if (isJsonMode) body.format = "json";

    const fetchOpts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
    if (signal) fetchOpts.signal = signal;

    const res = await fetch(`${OLLAMA_URL}/generate`, fetchOpts);
    if (!res.ok) throw new Error(`Fallo en la API local de Ollama (Status: ${res.status})`);
    
    const json = await res.json();
    return json.response;
}

function bfsOrder(plan) {
    const root = plan.nodes.find(n => !plan.connections.some(c => String(c.to) === String(n.id))) || plan.nodes[0];
    if (!root) return [];
    
    const visited = new Set();
    const order = [];
    const queue = [String(root.id)];
    
    while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        order.push(id);
        plan.connections.filter(c => String(c.from) === id).forEach(c => {
            if (!visited.has(String(c.to))) queue.push(String(c.to));
        });
    }
    
    plan.nodes.forEach(n => { if (!visited.has(String(n.id))) order.push(String(n.id)); });
    return order;
}

function findPlanPath(plan, startId, targetId, visited = new Set()) {
    if (String(startId) === String(targetId)) return [String(startId)];
    if (visited.has(startId)) return null;
    visited.add(startId);

    const activeConns = plan.connections.filter(c => String(c.from) === String(startId));
    for (const c of activeConns) {
        const res = findPlanPath(plan, String(c.to), targetId, visited);
        if (res) {
            return [String(startId), ...res];
        }
    }
    return null;
}