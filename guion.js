// ===================================
// GESTIÓN DEL GUIÓN LITERARIO
// ===================================

function abrirGuion() {
    cerrartodo();
    document.getElementById('guion-literario').style.display = 'flex';
    
    // =======================================================================
    //  INICIO DE LA CORRECCIÓN
    // =======================================================================
    // Si había un capítulo activo, lo volvemos a renderizar.
    // Esto asegura que la vista se actualice con cualquier cambio que
    // haya ocurrido en segundo plano (como la generación de frames),
    // mostrando el botón correcto ("Generar Tomas") cuando el usuario regrese.
    if (indiceCapituloActivo !== -1) {
        mostrarCapituloSeleccionado(indiceCapituloActivo);
    }
    // =======================================================================
    //  FIN DE LA CORRECCIÓN
    // =======================================================================
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
    renderizarGuion();
    mostrarCapituloSeleccionado(indiceCapituloActivo); 
}

/**
 * Verifica si ya se han generado frames en la sección "Capítulos" para un guion específico.
 * @param {string} tituloGuion El título del guion a verificar.
 * @returns {boolean} True si existen escenas para ese guion y al menos una tiene frames.
 */
function hanSidoFramesGenerados(tituloGuion) {
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
    const contenidoDiv = document.getElementById('contenido-capitulo-activo');
    contenidoDiv.innerHTML = ''; 

    if (index < 0 || index >= guionLiterarioData.length) {
        contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo de la lista o crea uno nuevo.</p>';
        renderizarGuion(); 
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
                guionLiterarioData[indiceCapituloActivo].titulo = this.value;
                const capituloActualObjeto = guionLiterarioData[indiceCapituloActivo];
                guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));
                indiceCapituloActivo = guionLiterarioData.findIndex(cap => cap === capituloActualObjeto);
                renderizarGuion(); 
            }
        };
    }
    
    contenidoDiv.appendChild(inputTitulo);

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
            contenidoDiv.appendChild(botonGenerarTomas);
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
            contenidoDiv.appendChild(botonGenerarFrames);
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

    renderizarGuion();
}

function eliminarCapituloDesdeIndice(indexToDelete) {
    if (indexToDelete < 0 || indexToDelete >= guionLiterarioData.length) return;

    if (confirm("¿Estás seguro de que quieres eliminar este capítulo?")) {
        guionLiterarioData.splice(indexToDelete, 1);

        if (indiceCapituloActivo === indexToDelete) {
            indiceCapituloActivo = -1; 
        } else if (indiceCapituloActivo > indexToDelete) {
            indiceCapituloActivo--;
        }
        
        renderizarGuion(); 
        
        if (indiceCapituloActivo === -1) {
             const contenidoDiv = document.getElementById('contenido-capitulo-activo');
             contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo de la lista o crea uno nuevo.</p>';
        }
    }
}


function renderizarGuion() {
    const indiceDiv = document.getElementById('indice-capitulos-guion');
    const contenidoDiv = document.getElementById('contenido-capitulo-activo');
    const capituloActivoActual = indiceCapituloActivo !== -1 ? guionLiterarioData[indiceCapituloActivo] : null;

    indiceDiv.innerHTML = ''; 

    guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));

    if (capituloActivoActual) {
        indiceCapituloActivo = guionLiterarioData.findIndex(cap => cap === capituloActivoActual);
    }


    guionLiterarioData.forEach((capitulo, index) => {
        const tituloContainer = document.createElement('div');
        tituloContainer.className = 'titulo-capitulo-indice-container';

        const tituloElement = document.createElement('div');
        tituloElement.className = 'titulo-capitulo-indice-texto';
        tituloElement.textContent = capitulo.titulo || "Capítulo sin título";

        if (index === indiceCapituloActivo) {
            tituloContainer.classList.add('activo-container');
            tituloElement.classList.add('activo-texto');
        }
        tituloElement.onclick = () => mostrarCapituloSeleccionado(index);

        const botonEliminarIndice = document.createElement('button');
        botonEliminarIndice.textContent = 'X';
        botonEliminarIndice.className = 'eliminar-capitulo-btn-indice';
        botonEliminarIndice.onclick = (event) => {
            event.stopPropagation();
            eliminarCapituloDesdeIndice(index);
        };

        tituloContainer.appendChild(tituloElement);
        tituloContainer.appendChild(botonEliminarIndice);
        indiceDiv.appendChild(tituloContainer);
    });

    if (indiceCapituloActivo === -1 && contenidoDiv.querySelector('.contenido-guion-editor') === null) {
        contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo de la lista o crea uno nuevo.</p>';
    }
}
