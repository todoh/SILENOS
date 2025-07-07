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
    { emoji: '🚗', valor: 'transporte', titulo: 'Transporte' },
    { emoji: '🐾', valor: 'animal', titulo: 'Animal' },
     { emoji: '🌱', valor: 'planta', titulo: 'Planta' },
      { emoji: '🦠', valor: 'ser_vivo', titulo: 'Ser Vivo' },
    { emoji: '🏞️', valor: 'elemento_geográfico', titulo: 'Elemento Geográfico' },
    { emoji: '💭', valor: 'concepto', titulo: 'Concepto' },
    { emoji: '📝', valor: 'nota', titulo: 'Nota' },
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
        #filtro-datos-popup { display: none; position: absolute; background: #333; border: 1px solid #555; border-radius: 5px; padding: 10px; z-index: 10002; }
        .filtro-item label, .filtro-item-control label { display: flex; align-items: center; color: white; padding: 5px; cursor: pointer; border-radius: 3px; font-size: 14px; }
        .filtro-item label:hover { background-color: #444; }
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
            popup.style.left = `${rect.left + window.scrollX}px`;
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
 * Crea y añade un nuevo elemento de "Dato" al DOM, con la etiqueta y el arco visibles.
 * @param {object} personajeData - El objeto con los datos del personaje/dato.
 */
function agregarPersonajeDesdeDatos(personajeData = {}) {
    const { 
        nombre = '', 
        descripcion = '', 
        imagen = '', 
        etiqueta: etiquetaValor = 'indeterminado',
        arco: arcoValor = 'sin_arco'
    } = personajeData;

    const lista = document.getElementById('listapersonajes');
    if (!lista) return;

    const contenedor = document.createElement('div');
    contenedor.className = 'personaje';

    const etiquetaBtn = document.createElement('button');
    etiquetaBtn.className = 'change-tag-btn';

    const opcionEtiquetaGuardada = opcionesEtiqueta.find(op => op.valor === etiquetaValor);
    if (opcionEtiquetaGuardada) {
        etiquetaBtn.innerHTML = opcionEtiquetaGuardada.emoji;
        etiquetaBtn.title = `Etiqueta: ${opcionEtiquetaGuardada.titulo}`;
        etiquetaBtn.dataset.etiqueta = opcionEtiquetaGuardada.valor;
    } else {
        etiquetaBtn.innerHTML = etiquetaValor;
        etiquetaBtn.title = `Etiqueta: ${etiquetaValor}`;
        etiquetaBtn.dataset.etiqueta = etiquetaValor;
    }
    
    etiquetaBtn.onclick = (e) => { e.stopPropagation(); mostrarMenuEtiquetas(etiquetaBtn); };
    
    Object.assign(etiquetaBtn.style, {
        position: 'absolute', top: '8px', right: '8px', zIndex: '3', padding: '4px 8px',
        fontSize: '12px', border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white',
        borderRadius: '5px', cursor: 'pointer', lineHeight: '1.2', transition: 'background-color 0.2s',
        maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center'
    });
    etiquetaBtn.onmouseover = () => { etiquetaBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; };
    etiquetaBtn.onmouseout = () => { etiquetaBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; };

    contenedor.appendChild(etiquetaBtn);

    const arcoBtn = document.createElement('button');
    arcoBtn.className = 'change-arc-btn'; 

    const opcionArcoGuardado = opcionesArco.find(op => op.valor === arcoValor);
    if (opcionArcoGuardado) {
        arcoBtn.innerHTML = opcionArcoGuardado.emoji;
        arcoBtn.title = `Arco: ${opcionArcoGuardado.titulo}`;
        arcoBtn.dataset.arco = opcionArcoGuardado.valor;
    } else {
        arcoBtn.innerHTML = arcoValor;
        arcoBtn.title = `Arco: ${arcoValor}`;
        arcoBtn.dataset.arco = arcoValor;
    }

    arcoBtn.onclick = (e) => { e.stopPropagation(); mostrarMenuArcos(arcoBtn); };

    Object.assign(arcoBtn.style, {
        position: 'absolute', bottom: '8px', left: '8px', zIndex: '3', padding: '4px 8px',
        fontSize: '12px', border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white',
        borderRadius: '5px', cursor: 'pointer', lineHeight: '1.2', transition: 'background-color 0.2s',
        maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center'
    });
    arcoBtn.onmouseover = () => { arcoBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; };
    arcoBtn.onmouseout = () => { arcoBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; };

    contenedor.appendChild(arcoBtn);

    const visual = document.createElement('div');
    visual.className = 'personaje-visual';
    
    const img = document.createElement('img');
    const descripcionPreview = document.createElement('div');
    descripcionPreview.className = 'personaje-descripcion-preview';
    
    const actualizarVisual = (nuevaImagenSrc, nuevaDescripcion) => {
        img.src = nuevaImagenSrc || '';
        descripcionPreview.textContent = nuevaDescripcion;
        img.classList.toggle('hidden', !img.src || img.src.endsWith('/'));
    };
    
    img.onerror = () => { img.classList.add('hidden'); };
    img.onload = () => { img.classList.toggle('hidden', !img.src || img.src.endsWith('/')); }
    
    visual.appendChild(img);
    visual.appendChild(descripcionPreview);
    contenedor.appendChild(visual);

    const cajaNombre = document.createElement('input');
    cajaNombre.type = 'text';
    cajaNombre.className = 'nombreh';
    cajaNombre.value = nombre;
    cajaNombre.placeholder = 'Nombre';
    cajaNombre.addEventListener('change', () => {
        actualizarVistaDatos();
    });
    contenedor.appendChild(cajaNombre);

    const overlay = document.createElement('div');
    overlay.className = 'personaje-edit-overlay';
    const editControls = document.createElement('div');
    editControls.className = 'edit-controls';
    const cajaTexto = document.createElement('textarea');
    cajaTexto.value = descripcion;
    cajaTexto.placeholder = 'Descripción...';
    cajaTexto.addEventListener('input', () => {
        actualizarVisual(img.src, cajaTexto.value);
    });
    editControls.appendChild(cajaTexto);

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'edit-buttons-wrapper';

    const botonCargar = document.createElement('button');
    botonCargar.className = 'edit-btn change-image-btn';
    botonCargar.innerHTML = '📷';
    botonCargar.title = 'Cambiar Imagen';
    botonCargar.onclick = () => {
        const inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = 'image/*, video/mp4, video/webm, image/gif';
        inputFile.onchange = async (event) => {
            if (event.target.files && event.target.files[0]) {
                const nuevaImagen = await fileToBase64(event.target.files[0]);
                actualizarVisual(nuevaImagen, cajaTexto.value);
            }
        };
        inputFile.click();
    };
    buttonsWrapper.appendChild(botonCargar);

    const botonEliminar = document.createElement('button');
    botonEliminar.className = 'edit-btn delete-btn';
    botonEliminar.innerHTML = '🗑️';
    botonEliminar.title = 'Eliminar Dato';
    botonEliminar.onclick = () => {
        if (confirm(`¿Estás seguro de que quieres eliminar "${cajaNombre.value || 'este dato'}"?`)) {
            contenedor.remove();
        }
    };
    buttonsWrapper.appendChild(botonEliminar);

    editControls.appendChild(buttonsWrapper);
    overlay.appendChild(editControls);
    contenedor.appendChild(overlay);

    lista.appendChild(contenedor);
    
    actualizarVisual(imagen, descripcion);
}

function agregarPersonaje() {
    agregarPersonajeDesdeDatos();
    reinicializarFiltrosYActualizarVista();
}


function inicializarInteraccionPersonajes() {
    const listaPersonajesEl = document.getElementById('listapersonajes');
    if (!listaPersonajesEl) return;

    listaPersonajesEl.addEventListener('click', (e) => {
        const visualClicked = e.target.closest('.personaje-visual');
        if (visualClicked) {
            const personajeActual = visualClicked.closest('.personaje');
            if (!personajeActual) return;
            const personajeActivo = document.querySelector('.personaje.editing');
            if (personajeActivo && personajeActivo !== personajeActual) {
                personajeActivo.classList.remove('editing');
            }
            personajeActual.classList.toggle('editing');
        }
    });

    document.addEventListener('click', (e) => {
        const personajeActivo = document.querySelector('.personaje.editing');
        if (personajeActivo && !e.target.closest('.personaje.editing') && !e.target.closest('.input-etiqueta-personalizada')) {
             personajeActivo.classList.remove('editing');
        }
    }, true);
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarInteraccionPersonajes();
    inicializarControlesDeFiltro();
});


// =========================================================================
// OTRAS FUNCIONES (IA, etc.)
// =========================================================================

async function procesarEntradaConIA() {
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
        if (textoUsuario.startsWith('[') || textoUsuario.startsWith('{')) {
            // La lógica para importar JSON directo no cambia y funciona bien.
            chatDiv.innerHTML += `<p><strong>Info:</strong> Se ha detectado una estructura tipo JSON. Se intentará formatear.</p>`;
            const promptCorreccion = `Rol: Eres un asistente experto en formateo de datos. Tarea: Convierte la siguiente cadena de texto en un array JSON válido que siga la estructura: { "nombre": "string", "descripcion": "string", "etiqueta": "string (personaje, ubicacion, objeto, etc.)", "imagen": "" }. Sintetiza toda la información en el campo "descripcion". Responde ÚNICAMENTE con el array JSON. Texto a convertir: --- ${textoUsuario} ---`;
            const respuestaCorregida = await llamarIAConFeedback(promptCorreccion, "Formateando JSON");
            if (Array.isArray(respuestaCorregida) && respuestaCorregida.length > 0) {
                respuestaCorregida.forEach(dato => agregarPersonajeDesdeDatos(dato));
                alert(`La IA formateó y añadió ${respuestaCorregida.length} dato(s).`);
            } else {
                throw new Error("La IA no pudo formatear el JSON a la estructura esperada.");
            }
        } else {
            // CORRECCIÓN CLAVE: Un prompt mucho más directo y restrictivo.
            const promptCategorias = `
                Analiza el siguiente texto de una historia: "${textoUsuario}".
                Tu ÚNICA tarea es extraer los nombres de las entidades clave y clasificarlas. NO escribas un ensayo ni análisis.
                Identifica las categorías de datos más importantes y relevantes (ej: Personajes Principales, Personajes Secundarios, Lugares Clave, Objetos, Facciones, etc.).

                **Instrucción crucial**: Responde ÚNICAMENTE con un objeto JSON. No añadas texto introductorio, explicaciones, ni marcadores de código. La estructura debe ser:
                {
                  "categorias_identificadas": ["Categoría 1", "Categoría 2", "Categoría 3"]
                }

                Si el texto es demasiado corto o ambiguo para extraer categorías, devuelve un JSON con un array vacío, así:
                {
                  "categorias_identificadas": []
                }
            `;
            
            let respuestaCategorias;
            try {
                respuestaCategorias = await llamarIAConFeedback(promptCategorias, "Identificando categorías");
            } catch (error) {
                // Este catch es para los errores de parseo de JSON
                throw new Error("La IA respondió en un formato inesperado. Por favor, intenta ser más descriptivo en tu idea. Error original: " + error.message);
            }
            
            const categorias = respuestaCategorias.categorias_identificadas;
            if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
                throw new Error("La IA no pudo identificar categorías relevantes en el texto. Intenta ser más específico.");
            }
            
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> Categorías encontradas: ${categorias.join(', ')}. Extrayendo detalles...</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;

            let totalDatosImportados = 0;
            for (const categoria of categorias) {
                const etiquetaSugerida = categoria.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                const promptDetalles = `
                    Para la obra "${textoUsuario}", genera una lista de elementos que pertenecen a la categoría "${categoria}".
                    Para cada elemento, proporciona una descripción detallada.
                    Responde ÚNICAMENTE con un objeto JSON válido en formato de array. Cada objeto debe tener: {"nombre": "...", "descripcion": "...", "etiqueta": "${etiquetaSugerida}", "imagen": ""}`;

                const respuestaDetalles = await llamarIAConFeedback(promptDetalles, `Extrayendo detalles de "${categoria}"`);
                
                if (Array.isArray(respuestaDetalles) && respuestaDetalles.length > 0) {
                    let importadosCategoria = 0;
                    respuestaDetalles.forEach(dato => {
                        if (dato.nombre && dato.descripcion) {
                            agregarPersonajeDesdeDatos(dato);
                            importadosCategoria++;
                        }
                    });
                    totalDatosImportados += importadosCategoria;
                    chatDiv.innerHTML += `<p><strong>Éxito:</strong> Se agregaron ${importadosCategoria} datos de la categoría "${categoria}".</p>`;
                }
            }
            
            if (totalDatosImportados > 0) {
                alert(`¡Proceso completado! Se importaron un total de ${totalDatosImportados} datos detallados.`);
                document.getElementById('ia-datos-area').value = '';
            } else {
                alert("El proceso finalizó, pero no se pudo importar ningún dato. Revisa el chat para más información.");
            }
        }
    } catch (error) {
        alert("Ocurrió un error al procesar la solicitud: " + error.message);
        console.error("Error en procesarEntradaConIA:", error);
    } finally {
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }
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