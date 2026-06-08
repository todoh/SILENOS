// graph_context.js
// --- ANÁLISIS DEL GRAFO Y EXTRACCIÓN DE CONTEXTO LOCAL ---
// Calculates relations, paths, siblings, and descendants to extract precise local context.

// --- ESTRUCTURAS DERIVADAS ---
function buildGraphIndex() {
    const incoming = {}, outgoing = {};
    data.nodes.forEach(n => { incoming[n.id] = []; outgoing[n.id] = []; });
    data.connections.forEach(c => {
        if (incoming[c.to]) incoming[c.to].push({ from: c.from, label: c.label });
        if (outgoing[c.from]) outgoing[c.from].push({ to: c.to, label: c.label });
    });
    return { incoming, outgoing };
}

// --- TODOS los caminos desde cualquier raíz hasta un nodo ---
function findAllPathsToNode(targetId, maxPaths = 3) {
    const { incoming } = buildGraphIndex();
    const paths = [];

    function walk(nodeId, path, visited) {
        if (paths.length >= maxPaths) return;
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const parents = incoming[nodeId] || [];
        if (parents.length === 0) {
            paths.push([nodeId, ...path]);
            visited.delete(nodeId);
            return;
        }
        for (const p of parents) {
            walk(p.from, [nodeId, ...path], new Set(visited));
        }
        visited.delete(nodeId);
    }

    walk(targetId, [], new Set());
    return paths.map(ids => ids.map(id => data.nodes.find(n => n.id === id)).filter(Boolean));
}

// --- DESCENDIENTES (todo lo que ya existe después del nodo) ---
function getDescendants(nodeId, maxDepth = 3) {
    const { outgoing } = buildGraphIndex();
    const result = [];
    const visited = new Set();
    function walk(id, depth) {
        if (depth > maxDepth || visited.has(id)) return;
        visited.add(id);
        const children = outgoing[id] || [];
        children.forEach(c => {
            const child = data.nodes.find(n => n.id === c.to);
            if (child) {
                result.push({ id: child.id, title: child.title, depth, viaLabel: c.label });
                walk(c.to, depth + 1);
            }
        });
    }
    walk(nodeId, 0);
    return result;
}

// --- HERMANOS (otros hijos del mismo padre) ---
function getSiblings(nodeId) {
    const { incoming, outgoing } = buildGraphIndex();
    const parents = (incoming[nodeId] || []).map(p => p.from);
    const siblings = [];
    parents.forEach(pid => {
        (outgoing[pid] || []).forEach(c => {
            if (c.to !== nodeId) {
                const n = data.nodes.find(nd => nd.id === c.to);
                if (n) siblings.push({ id: n.id, title: n.title, viaLabel: c.label, content: n.content || "" });
            }
        });
    });
    return siblings;
}

// --- LABELS YA USADOS hacia fuera del nodo ---
function getExistingOptionLabels(nodeId) {
    return data.connections
        .filter(c => c.from === nodeId)
        .map(c => (c.label || '').trim())
        .filter(Boolean);
}

// --- EXTRACCIÓN HEURÍSTICA DE INVENTARIO Y PERSONAJES ---
const STOPWORDS_ES = new Set([
    'el','la','los','las','un','una','unos','unas','de','del','al','a','en','y','o','que','con','por','para','sin','su','sus','le','les','lo','se','es','son','era','eran','está','están','fue','fueron','ha','han','había','un','una','este','esta','ese','esa','aquel','aquella','muy','más','menos','pero','si','no','ya','también','como','cuando','donde','quien','qué','cómo','dónde','quién','tú','yo','él','ella','nosotros','vosotros','ellos','ellas','me','te','nos','os','mi','tu','su','y','o','u','e','i'
]);

function extractCandidateNouns(text) {
    if (!text) return [];
    const words = text.toLowerCase()
        .replace(/[^\wáéíóúñü\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !STOPWORDS_ES.has(w) && !/^\d+$/.test(w));
    const freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);
    return Object.entries(freq)
        .filter(([w, c]) => c >= 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([w]) => w);
}

function extractProperNouns(text) {
    if (!text) return [];
    const sentences = text.split(/[.!?\n]+/);
    const set = new Set();
    sentences.forEach(s => {
        const tokens = s.trim().split(/\s+/);
        tokens.forEach((t, i) => {
            const clean = t.replace(/[^\wáéíóúñüÁÉÍÓÚÑÜ]/g, '');
            if (i === 0) return;
            if (clean.length >= 3 && /^[A-ZÁÉÍÓÚÑÜ]/.test(clean) && !STOPWORDS_ES.has(clean.toLowerCase())) {
                set.add(clean);
            }
        });
    });
    return Array.from(set).slice(0, 10);
}

// --- CONTEXTO LOCAL COMPLETO ---
function buildLocalContext(nodeId) {
    const node = data.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const paths = findAllPathsToNode(nodeId, 3);
    const mainPath = paths[0] || [node];
    const alternativePaths = paths.slice(1);

    const descendants = getDescendants(nodeId, 3);
    const siblings = getSiblings(nodeId);
    const existingLabels = getExistingOptionLabels(nodeId);

    const pathText = mainPath.map(n => `${n.title}. ${n.content || ''}`).join('\n');
    const candidateNouns = extractCandidateNouns(pathText);
    const properNouns = extractProperNouns(pathText);

    const directChildren = (buildGraphIndex().outgoing[nodeId] || []).map(c => {
        const n = data.nodes.find(nd => nd.id === c.to);
        return n ? { id: n.id, title: n.title, viaLabel: c.label } : null;
    }).filter(Boolean);

    return {
        node: { id: node.id, title: node.title, content: node.content, isEnding: node.isEnding },
        mainPath: mainPath.map(n => ({ id: n.id, title: n.title, content: n.content })),
        alternativePathsCount: alternativePaths.length,
        descendants,
        siblings,
        directChildren,
        existingLabels,
        candidateNouns,
        properNouns,
        stats: {
            totalNodes: data.nodes.length,
            depthFromRoot: mainPath.length - 1,
            hasMultipleEntries: alternativePaths.length > 0,
            outDegree: directChildren.length
        }
    };
}

// --- FORMATO LEGIBLE DEL CONTEXTO ---
function formatContextForPrompt(ctx) {
    if (!ctx) return '';
    const lines = [];
    lines.push(`## NODO DE PARTIDA ACTUAL: "${ctx.node.title}"`);
    if (ctx.node.content) lines.push(`CONTENIDO ACTUAL DEL NODO:\n${ctx.node.content}`);
    lines.push('');

    lines.push(`## CAMINO NARRATIVO RECORRIDO CRONOLÓGICAMENTE (Hasta este nodo):`);
    ctx.mainPath.forEach((n, i) => {
        if (n.id === ctx.node.id) return;
        lines.push(`  Paso ${i + 1}: [${n.title}] ${(n.content || '').substring(0, 180)}${(n.content || '').length > 180 ? '...' : ''}`);
    });
    lines.push('');

    if (ctx.directChildren.length > 0) {
        lines.push(`## RAMAS/HIJOS DIRECTOS YA EXISTENTES (PROHIBIDO REPETIR O DERIVAR DE AQUÍ):`);
        ctx.directChildren.forEach(c => {
            lines.push(`  - Hijo: "${c.title}" (Acción que lleva a él: "${c.viaLabel || '(sin etiqueta)'}")`);
        });
        lines.push('');
    }

    if (ctx.existingLabels.length > 0) {
        lines.push(`## OPCIONES DE DECISIÓN YA USADAS (PROHIBIDO DUPLICAR SEMÁNTICAMENTE):`);
        ctx.existingLabels.forEach(l => lines.push(`  - "${l}"`));
        lines.push('');
    }

    if (ctx.siblings.length > 0) {
        lines.push(`## RAMAS HERMANAS ALTERNATIVAS DISPONIBLES EN EL MISMO PASO:`);
        ctx.siblings.forEach(s => {
            lines.push(`  - OTRA OPCIÓN: "${s.viaLabel || '?'}" -> Lleva a: "${s.title}" (${s.content.substring(0, 100)}...)`);
        });
        lines.push('');
    }

    if (ctx.descendants.length > 0) {
        lines.push(`## FUTURO EXIGIDO NARRATIVAMENTE (La generación NO debe contradecir estos nodos posteriores):`);
        ctx.descendants.slice(0, 4).forEach(d => {
            lines.push(`  - (Profundidad +${d.depth}) Siguiente paso existente: "${d.title}"`);
        });
        lines.push('');
    }

    if (ctx.properNouns.length > 0) {
        lines.push(`## ENTIDADES Y PERSONAJES PRESENTES EN EL HILO: ${ctx.properNouns.join(', ')}`);
    }
    if (ctx.candidateNouns.length > 0) {
        lines.push(`## FOCO TEMÁTICO DETECTADO: ${ctx.candidateNouns.slice(0, 10).join(', ')}`);
    }

    return lines.join('\n');
}