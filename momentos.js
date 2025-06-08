// ===================================
// GESTIÓN DE LA SECCIÓN DE MOMENTOS
// ===================================

const NODE_SIZE = 150;
const NODE_GAP = 30;
let nodoSiendoEditado = null;

/**
 * Inicializa los listeners y componentes de la sección Momentos.
 * Se llama una única vez desde main.js
 */
function initMomentos() {
    document.getElementById('agregar-momento-btn')?.addEventListener('click', agregarMomento);
    document.getElementById('boton-agregar-accion')?.addEventListener('click', agregarAccion);


    const dropZone = document.getElementById('momento-editor-drop-zone');
    const fileInput = document.getElementById('momento-editor-file-input');

    const handleFileSelection = (e) => {
        e.preventDefault();
        const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        if (files.length) {
            handleFileSelect(files[0]);
        }
    };

    dropZone?.addEventListener('click', () => fileInput.click());
    dropZone?.addEventListener('dragover', (e) => e.preventDefault());
    dropZone?.addEventListener('drop', handleFileSelection);
    fileInput?.addEventListener('change', handleFileSelection);
}


/**
 * Agrega un nuevo nodo (momento) al lienzo, centrado en la vista actual.
 */
function agregarMomento() {
    const lienzo = document.getElementById('momentos-lienzo');
    const scrollContainer = document.getElementById('momentos'); // Contenedor con scroll
    if (!lienzo || !scrollContainer) return;

    const nodoId = `momento_${Date.now()}`;
    const nuevoNodo = document.createElement('div');
    nuevoNodo.className = 'momento-nodo';
    nuevoNodo.id = nodoId;
    
    // Estructura interna del nodo
    nuevoNodo.innerHTML = `
        <p contenteditable="true" class="momento-titulo">Momento ${lienzo.children.length + 1}</p>
        <div class="momento-contenido">
             <img class="momento-imagen" src="" style="display: none;">
             <span class="placeholder-contenido"></span>
        </div>
        <div class="momento-botones">
            <button class="momento-btn btn-editar">Editar</button>
            <button class="momento-btn btn-eliminar">Eliminar</button>
        </div>
    `;

    // CORREGIDO: Calcular posición en el centro de la vista del usuario
    const { top, left } = calcularPosicionNodo(lienzo, scrollContainer);
    nuevoNodo.style.top = `${top}px`;
    nuevoNodo.style.left = `${left}px`;
    
    // Guardar datos iniciales en el dataset
    nuevoNodo.dataset.descripcion = "";
    nuevoNodo.dataset.acciones = "[]";

    lienzo.appendChild(nuevoNodo);

    // Asignar eventos
    nuevoNodo.querySelector('.btn-editar').onclick = () => abrirModalEditarMomento(nuevoNodo);
    nuevoNodo.querySelector('.btn-eliminar').onclick = () => {
        if (confirm('¿Estás seguro de que quieres eliminar este momento?')) {
            nuevoNodo.remove();
        }
    };
    nuevoNodo.querySelector('.momento-titulo').addEventListener('mousedown', e => e.stopPropagation());
    
    makeDraggable(nuevoNodo);
}

/**
 * Abre el modal para editar un nodo específico.
 * @param {HTMLElement} nodo - El elemento del nodo a editar.
 */
function abrirModalEditarMomento(nodo) {
    nodoSiendoEditado = nodo;
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-editar-momento');

    // Poblar el modal con los datos del nodo
    document.getElementById('momento-editor-titulo').value = nodo.querySelector('.momento-titulo').textContent;
    document.getElementById('momento-editor-descripcion').value = nodo.dataset.descripcion || '';
    
    const preview = document.getElementById('momento-editor-imagen-preview');
    const imagenSrc = nodo.querySelector('.momento-imagen').src;
    if (imagenSrc && !imagenSrc.endsWith('/null')) {
        preview.src = imagenSrc;
        preview.style.display = 'block';
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }

    // Cargar y mostrar las acciones guardadas
    const accionesContainer = document.getElementById('acciones-container');
    accionesContainer.innerHTML = ''; // Limpiar
    const accionesData = JSON.parse(nodo.dataset.acciones || '[]');
    accionesData.forEach((accion, index) => {
        const accionDiv = crearElementoAccion(index + 1, accion.textoBoton, accion.idDestino);
        accionesContainer.appendChild(accionDiv);
    });

    if (overlay) {
        overlay.style.display = 'block';
        overlay.onclick = cerrarModalEditarMomento;
    }
    if (modal) modal.style.display = 'flex';
}

/**
 * Cierra el modal de edición de momentos.
 */
function cerrarModalEditarMomento() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-editar-momento');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.onclick = null;
    }
    if (modal) modal.style.display = 'none';
    
    document.getElementById('acciones-container').innerHTML = '';
    nodoSiendoEditado = null;
}

/**
 * Guarda los cambios del modal en el nodo correspondiente.
 */
function guardarCambiosMomento() {
    if (!nodoSiendoEditado) return;

    const nuevoTitulo = document.getElementById('momento-editor-titulo').value;
    const nuevaDesc = document.getElementById('momento-editor-descripcion').value;
    const nuevaImagenSrc = document.getElementById('momento-editor-imagen-preview').src;

    // Actualizar nodo
    nodoSiendoEditado.querySelector('.momento-titulo').textContent = nuevoTitulo;
    nodoSiendoEditado.dataset.descripcion = nuevaDesc;

    const imagenNodo = nodoSiendoEditado.querySelector('.momento-imagen');
    if (nuevaImagenSrc && !nuevaImagenSrc.endsWith('/null') && nuevaImagenSrc.startsWith('data:image')) {
        imagenNodo.src = nuevaImagenSrc;
        imagenNodo.style.display = 'block';
        nodoSiendoEditado.classList.add('con-imagen');
    } else {
        imagenNodo.src = '';
        imagenNodo.style.display = 'none';
        nodoSiendoEditado.classList.remove('con-imagen');
    }

    // Guardar las acciones desde los inputs y selects
    const accionesItems = document.querySelectorAll('#acciones-container .accion-item');
    const accionesData = [];
    accionesItems.forEach(item => {
        const textoBoton = item.querySelector('input[type="text"]').value;
        const idDestino = item.querySelector('select.accion-destino-select').value;
        if(textoBoton && idDestino) { // Solo guardar si ambos campos tienen valor
            accionesData.push({ textoBoton, idDestino });
        }
    });
    nodoSiendoEditado.dataset.acciones = JSON.stringify(accionesData);
    
    cerrarModalEditarMomento();
}

/**
 * Maneja la selección de un archivo de imagen y lo muestra en la vista previa.
 * @param {File} file - El archivo de imagen seleccionado.
 */
async function handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const preview = document.getElementById('momento-editor-imagen-preview');
    preview.src = await fileToBase64(file);
    preview.style.display = 'block';
}

// --- LÓGICA PARA AÑADIR ACCIONES EN EL MODAL ---

function agregarAccion() {
    const accionesContainer = document.getElementById('acciones-container');
    const numAcciones = accionesContainer.getElementsByClassName('accion-item').length;

    if (numAcciones >= 5) {
        alert("Se puede añadir un máximo de 5 acciones por momento.");
        return;
    }
    
    const nuevoNumero = numAcciones + 1;
    const accionDiv = crearElementoAccion(nuevoNumero);
    accionesContainer.appendChild(accionDiv);
}

/**
 * Crea el HTML para una acción (botón) en el modal de edición.
 * @param {number} numero - El número de la acción para el placeholder.
 * @param {string} textoBoton - El texto guardado para el botón.
 * @param {string} idDestino - El ID guardado del momento de destino.
 * @returns {HTMLElement} El elemento div que contiene los controles de la acción.
 */
function crearElementoAccion(numero, textoBoton = '', idDestino = '') {
    const accionDiv = document.createElement('div');
    accionDiv.className = 'accion-item';
    
    const textoInput = document.createElement('input');
    textoInput.type = 'text';
    textoInput.placeholder = `Texto del botón ${numero}`;
    textoInput.value = textoBoton;
    
    // Reemplazar input de ID con un <select>
    const selectDestino = document.createElement('select');
    selectDestino.className = 'accion-destino-select';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = 'Seleccionar destino...';
    selectDestino.appendChild(placeholderOption);

    const todosLosMomentos = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    todosLosMomentos.forEach(nodo => {
        if (nodo.id !== nodoSiendoEditado.id) {
            const option = document.createElement('option');
            option.value = nodo.id;
            option.textContent = nodo.querySelector('.momento-titulo').textContent.trim();
            selectDestino.appendChild(option);
        }
    });

    selectDestino.value = idDestino;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-accion-btn';
    deleteBtn.textContent = 'X';
    deleteBtn.title = 'Eliminar esta acción';
    deleteBtn.onclick = () => {
        accionDiv.remove();
    };
    
    accionDiv.appendChild(textoInput);
    accionDiv.appendChild(selectDestino);
    accionDiv.appendChild(deleteBtn);
    
    return accionDiv;
}

/**
 * CORREGIDO: Hace que un elemento sea arrastrable de forma suave y predecible.
 * @param {HTMLElement} element - El elemento a hacer arrastrable.
 */
function makeDraggable(element) {
    let isDragging = false;
    let initialX, initialY, initialLeft, initialTop;

    const onMouseDown = (e) => {
        // No arrastrar si se hace clic en un botón o en un campo editable
        if (e.target.isContentEditable || e.target.closest('.momento-btn, .btn-editar, .btn-eliminar')) {
            return;
        }
        e.preventDefault();
        
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = 1001; // Poner el nodo al frente

        // Posición inicial del nodo relativa al lienzo
        initialLeft = element.offsetLeft;
        initialTop = element.offsetTop;
        
        // Posición inicial del ratón relativa a la página
        initialX = e.pageX;
        initialY = e.pageY;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        // Calcular el desplazamiento del ratón
        const dx = e.pageX - initialX;
        const dy = e.pageY - initialY;
        
        // Calcular la nueva posición del nodo
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        // Limitar la posición dentro del lienzo de 5000x5000
        const lienzo = element.parentElement;
        const lienzoAncho = lienzo.scrollWidth;
        const lienzoAlto = lienzo.scrollHeight;
        
        newLeft = Math.max(0, Math.min(newLeft, lienzoAncho - element.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, lienzoAlto - element.offsetHeight));

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = 1; // Devolver a su z-index normal
        document.removeEventListener('mousemove', onMouseMove);
    };

    element.addEventListener('mousedown', onMouseDown);
}

/**
 * CORREGIDO: Calcula la posición para un nuevo nodo, centrado en la vista del usuario
 * y buscando un lugar libre si el centro está ocupado.
 * @param {HTMLElement} lienzo - El elemento del lienzo donde se colocan los nodos.
 * @param {HTMLElement} scrollContainer - El contenedor que tiene el scroll.
 * @returns {{top: number, left: number}} La posición calculada.
 */
function calcularPosicionNodo(lienzo, scrollContainer) {
    const nodosExistentes = lienzo.querySelectorAll('.momento-nodo');

    // 1. Calcular el centro de la vista actual
    const centroVisibleX = scrollContainer.scrollLeft + (scrollContainer.clientWidth / 2);
    const centroVisibleY = scrollContainer.scrollTop + (scrollContainer.clientHeight / 2);

    const centroLeftInicial = centroVisibleX - (NODE_SIZE / 2);
    const centroTopInicial = centroVisibleY - (NODE_SIZE / 2);
    
    const hayColision = (x, y) => {
        const rectNuevoNodo = { 
            left: x, top: y, right: x + NODE_SIZE, bottom: y + NODE_SIZE 
        };
        for (const nodo of nodosExistentes) {
            const nodoRect = {
                left: nodo.offsetLeft, top: nodo.offsetTop,
                right: nodo.offsetLeft + nodo.offsetWidth, bottom: nodo.offsetTop + nodo.offsetHeight
            };
            if (rectNuevoNodo.left < nodoRect.right + NODE_GAP && 
                rectNuevoNodo.right + NODE_GAP > nodoRect.left &&
                rectNuevoNodo.top < nodoRect.bottom + NODE_GAP && 
                rectNuevoNodo.bottom + NODE_GAP > nodoRect.top) {
                return true;
            }
        }
        return false;
    };

    // 2. Intentar colocar en el centro. Si no hay colisión, devolver esa posición.
    if (!hayColision(centroLeftInicial, centroTopInicial)) {
        return { top: centroTopInicial, left: centroLeftInicial };
    }

    // 3. Si hay colisión, buscar en espiral hacia afuera desde el centro de la vista.
    let x = 0, y = 0, delta = [0, -1];
    let sideLength = 0, steps_to_turn = 1, step = 0;

    for (let i = 0; i < 2500; i++) {
        if (step >= steps_to_turn) {
            delta = [-delta[1], delta[0]];
            sideLength++;
            step = 0;
            if (sideLength % 2 === 0) steps_to_turn++;
        }
        x += delta[0]; y += delta[1]; step++;
        
        const currentLeft = centroLeftInicial + x * (NODE_SIZE + NODE_GAP);
        const currentTop = centroTopInicial + y * (NODE_SIZE + NODE_GAP);

        if (!hayColision(currentLeft, currentTop)) {
            const lienzoAncho = lienzo.scrollWidth;
            const lienzoAlto = lienzo.scrollHeight;
            if (currentLeft >= 0 && currentTop >= 0 && currentLeft < lienzoAncho - NODE_SIZE && currentTop < lienzoAlto - NODE_SIZE) {
               return { top: currentTop, left: currentLeft };
            }
        }
    }
    
    console.warn("No se pudo encontrar una posición libre. Colocando aleatoriamente cerca del centro.");
    return { 
        top: centroTopInicial + (Math.random() - 0.5) * 400, 
        left: centroLeftInicial + (Math.random() - 0.5) * 400 
    };
}
