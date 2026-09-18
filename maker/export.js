// export.js - FUNCIÓN PRINCIPAL LIGERÍSIMA DE EXPORTACIÓN (ORQUESTADOR)
function exportStandaloneHTML() {
    const assetsData = collectExportAssets();
    const runtimeScript = buildExportRuntimeScript(assetsData);
    const htmlTemplate = buildExportHTMLTemplate(runtimeScript);

    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'juego_koreh_exportado.html';
    a.click();
    URL.revokeObjectURL(a.href);
}