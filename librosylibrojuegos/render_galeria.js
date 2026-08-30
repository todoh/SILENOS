// render_galeria.js
function renderizarGaleria() {
    gridView.style.display = 'flex';
    
    if (biblioteca.length === 0) {
        gridView.innerHTML = '<div class="empty-state">No hay manuscritos cargados en el repositorio de GitHub.</div>';
        return;
    }
    const filtro = inputBuscar.value.trim().toLowerCase();
    
    // Filtrado en tiempo real según el título, las etiquetas opcionales, el idioma global y el filtro especial gamebook
    const bibliotecaFiltrada = biblioteca.filter(libro => {
        const coincideTitulo = libro.titulo && libro.titulo.toLowerCase().includes(filtro);
        const coincideEtiquetas = libro.etiquetas && libro.etiquetas.toLowerCase().includes(filtro);
        const idiomaLibro = (libro.idioma || 'ES').toUpperCase();
        const coincideIdioma = idiomaLibro === idiomaActual.toUpperCase();
        
        const esGamebook = libro.esLibrojuego || libro.secciones;
        const coincideFiltroGamebook = !filtrarSoloGamebooks || esGamebook;
        
        return (coincideTitulo || coincideEtiquetas) && coincideIdioma && coincideFiltroGamebook;
    });
    if (bibliotecaFiltrada.length === 0) {
        gridView.innerHTML = '<div class="empty-state">No se encontraron manuscritos coincidentes.</div>';
        return;
    }
    gridView.innerHTML = '';
    const progresos = obtenerProgresoGuardado();
    const favoritos = obtenerFavoritosGuardados();
    const completados = obtenerCompletadosGuardados();
    let htmlBuffer = '';
    bibliotecaFiltrada.forEach(libro => {
        // Encontramos el índice real del libro dentro de la biblioteca global original
        const indexReal = biblioteca.findIndex(b => b.titulo === libro.titulo);
        htmlBuffer += crearCardHTML(libro, indexReal, progresos, favoritos, completados);
    });
    gridView.innerHTML = htmlBuffer;
}

function renderizarFavoritos() {
    favoritesView.style.display = 'flex';
    favoritesView.innerHTML = '';
    const progresos = obtenerProgresoGuardado();
    const favoritos = obtenerFavoritosGuardados();
    const completados = obtenerCompletadosGuardados();
    // Filtramos los libros cargados que se encuentren guardados en favoritos
    let librosFavoritos = biblioteca.filter(libro => favoritos.includes(libro.titulo));
    if (librosFavoritos.length === 0 && inputBuscar.value.trim() === '') {
        favoritesView.innerHTML = '<div class="empty-state">No tienes manuscritos en tus favoritos.</div>';
        return;
    }
    const filtro = inputBuscar.value.trim().toLowerCase();
    
    // Filtrado en tiempo real según el título o las etiquetas de los favoritos, idioma actual y el filtro especial gamebook
    librosFavoritos = librosFavoritos.filter(libro => {
        const coincideTitulo = libro.titulo && libro.titulo.toLowerCase().includes(filtro);
        const coincideEtiquetas = libro.etiquetas && libro.etiquetas.toLowerCase().includes(filtro);
        const idiomaLibro = (libro.idioma || 'ES').toUpperCase();
        const coincideIdioma = idiomaLibro === idiomaActual.toUpperCase();
        
        const esGamebook = libro.esLibrojuego || libro.secciones;
        const coincideFiltroGamebook = !filtrarSoloGamebooks || esGamebook;
        
        return (coincideTitulo || coincideEtiquetas) && coincideIdioma && coincideFiltroGamebook;
    });
    if (librosFavoritos.length === 0) {
        favoritesView.innerHTML = '<div class="empty-state">No se encontraron favoritos coincidentes.</div>';
        return;
    }
    let htmlBuffer = '';
    librosFavoritos.forEach(libro => {
        // Encontramos el índice real del libro dentro de la biblioteca global para que abra el correcto
        const indexReal = biblioteca.findIndex(b => b.titulo === libro.titulo);
        htmlBuffer += crearCardHTML(libro, indexReal, progresos, favoritos, completados);
    });
    favoritesView.innerHTML = htmlBuffer;
}

function crearCardHTML(libro, index, progresos, favoritos, completados) {
    const esGamebook = libro.esLibrojuego || libro.secciones;
    let totalBloques = 0;
    let bloqueGuardado = 0;
    let porcentajeLimpio = 0;
    if (!esGamebook) {
        const bloques = mapearBloquesLibro(libro);
        totalBloques = bloques.length;
        bloqueGuardado = progresos[libro.titulo] || 0;
        const porcentaje = totalBloques > 1 ? Math.round((bloqueGuardado / (totalBloques - 1)) * 100) : 0;
        porcentajeLimpio = isNaN(porcentaje) ? 0 : porcentaje;
    } else {
        bloqueGuardado = progresos[libro.titulo] || "inicio";
    }
    
    const esFav = favoritos.includes(libro.titulo);
    const claseEstrella = esFav ? 'fav-star-btn is-active' : 'fav-star-btn';
    let htmlPortada = '';
    if (libro.portada && (libro.portada.startsWith('blob:') || libro.portada.startsWith('http') || libro.portada.length > 0)) {
        htmlPortada = `<img src="${libro.portada}" class="book-cover-thumbnail" alt="Portada de ${libro.titulo}">`;
    } else {
        htmlPortada = `<div class="book-cover-thumbnail" style="display: flex; align-items: center; justify-content: center; background: #e5e5e5;"><span style="font-size:0.5rem; color:#888;">SIN PORTADA</span></div>`;
    }
    let htmlCheck = '';
    if (!esGamebook && (porcentajeLimpio === 100 || (completados && completados.includes(libro.titulo)))) {
        htmlCheck = `<span class="check-100">✔</span>`;
    } else if (esGamebook && completados && completados.includes(libro.titulo)) {
        htmlCheck = `<span class="check-100">✔</span>`;
    }
    // Inserción del badge del mando si es un librojuego
    let htmlBadge = '';
    if (esGamebook) {
        htmlBadge = `<span class="game-badge">🎮</span>`;
    }
    let htmlProgreso = '';
    if (!esGamebook) {
        htmlProgreso = `
            <span class="progress-text">${bloqueGuardado + 1}/${totalBloques} - ${porcentajeLimpio}%</span>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${porcentajeLimpio}%"></div>
            </div>
        `;
    } else {
        htmlProgreso = `
            <span class="progress-text">Sección: ${bloqueGuardado.toString().toUpperCase()}</span>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${completados && completados.includes(libro.titulo) ? '100%' : '50%'}"></div>
            </div>
        `;
    }
    
    // Inyección del badge identificativo brutalista superior si es un librojuego
    let htmlTextBadgeGamebook = esGamebook ? `<div class="gamebook-card-badge">LIBROJUEGO</div>` : '';
    return `
        <div class="book-card" onclick="abrirLibro(${index})">
            <div class="book-cover-container">
                ${htmlPortada}
                ${htmlCheck}
                ${htmlBadge}
                <button class="${claseEstrella}" onclick="eventoAlternarFavorito(event, '${libro.titulo.replace(/'/g, "\\'")}')">★</button>
            </div>
            ${htmlTextBadgeGamebook}
            <div class="card-title">${libro.titulo}</div>
            <div class="card-progress-container">
                ${htmlProgreso}
            </div>
        </div>
    `;
}

function eventoAlternarFavorito(event, tituloLibro) {
    event.stopPropagation(); // Previene abrir el libro accidentalmente al tocar la estrella
    const esActivo = alternarFavoritoEstado(tituloLibro);
    
    // Actualizamos visualmente el estado del elemento renderizado sin recargar la cuadrícula entera
    const target = event.target;
    if (esActivo) {
        target.classList.add('is-active');
    } else {
        target.classList.remove('is-active');
        // Si nos encontramos visualizando la pestaña de favoritos, re-renderizamos para limpiar el removido
        if (favoritesView.style.display === 'flex') {
            renderizarFavoritos();
        }
    }
}