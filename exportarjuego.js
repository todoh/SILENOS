/**
 * Genera un archivo HTML interactivo a partir de los momentos del lienzo, usando sus nombres como identificadores.
 * @param {string} nombreMomentoInicial - El NOMBRE del primer momento que se mostrará.
 */
async function generarGAME(nombreMomentoInicial) {
    const tituloProyecto = document.getElementById("titulo-proyecto").innerText;

    function sanitizarParaId(texto) {
        if (!texto) return '';
        return texto.trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, '-')
            .toLowerCase();
    }

    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    
    // --- PASO 1: Validar nombres y crear mapas (sin cambios, tu lógica es perfecta) ---
    const idToSanitizedNameMap = new Map();
    const sanitizedNameCheck = new Map();
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
        return;
    }
    
    // --- [MODIFICADO] PASO 2: Recopilar datos en un objeto JSON en lugar de HTML ---
    const momentosData = {};
    for (const nodo of nodosMomento) {
        const titulo = nodo.querySelector('.momento-titulo').textContent;
        const sanitizedTitulo = idToSanitizedNameMap.get(nodo.id);
        
        const accionesOriginales = JSON.parse(nodo.dataset.acciones || '[]');
        const accionesMapeadas = accionesOriginales.map(accion => ({
            ...accion,
            idDestino: idToSanitizedNameMap.get(accion.idDestino) || ''
        })).filter(accion => accion.idDestino); // Filtra acciones con destino inválido

     // dentro del bucle for (const nodo of nodosMomento)
momentosData[sanitizedTitulo] = {
    titulo: titulo,
    descripcion: nodo.dataset.descripcion || '',
    // Nuevo: Pasamos el código SVG crudo. Dejamos el .src como fallback por si hay imágenes antiguas.
    svg: nodo.dataset.svgIlustracion || '', 
    imagenFallback: nodo.querySelector('.momento-imagen').src,
    acciones: accionesMapeadas
};
    }

    // --- [MODIFICADO] PASO 3: Crear el contenido del archivo HTML final con el NUEVO DISEÑO ---
    const nombreInicialSanitizado = sanitizarParaId(nombreMomentoInicial);
    
    const css = `
        /* [CSS MODIFICADO] Estilos para el nuevo layout de juego */
        html, body {
            margin: 0; padding: 0; height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #1a1a1a;
            color: #f0f0f0;
        }
        .game-container {
            display: flex; flex-direction: column;
            height: 100%; width: 100%;
        }
        .image-container {
            flex: 0 0 73%;
            overflow: hidden;
            background-color: #000;
        }
        #game-image {
            width: 100%; height: 100%;
            object-fit: cover;
            object-position: center;
        }
        .content-container {
            flex: 1; display: flex; flex-direction: column;
            padding: 25px; box-sizing: border-box;
            overflow-y: auto;
        }
        #game-title {
            margin: 0 0 15px 0; font-size: 1.8em; color: #ffffff;
            flex-shrink: 0;
        }
        #game-description {
            margin: 0 0 20px 0; font-size: 1.1em; line-height: 1.6;
            color: #cccccc; flex-grow: 1;
        }
        .actions-container {
            display: flex; flex-direction: column;
            gap: 12px; margin-top: auto;
            flex-shrink: 0;
        }
        .action-button {
            width: 100%; padding: 15px; font-size: 1.1em; font-weight: bold;
            color: #ffffff; background-color: #007bff;
            border: none; border-radius: 8px; cursor: pointer;
            text-align: center; text-decoration: none;
            transition: background-color 0.2s;
        }
        .action-button:hover { background-color: #0056b3; }
        .error-container { text-align: center; color: #ffdddd; padding: 40px; }
    `;

    const script = `
        // [SCRIPT DEL JUEGO MODIFICADO] Lógica para renderizado dinámico con soporte para SVG y fallbacks
        const momentos = ${JSON.stringify(momentosData)};
        const idInicio = "${nombreInicialSanitizado}";

        function mostrarMomento(sanitizedName) {
            const momento = momentos[sanitizedName];
            const container = document.querySelector('.game-container');

            if (!momento) {
                console.error('No se encontró el momento con el nombre:', sanitizedName);
                container.innerHTML = '<div class="error-container"><h1>Error de Navegación</h1><p>El momento de destino <strong>(' + sanitizedName + ')</strong> no existe.</p></div>';
                return;
            }

            // --- Actualización de la lógica de la imagen ---
            const gameImage = document.getElementById('game-image');

            // Priorizamos mostrar el SVG si existe para máxima calidad.
            if (momento.svg && momento.svg.trim() !== '') {
                // Creamos un Data URL a partir del texto SVG crudo.
                // Usamos unescape y encodeURIComponent para manejar correctamente caracteres especiales (UTF-8) antes de codificar a Base64.
                const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(momento.svg)));
                gameImage.src = svgDataUrl;
            } else {
                // Si no hay SVG, usamos la imagen de fallback (útil para momentos no ilustrados o con PNGs antiguos).
                gameImage.src = momento.imagenFallback || '';
            }

            // --- El resto de la lógica permanece igual ---
            document.getElementById('game-title').textContent = momento.titulo;
            document.getElementById('game-description').innerHTML = momento.descripcion.replace(/\\n/g, "<br>");
            
            const actionsContainer = document.getElementById('game-actions');
            actionsContainer.innerHTML = ''; // Limpiar botones anteriores

            if (momento.acciones) {
                momento.acciones.forEach(accion => {
                    const button = document.createElement('button');
                    button.className = 'action-button';
                    button.textContent = accion.textoBoton;
                    button.onclick = () => mostrarMomento(accion.idDestino);
                    actionsContainer.appendChild(button);
                });
            }
        }
        
        window.onload = () => mostrarMomento(idInicio);
    `;

    const htmlCompleto = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tituloProyecto}</title>
    <style>${css}</style>
</head>
<body>
    <div class="game-container">
        <div class="image-container">
            <img id="game-image" src="" alt="Escena del momento">
        </div>
        <div class="content-container">
            <h1 id="game-title"></h1>
            <p id="game-description"></p>
            <div class="actions-container" id="game-actions"></div>
        </div>
    </div>
    <script>${script.replace(/<\/script>/g, '<\\/script>')}
    <\/script>
</body>
</html>`;

    // 4. Descargar el archivo (sin cambios)
    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tituloProyecto.replace(/\s+/g, '_')}_Juego.html`;
    a.click();
    console.log("Exportación de Videojuego a HTML completada.");
}


/**
 * Popula el menú desplegable para seleccionar el momento inicial en el modal de exportación.
 */
function poblarSelectorMomentoInicial() {
    const selectMomentoInicial = document.getElementById('momento-inicial-id');
    if (!selectMomentoInicial) {
        console.error("Error: No se encontró el elemento select 'momento-inicial-id'.");
        return;
    }
    const nodosMomento = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    const valorSeleccionadoPreviamente = selectMomentoInicial.value;
    selectMomentoInicial.innerHTML = '';
    if (nodosMomento.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No hay momentos creados";
        option.disabled = true;
        selectMomentoInicial.appendChild(option);
        return;
    }
    const placeholder = document.createElement('option');
    placeholder.value = "";
    placeholder.textContent = "Selecciona un momento inicial...";
    selectMomentoInicial.appendChild(placeholder);
    nodosMomento.forEach(nodo => {
        const option = document.createElement('option');
        const titulo = nodo.querySelector('.momento-titulo').textContent.trim();
        option.value = titulo; 
        option.textContent = titulo;
        selectMomentoInicial.appendChild(option);
    });
    selectMomentoInicial.value = valorSeleccionadoPreviamente;
}

/**
 * Inicia la exportación del juego HTML.
 */
function iniciarExportacionJuego() {
    const momentoInicialSelect = document.getElementById('momento-inicial-id');
    const nombreMomentoInicial = momentoInicialSelect.value;
    if (!nombreMomentoInicial) {
        alert("Por favor, selecciona un momento inicial para comenzar el juego.");
        return;
    }
    generarGAME(nombreMomentoInicial);
}