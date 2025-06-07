// ===================================
// GESTIÓN DE ESCENAS Y FRAMES
// ===================================

function nuevaEscena() {
    ultimoId++;
    let id = String(ultimoId).padStart(3, '0');
    // Verificar si el ID ya existe
    while (escenas[id]) {
        ultimoId++;
        id = String(ultimoId).padStart(3, '0');
    }
    escenas[id] = {
        tipo: "generica",
        texto: "",
        imagen: "",
        opciones: [],
        botones: [],
        frames: []
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
    eliminarFrameBtn.textContent = "X";
    eliminarFrameBtn.className = "ideframeh";
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
        inputNombre.value = escenas[id].texto || id;
        inputNombre.style.marginRight = "5px";
        inputNombre.onchange = (event) => {
            let nuevoNombre = event.target.value;
            if (nuevoNombre && nuevoNombre !== id) {
                escenas[nuevoNombre] = escenas[id];
                delete escenas[id];
                guardarCambios();
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
                guardarCambios();
                actualizarLista();
            }
        };
        let frameBtn = document.createElement("button");
        frameBtn.textContent = "🖼️ + Frame";
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
        contenedorFrames.className = "contenedor-frames";
        
        // --- Lógica de Drag-and-Drop para el contenedor de frames ---
        contenedorFrames.ondragover = (event) => event.preventDefault();
        contenedorFrames.ondrop = (event) => {
            event.preventDefault();
            if (event.target !== contenedorFrames) return;
            const data = JSON.parse(event.dataTransfer.getData("text/plain"));
            const sourceEscenaId = data.escenaId;
            const sourceFrameIndex = data.index;
            if (sourceEscenaId === id) {
                const framesArray = escenas[id].frames;
                const [draggedItem] = framesArray.splice(sourceFrameIndex, 1);
                framesArray.push(draggedItem);
                guardarCambios();
                actualizarLista();
            }
        };

        (escenas[id].frames || []).forEach((frame, index) => {
            let frameDiv = document.createElement("div");
            frameDiv.className = "frameh";
            const textSpan = document.createElement('span');
            textSpan.classList.add('framehtxt');
            textSpan.textContent = `. . . . . Frame ${index + 1}`;
            frameDiv.appendChild(textSpan);
            frameDiv.draggable = true;

            // --- Lógica de Drag-and-Drop para cada frame ---
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
                
                // Corrección para el índice de destino al mover dentro de la misma lista
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

function crearEscenasAutomaticamente(nombreBase, numEscenas, numFrames) {
    if (!nombreBase || numEscenas <= 0) {
        alert("Por favor, define un nombre base y un número de escenas mayor a cero.");
        return;
    }

    // Obtenemos el número más alto existente para este nombre base para no sobreescribir
    let maxNumExistente = 0;
    Object.keys(escenas).forEach(key => {
        if (key.startsWith(nombreBase)) {
            const num = parseInt(key.replace(nombreBase, '').trim());
            if (!isNaN(num) && num > maxNumExistente) {
                maxNumExistente = num;
            }
        }
    });

    for (let i = 1; i <= numEscenas; i++) {
        const nuevoNum = maxNumExistente + i;
        const id = `${nombreBase} ${String(nuevoNum).padStart(3, '0')}`;

        if (escenas[id]) {
            console.warn(`La escena con ID ${id} ya existía y no se ha sobreescrito. Considera un nombre base diferente.`);
            continue;
        }

        escenas[id] = {
            tipo: "generica",
            texto: id,
            imagen: "",
            opciones: [],
            botones: [],
            frames: []
        };

        for (let j = 0; j < numFrames; j++) {
            escenas[id].frames.push({
                texto: "",
                imagen: ""
            });
        }
    }
    actualizarLista();
    guardarCambios();
    console.log(`${numEscenas} escenas creadas con el nombre base "${nombreBase}".`);
}




// ===================================
// FUNCIONES DE UTILIDAD COMPARTIDAS
// ===================================

/**
 * Guarda el estado actual del objeto 'escenas' en el localStorage.
 * Esta función se puede llamar desde cualquier parte del código que modifique 'escenas'.
 */
function guardarCambios() {
    if (typeof(Storage) !== "undefined") {
        try {
            // Se asegura de que escenas no contenga referencias circulares antes de guardar
            const cleanEscenas = JSON.parse(JSON.stringify(escenas)); // Corrección aquí
            localStorage.setItem("escenas", JSON.stringify(cleanEscenas));
            console.log("Cambios guardados en localStorage.");
        } catch (error) {
            console.error("Error al guardar cambios en localStorage:", error);
        }
    } else {
        console.error("localStorage no está disponible en este navegador.");
    }
}

/**
 * Convierte un objeto File a una cadena de texto en formato Base64.
 * @param {File} file El archivo a convertir.
 * @returns {Promise<string>} Una promesa que se resuelve con la cadena en Base64.
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}
