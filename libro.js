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
    
 renderizarVisorDeLibros();
    
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


/**
 * Renderiza la vista de todos los libros creados en el contenedor 'libroscreados'.
 * Cada libro se muestra como una tarjeta con opciones para editar, eliminar y exportar.
 */
function renderizarVisorDeLibros() {
    const visorContainer = document.getElementById('libroscreados');
    if (!visorContainer) {
        console.error('Error: El contenedor "libroscreados" no se encontró.');
        return;
    }

    visorContainer.innerHTML = ''; // Limpia el contenedor antes de renderizar

    // Muestra un mensaje si no hay libros
    if (!libros || libros.length === 0) {
        visorContainer.innerHTML = '<p id="sin-libros-mensaje" class="sin-libros-mensaje"></p>';
        return;
    }

    // Itera sobre cada libro y crea su tarjeta
    libros.forEach(libro => {
        const libroCard = document.createElement('div');
        libroCard.className = 'libro-card';

        // --- Portada del Libro ---
        const portada = document.createElement('div');
        portada.className = 'libro-portada';
        if (libro.portadaUrl) {
            portada.style.backgroundImage = `url('${libro.portadaUrl}')`;
        }
        portada.onclick = () => {
            seleccionarLibro(libro.id);
            console.log(`Libro "${libro.titulo}" seleccionado. Abriendo vista...`);
            if (typeof abrir === 'function') {
                abrir('capitulosh');
            } else {
                console.warn("La función 'abrir(seccion)' no está definida.");
            }
        };

        // --- Título del Libro (Editable) ---
        const titulo = document.createElement('p');
        titulo.className = 'libro-titulo';
        titulo.textContent = libro.titulo;
        titulo.onclick = (event) => {
            event.stopPropagation();
            const inputEdicion = document.createElement('input');
            inputEdicion.type = 'text';
            inputEdicion.value = libro.titulo;
            inputEdicion.className = 'libro-titulo-input';
            
            const guardarCambios = () => {
                const nuevoTitulo = inputEdicion.value.trim();
                if (nuevoTitulo && nuevoTitulo !== libro.titulo) {
                    libro.titulo = nuevoTitulo;
                    if (libro.id === libroActivoId) {
                        seleccionarLibro(libro.id);
                    }
                }
                renderizarVisorDeLibros(); 
            };

            inputEdicion.addEventListener('blur', guardarCambios);
            inputEdicion.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') inputEdicion.blur();
                else if (e.key === 'Escape') renderizarVisorDeLibros();
            });

            titulo.parentElement.replaceChild(inputEdicion, titulo);
            inputEdicion.focus();
            inputEdicion.select();
        };

        // --- Contenedor de Botones ---
        const botonesContainer = document.createElement('div');
        botonesContainer.className = 'libro-botones';

        // Botón para Cargar Portada
        const btnCargarPortada = document.createElement('button');
        btnCargarPortada.textContent = '📷';
        btnCargarPortada.onclick = (event) => {
            event.stopPropagation();
            const inputArchivo = document.createElement('input');
            inputArchivo.type = 'file';
            inputArchivo.accept = 'image/*';
            inputArchivo.onchange = (e) => {
                const archivo = e.target.files[0];
                if (!archivo) return;
                const reader = new FileReader();
                reader.onload = (eventReader) => {
                    libro.portadaUrl = eventReader.target.result;
                    renderizarVisorDeLibros();
                };
                reader.readAsDataURL(archivo);
            };
            inputArchivo.click();
        };

        // Botón de Exportar (con menú desplegable)
        const btnExportar = document.createElement('button');
        btnExportar.textContent = '📤';
        btnExportar.onclick = (event) => {
            event.stopPropagation();
            mostrarMenuExportar(event, libro);
        };

        // Botón para Eliminar
        const btnEliminar = document.createElement('button');
        btnEliminar.textContent = '❌';
        btnEliminar.className = 'btn-eliminar';
        btnEliminar.onclick = (event) => {
            event.stopPropagation();
            if (confirm(`¿Seguro que quieres eliminar el libro "${libro.titulo}"?`)) {
                const index = libros.findIndex(l => l.id === libro.id);
                if (index > -1) {
                    libros.splice(index, 1);
                    renderizarVisorDeLibros();
                }
            }
        };

        // --- Ensambla los elementos en la tarjeta ---
        botonesContainer.appendChild(btnCargarPortada);
        botonesContainer.appendChild(btnExportar);

        // ==================== INICIO DEL CAMBIO ====================
        // Se añade el botón de IA solo si la variable 'apiKey' tiene valor.
         if (typeof apiKey !== 'undefined' && apiKey) {
            const btnIA = document.createElement('button');
            btnIA.textContent = 'IA 🧠';
            btnIA.className = 'btn-ia';
            btnIA.title = 'Usar funciones de IA para este libro';
            btnIA.onclick = (event) => {
                event.stopPropagation();
                abrirModalIA(libro); 
            };
            botonesContainer.appendChild(btnIA);
        }
        // ===================== FIN DEL CAMBIO ======================

        botonesContainer.appendChild(btnEliminar);

        libroCard.appendChild(portada);
        libroCard.appendChild(titulo);
        libroCard.appendChild(botonesContainer);

        visorContainer.appendChild(libroCard);
    });
}

/**
 * Muestra un menú contextual para seleccionar el formato de exportación.
 * @param {MouseEvent} event - El evento del clic.
 * @param {object} libro - El libro que se va a exportar.
 */
function mostrarMenuExportar(event, libro) {
    // Cierra cualquier menú de exportación que ya esté abierto
    cerrarMenuExportar();

    const menu = document.createElement('div');
    menu.id = 'export-menu';
    menu.className = 'export-menu-container';

    const formatos = ['TXT', 'JSON', 'HTML', 'DOC', 'PDF'];
    
    formatos.forEach(formato => {
        const opcion = document.createElement('button');
        opcion.textContent = `Como ${formato}`;
        opcion.onclick = (e) => {
            e.stopPropagation();
            exportarLibro(libro, formato.toLowerCase());
            cerrarMenuExportar();
        };
        menu.appendChild(opcion);
    });

    document.body.appendChild(menu);

    // Posiciona el menú cerca del botón que se ha pulsado
    const rect = event.currentTarget.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;

    // Añade un listener para cerrar el menú si se hace clic fuera de él
    setTimeout(() => {
        document.addEventListener('click', cerrarMenuExportar, { once: true });
    }, 0);
}

/**
 * Cierra el menú de exportación si está abierto.
 */
function cerrarMenuExportar() {
    const menu = document.getElementById('export-menu');
    if (menu) {
        menu.remove();
    }
}

/**
 * Función principal que llama a la función de exportación específica según el formato.
 * @param {object} libro - El libro a exportar.
 * @param {string} formato - El formato deseado ('txt', 'json', 'html', etc.).
 */
function exportarLibro(libro, formato) {
    if (!libro) {
        alert("Error: No se ha proporcionado un libro para exportar.");
        return;
    }

    switch (formato) {
        case 'html':
            exportarComoHTML(libro);
            break;
        case 'txt':
            exportarComoTXT(libro);
            break;
        case 'json':
            exportarComoJSON(libro);
            break;
        case 'doc':
            exportarComoDOC(libro);
            break;
        case 'pdf':
            exportarComoPDF(libro);
            break;
        default:
            alert(`Formato de exportación desconocido: ${formato}`);
    }
}

/**
 * Genera y descarga un archivo de texto plano (.txt) del libro.
 * @param {object} libro - El libro a exportar.
 */
function exportarComoTXT(libro) {
    const capitulosDelLibro = Object.values(escenas).filter(cap => cap.libroId === libro.id);
    let contenido = `Título: ${libro.titulo}\n\n`;
    contenido += "========================================\n\n";

    capitulosDelLibro.forEach(capitulo => {
        contenido += `Capítulo: ${capitulo.texto || 'Sin título'}\n\n`;
        if (capitulo.frames && capitulo.frames.length > 0) {
            capitulo.frames.forEach((frame, index) => {
                contenido += `--- Frame ${index + 1} ---\n`;
                contenido += `${frame.texto}\n\n`;
            });
        }
        contenido += "----------------------------------------\n\n";
    });

    descargarArchivo(contenido, `${libro.titulo.replace(/ /g, '_')}.txt`, 'text/plain');
}

/**
 * Genera y descarga un archivo JSON (.json) con los datos del libro.
 * @param {object} libro - El libro a exportar.
 */
function exportarComoJSON(libro) {
    const capitulosDelLibro = Object.values(escenas).filter(cap => cap.libroId === libro.id);
    const datosExportar = {
        ...libro,
        capitulos: capitulosDelLibro
    };

    const contenido = JSON.stringify(datosExportar, null, 4); // El 4 es para indentar el JSON y que sea legible
    descargarArchivo(contenido, `${libro.titulo.replace(/ /g, '_')}.json`, 'application/json');
}


/**
 * Genera y descarga un archivo HTML interactivo del libro.
 * @param {object} libro - El libro a exportar.
 */
function exportarComoHTML(libro) {
    const contenidoHtml = obtenerContenidoHtmlParaExportar(libro, false, true);
    descargarArchivo(contenidoHtml, `${libro.titulo.replace(/ /g, '_')}.html`, 'text/html');
}

/**
 * Genera y descarga un archivo PDF del libro usando el método .html() de jsPDF para paginación automática.
 * @param {object} libro - El libro a exportar.
 */
function exportarComoPDF(libro) {
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
        alert('Las librerías para exportar a PDF no están cargadas. Por favor, añada jsPDF y html2canvas a su proyecto.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
    });

    const contenidoHtml = obtenerContenidoHtmlParaExportar(libro, true, true);
    const source = document.createElement('div');
    source.innerHTML = contenidoHtml;

    pdf.html(source, {
        callback: function (doc) {
            doc.save(`${libro.titulo.replace(/ /g, '_')}.pdf`);
        },
        x: 15,
        y: 15,
        width: 565, // Ancho A4 (595pt) menos márgenes (15*2)
        windowWidth: 800, // Ancho del contenedor para el que se diseñó el HTML
        autoPaging: 'text' // Intenta evitar cortar líneas de texto
    });
}

 
/**
 * Genera y descarga un archivo DOCX (.docx) del libro usando la librería 'docx'.
 * Esta versión construye el documento programáticamente para un control total.
 * @param {object} libro - El libro a exportar.
 */
async function exportarComoDOC(libro) {
    // 1. Verifica que la librería 'docx' esté cargada en la ventana global.
    if (typeof docx === 'undefined') {
        alert('La librería para exportar a DOCX (docx.js) no está cargada.');
        return;
    }

    // Desestructuramos los componentes que usaremos de la librería.
    const { Document, Packer, Paragraph, HeadingLevel, AlignmentType } = docx;

    // 2. Preparamos el contenido del documento en un array.
    const children = [];

    // Título del libro (Nivel de Encabezado 1 y centrado)
    children.push(new Paragraph({
        text: libro.titulo,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
    }));
    // Añadimos un párrafo vacío para crear un espacio después del título.
    children.push(new Paragraph({ text: "" }));

    const capitulosDelLibro = Object.values(escenas).filter(cap => cap.libroId === libro.id);

    // 3. Recorremos cada capítulo y sus frames para añadirlos al documento.
    capitulosDelLibro.forEach(capitulo => {
        // Título del capítulo (Nivel de Encabezado 2)
        children.push(new Paragraph({
            text: capitulo.texto || 'Sin título',
            heading: HeadingLevel.HEADING_2,
        }));

        if (capitulo.frames && capitulo.frames.length > 0) {
            capitulo.frames.forEach(frame => {
                // El texto de un frame puede tener saltos de línea.
                // Los separamos y creamos un párrafo por cada línea no vacía.
                const lineas = frame.texto.split('\n').filter(linea => linea.trim() !== '');
                lineas.forEach(linea => {
                    children.push(new Paragraph({ text: linea }));
                });
            });
        }
        // Espacio entre capítulos
        children.push(new Paragraph({ text: "" }));
    });

    // 4. Creamos el documento con la estructura definida.
    const doc = new Document({
        sections: [{
            properties: {}, // Aquí se pueden definir márgenes y tamaño de página si se desea.
            children: children,
        }]
    });

    // 5. Usamos el Packer para convertir el documento a un formato descargable (Blob).
    try {
        const blob = await Packer.toBlob(doc);
        descargarArchivo(blob, `${libro.titulo.replace(/ /g, '_')}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } catch (error) {
        console.error('Error al generar el DOCX con la librería docx:', error);
        alert('Ocurrió un error al generar el archivo .docx.');
    }
}
// NOTA: La función 'obtenerContenidoHtmlSimpleParaDoc' recomendada es la última
// que te pasé (la que filtra las líneas vacías), ya que es la más limpia.

 
/**
 * **SOLUCIÓN FINAL (Simplificación Extrema)**: 
 * Genera un HTML ultra-simple, eliminando líneas vacías para máxima compatibilidad.
 * @param {object} libro - El libro a procesar.
 * @returns {string} - Un string con el contenido del libro en el formato HTML más limpio posible.
 */
function obtenerContenidoHtmlSimpleParaDoc(libro) {
    const capitulosDelLibro = Object.values(escenas).filter(cap => cap.libroId === libro.id);
    
    let bodyContent = `<h1>${libro.titulo}</h1>`;

    capitulosDelLibro.forEach(capitulo => {
        bodyContent += `<h2>${capitulo.texto || 'Sin título'}</h2>`;

        if (capitulo.frames && capitulo.frames.length > 0) {
            capitulo.frames.forEach(frame => {
                const lineasConContenido = frame.texto.split('\n')
                    // **CAMBIO CLAVE: Filtramos para eliminar todas las líneas vacías.**
                    .filter(linea => linea.trim() !== '')
                    // Ahora solo creamos párrafos para las líneas que realmente tienen texto.
                    .map(linea => `<p>${linea}</p>`);

                bodyContent += lineasConContenido.join('');
            });
        }
    });

    return bodyContent;
}


/**
 * Genera el contenido HTML completo de un libro para ser exportado a HTML o PDF.
 * @param {object} libro - El libro a procesar.
 * @param {boolean} paraExportacionEstatica - Si es true, omite scripts y elementos interactivos.
 * @param {boolean} incluirEstilos - Si es true, incluye la etiqueta <style> en el head.
 * @returns {string} - El string HTML completo del libro.
 */
function obtenerContenidoHtmlParaExportar(libro, paraExportacionEstatica = false, incluirEstilos = true) {
    const capitulosDelLibro = Object.values(escenas).filter(cap => cap.libroId === libro.id);

    let contenidoPrincipalHtml = '';
    let listaMenuHtml = '';

    if (capitulosDelLibro.length > 0) {
        capitulosDelLibro.forEach((capitulo, index) => {
            const idCapitulo = `capitulo-${index}`;
            const tituloCapitulo = capitulo.texto || `Capítulo ${index + 1}`;

            contenidoPrincipalHtml += `<div id="${idCapitulo}"><h2>${tituloCapitulo}</h2>`;
            if (capitulo.frames && capitulo.frames.length > 0) {
                capitulo.frames.forEach((frame, frameIndex) => {
                    contenidoPrincipalHtml += `<div class="frame"><p>${frame.texto.replace(/\n/g, '<br>')}</p>`;
                    if (frame.imagen) {
                        contenidoPrincipalHtml += `<img src="${frame.imagen}" alt="Imagen del Frame ${frameIndex + 1}">`;
                    }
                    contenidoPrincipalHtml += `</div>`;
                });
            } else {
                contenidoPrincipalHtml += `<p><em>Este capítulo no tiene frames.</em></p>`;
            }
            contenidoPrincipalHtml += `</div>`;
            if (!paraExportacionEstatica) {
                 listaMenuHtml += `<li><a href="#${idCapitulo}">${tituloCapitulo}</a></li>`;
            }
        });
    } else {
        contenidoPrincipalHtml = `<p><em>Este libro no tiene capítulos.</em></p>`;
    }
    
    const estilosHtml = incluirEstilos ? `
        <style>
            body { font-family: sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #fff; scroll-behavior: smooth; }
            .container { max-width: 800px; margin: auto; padding: 0 20px; }
            h1 { color: #2c3e50; text-align: center; }
            h2 { color:rgb(0, 0, 0); border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-top: 40px; }
            .frame { margin: 20px 0; padding-left: 15px; border-left: 3px solid #bdc3c7; page-break-inside: avoid; }
            .frame img { max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px; }
            p { white-space: pre-wrap; }
            #menu-btn { position: fixed; top: 15px; left: 15px; z-index: 1001; background-color:rgb(0, 0, 0); color: white; border: none; border-radius: 50%; width: 50px; height: 50px; font-size: 24px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: background-color 0.3s; }
            #menu-btn:hover { background-color:rgb(252, 18, 18); }
            #menu-navegacion { position: fixed; top: 0; left: -300px; width: 280px; height: 100%; background-color: #fff; box-shadow: 2px 0 10px rgba(0,0,0,0.1); transition: left 0.3s ease-in-out; z-index: 1000; overflow-y: auto; }
            #menu-navegacion.visible { left: 0; }
            #menu-navegacion h3 { padding: 20px; margin: 0; background-color: #ecf0f1; color:rgb(0, 0, 0); }
            #menu-navegacion ul { list-style: none; padding: 10px 0; margin: 0; }
            #menu-navegacion li a { display: block; padding: 12px 20px; color:rgb(0, 0, 0); text-decoration: none; transition: background-color 0.2s; }
            #menu-navegacion li a:hover { background-color: #ecf0f1; }
        </style>
    ` : '';

    const scriptHtml = paraExportacionEstatica ? '' : `
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const menuBtn = document.getElementById('menu-btn');
                const menuNav = document.getElementById('menu-navegacion');
                const menuLinks = menuNav.querySelectorAll('a');
                menuBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    menuNav.classList.toggle('visible');
                });
                menuLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        menuNav.classList.remove('visible');
                    });
                });
                document.addEventListener('click', (event) => {
                    if (menuNav.classList.contains('visible') && !menuNav.contains(event.target)) {
                        menuNav.classList.remove('visible');
                    }
                });
            });
        <\/script>
    `;

    const navHtml = paraExportacionEstatica ? '' : `
        <button id="menu-btn">☰</button>
        <nav id="menu-navegacion">
            <h3>${libro.titulo}</h3>
            <ul>${listaMenuHtml}</ul>
        </nav>
    `;

    const contenidoHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${libro.titulo}</title>
            ${estilosHtml}
        </head>
        <body>
            ${navHtml}
            <div class="container">
                <h1>${libro.titulo}</h1>
                ${contenidoPrincipalHtml}
            </div>
            ${scriptHtml}
        </body>
        </html>`;

    return contenidoHtml;
}


/**
 * Función de utilidad para crear un blob y descargar un archivo.
 * @param {string|Blob} contenido - El contenido del archivo (string o Blob).
 * @param {string} nombreArchivo - El nombre con el que se guardará el archivo.
 * @param {string} tipoMime - El tipo MIME del archivo (ej. 'text/plain').
 */
function descargarArchivo(contenido, nombreArchivo, tipoMime) {
    const blob = (contenido instanceof Blob) 
        ? contenido 
        : new Blob([contenido], { type: tipoMime });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


function renderizarVisorDeLibro2() {
    const visorContainer = document.getElementById('libroscreados');
    if (!visorContainer) {
        console.error('Error: El contenedor "libroscreados" no se encontró.');
        return;
    }

    visorContainer.innerHTML = '';

    if (!libros || libros.length === 0) {
        visorContainer.innerHTML = '<p class="sin-libros-mensaje">Aún no has creado ningún libro.</p>';
        return;
    }

    libros.forEach(libro => {
        const libroCard = document.createElement('div');
        libroCard.className = 'libro-card';
        
        const portada = document.createElement('div');
        portada.className = 'libro-portada';

        // ---- Novedad: Muestra la imagen de portada si existe ----
        if (libro.portadaUrl) {
            portada.style.backgroundImage = `url('${libro.portadaUrl}')`;
            // Para un mejor ajuste, añade en tu CSS:
            // .libro-portada { background-size: cover; background-position: center; }
        }

        portada.onclick = () => {
            seleccionarLibro(libro.id);
            console.log(`Libro "${libro.titulo}" seleccionado. Abriendo vista...`);
            if (typeof abrir === 'function') {
                abrir('capitulosh');
            } else {
                console.warn("La función 'abrir(seccion)' no está definida.");
            }
        };

        const titulo = document.createElement('p');
        titulo.className = 'libro-titulo';
        titulo.textContent = libro.titulo;

        titulo.onclick = (event) => {
            event.stopPropagation();
            const inputEdicion = document.createElement('input');
            inputEdicion.type = 'text';
            inputEdicion.value = libro.titulo;
            inputEdicion.className = 'libro-titulo-input';
            
            const guardarCambios = () => {
                const nuevoTitulo = inputEdicion.value.trim();
                if (nuevoTitulo && nuevoTitulo !== libro.titulo) {
                    libro.titulo = nuevoTitulo;
                    if (libro.id === libroActivoId) {
                        seleccionarLibro(libro.id);
                    }
                }
                renderizarVisorDeLibros(); 
            };

            inputEdicion.addEventListener('blur', guardarCambios);
            inputEdicion.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') inputEdicion.blur();
                else if (e.key === 'Escape') renderizarVisorDeLibros();
            });

            titulo.parentElement.replaceChild(inputEdicion, titulo);
            inputEdicion.focus();
            inputEdicion.select();
        };

        const botonesContainer = document.createElement('div');
        botonesContainer.className = 'libro-botones';

        // ---- Novedad: Botón para cargar imagen de portada ----
        const btnCargarPortada = document.createElement('button');
        btnCargarPortada.textContent = 'Portada';
        btnCargarPortada.onclick = (event) => {
            event.stopPropagation();
            
            // Crea un input de tipo 'file' oculto para abrir el selector de archivos
            const inputArchivo = document.createElement('input');
            inputArchivo.type = 'file';
            inputArchivo.accept = 'image/*'; // Acepta solo archivos de imagen
            
            // Cuando el usuario selecciona un archivo...
            inputArchivo.onchange = (e) => {
                const archivo = e.target.files[0];
                if (!archivo) return;

                const reader = new FileReader();
                reader.onload = (eventReader) => {
                    // Guarda la imagen como Data URL en el objeto libro
                    libro.portadaUrl = eventReader.target.result;
                    // Vuelve a renderizar para mostrar la imagen
                    renderizarVisorDeLibros();
                };
                
                // Lee el archivo para disparar el evento onload
                reader.readAsDataURL(archivo);
            };
            
            inputArchivo.click(); // Abre el selector de archivos
        };

        const btnExportar = document.createElement('button');
        btnExportar.textContent = 'Exportar';
        btnExportar.onclick = (event) => {
            event.stopPropagation();
            console.log(`Exportando libro: ${libro.titulo}`);
        };

        const btnEliminar = document.createElement('button');
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.className = 'btn-eliminar';
        btnEliminar.onclick = (event) => {
            event.stopPropagation();
            if (confirm(`¿Seguro que quieres eliminar el libro "${libro.titulo}"?`)) {
                const index = libros.findIndex(l => l.id === libro.id);
                if (index > -1) {
                    libros.splice(index, 1);
                    renderizarVisorDeLibros();
                }
            }
        };

        // Ensambla los elementos
        botonesContainer.appendChild(btnCargarPortada); // Añadido el nuevo botón
        botonesContainer.appendChild(btnExportar);
        botonesContainer.appendChild(btnEliminar);

        libroCard.appendChild(portada);
        libroCard.appendChild(titulo);
        libroCard.appendChild(botonesContainer);

        visorContainer.appendChild(libroCard);
    });
}