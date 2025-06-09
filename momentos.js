// ===================================
// GESTIÓN DE LA SECCIÓN DE MOMENTOS
// ===================================

const NODE_SIZE = 150;
const NODE_GAP = 30;
let nodoSiendoEditado = null;

/**
 * Inicializa los listeners y componentes de la sección Momentos.
 * Se llama una única vez desde main.js
 */
function initMomentos() {
    document.getElementById('agregar-momento-btn')?.addEventListener('click', agregarMomento);
    document.getElementById('boton-agregar-accion')?.addEventListener('click', agregarAccion);

    // CORRECCIÓN: Se añade el listener para el botón de generación con IA aquí.
    // Esto es más robusto que usar onclick en el HTML.
    document.getElementById('generar-aventura-ia-btn')?.addEventListener('click', generarAventuraConIA);


    const dropZone = document.getElementById('momento-editor-drop-zone');
    const fileInput = document.getElementById('momento-editor-file-input');

    const handleFileSelection = (e) => {
        e.preventDefault();
        const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        if (files.length) {
            handleFileSelect(files[0]);
        }
    };

    dropZone?.addEventListener('click', () => fileInput.click());
    dropZone?.addEventListener('dragover', (e) => e.preventDefault());
    dropZone?.addEventListener('drop', handleFileSelection);
    fileInput?.addEventListener('change', handleFileSelection);
}


/**
 * Agrega un nuevo nodo (momento) al lienzo, centrado en la vista actual.
 */
function agregarMomento() {
    const lienzo = document.getElementById('momentos-lienzo');
    const scrollContainer = document.getElementById('momentos'); // Contenedor con scroll
    if (!lienzo || !scrollContainer) return;

    const nodoId = `momento_${Date.now()}`;
    
    // Calcula la mejor posición para el nuevo nodo
    const { top, left } = calcularPosicionNodo(lienzo, scrollContainer);

    // Crea el nodo usando la nueva función centralizada
    crearNodoEnLienzo({
        id: nodoId,
        titulo: `Momento ${lienzo.children.length + 1}`,
        descripcion: "",
        x: left,
        y: top,
        imagen: "",
        acciones: []
    });
}


/**
 * Abre el modal para editar un nodo específico.
 * @param {HTMLElement} nodo - El elemento del nodo a editar.
 */
function abrirModalEditarMomento(nodo) {
    nodoSiendoEditado = nodo;
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-editar-momento');

    // Poblar el modal con los datos del nodo
    document.getElementById('momento-editor-titulo').value = nodo.querySelector('.momento-titulo').textContent;
    document.getElementById('momento-editor-descripcion').value = nodo.dataset.descripcion || '';
    
    const preview = document.getElementById('momento-editor-imagen-preview');
    const imagenSrc = nodo.querySelector('.momento-imagen').src;
    if (imagenSrc && !imagenSrc.endsWith('/null')) {
        preview.src = imagenSrc;
        preview.style.display = 'block';
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }

    // Cargar y mostrar las acciones guardadas
    const accionesContainer = document.getElementById('acciones-container');
    accionesContainer.innerHTML = ''; // Limpiar
    const accionesData = JSON.parse(nodo.dataset.acciones || '[]');
    accionesData.forEach((accion, index) => {
        const accionDiv = crearElementoAccion(index + 1, accion.textoBoton, accion.idDestino);
        accionesContainer.appendChild(accionDiv);
    });

    if (overlay) {
        overlay.style.display = 'block';
        overlay.onclick = cerrarModalEditarMomento;
    }
    if (modal) modal.style.display = 'flex';
}

/**
 * Cierra el modal de edición de momentos.
 */
function cerrarModalEditarMomento() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-editar-momento');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.onclick = null;
    }
    if (modal) modal.style.display = 'none';
    
    document.getElementById('acciones-container').innerHTML = '';
    nodoSiendoEditado = null;
}

/**
 * Guarda los cambios del modal en el nodo correspondiente.
 */
function guardarCambiosMomento() {
    if (!nodoSiendoEditado) return;

    const nuevoTitulo = document.getElementById('momento-editor-titulo').value;
    const nuevaDesc = document.getElementById('momento-editor-descripcion').value;
    const nuevaImagenSrc = document.getElementById('momento-editor-imagen-preview').src;

    // Actualizar nodo
    nodoSiendoEditado.querySelector('.momento-titulo').textContent = nuevoTitulo;
    nodoSiendoEditado.dataset.descripcion = nuevaDesc;

    const imagenNodo = nodoSiendoEditado.querySelector('.momento-imagen');
    if (nuevaImagenSrc && !nuevaImagenSrc.endsWith('/null') && nuevaImagenSrc.startsWith('data:image')) {
        imagenNodo.src = nuevaImagenSrc;
        imagenNodo.style.display = 'block';
        nodoSiendoEditado.classList.add('con-imagen');
    } else {
        imagenNodo.src = '';
        imagenNodo.style.display = 'none';
        nodoSiendoEditado.classList.remove('con-imagen');
    }

    // Guardar las acciones desde los inputs y selects
    const accionesItems = document.querySelectorAll('#acciones-container .accion-item');
    const accionesData = [];
    accionesItems.forEach(item => {
        const textoBoton = item.querySelector('input[type="text"]').value;
        const idDestino = item.querySelector('select.accion-destino-select').value;
        if(textoBoton && idDestino) { // Solo guardar si ambos campos tienen valor
            accionesData.push({ textoBoton, idDestino });
        }
    });
    nodoSiendoEditado.dataset.acciones = JSON.stringify(accionesData);
    
    cerrarModalEditarMomento();
}

/**
 * Maneja la selección de un archivo de imagen y lo muestra en la vista previa.
 * @param {File} file - El archivo de imagen seleccionado.
 */
async function handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const preview = document.getElementById('momento-editor-imagen-preview');
    preview.src = await fileToBase64(file);
    preview.style.display = 'block';
}

// --- LÓGICA PARA AÑADIR ACCIONES EN EL MODAL ---

function agregarAccion() {
    const accionesContainer = document.getElementById('acciones-container');
    const numAcciones = accionesContainer.getElementsByClassName('accion-item').length;

    if (numAcciones >= 5) {
        alert("Se puede añadir un máximo de 5 acciones por momento.");
        return;
    }
    
    const nuevoNumero = numAcciones + 1;
    const accionDiv = crearElementoAccion(nuevoNumero);
    accionesContainer.appendChild(accionDiv);
}

/**
 * Crea el HTML para una acción (botón) en el modal de edición.
 * @param {number} numero - El número de la acción para el placeholder.
 * @param {string} textoBoton - El texto guardado para el botón.
 * @param {string} idDestino - El ID guardado del momento de destino.
 * @returns {HTMLElement} El elemento div que contiene los controles de la acción.
 */
function crearElementoAccion(numero, textoBoton = '', idDestino = '') {
    const accionDiv = document.createElement('div');
    accionDiv.className = 'accion-item';
    
    const textoInput = document.createElement('input');
    textoInput.type = 'text';
    textoInput.placeholder = `Texto del botón ${numero}`;
    textoInput.value = textoBoton;
    
    const selectDestino = document.createElement('select');
    selectDestino.className = 'accion-destino-select';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = 'Seleccionar destino...';
    selectDestino.appendChild(placeholderOption);

    const todosLosMomentos = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    todosLosMomentos.forEach(nodo => {
        if (nodo.id !== nodoSiendoEditado.id) {
            const option = document.createElement('option');
            option.value = nodo.id;
            option.textContent = nodo.querySelector('.momento-titulo').textContent.trim();
            selectDestino.appendChild(option);
        }
    });

    selectDestino.value = idDestino;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-accion-btn';
    deleteBtn.textContent = 'X';
    deleteBtn.title = 'Eliminar esta acción';
    deleteBtn.onclick = () => {
        accionDiv.remove();
    };
    
    accionDiv.appendChild(textoInput);
    accionDiv.appendChild(selectDestino);
    accionDiv.appendChild(deleteBtn);
    
    return accionDiv;
}

/**
 * Hace que un elemento sea arrastrable de forma suave y predecible.
 * @param {HTMLElement} element - El elemento a hacer arrastrable.
 */
function makeDraggable(element) {
    let isDragging = false;
    let initialX, initialY, initialLeft, initialTop;

    const onMouseDown = (e) => {
        if (e.target.isContentEditable || e.target.closest('.momento-btn, .btn-editar, .btn-eliminar')) {
            return;
        }
        e.preventDefault();
        
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = 1001; 

        initialLeft = element.offsetLeft;
        initialTop = element.offsetTop;
        
        initialX = e.pageX;
        initialY = e.pageY;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        const dx = e.pageX - initialX;
        const dy = e.pageY - initialY;
        
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const lienzo = element.parentElement;
        const lienzoAncho = lienzo.scrollWidth;
        const lienzoAlto = lienzo.scrollHeight;
        
        newLeft = Math.max(0, Math.min(newLeft, lienzoAncho - element.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, lienzoAlto - element.offsetHeight));

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = 1;
        document.removeEventListener('mousemove', onMouseMove);
    };

    element.addEventListener('mousedown', onMouseDown);
}


// =======================================================================
//  INICIO DE LA NUEVA FUNCIONALIDAD: GENERACIÓN DE AVENTURA CON IA
// =======================================================================

/**
 * Inicia el proceso de generación de una aventura interactiva a partir de un guion.
 */
async function generarAventuraConIA() {
    // SEÑAL 1: La función ha comenzado
    console.log("[IA Aventura] Proceso iniciado.");

    const chatDiv = window.chatDiv || document.getElementById('chat');
    const guionSelect = document.getElementById('guion-select');
    const lienzo = document.getElementById('momentos-lienzo');

    // 1. Validar selección
    const tituloGuionSeleccionado = guionSelect.value;
    if (!tituloGuionSeleccionado) {
        alert("Por favor, selecciona un guion de la lista para generar la aventura.");
        // SEÑAL DE ERROR TEMPRANO
        console.warn("[IA Aventura] Proceso cancelado: no se seleccionó ningún guion.");
        return;
    }
    // SEÑAL 2: Guion seleccionado
    console.log(`[IA Aventura] Guion seleccionado: "${tituloGuionSeleccionado}"`);

    if (!confirm(`¿Estás seguro de que quieres generar una nueva aventura a partir del guion "${tituloGuionSeleccionado}"? Se borrarán todos los momentos actuales en el lienzo.`)) {
        // SEÑAL DE CANCELACIÓN
        console.log("[IA Aventura] Proceso cancelado por el usuario.");
        return;
    }

    // 2. Encontrar el guion y extraer su contenido
    const capituloSeleccionado = guionLiterarioData.find(g => g.titulo === tituloGuionSeleccionado);
    if (!capituloSeleccionado || !capituloSeleccionado.contenido) {
        alert("Error: No se pudo encontrar el contenido del guion seleccionado.");
        // SEÑAL DE ERROR
        console.error("[IA Aventura] No se pudo encontrar el objeto del capítulo o su contenido está vacío.");
        return;
    }

    const contenidoTextoPlano = _extraerTextoPlanoDeGuionHTML(capituloSeleccionado.contenido);
    if (!contenidoTextoPlano.trim()) {
        alert("El guion seleccionado parece estar vacío. No se puede generar una aventura.");
        // SEÑAL DE ERROR
        console.error("[IA Aventura] El contenido extraído del guion está vacío.");
        return;
    }
    // SEÑAL 3: Contenido extraído
    console.log("[IA Aventura] Contenido del guion extraído con éxito. Longitud:", contenidoTextoPlano.length);
    
    // 3. Preparar y enviar el prompt a la IA
    const prompt = `
Eres un diseñador de juegos de ficción interactiva. Tu tarea es convertir el siguiente guion en una aventura basada en elecciones, estructurada como una red de "momentos".

Basado en el guion proporcionado, genera un objeto JSON que represente esta aventura. El objeto debe tener una única clave raíz llamada "momentos", que contenga un array de objetos.

Cada objeto "momento" debe tener la siguiente estructura:
- "id": Un ID único y TEMPORAL para este momento (ej: "momento_temp_1", "momento_temp_2").
- "titulo": Un título corto y descriptivo para el momento (máximo 4 palabras).
- "descripcion": Una descripción breve de lo que ocurre en este momento.
- "x" e "y": Coordenadas para una disposición lógica en un lienzo 2D (de 0 a 4800). La historia principal debe fluir de izquierda a derecha. Las ramificaciones pueden ir hacia arriba o hacia abajo.
- "acciones": Un array de objetos "accion". Cada acción representa una elección para el jugador.
  - Cada objeto "accion" debe tener:
    - "textoBoton": El texto que aparecerá en el botón de elección (ej: "Investigar la cueva", "Seguir el camino").
    - "idDestino": El ID temporal del momento al que conduce esta elección.
- "imagen": Dejar este campo como una cadena vacía "".

Guion a procesar:
---
${contenidoTextoPlano}
---

Responde ÚNICAMENTE con el objeto JSON válido. No incluyas explicaciones, texto introductorio, ni marcadores de código como \`\`\`json.
`;

    try {
        // SEÑAL 4: Llamando a la IA
        console.log("[IA Aventura] Enviando prompt a la IA...");
        const respuestaJson = await llamarIAConFeedback(prompt, "Generando Aventura Interactiva", true);
        
        // SEÑAL 5: Respuesta recibida
        console.log("[IA Aventura] Respuesta JSON recibida de la IA:", respuestaJson);

        if (!respuestaJson || !Array.isArray(respuestaJson.momentos) || respuestaJson.momentos.length === 0) {
            throw new Error("La respuesta de la IA no tuvo el formato esperado (se esperaba un objeto con una clave 'momentos' que sea un array).");
        }

        // 4. Procesar la respuesta y dibujar los nodos
        console.log("[IA Aventura] Limpiando el lienzo y procesando la respuesta.");
        lienzo.innerHTML = ''; // Limpiar el lienzo
        const momentosGenerados = respuestaJson.momentos;
        const idMap = new Map();

        // Primera pasada: Crear todos los nodos y mapear los IDs temporales a los reales
        console.log("[IA Aventura] Creando nodos en el lienzo (primera pasada)...");
        momentosGenerados.forEach(datosMomento => {
            const nuevoId = `momento_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            idMap.set(datosMomento.id, nuevoId); // Mapear ID temporal de la IA al ID real
            
            crearNodoEnLienzo({
                ...datosMomento,
                id: nuevoId, // Usar el nuevo ID real para el elemento
                acciones: [] // Las acciones se añadirán en la segunda pasada
            });
        });

        // Segunda pasada: Actualizar las acciones con los IDs de destino reales
        console.log("[IA Aventura] Conectando acciones entre nodos (segunda pasada)...");
        momentosGenerados.forEach(datosMomento => {
            const idOriginal = datosMomento.id;
            const idReal = idMap.get(idOriginal);
            const nodoElement = document.getElementById(idReal);

            if (nodoElement) {
                const accionesOriginales = datosMomento.acciones || [];
                const accionesTraducidas = accionesOriginales
                    .map(accion => {
                        const idDestinoOriginal = accion.idDestino;
                        const idDestinoReal = idMap.get(idDestinoOriginal);
                        if (!idDestinoReal) {
                             console.warn(`[IA Aventura] Enlace roto detectado: El ID de destino "${idDestinoOriginal}" no fue encontrado en los momentos generados.`);
                        }
                        return {
                            textoBoton: accion.textoBoton,
                            idDestino: idDestinoReal
                        };
                    })
                    .filter(a => a.idDestino); // Filtrar enlaces rotos

                nodoElement.dataset.acciones = JSON.stringify(accionesTraducidas);
            }
        });

        if (chatDiv) {
            chatDiv.innerHTML += `<p><strong>Éxito:</strong> Se ha generado una nueva aventura interactiva en el lienzo de Momentos.</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
        // SEÑAL 6: Proceso completado
        console.log("[IA Aventura] Proceso completado con éxito.");
        alert("¡Aventura generada con éxito!");

    } catch (error) {
        // SEÑAL DE ERROR EN EJECUCIÓN
        console.error("[IA Aventura] Ocurrió un error catastrófico durante la generación:", error);
        if (chatDiv) {
            chatDiv.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
        alert("Ocurrió un error al generar la aventura. Revisa la consola del navegador (F12) para más detalles.");
    }
}

/**
 * Crea un nodo de momento en el lienzo a partir de un objeto de datos.
 * @param {object} datos - Objeto con la información del momento (id, titulo, x, y, etc.).
 */
function crearNodoEnLienzo(datos) {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return null;

    const nuevoNodo = document.createElement('div');
    nuevoNodo.className = 'momento-nodo';
    nuevoNodo.id = datos.id;
    
    nuevoNodo.innerHTML = `
        <p contenteditable="true" class="momento-titulo">${datos.titulo || 'Sin Título'}</p>
        <div class="momento-contenido">
             <img class="momento-imagen" src="" style="display: none;">
             <span class="placeholder-contenido"></span>
        </div>
        <div class="momento-botones">
            <button class="momento-btn btn-editar">Editar</button>
            <button class="momento-btn btn-eliminar">Eliminar</button>
        </div>
    `;

    nuevoNodo.style.left = `${datos.x || 0}px`;
    nuevoNodo.style.top = `${datos.y || 0}px`;
    
    nuevoNodo.dataset.descripcion = datos.descripcion || "";
    nuevoNodo.dataset.acciones = JSON.stringify(datos.acciones || "[]");

    const imagenNodo = nuevoNodo.querySelector('.momento-imagen');
    if (datos.imagen) {
        imagenNodo.src = datos.imagen;
        imagenNodo.style.display = 'block';
        nuevoNodo.classList.add('con-imagen');
    }

    lienzo.appendChild(nuevoNodo);

    nuevoNodo.querySelector('.btn-editar').onclick = () => abrirModalEditarMomento(nuevoNodo);
    nuevoNodo.querySelector('.btn-eliminar').onclick = () => {
        if (confirm('¿Estás seguro de que quieres eliminar este momento?')) {
            nuevoNodo.remove();
        }
    };
    nuevoNodo.querySelector('.momento-titulo').addEventListener('mousedown', e => e.stopPropagation());
    
    makeDraggable(nuevoNodo);
    return nuevoNodo;
}

/**
 * Helper para extraer el texto plano de un contenido de guion en HTML.
 * @param {string} contenidoHTML - El string HTML del guion.
 * @returns {string} El texto plano extraído.
 */
function _extraerTextoPlanoDeGuionHTML(contenidoHTML) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(contenidoHTML, 'text/html');
        return doc.body.innerText || "";
    } catch (e) {
        console.error("Error al parsear HTML del guion:", e);
        return "";
    }
}

// =======================================================================
//  FIN DE LA NUEVA FUNCIONALIDAD
// =======================================================================

/**
 * Calcula la posición para un nuevo nodo, centrado en la vista del usuario
 * y buscando un lugar libre si el centro está ocupado.
 * @param {HTMLElement} lienzo - El elemento del lienzo donde se colocan los nodos.
 * @param {HTMLElement} scrollContainer - El contenedor que tiene el scroll.
 * @returns {{top: number, left: number}} La posición calculada.
 */
function calcularPosicionNodo(lienzo, scrollContainer) {
    const nodosExistentes = lienzo.querySelectorAll('.momento-nodo');

    const centroVisibleX = scrollContainer.scrollLeft + (scrollContainer.clientWidth / 2);
    const centroVisibleY = scrollContainer.scrollTop + (scrollContainer.clientHeight / 2);

    const centroLeftInicial = centroVisibleX - (NODE_SIZE / 2);
    const centroTopInicial = centroVisibleY - (NODE_SIZE / 2);
    
    const hayColision = (x, y) => {
        const rectNuevoNodo = { 
            left: x, top: y, right: x + NODE_SIZE, bottom: y + NODE_SIZE 
        };
        for (const nodo of nodosExistentes) {
            const nodoRect = {
                left: nodo.offsetLeft, top: nodo.offsetTop,
                right: nodo.offsetLeft + nodo.offsetWidth, bottom: nodo.offsetTop + nodo.offsetHeight
            };
            if (rectNuevoNodo.left < nodoRect.right + NODE_GAP && 
                rectNuevoNodo.right + NODE_GAP > nodoRect.left &&
                rectNuevoNodo.top < nodoRect.bottom + NODE_GAP && 
                rectNuevoNodo.bottom + NODE_GAP > nodoRect.top) {
                return true;
            }
        }
        return false;
    };

    if (!hayColision(centroLeftInicial, centroTopInicial)) {
        return { top: centroTopInicial, left: centroLeftInicial };
    }

    let x = 0, y = 0, delta = [0, -1];
    let sideLength = 0, steps_to_turn = 1, step = 0;

    for (let i = 0; i < 2500; i++) {
        if (step >= steps_to_turn) {
            delta = [-delta[1], delta[0]];
            sideLength++;
            step = 0;
            if (sideLength % 2 === 0) steps_to_turn++;
        }
        x += delta[0]; y += delta[1]; step++;
        
        const currentLeft = centroLeftInicial + x * (NODE_SIZE + NODE_GAP);
        const currentTop = centroTopInicial + y * (NODE_SIZE + NODE_GAP);

        if (!hayColision(currentLeft, currentTop)) {
            const lienzoAncho = lienzo.scrollWidth;
            const lienzoAlto = lienzo.scrollHeight;
            if (currentLeft >= 0 && currentTop >= 0 && currentLeft < lienzoAncho - NODE_SIZE && currentTop < lienzoAlto - NODE_SIZE) {
               return { top: currentTop, left: currentLeft };
            }
        }
    }
    
    console.warn("No se pudo encontrar una posición libre. Colocando aleatoriamente cerca del centro.");
    return { 
        top: centroTopInicial + (Math.random() - 0.5) * 400, 
        left: centroLeftInicial + (Math.random() - 0.5) * 400 
    };
}
