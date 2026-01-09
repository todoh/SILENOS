/* SILENOS 3/book-manager.js */
// --- GESTOR DE LIBROS (BOOK MANAGER) ---
// Versión Híbrida: Editor con Previsualización de Imágenes + Visor + Índice

const BookManager = {
    // Almacena el estado de vista (edición/lectura) por ventana
    windowStates: {},

    // Renderiza la UI completa dentro de una ventana
    renderInWindow(windowId, bookId) {
        // Asegurar inicialización
        if (typeof FileSystem.init === 'function') FileSystem.init();
        
        const book = FileSystem.getItem(bookId);
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        
        if (!book || !winContent) return;

        // Inyectar estilos necesarios (solo una vez)
        this.injectStyles();

        // Inicializar estado si no existe
        if (!this.windowStates[windowId]) {
            this.windowStates[windowId] = 'edit'; // Por defecto edición
        }

        // Estructura Base (Toolbar + Área de Contenido)
        winContent.innerHTML = `
            <div class="book-manager-wrapper">
                <div class="book-toolbar">
                    <div class="book-meta-info">
                        <span class="book-stat-pill" id="stats-caps-${windowId}">0 Capítulos</span>
                        <span class="book-stat-pill" id="stats-words-${windowId}">0 Palabras</span>
                    </div>

                    <div class="book-controls">
                        <button class="book-mode-btn ${this.windowStates[windowId] === 'read' ? 'active' : ''}" 
                                onclick="BookManager.toggleMode('${windowId}', '${bookId}')"
                                title="Cambiar entre Edición y Lectura">
                            ${this.windowStates[windowId] === 'edit' 
                                ? '👁️ Modo Lectura' 
                                : '✍️ Modo Edición'}
                        </button>
                    </div>

                    <div class="book-meta-info">
                        <span id="save-status-${windowId}" class="text-green-600" style="opacity:0; transition:opacity 0.5s;">
                            ✅ Guardado
                        </span>
                    </div>
                </div>

                <div class="book-scroll-area" id="editor-area-${windowId}">
                    </div>
            </div>
        `;

        // Renderizar el contenido según el modo actual
        this.renderCurrentView(windowId, bookId);
    },

    // Alterna entre modo Edición y Lectura
    toggleMode(windowId, bookId) {
        const current = this.windowStates[windowId];
        this.windowStates[windowId] = current === 'edit' ? 'read' : 'edit';
        this.renderInWindow(windowId, bookId); // Re-renderizar todo
    },

    // Decide qué renderizar
    renderCurrentView(windowId, bookId) {
        if (this.windowStates[windowId] === 'read') {
            this.renderReaderMode(windowId, bookId);
        } else {
            this.renderEditorMode(windowId, bookId);
        }
    },

    // --- MODO LECTURA (VISUALIZACIÓN CON IMÁGENES + ÍNDICE) ---
    renderReaderMode(windowId, bookId) {
        const book = FileSystem.getItem(bookId);
        const container = document.getElementById(`editor-area-${windowId}`);
        if (!container) return;

        container.className = "book-scroll-area reader-mode"; 

        // 1. Construir el Índice (Table of Contents)
        let tocHTML = `<div class="reader-toc">
            <div class="reader-toc-header">📖 Índice</div>`;
        
        if (book.content && book.content.chapters && book.content.chapters.length > 0) {
            book.content.chapters.forEach((chapter, index) => {
                tocHTML += `
                    <div class="reader-toc-item" onclick="document.getElementById('read-chap-${windowId}-${index}').scrollIntoView({behavior: 'smooth'})">
                        <span class="toc-num">${index + 1}.</span> ${chapter.title || 'Sin Título'}
                    </div>
                `;
            });
        }
        tocHTML += `</div>`;

        // 2. Construir el contenido del libro (Paper)
        let html = `
            ${tocHTML}
            <div class="book-reader-paper">
                <div class="book-header-visual">
                    <h1 class="book-main-title">${book.title || 'Sin Título'}</h1>
                    <div class="book-meta-visual">Documento del Sistema</div>
                    <hr class="book-separator">
                </div>
        `;

        if (book.content && book.content.chapters && book.content.chapters.length > 0) {
            book.content.chapters.forEach((chapter, index) => {
                html += `
                    <div class="book-chapter-visual" id="read-chap-${windowId}-${index}">
                        <div class="book-chapter-header-visual">
                            <span class="book-chapter-number">${String(index + 1).padStart(2, '0')}</span>
                            <h2 class="book-chapter-title">${chapter.title}</h2>
                        </div>
                        <div class="book-chapter-body">
                `;
                
                // Renderizar HTML directamente
                chapter.paragraphs.forEach(para => {
                    html += `<div class="book-paragraph-visual">${para}</div>`;
                });

                html += `</div></div>`;
            });
        } else {
            html += `<div class="text-center text-slate-400 p-10">El libro está vacío.</div>`;
        }

        html += `</div>`;
        container.innerHTML = html;
        this.updateStats(windowId, bookId);
    },

    // --- MODO EDITOR MEJORADO (CON PREVISUALIZACIÓN DE IMÁGENES) ---
    renderEditorMode(windowId, bookId) {
        const book = FileSystem.getItem(bookId);
        const container = document.getElementById(`editor-area-${windowId}`);
        if (!container) return;

        container.className = "book-scroll-area editor-mode"; 
        container.innerHTML = '';

        if (!book.content || !book.content.chapters || book.content.chapters.length === 0) {
            book.content = { chapters: [{ title: "Capítulo 1", paragraphs: [""] }] };
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
                            🗑️
                        </button>
                    </div>
                </div>
            `;

            // Párrafos
            chap.paragraphs.forEach((paraText, pIndex) => {
                const pWrapper = document.createElement('div');
                pWrapper.className = 'paragraph-wrapper';
                
                // DETECCIÓN INTELIGENTE: Si tiene 'data:image', es una imagen Base64.
                // Si es imagen, mostramos la previsualización y ocultamos el textarea por defecto.
                const isImageBlock = paraText.includes('data:image') || paraText.includes('<img');
                
                // HTML del Wrapper
                pWrapper.innerHTML = `
                    ${/* Si es imagen, ponemos la previsualización arriba */ isImageBlock ? `<div class="visual-preview-box">${paraText}</div>` : ''}
                    
                    <textarea class="paragraph-text ${isImageBlock ? 'hidden-source' : ''}" placeholder="Escribe aquí..." rows="1"
                        oninput="BookManager.autoResize(this); BookManager.handleParaChange('${bookId}', ${cIndex}, ${pIndex}, this.value, '${windowId}', this)"
                        onkeydown="BookManager.handleParaKeys(event, '${bookId}', ${cIndex}, ${pIndex}, '${windowId}')"
                    >${paraText}</textarea>
                    
                    <div class="editor-controls">
                        ${/* Botón extra para ver código si es imagen */ isImageBlock ? `
                        <button class="editor-btn" title="Ver/Ocultar Código Fuente" 
                            onclick="this.closest('.paragraph-wrapper').querySelector('textarea').classList.toggle('hidden-source'); BookManager.autoResize(this.closest('.paragraph-wrapper').querySelector('textarea'))">
                            📝
                        </button>` : ''}

                        <button class="editor-btn" title="Añadir Párrafo Debajo" 
                            onclick="BookManager.addParagraph('${bookId}', ${cIndex}, ${pIndex}, '${windowId}')">
                            ➕
                        </button>
                        <button class="editor-btn danger" title="Borrar Párrafo" 
                            onclick="BookManager.deleteParagraph('${bookId}', ${cIndex}, ${pIndex}, '${windowId}')">
                            ❌
                        </button>
                    </div>
                `;
                chapDiv.appendChild(pWrapper);
                
                // Ajustar altura inicial si no está oculto
                setTimeout(() => {
                    const ta = pWrapper.querySelector('textarea');
                    if(ta && !ta.classList.contains('hidden-source')) BookManager.autoResize(ta);
                }, 0);
            });

            container.appendChild(chapDiv);
        });

        // Botón Nuevo Capítulo
        const addBtn = document.createElement('button');
        addBtn.className = 'add-chapter-btn';
        addBtn.innerHTML = '➕ Nuevo Capítulo';
        addBtn.onclick = () => this.addChapter(bookId, windowId);
        container.appendChild(addBtn);

        this.updateStats(windowId, bookId);
    },

    // --- MANEJO DE ESTADÍSTICAS ---
    updateStats(windowId, bookId) {
        const book = FileSystem.getItem(bookId);
        if (!book || !book.content || !book.content.chapters) return;

        const statsCaps = document.getElementById(`stats-caps-${windowId}`);
        const statsWords = document.getElementById(`stats-words-${windowId}`);
        
        let totalWords = 0;
        book.content.chapters.forEach(c => {
            if(c.paragraphs) {
                c.paragraphs.forEach(p => totalWords += p.replace(/<[^>]*>?/gm, '').trim().split(/\s+/).length);
            }
        });

        if(statsCaps) statsCaps.innerText = `${book.content.chapters.length} Capítulos`;
        if(statsWords) statsWords.innerText = `${totalWords} Palabras`;
    },

    // --- ACCIONES DE DATOS ---

    handleTitleChange(bookId, cIndex, newTitle, windowId) {
        const book = FileSystem.getItem(bookId);
        book.content.chapters[cIndex].title = newTitle;
        this.saveBook(bookId, book.content, windowId);
    },

    handleParaChange(bookId, cIndex, pIndex, newText, windowId, textareaEl) {
        const book = FileSystem.getItem(bookId);
        book.content.chapters[cIndex].paragraphs[pIndex] = newText;
        this.saveBook(bookId, book.content, windowId);

        // Actualización en vivo de la previsualización si existe
        if (textareaEl) {
            const preview = textareaEl.parentNode.querySelector('.visual-preview-box');
            if (preview) {
                preview.innerHTML = newText;
            }
        }
    },

    handleParaKeys(e, bookId, cIndex, pIndex, windowId) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.addParagraph(bookId, cIndex, pIndex, windowId);
        }
        if (e.key === 'Backspace' && e.target.value === '') {
            e.preventDefault();
            this.deleteParagraph(bookId, cIndex, pIndex, windowId);
        }
    },

    addChapter(bookId, windowId) {
        const book = FileSystem.getItem(bookId);
        if (!book.content.chapters) book.content.chapters = [];
        book.content.chapters.push({ title: "Nuevo Capítulo", paragraphs: [""] });
        this.saveBook(bookId, book.content, windowId);
        this.renderEditorMode(windowId, bookId);
        
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
        this.renderEditorMode(windowId, bookId);
    },

    addParagraph(bookId, cIndex, pIndex, windowId) {
        const book = FileSystem.getItem(bookId);
        book.content.chapters[cIndex].paragraphs.splice(pIndex + 1, 0, "");
        this.saveBook(bookId, book.content, windowId);
        this.renderEditorMode(windowId, bookId);

        setTimeout(() => {
            const allTextAreas = document.querySelectorAll(`#editor-area-${windowId} .paragraph-text`);
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
            chap.paragraphs[0] = "";
        } else {
            chap.paragraphs.splice(pIndex, 1);
        }
        
        this.saveBook(bookId, book.content, windowId);
        this.renderEditorMode(windowId, bookId);
    },

    // --- UTILIDADES ---

    saveBook(bookId, content, windowId) {
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
                this.updateStats(windowId, bookId);
            }
        }
    },

    autoResize(el) {
        if (!el || el.classList.contains('hidden-source')) return;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    },

    injectStyles() {
        if (document.getElementById('book-manager-styles')) return;

        const style = document.createElement('style');
        style.id = 'book-manager-styles';
        style.textContent = `
            /* --- LAYOUT GENERAL --- */
            .book-manager-wrapper { display: flex; flex-direction: column; height: 100%; background: #f8fafc; }
            
            .book-toolbar { 
                height: 48px; flex-shrink: 0; background: white; border-bottom: 1px solid #e2e8f0; 
                display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.02); z-index: 20; position: relative;
            }
            .book-meta-info { font-size: 11px; color: #64748b; font-weight: 600; display: flex; gap: 8px; }
            .book-stat-pill { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; }
            .book-controls { display: flex; gap: 8px; }
            
            .book-mode-btn {
                background: white; border: 1px solid #cbd5e1; color: #475569;
                padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;
                cursor: pointer; transition: all 0.2s;
            }
            .book-mode-btn:hover { background: #f8fafc; color: #0f172a; }
            .book-mode-btn.active { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; }

            .book-scroll-area { flex: 1; overflow-y: auto; padding: 40px; position: relative; }
            
            /* --- ESTILOS MODO EDITOR --- */
            .editor-mode { padding: 40px; }
            .chapter-block { margin-bottom: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            
            .chapter-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
            .chapter-title-input { font-size: 18px; font-weight: 700; color: #0f172a; border: none; outline: none; width: 100%; background: transparent; }
            .chapter-title-input:focus { color: #3b82f6; }

            .paragraph-wrapper { position: relative; margin-bottom: 16px; display: flex; gap: 8px; group: 'para'; flex-direction: column; }
            
            /* Textarea normal */
            .paragraph-text { 
                width: 100%; resize: none; border: 1px solid transparent; padding: 8px; 
                font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6; color: #334155; 
                border-radius: 4px; background: #f8fafc; transition: all 0.2s; overflow: hidden;
            }
            .paragraph-text:focus { background: white; border-color: #94a3b8; outline: none; box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.1); }
            
            /* NUEVO: Textarea oculto (para imágenes) */
            .paragraph-text.hidden-source { display: none; }

            /* NUEVO: Caja de previsualización en el editor */
            .visual-preview-box {
                width: 100%;
                padding: 10px;
                border: 1px dashed #cbd5e1;
                border-radius: 4px;
                background: #f1f5f9;
                margin-bottom: 5px;
                text-align: center;
                min-height: 50px;
                display: flex; justify-content: center; align-items: center;
            }
            .visual-preview-box img { max-width: 100%; max-height: 300px; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

            /* Controles del editor */
            .editor-controls { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; align-items: flex-start; position: absolute; right: -35px; top: 0; }
            .paragraph-wrapper:hover .editor-controls, .chapter-header:hover .editor-controls { opacity: 1; }
            
            .editor-btn { width: 24px; height: 24px; border: 1px solid #e2e8f0; border-radius: 4px; background: white; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; }
            .editor-btn:hover { background: #f1f5f9; color: #334155; }
            .editor-btn.danger:hover { background: #fef2f2; color: #ef4444; border-color: #fca5a5; }

            .add-chapter-btn { width: 100%; padding: 12px; border: 2px dashed #cbd5e1; border-radius: 8px; color: #64748b; font-weight: 600; background: transparent; cursor: pointer; transition: all 0.2s; }
            .add-chapter-btn:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }

            /* --- ESTILOS MODO LECTURA (READER) --- */
            .reader-mode { 
                background: #cbd5e1; 
                padding: 0; 
                display: block; 
            }

            /* Índice flotante */
            .reader-toc {
                position: sticky;
                top: 20px;
                left: 20px;
                width: 220px;
                float: left; 
                margin-right: -220px; 
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(4px);
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                z-index: 10;
                max-height: 80vh;
                overflow-y: auto;
                margin-left: 20px;
                margin-top: 40px;
            }

            .reader-toc-header { font-weight: 800; color: #334155; margin-bottom: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
            .reader-toc-item { 
                font-size: 13px; color: #64748b; padding: 4px 8px; cursor: pointer; border-radius: 4px; 
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .reader-toc-item:hover { background: #f1f5f9; color: #0f172a; }
            .toc-num { color: #94a3b8; font-size: 11px; margin-right: 5px; }

            .book-reader-paper { 
                display: block;
                width: 100%; 
                max-width: 800px; 
                margin: 40px auto; 
                background: #fdfbf7; 
                height: auto; 
                min-height: calc(100vh - 80px);
                padding: 80px 80px; 
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); 
                font-family: 'Georgia', serif; 
                color: #1e293b;
                position: relative;
            }

            .book-main-title { font-size: 2.5em; font-weight: 900; text-align: center; margin-bottom: 5px; color: #0f172a; }
            .book-meta-visual { text-align: center; color: #94a3b8; text-transform: uppercase; font-size: 0.7em; letter-spacing: 2px; margin-bottom: 20px; }
            .book-separator { border: 0; border-top: 2px solid #0f172a; width: 40px; margin: 0 auto 60px auto; }
            
            .book-chapter-visual { margin-bottom: 60px; scroll-margin-top: 60px; }
            .book-chapter-header-visual { display: flex; align-items: baseline; gap: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 30px; }
            .book-chapter-number { font-size: 3em; font-weight: 900; color: #e2e8f0; font-family: sans-serif; line-height: 0.8; }
            .book-chapter-title { font-size: 1.5em; font-weight: 700; color: #1e293b; margin: 0; font-family: sans-serif; }
            
            .book-paragraph-visual { margin-bottom: 1.5em; font-size: 1.1em; line-height: 1.8; text-align: justify; }
            
            /* IMÁGENES EN EL HTML */
            .book-paragraph-visual img { 
                display: block; max-width: 100%; height: auto; margin: 30px auto; 
                border-radius: 2px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; 
            }
        `;
        document.head.appendChild(style);
    }
};