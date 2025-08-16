// =================================================================
// SILENOS - MÓDULO GENERADOR DE LIBROS DESDE GUIONES
// =================================================================

/**
 * Se ejecuta al confirmar en el modal de "Poblar Libro".
 * Conecta el guion seleccionado con el libro seleccionado, borrando el
 * contenido anterior del libro y llenándolo con los capítulos y frames del guion.
 * También vincula el guion completo como el 'iaContext' del libro,
 * lo que habilita las funciones de reescritura.
 */
function confirmarPobladoDeLibro() {
    const guionSelect = document.getElementById('guion-origen-select');
    const libroSeleccionadoEl = document.querySelector('.libro-seleccionable.seleccionado');

    const guionId = guionSelect.value;
    const libroId = libroSeleccionadoEl ? libroSeleccionadoEl.dataset.libroId : null;

    if (!guionId) {
        alert("Por favor, selecciona un guion de la lista.");
        return;
    }
    if (!libroId) {
        alert("Por favor, selecciona el libro que quieres poblar.");
        return;
    }

    // Buscamos el objeto libro completo en el array 'libros' usando su ID.
    const libroSeleccionado = libros.find(libro => libro.id === libroId);
    if (!libroSeleccionado) {
        alert("Error: No se pudo encontrar el libro seleccionado en la base de datos.");
        console.error("No se encontró el libro con ID:", libroId, "en el array:", libros);
        return;
    }

    const scriptData = guionesGuardados[guionId];
    if (!scriptData) {
        alert("Error: No se encontraron los datos del guion seleccionado.");
        return;
    }

    // Usamos el objeto 'libroSeleccionado' que encontramos para obtener el título.
    if (confirm(`¿Poblar el libro "${libroSeleccionado.titulo}" con el guion "${scriptData.tituloOriginal}"? Se borrará el contenido actual del libro.`)) {
        
        // 1. Limpiar capítulos anteriores de este libro
        Object.keys(escenas).forEach(id => {
            if (escenas[id].libroId === libroId) {
                delete escenas[id];
            }
        });

        // 2. Poblar con los nuevos capítulos del guion
        scriptData.historia.forEach((capituloIA, index) => {
            const nuevoCapituloId = `${libroId}-capitulo-${Date.now() + index}`;
            const framesDelCapitulo = (capituloIA.frames || []).map(frameIA => ({
                texto: frameIA.contenido || "",
                imagen: ""
            }));

            escenas[nuevoCapituloId] = {
                tipo: "generica",
                texto: capituloIA.titulo_escena || `Capítulo ${index + 1}`,
                imagen: "",
                opciones: [],
                botones: [],
                frames: framesDelCapitulo,
                generadoPorIA: true,
                libroId: libroId
            };
        });

        // 3. ¡LA CLAVE! Guardar el guion como contexto de IA en el objeto libro que encontramos.
        libroSeleccionado.iaContext = scriptData;

        // 4. Guardar todo en localStorage
        guardarCambios(); 
        localStorage.setItem("libros", JSON.stringify(libros)); 

        alert("¡Libro poblado con éxito!");
        
        if(typeof cerrarModalSeleccionLibro === 'function') {
            cerrarModalSeleccionLibro();
        }
        
        // Refrescar la vista
        if (libroActivoId === libroId) {
            actualizarLista();
        } else {
            seleccionarLibro(libroId, libroSeleccionado.titulo);
            actualizarLista();
        }
    }
}
