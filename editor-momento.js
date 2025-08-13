/**
 * ================================================================
 * GESTOR DEL PANEL DE EDICIÓN FLOTANTE (VERSIÓN 3D)
 * Permite definir el entorno 3D y las entidades (sprites) de cada momento.
 * ================================================================
 */

let panelState = {
    nodoActual: null,
    panelElement: null,
    tituloInput: null,
    descripcionInput: null,
    // Contenedores para la nueva UI 3D
    entornoContainer: null,
    entidadesContainer: null, 
    accionesContainer: null,
    agregarAccionBtn: null,
    imagenPreview: null,
    imagenDropZone: null,
    imagenFileInput: null,

};

/**
 * Inicializa el panel de edición, obteniendo referencias a sus elementos y añadiendo listeners.
 */
function inicializarPanelEdicion() {
    console.log('[EditorMomento-3D] Inicializando...');
    
    const s = panelState;
    s.panelElement = document.getElementById('panel-edicion-momento');
    if (!s.panelElement) {
        console.error('[EditorMomento-3D] ERROR CRÍTICO: #panel-edicion-momento no se encontró.');
        return;
    }

    // --- Reemplazar el contenido del panel con la nueva estructura 3D ---
    s.panelElement.innerHTML = `
        <div class="panel-header">
            <h3>Editar Momento 3D</h3>
            <button id="panel-edicion-cerrar-btn" class="panel-cerrar-btn">×</button>
        </div>
        <div class="panel-contenido">
          
            <input type="text" id="panel-editor-titulo" placeholder="Título del momento...">
            
           
            <textarea id="panel-editor-descripcion" rows="4" placeholder="Describe lo que sucede en este momento..."></textarea>
            
            <hr>

            
            <div id="panel-entorno-container">
                <!-- Los campos del entorno se generarán aquí -->
            </div>
            
            <hr>

     
            <div id="panel-entidades-container">
                <!-- Las entidades se listarán aquí -->
            </div>
            <button id="panel-boton-agregar-entidad" class="btn-accion-agregar"><i class="fas fa-plus"></i> Añadir Entidad</button>

            <hr>

            <div id="panel-acciones-container">
                <!-- Las acciones se listarán aquí -->
            </div>
            <button id="panel-boton-agregar-accion" class="btn-accion-agregar"><i class="fas fa-plus"></i> Añadir Acción</button>
        </div>
    `;

    // Búsqueda de todos los elementos internos del nuevo panel
    s.tituloInput = document.getElementById('panel-editor-titulo');
    s.descripcionInput = document.getElementById('panel-editor-descripcion');
    s.entornoContainer = document.getElementById('panel-entorno-container');
    s.entidadesContainer = document.getElementById('panel-entidades-container');
    s.accionesContainer = document.getElementById('panel-acciones-container');
    s.agregarAccionBtn = document.getElementById('panel-boton-agregar-accion');
    const agregarEntidadBtn = document.getElementById('panel-boton-agregar-entidad');
    const cerrarBtn = document.getElementById('panel-edicion-cerrar-btn');

    // Asignación de Listeners
    cerrarBtn?.addEventListener('click', ocultarPanelEdicion);
    s.tituloInput?.addEventListener('input', actualizarDatosNodo);
    s.descripcionInput?.addEventListener('input', actualizarDatosNodo);
    s.agregarAccionBtn.addEventListener('click', () => agregarNuevaAccionAPanel());
    agregarEntidadBtn.addEventListener('click', () => agregarNuevaEntidadAPanel());
    
    console.log('[EditorMomento-3D] Inicialización completada.');
}

/**
 * Muestra y puebla el panel de edición con los datos 3D de un nodo.
 * @param {HTMLElement} nodo - El elemento del nodo del momento a editar.
 */
function mostrarPanelEdicion(nodo) {
    if (!panelState.panelElement) return;
    panelState.nodoActual = nodo;
    const s = panelState;

    s.tituloInput.value = nodo.querySelector('.momento-titulo').textContent;
    s.descripcionInput.value = nodo.dataset.descripcion || '';
    
    // Poblar los datos 3D
    const entornoData = JSON.parse(nodo.dataset.entorno || '{}');
    const entidadesData = JSON.parse(nodo.dataset.entidades || '[]');
    poblarEntornoPanel(entornoData);
    poblarEntidadesPanel(entidadesData);

    // Poblar las acciones
    const accionesData = JSON.parse(nodo.dataset.acciones || '[]');
    poblarAccionesPanel(accionesData);

    s.panelElement.classList.add('visible');
}

/**
 * Oculta el panel de edición.
 */
function ocultarPanelEdicion() {
    if (panelState.panelElement) panelState.panelElement.classList.remove('visible');
    if (panelState.nodoActual) panelState.nodoActual.classList.remove('momento-seleccionado');
    panelState.nodoActual = null;
    if (window.previsualizacionActiva) dibujarConexiones();
}

/**
 * Actualiza TODOS los datos del nodo (incluyendo 3D) en el DOM en tiempo real.
 */
function actualizarDatosNodo() {
    if (!panelState.nodoActual) return;
    const nodo = panelState.nodoActual;
    const s = panelState;

    // Título y Descripción
    nodo.querySelector('.momento-titulo').textContent = s.tituloInput.value;
    nodo.dataset.descripcion = s.descripcionInput.value;
  const imagenNodo = nodo.querySelector('.momento-imagen');
    if (imagenNodo && s.imagenPreview) {
        imagenNodo.src = s.imagenPreview.src;
        // Añade o quita una clase para estilado si el nodo tiene imagen
        if (s.imagenPreview.src && !s.imagenPreview.src.endsWith('/')) {
            nodo.classList.add('con-imagen');
        } else {
            nodo.classList.remove('con-imagen');
        }
    }
    // Guardar datos del Entorno
    const entornoData = {
        texturaSuelo: document.getElementById('entorno-suelo-select')?.value || '',
        colorCielo: document.getElementById('entorno-cielo-input')?.value || '#87ceeb',
    };
    nodo.dataset.entorno = JSON.stringify(entornoData);

    // Guardar datos de las Entidades
    const entidadesData = Array.from(s.entidadesContainer.querySelectorAll('.entidad-item')).map(item => {
        return {
            recurso: item.querySelector('.entidad-recurso-select').value,
            pos: [
                parseFloat(item.querySelector('.pos-x').value) || 0,
                parseFloat(item.querySelector('.pos-y').value) || 0,
                parseFloat(item.querySelector('.pos-z').value) || 0,
            ],
            escala: parseFloat(item.querySelector('.entidad-escala').value) || 1,
        };
    }).filter(e => e.recurso);
    nodo.dataset.entidades = JSON.stringify(entidadesData);

    // Guardar datos de las Acciones
    const accionesData = Array.from(s.accionesContainer.querySelectorAll('.accion-item')).map(item => ({
        textoBoton: item.querySelector('input[type="text"]').value,
        idDestino: item.querySelector('select.accion-destino-select').value
    })).filter(a => a.textoBoton && a.idDestino);
    nodo.dataset.acciones = JSON.stringify(accionesData);

    if (window.previsualizacionActiva) dibujarConexiones();
}
/**
 * Procesa el archivo de imagen seleccionado por el usuario y lo muestra en el panel.
 * @param {Event} e - El evento 'change' del input de archivo.
 */
function manejarCargaDeImagen(e) {
    const file = e.target.files[0];
    if (file && panelState.imagenPreview) {
        const reader = new FileReader();
        reader.onload = (event) => {
            panelState.imagenPreview.src = event.target.result;
            panelState.imagenPreview.style.display = 'block';
            if(panelState.imagenDropZone) panelState.imagenDropZone.classList.add('con-imagen');
            // Una vez cargada la imagen en el panel, actualizamos el nodo
            actualizarDatosNodo(); 
        };
        reader.readAsDataURL(file);
    }
}
// --- FUNCIONES PARA POBLAR EL PANEL ---

 

function poblarEntornoPanel(data = {}) {
    const container = panelState.entornoContainer;
    // Se añade el nuevo botón de ilustración
    container.innerHTML = `
        <div class="panel-campo">
            <label>Textura Suelo:</label>
            <select id="entorno-suelo-select">
                <option value="">-- Sin Textura --</option>
            </select>
        </div>
        <div class="panel-campo">
            <label>Color Cielo:</label>
            <input type="color" id="entorno-cielo-input" value="${data.colorCielo || '#87ceeb'}">
        </div>
        <button id="btn-ilustrar-momento-ia" class="btn-accion-agregar" style="width: 100%; margin-top: 10px;">
            ✨ Ilustrar Momento con IA
        </button>
    `;

    const selectSuelo = container.querySelector('#entorno-suelo-select');
    
    // El resto de la lógica para poblar el select de texturas se mantiene igual...
    const datosContainer = document.getElementById('datos-container'); 
    if (datosContainer) {
        const datosItems = datosContainer.querySelectorAll('.dato-card');
        datosItems.forEach(item => {
            const nombreEl = item.querySelector('.dato-nombre');
            const imgEl = item.querySelector('.personaje-visual img');
            if (nombreEl && imgEl && imgEl.src) {
                const nombre = nombreEl.textContent.trim();
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                selectSuelo.appendChild(option);
            }
        });
    }

    selectSuelo.value = data.texturaSuelo || '';

    // Añadimos el listener para el nuevo botón
    container.querySelector('#btn-ilustrar-momento-ia').addEventListener('click', generarYRefinarImagenParaNodo);
    container.querySelectorAll('input, select').forEach(input => input.addEventListener('input', actualizarDatosNodo));
}

function poblarEntidadesPanel(entidades = []) {
    const container = panelState.entidadesContainer;
    container.innerHTML = '';
    if (entidades.length > 0) {
        entidades.forEach(entidad => {
            container.appendChild(crearElementoEntidadPanel(entidad));
        });
    }
}

function poblarAccionesPanel(acciones = []) {
    const container = panelState.accionesContainer;
    container.innerHTML = '';
    if (acciones.length > 0) {
        acciones.forEach(accion => {
            container.appendChild(crearElementoAccionPanel(accion));
        });
    }
}

// --- FUNCIONES PARA CREAR ELEMENTOS DE UI ---

function agregarNuevaEntidadAPanel() {
    if (!panelState.nodoActual) return;
    const nuevoElemento = crearElementoEntidadPanel();
    panelState.entidadesContainer.appendChild(nuevoElemento);
}

function crearElementoEntidadPanel(data = { recurso: '', pos: [0, 0, 0], escala: 1 }) {
    const div = document.createElement('div');
    div.className = 'entidad-item item-panel';
    
    const selectRecurso = document.createElement('select');
    selectRecurso.className = 'entidad-recurso-select';
    selectRecurso.innerHTML = '<option value="">-- Seleccionar Recurso --</option>';
    
    const datosContainer = document.getElementById('datos-container');
    if (datosContainer) {
        const datosItems = datosContainer.querySelectorAll('.dato-card');
        datosItems.forEach(item => {
            const nombreEl = item.querySelector('.dato-nombre');
            // CORRECCIÓN: Buscar la imagen dentro del elemento .personaje-visual
            const imgEl = item.querySelector('.personaje-visual img');
            
            if (nombreEl && imgEl && imgEl.src) {
                const nombre = nombreEl.textContent.trim();
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                selectRecurso.appendChild(option);
            }
        });
    } else {
        console.warn("No se encontró el contenedor de datos ('#datos-container') para poblar los recursos.");
    }

    selectRecurso.value = data.recurso;

    // Inputs para Posición y Escala
    const posContainer = document.createElement('div');
    posContainer.className = 'pos-container';
    posContainer.innerHTML = `
        <input type="number" class="pos-x" value="${data.pos[0]}" title="Posición X">
        <input type="number" class="pos-y" value="${data.pos[1]}" title="Posición Y">
        <input type="number" class="pos-z" value="${data.pos[2]}" title="Posición Z">
    `;
    const escalaInput = document.createElement('input');
    escalaInput.type = 'number';
    escalaInput.className = 'entidad-escala';
    escalaInput.value = data.escala;
    escalaInput.step = 0.1;
    escalaInput.title = 'Escala';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-item-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => {
        div.remove();
        actualizarDatosNodo();
    };

    div.append(selectRecurso, posContainer, escalaInput, deleteBtn);
    div.querySelectorAll('input, select').forEach(el => el.addEventListener('input', actualizarDatosNodo));
    return div;
}

function agregarNuevaAccionAPanel() {
    if (!panelState.nodoActual) return;
    const nuevoElemento = crearElementoAccionPanel();
    panelState.accionesContainer.appendChild(nuevoElemento);
}

function crearElementoAccionPanel(data = { textoBoton: '', idDestino: '' }) {
    const div = document.createElement('div');
    div.className = 'accion-item item-panel';

    const textoInput = document.createElement('input');
    textoInput.type = 'text';
    textoInput.placeholder = 'Texto del botón...';
    textoInput.value = data.textoBoton;

    const selectDestino = document.createElement('select');
    selectDestino.className = 'accion-destino-select';
    selectDestino.innerHTML = '<option value="">-- Seleccionar Destino --</option>';
    document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(nodo => {
        if (nodo.id !== panelState.nodoActual.id) {
            const option = document.createElement('option');
            option.value = nodo.id;
            option.textContent = nodo.querySelector('.momento-titulo').textContent.trim();
            selectDestino.appendChild(option);
        }
    });
    selectDestino.value = data.idDestino;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-item-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => {
        div.remove();
        actualizarDatosNodo();
    };

    div.append(textoInput, selectDestino, deleteBtn);
    div.querySelectorAll('input, select').forEach(el => el.addEventListener('input', actualizarDatosNodo));
    return div;
}

// Inicializar el módulo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarPanelEdicion);
