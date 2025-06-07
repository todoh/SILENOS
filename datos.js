// ===================================
// GESTIÓN DE DATOS (PERSONAJES, ETC.) Y ETIQUETAS
// ===================================

const opcionesEtiqueta = [
    { emoji: '⦾', valor: 'indeterminado', titulo: 'Indeterminado' },
    { emoji: '🧍', valor: 'personaje', titulo: 'Personaje' },
    { emoji: '🗺️', valor: 'ubicacion', titulo: 'Ubicación' },
    { emoji: '🗓️', valor: 'evento', titulo: 'Evento' },
    { emoji: '🛠️', valor: 'objeto', titulo: 'Objeto' },
    { emoji: '💭', valor: 'concepto', titulo: 'Concepto' },
    { emoji: '📝', valor: 'nota', titulo: 'Nota' },
    { emoji: '✒️', valor: 'personalizar', titulo: 'Personalizar...' }
];

/**
 * Aplica o elimina los estilos para las etiquetas personalizadas.
 * @param {HTMLElement} element El elemento <span> de la etiqueta.
 * @param {'custom'|'default'} type El tipo de estilo a aplicar.
 */
function setEtiquetaStyles(element, type) {
    if (type === 'custom') {
        element.style.background = 'white';
        element.style.color = 'black';
        element.style.padding = '2px 5px';
        element.style.borderRadius = '3px';
        element.style.fontSize = '12px';
        element.style.border = '1px solid #333';
        element.style.fontFamily = 'Arial, sans-serif';
    } else {
        element.style.background = '';
        element.style.color = '';
        element.style.padding = '';
        element.style.borderRadius = '';
        element.style.fontSize = '24px'; // Tamaño para emojis
        element.style.border = '';
        element.style.fontFamily = '';
    }
}

function mostrarMenuEtiquetas(etiquetaElement) {
    const menuExistente = document.querySelector('.menu-etiquetas');
    if (menuExistente) {
        menuExistente.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'menu-etiquetas';
    menu.style.position = 'absolute';
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '5px';
    menu.style.zIndex = '999999999';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

    opcionesEtiqueta.forEach(opcion => {
        const itemMenu = document.createElement('div');
        itemMenu.className = 'item-menu-etiqueta';
        itemMenu.textContent = `${opcion.emoji} ${opcion.titulo}`;
        itemMenu.style.padding = '8px 12px';
        itemMenu.style.cursor = 'pointer';
        itemMenu.style.color = '#333';

        itemMenu.onmouseover = () => { itemMenu.style.backgroundColor = '#f0f0f0'; };
        itemMenu.onmouseout = () => { itemMenu.style.backgroundColor = 'white'; };

        itemMenu.onclick = (e) => {
            e.stopPropagation();
            menu.remove();
            if (opcion.valor === 'personalizar') {
                setEtiquetaStyles(etiquetaElement, 'custom');
                etiquetaElement.textContent = 'Personalizar';
                etiquetaElement.contentEditable = true;
                etiquetaElement.focus();
                
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(etiquetaElement);
                selection.removeAllRanges();
                selection.addRange(range);

                const onBlurHandler = () => {
                    etiquetaElement.contentEditable = false;
                    const nombreEtiqueta = etiquetaElement.textContent.trim();
                    const valorEtiqueta = nombreEtiqueta.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

                    if (valorEtiqueta) {
                        etiquetaElement.dataset.etiqueta = valorEtiqueta;
                        etiquetaElement.textContent = nombreEtiqueta;
                        etiquetaElement.title = `Etiqueta: ${nombreEtiqueta}`;
                        setEtiquetaStyles(etiquetaElement, 'custom');
                    } else {
                        const opcionIndeterminada = opcionesEtiqueta[0];
                        etiquetaElement.dataset.etiqueta = opcionIndeterminada.valor;
                        etiquetaElement.textContent = opcionIndeterminada.emoji;
                        etiquetaElement.title = `Etiqueta: ${opcionIndeterminada.titulo}`;
                        setEtiquetaStyles(etiquetaElement, 'default');
                    }
                    etiquetaElement.removeEventListener('blur', onBlurHandler);
                    etiquetaElement.removeEventListener('keydown', onKeydownHandler);
                };

                const onKeydownHandler = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        etiquetaElement.blur();
                    }
                };

                etiquetaElement.addEventListener('blur', onBlurHandler);
                etiquetaElement.addEventListener('keydown', onKeydownHandler);
            } else {
                etiquetaElement.contentEditable = false;
                etiquetaElement.textContent = opcion.emoji;
                etiquetaElement.dataset.etiqueta = opcion.valor;
                etiquetaElement.title = `Etiqueta: ${opcion.titulo}`;
                setEtiquetaStyles(etiquetaElement, 'default');
            }
        };
        menu.appendChild(itemMenu);
    });

    document.body.appendChild(menu);
    const rect = etiquetaElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (menu.offsetWidth / 2)}px`;

    const cerrarMenu = (e) => {
        if (!menu.contains(e.target) && e.target !== etiquetaElement) {
            menu.remove();
            document.removeEventListener('click', cerrarMenu, true);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', cerrarMenu, true);
    }, 100);
}

/**
 * Crea y añade un nuevo elemento de "Dato" al DOM a partir de un objeto de datos.
 * @param {object} personajeData El objeto con los datos del personaje/dato.
 */
function agregarPersonajeDesdeDatos(personajeData) {
    if (!personajeData || typeof personajeData.nombre === 'undefined' || typeof personajeData.descripcion === 'undefined' || typeof personajeData.etiqueta === 'undefined') {
        throw new Error("Los datos proporcionados son incompletos. Se requiere nombre, descripción y etiqueta.");
    }

    let contenedor = document.createElement('div');
    contenedor.classList.add('personaje');
    contenedor.style.position = 'relative';

    let etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta-personaje';
    
    const etiquetaValor = personajeData.etiqueta || 'indeterminado';
    const opcionGuardada = opcionesEtiqueta.find(op => op.valor === etiquetaValor);

    if (opcionGuardada && opcionGuardada.valor !== 'personalizar') {
        etiqueta.textContent = opcionGuardada.emoji;
        etiqueta.dataset.etiqueta = opcionGuardada.valor;
        etiqueta.title = `Etiqueta: ${opcionGuardada.titulo}`;
        setEtiquetaStyles(etiqueta, 'default');
    } else { 
        const nombreEtiqueta = etiquetaValor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        etiqueta.textContent = nombreEtiqueta;
        etiqueta.dataset.etiqueta = etiquetaValor;
        etiqueta.title = `Etiqueta: ${nombreEtiqueta}`;
        setEtiquetaStyles(etiqueta, 'custom');
    }
    
    etiqueta.style.position = 'absolute';
    etiqueta.style.top = '10px';
    etiqueta.style.right = '10px';
    etiqueta.style.cursor = 'pointer';
    etiqueta.style.zIndex = '888888888';
    etiqueta.onclick = () => mostrarMenuEtiquetas(etiqueta);
    contenedor.appendChild(etiqueta);

    let cajaNombre = document.createElement('input');
    cajaNombre.type = 'text';
    cajaNombre.placeholder = 'Nombre';
    cajaNombre.value = personajeData.nombre;
    cajaNombre.classList.add('nombreh');
    contenedor.appendChild(cajaNombre);

    let cajaTexto = document.createElement('textarea');
    cajaTexto.placeholder = 'Descripción';
    cajaTexto.rows = 4;
    cajaTexto.cols = 30;
    cajaTexto.value = personajeData.descripcion;
    contenedor.appendChild(cajaTexto);
    
    let contenedorImagen = document.createElement('div');
    let imagen = document.createElement('img');
    imagen.src = personajeData.imagen || ''; 
    imagen.style.maxWidth = '340px';
    imagen.style.maxHeight = '95%';
    contenedorImagen.appendChild(imagen);
    
    let botonCargar = document.createElement('button');
    botonCargar.innerText = '📷';
    botonCargar.onclick = function() {
        let inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = 'image/*, video/mp4, video/webm, image/gif';
        inputFile.onchange = async function(event) {
            let archivo = event.target.files[0];
            if (archivo) {
                let base64Data = await fileToBase64(archivo);
                if (base64Data) {
                    imagen.src = base64Data;
                }
            }
        };
        inputFile.click();
    };
    contenedorImagen.appendChild(botonCargar);

    let botonEliminar = document.createElement('button');
    botonEliminar.innerText = 'X';
    botonEliminar.className = 'ideframeh';
    botonEliminar.onclick = function() {
        if (confirm("¿Estás seguro de que quieres eliminar este dato?")) {
            contenedor.remove();
        }
    };
    contenedorImagen.appendChild(botonEliminar);
    contenedor.appendChild(contenedorImagen);
    document.getElementById('listapersonajes').appendChild(contenedor);
}

function agregarPersonaje() {
    let contenedor = document.createElement('div');
    contenedor.classList.add('personaje');
    contenedor.style.position = 'relative';

    let etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta-personaje';
    etiqueta.dataset.etiqueta = 'indeterminado';
    etiqueta.textContent = '⦾';
    etiqueta.title = 'Etiqueta: Indeterminado';
    etiqueta.style.position = 'absolute';
    etiqueta.style.top = '10px';
    etiqueta.style.right = '10px';
    etiqueta.style.fontSize = '24px';
    etiqueta.style.cursor = 'pointer';
    etiqueta.style.zIndex = '888888888';
    etiqueta.onclick = () => mostrarMenuEtiquetas(etiqueta);
    contenedor.appendChild(etiqueta);

    let cajaNombre = document.createElement('input');
    cajaNombre.type = 'text';
    cajaNombre.placeholder = 'Nombre';
    cajaNombre.style.width = '100%';
    cajaNombre.style.marginBottom = '10px';
    cajaNombre.style.fontSize = 'x-large';
    cajaNombre.classList.add('nombreh');
    contenedor.appendChild(cajaNombre);

    let cajaTexto = document.createElement('textarea');
    cajaTexto.placeholder = 'Descripción';
    cajaTexto.rows = 4;
    cajaTexto.cols = 30;
    contenedor.appendChild(cajaTexto);
    
    let contenedorImagen = document.createElement('div');
    let imagen = document.createElement('img');
    imagen.src = ''; 
    imagen.style.maxWidth = '340px';
    imagen.style.maxHeight = '95%';
    contenedorImagen.appendChild(imagen);
    
    let botonCargar = document.createElement('button');
    botonCargar.innerText = '📷';
    botonCargar.onclick = function() {
        let inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = 'image/*, video/mp4, video/webm, image/gif';
        inputFile.onchange = async function(event) {
            let archivo = event.target.files[0];
            if (archivo) {
                let base64Data = await fileToBase64(archivo);
                if (base64Data) {
                    imagen.src = base64Data;
                }
            }
        };
        inputFile.click();
    };
    contenedorImagen.appendChild(botonCargar);

    let botonEliminar = document.createElement('button');
    botonEliminar.innerText = 'X';
    botonEliminar.className = 'ideframeh';
    botonEliminar.onclick = function() {
        if (confirm("¿Estás seguro de que quieres eliminar este dato?")) {
            contenedor.remove();
        }
    };
    contenedorImagen.appendChild(botonEliminar);
    contenedor.appendChild(contenedorImagen);
    document.getElementById('listapersonajes').appendChild(contenedor);
}

function agregarBotonEliminarAPersonajes() {
    const personajes = document.getElementById('listapersonajes').children;
    for (let personaje of personajes) {
        if (personaje.querySelector('button.ideframeh')) continue;
        let botonEliminar = document.createElement('button');
        botonEliminar.innerText = 'X';
        botonEliminar.className = 'ideframeh';
        botonEliminar.onclick = function() {
            if (confirm("¿Estás seguro de que quieres eliminar este dato?")) {
                personaje.remove();
            }
        };
        const contenedorImagen = personaje.querySelector('div');
        if (contenedorImagen) {
            contenedorImagen.appendChild(botonEliminar);
        }
    }
}