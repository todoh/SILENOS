async function exportStandaloneHTML() {
    try {
        // --- PASO 1: Ponerle nombre al archivo (Sin cambios) ---
        const worldNameRaw = document.getElementById('r-load-world-select')?.value || 'Mi-Mundo';
        const worldName = worldNameRaw.replace(WORLD_DATA_NAME_PREFIX, '').replace(/\s+/g, '-');
        const fileName = `${worldName}.html`;

        alert(`Iniciando exportación MÍNIMA (solo terreno y controles) de "${fileName}".`);

        // --- PASO 2: Recolectar y Limpiar el Código (SIMPLIFICADO) ---
        // Obtenemos el visor 3D y le aplicamos solo los parches del modal.
        let rPreview3dJsContent = await fetch(document.querySelector('script[src*="r-preview-3d.js"]').src).then(res => res.text());
        rPreview3dJsContent = rPreview3dJsContent
            .replace("document.getElementById('r-preview-modal').style.display = 'flex';", "")
            .replace("document.getElementById('r-preview-modal').style.display = 'none';", "");
        // NO incluimos la función createModelFromJSON porque no habrá entidades que crear.

        // --- PASO 3: Preparar los Datos (SIMPLIFICADO) ---
        // Solo necesitamos las texturas para que el suelo se pinte correctamente.
        const toolsForExport = {
            textures: tools.textures,
            entities: {},       // Objeto vacío para que el script del visor no falle
            customEntities: {}  // Objeto vacío por la misma razón
        };

        // Serializamos los datos del mundo (terreno) y las texturas.
        const worldDataJson = JSON.stringify(worldData, null, 2);
        const toolsJson = JSON.stringify(toolsForExport, null, 2);

        // --- PASO 4: Construir la Página Web Final (SIMPLIFICADO) ---
        const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Visor de Mundo (Terreno): ${worldName}</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
        #r-game-container { width: 100%; height: 100%; }
        .info-box { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.5); color: white; padding: 10px; border-radius: 5px; font-family: sans-serif; }
    </style>
</head>
<body>
    <div id="r-game-container"></div>
    <div class="info-box">Mundo: ${worldName}</div>

    <script src="https://cdn.jsdelivr.net/npm/three@0.138.3/build/three.min.js"><\/script>

    <script id="exported-data">
        // Inyectamos solo las constantes y datos necesarios para el terreno.
        const SUBGRID_SIZE = ${SUBGRID_SIZE}; // r-preview-3d.js lo necesita.
        let worldData = ${worldDataJson};
        let tools = ${toolsJson};
        
        // NO inyectamos createModelFromJSON.
        function createModelFromJSON(jsonData) { return new THREE.Group(); } // Función 'dummy' para evitar errores.
    <\/script>

    <script id="r-preview-3d-script">
        // Inyectamos el visor, que renderizará el terreno y los controles del jugador.
        ${rPreview3dJsContent}
    <\/script>

    <script id="launcher">
        window.addEventListener('load', () => {
            console.log("Iniciando vista previa del mundo exportado (solo terreno)...");
            startPreview();
        });
    <\/script>
</body>
</html>`;

        // --- PASO 5: Forzar la Descarga (Sin cambios) ---
        const blob = new Blob([htmlTemplate], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        alert(`¡"${fileName}" exportado con éxito!`);

    } catch (error) {
        console.error("Error durante la exportación mínima:", error);
        alert("Ocurrió un error al intentar exportar. Revisa la consola.");
    }
}


 
