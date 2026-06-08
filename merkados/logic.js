// logic.js
// --- ESTADO GLOBAL Y LÓGICA DE DATOS BASADA EN SISTEMA DE ARCHIVOS LOCAL (FSAA) ---
const SCHEMA_VERSION = 3;  

let projects = {};
let currentId = null;
let dirHandle = null; // Descriptor de la carpeta raíz seleccionada por el usuario

let data = {
     name: "Sin Título",
     nodes: [],
     connections: [],
     version: SCHEMA_VERSION,
     visualStyle: "",
     visualBible: "",
     macroPoints: [],
     initialMetrics: { survival: 100, ethics: 0, efficiency: 100, health: 100, maxHealth: 100, gold: 0 },
     globalItems: [] // Catálogo de objetos existentes en el universo del juego
};

// --- SUBSISTEMA DE INICIALIZACIÓN POR DIRECTORIO (FSAA) ---
async function selectWorkspaceFolder() {
    try {
        // Solicitar al usuario la selección de la carpeta de trabajo
        dirHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        
        // Crear la subcarpeta de medios/imágenes si no existe
        await dirHandle.getDirectoryHandle('media', { create: true });
        
        // Escanear la carpeta en busca de proyectos JSON
        await scanWorkspaceProjects();
        
        // Ocultar pantalla de bloqueo si existiese e inicializar la UI
        console.log("[FSAA] Carpeta de trabajo vinculada con éxito.");
        
        const projectIds = Object.keys(projects);
        if (projectIds.length > 0) {
            await loadProjectLogic(projectIds[0]);
            if (typeof handleLoadProject === 'function') handleLoadProject(projectIds[0]);
        } else {
            newProjectLogic("Mi Primer Librojuego");
        }
        
        // Forzar el repintado de la barra lateral tras la lectura física
        if (typeof renderSidebar === 'function') renderSidebar();
        
    } catch (err) {
        console.error("[FSAA] Error al seleccionar o inicializar el directorio:", err);
        alert("Es obligatorio seleccionar una carpeta de trabajo para inicializar Koreh Studio.");
        // Re-invocar para bloquear la aplicación de forma controlada hasta la selección
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
                
                // El ID del proyecto será el nombre del archivo sin extensión
                const projId = entry.name.replace('.json', '');
                projects[projId] = normalizeProject(obj);
            } catch (e) {
                console.warn(`[FSAA] No se pudo procesar el archivo de proyecto: ${entry.name}`, e);
            }
        }
    }
}

// --- CARGA Y GUARDADO ASÍNCRONO DE IMÁGENES PNG ---
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
        // Devuelve null de forma silenciosa si el archivo no existe en disco
        return null;
    }
}

async function saveMediaToFileSystem(nodeId, base64Data) {
    if (!dirHandle) return;
    let writable = null;
    try {
        const mediaDir = await dirHandle.getDirectoryHandle('media');
        if (!base64Data) {
            // Si no hay datos, eliminamos el archivo físico .png
            await mediaDir.removeEntry(`${nodeId}.png`);
            return;
        }
        
        // Se fuerza { create: true } y se opera de manera aislada e inmediata
        const fileHandle = await mediaDir.getFileHandle(`${nodeId}.png`, { create: true });
        writable = await fileHandle.createWritable({ keepExistingData: false });
        
        // Conversión limpia de Base64 DataURL a Blob binario para el PNG
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

// --- NORMALIZACIÓN ---
function normalizeProject(p) {
    if (!p) return { name: "Sin Título", nodes: [], connections: [], version: SCHEMA_VERSION, visualStyle: "", visualBible: "", macroPoints: [], initialMetrics: { survival: 100, ethics: 0, efficiency: 100, health: 100, maxHealth: 100, gold: 0 }, globalItems: [] };
         
    p.nodes = (p.nodes || []).map(n => {
        // Asegurar que existan rewards base
        const rewards = n.rewards || {
            inventory: [],
            flags: [],
            metrics: { survival: 0, ethics: 0, efficiency: 0 }
        };
        
        // Asegurar que exista rpg dentro de rewards de forma estricta
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
         
    p.name = p.name || "Sin Título";
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

// Variable semáforo para evitar colisiones de reentrada física en el guardado secuencial del archivo JSON
let isCurrentlySaving = false;
async function saveLogic() {
    if (!dirHandle || !currentId || isCurrentlySaving) return;
    isCurrentlySaving = true;

    try {
        // 1. Guardar de forma asoncrónica secuencial estricta las imágenes modificadas en la carpeta /media/
        for (const n of data.nodes) {
            if (n.image && n.image.startsWith('data:image')) {
                await saveMediaToFileSystem(n.id, n.image);
            }
        }
             
        // 2. Conservar memoria ram del estado en la app
        projects[currentId] = JSON.parse(JSON.stringify(data));
        const cleanProject = JSON.parse(JSON.stringify(data));
             
        // 3. Marcar las imágenes en la estructura del JSON como persistidas en disco externo
        cleanProject.nodes.forEach(n => {
            if (n.image) {
                n.image = "file_stored";
            }
        });

        // Guardar físicamente el archivo JSON en el directorio raíz seleccionado
        const fileHandle = await dirHandle.getFileHandle(`${currentId}.json`, { create: true });
        const writable = await fileHandle.createWritable({ keepExistingData: false });
        await writable.write(JSON.stringify(cleanProject, null, 2));
        await writable.close();
    } catch (error) {
        console.error("[FSAA] Fallo crítico guardando el archivo JSON del proyecto:", error);
    } finally {
        isCurrentlySaving = false;
    }

    if (typeof pushHistory === 'function') pushHistory();
    if (typeof flashSaveIndicator === 'function') flashSaveIndicator();
}

async function loadProjectLogic(id) {
    if (!dirHandle) return;
    currentId = id;
    
    // Si no está mapeado en memoria, forzar re-escaneo rápido
    if (!projects[id]) {
        await scanWorkspaceProjects();
    }

    data = normalizeProject(projects[id]);
         
    // Recuperar y re-inyectar los archivos binarios PNG de las imágenes correspondientes
    for (const n of data.nodes) {
        const fileImage = await getMediaFromFileSystem(n.id);
        if (fileImage) {
            n.image = fileImage;
        }
    }
    projects[id] = data;
    if (typeof resetHistory === 'function') resetHistory();
}

function newProjectLogic(name = "Sin Título") {
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
        // Eliminar las imágenes asociadas de los nodos que contiene
        const targetProject = projects[id];
        if (targetProject && targetProject.nodes) {
            for (const n of targetProject.nodes) {
                await deleteMediaFromFileSystem(n.id);
            }
        }
        
        // Eliminar archivo .json físico
        await dirHandle.removeEntry(`${id}.json`);
        delete projects[id];
        
        if (currentId === id) {
            const remaining = Object.keys(projects);
            if (remaining.length > 0) await loadProjectLogic(remaining[0]);
            else newProjectLogic();
        }
        if (typeof renderSidebar === 'function') renderSidebar();
    } catch (e) {
        console.error("[FSAA] Error al eliminar el proyecto físico:", e);
    }
}

function renameProjectLogic(val) {
    data.name = val || "Sin Título";
    saveLogic();
}

function getTargetNodeLogic(x, y) {
    return data.nodes.find(n => x > n.x && x < n.x + 140 && y > n.y && y < n.y + 60);
}

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

function autoLayoutLogic() {
    if (!data || !data.nodes || data.nodes.length === 0) return;

    let roots = data.nodes.filter(n => !data.connections.some(c => c.to === n.id));
    if (roots.length === 0) roots = [data.nodes[0]];

    let nodeDepths = {};
    data.nodes.forEach(n => nodeDepths[n.id] = -1);

    let queue = [];
    roots.forEach(r => {
        nodeDepths[r.id] = 0;
        queue.push({ id: r.id, depth: 0, visited: new Set([r.id]) });
    });

    while (queue.length > 0) {
        const current = queue.shift();
        const children = data.connections.filter(c => c.from === current.id).map(c => c.to);
        
        children.forEach(childId => {
            if (current.visited.has(childId)) return;
            const nextDepth = current.depth + 1;
            if (nextDepth > nodeDepths[childId]) {
                nodeDepths[childId] = nextDepth;
            }
            let nextVisited = new Set(current.visited);
            nextVisited.add(childId);
            queue.push({ id: childId, depth: nextDepth, visited: nextVisited });
        });
    }

    let maxLegitDepth = 0;
    Object.values(nodeDepths).forEach(d => { if (d > maxLegitDepth) maxLegitDepth = d; });
    
    const absoluteLimit = Math.min(maxLegitDepth + 1, data.nodes.length);
    data.nodes.forEach(n => {
        if (nodeDepths[n.id] < 0 || nodeDepths[n.id] > absoluteLimit) {
            nodeDepths[n.id] = absoluteLimit;
        }
    });

    let depthGroups = {};
    data.nodes.forEach(n => {
        let d = nodeDepths[n.id];
        if (!depthGroups[d]) depthGroups[d] = [];
        depthGroups[d].push(n);
    });

    Object.keys(depthGroups).forEach(d => {
        if (d === '0') return;
        depthGroups[d].sort((a, b) => {
            const aParents = data.connections.filter(c => c.to === a.id).map(c => c.from);
            const bParents = data.connections.filter(c => c.to === b.id).map(c => c.from);
            const aAvg = aParents.length ? aParents.reduce((s, p) => {
                const pn = data.nodes.find(nd => nd.id === p);
                return s + (pn ? pn.y : 0);
            }, 0) / aParents.length : 0;
            const bAvg = bParents.length ? bParents.reduce((s, p) => {
                const pn = data.nodes.find(nd => nd.id === p);
                return s + (pn ? pn.y : 0);
            }, 0) / bParents.length : 0;
            return aAvg - bAvg;
        });
    });

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
    saveLogic();
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

// --- GESTIÓN DE BLOQUEO DE INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    // Inyectamos un modal bloqueante minimalista e ineludible en el body
    const lockHTML = `
    <div id="fsaa-folder-lock" class="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center font-mono p-6">
        <div class="border border-black p-8 max-w-md text-center shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <h2 class="text-xs font-bold uppercase tracking-widest mb-4">Koreh Studio · Workspace Selector</h2>
            <p class="text-[10px] uppercase opacity-60 mb-6 leading-relaxed">
                Para iniciar el entorno de desarrollo interactivo, debes designar la carpeta local donde se almacenarán las crónicas (.json) y sus respectivas ilustraciones (.png).
            </p>
            <button onclick="selectWorkspaceFolder(); document.getElementById('fsaa-folder-lock').remove();" class="text-[11px] uppercase font-bold bg-black text-white border border-black px-6 py-3 hover:bg-gray-800 transition shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                Seleccionar Carpeta de Trabajo
            </button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', lockHTML);
});