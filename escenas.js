// ===================================
// GESTIÓN DE ESCENAS Y FRAMES
// ===================================

function nuevaEscena() {
    // 1. Comprobar si hay un libro activo antes de crear un capítulo
    if (!libroActivoId) {
        alert("Por favor, selecciona o crea un libro usando el botón '📚 Seleccionar Libro' antes de añadir un capítulo.");
        return;
    }

    // ¡SOLUCIÓN DEFINITIVA!
    // Se elimina la dependencia del contador 'ultimoId'.
    // Ahora se genera un ID único usando el timestamp actual, lo que es
    // mucho más robusto y evita cualquier posibilidad de conflicto o bucle infinito.
    const id = `${libroActivoId}-capitulo-${Date.now()}`;

    // Contar capítulos existentes para el libro actual para dar un buen nombre por defecto.
    const numCapitulosActuales = Object.values(escenas).filter(e => e.libroId === libroActivoId).length;

    // Crear el nuevo objeto de escena
    escenas[id] = {
        tipo: "generica",
        texto: `Capítulo ${numCapitulosActuales + 1}`, // Nombre por defecto mejorado
        imagen: "",
        opciones: [],
        botones: [],
        frames: [],
        generadoPorIA: false,
        libroId: libroActivoId // Asegura la asociación con el libro correcto
    };

    guardarCambios();
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
}

function actualizarLista() {
    let lista = document.getElementById("lista-capitulos");
    if (!lista) return;
    lista.innerHTML = "";

    const tituloContainer = document.getElementById('libro-activo-titulo');

    if (!libroActivoId) {
        if (tituloContainer) tituloContainer.textContent = "Selecciona un libro para empezar";
        lista.innerHTML = '<p class="mensaje-placeholder">Usa el botón "📚 Seleccionar Libro" para empezar.</p>';
        return;
    }

    let escenasDelLibroActivo = Object.keys(escenas).filter(id => escenas[id].libroId === libroActivoId);

    escenasDelLibroActivo.sort();

    if (escenasDelLibroActivo.length === 0) {
        lista.innerHTML = '<p class="mensaje-placeholder">Este libro está vacío. Haz clic en el botón "+" para añadir tu primer capítulo.</p>';
    }

    escenasDelLibroActivo.forEach(id => {
        let div = document.createElement("div");
        div.className = "escena";
        div.setAttribute("data-id", id);
        div.onclick = () => editarEscena(id);

        let detallediv = document.createElement("div");
        detallediv.className = "detalle";
        let inputNombre = document.createElement("input");
        inputNombre.className = "imput";
        inputNombre.value = escenas[id].texto || `Capítulo`;
        inputNombre.placeholder = "Nombre del Capítulo";
        
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
        
        (escenas[id].frames || []).forEach((frame, index) => {
            let frameDiv = document.createElement("div");
            frameDiv.className = "frameh";
            const textSpan = document.createElement('span');
            textSpan.classList.add('framehtxt');
            textSpan.textContent = ` ${index + 1}`;
            frameDiv.appendChild(textSpan);
            frameDiv.draggable = true;

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

function crearEscenasAutomaticamente(nombreBase, numEscenas, numFrames) {
    if (!libroActivoId) {
        alert("Error interno: Se intentó crear capítulos sin un libro activo seleccionado.");
        return;
    }

    if (!nombreBase || numEscenas <= 0) {
        console.error("Llamada inválida a crearEscenasAutomaticamente: se requiere nombre base y número de escenas.");
        return;
    }

    for (let i = 1; i <= numEscenas; i++) {
        // Se mantiene la lógica de ID único para robustez
        const id = `${libroActivoId}-${nombreBase}-${Date.now() + i}`;

        if (escenas[id]) {
            console.warn(`La escena con ID ${id} ya existía. Se omitió la creación.`);
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

    console.log(`${numEscenas} escenas creadas con el nombre base "${nombreBase}" y asociadas al libro ID: ${libroActivoId}.`);
    
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
