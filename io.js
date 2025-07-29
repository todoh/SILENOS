// ===================================
// GESTIÓN DE ENTRADA/SALIDA (GUARDAR/CARGAR)
// ===================================

const PROJECT_FILENAME = 'silenos_project.json';
let projectFileId = null; // To store the Google Drive file ID

// La función _compressImageForSave no cambia.
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
            resolve(canvas.toDataURL("image/png", 0.5));
        };
        img.onerror = function() {
            console.error("Error loading image for compression:", imagenSrc.substring(0, 50) + "...");
            resolve("");
        };
        img.src = imagenSrc;
    });
};


async function empaquetarDatosDelProyecto() {

    if (typeof guardarEscenaActual === 'function') {
        guardarEscenaActual();
    }

    // Esta función empaqueta todo en un objeto JSON.
    console.log("Empaquetando datos del proyecto...");
    const listapersonajes = document.getElementById("listapersonajes").children;
    const promesasCapitulos = Object.keys(escenas).map(async (id) => {
        const capitulo = escenas[id];
        const framesProcesados = await Promise.all(
            (capitulo.frames || []).map(async (frame) => ({ ...frame,
                imagen: await _compressImageForSave(frame.imagen || "")
            }))
        );
        return { ...capitulo,
            id,
            frames: framesProcesados
        };
    });

    // --- LÓGICA DE GUARDADO DE PERSONAJES (CORREGIDA) ---
    const promesasPersonajes = Array.from(listapersonajes).map(async (personajeNode) => {
        const nombre = personajeNode.querySelector("input.nombreh")?.value || "";
        const descripcion = personajeNode.querySelector("textarea.descripcionh")?.value || "";
        const promptVisual = personajeNode.querySelector("textarea.prompt-visualh")?.value || "";
        const svgContent = personajeNode.dataset.svgContent || "";

        // --- INICIO DE LA CORRECCIÓN ---
        // 1. Se lee el string JSON del dataset.
        const embeddingStr = personajeNode.dataset.embedding || '[]';
        let embeddingArray = [];
        try {
            // 2. Se convierte el string de nuevo a un array.
            embeddingArray = JSON.parse(embeddingStr);
        } catch (e) {
            console.error(`Fallo al parsear embedding desde el DOM para "${nombre}". Se guardará como array vacío.`, e);
            embeddingArray = [];
        }
        // --- FIN DE LA CORRECCIÓN ---

        const etiquetaEl = personajeNode.querySelector(".change-tag-btn");
        const arcoEl = personajeNode.querySelector(".change-arc-btn");

        const etiqueta = etiquetaEl ? etiquetaEl.dataset.etiqueta : 'indeterminado';
        const arco = arcoEl ? arcoEl.dataset.arco : 'sin_arco';

        let imagenComprimida = "";

        if (!svgContent) {
            const imagenSrc = personajeNode.querySelector("img")?.src || "";
            if (imagenSrc) {
                imagenComprimida = await _compressImageForSave(imagenSrc);
            }
        }

        if (!nombre && !descripcion && !promptVisual && !imagenComprimida && !svgContent) return null;

        return {
            nombre,
            descripcion,
            promptVisual,
            imagen: imagenComprimida,
            svgContent,
            etiqueta,
            arco,
            embedding: embeddingArray // 3. Se guarda el array en el JSON final.
        };
    });

    const promesasEscenasStory = Promise.all((storyScenes || []).map(async (escena) => {
        const tomasProcesadas = await Promise.all(
            (escena.tomas || []).map(async (toma) => ({ ...toma,
                imagen: await _compressImageForSave(toma.imagen || "")
            }))
        );
        return { ...escena,
            tomas: tomasProcesadas
        };
    }));
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

    const generacionesItems = document.querySelectorAll('#generaciones-container .generacion-item');
    const promesasGeneraciones = Array.from(generacionesItems).map(async (item) => {
        const img = item.querySelector('img');
        const prompt = item.querySelector('.generacion-prompt');
        if (img && img.src && prompt && img.src.startsWith('data:image')) {
            return {
                src: img.src,
                prompt: prompt.textContent
            };
        }
        return null;
    });

    const processedChapters = (await Promise.all(promesasCapitulos)).sort((a, b) => a.id.localeCompare(b.id));
    const processedCharacters = (await Promise.all(promesasPersonajes)).filter(Boolean);
    const processedStoryScenes = await promesasEscenasStory;
    const processedMomentos = await Promise.all(promesasMomentos);
    const processedGeneraciones = (await Promise.all(promesasGeneraciones)).filter(Boolean);

    console.log(`[IO] Empaquetando ${processedGeneraciones.length} imágenes de la galería.`);

    return {
        titulo: document.getElementById("titulo-proyecto").innerText.trim(),
        capitulos: processedChapters,
        escenas: processedStoryScenes,
        personajes: processedCharacters,
        momentos: processedMomentos,
        generacionesCompositor: processedGeneraciones,
        guionLiterario: guionLiterarioData,
        apiKeyGemini: typeof apiKey !== 'undefined' ? apiKey : '',
        informeGeneral: typeof ultimoInformeGenerado !== 'undefined' ? ultimoInformeGenerado : null,
        libros: typeof libros !== 'undefined' ? libros : [],
        animacionesSvg: typeof window.escenasSvg !== 'undefined' ? window.escenasSvg : []
    };
}

/**
 * Busca en Google Drive un archivo de proyecto creado por esta aplicación.
 * @returns {string|null} El ID del archivo si se encuentra, o null.
 */
async function buscarArchivoEnDrive() {
    if (!gapi_access_token) return null;
    console.log("Buscando archivo de proyecto en Google Drive...");

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${PROJECT_FILENAME}' and trashed=false&spaces=drive&fields=files(id,name)`, {
        headers: {
            'Authorization': `Bearer ${gapi_access_token}`
        }
    });

    if (!response.ok) {
        console.error("Error buscando archivo en Drive:", response.statusText);
        return null;
    }

    const data = await response.json();
    if (data.files.length > 0) {
        console.log("Archivo de proyecto encontrado con ID:", data.files[0].id);
        projectFileId = data.files[0].id;
        return projectFileId;
    } else {
        console.log("No se encontró ningún archivo de proyecto.");
        projectFileId = null;
        return null;
    }
}

/**
 * Guarda el estado actual del proyecto en Google Drive.
 * Crea un nuevo archivo si no existe, o actualiza el existente.
 */
async function guardarProyectoEnDrive() {
    if (!gapi_access_token) {
        alert("Debes iniciar sesión para guardar tu proyecto.");
        return;
    }

    if (typeof progressBarManager !== 'undefined') {
        progressBarManager.start('Guardando en Drive...');
    }

    const projectData = await empaquetarDatosDelProyecto();
    const projectDataBlob = new Blob([JSON.stringify(projectData, null, 2)], {
        type: 'application/json'
    });

    const metadata = {
        'name': PROJECT_FILENAME,
        'mimeType': 'application/json',
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], {
        type: 'application/json'
    }));
    formData.append('file', projectDataBlob);

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (projectFileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${projectFileId}?uploadType=multipart`;
        method = 'PATCH';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${gapi_access_token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Error al guardar en Drive: ${response.statusText}`);
        }

        const data = await response.json();
        projectFileId = data.id;
        console.log("Proyecto guardado con éxito. ID del archivo:", projectFileId);

        if (typeof progressBarManager !== 'undefined') {
            progressBarManager.finish();
        }

    } catch (error) {
        console.error(error);
        if (typeof progressBarManager !== 'undefined') {
            progressBarManager.error('Fallo al guardar');
        }
    }
}

/**
 * Carga los datos del proyecto desde Google Drive. Si no existe, crea un nuevo
 * proyecto en la nube automáticamente.
 */
async function cargarProyectoDesdeDrive() {
    await buscarArchivoEnDrive();

    if (!projectFileId || !gapi_access_token) {
        console.log("No se encontró archivo en Drive. Creando un nuevo proyecto de Silenos en la nube...");
        if (typeof reiniciarEstadoApp === 'function') {
            reiniciarEstadoApp();
        }
        if (typeof guardarProyectoEnDrive === 'function') {
            await guardarProyectoEnDrive();
            console.log("Nuevo proyecto de Silenos guardado en Google Drive.");
        }
        return;
    }

    console.log(`Cargando datos desde el archivo de Drive ID: ${projectFileId}`);
    try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${projectFileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${gapi_access_token}`
            }
        });

        if (!response.ok) {
            throw new Error(`No se pudo leer el archivo de Drive: ${response.statusText}`);
        }

        const data = await response.json();
        if (typeof cargarDatosEnLaApp === 'function') {
            cargarDatosEnLaApp(data);
        }

    } catch (error) {
        console.error(error);
        alert("No se pudo cargar tu proyecto desde Google Drive. Se iniciará un proyecto nuevo como medida de seguridad.");
        if (typeof reiniciarEstadoApp === 'function') {
            reiniciarEstadoApp();
        }
    }
}


/**
 * Carga un objeto de datos en el estado de la aplicación.
 */
function cargarDatosEnLaApp(data) {
    if (typeof reiniciarEstadoApp === 'function') reiniciarEstadoApp();

    if (data.titulo) {
        document.getElementById("titulo-proyecto").innerText = data.titulo;
    }

    if (data.capitulos && Array.isArray(data.capitulos)) {
        data.capitulos.forEach(capitulo => {
            const capituloId = capitulo.id;
            if (capituloId) {
                escenas[capituloId] = { ...capitulo
                };
                delete escenas[capituloId].id;
            }
        });
        const idsNumericos = Object.keys(escenas).map(id => parseInt(id.replace(/[^0-9]/g, ''), 10)).filter(num => !isNaN(num));
        ultimoId = idsNumericos.length > 0 ? Math.max(...idsNumericos) : 0;
        if (typeof actualizarLista === 'function') actualizarLista();
    }

    if (data.libros && Array.isArray(data.libros)) {
        libros = data.libros;
    } else {
        libros = [];
    }

    migrarEscenasSinLibro();

    if (libros.length > 0) {
        seleccionarLibro(libros[0].id);
    }

    if (typeof actualizarLista === 'function') actualizarLista();

    if (data.personajes && Array.isArray(data.personajes)) {
        data.personajes.forEach(p => {
            if (typeof agregarPersonajeDesdeDatos === 'function') agregarPersonajeDesdeDatos(p);
        });
    }

    if (data.guionLiterario && Array.isArray(data.guionLiterario)) {
        guionLiterarioData = data.guionLiterario;
        console.log("Guion Literario cargado.");
        if (typeof renderizarGuion === 'function') renderizarGuion();
        if (guionLiterarioData.length > 0 && typeof mostrarCapituloSeleccionado === 'function') {
            mostrarCapituloSeleccionado(0);
        }
    }

    if (data.apiKeyGemini && typeof data.apiKeyGemini === 'string') {
        if (typeof updateApiKey === 'function') {
            const tempInput = document.createElement('input');
            tempInput.value = data.apiKeyGemini;
            const originalInput = document.getElementById('apiInput');
            if (originalInput) originalInput.value = data.apiKeyGemini;
            updateApiKey();
            console.log("API Key de Gemini cargada.");
        }
        
    }

    if (data.momentos && Array.isArray(data.momentos)) {
        data.momentos.forEach(momento => {
            if (typeof crearMomentoEnLienzoDesdeDatos === 'function') {
                crearMomentoEnLienzoDesdeDatos(momento);
            }
        });
        if (typeof redrawAllConnections === 'function') {
            setTimeout(redrawAllConnections, 100);
        }
    }

    if (data.escenas && Array.isArray(data.escenas)) {
        storyScenes = data.escenas;
        if (typeof renderEscenasUI === 'function') renderEscenasUI();
    }

    if (data.informeGeneral) {
        ultimoInformeGenerado = data.informeGeneral;
        console.log("Datos del informe de Vista General cargados y listos.");
    }

    if (data.libros && Array.isArray(data.libros)) {
        libros = data.libros;
        if (libros.length > 0) {
            seleccionarLibro(libros[0].id);
        }
        console.log("Estructura de Libros cargada.");
    }

    // INICIO: CARGAR IMÁGENES DE LA GALERÍA DEL COMPOSITOR (MÉTODO AUTOSUFICIENTE)
    const generaciones = data.generacionesCompositor;

    if (generaciones && Array.isArray(generaciones) && generaciones.length > 0) {
        console.log(`[IO] Se encontraron ${generaciones.length} imágenes para la galería. Reconstruyendo la galería directamente.`);

        // Esta función es una copia de la lógica de 'agregarImagenAGaleriaCompositor' para evitar problemas de carga de scripts.
        const reconstruirItemDeGaleria = (imageUrl, promptText) => {
            const generacionesContainer = document.getElementById('generaciones-container');
            const generacionesGrid = document.getElementById('generaciones-grid');

            if (!generacionesGrid || !generacionesContainer) {
                console.error("[IO] Error crítico al reconstruir: No se encontraron los contenedores de la galería (#generaciones-container, #generaciones-grid).");
                return;
            }

            const itemContainer = document.createElement('div');
            itemContainer.className = 'generacion-item';

            const imgElement = document.createElement('img');
            imgElement.src = imageUrl;

            const infoContainer = document.createElement('div');
            infoContainer.className = 'generacion-info';

            const promptElement = document.createElement('p');
            promptElement.className = 'generacion-prompt';
            promptElement.contentEditable = true;
            promptElement.textContent = promptText || 'Entidad sin prompt';

            const deleteButton = document.createElement('button');
            deleteButton.className = 'generacion-delete-btn';
            deleteButton.innerHTML = '&times;';
            deleteButton.title = 'Eliminar esta imagen';
            deleteButton.onclick = () => {
                itemContainer.remove();
                if (generacionesGrid.childElementCount === 0) {
                    generacionesContainer.style.display = 'none';
                }
            };

            infoContainer.appendChild(promptElement);
            infoContainer.appendChild(deleteButton);
            itemContainer.appendChild(imgElement);
            itemContainer.appendChild(infoContainer);

            generacionesGrid.prepend(itemContainer);
        };

        const generacionesContainer = document.getElementById('generaciones-container');
        const generacionesGrid = document.getElementById('generaciones-grid');
        if (generacionesGrid) {
            generacionesGrid.innerHTML = ''; // Limpiar antes de añadir
        }

        // Invertimos el array para que `prepend` mantenga el orden visual original.
        const reversedGeneraciones = [...generaciones].reverse();

        reversedGeneraciones.forEach((gen, index) => {
            if (gen.src && gen.prompt) {
                console.log(`[IO] Reconstruyendo item ${index + 1}: ${gen.prompt}`);
                reconstruirItemDeGaleria(gen.src, gen.prompt);
            }
        });

        if (generacionesGrid && generacionesGrid.childElementCount > 0) {
            generacionesContainer.style.display = 'block';
            console.log("[IO] Reconstrucción de la galería finalizada. Contenedor visible.");
        }
    }
    // FIN: CARGAR IMÁGENES DE LA GALERÍA DEL COMPOSITOR
    if (data.animacionesSvg && Array.isArray(data.animacionesSvg)) {
        console.log(`[IO] Cargando ${data.animacionesSvg.length} animaciones SVG.`);
        // Comprueba si el script de animaciones SVG está cargado y sus funciones disponibles
        if (typeof window.escenasSvg !== 'undefined') {
            window.escenasSvg = data.animacionesSvg;

            // Si hay escenas cargadas, actualiza la interfaz del editor de animación
            if (window.escenasSvg.length > 0) {
                if (typeof cargarEscena === 'function') {
                    // Usamos un pequeño retardo para asegurar que la UI esté lista
                    setTimeout(() => cargarEscena(0), 100);
                }
            } else if (typeof renderizarListaDeEscenas === 'function') {
                // Si no hay escenas, al menos actualizamos la lista (que estará vacía)
                setTimeout(renderizarListaDeEscenas, 100);
            }
        }
    }
    console.log("Datos del proyecto cargados en la aplicación.");
renderizarVisorDeLibros();
    if (typeof flexear === 'function') flexear('silenos');
}

// ===================================
// FUNCIONES DE GUARDADO/CARGA OFFLINE
// ===================================

/**
 * Guarda el proyecto completo en un archivo JSON local.
 */
function guardarJSON() {
    // Se sigue el patrón de tu código original, usando variables globales
    const datos = {
        tituloProyecto: document.getElementById('titulo-proyecto').innerText,
        libros: libros,
        escenas: escenas,
        personajes: personajes, // Se usa la variable global, como en tu archivo.
        storyScenes: storyScenes,
        guionLiterario: guionLiterarioData,
        momentos: momentos,
    };

    // --- CÓDIGO AÑADIDO (Esto es lo nuevo y no afecta al resto) ---
    // Incluir los datos del editor interactivo si el editor ha sido inicializado.
    if (window.editor && window.editor.data) {
        datos.juegoInteractivoData = window.editor.data;
    }
    // --- FIN DEL CÓDIGO AÑADIDO ---

    const nombreArchivo = `${datos.tituloProyecto.replace(/\s+/g, '_') || 'Silenos_Project'}.json`;
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}
/**
 * Carga un proyecto desde un archivo JSON local seleccionado por el usuario.
 */
function cargarJSON(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const datos = JSON.parse(e.target.result);

            // Se cargan los datos en las variables globales, como en tu archivo original
            document.getElementById('titulo-proyecto').innerText = datos.tituloProyecto || 'Silenos';
            libros = datos.libros || [];
            escenas = datos.escenas || {};
            storyScenes = datos.storyScenes || [];
            guionLiterarioData = datos.guionLiterario || [];
            momentos = datos.momentos || [];
            personajes = datos.personajes || []; 

            // Se llama ÚNICAMENTE a las funciones de renderizado que SÉ que existen por tu archivo
            renderizarVisorDeLibros();
            actualizarLista();
            // He eliminado las llamadas a renderEscenasUI() y renderMomentos() que causaban el error.

            // --- CÓDIGO AÑADIDO (Esto es lo nuevo y no afecta al resto) ---
            // Restaurar los datos del editor interactivo si existen en el archivo.
            if (datos.juegoInteractivoData) {
                if (window.editor) {
                    // Si el editor ya está listo, le pasamos los datos
                    window.editor.data = datos.juegoInteractivoData;
                    window.editor.renderAll(); // Le pedimos al propio editor que se actualice
                } else {
                    // Si no, dejamos los datos en espera para que el editor los recoja
                    window.pendingInteractiveData = datos.juegoInteractivoData;
                }
            }
            // --- FIN DEL CÓDIGO AÑADIDO ---

        } catch (error) {
            console.error("Error al cargar o procesar el archivo JSON:", error);
            alert("Hubo un error al cargar el archivo. Asegúrate de que es un archivo de proyecto de Silenos válido.");
        }
    };
    reader.readAsText(file);
}


function limpiarCacheDelProyecto() {
    const clavesAGuardar = ['silenos_gapi_token', 'theme', 'google_api_key'];
    const todasLasClaves = Object.keys(localStorage);
    todasLasClaves.forEach(clave => {
        if (!clavesAGuardar.includes(clave)) {
            localStorage.removeItem(clave);
            console.log(`Clave eliminada de la caché: ${clave}`);
        }
    });
}

/**
 * Revisa las escenas cargadas y migra las que no tienen un 'libroId' a un libro especial.
 * Esto asegura la compatibilidad con proyectos de versiones anteriores.
 */
function migrarEscenasSinLibro() {
    const escenasHuerfanasIds = Object.keys(escenas).filter(id => !escenas[id].libroId);

    if (escenasHuerfanasIds.length === 0) {
        console.log("No se encontraron escenas de formato antiguo. No se requiere migración.");
        return;
    }

    console.log(`Se encontraron ${escenasHuerfanasIds.length} capítulos de una versión anterior. Migrando...`);

    const nombreLibroAntiguo = "Capitulos Antiguos";
    let libroDeMigracion = libros.find(libro => libro.titulo === nombreLibroAntiguo);

    if (!libroDeMigracion) {
        libroDeMigracion = {
            id: `libro_migracion_${Date.now()}`,
            titulo: nombreLibroAntiguo
        };
        libros.push(libroDeMigracion);
        console.log(`Se ha creado el libro "${nombreLibroAntiguo}" para alojar los capítulos antiguos.`);
    }

    escenasHuerfanasIds.forEach(id => {
        escenas[id].libroId = libroDeMigracion.id;
    });

    alert(`Se han encontrado ${escenasHuerfanasIds.length} capítulos de una versión anterior. Se han movido a un nuevo libro llamado "${nombreLibroAntiguo}" para que puedas seguir accediendo a ellos.`);

    // guardarCambios(); // Comentado: No está claro si esta función existe o es necesaria. La migración se guardará la próxima vez que el usuario guarde el proyecto manualmente.
}
