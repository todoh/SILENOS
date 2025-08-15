async function exportStandaloneHTML() {
    try {
        const worldNameRaw = document.getElementById('r-load-world-select')?.value || 'Mi-Mundo';
        const worldName = worldNameRaw.replace(WORLD_DATA_NAME_PREFIX, '').replace(/\s+/g, '-');
        const fileName = `${worldName}.html`;

        alert(`Iniciando la exportación de "${fileName}". El proceso puede tardar unos segundos...`);

        const rDataJsContent = await fetch(document.querySelector('script[src*="r-data.js"]').src).then(res => res.text());
        let rPreview3dJsContent = await fetch(document.querySelector('script[src*="r-preview-3d.js"]').src).then(res => res.text());

        // --- PARCHES DE CÓDIGO PARA EL ARCHIVO EXPORTADO ---

        // 1. Eliminar la dependencia del modal del editor
        rPreview3dJsContent = rPreview3dJsContent
            .replace("document.getElementById('r-preview-modal').style.display = 'flex';", "")
            .replace("document.getElementById('r-preview-modal').style.display = 'none';", "");

        // 2. <-- ¡CORRECCIÓN CLAVE! Anular la función que busca imágenes en el DOM del editor.
        rPreview3dJsContent = rPreview3dJsContent.replace(
            /function findCharacterImageSrc\s*\([^)]*\)\s*\{[\s\S]*?\}/, 
            'function findCharacterImageSrc(dataRefName) { return null; }'
        );

        // 3. <-- ¡CORRECCIÓN CLAVE! Modificar la lógica de carga para que use los datos internos.
        rPreview3dJsContent = rPreview3dJsContent.replace(
            "iconSrc = findCharacterImageSrc(obj.dataRef);",
            "iconSrc = entityData ? entityData.icon : null;"
        );
        
        // --- FIN DE LOS PARCHES ---

        const worldDataJson = JSON.stringify(worldData, null, 2);
        const customEntitiesJson = JSON.stringify(tools.customEntities, null, 2);

        const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visor de Mundo: ${worldName}</title>
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

    <script id="r-data-script">
        ${rDataJsContent}
    <\/script>
    
    <script id="exported-world-data">
        worldData = ${worldDataJson};
    <\/script>

    <script id="exported-custom-entities">
        if (window.tools) {
            window.tools.customEntities = ${customEntitiesJson};
        }
    <\/script>

    <script id="r-preview-3d-script">
        ${rPreview3dJsContent}
    <\/script>

    <script id="launcher">
        window.addEventListener('load', () => {
            console.log("Iniciando vista previa del mundo exportado...");
            startPreview();
        });
    <\/script>
</body>
</html>`;

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
        console.error("Error durante la exportación a HTML:", error);
        alert("Ocurrió un error al intentar exportar el archivo. Revisa la consola para más detalles.");
    }
}
