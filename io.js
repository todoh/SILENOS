// ===================================
// GESTIÓN DE ENTRADA/SALIDA (GUARDAR/CARGAR)
// ===================================

let _compressImageForSave = (imagenSrc) => {
    return new Promise((resolve) => {
        if (!imagenSrc) {
            resolve("");
            return;
        }
        if (imagenSrc.startsWith("data:image/gif;")) {
            resolve(imagenSrc);
            return;
        }

        let img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function() {
            const maxWidth = 720,
                maxHeight = 720;
            let width = img.width,
                height = img.height;

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
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.5));
        };
        img.onerror = function() {
            console.error("Error loading image for compression:", imagenSrc);
            resolve("");
        };
        img.src = imagenSrc;
    });
};

async function guardarJSON() {
    console.log("Guardando el proyecto en formato JSON...");
    const listapersonajes = document.getElementById("listapersonajes").children;

    try {
        const promesasEscenas = Object.keys(escenas).map(async (id) => {
            const escena = escenas[id];
            const imagenComprimida = await _compressImageForSave(escena.imagen || "");
            const framesProcesados = await Promise.all(
                (escena.frames || []).map(async (frame) => {
                    const imagenFrameComprimida = await _compressImageForSave(frame.imagen || "");
                    return { ...frame, imagen: imagenFrameComprimida };
                })
            );
            return { ...escena, id, imagen: imagenComprimida, frames: framesProcesados };
        });

        const promesasPersonajes = Array.from(listapersonajes).map(async (personajeNode) => {
            const nombre = personajeNode.querySelector("input.nombreh")?.value || "";
            const descripcion = personajeNode.querySelector("textarea")?.value || "";
            const imagenSrc = personajeNode.querySelector("img")?.src || "";
            const etiquetaEl = personajeNode.querySelector(".etiqueta-personaje");
            const etiqueta = etiquetaEl ? etiquetaEl.dataset.etiqueta : 'indeterminado';
            if (!nombre && !descripcion && !imagenSrc) return null;
            const imagenComprimida = await _compressImageForSave(imagenSrc);
            return { nombre, descripcion, imagen: imagenComprimida, etiqueta };
        });

        const processedScenes = (await Promise.all(promesasEscenas)).sort((a,b) => a.id.localeCompare(b.id));
        const processedCharacters = (await Promise.all(promesasPersonajes)).filter(Boolean);

        const data = {
            titulo: document.getElementById("titulo-proyecto").innerText.trim(),
            escenas: processedScenes,
            personajes: processedCharacters,
            guionLiterario: guionLiterarioData,
            apiKeyGemini: typeof apiKey !== 'undefined' ? apiKey : ''
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${data.titulo.replace(/\s+/g, '_')}.json`;
        a.click();
        console.log("Proyecto guardado exitosamente.");

    } catch (error) {
        console.error("Error al procesar los datos para guardar el JSON:", error);
        alert("Hubo un error al guardar el proyecto. Revisa la consola para más detalles.");
    }
}

function cargarJSON(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let data = JSON.parse(e.target.result);
        if (data.titulo) {
            document.getElementById("titulo-proyecto").innerText = data.titulo;
        }

        escenas = {};
        if (Array.isArray(data.escenas)) {
            data.escenas.forEach(escena => {
                escenas[escena.id] = { ...escena };
                delete escenas[escena.id].id;
            });
            actualizarLista();
        }

        if (data.personajes && Array.isArray(data.personajes)) {
            const listapersonajes = document.getElementById("listapersonajes");
            listapersonajes.innerHTML = "";
            data.personajes.forEach(personajeData => {
                let contenedor = document.createElement('div');
                contenedor.classList.add('personaje');
                contenedor.style.position = 'relative';

                let etiqueta = document.createElement('span');
                etiqueta.className = 'etiqueta-personaje';
                const opcionGuardada = opcionesEtiqueta.find(op => op.valor === personajeData.etiqueta);
                if (opcionGuardada && opcionGuardada.valor !== 'personalizar') {
                    etiqueta.textContent = opcionGuardada.emoji;
                    etiqueta.dataset.etiqueta = opcionGuardada.valor;
                    etiqueta.title = `Etiqueta: ${opcionGuardada.titulo}`;
                    setEtiquetaStyles(etiqueta, 'default');
                } else {
                    const nombreEtiqueta = personajeData.etiqueta.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    etiqueta.textContent = nombreEtiqueta;
                    etiqueta.dataset.etiqueta = personajeData.etiqueta;
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
                cajaNombre.classList.add('nombreh');
                cajaNombre.value = personajeData.nombre || "";
                contenedor.appendChild(cajaNombre);

                let cajaTexto = document.createElement('textarea');
                cajaTexto.placeholder = 'Descripción';
                cajaTexto.value = personajeData.descripcion || "";
                contenedor.appendChild(cajaTexto);

                let contenedorImagen = document.createElement('div');
                let imagen = document.createElement('img');
                imagen.src = personajeData.imagen || "";
                contenedorImagen.appendChild(imagen);
                let botonCargar = document.createElement('button');
                botonCargar.innerText = '📷';
                botonCargar.onclick = function() {
                    let inputFile = document.createElement('input');
                    inputFile.type = 'file';
                    inputFile.accept = 'image/*';
                    inputFile.onchange = async function(event) {
                        if (event.target.files[0]) {
                            imagen.src = await fileToBase64(event.target.files[0]);
                        }
                    };
                    inputFile.click();
                };
                contenedorImagen.appendChild(botonCargar);
                contenedor.appendChild(contenedorImagen);
                listapersonajes.appendChild(contenedor);
            });
            agregarBotonEliminarAPersonajes();
        }

        if (data.guionLiterario && Array.isArray(data.guionLiterario)) {
            guionLiterarioData = data.guionLiterario;
            indiceCapituloActivo = guionLiterarioData.length > 0 ? 0 : -1;
            renderizarGuion();
        }

        if (data.apiKeyGemini) {
            apiKey = data.apiKeyGemini;
            document.getElementById("apiKeyDisplay").textContent = apiKey;
        }
        
        // Navegar a la sección de escenas después de cargar todo
        cerrartodo();
        abrir('escenah');
    };
    reader.readAsText(file);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}
