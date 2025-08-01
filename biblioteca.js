// ===== INICIO: FUNCIONES PRINCIPALES DE LA BIBLIOTECA =====

/**
 * Recopila todas las imágenes únicas y sus etiquetas de las diferentes secciones del proyecto.
 * @returns {Array<Object>} Un array de objetos, donde cada objeto es {src: 'url', label: 'etiqueta'}.
 */
  function recopilarTodasLasImagenes() {
    const imagenesMap = new Map();

    // Función auxiliar para añadir imagen y etiqueta al mapa
    const addImage = (src, label) => {
        // Asegura que la etiqueta sea un texto válido antes de añadirla
        const finalLabel = (typeof label === 'string' && label.trim()) ? label.trim() : 'Sin etiqueta';
        if (src && !src.endsWith('/') && !src.includes('placeholder') && !imagenesMap.has(src)) {
            imagenesMap.set(src, { src, label: finalLabel });
        }
    };

    // 1. Desde "Datos" (Usa el input .nombreh)
    document.querySelectorAll('#listapersonajes .personaje').forEach(personajeDiv => {
        const img = personajeDiv.querySelector('.personaje-visual img');
        const nombreInput = personajeDiv.querySelector('input.nombreh'); // CORREGIDO: Selector para el input del nombre
        if (img && nombreInput) {
            addImage(img.src, nombreInput.value); // CORREGIDO: Se usa .value para un input
        }
    });

    // 2. Desde "Libro" (Usa la propiedad .texto del objeto escena)
    if (typeof escenas !== 'undefined') {
        Object.values(escenas).forEach(escena => {
            if (escena && escena.frames) {
                const escenaTitulo = escena.texto; // CORREGIDO: El título está en la propiedad 'texto'
                escena.frames.forEach(frame => addImage(frame.imagen, escenaTitulo));
            }
        });
    }

    // 3. Desde "Storyboard" (Usa la propiedad .nombre)
    if (typeof storyScenes !== 'undefined') {
        storyScenes.forEach(escena => {
            if (escena.tomas) {
                const escenaNombre = escena.nombre || 'Escena sin nombre';
                escena.tomas.forEach(toma => addImage(toma.imagen, escenaNombre));
            }
        });
    }
    
    // 4. Desde "Videojuego" (Usa el elemento .momento-titulo)
    document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(nodo => {
        const img = nodo.querySelector('.momento-imagen');
        const tituloEl = nodo.querySelector('.momento-titulo');
        if (img && tituloEl) {
            addImage(img.src, tituloEl.textContent.trim());
        }
    });

    console.log(`[Biblioteca] Se encontraron ${imagenesMap.size} imágenes únicas con etiquetas.`);
    return Array.from(imagenesMap.values());
}

/**
 * Renderiza la galería, ahora incluyendo las etiquetas.
 * @param {Array<Object>} arrayDeObjetosImagen - Un array con los objetos de imagen {src, label}.
 */
function renderizarGaleria(arrayDeObjetosImagen) {
    const grid = document.getElementById('biblioteca-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!arrayDeObjetosImagen || arrayDeObjetosImagen.length === 0) {
        grid.innerHTML = '<p class="mensaje-placeholder"> </p>';
        return;
    }

    arrayDeObjetosImagen.forEach(obj => {
        const item = document.createElement('div');
        item.className = 'biblioteca-item';

        const img = document.createElement('img');
        img.src = obj.src;
        img.loading = 'lazy';

        // ¡NUEVO! Creamos el elemento para la etiqueta
        const label = document.createElement('div');
        label.className = 'biblioteca-item-label';
        label.textContent = obj.label;

        item.appendChild(img);
        item.appendChild(label); // Añadimos la etiqueta al item
        grid.appendChild(item);
    });
}

// ===== FIN: FUNCIONES PRINCIPALES DE LA BIBLIOTECA =====


// ===== INICIO: CÓDIGO DEL VISOR DE IMÁGENES (LIGHTBOX) =====

document.addEventListener('DOMContentLoaded', () => {
    // ... (El resto del código del visor permanece aquí sin cambios)
    const visorOverlay = document.getElementById('visor-overlay');
    if (!visorOverlay) return;
    
    const visorImagen = document.getElementById('visor-imagen');
    const visorBotonDescargar = document.getElementById('visor-boton-descargar');
    const bibliotecaGrid = document.getElementById('biblioteca-grid');
    const botonReemplazar = document.getElementById('visor-boton-reemplazar');
    const inputReemplazar = document.getElementById('reemplazar-input');
    let elementoImagenOriginal = null;

    function actualizarFuenteDeImagenOriginal(oldSrc, newSrc) {
        console.log("Buscando imagen original para reemplazar en todas las fuentes...");
        if (window.datos && window.datos.datos) {
            window.datos.datos.forEach(d => { if (d.imagen === oldSrc) d.imagen = newSrc; });
        }
        if (typeof escenas !== 'undefined') {
            Object.values(escenas).forEach(e => {
                if(e.frames) e.frames.forEach(f => { if (f.imagen === oldSrc) f.imagen = newSrc; })
            });
        }
        if (typeof storyScenes !== 'undefined') {
            storyScenes.forEach(s => {
                if(s.tomas) s.tomas.forEach(t => { if (t.imagen === oldSrc) t.imagen = newSrc; })
            });
        }
        if (window.datos && window.datos.momentos) {
            Object.values(window.datos.momentos).forEach(m => { if (m.imagen === oldSrc) m.imagen = newSrc; });
        }
        document.querySelectorAll(`img[src="${oldSrc}"]`).forEach(img => {
            if (!img.closest('#visor-overlay')) {
                img.src = newSrc;
            }
        });
        console.log("Reemplazo completado.");
    }

    if (bibliotecaGrid) {
        bibliotecaGrid.addEventListener('click', (event) => {
            const targetImage = event.target.closest('.biblioteca-item img');
            if (targetImage) abrirVisor(targetImage);
        });
    }

    function abrirVisor(elementoImg) {
        elementoImagenOriginal = elementoImg;
        visorImagen.src = elementoImg.src;
        visorBotonDescargar.href = elementoImg.src;
        visorOverlay.style.display = 'flex';
    }

    function cerrarVisor() {
        visorOverlay.style.display = 'none';
        visorImagen.src = '';
        elementoImagenOriginal = null;
    }

    visorOverlay.addEventListener('click', (event) => {
        if (event.target === visorOverlay) cerrarVisor();
    });

    if (botonReemplazar) {
        botonReemplazar.addEventListener('click', () => {
            if (inputReemplazar) inputReemplazar.click();
        });
    }

    if (inputReemplazar) {
        inputReemplazar.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && elementoImagenOriginal) {
                const oldSrc = elementoImagenOriginal.src;
                const reader = new FileReader();
                reader.onload = function(e) {
                    const newSrc = e.target.result;
                    elementoImagenOriginal.src = newSrc;
                    visorImagen.src = newSrc;
                    visorBotonDescargar.href = newSrc;
                    actualizarFuenteDeImagenOriginal(oldSrc, newSrc);
                };
                reader.readAsDataURL(file);
            }
            inputReemplazar.value = '';
        });
    }
});
// ===== FIN: CÓDIGO DEL VISOR DE IMÁGENES (LIGHTBOX) =====


// ===== INICIO: NUEVA FUNCIÓN PARA DESCARGAR ZIP =====

document.addEventListener('DOMContentLoaded', () => {
    const botonDescargarZIP = document.getElementById('descargar-zip-btn');
    if (botonDescargarZIP) {
        botonDescargarZIP.addEventListener('click', descargarTodasLasImagenesComoZIP);
    }
});

/**
 * Recopila todas las imágenes, las empaqueta en un archivo ZIP y lo descarga.
 */
async function descargarTodasLasImagenesComoZIP() {
    console.log("Iniciando la descarga de imágenes como ZIP...");
    const boton = document.getElementById('descargar-zip-btn');
    if(boton) boton.disabled = true;
    
    // Muestra un indicador de carga (si tienes una función para ello)
    // mostrarIndicadorCarga(true, 'Creando archivo ZIP...');

    const imagenes = recopilarTodasLasImagenes(); // Usa la función que ya tienes
    if (imagenes.length === 0) {
        alert("No se encontraron imágenes para descargar.");
        if(boton) boton.disabled = false;
        // mostrarIndicadorCarga(false);
        return;
    }

    const zip = new JSZip();
    let contador = 0;

    for (const imagen of imagenes) {
        try {
            const response = await fetch(imagen.src);
            const blob = await response.blob();
            
            // Genera un nombre de archivo único para evitar colisiones
            const nombreArchivo = `${imagen.label.replace(/[^a-z0-9]/gi, '_')}_${contador}.${blob.type.split('/')[1] || 'png'}`;
            zip.file(nombreArchivo, blob);
            contador++;
        } catch (error) {
            console.error(`No se pudo cargar la imagen: ${imagen.src}`, error);
        }
    }

    console.log("Generando el archivo ZIP...");
    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            // Crea un enlace para la descarga
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "biblioteca_de_imagenes.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log("Descarga completada.");
            if(boton) boton.disabled = false;
            // mostrarIndicadorCarga(false);
        });
}

// ===== FIN: NUEVA FUNCIÓN PARA DESCARGAR ZIP =====