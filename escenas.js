// =================================================================
// SILENOS - GESTIÓN DE CAPÍTULOS (ESCENAS) Y FRAMES
// Versión Refactorizada y Mejorada
// =================================================================

/**
 * Crea un nuevo capítulo (escena) asociado al libro que está activo.
 * Utiliza un ID único basado en el timestamp para evitar conflictos.
 */
function nuevaEscena() {
    if (!libroActivoId) {
        alert("Por favor, selecciona o crea un libro antes de añadir un capítulo.");
        return;
    }

    const id = `${libroActivoId}-capitulo-${Date.now()}`;
    const numCapitulosActuales = Object.values(escenas).filter(e => e.libroId === libroActivoId).length;

    escenas[id] = {
        tipo: "generica",
        texto: `Capítulo ${numCapitulosActuales + 1}`,
        imagen: "",
        opciones: [],
        botones: [],
        frames: [],
        generadoPorIA: false,
        libroId: libroActivoId
    };

    guardarCambios();
    actualizarLista();
}

/**
 * Agrega un nuevo frame vacío a un capítulo específico.
 * @param {string} escenaId - El ID del capítulo al que se agregará el frame.
 * @param {number} [indiceInsercion] - El índice después del cual se insertará el nuevo frame.
 */
function agregarFrame(escenaId, indiceInsercion) {
    if (!escenas[escenaId]) return;
    const nuevoFrame = { texto: "", imagen: "" };

    if (indiceInsercion !== undefined) {
        escenas[escenaId].frames.splice(indiceInsercion + 1, 0, nuevoFrame);
    } else {
        escenas[escenaId].frames.push(nuevoFrame);
    }
    actualizarLista();
}

/**
 * Elimina un frame de un capítulo.
 * @param {number} frameIndex - El índice del frame a eliminar.
 * @param {string} escenaId - El ID del capítulo al que pertenece el frame.
 */
function eliminarFrame(frameIndex, escenaId) {
    if (confirm("¿Eliminar este frame?")) {
        escenas[escenaId].frames.splice(frameIndex, 1);
        guardarCambios();
        actualizarLista();
    }
}

/**
 * Guarda el estado actual del objeto 'escenas' en el localStorage.
 */
function guardarCambios() {
    if (typeof(Storage) !== "undefined") {
        try {
            localStorage.setItem("escenas", JSON.stringify(escenas));
        } catch (error) {
            console.error("Error al guardar cambios en localStorage:", error);
        }
    } else {
        console.error("localStorage no está disponible en este navegador.");
    }
}

/**
 * Convierte un objeto File a una cadena de texto en formato Base64.
 * @param {File} file - El archivo a convertir.
 * @returns {Promise<string>} Una promesa que se resuelve con la cadena Base64.
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}


/**
 * Función principal que redibuja toda la lista de capítulos y frames en la interfaz.
 * Esta es la función más importante para la UI.
 */
function actualizarLista() {
    const lista = document.getElementById("lista-capitulos");
    if (!lista) return;
    lista.innerHTML = "";

    if (!libroActivoId) {
        lista.innerHTML = '<p class="mensaje-placeholder">Usa el botón del menú para seleccionar o crear un libro.</p>';
        return;
    }

    const escenasDelLibroActivo = Object.keys(escenas)
        .filter(id => escenas[id].libroId === libroActivoId)
        .sort();

    if (escenasDelLibroActivo.length === 0) {
        lista.innerHTML = '<p class="mensaje-placeholder">Este libro está vacío. Haz clic en el botón "+" para añadir tu primer capítulo.</p>';
    }

    escenasDelLibroActivo.forEach(id => {
        const escenaData = escenas[id];
        const divCapitulo = document.createElement("div");
        divCapitulo.className = "escena";
        divCapitulo.setAttribute("data-id", id);

        const cabecera = document.createElement("div");
        cabecera.className = "detalle";

        const inputNombre = document.createElement("input");
        inputNombre.className = "imput";
        inputNombre.value = escenaData.texto || `Capítulo`;
        inputNombre.placeholder = "Nombre del Capítulo";
        inputNombre.onchange = (event) => {
            escenaData.texto = event.target.value;
            guardarCambios();
        };
        cabecera.append(inputNombre);

        // =================================================================
        // INICIO: CÓDIGO AÑADIDO PARA LOS BOTONES DE REESCRITURA
        // =================================================================
        const libroActivo = libros.find(l => l.id === libroActivoId);
        const tieneContextoIA = libroActivo && libroActivo.iaContext;

        // Los botones solo aparecen si el libro tiene un guion vinculado Y el capítulo fue generado por IA.
        if (escenaData.generadoPorIA && tieneContextoIA) {
            const reescribirCapBtn = document.createElement("button");
            reescribirCapBtn.textContent = "✍️";
            reescribirCapBtn.className = "ide"; // Reutilizamos el estilo
            reescribirCapBtn.title = "Reescribir este capítulo con IA";
            reescribirCapBtn.onclick = (event) => {
                event.stopPropagation();
                iniciarReescrituraCapitulo(id); // Llama a la función en reescritura.js
            };

            const reescribirDesdeBtn = document.createElement("button");
            reescribirDesdeBtn.textContent = "✍️»";
            reescribirDesdeBtn.className = "ide"; // Reutilizamos el estilo
            reescribirDesdeBtn.title = "Reescribir desde este capítulo hasta el final";
            reescribirDesdeBtn.onclick = (event) => {
                event.stopPropagation();
                iniciarReescrituraDesdeCapitulo(id); // Llama a la función en reescritura.js
            };
            
            // Añadimos los botones de IA a la cabecera
            cabecera.append(reescribirCapBtn, reescribirDesdeBtn);
        }
        // =================================================================
        // FIN: CÓDIGO AÑADIDO
        // =================================================================
        
        const eliminarBtn = document.createElement("button");
        eliminarBtn.textContent = "❌";
        eliminarBtn.className = "ide";
        eliminarBtn.title = "Eliminar Capítulo";
        eliminarBtn.onclick = (event) => {
            event.stopPropagation();
            if (confirm("¿Eliminar este capítulo y todos sus frames?")) {
                delete escenas[id];
                guardarCambios();
                actualizarLista();
            }
        };

        const agregarFrameBtnPrincipal = document.createElement("button");
        agregarFrameBtnPrincipal.textContent = "➕";
        agregarFrameBtnPrincipal.className = "ideframe";
        agregarFrameBtnPrincipal.title = "Añadir un nuevo frame al final";
        agregarFrameBtnPrincipal.onclick = (event) => {
            event.stopPropagation();
            agregarFrame(id);
        };
        
        cabecera.append(eliminarBtn, agregarFrameBtnPrincipal);
        
        divCapitulo.appendChild(cabecera);

        const contenedorFrames = document.createElement("div");
        contenedorFrames.className = "contenedor-frames";

        (escenaData.frames || []).forEach((frameData, index) => {
            const frameDiv = document.createElement("div");
            frameDiv.className = "frameh";

            const inputTexto = document.createElement("textarea");
            inputTexto.value = frameData.texto || "";
            inputTexto.placeholder = "Escribe el texto del frame...";
            inputTexto.oninput = (event) => {
                frameData.texto = event.target.value;
                guardarCambios();
            };

            const imagenPreview = document.createElement("img");
            imagenPreview.style.display = frameData.imagen ? "block" : "none";
            if (frameData.imagen) {
                imagenPreview.src = frameData.imagen;
            }
            imagenPreview.onclick = (event) => {
                event.stopPropagation(); 
                const overlay = document.getElementById('image-preview-overlay');
                const enlargedImg = document.getElementById('enlarged-img');
                if (overlay && enlargedImg) {
                    enlargedImg.src = imagenPreview.src;
                    overlay.classList.add('visible');
                }
            };
            imagenPreview.style.cursor = "pointer";
            imagenPreview.title = "Haz clic para ampliar la imagen";

            const inputId = `fileInput-${id}-${index}`;
            const inputImagen = document.createElement("input");
            inputImagen.type = "file";
            inputImagen.accept = "image/*, video/mp4, video/webm, image/gif";
            inputImagen.style.display = 'none';
            inputImagen.id = inputId;
            inputImagen.onchange = async (event) => {
                const file = event.target.files[0];
                if (file) {
                    frameData.imagen = await fileToBase64(file);
                    imagenPreview.src = frameData.imagen;
                    imagenPreview.style.display = "block";
                    guardarCambios();
                }
            };

            const botonSubirImagen = document.createElement("button");
            botonSubirImagen.className = "custom-label";
            botonSubirImagen.textContent = "📷";
            botonSubirImagen.title = "Subir o cambiar imagen";
            botonSubirImagen.style.border = "none";
            botonSubirImagen.style.background = "transparent";
            botonSubirImagen.style.padding = "0";
            botonSubirImagen.style.fontSize = "1.5em";
            botonSubirImagen.onclick = (event) => {
                event.stopPropagation();
                document.getElementById(inputId).click();
            };

            const agregarFrameBtn = document.createElement("button");
            agregarFrameBtn.textContent = "➕";
            agregarFrameBtn.className = "ideframeh";
            agregarFrameBtn.title = "Insertar un nuevo frame aquí";
            agregarFrameBtn.onclick = (event) => {
                event.stopPropagation();
                agregarFrame(id, index);
            };

            const eliminarFrameBtn = document.createElement("button");
            eliminarFrameBtn.textContent = "❌";
            eliminarFrameBtn.className = "ideframeh2";
            eliminarFrameBtn.title = "Eliminar este frame";
            eliminarFrameBtn.onclick = (event) => {
                event.stopPropagation();
                eliminarFrame(index, id);
            };
            
            const generarImagenBtn = document.createElement("button");
            generarImagenBtn.textContent = "✨";
            generarImagenBtn.title = "Generar Imagen con IA";
            generarImagenBtn.className = "ideframeh3";
            generarImagenBtn.onclick = (event) => {
                event.stopPropagation();
                if (window.generarImagenParaFrameConIA) {
                    generarImagenParaFrameConIA(id, index);
                } else {
                    alert("La función de generación de imágenes con IA no está disponible.");
                }
            };

// =================================================================
// Botón para generar 9 imágenes en serie
// =================================================================
          const generarImagenesEnSerieBtn = document.createElement("button");
           generarImagenesEnSerieBtn.id = 'ideframe';
            generarImagenesEnSerieBtn.className = 'ideframeh4'; 
            generarImagenesEnSerieBtn.title = 'Generar 9 Imágenes con IA en serie';
            generarImagenesEnSerieBtn.innerHTML = '✨×9';
            generarImagenesEnSerieBtn.onclick = (event) => {
                event.stopPropagation();
                if (window.generarMultiplesImagenesParaFrameConIA) {
                    generarMultiplesImagenesParaFrameConIA(id, index);
                } else {
                    alert("La función de generación de imágenes en serie no está disponible.");
                }
            };
            
            frameDiv.append(inputTexto, botonSubirImagen, inputImagen, imagenPreview, agregarFrameBtn, eliminarFrameBtn, generarImagenBtn, generarImagenesEnSerieBtn);
            contenedorFrames.appendChild(frameDiv);

            
        });

        divCapitulo.appendChild(contenedorFrames);
        lista.appendChild(divCapitulo);
    });
}

// =================================================================
// LÓGICA DEL VISOR DE IMÁGENES (LIGHTBOX)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('image-preview-overlay');
    const enlargedImg = document.getElementById('enlarged-img');
    const closeBtn = overlay ? overlay.querySelector('.close-btn') : null;

    if (!overlay || !enlargedImg || !closeBtn) {
        console.warn("Los elementos del visor de imágenes (overlay) no se encontraron en el HTML.");
        return;
    }

    function closePreview() {
        overlay.classList.remove('visible');
        enlargedImg.src = ""; 
    }

    // Cierra el preview si se hace clic fuera de la imagen (en el fondo del overlay)
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closePreview();
        }
    });
    
    // Cierra el preview con el botón X
    closeBtn.addEventListener('click', closePreview);

    // Cierra el preview con la tecla "Escape"
    document.addEventListener('keydown', (event) => {
        if (event.key === "Escape" && overlay.classList.contains('visible')) {
            closePreview();
        }
    });
});

function crearEscenasAutomaticamente(nombreBase, numEscenas, numFrames) {
    if (!libroActivoId) {
        alert("Error interno: Se intentó crear capítulos sin un libro activo seleccionado.");
        return;
    }

    if (!nombreBase || numEscenas <= 0) {
        console.error("Llamada inválida a crearEscenasAutomaticamente");
        return;
    }

    for (let i = 1; i <= numEscenas; i++) {
        const id = `${libroActivoId}-${nombreBase}-${Date.now() + i}`;
        if (escenas[id]) {
            console.warn(`La escena con ID ${id} ya existía.`);
            continue;
        }

        const framesIniciales = [];
        for (let j = 0; j < numFrames; j++) {
            framesIniciales.push({ texto: "", imagen: "" });
        }

        escenas[id] = {
            tipo: "generica",
            texto: `${nombreBase} ${i}`,
            imagen: "",
            opciones: [],
            botones: [],
            frames: framesIniciales,
            generadoPorIA: true,
            libroId: libroActivoId
        };
    }
    
    guardarCambios();
    actualizarLista();
}

function reiniciarContadorEscenas() {
    ultimoId = 0;
}