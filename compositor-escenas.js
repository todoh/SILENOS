/**
 * @file compositor-escenas.js
 * @description Orquesta la creación de escenas 3D compuestas a partir de un prompt.
 * Analiza el prompt, genera las entidades necesarias (personajes, objetos),
 * las compone en una escena de Three.js y devuelve una imagen final.
 */

// Función de delay para no saturar la API
// const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Función principal para generar una escena 3D compuesta a partir de un prompt.
 * @param {string} prompt - El prompt que describe la escena.
 * @param {HTMLElement} statusContainer - El elemento del DOM para mostrar el estado.
 * @returns {Promise<string>} Una promesa que se resuelve con la URL de la imagen generada.
 */
async function generarEscenaCompuesta(prompt, statusContainer) {
    const updateStatus = (message) => {
        if (statusContainer) {
            const p = statusContainer.querySelector('p');
            if (p) p.textContent = message;
        }
        console.log(`[Compositor]: ${message}`);
    };

    try {
        // --- PASO 1: Analizar el prompt para saber qué entidades se necesitan ---
        updateStatus('Analizando el prompt de la escena...');
        const entidadesNecesarias = await analizarPromptParaEntidades(prompt);
        if (!entidadesNecesarias || entidadesNecesarias.length === 0) {
            throw new Error("La IA no pudo identificar entidades en el prompt.");
        }
        updateStatus(`Se necesitan: ${entidadesNecesarias.join(', ')}`);
        await delay(1000); // Pequeña pausa

        // --- PASO 2: Recolectar entidades existentes y crear las que falten ---
        const entidadesDisponibles = await recolectarYCrearEntidades(entidadesNecesarias, updateStatus);

        // --- PASO 3: Generar textura para el suelo ---
        updateStatus('Generando textura del suelo...');
        const texturaSueloUrl = await generarTexturaSuelo(prompt);
        if (!texturaSueloUrl) {
            throw new Error("No se pudo generar la textura del suelo.");
        }
        await delay(1000);

        // --- PASO 4: Componer la escena 3D y renderizar ---
        updateStatus('Componiendo la escena 3D...');
        const imagenFinalUrl = await componerYRenderizarEscena3D(entidadesDisponibles, texturaSueloUrl, prompt);

        updateStatus('¡Escena compuesta completada!');
        return imagenFinalUrl;

    } catch (error) {
        console.error("Error fatal en generarEscenaCompuesta:", error);
        updateStatus(`Error: ${error.message}`);
        throw error;
    }
}

/**
 * Llama a la IA para que analice un prompt y devuelva una lista de entidades.
 * @param {string} prompt - El prompt a analizar.
 * @returns {Promise<string[]>} Una lista de nombres de entidades.
 */
async function analizarPromptParaEntidades(prompt) {
    const apiPrompt = `Analiza el siguiente prompt de una escena y extrae una lista de todas las entidades (personajes, objetos, elementos importantes) que deben aparecer.

Prompt: "${prompt}"

Devuelve únicamente un objeto JSON con la siguiente estructura:
{
  "entidades": ["nombre_entidad_1", "nombre_entidad_2", ...]
}`;

    // Reutilizamos la función de la API de generador.js
    if (typeof callApiAndParseJson !== 'function') {
        throw new Error("La función 'callApiAndParseJson' no está disponible.");
    }
    const respuesta = await callApiAndParseJson(apiPrompt);
    return respuesta.entidades || [];
}

/**
 * Busca las entidades en la galería, crea las que no existen y las guarda.
 * @param {string[]} listaEntidades - Nombres de las entidades a buscar/crear.
 * @param {function} updateStatus - Función para reportar el progreso.
 * @returns {Promise<Object[]>} Un array de objetos {nombre, imageUrl}.
 */
async function recolectarYCrearEntidades(listaEntidades, updateStatus) {
    const entidadesFinales = [];
    const galeriaItems = Array.from(document.querySelectorAll('#generaciones-grid .generacion-item'));
    const galeriaMap = new Map();
    galeriaItems.forEach(item => {
        const promptEl = item.querySelector('.generacion-prompt');
        const imgEl = item.querySelector('img');
        if (promptEl && imgEl) {
            galeriaMap.set(promptEl.textContent.trim().toLowerCase(), imgEl.src);
        }
    });

    for (let i = 0; i < listaEntidades.length; i++) {
        const nombreEntidad = listaEntidades[i];
        const nombreEntidadLower = nombreEntidad.toLowerCase();
        updateStatus(`Procesando entidad ${i + 1}/${listaEntidades.length}: ${nombreEntidad}`);

        if (galeriaMap.has(nombreEntidadLower)) {
            updateStatus(`-> Encontrada en la galería: ${nombreEntidad}`);
            entidadesFinales.push({
                nombre: nombreEntidad,
                imageUrl: galeriaMap.get(nombreEntidadLower)
            });
        } else {
            updateStatus(`-> No encontrada. Creando: ${nombreEntidad}...`);
            if (typeof generarImagenParaToma !== 'function') {
                throw new Error("La función 'generarImagenParaToma' no está disponible.");
            }
            const imageUrl = await generarImagenParaToma(`un solo objeto: ${nombreEntidad}, sobre fondo transparente`);
            
            if (imageUrl) {
                entidadesFinales.push({ nombre: nombreEntidad, imageUrl });
                guardarEnGaleria(imageUrl, nombreEntidad);
                updateStatus(`-> Creada y guardada: ${nombreEntidad}`);
            } else {
                 updateStatus(`-> Falló la creación de: ${nombreEntidad}`);
            }

            if (i < listaEntidades.length - 1) {
                updateStatus('Esperando 4 segundos antes de la siguiente petición...');
                await delay(4000);
            }
        }
    }
    return entidadesFinales;
}

/**
 * Genera una textura para el suelo basada en el prompt general.
 * @param {string} prompt - El prompt general de la escena.
 * @returns {Promise<string>} La URL de la imagen de la textura.
 */
async function generarTexturaSuelo(prompt) {
    const promptSuelo = `Basado en la descripción de escena "${prompt}", crea un prompt corto para generar una textura de suelo o terreno apropiada que sea perfectamente repetible (seamless tileable texture). Describe solo la textura. Ejemplo: 'suelo de adoquines mojados' o 'hierba verde y frondosa'.`;
    const descripcionSuelo = await callApiAndParseJson(promptSuelo);
    
    let promptFinalSuelo = "una textura de suelo sin costuras, seamless tileable texture";
    if(descripcionSuelo && descripcionSuelo.prompt_suelo){
        promptFinalSuelo = `${descripcionSuelo.prompt_suelo}, seamless tileable texture`;
    }

    return await generarImagenParaToma(promptFinalSuelo);
}

// ===============================================
// INICIO DE LA NUEVA FUNCIÓN DE CORRECCIÓN
// ===============================================
/**
 * Carga una imagen, la procesa en un canvas para hacerla "seamless" (sin costuras)
 * clonando los bordes, y devuelve una textura de Three.js lista para usar.
 * @param {string} imageUrl - La URL de la imagen a procesar.
 * @param {THREE.WebGLRenderer} renderer - El renderer para obtener capacidades.
 * @returns {Promise<THREE.CanvasTexture>} Una promesa que se resuelve con la textura corregida.
 */
async function makeTextureSeamless(imageUrl, renderer) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Necesario si la imagen viene de otro dominio
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // ===============================================
            // INICIO DE LA MODIFICACIÓN 2
            // ===============================================
            // Se añade el atributo 'willReadFrequently' para optimizar el rendimiento.
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            // ===============================================
            // FIN DE LA MODIFICACIÓN 2
            // ===============================================
            const width = img.width;
            const height = img.height;
            canvas.width = width;
            canvas.height = height;

            // 1. Dibuja la imagen original en el canvas.
            ctx.drawImage(img, 0, 0);

            // 2. Clona la columna de píxeles de la izquierda y la pega en el borde derecho.
            const leftEdge = ctx.getImageData(0, 0, 1, height);
            ctx.putImageData(leftEdge, width - 1, 0);

            // 3. Clona la fila de píxeles de arriba y la pega en el borde inferior.
            const topEdge = ctx.getImageData(0, 0, width, 1);
            ctx.putImageData(topEdge, 0, height - 1);
            
            // 4. Crea la textura de Three.js a partir del canvas modificado.
            const seamlessTexture = new THREE.CanvasTexture(canvas);
            seamlessTexture.wrapS = THREE.RepeatWrapping;
            seamlessTexture.wrapT = THREE.RepeatWrapping;
            seamlessTexture.repeat.set(10, 10);
            
            // Se aplican optimizaciones que siguen siendo buenas prácticas.
            seamlessTexture.minFilter = THREE.LinearFilter;
            if (renderer) {
               seamlessTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            }
            seamlessTexture.needsUpdate = true;

            resolve(seamlessTexture);
        };
        img.onerror = (err) => {
            console.error("Falló la carga de la imagen de textura para su procesamiento.", err);
            reject(err);
        };
        img.src = imageUrl;
    });
}
// ===============================================
// FIN DE LA NUEVA FUNCIÓN DE CORRECCIÓN
// ===============================================


/**
 * Usa Three.js para componer la escena y renderizarla a una imagen.
 * @param {Object[]} entidades - Array de entidades con {nombre, imageUrl}.
 * @param {string} texturaSueloUrl - URL de la textura del suelo.
 * @param {string} promptOriginal - El prompt original para guiar la posición de la cámara.
 * @returns {Promise<string>} La URL de la imagen final renderizada.
 */
async function componerYRenderizarEscena3D(entidades, texturaSueloUrl, promptOriginal) {
    // --- Configuración básica de Three.js ---
    const ancho = 512;
    const alto = 512;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    const camera = new THREE.PerspectiveCamera(75, ancho / alto, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(ancho, alto);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const loader = new THREE.TextureLoader();
    const allPromises = [];
    
    // ===============================================
    // INICIO DE LA MODIFICACIÓN 1
    // ===============================================
    // Se declara el array 'sprites' aquí para que esté disponible en el scope.
    const sprites = [];
    // ===============================================
    // FIN DE LA MODIFICACIÓN 1
    // ===============================================

    // --- Cargar y procesar textura del suelo para hacerla seamless ---
    const sueloPromise = makeTextureSeamless(texturaSueloUrl, renderer).then(seamlessTexture => {
        const groundMaterial = new THREE.MeshStandardMaterial({ map: seamlessTexture });
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);
    }).catch(error => {
        console.error("No se pudo procesar la textura del suelo:", error);
        // Se crea un suelo de color plano como alternativa si falla la textura.
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);
    });
    allPromises.push(sueloPromise);


    // --- Cargar las imágenes de las entidades como Sprites ---
    entidades.forEach(entidad => {
        const spritePromise = new Promise((resolve, reject) => {
            loader.load(entidad.imageUrl, (texture) => {
                const material = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(material);
                
                const aspectRatio = texture.image.width / texture.image.height;
                sprite.scale.set(5 * aspectRatio, 5, 1);
                
                // Ahora 'sprites.push' funciona porque el array ya existe.
                sprites.push(sprite);
                scene.add(sprite);
                resolve();
            }, undefined, reject);
        });
        allPromises.push(spritePromise);
    });

    // Esperar a que todo esté cargado
    await Promise.all(allPromises);

    // --- Posicionar los Sprites en la escena ---
    // Se elimina la redeclaración de 'sprites' y se usa el array ya poblado.
    const radio = 15;
    sprites.forEach((sprite, index) => {
        const angulo = (index / sprites.length) * Math.PI * 2;
        const x = Math.cos(angulo) * radio;
        const z = Math.sin(angulo) * radio;
        const y = sprite.scale.y / 2;
        sprite.position.set(x, y, z);
    });
    
    // --- Configurar la cámara para la captura ---
    configurarCamaraParaCaptura(camera, sprites);

    // --- Renderizar y devolver la imagen ---
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
}

/**
 * Calcula la posición y orientación óptima de la cámara para encuadrar los objetos.
 * @param {THREE.PerspectiveCamera} camera - La cámara de la escena.
 * @param {THREE.Sprite[]} objetos - Los objetos a encuadrar.
 */
function configurarCamaraParaCaptura(camera, objetos) {
    if (objetos.length === 0) {
        camera.position.set(0, 10, 20);
        camera.lookAt(0, 0, 0);
        return;
    }

    const boundingBox = new THREE.Box3();
    objetos.forEach(obj => {
        boundingBox.expandByObject(obj);
    });

    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    
    cameraZ *= 1.5; 

    camera.position.set(center.x, center.y + size.y / 2, center.z + cameraZ);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
}

/**
 * Guarda una imagen generada en la galería del DOM.
 * @param {string} imageUrl - La URL (DataURL) de la imagen generada.
 * @param {string} promptText - El prompt que se usó para generar la imagen.
 */
function guardarEnGaleria(imageUrl, promptText) {
    const generacionesContainer = document.getElementById('generaciones-container');
    const generacionesGrid = document.getElementById('generaciones-grid');

    if (!generacionesGrid || !generacionesContainer) {
        console.error('Error: No se encontró el contenedor #generaciones-grid o #generaciones-container.');
        return;
    }

    try {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'generacion-item';

        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;

        const infoContainer = document.createElement('div');
        infoContainer.className = 'generacion-info';

        const promptElement = document.createElement('p');
        promptElement.className = 'generacion-prompt';
        promptElement.contentEditable = true;
        promptElement.textContent = promptText || 'Entidad sin prompt';

        const deleteButton = document.createElement('button');
        deleteButton.className = 'generacion-delete-btn';
        deleteButton.innerHTML = '&times;';
        deleteButton.title = 'Eliminar esta imagen';
        deleteButton.onclick = () => {
            itemContainer.remove();
            if (generacionesGrid.childElementCount === 0) {
                generacionesContainer.style.display = 'none';
            }
        };

        infoContainer.appendChild(promptElement);
        infoContainer.appendChild(deleteButton);
        itemContainer.appendChild(imgElement);
        itemContainer.appendChild(infoContainer);
        
        generacionesGrid.prepend(itemContainer);

        if (generacionesContainer.style.display === 'none') {
            generacionesContainer.style.display = 'block';
        }
    } catch (error) {
        console.error("Error al guardar la imagen en la galería:", error);
    }
}
