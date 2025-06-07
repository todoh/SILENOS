// ===================================
// GESTIÓN DE LA NUEVA SECCIÓN DE ESCENAS
// ===================================

const PIXELS_PER_SECOND = 15; // 15px por cada segundo de duración de la toma

/**
 * Inicializa los listeners y la UI para la sección de escenas.
 */
function initEscenas() {
    document.getElementById('crear-escena-btn')?.addEventListener('click', crearNuevaEscena);
    document.getElementById('agregar-toma-btn')?.addEventListener('click', () => agregarToma());
    document.getElementById('escenas-dropdown')?.addEventListener('change', seleccionarEscenaDesdeDropdown);
    document.getElementById('escena-nombre-input')?.addEventListener('input', cambiarNombreEscena);
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
        tomas: [] // Se inicializa con un array de tomas vacío
    };
    storyScenes.push(nuevaEscena);
    activeSceneId = newId;
    renderEscenasUI();
}

/**
 * Agrega una nueva toma a la escena activa.
 * @param {number} duracion - La duración de la toma en segundos.
 */
function agregarToma(duracion = 8) {
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
        escenaActiva.tomas.push(nuevaToma);
        renderEscenasUI(); // Re-renderizar para mostrar la nueva toma
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
        // Actualiza el texto en el dropdown en tiempo real
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
            escenaActiva.tomas.forEach(toma => {
                const tomaContainer = document.createElement('div');
                tomaContainer.className = 'toma-div';
                tomaContainer.style.width = `${toma.duracion * PIXELS_PER_SECOND}px`;
                tomaContainer.dataset.tomaId = toma.id;

                // 1. Image Area
                const imagenArea = document.createElement('div');
                imagenArea.className = 'toma-imagen-area';

                const imagenPreview = document.createElement('img');
                imagenPreview.className = 'toma-imagen-preview';
                if (toma.imagen) {
                    imagenPreview.src = toma.imagen;
                    imagenPreview.style.display = 'block';
                } else {
                    imagenPreview.style.display = 'none';
                }
                
                const uploadLabel = document.createElement('label');
                uploadLabel.className = 'toma-upload-btn';
                uploadLabel.textContent = '📷';
                
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                fileInput.id = `fileInput-${toma.id}`;
                uploadLabel.htmlFor = fileInput.id;
                
                fileInput.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        // Usamos la función global fileToBase64
                        const base64Data = await fileToBase64(file); 
                        toma.imagen = base64Data;
                        imagenPreview.src = base64Data;
                        imagenPreview.style.display = 'block';
                    }
                };
                
                imagenArea.appendChild(imagenPreview);
                imagenArea.appendChild(uploadLabel);
                imagenArea.appendChild(fileInput);

                // 2. Guion Conceptual Textarea
                const conceptualTextarea = document.createElement('textarea');
                conceptualTextarea.className = 'toma-textarea';
                conceptualTextarea.placeholder = 'Guion Conceptual...';
                conceptualTextarea.value = toma.guionConceptual || '';
                conceptualTextarea.oninput = (e) => {
                    toma.guionConceptual = e.target.value;
                };

                // 3. Guion Tecnico Textarea
                const tecnicoTextarea = document.createElement('textarea');
                tecnicoTextarea.className = 'toma-textarea';
                tecnicoTextarea.placeholder = 'Guion Técnico...';
                tecnicoTextarea.value = toma.guionTecnico || '';
                tecnicoTextarea.oninput = (e) => {
                    toma.guionTecnico = e.target.value;
                };

                // 4. Guion Artistico Textarea
                const artisticoTextarea = document.createElement('textarea');
                artisticoTextarea.className = 'toma-textarea';
                artisticoTextarea.placeholder = 'Guion Artístico...';
                artisticoTextarea.value = toma.guionArtistico || '';
                artisticoTextarea.oninput = (e) => {
                    toma.guionArtistico = e.target.value;
                };

                tomaContainer.appendChild(imagenArea);
                tomaContainer.appendChild(conceptualTextarea);
                tomaContainer.appendChild(tecnicoTextarea);
                tomaContainer.appendChild(artisticoTextarea);

                timelineDiv.appendChild(tomaContainer);
            });
        } else {
             timelineDiv.innerHTML = '<p class="mensaje-placeholder">Esta escena no tiene tomas. ¡Añade una!</p>';
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
