// ui.js
// --- INTERFAZ DE USUARIO Y DOM ---
const nodeEditor = document.getElementById('node-editor');
const optionsPanel = document.getElementById('options-panel');

// ui.js
// --- CONTROL DE PESTAÑAS Y RESPONSIVIDAD DEL SIDEBAR EN MERKADOS ---

function switchSidebarTab(tabName) {
    // 1. Ocultar todos los contenedores de contenido
    const containers = ['library', 'io', 'voice'];
    containers.forEach(c => {
        const el = document.getElementById(`sidebar-content-${c}`);
        if (el) el.classList.add('hidden');
    });

    // 2. Limpiar estilos activos de todos los botones de la barra superior
    const tabs = ['library', 'io', 'voice'];
    tabs.forEach(t => {
        const btn = document.getElementById(`sidebar-tab-${t}`);
        if (btn) {
            btn.classList.remove('bg-black', 'text-white');
            btn.classList.add('hover:bg-black', 'hover:text-white');
        }
    });

    // 3. Mostrar el contenedor de la pestaña seleccionada
    const activeContainer = document.getElementById(`sidebar-content-${tabName}`);
    if (activeContainer) {
        activeContainer.classList.remove('hidden');
    }

    // 4. Aplicar estilos activos al botón seleccionado
    const activeBtn = document.getElementById(`sidebar-tab-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('hover:bg-black', 'hover:text-white');
        activeBtn.classList.add('bg-black', 'text-white');
    }

    console.log(`[UI] Pestaña de la columna izquierda cambiada a: ${tabName.toUpperCase()}`);
}

function handleRenameProject(newName) {
    if (typeof data !== 'undefined') {
        data.name = newName;
        if (typeof saveLogic === 'function') {
            saveLogic();
        }
    }
}

function updateProjectStatsView(nodeCount, connCount) {
    const statsEl = document.getElementById('project-stats');
    if (statsEl) {
        statsEl.innerText = `${nodeCount} nodos   ${connCount} conexiones`;
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
    if (type === 'node') {
        document.getElementById('editor-type-label').innerText = "Nodo   " + item.id.substring(0, 14);
        document.getElementById('node-title').value = item.title;
        document.getElementById('node-content').value = item.content;
        document.getElementById('editor-node-fields').classList.remove('hidden');
        document.getElementById('editor-connection-fields').classList.add('hidden');
        const endBtn = document.getElementById('node-ending-toggle');
        if (endBtn) {
            endBtn.classList.toggle('bg-black', item.isEnding);
            endBtn.classList.toggle('text-white', item.isEnding);
            endBtn.textContent = item.isEnding ? '  Es Final' : '  Marcar como Final';
        }
        if (typeof renderNodeMediaContainer === 'function') {
            renderNodeMediaContainer(item);
        }
        updateWordCount();
        if (typeof renderOptionsPanel === 'function') {
            renderOptionsPanel(item);
        }
    } else {
        document.getElementById('connection-label').value = item.label || "";
        document.getElementById('editor-node-fields').classList.add('hidden');
        document.getElementById('editor-connection-fields').classList.remove('hidden');
        if (optionsPanel) optionsPanel.classList.add('hidden');
    }
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
            const fullImg = typeof getMediaFromDB === 'function' ? await getMediaFromDB(n.id) : null;
            exportedNodes.push({
                ...n,
                image: fullImg || null
            });
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
        URL.revokeObjectURL(a.href);
    } catch (err) {
        alert('Error al exportar el JSON: ' + err.message);
    }
}

function importProject() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => {
            try {
                const obj = JSON.parse(ev.target.result);
                if (!obj.nodes || !Array.isArray(obj.nodes)) throw new Error('Formato inválido');
                                 
                const id = genId('proj');
                                 
                if (typeof saveMediaToDB === 'function') {
                    for (const n of obj.nodes) {
                        if (n.image && n.image.startsWith('data:image')) {
                            await saveMediaToDB(n.id, n.image);
                        }
                    }
                }
                projects[id] = normalizeProject({
                    name: obj.name || file.name.replace(/\.json$/, ''),
                    nodes: obj.nodes,
                    connections: obj.connections || []
                });
                                 
                projects[id].visualStyle = obj.visualStyle || "";
                projects[id].visualBible = obj.visualBible || "";
                loadProjectLogic(id).then(() => {
                    handleLoadProject(id);
                    if (typeof flashSaveIndicator === 'function') flashSaveIndicator('IMPORTADO');
                });
            } catch (err) {
                alert('No se pudo importar: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    inp.click();
}

function exportWord() {
    if (data.nodes.length === 0) { alert("El proyecto está vacío."); return; }
    if (typeof htmlDocx === 'undefined') { alert("Error: No se pudo cargar el convertidor de DOCX."); return; }
    let html = `
    <!DOCTYPE html><html lang="es"><head><meta charset='utf-8'><title>${data.name}</title>
    <style>
        body { font-family: 'Arial', sans-serif; }
        h1 { text-align: center; text-transform: uppercase; border-bottom: 2px solid black; padding-bottom: 10px; }
        h2 { margin-top: 40px; text-transform: uppercase; }
        p { line-height: 1.6; }
        ul { list-style-type: none; padding-left: 0; }
        li { margin-bottom: 10px; }
        a { text-decoration: none; color: blue; font-weight: bold; }
        .ending { color: #7f1d1d; font-style: italic; }
    </style></head><body><h1>${data.name}</h1>`;
    data.nodes.forEach((n, index) => {
        if (index > 0) html += `<br style='page-break-before: always; clear: both;'>`;
        html += `<div id="nodo_${n.id}">`;
        html += `<h2>${n.title}${n.isEnding ? ' <span class="ending">[FINAL]</span>' : ''}</h2>`;
        html += `<p>${(n.content || '').replace(/\n/g, '<br>')}</p>`;
        const outgoing = data.connections.filter(c => c.from === n.id);
        if (outgoing.length > 0) {
            html += `<ul>`;
            outgoing.forEach(c => {
                html += `<li><a href="#nodo_${c.to}"> → ${c.label || 'Continuar'}</a></li>`;
            });
            html += `</ul>`;
        } else {
            html += `<p><em>[Fin del camino]</em></p>`;
        }
        html += `</div>`;
    });
    html += `</body></html>`;
    const blob = htmlDocx.asBlob(html);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${data.name.replace(/\s+/g, '_')}_Librojuego.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function handleAutoLayout() {
    autoLayoutLogic();
    if (typeof fitToScreen === 'function') setTimeout(fitToScreen, 50);
}