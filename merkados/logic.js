// logic.js
// --- ESTADO GLOBAL Y L GICA DE DATOS BASADA EN SISTEMA DE ARCHIVOS LOCAL (FSAA) ---
const SCHEMA_VERSION = 3;   
let projects = {};
let currentId = null;
let dirHandle = null; // Descriptor de la carpeta ra z seleccionada por el usuario
let data = {
     name: "Sin T tulo",
     nodes: [],
     connections: [],
     version: SCHEMA_VERSION,
     visualStyle: "",
     visualBible: "",
     macroPoints: [],
     initialMetrics: { survival: 100, ethics: 0, efficiency: 100, health: 100, maxHealth: 100, gold: 0 },
     globalItems: []
};

// --- SUBSISTEMA DE INICIALIZACI N POR DIRECTORIO (FSAA) ---
async function selectWorkspaceFolder() {
    try {
        dirHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        
        await dirHandle.getDirectoryHandle('media', { create: true });
        await scanWorkspaceProjects();
        
        console.log("[FSAA] Carpeta de trabajo vinculada con xito.");
        
        const projectIds = Object.keys(projects);
        if (projectIds.length > 0) {
            await loadProjectLogic(projectIds[0]);
            if (typeof handleLoadProject === 'function') handleLoadProject(projectIds[0]);
        } else {
            newProjectLogic("Mi Primer Librojuego");
        }
        
        if (typeof renderSidebar === 'function') renderSidebar();
             
    } catch (err) {
        console.error("[FSAA] Error al seleccionar o inicializar el directorio:", err);
        alert("Es obligatorio seleccionar una carpeta de trabajo para inicializar Koreh Studio.");
        setTimeout(selectWorkspaceFolder, 1000);
    }
}

async function scanWorkspaceProjects() {
    projects = {};
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
            try {
                const file = await entry.getFile();
                const content = await file.text();
                const obj = JSON.parse(content);
                const projId = entry.name.replace('.json', '');
                projects[projId] = normalizeProject(obj);
            } catch (e) {
                console.warn(`[FSAA] No se pudo procesar el archivo de proyecto: ${entry.name}`, e);
            }
        }
    }
}

// --- CARGA Y GUARDADO AS NCRONO DE IM GENES PNG ---
async function getMediaFromFileSystem(nodeId) {
    if (!dirHandle) return null;
    try {
        const mediaDir = await dirHandle.getDirectoryHandle('media');
        const fileHandle = await mediaDir.getFileHandle(`${nodeId}.png`);
        const file = await fileHandle.getFile();
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    } catch (e) {
        return null;
    }
}

async function saveMediaToFileSystem(nodeId, base64Data) {
    if (!dirHandle) return;
    let writable = null;
    try {
        const mediaDir = await dirHandle.getDirectoryHandle('media');
        if (!base64Data) {
            await mediaDir.removeEntry(`${nodeId}.png`);
            return;
        }
        
        const fileHandle = await mediaDir.getFileHandle(`${nodeId}.png`, { create: true });
        writable = await fileHandle.createWritable({ keepExistingData: false });
        
        const response = await fetch(base64Data);
        const blob = await response.blob();
        
        await writable.write(blob);
        await writable.close();
        writable = null;
    } catch (e) {
        console.error(`[FSAA] Error guardando imagen png para el nodo ${nodeId}:`, e);
        if (writable) {
            try { await writable.abort(); } catch(err) {}
        }
    }
}

async function deleteMediaFromFileSystem(nodeId) {
    await saveMediaToFileSystem(nodeId, null);
}

// --- UTILIDADES DE ID ---
function genId(prefix = 'n') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

// --- NORMALIZACI N ---
function normalizeProject(p) {
    if (!p) return { name: "Sin T tulo", nodes: [], connections: [], version: SCHEMA_VERSION, visualStyle: "", visualBible: "", macroPoints: [], initialMetrics: { survival: 100, ethics: 0, efficiency: 100, health: 100, maxHealth: 100, gold: 0 }, globalItems: [] };
         
    p.nodes = (p.nodes || []).map(n => {
        const rewards = n.rewards || {
            inventory: [],
            flags: [],
            metrics: { survival: 0, ethics: 0, efficiency: 0 }
        };
        if (!rewards.rpg) {
            rewards.rpg = { healthMod: 0, maxHealthMod: 0, goldMod: 0, addItems: [], removeItems: [] };
        }
        return {
            id: String(n.id),
            x: n.x || 0,
            y: n.y || 0,
            title: n.title || "",
            content: n.content || "",
            tags: n.tags || [],
            color: n.color || null,
            isEnding: n.isEnding || false,
            endingType: n.endingType || null,
            notes: n.notes || "",
            image: (n.image === "db_stored" || n.image === "file_stored") ? null : (n.image || null),
            rewards: rewards
        };
    });
         
    p.connections = (p.connections || []).map(c => ({
        from: String(c.from),
        to: String(c.to),
        label: c.label || "",
        conditions: c.conditions || { requiredGold: 0, requiredItems: [], forbiddenItems: [] }
    }));
         
    p.name = p.name || "Sin T tulo";
    p.visualStyle = p.visualStyle || "";
    p.visualBible = p.visualBible || "";
    p.macroPoints = p.macroPoints || [];
    
    if (!p.initialMetrics) p.initialMetrics = { survival: 100, ethics: 0, efficiency: 100, health: 100, maxHealth: 100, gold: 0 };
    if (p.initialMetrics.health === undefined) p.initialMetrics.health = 100;
    if (p.initialMetrics.maxHealth === undefined) p.initialMetrics.maxHealth = 100;
    if (p.initialMetrics.gold === undefined) p.initialMetrics.gold = 0;
         
    p.globalItems = p.globalItems || [];
    p.version = SCHEMA_VERSION;
    return p;
}

let isCurrentlySaving = false;
async function saveLogic() {
    if (!dirHandle || !currentId || isCurrentlySaving) return;
    isCurrentlySaving = true;
    try {
        for (const n of data.nodes) {
            if (n.image && n.image.startsWith('data:image')) {
                await saveMediaToFileSystem(n.id, n.image);
            }
        }
                 
        projects[currentId] = JSON.parse(JSON.stringify(data));
        const cleanProject = JSON.parse(JSON.stringify(data));
                 
        cleanProject.nodes.forEach(n => {
            if (n.image) {
                n.image = "file_stored";
            }
        });
        const fileHandle = await dirHandle.getFileHandle(`${currentId}.json`, { create: true });
        const writable = await fileHandle.createWritable({ keepExistingData: false });
        await writable.write(JSON.stringify(cleanProject, null, 2));
        await writable.close();
    } catch (error) {
        console.error("[FSAA] Fallo cr tico guardando el archivo JSON del proyecto:", error);
    } finally {
        isCurrentlySaving = false;
    }
    if (typeof pushHistory === 'function') pushHistory();
    if (typeof flashSaveIndicator === 'function') flashSaveIndicator();
}

async function loadProjectLogic(id) {
    if (!dirHandle) return;
    currentId = id;
    if (!projects[id]) {
        await scanWorkspaceProjects();
    }
    data = normalizeProject(projects[id]);         
    for (const n of data.nodes) {
        const fileImage = await getMediaFromFileSystem(n.id);
        if (fileImage) {
            n.image = fileImage;
        }
    }
    projects[id] = data;
    if (typeof resetHistory === 'function') resetHistory();
}

function newProjectLogic(name = "Sin T tulo") {
    const id = genId('proj');
    projects[id] = normalizeProject({ name, nodes: [], connections: [], macroPoints: [], initialMetrics: { survival: 100, ethics: 0, efficiency: 100, health: 100, maxHealth: 100, gold: 0 }, globalItems: [] });
    loadProjectLogic(id).then(() => {
        saveLogic();
        if (typeof renderSidebar === 'function') renderSidebar();
    });
}

async function deleteProjectLogic(id) {
    if (!dirHandle) return;
    try {
        const targetProject = projects[id];
        if (targetProject && targetProject.nodes) {
            for (const n of targetProject.nodes) {
                await deleteMediaFromFileSystem(n.id);
            }
        }
        await dirHandle.removeEntry(`${id}.json`);
        delete projects[id];
                 
        if (currentId === id) {
            const remaining = Object.keys(projects);
            if (remaining.length > 0) await loadProjectLogic(remaining[0]);
            else newProjectLogic();
        }
        if (typeof renderSidebar === 'function') renderSidebar();
    } catch (e) {
        console.error("[FSAA] Error al eliminar el proyecto f sico:", e);
    }
}

function renameProjectLogic(val) {
    data.name = val || "Sin T tulo";
    saveLogic();
}

function getTargetNodeLogic(x, y) {
    return data.nodes.find(n => x > n.x && x < n.x + 140 && y > n.y && y < n.y + 60);
}

// --- OPTIMIZACIÓN DE TRAZADO DE LÍNEAS MATEMÁTICAS ---
function isPointOnLineLogic(px, py, conn) {
    const n1 = data.nodes.find(n => n.id === conn.from);
    const n2 = data.nodes.find(n => n.id === conn.to);
    if (!n1 || !n2) return false;
    const x1 = n1.x + 140, y1 = n1.y + 30;
    const x2 = n2.x, y2 = n2.y + 30;
    const dist = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) /                                    
                   Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
    const minX = Math.min(x1, x2) - 5;
    const maxX = Math.max(x1, x2) + 5;
    const minY = Math.min(y1, y2) - 5;
    const maxY = Math.max(y1, y2) + 5;
    return dist < 10 && px >= minX && px <= maxX && py >= minY && py <= maxY;
}

function updateConnectionLabelLogic(fromId, toId, value) {
    const conn = data.connections.find(c => c.from === fromId && c.to === toId);
    if (conn) {
        conn.label = value;
        saveLogic();
    }
}

function deleteConnectionLogic(fromId, toId) {
    data.connections = data.connections.filter(c => !(c.from === fromId && c.to === toId));
    saveLogic();
}

function duplicateNodeLogic(nodeId) {
    const n = data.nodes.find(nd => nd.id === nodeId);
    if (!n) return null;
    const newId = genId('n');
    const copy = {
        ...n,
        id: newId,
        x: n.x + 30,
        y: n.y + 30,
        title: n.title + " (copia)",
        image: n.image,
        rewards: JSON.parse(JSON.stringify(n.rewards))
    };
    if (n.image) {
        saveMediaToFileSystem(newId, n.image);
    }
    data.nodes.push(copy);
    saveLogic();
    return copy;
}

// --- REDISEÑO COMPLETO DE AUTO-LAYOUT: LINEAL O(N + C) ANTI-CUELGUES ---
function autoLayoutLogic() {
    if (!data || !data.nodes || data.nodes.length === 0) return;

    const nodesMap = {};
    const nodeDepths = {};
    const incomingConnections = {};
    const outgoingConnections = {};

    // 1. Inicialización en un único paso O(N)
    data.nodes.forEach(n => {
        nodesMap[n.id] = n;
        nodeDepths[n.id] = -1;
        incomingConnections[n.id] = [];
        outgoingConnections[n.id] = [];
    });

    // 2. Mapeo de adyacencia en un único paso O(C)
    data.connections.forEach(c => {
        if (incomingConnections[c.to]) incomingConnections[c.to].push(c);
        if (outgoingConnections[c.from]) outgoingConnections[c.from].push(c);
    });

    // 3. Identificación de raíces
    let roots = data.nodes.filter(n => incomingConnections[n.id].length === 0);
    if (roots.length === 0) roots = [data.nodes[0]];

    // 4. BFS iterativo puro optimizado con control estricto de estados (Evita ciclos infinitos y clonaciones innecesarias)
    let queue = [];
    roots.forEach(r => {
        nodeDepths[r.id] = 0;
        queue.push(r.id);
    });

    let index = 0;
    while (index < queue.length) {
        const currentId = queue[index++];
        const currentDepth = nodeDepths[currentId];
        const children = outgoingConnections[currentId];

        if (children) {
            for (let i = 0; i < children.length; i++) {
                const childId = children[i].to;
                // Si encontramos un camino más largo al nodo, actualizamos su profundidad
                if (currentDepth + 1 > nodeDepths[childId]) {
                    nodeDepths[childId] = currentDepth + 1;
                    // Evitamos duplicados descontrolados en cola
                    if (!queue.includes(childId)) {
                        queue.push(childId);
                    }
                }
            }
        }
    }

    // 5. Agrupación limpia por niveles
    let depthGroups = {};
    const absoluteLimit = data.nodes.length;

    data.nodes.forEach(n => {
        let d = nodeDepths[n.id];
        if (d < 0 || d > absoluteLimit) {
            d = absoluteLimit;
            nodeDepths[n.id] = absoluteLimit;
        }
        if (!depthGroups[d]) depthGroups[d] = [];
        depthGroups[d].push(n);
    });

    // Cachear coordenadas Y para evitar calcularlas cientos de veces en el sort de abajo
    const yCache = {};
    data.nodes.forEach(n => { yCache[n.id] = n.y; });

    // 6. Ordenamiento secundario optimizado O(N log N) libre de recursión costosa
    Object.keys(depthGroups).forEach(d => {
        if (d === '0') return;
        depthGroups[d].sort((a, b) => {
            const aParents = incomingConnections[a.id] || [];
            const bParents = incomingConnections[b.id] || [];
            
            let aSum = 0, aCount = 0;
            for (let i = 0; i < aParents.length; i++) {
                aSum += yCache[aParents[i].from] || 0;
                aCount++;
            }
            const aAvg = aCount ? aSum / aCount : 0;

            let bSum = 0, bCount = 0;
            for (let i = 0; i < bParents.length; i++) {
                bSum += yCache[bParents[i].from] || 0;
                bCount++;
            }
            const bAvg = bCount ? bSum / bCount : 0;
            
            return aAvg - bAvg;
        });
    });

    // 7. Reposicionamiento espacial en cuadrícula elástica equilibrada
    const X_SPACING = 260;
    const Y_SPACING = 110;
    const START_X = 100;
    const GLOBAL_CENTER_Y = 300; 

    for (let d in depthGroups) {
        let levelNodes = depthGroups[d];
        const count = levelNodes.length;
        levelNodes.forEach((node, index) => {
            node.x = START_X + parseInt(d) * X_SPACING;
            node.y = GLOBAL_CENTER_Y - ((count - 1) * Y_SPACING) / 2 + index * Y_SPACING;
        });
    }

    if (typeof pushHistory === 'function') pushHistory();
    if (typeof flashSaveIndicator === 'function') flashSaveIndicator();
    
    // 8. Guardado asíncrono diferido sin clonación pesada en la UI principal
    setTimeout(async () => {
        if (!dirHandle || !currentId || isCurrentlySaving) return;
        isCurrentlySaving = true;
        try {
            // Clonación superficial rápida solo de propiedades estructurales críticas para el JSON externo
            const cleanNodes = data.nodes.map(n => ({
                ...n,
                image: n.image ? "file_stored" : null
            }));
            const cleanProject = { ...data, nodes: cleanNodes };

            const fileHandle = await dirHandle.getFileHandle(`${currentId}.json`, { create: true });
            const writable = await fileHandle.createWritable({ keepExistingData: false });
            await writable.write(JSON.stringify(cleanProject, null, 2));
            await writable.close();
        } catch (e) {
            console.error("[FSAA] Guardado diferido fallido:", e);
        } finally {
            isCurrentlySaving = false;
        }
    }, 150);
}

function toggleEndingLogic(nodeId) {
    const n = data.nodes.find(nd => nd.id === nodeId);
    if (!n) return;
    n.isEnding = !n.isEnding;
    saveLogic();
}

function findPathToNode(targetId) {
    let roots = data.nodes.filter(n => !data.connections.some(c => c.to === n.id));
    if (roots.length === 0 && data.nodes.length > 0) roots = [data.nodes[0]];
    for (const root of roots) {
        const path = dfsPath(root.id, targetId, new Set());
        if (path) return path.map(id => data.nodes.find(n => n.id === id)).filter(Boolean);
    }
    return [data.nodes.find(n => n.id === targetId)].filter(Boolean);
}

function dfsPath(currentId, targetId, visited) {
    if (currentId === targetId) return [currentId];
    if (visited.has(currentId)) return null;
    visited.add(currentId);
    const children = data.connections.filter(c => currentId === c.from).map(c => c.to);
    for (const child of children) {
        const sub = dfsPath(child, targetId, visited);
        if (sub) return [currentId, ...sub];
    }
    return null;
}

// --- GESTI N DE BLOQUEO DE INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    const lockHTML = `
    <div id="fsaa-folder-lock" class="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center font-mono p-6">
        <div class="border border-black p-8 max-w-md text-center shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <h2 class="text-xs font-bold uppercase tracking-widest mb-4">Koreh Studio | Workspace Selector</h2>
            <p class="text-[10px] uppercase opacity-60 mb-6 leading-relaxed">
                Para iniciar el entorno de desarrollo interactivo, debes designar la carpeta local donde se almacenar n las cr nicas (.json) y sus respectivas ilustraciones (.png).
            </p>
            <button onclick="selectWorkspaceFolder(); document.getElementById('fsaa-folder-lock').remove();" class="text-[11px] uppercase font-bold bg-black text-white border border-black px-6 py-3 hover:bg-gray-800 transition shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                Seleccionar Carpeta de Trabajo
            </button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', lockHTML);
});