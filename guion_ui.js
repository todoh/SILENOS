// --- LÓGICA GESTOR GUIONES v1.4 (Real-Time Sync) ---
import { broadcastSync, isRemoteUpdate } from './project_share.js'; // IMPORTACIÓN

console.log("Sistema de Guiones Iniciado (v1.4 - Sync)");

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
    // Recargar siempre de localStorage al iniciar para evitar fallos de caché
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
    // Recargar datos frescos
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
        
        item.onclick = function() { 
            openScript(script.id); 
        };

        const sceneCount = script.scenes ? script.scenes.length : 0;
        
        // Verificación IA
        const aiTag = script.isAI ? '<span class="tag-ai">IA</span>' : '';

        item.innerHTML = `
            <div class="book-info" style="pointer-events: none;"> 
                <div class="book-title">${script.title || 'Guion Sin Título'} ${aiTag}</div>
                <div class="book-meta">${sceneCount} ${sceneCount === 1 ? 'Escena' : 'Escenas'}</div>
            </div>
            <div style="opacity:0.2; pointer-events: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
        `;
        scriptsContainer.appendChild(item);
    });
}

function createNewScript() {
    // Evitar duplicación si viene de remoto
    if (isRemoteUpdate) return;

    console.log("Creando nuevo guion manual...");
    const newScript = {
        id: Date.now(),
        title: 'Nuevo Guion',
        isAI: false, // Flag manual
        scenes: [
            { title: "Planteamiento General", paragraphs: [{ text: "", image: null }] }
        ]
    };
    scripts.push(newScript);
    saveScriptData();
    renderScriptList(); 
    openScript(newScript.id);

    // 📡 EMITIR CREACIÓN
    broadcastSync('SCRIPT_CREATE', newScript);
}

function deleteCurrentScript() {
    if (isRemoteUpdate) return;

    if (confirm("¿Eliminar este guion y todas sus escenas?")) {
        const idToDelete = currentScriptId;
        scripts = scripts.filter(s => s.id !== currentScriptId);
        saveScriptData();
        goBackScript();

        // 📡 EMITIR BORRADO
        broadcastSync('SCRIPT_DELETE', { id: idToDelete });
    }
}

// --- VISTA DE EDICIÓN ---
function openScript(id) {
    scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    console.log("Abriendo guion:", id);
    currentScriptId = id;
    const script = scripts.find(s => s.id === id);
    if (!script) return;

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
        // 📡 EMITIR ACTUALIZACIÓN (Objeto completo para asegurar consistencia)
        broadcastSync('SCRIPT_UPDATE', script);
    }
}

// --- RENDERIZADO DE CONTENIDO ---
function renderScriptContent() {
    const script = scripts.find(s => s.id === currentScriptId);
    if (!script) return;

    scenesContainer.innerHTML = '';

    script.scenes.forEach((scene, sIndex) => {
        const sceneDiv = document.createElement('div');
        sceneDiv.className = 'chapter-block';

        // Header Escena
        const header = document.createElement('div');
        header.className = 'chapter-header';
        header.innerHTML = `
            <input class="chapter-title" type="text" name="scene_title_${sIndex}" value="${scene.title}" placeholder="Encabezado de Escena (ej. EXT. PARQUE - DÍA)">
            <div class="chapter-actions">
                <button class="btn-icon danger" title="Borrar Escena">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;

        const titleInput = header.querySelector('.chapter-title');
        titleInput.oninput = (e) => updateSceneTitle(sIndex, e.target.value);
        header.querySelector('.btn-icon.danger').onclick = () => deleteScene(sIndex);

        sceneDiv.appendChild(header);

        // Párrafos
        scene.paragraphs.forEach((para, pIndex) => {
            const pDiv = document.createElement('div');
            pDiv.className = 'paragraph-item';

            // Detección de parrafos IA
            const placeholder = script.isAI && sIndex === 0 
                ? (pIndex === 0 ? "Planteamiento General..." : `Planteamiento Capítulo ${pIndex}...`) 
                : "Descripción o Diálogo...";

            const controls = document.createElement('div');
            controls.className = 'paragraph-controls';
            controls.innerHTML = `
                <button class="btn-icon" title="Imagen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
                <button class="btn-icon" title="Insertar bloque debajo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                <button class="btn-icon danger" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
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
            textarea.placeholder = placeholder;
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

// --- FUNCIONES DE ACTUALIZACIÓN CON SYNC ---

function addScene() {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    if (script) {
        script.scenes.push({
            title: "Planteamiento por Capítulo",
            paragraphs: [{ text: "", image: null }]
        });
        saveScriptData();
        renderScriptContent();
        setTimeout(() => {
            const scrollArea = document.getElementById('script-editor-scroll-area');
            if(scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
        }, 100);
        
        // 📡 EMITIR
        broadcastSync('SCRIPT_UPDATE', script);
    }
}

function updateSceneTitle(sIndex, newTitle) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].title = newTitle;
    saveScriptData();
    // 📡 EMITIR
    broadcastSync('SCRIPT_UPDATE', script);
}

function deleteScene(sIndex) {
    if (isRemoteUpdate) return;
    if (confirm("¿Borrar escena completa?")) {
        const script = scripts.find(s => s.id === currentScriptId);
        script.scenes.splice(sIndex, 1);
        saveScriptData();
        renderScriptContent();
        // 📡 EMITIR
        broadcastSync('SCRIPT_UPDATE', script);
    }
}

function addScriptParagraph(sIndex) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].paragraphs.push({ text: "", image: null });
    saveScriptData();
    renderScriptContent();
    // 📡 EMITIR
    broadcastSync('SCRIPT_UPDATE', script);
}

function insertScriptParagraphAfter(sIndex, pIndex) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].paragraphs.splice(pIndex + 1, 0, { text: "", image: null });
    saveScriptData();
    renderScriptContent();
    // 📡 EMITIR
    broadcastSync('SCRIPT_UPDATE', script);
}

function updateScriptParagraphText(sIndex, pIndex, text) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].paragraphs[pIndex].text = text;
    saveScriptData();
    // 📡 EMITIR (Nota: Puede generar mucho tráfico, pero asegura consistencia)
    broadcastSync('SCRIPT_UPDATE', script);
}

function deleteScriptParagraph(sIndex, pIndex) {
    if (isRemoteUpdate) return;
    const script = scripts.find(s => s.id === currentScriptId);
    script.scenes[sIndex].paragraphs.splice(pIndex, 1);
    saveScriptData();
    renderScriptContent();
    // 📡 EMITIR
    broadcastSync('SCRIPT_UPDATE', script);
}

// --- IMÁGENES ---
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
                
                // 📡 EMITIR IMAGEN (Cuidado con el tamaño)
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
    // 📡 EMITIR
    broadcastSync('SCRIPT_UPDATE', script);
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// --- API RECEPTORA (Llamada desde project_share.js) ---
window.applyRemoteScriptUpdate = function(action, payload) {
    scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];

    if (action === 'SCRIPT_UPDATE') {
        const index = scripts.findIndex(s => s.id === payload.id);
        if (index !== -1) {
            scripts[index] = payload;
            saveScriptData();
            
            // Si estamos viendo este guion, actualizar UI
            if (currentScriptId === payload.id) {
                // Actualizar título si cambió
                if(document.activeElement !== scriptDetailTitle) {
                    scriptDetailTitle.value = payload.title;
                }
                // Re-renderizar contenido completo
                // (Para evitar perder foco al escribir, idealmente solo actualizaríamos el DOM diff,
                // pero por consistencia recreamos la vista salvo que estemos escribiendo en un textarea)
                if (document.activeElement.tagName !== 'TEXTAREA') {
                    renderScriptContent();
                } else {
                    // Si estamos escribiendo, quizás no renderizar todo para no perder el foco
                    // pero actualizamos datos en background.
                }
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
        if (currentScriptId === payload.id) {
            goBackScript();
        }
        renderScriptList();
    }
};

// EXPORTAR A WINDOW
window.createNewScript = createNewScript;
window.deleteCurrentScript = deleteCurrentScript;
window.goBackScript = goBackScript;
window.updateScriptTitle = updateScriptTitle;
window.addScene = addScene;
window.renderScriptList = renderScriptList;