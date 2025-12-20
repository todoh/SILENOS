// SILENOS 3/book-manager.js
// --- GESTOR DE LIBROS (BOOK EDITOR) ---

const BookManager = {
    // Renderiza la UI completa dentro de una ventana
    renderInWindow(windowId, bookId) {
        FileSystem.init();
        const book = FileSystem.getItem(bookId);
        
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!book || !winContent) return;

        // Estructura Base del Editor
        winContent.innerHTML = `
            <div class="book-editor-wrapper">
                <div class="book-toolbar">
                    <div class="book-meta-info">
                        <span class="book-stat-pill" id="stats-caps-${windowId}">0 Capítulos</span>
                        <span class="book-stat-pill" id="stats-words-${windowId}">0 Palabras</span>
                    </div>
                    <div class="book-meta-info">
                        <span id="save-status-${windowId}" class="text-green-600" style="opacity:0; transition:opacity 0.5s;">Guardado</span>
                    </div>
                </div>
                <div class="book-scroll-area" id="editor-area-${windowId}">
                    </div>
            </div>
        `;

        this.renderContent(windowId, bookId);
    },

    // Renderiza (o re-renderiza) la lista de capítulos y párrafos
    renderContent(windowId, bookId) {
        const book = FileSystem.getItem(bookId); // Obtener datos frescos
        const container = document.getElementById(`editor-area-${windowId}`);
        if (!container) return;

        // Guardar posición de scroll para restaurar tras re-render (si es necesario)
        const scrollPos = container.scrollTop;

        container.innerHTML = '';
        let totalWords = 0;

        // Si no hay capítulos, inicializamos uno
        if (!book.content.chapters || book.content.chapters.length === 0) {
            book.content.chapters = [{ title: "Capítulo 1", paragraphs: [""] }];
            this.saveBook(bookId, book.content);
        }

        book.content.chapters.forEach((chap, cIndex) => {
            const chapDiv = document.createElement('div');
            chapDiv.className = 'chapter-block';

            // Header del Capítulo
            chapDiv.innerHTML = `
                <div class="chapter-header">
                    <input type="text" class="chapter-title-input" value="${chap.title}" placeholder="Título del Capítulo"
                        oninput="BookManager.handleTitleChange('${bookId}', ${cIndex}, this.value, '${windowId}')">
                    
                    <div class="editor-controls">
                        <button class="editor-btn danger" title="Borrar Capítulo" 
                            onclick="BookManager.deleteChapter('${bookId}', ${cIndex}, '${windowId}')">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;

            // Párrafos
            chap.paragraphs.forEach((paraText, pIndex) => {
                totalWords += paraText.trim().split(/\s+/).length;
                
                const pWrapper = document.createElement('div');
                pWrapper.className = 'paragraph-wrapper';
                pWrapper.innerHTML = `
                    <textarea class="paragraph-text" placeholder="Escribe aquí..." rows="1"
                        oninput="BookManager.autoResize(this); BookManager.handleParaChange('${bookId}', ${cIndex}, ${pIndex}, this.value, '${windowId}')"
                        onkeydown="BookManager.handleParaKeys(event, '${bookId}', ${cIndex}, ${pIndex}, '${windowId}')"
                    >${paraText}</textarea>
                    
                    <div class="editor-controls">
                        <button class="editor-btn" title="Añadir Párrafo Debajo" 
                            onclick="BookManager.addParagraph('${bookId}', ${cIndex}, ${pIndex}, '${windowId}')">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                        </button>
                        <button class="editor-btn danger" title="Borrar Párrafo" 
                            onclick="BookManager.deleteParagraph('${bookId}', ${cIndex}, ${pIndex}, '${windowId}')">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
                chapDiv.appendChild(pWrapper);
                
                // Ajustar altura inicial
                setTimeout(() => {
                    const ta = pWrapper.querySelector('textarea');
                    if(ta) BookManager.autoResize(ta);
                }, 0);
            });

            container.appendChild(chapDiv);
        });

        // Botón Nuevo Capítulo al final
        const addBtn = document.createElement('button');
        addBtn.className = 'add-chapter-btn';
        addBtn.innerText = "+ Nuevo Capítulo";
        addBtn.onclick = () => this.addChapter(bookId, windowId);
        container.appendChild(addBtn);

        // Actualizar estadísticas
        const statsCaps = document.getElementById(`stats-caps-${windowId}`);
        const statsWords = document.getElementById(`stats-words-${windowId}`);
        if(statsCaps) statsCaps.innerText = `${book.content.chapters.length} Capítulos`;
        if(statsWords) statsWords.innerText = `${totalWords} Palabras`;

        // Restaurar iconos
        if (window.lucide) lucide.createIcons();
    },

    // --- ACCIONES DE DATOS ---

    handleTitleChange(bookId, cIndex, newTitle, windowId) {
        const book = FileSystem.getItem(bookId);
        book.content.chapters[cIndex].title = newTitle;
        this.saveBook(bookId, book.content, windowId);
    },

    handleParaChange(bookId, cIndex, pIndex, newText, windowId) {
        const book = FileSystem.getItem(bookId);
        book.content.chapters[cIndex].paragraphs[pIndex] = newText;
        this.saveBook(bookId, book.content, windowId);
        
        // Actualizar contador de palabras en tiempo real (simple)
        const statsWords = document.getElementById(`stats-words-${windowId}`);
        if(statsWords) {
             let total = 0;
             book.content.chapters.forEach(c => c.paragraphs.forEach(p => total += p.trim().split(/\s+/).length));
             statsWords.innerText = `${total} Palabras`;
        }
    },

    handleParaKeys(e, bookId, cIndex, pIndex, windowId) {
        // Enter crea nuevo párrafo
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.addParagraph(bookId, cIndex, pIndex, windowId);
        }
        // Backspace en párrafo vacío borra el párrafo
        if (e.key === 'Backspace' && e.target.value === '') {
            e.preventDefault();
            this.deleteParagraph(bookId, cIndex, pIndex, windowId);
        }
    },

    addChapter(bookId, windowId) {
        const book = FileSystem.getItem(bookId);
        book.content.chapters.push({ title: "Nuevo Capítulo", paragraphs: [""] });
        this.saveBook(bookId, book.content, windowId);
        this.renderContent(windowId, bookId);
        
        // Scroll al final
        setTimeout(() => {
            const container = document.getElementById(`editor-area-${windowId}`);
            if(container) container.scrollTop = container.scrollHeight;
        }, 50);
    },

    deleteChapter(bookId, cIndex, windowId) {
        if (!confirm("¿Borrar este capítulo?")) return;
        const book = FileSystem.getItem(bookId);
        book.content.chapters.splice(cIndex, 1);
        this.saveBook(bookId, book.content, windowId);
        this.renderContent(windowId, bookId);
    },

    addParagraph(bookId, cIndex, pIndex, windowId) {
        const book = FileSystem.getItem(bookId);
        book.content.chapters[cIndex].paragraphs.splice(pIndex + 1, 0, "");
        this.saveBook(bookId, book.content, windowId);
        this.renderContent(windowId, bookId);

        // Foco en el nuevo párrafo
        setTimeout(() => {
            const inputs = document.querySelectorAll(`#editor-area-${windowId} textarea`);
            // Calcular índice global del nuevo input es complejo, buscamos por estructura
            // Simplificación: buscamos el siguiente input en el DOM
            // ... (Lógica de foco avanzada omitida para brevedad, render completo pierde foco,
            // idealmente usaríamos manipulación DOM directa sin re-render completo para máxima fluidez,
            // pero re-render asegura consistencia).
            
            // Re-enfoque básico:
            const allTextAreas = document.querySelectorAll(`#editor-area-${windowId} .paragraph-text`);
            // Necesitamos saber qué índice global es.
            let count = 0;
            for(let c=0; c<=cIndex; c++) {
                if (c === cIndex) { count += (pIndex + 1); }
                else { count += book.content.chapters[c].paragraphs.length; }
            }
            if (allTextAreas[count]) allTextAreas[count].focus();

        }, 50);
    },

    deleteParagraph(bookId, cIndex, pIndex, windowId) {
        const book = FileSystem.getItem(bookId);
        const chap = book.content.chapters[cIndex];
        
        if (chap.paragraphs.length <= 1) {
            // No borrar el último párrafo, quizás vaciarlo
            chap.paragraphs[0] = "";
        } else {
            chap.paragraphs.splice(pIndex, 1);
        }
        
        this.saveBook(bookId, book.content, windowId);
        this.renderContent(windowId, bookId);
    },

    // --- UTILIDADES ---

    saveBook(bookId, content, windowId) {
        // Actualizar en memoria y disco
        const book = FileSystem.getItem(bookId);
        if (book) {
            book.content = content;
            FileSystem.save();
            
            if (windowId) {
                const badge = document.getElementById(`save-status-${windowId}`);
                if (badge) {
                    badge.style.opacity = '1';
                    setTimeout(() => badge.style.opacity = '0', 2000);
                }
            }
        }
    },

    autoResize(el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    }
};