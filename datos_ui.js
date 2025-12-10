// --- LÓGICA DE DATOS UI v1.3 (Exposed for Import) ---

console.log("Sistema Universal Data Cargado (v1.3 - Global Access)");

let universalData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
let currentCardId = null;

// DOM
const cardsContainer = document.getElementById('cards-container');
const editorView = document.getElementById('data-editor-view');
const editorContent = document.querySelector('.editor-content');
const editorEmpty = document.querySelector('.editor-empty-state');

const inputCategory = document.getElementById('card-category');
const inputTitle = document.getElementById('card-title');
const inputBody = document.getElementById('card-body');
const datalist = document.getElementById('category-suggestions');

// NUEVO: Input del Nombre del Universo
const universeNameInput = document.getElementById('universe-name-input');

// --- INICIALIZACIÓN ---
if (cardsContainer) {
    loadUniverseName(); // Cargar nombre
    renderCards();
    updateDatalist();
}

function saveData() {
    localStorage.setItem('minimal_universal_data', JSON.stringify(universalData));
    updateDatalist();
}

// GESTIÓN NOMBRE UNIVERSO
function loadUniverseName() {
    if(universeNameInput) {
        const savedName = localStorage.getItem('silenos_universe_name');
        if(savedName) universeNameInput.value = savedName;
    }
}

function updateUniverseName() {
    if(universeNameInput) {
        localStorage.setItem('silenos_universe_name', universeNameInput.value);
    }
}

// RENDERIZADO
function renderCards() {
    // IMPORTANTE: Recargar datos frescos del LocalStorage por si hubo una importación externa
    universalData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];

    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';
    const sorted = [...universalData].sort((a,b) => b.createdAt - a.createdAt);

    if (sorted.length === 0) {
        cardsContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#ccc; font-weight:300; font-size:0.9rem;">Vacío.</div>';
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
    // Asegurar datos frescos
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

// CRUD
function createNewCard() {
    // Recargar antes de modificar para no perder importaciones
    universalData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    const newCard = { id: Date.now(), category: "", title: "", content: "", createdAt: Date.now() };
    universalData.unshift(newCard);
    saveData();
    renderCards(); 
    openCard(newCard.id);
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
    const card = universalData.find(d => d.id === currentCardId);
    card.category = inputCategory.value.toUpperCase(); 
    card.title = inputTitle.value;
    card.content = inputBody.value;
    saveData();
    
    // Quick DOM update
    const cardEl = document.querySelector(`.data-card.selected`);
    if(cardEl) {
        if(cardEl.querySelector('.card-cat')) cardEl.querySelector('.card-cat').textContent = card.category || 'Sin Etiqueta';
        if(cardEl.querySelector('.card-title')) cardEl.querySelector('.card-title').textContent = card.title || 'Sin Título';
        if(cardEl.querySelector('.card-preview')) cardEl.querySelector('.card-preview').textContent = card.content ? card.content.substring(0, 35) + '...' : '';
    }
}

function deleteCurrentCard() {
    if (!currentCardId) return;
    if (confirm("¿Borrar?")) {
        universalData = universalData.filter(d => d.id !== currentCardId);
        saveData();
        currentCardId = null;
        editorContent.classList.add('hidden');
        editorEmpty.classList.remove('hidden');
        if(window.innerWidth < 768) closeDataEditor();
        renderCards();
    }
}

// EXPORTAR A WINDOW (API PÚBLICA PARA IMPORTADOR)
window.createNewCard = createNewCard;
window.closeDataEditor = closeDataEditor;
window.updateCardData = updateCardData;
window.deleteCurrentCard = deleteCurrentCard;
window.updateUniverseName = updateUniverseName;

// !! AGREGADO: Necesario para que el importador actualice la lista !!
window.renderCards = renderCards;
window.updateDatalist = updateDatalist;