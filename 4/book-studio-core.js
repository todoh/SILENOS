// --- BOOK-STUDIO-CORE.JS (UI & CONTROLLER) ---

window.BookStudio = {
    currentEntry: null, // FileHandle
    data: [],           // Array de bloques del libro (formato interno editor)
    metadata: null,     // INFO EXTRA: Title, Author, etc (para formato nuevo)
    mode: 'edit',       // 'edit' | 'read'
    
    init(entry, rawData) {
        this.currentEntry = entry;
        
        // --- ADAPTADOR DE DATOS ---
        // Comprobamos si es el formato nuevo con "chapters"
        if (rawData.chapters && Array.isArray(rawData.chapters)) {
            // Guardamos metadatos para no perderlos al guardar
            this.metadata = {
                title: rawData.title || "Sin Título",
                author: rawData.author || "Anonimo",
                genre: rawData.genre || "General",
                created: rawData.created,
                version: "v5"
            };

            // Convertimos la estructura de Capítulos -> Párrafos a Bloques de Edición
            // El editor usa: { section: "Titulo", content: "Texto completo..." }
            this.data = rawData.chapters.map(chap => ({
                timestamp: new Date().toISOString(),
                section: chap.title,
                // Unimos los párrafos con doble salto de línea para editar como texto corrido
                content: Array.isArray(chap.paragraphs) ? chap.paragraphs.join('\n\n') : (chap.paragraphs || "")
            }));

        } else {
            // Formato Legacy (Array directo)
            this.metadata = null; // No hay metadatos complejos
            this.data = Array.isArray(rawData) ? rawData : Object.values(rawData);
        }

        this.openUI();
    },

    openUI() {
        if (typeof WindowManager === 'undefined') return;
        
        // ID único para evitar conflictos
        const winId = 'book-studio-' + Date.now();
        
        const content = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                body { background: #ffffff; font-family: 'Inter', sans-serif; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
                
                /* Nordic Scrollbar */
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-thumb { background: #e5e5e5; }
                
                .toolbar { border-bottom: 1px solid #eee; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; background: #fff; z-index: 10; }
                .btn-tool { font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 6px 12px; border: 1px solid #eee; cursor: pointer; transition: all 0.2s; text-transform: uppercase; background: white; color: #333; }
                .btn-tool:hover { background: #000; color: #fff; border-color: #000; }
                .btn-active { background: #000; color: #fff; border-color: #000; }
                
                .workspace { flex: 1; display: flex; overflow: hidden; position: relative; }
                
                /* Editor Styles */
                .block-list { width: 100%; overflow-y: auto; padding: 40px; max-width: 800px; margin: 0 auto; padding-bottom: 100px; }
                .block-item { margin-bottom: 30px; position: relative; transition: opacity 0.3s; padding-left: 10px; border-left: 2px solid transparent; }
                .block-item:hover { border-left-color: #eee; }
                .block-item:hover .block-controls { opacity: 1; }
                
                .block-meta { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #999; margin-bottom: 5px; display: flex; justify-content: space-between; }
                
                .input-section { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.1rem; width: 100%; border: none; outline: none; color: #111; margin-bottom: 8px; background: transparent; }
                .input-content { font-family: 'Georgia', serif; font-size: 1.05rem; line-height: 1.7; width: 100%; border: none; outline: none; color: #333; resize: none; overflow: hidden; background: transparent; min-height: 50px; }
                
                /* Reader Styles */
                .reader-view { width: 100%; height: 100%; overflow-y: auto; padding: 60px; font-family: 'Georgia', serif; line-height: 1.8; color: #1a1a1a; max-width: 700px; margin: 0 auto; }
                .reader-section { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 1.5rem; margin-top: 40px; margin-bottom: 20px; letter-spacing: -0.02em; }
                .reader-p { margin-bottom: 1.5em; text-align: justify; }

                /* Controls */
                .block-controls { position: absolute; right: -40px; top: 0; display: flex; flex-direction: column; gap: 5px; opacity: 0; transition: opacity 0.2s; }
                .btn-mini { width: 24px; height: 24px; border: 1px solid #eee; background: white; color: #999; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; }
                .btn-mini:hover { background: black; color: white; border-color: black; }
                .btn-del:hover { background: red; color: white; border-color: red; }

                .insert-zone { height: 14px; width: 100%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; cursor: pointer; margin: 5px 0; }
                .insert-zone:hover { opacity: 1; }
                .insert-line { height: 1px; background: #000; width: 100%; position: relative; }
                .insert-btn { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background: black; color: white; font-size: 9px; padding: 2px 8px; border-radius: 10px; font-family: 'Inter', sans-serif; }
            </style>
        </head>
        <body>
            <div class="toolbar">
                <div class="flex gap-2 items-center">
                    <span class="font-bold text-xs tracking-widest mr-4">LIBRO STUDIO</span>
                    <button class="btn-tool ${this.mode === 'edit' ? 'btn-active' : ''}" onclick="setMode('edit')"><i class="fa-solid fa-pen-nib"></i> EDICIÓN</button>
                    <button class="btn-tool ${this.mode === 'read' ? 'btn-active' : ''}" onclick="setMode('read')"><i class="fa-solid fa-book-open"></i> LECTURA</button>
                </div>
                <div class="flex gap-2">
                    <button class="btn-tool" onclick="addNewBlockEnd()"><i class="fa-solid fa-plus"></i> PARRAFO</button>
                    <button class="btn-tool" onclick="doExport()"><i class="fa-solid fa-file-export"></i> HTML</button>
                    <button class="btn-tool" onclick="doSave()" style="border-color: black;"><i class="fa-solid fa-floppy-disk"></i> GUARDAR</button>
                </div>
            </div>

            <div class="workspace" id="workspace"></div>

            <script>
                // Referencias al entorno padre
                const Studio = window.parent.BookStudio;
                const Actions = window.parent.BookActions;
                const Exporter = window.parent.BookExporter;
                
                // --- RENDERIZADO DOM PURO (Evita errores de sintaxis) ---
                function render() {
                    const ws = document.getElementById('workspace');
                    const isEdit = Studio.mode === 'edit';
                    ws.innerHTML = ''; // Limpiar

                    if (isEdit) {
                        const list = document.createElement('div');
                        list.className = 'block-list';
                        
                        // Añadir título del libro si hay metadatos
                        if (Studio.metadata) {
                             const info = document.createElement('div');
                             info.className = 'mb-8 pb-4 border-b border-gray-100 text-center';
                             info.innerHTML = \`<h1 class="text-xl font-bold tracking-tight">\${Studio.metadata.title}</h1><p class="text-xs text-gray-400 mt-1">\${Studio.metadata.author}</p>\`;
                             list.appendChild(info);
                        }

                        Studio.data.forEach((block, index) => {
                            // 1. Zona de Inserción Superior
                            list.appendChild(createInsertZone(index));

                            // 2. Contenedor del Bloque
                            const item = document.createElement('div');
                            item.className = 'block-item';
                            
                            // -- Metadatos
                            const meta = document.createElement('div');
                            meta.className = 'block-meta';
                            meta.innerHTML = \`<span>IDX: \${index}</span><span>\${block.timestamp ? block.timestamp.split('T')[0] : 'N/A'}</span>\`;
                            item.appendChild(meta);

                            // -- Controles (Botonera flotante)
                            const controls = document.createElement('div');
                            controls.className = 'block-controls';
                            
                            const btnDel = document.createElement('button');
                            btnDel.className = 'btn-mini btn-del';
                            btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
                            btnDel.onclick = () => deleteBlock(index);
                            
                            const btnDup = document.createElement('button');
                            btnDup.className = 'btn-mini';
                            btnDup.innerHTML = '<i class="fa-solid fa-copy"></i>';
                            btnDup.onclick = () => duplicateBlock(index);

                            controls.appendChild(btnDel);
                            controls.appendChild(btnDup);
                            item.appendChild(controls);

                            // -- Input Sección (Título)
                            const inpSection = document.createElement('input');
                            inpSection.type = 'text';
                            inpSection.className = 'input-section';
                            inpSection.value = block.section || '';
                            inpSection.placeholder = 'Título de Sección / Capítulo';
                            inpSection.onchange = (e) => updateBlock(index, 'section', e.target.value);
                            item.appendChild(inpSection);

                            // -- Textarea Contenido (DOM directo para evitar errores de escape)
                            const txtContent = document.createElement('textarea');
                            txtContent.className = 'input-content';
                            txtContent.rows = 1;
                            txtContent.value = block.content || '';
                            txtContent.oninput = function() { autoResize(this); };
                            txtContent.onchange = (e) => updateBlock(index, 'content', e.target.value);
                            item.appendChild(txtContent);

                            list.appendChild(item);

                            // Auto-resize inicial
                            setTimeout(() => autoResize(txtContent), 0);
                        });
                        
                        // Zona de inserción final
                        list.appendChild(createInsertZone(Studio.data.length));

                        ws.appendChild(list);
                    } else {
                        // --- MODO LECTURA ---
                        const reader = document.createElement('div');
                        reader.className = 'reader-view';
                        
                        if (Studio.metadata) {
                             const h1 = document.createElement('h1');
                             h1.style.textAlign = 'center';
                             h1.style.marginBottom = '60px';
                             h1.innerText = Studio.metadata.title;
                             reader.appendChild(h1);
                        }

                        Studio.data.forEach(block => {
                            if(block.section) {
                                const h = document.createElement('h2');
                                h.className = 'reader-section';
                                h.textContent = block.section;
                                reader.appendChild(h);
                            }
                            // Procesar párrafos
                            if(block.content) {
                                const pars = block.content.split('\\n\\n');
                                pars.forEach(pText => {
                                    if(pText.trim()) {
                                        const p = document.createElement('p');
                                        p.className = 'reader-p';
                                        p.innerText = pText;
                                        reader.appendChild(p);
                                    }
                                });
                            }
                        });
                        ws.appendChild(reader);
                    }
                }

                function createInsertZone(index) {
                    const div = document.createElement('div');
                    div.className = 'insert-zone';
                    div.innerHTML = '<div class="insert-line"><div class="insert-btn">+</div></div>';
                    div.onclick = () => { insertBlock(index); };
                    return div;
                }

                window.autoResize = function(el) {
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                }

                // --- ACCIONES ---
                window.setMode = (m) => { Studio.mode = m; render(); updateToolbarState(); };
                
                function updateToolbarState() {
                   const btns = document.querySelectorAll('.btn-tool');
                   btns.forEach(b => {
                        if(b.textContent.includes('EDICIÓN')) b.className = Studio.mode === 'edit' ? 'btn-tool btn-active' : 'btn-tool';
                        if(b.textContent.includes('LECTURA')) b.className = Studio.mode === 'read' ? 'btn-tool btn-active' : 'btn-tool';
                   });
                }

                window.updateBlock = (idx, key, val) => Actions.update(idx, key, val);
                window.deleteBlock = (idx) => { if(confirm('¿Borrar bloque?')) { Actions.delete(idx); render(); } };
                window.duplicateBlock = (idx) => { Actions.duplicate(idx); render(); };
                window.insertBlock = (idx) => { Actions.insert(idx); render(); };
                window.addNewBlockEnd = () => { Actions.insert(Studio.data.length); render(); };
                window.doSave = () => Actions.save();
                window.doExport = () => Exporter.generate(Studio.data, Studio.currentEntry.name);

                // Init
                render();
            </script>
        </body>
        </html>
        `;

        WindowManager.openWindow(`STUDIO: ${this.currentEntry.name}`, content, 'html');
    }
};