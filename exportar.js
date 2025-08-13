// ===================================
// GESTIÓN DE MODALES DE EXPORTACIÓN Y LÓGICA
// ===================================

// --- MODAL DE EXPORTACIÓN ---

function modalExportarDatos() {
    // --- 1. Creación de los elementos del Modal ---

    // Contenedor principal del modal (overlay)
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'export-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex; justify-content: center; align-items: center;
        z-index: 1000;
    `;

    // Contenedor del contenido del modal
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: #fff;
        padding: 25px;
        border-radius: 10px;
        width: 90%;
        max-width: 600px;
        height: 80%;
        max-height: 700px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        
    `;

    // Título del modal
    const modalTitle = document.createElement('h1');
    modalTitle.textContent = 'Exportar Datos a JSON';
    modalTitle.style.cssText = 'margin-top: 0; color: #333;';

    // Botón para cerrar el modal
    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 15px;
        right: 20px;
        font-size: 30px;
        font-weight: bold;
        cursor: pointer;
        color: #888;
    `;
    closeButton.onclick = () => document.body.removeChild(modalOverlay);

    // Contenedor para la lista de personajes (con scroll)
    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
        flex-grow: 1;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 10px;
        margin-top: 15px;
    `;

    // --- 2. Llenado de la lista de personajes (CORRECCIÓN AQUÍ) ---

    // Primero, recolectamos los datos de los personajes desde el DOM.
    const listapersonajesNodes = document.getElementById("listapersonajes").children;
    const personajes = Array.from(listapersonajesNodes).map(personajeNode => {
        const nombre = personajeNode.querySelector("input.nombreh")?.value || "";
        const descripcion = personajeNode.querySelector("textarea")?.value || "";
        const imagenSrc = personajeNode.querySelector("img")?.src || "";
        const svgContent = personajeNode.dataset.svgContent || "";
        const etiquetaEl = personajeNode.querySelector(".change-tag-btn");
        const arcoEl = personajeNode.querySelector(".change-arc-btn");
        const etiqueta = etiquetaEl ? etiquetaEl.dataset.etiqueta : 'indeterminado';
        const arco = arcoEl ? arcoEl.dataset.arco : 'sin_arco';
        if (!nombre && !descripcion && !imagenSrc) return null;
        return { nombre, descripcion, imagen: imagenSrc, svgContent, etiqueta, arco };
    }).filter(Boolean); // .filter(Boolean) elimina cualquier elemento nulo.


    if (personajes.length === 0) {
        listContainer.textContent = 'No se encontraron datos de personajes para exportar.';
    } else {
        personajes.forEach((personaje, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                padding: 8px;
                border-bottom: 1px solid #eee;
            `;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'personaje-checkbox';
            checkbox.dataset.personajeIndex = index; // Guardamos el índice para encontrar el objeto original
            checkbox.style.marginRight = '15px';
            checkbox.style.transform = 'scale(1.2)';

            const img = document.createElement('img');
            img.src = personaje.imagen || 'https://placehold.co/50x50/eee/ccc?text=?'; // Imagen por defecto
            img.style.cssText = 'width: 50px; height: 50px; border-radius: 5px; object-fit: cover; margin-right: 15px;';
            img.onerror = () => { img.src = 'https://placehold.co/50x50/eee/ccc?text=?'; };


            const name = document.createElement('span');
            name.textContent = personaje.nombre || 'Sin nombre';
            name.style.fontWeight = 'bold';

            item.appendChild(checkbox);
            item.appendChild(img);
            item.appendChild(name);
            listContainer.appendChild(item);
        });
    }

    // --- 3. Creación de los botones de acción ---

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin-top: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;';
    
    const selectionButtons = document.createElement('div');
    selectionButtons.style.cssText = 'display: flex; gap: 10px;';

    const selectAllButton = document.createElement('button');
    selectAllButton.textContent = 'Seleccionar Todo';
    selectAllButton.style.cssText = 'padding: 10px 15px; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; background-color: #f0f0f0;';
    selectAllButton.onclick = () => {
        document.querySelectorAll('.personaje-checkbox').forEach(cb => cb.checked = true);
    };

    const deselectAllButton = document.createElement('button');
    deselectAllButton.textContent = 'Deseleccionar Todo';
    deselectAllButton.style.cssText = 'padding: 10px 15px; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; background-color: #f0f0f0;';
    deselectAllButton.onclick = () => {
        document.querySelectorAll('.personaje-checkbox').forEach(cb => cb.checked = false);
    };
    
    selectionButtons.appendChild(selectAllButton);
    selectionButtons.appendChild(deselectAllButton);

    const exportButton = document.createElement('button');
    exportButton.textContent = 'Exportar Seleccionados';
    exportButton.style.cssText = `
        padding: 12px 20px;
        border: none;
        border-radius: 5px;
        background-color: #28a745;
        color: white;
        font-size: 16px;
        cursor: pointer;
        font-weight: bold;
    `;
    exportButton.onclick = () => {
        const seleccionados = [];
        const checkboxes = document.querySelectorAll('.personaje-checkbox:checked');

        if (checkboxes.length === 0) {
            alert('Por favor, selecciona al menos un personaje para exportar.');
            return;
        }

        checkboxes.forEach(cb => {
            const index = parseInt(cb.dataset.personajeIndex, 10);
            if (personajes[index]) {
                seleccionados.push(personajes[index]);
            }
        });

        // Crear y descargar el archivo JSON
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(seleccionados, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "personajes_exportados.json");
        document.body.appendChild(downloadAnchorNode); // Requerido para Firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        // Cerrar el modal después de exportar
        document.body.removeChild(modalOverlay);
    };

    // --- 4. Ensamblaje y visualización del Modal ---
    
    buttonContainer.appendChild(selectionButtons);
    buttonContainer.appendChild(exportButton);

    modalContent.appendChild(closeButton);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(listContainer);
    modalContent.appendChild(buttonContainer);

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Cerrar el modal si se hace clic fuera del contenido
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
}


function cerrarModalExportar() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-exportar');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}

// --- FUNCIONES DE EXPORTACIÓN ---

 
/**
 * Exporta la sección de Capítulos (escenas y frames) a un archivo HTML simple.
 */
async function generarHTML() {
    console.log("Iniciando generación de HTML para Guion...");
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    let bodyContent = `<h1>${tituloProyecto}</h1>`;

    const capitulosOrdenados = Object.keys(escenas).sort();

    for (const id of capitulosOrdenados) {
        const capitulo = escenas[id];
        bodyContent += `<h2>${capitulo.texto || id}</h2>`;

        if (capitulo.frames && capitulo.frames.length > 0) {
            for (const frame of capitulo.frames) {
                bodyContent += '<div class="frame-export">';
                if (frame.imagen) {
                    try {
                        // Se asume que _compressImageForSave existe en el scope (io.js)
                        const imagenComprimida = await _compressImageForSave(frame.imagen);
                        if (imagenComprimida) {
                           bodyContent += `<img src="${imagenComprimida}" alt="Imagen del frame">`;
                        }
                    } catch (error) {
                        console.error("Error al procesar imagen para exportar:", error);
                    }
                }
                if (frame.texto) {
                    bodyContent += `<p>${frame.texto.replace(/\n/g, "<br>")}</p>`;
                }
                bodyContent += '</div>';
            }
        }
    }

    const htmlCompleto = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${tituloProyecto}</title>
            <style>
                body { font-family: montserrat; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
                .container { max-width: 800px; margin: auto; background: white; padding: 20px 40px; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.1); }
                h1, h2 { color: #333; }
                h1 { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 40px; }
                .frame-export { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: #fafafa; }
                img { max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px; display: block; }
                p { margin-top: 0; }
            </style>
        </head>
        <body>
            <div class="container">
                ${bodyContent}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Guion.html`;
    a.click();
    console.log("Exportación de Guion a HTML completada.");
    cerrarModalExportar();
}
