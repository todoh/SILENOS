// --- LÓGICA DE DATOS UI v3.2 (Lazy Load Datasets) ---
// Descarga el contenido del universo solo cuando se selecciona.

import { broadcastSync, isRemoteUpdate } from './project_share.js'; 
import { loadFileContent } from './drive_api.js'; // <--- IMPORTANTE

console.log("Sistema Universal Data Cargado (v3.2 - Lazy)");

// CLAVES DE ALMACENAMIENTO
const STORAGE_KEY_ACTIVE_DATA = 'minimal_universal_data'; 
const STORAGE_KEY_ACTIVE_NAME = 'silenos_universe_name'; 
const STORAGE_KEY_LIBRARY = 'silenos_datasets_library_v2'; 
const STORAGE_KEY_CURRENT_ID = 'silenos_active_dataset_id'; 

// VARIABLES DE ESTADO
let universalData = [];
let currentCardId = null;
let library = []; 
let activeDatasetId = null; 

// ELEMENTOS DOM
const cardsContainer = document.getElementById('cards-container');
const editorView = document.getElementById('data-editor-view');
const editorContent = document.querySelector('.editor-content');
const editorEmpty = document.querySelector('.editor-empty-state');
const inputCategory = document.getElementById('card-category');
const inputTitle = document.getElementById('card-title');
const inputBody = document.getElementById('card-body');
const datalist = document.getElementById('category-suggestions');
const universeNameInput = document.getElementById('universe-name-input');
const datasetSelector = document.getElementById('dataset-selector');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initLibrarySystem();
    
    if (cardsContainer) {
        renderCards();
        updateDatalist();
        updateUIHeader();
    }
});

window.refreshDatasetLibrary = function() {
    console.log("♻️ Recargando librería de datasets (Sync externo)...");
    initLibrarySystem();
    if (datasetSelector) {
        datasetSelector.style.transition = "background 0.3s";
        datasetSelector.style.backgroundColor = "#dff9fb";
        setTimeout(() => datasetSelector.style.backgroundColor = "var(--bg-color)", 800);
    }
};

// --- SISTEMA DE LIBRERÍA (CORE) ---

function initLibrarySystem() {
    try {
        library = JSON.parse(localStorage.getItem(STORAGE_KEY_LIBRARY)) || [];
    } catch (e) {
        library = [];
    }
    activeDatasetId = localStorage.getItem(STORAGE_KEY_CURRENT_ID);

    if (library.length === 0) {
        const legacyData = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVE_DATA)) || [];
        const legacyName = localStorage.getItem(STORAGE_KEY_ACTIVE_NAME) || "Proyecto Principal";
        
        const newId = 'ds_' + Date.now();
        const newProject = {
            id: newId,
            name: legacyName,
            data: legacyData,
            timestamp: Date.now()
        };
        
        library.push(newProject);
        activeDatasetId = newId;
        saveLibrary(); 
    }

    const exists = library.find(p => p.id === activeDatasetId);
    if (!exists && library.length > 0) {
        activeDatasetId = library[0].id;
    }

    // Cargamos sin forzar descarga inmediata (se asume que el activo ya está en localStorage 'minimal_universal_data')
    // Si no lo está, switchDataset lo arreglará.
    
    renderDatasetSelector();
}

function generateId() {
    return 'ds_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function saveLibrary() {
    localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(library));
    localStorage.setItem(STORAGE_KEY_CURRENT_ID, activeDatasetId);
}

function loadProjectIntoMemory(projectId, forceData = null) {
    const project = library.find(p => p.id === projectId);
    if (!project) return;

    activeDatasetId = projectId;
    // Si pasamos forceData (recién descargado), lo usamos. Si no, usamos lo que haya en library.
    universalData = forceData || project.data || [];
    
    const projectName = project.name || "Sin Nombre";

    localStorage.setItem(STORAGE_KEY_ACTIVE_DATA, JSON.stringify(universalData));
    localStorage.setItem(STORAGE_KEY_ACTIVE_NAME, projectName);
    localStorage.setItem(STORAGE_KEY_CURRENT_ID, activeDatasetId);

    if (universeNameInput) universeNameInput.value = projectName;
    const dock = document.getElementById('current-project-name');
    if (dock) dock.textContent = projectName;
}

function commitCurrentStateToLibrary() {
    if (!activeDatasetId) return;

    const projectIndex = library.findIndex(p => p.id === activeDatasetId);
    if (projectIndex !== -1) {
        library[projectIndex].data = universalData;
        library[projectIndex].name = localStorage.getItem(STORAGE_KEY_ACTIVE_NAME);
        library[projectIndex].timestamp = Date.now();
        delete library[projectIndex].isPlaceholder; // Asegurar que ya no es placeholder
        saveLibrary();
    }
}

// --- GESTIÓN DEL SELECTOR Y LAZY LOAD ---

function renderDatasetSelector() {
    if (!datasetSelector) return;
    datasetSelector.innerHTML = '';

    library.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).forEach(proj => {
        const opt = document.createElement('option');
        opt.value = proj.id;
        // Indicador visual si está en la nube
        opt.textContent = (proj.isPlaceholder ? "☁️ " : "") + proj.name; 
        if (proj.id === activeDatasetId) opt.selected = true;
        datasetSelector.appendChild(opt);
    });
}

// ACCIÓN: CAMBIAR PROYECTO (CON LAZY LOAD)
window.switchDataset = async function(newId) {
    if (!newId || newId === activeDatasetId) return;

    console.log(`🔄 Cambiando dataset...`);

    // 1. Guardar estado actual
    commitCurrentStateToLibrary();

    const targetProject = library.find(p => p.id === newId);
    
    // --- LAZY LOAD ---
    if (targetProject && targetProject.isPlaceholder) {
        if(datasetSelector) datasetSelector.disabled = true;
        
        try {
            console.log("☁️ Descargando dataset completo...");
            const fileData = await loadFileContent(targetProject.driveFileId);
            
            if (!fileData) throw new Error("Datos vacíos");

            // Adaptador de formato (items vs array directo)
            let realItems = [];
            if (Array.isArray(fileData)) realItems = fileData;
            else if (fileData.items) realItems = fileData.items;

            // Actualizar objeto en librería
            targetProject.data = realItems;
            delete targetProject.isPlaceholder;
            
            // Cargar con los datos frescos
            loadProjectIntoMemory(newId, realItems);
            saveLibrary(); // Guardar el cambio de placeholder a real

        } catch (e) {
            alert("Error descargando dataset: " + e.message);
            datasetSelector.value = activeDatasetId; // Revertir select
            datasetSelector.disabled = false;
            return;
        } finally {
            if(datasetSelector) datasetSelector.disabled = false;
        }
    } else {
        // Carga normal local
        loadProjectIntoMemory(newId);
    }

    // 3. Refrescos
    renderCards();
    updateDatalist();
    closeDataEditor();
    renderDatasetSelector(); // Para quitar el icono de nube
    
    datasetSelector.style.backgroundColor = "#e8ffe8";
    setTimeout(() => datasetSelector.style.backgroundColor = "var(--bg-color)", 500);
};

window.createNewDataset = function() {
    const name = prompt("Nombre del nuevo Universo:", "Nuevo Proyecto");
    if (!name) return;

    commitCurrentStateToLibrary();

    const newId = generateId();
    const newProject = {
        id: newId,
        name: name,
        data: [], 
        timestamp: Date.now()
    };

    library.unshift(newProject); 
    saveLibrary();
    loadProjectIntoMemory(newId);
    
    renderDatasetSelector();
    renderCards();
    updateDatalist();
    closeDataEditor();
};

window.deleteActiveDataset = function() {
    if (library.length <= 1) {
        alert("No puedes eliminar el único proyecto existente. Crea otro primero.");
        return;
    }
    const currentName = localStorage.getItem(STORAGE_KEY_ACTIVE_NAME);
    if (!confirm(`⚠️ ¿Eliminar "${currentName}"?\nEsta acción no se puede deshacer.`)) return;

    library = library.filter(p => p.id !== activeDatasetId);
    const nextProject = library[0];
    
    activeDatasetId = nextProject.id; 
    saveLibrary();
    
    // Si el siguiente es placeholder, forzamos switchDataset para que lo descargue
    if (nextProject.isPlaceholder) {
        window.switchDataset(nextProject.id);
    } else {
        loadProjectIntoMemory(nextProject.id);
        renderDatasetSelector();
        renderCards();
        closeDataEditor();
    }
};

// --- CRUD UI ---

function updateUIHeader() {
    const savedName = localStorage.getItem(STORAGE_KEY_ACTIVE_NAME);
    if(universeNameInput) universeNameInput.value = savedName || "";
}

function updateUniverseName() {
    if(universeNameInput) {
        const newName = universeNameInput.value;
        localStorage.setItem(STORAGE_KEY_ACTIVE_NAME, newName);
        
        const option = datasetSelector.querySelector(`option[value="${activeDatasetId}"]`);
        if (option) option.textContent = newName;

        const dock = document.getElementById('current-project-name');
        if(dock) dock.textContent = newName || "Sin Título";

        commitCurrentStateToLibrary(); 

        if (!isRemoteUpdate) {
            broadcastSync('PROJECT_NAME_UPDATE', { name: newName });
        }
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY_ACTIVE_DATA, JSON.stringify(universalData));
    commitCurrentStateToLibrary();
    updateDatalist();
}

function renderCards() {
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';
    const sorted = [...universalData].sort((a,b) => b.createdAt - a.createdAt);

    if (sorted.length === 0) {
        cardsContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#ccc; font-size:0.9rem;">Proyecto Vacío.<br>Crea una tarjeta nueva.</div>';
        return;
    }

    sorted.forEach(card => {
        const div = document.createElement('div');
        div.className = `data-card ${card.id === currentCardId ? 'selected' : ''}`;
        div.onclick = () => openCard(card.id);
        div.innerHTML = `
            <div class="card-cat">${card.category || 'Sin Etiqueta'}</div>
            <div class="card-title">${card.title || 'Sin Título'}</div>
            <div class="card-preview">${card.content ? card.content.substring(0, 35) + '...' : ''}</div>
        `;
        cardsContainer.appendChild(div);
    });
}

function updateDatalist() {
    if (!datalist) return;
    const categories = [...new Set(universalData.map(d => d.category))].sort();
    datalist.innerHTML = '';
    categories.forEach(cat => {
        if(cat) {
            const opt = document.createElement('option');
            opt.value = cat;
            datalist.appendChild(opt);
        }
    });
}

function createNewCard() {
    if (isRemoteUpdate) return;
    const newCard = { id: Date.now(), category: "", title: "", content: "", createdAt: Date.now() };
    universalData.unshift(newCard);
    saveData();
    renderCards(); 
    openCard(newCard.id);
    broadcastSync('DATA_CARD_CREATE', newCard);
}

function openCard(id) {
    currentCardId = id;
    const card = universalData.find(d => d.id === id);
    if (!card) return;

    editorView.classList.add('active');
    editorEmpty.classList.add('hidden');
    editorContent.classList.remove('hidden');

    inputCategory.value = card.category || "";
    inputTitle.value = card.title || "";
    inputBody.value = card.content || "";
    renderCards(); 
}

function closeDataEditor() {
    editorView.classList.remove('active');
}

function updateCardData() {
    if (!currentCardId) return;
    if (isRemoteUpdate) return; 

    const card = universalData.find(d => d.id === currentCardId);
    card.category = inputCategory.value.toUpperCase(); 
    card.title = inputTitle.value;
    card.content = inputBody.value;
    saveData();
    
    const cardEl = document.querySelector(`.data-card.selected`);
    if(cardEl) {
        if(cardEl.querySelector('.card-cat')) cardEl.querySelector('.card-cat').textContent = card.category || 'Sin Etiqueta';
        if(cardEl.querySelector('.card-title')) cardEl.querySelector('.card-title').textContent = card.title || 'Sin Título';
        if(cardEl.querySelector('.card-preview')) cardEl.querySelector('.card-preview').textContent = card.content ? card.content.substring(0, 35) + '...' : '';
    }

    broadcastSync('DATA_CARD_UPDATE', card);
}

function deleteCurrentCard() {
    if (!currentCardId) return;
    if (isRemoteUpdate) return;

    if (confirm("¿Borrar tarjeta?")) {
        const idToDelete = currentCardId;
        universalData = universalData.filter(d => d.id !== currentCardId);
        saveData();
        currentCardId = null;
        editorContent.classList.add('hidden');
        editorEmpty.classList.remove('hidden');
        if(window.innerWidth < 768) closeDataEditor();
        renderCards();

        broadcastSync('DATA_CARD_DELETE', { id: idToDelete });
    }
}

// --- API RECEPTORA REMOTA ---
window.applyRemoteDataUpdate = function(action, payload) {
    if (action === 'PROJECT_NAME_UPDATE') {
        localStorage.setItem(STORAGE_KEY_ACTIVE_NAME, payload.name);
        if (universeNameInput) universeNameInput.value = payload.name;
        const dock = document.getElementById('current-project-name');
        if(dock) dock.textContent = payload.name;
        commitCurrentStateToLibrary();
        renderDatasetSelector();
        return;
    }

    if (action === 'DATA_CARD_UPDATE') {
        const index = universalData.findIndex(d => d.id === payload.id);
        if (index !== -1) {
            universalData[index] = payload;
            saveData(); 
            if (currentCardId === payload.id && document.activeElement !== inputBody && document.activeElement !== inputTitle) {
                inputCategory.value = payload.category;
                inputTitle.value = payload.title;
                inputBody.value = payload.content;
            }
            renderCards();
        }
    } else if (action === 'DATA_CARD_CREATE') {
        if (!universalData.find(d => d.id === payload.id)) {
            universalData.unshift(payload);
            saveData();
            renderCards();
        }
    } else if (action === 'DATA_CARD_DELETE') {
        universalData = universalData.filter(d => d.id !== payload.id);
        saveData();
        if (currentCardId === payload.id) {
            currentCardId = null;
            editorContent.classList.add('hidden');
            editorEmpty.classList.remove('hidden');
        }
        renderCards();
    }
};

window.createNewCard = createNewCard;
window.closeDataEditor = closeDataEditor;
window.updateCardData = updateCardData;
window.deleteCurrentCard = deleteCurrentCard;
window.updateUniverseName = updateUniverseName;
window.renderCards = renderCards;
window.updateDatalist = updateDatalist;