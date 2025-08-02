 
    // --- ESTADO GLOBAL ---
    let draggedItem = null;
    let activeImagePlaceholder = null;
    let moduleToDelete = null;
    let isSelecting = false;
    let didDragForSelection = false;
    let isMultiSelectingWithKey = false;
    let selectionBoxStart = { x: 0, y: 0 };

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const imageUploadInput = document.getElementById('e-image-upload-input');
    const deleteModal = document.getElementById('e-delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('e-confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('e-cancel-delete-btn');
    const mainArea = document.getElementById('e-main-area');
    const selectionBox = document.getElementById('e-selection-box');
    const deleteSelectedBtn = document.getElementById('e-delete-selected-btn');


const guardarRecetaBtn = document.getElementById('e-guardar-receta-btn');
const cargarRecetaSelect = document.getElementById('e-cargar-receta-select');
const editorContainer = document.getElementById('e-editor-container');
 

 ;


// Listener para el nuevo botón de guardar
if (guardarRecetaBtn) {
    guardarRecetaBtn.addEventListener('click', () => {
        // Abre un modal para que el usuario introduzca el nombre
        const nombre = prompt('Introduce un nombre para la composición:');
        if (nombre) {
            guardarComposicionComoReceta(nombre);
        }
    });
}

// Listener para el nuevo selector de cargar
if (cargarRecetaSelect) {        cargarRecetaSelect.addEventListener('click', actualizarListaRecetas);

    cargarRecetaSelect.addEventListener('change', (event) => {
        const nombreReceta = event.target.value;
        if (nombreReceta) {
            cargarComposicionDesdeReceta(nombreReceta);
        }
    });
}

// --- NUEVAS FUNCIONES DE LÓGICA DE RECETAS ---

// EN: editor.js -> Reemplaza la función existente por esta

/**
 * Recolecta los datos de la composición actual y llama a la función para archivarla.
 * @param {string} nombre - El nombre para la nueva receta, proporcionado por el usuario.
 */
function guardarComposicionComoReceta(nombre) {
    const cartaContainer = document.getElementById('carta');
    if (!cartaContainer) return;

    const textareas = cartaContainer.querySelectorAll('.carta-item textarea');
    if (textareas.length === 0) {
        alert('La composición está vacía.');
        return;
    }

    const nombresDeLaComposicion = Array.from(textareas).map(textarea => textarea.dataset.nombreOriginal);
    const jsonComposicion = JSON.stringify(nombresDeLaComposicion, null, 2);

    if (typeof archivarReceta === 'function') {
        const nombreReceta = `Receta - ${nombre}`;
        archivarReceta(nombreReceta, jsonComposicion);
    }
}

function cargarComposicionDesdeReceta(nombreReceta) {
    if (typeof obtenerRecetaPorNombre !== 'function' || typeof renderizarContenidoEnCarta !== 'function') {
        return;
    }
    
    const jsonReceta = obtenerRecetaPorNombre(nombreReceta);
    if (jsonReceta) {
        try {
            const nombres = JSON.parse(jsonReceta);
            renderizarContenidoEnCarta(nombres);
        } catch (error) {
            alert('Error al cargar la composición.');
        }
    }
}

function actualizarListaRecetas() {
    if (typeof obtenerNombresRecetas !== 'function') {
        return;
    }

    const nombresRecetas = obtenerNombresRecetas();
    const valorSeleccionado = cargarRecetaSelect.value; 

    cargarRecetaSelect.innerHTML = ''; 

    const placeholderOption = document.createElement('option');
    placeholderOption.textContent = 'Cargar composición...';
    placeholderOption.value = '';
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    cargarRecetaSelect.appendChild(placeholderOption);

    nombresRecetas.forEach(nombre => {
        const option = document.createElement('option');
        option.textContent = nombre;
        option.value = nombre;
        cargarRecetaSelect.appendChild(option);
    });

    cargarRecetaSelect.value = valorSeleccionado;
}


    // --- CREACIÓN DE MÓDULOS ---

    function createModule(type, container, afterElement) {
        switch (type) {
            case 'text':
                const textContent = `<div contenteditable="true" placeholder="Escribe algo aquí..." class="prose max-w-none w-full focus:outline-none min-h-[80px]"></div>`;
                return buildModuleShell(textContent, container, afterElement);
            case 'image':
                const placeholderId = `e-placeholder-${Date.now()}`;
                const imageContent = `
                    <div id="${placeholderId}" class="w-full h-48 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-500 border-2 border-dashed cursor-pointer hover:bg-gray-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
                        <span>Haz clic para subir una imagen</span>
                    </div>`;
                const imageModule = buildModuleShell(imageContent, container, afterElement);
                imageModule.querySelector(`#${placeholderId}`).addEventListener('click', () => {
                    activeImagePlaceholder = imageModule.querySelector(`#${placeholderId}`);
                    imageUploadInput.click();
                });
                return imageModule;
            case 'div':
                return createDivContainer(container, afterElement);
        }
    }
    
    function buildModuleShell(contentHTML, container, afterElement) {
        const moduleWrapper = document.createElement('div');
        moduleWrapper.className = 'e-module group bg-white p-4 rounded-xl shadow-sm hover:shadow-md relative transition-shadow duration-300';
        moduleWrapper.setAttribute('draggable', true);
        moduleWrapper.innerHTML = `
            <div class="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div class="e-drag-handle cursor-move bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-full shadow-md"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg></div>
                <button class="e-delete-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" y2="17"/><line x1="14" y1="11" y2="17"/></svg></button>
            </div>
            ${contentHTML}`;
        
        container.insertBefore(moduleWrapper, afterElement);
        return moduleWrapper;
    }

    function createDivContainer(container, afterElement) {
        const divModule = document.createElement('div');
        divModule.className = 'e-module group e-div-module bg-white p-4 rounded-xl shadow-sm hover:shadow-md relative border-l-4 border-purple-400';
        divModule.setAttribute('draggable', true);
        divModule.innerHTML = `
            <div class="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button class="e-collapse-btn bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-full shadow-md">
                   V
                </button>
                <div class="e-drag-handle cursor-move bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-full shadow-md"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg></div>
                <button class="e-delete-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" y2="17"/><line x1="14" y1="11" y2="17"/></svg></button>
            </div>
            <h3 contenteditable="true" placeholder="Nombre del Contenedor..." class="text-xl font-bold mb-4 focus:outline-none text-purple-800"></h3>
            <div class="e-div-content-area e-drop-container space-y-4 p-4 border-t min-h-[100px] bg-gray-50 rounded-lg">
                <!-- Nested modules go here -->
            </div>`;
        
        container.insertBefore(divModule, afterElement);
        return divModule;
    }

    // --- LÓGICA DE DRAG & DROP Y SELECCIÓN ---

    let dragHandleIsDown = false; 

    document.addEventListener('mousedown', (e) => {
        if (e.target.closest('.e-drag-handle')) {
            dragHandleIsDown = true;
        }
        
        if (e.target.closest('#e-main-area') && !e.target.closest('.e-module, .e-sidebar, header')) {
            didDragForSelection = false; // Reset flag
            isSelecting = true;
            isMultiSelectingWithKey = e.ctrlKey || e.metaKey;
            selectionBox.classList.remove('hidden');
            selectionBoxStart.x = e.clientX;
            selectionBoxStart.y = e.clientY;
            updateSelectionBox(e);
            
            if (!isMultiSelectingWithKey) {
                clearSelection();
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isSelecting) {
            if (!didDragForSelection) {
                const distanceX = Math.abs(e.clientX - selectionBoxStart.x);
                const distanceY = Math.abs(e.clientY - selectionBoxStart.y);
                if (distanceX > 5 || distanceY > 5) {
                    didDragForSelection = true;
                }
            }
            updateSelectionBox(e);
            checkSelection();
        }
    });

    document.addEventListener('mouseup', (e) => {
        dragHandleIsDown = false;
        if (isSelecting) {
            isSelecting = false;
            selectionBox.classList.add('hidden');
        }
    });

    document.addEventListener('dragstart', (e) => {
        const tool = e.target.closest('.e-tool');
        if (tool) {
            draggedItem = { type: 'tool', tool: tool.dataset.tool };
            return;
        }

        const module = e.target.closest('.e-module');
        if (module) {
            if (dragHandleIsDown) {
                draggedItem = { type: 'module', element: module };
                if (!module.classList.contains('e-selected')) {
                    clearSelection();
                    module.classList.add('e-selected');
                    updateSelectionState();
                }
                setTimeout(() => {
                    document.querySelectorAll('.e-module.e-selected').forEach(m => m.classList.add('e-dragging'));
                }, 0);
            } else {
                e.preventDefault(); 
            }
        }
    });

    document.addEventListener('dragend', () => {
        if (draggedItem && draggedItem.type === 'module') {
            document.querySelectorAll('.e-module.e-selected').forEach(m => m.classList.remove('e-dragging'));
        }
        draggedItem = null;
        dragHandleIsDown = false; 
        document.querySelectorAll('.e-drag-over-zone, .e-drag-over-zone-bottom, .e-drop-zone-active').forEach(el => {
            el.classList.remove('e-drag-over-zone', 'e-drag-over-zone-bottom', 'e-drop-zone-active');
        });
    });

    document.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        const dropContainer = e.target.closest('.e-drop-container');
        
        document.querySelectorAll('.e-drag-over-zone, .e-drag-over-zone-bottom').forEach(el => {
            el.classList.remove('e-drag-over-zone', 'e-drag-over-zone-bottom');
        });

        if (dropContainer && draggedItem) {
            const afterElement = getDragAfterElement(dropContainer, e.clientY);
            if (afterElement) {
                afterElement.classList.add('e-drag-over-zone');
            } else {
                const lastElement = dropContainer.querySelector('.e-module:last-child:not(.e-dragging)');
                if (lastElement) {
                    lastElement.classList.add('e-drag-over-zone-bottom');
                }
            }
        }
    });

    document.addEventListener('dragenter', (e) => {
        const dropContainer = e.target.closest('.e-drop-container');
        if (dropContainer && draggedItem) {
            e.preventDefault();
            dropContainer.classList.add('e-drop-zone-active');
        }
    });

    document.addEventListener('dragleave', (e) => {
        const dropContainer = e.target.closest('.e-drop-container');
        if (dropContainer) {
            dropContainer.classList.remove('e-drop-zone-active');
        }
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        let dropContainer = e.target.closest('.e-drop-container');
        let afterElement;

        if (dropContainer) {
            afterElement = getDragAfterElement(dropContainer, e.clientY);
        } else {
            dropContainer = document.getElementById('e-editor-container');
            afterElement = null; 
        }

        if (draggedItem.type === 'tool') {
            createModule(draggedItem.tool, dropContainer, afterElement);
        } else if (draggedItem.type === 'module') {
            const selectedModules = document.querySelectorAll('.e-module.e-selected');
            const fragment = document.createDocumentFragment();
            selectedModules.forEach(mod => fragment.appendChild(mod));
            dropContainer.insertBefore(fragment, afterElement);
        }
    });
    
    // --- LÓGICA DE INTERACCIÓN Y AUXILIARES ---
    
    document.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.e-delete-btn');
        const collapseBtn = e.target.closest('.e-collapse-btn');
        const module = e.target.closest('.e-module');

        if (deleteBtn) {
            if (deleteBtn.id === 'e-delete-selected-btn') {
                showDeleteModal(true);
            } else {
                moduleToDelete = deleteBtn.closest('.e-module');
                showDeleteModal(false);
            }
            return;
        }

        if (collapseBtn) {
            collapseBtn.closest('.e-div-module').classList.toggle('e-collapsed');
            return;
        }
        
        if (didDragForSelection) return;

        if (module && !e.target.closest('.e-drag-handle, [contenteditable]')) {
             if (e.ctrlKey || e.metaKey) {
                module.classList.toggle('e-selected');
            } else {
                const selected = document.querySelectorAll('.e-module.e-selected');
                if (!module.classList.contains('e-selected') || selected.length > 1) {
                    clearSelection();
                    module.classList.add('e-selected');
                }
            }
            updateSelectionState();
        } else if (!module && e.target.closest('#e-main-area')) {
            clearSelection();
        }
    });

    function showDeleteModal(isGroup) {
        const title = document.getElementById('e-delete-modal-title');
        const text = document.getElementById('e-delete-modal-text');
        if (isGroup) {
            const count = document.querySelectorAll('.e-module.e-selected').length;
            title.textContent = `Eliminar ${count} Módulos`;
            text.textContent = `¿Estás seguro de que quieres eliminar los ${count} módulos seleccionados? Esta acción no se puede deshacer.`;
        } else {
            title.textContent = 'Confirmar Eliminación';
            text.textContent = '¿Estás seguro de que quieres eliminar este módulo? Esta acción no se puede deshacer.';
        }
        deleteModal.classList.remove('hidden');
        setTimeout(() => deleteModal.querySelector('div').classList.add('scale-100'), 10);
    }

    function hideModal() {
        const modalContent = deleteModal.querySelector('div');
        modalContent.classList.remove('scale-100');
        setTimeout(() => {
            deleteModal.classList.add('hidden');
            moduleToDelete = null;
        }, 300);
    }

    cancelDeleteBtn.addEventListener('click', hideModal);

    confirmDeleteBtn.addEventListener('click', () => {
        const selected = document.querySelectorAll('.e-module.e-selected');
        if (selected.length > 0) {
            selected.forEach(mod => mod.remove());
        } else if (moduleToDelete) {
            moduleToDelete.remove();
        }
        updateSelectionState();
        hideModal();
    });

    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && activeImagePlaceholder) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = "max-w-full h-auto rounded-lg max-h-[350px]";
                img.alt = "Contenido subido por el usuario";
                activeImagePlaceholder.replaceWith(img);
                activeImagePlaceholder = null;
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    });

    function updateSelectionBox(e) {
        const x = Math.min(e.clientX, selectionBoxStart.x);
        const y = Math.min(e.clientY, selectionBoxStart.y);
        const width = Math.abs(e.clientX - selectionBoxStart.x);
        const height = Math.abs(e.clientY - selectionBoxStart.y);
        selectionBox.style.left = `${x}px`;
        selectionBox.style.top = `${y}px`;
        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
    }

    function checkSelection() {
        const boxRect = selectionBox.getBoundingClientRect();
        document.querySelectorAll('.e-module').forEach(module => {
            const moduleRect = module.getBoundingClientRect();
            if (boxRect.left < moduleRect.right && boxRect.right > moduleRect.left &&
                boxRect.top < moduleRect.bottom && boxRect.bottom > moduleRect.top) {
                module.classList.add('e-selected');
            } else if (!isMultiSelectingWithKey) {
                module.classList.remove('e-selected');
            }
        });
        updateSelectionState();
    }

    function clearSelection() {
        document.querySelectorAll('.e-module.e-selected').forEach(m => m.classList.remove('e-selected'));
        updateSelectionState();
    }
    
    function updateSelectionState() {
        const selectedCount = document.querySelectorAll('.e-module.e-selected').length;
        if (selectedCount > 1) {
            deleteSelectedBtn.classList.remove('hidden');
        } else {
            deleteSelectedBtn.classList.add('hidden');
        }
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(':scope > .e-module:not(.e-dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
 