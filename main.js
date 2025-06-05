let guionLiterarioData = []; // Initialize

function abrirGuion() {
    cerrartodo();
    document.getElementById('guion-literario').style.display = 'flex';
}

let indiceCapituloActivo = -1;

function agregarCapituloYMostrar() {
    const nuevoCapitulo = { titulo: "Nuevo Capítulo " + String(guionLiterarioData.length + 1).padStart(3, '0'), contenido: "" };
    guionLiterarioData.push(nuevoCapitulo);
    // Ordenar para encontrar el nuevo índice y establecerlo como activo
    guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));
    indiceCapituloActivo = guionLiterarioData.findIndex(cap => cap === nuevoCapitulo);
    renderizarGuion();
}

function mostrarCapituloSeleccionado(index) {
    indiceCapituloActivo = index;
    const contenidoDiv = document.getElementById('contenido-capitulo-activo');
    contenidoDiv.innerHTML = ''; // Limpiar contenido anterior

    if (index < 0 || index >= guionLiterarioData.length) {
        contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo de la lista o crea uno nuevo.</p>';
        renderizarGuion(); // Para actualizar la lista de títulos (quitar resaltado)
        return;
    }

    const capitulo = guionLiterarioData[index];

    const inputTitulo = document.createElement('input');
    inputTitulo.type = 'text';
    inputTitulo.placeholder = 'Título del Capítulo';
    inputTitulo.value = capitulo.titulo;
    inputTitulo.oninput = function() {
        if (indiceCapituloActivo !== -1) {
            guionLiterarioData[indiceCapituloActivo].titulo = this.value;
            const capituloActualObjeto = guionLiterarioData[indiceCapituloActivo];
            guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));
            indiceCapituloActivo = guionLiterarioData.findIndex(cap => cap === capituloActualObjeto);
            renderizarGuion(); // Re-renderizar para actualizar orden y resaltado
        }
    };

    const textareaContenido = document.createElement('textarea');
    textareaContenido.placeholder = 'Contenido del capítulo...';
    textareaContenido.value = capitulo.contenido;
    textareaContenido.oninput = function() {
        if (indiceCapituloActivo !== -1) {
            guionLiterarioData[indiceCapituloActivo].contenido = this.value;
        }
    };

    contenidoDiv.appendChild(inputTitulo);
    contenidoDiv.appendChild(textareaContenido);

    renderizarGuion(); // Para actualizar el resaltado en la lista
}

function eliminarCapituloActivo() {
    if (indiceCapituloActivo !== -1 && confirm("¿Estás seguro de que quieres eliminar este capítulo?")) {
        guionLiterarioData.splice(indiceCapituloActivo, 1);
        indiceCapituloActivo = -1; // Deseleccionar para mostrar placeholder
        renderizarGuion();
    }
}

function eliminarCapituloDesdeIndice(indexToDelete) {
    if (indexToDelete < 0 || indexToDelete >= guionLiterarioData.length) return;

    if (confirm("¿Estás seguro de que quieres eliminar este capítulo?")) {
        guionLiterarioData.splice(indexToDelete, 1);

        if (indiceCapituloActivo === indexToDelete) {
            indiceCapituloActivo = -1;
        } else if (indiceCapituloActivo > indexToDelete) {
            indiceCapituloActivo--;
        }
        renderizarGuion();
    }
}



function renderizarGuion() {
    const indiceDiv = document.getElementById('indice-capitulos-guion');
    const contenidoDiv = document.getElementById('contenido-capitulo-activo');
    indiceDiv.innerHTML = ''; // Limpiar lista de títulos

    guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));

    guionLiterarioData.forEach((capitulo, index) => {
        const tituloContainer = document.createElement('div');
        tituloContainer.className = 'titulo-capitulo-indice-container';

        const tituloElement = document.createElement('div');
        tituloElement.className = 'titulo-capitulo-indice-texto';
        tituloElement.textContent = capitulo.titulo || "Capítulo sin título";

        if (index === indiceCapituloActivo) {
            tituloContainer.classList.add('activo-container');
            tituloElement.classList.add('activo-texto');
        }
        tituloElement.onclick = () => mostrarCapituloSeleccionado(index);

        const botonEliminarIndice = document.createElement('button');
        botonEliminarIndice.textContent = 'X';
        botonEliminarIndice.className = 'eliminar-capitulo-btn-indice';
        botonEliminarIndice.onclick = (event) => {
            event.stopPropagation();
            eliminarCapituloDesdeIndice(index);
        };

        tituloContainer.appendChild(tituloElement);
        tituloContainer.appendChild(botonEliminarIndice);
        indiceDiv.appendChild(tituloContainer);
    });

    if (indiceCapituloActivo === -1 || guionLiterarioData.length === 0) {
        contenidoDiv.innerHTML = '<p class="mensaje-placeholder">Selecciona un capítulo de la lista o crea uno nuevo.</p>';
    } else if (indiceCapituloActivo >= 0 && indiceCapituloActivo < guionLiterarioData.length) {
        // Si hay un capítulo activo y la lista no está vacía, mostrarCapituloSeleccionado se encarga de renderizarlo.
        // Pero si renderizarGuion se llama DESPUÉS de una acción que no sea seleccionar,
        // necesitamos asegurarnos de que el contenido activo se muestre.
        // Esto se maneja mejor llamando a mostrarCapituloSeleccionado DESPUÉS de renderizarGuion si es necesario.
        // Por ahora, si hay un índice activo, asumimos que mostrarCapituloSeleccionado ya fue llamado o será llamado.
        // Si el contenido está vacío y hay un capítulo activo, lo re-renderizamos.
        if (contenidoDiv.innerHTML.trim() === '' || contenidoDiv.querySelector('.mensaje-placeholder')) {
             mostrarCapituloSeleccionado(indiceCapituloActivo);
        }
    }
}



let inputTexto = document.createElement("textarea");
let inputImagen = document.createElement("img");
let imagenPreview = document.createElement("img");


let chatDiv = document.getElementById("chat");
let frameDiv = document.createElement("div");
function herramientacopiar() {
const chatParagraphs = chatDiv.getElementsByTagName("p");
    if (chatParagraphs.length === 0) return;
const lastMessage = chatParagraphs[chatParagraphs.length - 1].innerText;
    document.execCommand('copy'); // Use execCommand for iframe compatibility
        // navigator.clipboard.writeText(lastMessage) // This might not work in iframes
        // .then(() => alert("Respuesta copiada al portapapeles"))
        // .catch(err => console.error("Error al copiar: ", err));
}
let ultimoId = 0; // Inicializar la variable
localStorage.removeItem("escenas");





function agregarFrame(escenaId, indiceInsercion) {
    if (!escenas[escenaId]) return; // Verificar que la escena exista
    const nuevoFrame = { texto: "", imagen: "" }; // Crear un nuevo frame vacío
    // Insertar el frame en la posición especificada o al final si no se proporciona índice
    if (indiceInsercion !== undefined) {
        escenas[escenaId].frames.splice(indiceInsercion + 1, 0, nuevoFrame);
    } else {
        escenas[escenaId].frames.push(nuevoFrame);
    }
    // Actualizar la lista para reflejar el nuevo frame
    actualizarLista();
}




imagenPreview.style.display = "none"; // Asegurarse de que esté oculto inicialmente
frameDiv.appendChild(inputTexto);
frameDiv.appendChild(inputImagen);
frameDiv.appendChild(imagenPreview);
// Mostrar la imagen cuando se carga
inputImagen.onchange = (event) => {
    let file = event.target.files[0];
if (file) {
        let reader = new FileReader();
        reader.onload = (e) => {
            frame.imagen = e.target.result;
            imagenPreview.src = frame.imagen;
            imagenPreview.style.display = "flex"; // Mostrar la imagen cuando se haya cargado
};
reader.readAsDataURL(file);}};



let titulo2 = document.getElementById("titulo-proyecto").innerText;
function nuevaEscena() {
    ultimoId++;
    let id = String(ultimoId).padStart(3, '0');
// Verificar si el ID ya existe
    while (escenas[id]) {
        ultimoId++;
        id = String(ultimoId).padStart(3, '0');}
escenas[id] = { tipo: "generica",
        texto: "",
        imagen: "",
        opciones: [],
        botones: [],
        frames: [] };
if (typeof(Storage) !== "undefined") {localStorage.setItem("escenas", JSON.stringify(escenas));
    } else {console.error("localStorage no está disponible en este navegador.");}
    actualizarLista();}
function guardarCambios() {
    localStorage.setItem("escenas", JSON.stringify(escenas));}

function reiniciar() {
    if (confirm("¿Reiniciar el proyecto?, perderás todos los cambios sin guardar.")) {
        window.location.reload(true);
        }}


function eliminarFrame(frameIndex, escenaId) {
    if (confirm("¿Eliminar este frame?")) {
        // Eliminar el frame del array de frames en la escena
        escenas[escenaId].frames.splice(frameIndex, 1);
        // Persistir el cambio en localStorage
        localStorage.setItem("escenas", JSON.stringify(escenas));
        // Actualizar la lista de frames
        actualizarLista();}}

function crearBotonEliminarFrame(frameIndex, escenaId) {
    let eliminarFrameBtn = document.createElement("button");
    eliminarFrameBtn.textContent = "X";
    eliminarFrameBtn.className = "ideframeh";
    eliminarFrameBtn.onclick = (event) => {
        event.stopPropagation(); // Evitar que se propague el evento al contenedor padre
        eliminarFrame(frameIndex, escenaId); // Llamar a la función de eliminar frame
};return eliminarFrameBtn;}



let draggedFrameIndex = null;
let draggedFrameEscenaId = null;
let currentDragOverFrameElement = null; // Para el feedback visual

function actualizarLista() {
    let lista = document.getElementById("lista-escenas");
    lista.innerHTML = ""; // Limpiar la lista anterior
    let escenasOrdenadas = Object.keys(escenas).sort();
    escenasOrdenadas.forEach(id => {
        let div = document.createElement("div");
        div.className = "escena";
        div.setAttribute("data-id", id);
        div.onclick = () => editarEscena(id);
        let detallediv = document.createElement("div");
        detallediv.className = "detalle";
        let inputNombre = document.createElement("input");
        inputNombre.className = "imput";


inputNombre.value = escenas[id].texto || id; // Usamos el ID como fallback si .texto no existe

 

 
        inputNombre.style.marginRight = "5px";
        inputNombre.onchange = (event) => {
            let nuevoNombre = event.target.value;
            if (nuevoNombre && nuevoNombre !== id) {
                escenas[nuevoNombre] = escenas[id];
                delete escenas[id];
                localStorage.setItem("escenas", JSON.stringify(escenas)); // Persistir el cambio
                actualizarLista();
            }
        };
        let eliminarBtn = document.createElement("button");
        eliminarBtn.textContent = "X";
        eliminarBtn.className = "ide";
        eliminarBtn.onclick = (event) => {
            event.stopPropagation();
            if (confirm("¿Eliminar esta escena?")) {
                delete escenas[id];
                localStorage.setItem("escenas", JSON.stringify(escenas)); // Persistir el cambio
                actualizarLista();
            }
        };
        let frameBtn = document.createElement("button");
        frameBtn.textContent = "🖼️ + Frame";
        frameBtn.className = "ideframe";
        frameBtn.onclick = (event) => {
            event.stopPropagation();
            agregarFrame(id); // Agregar frame al final
        };
        div.appendChild(detallediv);
        detallediv.appendChild(inputNombre);
        detallediv.appendChild(eliminarBtn);
        detallediv.appendChild(frameBtn);

        // Contenedor de frames dentro de la escena
        let contenedorFrames = document.createElement("div");
        contenedorFrames.className = "contenedor-frames";
        contenedorFrames.style.display = "flex"; // Para alinear en fila
        contenedorFrames.style.flexWrap = "wrap"; // Permitir múltiples líneas
        contenedorFrames.style.marginTop = "10px";

        // Eventos para el contenedor de frames (para soltar al final o en espacio vacío)
        contenedorFrames.ondragover = (event) => {
            event.preventDefault(); // Necesario para permitir el drop
        };

        contenedorFrames.ondrop = (event) => {
            event.preventDefault();
            // Solo actuar si el drop es directamente en el contenedor, no en un frame hijo
            if (event.target !== contenedorFrames) {
                return;
            }
            // Limpiar todos los bordes de los frames en esta escena
            document.querySelectorAll(`#escena-${id} .frameh`).forEach(f => {
                f.style.borderLeft = ""; f.style.borderRight = "";
            });
            currentDragOverFrameElement = null;

            const data = JSON.parse(event.dataTransfer.getData("text/plain"));
            const sourceEscenaId = data.escenaId;
            const sourceFrameIndex = data.index;

            if (sourceEscenaId === id) { // Solo si es la misma escena
                const framesArray = escenas[id].frames;
                // Asegurarse de que el frame no se esté soltando en su propia posición final "vacía"
                if (sourceFrameIndex === framesArray.length -1 && event.target === contenedorFrames) {
                    actualizarLista(); // Limpiar feedback
                    return;
                }
                const [draggedItem] = framesArray.splice(sourceFrameIndex, 1);
                framesArray.push(draggedItem); // Añadir al final

                guardarCambios();
                actualizarLista();
            }
        };
        // Renderizar los frames de la escena
        (escenas[id].frames || []).forEach((frame, index) => {
            let frameDiv = document.createElement("div");
            frameDiv.className = "frameh";
            const textSpan = document.createElement('span');
            textSpan.classList.add('framehtxt');
            textSpan.textContent = `. . . . . Frame ${index + 1}`;
            frameDiv.textContent = ''; // Limpiar contenido previo si es necesario
            frameDiv.appendChild(textSpan);
            // --- INICIO LÓGICA DRAG AND DROP PARA FRAMES ---
            frameDiv.draggable = true;

            frameDiv.ondragstart = (event) => {
                draggedFrameIndex = index;
                draggedFrameEscenaId = id;
                event.dataTransfer.setData("text/plain", JSON.stringify({ index, escenaId: id }));
                event.target.style.opacity = 0.5;
                if (currentDragOverFrameElement) {
                    currentDragOverFrameElement.style.borderLeft = "";
                    currentDragOverFrameElement.style.borderRight = "";
                    currentDragOverFrameElement = null;
                }
            };

            frameDiv.ondragend = (event) => {
                event.target.style.opacity = "";
                document.querySelectorAll(`#escena-${draggedFrameEscenaId} .frameh`).forEach(f => {
                    f.style.borderLeft = "";
                    f.style.borderRight = "";
                });
                currentDragOverFrameElement = null;
                draggedFrameIndex = null;
                draggedFrameEscenaId = null;
            };

            frameDiv.ondragenter = (event) => {
                event.preventDefault();
                if (draggedFrameEscenaId !== id) return;
                if (currentDragOverFrameElement && currentDragOverFrameElement !== frameDiv) {
                    currentDragOverFrameElement.style.borderLeft = "";
                    currentDragOverFrameElement.style.borderRight = "";
                }
                currentDragOverFrameElement = frameDiv;
            };

            frameDiv.ondragover = (event) => {
                event.preventDefault();
                if (draggedFrameEscenaId !== id || index === draggedFrameIndex) {
                    frameDiv.style.borderLeft = ""; frameDiv.style.borderRight = ""; return;
                }
                const rect = frameDiv.getBoundingClientRect();
                if (event.clientX < rect.left + rect.width / 2) {
                    frameDiv.style.borderLeft = "3px solid dodgerblue"; frameDiv.style.borderRight = "";
                } else {
                    frameDiv.style.borderRight = "3px solid dodgerblue"; frameDiv.style.borderLeft = "";
                }
            };

            frameDiv.ondragleave = (event) => {
                 if (event.target === frameDiv && (!event.relatedTarget || !frameDiv.contains(event.relatedTarget))) {
                    frameDiv.style.borderLeft = ""; frameDiv.style.borderRight = "";
                    if (currentDragOverFrameElement === frameDiv) currentDragOverFrameElement = null;
                }
            };

            frameDiv.ondrop = (event) => {
                event.preventDefault();
                if (currentDragOverFrameElement) { currentDragOverFrameElement.style.borderLeft = ""; currentDragOverFrameElement.style.borderRight = ""; currentDragOverFrameElement = null; }
                document.querySelectorAll(`#escena-${id} .frameh`).forEach(f => { f.style.borderLeft = ""; f.style.borderRight = ""; });

                const data = JSON.parse(event.dataTransfer.getData("text/plain"));
                if (data.escenaId !== id) return; // Solo dentro de la misma escena

                const sourceIdx = data.index;
                const targetIdx = index;
                if (sourceIdx === targetIdx) { actualizarLista(); return; }

                const framesArray = escenas[id].frames;
                const draggedItem = framesArray.splice(sourceIdx, 1)[0];
                let effectiveTargetIdx = targetIdx;
                if (sourceIdx < targetIdx) effectiveTargetIdx--;

                const rect = frameDiv.getBoundingClientRect();
                if (event.clientX < rect.left + rect.width / 2) { framesArray.splice(effectiveTargetIdx, 0, draggedItem); }
                else { framesArray.splice(effectiveTargetIdx + 1, 0, draggedItem); }

                guardarCambios();
                actualizarLista();
            };
            // --- FIN LÓGICA DRAG AND DROP ---

            // Sección para añadir texto
            let inputTexto = document.createElement("textarea");
            inputTexto.value = frame.texto || "";
            inputTexto.placeholder = "Escribe el texto aquí";
            inputTexto.oninput = (event) => {
                frame.texto = event.target.value;
                guardarCambios();
            };

            // Sección para añadir imagen
            let inputImagen = document.createElement("input");
            inputImagen.type = "file";
            inputImagen.accept = "image/*, video/mp4, video/webm, image/gif"; // Aceptar imágenes, videos y GIFs
            inputImagen.id = `fileInput-${id}-${index}`;

            inputImagen.onchange = async (event) => {
                let file = event.target.files[0];
                if (file) {
                    let base64Data = '';
                    if (file.type.startsWith('image/gif')) {
                        base64Data = await fileToBase64(file); // Keep GIF as is
                    } else if (file.type.startsWith('image/')) {
                        base64Data = await fileToBase64(file); // For other images, just get Base64 for display
                    } else if (file.type.startsWith('video/')) {
                        // Show loading message
                        alert("Generando GIF desde el video... esto puede tardar unos segundos.");
                        base64Data = await processVideoToGifBase64(file); // Process video to GIF
                        if (base64Data) {
                            alert("GIF generado y cargado.");
                        } else {
                            alert("Error al generar el GIF desde el video.");
                        }
                    }

                    if (base64Data) {
                        frame.imagen = base64Data; // Actualizar la imagen en el objeto `escenas`
                        let imagenPreview = frameDiv.querySelector("img");
                        if (imagenPreview) {
                            imagenPreview.src = frame.imagen; // Actualizar la vista previa de la imagen
                            imagenPreview.style.display = "block";
                        }
                        guardarCambios(); // Guardar cambios en localStorage
                    }
                }
            };

            // Vista previa de la imagen
            let imagenPreview = document.createElement("img");
            imagenPreview.style.width = "100%"; // Tamaño de la imagen
            imagenPreview.style.height = "auto";
            imagenPreview.style.marginTop = "10px";
            imagenPreview.style.display = frame.imagen ? "block" : "none"; // Mostrar solo si hay imagen

            // Si ya existe una imagen en el frame, mostrarla al cargar
            if (frame.imagen) {
                imagenPreview.src = frame.imagen;
            }

            // Agregar el label al frame
            let label = document.createElement("label");
            label.htmlFor = `fileInput-${id}-${index}`;
            label.className = "custom-label";
            label.textContent = "📷";

            label.appendChild(inputImagen);

            frameDiv.appendChild(inputTexto);
            frameDiv.appendChild(label);
            frameDiv.appendChild(imagenPreview);

            // Botón para agregar un nuevo frame después de este
            let agregarFrameBtn = document.createElement("button");
            agregarFrameBtn.textContent = "+ Frame";
            agregarFrameBtn.className = "ideframeh";
            agregarFrameBtn.onclick = (event) => {
                event.stopPropagation(); // Evitar que se propague el evento al contenedor padre
                agregarFrame(id, index); // Llamar a la función de agregar frame con el índice correcto
            };
            frameDiv.appendChild(agregarFrameBtn);

            // Botón para eliminar frame
            let eliminarFrameBtn = crearBotonEliminarFrame(index, id);
            frameDiv.appendChild(eliminarFrameBtn);

            contenedorFrames.appendChild(frameDiv);
        });

        // Agregar el contenedor de frames a la escena
        div.appendChild(contenedorFrames);
        lista.appendChild(div);
    });
}



function editarEscena(escenaId) {
    if (!escenas[escenaId]) return; console.log("Editando escena:", escenaId);}
function actualizarBotones() {
            let botonesLista = document.getElementById("botones-lista");
            botonesLista.innerHTML = "";
if (escenaActual) {
                escenas[escenaActual].botones.forEach((boton, index) => {
                    let div = document.createElement("div");
                    div.className = "boton";
                    div.textContent = `${boton.tipo}: ${boton.texto}`;
                    div.onclick = () => {
if (confirm("¿Estás seguro de que quieres eliminar este botón?")) {
                            eliminarBoton(index); } };
      botonesLista.appendChild(div); });  } }



function eliminarBoton(index) { escenas[escenaActual].botones.splice(index, 1);  actualizarBotones();}

function agregarBoton(tipo) { let textoBoton = prompt("Escribe el texto del botón:");
    if (!textoBoton) return;
    if (tipo === "transicion") {
                let destino = prompt("Ingresa la escena destino:");
                escenas[escenaActual].botones.push({ tipo: "transicion", texto: textoBoton, destino: destino });
    } else if (tipo === "accion") {
                let accion = prompt("Ingresa el nombre de la acción (script):");
                escenas[escenaActual].botones.push({ tipo: "accion", texto: textoBoton, accion: accion });}
            actualizarBotones();}

function guardarEscena() {
            if (escenaActual) {
                escenas[escenaActual].texto = document.getElementById("escena-texto").value;
                console.log(escenas);}
}

// Function to compress non-GIF images for saving
let _compressImageForSave = (imagenSrc) => {
    return new Promise((resolve) => {
        if (!imagenSrc) {
            resolve(""); // If no image, resolve with empty string
            return;
        }
        // If it's a GIF, return it as is (no compression)
        if (imagenSrc.startsWith("data:image/gif;")) {
            resolve(imagenSrc);
            return;
        }

        let img = new Image();
        img.crossOrigin = "Anonymous"; // Avoid CORS issues
        img.onload = function () {
            const maxWidth = 720, maxHeight = 720;
            let width = img.width, height = img.height;

            // Maintain aspect ratio and limit dimensions
            if (width > height && width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            } else if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }

            let canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            let ctx = canvas.getContext("2d");

            // Draw the resized image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG format with 50% compression
            resolve(canvas.toDataURL("image/jpeg", 0.5));
        };
        img.onerror = function () {
            console.error("Error loading image for compression:", imagenSrc);
            resolve(""); // Resolve with empty string on error to prevent blocking
        };
        img.src = imagenSrc;
    });
};


async function guardarJSON() {
    console.log("Escenas antes de guardar:", escenas);
// Ordenar las escenas por ID
    let escenasOrdenadas = Object.keys(escenas).map(id => ({
        ...escenas[id], id
    })).sort((a, b) => a.id.localeCompare(b.id));
    const personajesArray = [];
// Obtener la lista de personajes
    const listapersonajes = document.getElementById("listapersonajes").children;

// Procesar todas las imágenes dentro de las escenas (incluyendo frames)
    let promesasEscenasImagenes = escenasOrdenadas.map(escena => {
// Procesar la imagen principal de la escena
        const imagenSrc = escena.imagen || "";
        return _compressImageForSave(imagenSrc).then(imagenComprimida => {
// Procesar las imágenes de los frames de la escena
            const framesProcesados = escena.frames.map(frame => {
                return _compressImageForSave(frame.imagen || "").then(imagenFrameComprimida => ({
                    ...frame,
                    imagen: imagenFrameComprimida}));});
// Esperar a que todas las imágenes de los frames se procesen
return Promise.all(framesProcesados).then(frames => ({
                ...escena,
                imagen: imagenComprimida,
                frames: frames}));});});
// Procesar las imágenes de los personajes
    let promesasPersonajes = Array.from(listapersonajes).map(personaje => {
        const nombre = personaje.querySelector("input[type='text']")?.value || "";
        const descripcion = personaje.querySelector("textarea")?.value || "";
        const imagenSrc = personaje.querySelector("img")?.src || "";
if (nombre || descripcion || imagenSrc) {  // Verificar si hay algo para guardar
            return _compressImageForSave(imagenSrc).then(imagenComprimida => ({
                nombre, descripcion, imagen: imagenComprimida
            }));}}).filter(Boolean); // Eliminar personajes vacíos
// Procesar la imagen del input de archivo (main scene image)
    let inputFile = document.getElementById("file-input");
    let promesaImagenInput = Promise.resolve(""); // Default empty
    if (inputFile && inputFile.files && inputFile.files.length > 0) {
        const file = inputFile.files[0];
        if (file.type.startsWith('image/gif')) {
            promesaImagenInput = fileToBase64(file);
        } else if (file.type.startsWith('image/')) {
            promesaImagenInput = _compressImageForSave(await fileToBase64(file));
        } else if (file.type.startsWith('video/')) {
            promesaImagenInput = processVideoToGifBase64(file); // Use the new GIF conversion
        }
    }

// Unir todas las promesas (escenas, personajes y archivo de input)
    Promise.all([...promesasEscenasImagenes, ...promesasPersonajes, promesaImagenInput])
        .then(results => {
 // Filter results by type
            let characters = results.filter(item => item && item.nombre !== undefined); // Ensure item is not null/undefined and has a name
            let scenesComplete = results.filter(item => item && item.id !== undefined); // Ensure item is not null/undefined and has an id

            // The last item in results might be the main scene image if it was processed.
            // We need to ensure it's correctly assigned to the main scene's image property if it exists.
            let mainSceneImageBase64 = '';
            if (results.length > 0 && typeof results[results.length - 1] === 'string' && results[results.length - 1].startsWith('data:image')) {
                mainSceneImageBase64 = results.pop(); // Get the last string result if it's a base64 image
            }

            // If there was a main scene image, apply it to the current scene if it exists
            if (mainSceneImageBase64 && escenaActual && escenas[escenaActual]) {
                escenas[escenaActual].imagen = mainSceneImageBase64;
            }

            let data = {
                titulo: document.getElementById("titulo-proyecto").innerText.trim(),
                escenas: scenesComplete,
                personajes: characters,
                guionLiterario: guionLiterarioData,
                apiKeyGemini: apiKey // <-- AÑADIDO: Guardar la API Key
            };
            // Crear y descargar el archivo JSON
            let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            let a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${data.titulo.replace(/\s+/g, '_')}.json`;
            a.click();
        })
        .catch(error => console.error("Error procesando imágenes:", error));
}
function agregarEscenaALista(escena) {
    const nombreEscena = escena.id || "Escena sin nombre"; // Usamos 'id' en lugar de 'nombre'
  let lista = document.getElementById("lista-escenas");
    // Crear div para cada escena
    let div = document.createElement("div");
    div.className = "escena";
    div.onclick = () => editarEscena(escena.id);  // Hacer clic en la escena para editar
    // Campo para editar el nombre de la escena
    let inputNombre = document.createElement("input");
    inputNombre.value = escena.id;
    inputNombre.style.marginRight = "5px";
    inputNombre.onchange = (event) => {
        let nuevoNombre = event.target.value;
        if (nuevoNombre && nuevoNombre !== escena.id) {
            escenas[nuevoNombre] = escenas[escena.id];  // Copiar la escena al nuevo nombre
            delete escenas[escena.id];  // Eliminar la escena con el nombre antiguo
            actualizarLista();  }};
div.appendChild(inputNombre); // Mostrar el input para editar el nombre
// Mostrar un punto para cada escena
    let punto = document.createElement("span");
    punto.style.color = "blue"; // O cualquier estilo que prefieras
    punto.textContent = "• "; // Un punto por cada escena
    div.prepend(punto);  // Prepend para mostrar el punto antes del nombre
// Botón de eliminar
    let eliminarBtn = document.createElement("button");
    eliminarBtn.textContent = "X";
    eliminarBtn.className = "ide";
    eliminarBtn.onclick = (event) => {
        event.stopPropagation(); // Prevenir que se active el onclick de la escena
if (confirm("¿Estás seguro de que quieres eliminar esta escena?")) {
            delete escenas[escena.id];
            actualizarLista();}};
    div.appendChild(eliminarBtn);
    lista.appendChild(div);}
function cargarJSON(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let data = JSON.parse(e.target.result);
// Restaurar el título del proyecto
if (data.titulo) { document.getElementById("titulo-proyecto").innerText = data.titulo;}
// Reiniciar las escenas y la lista de escenas
escenas = {};
let lista = document.getElementById("lista-escenas");
lista.innerHTML = "";
        console.log('Escenas cargadas:', data.escenas);
// Cargar las escenas
if (Array.isArray(data.escenas)) {
            data.escenas.forEach(escena => {
                // Asegurarse de que los frames estén inicializados
                escena.frames = escena.frames || [];
                escenas[escena.id] = escena;
                console.log('Escena restaurada:', escena);
                agregarEscenaALista(escena);}); } else {
            console.error('No se encontraron escenas en el archivo JSON');}
// Cargar los personajes
if (data.personajes && Array.isArray(data.personajes)) {
            const listapersonajes = document.getElementById("listapersonajes");
            listapersonajes.innerHTML = "";
            data.personajes.forEach(personajeData => {
                let contenedor = document.createElement('div');
                contenedor.classList.add('personaje');
                // Caja para el nombre del personaje
                let cajaNombre = document.createElement('input');
                cajaNombre.type = 'text';
                cajaNombre.placeholder = 'Nombre';
                cajaNombre.style.width = '100%';
                cajaNombre.style.marginBottom = '10px';
                cajaNombre.style.fontSize = 'x-large';
                cajaNombre.value = personajeData.nombre || "";
                cajaNombre.classList.add('nombreh');
                contenedor.appendChild(cajaNombre);
                // Caja para la descripción
                let cajaTexto = document.createElement('textarea');
                cajaTexto.placeholder = 'Descripción';
                cajaTexto.value = personajeData.descripcion || "";
                contenedor.appendChild(cajaTexto);
                // Contenedor para la imagen y el botón de carga
                let contenedorImagen = document.createElement('div');
                let imagen = document.createElement('img');
                imagen.src = personajeData.imagen || "";
                contenedorImagen.appendChild(imagen);
                let botonCargar = document.createElement('button');
                botonCargar.innerText = '📷';
                botonCargar.onclick = function() {
                    let inputFile = document.createElement('input');
                    inputFile.type = 'file';
                    inputFile.accept = 'image/*, video/mp4, video/webm, image/gif'; // Aceptar videos y GIFs
                    inputFile.onchange = async function(event) {
                        let archivo = event.target.files[0];
                        if (archivo) {
                            let base64Data = '';
                            if (archivo.type.startsWith('image/gif')) {
                                base64Data = await fileToBase64(archivo);
                            } else if (archivo.type.startsWith('image/')) {
                                base64Data = await fileToBase64(archivo); // Just get Base64 for display
                            } else if (archivo.type.startsWith('video/')) {
                                // Show loading message
                                alert("Generando GIF desde el video... esto puede tardar unos segundos.");
                                base64Data = await processVideoToGifBase64(archivo); // Process video to GIF
                                if (base64Data) {
                                    alert("GIF generado y cargado.");
                                } else {
                                    alert("Error al generar el GIF desde el video.");
                                }
                            }

                            if (base64Data) {
                                imagen.src = base64Data;
                            }
                        }
                    };
inputFile.click();};
                contenedorImagen.appendChild(botonCargar);
                contenedor.appendChild(contenedorImagen);
                listapersonajes.appendChild(contenedor);});}

        if (data.guionLiterario && Array.isArray(data.guionLiterario)) {
            guionLiterarioData = data.guionLiterario;
            indiceCapituloActivo = guionLiterarioData.length > 0 ? 0 : -1; // Activar el primero o ninguno
            renderizarGuion(); // Esto ordenará y mostrará el capítulo activo
        } else {
            guionLiterarioData = [];
            indiceCapituloActivo = -1;
            renderizarGuion();
        }
        // Restaurar la API Key de Gemini si existe en el JSON
        if (data.apiKeyGemini) {
            apiKey = data.apiKeyGemini;
            document.getElementById("apiKeyDisplay").textContent = apiKey;
        }
        actualizarLista(); abrir('escenah');};
    reader.readAsText(file);  }
function abrirSelectorDeArchivos() {
    document.getElementById("file-input").click();}
async function procesarArchivo(event) {
    if (escenaActual && event.target.files.length > 0) {
        let file = event.target.files[0];
        let base64Data = '';

        if (file.type.startsWith('image/gif')) {
            base64Data = await fileToBase64(file); // Keep GIF as is
        } else if (file.type.startsWith('image/')) {
            base64Data = await fileToBase64(file); // For other images, just get Base64 for display
        } else if (file.type.startsWith('video/')) {
            // Show loading message
            alert("Generando GIF desde el video... esto puede tardar unos segundos.");
            base64Data = await processVideoToGifBase64(file); // Process video to GIF
            if (base64Data) {
                alert("GIF generado y cargado.");
            } else {
                alert("Error al generar el GIF desde el video.");
            }
        }

        if (base64Data) {
            escenas[escenaActual].imagen = base64Data;
            let imgPreview = document.getElementById("imagen-preview");
            imgPreview.src = base64Data;
            imgPreview.style.display = "block";
        }
    }
}

// Helper function to convert File to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// NEW: Helper function to process video and generate a GIF


// Asignar evento al input de archivos
document.getElementById("file-input").addEventListener("change", procesarArchivo);
 /////////////////////////  CREACION DEL JUEGO EN FORMATO  ////////////////////////////////////////
window.onload = function() {
    let escenasGuardadas = localStorage.getItem("escenas");
    if (escenasGuardadas) {
        escenas = JSON.parse(escenasGuardadas);

        actualizarLista();}};
// Aquí almacenaremos las escenas del JSON cargado
    let escenas = JSON.parse(localStorage.getItem("escenas")) || {};
    let escenaActual = 'a'; // Por defecto, la primera escena es "a"



// Llamar a esta función cuando se haga clic en una escena para hacerla activa
function cambiarEscenaNONE(idEscena) {
    mostrarEscena(idEscena); // Mostrar la escena seleccionada
    escenaActual = idEscena; }
// Función para cambiar de escena
function cambiarEscenaNONE(idEscena) {        // Asegurarse de que la escena exista
if (escenas[idEscena]) {escenaActual = idEscena; mostrarEscena(escenaActual);
} else {alert("Escena no encontrada.");}}
function guardartextoEscena() {
    let escenaTexto = document.getElementById("escena-texto");
if (escenaTexto && escenaActual && escenas[escenaActual]) {
    escenas[escenaActual].texto = escenaTexto.value;console.log(escenas);}
// Llama a la función nuevamente después de que termine
    setTimeout(guardartextoEscena, 1);}
// Iniciar la función
guardartextoEscena();
// Función que guarda el título de forma automática
document.getElementById("titulo-proyecto").addEventListener("input", function() {
    titulo2 = document.getElementById("titulo-proyecto").innerText;
    console.log("Título del proyecto guardado:", titulo2); });
function cerrartodo() {document.getElementById('personajes').style.display = 'none';
    document.getElementById('lugares').style.display = 'none';
    document.getElementById('ia').style.display = 'none';
    document.getElementById('escena-vista').style.display = 'none';
    document.getElementById('escenah').style.display = 'none';
    document.getElementById('guion-literario').style.display = 'none';}
function  abrir(escena) {
    document.getElementById(escena).style.display = 'flex';}
function  gridear(escena) {
        document.getElementById(escena).style.display = 'grid';}

function agregarPersonaje() {
// Crear un nuevo contenedor para el personaje
    let contenedor = document.createElement('div');
    contenedor.classList.add('personaje');
// Crear una caja de texto para el nombre del personaje
    let cajaNombre = document.createElement('input');
    cajaNombre.type = 'text';
    cajaNombre.placeholder = 'Nombre';  // Placeholder para el nombre
    cajaNombre.style.width = '100%';  // Ajustar el ancho
    cajaNombre.style.marginBottom = '10px';  // Espacio entre el nombre y la descripción
    cajaNombre.style.fontSize = 'x-large';  // Tamaño de la fuente
    cajaNombre.classList.add('nombreh');
    contenedor.appendChild(cajaNombre);
// Crear una caja de texto editable (ahora un textarea)
    let cajaTexto = document.createElement('textarea');
    cajaTexto.placeholder = 'Descripción';  // Placeholder actualizado
    cajaTexto.rows = 4;  // Número de filas para mostrar, ajustable según el tamaño deseado
    cajaTexto.cols = 30; // Número de columnas para ajustar el ancho (opcional)
    contenedor.appendChild(cajaTexto);
/// Crear un contenedor para la imagen y el botón de carga
let contenedorImagen = document.createElement('div');
// Crear y configurar la imagen vacía inicialmente
let imagen = document.createElement('img');
imagen.src = ''; // Imagen vacía inicialmente
imagen.style.maxWidth = '340px'; // Asegura un tamaño adecuado para la vista previa
imagen.style.maxHeight = '95%';
contenedorImagen.appendChild(imagen);
// Crear el botón de carga
let botonCargar = document.createElement('button');
botonCargar.innerText = '📷'; // Icono de cámara como texto en el botón
// Función para cargar la imagen
botonCargar.onclick = function() {
    let inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*, video/mp4, video/webm, image/gif'; // Aceptar solo imágenes, videos y GIFs
// Al seleccionar un archivo, convertirlo a Base64 y mostrarlo en la imagen
    inputFile.onchange = async function(event) {
        let archivo = event.target.files[0];
        if (archivo) {
            let base64Data = '';
            if (archivo.type.startsWith('image/gif')) {
                base64Data = await fileToBase64(archivo);
            } else if (archivo.type.startsWith('image/')) {
                base64Data = await fileToBase64(archivo); // Just get Base64 for display
            } else if (archivo.type.startsWith('video/')) {
                // Show loading message
                alert("Generando GIF desde el video... esto puede tardar unos segundos.");
                base64Data = await processVideoToGifBase64(archivo); // Process video to GIF
                if (base64Data) {
                    alert("GIF generado y cargado.");
                } else {
                    alert("Error al generar el GIF desde el video.");
                }
            }

            if (base64Data) {
                imagen.src = base64Data; // Asignar la imagen en formato Base64
            }
        }
    };
    inputFile.click();   // Simular un clic en el input de archivos
};
    contenedorImagen.appendChild(botonCargar);

// Crear el botón de eliminación
let botonEliminar = document.createElement('button');
    botonEliminar.innerText = 'X'; // Icono de eliminar
    botonEliminar.className = 'ideframeh';
    botonEliminar.onclick = function() {
        if (confirm("¿Estás seguro de que quieres eliminar este personaje?")) {
            contenedor.remove(); // Eliminar el contenedor del personaje
        }
    };
    contenedorImagen.appendChild(botonEliminar);



    contenedor.appendChild(contenedorImagen);
    document.getElementById('listapersonajes').appendChild(contenedor);



} // Agregar el nuevo personaje a la lista

let indiceguia = 0;
let nombrecompleto = "";
let escenaconcreta = 1;

function crearEscenasAutomaticamente(nombreBase, numEscenas, numFrames) {
    indiceguia = indiceguia + 1;
    for (escenaconcreta = 1; escenaconcreta <= numEscenas; escenaconcreta++) {
        let id = `${nombreBase} ${String(escenaconcreta).padStart(3, '0')}`; // Generar IDs con el nombre base
if (nombrecompleto === "a") {nombrecompleto = id; }


        // Verificar si el ID ya existe
        while (escenas[id]) {
            escenaconcreta++;
            id = `${nombreBase}-${String(escenaconcreta).padStart(3, '0')}`;
        }
        escenas[id] = {
            tipo: "generica",
            texto: "",
            imagen: "",
            opciones: [],
            botones: [],
            frames: []
        };
        // Agregar frames a la escena
        for (let j = 0; j < numFrames; j++) {
            escenas[id].frames.push({ texto: "", imagen: "" });
        }
    }
    // Actualizar la lista de escenas
    actualizarLista();
}

  
// Inicializa las variables leyendo los valores por defecto del HTML para mayor consistencia.
// Estas variables se actualizarán con las funciones del botón antes de usarse.
let nombredelahistoria = document.getElementById("nombrehistoria").value;
let cantidaddeescenas = parseInt(document.getElementById("cantidadescenas").value);
let cantidadframes = parseInt(document.getElementById("cantidadeframes").value); // <-- Ahora lee el valor por defecto del HTML, que es 3.

function actualizarnombreescena() {
    let inputTexto = document.getElementById("nombrehistoria").value;
    nombredelahistoria = inputTexto;
    let inputNumber = document.getElementById("cantidadescenas").value;
    cantidaddeescenas = inputNumber;
    if (cantidaddeescenas === "") {
        cantidaddeescenas = 0;
    }
    // Actualizar el nombre de las escenas existentes
    for (let id in escenas) {
        if (id.startsWith(nombredelahistoria)) {
            escenas[id].texto = nombredelahistoria;
        }
    }
    // Actualizar la lista de escenas
    actualizarLista();
}


        function agregarBotonEliminarAPersonajes() {
    // Obtener todos los personajes existentes
    const personajes = document.getElementById('listapersonajes').children;

    // Iterar sobre cada personaje
    for (let personaje of personajes) {
        // Verificar si el botón de eliminación ya existe
        const botonEliminarExistente = personaje.querySelector('button.ideframeh');
        if (botonEliminarExistente) {
            continue; // Si ya existe, no agregar uno nuevo
        }

        // Crear el botón de eliminación
        let botonEliminar = document.createElement('button');
        botonEliminar.innerText = 'X'; // Icono de eliminar
        botonEliminar.className = 'ideframeh';
        botonEliminar.onclick = function() {
            if (confirm("¿Estás seguro de que quieres eliminar este personaje?")) {
                personaje.remove(); // Eliminar el contenedor del personaje
            }
        };

        // Agregar el botón de eliminación al contenedor de la imagen
        const contenedorImagen = personaje.querySelector('div');
        contenedorImagen.appendChild(botonEliminar);
    }
}



// --- Lógica para el cambio de tema ---
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
        if (themeToggleButton) themeToggleButton.textContent = '☀️'; // Sol si el tema AHORA es oscuro
    } else {
        localStorage.setItem('theme', 'light');
        if (themeToggleButton) themeToggleButton.textContent = '🌙'; // Luna si el tema AHORA es claro
    }
}

// Aplicar tema al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme'); // Aplicar directamente la clase
        if (themeToggleButton) themeToggleButton.textContent = '☀️';     // Actualizar el botón a sol
    } else {
        if (themeToggleButton) themeToggleButton.textContent = '🌙';     // Asegurar que el botón muestre la luna
    }
});
//  escenas[escenaId].frames[frameIndex].texto = reply;   frame.texto = reply;
