// ===================================
// GESTIÓN DEL GUIÓN LITERARIO
// ===================================

function abrirGuion() {
    cerrartodo();
    document.getElementById('guion-literario').style.display = 'flex';
    
    if (indiceCapituloActivo !== -1) {
        mostrarCapituloSeleccionado(indiceCapituloActivo);
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
    renderizarGuion();
    mostrarCapituloSeleccionado(indiceCapituloActivo);
    
    if (typeof cargarGuionesEnDropdown === 'function') {
        cargarGuionesEnDropdown();
    } else {
        console.error("Error al agregar capítulo: La función cargarGuionesEnDropdown no está definida.");
    }
}

function hanSidoFramesGenerados(tituloGuion) {
    if (!tituloGuion) return false;
    const escenasDelGuion = Object.keys(escenas).filter(id => id.startsWith(tituloGuion));

    if (escenasDelGuion.length === 0) {
        return false;
    }

    const hayFrames = escenasDelGuion.some(id => 
        escenas[id] && 
        escenas[id].frames && 
        escenas[id].frames.some(frame => frame.texto && frame.texto.trim() !== '')
    );
    return hayFrames;
}

function mostrarCapituloSeleccionado(index) {
    indiceCapituloActivo = index;
    
    const toolbar = document.getElementById('guion-toolbar');
    const contenidoDiv = document.getElementById('contenido-capitulo-activo');
    
    toolbar.querySelectorAll('.generar-tomas-btn, .generar-frames-btn').forEach(btn => btn.remove());
    
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
                if (typeof cargarGuionesEnDropdown === 'function') {
                    cargarGuionesEnDropdown();
                }
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
            toolbar.appendChild(botonGenerarTomas);
        } else {
            // =======================================================================
            // INICIO DE LA MODIFICACIÓN
            // =======================================================================
            const botonGenerarFrames = document.createElement('button');
            botonGenerarFrames.textContent = 'Generar Frames de la Historia';
            botonGenerarFrames.className = 'pro generar-frames-btn';
            botonGenerarFrames.title = 'Rellena los capítulos con los frames detallados por la IA.';
            
            // Ahora llama a la función que abre el modal de selección de libro.
            // Esta función está en main.js y ya la tienes implementada.
            botonGenerarFrames.onclick = () => {
                if (typeof abrirModalSeleccionLibroParaFrames === 'function') {
                    abrirModalSeleccionLibroParaFrames();
                } else {
                     alert("Error: La función para abrir el modal de generación no está disponible.");
                }
            };
            toolbar.appendChild(botonGenerarFrames);
            // =======================================================================
            // FIN DE LA MODIFICACIÓN
            // =======================================================================
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
        const fueActivo = indiceCapituloActivo === indexToDelete;
        
        guionLiterarioData.splice(indexToDelete, 1);

        if (fueActivo) {
            indiceCapituloActivo = -1;
             const toolbar = document.getElementById('guion-toolbar');
             toolbar.querySelectorAll('.generar-tomas-btn, .generar-frames-btn').forEach(btn => btn.remove());
             const contenidoDiv = document.getElementById('contenido-capitulo-activo');
             contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo de la lista o crea uno nuevo.</p>';

        } else if (indiceCapituloActivo > indexToDelete) {
            indiceCapituloActivo--;
        }
        
        renderizarGuion(); 
        
        if (typeof cargarGuionesEnDropdown === 'function') {
            cargarGuionesEnDropdown();
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