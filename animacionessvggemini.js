// ==================================================
// --- LÓGICA DE IA PARA ANIMACIONES SVG (VERSIÓN MEJORADA Y OPTIMIZADA) ---
// ==================================================

/**
 * Abre el modal para que el usuario introduzca un prompt para generar una animación.
 */
function abrirModalAnimacionesIA() {
    const existingModal = document.getElementById('modal-animacion-ia');
    if (existingModal) existingModal.remove();

    // Se elimina el 'onclick' del botón y se le añade un ID para manejarlo con Javascript
    const modalHTML = `
        <div id="modal-animacion-ia" class="modal-content" style="display: flex; max-width: 500px;">
            <button id="cerrar-modal-animacion-ia-btn" class="modal-close-button">&times;</button>
            <h3>Generar Animación SVG con IA</h3>
            <p style="font-size: 0.9em; color: #ccc; margin-bottom: 1rem;">
                Describe la animación que quieres crear. La IA analizará tu petición, usará los "Datos" existentes como personajes y generará una nueva escena animada.
            </p>
            <textarea id="prompt-animacion-ia" class="area-texto" style="height: 120px;" placeholder="Ej: Un samurai llamado 'Kenshin' camina desde la izquierda hasta el centro. Un ninja llamado 'Hanzo' aparece de repente a la derecha. Kenshin desenfunda su espada."></textarea>
            <div id="ia-status-container" style="margin-top: 1rem; display: none;"></div>
            <button id="btn-generar-animacion-ia" class="modal-button principal-action" style="margin-top: 1rem;">
                ✨ Generar Animación
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('modal-animacion-ia');
    const overlay = document.getElementById('modal-overlay');
    const closeButton = document.getElementById('cerrar-modal-animacion-ia-btn');

    // Lógica para cerrar el modal y el overlay
    const cerrarEsteModal = () => {
        if (modal) modal.remove(); // Elimina el modal del DOM para mantenerlo limpio
        if (overlay) {
            overlay.style.display = 'none';
            overlay.onclick = null; // Limpia el listener para evitar fugas de memoria
        }
    };

    // Asignar la lógica de cierre a los eventos
    overlay.style.display = 'block';
    overlay.onclick = cerrarEsteModal;
    if (closeButton) {
        closeButton.onclick = cerrarEsteModal;
    }
    
    document.getElementById('btn-generar-animacion-ia').onclick = iniciarProcesoGeneracionAnimacionIA;
}

/**
 * Muestra un mensaje de estado o de carga dentro del modal de la IA.
 * @param {string} mensaje - El texto a mostrar.
 * @param {boolean} isLoading - Si es true, muestra un spinner.
 */
function mostrarEstadoIA(mensaje, isLoading = true) {
    const statusContainer = document.getElementById('ia-status-container');
    if (!statusContainer) return;

    statusContainer.style.display = 'block';
    let spinnerHTML = isLoading ? '<div class="spinner-carga-modal"></div>' : '';
    statusContainer.innerHTML = `${spinnerHTML}<p>${mensaje}</p>`;
}

/**
 * Inicia la secuencia mejorada de 3 pasos para generar la animación con IA.
 */
async function iniciarProcesoGeneracionAnimacionIA() {
    const promptUsuario = document.getElementById('prompt-animacion-ia').value;
    if (!promptUsuario.trim()) {
        alert("Por favor, introduce una descripción para la animación.");
        return;
    }
    
    document.getElementById('btn-generar-animacion-ia').disabled = true;

    try {
        // --- PASO 1: ANÁLISIS DE RECURSOS VISUALES ---
        mostrarEstadoIA("Paso 1/3: Analizando recursos visuales...");
        const recursos = await analizarRecursosVisuales(promptUsuario);
        console.log("Recursos analizados:", recursos);

        // --- PASO 2: COMPOSICIÓN DE LA ESCENA INICIAL ---
        mostrarEstadoIA("Paso 2/3: Componiendo la escena inicial (layout y escalas)...");
        const composicion = await componerEscenaInicial(promptUsuario, recursos);
        console.log("Composición de escena generada:", composicion);

        // --- PASO 3: GENERACIÓN DE INSTRUCCIONES DE ANIMACIÓN ---
        mostrarEstadoIA("Paso 3/3: Creando la secuencia de animación...");
        const instrucciones = await generarInstruccionesAnimacion(promptUsuario, composicion);
        console.log("Instrucciones de animación recibidas:", instrucciones);

        // --- MONTAJE FINAL ---
        mostrarEstadoIA("Montando la escena final...", false);
        await interpretarYMontarAnimacionIA(recursos, instrucciones);
        
        const modalToClose = document.getElementById('modal-animacion-ia');
        if(modalToClose) {
            const overlay = document.getElementById('modal-overlay');
            modalToClose.remove();
            if(overlay) overlay.style.display = 'none';
        }
        alert("¡La animación generada por IA se ha creado en una nueva escena!");

    } catch (error) {
        console.error("Error en el proceso de generación de animación IA:", error);
        mostrarEstadoIA(`Error: ${error.message}`, false);
    } finally {
        const genButton = document.getElementById('btn-generar-animacion-ia');
        if(genButton) genButton.disabled = false;
    }
}

/**
 * Extrae las dimensiones de un string SVG.
 * @param {string} svgString - El contenido del archivo SVG.
 * @returns {{width: number, height: number}|null}
 */
function getSvgDimensions(svgString) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, "image/svg+xml");
        const svg = doc.documentElement;
        if (svg.tagName.toLowerCase() !== 'svg') return null;

        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.split(' ');
            return { width: parseFloat(parts[2]), height: parseFloat(parts[3]) };
        }
        const width = svg.getAttribute('width');
        const height = svg.getAttribute('height');
        if (width && height) {
            return { width: parseFloat(width), height: parseFloat(height) };
        }
        return null;
    } catch (e) {
        console.error("Error parsing SVG for dimensions:", e);
        return null;
    }
}

/**
 * PASO 1 (SIMPLIFICADO): Analiza el prompt e identifica los recursos existentes por nombre.
 */
async function analizarRecursosVisuales(promptUsuario) {
    const personajesNodes = Array.from(document.querySelectorAll('#listapersonajes .personaje'));
    const personajesDisponibles = personajesNodes.map(node => {
        const img = node.querySelector('img');
        return {
            nombre: node.querySelector('.nombreh').value,
            svg: node.dataset.svgContent || null,
            imagen: (img && img.src.startsWith('data:image')) ? img.src : null
        };
    });
    
    const promptPaso1 = `
        Analiza el siguiente prompt de animación. Tu tarea es identificar todos los elementos (personajes, objetos, fondos) que se mencionan.
        Luego, compáralos con la lista de "personajes disponibles" que te proporciono. Tu prioridad MÁXIMA es usar los personajes existentes.

        Prompt del usuario: "${promptUsuario}"
        Personajes disponibles: ${JSON.stringify(personajesDisponibles.map(p => p.nombre))}

        Responde únicamente con un objeto JSON que contenga un array llamado "assets".
        Para CADA elemento mencionado en el prompt, crea un objeto en el array "assets" con las siguientes propiedades:
        - "nombre": El nombre del elemento (ej: "Kenshin", "espada", "árbol").
        - "existente": DEBE ser true si el nombre coincide con uno de la lista de "personajes disponibles", de lo contrario false.
    `;
    
    const analisisDesdeIA = await llamarIAConFeedback(promptPaso1, "Análisis de recursos", true);

    // Enriquecer la respuesta de la IA con los datos gráficos reales para el montaje final (esto no se envía a la IA)
    if (analisisDesdeIA && analisisDesdeIA.assets) {
        for (const asset of analisisDesdeIA.assets) {
            if (asset.existente) {
                const personaje = personajesDisponibles.find(p => p.nombre.toLowerCase() === asset.nombre.toLowerCase());
                if (personaje) {
                    asset.svg = personaje.svg;
                    asset.imagen = personaje.imagen;
                    asset.tipo_grafico = personaje.svg ? 'svg' : 'imagen';
                }
            } else {
                 asset.tipo_grafico = 'placeholder';
            }
        }
    }
    return analisisDesdeIA;
}

/**
 * PASO 2 (SIMPLIFICADO): Crea una composición de escena inicial asumiendo un tamaño estándar.
 */
async function componerEscenaInicial(promptUsuario, recursos) {
    const canvasRect = document.getElementById('svg-canvas').getBoundingClientRect();
    // Prepara una versión súper ligera de los recursos para enviar a la IA, solo los nombres.
    const nombresDeRecursos = recursos.assets.map(asset => asset.nombre);

    const promptPaso2 = `
        Eres un director de escena. Tu tarea es crear la composición inicial para una animación.
        Debes decidir una posición (x, y) y una escala inicial para CADA asset para que la escena sea visualmente coherente.

        Consideraciones CLAVE:
        - El lienzo mide ${canvasRect.width}px de ancho por ${canvasRect.height}px de alto. El centro es (${canvasRect.width / 2}, ${canvasRect.height / 2}).
        - IMPORTANTE: Asume que todos los gráficos de personajes existentes tienen un tamaño base cuadrado de aproximadamente 750x750px. Debes proponer una 'escala' MUCHO MENOR que 1.0 para que quepan en la escena (ej: 0.2 o 0.3).
        - Los personajes y objetos deben tener un tamaño lógico y relativo entre ellos. Un personaje humanoide no debería ocupar más del 40% de la altura del canvas. Un árbol debe ser más alto que una persona.
        - Los elementos de fondo (cielo, césped) deben posicionarse para llenar el espacio adecuadamente y tener una escala grande.
        - La composición debe reflejar el estado inicial descrito en el prompt. Si un personaje "entra desde la izquierda", su posición 'x' inicial debe estar fuera del canvas (ej: -100).
        - La escala es un multiplicador. 1 es el tamaño original. Ajusta la escala para que los elementos tengan un tamaño apropiado en la escena.

        Prompt del usuario: "${promptUsuario}"
        Assets en la escena: ${JSON.stringify(nombresDeRecursos)}

        Responde únicamente con un objeto JSON que contenga un array llamado "layout_inicial".
        Cada objeto en el array debe representar un asset y tener las propiedades: "elemento" (nombre), "x", "y", y "escala".
    `;
    return await llamarIAConFeedback(promptPaso2, "Composición de escena", true);
}


/**
 * PASO 3 (Sin cambios): Convierte el prompt y la composición en una lista de instrucciones de animación ejecutables.
 */
async function generarInstruccionesAnimacion(promptUsuario, composicion) {
    const capacidadesAnimacion = `
        Tu tarea es convertir un prompt de usuario en una lista de comandos de animación JSON, partiendo de una composición de escena inicial.
        
        Prompt del usuario: "${promptUsuario}"
        Composición Inicial (estado en tiempo 0): ${JSON.stringify(composicion.layout_inicial)}

        Funciones de animación disponibles:
        - accion: "mover", params: { x_final: number, y_final: number }
        - accion: "escalar", params: { escala_final: number }
        - accion: "rotar", params: { angulo_final: number }

        Instrucciones:
        1. Crea un array JSON llamado "instrucciones".
        2. Para CADA elemento en la "Composición Inicial", crea una primera instrucción de tipo "aparecer" en "tiempo_inicio: 0" con los datos exactos de la composición.
        3. Luego, traduce las acciones del prompt del usuario (caminar, aparecer, desenfundar) en una secuencia de acciones ("mover", "escalar", "rotar"), asignando un "tiempo_inicio" y "duracion" lógicos en milisegundos para cada una.
        
        Responde únicamente con el objeto JSON que contiene el array "instrucciones".
    `;
    return await llamarIAConFeedback(capacidadesAnimacion, "Generación de instrucciones", true);
}


/**
 * Interpreta el JSON final de la IA y monta la animación en una nueva escena.
 */
async function interpretarYMontarAnimacionIA(recursos, instruccionesData) {
    if (!instruccionesData || !Array.isArray(instruccionesData.instrucciones)) {
        throw new Error("La respuesta final de la IA no contiene un array de 'instrucciones' válido.");
    }

    crearNuevaEscena();

    const elementosEnEscena = {};
    
    for (const asset of recursos.assets) {
        let nuevoElemento;
        if (asset.existente) {
             if (asset.svg) {
                const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const content = new DOMParser().parseFromString(asset.svg, "image/svg+xml").documentElement;
                Array.from(content.children).forEach(child => wrapper.appendChild(child.cloneNode(true)));
                nuevoElemento = registerShape(wrapper);
            } else if (asset.imagen) {
                 const svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                 const img = new Image();
                 img.src = asset.imagen;
                 await new Promise(resolve => img.onload = resolve);
                 svgImage.setAttribute('width', img.width);
                 svgImage.setAttribute('height', img.height);
                 svgImage.setAttribute('href', asset.imagen);
                 nuevoElemento = registerShape(svgImage);
            }
        }
        
        if (!nuevoElemento) { // Si no era existente o no tenía gráfico, crear placeholder
            const placeholder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            placeholder.setAttribute('width', 100);
            placeholder.setAttribute('height', 150);
            placeholder.setAttribute('fill', randomColor);
            nuevoElemento = registerShape(placeholder);
        }
        elementosEnEscena[asset.nombre] = nuevoElemento;
    }

    for (const instruccion of instruccionesData.instrucciones) {
        const elemento = elementosEnEscena[instruccion.elemento];
        if (!elemento) {
            console.warn(`Elemento "${instruccion.elemento}" no encontrado en la escena.`);
            continue;
        }

        const shapeId = elemento.id;
        const keyframes = animationData[shapeId].keyframes;
        
        let estadoAnterior = keyframes.length > 0 ? 
            keyframes[keyframes.length - 1].attrs : 
            getShapeTransforms(elemento);

        let nuevoEstado = JSON.parse(JSON.stringify(estadoAnterior));

        switch (instruccion.accion) {
            case 'aparecer':
                nuevoEstado.x = instruccion.params.x;
                nuevoEstado.y = instruccion.params.y;
                nuevoEstado.scaleX = instruccion.params.escala || 1;
                nuevoEstado.scaleY = instruccion.params.escala || 1;
                keyframes.push({ time: instruccion.tiempo_inicio, attrs: nuevoEstado, easing: 'linear' });
                break;

            case 'mover':
                nuevoEstado.x = instruccion.params.x_final;
                nuevoEstado.y = instruccion.params.y_final;
                keyframes.push({ time: instruccion.tiempo_inicio + instruccion.duracion, attrs: nuevoEstado, easing: 'linear' });
                break;

            case 'escalar':
                nuevoEstado.scaleX = instruccion.params.escala_final;
                nuevoEstado.scaleY = instruccion.params.escala_final;
                keyframes.push({ time: instruccion.tiempo_inicio + instruccion.duracion, attrs: nuevoEstado, easing: 'linear' });
                break;
            
            case 'rotar':
                nuevoEstado.rotation = instruccion.params.angulo_final;
                keyframes.push({ time: instruccion.tiempo_inicio + instruccion.duracion, attrs: nuevoEstado, easing: 'linear' });
                break;
        }
        keyframes.sort((a, b) => a.time - b.time);
    }
    
    renderLayerList();
    updateStateAtTime(0);
}
