// exportartomas.js

/**
 * Genera un archivo HTML con el storyboard a partir de la escena o escenas seleccionadas.
 */
async function generarHTMLTomas() {
    console.log("Iniciando generación de HTML para Storyboard de Tomas...");
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    const select = document.getElementById('tomas-export-select');
    const selectedSceneId = select.value;

    if (!selectedSceneId) {
        alert("Por favor, selecciona una opción para exportar.");
        return;
    }

    // CORRECCIÓN: Se comprueba la variable 'storyScenes' directamente.
    if (typeof storyScenes === 'undefined' || !Array.isArray(storyScenes)) {
        alert("Error: No se ha podido encontrar la lista de escenas (storyScenes no está definida).");
        console.error("La variable global 'storyScenes' no está definida o no es un array.");
        return;
    }

    let escenasAExportar = [];
    if (selectedSceneId === 'all') {
        // Si se selecciona "Todas las Escenas"
        escenasAExportar = storyScenes;
    } else {
        // Si se selecciona una escena específica
        const escenaSeleccionada = storyScenes.find(s => s.id === selectedSceneId);
        if (escenaSeleccionada) {
            escenasAExportar.push(escenaSeleccionada);
        }
    }

    if (escenasAExportar.length === 0) {
        alert("No hay escenas de storyboard para exportar o la escena seleccionada no se encontró.");
        return;
    }

    let bodyContent = `<h1>Storyboard: ${tituloProyecto}</h1>`;

    for (const escena of escenasAExportar) {
        bodyContent += `<h2 class="scene-title">${escena.nombre || 'Escena Sin Título'}</h2>`;

        if (escena.tomas && escena.tomas.length > 0) {
            bodyContent += '<div class="storyboard-grid">';
            for (const [index, toma] of escena.tomas.entries()) {
                
                bodyContent += '<div class="shot-container">';
                
                bodyContent += '<div class="shot-image-col">';
                bodyContent += `<h3>Toma ${index + 1}</h3>`;
                if (toma.imagen && toma.imagen.startsWith('data:image')) {
                     bodyContent += `<img src="${toma.imagen}" alt="Imagen de la toma ${index + 1}">`;
                } else {
                    bodyContent += '<div class="no-image-placeholder">Sin Imagen</div>';
                }
                bodyContent += '</div>';

                bodyContent += '<div class="shot-text-col">';
                if (toma.guionConceptual) {
                    bodyContent += `<p>${toma.guionConceptual.replace(/\n/g, "<br>")}</p>`;
                } else {
                    bodyContent += `<p><em>Sin guion conceptual.</em></p>`;
                }
                
                if (toma.guionTecnico) {
                    bodyContent += `<div class="prompt-info"><strong>Prompt Visual:</strong><br>${toma.guionTecnico.replace(/\n/g, "<br>")}</div>`;
                }
                bodyContent += '</div>';

                bodyContent += '</div>';
            }
            bodyContent += '</div>';
        } else {
             bodyContent += '<p><em>Esta escena no contiene tomas.</em></p>';
        }
    }

    const htmlCompleto = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Storyboard: ${tituloProyecto}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f8f9fa; color: #212529; }
                .container { max-width: 1200px; margin: auto; background: white; padding: 20px 40px; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                h1 { text-align: center; border-bottom: 2px solid #dee2e6; padding-bottom: 15px; margin-bottom: 30px; color: #343a40; }
                .scene-title { background-color: #e9ecef; color: #495057; padding: 10px 15px; border-radius: 5px; margin-top: 40px; border-left: 5px solid #007bff; }
                .storyboard-grid { display: flex; flex-direction: column; gap: 25px; margin-top: 20px; }
                .shot-container { display: grid; grid-template-columns: 40% 1fr; gap: 20px; align-items: start; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px; background: #fff; }
                .shot-image-col h3 { margin-top: 0; color: #495057; }
                .shot-image-col img { width: 100%; height: auto; border-radius: 6px; border: 1px solid #ced4da; }
                .no-image-placeholder { width: 100%; height: 200px; background-color: #f1f3f5; border: 2px dashed #ced4da; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #6c757d; font-style: italic; }
                .shot-text-col p { margin-top: 0; font-size: 1em; }
                .prompt-info { font-size: 0.8em; color: #6c757d; background-color: #f8f9fa; padding: 8px; border-radius: 4px; margin-top: 15px; white-space: pre-wrap; word-wrap: break-word; }
                 @media (max-width: 768px) {
                    .shot-container { grid-template-columns: 1fr; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                ${bodyContent}
            </div>
        </body>
        </html>
    `;

    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Storyboard_${tituloProyecto.replace(/\s+/g, '_')}.html`;
    a.click();
    console.log("Exportación de Storyboard de Tomas a HTML completada.");
    cerrarModalExportar();
}
