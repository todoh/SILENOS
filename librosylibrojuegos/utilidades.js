// utilidades.js
// Inicialización automática de la aplicación al cargar el documento con intro fluida
window.addEventListener('DOMContentLoaded', () => {
    // Desactivar el menú contextual del clic derecho en toda la aplicación
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Inicializar la pestaña del catálogo activa por defecto de forma subyacente
    document.getElementById('tabCatalogo').classList.add('is-active');
    
    // Iniciar flujo de descarga síncrono/asíncrono en segundo plano para libros y noticias
    cargarBibliotecaDesdeGitHub();
    cargarNoticiasDesdeGitHub();

    // Orquestación secuencial de la intro y disclaimer
    const overlay = document.getElementById('introOverlay');
    const title = document.getElementById('introTitle');
    const disclaimer = document.getElementById('introDisclaimer');

    // Paso 1: Empiezan a formarse las palabras desde el centro
    setTimeout(() => {
        title.classList.add('animate-text');
    }, 200);

    // Paso 2: Al completarse las palabras (2.5s después), ocurre el destello blanco y entra el disclaimer
    setTimeout(() => {
        // Disparar destello blanco
        overlay.classList.add('flash-effect');
        
        // Ocultar título e intercambiar visualización por el disclaimer
        title.style.display = 'none';
        disclaimer.style.display = 'block';
        disclaimer.classList.add('animate-disclaimer');
    }, 2700);

    // Paso 3: Al terminar el disclaimer (3s de animación), difuminamos la capa negra por completo
    setTimeout(() => {
        overlay.style.opacity = '0';
        
        // Retiramos físicamente la capa del DOM una vez terminada la transición CSS de opacidad
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 800);
    }, 5700);
});

// Listener global de teclado para navegación con A/D y Flechas Izquierda/Derecha
window.addEventListener('keydown', (e) => {
    // Si el usuario está escribiendo en el buscador, no interferir con el teclado
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
    }

    // Navegación solo activa si se está visualizando el lector (readerView activo)
    if (readerView && readerView.style.display !== 'none' && libroActual) {
        const key = e.key.toLowerCase();

        // Retroceder: Flecha Izquierda o tecla 'A'
        if (key === 'arrowleft' || key === 'a') {
            e.preventDefault();
            irBloqueAnterior();
        }
        // Avanzar: Flecha Derecha o tecla 'D'
        else if (key === 'arrowright' || key === 'd') {
            e.preventDefault();
            irBloqueSiguiente();
        }
    }
});

// Función interna y profunda para transformar Base64 corruptos en URLs de objeto Blob nativas
function convertirBase64ABlobUrl(base64String) {
    try {
        const partes = base64String.split(',');
        if (partes.length < 2) return null;
        
        const infoMimeMatch = partes[0].match(/:(.*?);/);
        const infoMime = infoMimeMatch ? infoMimeMatch[1] : 'image/jpeg';
        
        // Decodificación binaria robusta para cadenas Base64 masivas sin romper memoria
        const datosBinarios = atob(partes[1]);
        const longitud = datosBinarios.length;
        const arrayBuffer = new Uint8Array(longitud);
        
        for (let i = 0; i < longitud; i++) {
            arrayBuffer[i] = datosBinarios.charCodeAt(i);
        }
        
        const blob = new Blob([arrayBuffer], { type: infoMime });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Fallo crítico convirtiendo el binario Base64 de la portada:", e);
        return null;
    }
}

// Asignación de manejadores de eventos para los botones de navegación tradicionales
btnPrev.onclick = () => irBloqueAnterior();
btnNext.onclick = () => irBloqueSiguiente();

// Asignación de manejadores de eventos para los clics en bordes laterales
edgePrev.onclick = () => irBloqueAnterior();
edgeNext.onclick = () => irBloqueSiguiente();

btnVolver.onclick = () => {
    libroActual = null;
    bloquesLectura = [];
    // Al regresar, forzamos la vuelta a la pestaña activa de Catálogo por defecto
    cambiarSeccionPrincipal('catalogo');
};
