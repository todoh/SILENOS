// ===================================
// GESTIÓN DEL GUIÓN LITERARIO
// ===================================

function abrirGuion() {
    cerrartodo();
    document.getElementById('guion-literario').style.display = 'flex';
}

function agregarCapituloYMostrar() {
    const nuevoCapitulo = { titulo: "Nuevo Capítulo " + String(guionLiterarioData.length + 1).padStart(3, '0'), contenido: "" };
    guionLiterarioData.push(nuevoCapitulo);
    // Ordenar para encontrar el nuevo índice y establecerlo como activo
    guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));
    indiceCapituloActivo = guionLiterarioData.findIndex(cap => cap === nuevoCapitulo);
    renderizarGuion();
}

function mostrarCapituloSeleccionado(index) {
    indiceCapituloActivo = index;
    const contenidoDiv = document.getElementById('contenido-capitulo-activo');
    contenidoDiv.innerHTML = ''; // Limpiar contenido anterior

    if (index < 0 || index >= guionLiterarioData.length) {
        contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo de la lista o crea uno nuevo.</p>';
        renderizarGuion(); // Para actualizar la lista de títulos (quitar resaltado)
        return;
    }

    const capitulo = guionLiterarioData[index];

    const inputTitulo = document.createElement('input');
    inputTitulo.type = 'text';
    inputTitulo.placeholder = 'Título del Capítulo';
    inputTitulo.value = capitulo.titulo;
    inputTitulo.oninput = function() {
        if (indiceCapituloActivo !== -1) {
            guionLiterarioData[indiceCapituloActivo].titulo = this.value;
            const capituloActualObjeto = guionLiterarioData[indiceCapituloActivo];
            guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));
            indiceCapituloActivo = guionLiterarioData.findIndex(cap => cap === capituloActualObjeto);
            renderizarGuion(); // Re-renderizar para actualizar orden y resaltado
        }
    };

    const textareaContenido = document.createElement('textarea');
    textareaContenido.placeholder = 'Contenido del capítulo...';
    textareaContenido.value = capitulo.contenido;
    textareaContenido.oninput = function() {
        if (indiceCapituloActivo !== -1) {
            guionLiterarioData[indiceCapituloActivo].contenido = this.value;
        }
    };

    contenidoDiv.appendChild(inputTitulo);
    contenidoDiv.appendChild(textareaContenido);

    renderizarGuion(); // Para actualizar el resaltado en la lista
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
    }
}

function renderizarGuion() {
    const indiceDiv = document.getElementById('indice-capitulos-guion');
    const contenidoDiv = document.getElementById('contenido-capitulo-activo');
    indiceDiv.innerHTML = ''; // Limpiar lista de títulos

    guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));

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

    if (indiceCapituloActivo === -1 || guionLiterarioData.length === 0) {
        contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo de la lista o crea uno nuevo.</p>';
    } else if (indiceCapituloActivo >= 0 && indiceCapituloActivo < guionLiterarioData.length) {
        if (contenidoDiv.innerHTML.trim() === '' || contenidoDiv.querySelector('.mensaje-placeholder')) {
             mostrarCapituloSeleccionado(indiceCapituloActivo);
        }
    }
}
