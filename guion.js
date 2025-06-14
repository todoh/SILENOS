// ===================================
// GESTIÓN DEL GUIÓN LITERARIO
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    const guionBtnLocal = document.getElementById('selector-guion-btn-local');
    const guionPopupLocal = document.getElementById('lista-guiones-popup-local');

    if (guionBtnLocal && guionPopupLocal) {
        // Event listener to show/hide the popup
        guionBtnLocal.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = guionPopupLocal.style.display === 'block';
            if (isVisible) {
                guionPopupLocal.style.display = 'none';
            } else {
                renderizarGuionesEnPopupLocal();
                guionPopupLocal.style.display = 'block';
            }
        });

        // Event listener to close the popup when clicking outside
        document.addEventListener('click', (e) => {
            if (guionPopupLocal.style.display === 'block' && !guionPopupLocal.contains(e.target) && e.target !== guionBtnLocal) {
                guionPopupLocal.style.display = 'none';
            }
        });
    }
});


function abrirGuion() {
    cerrartodo();
    document.getElementById('guion-literario').style.display = 'flex';
    
    // If there was an active chapter, re-render it.
    if (indiceCapituloActivo !== -1) {
        mostrarCapituloSeleccionado(indiceCapituloActivo);
    } else {
       
    }
}

function agregarCapituloYMostrar() {
    const nuevoCapitulo = { 
        titulo: "Nuevo Capítulo " + String(guionLiterarioData.length + 1).padStart(3, '0'), 
        contenido: "",
        generadoPorIA: false 
    };
    guionLiterarioData.push(nuevoCapitulo);
    guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));
    indiceCapituloActivo = guionLiterarioData.findIndex(cap => cap === nuevoCapitulo);
    
    mostrarCapituloSeleccionado(indiceCapituloActivo);
    
    // Update the dropdown in the 'Momentos' section
    if (typeof cargarGuionesEnDropdown === 'function') {
        cargarGuionesEnDropdown();
    } else {
        console.error("Error al agregar capítulo: La función cargarGuionesEnDropdown no está definida.");
    }
}

/**
 * Checks if frames have already been generated in the "Capítulos" section for a specific script.
 * @param {string} tituloGuion The title of the script to check.
 * @returns {boolean} True if scenes exist for that script and at least one has frames.
 */
function hanSidoFramesGenerados(tituloGuion) {
    if (!tituloGuion) return false;
    const escenasDelGuion = Object.keys(escenas)
        .filter(id => id.startsWith(tituloGuion));

    if (escenasDelGuion.length === 0) {
        return false;
    }

    const hayFrames = escenasDelGuion.some(id => escenas[id] && escenas[id].frames && escenas[id].frames.length > 0);

    return hayFrames;
}


function mostrarCapituloSeleccionado(index) {
    indiceCapituloActivo = index;
    
    const toolbar = document.getElementById('guion-toolbar');
    const contenidoDiv = document.getElementById('contenido-capitulo-activo');
    
    // Clear previous dynamic buttons from the toolbar
    toolbar.querySelectorAll('.generar-tomas-btn, .generar-frames-btn').forEach(btn => btn.remove());
    
    contenidoDiv.innerHTML = ''; 

    if (index < 0 || index >= guionLiterarioData.length) {
        contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo con el botón ☰ o crea uno nuevo.</p>';
        return;
    }

    const capitulo = guionLiterarioData[index];

    const inputTitulo = document.createElement('input');
    inputTitulo.type = 'text';
    inputTitulo.placeholder = 'Título del Capítulo';
    inputTitulo.value = capitulo.titulo;

    if (capitulo.generadoPorIA) {
        inputTitulo.readOnly = true;
        inputTitulo.classList.add('input-no-editable');
        inputTitulo.title = "Este título fue generado por la IA y no se puede editar.";
    } else {
        inputTitulo.oninput = function() {
            if (indiceCapituloActivo !== -1) {
                const tituloAnterior = guionLiterarioData[indiceCapituloActivo].titulo;
                guionLiterarioData[indiceCapituloActivo].titulo = this.value;

                // Update dropdown in 'Momentos' if it exists
                if (typeof cargarGuionesEnDropdown === 'function') {
                    cargarGuionesEnDropdown();
                }
            }
        };
        inputTitulo.onchange = function() {
             // Re-sort and re-render the popup list after title change is final
            guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));
            indiceCapituloActivo = guionLiterarioData.findIndex(cap => cap.titulo === this.value);
        };
    }
    
    contenidoDiv.appendChild(inputTitulo);

    // Add buttons to the toolbar instead of the content area
    if (capitulo.generadoPorIA) {
        if (hanSidoFramesGenerados(capitulo.titulo)) {
            const botonGenerarTomas = document.createElement('button');
            botonGenerarTomas.textContent = 'Generar Tomas Visuales';
            botonGenerarTomas.className = 'pro generar-tomas-btn';
            botonGenerarTomas.title = 'Genera el storyboard visual a partir de los frames ya creados.';
            botonGenerarTomas.onclick = () => {
                if (typeof iniciarGeneracionDeTomas === 'function') {
                    iniciarGeneracionDeTomas(indiceCapituloActivo);
                } else {
                    alert("Error: La función para generar tomas no está disponible.");
                }
            };
            toolbar.appendChild(botonGenerarTomas);
        } else {
            const botonGenerarFrames = document.createElement('button');
            botonGenerarFrames.textContent = 'Generar Frames de la Historia';
            botonGenerarFrames.className = 'pro generar-frames-btn';
            botonGenerarFrames.title = 'Rellena los capítulos con los frames detallados por la IA.';
            botonGenerarFrames.onclick = () => {
                if (typeof desarrollarFramesDesdeGeminimente === 'function') {
                    if (!ultimaHistoriaGeneradaJson || !ultimaHistoriaGeneradaJson.historia || ultimaHistoriaGeneradaJson.historia.length === 0) {
                        alert("No se pueden generar los frames. El plan de la historia de la IA no está cargado. Por favor, vuelve a la pestaña 'IA' y genera la historia primero.");
                        return;
                    }
                    alert(`Se iniciará la generación de frames para "${capitulo.titulo}". Serás redirigido a la sección 'Capítulos' para ver el progreso.`);
                    
                    desarrollarFramesDesdeGeminimente(capitulo.titulo);

                    cerrartodo();
                    abrir('capitulosh');
                } else {
                    alert("Error: La función para desarrollar frames ('desarrollarFramesDesdeGeminimente') no está disponible.");
                }
            };
            toolbar.appendChild(botonGenerarFrames);
        }
    }

    const editorContenido = document.createElement('div');
    editorContenido.className = 'contenido-guion-editor';
    editorContenido.contentEditable = true;
    editorContenido.innerHTML = capitulo.contenido; 
    editorContenido.oninput = function() {
        if (indiceCapituloActivo !== -1) {
            guionLiterarioData[indiceCapituloActivo].contenido = this.innerHTML;
        }
    };

    contenidoDiv.appendChild(editorContenido);
}

function eliminarCapitulo(indexToDelete) {
    if (indexToDelete < 0 || indexToDelete >= guionLiterarioData.length) return;

    if (confirm("¿Estás seguro de que quieres eliminar este capítulo?")) {
        const fueActivo = indiceCapituloActivo === indexToDelete;
        
        guionLiterarioData.splice(indexToDelete, 1);

        if (fueActivo) {
            indiceCapituloActivo = -1;
            const toolbar = document.getElementById('guion-toolbar');
            toolbar.querySelectorAll('.generar-tomas-btn, .generar-frames-btn').forEach(btn => btn.remove());
            const contenidoDiv = document.getElementById('contenido-capitulo-activo');
            contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo con el botón ☰ o crea uno nuevo.</p>';
        } else if (indiceCapituloActivo > indexToDelete) {
            indiceCapituloActivo--;
        }
        
        if (typeof cargarGuionesEnDropdown === 'function') {
            cargarGuionesEnDropdown();
        }
    }
}

/**
 * Renders the list of scripts into the local popup.
 */
function renderizarGuionesEnPopupLocal() {
    const contenidoPopup = document.getElementById('lista-guiones-popup-local');
    if (!contenidoPopup) return;

    contenidoPopup.innerHTML = ''; // Clear previous list

    guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));

    if (guionLiterarioData.length > 0) {
        guionLiterarioData.forEach((guion, index) => {
            const itemContainer = document.createElement('div');
            itemContainer.style.display = 'flex';
            itemContainer.style.alignItems = 'center';
            
            const item = document.createElement('button');
            item.className = 'guion-popup-item-local';
            item.textContent = guion.titulo || `Capítulo sin título ${index + 1}`;
            item.style.flexGrow = '1';
            item.onclick = () => {
                mostrarCapituloSeleccionado(index);
                document.getElementById('lista-guiones-popup-local').style.display = 'none'; // Close popup on selection
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X';
            deleteBtn.className = 'eliminar-capitulo-btn-indice'; // Reuse class for styling
            deleteBtn.style.marginLeft = '10px';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                eliminarCapitulo(index);
                renderizarGuionesEnPopupLocal(); // Re-render popup after deletion
            };
            
            itemContainer.appendChild(item);
            itemContainer.appendChild(deleteBtn);
            contenidoPopup.appendChild(itemContainer);
        });
    } else {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = 'No hay guiones. Crea uno con "Agregar Capítulo".';
        emptyMsg.style.padding = '10px 15px';
        emptyMsg.style.color = '#888';
        contenidoPopup.appendChild(emptyMsg);
    }
}

// This legacy function is no longer needed to render the main list, 
// but it can be kept for compatibility if other parts of the app call it.
// For now, it will do nothing.
function renderizarGuion() {
    // The main list rendering is now handled by renderizarGuionesEnPopupLocal()
    // This function can be left empty or removed if no longer called from elsewhere.
}
