// SILENOS/guion_ui.js
// --- LÓGICA GESTOR GUIONES v1.6 (Quick Export UI) ---
import { broadcastSync, isRemoteUpdate } from './project_share.js';
import { loadFileContent } from './drive_api.js';

console.log("Sistema de Guiones Iniciado (v1.6 - Quick Export UI)");

let scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
let currentScriptId = null;

let scriptUploadContext = { sceneIdx: null, paragraphIdx: null };

// DOM Elements
const scriptsContainer = document.getElementById('scripts-container');
const scriptListView = document.getElementById('script-list-view');
const scriptDetailView = document.getElementById('script-detail-view');
const scriptDetailTitle = document.getElementById('script-detail-title');
const scenesContainer = document.getElementById('scenes-container');
const scriptImageInput = document.getElementById('script-image-input');

// --- INICIO ---
if (scriptsContainer) {
    scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    renderScriptList();
}

// --- FUNCIONES DE ALMACENAMIENTO ---
function saveScriptData() {
    try {
        localStorage.setItem('minimal_scripts_v1', JSON.stringify(scripts));
    } catch (e) {
        alert("Espacio lleno. Reduce el tamaño de las imágenes.");
    }
}

// --- GESTIÓN DE LISTA DE GUIONES ---
function renderScriptList() {
    scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    
    if (!scriptsContainer) return;
    scriptsContainer.innerHTML = '';
    
    if (scripts.length === 0) {
        scriptsContainer.innerHTML = '<div style="text-align:center; padding: 40px; color:#ccc; font-weight:300;">No hay guiones creados.</div>';
        return;
    }

    scripts.slice().reverse().forEach(script => {
        const item = document.createElement('div');
        item.className = 'book-item';
        item.style.position = 'relative'; 
        
        const isCloud = script.isPlaceholder;
        
        item.onclick = function() { 
            openScript(script.id); 
        };

        const sceneCount = isCloud ? '☁️' : (script.scenes ? script.scenes.length : 0);
        const countLabel = isCloud ? 'En Nube' : (sceneCount === 1 ? 'Escena' : 'Escenas');
        
        const aiTag = script.isAI ? '<span class="tag-ai">IA</span>' : '';
        const cloudIcon = isCloud ? '<span style="font-size:0.8rem; margin-right:5px;">☁️</span>' : '';

        item.innerHTML = `
            <div class="book-info" style="pointer-events: none; padding-right: 60px;"> 
                <div class="book-title">${cloudIcon}${script.title || 'Guion Sin Título'} ${aiTag}</div>
                <div class="book-meta">${isCloud ? '' : sceneCount} ${countLabel}</div>
            </div>
             <div class="quick-export-bar">
                <span class="export-badge" onclick="event.stopPropagation(); window.quickExport('script', ${script.id}, 'html')" title="Descargar HTML">HTML</span>
                <span class="export-badge" onclick="event.stopPropagation(); window.quickExport('script', ${script.id}, 'doc')" title="Descargar DOC">DOC</span>
                <span class="export-badge" onclick="event.stopPropagation(); window.quickExport('script', ${script.id}, 'txt')" title="Descargar TXT">TXT</span>
            </div>
        `;
        scriptsContainer.appendChild(item);
    });
}

function createNewScript() {
    if (isRemoteUpdate) return;

    console.log("Creando nuevo guion manual...");
    const newScript = {
        id: Date.now(),
        title: 'Nuevo Guion',
        isAI: false, 
        scenes: [
            { title: "Planteamiento General", paragraphs: [{ text: "", image: null }] }
        ]
    };
    scripts.push(newScript);
    saveScriptData();
    renderScriptList(); 
    openScript(newScript.id);

    broadcastSync('SCRIPT_CREATE', newScript);
}

function deleteCurrentScript() {
    if (isRemoteUpdate) return;

    if (confirm("¿Eliminar este guion?")) {
        const idToDelete = currentScriptId;
        scripts = scripts.filter(s => s.id !== currentScriptId);
        saveScriptData();
        goBackScript();
        broadcastSync('SCRIPT_DELETE', { id: idToDelete });
    }
}

async function openScript(id) {
    scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    let script = scripts.find(s => s.id === id);
    if (!script) return;

    if (script.isPlaceholder) {
        console.log(`☁️ Descargando contenido para: ${script.title}`);
        
        scriptListView.style.display = 'none';
        scriptDetailView.style.display = 'flex';
        scriptDetailTitle.value = "Descargando...";
        scenesContainer.innerHTML = '<div style="padding:50px; text-align:center; color:#aaa;">Obteniendo datos de la nube...</div>';

        try {
            const fullData = await loadFileContent(script.driveFileId);
            
            if (!fullData) throw new Error("Archivo vacío o error de red");

            const driveId = script.driveFileId;
            Object.assign(script, fullData);
            
            script.driveFileId = driveId; 
            delete script.isPlaceholder;

            saveScriptData();
            
            id = script.id; 

        } catch (e) {
            alert("Error descargando guion: " + e.message);
            goBackScript();
            return;
        }
    }

    currentScriptId = id;
    
    scriptListView.style.display = 'none';
    scriptDetailView.style.display = 'flex';

    scriptDetailTitle.value = script.title;
    renderScriptContent();
}

function goBackScript() {
    currentScriptId = null;
    scriptDetailView.style.display = 'none';
    scriptListView.style.display = 'block';
    renderScriptList();
}

function updateScriptTitle() {
    if (isRemoteUpdate) return;

    const script = scripts.find(s => s.id === currentScriptId);
    if (script) {
        script.title = scriptDetailTitle.value;
        saveScriptData();
        broadcastSync('SCRIPT_UPDATE', script);
    }
}

function renderScriptContent() {
    const script = scripts.find(s => s.id === currentScriptId);
    if (!script) return;

    scenesContainer.innerHTML = '';
    if (!script.scenes) script.scenes = [];

    script.scenes.forEach((scene, sIndex) => {
        const sceneDiv = document.createElement('div');
        sceneDiv.className = 'chapter-block';

        const header = document.createElement('div');
        header.className = 'chapter-header';
        header.innerHTML = `
            <input class="chapter-title" type="text" name="scene_title_${sIndex}" value="${scene.title}" placeholder="Encabezado de Escena">
            <div class="chapter-actions">
                <button class="btn-icon danger" title="Borrar Escena">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;

        const titleInput = header.querySelector('.chapter-title');
        titleInput.oninput = (e) => updateSceneTitle(sIndex, e.target.value);
        header.querySelector('.btn-icon.danger').onclick = () => deleteScene(sIndex);

        sceneDiv.appendChild(header);

        scene.paragraphs.forEach((para, pIndex) => {
            const pDiv = document.createElement('div');
            pDiv.className = 'paragraph-item';

            const controls = document.createElement('div');
            controls.className = 'paragraph-controls';
            controls.innerHTML = `
                <button class="btn-icon" title="Imagen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
                <button class="btn-icon" title="Insertar bloque debajo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                <button class="btn-icon danger" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            `;

            controls.querySelector('button[title="Imagen"]').onclick = () => triggerScriptImageUpload(sIndex, pIndex);
            controls.querySelector('button[title="Insertar bloque debajo"]').onclick = () => insertScriptParagraphAfter(sIndex, pIndex);
            controls.querySelector('button[title="Eliminar"]').onclick = () => deleteScriptParagraph(sIndex, pIndex);

            pDiv.appendChild(controls);

            if (para.image) {
                const imgCont = document.createElement('div');
                imgCont.className = 'paragraph-image-container';
                imgCont.innerHTML = `<img src="${para.image}" class="paragraph-image"><button class="remove-image-btn">×</button>`;
                imgCont.querySelector('button').onclick = () => removeScriptImage(sIndex, pIndex);
                pDiv.appendChild(imgCont);
            }

            const textarea = document.createElement('textarea');
            textarea.className = 'paragraph-content';
            textarea.rows = 1;
            textarea.value = para.text;
            textarea.placeholder = "Descripción o Diálogo...";
            textarea.oninput = (e) => {
                autoResize(e.target);
                updateScriptParagraphText(sIndex, pIndex, e.target.value);
            };

            pDiv.appendChild(textarea);
            sceneDiv.appendChild(pDiv);
            setTimeout(() => autoResize(textarea), 0);
        });

        const addPBtn = document.createElement('button');
        addPBtn.className = 'add-p-btn';
        addPBtn.innerHTML = '<span class="add-p-symbol">+</span>';
        addPBtn.onclick = () => addScriptParagraph(sIndex);
        sceneDiv.appendChild(addPBtn);

        scenesContainer.appendChild(sceneDiv);
    });
}

function addScene() {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    if (script) {
        script.scenes.push({
            title: "Nueva Escena",
            paragraphs: [{ text: "", image: null }]
        });
        saveScriptData();
        renderScriptContent();
        setTimeout(() => {
            const scrollArea = document.getElementById('script-editor-scroll-area');
            if(scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
        }, 100);
        broadcastSync('SCRIPT_UPDATE', script);
    }
}

function updateSceneTitle(sIndex, newTitle) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].title = newTitle;
    saveScriptData();
    broadcastSync('SCRIPT_UPDATE', script);
}

function deleteScene(sIndex) {
    if (isRemoteUpdate) return;
    if (confirm("¿Borrar escena completa?")) {
        const script = scripts.find(s => s.id === currentScriptId);
        script.scenes.splice(sIndex, 1);
        saveScriptData();
        renderScriptContent();
        broadcastSync('SCRIPT_UPDATE', script);
    }
}

function addScriptParagraph(sIndex) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].paragraphs.push({ text: "", image: null });
    saveScriptData();
    renderScriptContent();
    broadcastSync('SCRIPT_UPDATE', script);
}

function insertScriptParagraphAfter(sIndex, pIndex) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].paragraphs.splice(pIndex + 1, 0, { text: "", image: null });
    saveScriptData();
    renderScriptContent();
    broadcastSync('SCRIPT_UPDATE', script);
}

function updateScriptParagraphText(sIndex, pIndex, text) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].paragraphs[pIndex].text = text;
    saveScriptData();
    broadcastSync('SCRIPT_UPDATE', script);
}

function deleteScriptParagraph(sIndex, pIndex) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].paragraphs.splice(pIndex, 1);
    saveScriptData();
    renderScriptContent();
    broadcastSync('SCRIPT_UPDATE', script);
}

function triggerScriptImageUpload(sIndex, pIndex) {
    scriptUploadContext = { sceneIdx: sIndex, paragraphIdx: pIndex };
    if(scriptImageInput) scriptImageInput.click();
}

if(scriptImageInput) {
    scriptImageInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0] && scriptUploadContext.sceneIdx !== null) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const script = scripts.find(s => s.id === currentScriptId);
                script.scenes[scriptUploadContext.sceneIdx].paragraphs[scriptUploadContext.paragraphIdx].image = event.target.result;
                saveScriptData();
                renderScriptContent();
                broadcastSync('SCRIPT_UPDATE', script);
                scriptImageInput.value = ''; 
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

function removeScriptImage(sIndex, pIndex) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].paragraphs[pIndex].image = null;
    saveScriptData();
    renderScriptContent();
    broadcastSync('SCRIPT_UPDATE', script);
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

window.applyRemoteScriptUpdate = function(action, payload) {
    scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    if (action === 'SCRIPT_UPDATE') {
        const index = scripts.findIndex(s => s.id === payload.id);
        if (index !== -1) {
            scripts[index] = payload;
            saveScriptData();
            if (currentScriptId === payload.id) {
                if(document.activeElement !== scriptDetailTitle) scriptDetailTitle.value = payload.title;
                if (document.activeElement.tagName !== 'TEXTAREA') renderScriptContent();
            }
            renderScriptList();
        }
    } else if (action === 'SCRIPT_CREATE') {
        if (!scripts.find(s => s.id === payload.id)) {
            scripts.unshift(payload);
            saveScriptData();
            renderScriptList();
        }
    } else if (action === 'SCRIPT_DELETE') {
        scripts = scripts.filter(s => s.id !== payload.id);
        saveScriptData();
        if (currentScriptId === payload.id) goBackScript();
        renderScriptList();
    }
};

window.createNewScript = createNewScript;
window.deleteCurrentScript = deleteCurrentScript;
window.goBackScript = goBackScript;
window.updateScriptTitle = updateScriptTitle;
window.addScene = addScene;
window.renderScriptList = renderScriptList;