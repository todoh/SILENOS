// ===================================
// GESTIÓN DE LA NUEVA SECCIÓN DE ESCENAS
// ===================================

let draggedTomaId = null; // Variable global para el ID de la toma arrastrada

/**
 * Inicializa los listeners y la UI para la sección de escenas.
 */
function initEscenas() {
    document.getElementById('crear-escena-btn')?.addEventListener('click', crearNuevaEscena2);
    document.getElementById('agregar-toma-btn')?.addEventListener('click', () => agregarToma());
    document.getElementById('escenas-dropdown')?.addEventListener('change', seleccionarEscenaDesdeDropdown);
    document.getElementById('escena-nombre-input')?.addEventListener('input', cambiarNombreEscena);
    document.getElementById('generargraficos')?.addEventListener('click', generarGraficosSecuencialmente);
    
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
function crearNuevaEscena2() {
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
                            renderEscenasUI();
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

                const videoBtn = document.createElement('button');
                videoBtn.className = 'toma-video-btn';
                videoBtn.innerHTML = '🎬';
                videoBtn.title = 'Generar Escena';
                
                videoBtn.onclick = () => {
                    if (typeof iniciarGeneracionDeToma === 'function') {
                        iniciarGeneracionDeToma(toma, tomaContainer);
                    } else {
                        alert('Error: La función principal para generar tomas (iniciarGeneracionDeToma) no está disponible.');
                    }
                };

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
             timelineDiv.innerHTML = '<p class="mensaje-placeholder"> </p>';
        }

    } else {
        activeSceneId = null;
        nombreInput.value = 'Crea o selecciona una escena';
        nombreInput.disabled = true;
        document.getElementById('agregar-toma-btn').disabled = true;
        timelineDiv.innerHTML = '<p class="mensaje-placeholder"> </p>';
    }

    timelineDiv.scrollLeft = scrollLeft;
}


/**
 * Genera secuencialmente las imágenes para todas las tomas de la escena activa.
 */
async function generarGraficosSecuencialmente() {
    const boton = document.getElementById('generargraficos');
    if (!boton || boton.disabled) return;

    const originalButtonText = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Generando...';

    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);

    if (!escenaActiva || !escenaActiva.tomas || escenaActiva.tomas.length === 0) {
        alert("No hay tomas en la escena activa para generar gráficos.");
        boton.disabled = false;
        boton.textContent = originalButtonText;
        return;
    }

    const style = document.createElement('style');
    style.id = 'toma-procesando-style-secuencial';
    style.textContent = `
        .toma-procesando-secuencial .toma-imagen-area {
            outline: 3px solid #0d6efd;
            box-shadow: 0 0 15px rgba(13, 110, 253, 0.7);
            transition: outline 0.3s ease, box-shadow 0.3s ease;
        }
    `;
    document.head.appendChild(style);

    for (const toma of escenaActiva.tomas) {
        const tomaContainer = document.querySelector(`.toma-card[data-toma-id="${toma.id}"]`);
        if (!tomaContainer) continue;

        const prompt = toma.guionTecnico;
        if (!prompt || !prompt.trim() || toma.imagen) {
            console.log(`Saltando toma ${toma.id} por falta de prompt o por tener ya una imagen.`);
            continue;
        }
        
        tomaContainer.classList.add('toma-procesando-secuencial');
        tomaContainer.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

        const imagenArea = tomaContainer.querySelector('.toma-imagen-area');
        const statusDiv = mostrarEstado(imagenArea, 'Iniciando...');
        const statusUpdater = (mensaje, esError = false) => actualizarEstado(statusDiv, mensaje, esError);

        try {
            if (typeof generarYComponerToma !== 'function') {
                throw new Error('La función núcleo (generarYComponerToma) no está disponible.');
            }
            
            const imageUrl = await generarYComponerToma(prompt, statusUpdater);
            
            toma.imagen = imageUrl;
            const imagenPreview = tomaContainer.querySelector('.toma-imagen-preview');
            const placeholder = tomaContainer.querySelector('.imagen-placeholder');
            
            if (imagenPreview) {
                imagenPreview.src = imageUrl;
                imagenPreview.style.display = 'block';
            }
            if (placeholder) {
                placeholder.style.display = 'none';
            }

        } catch (error) {
            console.error(`Error al componer la escena para la toma ${toma.id}:`, error);
            statusUpdater(`Error: ${error.message}`, true);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } finally {
            if (statusDiv && statusDiv.parentElement) {
               statusDiv.remove();
            }
            tomaContainer.classList.remove('toma-procesando-secuencial');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    document.getElementById('toma-procesando-style-secuencial')?.remove();
    boton.disabled = false;
    boton.textContent = originalButtonText;
    alert("Generación de gráficos de la escena completada.");
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

/**
 * Función de ejemplo para buscar una imagen en tu directorio "datos".
 * Debes implementar la lógica real según cómo gestiones tus archivos.
 * @param {string} prompt El texto a buscar.
 * @returns {Promise<string|null>} La URL de la imagen si se encuentra, o null.
 */


async function buscarImagenEnDatos(prompt) {
    // Esta es una implementación simulada.
    // En un caso real, aquí harías una petición a tu servidor o
    // buscarías en un índice de archivos locales.
    console.log(`Buscando en 'datos' una imagen para el prompt: "${prompt}"`);
    
    // Ejemplo: si tienes un objeto global con los datos cargados
    if (window.datosGuardados && window.datosGuardados[prompt]) {
        return window.datosGuardados[prompt].url;
    }
    
    // Simula una búsqueda que no encuentra nada
    return null;
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