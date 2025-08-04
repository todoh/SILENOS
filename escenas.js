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
    lista.innerHTML = ""; // Limpiamos la lista para redibujar

    // Si no hay un libro activo, muestra un mensaje y termina.
    if (!libroActivoId) {
        lista.innerHTML = '<p class="mensaje-placeholder">Usa el botón del menú para seleccionar o crear un libro.</p>';
        return;
    }

    // Filtra y ordena los capítulos que pertenecen al libro activo.
    const escenasDelLibroActivo = Object.keys(escenas)
        .filter(id => escenas[id].libroId === libroActivoId)
        .sort();

    if (escenasDelLibroActivo.length === 0) {
        lista.innerHTML = '<p class="mensaje-placeholder">Este libro está vacío. Haz clic en el botón "+" para añadir tu primer capítulo.</p>';
    }

    // Itera sobre cada capítulo para crearlo en el DOM.
    escenasDelLibroActivo.forEach(id => {
        const escenaData = escenas[id];
        
        // --- Contenedor principal del Capítulo ---
        const divCapitulo = document.createElement("div");
        divCapitulo.className = "escena"; // Tu clase CSS para un capítulo
        divCapitulo.setAttribute("data-id", id);

        // --- Cabecera del Capítulo (Título y botones) ---
        const cabecera = document.createElement("div");
        cabecera.className = "detalle"; // Tu clase CSS para la cabecera

        const inputNombre = document.createElement("input");
        inputNombre.className = "imput";
        inputNombre.value = escenaData.texto || `Capítulo`;
        inputNombre.placeholder = "Nombre del Capítulo";
        inputNombre.onchange = (event) => {
            escenaData.texto = event.target.value;
            guardarCambios();
        };

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

        cabecera.append(inputNombre, eliminarBtn, agregarFrameBtnPrincipal);
        divCapitulo.appendChild(cabecera);

        // --- Contenedor de todos los Frames ---
        const contenedorFrames = document.createElement("div");
        contenedorFrames.className = "contenedor-frames"; // Tu clase CSS para la lista de frames

        (escenaData.frames || []).forEach((frameData, index) => {
            const frameDiv = document.createElement("div");
            frameDiv.className = "frameh";

            // --- Área de Texto del Frame ---
            const inputTexto = document.createElement("textarea");
            inputTexto.value = frameData.texto || "";
            inputTexto.placeholder = "Escribe el texto del frame...";
            inputTexto.oninput = (event) => {
                frameData.texto = event.target.value;
                guardarCambios();
            };

            // --- Imagen y Lógica de Carga ---
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

            // ==========================================================
            //  CAMBIO: Se reemplaza <label> por <button> para subir imagen
            // ==========================================================
            const botonSubirImagen = document.createElement("button");
            botonSubirImagen.className = "custom-label"; // Reutilizamos la clase para posicionamiento
            botonSubirImagen.textContent = "📷";
            botonSubirImagen.title = "Subir o cambiar imagen";
            
            // Estilos para que parezca un icono sin fondo/borde
            botonSubirImagen.style.border = "none";
            botonSubirImagen.style.background = "transparent";
            botonSubirImagen.style.padding = "0";
            botonSubirImagen.style.fontSize = "1.5em"; // Hacemos el emoji más grande y fácil de pulsar

            botonSubirImagen.onclick = (event) => {
                event.stopPropagation(); // Previene que otros eventos de clic se disparen
                document.getElementById(inputId).click(); // Dispara el clic en el input de archivo oculto
            };


            // --- Botones de Acción del Frame ---
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

            // --- Ensamblaje del Frame ---
            // Se añade el nuevo botón (botonSubirImagen) en lugar del label.
            frameDiv.append(inputTexto, botonSubirImagen, inputImagen, imagenPreview, agregarFrameBtn, eliminarFrameBtn, generarImagenBtn);
            contenedorFrames.appendChild(frameDiv);
        });

        divCapitulo.appendChild(contenedorFrames);
        lista.appendChild(divCapitulo);
    });
}

// =================================================================
// LÓGICA DEL VISOR DE IMÁGENES (LIGHTBOX)
// Se ejecuta una sola vez cuando el documento está listo.
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('image-preview-overlay');
    const enlargedImg = document.getElementById('enlarged-img');
    const closeBtn = overlay ? overlay.querySelector('.close-btn') : null;

    // Si los elementos del visor no existen en el HTML, no continuamos.
    if (!overlay || !enlargedImg || !closeBtn) {
        console.warn("Los elementos del visor de imágenes (overlay) no se encontraron en el HTML. La función de ampliar imagen no estará disponible.");
        return;
    }

    /**
     * Cierra el visor de imágenes y resetea su contenido.
     */
    function closePreview() {
        overlay.classList.remove('visible');
        // IMPORTANTE: Limpiamos el 'src' para que no quede en memoria.
        enlargedImg.src = ""; 
    }

    // --- ASIGNACIÓN DE EVENTOS PARA CERRAR EL VISOR ---

    // 1. Clic en el fondo oscuro (el propio overlay)
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closePreview();
        }
    });
  
    // 2. Clic en el botón de cerrar (la 'X')
    closeBtn.addEventListener('click', closePreview);

    // 3. Pulsar la tecla 'Escape'
    document.addEventListener('keydown', (event) => {
        if (event.key === "Escape" && overlay.classList.contains('visible')) {
            closePreview();
        }
    });
});

// Nota: Las funciones `crearEscenasAutomaticamente`, `reiniciarContadorEscenas`, etc.,
// se mantienen igual que en tu archivo original y no necesitan cambios.
// Las he omitido aquí por brevedad, pero debes mantenerlas en tu archivo final.
