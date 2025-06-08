/**
 * Genera un archivo HTML interactivo a partir de los momentos del lienzo, usando sus nombres como identificadores.
 * @param {string} nombreMomentoInicial - El NOMBRE del primer momento que se mostrará.
 */
async function generarGAME(nombreMomentoInicial) {
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    /**
     * Convierte un texto a un formato válido para un atributo ID de HTML.
     * @param {string} texto El texto a sanitizar.
     * @returns {string} El texto sanitizado.
     */
    function sanitizarParaId(texto) {
        if (!texto) return '';
        return texto.trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/[^a-zA-Z0-9\s-]/g, "") // Quitar caracteres especiales excepto espacios y guiones
            .replace(/\s+/g, '-') // Reemplazar espacios con guiones
            .toLowerCase();
    }

    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    let momentosHTML = '';

    // PASO 1: Validar nombres duplicados y crear mapas de referencia
    const idToSanitizedNameMap = new Map();
    const sanitizedNameCheck = new Map(); // [nombreSanitizado]: tituloOriginal
    let hasDuplicates = false;
    let duplicateErrorMsg = 'Error: No se puede exportar. Se encontraron nombres de momentos que resultan en el mismo identificador. Por favor, renómbralos para que sean únicos:\n';

    for (const nodo of nodosMomento) {
        const id = nodo.id;
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = sanitizarParaId(titulo);

        if (sanitizedNameCheck.has(sanitizedTitulo)) {
            hasDuplicates = true;
            const originalDuplicateTitle = sanitizedNameCheck.get(sanitizedTitulo);
            if (!duplicateErrorMsg.includes(originalDuplicateTitle)) {
                 duplicateErrorMsg += `\n- "${originalDuplicateTitle}" y "${titulo}" (ambos generan "${sanitizedTitulo}")`;
            } else {
                 duplicateErrorMsg += `, y también "${titulo}"`;
            }

        } else if (sanitizedTitulo) {
            sanitizedNameCheck.set(sanitizedTitulo, titulo);
        }
        idToSanitizedNameMap.set(id, sanitizedTitulo);
    }

    if (hasDuplicates) {
        alert(duplicateErrorMsg);
        return; // Detener la exportación
    }

    // PASO 2: Recopilar todos los datos de los momentos del DOM
    for (const nodo of nodosMomento) {
        const id = nodo.id;
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = idToSanitizedNameMap.get(id);

        const descripcion = nodo.dataset.descripcion || '';
        const imagenSrc = nodo.querySelector('.momento-imagen').src;
        const acciones = JSON.parse(nodo.dataset.acciones || '[]');

        let botonesHTML = '';
        if (acciones.length > 0) {
            acciones.forEach(accion => {
                const idDestino = accion.idDestino;
                const nombreDestinoSanitizado = idToSanitizedNameMap.get(idDestino) || '';
                
                if (nombreDestinoSanitizado) {
                    botonesHTML += `<button onclick="mostrarMomento('${nombreDestinoSanitizado}')">${accion.textoBoton}</button>`;
                } else {
                    console.warn(`En el momento "${titulo}", la acción "${accion.textoBoton}" apunta a un ID de destino no válido o inexistente: "${idDestino}".`);
                    botonesHTML += `<button disabled title="Destino no encontrado">${accion.textoBoton}</button>`;
                }
            });
        }

        // Crea el bloque HTML para este momento usando el nombre sanitizado como ID
        momentosHTML += `
            <div class="momento-exportado" id="${sanitizedTitulo}">
                <h3>${titulo}</h3>
                ${imagenSrc && !imagenSrc.endsWith('/null') ? `<img src="${imagenSrc}" alt="Imagen para ${titulo}">` : ''}
                <p>${descripcion.replace(/\n/g, "<br>")}</p>
                <div class="acciones-exportadas">
                    ${botonesHTML}
                </div>
            </div>
        `;
    }

    // PASO 3: Crear el contenido del archivo HTML final
    const nombreInicialSanitizado = sanitizarParaId(nombreMomentoInicial);
    const htmlCompleto = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tituloProyecto}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f0f2f5;
            color: #1c1e21;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        .juego-container {
            max-width: 680px;
            width: 100%;
        }
        .momento-exportado {
            background-color: #ffffff;
            border: 1px solid #dddfe2;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.1);
            display: none; /* Oculto por defecto */
        }
        .momento-exportado h3 {
            font-size: 1.5em;
            margin-top: 0;
            color: #1c1e21;
        }
        .momento-exportado img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .momento-exportado p {
            font-size: 1.1em;
            line-height: 1.5;
            margin-bottom: 20px;
        }
        .acciones-exportadas {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .acciones-exportadas button {
            width: 100%;
            padding: 12px 20px;
            font-size: 1em;
            font-weight: bold;
            color: #fff;
            background-color: #1877f2;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .acciones-exportadas button:hover {
            background-color: #166fe5;
        }
        .error-container { text-align: center; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px;}
    </style>
</head>
<body>
    <div class="juego-container">
        ${momentosHTML}
    </div>

    <script>
        function mostrarMomento(nombreMomento) {
            const todosLosMomentos = document.querySelectorAll('.momento-exportado');
            todosLosMomentos.forEach(momento => {
                momento.style.display = 'none';
            });

            const momentoActual = document.getElementById(nombreMomento);
            if (momentoActual) {
                momentoActual.style.display = 'block';
            } else {
                console.error('No se encontró el momento con el nombre:', nombreMomento);
                const container = document.querySelector('.juego-container');
                container.innerHTML = '<div class="error-container"><h1>Error de Navegación</h1><p>El momento de destino <strong>(' + nombreMomento + ')</strong> no existe.</p><p>Posibles causas:<ul><li>El nombre del momento de destino fue cambiado.</li><li>El botón apunta a un nombre incorrecto.</li><li>El momento de destino fue eliminado.</li></ul></p></div>';
            }
        }

        window.onload = function() {
            mostrarMomento('${nombreInicialSanitizado}');
        };
    <\/script>
</body>
</html>
    `;

    // 4. Descargar el archivo
    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Juego.html`;
    a.click();
    console.log("Exportación de Videojuego a HTML completada.");
}
