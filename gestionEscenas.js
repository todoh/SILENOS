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
    
    const timelineDiv = document.getElementById('tomas-timeline');
    if (timelineDiv) {
        timelineDiv.addEventListener('dragover', handleDragOverTimeline);
        timelineDiv.addEventListener('drop', handleDropOnTimeline);
        timelineDiv.addEventListener('dragleave', handleDragLeaveTimeline);
    }

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
 */
function eliminarToma(tomaId) {
    if (!activeSceneId) return;
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (escenaActiva) {
        const tomaIndex = escenaActiva.tomas.findIndex(t => t.id === tomaId);
        if (tomaIndex > -1) {
            if (confirm("¿Seguro que quieres eliminar esta toma?")) {
                escenaActiva.tomas.splice(tomaIndex, 1);
                renderEscenasUI();
            }
        }
    }
}


/**
 * Actualiza la escena activa cuando se selecciona una del dropdown.
 */
function seleccionarEscenaDesdeDropdown(event) {
    activeSceneId = event.target.value;
    renderEscenasUI();
}

/**
 * Cambia el nombre de la escena activa a medida que el usuario escribe en el input.
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

                tomaContainer.addEventListener('dragstart', handleDragStart);
                tomaContainer.addEventListener('dragend', handleDragEnd);
                tomaContainer.addEventListener('dragover', handleDragOver);
                tomaContainer.addEventListener('dragleave', handleDragLeave);
                tomaContainer.addEventListener('drop', handleDrop);

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

                const imagenArea = document.createElement('div');
                imagenArea.className = 'toma-imagen-area';
                const imagenPreview = document.createElement('img');
                imagenPreview.className = 'toma-imagen-preview';
                if (toma.imagen) {
                    imagenPreview.src = toma.imagen;
                } else {
                    // Placeholder o estilo para cuando no hay imagen
                    imagenPreview.style.display = 'none'; 
                    imagenArea.innerHTML += '<span class="imagen-placeholder">🖼️</span>';
                }

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
                            renderEscenasUI(); // Re-render para mostrar la nueva imagen
                        } catch (error) {
                            console.error("Error al procesar la imagen:", error);
                        }
                    }
                };
                imagenArea.appendChild(imagenPreview);
                imagenArea.appendChild(uploadLabel);
                imagenArea.appendChild(fileInput);

                const textosArea = document.createElement('div');
                textosArea.className = 'toma-textos-area';
                const textoToma = document.createElement('textarea');
                textoToma.placeholder = 'Guion Conceptual...';
                textoToma.value = toma.guionConceptual || '';
                textoToma.oninput = (e) => { toma.guionConceptual = e.target.value; };
                
                const promptTomaContainer = document.createElement('div');
                promptTomaContainer.className = 'toma-prompt-container';
                const promptToma = document.createElement('textarea');
                promptToma.placeholder = 'Guion Técnico (Prompt)...';
                promptToma.value = toma.guionTecnico || '';
                promptToma.oninput = (e) => { toma.guionTecnico = e.target.value; };
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'toma-copy-btn';
                copyBtn.innerHTML = '&#128203;';
                copyBtn.title = 'Copiar prompt';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(promptToma.value).then(() => {
                        copyBtn.textContent = '✔️';
                        setTimeout(() => { copyBtn.innerHTML = '&#128203;'; }, 1500);
                    });
                };

                // --- MODIFICADO ---
                // El botón ahora llama a la nueva función para componer escenas 3D.
                const videoBtn = document.createElement('button');
                videoBtn.className = 'toma-video-btn';
                videoBtn.innerHTML = '🎬'; // Icono de claqueta
                videoBtn.title = 'Componer Escena 3D para esta Toma';
                videoBtn.onclick = async () => {
                    const prompt = toma.guionTecnico;
                    if (!prompt || !prompt.trim()) {
                        alert('El Guion Técnico (Prompt) de la toma está vacío. Escribe una descripción para poder generar la imagen.');
                        return;
                    }
                    
                    if (typeof generarEscenaCompuesta !== 'function') {
                        alert('Error: La función para componer escenas no está disponible. Asegúrate de que compositor-escenas.js está cargado.');
                        return;
                    }

                    const statusDiv = document.createElement('div');
                    statusDiv.className = 'toma-loading-overlay';
                    statusDiv.innerHTML = '<div class="loading-spinner-toma"></div><p>Iniciando composición...</p>';
                    imagenArea.appendChild(statusDiv);
                    
                    try {
                        // Llamamos a la nueva función del compositor
                        const imageUrl = await generarEscenaCompuesta(prompt, statusDiv);
                        
                        // Guardamos y mostramos la imagen
                        toma.imagen = imageUrl;
                        imagenPreview.src = imageUrl;
                        imagenPreview.style.display = 'block';

                        const placeholder = imagenArea.querySelector('.imagen-placeholder');
                        if(placeholder) placeholder.style.display = 'none';

                    } catch (error) {
                        console.error("Error al componer la escena para la toma:", error);
                        statusDiv.innerHTML = `<p style="color: red; font-size: 0.8em;">Error</p>`;
                        setTimeout(() => statusDiv.remove(), 5000);
                    } finally {
                        if(statusDiv.parentElement) {
                           statusDiv.remove();
                        }
                    }
                };
                // --- FIN DE LA MODIFICACIÓN ---

                promptTomaContainer.appendChild(promptToma);
                promptTomaContainer.appendChild(copyBtn);
                promptTomaContainer.appendChild(videoBtn);
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

// --- FUNCIONES DE DRAG AND DROP (sin cambios) ---
function handleDragStart(e) {
    draggedTomaId = e.target.closest('.toma-card').dataset.tomaId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTomaId);
    setTimeout(() => {
        e.target.closest('.toma-card').classList.add('toma-dragging');
    }, 0);
}
function handleDragEnd(e) {
    const draggedElement = document.querySelector('.toma-dragging');
    if (draggedElement) {
        draggedElement.classList.remove('toma-dragging');
    }
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
    if (!isOverCard) {
        removeDropIndicator();
        const indicator = createDropIndicator();
        document.getElementById('tomas-timeline').appendChild(indicator);
    }
}
function handleDropOnTimeline(e){
    e.preventDefault();
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

// --- Función de utilidad para convertir File a Base64 ---
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
window.generarEscenaCompuesta = generarEscenaCompuesta;