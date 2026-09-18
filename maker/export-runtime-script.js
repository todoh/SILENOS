// export-runtime-script.js - SUBMÓDULO DE GENERACIÓN DEL SCRIPT DE RUNTIME
function buildExportRuntimeScript(assetsData) {
    return buildExportRuntimeCore(assetsData) +
           buildExportRuntimeUISave() +
           buildExportRuntimeMovement() + `
        window.addEventListener('resize', () => {
            updateViewportCache();
            fitStage(false);
        });
        document.addEventListener('DOMContentLoaded', () => {
            initRuntimeVariables();
            updateViewportCache();
            setupCameraControls();
            const viewport = document.getElementById('viewport-container');
            if (viewport && typeof ResizeObserver !== 'undefined') {
                const ro = new ResizeObserver(() => {
                    updateViewportCache();
                    fitStage(false);
                });
                ro.observe(viewport);
            }
            renderStage(false);
            inventoryManager.render();
            new GameMenu();
        });
    `;
}