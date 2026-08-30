function renderizarBloqueLectura() {
    const bloque = bloquesLectura[indiceBloqueActual];
    const total = bloquesLectura.length;
    const porcentaje = total > 1 ? Math.round((indiceBloqueActual / (total - 1)) * 100) : 100;

    readerProgressText.innerHTML = `${bloque.tipo.toUpperCase()} &middot; B${indiceBloqueActual + 1}/${total} (${porcentaje}%)`;

    let HTMLContenido = `<h3>${bloque.subtitulo}</h3>`;
    
    if (!bloque.contenido || bloque.contenido.length === 0) {
        HTMLContenido += '<div class="empty-state">Bloque sin texto registrado en el archivo JSON.</div>';
    } else {
        bloque.contenido.forEach(parrafo => {
            if (typeof parrafo === 'string') {
                let textoLimpio = parrafo.trim();
                // Si el bloque actual es la portada renderizamos directamente su URL nativa segura
                if (bloque.esPortada && (textoLimpio.startsWith('blob:') || textoLimpio.startsWith('http') || textoLimpio.length > 0)) {
                     HTMLContenido += `<div class="reader-image-container"><img src="${textoLimpio}" class="reader-inline-image" style="max-height:65vh; object-fit:contain;"/></div>`;
                } else if (mapaImagenes[textoLimpio]) {
                    HTMLContenido += `<div class="reader-image-container"><img src="${mapaImagenes[textoLimpio]}" class="reader-inline-image" /></div>`;
                } else {
                    HTMLContenido += `<p>${parrafo}</p>`;
                }
            }
        });
    }

    // EXTRA_REGLA: Si el capítulo del libro tradicional posee una imagen ilustrada en Base64, se muestra debajo del texto
    if (bloque.imagenIlustracion) {
        let srcImagenCapitulo = bloque.imagenIlustracion;
        if (srcImagenCapitulo.length > 100 && !srcImagenCapitulo.startsWith('data:')) {
            srcImagenCapitulo = 'data:image/jpeg;base64,' + srcImagenCapitulo;
        }
        HTMLContenido += `<div class="reader-image-container" style="margin-top: 24px;"><img src="${srcImagenCapitulo}" class="reader-inline-image" style="max-height: 50vh; object-fit: contain;" /></div>`;
    }

    readerContent.innerHTML = HTMLContenido;

    if (window.MathJax) {
        MathJax.typesetPromise([readerContent]).catch((err) => console.log(err.message));
    }

    btnPrev.style.visibility = indiceBloqueActual === 0 ? 'hidden' : 'visible';
    btnNext.style.visibility = indiceBloqueActual === total - 1 ? 'hidden' : 'visible';

    guardarProgreso(libroActual.titulo, indiceBloqueActual);

    // Si el usuario llega físicamente al último bloque (100%), se registra de manera irreversible en la base de datos local
    if (indiceBloqueActual === total - 1 && total > 0) {
        marcarLibroComoCompletado(libroActual.titulo);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
}

// Interacción del Índice Dinámico y Desplegable Centralizado
btnIndexTrigger.onclick = (e) => {
    e.stopPropagation();
    if (indexModal.style.display === 'block') {
        indexModal.style.display = 'none';
        return;
    }
    
    let htmlBuffer = `<div style="text-align:right; margin-bottom:16px;"><button class="btn" onclick="document.getElementById('indexModal').style.display='none'">Cerrar</button></div>`;
    htmlBuffer += `<div style="max-height: 60vh; overflow-y: auto;">`;
    
    bloquesLectura.forEach((bloque, idx) => {
        const esActual = idx === indiceBloqueActual;
        const subLabel = bloque.esPortada ? 'PORTADA' : bloque.subtitulo;
        htmlBuffer += `
            <div onclick="saltarABloque(${idx})" style="padding: 12px 0; cursor: pointer; border-bottom: 1px solid #222222; text-align: left; background: transparent;">
                <span style="font-size: 0.55rem; color: #888888; display: block; text-transform: uppercase; letter-spacing: 0.5px;">${bloque.tipo}</span>
                <span style="font-size: 0.85rem; font-weight: ${esActual ? '700' : '100'}; color: ${esActual ? '#ffffff' : '#aaaaaa'}; text-transform: uppercase; letter-spacing: 0.5px;">${subLabel}</span>
            </div>
        `;
    });
    
    htmlBuffer += `</div>`;
    indexModalContent.innerHTML = htmlBuffer;
    indexModal.style.display = 'block';
};

function saltarABloque(idx) {
    indiceBloqueActual = idx;
    indexModal.style.display = 'none';
    renderizarBloqueLectura();
}

// Control dinámico de Preferencias del Lector en CSS Root Variables
function cambiarTipografia(fuente) {
    document.documentElement.style.setProperty('--reader-font-family', fuente);
}

// Control dinámico de Preferencias del Lector en CSS Root Variables
function cambiarTamanoLetra(tamano) {
    document.documentElement.style.setProperty('--reader-font-size', tamano);
}

// Funciones para el Control del Modal de Confirmación de Desleer Todo
function abrirModalDesleer() {
    if (desleerModal) desleerModal.style.display = 'block';
}

// Funciones para el Control del Modal de Confirmación de Desleer Todo
function cerrarModalDesleer() {
    if (desleerModal) desleerModal.style.display = 'none';
}

function confirmarDesleerTodo() {
    // Sobrescribimos el localStorage limpiando la clave de progreso de lectura y la de completados definitivos
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMPLETED_KEY);
    cerrarModalDesleer();
    
    // Forzamos el redibujado de las listas para actualizar los estados e indicadores gráficos de forma inmediata
    renderizarGaleria();
    renderizarFavoritos();
    
    // Feedback visual regresando al catálogo
    cambiarSeccionPrincipal('catalogo');
}