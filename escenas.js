// ===================================
// GESTIÓN DE ESCENAS Y FRAMES
// ===================================

function nuevaEscena() {
    // AÑADIDO: Comprobar si hay un libro activo antes de crear un capítulo
    if (!libroActivoId) {
        alert("Por favor, selecciona o crea un libro usando el botón '📚 Seleccionar Libro' antes de añadir un capítulo.");
        return;
    }

    ultimoId++;
    let id = String(ultimoId).padStart(3, '0');
    while (escenas[id]) {
        ultimoId++;
        id = String(ultimoId).padStart(3, '0');
    }
    
    // MODIFICADO: Añadir la propiedad libroId al crear la escena/capítulo
    escenas[id] = {
        tipo: "generica",
        texto: "", // El usuario le pondrá nombre
        imagen: "",
        opciones: [],
        botones: [],
        frames: [],
        generadoPorIA: false,
        libroId: libroActivoId // <-- LÍNEA AÑADIDA
    };

    if (typeof(Storage) !== "undefined") {
        localStorage.setItem("escenas", JSON.stringify(escenas));
    } else {
        console.error("localStorage no está disponible en este navegador.");
    }
    actualizarLista();
}

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

function eliminarFrame(frameIndex, escenaId) {
    if (confirm("¿Eliminar este frame?")) {
        escenas[escenaId].frames.splice(frameIndex, 1);
        guardarCambios();
        actualizarLista();
    }
}

function crearBotonEliminarFrame(frameIndex, escenaId) {
    let eliminarFrameBtn = document.createElement("button");
    eliminarFrameBtn.textContent = "❌";
    eliminarFrameBtn.className = "ideframeh2";
    eliminarFrameBtn.onclick = (event) => {
        event.stopPropagation();
        eliminarFrame(frameIndex, escenaId);
    };
    return eliminarFrameBtn;
}

function editarEscena(escenaId) {
    if (!escenas[escenaId]) return;
    console.log("Editando escena:", escenaId);
    // Lógica para abrir la vista de edición de escena si es necesario.
    // Por ahora, el clic principal está en los elementos internos.
}

function actualizarLista() {
    let lista = document.getElementById("lista-capitulos");
    lista.innerHTML = "";

    const tituloContainer = document.getElementById('libro-activo-titulo');

    // Si no hay un libro seleccionado, mostrar un mensaje y salir.
    if (!libroActivoId) {
        if (tituloContainer) tituloContainer.textContent = "Selecciona un libro para empezar";
        lista.innerHTML = '<p class="mensaje-placeholder">Usa el botón "📚 Seleccionar Libro" para empezar.</p>';
        return;
    }

    // MODIFICADO: Filtrar las escenas para mostrar solo las del libro activo
    let escenasDelLibroActivo = Object.keys(escenas).filter(id => escenas[id].libroId === libroActivoId);

    // Ordenar las escenas/capítulos
    escenasDelLibroActivo.sort();

    if (escenasDelLibroActivo.length === 0) {
        lista.innerHTML = '<p class="mensaje-placeholder">Este libro está vacío. Haz clic en el botón "+" para añadir tu primer capítulo.</p>';
    }

    // El resto de la función es casi igual, pero itera sobre la lista filtrada
    escenasDelLibroActivo.forEach(id => {
        // El código para crear cada tarjeta de capítulo (div.escena, inputs, botones, etc.)
        // permanece exactamente igual que antes. Solo lo pegas aquí.
        
        let div = document.createElement("div");
        div.className = "escena";
        // ... (resto de tu código para crear la tarjeta del capítulo) ...
         div.setAttribute("data-id", id);
        div.onclick = () => editarEscena(id);

        let detallediv = document.createElement("div");
        detallediv.className = "detalle";
        let inputNombre = document.createElement("input");
        inputNombre.className = "imput";
        inputNombre.value = escenas[id].texto || `Capítulo ${id}`; // Texto por defecto
        inputNombre.placeholder = "Nombre del Capítulo";
        
        // Asignar el nombre al objeto escena cuando el usuario lo cambia
        inputNombre.onchange = (event) => {
            escenas[id].texto = event.target.value;
            guardarCambios(); 
        };

        let eliminarBtn = document.createElement("button");
        eliminarBtn.textContent = "❌";
        eliminarBtn.className = "ide";
        eliminarBtn.onclick = (event) => {
            event.stopPropagation();
            if (confirm("¿Eliminar este capítulo?")) {
                delete escenas[id];
                guardarCambios();
                actualizarLista();
            }
        };
        let frameBtn = document.createElement("button");
        frameBtn.textContent = "➕ 🖼️";
        frameBtn.className = "ideframe";
        frameBtn.onclick = (event) => {
            event.stopPropagation();
            agregarFrame(id);
        };
        detallediv.appendChild(inputNombre);
        detallediv.appendChild(eliminarBtn);
        detallediv.appendChild(frameBtn);
        div.appendChild(detallediv);

        let contenedorFrames = document.createElement("div");
        // ... y así sucesivamente hasta el final del bucle.
        
        (escenas[id].frames || []).forEach((frame, index) => {
            let frameDiv = document.createElement("div");
            frameDiv.className = "frameh";
            const textSpan = document.createElement('span');
            textSpan.classList.add('framehtxt');
            textSpan.textContent = ` ${index + 1}`;
            frameDiv.appendChild(textSpan);
            frameDiv.draggable = true;

            // ... (Toda la lógica de drag-and-drop y creación de frames) ...
             frameDiv.ondragstart = (event) => {
                draggedFrameIndex = index;
                draggedFrameEscenaId = id;
                event.dataTransfer.setData("text/plain", JSON.stringify({ index, escenaId: id }));
                event.target.style.opacity = 0.5;
            };
            frameDiv.ondragend = (event) => {
                event.target.style.opacity = "";
            };
             frameDiv.ondragover = (event) => {
                event.preventDefault();
                if (draggedFrameEscenaId !== id || index === draggedFrameIndex) return;
                const rect = frameDiv.getBoundingClientRect();
                frameDiv.style.borderLeft = (event.clientX < rect.left + rect.width / 2) ? "3px solid dodgerblue" : "";
                frameDiv.style.borderRight = (event.clientX >= rect.left + rect.width / 2) ? "3px solid dodgerblue" : "";
            };
            frameDiv.ondragleave = (event) => {
                frameDiv.style.borderLeft = "";
                frameDiv.style.borderRight = "";
            };
            frameDiv.ondrop = (event) => {
                event.preventDefault();
                frameDiv.style.borderLeft = "";
                frameDiv.style.borderRight = "";
                const data = JSON.parse(event.dataTransfer.getData("text/plain"));
                if (data.escenaId !== id) return;

                const framesArray = escenas[id].frames;
                const [draggedItem] = framesArray.splice(data.index, 1);
                
                let targetIndex = index;
                if(data.index < index) targetIndex--;

                const rect = frameDiv.getBoundingClientRect();
                const dropIndex = (event.clientX < rect.left + rect.width / 2) ? targetIndex : targetIndex + 1;
                
                framesArray.splice(dropIndex, 0, draggedItem);
                
                guardarCambios();
                actualizarLista();
            };
             let inputTexto = document.createElement("textarea");
            inputTexto.value = frame.texto || "";
            inputTexto.placeholder = "Escribe el texto aquí";
            inputTexto.oninput = (event) => {
                frame.texto = event.target.value;
                guardarCambios();
            };
             let inputImagen = document.createElement("input");
            inputImagen.type = "file";
            inputImagen.accept = "image/*, video/mp4, video/webm, image/gif";
            inputImagen.style.display = 'none';
            inputImagen.id = `fileInput-${id}-${index}`;
            inputImagen.onchange = async (event) => {
                let file = event.target.files[0];
                if (file) {
                    let base64Data = await fileToBase64(file);
                    if (base64Data) {
                        frame.imagen = base64Data;
                        let imagenPreview = frameDiv.querySelector("img");
                        if (imagenPreview) {
                            imagenPreview.src = frame.imagen;
                            imagenPreview.style.display = "block";
                        }
                        guardarCambios();
                    }
                }
            };
             let imagenPreview = document.createElement("img");
            imagenPreview.style.width = "100%";
            imagenPreview.style.height = "auto";
            imagenPreview.style.marginTop = "10px";
            imagenPreview.style.display = frame.imagen ? "block" : "none";
            if (frame.imagen) {
                imagenPreview.src = frame.imagen;
            }
             let label = document.createElement("label");
            label.htmlFor = `fileInput-${id}-${index}`;
            label.className = "custom-label";
            label.textContent = "📷";
            label.appendChild(inputImagen);

            let agregarFrameBtn = document.createElement("button");
            agregarFrameBtn.textContent = "+ Frame";
            agregarFrameBtn.className = "ideframeh";
            agregarFrameBtn.onclick = (event) => {
                event.stopPropagation();
                agregarFrame(id, index);
            };
             frameDiv.appendChild(inputTexto);
            frameDiv.appendChild(label);
            frameDiv.appendChild(imagenPreview);
            frameDiv.appendChild(agregarFrameBtn);
            frameDiv.appendChild(crearBotonEliminarFrame(index, id));


            contenedorFrames.appendChild(frameDiv);
        });
         div.appendChild(contenedorFrames);


        lista.appendChild(div);
    });
}   

// AÑADE ESTA FUNCIÓN COMPLETA EN EL ARCHIVO datos/escenas.js

/**
 * Crea múltiples escenas (capítulos) de forma automática y las asocia al libro activo.
 * @param {string} nombreBase - El nombre base para los nuevos capítulos.
 * @param {number} numEscenas - El número de capítulos a crear.
 * @param {number} numFrames - El número de frames vacíos a crear en cada capítulo.
 */
function crearEscenasAutomaticamente(nombreBase, numEscenas, numFrames) {
    // 1. Comprobación crucial: Asegurarse de que hay un libro activo.
    if (!libroActivoId) {
        alert("Error interno: Se intentó crear capítulos sin un libro activo seleccionado.");
        return;
    }

    if (!nombreBase || numEscenas <= 0) {
        console.error("Llamada inválida a crearEscenasAutomaticamente: se requiere nombre base y número de escenas.");
        return;
    }

    // 2. Lógica para crear las escenas en un bucle.
    for (let i = 1; i <= numEscenas; i++) {
        ultimoId++;
            const id = `${libroActivoId}-${nombreBase} ${String(ultimoId).padStart(3, '0')}`;


        // Comprobar si ya existe para evitar sobreescribir.
        if (escenas[id]) {
            console.warn(`La escena con ID ${id} ya existía. Se omitió la creación.`);
            continue;
        }

        const framesIniciales = [];
        for (let j = 0; j < numFrames; j++) {
            framesIniciales.push({ texto: "", imagen: "" });
        }

        // 3. LA CORRECCIÓN CLAVE: Asignar el 'libroId' al crear la escena.
        escenas[id] = {
            tipo: "generica",
            texto: id, // El nombre se refinará más tarde
            imagen: "",
            opciones: [],
            botones: [],
            frames: framesIniciales,
            generadoPorIA: true,
            libroId: libroActivoId // <--- ¡AQUÍ ESTÁ LA MAGIA!
        };
    }

    console.log(`${numEscenas} escenas creadas con el nombre base "${nombreBase}" y asociadas al libro ID: ${libroActivoId}.`);
    
    // 4. Se guarda y se actualiza la lista para que los cambios sean visibles.
    guardarCambios();
    actualizarLista();
}
function reiniciarContadorEscenas() {
    ultimoId = 0;
    console.log("Contador de escenas (ultimoId) reiniciado a 0.");
}
function guardarCambios() {
    if (typeof(Storage) !== "undefined") {
        try {
            const cleanEscenas = JSON.parse(JSON.stringify(escenas));
            localStorage.setItem("escenas", JSON.stringify(cleanEscenas));
            console.log("Cambios guardados en localStorage.");
        } catch (error) {
            console.error("Error al guardar cambios en localStorage:", error);
        }
    } else {
        console.error("localStorage no está disponible en este navegador.");
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}
