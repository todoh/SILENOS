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
    contenedor.dataset.embedding = JSON.stringify(embedding);
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

    // --- INICIO DE LA CORRECCIÓN ---
    // Comprobar si el arco es uno de los predefinidos
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
    // --- FIN DE LA CORRECCIÓN ---

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

    // --- INICIO DE LA MODIFICACIÓN: Lógica de botones unificada ---

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
    botonCargar.innerHTML = '�';
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

    // --- FIN DE LA MODIFICACIÓN ---

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

    // La lógica de los botones ya está definida arriba y se asigna en el menú
    
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
    // --- NUEVO: Obtener el arco seleccionado del modal ---
    const arcoSelect = document.getElementById('ia-arco-select');
    const arcoCustomInput = document.getElementById('ia-arco-custom');
    let arcoSeleccionado = 'sin_arco'; // Valor por defecto

    if (arcoSelect) {
        if (arcoSelect.value === 'personalizar' && arcoCustomInput) {
            // Si se elige 'personalizar', usa el valor del input, o el por defecto si está vacío.
            arcoSeleccionado = arcoCustomInput.value.trim() || 'sin_arco';
        } else {
            arcoSeleccionado = arcoSelect.value;
        }
    }
    // --- FIN DE LA MODIFICACIÓN ---

    const textoUsuario = document.getElementById('ia-datos-area').value.trim();
    if (!textoUsuario) {
        alert("Por favor, introduce algún texto o instrucción para que la IA trabaje.");
        return;
    }
    cerrarModalAIDatos();
    const chatDiv = window.chatDiv || document.getElementById('chat');
    chatDiv.innerHTML += `<p><strong>Tú:</strong> ${textoUsuario}</p><p><strong>Silenos:</strong> Entendido. Analizando tu petición...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    try {
        // --- PASO 1: Determinar la intención del usuario ---
        const promptRouter = `
            Analiza la siguiente petición del usuario y clasifícala en una de estas tres categorías:
            1. "EXTRAER": El usuario ha pegado un texto largo y quiere que extraigas información estructurada de él.
            2. "GENERAR_TEMA": El usuario quiere que generes un conjunto de datos sobre un tema, idea u obra. (Ej: "Crea personajes para una historia de detectives").
            3. "GENERAR_CONCRETO": El usuario pide crear uno o más elementos muy específicos. (Ej: "Crea un objeto mágico llamado 'La Gema del Ocaso'").

            **Petición del usuario:** "${textoUsuario}"

            Responde ÚNICAMENTE con un objeto JSON con la siguiente estructura:
            { "intencion": "EXTRAER" | "GENERAR_TEMA" | "GENERAR_CONCRETO", "peticion_resumida": "Un resumen de lo que hay que hacer." }
        `;

        const respuestaRouter = await llamarIAConFeedback(promptRouter, "Interpretando tu solicitud...", "gemini-2.0-flash-lite");
        const { intencion, peticion_resumida } = respuestaRouter;

        if (!intencion || !peticion_resumida) {
            throw new Error("La IA no pudo entender la intención de tu petición. Intenta ser más claro.");
        }
        
        chatDiv.innerHTML += `<p><strong>Silenos:</strong> Intención detectada: ${intencion}. Manos a la obra...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;

        // --- PASO 2: Generar los datos textuales ---
        const etiquetasValidas = opcionesEtiqueta
            .map(o => o.valor)
            .filter(v => v !== 'indeterminado' && v !== 'personalizar')
            .join(', ');

        const promptGeneracionDatos = `
            **Tarea Principal:** Basado en la siguiente solicitud, genera una lista de datos estructurados.
            **Solicitud:** "${peticion_resumida}"
            
            **Instrucciones Adicionales:**
            - Si la solicitud es EXTRAER, basa tu respuesta únicamente en el texto original proporcionado por el usuario.
            - Si es GENERAR, sé creativo y produce contenido original que se ajuste a la petición.
            - Para CADA dato generado, proporciona: "nombre", "descripcion" (detallada, para el embedding), "promptVisual" (una descripción para generar una imagen), y la "etiqueta" MÁS APROPIADA de [${etiquetasValidas}].

            **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un objeto JSON válido que sea un array de datos. Cada objeto en el array debe tener la estructura completa: 
            { "nombre": "...", "descripcion": "...", "promptVisual": "...", "etiqueta": "..." }
        `;

        const datosTextuales = await llamarIAConFeedback(promptGeneracionDatos, "Generando información...", "gemini-2.5-flash-lite");

        if (!Array.isArray(datosTextuales) || datosTextuales.length === 0) {
             throw new Error("La IA no devolvió datos estructurados. La respuesta puede estar en el chat.");
        }
        
        chatDiv.innerHTML += `<p><strong>Silenos:</strong> Se han generado ${datosTextuales.length} perfiles de datos. Creando embeddings para el arco '${arcoSeleccionado}'...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;

        // --- PASO 3: Generar embeddings y crear los elementos en el DOM ---
        let totalCreados = 0;
        for (const dato of datosTextuales) {
            if (!dato.nombre || !dato.descripcion) continue;

            try {
                const embeddingVector = await generarEmbedding(dato.descripcion);

                // --- PASO 3b: Crear el elemento con toda la información ---
                const datosCompletos = {
                    ...dato,
                    arco: arcoSeleccionado, // Usar el arco seleccionado del modal
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
            alert(`¡Proceso completado! Se crearon ${totalCreados} datos nuevos en el arco '${arcoSeleccionado}'.`);
            document.getElementById('ia-datos-area').value = '';
            reinicializarFiltrosYActualizarVista();
        } else {
            alert("El proceso finalizó, pero no se pudo crear ningún dato. Revisa el chat para más información.");
        }

    } catch (error) {
        alert("Ocurrió un error al procesar la solicitud con la IA: " + error.message);
        console.error("Error en procesarEntradaConIA:", error);
        chatDiv.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
    } finally {
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }
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
    // --- NUEVO: Obtener el arco seleccionado del modal ---
    const arcoSelect = document.getElementById('ia-arco-select');
    const arcoCustomInput = document.getElementById('ia-arco-custom');
    let arcoSeleccionado = 'sin_arco'; // Valor por defecto

    if (arcoSelect) {
        if (arcoSelect.value === 'personalizar' && arcoCustomInput) {
            // Si se elige 'personalizar', usa el valor del input, o el por defecto si está vacío.
            arcoSeleccionado = arcoCustomInput.value.trim() || 'sin_arco';
        } else {
            arcoSeleccionado = arcoSelect.value;
        }
    }
    // --- FIN DE LA MODIFICACIÓN ---

    const textoUsuario = document.getElementById('ia-datos-area').value.trim();
    if (!textoUsuario) {
        alert("Por favor, introduce algún texto o instrucción para que la IA trabaje.");
        return;
    }
    cerrarModalAIDatos();
    const chatDiv = window.chatDiv || document.getElementById('chat');
    chatDiv.innerHTML += `<p><strong>Tú:</strong> ${textoUsuario}</p><p><strong>Silenos:</strong> Entendido. Analizando tu petición...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    try {
        // --- PASO 1: Determinar la intención del usuario ---
        const promptRouter = `
            Analiza la siguiente petición del usuario y clasifícala en una de estas tres categorías:
            1. "EXTRAER": El usuario ha pegado un texto largo y quiere que extraigas información estructurada de él.
            2. "GENERAR_TEMA": El usuario quiere que generes un conjunto de datos sobre un tema, idea u obra. (Ej: "Crea personajes para una historia de detectives").
            3. "GENERAR_CONCRETO": El usuario pide crear uno o más elementos muy específicos. (Ej: "Crea un objeto mágico llamado 'La Gema del Ocaso'").

            **Petición del usuario:** "${textoUsuario}"

            Responde ÚNICAMENTE con un objeto JSON con la siguiente estructura:
            { "intencion": "EXTRAER" | "GENERAR_TEMA" | "GENERAR_CONCRETO", "peticion_resumida": "Un resumen de lo que hay que hacer." }
        `;

        const respuestaRouter = await llamarIAConFeedback(promptRouter, "Interpretando tu solicitud...", "gemini-2.0-flash-lite");
        const { intencion, peticion_resumida } = respuestaRouter;

        if (!intencion || !peticion_resumida) {
            throw new Error("La IA no pudo entender la intención de tu petición. Intenta ser más claro.");
        }
        
        chatDiv.innerHTML += `<p><strong>Silenos:</strong> Intención detectada: ${intencion}. Manos a la obra...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;

        // --- PASO 2: Generar los datos textuales ---
        const etiquetasValidas = opcionesEtiqueta
            .map(o => o.valor)
            .filter(v => v !== 'indeterminado' && v !== 'personalizar')
            .join(', ');

        const promptGeneracionDatos = `
            **Tarea Principal:** Basado en la siguiente solicitud, genera una lista de datos estructurados.
            **Solicitud:** "${peticion_resumida}"
            
            **Instrucciones Adicionales:**
            - Si la solicitud es EXTRAER, basa tu respuesta únicamente en el texto original proporcionado por el usuario.
            - Si es GENERAR, sé creativo y produce contenido original que se ajuste a la petición.
            - Para CADA dato generado, proporciona: "nombre", "descripcion" (detallada, para el embedding), "promptVisual" (una descripción para generar una imagen), y la "etiqueta" MÁS APROPIADA de [${etiquetasValidas}].

            **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un objeto JSON válido que sea un array de datos. Cada objeto en el array debe tener la estructura completa: 
            { "nombre": "...", "descripcion": "...", "promptVisual": "...", "etiqueta": "..." }
        `;

        const datosTextuales = await llamarIAConFeedback(promptGeneracionDatos, "Generando información...", "gemini-2.5-flash-lite");

        if (!Array.isArray(datosTextuales) || datosTextuales.length === 0) {
             throw new Error("La IA no devolvió datos estructurados. La respuesta puede estar en el chat.");
        }
        
        chatDiv.innerHTML += `<p><strong>Silenos:</strong> Se han generado ${datosTextuales.length} perfiles de datos. Creando embeddings para el arco '${arcoSeleccionado}'...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;

        // --- PASO 3: Generar embeddings y crear los elementos en el DOM ---
        let totalCreados = 0;
        for (const dato of datosTextuales) {
            if (!dato.nombre || !dato.descripcion) continue;

            try {
                const embeddingVector = await generarEmbedding(dato.descripcion);

                // --- PASO 3b: Crear el elemento con toda la información ---
                const datosCompletos = {
                    ...dato,
                    arco: arcoSeleccionado, // Usar el arco seleccionado del modal
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
            alert(`¡Proceso completado! Se crearon ${totalCreados} datos nuevos en el arco '${arcoSeleccionado}'.`);
            document.getElementById('ia-datos-area').value = '';
            reinicializarFiltrosYActualizarVista();
        } else {
            alert("El proceso finalizó, pero no se pudo crear ningún dato. Revisa el chat para más información.");
        }

    } catch (error) {
        alert("Ocurrió un error al procesar la solicitud con la IA: " + error.message);
        console.error("Error en procesarEntradaConIA:", error);
        chatDiv.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
    } finally {
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}




async function procesarEntradaConIACOPIASEGURIDADS() {
    const textoUsuario = document.getElementById('ia-datos-area').value.trim();
    if (!textoUsuario) {
        alert("Por favor, introduce algún texto para analizar.");
        return;
    }
    cerrarModalAIDatos();
    const chatDiv = window.chatDiv || document.getElementById('chat');
    chatDiv.innerHTML += `<p><strong>Tú:</strong> ${textoUsuario}</p><p><strong>Silenos:</strong> Analizando entrada...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    try {
        // Lógica para importar desde JSON crudo
        if (textoUsuario.startsWith('[') || textoUsuario.startsWith('{')) {
            try {
                const datosJson = JSON.parse(textoUsuario);
                const datosArray = Array.isArray(datosJson) ? datosJson : [datosJson];
                
                datosArray.forEach(dato => agregarPersonajeDesdeDatos(dato));
                
                alert(`¡Éxito! Se importaron ${datosArray.length} dato(s) desde el JSON.`);
                reinicializarFiltrosYActualizarVista();
                document.getElementById('ia-datos-area').value = '';
                if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
                return;

            } catch (jsonError) {
                chatDiv.innerHTML += `<p><strong>Info:</strong> El texto parece JSON pero no es válido. Intentando corregir con IA...</p>`;
            }
        }

        // Paso 1: Identificar categorías
        const promptCategorias = `
            **Contexto:** Voy a darte un texto, posiblemente largo y denso como un artículo de enciclopedia. Tu tarea es actuar como un asistente de investigación para extraer la información más importante y estructurarla.
            **Texto a Analizar:** "${textoUsuario}"
            **Instrucciones:**
            1.  **Análisis Interno (No lo incluyas en el JSON final):** Lee el texto e identifica los temas principales. Piensa en cómo agruparías la información de forma lógica.
            2.  **Tarea Principal:** Basado en tu análisis, crea una lista de nombres de categorías para clasificar los datos.
            **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un objeto JSON con la estructura: { "categorias_identificadas": ["Categoría 1", "Categoría 2"] }`;
        
        const respuestaCategorias = await llamarIAConFeedback(promptCategorias, "Identificando categorías", "gemini-2.5-flash-lite-preview-06-17");
        
        const categorias = respuestaCategorias.categorias_identificadas;
        if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
            throw new Error("La IA no pudo identificar categorías relevantes en el texto. Intenta ser más específico.");
        }
        
        chatDiv.innerHTML += `<p><strong>Silenos:</strong> Categorías encontradas: ${categorias.join(', ')}. Extrayendo y visualizando detalles...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;

        let totalDatosImportados = 0;
        for (const categoria of categorias) {
            
            const etiquetasValidas = opcionesEtiqueta
                .map(o => o.valor)
                .filter(v => v !== 'indeterminado' && v !== 'personalizar')
                .join(', ');

            const promptDetalles = `
                Para la obra "${textoUsuario}", genera una lista de elementos que pertenecen a la categoría "${categoria}".
                Para cada elemento, proporciona: "nombre", "descripcion", la "etiqueta" MÁS APROPIADA de [${etiquetasValidas}], y un "arco" narrativo ('planteamiento' o 'sin_arco').
                Responde ÚNICAMENTE con un objeto JSON válido en formato de array. Cada objeto debe tener la estructura completa: 
                { "nombre": "...", "descripcion": "...", "etiqueta": "...", "arco": "..." }`;

            const respuestaDetalles = await llamarIAConFeedback(promptDetalles, `Extrayendo detalles de "${categoria}"`, "gemini-2.5-flash-lite-preview-06-17");    

            if (Array.isArray(respuestaDetalles) && respuestaDetalles.length > 0) {
                let importadosCategoria = 0;
                
                // --- INICIO DE LA MODIFICACIÓN ---
                // Bucle en serie para crear o fusionar datos
                for (const dato of respuestaDetalles) {
                    if (dato.nombre && dato.descripcion) {
                        let elementoDato = null;
                        let esNuevo = true;
                        const nombreNormalizado = dato.nombre.trim().toLowerCase();

                        // Buscar si ya existe un elemento con el mismo nombre
                        const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');
                        for (const p of todosLosDatos) {
                            const nombreInput = p.querySelector('.nombreh');
                            if (nombreInput && nombreInput.value.trim().toLowerCase() === nombreNormalizado) {
                                elementoDato = p;
                                esNuevo = false;
                                break; // Encontramos el elemento, salimos del bucle
                            }
                        }

                        if (esNuevo) {
                            // Si es nuevo, lo creamos como antes
                            elementoDato = agregarPersonajeDesdeDatos(dato);
                        } else {
                            // Si ya existe, fusionamos la descripción
                            const cajaTextoExistente = elementoDato.querySelector('textarea');
                            if (cajaTextoExistente) {
                                // Añade la nueva descripción a la existente
                                cajaTextoExistente.value += `\n\n${dato.descripcion}`;
                                
                                // Actualizamos también la previsualización de la descripción
                                const descripcionPreview = elementoDato.querySelector('.personaje-descripcion-preview');
                                if (descripcionPreview) {
                                    descripcionPreview.textContent = cajaTextoExistente.value;
                                }
                            }
                        }

                        if (!elementoDato) {
                            console.error('No se pudo crear o encontrar el elemento para el dato:', dato);
                            continue;
                        }

                        importadosCategoria++;

                        // La lógica de generación de imagen solo debe aplicarse a elementos nuevos sin imagen
                        if (esNuevo) {
                            const imgExistente = elementoDato.querySelector('.personaje-visual img');
                            const tieneImagenValida = imgExistente && imgExistente.src && !imgExistente.src.endsWith('/');
                            const tieneSvgValido = elementoDato.dataset.svgContent;

                            if (typeof generarImagenParaDatos === 'function' && !tieneImagenValida && !tieneSvgValido) {
                                // Aquí iría la lógica para generar la imagen si es necesario
                            }
                        }
                    }
                }
                // --- FIN DE LA MODIFICACIÓN ---

                totalDatosImportados += importadosCategoria;
                chatDiv.innerHTML += `<p><strong>Éxito:</strong> Se procesaron ${importadosCategoria} datos de la categoría "${categoria}".</p>`;
            }
        }
        
        if (totalDatosImportados > 0) {
            alert(`¡Proceso completado! Se importaron y visualizaron un total de ${totalDatosImportados} datos detallados.`);
            document.getElementById('ia-datos-area').value = '';
            reinicializarFiltrosYActualizarVista();
        } else {
            alert("El proceso finalizó, pero no se pudo importar ningún dato. Revisa el chat para más información.");
        }

    } catch (error) {
        alert("Ocurrió un error al procesar la solicitud: " + error.message);
        console.error("Error en procesarEntradaConIA:", error);
    } finally {
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }
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