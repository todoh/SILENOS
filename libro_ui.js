// --- LÓGICA DE LIBROS UI (Novelas) ---
console.log("Sistema de Libros Iniciado (v2.0)");

let books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
let currentBookId = null;
let bookUploadContext = { chapterIdx: null, paragraphIdx: null };

// DOM Elements
const booksContainer = document.getElementById('books-container');
const bookListView = document.getElementById('book-list-view');
const bookDetailView = document.getElementById('book-detail-view');
const bookDetailTitle = document.getElementById('detail-title');
const chaptersContainer = document.getElementById('chapters-container');
const bookImageInput = document.getElementById('image-input');

// --- INICIO ---
if (booksContainer) {
    books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
    renderBookList();
}

// --- FUNCIONES DE ALMACENAMIENTO ---
function saveBookData() {
    try {
        localStorage.setItem('minimal_books_v4', JSON.stringify(books));
    } catch (e) {
        alert("Espacio lleno. Reduce el tamaño de las imágenes.");
    }
}

// --- GESTIÓN DE LISTA DE LIBROS ---
function renderBookList() {
    books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
    
    if (!booksContainer) return;
    booksContainer.innerHTML = '';
    
    if (books.length === 0) {
        booksContainer.innerHTML = '<div style="text-align:center; padding: 40px; color:#ccc; font-weight:300;">No hay libros creados.</div>';
        return;
    }

    books.slice().reverse().forEach(book => {
        const item = document.createElement('div');
        item.className = 'book-item';
        
        item.onclick = function() { 
            openBook(book.id); 
        };

        const chapCount = book.chapters ? book.chapters.length : 0;
        const aiTag = book.isAI ? '<span class="tag-ai">IA</span>' : '';

        item.innerHTML = `
            <div class="book-info" style="pointer-events: none;"> 
                <div class="book-title">${book.title || 'Libro Sin Título'} ${aiTag}</div>
                <div class="book-meta">${chapCount} ${chapCount === 1 ? 'Capítulo' : 'Capítulos'}</div>
            </div>
            <div style="opacity:0.2; pointer-events: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
        `;
        booksContainer.appendChild(item);
    });
}

function createNewBook() {
    console.log("Creando nuevo libro manual...");
    // 1. Recuperar lista actual
    books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];

    // 2. Definir objeto libro
    const newBook = {
        id: Date.now(),
        title: 'Nueva Novela',
        isAI: false,
        chapters: [
            { 
                title: "Capítulo 1", 
                paragraphs: [{ text: "", image: null }] 
            }
        ]
    };

    // 3. Guardar
    books.push(newBook);
    saveBookData();

    // 4. Actualizar UI
    renderBookList(); 
    
    // 5. Abrir
    openBook(newBook.id);
}

function deleteCurrentBook() {
    if (confirm("¿Eliminar este libro y todo su contenido?")) {
        books = books.filter(b => b.id !== currentBookId);
        saveBookData();
        goBack();
    }
}

// --- VISTA DE EDICIÓN ---
function openBook(id) {
    books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
    currentBookId = id;
    const book = books.find(b => b.id === id);
    if (!book) return;

    bookListView.style.display = 'none';
    bookDetailView.classList.add('active'); // Usamos clase active para display flex

    bookDetailTitle.value = book.title;
    renderBookContent();
}

function goBack() {
    currentBookId = null;
    bookDetailView.classList.remove('active');
    bookListView.style.display = 'block';
    renderBookList();
}

function updateBookTitle() {
    const book = books.find(b => b.id === currentBookId);
    if (book) {
        book.title = bookDetailTitle.value;
        saveBookData();
    }
}

// --- RENDERIZADO DE CONTENIDO ---
function renderBookContent() {
    const book = books.find(b => b.id === currentBookId);
    if (!book) return;

    chaptersContainer.innerHTML = '';

    book.chapters.forEach((chap, cIndex) => {
        const chapDiv = document.createElement('div');
        chapDiv.className = 'chapter-block';

        // Header Capítulo
        const header = document.createElement('div');
        header.className = 'chapter-header';
        header.innerHTML = `
            <input class="chapter-title" type="text" value="${chap.title}" placeholder="Título del Capítulo">
            <div class="chapter-actions">
                <button class="btn-icon danger" title="Borrar Capítulo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" color="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;

        const titleInput = header.querySelector('.chapter-title');
        titleInput.oninput = (e) => updateChapterTitle(cIndex, e.target.value);
        header.querySelector('.btn-icon.danger').onclick = () => deleteChapter(cIndex);

        chapDiv.appendChild(header);

        // Párrafos
        chap.paragraphs.forEach((para, pIndex) => {
            const pDiv = document.createElement('div');
            pDiv.className = 'paragraph-item';

            const controls = document.createElement('div');
            controls.className = 'paragraph-controls';
            controls.innerHTML = `
                <button class="btn-icon" title="Imagen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
                <button class="btn-icon" title="Insertar bloque debajo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                <button class="btn-icon danger" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            `;

            controls.querySelector('button[title="Imagen"]').onclick = () => triggerBookImageUpload(cIndex, pIndex);
            controls.querySelector('button[title="Insertar bloque debajo"]').onclick = () => insertBookParagraphAfter(cIndex, pIndex);
            controls.querySelector('button[title="Eliminar"]').onclick = () => deleteBookParagraph(cIndex, pIndex);

            pDiv.appendChild(controls);

            if (para.image) {
                const imgCont = document.createElement('div');
                imgCont.className = 'paragraph-image-container';
                imgCont.innerHTML = `<img src="${para.image}" class="paragraph-image"><button class="remove-image-btn">×</button>`;
                imgCont.querySelector('button').onclick = () => removeBookImage(cIndex, pIndex);
                pDiv.appendChild(imgCont);
            }

            const textarea = document.createElement('textarea');
            textarea.className = 'paragraph-content';
            textarea.rows = 1;
            textarea.value = para.text;
            textarea.placeholder = "Escribe aquí la narrativa...";
            textarea.oninput = (e) => {
                autoResize(e.target);
                updateBookParagraphText(cIndex, pIndex, e.target.value);
            };

            pDiv.appendChild(textarea);
            chapDiv.appendChild(pDiv);
            setTimeout(() => autoResize(textarea), 0);
        });

        const addPBtn = document.createElement('button');
        addPBtn.className = 'add-p-btn';
        addPBtn.innerHTML = '<span class="add-p-symbol">+</span>';
        addPBtn.onclick = () => addBookParagraph(cIndex);
        chapDiv.appendChild(addPBtn);

        chaptersContainer.appendChild(chapDiv);
    });
}

// --- ACTUALIZACIONES Y CRUD ---

function addChapter() {
    const book = books.find(b => b.id === currentBookId);
    if (book) {
        book.chapters.push({
            title: "Nuevo Capítulo",
            paragraphs: [{ text: "", image: null }]
        });
        saveBookData();
        renderBookContent();
        setTimeout(() => {
            const scrollArea = document.getElementById('editor-scroll-area');
            if(scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
        }, 100);
    }
}

function updateChapterTitle(cIndex, newTitle) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].title = newTitle;
    saveBookData();
}

function deleteChapter(cIndex) {
    if (confirm("¿Borrar capítulo completo?")) {
        const book = books.find(b => b.id === currentBookId);
        book.chapters.splice(cIndex, 1);
        saveBookData();
        renderBookContent();
    }
}

function addBookParagraph(cIndex) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs.push({ text: "", image: null });
    saveBookData();
    renderBookContent();
}

function insertBookParagraphAfter(cIndex, pIndex) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs.splice(pIndex + 1, 0, { text: "", image: null });
    saveBookData();
    renderBookContent();
}

function updateBookParagraphText(cIndex, pIndex, text) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs[pIndex].text = text;
    saveBookData();
}

function deleteBookParagraph(cIndex, pIndex) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs.splice(pIndex, 1);
    saveBookData();
    renderBookContent();
}

// --- IMÁGENES ---
function triggerBookImageUpload(cIndex, pIndex) {
    bookUploadContext = { chapterIdx: cIndex, paragraphIdx: pIndex };
    if(bookImageInput) bookImageInput.click();
}

if(bookImageInput) {
    bookImageInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0] && bookUploadContext.chapterIdx !== null) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const book = books.find(b => b.id === currentBookId);
                book.chapters[bookUploadContext.chapterIdx].paragraphs[bookUploadContext.paragraphIdx].image = event.target.result;
                saveBookData();
                renderBookContent();
                bookImageInput.value = ''; 
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

function removeBookImage(cIndex, pIndex) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs[pIndex].image = null;
    saveBookData();
    renderBookContent();
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// EXPORTAR A WINDOW
window.createNewBook = createNewBook;
window.deleteCurrentBook = deleteCurrentBook;
window.goBack = goBack;
window.updateBookTitle = updateBookTitle;
window.addChapter = addChapter;
window.renderBookList = renderBookList;
window.openBook = openBook; // Importante para que funcione desde createNewBook