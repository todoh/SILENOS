// ===================================
// GESTIÓN DE LA NUEVA SECCIÓN DE ESCENAS
// ===================================

let draggedTomaId = null; // Variable global para el ID de la toma arrastrada

/**
 * Inicializa los listeners y la UI para la sección de escenas.
 */
function initEscenas() {
    document.getElementById('crear-escena-btn')?.addEventListener('click', crearNuevaEscena);
    document.getElementById('agregar-toma-btn')?.addEventListener('click', () => agregarToma());
    document.getElementById('escenas-dropdown')?.addEventListener('change', seleccionarEscenaDesdeDropdown);
    document.getElementById('escena-nombre-input')?.addEventListener('input', cambiarNombreEscena);
    
    // Listeners para Drag and Drop en el contenedor principal
    const timelineDiv = document.getElementById('tomas-timeline');
    timelineDiv.addEventListener('dragover', handleDragOverTimeline);
    timelineDiv.addEventListener('drop', handleDropOnTimeline);
    timelineDiv.addEventListener('dragleave', handleDragLeaveTimeline);

    renderEscenasUI();
}

/**
 * Crea una nueva escena, la añade al array global y refresca la UI.
 */
function crearNuevaEscena() {
    const newId = 'escena_' + Date.now();
    const nuevaEscena = {
        id: newId,
        nombre: "Nueva Escena " + (storyScenes.length + 1),
        tomas: [] 
    };
    storyScenes.push(nuevaEscena);
    activeSceneId = newId;
    renderEscenasUI();
}

/**
 * Agrega una nueva toma a la escena activa, opcionalmente en un índice específico.
 * @param {number} duracion - La duración de la toma en segundos.
 * @param {number} [index=-1] - El índice después del cual insertar la nueva toma. Si es -1, se añade al final.
 */
function agregarToma(duracion = 8, index = -1) {
    if (!activeSceneId) {
        alert("Primero selecciona o crea una escena.");
        return;
    }
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (escenaActiva) {
        const nuevaToma = {
            id: 'toma_' + Date.now(),
            duracion: duracion,
            imagen: "",
            guionConceptual: "",
            guionTecnico: "",
            guionArtistico: ""
        };

        if (index > -1 && index < escenaActiva.tomas.length) {
            escenaActiva.tomas.splice(index + 1, 0, nuevaToma);
        } else {
            escenaActiva.tomas.push(nuevaToma);
        }
        renderEscenasUI();
    }
}

/**
 * Elimina una toma de la escena activa.
 * @param {string} tomaId - El ID de la toma a eliminar.
 */
function eliminarToma(tomaId) {
    if (!activeSceneId) return;
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (escenaActiva) {
        const tomaIndex = escenaActiva.tomas.findIndex(t => t.id === tomaId);
        if (tomaIndex > -1) {
            escenaActiva.tomas.splice(tomaIndex, 1);
            renderEscenasUI();
        }
    }
}


/**
 * Actualiza la escena activa cuando se selecciona una del dropdown.
 * @param {Event} event - El evento 'change' del select.
 */
function seleccionarEscenaDesdeDropdown(event) {
    activeSceneId = event.target.value;
    renderEscenasUI();
}

/**
 * Cambia el nombre de la escena activa a medida que el usuario escribe en el input.
 * @param {Event} event - El evento 'input' del campo de texto.
 */
function cambiarNombreEscena(event) {
    if (!activeSceneId) return;
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (escenaActiva) {
        escenaActiva.nombre = event.target.value;
        const dropdown = document.getElementById('escenas-dropdown');
        const optionToUpdate = dropdown.querySelector(`option[value="${activeSceneId}"]`);
        if (optionToUpdate) {
            optionToUpdate.textContent = escenaActiva.nombre;
        }
    }
}

/**
 * Dibuja y actualiza la interfaz de usuario de la sección de escenas.
 */
function renderEscenasUI() {
    const dropdown = document.getElementById('escenas-dropdown');
    const nombreInput = document.getElementById('escena-nombre-input');
    const timelineDiv = document.getElementById('tomas-timeline');

    if (!dropdown || !nombreInput || !timelineDiv) return;

    const scrollLeft = timelineDiv.scrollLeft;
    dropdown.innerHTML = '';
    storyScenes.forEach(escena => {
        const option = document.createElement('option');
        option.value = escena.id;
        option.textContent = escena.nombre;
        dropdown.appendChild(option);
    });

    timelineDiv.innerHTML = '';

    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);

    if (escenaActiva) {
        dropdown.value = activeSceneId;
        nombreInput.value = escenaActiva.nombre;
        nombreInput.disabled = false;
        document.getElementById('agregar-toma-btn').disabled = false;

        if (escenaActiva.tomas && escenaActiva.tomas.length > 0) {
            escenaActiva.tomas.forEach((toma, index) => {
                const tomaContainer = document.createElement('div');
                tomaContainer.className = 'toma-card';
                tomaContainer.dataset.tomaId = toma.id;
                tomaContainer.draggable = true;

                // --- Eventos de Drag and Drop ---
                tomaContainer.addEventListener('dragstart', handleDragStart);
                tomaContainer.addEventListener('dragend', handleDragEnd);
                tomaContainer.addEventListener('dragover', handleDragOver);
                tomaContainer.addEventListener('dragleave', handleDragLeave);
                tomaContainer.addEventListener('drop', handleDrop);


                // --- Controles (arriba) ---
                const controlesDiv = document.createElement('div');
                controlesDiv.className = 'toma-controles';

                const addBtn = document.createElement('button');
                addBtn.className = 'toma-btn';
                addBtn.innerHTML = '&#10133;';
                addBtn.title = 'Crear toma a la derecha';
                addBtn.onclick = () => agregarToma(8, index);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'toma-btn';
                deleteBtn.innerHTML = '&#10006;';
                deleteBtn.title = 'Eliminar toma';
                deleteBtn.onclick = () => eliminarToma(toma.id);

                controlesDiv.appendChild(addBtn);
                controlesDiv.appendChild(deleteBtn);

                // --- Área de Imagen (en medio) ---
                const imagenArea = document.createElement('div');
                imagenArea.className = 'toma-imagen-area';
                const imagenPreview = document.createElement('img');
                imagenPreview.className = 'toma-imagen-preview';
                if (toma.imagen) imagenPreview.src = toma.imagen;
                const uploadLabel = document.createElement('label');
                uploadLabel.className = 'toma-upload-btn';
                uploadLabel.innerHTML = '&#128247;';
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                fileInput.id = `fileInput-${toma.id}`;
                uploadLabel.htmlFor = fileInput.id;
                fileInput.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        try {
                            toma.imagen = await fileToBase64(file);
                            imagenPreview.src = toma.imagen;
                        } catch (error) {
                            console.error("Error al procesar la imagen:", error);
                        }
                    }
                };
                imagenArea.appendChild(imagenPreview);
                imagenArea.appendChild(uploadLabel);
                imagenArea.appendChild(fileInput);

                // --- Área de Textos (abajo) ---
                const textosArea = document.createElement('div');
                textosArea.className = 'toma-textos-area';

                const textoToma = document.createElement('textarea');
                textoToma.placeholder = 'Texto de la toma...';
                textoToma.value = toma.guionConceptual || '';
                textoToma.oninput = (e) => { toma.guionConceptual = e.target.value; };
                
                const promptTomaContainer = document.createElement('div');
                promptTomaContainer.className = 'toma-prompt-container';
                const promptToma = document.createElement('textarea');
                promptToma.placeholder = 'Prompt de la toma...';
                promptToma.value = toma.guionTecnico || '';
                promptToma.oninput = (e) => { toma.guionTecnico = e.target.value; };
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'toma-copy-btn';
                copyBtn.innerHTML = '&#128203;';
                copyBtn.title = 'Copiar prompt';
                copyBtn.onclick = () => {
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = promptToma.value;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextArea);
                    copyBtn.textContent = '✔️';
                    setTimeout(() => { copyBtn.innerHTML = '&#128203;'; }, 1500);
                };

                promptTomaContainer.appendChild(promptToma);
                promptTomaContainer.appendChild(copyBtn);
                textosArea.appendChild(textoToma);
                textosArea.appendChild(promptTomaContainer);

                tomaContainer.appendChild(controlesDiv);
                tomaContainer.appendChild(imagenArea);
                tomaContainer.appendChild(textosArea);
                timelineDiv.appendChild(tomaContainer);
            });
        } else {
             timelineDiv.innerHTML = '<p class="mensaje-placeholder">Esta escena no tiene tomas. ¡Añade una con el botón de la barra superior!</p>';
        }

    } else {
        activeSceneId = null;
        nombreInput.value = 'Crea o selecciona una escena';
        nombreInput.disabled = true;
        document.getElementById('agregar-toma-btn').disabled = true;
        timelineDiv.innerHTML = '<p class="mensaje-placeholder">No hay escenas. Crea una para empezar.</p>';
    }

    timelineDiv.scrollLeft = scrollLeft;
}

// --- FUNCIONES DE DRAG AND DROP ---

function handleDragStart(e) {
    draggedTomaId = e.target.closest('.toma-card').dataset.tomaId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTomaId);
    setTimeout(() => {
        e.target.closest('.toma-card').classList.add('toma-dragging');
    }, 0);
}

function handleDragEnd(e) {
    e.target.closest('.toma-card').classList.remove('toma-dragging');
    draggedTomaId = null;
    removeDropIndicator();
}

function handleDragOver(e) {
    e.preventDefault();
    const targetCard = e.target.closest('.toma-card');
    if (targetCard && targetCard.dataset.tomaId !== draggedTomaId) {
        const timeline = document.getElementById('tomas-timeline');
        const rect = targetCard.getBoundingClientRect();
        const offset = e.clientX - rect.left;

        removeDropIndicator();
        const indicator = createDropIndicator();

        if (offset < rect.width / 2) {
            timeline.insertBefore(indicator, targetCard);
        } else {
            timeline.insertBefore(indicator, targetCard.nextSibling);
        }
    }
}

function handleDragLeave(e) {
    // Solo removemos el indicador si salimos de un elemento que no sea una tarjeta o sus hijos
    if (!e.currentTarget.contains(e.relatedTarget)) {
         removeDropIndicator();
    }
}

function handleDrop(e) {
    e.preventDefault();
    removeDropIndicator();
    const targetCard = e.target.closest('.toma-card');
    if (!draggedTomaId || !targetCard || targetCard.dataset.tomaId === draggedTomaId) {
        return;
    }

    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (!escenaActiva) return;

    const fromIndex = escenaActiva.tomas.findIndex(t => t.id === draggedTomaId);
    let toIndex = escenaActiva.tomas.findIndex(t => t.id === targetCard.dataset.tomaId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [draggedItem] = escenaActiva.tomas.splice(fromIndex, 1);
    
    // Ajuste del índice si el elemento se mueve hacia adelante en la lista
    if (fromIndex < toIndex) toIndex--;

    const rect = targetCard.getBoundingClientRect();
    const offset = e.clientX - rect.left;
    const insertAtIndex = (offset < rect.width / 2) ? toIndex : toIndex + 1;
    
    escenaActiva.tomas.splice(insertAtIndex, 0, draggedItem);
    renderEscenasUI();
}


function handleDragOverTimeline(e) {
    e.preventDefault();
    const isOverCard = e.target.closest('.toma-card');
    // Si estamos sobre el timeline pero no sobre una tarjeta, mostramos indicador al final
    if (!isOverCard) {
        removeDropIndicator();
        const indicator = createDropIndicator();
        document.getElementById('tomas-timeline').appendChild(indicator);
    }
}

function handleDropOnTimeline(e){
    e.preventDefault();
    // Solo actuar si el drop es directamente en el timeline
     if (e.target.id !== 'tomas-timeline' || !draggedTomaId) {
         removeDropIndicator();
         return;
     }

    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (!escenaActiva) return;
    
    const fromIndex = escenaActiva.tomas.findIndex(t => t.id === draggedTomaId);
    if (fromIndex === -1) return;

    const [draggedItem] = escenaActiva.tomas.splice(fromIndex, 1);
    escenaActiva.tomas.push(draggedItem);
    
    removeDropIndicator();
    renderEscenasUI();
}

function handleDragLeaveTimeline(e) {
    if (e.target.id === 'tomas-timeline' && !e.relatedTarget.closest('#tomas-timeline')) {
        removeDropIndicator();
    }
}

// --- Funciones de utilidad para los indicadores ---
function createDropIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'toma-drop-indicator';
    return indicator;
}

function removeDropIndicator() {
    const existingIndicator = document.querySelector('.toma-drop-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
}
