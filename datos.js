// ===================================
// GESTIÓN DE DATOS Y ETIQUETAS
// ===================================

const opcionesEtiqueta = [
    { emoji: '⦾', valor: 'indeterminado', titulo: 'Indeterminado' },
    { emoji: '🧍', valor: 'personaje', titulo: 'Personaje' },
    { emoji: '🗺️', valor: 'ubicacion', titulo: 'Ubicación' },
    { emoji: '🗓️', valor: 'evento', titulo: 'Evento' },
    { emoji: '🛠️', valor: 'objeto', titulo: 'Objeto' },
    { emoji: '💭', valor: 'concepto', titulo: 'Concepto' },
    { emoji: '📝', valor: 'nota', titulo: 'Nota' },
    { emoji: '👁️‍🗨️', valor: 'visual', titulo: 'Visual' },
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
    const elementoDato = botonEtiqueta.closest('.personaje'); // Obtener el elemento del dato

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
                etiquetasFiltroActivas.add(opcion.valor); // Asegurar que la etiqueta seleccionada esté activa en el filtro
                menu.remove();
                actualizarVistaDatos(); // Reordenar y filtrar
                if (elementoDato) {
                    elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Centrar vista en el elemento
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
 * Crea un campo de texto para que el usuario escriba una etiqueta personalizada.
 * @param {HTMLElement} botonEtiqueta - El botón de etiqueta que se actualizará.
 */
function crearInputParaEtiqueta(botonEtiqueta) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Nombre de etiqueta...';
    input.className = 'input-etiqueta-personalizada';
    const elementoDato = botonEtiqueta.closest('.personaje'); // Obtener el elemento del dato

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
            etiquetasFiltroActivas.add(nuevoValor); // Añadir la nueva etiqueta a los filtros activos para que sea visible
        }
        if (input.parentNode === document.body) {
            document.body.removeChild(input);
        }
        actualizarVistaDatos(); // Reordenar y filtrar
        if (elementoDato) {
            elementoDato.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Centrar vista en el elemento
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

// ===================================
// ORDENACIÓN Y FILTRADO DE DATOS
// ===================================

let etiquetasFiltroActivas = new Set();
let ordenAlfabeticoActivo = true; // Puedes cambiar esto para controlar la ordenación

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

    // 1. ORDENACIÓN
    const ordenPredefinido = new Map(opcionesEtiqueta.map((op, index) => [op.valor, index]));
    
    elementos.sort((a, b) => {
        // Criterio 1: Ordenación por Etiqueta
        const tagA = a.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado';
        const tagB = b.querySelector('.change-tag-btn')?.dataset.etiqueta || 'indeterminado';
        
        const ordenA = ordenPredefinido.has(tagA) ? ordenPredefinido.get(tagA) : Infinity;
        const ordenB = ordenPredefinido.has(tagB) ? ordenPredefinido.get(tagB) : Infinity;

        if (ordenA !== ordenB) {
            return ordenA - ordenB;
        }

        // Criterio 2: Ordenación Alfabética por Nombre
        const nombreA = a.querySelector('.nombreh')?.value.trim().toLowerCase() || '';
        const nombreB = b.querySelector('.nombreh')?.value.trim().toLowerCase() || '';
        
        return nombreA.localeCompare(nombreB);
    });

    // 2. RE-INSERCIÓN ORDENADA EN EL DOM
    elementos.forEach(el => lista.appendChild(el));

    // 3. FILTRADO (mostrar u ocultar)
    elementos.forEach(el => {
        const etiquetaEl = el.querySelector('.change-tag-btn')?.dataset.etiqueta;
        if (etiquetasFiltroActivas.has(etiquetaEl)) {
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

    const etiquetasDisponibles = obtenerEtiquetasUnicas();

    // Controles para seleccionar/deseleccionar todo
    const allContainer = document.createElement('div');
    allContainer.className = 'filtro-item-control';
    const allLabel = document.createElement('label');
    const allCheckbox = document.createElement('input');
    allCheckbox.type = 'checkbox';
    allCheckbox.checked = etiquetasDisponibles.every(tag => etiquetasFiltroActivas.has(tag)) && etiquetasDisponibles.length > 0;
    allLabel.appendChild(allCheckbox);
    allLabel.append(' (Marcar todos)');
    allCheckbox.onchange = () => {
        if (allCheckbox.checked) {
            etiquetasDisponibles.forEach(tag => etiquetasFiltroActivas.add(tag));
        } else {
            etiquetasFiltroActivas.clear();
        }
        actualizarPopupFiltros(); 
        actualizarVistaDatos();
    };
    allContainer.appendChild(allLabel);
    popup.appendChild(allContainer);

    // Crear un item por cada etiqueta
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
        popup.appendChild(itemContainer);
    });

    popup.style.display = 'block';
}

/**
 * Crea el botón de filtro y el popup, e inyecta los estilos necesarios.
 */
function inicializarControlesDeFiltro() {
    const botonesSuperiores = document.getElementById('datos-botones-superiores');
    if (!botonesSuperiores || document.getElementById('filtro-datos-btn')) return;

    // Inyectar estilos para el popup
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
    popup.className = 'lista-guiones-popup-local'; // Reusar estilos
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
 * Útil tras una carga masiva de datos.
 */
function reinicializarFiltrosYActualizarVista() {
    etiquetasFiltroActivas.clear();
    const todasLasEtiquetas = obtenerEtiquetasUnicas();
    todasLasEtiquetas.forEach(tag => etiquetasFiltroActivas.add(tag));
    actualizarVistaDatos();
}

/**
 * Crea y añade un nuevo elemento de "Dato" al DOM, con la etiqueta visible.
 * @param {object} personajeData - El objeto con los datos del personaje/dato.
 */
function agregarPersonajeDesdeDatos(personajeData = {}) {
    const { 
        nombre = '', 
        descripcion = '', 
        imagen = '', 
        etiqueta: etiquetaValor = 'indeterminado' 
    } = personajeData;

    const lista = document.getElementById('listapersonajes');
    if (!lista) return;

    const contenedor = document.createElement('div');
    contenedor.className = 'personaje';

    const etiquetaBtn = document.createElement('button');
    etiquetaBtn.className = 'change-tag-btn';

    const opcionGuardada = opcionesEtiqueta.find(op => op.valor === etiquetaValor);

    if (opcionGuardada) {
        etiquetaBtn.innerHTML = opcionGuardada.emoji;
        etiquetaBtn.title = `Etiqueta: ${opcionGuardada.titulo}`;
        etiquetaBtn.dataset.etiqueta = opcionGuardada.valor;
    } else {
        etiquetaBtn.innerHTML = etiquetaValor;
        etiquetaBtn.title = `Etiqueta: ${etiquetaValor}`;
        etiquetaBtn.dataset.etiqueta = etiquetaValor;
    }
    
    etiquetaBtn.onclick = (e) => {
        e.stopPropagation(); 
        mostrarMenuEtiquetas(etiquetaBtn);
    };
    
    Object.assign(etiquetaBtn.style, {
        position: 'absolute', top: '8px', right: '8px', zIndex: '3', padding: '4px 8px',
        fontSize: '12px', border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white',
        borderRadius: '5px', cursor: 'pointer', lineHeight: '1.2', transition: 'background-color 0.2s',
        maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center'
    });
    etiquetaBtn.onmouseover = () => { etiquetaBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; };
    etiquetaBtn.onmouseout = () => { etiquetaBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; };

    contenedor.appendChild(etiquetaBtn);

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
    cajaNombre.addEventListener('change', () => { // Escuchar cambios para reordenar
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
    reinicializarFiltrosYActualizarVista(); // Actualizar vista para el nuevo item
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
    chatDiv.innerHTML += `<p><strong>Solicitud enviada:</strong> Analizando entrada...</p>`;
    chatDiv.scrollTop = chatDiv.scrollHeight;

    try {
        if (textoUsuario.startsWith('[') || textoUsuario.startsWith('{')) {
            // Lógica para JSON
            const promptCorreccion = `Rol: Eres un asistente experto en formateo de datos... [Resto del prompt sin cambios]`;
            const respuestaCorregida = await llamarIAConFeedback(promptCorreccion, "Formateando JSON");
            if (Array.isArray(respuestaCorregida) && respuestaCorregida.length > 0) {
                respuestaCorregida.forEach(dato => agregarPersonajeDesdeDatos(dato));
            } else {
                throw new Error("La IA no pudo formatear el JSON a la estructura esperada.");
            }
        } else {
            // Lógica para texto plano
            const promptCategorias = `Analiza la siguiente obra: "${textoUsuario}"... [Resto del prompt sin cambios]`;
            const respuestaCategorias = await llamarIAConFeedback(promptCategorias, "Identificando categorías");
            const categorias = respuestaCategorias.categorias_identificadas;
            if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
                throw new Error("La IA no pudo identificar categorías relevantes.");
            }

            for (const categoria of categorias) {
                // ... [Lógica de bucle sin cambios, pero el agregado de datos se hace dentro]
                const promptDetalles = `Para la obra "${textoUsuario}", genera... [Resto del prompt sin cambios]`;
                const respuestaDetalles = await llamarIAConFeedback(promptDetalles, `Extrayendo detalles de "${categoria}"`);
                 if (Array.isArray(respuestaDetalles) && respuestaDetalles.length > 0) {
                    respuestaDetalles.forEach(dato => {
                        if (dato.nombre && dato.descripcion) agregarPersonajeDesdeDatos(dato);
                    });
                }
            }
        }
        
        reinicializarFiltrosYActualizarVista(); // Llamada única al final
        alert("Proceso de IA completado. Los datos han sido añadidos y ordenados.");

    } catch (error) {
        alert("Ocurrió un error al procesar la solicitud con IA: " + error.message);
        console.error("Error en procesarEntradaConIA:", error);
    } finally {
        if(chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}

// El resto de funciones no relacionadas se mantienen sin cambios...
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
