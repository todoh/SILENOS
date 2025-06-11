/**
 * =====================================
 * GESTOR DEL PANEL DE EDICIÓN FLOTANTE
 * Versión Robusta y Depurada
 * =====================================
 */

// Variables globales para el módulo del panel
let panelState = {
    nodoActual: null,
    panelElement: null,
    tituloInput: null,
    descripcionInput: null,
    dropZone: null,
    fileInput: null,
    imagenPreview: null,
    accionesContainer: null,
    agregarAccionBtn: null,
};

/**
 * Inicializa el panel de edición, obteniendo referencias a sus elementos y añadiendo listeners.
 * Se ejecuta una vez cuando el DOM está completamente cargado.
 */
function inicializarPanelEdicion() {
    console.log('[EditorMomento] Intentando inicializar...');
    
    const s = panelState; // Alias para brevedad
    s.panelElement = document.getElementById('panel-edicion-momento');
    
    // Si el panel no existe en el HTML, no continuamos.
    if (!s.panelElement) {
        console.error('[EditorMomento] ERROR CRÍTICO: El elemento #panel-edicion-momento no se encontró en el DOM.');
        return;
    }

    // Búsqueda de todos los elementos internos del panel
    s.tituloInput = document.getElementById('panel-editor-titulo');
    s.descripcionInput = document.getElementById('panel-editor-descripcion');
    s.dropZone = document.getElementById('panel-editor-drop-zone');
    s.fileInput = document.getElementById('panel-editor-file-input');
    s.imagenPreview = document.getElementById('panel-editor-imagen-preview');
    s.accionesContainer = document.getElementById('panel-acciones-container');
    s.agregarAccionBtn = document.getElementById('panel-boton-agregar-accion');
    const cerrarBtn = document.getElementById('panel-edicion-cerrar-btn');

    // Verificación de que los elementos cruciales existen
    if (!s.accionesContainer || !s.agregarAccionBtn) {
         console.error('[EditorMomento] ERROR: No se encontró #panel-acciones-container o #panel-boton-agregar-accion. Asegúrate de que el HTML es correcto.');
         return;
    }
    console.log('[EditorMomento] Todos los elementos del panel fueron encontrados.');

    // --- Asignación de Listeners ---
    cerrarBtn?.addEventListener('click', ocultarPanelEdicion);
    s.tituloInput?.addEventListener('input', actualizarDatosNodo);
    s.descripcionInput?.addEventListener('input', actualizarDatosNodo);

    // Listeners para la imagen (arrastrar y soltar, seleccionar)
    s.dropZone?.addEventListener('click', () => s.fileInput.click());
    s.dropZone?.addEventListener('dragover', (e) => e.preventDefault());
    s.dropZone?.addEventListener('drop', manejarSeleccionArchivo);
    s.fileInput?.addEventListener('change', manejarSeleccionArchivo);

    // Listener para el botón de añadir acción
    s.agregarAccionBtn.addEventListener('click', () => {
        console.log('[EditorMomento] Botón "Añadir Acción" pulsado.');
        agregarNuevaAccionAPanel();
    });
    
    console.log('[EditorMomento] Inicialización completada con éxito.');
}

/**
 * Muestra y puebla el panel de edición con los datos de un nodo.
 * @param {HTMLElement} nodo - El elemento del nodo del momento a editar.
 */
function mostrarPanelEdicion(nodo) {
    if (!panelState.panelElement) {
        console.error("[EditorMomento] El panel no está inicializado. No se puede mostrar.");
        return;
    }
    console.log(`[EditorMomento] Mostrando panel para el nodo: ${nodo.id}`);
    panelState.nodoActual = nodo;
    const s = panelState;

    // Poblar los campos con los datos del nodo
    s.tituloInput.value = nodo.querySelector('.momento-titulo').textContent;
    s.descripcionInput.value = nodo.dataset.descripcion || '';
    
    const imagenSrc = nodo.querySelector('.momento-imagen')?.src;
    if (imagenSrc && !imagenSrc.endsWith('/null') && !imagenSrc.includes('undefined')) {
        s.imagenPreview.src = imagenSrc;
        s.imagenPreview.style.display = 'block';
    } else {
        s.imagenPreview.src = '';
        s.imagenPreview.style.display = 'none';
    }

    // Poblar las acciones existentes
    poblarAccionesPanel(JSON.parse(nodo.dataset.acciones || '[]'));

    s.panelElement.classList.add('visible');
}

/**
 * Oculta el panel de edición y deselecciona el nodo.
 */
function ocultarPanelEdicion() {
    if (panelState.panelElement) {
        panelState.panelElement.classList.remove('visible');
    }
    if (panelState.nodoActual) {
        panelState.nodoActual.classList.remove('momento-seleccionado');
    }
    panelState.nodoActual = null;
    
    if (window.previsualizacionActiva) {
        dibujarConexiones();
    }
}

/**
 * Actualiza los datos del nodo en el DOM en tiempo real cuando se edita en el panel.
 */
function actualizarDatosNodo() {
    if (!panelState.nodoActual) return;
    const nodo = panelState.nodoActual;
    const s = panelState;

    // Actualizar título y descripción
    nodo.querySelector('.momento-titulo').textContent = s.tituloInput.value;
    nodo.dataset.descripcion = s.descripcionInput.value;

    // Actualizar imagen
    const imagenNodo = nodo.querySelector('.momento-imagen');
    if (s.imagenPreview.src && s.imagenPreview.style.display === 'block') {
        imagenNodo.src = s.imagenPreview.src;
        imagenNodo.style.display = 'block';
        nodo.classList.add('con-imagen');
    } else {
        imagenNodo.src = '';
        imagenNodo.style.display = 'none';
        nodo.classList.remove('con-imagen');
    }
    
    // Recoger y guardar todas las acciones actuales
    const accionesData = Array.from(s.accionesContainer.querySelectorAll('.accion-item')).map(item => ({
        textoBoton: item.querySelector('input[type="text"]').value,
        idDestino: item.querySelector('select.accion-destino-select').value
    })).filter(a => a.textoBoton && a.idDestino);
    
    nodo.dataset.acciones = JSON.stringify(accionesData);

    if (window.previsualizacionActiva) {
        dibujarConexiones();
    }
}

/**
 * Maneja la selección de un archivo de imagen (drop o change).
 * @param {Event} e - El evento.
 */
async function manejarSeleccionArchivo(e) {
    e.preventDefault();
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        panelState.imagenPreview.src = await fileToBase64(files[0]);
        panelState.imagenPreview.style.display = 'block';
        actualizarDatosNodo(); // Guardar el cambio
    }
}

/**
 * Rellena el contenedor de acciones en el panel con los datos guardados.
 * @param {Array} acciones - Array de objetos de acción.
 */
function poblarAccionesPanel(acciones) {
    const s = panelState;
    s.accionesContainer.innerHTML = '';
    if (acciones && acciones.length > 0) {
        acciones.forEach((accion, index) => {
            const accionDiv = crearElementoAccionPanel(index + 1, accion.textoBoton, accion.idDestino);
            s.accionesContainer.appendChild(accionDiv);
        });
    }
    console.log(`[EditorMomento] Se poblaron ${acciones.length} acciones.`);
}

/**
 * Añade un nuevo campo de acción vacío al panel.
 */
function agregarNuevaAccionAPanel() {
    const s = panelState;
    if (!s.nodoActual) {
        alert("Primero selecciona un momento para añadirle una acción.");
        return;
    }
    if (s.accionesContainer.children.length >= 5) {
        alert("Se puede añadir un máximo de 5 acciones por momento.");
        return;
    }
    const nuevoNumero = s.accionesContainer.children.length + 1;
    const nuevoElementoAccion = crearElementoAccionPanel(nuevoNumero);
    s.accionesContainer.appendChild(nuevoElementoAccion);
}

/**
 * Crea el HTML para una fila de acción (input, select, botón borrar).
 * @returns {HTMLElement} El elemento de la acción creado.
 */
function crearElementoAccionPanel(numero, textoBoton = '', idDestino = '') {
    const accionDiv = document.createElement('div');
    accionDiv.className = 'accion-item';
    
    // Input para el texto del botón
    const textoInput = document.createElement('input');
    textoInput.type = 'text';
    textoInput.placeholder = `Texto del botón ${numero}`;
    textoInput.value = textoBoton;
    textoInput.addEventListener('input', actualizarDatosNodo);
    
    // Select para el destino
    const selectDestino = document.createElement('select');
    selectDestino.className = 'accion-destino-select';
    selectDestino.innerHTML = '<option value="">Seleccionar destino...</option>';
    selectDestino.addEventListener('change', actualizarDatosNodo);

    // Poblar select con todos los demás nodos
    document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(nodo => {
        if (nodo.id !== panelState.nodoActual.id) {
            const option = document.createElement('option');
            option.value = nodo.id;
            option.textContent = nodo.querySelector('.momento-titulo').textContent.trim();
            selectDestino.appendChild(option);
        }
    });
    selectDestino.value = idDestino;
    
    // Botón para eliminar la acción
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-accion-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Eliminar esta acción';
    deleteBtn.onclick = () => {
        accionDiv.remove();
        actualizarDatosNodo(); // Guardar el cambio
    };
    
    accionDiv.append(textoInput, selectDestino, deleteBtn);
    return accionDiv;
}

/**
 * Convierte un objeto File a una cadena Base64.
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Inicializar el módulo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPanelEdicion);
