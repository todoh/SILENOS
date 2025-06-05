
function generarHTML(titulo) {
    titulo2 = document.getElementById("titulo-proyecto").innerText;
// Obtener el contenido del archivo CSS de manera sincrónica
    const cssContent = `    /* Minimalist Export Styles - V2 (Letra más grande, sin bordes, más centrado) */
    body {
        font-family: Arial, sans-serif;
        margin: 30px 8%; /* Más espacio lateral y vertical */
        color: #333;
        background-color: #ffffff;
        font-size: 18px; /* Letra base más grande */
        line-height: 1.7; /* Un poco más de interlineado */
        text-align: center; /* Centrar bloques por defecto */
    }

    .estiloso,
    .guion-literario-exportado,
    .tabla-personajes-container /* Si tienes un contenedor para la tabla */ {
        margin: 30px auto; /* Centrar bloques principales */
        width: 90%;
        max-width: 700px; /* Más estrecho para mejor lectura y centrado */
        text-align: left; /* Contenido de los bloques a la izquierda */
        background-color: #fff; /* Fondo blanco para el contenido */
        padding: 20px; /* Padding interno */
        border: none; /* Sin bordes */
        box-shadow: none; /* Sin sombras */
        border-radius: 0; /* Sin bordes redondeados para minimalismo */
    }

    h2, h3 {
        color: #111;
        margin-top: 20px;
        margin-bottom: 15px;
        padding: 0;
        background-color: transparent;
        border-bottom: none; /* Sin bordes */
        font-weight: bold;
        text-align: center; /* Títulos principales centrados */
    }
    h2 { font-size: 2em; } /* Ajustar si es necesario */
    h3 { font-size: 1.6em; } /* Ajustar si es necesario */

    h4 { /* Style for chapter titles within guion */
        margin-top: 15px;
        margin-bottom: 8px;
        color: #444;
        background-color: transparent;
        padding: 0;
        font-size: 1.3em; /* Ajustar si es necesario */
        font-weight: bold;
        text-align: left; /* Subtítulos a la izquierda */
        border-bottom: none;
    }

.frame {
    display: flex;
    flex-direction: column; /* Apilar imagen y texto */
    align-items: center; /* Centrar contenido del frame */
    justify-content: flex-start;
    width: 100%;
    gap: 20px;
    margin-bottom: 25px;
    border: none; /* Sin bordes */
    padding: 0; /* Sin padding extra si el contenido se centra */
    background-color: #ffffff;
}

.galeris {
    max-width: 60%; /* Imágenes más pequeñas, relativo al .frame */
    /* max-width: 300px; */ /* O un valor fijo si se prefiere */
    height: auto;
    display: block;
    margin: 10px auto; /* Centrar imagen */
    border: none; /* Sin bordes */
    border-radius: 0;
}

.guion {margin-left: 1%;
    flex-grow: 1;
    width: 100%; /* Ocupar ancho del .frame */
    max-width: none;
    text-align: left;
    border-radius: 5px;
    background-color: transparent;
    color: #333;
    padding: 0;
    text-align: left; /* Texto del guion a la izquierda */
    box-shadow: none;
}

 .frameh { min-height: max-content; }

 button {
        display: none; /* Ocultar botones en exportación */
    }
    /* Remove button hover styles as buttons are hidden */
    /* button:hover {
        background-color: #45a049;
    } */
    pre { /* Para el texto del guion y capítulos */
        white-space: pre-wrap;
        font-family: Arial, sans-serif;
        font-size: 1em; /* Relativo al font-size del body */
        line-height: 1.7;
        color: #333;
        background-color: transparent; /* Sin fondo para minimalismo */
        border: none;
        padding: 0; /* Sin padding */
        border: none; /* Sin bordes */
        text-align: left;
    }
    .tabla-personajes {
        width: 100%; /* Ocupar ancho del contenedor */
        max-width: 600px; /* Limitar ancho para tablas grandes */
        margin: 30px auto; /* Centrar tabla */
        border-collapse: collapse;
        font-size: 0.9em; /* Ligeramente más pequeño si el base es grande */
        border: none; /* Sin borde exterior */
        text-align: left;
    }

    .tabla-personajes th,
    .tabla-personajes td {
        border: none; /* Sin bordes en celdas */
        border-bottom: 1px solid #eee; /* Línea sutil debajo de cada fila */
        padding: 12px 8px; /* Más padding vertical */
        text-align: left;
    }
    .tabla-personajes tr:last-child td {
        border-bottom: none; /* Sin borde en la última fila */
    }

    .tabla-personajes th {
        background-color: transparent; /* Sin fondo para minimalismo */
        color: #111; /* Texto de cabecera más oscuro */
        font-weight: bold;
        display: table-cell;
    }

    .tabla-personajes td {
        background-color: #ffffff;
    }
    .tabla-personajes img {
    position: relative;
    left: 0%;
    margin-left: 0%;
        max-width: 180px; /* Imágenes de personajes más pequeñas */
        height: auto;
        display: block;
        margin: 0 auto; /* Centrar imagen en celda si es más pequeña */
        border: none;
        border-radius: 3px; /* Un poco de redondeo puede estar bien */
    }
    .tabla-personajes th:nth-child(1),
    .tabla-personajes td:nth-child(1) { /* Columna de imagen */
        width: 20%; /* Ajustar según necesidad */
        min-width: 190px;
        text-align: center; /* Centrar contenido de esta celda (imagen) */
    }

    .tabla-personajes th:nth-child(2),
    .tabla-personajes td:nth-child(2) {
        width: 80%;
    }

    .guion-literario-exportado {
        /* Ya cubierto por .estiloso, .guion-literario-exportado, .tabla-personajes-container */
    }
    .guion-literario-exportado h3 { /* Título de la sección Guion */
        text-align: center; /* Centrar título de sección */
    }
    .capitulo-exportado {
        background-color: white;
        color: black;
        padding: 15px 0; /* Padding vertical, sin padding horizontal si el texto ya está alineado */
        margin-top: 10px;
        border-radius: 5px;
        margin-top: 20px;
        border: none; /* Sin bordes */
        box-shadow: none;
        text-align: left;
    }
    .capitulo-exportado h4 { /* Título de capítulo */
        text-align: left;
        margin-bottom: 10px;
    }
    .capitulo-exportado pre { /* Contenido de capítulo */
        /* Ya cubierto por pre general */
    }

    /* Print styles - mantener minimalista pero funcional */
    @media print {
        body {
            background-color: white;
            margin: 20px; /* Margen de impresión */
            padding: 0;
            font-size: 11pt; /* Tamaño estándar para impresión */
            line-height: 1.5;
            color: #000;
            text-align: left; /* Forzar izquierda en impresión */
        }
        .estiloso, .guion-literario-exportado, .tabla-personajes-container, .capitulo-exportado, .frame {
            border: none !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            margin: 15px 0 !important; /* Margen vertical en impresión */
            padding: 0 !important; /* Sin padding extra en impresión */
            background-color: white !important;
            width: 100% !important; /* Ocupar ancho completo en impresión */
            max-width: none !important;
        }
        h2, h3, h4 {
            color: #000 !important;
            text-align: left !important; /* Títulos a la izquierda en impresión */
            border-bottom: 1px solid #ccc !important; /* Línea sutil para separar secciones en impresión */
            padding-bottom: 5px;
            margin-top: 20px;
        }
        h2 { font-size: 16pt !important; }
        h3 { font-size: 14pt !important; }
        h4 { font-size: 12pt !important; }

        .galeris {
            max-width: 50% !important; /* Imágenes más pequeñas en impresión */
            margin: 10px auto !important;
            border: 1px solid #eee !important; /* Borde sutil para imágenes en impresión */
        }
        .tabla-personajes {
            border: 1px solid #ccc !important; /* Borde para la tabla en impresión */
            font-size: 9pt !important;
            margin: 15px 0 !important;
        }
         .tabla-personajes th,
         .tabla-personajes td {
             border: 1px solid #ddd !important;
             padding: 6px !important;
         }
         .tabla-personajes th {
             background-color: #f0f0f0 !important;
             color: #000 !important;
         }
        pre {
            background-color: #f8f8f8 !important;
            border: 1px solid #eee !important;
            padding: 8px !important;
            page-break-inside: avoid;
            white-space: pre-wrap !important;
            font-size: 10pt !important;
        }
        button { display: none !important; }
    }
    `;
    let htmlOutput = `
<!DOCTYPE html><html lang="es">
<head><meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${titulo2}</title> <style>${cssContent}</style> </head><body>`; htmlOutput += `<h3>${titulo2}</h3>`;
// Recorrer escenas
for (let id in escenas) {
        htmlOutput += `<div class="estiloso">`; // Apertura del contenedor
        htmlOutput += `<h2>${id}</h2>`;
// Mostrar la imagen de la escena
if (escenas[id].imagen) {
            htmlOutput += `<img src="${escenas[id].imagen}" alt="Imagen de la escena">`;}
// Mostrar los botones de la escena
if (escenas[id].botones.length > 0) {
            htmlOutput += "<ul>";
            escenas[id].botones.forEach(boton => {
                htmlOutput += `<li><button onclick="${boton.accion}">${boton.texto}</button></li>`;
            });
            htmlOutput += "</ul>";}
// Mostrar los frames de la escena
if (escenas[id].frames && escenas[id].frames.length > 0) {
            escenas[id].frames.forEach((frame, index) => {
                htmlOutput += `<div class="frame">`;
                    // Mostrar la imagen del frame
if (frame.imagen) {htmlOutput += `<img class="galeris" src="${frame.imagen}" alt="Imagen del frame ${index + 1}">`;}
// Mostrar el texto del frame
if (frame.texto) {
                    let textoFrameConSaltos = frame.texto.replace(/\n/g, "<br>");
                    htmlOutput += `<div class="guion">`;
                    htmlOutput += `<pre>${textoFrameConSaltos}</pre>`;
                    htmlOutput += `</div>`;
                }

htmlOutput += `</div>`;});}
htmlOutput += `</div>`;}

// Sección para el Guion Literario
if (guionLiterarioData && guionLiterarioData.length > 0) {
    htmlOutput += `<div class="guion-literario-exportado">`;
    htmlOutput += `<h3>Guion Literario</h3>`;
    // Asegurarse de que el guion esté ordenado (aunque ya debería estarlo)
    const guionOrdenado = [...guionLiterarioData].sort((a, b) => a.titulo.localeCompare(b.titulo));
    guionOrdenado.forEach(capitulo => {
        htmlOutput += `<div class="capitulo-exportado">`;
        htmlOutput += `<h4>${capitulo.titulo || "Capítulo sin título"}</h4>`;
        // Reemplazar saltos de línea con <br> para la visualización en HTML si no se usa <pre>
        // O usar <pre> para mantener el formato del textarea
        htmlOutput += `<pre>${capitulo.contenido || ""}</pre>`;
        htmlOutput += `</div>`;
    });
    htmlOutput += `</div>`;
}

// Extraer personajes y organizarlos en una tabla
    const contenedorPersonajes = document.getElementById("listapersonajes");
    let filas = "";
    for (let personaje of contenedorPersonajes.children) {
        const nombre = personaje.querySelector("input.nombreh")?.value || "";
        const descripcion = personaje.querySelector("textarea")?.value || "";
        const imagen = personaje.querySelector("img")?.src || "";
        filas += `<tr>
                <td>${imagen ? `<img src="${imagen}" alt=" ">` : ''}</td>
                <td><strong>${nombre}</strong><br>${descripcion}</td></tr>`;}
    if (filas) {
        htmlOutput += `
          <h3>Datos</h3>
          <table class="tabla-personajes">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              ${filas}
            </tbody>
          </table>
        `;
    }
    htmlOutput += "</body></html>";
// Descargar archivo
    let blob = new Blob([htmlOutput], { type: 'text/html' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${titulo2}.html`;
    link.click();}