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
 * Agrega un nuevo nodo (momento) al lienzo.
 */
function agregarMomento() {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return;

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
            <button class="momento-btn btn-conectar">Conectar</button>
        </div>
    `;

    const { top, left } = calcularPosicionNodo(lienzo);
    nuevoNodo.style.top = `${top}px`;
    nuevoNodo.style.left = `${left}px`;

    lienzo.appendChild(nuevoNodo);

    // Asignar eventos
    nuevoNodo.querySelector('.btn-editar').onclick = () => abrirModalEditarMomento(nuevoNodo);
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
    
    cerrarModalEditarMomento();
}

/**
 * Maneja la selección de un archivo de imagen y lo muestra en la vista previa.
 * Utiliza la función global fileToBase64.
 * @param {File} file - El archivo de imagen seleccionado.
 */
async function handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const preview = document.getElementById('momento-editor-imagen-preview');
    // Usamos la función global `fileToBase64` que está en `escenas.js`
    preview.src = await fileToBase64(file);
    preview.style.display = 'block';
}

/**
 * Hace que un elemento sea arrastrable.
 * @param {HTMLElement} element - El elemento a hacer arrastrable.
 */
function makeDraggable(element) {
    let isDragging = false;
    let offsetX, offsetY;

    const onMouseDown = (e) => {
        if (e.target.isContentEditable || e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = 1001;

        const elementRect = element.getBoundingClientRect();
        offsetX = e.clientX - elementRect.left;
        offsetY = e.clientY - elementRect.top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        const lienzo = element.parentElement;
        const scrollContainer = lienzo.parentElement;
        const containerRect = scrollContainer.getBoundingClientRect();

        let newLeft = e.clientX - containerRect.left + scrollContainer.scrollLeft - offsetX;
        let newTop = e.clientY - containerRect.top + scrollContainer.scrollTop - offsetY;
        
        newLeft = Math.max(0, Math.min(newLeft, 5000 - NODE_SIZE));
        newTop = Math.max(0, Math.min(newTop, 5000 - NODE_SIZE));

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = 1;
        document.removeEventListener('mousemove', onMouseMove);
    };

    element.addEventListener('mousedown', onMouseDown);
}


function calcularPosicionNodo(lienzo) {
    const nodosExistentes = lienzo.querySelectorAll('.momento-nodo');
    const lienzoAncho = 5000, lienzoAlto = 5000;
    const centroLeft = (lienzoAncho / 2) - (NODE_SIZE / 2);
    const centroTop = (lienzoAlto / 2) - (NODE_SIZE / 2);

    if (nodosExistentes.length === 0) return { top: centroTop, left: centroLeft };

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
        
        const currentLeft = centroLeft + x * (NODE_SIZE + NODE_GAP);
        const currentTop = centroTop + y * (NODE_SIZE + NODE_GAP);
        const rectNuevoNodo = { left: currentLeft, top: currentTop, right: currentLeft + NODE_SIZE, bottom: currentTop + NODE_SIZE };

        let tieneColision = false;
        for (const nodo of nodosExistentes) {
            const nodoRect = {
                left: parseFloat(nodo.style.left), top: parseFloat(nodo.style.top),
                right: parseFloat(nodo.style.left) + NODE_SIZE, bottom: parseFloat(nodo.style.top) + NODE_SIZE
            };
            if (rectNuevoNodo.left < nodoRect.right + NODE_GAP && rectNuevoNodo.right > nodoRect.left - NODE_GAP &&
                rectNuevoNodo.top < nodoRect.bottom + NODE_GAP && rectNuevoNodo.bottom > nodoRect.top - NODE_GAP) {
                tieneColision = true;
                break;
            }
        }
        if (!tieneColision) return { top: currentTop, left: currentLeft };
    }
    return { top: centroTop + Math.random() * 500, left: centroLeft + Math.random() * 500 };
}
