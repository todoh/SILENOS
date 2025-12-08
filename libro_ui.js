// --- LÓGICA GESTOR LIBROS v4.2 (IA Aware) ---

let books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
let currentBookId = null;

let uploadContext = { chapterIdx: null, paragraphIdx: null };

const booksContainer = document.getElementById('books-container');
const listView = document.getElementById('book-list-view');
const detailView = document.getElementById('book-detail-view');
const detailTitle = document.getElementById('detail-title');
const chaptersContainer = document.getElementById('chapters-container');
const imageInput = document.getElementById('image-input');

if (booksContainer) {
    migrateData();
    renderBookList();
}

function migrateData() {
    const oldBooks = JSON.parse(localStorage.getItem('my_minimal_books'));
    if (oldBooks && (!books || books.length === 0)) {
        books = oldBooks.map(oldBook => {
            let newChapters = [];
            if (oldBook.paragraphs && oldBook.paragraphs.length > 0) {
                newChapters.push({
                    title: "Inicio",
                    paragraphs: oldBook.paragraphs.map(p => typeof p === 'string' ? { text: p, image: null } : p)
                });
            } else {
                newChapters.push({ title: "Capítulo 1", paragraphs: [] });
            }
            return {
                id: oldBook.id,
                title: oldBook.title,
                chapters: newChapters
            };
        });
        saveData();
    }
}

function saveData() {
    try {
        localStorage.setItem('minimal_books_v4', JSON.stringify(books));
    } catch (e) {
        alert("Espacio lleno. Reduce el tamaño de las imágenes.");
    }
}

function renderBookList() {
    // Recarga profunda para evitar caché
    books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];

    if (!booksContainer) return;
    booksContainer.innerHTML = '';
    if (books.length === 0) {
        booksContainer.innerHTML = '<div style="text-align:center; padding: 40px; color:#ccc; font-weight:300;">La biblioteca es un lienzo en blanco.</div>';
        return;
    }

    books.slice().reverse().forEach(book => {
        const item = document.createElement('div');
        item.className = 'book-item';
        item.onclick = () => openBook(book.id);

        const chapterCount = book.chapters ? book.chapters.length : 0;
        
        // Etiqueta IA
        const aiTag = book.isAI ? '<span class="tag-ai">IA</span>' : '';

        item.innerHTML = `
            <div class="book-info">
                <div class="book-title">${book.title || 'Sin Título'} ${aiTag}</div>
                <div class="book-meta">${chapterCount} ${chapterCount === 1 ? 'Capítulo' : 'Capítulos'}</div>
            </div>
            <div style="opacity:0.2;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
        `;
        booksContainer.appendChild(item);
    });
}

function createNewBook() {
    const newBook = {
        id: Date.now(),
        title: 'Nuevo Libro',
        isAI: false,
        chapters: [
            { title: "Capítulo 1", paragraphs: [{ text: "", image: null }] }
        ]
    };
    books.push(newBook);
    saveData();
    openBook(newBook.id);
}

function deleteCurrentBook() {
    if (confirm("¿Eliminar este libro y todo su contenido?")) {
        books = books.filter(b => b.id !== currentBookId);
        saveData();
        goBack();
    }
}

function openBook(id) {
    books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
    currentBookId = id;
    const book = books.find(b => b.id === id);
    if (!book) return;

    listView.classList.add('hidden');
    detailView.classList.add('active');
    detailTitle.value = book.title;
    renderBookContent();
}

function goBack() {
    currentBookId = null;
    listView.classList.remove('hidden');
    detailView.classList.remove('active');
    renderBookList();
}

function updateBookTitle() {
    const book = books.find(b => b.id === currentBookId);
    if (book) {
        book.title = detailTitle.value;
        saveData();
    }
}

function renderBookContent() {
    const book = books.find(b => b.id === currentBookId);
    if (!book) return;

    chaptersContainer.innerHTML = '';

    book.chapters.forEach((chapter, cIndex) => {
        const chapDiv = document.createElement('div');
        chapDiv.className = 'chapter-block';

        const header = document.createElement('div');
        header.className = 'chapter-header';
        header.innerHTML = `
            <input class="chapter-title" value="${chapter.title}" placeholder="Nombre del Capítulo">
            <div class="chapter-actions">
                <button class="btn-icon danger" title="Borrar Capítulo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;

        const titleInput = header.querySelector('.chapter-title');
        titleInput.oninput = (e) => updateChapterTitle(cIndex, e.target.value);
        header.querySelector('.btn-icon.danger').onclick = () => deleteChapter(cIndex);
        chapDiv.appendChild(header);

        chapter.paragraphs.forEach((para, pIndex) => {
            const pDiv = document.createElement('div');
            pDiv.className = 'paragraph-item';

            const controls = document.createElement('div');
            controls.className = 'paragraph-controls';
            controls.innerHTML = `
                <button class="btn-icon" title="Imagen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
                <button class="btn-icon" title="Insertar párrafo debajo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                <button class="btn-icon danger" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            `;

            controls.querySelector('button[title="Imagen"]').onclick = () => triggerImageUpload(cIndex, pIndex);
            controls.querySelector('button[title="Insertar párrafo debajo"]').onclick = () => insertParagraphAfter(cIndex, pIndex);
            controls.querySelector('button[title="Eliminar"]').onclick = () => deleteParagraph(cIndex, pIndex);
            pDiv.appendChild(controls);

            if (para.image) {
                const imgCont = document.createElement('div');
                imgCont.className = 'paragraph-image-container';
                imgCont.innerHTML = `<img src="${para.image}" class="paragraph-image"><button class="remove-image-btn">×</button>`;
                imgCont.querySelector('button').onclick = () => removeImage(cIndex, pIndex);
                pDiv.appendChild(imgCont);
            }

            const textarea = document.createElement('textarea');
            textarea.className = 'paragraph-content';
            textarea.rows = 1;
            textarea.value = para.text;
            textarea.placeholder = "Escribe algo...";
            textarea.oninput = (e) => {
                autoResize(e.target);
                updateParagraphText(cIndex, pIndex, e.target.value);
            };

            pDiv.appendChild(textarea);
            chapDiv.appendChild(pDiv);
            setTimeout(() => autoResize(textarea), 0);
        });

        const addPBtn = document.createElement('button');
        addPBtn.className = 'add-p-btn';
        addPBtn.innerHTML = '<span class="add-p-symbol">+</span>';
        addPBtn.onclick = () => addParagraph(cIndex);
        chapDiv.appendChild(addPBtn);

        chaptersContainer.appendChild(chapDiv);
    });
}

// FUNCIONES UPDATE/DELETE (Igual que antes, solo aseguran la integridad)
function addChapter() {
    const book = books.find(b => b.id === currentBookId);
    if (book) {
        book.chapters.push({
            title: `Capítulo ${book.chapters.length + 1}`,
            paragraphs: [{ text: "", image: null }]
        });
        saveData();
        renderBookContent();
    }
}
function updateChapterTitle(cIndex, newTitle) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].title = newTitle;
    saveData();
}
function deleteChapter(cIndex) {
    if (confirm("¿Borrar capítulo entero?")) {
        const book = books.find(b => b.id === currentBookId);
        book.chapters.splice(cIndex, 1);
        saveData();
        renderBookContent();
    }
}
function addParagraph(cIndex) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs.push({ text: "", image: null });
    saveData();
    renderBookContent();
}
function insertParagraphAfter(cIndex, pIndex) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs.splice(pIndex + 1, 0, { text: "", image: null });
    saveData();
    renderBookContent();
}
function updateParagraphText(cIndex, pIndex, text) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs[pIndex].text = text;
    saveData();
}
function deleteParagraph(cIndex, pIndex) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs.splice(pIndex, 1);
    saveData();
    renderBookContent();
}

// IMAGENES
function triggerImageUpload(cIndex, pIndex) {
    uploadContext = { chapterIdx: cIndex, paragraphIdx: pIndex };
    if(imageInput) imageInput.click();
}
if(imageInput) {
    imageInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0] && uploadContext.chapterIdx !== null) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const book = books.find(b => b.id === currentBookId);
                book.chapters[uploadContext.chapterIdx].paragraphs[uploadContext.paragraphIdx].image = event.target.result;
                saveData();
                renderBookContent();
                imageInput.value = ''; 
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}
function removeImage(cIndex, pIndex) {
    const book = books.find(b => b.id === currentBookId);
    book.chapters[cIndex].paragraphs[pIndex].image = null;
    saveData();
    renderBookContent();
}
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// EXPORTAR
window.createNewBook = createNewBook;
window.deleteCurrentBook = deleteCurrentBook;
window.goBack = goBack;
window.updateBookTitle = updateBookTitle;
window.addChapter = addChapter;
window.renderBookList = renderBookList;