function abrirSelectorDeLibro(event) {
    event.stopPropagation(); 
    const popup = document.getElementById('selector-libro-popup');
    if (!popup) return;

    const isVisible = popup.style.display === 'block';

    if (isVisible) {
        popup.style.display = 'none';
    } else {
        renderizarSelectorDeLibro();
        const rect = event.currentTarget.getBoundingClientRect();
        popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;
        popup.style.display = 'block';
    }
}

function cerrarSelectorDeLibro() {
    const popup = document.getElementById('selector-libro-popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

function renderizarSelectorDeLibro() {
    const popup = document.getElementById('selector-libro-popup');
    if (!popup) return;

    popup.innerHTML = ''; 

    const crearLibroBtn = document.createElement('button');
    crearLibroBtn.className = 'guion-popup-item-local crear-libro-btn-popup';
    crearLibroBtn.innerHTML = '➕ Crear Nuevo Libro';
    crearLibroBtn.onclick = () => crearNuevoLibro();
    popup.appendChild(crearLibroBtn);

    if (libros.length > 0) {
        popup.appendChild(document.createElement('hr'));
    }
    
    libros.forEach(libro => {
        const libroItem = document.createElement('div');
        libroItem.className = 'guion-popup-item-local libro-item-container';
        libroItem.onclick = () => seleccionarLibro(libro.id);

        const libroTituloSpan = document.createElement('span');
        libroTituloSpan.className = 'libro-popup-titulo';
        libroTituloSpan.textContent = libro.titulo;
        
        const editarBtn = document.createElement('button');
        editarBtn.className = 'libro-popup-editar-btn';
        editarBtn.innerHTML = '✏️';
        editarBtn.title = 'Cambiar nombre';
        editarBtn.onclick = (event) => {
            event.stopPropagation(); 
            iniciarEdicionNombreLibro(event, libro.id);
        };
        
        libroItem.appendChild(libroTituloSpan);
        libroItem.appendChild(editarBtn);
        popup.appendChild(libroItem);
    });
}

function iniciarEdicionNombreLibro(event, libroId) {
    const botonEditar = event.currentTarget;
    const itemContainer = botonEditar.parentElement;
    const tituloSpan = itemContainer.querySelector('.libro-popup-titulo');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = tituloSpan.textContent;
    input.className = 'libro-nombre-input-edicion';
    
    itemContainer.replaceChild(input, tituloSpan);
    input.focus();
    input.select();

    input.addEventListener('blur', () => {
        guardarNuevoNombreLibro(input, libroId);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur(); 
        } else if (e.key === 'Escape') {
            renderizarSelectorDeLibro();
        }
    });
}

function guardarNuevoNombreLibro(inputElement, libroId) {
    const nuevoTitulo = inputElement.value.trim();
    const libro = libros.find(l => l.id === libroId);

    if (libro && nuevoTitulo) {
        libro.titulo = nuevoTitulo;

        if (libro.id === libroActivoId) {
            const tituloContainer = document.getElementById('libro-activo-titulo');
            if (tituloContainer) {
                tituloContainer.textContent = `Libro: ${nuevoTitulo}`;
            }
        }
    }
    renderizarSelectorDeLibro();
}

function crearNuevoLibro() {
    const titulo = prompt("Nombre del nuevo libro:", `Libro ${libros.length + 1}`);
    if (titulo) {
        const nuevoLibro = {
            id: `libro_${Date.now()}`,
            titulo: titulo
        };
        libros.push(nuevoLibro);
        seleccionarLibro(nuevoLibro.id); 
    }
}

function seleccionarLibro(id) {
    libroActivoId = id;
    const libro = libros.find(l => l.id === id);
    const tituloContainer = document.getElementById('libro-activo-titulo');
    if (libro && tituloContainer) {
        tituloContainer.textContent = `Libro: ${libro.titulo}`;
    }
    cerrarSelectorDeLibro();
    if (typeof actualizarLista === 'function') {
        actualizarLista();
    }
}

function abrirModalSeleccionLibroParaFrames() {
    const modal = document.getElementById('modal-seleccionar-libro-para-frames');
    const overlay = document.getElementById('modal-overlay');
    const listaLibrosContainer = document.getElementById('lista-libros-para-frames');
    const selectGuiones = document.getElementById('guion-origen-select');
    
    if (!modal || !overlay || !listaLibrosContainer || !selectGuiones) return;

    selectGuiones.innerHTML = '';
    if (guionLiterarioData && guionLiterarioData.length > 0) {
        guionLiterarioData.forEach(guion => {
            if (guion.generadoPorIA) { 
                const option = document.createElement('option');
                option.value = guion.titulo;
                option.textContent = guion.titulo;
                selectGuiones.appendChild(option);
            }
        });
    } else {
        selectGuiones.innerHTML = '<option disabled>No hay guiones de IA disponibles</option>';
    }

    listaLibrosContainer.innerHTML = '';
    if (libros.length === 0) {
        listaLibrosContainer.innerHTML = '<p>No hay libros creados. Ve a la sección "Libro" para crear uno.</p>';
    } else {
        libros.forEach(libro => {
            const libroBtn = document.createElement('button');
            libroBtn.className = 'libro-item-seleccion';
            libroBtn.textContent = libro.titulo;
            libroBtn.dataset.libroId = libro.id; 
            libroBtn.onclick = (event) => marcarLibroSeleccionado(event);
            listaLibrosContainer.appendChild(libroBtn);
        });
    }

    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalSeleccionLibro;
}

function marcarLibroSeleccionado(event) {
    const todosLosBotones = document.querySelectorAll('#lista-libros-para-frames .libro-item-seleccion');
    todosLosBotones.forEach(btn => btn.classList.remove('selected'));

    const botonPulsado = event.currentTarget;
    botonPulsado.classList.add('selected');
    libroDestinoSeleccionadoId = botonPulsado.dataset.libroId;
}

function cerrarModalSeleccionLibro() {
    const modal = document.getElementById('modal-seleccionar-libro-para-frames');
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.style.display = 'none';
        overlay.onclick = null;
    }
    libroDestinoSeleccionadoId = null; 
}

function confirmarSeleccionYProcesar() {
    const guionSeleccionado = document.getElementById('guion-origen-select').value;

    if (!guionSeleccionado) {
        alert("Por favor, selecciona un guion de la lista.");
        return;
    }
    if (!libroDestinoSeleccionadoId) {
        alert("Por favor, selecciona un libro de destino.");
        return;
    }
 if (typeof reiniciarContadorEscenas === 'function') {
        reiniciarContadorEscenas();
    }
    libroActivoId = libroDestinoSeleccionadoId;

    if (typeof desarrollarFramesDesdeGeminimente === 'function') {
        desarrollarFramesDesdeGeminimente(guionSeleccionado);
    } else {
        alert("Error: La función 'desarrollarFramesDesdeGeminimente' no se encontró.");
    }
    
    cerrarModalSeleccionLibro();
    abrir('capitulosh');
}
