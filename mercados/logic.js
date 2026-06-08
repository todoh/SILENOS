// logic.js
// --- ESTADO GLOBAL Y LÓGICA DE DATOS ---
const SCHEMA_VERSION = 3;  
const STORAGE_KEY = 'koreh_v3_projects';
const ACTIVE_KEY = 'koreh_v3_active';
const DB_NAME = 'koreh_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'node_images';

let projects = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
let currentId = localStorage.getItem(ACTIVE_KEY);

let data = {
     name: "Sin Título",
     nodes: [],
     connections: [],
     version: SCHEMA_VERSION,
     visualStyle: "",
     visualBible: "",
     macroPoints: [],
     initialMetrics: { survival: 100, ethics: 0, efficiency: 100 }
};

let dbInstance = null;

// --- INICIALIZACIÓN DE INDEXEDDB ---
function initMediaDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };
        request.onerror = (e) => {
            console.error("Error abriendo IndexedDB para imágenes:", e.target.error);
            reject(e.target.error);
        };
    });
}

function getMediaFromDB(nodeId) {
    return new Promise((resolve) => {
        if (!dbInstance) { resolve(null); return; }
        const tx = dbInstance.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(String(nodeId));
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

function saveMediaToDB(nodeId, base64Data) {
    return new Promise((resolve) => {
        if (!dbInstance) { resolve(); return; }
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        if (!base64Data) {
            store.delete(String(nodeId));
        } else {
            store.put(base64Data, String(nodeId));
        }
        tx.oncomplete = () => resolve();
    });
}

function deleteMediaFromDB(nodeId) {
    return saveMediaToDB(nodeId, null);
}

// --- UTILIDADES DE ID ---
function genId(prefix = 'n') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

// --- NORMALIZACIÓN ---
function normalizeProject(p) {
    if (!p) return { name: "Sin Título", nodes: [], connections: [], version: SCHEMA_VERSION, visualStyle: "", visualBible: "", macroPoints: [], initialMetrics: { survival: 100, ethics: 0, efficiency: 100 } };
         
    p.nodes = (p.nodes || []).map(n => {
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
            image: (n.image === "db_stored") ? null : (n.image || null),
            rewards: n.rewards || {
                inventory: [],
                flags: [],
                metrics: { survival: 0, ethics: 0, efficiency: 0 }
            }
        };
    });
         
    p.connections = (p.connections || []).map(c => ({
        from: String(c.from),
        to: String(c.to),
        label: c.label || ""
    }));
         
    p.name = p.name || "Sin Título";
    p.visualStyle = p.visualStyle || "";
    p.visualBible = p.visualBible || "";
    p.macroPoints = p.macroPoints || [];
    p.initialMetrics = p.initialMetrics || { survival: 100, ethics: 0, efficiency: 100 };
    p.version = SCHEMA_VERSION;
    return p;
}

// Normaliza TODOS los proyectos al inicio
Object.keys(projects).forEach(id => {
    projects[id] = normalizeProject(projects[id]);
});

async function saveLogic() {
    // 1. Guardar primero de forma segura las imágenes en IndexedDB
    for (const n of data.nodes) {
        if (n.image && n.image.startsWith('data:image')) {
            await saveMediaToDB(n.id, n.image);
        }
    }
         
    // 2. Clonar profundamente el estado actual para no alterar los Base64 dinámicos de la interfaz
    projects[currentId] = JSON.parse(JSON.stringify(data));
    const cleanProjects = JSON.parse(JSON.stringify(projects));
         
    // 3. Modificar únicamente la copia serializable que va destinada al LocalStorage a "db_stored"
    Object.keys(cleanProjects).forEach(projId => {
        if (cleanProjects[projId] && cleanProjects[projId].nodes) {
            cleanProjects[projId].nodes.forEach(n => {
                if (n.image && n.image.startsWith('data:image')) {
                    n.image = "db_stored";
                }
            });
        }
    });
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanProjects));
    } catch (error) {
        console.error("CRITICAL ERROR: LocalStorage saturado. Aplicando purga en cascada...", error);
        Object.keys(cleanProjects).forEach(projId => {
            if (projId !== currentId && cleanProjects[projId]?.nodes) {
                cleanProjects[projId].nodes.forEach(n => { n.image = null; });
            }
        });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanProjects));
        } catch (innerError) {
            console.error("Fallo definitivo guardando en LocalStorage estructural", innerError);
        }
    }
    if (typeof pushHistory === 'function') pushHistory();
    if (typeof flashSaveIndicator === 'function') flashSaveIndicator();
}

async function loadProjectLogic(id) {
    currentId = id;
    data = normalizeProject(projects[id]);
         
    for (const n of data.nodes) {
        const storedImage = await getMediaFromDB(n.id);
        if (storedImage) {
            n.image = storedImage;
        }
    }
    projects[id] = data;
    localStorage.setItem(ACTIVE_KEY, id);
    if (typeof resetHistory === 'function') resetHistory();
}

function newProjectLogic(name = "Sin Título") {
    const id = genId('proj');
    projects[id] = normalizeProject({ name, nodes: [], connections: [], macroPoints: [], initialMetrics: { survival: 100, ethics: 0, efficiency: 100 } });
    loadProjectLogic(id);
}

function deleteProjectLogic(id) {
    const targetProject = projects[id];
    if (targetProject && targetProject.nodes) {
        targetProject.nodes.forEach(n => deleteMediaFromDB(n.id));
    }
    delete projects[id];
    if (currentId === id) {
        const remaining = Object.keys(projects);
        if (remaining.length > 0) loadProjectLogic(remaining[0]);
        else newProjectLogic();
    }
    saveLogic();
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
        saveMediaToDB(newId, n.image);
    }
    data.nodes.push(copy);
    saveLogic();
    return copy;
}

function autoLayoutLogic() {
    if (!data || !data.nodes || data.nodes.length === 0) return;

    // 1. Identificar raíces reales
    let roots = data.nodes.filter(n => !data.connections.some(c => c.to === n.id));
    if (roots.length === 0) roots = [data.nodes[0]];

    // 2. Inicializar mapa de profundidades
    let nodeDepths = {};
    data.nodes.forEach(n => nodeDepths[n.id] = -1);

    // 3. Algoritmo BFS controlado con prevención de ciclos reales
    let queue = [];
    roots.forEach(r => {
        nodeDepths[r.id] = 0;
        queue.push({ id: r.id, depth: 0, visited: new Set([r.id]) });
    });

    while (queue.length > 0) {
        const current = queue.shift();
        
        // Obtener hijos salientes de este nodo
        const children = data.connections.filter(c => c.from === current.id).map(c => c.to);
        
        children.forEach(childId => {
            // Si el hijo ya se visitó en esta rama, ignoramos para romper el bucle infinito
            if (current.visited.has(childId)) return;

            const nextDepth = current.depth + 1;

            // Conservamos la profundidad máxima alcanzada de forma legítima sin bucles
            if (nextDepth > nodeDepths[childId]) {
                nodeDepths[childId] = nextDepth;
            }

            // Crear un nuevo set de camino heredado para la bifurcación
            let nextVisited = new Set(current.visited);
            nextVisited.add(childId);

            queue.push({ id: childId, depth: nextDepth, visited: nextVisited });
        });
    }

    // 4. Asegurar protección contra huérfanos absolutos para que no tengan profundidad errática
    let maxLegitDepth = 0;
    Object.values(nodeDepths).forEach(d => { if (d > maxLegitDepth) maxLegitDepth = d; });
    
    // Si algún nodo quedó inaccesible o ciclado sin raíz, se limita al máximo total de nodos
    const absoluteLimit = Math.min(maxLegitDepth + 1, data.nodes.length);
    data.nodes.forEach(n => {
        if (nodeDepths[n.id] < 0 || nodeDepths[n.id] > absoluteLimit) {
            nodeDepths[n.id] = absoluteLimit;
        }
    });

    // 5. Agrupar por columnas lógicas de profundidad
    let depthGroups = {};
    data.nodes.forEach(n => {
        let d = nodeDepths[n.id];
        if (!depthGroups[d]) depthGroups[d] = [];
        depthGroups[d].push(n);
    });

    // 6. Ordenar internamente cada columna según la posición y de sus respectivos padres
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

    // 7. Renderizado geométrico unificado y simétrico en el lienzo
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

// Inicializar base de datos al instanciar el script
initMediaDB().then(() => {
    if (currentId) loadProjectLogic(currentId);
});