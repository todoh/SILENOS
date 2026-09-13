// utilidades.js
// Control de tiempo de inactividad para anuncio Fullscreen
let idleTimer = null;
const TIEMPO_INACTIVIDAD_MS = 45000; // 45 segundos parado

function reiniciarTimerInactividad() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(mostrarAnuncioInactividad, TIEMPO_INACTIVIDAD_MS);
}

function mostrarAnuncioInactividad() {
    const modal = document.getElementById('idleAdModal');
    if (modal && modal.style.display !== 'block') {
        modal.style.display = 'block';
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.log("Error al cargar anuncio de inactividad:", e);
        }
    }
}

function cerrarAnuncioInactividad() {
    const modal = document.getElementById('idleAdModal');
    if (modal) {
        modal.style.display = 'none';
    }
    reiniciarTimerInactividad();
}

// Inicialización automática de la aplicación al cargar el documento
window.addEventListener('DOMContentLoaded', () => {
    // Desactivar el menú contextual del clic derecho
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Registrar eventos de interacción para el temporizador de inactividad
    const eventosUsuario = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    eventosUsuario.forEach(evento => {
        window.addEventListener(evento, reiniciarTimerInactividad, { passive: true });
    });
    reiniciarTimerInactividad();

    // Inicializar catálogo por defecto
    const tabCat = document.getElementById('tabCatalogo');
    if (tabCat) tabCat.classList.add('is-active');

    if (window.db) {
        if (typeof cargarBibliotecaDesdeGitHub === "function") cargarBibliotecaDesdeGitHub();
        if (typeof cargarNoticiasDesdeGitHub === "function") cargarNoticiasDesdeGitHub();
    }

    // Animación de Intro
    const overlay = document.getElementById('introOverlay');
    const title = document.getElementById('introTitle');
    const disclaimer = document.getElementById('introDisclaimer');

    if (title) {
        setTimeout(() => {
            title.classList.add('animate-text');
        }, 200);
    }

    if (title && disclaimer) {
        setTimeout(() => {
            title.style.display = 'none';
            disclaimer.style.display = 'block';
            disclaimer.classList.add('animate-disclaimer');
        }, 2700);
    }

    if (overlay) {
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 800);
        }, 4700);
    }
});

// Navegación mediante teclado
window.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
    }

    if (typeof readerView !== 'undefined' && readerView && readerView.style.display !== 'none' && libroActual) {
        const key = e.key.toLowerCase();
        if (key === 'arrowleft' || key === 'a') {
            e.preventDefault();
            irBloqueAnterior();
        } else if (key === 'arrowright' || key === 'd') {
            e.preventDefault();
            irBloqueSiguiente();
        }
    }
});

function convertirBase64ABlobUrl(base64String) {
    try {
        const partes = base64String.split(',');
        if (partes.length < 2) return null;

        const infoMimeMatch = partes[0].match(/:(.*?);/);
        const infoMime = infoMimeMatch ? infoMimeMatch[1] : 'image/jpeg';

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

// Eventos de botones
if (btnPrev) btnPrev.onclick = () => irBloqueAnterior();
if (btnNext) btnNext.onclick = () => irBloqueSiguiente();
if (edgePrev) edgePrev.onclick = () => irBloqueAnterior();
if (edgeNext) edgeNext.onclick = () => irBloqueSiguiente();
if (btnVolver) {
    btnVolver.onclick = () => {
        libroActual = null;
        bloquesLectura = [];
        cambiarSeccionPrincipal('catalogo');
    };
}