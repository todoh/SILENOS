// ===================================
// GESTIÓN DE ENTRADA/SALIDA (GUARDAR/CARGAR)
// ===================================

let _compressImageForSave = (imagenSrc) => {
    return new Promise((resolve) => {
        if (!imagenSrc || !imagenSrc.startsWith('data:image')) {
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
            console.error("Error loading image for compression:", imagenSrc.substring(0, 50) + "...");
            resolve("");
        };
        img.src = imagenSrc;
    });
};

async function guardarJSON() {
    console.log("Guardando el proyecto en formato JSON...");
    
    try {
        // ... (código existente para guardar capítulos, personajes, escenas, etc., sin cambios)
        const listapersonajes = document.getElementById("listapersonajes").children;
        const promesasCapitulos = Object.keys(escenas).map(async (id) => {
            const capitulo = escenas[id];
            const framesProcesados = await Promise.all(
                (capitulo.frames || []).map(async (frame) => {
                    const imagenFrameComprimida = await _compressImageForSave(frame.imagen || "");
                    return { ...frame, imagen: imagenFrameComprimida };
                })
            );
            return { ...capitulo, id, frames: framesProcesados };
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
        
        const promesasEscenasStory = Promise.all((storyScenes || []).map(async (escena) => {
            const tomasProcesadas = await Promise.all(
                (escena.tomas || []).map(async (toma) => {
                    const imagenComprimida = await _compressImageForSave(toma.imagen || "");
                    return { ...toma, imagen: imagenComprimida };
                })
            );
            return { ...escena, tomas: tomasProcesadas };
        }));

        // --- NUEVO: Lógica para guardar MOMENTOS desde el DOM ---
        const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');
        const promesasMomentos = Array.from(nodosMomento).map(async (nodo) => {
            const imagenComprimida = await _compressImageForSave(nodo.querySelector('.momento-imagen').src);
            return {
                id: nodo.id,
                titulo: nodo.querySelector('.momento-titulo').textContent,
                descripcion: nodo.dataset.descripcion || '',
                x: parseInt(nodo.style.left, 10),
                y: parseInt(nodo.style.top, 10),
                imagen: imagenComprimida,
                acciones: JSON.parse(nodo.dataset.acciones || '[]')
            };
        });
        // --- FIN NUEVO ---


        const processedChapters = (await Promise.all(promesasCapitulos)).sort((a,b) => a.id.localeCompare(b.id));
        const processedCharacters = (await Promise.all(promesasPersonajes)).filter(Boolean);
        const processedStoryScenes = await promesasEscenasStory;
        const processedMomentos = await Promise.all(promesasMomentos); // Array de momentos
        

        const data = {
            titulo: document.getElementById("titulo-proyecto").innerText.trim(),
            capitulos: processedChapters,
            escenas: processedStoryScenes,
            personajes: processedCharacters,
            momentos: processedMomentos, // Guardar el array de momentos
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

    reiniciarEstadoApp();

    let reader = new FileReader();
    reader.onload = function(e) {
        let data;
        try {
            data = JSON.parse(e.target.result);
        } catch (error) {
            alert("Error: El archivo no es un JSON válido.");
            console.error("Error al parsear JSON:", error);
            return;
        }

        if (data.titulo) {
            document.getElementById("titulo-proyecto").innerText = data.titulo;
        }
        
        // ... (código existente para cargar capítulos, personajes, escenas, etc., sin cambios)
        if (data.escenas && !data.capitulos && Array.isArray(data.escenas)) {
            console.warn("Detectado formato JSON antiguo. Realizando conversión...");
            let idCounter = 0;
            data.escenas.forEach(escenaAntigua => {
                idCounter++;
                const newId = String(idCounter).padStart(3, '0');
                escenas[newId] = escenaAntigua; 
                const idsNumericos = Object.keys(escenas).map(id => parseInt(id, 10));
                ultimoId = idsNumericos.length > 0 ? Math.max(...idsNumericos) : 0;
            });
            actualizarLista();
        }
        const capitulosData = data.capitulos || [];
        if (Array.isArray(capitulosData) && capitulosData.length > 0) {
             capitulosData.forEach(capitulo => {
                const capituloId = capitulo.id;
                if(capituloId) {
                    escenas[capituloId] = { ...capitulo };
                    delete escenas[capituloId].id;
                }
            });
            const idsNumericos = Object.keys(escenas).map(id => parseInt(id.replace(/[^0-9]/g, ''), 10)).filter(num => !isNaN(num));
            ultimoId = idsNumericos.length > 0 ? Math.max(...idsNumericos) : 0;
            actualizarLista();
        }
        if (data.escenas && Array.isArray(data.escenas)) {
            if (data.capitulos) {
                 storyScenes = data.escenas.map(escena => {
                    const tomasConDatosCompletos = (escena.tomas || []).map(toma => ({
                        id: toma.id || 'toma_' + Date.now() + Math.random(),
                        duracion: toma.duracion || 8,
                        imagen: toma.imagen || "",
                        guionConceptual: toma.guionConceptual || "",
                        guionTecnico: toma.guionTecnico || "",
                        guionArtistico: toma.guionArtistico || ""
                    }));
                    return { ...escena, tomas: tomasConDatosCompletos };
                });
            }
        }
        activeSceneId = storyScenes.length > 0 ? storyScenes[0].id : null;
        renderEscenasUI();
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
                     const nombreEtiqueta = (personajeData.etiqueta || 'indeterminado').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                     etiqueta.textContent = nombreEtiqueta;
                     etiqueta.dataset.etiqueta = personajeData.etiqueta || 'indeterminado';
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

        // --- NUEVO: Lógica para cargar MOMENTOS al DOM ---
        if (data.momentos && Array.isArray(data.momentos)) {
            const lienzo = document.getElementById('momentos-lienzo');
            lienzo.innerHTML = ''; // Limpiar lienzo antes de cargar
            data.momentos.forEach(momentoData => {
                const nuevoNodo = document.createElement('div');
                nuevoNodo.className = 'momento-nodo';
                nuevoNodo.id = momentoData.id;
                
                nuevoNodo.innerHTML = `
                    <p contenteditable="true" class="momento-titulo">${momentoData.titulo}</p>
                    <div class="momento-contenido">
                         <img class="momento-imagen" src="${momentoData.imagen || ''}" style="display: ${momentoData.imagen ? 'block' : 'none'};">
                         <span class="placeholder-contenido"></span>
                    </div>
                    <div class="momento-botones">
                        <button class="momento-btn btn-editar">Editar</button>
                        <button class="momento-btn btn-eliminar">Eliminar</button>
                    </div>
                `;

                nuevoNodo.style.top = `${momentoData.y}px`;
                nuevoNodo.style.left = `${momentoData.x}px`;
                if(momentoData.imagen) nuevoNodo.classList.add('con-imagen');

                // Guardar datos en el dataset
                nuevoNodo.dataset.descripcion = momentoData.descripcion || "";
                nuevoNodo.dataset.acciones = JSON.stringify(momentoData.acciones || []);

                lienzo.appendChild(nuevoNodo);

                // Asignar eventos
                nuevoNodo.querySelector('.btn-editar').onclick = () => abrirModalEditarMomento(nuevoNodo);
                nuevoNodo.querySelector('.btn-eliminar').onclick = () => {
                    if (confirm('¿Estás seguro de que quieres eliminar este momento?')) {
                        nuevoNodo.remove();
                    }
                };
                nuevoNodo.querySelector('.momento-titulo').addEventListener('mousedown', e => e.stopPropagation());
                
                makeDraggable(nuevoNodo);
            });
        }
        // --- FIN NUEVO ---

        if (data.guionLiterario && Array.isArray(data.guionLiterario)) {
            guionLiterarioData = data.guionLiterario;
            indiceCapituloActivo = guionLiterarioData.length > 0 ? 0 : -1;
            renderizarGuion();
        }

        if (data.apiKeyGemini) {
            apiKey = data.apiKeyGemini;
            document.getElementById("apiKeyDisplay").textContent = apiKey;
        }
        
        cerrartodo();
        abrir('momentos'); // Abrir momentos para ver el resultado
    };
    reader.readAsText(file);
}
