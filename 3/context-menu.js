/* SILENOS 3/context-menu.js */
// --- GESTOR DE DESCARGAS ---

const DownloadManager = {
    downloadBlob(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Descarga genérica del objeto completo
    downloadJSON(item) {
        const jsonStr = JSON.stringify(item, null, 2);
        this.downloadBlob(jsonStr, `${item.title.replace(/\s+/g, '_')}.json`, 'application/json');
    },

    // Descarga narrativa simple
    downloadNarrativeTxt(item) {
        const content = item.content || {};
        const text = `TÍTULO: ${item.title}\nETIQUETA: ${content.tag || ''}\n\n${content.text || ''}`;
        this.downloadBlob(text, `${item.title}.txt`, 'text/plain');
    },

    // Generar TXT de Libro
    downloadBookTxt(item) {
        let text = `LIBRO: ${item.title}\n====================\n\n`;
        const chapters = item.content.chapters || [];
        
        chapters.forEach(chap => {
            text += `### ${chap.title}\n\n`;
            chap.paragraphs.forEach(p => text += `${p}\n\n`);
            text += `--------------------\n\n`;
        });
        
        this.downloadBlob(text, `${item.title}.txt`, 'text/plain');
    },

    // Generar DOC (HTML compatible con Word)
    downloadBookDoc(item) {
        let html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>${item.title}</title></head>
            <body>
            <h1>${item.title}</h1>
        `;
        
        const chapters = item.content.chapters || [];
        chapters.forEach(chap => {
            html += `<h2>${chap.title}</h2>`;
            chap.paragraphs.forEach(p => html += `<p>${p}</p>`);
            html += `<br/>`;
        });
        
        html += `</body></html>`;
        this.downloadBlob(html, `${item.title}.doc`, 'application/msword');
    },

    // Generar PDF (Usando la ventana de impresión del navegador)
    downloadBookPdf(item) {
        const printWindow = window.open('', '_blank');
        let html = `
            <html>
            <head>
                <title>${item.title}</title>
                <style>
                    body { font-family: 'Georgia', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #1a202c; }
                    h1 { text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 40px; }
                    h2 { margin-top: 50px; color: #2d3748; page-break-before: always; }
                    h2:first-of-type { page-break-before: auto; }
                    p { margin-bottom: 15px; text-align: justify; }
                    @media print {
                        body { padding: 0; margin: 20mm; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>${item.title}</h1>
        `;
        
        const chapters = item.content.chapters || [];
        chapters.forEach(chap => {
            html += `<h2>${chap.title}</h2>`;
            chap.paragraphs.forEach(p => html += `<p>${p}</p>`);
        });

        html += `
            <script>
                window.onload = function() { 
                    setTimeout(() => { window.print(); window.close(); }, 500);
                }
            </script>
            </body></html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    }
};

// --- PORTAPAPELES DEL SISTEMA ---
const SystemClipboard = {
    ids: [],
    sourceMode: 'copy', // 'copy' | 'cut'

    copy(ids) {
        this.ids = [...ids];
        this.sourceMode = 'copy';
        console.log("Portapapeles: Copiado", this.ids);
    },

    hasItems() {
        return this.ids.length > 0;
    },

    getIds() {
        return this.ids;
    }
};

// --- MENÚ CONTEXTUAL (LÓGICA PRINCIPAL) ---

document.addEventListener('contextmenu', (e) => {
    // Si estamos dentro del editor visual del programador, NO mostrar menú de escritorio
    if (e.target.closest('.prog-editor-container')) {
        e.preventDefault(); 
        return; 
    }

    e.preventDefault();
    
    // Detectar si el click fue sobre un archivo/carpeta
    const itemEl = e.target.closest('[data-id]');
    const itemId = itemEl ? itemEl.dataset.id : null;
    let itemTitle = null;

    // Gestión de Selección al hacer click derecho
    if (itemId) {
        if (typeof SelectionManager !== 'undefined') {
            // Si hacemos click derecho en algo no seleccionado, seleccionamos SOLO eso
            if (!SelectionManager.isSelected(itemId)) {
                SelectionManager.clearSelection();
                SelectionManager.addId(itemId);
            }
        }
        const item = FileSystem.getItem(itemId);
        if (item) itemTitle = item.title;
    } else {
        // Click en vacío
    }

    // Detectar si estamos en escritorio o en una carpeta
    const folderContent = e.target.closest('.folder-window-content');
    const parentId = folderContent ? folderContent.dataset.folderId : 'desktop';

    createContextMenu(e.clientX, e.clientY, itemId, itemTitle, parentId);
});

document.addEventListener('click', () => {
    removeContextMenu();
});

function createContextMenu(x, y, itemId = null, itemTitle = null, parentId = 'desktop') {
    removeContextMenu();

    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.className = 'fixed z-[9999] bg-[#e0e5ec] p-2 rounded-xl flex flex-col gap-1 w-56 shadow-xl border border-white/50 pop-in';
    
    let finalX = x;
    let finalY = y;
    if (finalX + 224 > window.innerWidth) finalX = finalX - 224;
    if (finalY + 300 > window.innerHeight) finalY = finalY - 300; 
    
    menu.style.left = `${finalX}px`;
    menu.style.top = `${finalY}px`;

    const options = [];
    let selectedCount = 0;
    let selectedIds = [];

    if (typeof SelectionManager !== 'undefined') {
        selectedIds = SelectionManager.getSelectedIds();
        selectedCount = selectedIds.length;
    }

    let isProgram = false;
    let currentItem = null;

    if (itemId) {
        currentItem = FileSystem.getItem(itemId);
        if (currentItem && currentItem.type === 'program') isProgram = true;
    }

    // --- BLOQUE 1: ACCIONES SOBRE ITEMS (Copiar, Descargar, Borrar) ---
    if (itemId || selectedCount > 0) {
        
        // OPCIÓN COPIAR
        options.push({
            label: `Copiar ${selectedCount > 1 ? '('+selectedCount+')' : ''}`,
            icon: 'copy',
            color: 'text-blue-600',
            action: () => {
                const idsToCopy = selectedCount > 0 ? selectedIds : [itemId];
                SystemClipboard.copy(idsToCopy);
                
                // [CORREGIDO] Feedback visual seguro (Notificación Flotante)
                // Antes esto borraba el body si el foco no estaba en el botón correcto.
                const notif = document.createElement('div');
                notif.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-xs font-bold z-[10000] pop-in pointer-events-none backdrop-blur-sm shadow-lg';
                notif.innerText = "Copiado al portapapeles";
                document.body.appendChild(notif);
                setTimeout(() => notif.remove(), 2000);
            }
        });

        // SEPARADOR
        options.push({ separator: true });

        // --- SECCIÓN DE DESCARGAS (Solo si hay 1 seleccionado) ---
        if (selectedCount <= 1 && currentItem) {
            
            // 1. Descarga JSON Universal
            options.push({
                label: 'Descargar JSON',
                icon: 'file-json',
                color: 'text-gray-600',
                action: () => DownloadManager.downloadJSON(currentItem)
            });

            // 2. Opciones Específicas para LIBROS
            if (currentItem.type === 'book') {
                options.push(
                    { label: 'Descargar DOC', icon: 'file-type-2', color: 'text-blue-600', action: () => DownloadManager.downloadBookDoc(currentItem) },
                    { label: 'Descargar PDF', icon: 'printer', color: 'text-red-600', action: () => DownloadManager.downloadBookPdf(currentItem) },
                    { label: 'Descargar TXT', icon: 'align-left', color: 'text-gray-600', action: () => DownloadManager.downloadBookTxt(currentItem) }
                );
            }

            // 3. Opciones Específicas para NARRATIVA
            if (currentItem.type === 'narrative') {
                options.push({ 
                    label: 'Descargar TXT', 
                    icon: 'align-left', 
                    color: 'text-orange-600', 
                    action: () => DownloadManager.downloadNarrativeTxt(currentItem) 
                });
            }
        }

        // --- OPCIONES DE EDICIÓN ---

        // OPCIÓN EDITAR (Solo para programas)
        if (isProgram && selectedCount <= 1) {
            options.push({
                label: 'Editar Programa',
                icon: 'edit-3',
                color: 'text-blue-600',
                action: () => {
                    if (typeof openProgrammerWindow === 'function') openProgrammerWindow(itemId);
                }
            });
        }

        let deleteLabel = 'Eliminar';
        if (selectedCount > 1) {
            deleteLabel = `Eliminar (${selectedCount})`;
        }
        options.push({
            label: deleteLabel,
            icon: 'trash-2',
            color: 'text-red-500',
            action: () => {
                showDeleteConfirm(finalX, finalY, itemId, itemTitle, selectedCount);
            }
        });

    } 
    
    // --- BLOQUE 2: ACCIONES SOBRE EL FONDO (Pegar, Crear Nuevo) ---
    // Si NO hicimos click en un item (o queremos permitir pegar igual)
    
    if (!itemId) {
        // OPCIÓN PEGAR (Solo si hay algo en portapapeles)
        if (SystemClipboard.hasItems()) {
            options.push({
                label: `Pegar (${SystemClipboard.getIds().length})`,
                icon: 'clipboard-paste', // Icono Pegar
                color: 'text-indigo-600',
                action: () => {
                    handlePasteAction(parentId, x, y);
                }
            });
            options.push({ separator: true });
        }

        // OPCIONES DE CREACIÓN
        options.push(
            {
                label: 'Crear Carpeta',
                icon: 'folder-plus',
                action: () => {
                    FileSystem.createFolder('Nueva Carpeta', parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            },
            {
                label: 'Crear Programa',
                icon: 'cpu',
                color: 'text-purple-600',
                action: () => {
                    FileSystem.createProgram('Nuevo Programa', parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            },
            {
                label: 'Crear Libro',  
                icon: 'book-plus',
                color: 'text-indigo-600',
                action: () => {
                    FileSystem.createBook('Nuevo Libro', parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            },
            {
                label: 'Crear Dato Narrativo', 
                icon: 'sticky-note',
                color: 'text-orange-500',
                action: () => {
                    FileSystem.createNarrative('Dato Narrativo', parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            },
            {
                label: 'Crear Dato (JSON)',
                icon: 'file-plus',
                color: 'text-green-600',
                action: () => {
                    FileSystem.createData('Dato_' + Math.floor(Math.random()*100), { info: "Test" }, parentId, x - 40, y - 40);
                    refreshAllViews();
                }
            }
        );
    }

    // Renderizar Opciones
    options.forEach(opt => {
        if (opt.separator) {
            const sep = document.createElement('div');
            sep.className = 'h-px bg-gray-300 my-1';
            menu.appendChild(sep);
        } else {
            const btn = document.createElement('button');
            const textColor = opt.color || 'text-gray-700';
            const iconName = opt.icon || 'circle';

            btn.className = `flex items-center gap-3 px-3 py-2 hover:bg-black/5 rounded-lg ${textColor} text-xs font-bold transition-colors text-left w-full`;
            btn.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4"></i> ${opt.label}`;
            btn.onclick = (e) => {
                e.stopPropagation();
                removeContextMenu(); 
                opt.action();
            };
            menu.appendChild(btn);
        }
    });

    document.body.appendChild(menu);
    if (window.lucide) lucide.createIcons();
}

function removeContextMenu() {
    const existing = document.getElementById('context-menu');
    if (existing) existing.remove();
}

// --- LÓGICA DE PEGADO Y CLONADO ---

function handlePasteAction(targetParentId, mouseX, mouseY) {
    const ids = SystemClipboard.getIds();
    
    // Iniciar transacción de sistema de archivos
    FileSystem.init();

    ids.forEach((id, index) => {
        // Calcular posición en cascada si son varios
        const finalX = mouseX - 32 + (index * 15);
        const finalY = mouseY - 32 + (index * 15);
        
        duplicateItemRecursive(id, targetParentId, finalX, finalY);
    });

    FileSystem.save();
    
    // Refrescar vistas
    if (typeof refreshSystemViews === 'function') refreshSystemViews();
    if (typeof SelectionManager !== 'undefined') SelectionManager.clearSelection();
}

// Función recursiva para duplicar items y carpetas
function duplicateItemRecursive(itemId, newParentId, x = 0, y = 0) {
    const original = FileSystem.getItem(itemId);
    if (!original) return;

    // 1. Crear clon profundo del objeto
    const clone = JSON.parse(JSON.stringify(original));
    
    // 2. Generar nuevo ID único
    clone.id = original.type + '-' + Date.now() + Math.floor(Math.random() * 1000000);
    
    // 3. Asignar nuevo padre
    clone.parentId = newParentId;
    
    // 4. Modificar título
    if (!clone.title.includes('(Copia)')) {
        clone.title = clone.title + " (Copia)";
    } else {
        clone.title = clone.title + " 2";
    }

    // 5. Asignar posición
    clone.x = x;
    clone.y = y;

    // 6. Insertar en el sistema
    FileSystem.data.push(clone);

    // 7. Si es carpeta, procesar hijos recursivamente
    if (original.type === 'folder') {
        const children = FileSystem.getItems(itemId); // Items del original
        children.forEach(child => {
            // Llamada recursiva con posiciones 0 (en carpeta se organizan solos)
            duplicateItemRecursive(child.id, clone.id, 0, 0);
        });
    }
}

// --- LÓGICA DE BORRADO ---

function showDeleteConfirm(x, y, singleId, singleName, count) {
    const existing = document.getElementById('delete-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'delete-modal';
    modal.className = 'fixed z-[10000] bg-[#e0e5ec]/90 backdrop-blur border border-white/50 shadow-2xl rounded-xl p-4 flex flex-col items-center gap-3 pop-in';
    
    const modalW = 200; 
    let finalX = x;
    let finalY = y;

    if (finalX + modalW > window.innerWidth) finalX = window.innerWidth - modalW - 20;
    if (finalY + 120 > window.innerHeight) finalY = window.innerHeight - 120;

    modal.style.left = `${finalX}px`;
    modal.style.top = `${finalY}px`;
    modal.style.width = `${modalW}px`;

    let msg = singleName;
    if (count > 1) msg = `${count} elementos`;

    modal.innerHTML = `
        <div class="text-center">
            <p class="text-sm font-bold text-gray-700 break-words line-clamp-2">${msg}</p>
            <p class="text-xs text-gray-500 mt-1">¿Borrar definitivamente?</p>
        </div>
        <div class="flex gap-3 w-full justify-center">
            <button id="del-yes" class="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow transition-transform active:scale-95">
                Si
            </button>
            <button id="del-no" class="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg shadow transition-transform active:scale-95">
                No
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();

    document.getElementById('del-yes').onclick = () => {
        if (count > 1 && typeof SelectionManager !== 'undefined') {
            const ids = SelectionManager.getSelectedIds();
            ids.forEach(id => FileSystem.deleteItem(id));
            SelectionManager.clearSelection();
        } else if (singleId) {
            FileSystem.deleteItem(singleId);
        }
        
        if (window.refreshSystemViews) window.refreshSystemViews();
        close();
    };

    document.getElementById('del-no').onclick = close;

    setTimeout(() => {
        document.addEventListener('click', function onClickOutside(ev) {
            if (!modal.contains(ev.target)) {
                modal.remove();
                document.removeEventListener('click', onClickOutside);
            }
        }, { once: true });
    }, 100);
}