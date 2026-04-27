// ─── EXPORT TO DOCX (export.docx.js) ─────────────────────────

async function descargarDOCX(texto) {
  // Generamos un archivo .html profesional con formato A5.
  // Este archivo incluye numeración automática secuencial de capítulos.

  const htmlStart = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manuscrito Final</title>
  <style>
    /* Configuración de página A5 para impresión y Word */
    @page {
      size: A5;
      margin: 20mm;
    }
    body {
      font-family: 'Georgia', serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #1a1a1a;
    }
    .page {
      background-color: white;
      width: 148mm;
      min-height: 210mm;
      padding: 25mm 20mm;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 40px;
      box-sizing: border-box;
      position: relative;
    }
    /* Estilo para "Capítulo X" */
    h1 {
      text-align: center;
      font-size: 16pt;
      font-weight: normal;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      margin-top: 50px;
      margin-bottom: 10pt;
      page-break-before: always;
    }
    /* Estilo para el nombre o subtítulo del capítulo */
    .chap-title {
      text-align: center;
      font-size: 14pt;
      font-style: italic;
      margin-bottom: 60px;
      color: #555;
    }
    p {
      text-align: justify;
      font-size: 11pt;
      line-height: 1.8;
      margin: 0 0 12pt 0;
      text-indent: 1.25cm; /* Sangría de primera línea clásica */
    }
    /* El primer párrafo después de un título no suele llevar sangría */
    h1 + p, .chap-title + p {
      text-indent: 0;
    }
    
    @media print {
      body { background: transparent; padding: 0; display: block; }
      .page { box-shadow: none; margin: 0; padding: 25mm 20mm; width: 100%; min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="page">
`;

  let innerHtml = "";
  const lineas = texto.split('\n');
  let chapterCounter = 0;
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    
    if (linea === "") {
      continue;
    } else if (linea.startsWith('## ')) {
      chapterCounter++;
      
      // Si ya hay contenido previo, cerramos la página actual y abrimos una nueva
      if (innerHtml !== "") {
        innerHtml += `  </div>\n  <div class="page">\n`;
      }
      
      // Limpiamos el texto para ver si hay un título específico aparte de "Capítulo X"
      let tituloOriginal = linea.replace(/^## /, '').trim();
      let subtitulo = "";
      
      // Si el texto contiene ":" (ej: "Capítulo 1: El Gran Viaje"), extraemos lo que hay después
      if (tituloOriginal.includes(':')) {
        subtitulo = tituloOriginal.split(':').slice(1).join(':').trim();
      } else {
        // Si el título no es simplemente la palabra "Capítulo X", lo tratamos como subtítulo
        const esSoloCap = /Cap[ií]tulo\s*\d+/i.test(tituloOriginal);
        if (!esSoloCap) {
          subtitulo = tituloOriginal;
        }
      }

      // Insertamos el Capítulo con su número secuencial
      innerHtml += `    <h1>Capítulo ${chapterCounter}</h1>\n`;
      
      // Si hemos extraído un nombre para el capítulo, lo ponemos debajo
      if (subtitulo) {
        innerHtml += `    <div class="chap-title">${subtitulo}</div>\n`;
      }
    } else {
      // Es un párrafo normal de la obra
      innerHtml += `    <p>${linea}</p>\n`;
    }
  }

  const htmlEnd = `  </div>\n</body>\n</html>`;
  const finalHtml = htmlStart + innerHtml + htmlEnd;
  
  // Creamos el archivo para descargar
  const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `Manuscrito_A5_Completo_${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}