  function generarGAME(titulo) {
    titulo2 = document.getElementById("titulo-proyecto").innerText;
// Obtener el contenido del archivo CSS de manera sincrónica




    const cssContent = `
    /* Aquí va el contenido de tu archivo styles.css */
    body {
        font-family: Arial, sans-serif;
        align-items: center;
        text-align: center;
        justify-content: center;
        font-size: xx-large;
        background-image:
            radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px),
            radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px);
        background-size: 10px 10px, 20px 20px;
        background-position: 0 0, 5px 5px;}
    .estiloso {
        border: 0px solid gray;
        margin: 1%;
        padding: 1%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%; /* Ocupar la mitad del ancho */
        min-width: 300px; /* Evitar que sea demasiado pequeño */
        text-align: left;
        margin-left: 15%;
        overflow: hidden;
        box-shadow: 10px 10px 15px rgba(0, 0, 0, 0.3);
        border-radius: 2%;
        background-color: #ffffffa9;
        backdrop-filter: blur(0.9px); }
    h2 {
        color: white;
        display: flex;
        margin: 0%;
        padding: 0%;
        position: block;
        text-align: left;
        background-color: gray;}
    h3 { background-color: black;
        color: white;
        font-size: xxx-large;}
    img {
        margin-left: 25dvw;
        transform: translateX(-50%);
        max-width: 98%;
        max-height: 33vh;}
    button {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 10px 20px;
        cursor: pointer;}
    button:hover {
        background-color: #45a049;}
    pre {
        white-space: pre-wrap; /* Asegura que los saltos de línea se respeten */}
    .tabla-personajes {
        width: 75%;
        margin: 20px auto;
        border-collapse: collapse;
        background-color: #ffffffa9;
        backdrop-filter: blur(0.9px);
        font-size: xx-large;}
    .tabla-personajes td {
        border: 1px solid #ccc;
        padding: 0px;}
    .tabla-personajes th {
        background-color: black;
        color: white;
        display: none;}
    .tabla-personajes img {
    position: relative;
    left: 30%;
    margin-left: 0%;
        max-width: 100%;
        max-height: 100%;}
    .tabla-personajes th:nth-child(1),
    .tabla-personajes td:nth-child(1) {
        width: 25%; /* Ajusta la columna de la imagen */
    }

    .tabla-personajes th:nth-child(2),
    .tabla-personajes td:nth-child(2) {
        width: 75%; /* Ajusta la columna del texto */
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
    htmlOutput += `<div class="frame" id="frame-${id}-${index}" style="display: ${index === 0 ? 'block' : 'none'};">`;




// Mostrar el texto del frame
if (frame.texto) {
                    let textoFrameConSaltos = frame.texto.replace(/\n/g, "<br>");
                    htmlOutput += `<pre>${textoFrameConSaltos}</pre>`;
                }
// Mostrar la imagen del frame
if (frame.imagen) {htmlOutput += `<img src="${frame.imagen}" alt="Imagen del frame ${index + 1}">`;}
htmlOutput += `</div>`;});}

if (escenas[id].frames.length > 1) {
    htmlOutput += `
        <button onclick="cambiarFrame('${id}', -1)">Anterior</button>
        <button onclick="cambiarFrame('${id}', 1)">Siguiente</button>


    `;
}

htmlOutput += `</div>`;}



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

    htmlOutput +=  ``;
    htmlOutput += `

</body></html>`;



// Descargar archivo
    let blob = new Blob([htmlOutput], { type: 'text/html' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${titulo2}.html`;
    link.click();}