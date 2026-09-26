/* -------------------------------------------------------------------------- */
/*                         INITIALIZATION ON LOAD                             */
/* -------------------------------------------------------------------------- */
window.addEventListener('resize', resizeCanvas);

window.onload = function() {
    loadSavedState();
    initCanvas();
    renderParticles();
    showScreen('home');
};