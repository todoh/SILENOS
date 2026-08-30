// Lógica especializada para el parseo y renderizado interactivo de Librojuegos
let seccionActualId = "inicio";

function abrirLibrojuego(libro) {
    libroActual = libro;
    
    // Forzar ocultación de elementos de la interfaz clásica
    gridView.style.display = 'none';
    favoritesView.style.display = 'none';
    usuarioView.style.display = 'none';
    navView.style.display = 'none';
    
    // Activar vista lector y barras específicas
    readerView.style.display = 'block';
    document.getElementById('normalReaderNav').style.display = 'none';
    document.getElementById('gamebookReaderNav').style.display = 'block';
    
    uploadContainer.style.display = 'none';
    backContainer.style.display = 'table-cell';
    
    // Recuperar el progreso guardado por ID de sección de librojuego
    const progresos = obtenerProgresoGuardado();
    seccionActualId = progresos[libroActual.titulo];
    
    // Si no hay progreso (primera vez), se evalúa si tiene portada para mostrarla
    if (!seccionActualId) {
        seccionActualId = libroActual.portada ? "portada" : "inicio";
    }
    
    // Validar existencia de la sección de arranque por seguridad (solo si no es la pantalla de portada)
    if (seccionActualId !== "portada" && libroActual.secciones && !libroActual.secciones[seccionActualId]) {
        // Fallback al primer nodo disponible del objeto de secciones
        seccionActualId = Object.keys(libroActual.secciones)[0] || "inicio";
    }
    renderizarSeccionLibrojuego();
}

function renderizarSeccionLibrojuego() {
    if (!libroActual) return;
    
    const containerContenido = document.getElementById('readerContent');
    const containerOpciones = document.getElementById('gamebookChoicesContainer');
    
    // Renderizado especial para la pantalla de Portada Inicial
    if (seccionActualId === "portada") {
        let htmlContenido = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; width: 100%;">
                <h3 style="margin: 0; line-height: 1.2;">${libroActual.titulo.toUpperCase()}</h3>
            </div>
        `;
        
        if (libroActual.portada) {
            htmlContenido += `<div class="reader-image-container"><img src="${libroActual.portada}" class="reader-inline-image" style="max-height: 65vh; object-fit: contain;" /></div>`;
        }
        containerContenido.innerHTML = htmlContenido;
        
        // Determinar cuál es la primera sección real a la que saltará el botón comenzar
        let primerNodo = "inicio";
        if (libroActual.secciones && !libroActual.secciones[primerNodo]) {
            primerNodo = Object.keys(libroActual.secciones)[0] || "inicio";
        }
        
        containerOpciones.innerHTML = `
            <button class="gamebook-choice-btn" style="text-align: center; background: var(--bg-dark); color: var(--text-light); border-color: rgb(131, 0, 0);" onclick="saltarASeccionLibrojuego('${primerNodo.toString().replace(/'/g, "\\'")}')">
                COMENZAR
            </button>
        `;
        
        // Persistencia del estado de portada
        guardarProgreso(libroActual.titulo, seccionActualId);
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
    }
    
    if (!libroActual.secciones) return;
    const seccion = libroActual.secciones[seccionActualId];
    
    if (!seccion) {
        containerContenido.innerHTML = `<h3>Error Estructural</h3><p>La sección con identificador <strong>"${seccionActualId}"</strong> no ha sido localizada en el manuscrito.</p>`;
        containerOpciones.innerHTML = `<button class="gamebook-choice-btn" onclick="saltarASeccionLibrojuego('inicio')">Regresar al inicio</button>`;
        return;
    }
    
    // Renderizado del contenido textual de la sección con el botón de reinicio puro en la esquina superior derecha
    let htmlContenido = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; width: 100%;">
            <h3 style="margin: 0; line-height: 1.2;">${seccion.titulo || `SECCIÓN ${seccionActualId.toString().toUpperCase()}`}</h3>
            <button class="btn" style="color: var(--text-muted); font-size: 0.65rem; padding: 0; margin: 0; line-height: 1.2;" onclick="abrirModalReiniciarLibro()">Reiniciar</button>
        </div>
    `;
    
    let parrafosRaw = seccion.texto || seccion.contenido || [];
    let parrafos = Array.isArray(parrafosRaw) ? parrafosRaw : [parrafosRaw];
    
    parrafos.forEach(parrafo => {
        if (typeof parrafo === 'string') {
            let textoLimpio = parrafo.trim();
            if (mapaImagenes && mapaImagenes[textoLimpio]) {
                htmlContenido += `<div class="reader-image-container"><img src="${mapaImagenes[textoLimpio]}" class="reader-inline-image" /></div>`;
            } else {
                htmlContenido += `<p>${parrafo}</p>`;
            }
        }
    });

    // EXTRA_REGLA: Extraer la ilustración en Base64 específica de este pasaje si existe, y colocarla debajo del texto
    let imagenPasajeRaw = seccion.imagen || seccion.image;
    if (imagenPasajeRaw) {
        let srcImagen = imagenPasajeRaw;
        if (imagenPasajeRaw.startsWith('data:image') || imagenPasajeRaw.length > 100) {
            if (!imagenPasajeRaw.startsWith('data:')) {
                srcImagen = 'data:image/jpeg;base64,' + imagenPasajeRaw;
            }
        }
        htmlContenido += `<div class="reader-image-container" style="margin-top: 24px;"><img src="${srcImagen}" class="reader-inline-image" style="max-height: 50vh; object-fit: contain;" /></div>`;
    }

    containerContenido.innerHTML = htmlContenido;
    
    // Renderizado dinámico e inferior del panel de elecciones
    let htmlOpciones = '';
    let opciones = seccion.opciones || seccion.elecciones || [];
    
    if (opciones.length === 0) {
        // Nodo terminal: el libro ha concluido (Victoria o Muerte)
        htmlOpciones += `<button class="gamebook-choice-btn" style="border-color: rgb(131, 0, 0);" onclick="finalizarLibrojuego()">FIN DE LA AVENTURA (MARCAR COMO COMPLETADO)</button>`;
    } else {
        opciones.forEach(opcion => {
            let destino = opcion.destino || opcion.siguiente;
            let textoBoton = opcion.texto || opcion.descripcion || `Ir a la sección ${destino}`;
            htmlOpciones += `
                <button class="gamebook-choice-btn" onclick="saltarASeccionLibrojuego('${destino.toString().replace(/'/g, "\\'")}')">
                     ${textoBoton}
                </button>
            `;
        });
    }
    containerOpciones.innerHTML = htmlOpciones;
    
    // Ejecutar renderizador de fórmulas matemáticas si aplica
    if (window.MathJax) {
        MathJax.typesetPromise([containerContenido]).catch((err) => console.log(err.message));
    }
    
    // Persistencia del estado actual del juego
    guardarProgreso(libroActual.titulo, seccionActualId);
    // Reposicionamiento del scroll al tope
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function saltarASeccionLibrojuego(destinoId) {
    seccionActualId = destinoId;
    renderizarSeccionLibrojuego();
}

function finalizarLibrojuego() {
    if (libroActual) {
        marcarLibroComoCompletado(libroActual.titulo);
    }
    libroActual = null;
    cambiarSeccionPrincipal('catalogo');
}

// Control modular del modal de confirmación de reinicio
function abrirModalReiniciarLibro() {
    const modal = document.getElementById('reiniciarLibroModal');
    if (modal) modal.style.display = 'block';
}

function cerrarModalReiniciarLibro() {
    const modal = document.getElementById('reiniciarLibroModal');
    if (modal) modal.style.display = 'none';
}

function confirmarReiniciarLibro() {
    cerrarModalReiniciarLibro();
    if (libroActual) {
        // Al reiniciar, volvemos a evaluar si se debe mostrar la portada o saltar directo a inicio
        seccionActualId = libroActual.portada ? "portada" : "inicio";
        if (seccionActualId !== "portada" && libroActual.secciones && !libroActual.secciones[seccionActualId]) {
            seccionActualId = Object.keys(libroActual.secciones)[0] || "inicio";
        }
        guardarProgreso(libroActual.titulo, seccionActualId);
        renderizarSeccionLibrojuego();
    }
}