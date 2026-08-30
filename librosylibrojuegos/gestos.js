// Variables de control para gestos táctiles
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const SWIPE_THRESHOLD = 50; // Mínimo de píxeles horizontales para considerar swipe
const REJECT_VERTICAL = 40;  // Máximo de desvío vertical permitido para no confundir con scroll

// Manejo de gestos táctiles (Swipe)
readerView.addEventListener('touchstart', (e) => {
    if (libroActual && (libroActual.esLibrojuego || libroActual.secciones)) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

readerView.addEventListener('touchend', (e) => {
    if (libroActual && (libroActual.esLibrojuego || libroActual.secciones)) return;
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    procesarGestoSwipe();
}, { passive: true });

function procesarGestoSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffY) < REJECT_VERTICAL) {
        if (diffX > 0) {
            irBloqueAnterior();
        } else {
            irBloqueSiguiente();
        }
    }
}