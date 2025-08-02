// ===================================
// GESTIÓN DE DATOS Y ETIQUETAS
// ===================================

const opcionesEtiqueta = [
    { emoji: '⦾', valor: 'indeterminado', titulo: 'Indeterminado' },
    { emoji: '🧍', valor: 'personaje', titulo: 'Personaje' },
    { emoji: '🗺️', valor: 'ubicacion', titulo: 'Ubicación' },
    { emoji: '🗓️', valor: 'evento', titulo: 'Evento' },
    { emoji: '🛠️', valor: 'objeto', titulo: 'Objeto' },
    { emoji: '👕', valor: 'atuendo', titulo: 'Atuendo' },
    { emoji: '🏡', valor: 'edificio', titulo: 'Edificio' },
    { emoji: '🍱', valor: 'comida', titulo: 'Comida' },
    { emoji: '🚗', valor: 'transporte', titulo: 'Transporte' },
    { emoji: '🐾', valor: 'animal', titulo: 'Animal' },
    { emoji: '🌱', valor: 'planta', titulo: 'Planta' },
    { emoji: '🎭', valor: 'arte', titulo: 'Arte' },
    { emoji: '🛋️', valor: 'muebles', titulo: 'Muebles' },
    { emoji: '🦠', valor: 'ser_vivo', titulo: 'Ser Vivo' },
    { emoji: '🏞️', valor: 'elemento_geográfico', titulo: 'Elemento Geográfico' },
    { emoji: '💭', valor: 'concepto', titulo: 'Concepto' },
    { emoji: '📝', valor: 'nota', titulo: 'Nota' },
    { emoji: '🙏', valor: 'mitologia', titulo: 'Mitologia' },
    { emoji: '👁️‍🗨️', valor: 'visual', titulo: 'Visual' },
    { emoji: '✒️', valor: 'personalizar', titulo: 'Personalizar' }
];

const opcionesArco = [
    { emoji: '⚪', valor: 'sin_arco', titulo: 'Base' },
    { emoji: 'Ⅰ', valor: '1º', titulo: 'Primero' },
    { emoji: 'ⅠⅠ', valor: '2º', titulo: 'Segundo' },
    { emoji: 'ⅠⅠⅠ', valor: '3º', titulo: 'Tercero' },
    { emoji: '🎮', valor: 'videojuego', titulo: 'Videojuego' },
    { emoji: '🎬', valor: 'planteamiento', titulo: 'Planteamiento' },
    { emoji: '👁️', valor: 'visuales', titulo: 'Visuales' },
    { emoji: '📚', valor: 'libro', titulo: 'Libro' },
    { emoji: '📝', valor: 'guion', titulo: 'Guion' },
    { emoji: '✒️', valor: 'personalizar', titulo: 'Personalizar' }
];

// Función de ayuda para convertir un archivo a formato Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Muestra un menú emergente para seleccionar una etiqueta, con opción para personalizar.
 * @param {HTMLElement} botonEtiqueta - El botón que activó el menú.
 */
function mostrarMenuEtiquetas(botonEtiqueta) {
    const menuExistente = document.querySelector('.menu-etiquetas');
    if (menuExistente) menuExistente.remove();

    const menu = document.createElement('div');
    menu.className = 'menu-etiquetas';
    const elementoDato = botonEtiqueta.closest('.personaje');

    opcionesEtiqueta.forEach(opcion => {
        const itemMenu = document.createElement('div');
        itemMenu.className = 'item-menu-etiqueta';
        itemMenu.textContent = `${opcion.emoji} ${opcion.titulo}`;
        
        itemMenu.onclick = (e) => {
            e.stopPropagation();
            if (opcion.valor === 'personalizar') {
                menu.remove();
                crearInputParaEtiqueta(botonEtiqueta);
            } else {
                botonEtiqueta.innerHTML = opcion.emoji;
                botonEtiqueta.title = `Etiqueta: ${opcion.titulo}`;
                botonEtiqueta.dataset.etiqueta = opcion.valor;
                etiquetasFiltroActivas.add(opcion.valor);
                menu.remove();
                actualizarVistaDatos();
                if (elementoDato) {
                    elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        };
        menu.appendChild(itemMenu);
    });

    document.body.appendChild(menu);
    const rect = botonEtiqueta.getBoundingClientRect();

// --- CAMBIO CLAVE: Posicionar el menú arriba del botón ---
        menu.style.left = `${rect.left + window.scrollX}px`;
        menu.style.top = `${rect.top + window.scrollY - menu.offsetHeight - 5}px`; // Calcula la posición para que aparezca arriba

    
    const cerrarMenuHandler = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', cerrarMenuHandler, true);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenuHandler, true), 100);
}


/**
 * Muestra un menú emergente para seleccionar un Arco Narrativo.
 * @param {HTMLElement} botonArco - El botón que activó el menú.
 */
function mostrarMenuArcos(botonArco) {
    const menuExistente = document.querySelector('.menu-etiquetas');
    if (menuExistente) menuExistente.remove();

    const menu = document.createElement('div');
    menu.className = 'menu-etiquetas';
    const elementoDato = botonArco.closest('.personaje'); // <-- MEJORA: Obtener el elemento padre
    
    opcionesArco.forEach(opcion => {
        const itemMenu = document.createElement('div');
        itemMenu.className = 'item-menu-etiqueta';
        itemMenu.textContent = `${opcion.emoji} ${opcion.titulo}`;
        
        itemMenu.onclick = (e) => {
            e.stopPropagation();
            if (opcion.valor === 'personalizar') {
                menu.remove();
                crearInputParaArco(botonArco); 
            } else {
                botonArco.innerHTML = opcion.emoji;
                botonArco.title = `Arco: ${opcion.titulo}`;
                botonArco.dataset.arco = opcion.valor;
                arcosFiltroActivos.add(opcion.valor); // <-- MEJORA: Añadir a filtros activos
                menu.remove();
                actualizarVistaDatos();
                if (elementoDato) { // <-- MEJORA: Hacer scroll al elemento
                    elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        };
        menu.appendChild(itemMenu);
    });

    document.body.appendChild(menu);
    const rect = botonArco.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;

    const cerrarMenuHandler = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', cerrarMenuHandler, true);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenuHandler, true), 100);
}


/**
 * Crea un campo de texto para que el usuario escriba una etiqueta personalizada.
 * @param {HTMLElement} botonEtiqueta - El botón de etiqueta que se actualizará.
 */
function crearInputParaEtiqueta(botonEtiqueta) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Nombre de etiqueta...';
    input.className = 'input-etiqueta-personalizada';
    const elementoDato = botonEtiqueta.closest('.personaje');

    document.body.appendChild(input);
    const rect = botonEtiqueta.getBoundingClientRect();
    input.style.position = 'absolute';
    input.style.top = `${rect.top + window.scrollY}px`;
    input.style.left = `${rect.left + window.scrollX}px`;
    input.style.width = `${rect.width + 40}px`;
    input.style.zIndex = '10001';
    input.focus();

    const guardarEtiqueta = () => {
        const nuevoValor = input.value.trim();
        if (nuevoValor) {
            botonEtiqueta.innerHTML = nuevoValor;
            botonEtiqueta.title = `Etiqueta: ${nuevoValor}`;
            botonEtiqueta.dataset.etiqueta = nuevoValor;
            etiquetasFiltroActivas.add(nuevoValor);
        }
        if (input.parentNode === document.body) {
            document.body.removeChild(input);
        }
        actualizarVistaDatos();
        if (elementoDato) {
            elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    input.addEventListener('blur', guardarEtiqueta);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            guardarEtiqueta();
        }
    });
}

/**
 * Crea un campo de texto para que el usuario escriba un Arco personalizado.
 * @param {HTMLElement} botonArco - El botón de arco que se actualizará.
 */
function crearInputParaArco(botonArco) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Nombre del arco...';
    input.className = 'input-etiqueta-personalizada';
    const elementoDato = botonArco.closest('.personaje'); // <-- MEJORA: Obtener el elemento padre

    document.body.appendChild(input);
    const rect = botonArco.getBoundingClientRect();
    input.style.position = 'absolute';
    input.style.top = `${rect.top + window.scrollY}px`;
    input.style.left = `${rect.left + window.scrollX}px`;
    input.style.width = `${rect.width + 40}px`;
    input.style.zIndex = '10001';
    input.focus();

    const guardarArco = () => {
        const nuevoValor = input.value.trim();
        if (nuevoValor) {
            botonArco.innerHTML = nuevoValor;
            botonArco.title = `Arco: ${nuevoValor}`;
            botonArco.dataset.arco = nuevoValor;
            arcosFiltroActivos.add(nuevoValor); // <-- MEJORA: Añadir a filtros activos
        }
        if (input.parentNode === document.body) {
            document.body.removeChild(input);
        }
        actualizarVistaDatos();
        if (elementoDato) { // <-- MEJORA: Hacer scroll al elemento
            elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    input.addEventListener('blur', guardarArco);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            guardarArco();
        }
    });
}

// ===================================
// ORDENACIÓN Y FILTRADO DE DATOS
// ===================================

let etiquetasFiltroActivas = new Set();
let arcosFiltroActivos = new Set();

/**
 * Recoge todas las etiquetas únicas de los datos actualmente en el DOM.
 * @returns {string[]} Un array de strings de etiquetas únicas.
 */
function obtenerEtiquetasUnicas() {
    const etiquetas = new Set();
    document.querySelectorAll('#listapersonajes .personaje').forEach(personaje => {
        const etiqueta = personaje.querySelector('.change-tag-btn')?.dataset.etiqueta;
        if (etiqueta) {
            etiquetas.add(etiqueta);
        }
    });
    return Array.from(etiquetas).sort((a, b) => a.localeCompare(b));
}

/**
 * Ordena y filtra los datos en el DOM según los filtros activos y el orden de etiquetas.
 */
function actualizarVistaDatos() {
    const lista = document.getElementById('listapersonajes');
    if (!lista) return;

    const elementos = Array.from(lista.children);

    // 1. ORDENACIÓN (POR ARCO, LUEGO ETIQUETA, LUEGO NOMBRE)
    const ordenArcos = new Map(opcionesArco.map((op, index) => [op.valor, index]));
    const ordenEtiquetas = new Map(opcionesEtiqueta.map((op, index) => [op.valor, index]));
    
    elementos.sort((a, b) => {
        const arcA = a.querySelector('.change-arc-btn')?.dataset.arco || 'sin_arco';
        const tagA = a.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado';
        const nombreA = a.querySelector('.nombreh')?.value.trim().toLowerCase() || '';

        const arcB = b.querySelector('.change-arc-btn')?.dataset.arco || 'sin_arco';
        const tagB = b.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado';
        const nombreB = b.querySelector('.nombreh')?.value.trim().toLowerCase() || '';

        const ordenArcoA = ordenArcos.has(arcA) ? ordenArcos.get(arcA) : Infinity;
        const ordenArcoB = ordenArcos.has(arcB) ? ordenArcos.get(arcB) : Infinity;

        if (ordenArcoA !== ordenArcoB) {
            return ordenArcoA - ordenArcoB;
        }

        const ordenEtiquetaA = ordenEtiquetas.has(tagA) ? ordenEtiquetas.get(tagA) : Infinity;
        const ordenEtiquetaB = ordenEtiquetas.has(tagB) ? ordenEtiquetas.get(tagB) : Infinity;

        if (ordenEtiquetaA !== ordenEtiquetaB) {
            return ordenEtiquetaA - ordenEtiquetaB;
        }
        
        return nombreA.localeCompare(nombreB);
    });

    // 2. RE-INSERCIÓN ORDENADA EN EL DOM
    elementos.forEach(el => lista.appendChild(el));

    // 3. FILTRADO COMBINADO (mostrar u ocultar)
    elementos.forEach(el => {
        const etiquetaEl = el.querySelector('.change-tag-btn')?.dataset.etiqueta;
        const arcoEl = el.querySelector('.change-arc-btn')?.dataset.arco;

        const etiquetaVisible = etiquetasFiltroActivas.has(etiquetaEl);
        const arcoVisible = arcosFiltroActivos.has(arcoEl);

        if (etiquetaVisible && arcoVisible) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}


/**
 * Rellena y muestra el popup de filtros.
 */
function actualizarPopupFiltros() {
    const popup = document.getElementById('filtro-datos-popup');
    if (!popup) return;

    popup.innerHTML = ''; 

    // --- SECCIÓN DE ARCOS ---
    const arcosContainer = document.createElement('div');
    arcosContainer.className = 'filtro-seccion';
    arcosContainer.innerHTML = '<h3 class="filtro-titulo">Arcos</h3>';
    
    const arcosDisponibles = obtenerArcosUnicos();

    const allArcosContainer = document.createElement('div');
    allArcosContainer.className = 'filtro-item-control';
    const allArcosLabel = document.createElement('label');
    const allArcosCheckbox = document.createElement('input');
    allArcosCheckbox.type = 'checkbox';
    allArcosCheckbox.checked = arcosDisponibles.every(arco => arcosFiltroActivos.has(arco)) && arcosDisponibles.length > 0;
    allArcosLabel.appendChild(allArcosCheckbox);
    allArcosLabel.append(' (Marcar todos)');
    allArcosCheckbox.onchange = () => {
        if (allArcosCheckbox.checked) {
            arcosDisponibles.forEach(arco => arcosFiltroActivos.add(arco));
        } else {
            arcosFiltroActivos.clear();
        }
        actualizarPopupFiltros(); 
        actualizarVistaDatos();
    };
    allArcosContainer.appendChild(allArcosLabel);
    arcosContainer.appendChild(allArcosContainer);

    arcosDisponibles.forEach(arco => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'filtro-item';
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = arco;
        checkbox.checked = arcosFiltroActivos.has(arco);
        
        checkbox.onchange = () => {
            if (checkbox.checked) {
                arcosFiltroActivos.add(arco);
            } else {
                arcosFiltroActivos.delete(arco);
            }
            actualizarPopupFiltros(); 
            actualizarVistaDatos();
        };

        label.appendChild(checkbox);
        const opcion = opcionesArco.find(op => op.valor === arco);
        const displayName = opcion ? `${opcion.emoji} ${opcion.titulo}` : arco;
        label.append(` ${displayName}`);
        itemContainer.appendChild(label);
        arcosContainer.appendChild(itemContainer);
    });
    popup.appendChild(arcosContainer);


    // --- SECCIÓN DE ETIQUETAS ---
    const etiquetasContainer = document.createElement('div');
    etiquetasContainer.className = 'filtro-seccion';
    etiquetasContainer.innerHTML = '<h3 class="filtro-titulo">Etiquetas</h3>';

    const etiquetasDisponibles = obtenerEtiquetasUnicas();

    const allEtiquetasContainer = document.createElement('div');
    allEtiquetasContainer.className = 'filtro-item-control';
    const allEtiquetasLabel = document.createElement('label');
    const allEtiquetasCheckbox = document.createElement('input');
    allEtiquetasCheckbox.type = 'checkbox';
    allEtiquetasCheckbox.checked = etiquetasDisponibles.every(tag => etiquetasFiltroActivas.has(tag)) && etiquetasDisponibles.length > 0;
    allEtiquetasLabel.appendChild(allEtiquetasCheckbox);
    allEtiquetasLabel.append(' (Marcar todos)');
    allEtiquetasCheckbox.onchange = () => {
        if (allEtiquetasCheckbox.checked) {
            etiquetasDisponibles.forEach(tag => etiquetasFiltroActivas.add(tag));
        } else {
            etiquetasFiltroActivas.clear();
        }
        actualizarPopupFiltros(); 
        actualizarVistaDatos();
    };
    allEtiquetasContainer.appendChild(allEtiquetasLabel);
    etiquetasContainer.appendChild(allEtiquetasContainer);

    etiquetasDisponibles.forEach(tag => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'filtro-item';
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tag;
        checkbox.checked = etiquetasFiltroActivas.has(tag);
        
        checkbox.onchange = () => {
            if (checkbox.checked) {
                etiquetasFiltroActivas.add(tag);
            } else {
                etiquetasFiltroActivas.delete(tag);
            }
            actualizarPopupFiltros(); 
            actualizarVistaDatos();
        };

        label.appendChild(checkbox);
        const opcion = opcionesEtiqueta.find(op => op.valor === tag);
        const displayName = opcion ? `${opcion.emoji} ${opcion.titulo}` : tag;
        label.append(` ${displayName}`);
        itemContainer.appendChild(label);
        etiquetasContainer.appendChild(itemContainer);
    });
    popup.appendChild(etiquetasContainer);

    popup.style.display = 'block';
}

/**
 * Crea el botón de filtro y el popup, e inyecta los estilos necesarios.
 */
function inicializarControlesDeFiltro() {
    const botonesSuperiores = document.getElementById('datos-botones-superiores');
    if (!botonesSuperiores || document.getElementById('filtro-datos-btn')) return;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        #filtro-datos-popup { display: none; position: fixed; top: 0;  left: 0;  background-color: transparent;
backdrop-filter: blur(20px);
background-image: linear-gradient(120deg, rgba(192, 192, 192, 0.3), 
 rgba(255, 255, 255, 0.2)); border: 0px solid #555; border-radius: 5px; padding: 0px; z-index: 10002; }
        .filtro-item label, .filtro-item-control label { display: flex; align-items: center; color: black; padding: 0px; cursor: pointer; border-radius: 3px; font-size: 14px; }
        .filtro-item label:hover { background-color: #444; color: white;}
        .filtro-item input, .filtro-item-control input { margin-right: 10px; }
        .filtro-item-control { border-bottom: 1px solid #555; margin-bottom: 5px; padding-bottom: 5px; }
    `;
    document.head.appendChild(styleSheet);
    
    const filtroBtn = document.createElement('button');
    filtroBtn.id = 'filtro-datos-btn';
    filtroBtn.className = 'pro6'; 
    filtroBtn.textContent = '☰';
    botonesSuperiores.appendChild(filtroBtn);

    const popup = document.createElement('div');
    popup.id = 'filtro-datos-popup';
    popup.className = 'lista-guiones-popup-local';
    botonesSuperiores.parentNode.insertBefore(popup, botonesSuperiores.nextSibling);

    filtroBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = popup.style.display === 'block';
        if (isVisible) {
            popup.style.display = 'none';
        } else {
            actualizarPopupFiltros();
            const rect = filtroBtn.getBoundingClientRect();
            popup.style.top = `${rect.bottom + window.scrollY}px`;
            popup.style.left = `0px`;
        }
    });

    document.addEventListener('click', (e) => {
        if (!popup.contains(e.target) && e.target !== filtroBtn) {
            popup.style.display = 'none';
        }
    });
    
    reinicializarFiltrosYActualizarVista();
}

/**
 * Reinicia los filtros para incluir todas las etiquetas disponibles y actualiza la vista.
 */
function reinicializarFiltrosYActualizarVista() {
    etiquetasFiltroActivas.clear();
    const todasLasEtiquetas = obtenerEtiquetasUnicas();
    todasLasEtiquetas.forEach(tag => etiquetasFiltroActivas.add(tag));
    
    arcosFiltroActivos.clear();
    const todosLosArcos = obtenerArcosUnicos();
    todosLosArcos.forEach(arco => arcosFiltroActivos.add(arco));

    actualizarVistaDatos();
}

function obtenerArcosUnicos() {
    const arcos = new Set();
    document.querySelectorAll('#listapersonajes .personaje').forEach(personaje => {
        const arco = personaje.querySelector('.change-arc-btn')?.dataset.arco;
        if (arco) arcos.add(arco);
    });
    return Array.from(arcos).sort((a, b) => a.localeCompare(b));
}

/**
 * Crea y añade un nuevo elemento de "Dato" al DOM, incluyendo todos los controles.
 * @param {object} personajeData - El objeto con los datos del personaje/dato.
 */
/**
 * Crea y añade un nuevo elemento de "Dato" al DOM, incluyendo todos los controles.
 * Si ya existe un dato con el mismo nombre, fusiona las descripciones en lugar de crear un duplicado.
 * Esta versión ha sido corregida para renderizar el contenido SVG de forma más fiable.
 * @param {object} personajeData - El objeto con los datos del personaje/dato.
 * @returns {HTMLElement} El elemento del DOM creado o encontrado.
 */



function agregarPersonaje() {
    agregarPersonajeDesdeDatos();
    reinicializarFiltrosYActualizarVista();
}

// =========================================================================
// INICIALIZACIÓN Y MANEJO DE INTERACCIÓN PRINCIPAL
// =========================================================================

/**
 * --- FUNCIÓN CORREGIDA ---
 * Inicializa los listeners para abrir y cerrar la vista de edición de un dato.
 * Previene los errores de referencia y de nodo no encontrado.
 */
function inicializarInteraccionPersonajes() {
    const listaPersonajesEl = document.getElementById('listapersonajes');
    if (!listaPersonajesEl) return;

    // Listener para ABRIR el editor al hacer clic en un visual.
    listaPersonajesEl.addEventListener('click', (e) => {
        // Ignora los clics en los botones de etiqueta/arco para no interferir con sus menús.
        if (e.target.closest('.change-tag-btn') || e.target.closest('.change-arc-btn')) {
            return; 
        }

        const visualClicked = e.target.closest('.personaje-visual');
        if (visualClicked) {
            const personajeActual = visualClicked.closest('.personaje');
            if (!personajeActual) return;
            
            // Cierra cualquier otro editor que esté abierto antes de abrir uno nuevo.
            const otroPersonajeActivo = document.querySelector('.personaje.editing');
            if (otroPersonajeActivo && otroPersonajeActivo !== personajeActual) {
                otroPersonajeActivo.classList.remove('editing');
            }
            
            // Alterna la clase 'editing' en el dato clickeado.
            personajeActual.classList.toggle('editing');

            // Si el editor se acaba de abrir, actualiza la imagen de previsualización.
            if (personajeActual.classList.contains('editing')) {
                const visualImgSrc = visualClicked.querySelector('img')?.src;
                const overlay = personajeActual.querySelector('.personaje-edit-overlay');
                const previewImg = overlay.querySelector('.edit-preview-image');

                if (previewImg && visualImgSrc && !visualImgSrc.endsWith('/')) {
                    previewImg.src = visualImgSrc;
                    previewImg.style.display = 'block';
                } else if (previewImg) {
                    previewImg.style.display = 'none';
                }
            }
        }
    });

    // Listener global para CERRAR el editor al hacer clic FUERA de él.
    document.addEventListener('click', (e) => {
        const personajeActivo = document.querySelector('.personaje.editing');
        const menuActivo = document.querySelector('.menu-etiquetas');

        // Cierra el editor si el clic fue fuera del dato activo, sus menús o el modal de mejora.
        if (personajeActivo &&
            !e.target.closest('.personaje.editing') &&
            !e.target.closest('.menu-etiquetas') &&
            !e.target.closest('.input-etiqueta-personalizada') &&
            !e.target.closest('#improve-modal-overlay')) { // <-- Corrección clave
                
            personajeActivo.classList.remove('editing');
        }

        // Cierra los menús de etiquetas/arcos si el clic fue fuera de ellos.
        if (menuActivo && 
            !e.target.closest('.menu-etiquetas') && 
            !e.target.closest('.change-tag-btn') && 
            !e.target.closest('.change-arc-btn')) {
                
            menuActivo.remove();
        }
    }, true);
}


document.addEventListener('DOMContentLoaded', () => {
    inicializarInteraccionPersonajes();
    inicializarControlesDeFiltro();
});


// =========================================================================
// FUNCIONES DE IA Y MODALES
// =========================================================================
 
 /**
 * Crea y añade un nuevo elemento de "Dato" al DOM, incluyendo todos los controles, 
 * la funcionalidad completa de los botones y el guardado del embedding.
 * @param {object} personajeData - El objeto con los datos del personaje/dato.
 * @returns {HTMLElement|null} El elemento del DOM creado o null si falla.
 */
function agregarPersonajeDesdeDatos(personajeData = {}) {
    // --- Desestructuración completa con los nuevos campos ---
    const {
        nombre = '',
        descripcion = '',
        promptVisual = '',
        imagen = '',
        etiqueta: etiquetaValor = 'indeterminado',
        arco: arcoValor = 'sin_arco',
        svgContent = '',
        embedding = [] // Valor por defecto es un array vacío
    } = personajeData;

    const lista = document.getElementById('listapersonajes');
    if (!lista) {
        console.error("Error crítico: No se encontró el contenedor de datos con ID '#listapersonajes'.");
        return null;
    }

    const contenedor = document.createElement('div');
    contenedor.className = 'personaje';

    // --- Guardado de datos clave en el dataset del elemento ---
    // --- INICIO DE LA CORRECCIÓN ---
    // Al cargar, 'embedding' es un array. Lo convertimos a un string JSON
    // para que se guarde correctamente en el atributo data- del DOM.
    contenedor.dataset.embedding = JSON.stringify(embedding);
    // --- FIN DE LA CORRECCIÓN ---
    
    contenedor.dataset.descripcion = personajeData.descripcion || '';
    if (svgContent) {
        contenedor.dataset.svgContent = svgContent;
    }

    // --- Creación de Botones de Etiqueta y Arco ---
    const etiquetaBtn = document.createElement('button');
    etiquetaBtn.className = 'change-tag-btn';
    const opcionEtiqueta = opcionesEtiqueta.find(op => op.valor === etiquetaValor) || opcionesEtiqueta[0];
    etiquetaBtn.innerHTML = opcionEtiqueta.emoji;
    etiquetaBtn.title = `Etiqueta: ${opcionEtiqueta.titulo}`;
    etiquetaBtn.dataset.etiqueta = etiquetaValor;
    etiquetaBtn.onclick = () => mostrarMenuEtiquetas(etiquetaBtn);
    contenedor.appendChild(etiquetaBtn);

    const arcoBtn = document.createElement('button');
    arcoBtn.className = 'change-arc-btn';
    arcoBtn.dataset.arco = arcoValor; // Asignar el valor del arco al dataset

    const opcionArco = opcionesArco.find(op => op.valor === arcoValor);

    if (opcionArco) {
        // Si es un arco predefinido, usar su emoji y título
        arcoBtn.innerHTML = opcionArco.emoji;
        arcoBtn.title = `Arco: ${opcionArco.titulo}`;
    } else {
        // Si no se encuentra, es un arco personalizado. Mostrar el texto.
        arcoBtn.innerHTML = arcoValor;
        arcoBtn.title = `Arco: ${arcoValor}`;
    }

    arcoBtn.onclick = () => mostrarMenuArcos(arcoBtn);
    contenedor.appendChild(arcoBtn);


    // --- Creación de la parte Visual (preview) ---
    const visual = document.createElement('div');
    visual.className = 'personaje-visual';
    const img = document.createElement('img');
    const descripcionPreview = document.createElement('div');
    descripcionPreview.className = 'personaje-descripcion-preview';
    visual.appendChild(img);
    visual.appendChild(descripcionPreview);
    contenedor.appendChild(visual);

    // --- Input para el nombre ---
    const cajaNombre = document.createElement('input');
    cajaNombre.type = 'text';
    cajaNombre.className = 'nombreh';
    cajaNombre.value = nombre;
    contenedor.appendChild(cajaNombre);

    // --- Overlay de Edición ---
    const overlay = document.createElement('div');
    overlay.className = 'personaje-edit-overlay';
    const editControls = document.createElement('div');
    editControls.className = 'edit-controls';

    // Contenedor de la imagen de previsualización en el editor
    const previewContainer = document.createElement('div');
    previewContainer.className = 'edit-preview-container';
    const previewImage = document.createElement('img');
    previewImage.className = 'edit-preview-image';
    previewContainer.appendChild(previewImage);
    const editorCanvasEl = document.createElement('canvas');
    editorCanvasEl.className = 'edit-svg-canvas';
    editorCanvasEl.style.display = 'none';
    previewContainer.appendChild(editorCanvasEl);
    editControls.appendChild(previewContainer);

    // Contenedor para los campos de texto y botones
    const textControlsContainer = document.createElement('div');
    textControlsContainer.className = 'edit-text-controls';

    const cajaTexto = document.createElement('textarea');
    cajaTexto.value = descripcion;
    cajaTexto.placeholder = 'Descripción...';
    cajaTexto.className = 'descripcionh';

    const cajaPromptVisual = document.createElement('textarea');
    cajaPromptVisual.value = promptVisual;
    cajaPromptVisual.placeholder = 'Prompt Visual...';
    cajaPromptVisual.className = 'prompt-visualh';

    // --- Wrapper para todos los botones de acción ---
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'edit-buttons-wrapper';

    // Se definen las acciones de los botones como funciones internas
    const generarVectorialNormal = async () => {
        const descripcionPrompt = cajaPromptVisual.value.trim();
        if (!descripcionPrompt) {
            alert("Por favor, escribe una descripción en el 'Prompt Visual' para que la IA pueda generar una imagen.");
            return;
        }
        if (typeof generarImagenDesdePrompt !== 'function') {
            alert("Error: La función de generación de imágenes no está disponible.");
            return;
        }
        botonAccionesImagen.innerHTML = '⚙️';
        botonAccionesImagen.disabled = true;
        try {
            const { imagen, svgContent: nuevoSvg } = await generarImagenDesdePrompt(descripcionPrompt);
            actualizarVisual(imagen, cajaTexto.value);
            contenedor.dataset.svgContent = nuevoSvg;
        } catch (error) {
            alert(`Ocurrió un error al generar la imagen: ${error.message}`);
        } finally {
            botonAccionesImagen.innerHTML = '✨';
            botonAccionesImagen.disabled = false;
        }
    };

    const generarVectorialPro = async () => {
        const userPrompt = cajaPromptVisual.value.trim();
        if (!userPrompt) {
            alert("Por favor, escribe una descripción detallada en el 'Prompt Visual' para generar la imagen superrealista.");
            return;
        }
        if (typeof generarImagenSuperrealistaDesdePrompt !== 'function') {
            alert("Error: La función 'generarImagenSuperrealistaDesdePrompt' no está disponible.");
            return;
        }
        botonAccionesImagen.innerHTML = '⚙️';
        botonAccionesImagen.disabled = true;
        try {
            const resultado = await generarImagenSuperrealistaDesdePrompt(userPrompt);
            actualizarVisual(resultado.imagen, userPrompt);
            contenedor.dataset.svgContent = resultado.svgContent;
        } catch (error) {
            console.error("Error al generar la imagen superrealista:", error);
            alert(`Ocurrió un error: ${error.message}`);
        } finally {
            botonAccionesImagen.innerHTML = '✨';
            botonAccionesImagen.disabled = false;
        }
    };

    const generarVectorialRapida = async () => {
        const userPrompt = cajaPromptVisual.value.trim();
        if (!userPrompt) {
            alert("Por favor, escribe una descripción detallada en el 'Prompt Visual' para generar la imagen.");
            return;
        }
        if (typeof ultras2 !== 'function') {
            alert("Error: La función 'ultras2' no está disponible.");
            return;
        }
        botonAccionesImagen.innerHTML = '⚙️';
        botonAccionesImagen.disabled = true;
        try {
            const resultado = await ultras2(userPrompt);
            actualizarVisual(resultado.imagen, userPrompt);
            contenedor.dataset.svgContent = resultado.svgContent;
        } catch (error) {
            console.error("Error al generar la imagen rapido:", error);
            alert(`Ocurrió un error: ${error.message}`);
        } finally {
            botonAccionesImagen.innerHTML = '✨';
            botonAccionesImagen.disabled = false;
        }
    };

    const generarRealista = async () => {
        const userPrompt = cajaPromptVisual.value.trim();
        if (!userPrompt) {
            alert("Por favor, escribe una descripción detallada en el 'Prompt Visual' para la generación HIPER-ULTRA.");
            return;
        }
        if (typeof ultras !== 'function') {
            alert("Error: La función 'ultras' no está disponible.");
            return;
        }
        botonAccionesImagen.innerHTML = '⚙️';
        botonAccionesImagen.disabled = true;
        try {
            const resultado = await ultras(userPrompt);
            if (resultado && resultado.imagen) {
                actualizarVisual(resultado.imagen, cajaTexto.value);
                delete contenedor.dataset.svgContent;
            } else if (resultado && resultado.error) {
                throw new Error(resultado.error);
            }
        } catch (error) {
            console.error("Error en la generación HIPER-ULTRA:", error);
            alert(`Ocurrió un error en la generación HIPER-ULTRA: ${error.message}`);
        } finally {
            botonAccionesImagen.innerHTML = '✨';
            botonAccionesImagen.disabled = false;
        }
    };

    const mejorarSVG = () => mostrarModalMejora(contenedor);

    const editarSVG = () => {
        const svgActual = contenedor.dataset.svgContent;
        if (!svgActual) {
            alert("No hay un SVG para editar. Genera una imagen primero.");
            return;
        }
        if (typeof fabric === 'undefined') {
            alert("La biblioteca de edición (Fabric.js) no está disponible.");
            return;
        }
        previewImage.style.display = 'none';
        editorCanvasEl.style.display = 'block';
        botonAccionesImagen.style.display = 'none';
        botonGuardarSVG.style.display = 'inline-block';
        fabricEditorCanvas = new fabric.Canvas(editorCanvasEl, {
            width: previewContainer.clientWidth,
            height: previewContainer.clientHeight,
        });
        fabric.loadSVGFromString(svgActual, (objects, options) => {
            const group = fabric.util.groupSVGElements(objects, options);
            group.scaleToWidth(fabricEditorCanvas.width * 0.9);
            group.scaleToHeight(fabricEditorCanvas.height * 0.9);
            fabricEditorCanvas.add(group);
            group.center();
            fabricEditorCanvas.renderAll();
        });
    };

    // Botones que se mantienen fuera del menú
    const botonCargar = document.createElement('button');
    botonCargar.className = 'edit-btn change-image-btn';
    botonCargar.innerHTML = '📷';
    botonCargar.title = 'Cambiar Imagen';
    buttonsWrapper.appendChild(botonCargar);

    // Botón principal que despliega el menú
    const botonAccionesImagen = document.createElement('button');
    botonAccionesImagen.className = 'edit-btn';
    botonAccionesImagen.innerHTML = '✨';
    botonAccionesImagen.title = 'Generar o Editar Imagen';
    buttonsWrapper.appendChild(botonAccionesImagen);

    botonAccionesImagen.onclick = () => {
        const menuExistente = document.querySelector('.menu-acciones-imagen');
        if (menuExistente) menuExistente.remove();

        const menu = document.createElement('div');
        menu.className = 'menu-etiquetas'; // Reutilizamos el estilo de los otros menús

        const opcionesMenu = [
            { texto: 'Vectorial Rápida', emoji: '⚡', action: generarVectorialRapida },
            { texto: 'Vectorial Normal', emoji: '✨', action: generarVectorialNormal },
            { texto: 'Vectorial Pro', emoji: '💎', action: generarVectorialPro },
            { texto: 'Realista', emoji: '😍', action: generarRealista },
            { texto: 'Mejorar SVG', emoji: '📈', action: mejorarSVG },
            { texto: 'Editar SVG', emoji: '✏️', action: editarSVG }
        ];

        opcionesMenu.forEach(op => {
            const item = document.createElement('div');
            item.className = 'item-menu-etiqueta';
            item.innerHTML = `${op.emoji} ${op.texto}`;
            item.onclick = (e) => {
                e.stopPropagation();
                op.action();
                menu.remove();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        const rect = botonAccionesImagen.getBoundingClientRect();
        menu.style.bottom = `50%`;
        menu.style.transform = 'translateY(50%)';
        menu.style.left = `${rect.left + window.scrollX}px`;

        const cerrarMenuHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', cerrarMenuHandler, true);
            }
        };
        setTimeout(() => document.addEventListener('click', cerrarMenuHandler, true), 100);
    };

    // Botón para guardar SVG, inicialmente oculto
    const botonGuardarSVG = document.createElement('button');
    botonGuardarSVG.className = 'edit-btn save-svg-btn';
    botonGuardarSVG.innerHTML = '💾';
    botonGuardarSVG.title = 'Guardar Cambios del SVG';
    botonGuardarSVG.style.display = 'none';
    buttonsWrapper.appendChild(botonGuardarSVG);

    // Botón de eliminar, se mantiene fuera del menú
    const botonEliminar = document.createElement('button');
    botonEliminar.className = 'edit-btn delete-btn';
    botonEliminar.innerHTML = '❌';
    botonEliminar.title = 'Eliminar Dato';
    buttonsWrapper.appendChild(botonEliminar);

    // Añadir elementos al DOM
    textControlsContainer.appendChild(cajaTexto);
    textControlsContainer.appendChild(cajaPromptVisual);
    textControlsContainer.appendChild(buttonsWrapper);
    editControls.appendChild(textControlsContainer);
    overlay.appendChild(editControls);
    contenedor.appendChild(overlay);
    lista.appendChild(contenedor);

    // --- LÓGICA INTERNA Y LISTENERS (FUNCIONALIDAD RESTAURADA) ---
    let fabricEditorCanvas = null;

    const actualizarVisual = (nuevaImagenSrc, nuevaDescripcion) => {
        img.src = nuevaImagenSrc || '';
        descripcionPreview.textContent = nuevaDescripcion;
        img.classList.toggle('hidden', !nuevaImagenSrc || nuevaImagenSrc.endsWith('/'));

        if (previewImage) {
            if (nuevaImagenSrc && !nuevaImagenSrc.endsWith('/')) {
                previewImage.src = nuevaImagenSrc;
                previewImage.style.display = 'block';
            } else {
                previewImage.style.display = 'none';
            }
        }
    };
    
    botonGuardarSVG.onclick = () => {
        if (!fabricEditorCanvas) return;
        const group = new fabric.Group(fabricEditorCanvas.getObjects());
        contenedor.dataset.svgContent = group.toSVG();
        actualizarVisual(group.toDataURL({ format: 'png' }), cajaTexto.value);
        fabricEditorCanvas.dispose();
        fabricEditorCanvas = null;
        editorCanvasEl.style.display = 'none';
        previewImage.style.display = 'block';
        botonGuardarSVG.style.display = 'none';
        botonAccionesImagen.style.display = 'inline-block';
    };

    botonEliminar.onclick = () => {
        if (confirm('¿Estás seguro de que quieres eliminar este dato?')) {
            contenedor.remove();
            actualizarVistaDatos();
        }
    };
    
    cajaTexto.addEventListener('input', () => {
        actualizarVisual(img.src, cajaTexto.value);
    });

    botonCargar.onclick = () => {
        const inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = 'image/*, video/mp4, video/webm, image/gif';
        inputFile.onchange = async (event) => {
            if (event.target.files && event.target.files[0]) {
                const nuevaImagen = await fileToBase64(event.target.files[0]);
                actualizarVisual(nuevaImagen, cajaTexto.value);
                delete contenedor.dataset.svgContent;
            }
        };
        inputFile.click();
    };

    // --- Renderizado Inicial de la Imagen ---
    if (svgContent && !imagen) {
        if (typeof fabric !== 'undefined') {
            const tempCanvasEl = document.createElement('canvas');
            const tempFabricCanvas = new fabric.Canvas(tempCanvasEl, { width: 750, height: 750 });
            fabric.loadSVGFromString(svgContent, (objects, options) => {
                if (!objects || objects.length === 0) {
                    tempFabricCanvas.dispose();
                    return;
                }
                const group = fabric.util.groupSVGElements(objects, options);
                const scaleFactor = Math.min((tempFabricCanvas.width * 0.9) / group.width, (tempFabricCanvas.height * 0.9) / group.height);
                group.scale(scaleFactor).center();
                tempFabricCanvas.add(group).renderAll();
                actualizarVisual(tempFabricCanvas.toDataURL({ format: 'png' }), descripcion);
                tempFabricCanvas.dispose();
            });
        } else {
            actualizarVisual('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent), descripcion);
        }
    } else {
        actualizarVisual(imagen, descripcion);
    }

    return contenedor;
}


/**
 * Inicializa el modal de IA una sola vez, poblando el selector de arcos.
 * Es importante que la variable 'opcionesArco' esté disponible globalmente.
 */
function inicializarModalIA() {
    const select = document.getElementById('ia-arco-select');
    // Se asegura de que el selector exista y no tenga opciones para no duplicarlas.
    if (select && select.options.length === 0) {
        if (typeof opcionesArco !== 'undefined') {
            opcionesArco.forEach(opcion => {
                const optionEl = document.createElement('option');
                optionEl.value = opcion.valor;
                optionEl.textContent = `${opcion.emoji} ${opcion.titulo}`;
                select.appendChild(optionEl);
            });
        } else {
            console.error("Error: La variable 'opcionesArco' no está definida. El selector de arcos no se puede poblar.");
        }
    }
}

// Se ejecuta la inicialización cuando el contenido del DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', inicializarModalIA);


/**
 * Muestra u oculta el campo de texto para el arco personalizado
 * basado en la selección del dropdown.
 * @param {HTMLSelectElement} selectElement - El elemento select que cambió.
 */
function toggleCustomArcoInput(selectElement) {
    const customInput = document.getElementById('ia-arco-custom');
    if (selectElement.value === 'personalizar') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
    }
}

/**
 * Abre el modal de la IA y se asegura de que el selector de arcos
 * esté reseteado a su estado por defecto.
 */
function abrirModalAIDatos() {
    // Asume que tienes un overlay con id 'modal-ia-datos-overlay' que contiene tu modal.
    const modalOverlay = document.getElementById('modal-ia-datos-overlay');
    const select = document.getElementById('ia-arco-select');
    const customInput = document.getElementById('ia-arco-custom');
    
    // Resetea los controles a su estado inicial cada vez que se abre el modal.
    if (select) select.value = 'sin_arco'; // 'sin_arco' es el valor para 'Base'
    if (customInput) {
        customInput.style.display = 'none';
        customInput.value = '';
    }

    if (modalOverlay) modalOverlay.style.display = 'flex';
}


/**
 * Procesa la entrada del usuario utilizando un flujo de IA de múltiples pasos,
 * asignando los datos generados al arco narrativo seleccionado en el modal.
 */
async function procesarEntradaConIA() {
    // --- OBTENER ENTRADA DEL USUARIO (Sin cambios) ---
    const arcoSelect = document.getElementById('ia-arco-select');
    const arcoCustomInput = document.getElementById('ia-arco-custom');
    let arcoSeleccionado = 'sin_arco';

    if (arcoSelect) {
        if (arcoSelect.value === 'personalizar' && arcoCustomInput) {
            arcoSeleccionado = arcoCustomInput.value.trim() || 'sin_arco';
        } else {
            arcoSeleccionado = arcoSelect.value;
        }
    }

    const textoUsuario = document.getElementById('ia-datos-area').value.trim();
    if (!textoUsuario) {
        mostrarError("Por favor, introduce algún texto o instrucción para que la IA trabaje.");
        return;
    }
    cerrarModalAIDatos();
    const chatDiv = window.chatDiv || document.getElementById('chat');
    chatDiv.innerHTML += `<p><strong>Tú:</strong> ${textoUsuario.substring(0, 100)}...</p><p><strong>Silenos:</strong> Entendido. Iniciando análisis inteligente...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    try {
        // --- PASO 1: DETERMINAR LA INTENCIÓN (Router mejorado) ---
        const promptRouter = `
            Analiza la siguiente petición del usuario y clasifícala en una de estas TRES categorías:
            1. "EXTRAER": El usuario ha pegado un texto largo y quiere que extraigas información estructurada de él.
            2. "GENERAR_TEMA": El usuario quiere que generes un conjunto de datos sobre un tema, idea u obra (Ej: "Crea 5 personajes para una historia de ciencia ficción").
            3. "GENERAR_CONCRETO": El usuario pide crear uno o más elementos muy específicos y nombrados (Ej: "Crea un objeto mágico llamado 'La Gema del Ocaso'").

            **Petición del usuario:** "${textoUsuario}"

            Responde ÚNICAMENTE con un objeto JSON con la siguiente estructura:
            { "intencion": "EXTRAER" | "GENERAR_TEMA" | "GENERAR_CONCRETO", "peticion_resumida": "Un resumen de lo que hay que hacer." }
        `;
        const respuestaRouter = await llamarIAConFeedback(promptRouter, "Interpretando tu solicitud...", "gemini-2.5-flash");
        const { intencion, peticion_resumida } = respuestaRouter;

        if (!intencion || !peticion_resumida) {
            throw new Error("La IA no pudo entender la intención de tu petición. Intenta ser más claro.");
        }
        
        chatDiv.innerHTML += `<p><strong>Silenos:</strong> Intención detectada: ${intencion}. Procediendo con el pipeline adecuado...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;

        let datosTextuales = [];

        // --- BIFURCACIÓN DE PIPELINES ---
        if (intencion === 'EXTRAER') {
console.log('extraer');
            datosTextuales = await pipelineExtraccionInteligente(textoUsuario, chatDiv);
        } else if (intencion === 'GENERAR_TEMA' || intencion === 'GENERAR_CONCRETO') {
console.log('generar');
            datosTextuales = await pipelineGeneracionContenido(peticion_resumida, chatDiv);
        } else {
console.log('interaccionar');            throw new Error(`Intención '${intencion}' no reconocida o sin pipeline asignado.`);
        }

        if (!datosTextuales || datosTextuales.length === 0) {
            throw new Error("El pipeline de la IA no devolvió ningún dato estructurado. Revisa el texto de entrada o los logs.");
        }
        
        chatDiv.innerHTML += `<p><strong>Silenos:</strong> Proceso finalizado. Se han obtenido ${datosTextuales.length} perfiles de datos. Creando embeddings para el arco '${arcoSeleccionado}'...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;

        // --- PASO FINAL: GENERAR EMBEDDINGS Y CREAR ELEMENTOS (Lógica sin cambios) ---
        let totalCreados = 0;
        for (const dato of datosTextuales) {
            if (!dato.nombre || !dato.descripcion) continue;

            try {
                const embeddingVector = await generarEmbedding(dato.descripcion);
                const datosCompletos = {
                    ...dato,
                    arco: arcoSeleccionado,
                    embedding: embeddingVector || []
                };
                agregarPersonajeDesdeDatos(datosCompletos);
                totalCreados++;
            } catch (embeddingError) {
                console.error(`Error al generar embedding para "${dato.nombre}":`, embeddingError);
                chatDiv.innerHTML += `<p><strong>Aviso:</strong> No se pudo crear el embedding para "${dato.nombre}". Se creó el dato sin él.</p>`;
                agregarPersonajeDesdeDatos({ ...dato, arco: arcoSeleccionado, embedding: [] });
                totalCreados++;
            }
        }
        
        if (totalCreados > 0) {
            mostrarError(`¡Proceso completado! Se crearon ${totalCreados} datos nuevos en el arco '${arcoSeleccionado}'.`);
            document.getElementById('ia-datos-area').value = '';
            reinicializarFiltrosYActualizarVista();
        } else {
            mostrarError("El proceso finalizó, pero no se pudo crear ningún dato. Revisa el chat para más información.");
        }

    } catch (error) {
        mostrarError("Ocurrió un error al procesar la solicitud con la IA: " + error.message);
        console.error("Error en procesarEntradaConIA:", error);
        chatDiv.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
    } finally {
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}

/**
 * Pipeline de generación de contenido para crear elementos desde cero.
 * @param {string} peticionResumida - La instrucción del usuario resumida por el router.
 * @param {HTMLElement} chatDiv - El elemento del DOM para mostrar el feedback.
 * @returns {Promise<Array<Object>>} - Una promesa que resuelve a un array de objetos de datos estructurados.
 */
async function pipelineGeneracionContenido(peticionResumida, chatDiv) {
    console.log("Pipeline de generación creativa iniciado.");
    chatDiv.innerHTML += `<p><strong>Silenos:</strong> Accediendo al pipeline de generación creativa...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    const etiquetasValidas = opcionesEtiqueta
        .map(o => o.valor)
        .filter(v => v !== 'indeterminado' && v !== 'personalizar')
        .join(', ');

    const promptGeneracion = `
        **Tarea Principal:** Basado en la siguiente solicitud, genera una lista de uno o más datos estructurados de forma creativa.
        **Solicitud del Usuario:** "${peticionResumida}"

        **Instrucciones:**
        - Produce contenido original y detallado que se ajuste a la petición.
        - Para CADA dato generado, proporciona: "nombre", "descripcion" (detallada, para el embedding), "promptVisual" (una descripción para generar una imagen detallada y repetible del dato; si es una persona, detalla con exactitud su morfología, TODOS los rasgos de su cara y su vestimenta), y la "etiqueta" MÁS APROPIADA de la lista [${etiquetasValidas}].

        **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un objeto JSON válido que sea un array de datos. Cada objeto en el array debe tener la estructura completa:
        { "nombre": "...", "descripcion": "...", "promptVisual": "...", "etiqueta": "..." }
    `;
    
    const datosGenerados = await llamarIAConFeedback(promptGeneracion, "Generando contenido creativo...", "gemini-2.5-flash-lite");

    // Aseguramos que la salida sea siempre un array
    if (!Array.isArray(datosGenerados)) {
        if (typeof datosGenerados === 'object' && datosGenerados !== null) {
            return [datosGenerados]; // Si devuelve un solo objeto, lo metemos en un array
        }
        throw new Error("La IA de generación no devolvió un formato de array de objetos válido.");
    }
    
    return datosGenerados;
}

  

/**
 * Pipeline de extracción lineal, diseñado para procesar una llamada a la vez
 * para evitar la saturación de la API. Ideal para APIs con límites de peticiones por minuto.
 * @param {string} textoUsuario - El texto completo proporcionado por el usuario.
 * @param {HTMLElement} chatDiv - El elemento del DOM para mostrar el feedback.
 * @returns {Promise<Array<Object>>} - Una promesa que resuelve a un array de objetos de datos estructurados.
 */
 
 
 
/**
 * --- VERSIÓN MEJORADA CON RENDERIZADO PROGRESIVO ---
 * Este pipeline extrae y RENDERIZA los datos progresivamente para una experiencia de usuario más fluida.
 * NOTA: La firma de la función ha cambiado. Ahora requiere 'arcoSeleccionado' y ya no devuelve un array de datos.
 * La función que llama a este pipeline (`procesarEntradaConIA`) debe ser adaptada para pasarle el arco
 * y ya no procesar el array que esta función devolvía antes.
 *
 * @param {string} textoUsuario - El texto completo proporcionado por el usuario.
 * @param {HTMLElement} chatDiv - El elemento del DOM para mostrar el feedback.
 * @param {string} arcoSeleccionado - El arco narrativo al que se asignarán los nuevos datos.
 * @returns {Promise<number>} - Una promesa que resuelve al número total de datos creados.
 */
async function pipelineExtraccionInteligente(textoUsuario, chatDiv, arcoSeleccionado) {
    let totalCreados = 0;
    
    // Definimos las categorías a procesar. Cada una será una pasada de 2 llamadas.
    const categorias = [
        {
            nombre: "Personajes y Entidades",
            descripcion: "Personajes con nombre, criaturas, animales o seres vivos relevantes en la trama.",
            etiquetaAsociada: "personaje",
            etiquetasSugeridas: "personaje, animal, ser_vivo, mitologia"
        },
        {
            nombre: "Lugares y Ubicaciones",
            descripcion: "Ciudades, edificios, regiones, planetas o cualquier ubicación geográfica o estructural mencionada.",
            etiquetaAsociada: "ubicacion",
            etiquetasSugeridas: "ubicacion, edificio, elemento_geografico"
        },
        {
            nombre: "Objetos y Artefactos",
            descripcion: "Ítems, herramientas, armas, atuendos, comida o cualquier objeto tangible importante.",
            etiquetaAsociada: "objeto",
            etiquetasSugeridas: "objeto, atuendo, comida, transporte, muebles, arte"
        },
        {
            nombre: "Sucesos y Eventos",
            descripcion: "Acontecimientos clave, batallas, ceremonias, momentos históricos o puntos de inflexión en la narrativa.",
            etiquetaAsociada: "evento",
            etiquetasSugeridas: "evento"
        },
        {
            nombre: "Conceptos y Lore",
            descripcion: "Ideas abstractas, reglas del mundo, lore, terminología específica, notas culturales o conceptos visuales importantes.",
            etiquetaAsociada: "concepto",
            etiquetasSugeridas: "concepto, nota, visual"
        }
    ];

    chatDiv.innerHTML += `<p><strong>Silenos:</strong> Iniciando pipeline de extracción por categorías...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    // --- BUCLE PRINCIPAL ---
    for (const [index, categoria] of categorias.entries()) {
        try {
            console.log(`Inicio de fase ${index + 1} de ${categorias.length}`);
            // --- FASE 1: IDENTIFICACIÓN ---
            const pasoActual = index * 2 + 1;
            const totalPasos = categorias.length * 2;
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> [Paso ${pasoActual}/${totalPasos}] Identificando: <strong>${categoria.nombre}</strong>...</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;

            const promptIdentificacion = `
                **Tarea:** Lee el siguiente texto y extrae una lista exhaustiva de todos los "${categoria.descripcion}".
                **Texto:** """${textoUsuario}"""
                **Instrucciones:**
                - Enfócate únicamente en la categoría: ${categoria.nombre}.
                - Devuelve solo los nombres propios o términos específicos.
                - Evita duplicados.
                **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un array de strings en formato JSON.
                **Ejemplo:** ["Nombre 1", "Nombre 2", "Término 3"]
            `;
            
            const listaNombres = await llamarIAConFeedback(promptIdentificacion, `Identificando ${categoria.nombre}...`, "gemini-2.5-flash");

            if (!Array.isArray(listaNombres) || listaNombres.length === 0) {
                chatDiv.innerHTML += `<p><strong>Silenos:</strong> No se encontraron elementos para "${categoria.nombre}". Saltando al siguiente.</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;
                continue; // Si no hay nada, pasamos a la siguiente categoría
            }
            
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> Se encontraron ${listaNombres.length} elemento(s) de tipo "${categoria.nombre}".</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;

            // --- FASE 2: ELABORACIÓN Y RENDERIZADO POR LOTES ---
            const pasoElaboracion = index * 2 + 2;
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> [Paso ${pasoElaboracion}/${totalPasos}] Elaborando detalles para: <strong>${categoria.nombre}</strong>...</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;

            const CHUNK_SIZE = 8; // Procesamos en lotes para evitar errores de 'fetch' por tamaño de request
            
            for (let i = 0; i < listaNombres.length; i += CHUNK_SIZE) {
                console.log(`Procesando lote ${i / CHUNK_SIZE + 1} de ${Math.ceil(listaNombres.length / CHUNK_SIZE)} para "${categoria.nombre}"`);
                const chunk = listaNombres.slice(i, i + CHUNK_SIZE);
                const numLote = (i / CHUNK_SIZE) + 1;
                const totalLotes = Math.ceil(listaNombres.length / CHUNK_SIZE);

                chatDiv.innerHTML += `<p><strong>Silenos:</strong> ...procesando lote ${numLote} de ${totalLotes} para "${categoria.nombre}".</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;

                const promptElaboracion = `
                    **Tarea:** Basado en el texto completo, genera los datos detallados para el siguiente LOTE de entidades de la categoría "${categoria.nombre}".
                    **Texto de Referencia Completo:** """${textoUsuario}"""
                    **Lote de Nombres a Detallar:** ${JSON.stringify(chunk)}

                    **Instrucciones Detalladas:**
                    1.  Para CADA nombre en la lista del lote, crea un objeto JSON con la siguiente estructura:
                        - "nombre": El nombre exacto de la lista.
                        - "descripcion": Un resumen detallado y completo, sintetizando toda la información disponible en el texto sobre ese elemento.
                        - "promptVisual": Una descripción visual muy detallada para una IA generadora de imágenes. Describe con precisión la apariencia, colores, atmósfera, etc.
                        - "etiqueta": Asigna la etiqueta MÁS APROPIADA de la lista [${categoria.etiquetasSugeridas}]. Si dudas, usa "${categoria.etiquetaAsociada}".
                    
                    **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un array de objetos JSON válido. No incluyas texto explicativo.
                `;

                const datosElaboradosChunk = await llamarIAConFeedback(promptElaboracion, `Elaborando ${chunk.length} elemento(s) del lote ${numLote}/${totalLotes}...`, "gemini-2.5-flash-lite");

                if (Array.isArray(datosElaboradosChunk) && datosElaboradosChunk.length > 0) {
                    // --- INICIO DE LA MODIFICACIÓN CLAVE ---
                    // Procesar y renderizar cada dato del lote inmediatamente.
                    for (const dato of datosElaboradosChunk) {
                        if (!dato.nombre || !dato.descripcion) continue;

                        try {
                            // Se asume que generarEmbedding() y agregarPersonajeDesdeDatos() están disponibles en el scope.
                            const embeddingVector = await generarEmbedding(dato.descripcion);
                            const datosCompletos = {
                                ...dato,
                                arco: arcoSeleccionado,
                                embedding: embeddingVector || []
                            };
                            agregarPersonajeDesdeDatos(datosCompletos);
                            totalCreados++;
                        } catch (embeddingError) {
                            console.error(`Error al generar embedding para "${dato.nombre}":`, embeddingError);
                            chatDiv.innerHTML += `<p><strong>Aviso:</strong> No se pudo crear el embedding para "${dato.nombre}". Se creó el dato sin él.</p>`;
                            agregarPersonajeDesdeDatos({ ...dato, arco: arcoSeleccionado, embedding: [] });
                            totalCreados++;
                        }
                    }
                    // Actualizar la vista de filtros después de añadir un lote de datos.
                    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
                        reinicializarFiltrosYActualizarVista();
                    }
                    // --- FIN DE LA MODIFICACIÓN CLAVE ---
                }
            }
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> Se procesaron y mostraron perfiles para "${categoria.nombre}".</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;

        } catch (error) {
            console.error(`Error procesando la categoría "${categoria.nombre}":`, error);
            chatDiv.innerHTML += `<p><strong>Error:</strong> Falló el procesamiento para la categoría "${categoria.nombre}". Continuando con la siguiente.</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
    }

    if (totalCreados === 0) {
        throw new Error("El pipeline finalizó, pero no se pudo extraer ningún dato estructurado. Revisa el texto de entrada.");
    }
    
    chatDiv.innerHTML += `<p><strong>Silenos:</strong> ¡Proceso completado! Se han extraído un total de ${totalCreados} perfiles de datos.</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    return totalCreados;
}



// No olvides la función auxiliar si no la tienes ya definida en el mismo ámbito
function dividirTextoEnUnidades(texto, unidadPrincipal) {
    const regex = new RegExp(`(?=${unidadPrincipal}\\s+\\d+)`, 'gi');
    const fragmentos = texto.split(regex).filter(f => f.trim() !== '');
    return fragmentos.length <= 1 ? [texto] : fragmentos;
}

// Función de utilidad para mostrar errores (reemplaza a 'alert')
function mostrarError(mensaje) {
    // Implementa aquí tu lógica para mostrar un modal o un toast no bloqueante
  console.log('mensaje'); // Muestra el mensaje en la consola
    alert(mensaje); // Mantengo alert como fallback por si no tienes un modal
}




/**
 * Inicializa el modal de IA una sola vez, poblando el selector de arcos.
 * Es importante que la variable 'opcionesArco' esté disponible globalmente.
 */
function inicializarModalIA() {
    const select = document.getElementById('ia-arco-select');
    // Se asegura de que el selector exista y no tenga opciones para no duplicarlas.
    if (select && select.options.length === 0) {
        if (typeof opcionesArco !== 'undefined') {
            opcionesArco.forEach(opcion => {
                const optionEl = document.createElement('option');
                optionEl.value = opcion.valor;
                optionEl.textContent = `${opcion.emoji} ${opcion.titulo}`;
                select.appendChild(optionEl);
            });
        } else {
            console.error("Error: La variable 'opcionesArco' no está definida. El selector de arcos no se puede poblar.");
        }
    }
}

// Se ejecuta la inicialización cuando el contenido del DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', inicializarModalIA);


/**
 * Muestra u oculta el campo de texto para el arco personalizado
 * basado en la selección del dropdown.
 * @param {HTMLSelectElement} selectElement - El elemento select que cambió.
 */
function toggleCustomArcoInput(selectElement) {
    const customInput = document.getElementById('ia-arco-custom');
    if (selectElement.value === 'personalizar') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
    }
}

/**
 * Abre el modal de la IA y se asegura de que el selector de arcos
 * esté reseteado a su estado por defecto.
 */
function abrirModalAIDatos() {
    // Asume que tienes un overlay con id 'modal-ia-datos-overlay' que contiene tu modal.
    const modalOverlay = document.getElementById('modal-ia-datos-overlay');
    const select = document.getElementById('ia-arco-select');
    const customInput = document.getElementById('ia-arco-custom');
    
    // Resetea los controles a su estado inicial cada vez que se abre el modal.
    if (select) select.value = 'sin_arco'; // 'sin_arco' es el valor para 'Base'
    if (customInput) {
        customInput.style.display = 'none';
        customInput.value = '';
    }

    if (modalOverlay) modalOverlay.style.display = 'flex';
}
 




/**
 * --- FUNCIÓN CORREGIDA ---
 * Muestra un modal para que el usuario introduzca un prompt personalizado
 * y mejore el SVG de un personaje. Ya no causa el error de referencia.
 * @param {HTMLElement} personajeDIV - El elemento contenedor del personaje.
 */
function mostrarModalMejora(personajeDIV) {
    const svgContent = personajeDIV.dataset.svgContent;
    const nombrePersonaje = personajeDIV.querySelector("input.nombreh")?.value || 'este personaje';

    const botonGenerarIA = personajeDIV.querySelector('.generate-ai-btn');
    const botonMejorarIA = personajeDIV.querySelector('.improve-ai-btn');
    const botonCargar = personajeDIV.querySelector('.change-image-btn');
    const botonEliminar = personajeDIV.querySelector('.delete-btn');

    if (!svgContent) {
        alert("No se encontró contenido SVG para mejorar en este dato.");
        return;
    }
    if (typeof mejorarImagenDesdeSVG !== 'function') {
        alert("Error: La función 'mejorarImagenDesdeSVG' no está disponible.");
        return;
    }

    if (document.getElementById('improve-modal-overlay')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'improve-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0);
        display: flex; justify-content: center; align-items: center;
        z-index: 2000; transform: translateX(10%);
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        position: relative; background-color: #fff; padding: 30px;
        border-radius: 12px; width: 90%; max-width: 500px;
        display: flex; flex-direction: column;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.17); font-family: sans-serif;
    `;
    modalContent.addEventListener('click', (event) => event.stopPropagation());

    const modalTitle = document.createElement('h1');
    modalTitle.textContent = `Mejorar imagen de ${nombrePersonaje}`;
    modalTitle.style.cssText = 'margin-top: 0; margin-bottom: 20px; color: #333;';

    const closeModal = () => {
        if (modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
        }
    };

    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.onclick = closeModal;
    closeButton.style.cssText = `
        position: absolute; top: 10px; right: 15px; font-size: 30px;
        font-weight: bold; cursor: pointer; color: #888;`;
    
    const promptTextarea = document.createElement('textarea');
    promptTextarea.placeholder = 'Describe cómo quieres mejorar la imagen... (ej: "un estilo más realista", "colores de ciencia ficción", "que parezca un boceto a lápiz")';
    promptTextarea.style.cssText = `
        width: 100%; min-height: 100px; margin-bottom: 20px;
        padding: 10px; border: 1px solid #ccc; border-radius: 5px;
        font-size: 16px; resize: vertical; box-sizing: border-box;`;

    const improveButton = document.createElement('button');
    improveButton.textContent = 'Mejorar con IA';
    improveButton.style.cssText = `
        padding: 12px 20px; border: none; border-radius: 5px;
        background-color: #007bff; color: white; font-size: 16px;
        cursor: pointer; font-weight: bold; transition: background-color 0.2s;`;
    improveButton.onmouseover = () => improveButton.style.backgroundColor = '#0056b3';
    improveButton.onmouseout = () => improveButton.style.backgroundColor = '#007bff';

    improveButton.onclick = async () => {
        const prompt = promptTextarea.value.trim();
        if (!prompt) {
            alert("Por favor, escribe un prompt para la mejora.");
            return;
        }

        improveButton.textContent = 'Mejorando...';
        improveButton.disabled = true;
        
        if (botonMejorarIA) botonMejorarIA.innerHTML = '⚙️';
        if (botonGenerarIA) botonGenerarIA.disabled = true;
        if (botonMejorarIA) botonMejorarIA.disabled = true;
        if (botonCargar) botonCargar.disabled = true;
        if (botonEliminar) botonEliminar.disabled = true;

        try {
            const { imagen, svgContent: svgMejorado } = await mejorarImagenDesdeSVG(svgContent, prompt);
            
            // --- INICIO DE LA CORRECCIÓN ---
            // Lógica replicada de la función inaccesible 'actualizarVisual'
            const img = personajeDIV.querySelector('.personaje-visual img');
            const descripcionPreview = personajeDIV.querySelector('.personaje-descripcion-preview');
            const previewImageInOverlay = personajeDIV.querySelector('.personaje-edit-overlay .edit-preview-image');
            const nuevaDescripcion = personajeDIV.querySelector("textarea").value;

            if (img) {
                img.src = imagen || '';
                img.classList.toggle('hidden', !imagen || imagen.endsWith('/'));
            }
            if (descripcionPreview) {
                descripcionPreview.textContent = nuevaDescripcion;
            }
            if (previewImageInOverlay) {
                if (imagen && !imagen.endsWith('/')) {
                    previewImageInOverlay.src = imagen;
                    previewImageInOverlay.style.display = 'block';
                } else {
                    previewImageInOverlay.style.display = 'none';
                }
            }
            // --- FIN DE LA CORRECCIÓN ---

            personajeDIV.dataset.svgContent = svgMejorado;
            console.log("Mejora completada con éxito.");

        } catch (error) {
            console.error("Error durante la mejora con IA:", error);
            alert(`Ocurrió un error al intentar mejorar la imagen: ${error.message}`);
        } finally {
            if (botonMejorarIA) botonMejorarIA.innerHTML = '📈';
            if (botonGenerarIA) botonGenerarIA.disabled = false;
            if (botonMejorarIA) botonMejorarIA.disabled = false;
            if (botonCargar) botonCargar.disabled = false;
            if (botonEliminar) botonEliminar.disabled = false;
            closeModal();
        }
    };

    modalContent.appendChild(closeButton);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(promptTextarea);
    modalContent.appendChild(improveButton);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    promptTextarea.focus();
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });
}

function agregarBotonEliminarAPersonajes() {
    const personajes = document.querySelectorAll('.personaje');
    personajes.forEach(personajeDiv => {
        if (personajeDiv.querySelector('.eliminar-personaje-btn')) return;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '';
        deleteButton.className = 'eliminar-personaje-btn pro';
        deleteButton.onclick = function(event) {
            event.stopPropagation();
            if (confirm('¿Estás seguro de que quieres eliminar este dato?')) {
                personajeDiv.remove();
            }
        };
        personajeDiv.appendChild(deleteButton);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const selectorBtn = document.getElementById('selector-guion-btn-local');
    const popup = document.getElementById('lista-guiones-popup-local');
    if (selectorBtn && popup) {
        function popularListaGuiones() {
            popup.innerHTML = '';
            // guionLiterarioData is not defined here, assuming it's global from another file
            if (typeof guionLiterarioData !== 'undefined') {
                guionLiterarioData.forEach((capitulo, index) => {
                    const item = document.createElement('button');
                    item.className = 'guion-popup-item-local';
                    item.textContent = capitulo.titulo;
                    item.onclick = () => {
                        mostrarCapituloSeleccionado(index);
                        popup.style.display = 'none';
                    };
                    popup.appendChild(item);
                });
            }
        }
        selectorBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isVisible = popup.style.display === 'block';
            if (!isVisible) {
                popularListaGuiones();
                popup.style.display = 'block';
            } else {
                popup.style.display = 'none';
            }
        });
        document.addEventListener('click', () => {
            if (popup.style.display === 'block') {
                popup.style.display = 'none';
            }
        });
        popup.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
});


// EN: datos.js (AÑADIR ESTA NUEVA FUNCIÓN AL FINAL)

/**
 * Actualiza únicamente la imagen y el svgContent de un personaje existente.
 * @param {string} personajeId - El ID del personaje a actualizar.
 * @param {string} pngUrl - La nueva URL de la imagen PNG.
 * @param {string} svgCode - El nuevo código del SVG.
 */
function actualizarDatosDeImagen(personajeId, pngUrl, svgCode) {
    const index = personajes.findIndex(p => p.id === personajeId);

    if (index !== -1) {
        // Actualiza SOLO los campos de la imagen, no toca nada más.
        personajes[index].imagen = pngUrl;
        personajes[index].svgContent = svgCode;

        // Guarda los cambios en la base de datos.
        guardarDatos();
        console.log(`[DATOS] Imagen y SVG actualizados para el personaje ID: ${personajeId}`);
    } else {
        console.error(`[DATOS] No se encontró el personaje con ID "${personajeId}" para actualizar su imagen.`);
    }
}


// AÑADIR ESTA FUNCIÓN AL FINAL DEL ARCHIVO datos.js

/**
 * Crea un nuevo "Dato" en la sección de Datos para archivar una imagen generada.
 * El dato se asigna automáticamente al arco "Visuales".
 * @param {string} imageUrl - La URL de la imagen (en formato base64 o de otro tipo) a guardar.
 */
function archivarImagenComoDato(imageUrl) {
    if (!imageUrl) return;

    // Prepara la estructura de datos para el nuevo elemento.
    const nuevoDato = {
        // Se le da un nombre único basado en la fecha para poder identificarlo.
        nombre: `Visual - ${new Date().toLocaleString()}`,
        descripcion: ' ',
        promptVisual: '',
        imagen: imageUrl,
        etiqueta: 'indeterminado', // Se le asigna la etiqueta 'visual' por defecto.
        arco: 'visuales',  // Se asigna al arco 'visuales' como se solicitó.
        svgContent: '',
        embedding: []
    };

    // Llama a la función existente para crear el elemento en el DOM.
    agregarPersonajeDesdeDatos(nuevoDato);
    
    // Opcional: Actualiza la vista de filtros para que el nuevo dato aparezca inmediatamente.
    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
        reinicializarFiltrosYActualizarVista();
    }
    
    console.log(`Imagen archivada con éxito en el arco "Visuales".`);
}

// ===================================
// INICIO: Funcionalidad para cargar composición en el editor
// ===================================
// ===================================
// INICIO: Funcionalidad para cargar composición en el editor
// ===================================

/**
 * Procesa la entrada del usuario, dando prioridad al texto pegado en el textarea.
 * Si el textarea está vacío, intenta leer el archivo seleccionado.
 * Luego, renderiza la composición.
 */
function cargarYRenderizarComposicion() {
    const pasteArea = document.getElementById('editor2-json-paste-area');
    const jsonInput = document.getElementById('editor2-json-input');
    const pastedText = pasteArea.value.trim();

    // Prioridad 1: Procesar el texto pegado
    if (pastedText) {
        try {
            const nombres = JSON.parse(pastedText);
            if (!Array.isArray(nombres)) {
                alert("Error: El texto JSON pegado debe ser un array de strings (nombres).");
                return;
            }
            renderizarContenidoEnCarta(nombres);
            pasteArea.value = ''; // Limpiar el área de texto tras el éxito
        } catch (error) {
            console.error("Error al procesar el JSON pegado:", error);
            alert("El texto JSON pegado no es válido o no tiene el formato esperado.");
        }
    } 
    // Prioridad 2: Procesar el archivo cargado
    else if (jsonInput && jsonInput.files && jsonInput.files.length > 0) {
        const file = jsonInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const nombres = JSON.parse(e.target.result);
                if (!Array.isArray(nombres)) {
                    alert("Error: El archivo JSON debe contener un array de strings (nombres).");
                    return;
                }
                renderizarContenidoEnCarta(nombres);
                // Resetear el input de archivo para poder cargar el mismo archivo de nuevo
                jsonInput.value = ''; 
            } catch (error) {
                console.error("Error al procesar el archivo JSON:", error);
                alert("El archivo JSON no es válido o no tiene el formato esperado.");
            }
        };
        
        reader.onerror = function() {
            alert("Ocurrió un error al leer el archivo.");
        };
        
        reader.readAsText(file);
    } 
    // Si no hay ninguna entrada
    else {
        alert("Por favor, pega el texto JSON o selecciona un archivo para cargar.");
    }
}
 
 
/**
 * -- VERSIÓN 5 (CORREGIDA) --
 * Renderiza contenido editable con una barra de herramientas completa, usando las variables correctas.
 * @param {string[]} nombres - Un array de nombres para renderizar.
 */
function renderizarContenidoEnCarta(nombres) {
    const cartaDiv = document.getElementById('carta');
    const listaPersonajesDiv = document.getElementById('listapersonajes');

    if (!cartaDiv || !listaPersonajesDiv) {
        console.error("Error: No se encontraron los contenedores #carta o #listapersonajes.");
        return;
    }

    cartaDiv.innerHTML = '';

    const datosMap = new Map();
    const todosLosDatos = listaPersonajesDiv.querySelectorAll('.personaje');
    todosLosDatos.forEach(datoEl => {
        const nombreInput = datoEl.querySelector('.nombreh');
        if (nombreInput && nombreInput.value) {
            datosMap.set(nombreInput.value.trim(), datoEl);
        }
    });

    nombres.forEach(nombre => {
        const datoEl = datosMap.get(nombre);
        const itemContainer = document.createElement('div');
        itemContainer.className = 'carta-item border-b py-4 last:border-b-0';

        if (datoEl) {
            // --- INICIO: BARRA DE HERRAMIENTAS ---
            const toolbar = document.createElement('div');
            // Aquí puedes añadir la clase que quieras para la barra, ej: toolbar.className = 'mi-toolbar-css';

            // Botón para cambiar la imagen
            const cambiarImagenBtn = document.createElement('button');
            cambiarImagenBtn.textContent = '🖼️';
            cambiarImagenBtn.title = 'Cambiar o añadir imagen';
            // <-- CORRECCIÓN: Usar 'nombre' en lugar de 'nombreNuevoDato'
            cambiarImagenBtn.dataset.nombreOriginal = nombre;
            cambiarImagenBtn.onclick = (e) => cambiarImagenDesdeEditor(e.target);
            toolbar.appendChild(cambiarImagenBtn);
            
            // Botón para AÑADIR un nuevo dato debajo
            const agregarDatoBtn = document.createElement('button');
            agregarDatoBtn.textContent = '➕';
            agregarDatoBtn.title = 'Añadir nuevo dato debajo';
            agregarDatoBtn.onclick = (e) => agregarDatoDesdeEditor(e.target);
            toolbar.appendChild(agregarDatoBtn);

            // Botón para ELIMINAR este dato
            const eliminarDatoBtn = document.createElement('button');
            eliminarDatoBtn.textContent = '❌';
            eliminarDatoBtn.title = 'Eliminar este dato';
            // <-- CORRECCIÓN: Usar 'nombre' en lugar de 'nombreNuevoDato'
            eliminarDatoBtn.dataset.nombreOriginal = nombre;
            eliminarDatoBtn.onclick = (e) => eliminarDatoDesdeEditor(e.target);
            toolbar.appendChild(eliminarDatoBtn);

            itemContainer.appendChild(toolbar);
            // --- FIN: BARRA DE HERRAMIENTAS ---

            const imgSrc = datoEl.querySelector('.personaje-visual img')?.src;
            const descripcion = datoEl.querySelector('.descripcionh')?.value;
            
            if (imgSrc && !imgSrc.endsWith('/')) {
                const imgElement = document.createElement('img');
                imgElement.src = imgSrc;
                imgElement.alt = `Imagen de ${nombre}`;
                imgElement.className = "w-full object-cover rounded-lg mb-2";
                itemContainer.appendChild(imgElement);
            }

            if (descripcion !== undefined) {
                const descTextarea = document.createElement('textarea');
                descTextarea.value = descripcion;
                descTextarea.className = "text-gray-700 w-full p-2 border border-gray-300 rounded-md";
                descTextarea.rows = 5;
                descTextarea.dataset.nombreOriginal = nombre; 
                descTextarea.onblur = (e) => actualizarDatoOriginal(e.target);
                itemContainer.appendChild(descTextarea);
            }

        } else {
            const notFoundElement = document.createElement('p');
            notFoundElement.textContent = `Dato no encontrado: "${nombre}"`;
            notFoundElement.className = "text-red-500 font-semibold";
            itemContainer.appendChild(notFoundElement);
        }
        
        if (itemContainer.hasChildNodes()) {
            cartaDiv.appendChild(itemContainer);
        }
    });
}
// Event listener para inicializar la funcionalidad cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const loadBtn = document.getElementById('editor2-load-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', cargarYRenderizarComposicion);
    }
});
/**
 * --- FUNCIÓN FALTANTE ---
 * Actualiza la descripción del dato original en la sección "Datos", asegurando
 * que el cambio se guarde en el atributo 'data-descripcion' del elemento principal.
 * @param {HTMLTextAreaElement} textareaEditado - El textarea que se acaba de modificar en el editor.
 */
function actualizarDatoOriginal(textareaEditado) {
    const nombreOriginal = textareaEditado.dataset.nombreOriginal;
    const nuevaDescripcion = textareaEditado.value;

    // Buscar el elemento .personaje original en la sección de Datos
    let datoOriginalEncontrado = null;
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
    
    for (const datoEl of todosLosDatos) {
        if (datoEl.querySelector('.nombreh')?.value.trim() === nombreOriginal) {
            datoOriginalEncontrado = datoEl;
            break; // Detener la búsqueda al encontrarlo
        }
    }

    if (datoOriginalEncontrado) {
        // 1. Actualizar el textarea de la capa de edición interna
        const descripcionTextareaInterna = datoOriginalEncontrado.querySelector('textarea.descripcionh');
        if (descripcionTextareaInterna) {
            descripcionTextareaInterna.value = nuevaDescripcion;
        }

        // 2. ¡CORRECCIÓN CLAVE! Actualizar el atributo de datos principal.
        // Esta es la "fuente de la verdad" para la aplicación.
        datoOriginalEncontrado.dataset.descripcion = nuevaDescripcion;

        // 3. Actualizar la previsualización de la descripción (visible cuando no se edita)
        const descripcionPreview = datoOriginalEncontrado.querySelector('.personaje-descripcion-preview');
        if (descripcionPreview) {
            descripcionPreview.textContent = nuevaDescripcion;
        }

        // Confirmación visual para el usuario de que se guardó
        textareaEditado.style.transition = 'border-color 0.3s ease-in-out';
        textareaEditado.style.borderColor = '#10B981'; // Verde
        console.log(`Dato '${nombreOriginal}' actualizado con éxito.`);
        setTimeout(() => {
            textareaEditado.style.borderColor = '#D1D5DB'; // Color gris por defecto
        }, 2000);

    } else {
        // Aviso visual en caso de error
        textareaEditado.style.borderColor = '#EF4444'; // Rojo
        console.error(`No se pudo encontrar el dato original "${nombreOriginal}" para actualizar.`);
    }
}

 
/**
 * --- VERSIÓN CORREGIDA Y MEJORADA ---
 * Cambia la imagen de un dato, creando el elemento <img> si no existe.
 * Actualiza la imagen en todas las vistas (Editor, Datos-preview, Datos-edición)
 * y se asegura de que todas sean visibles.
 * @param {HTMLButtonElement} boton - El botón "Cambiar Imagen" que fue presionado.
 */
function cambiarImagenDesdeEditor(boton) {
    const nombreOriginal = boton.dataset.nombreOriginal;

    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*';
    
    inputFile.onchange = async (evento) => {
        if (!evento.target.files || evento.target.files.length === 0) return;

        const archivo = evento.target.files[0];
        const nuevaImagenSrc = await fileToBase64(archivo);

        let datoOriginalEncontrado = null;
        const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
        for (const datoEl of todosLosDatos) {
            if (datoEl.querySelector('.nombreh')?.value.trim() === nombreOriginal) {
                datoOriginalEncontrado = datoEl;
                break;
            }
        }
        
        if (datoOriginalEncontrado) {
            // --- INICIO DE LA CORRECCIÓN ---

            // 1. Actualizar la imagen en la vista del Editor (`#carta`)
            const itemContainer = boton.parentElement;
            let imgEnEditor = itemContainer.querySelector('img');

            // Si no había imagen en el editor, la creamos ahora
            if (!imgEnEditor) {
                imgEnEditor = document.createElement('img');
                imgEnEditor.alt = `Imagen de ${nombreOriginal}`;
                imgEnEditor.className = "w-full object-cover rounded-lg mb-2";
                // Insertamos la nueva imagen justo después del botón
                boton.after(imgEnEditor);
            }
            imgEnEditor.src = nuevaImagenSrc;

            // 2. Actualizar la imagen en la vista principal de Datos (`.personaje-visual`)
            const imgEnDatosPreview = datoOriginalEncontrado.querySelector('.personaje-visual img');
            if (imgEnDatosPreview) {
                imgEnDatosPreview.src = nuevaImagenSrc;
                imgEnDatosPreview.classList.remove('hidden'); // <-- Hacemos que sea visible
            }

            // 3. Actualizar la imagen en la capa de edición de Datos (`.edit-preview-image`)
            const imgEnDatosEdit = datoOriginalEncontrado.querySelector('.edit-preview-image');
            if (imgEnDatosEdit) {
                imgEnDatosEdit.src = nuevaImagenSrc;
                imgEnDatosEdit.style.display = 'block'; // <-- Hacemos que sea visible
            }
            
            // --- FIN DE LA CORRECCIÓN ---
            
            delete datoOriginalEncontrado.dataset.svgContent;
            console.log(`Imagen del dato '${nombreOriginal}' actualizada correctamente en todas las vistas.`);
        }
    };
    
    inputFile.click();
}
/**
 * Crea un nuevo dato en la sección 'Datos' y lo inserta en la vista
 * del 'Editor' justo debajo del elemento desde donde se llamó.
 * @param {HTMLButtonElement} boton - El botón 'Añadir' que fue presionado.
 */
function agregarDatoDesdeEditor(boton) {
    // 1. Crear el nuevo dato en la sección "Datos"
    const datosNuevoPersonaje = {
        nombre: `Nuevo Dato - ${Date.now()}`,
        descripcion: '',
        etiqueta: 'indeterminado',
        arco: 'libro'
    };
    // Reutilizamos la función que ya sabe cómo crear un dato en el DOM
    const nuevoDatoElemento = agregarPersonajeDesdeDatos(datosNuevoPersonaje);
    
    if (!nuevoDatoElemento) {
        alert("Hubo un error al crear el nuevo dato.");
        return;
    }

    // 2. Crear la vista para este nuevo dato en el "Editor"
    const nombreNuevoDato = datosNuevoPersonaje.nombre;
    const itemContainerActual = boton.closest('.carta-item');
    const nuevoItemContainer = document.createElement('div');
    nuevoItemContainer.className = 'carta-item border-b py-4 last:border-b-0';

    // (Recreamos la lógica de renderizado para este nuevo elemento)
    const toolbar = document.createElement('div');
    
    const cambiarImagenBtn = document.createElement('button');
    cambiarImagenBtn.textContent = '🖼️';
    cambiarImagenBtn.title = 'Cambiar o añadir imagen';
    cambiarImagenBtn.dataset.nombreOriginal = nombreNuevoDato;
    cambiarImagenBtn.onclick = (e) => cambiarImagenDesdeEditor(e.target);
    toolbar.appendChild(cambiarImagenBtn);

    const agregarDatoBtn = document.createElement('button');
    agregarDatoBtn.textContent = '➕';
    agregarDatoBtn.title = 'Añadir nuevo dato debajo';
    agregarDatoBtn.onclick = (e) => agregarDatoDesdeEditor(e.target);
    toolbar.appendChild(agregarDatoBtn);

    const eliminarDatoBtn = document.createElement('button');
    eliminarDatoBtn.textContent = '❌';
    eliminarDatoBtn.title = 'Eliminar este dato';
    eliminarDatoBtn.dataset.nombreOriginal = nombreNuevoDato;
    eliminarDatoBtn.onclick = (e) => eliminarDatoDesdeEditor(e.target);
    toolbar.appendChild(eliminarDatoBtn);
    
    const descTextarea = document.createElement('textarea');
    descTextarea.className = "text-gray-700 w-full p-2 border border-gray-300 rounded-md";
    descTextarea.rows = 5;
    descTextarea.dataset.nombreOriginal = nombreNuevoDato; 
    descTextarea.onblur = (e) => actualizarDatoOriginal(e.target);

    nuevoItemContainer.appendChild(toolbar);
    nuevoItemContainer.appendChild(descTextarea);
    
    // 3. Insertar el nuevo elemento en la posición correcta
    itemContainerActual.after(nuevoItemContainer);
    
    console.log(`Nuevo dato "${nombreNuevoDato}" creado y añadido al editor.`);
}


/**
 * Elimina un dato tanto de la sección 'Datos' como de la vista del 'Editor'.
 * Pide confirmación antes de proceder.
 * @param {HTMLButtonElement} boton - El botón 'Eliminar' que fue presionado.
 */
function eliminarDatoDesdeEditor(boton) {
    if (!confirm('¿Estás seguro de que quieres eliminar este dato permanentemente? Esta acción no se puede deshacer.')) {
        return;
    }

    const nombreOriginal = boton.dataset.nombreOriginal;
    const itemContainerEditor = boton.closest('.carta-item');

    // 1. Eliminar de la vista del Editor
    if (itemContainerEditor) {
        itemContainerEditor.remove();
    }

    // 2. Eliminar de la sección de Datos
    let datoOriginalEncontrado = null;
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
    for (const datoEl of todosLosDatos) {
        if (datoEl.querySelector('.nombreh')?.value.trim() === nombreOriginal) {
            datoOriginalEncontrado = datoEl;
            break;
        }
    }

    if (datoOriginalEncontrado) {
        datoOriginalEncontrado.remove();
        console.log(`Dato "${nombreOriginal}" eliminado con éxito.`);
    } else {
        console.warn(`No se encontró el dato original "${nombreOriginal}" para eliminarlo de la sección de Datos.`);
    }
}
// ===================================
// FIN: Funcionalidad para cargar composición en el editor
// ===================================


// EN: datos.js -> Reemplaza la función existente por esta

/**
 * Crea un nuevo "Dato" para una receta y lo añade a la lista #listapersonajes.
 * No guarda en memoria persistente, solo crea el elemento en la interfaz.
 * @param {string} nombre - El nombre completo de la receta (ej. "Receta - Mi Composición").
 * @param {string} jsonComposicion - El string JSON que representa la composición.
 */
// EN: datos.js -> MODIFICA esta función

function archivarReceta(nombre, jsonComposicion) {
    const nuevoDato = {
        nombre: nombre,
        descripcion: 'Esta es una composición guardada.',
        promptVisual: jsonComposicion,
        imagen: '',
        etiqueta: 'nota',
        arco: 'sin_arco',
        svgContent: '',
        embedding: []
    };

    if (typeof agregarPersonajeDesdeDatos === 'function') {
        agregarPersonajeDesdeDatos(nuevoDato);
    } else {
        return;
    }

    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
        reinicializarFiltrosYActualizarVista();
    }
    
    // --- IMPORTANTE ---
    // Asegúrate de que aquí NO haya una llamada a 'actualizarListaRecetas()'.
    // La hemos eliminado para que no se actualice automáticamente.

    alert(`Composición "${nombre}" creada.`);
}


// EN: datos.js -> REEMPLAZA esta función

/**
 * --- VERSIÓN CORREGIDA Y ROBUSTA ---
 * Obtiene la lista de nombres de todas las recetas guardadas, buscando SIEMPRE
 * en los elementos del DOM, que es la fuente de verdad de lo que se muestra.
 * @returns {string[]} Un array con los nombres de las recetas encontradas.
 */
function obtenerNombresRecetas() {
    const nombres = [];
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje'); // Busca todos los datos en la lista

    todosLosDatos.forEach(datoEl => {
        const nombreInput = datoEl.querySelector('.nombreh');
        // Si el dato tiene un nombre y empieza con "Receta - ", lo añadimos
        if (nombreInput && nombreInput.value.startsWith('Receta - ')) {
            nombres.push(nombreInput.value);
        }
    });
    
    console.log(`Búsqueda de recetas finalizada. Encontradas: ${nombres.length}`);
    return nombres;
}

/**
 * Obtiene el JSON de la composición de una receta por su nombre.
 * @param {string} nombreReceta - El nombre de la receta a buscar.
 * @returns {string|null} El JSON de la composición o null si no se encuentra.
 */
function obtenerRecetaPorNombre(nombreReceta) {
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');

    for (const datoEl of todosLosDatos) {
        const nombreInput = datoEl.querySelector('.nombreh');
        if (nombreInput && nombreInput.value === nombreReceta) {
            const promptVisualArea = datoEl.querySelector('.prompt-visualh');
            if (promptVisualArea) {
                return promptVisualArea.value;
            }
        }
    }
    return null;
}
/**
 * Agrega un nuevo dato (como una receta) a la lista y lo guarda en la memoria.
 * A diferencia de agregarDato(), esta función recibe un objeto de dato ya construido.
 * @param {object} nuevoDato - El objeto de dato a agregar (debe tener nombre, tipo, etc.).
 */
function agregarNuevoDato(nuevoDato) {
    if (!nuevoDato || typeof nuevoDato !== 'object' || !nuevoDato.nombre) {
        console.error("Error: Se intentó agregar un dato inválido.", nuevoDato);
        return;
    }

    // 1. Asegura que el nuevo dato tenga un ID único.
    if (!nuevoDato.id) {
        nuevoDato.id = 'dato_' + Date.now();
    }

    // 2. Crea el elemento HTML para el nuevo dato usando la función que ya tienes.
    const elemento = crearElementoDato(nuevoDato);
    const lista = document.getElementById('listapersonajes');
    
    if (lista) {
        // 3. Añade el nuevo elemento al principio de la lista en la interfaz.
        lista.prepend(elemento); 
        inicializarEventListenersDato(elemento); // Asegura que los botones del nuevo elemento funcionen.
    } else {
        console.error("Error: No se encontró el contenedor '#listapersonajes' en el DOM.");
        return; // Detiene la ejecución si no se puede mostrar el dato.
    }
    
    // 4. Llama a la función existente para guardar el estado actualizado en localStorage.
    guardarDatos();
    console.log(`Dato '${nuevoDato.nombre}' agregado y guardado correctamente.`);
}