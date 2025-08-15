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
            const maxWidth = 1920,
                maxHeight = 1920;
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

        const embeddingStr = personajeNode.dataset.embedding || '[]';
        let embeddingArray = [];
        try {
            embeddingArray = JSON.parse(embeddingStr);
        } catch (e) {
            console.error(`Fallo al parsear embedding desde el DOM para "${nombre}". Se guardará como array vacío.`, e);
            embeddingArray = [];
        }

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
            embedding: embeddingArray
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
                const svgIlustracion = nodo.dataset.svgIlustracion || '';

        return {
            id: nodo.id,
            titulo: nodo.querySelector('.momento-titulo').textContent,
            descripcion: nodo.dataset.descripcion || '',
            x: parseInt(nodo.style.left, 10),
            y: parseInt(nodo.style.top, 10),
            imagen: imagenComprimida,
            svgIlustracion: svgIlustracion, 
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
    
    // --- INICIO: INTEGRACIÓN DE PLANOS DEL PROGRAMADOR ---
    const programadorBlueprintsJSON = localStorage.getItem('visualAutomationBlueprints');
    const programadorBlueprints = programadorBlueprintsJSON ? JSON.parse(programadorBlueprintsJSON) : [];
    console.log(`[IO] Empaquetando ${programadorBlueprints.length} planos del programador.`);
    // --- FIN: INTEGRACIÓN DE PLANOS DEL PROGRAMADOR ---

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
        animacionesSvg: typeof window.escenasSvg !== 'undefined' ? window.escenasSvg : [],
        programadorBlueprints: programadorBlueprints
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

    const generaciones = data.generacionesCompositor;
    if (generaciones && Array.isArray(generaciones) && generaciones.length > 0) {
        // Lógica para reconstruir la galería del compositor...
    }
    
    if (data.animacionesSvg && Array.isArray(data.animacionesSvg)) {
        console.log(`[IO] Cargando ${data.animacionesSvg.length} animaciones SVG.`);
        if (typeof window.escenasSvg !== 'undefined') {
            window.escenasSvg = data.animacionesSvg;
            if (window.escenasSvg.length > 0) {
                if (typeof cargarEscena === 'function') setTimeout(() => cargarEscena(0), 100);
            } else if (typeof renderizarListaDeEscenas === 'function') {
                setTimeout(renderizarListaDeEscenas, 100);
            }
        }
    }
    
    // --- INICIO: RESTAURACIÓN DE PLANOS DEL PROGRAMADOR ---
    if (data.programadorBlueprints && Array.isArray(data.programadorBlueprints)) {
        console.log(`[IO] Cargando ${data.programadorBlueprints.length} planos del programador desde el archivo.`);
        localStorage.setItem('visualAutomationBlueprints', JSON.stringify(data.programadorBlueprints));

        if (typeof pUpdateBlueprintDropdown === 'function') {
            pLoadBlueprintsFromStorage();
            pUpdateBlueprintDropdown();
        }
    }
    // --- FIN: RESTAURACIÓN DE PLANOS DEL PROGRAMADOR ---

    console.log("Datos del proyecto cargados en la aplicación.");
    renderizarVisorDeLibros();
    if (typeof flexear === 'function') flexear('silenos');


}

 
 async function guardarJSON() {
    console.log("Guardando el proyecto en formato JSON local...");
    try {
        const data = await empaquetarDatosDelProyecto();

        // --- INICIO DEL CÓDIGO AÑADIDO ---
        // Se añade la información del editor interactivo al objeto de datos principal.
        // Esto no afecta a la función 'empaquetarDatosDelProyecto'.
        if (window.editor && window.editor.data) {
            data.juegoInteractivoData = window.editor.data;
        }
        // --- FIN DEL CÓDIGO AÑADIDO ---

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${data.titulo.replace(/\s+/g, '_')}.json`;
        a.click();
        console.log("Proyecto guardado localmente con éxito.");
    } catch (error) {
        console.error("Error al procesar los datos para guardar el JSON local:", error);
        alert("Hubo un error al guardar el proyecto localmente.");
    }
}
 
function cargarJSON(event) {
    let file = event.target.files[0];
    if (!file) return;

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
        
        // Se llama a tu función principal de carga, que se mantiene intacta.
        cargarDatosEnLaApp(data);

        // --- INICIO DEL CÓDIGO AÑADIDO ---
        // Después de cargar los datos principales, se restauran los del juego interactivo.
        if (data.juegoInteractivoData) {
            if (window.editor) {
                // Si el editor ya está listo, se le pasan los datos directamente.
                window.editor.data = data.juegoInteractivoData;
                window.editor.renderAll(); // Se actualiza la interfaz del editor.
            } else {
                // Si el editor aún no está listo, se dejan los datos en espera.
                // (Recuerda tener la lógica en tu 'interactivo.js' para recoger estos datos pendientes al iniciar).
                window.pendingInteractiveData = data.juegoInteractivoData;
            }
        }
        // --- FIN DEL CÓDIGO AÑADIDO ---
    };
    reader.readAsText(file);
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
