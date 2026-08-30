// render_lector.js

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

    if (bloque.imagenIlustracion) {
        let srcImagenCapitulo = bloque.imagenIlustracion;
        if (srcImagenCapitulo.length > 100 && !srcImagenCapitulo.startsWith('data:')) {
            srcImagenCapitulo = 'data:image/jpeg;base64,' + srcImagenCapitulo;
        }
        HTMLContenido += `<div class="reader-image-container" style="margin-top: 24px;"><img src="${srcImagenCapitulo}" class="reader-inline-image" style="max-height: 50vh; object-fit: contain;" /></div>`;
    }

    // Inyección dinámica del bloque publicitario In-Article con la credencial ca-pub-7136138379132657
    HTMLContenido += `
        <div class="adsense-slot-infeed">
            <ins class="adsbygoogle"
                 style="display:block; text-align:center;"
                 data-ad-layout="in-article"
                 data-ad-format="fluid"
                 data-ad-client="ca-pub-7136138379132657"></ins>
        </div>
    `;

    readerContent.innerHTML = HTMLContenido;

    // Ejecutar renderizado reactivo de anuncios dinámicos de AdSense
    try {
        (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
        console.log("Error al cargar AdSense dinámico:", e);
    }

    if (window.MathJax) {
        MathJax.typesetPromise([readerContent]).catch((err) => console.log(err.message));
    }

    btnPrev.style.visibility = indiceBloqueActual === 0 ? 'hidden' : 'visible';
    btnNext.style.visibility = indiceBloqueActual === total - 1 ? 'hidden' : 'visible';
    
    guardarProgreso(libroActual.titulo, indiceBloqueActual);

    if (indiceBloqueActual === total - 1 && total > 0) {
        marcarLibroComoCompletado(libroActual.titulo);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
}

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

function cambiarTipografia(fuente) {
    document.documentElement.style.setProperty('--reader-font-family', fuente);
}

function cambiarTamanoLetra(tamano) {
    document.documentElement.style.setProperty('--reader-font-size', tamano);
}

function abrirModalDesleer() {
    if (desleerModal) desleerModal.style.display = 'block';
}

function cerrarModalDesleer() {
    if (desleerModal) desleerModal.style.display = 'none';
}

function confirmarDesleerTodo() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMPLETED_KEY);
    cerrarModalDesleer();
    renderizarGaleria();
    renderizarFavoritos();
    cambiarSeccionPrincipal('catalogo');
}