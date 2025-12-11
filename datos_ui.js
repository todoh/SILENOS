// --- LÓGICA DE DATOS UI v1.7 (Sync Fixed & Visual Feedback) ---
import { broadcastSync, isRemoteUpdate } from './project_share.js'; 

console.log("Sistema Universal Data Cargado (v1.7 - Visual Sync)");

let universalData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
let currentCardId = null;

const cardsContainer = document.getElementById('cards-container');
const editorView = document.getElementById('data-editor-view');
const editorContent = document.querySelector('.editor-content');
const editorEmpty = document.querySelector('.editor-empty-state');
const inputCategory = document.getElementById('card-category');
const inputTitle = document.getElementById('card-title');
const inputBody = document.getElementById('card-body');
const datalist = document.getElementById('category-suggestions');
const universeNameInput = document.getElementById('universe-name-input');

if (cardsContainer) {
    loadUniverseName();
    renderCards();
    updateDatalist();
}

function saveData() {
    localStorage.setItem('minimal_universal_data', JSON.stringify(universalData));
    updateDatalist();
}

function loadUniverseName() {
    const savedName = localStorage.getItem('silenos_universe_name');
    
    // 1. Actualizar el Input de la vista de Datos
    if(universeNameInput && savedName) {
        universeNameInput.value = savedName;
    }

    // 2. Actualizar el Dock de Usuario (Etiqueta inferior)
    // Esto asegura que al recibir una sync masiva, el nombre cambie sin necesitar interacción
    const dockName = document.getElementById('current-project-name');
    if(dockName && savedName) {
        dockName.textContent = savedName;
    }
}

function updateUniverseName() {
    if(universeNameInput) {
        // 1. Guardar local
        localStorage.setItem('silenos_universe_name', universeNameInput.value);
        
        // 2. ACTUALIZACIÓN VISUAL INMEDIATA
        const dockName = document.getElementById('current-project-name');
        if(dockName) dockName.textContent = universeNameInput.value || "Sin Título";

        // 3. Emitir cambio
        if (!isRemoteUpdate) {
            broadcastSync('PROJECT_NAME_UPDATE', { name: universeNameInput.value });
        }
    }
}

function renderCards() {
    universalData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';
    const sorted = [...universalData].sort((a,b) => b.createdAt - a.createdAt);

    if (sorted.length === 0) {
        cardsContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#ccc; font-size:0.9rem;">Vacío.</div>';
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
    const currentData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    const categories = [...new Set(currentData.map(d => d.category))].sort();
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
    universalData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    const newCard = { id: Date.now(), category: "", title: "", content: "", createdAt: Date.now() };
    universalData.unshift(newCard);
    saveData();
    renderCards(); 
    openCard(newCard.id);

    // 📡 EMITIR CREACIÓN
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

    // 📡 EMITIR ACTUALIZACIÓN
    broadcastSync('DATA_CARD_UPDATE', card);
}

function deleteCurrentCard() {
    if (!currentCardId) return;
    if (isRemoteUpdate) return;

    if (confirm("¿Borrar?")) {
        const idToDelete = currentCardId;
        universalData = universalData.filter(d => d.id !== currentCardId);
        saveData();
        currentCardId = null;
        editorContent.classList.add('hidden');
        editorEmpty.classList.remove('hidden');
        if(window.innerWidth < 768) closeDataEditor();
        renderCards();

        // 📡 EMITIR BORRADO
        broadcastSync('DATA_CARD_DELETE', { id: idToDelete });
    }
}

// --- API RECEPTORA ---
window.applyRemoteDataUpdate = function(action, payload) {
    universalData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];

    // --- MANEJO DE NOMBRE DE PROYECTO (VISUAL FIX) ---
    if (action === 'PROJECT_NAME_UPDATE') {
        localStorage.setItem('silenos_universe_name', payload.name);
        
        // 1. Actualizar el Input (si existe)
        const inp = document.getElementById('universe-name-input');
        if (inp) inp.value = payload.name;

        // 2. Actualizar la Barra Inferior (si existe)
        const dock = document.getElementById('current-project-name');
        if (dock) dock.textContent = payload.name;
        
        return;
    }

    // --- MANEJO DE DATOS ---
    if (action === 'DATA_CARD_UPDATE') {
        const index = universalData.findIndex(d => d.id === payload.id);
        if (index !== -1) {
            universalData[index] = payload;
            saveData();
            
            if (currentCardId === payload.id) {
                if (document.activeElement !== inputBody && document.activeElement !== inputTitle) {
                    inputCategory.value = payload.category;
                    inputTitle.value = payload.title;
                    inputBody.value = payload.content;
                }
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
window.loadUniverseName = loadUniverseName;