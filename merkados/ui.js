// ui.js
// --- INTERFAZ DE USUARIO Y DOM INTERACTIVO RPG (CON ACUMULACIÓN DE OBJETOS) ---
const nodeEditor = document.getElementById('node-editor');
const optionsPanel = document.getElementById('options-panel');

function switchSidebarTab(tabName) {
    const containers = ['library', 'io', 'voice'];
    containers.forEach(c => {
        const el = document.getElementById(`sidebar-content-${c}`);
        if (el) el.classList.add('hidden');
    });

    const tabs = ['library', 'io', 'voice'];
    tabs.forEach(t => {
        const btn = document.getElementById(`sidebar-tab-${t}`);
        if (btn) {
            btn.classList.remove('bg-black', 'text-white');
            btn.classList.add('hover:bg-black', 'hover:text-white');
        }
    });

    const activeContainer = document.getElementById(`sidebar-content-${tabName}`);
    if (activeContainer) activeContainer.classList.remove('hidden');

    const activeBtn = document.getElementById(`sidebar-tab-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('hover:bg-black', 'hover:text-white');
        activeBtn.classList.add('bg-black', 'text-white');
    }
}

function handleRenameProject(newName) {
    if (typeof data !== 'undefined') {
        data.name = newName;
        if (typeof saveLogic === 'function') saveLogic();
    }
}

function renderSidebar() {
    const list = document.getElementById('project-list');
    if (!list) return;
    list.innerHTML = '';
    for (let id in projects) {
        const activeClass = id === currentId ? 'font-bold underline' : 'opacity-60';
        const nodeCount = (projects[id].nodes || []).length;
        list.innerHTML += `
            <li class="sidebar-item flex justify-between items-center group cursor-pointer py-1" onclick="handleLoadProject('${id}')">
                <div class="flex flex-col flex-grow min-w-0">
                    <span class="text-xs truncate ${activeClass}">${projects[id].name}</span>
                    <span class="text-[8px] opacity-30 uppercase">${nodeCount} nodos</span>
                </div>
                <button onclick="handleDeleteProject('${id}', event)" class="delete-btn opacity-0 text-[9px] hover:text-red-500 transition">ELIMINAR</button>
            </li>
        `;
    }
    updateProjectStats();
}

function updateProjectStats() {
    const el = document.getElementById('project-stats');
    if (!el) return;
    const wc = data.nodes.reduce((s, n) => s + (n.content || '').split(/\s+/).filter(Boolean).length, 0);
    el.textContent = `${data.nodes.length} nodos   ${data.connections.length} conexiones   ${wc} palabras`;
}

function handleLoadProject(id) {
    return loadProjectLogic(id).then(() => {
        const pInput = document.getElementById('project-name-input');
        if (pInput) pInput.value = data.name;
        closeEditor();
        renderSidebar();
        if (typeof syncCanonToPanel === 'function') syncCanonToPanel();
        if (typeof updateGrid === 'function') updateGrid();
    });
}

function handleNewProject() {
    newProjectLogic();
    handleLoadProject(currentId);
}

function handleDeleteProject(id, e) {
    e.stopPropagation();
    if (!confirm(`¿Eliminar el proyecto "${projects[id].name}"? Esta acción no se puede deshacer.`)) return;
    deleteProjectLogic(id);
    handleLoadProject(currentId);
}

function openEditor(type, item) {
    if (!nodeEditor) return;
    nodeEditor.style.display = 'flex';
    
    ensureRpgEditorFields();

    if (type === 'node') {
        document.getElementById('editor-type-label').innerText = "Nodo   " + item.id.substring(0, 14);
        document.getElementById('node-title').value = item.title;
        document.getElementById('node-content').value = item.content;
        document.getElementById('editor-node-fields').classList.remove('hidden');
        document.getElementById('editor-connection-fields').classList.add('hidden');
        
        // Mecanismo de blindaje contra objetos rewards/rpg mal formados o ausentes
        if (!item.rewards) item.rewards = {};
        const rpg = item.rewards.rpg || { healthMod: 0, maxHealthMod: 0, goldMod: 0, addItems: [], removeItems: [] };
        
        document.getElementById('node-rpg-hp').value = rpg.healthMod || 0;
        document.getElementById('node-rpg-maxhp').value = rpg.maxHealthMod || 0;
        document.getElementById('node-rpg-gold').value = rpg.goldMod || 0;
        document.getElementById('node-rpg-add-item').value = (rpg.addItems || []).join(', ');
        document.getElementById('node-rpg-rem-item').value = (rpg.removeItems || []).join(', ');

        const endBtn = document.getElementById('node-ending-toggle');
        if (endBtn) {
            endBtn.classList.toggle('bg-black', item.isEnding);
            endBtn.classList.toggle('text-white', item.isEnding);
            endBtn.textContent = item.isEnding ? '  Es Final' : '  Marcar como Final';
        }
        if (typeof renderNodeMediaContainer === 'function') renderNodeMediaContainer(item);
        updateWordCount();
        if (typeof renderOptionsPanel === 'function') renderOptionsPanel(item);
    } else {
        document.getElementById('connection-label').value = item.label || "";
        document.getElementById('editor-node-fields').classList.add('hidden');
        document.getElementById('editor-connection-fields').classList.remove('hidden');
        
        const conds = item.conditions || { requiredGold: 0, requiredItems: [], forbiddenItems: [] };
        document.getElementById('conn-rpg-reqgold').value = conds.requiredGold || 0;
        document.getElementById('conn-rpg-reqitems').value = (conds.requiredItems || []).join(', ');
        document.getElementById('conn-rpg-forbitems').value = (conds.forbiddenItems || []).join(', ');

        if (optionsPanel) optionsPanel.classList.add('hidden');
    }
}

function ensureRpgEditorFields() {
    if (!document.getElementById('node-rpg-container')) {
        const nodeFields = document.getElementById('editor-node-fields');
        const htmlNodeRpg = `
        <div id="node-rpg-container" class="border-t border-dashed border-black mt-2 pt-2 space-y-1 font-mono text-[9px]">
            <p class="font-bold uppercase tracking-wider opacity-60">Impacto Mutación RPG</p>
            <div class="grid grid-cols-3 gap-1">
                <div>Δ HP: <input type="number" id="node-rpg-hp" oninput="saveNodeRPG()" class="w-full border border-black text-center p-0.5"></div>
                <div>Δ MaxHP: <input type="number" id="node-rpg-maxhp" oninput="saveNodeRPG()" class="w-full border border-black text-center p-0.5"></div>
                <div>Δ Oro: <input type="number" id="node-rpg-gold" oninput="saveNodeRPG()" class="w-full border border-black text-center p-0.5"></div>
            </div>
            <div class="grid grid-cols-2 gap-1 mt-1">
                <div>+ Item(s): <input type="text" id="node-rpg-add-item" oninput="saveNodeRPG()" placeholder="POCION, POCION" class="w-full border border-black px-1 py-0.5"></div>
                <div>- Item(s): <input type="text" id="node-rpg-rem-item" oninput="saveNodeRPG()" placeholder="POCION" class="w-full border border-black px-1 py-0.5"></div>
            </div>
        </div>`;
        nodeFields.appendChild(document.createRange().createContextualFragment(htmlNodeRpg));
    }

    if (!document.getElementById('conn-rpg-container')) {
        const connFields = document.getElementById('editor-connection-fields');
        const htmlConnRpg = `
        <div id="conn-rpg-container" class="border-t border-dashed border-black mt-2 pt-2 space-y-2 font-mono text-[9px]">
            <p class="font-bold uppercase tracking-wider opacity-60">Condición de Apertura RPG</p>
            <div>Oro Mínimo: <input type="number" id="conn-rpg-reqgold" oninput="saveConnRPG()" class="w-full border border-black p-1"></div>
            <div>Objetos Necesarios (acumulativos): <input type="text" id="conn-rpg-reqitems" oninput="saveConnRPG()" placeholder="Ej: POCION, POCION" class="w-full border border-black p-1"></div>
            <div>Objetos Prohibidos: <input type="text" id="conn-rpg-forbitems" oninput="saveConnRPG()" placeholder="Ej: MALDICION" class="w-full border border-black p-1"></div>
        </div>`;
        connFields.appendChild(document.createRange().createContextualFragment(htmlConnRpg));
    }
}

function saveNodeRPG() {
    if (!window.selectedNode) return;
    if (!window.selectedNode.rewards) window.selectedNode.rewards = {};
    window.selectedNode.rewards.rpg = {
        healthMod: parseInt(document.getElementById('node-rpg-hp').value, 10) || 0,
        maxHealthMod: parseInt(document.getElementById('node-rpg-maxhp').value, 10) || 0,
        goldMod: parseInt(document.getElementById('node-rpg-gold').value, 10) || 0,
        addItems: document.getElementById('node-rpg-add-item').value.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean),
        removeItems: document.getElementById('node-rpg-rem-item').value.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)
    };
    saveLogic();
}

function saveConnRPG() {
    if (!window.selectedConnection) return;
    window.selectedConnection.conditions = {
        requiredGold: parseInt(document.getElementById('conn-rpg-reqgold').value, 10) || 0,
        requiredItems: document.getElementById('conn-rpg-reqitems').value.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean),
        forbiddenItems: document.getElementById('conn-rpg-forbitems').value.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)
    };
    saveLogic();
}

function toggleNodeEnding() {
    if (!window.selectedNode) return;
    toggleEndingLogic(window.selectedNode.id);
    openEditor('node', window.selectedNode);
}

function closeEditor() {
    if (nodeEditor) nodeEditor.style.display = 'none';
    if (optionsPanel) optionsPanel.classList.add('hidden');
    window.selectedNode = null;
    window.selectedConnection = null;
}

async function exportProject() {
    try {
        const exportedNodes = [];
        for (const n of data.nodes) {
            const fullImg = typeof getMediaFromFileSystem === 'function' ? await getMediaFromFileSystem(n.id) : null;
            exportedNodes.push({ ...n, image: fullImg || null });
        }
        const payload = {
             ...data,
             nodes: exportedNodes,
             visualStyle: data.visualStyle || "",
             visualBible: data.visualBible || "",
             exportedAt: new Date().toISOString(),
             version: SCHEMA_VERSION
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${data.name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (err) { alert('Error: ' + err.message); }
}

function importProject() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => {
            try {
                const obj = JSON.parse(ev.target.result);
                const id = genId('proj');
                if (typeof saveMediaToFileSystem === 'function') {
                    for (const n of obj.nodes) {
                        if (n.image && n.image.startsWith('data:image')) await saveMediaToFileSystem(n.id, n.image);
                    }
                }
                projects[id] = normalizeProject(obj);
                await loadProjectLogic(id);
                if (typeof saveLogic === 'function') await saveLogic();
                await handleLoadProject(id);
            } catch (err) { alert('Error: ' + err.message); }
        };
        reader.readAsText(file);
    };
    inp.click();
}

function exportWord() {
    if (data.nodes.length === 0) { alert("El proyecto está vacío."); return; }
    let html = `<!DOCTYPE html><html lang="es"><head><title>${data.name}</title></head><body><h1>${data.name}</h1>`;
    data.nodes.forEach((n) => {
        html += `<h2>${n.title}</h2><p>${n.content}</p>`;
    });
    html += `</body></html>`;
    const blob = htmlDocx.asBlob(html);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${data.name}.docx`;
    a.click();
}

function handleAutoLayout() {
    autoLayoutLogic();
    if (typeof fitToScreen === 'function') setTimeout(fitToScreen, 50);
}