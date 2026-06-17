import { PAISES } from './paises.js';
import { showToast, openModal, closeModal } from './ui.js';
import { 
  saveStateToFile, 
  exportJSON as storageExportJSON, 
  saveImageToLocalFolder, 
  resolveBookCoverUrl,
  deleteImageFile,
  setDirectoryHandle,
  setImagesDirectoryHandle,
  clearImageCache,
  directoryHandle
} from './storage.js';
import { tempTags, handleTagInput, removeTempTag, renderFormTags, setTempTags } from './tags.js';
import { renderCollections, renderBooks } from './renderers.js';

// ESTADO GENERAL DE LA APLICACIÓN
let state = {
  collections: ["Novela", "Ensayo", "Poesía", "Historia", "Fantasía"],
  books: [],
  currentCollection: "all",
  activeTagFilter: null,
  searchQuery: ""
};

let bookToDeleteId = null;

// INICIALIZACIÓN
window.onload = function() {
  lucide.createIcons();
  populateCountryDropdown();
  renderCollections(state);
  renderBooks(state);

  if (!window.showDirectoryPicker) {
    console.warn("Este navegador no soporta File System Access API de forma nativa. Se utilizará el modo de copia manual.");
    document.getElementById('btn-select-folder').classList.add('hidden');
    document.getElementById('manual-fallback-actions').classList.remove('hidden');
    document.getElementById('folder-status-badge').className = "flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 border border-zinc-700";
    document.getElementById('folder-status-text').innerHTML = "Modo Manual (Descarga/Carga)";
    showToast("Estás en Modo Manual. Sube tu archivo .json o añade elementos y descárgalos.");
  }
};

function populateCountryDropdown() {
  const select = document.getElementById('book-country');
  select.innerHTML = '<option value="" disabled selected>Seleccione un país...</option>';
  PAISES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = `${p.flag} ${p.name}`;
    select.appendChild(opt);
  });
}

function handleCountrySelect(selectElement) {
  const val = selectElement.value;
  if (val && !tempTags.countries.includes(val)) {
    tempTags.countries.push(val);
    renderFormTags('countries');
  }
  selectElement.value = "";
}

// VINCULACIÓN DE CARPETA LOCAL
async function selectWorkspaceFolder() {
  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    setDirectoryHandle(dirHandle);

    const imgDirHandle = await dirHandle.getDirectoryHandle('imagenes', { create: true });
    setImagesDirectoryHandle(imgDirHandle);

    let dataLoaded = false;
    try {
      const fileHandle = await dirHandle.getFileHandle('inventario.json');
      const file = await fileHandle.getFile();
      const jsonText = await file.text();
      const parsedData = JSON.parse(jsonText);
      
      if (parsedData) {
        state.collections = parsedData.collections || [];
        state.books = parsedData.books || [];
        dataLoaded = true;
      }
    } catch (err) {
      console.log("No se encontró 'inventario.json' o está vacío. Se creará uno nuevo al guardar.");
    }

    if (!dataLoaded && state.books.length === 0) {
      await saveStateToFile(state);
    }

    document.getElementById('folder-status-badge').className = "flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    document.getElementById('folder-status-text').innerText = `Vinculado: ${dirHandle.name}`;
    document.getElementById('btn-select-folder').innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i> <span>Re-vincular</span>`;
    lucide.createIcons();

    clearImageCache();
    renderCollections(state);
    renderBooks(state);
    showToast("Carpeta vinculada correctamente y base de datos sincronizada.");

  } catch (error) {
    console.error("Error al seleccionar la carpeta de trabajo: ", error);
    showToast("Acción cancelada o permiso denegado.", "rose-500");
  }
}

// IMPORTACIÓN MANUAL
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed && Array.isArray(parsed.collections) && Array.isArray(parsed.books)) {
        state.collections = parsed.collections;
        state.books = parsed.books;
        renderCollections(state);
        renderBooks(state);
        showToast("JSON de libros importado correctamente.");
      } else {
        showToast("El formato del JSON no es compatible.", "rose-500");
      }
    } catch (err) {
      showToast("Error al procesar el archivo JSON.", "rose-500");
    }
  };
  reader.readAsText(file);
}

function selectCollection(col) {
  state.currentCollection = col;
  state.activeTagFilter = null;
  renderCollections(state);
  renderBooks(state);
}

function saveCollection(e) {
  e.preventDefault();
  const input = document.getElementById('collection-name');
  const name = input.value.trim();

  if (name && !state.collections.includes(name)) {
    state.collections.push(name);
    state.collections.sort();
    input.value = '';
    closeModal('modal-collection');
    saveStateToFile(state);
    renderCollections(state);
    showToast(`Colección "${name}" creada.`);
  } else if (state.collections.includes(name)) {
    showToast("La colección ya existe.", "rose-500");
  }
}

function deleteCollection(colName) {
  const booksInCol = state.books.filter(b => b.collection === colName).length;
  if (booksInCol > 0) {
    showToast(`No puedes eliminar una colección con ${booksInCol} libros activos. Reasígnalos primero.`, "rose-500");
    return;
  }

  state.collections = state.collections.filter(c => c !== colName);
  if (state.currentCollection === colName) {
    state.currentCollection = 'all';
  }
  
  saveStateToFile(state);
  renderCollections(state);
  renderBooks(state);
  showToast(`Colección "${colName}" eliminada.`);
}

function applyTagFilter(type, value) {
  state.activeTagFilter = { type, value };
  const badgeText = document.getElementById('active-tag-text');
  const badgeContainer = document.getElementById('active-tag-filter');
  
  let prefix = type === 'keyword' ? '#' : (type === 'author' ? '👤 ' : '@');
  if (type === 'country') {
    const countryObj = PAISES.find(p => p.name === value);
    prefix = countryObj ? `${countryObj.flag} ` : '';
  }

  badgeText.innerText = `${prefix}${value}`;
  badgeContainer.className = "hidden items-center space-x-2 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/20 flex";

  renderBooks(state);
}

// BÚSQUEDA INTELIGENTE
function handleSearchInput() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();
  state.searchQuery = query;

  const suggestionsDiv = document.getElementById('search-suggestions');
  const clearBtn = document.getElementById('btn-clear-search');

  if (!query) {
    suggestionsDiv.classList.add('hidden');
    clearBtn.classList.add('hidden');
    renderBooks(state);
    return;
  }

  clearBtn.classList.remove('hidden');
  let matches = [];

  const matchedTitles = state.books.filter(b => b.title.toLowerCase().includes(query));
  matchedTitles.slice(0, 3).forEach(b => matches.push({ type: 'book', label: b.title, extra: 'Libro', value: b.title }));

  const allAuthors = [...new Set(state.books.flatMap(b => Array.isArray(b.authors) ? b.authors : (b.author ? [b.author] : [])))];
  const matchedAuthors = allAuthors.filter(a => a.toLowerCase().includes(query));
  matchedAuthors.slice(0, 3).forEach(a => matches.push({ type: 'author', label: a, extra: 'Autor', value: a }));

  const matchedCollections = state.collections.filter(c => c.toLowerCase().includes(query));
  matchedCollections.slice(0, 2).forEach(c => matches.push({ type: 'collection', label: c, extra: 'Colección', value: c }));

  const allCharacters = [...new Set(state.books.flatMap(b => b.characters || []))];
  const matchedChars = allCharacters.filter(c => c.toLowerCase().includes(query.replace('@', '')));
  matchedChars.slice(0, 3).forEach(c => matches.push({ type: 'character', label: `@${c}`, extra: 'Personaje Histórico', value: c }));

  const allRegions = [...new Set(state.books.flatMap(b => b.regions || []))];
  const matchedRegs = allRegions.filter(r => r.toLowerCase().includes(query.replace('@', '')));
  matchedRegs.slice(0, 3).forEach(r => matches.push({ type: 'region', label: `@${r}`, extra: 'Región Geográfica', value: r }));

  const allKeywords = [...new Set(state.books.flatMap(b => b.keywords || []))];
  const matchedKeys = allKeywords.filter(k => k.toLowerCase().includes(query.replace('#', '')));
  matchedKeys.slice(0, 3).forEach(k => matches.push({ type: 'keyword', label: `#${k}`, extra: 'Palabra Clave', value: k }));

  const allCountries = [...new Set(state.books.flatMap(b => Array.isArray(b.countries) ? b.countries : (b.country ? [b.country] : [])))];
  const matchedCountries = PAISES.filter(p => p.name.toLowerCase().includes(query) || allCountries.some(c => c.toLowerCase() === p.name.toLowerCase()));
  matchedCountries.slice(0, 2).forEach(p => matches.push({ type: 'country', label: `${p.flag} ${p.name}`, extra: 'País de Origen', value: p.name }));

  if (matches.length > 0) {
    suggestionsDiv.innerHTML = '';
    matches.forEach(m => {
      const item = document.createElement('div');
      item.className = "flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800 cursor-pointer border-b border-zinc-850/50 last:border-b-0 text-sm";
      let icon = "hash";
      if (m.type === 'book') icon = "book";
      if (m.type === 'author') icon = "user";
      if (m.type === 'collection') icon = "folder";
      if (m.type === 'character') icon = "user-check";
      if (m.type === 'region') icon = "map-pin";
      if (m.type === 'country') icon = "globe";

      item.innerHTML = `
        <div class="flex items-center space-x-3 truncate">
          <i data-lucide="${icon}" class="w-4 h-4 text-zinc-500 flex-none"></i>
          <span class="text-zinc-200 font-medium truncate">${m.label}</span>
        </div>
        <span class="text-[10px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 font-semibold">${m.extra}</span>
      `;
      item.onclick = () => selectSuggestion(m);
      suggestionsDiv.appendChild(item);
    });
    suggestionsDiv.classList.remove('hidden');
    lucide.createIcons();
  } else {
    suggestionsDiv.classList.add('hidden');
  }
  renderBooks(state);
}

function selectSuggestion(match) {
  document.getElementById('search-suggestions').classList.add('hidden');
  document.getElementById('search-input').value = match.label;
  state.searchQuery = match.label.toLowerCase();

  if (['character', 'region', 'keyword', 'country', 'author'].includes(match.type)) {
    applyTagFilter(match.type, match.value);
    document.getElementById('search-input').value = '';
    document.getElementById('btn-clear-search').classList.add('hidden');
    state.searchQuery = "";
  } else {
    renderBooks(state);
  }
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('btn-clear-search').classList.add('hidden');
  document.getElementById('search-suggestions').classList.add('hidden');
  state.searchQuery = '';
  renderBooks(state);
}

function clearTagFilter() {
  state.activeTagFilter = null;
  document.getElementById('active-tag-filter').classList.add('hidden');
  renderBooks(state);
}

// OPERACIONES DE CREACIÓN Y EDICIÓN DE LIBROS
function openAddBookModal() {
  document.getElementById('modal-book-title').innerHTML = `<i data-lucide="plus-circle" class="text-emerald-400 w-5 h-5"></i> Registrar Libro`;
  document.getElementById('book-form').reset();
  document.getElementById('book-id').value = '';

  document.getElementById('book-image-preview').classList.add('hidden');
  document.getElementById('image-upload-placeholder').classList.remove('hidden');
  document.getElementById('btn-change-image').classList.add('hidden');

  setTempTags({ authors: [], countries: [], characters: [], regions: [], keywords: [] });
  renderFormTags('authors');
  renderFormTags('countries');
  renderFormTags('characters');
  renderFormTags('regions');
  renderFormTags('keywords');

  const colSelect = document.getElementById('book-collection');
  colSelect.innerHTML = '<option value="" disabled selected>Elegir colección...</option>';
  state.collections.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col;
    opt.textContent = col;
    colSelect.appendChild(opt);
  });

  openModal('modal-book');
}

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview = document.getElementById('book-image-preview');
  const placeholder = document.getElementById('image-upload-placeholder');
  const changeBtn = document.getElementById('btn-change-image');

  const reader = new FileReader();
  reader.onload = function(e) {
    preview.src = e.target.result;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    changeBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function saveBook(e) {
  e.preventDefault();

  const bookIdInput = document.getElementById('book-id').value;
  const isEdit = bookIdInput !== '';
  const bookId = isEdit ? parseInt(bookIdInput) : Date.now();

  const title = document.getElementById('book-title').value.trim();
  const collection = document.getElementById('book-collection').value;
  
  const imageInput = document.getElementById('book-image-input');
  let savedImageName = null;

  if (isEdit) {
    const existingBook = state.books.find(b => b.id === bookId);
    if (existingBook) savedImageName = existingBook.image;
  }

  if (imageInput.files && imageInput.files[0]) {
    savedImageName = await saveImageToLocalFolder(imageInput.files[0], bookId);
  }

  // Si el usuario escribió un autor en el campo pero no presionó Enter, lo incluimos automáticamente
  const currentAuthorInput = document.getElementById('book-author').value.trim();
  if (currentAuthorInput && !tempTags.authors.includes(currentAuthorInput)) {
    tempTags.authors.push(currentAuthorInput);
  }

  const bookData = {
    id: bookId,
    title,
    collection,
    image: savedImageName,
    authors: [...tempTags.authors],
    countries: [...tempTags.countries],
    characters: [...tempTags.characters],
    regions: [...tempTags.regions],
    keywords: [...tempTags.keywords]
  };

  if (isEdit) {
    const idx = state.books.findIndex(b => b.id === bookId);
    if (idx !== -1) state.books[idx] = bookData;
    showToast("Libro actualizado con éxito.");
  } else {
    state.books.push(bookData);
    showToast("Libro registrado con éxito.");
  }

  closeModal('modal-book');
  await saveStateToFile(state);
  renderCollections(state);
  renderBooks(state);
}

async function editBook(id) {
  const book = state.books.find(b => b.id === id);
  if (!book) return;

  document.getElementById('modal-book-title').innerHTML = `<i data-lucide="edit-3" class="text-emerald-400 w-5 h-5"></i> Editar Detalles del Libro`;
  document.getElementById('book-id').value = book.id;
  document.getElementById('book-title').value = book.title;

  const colSelect = document.getElementById('book-collection');
  colSelect.innerHTML = '';
  state.collections.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col;
    opt.textContent = col;
    if (col === book.collection) opt.selected = true;
    colSelect.appendChild(opt);
  });

  document.getElementById('book-country').value = "";

  const preview = document.getElementById('book-image-preview');
  const placeholder = document.getElementById('image-upload-placeholder');
  const changeBtn = document.getElementById('btn-change-image');

  if (book.image) {
    const resolvedUrl = await resolveBookCoverUrl(book.image);
    preview.src = resolvedUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&auto=format&fit=crop&q=60";
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    changeBtn.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    changeBtn.classList.add('hidden');
  }

  // Normalizar datos antiguos para heredar compatibilidad
  const authorsSource = Array.isArray(book.authors) ? book.authors : (book.author ? [book.author] : []);
  const countriesSource = Array.isArray(book.countries) ? book.countries : (book.country ? [book.country] : []);

  setTempTags({
    authors: [...authorsSource],
    countries: [...countriesSource],
    characters: [...(book.characters || [])],
    regions: [...(book.regions || [])],
    keywords: [...(book.keywords || [])]
  });

  renderFormTags('authors');
  renderFormTags('countries');
  renderFormTags('characters');
  renderFormTags('regions');
  renderFormTags('keywords');

  openModal('modal-book');
}

function confirmDeleteBook(id) {
  bookToDeleteId = id;
  openModal('modal-delete');
  
  const confirmBtn = document.getElementById('btn-confirm-delete');
  confirmBtn.onclick = function() {
    executeDeleteBook();
  };
}

async function executeDeleteBook() {
  if (bookToDeleteId === null) return;

  const book = state.books.find(b => b.id === bookToDeleteId);
  if (book && book.image) {
    await deleteImageFile(book.image);
  }

  state.books = state.books.filter(b => b.id !== bookToDeleteId);
  bookToDeleteId = null;
  closeModal('modal-delete');
  await saveStateToFile(state);
  renderCollections(state);
  renderBooks(state);
  showToast("Libro eliminado permanentemente.");
}

// ASIGNACIÓN AL CONTEXTO GLOBAL DE WINDOW
window.selectWorkspaceFolder = selectWorkspaceFolder;
window.exportJSON = () => storageExportJSON(state);
window.importJSON = importJSON;
window.handleSearchInput = handleSearchInput;
window.clearSearch = clearSearch;
window.openModal = openModal;
window.closeModal = closeModal;
window.saveCollection = saveCollection;
window.selectCollection = selectCollection;
window.deleteCollection = deleteCollection;
window.openAddBookModal = openAddBookModal;
window.previewImage = previewImage;
window.saveBook = saveBook;
window.editBook = editBook;
window.confirmDeleteBook = confirmDeleteBook;
window.applyTagFilter = applyTagFilter;
window.clearTagFilter = clearTagFilter;
window.handleTagInput = handleTagInput;
window.removeTempTag = removeTempTag;
window.handleCountrySelect = handleCountrySelect;