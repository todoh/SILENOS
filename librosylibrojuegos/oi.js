// Manejo de persistencia del progreso de lectura e interacciones de datos locales
const STORAGE_KEY = 'silenos_reader_progress_mobile';
const FAVORITES_KEY = 'silenos_reader_favorites';
const COMPLETED_KEY = 'silenos_reader_completed';

function obtenerProgresoGuardado() {
    const progreso = localStorage.getItem(STORAGE_KEY);
    return progreso ? JSON.parse(progreso) : {};
}

function guardarProgreso(tituloLibro, indexBloque) {
    const progreso = obtenerProgresoGuardado();
    progreso[tituloLibro] = indexBloque;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progreso));
}

// Métodos de Persistencia para el sistema de Favoritos
function obtenerFavoritosGuardados() {
    const favs = localStorage.getItem(FAVORITES_KEY);
    return favs ? JSON.parse(favs) : [];
}

function alternarFavoritoEstado(tituloLibro) {
    let favs = obtenerFavoritosGuardados();
    const index = favs.indexOf(tituloLibro);
    if (index > -1) {
        favs.splice(index, 1);
    } else {
        favs.push(tituloLibro);
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return favs.includes(tituloLibro);
}

// Métodos de Persistencia para Libros Leídos al 100% (Irreversible)
function obtenerCompletadosGuardados() {
    const completados = localStorage.getItem(COMPLETED_KEY);
    return completados ? JSON.parse(completados) : [];
}

function marcarLibroComoCompletado(tituloLibro) {
    let completados = obtenerCompletadosGuardados();
    if (!completados.includes(tituloLibro)) {
        completados.push(tituloLibro);
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(completados));
    }
}

function mapearBloquesLibro(libro) {
    let lista = [];

    // Cambiado para abrir y mapear directamente cualquier portada procesada (Blob URL, URL remota o Base64 directo)
    if (libro.portada) {
        lista.push({
            tipo: 'Portada',
            subtitulo: libro.titulo,
            esPortada: true,
            contenido: [libro.portada]
        });
    }

    if (libro.prologo) {
        lista.push({
            tipo: 'Prólogo',
            subtitulo: 'Introducción del Manuscrito',
            contenido: Array.isArray(libro.prologo) ? libro.prologo : [libro.prologo]
        });
    }
    if (libro.partes && Array.isArray(libro.partes)) {
        libro.partes.forEach(parte => {
            if (parte.capitulos && Array.isArray(parte.capitulos)) {
                parte.capitulos.forEach(cap => {
                    // Soporta tanto la propiedad 'texto' como 'contenido' para los párrafos del capítulo
                    let fuenteContenido = cap.texto || cap.contenido || [];
                    let parrafosRaw = Array.isArray(fuenteContenido) ? fuenteContenido : [fuenteContenido];
                    
                    // Filtra elementos nulos o vacíos para evitar excepciones en el renderizado
                    let parrafosLimpios = parrafosRaw.filter(p => p !== null && p !== undefined);

                    // Dentro de tu oi.js (en el bucle cap.texto || cap.contenido):
lista.push({
    tipo: parte.nombre || 'Capítulo',
    subtitulo: cap.titulo || `Capítulo ${cap.numero}`,
    contenido: parrafosLimpios,
    imagenIlustracion: cap.imagen || cap.image // <--- Asegúrate de que esta línea exista en oi.js para mapearlo
});
                });
            }
        });
    }
    if (libro.apendice && (typeof libro.apendice === 'string' ? libro.apendice.trim() !== '' : true)) {
        lista.push({
            tipo: 'Apéndice',
            subtitulo: 'Datos Técnicos Estructurales',
            contenido: Array.isArray(libro.apendice) ? libro.apendice : [libro.apendice]
        });
    }
    if (libro.nota_final && (typeof libro.nota_final === 'string' ? libro.nota_final.trim() !== '' : true)) {
        lista.push({
            tipo: 'Nota Final',
            subtitulo: 'Consideraciones de Clausura',
            contenido: Array.isArray(libro.nota_final) ? libro.nota_final : [libro.nota_final]
        });
    }
    return lista;
}