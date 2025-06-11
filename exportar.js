// ===================================
// GESTIÓN DE MODALES DE EXPORTACIÓN Y LÓGICA
// ===================================

// --- MODAL DE EXPORTACIÓN ---



function cerrarModalExportar() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-exportar');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    if (overlay) {
        overlay.onclick = null;
    }
}

// --- FUNCIONES DE EXPORTACIÓN ---

 
/**
 * Exporta la sección de Capítulos (escenas y frames) a un archivo HTML simple.
 */
async function generarHTML() {
    console.log("Iniciando generación de HTML para Guion...");
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    let bodyContent = `<h1>${tituloProyecto}</h1>`;

    const capitulosOrdenados = Object.keys(escenas).sort();

    for (const id of capitulosOrdenados) {
        const capitulo = escenas[id];
        bodyContent += `<h2>${capitulo.texto || id}</h2>`;

        if (capitulo.frames && capitulo.frames.length > 0) {
            for (const frame of capitulo.frames) {
                bodyContent += '<div class="frame-export">';
                if (frame.imagen) {
                    try {
                        // Se asume que _compressImageForSave existe en el scope (io.js)
                        const imagenComprimida = await _compressImageForSave(frame.imagen);
                        if (imagenComprimida) {
                           bodyContent += `<img src="${imagenComprimida}" alt="Imagen del frame">`;
                        }
                    } catch (error) {
                        console.error("Error al procesar imagen para exportar:", error);
                    }
                }
                if (frame.texto) {
                    bodyContent += `<p>${frame.texto.replace(/\n/g, "<br>")}</p>`;
                }
                bodyContent += '</div>';
            }
        }
    }

    const htmlCompleto = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${tituloProyecto}</title>
            <style>
                body { font-family: sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
                .container { max-width: 800px; margin: auto; background: white; padding: 20px 40px; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.1); }
                h1, h2 { color: #333; }
                h1 { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
                h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 40px; }
                .frame-export { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: #fafafa; }
                img { max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px; display: block; }
                p { margin-top: 0; }
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
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Guion.html`;
    a.click();
    console.log("Exportación de Guion a HTML completada.");
    cerrarModalExportar();
}
