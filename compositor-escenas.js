/**
 * @file compositor-escenas.js
 * @description Orquesta la creación de escenas 3D compuestas a partir de un prompt.
 * Analiza el prompt, genera las entidades necesarias (personajes, objetos),
 * las compone en una escena de Three.js y devuelve una imagen final.
 */

// Delay para no saturar la API
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
 * Busca las entidades en la galería y crea las que no existen.
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
            // Clave en minúsculas para una búsqueda más flexible
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
            // Usamos la función de generador.js para crear la imagen
            if (typeof generarImagenParaToma !== 'function') {
                throw new Error("La función 'generarImagenParaToma' no está disponible.");
            }
            const imageUrl = await generarImagenParaToma(`un solo objeto: ${nombreEntidad}, sobre fondo transparente`);
            entidadesFinales.push({ nombre: nombreEntidad, imageUrl });
            updateStatus(`-> Creada: ${nombreEntidad}`);

            // Pausa de 4 segundos para no exceder el límite de la API
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
    const promptSuelo = `Basado en la descripción de escena "${prompt}", crea un prompt corto para generar una textura de suelo o terreno apropiada. Describe solo la textura. Ejemplo: 'suelo de adoquines mojados' o 'hierba verde y frondosa'.`;
    const descripcionSuelo = await callApiAndParseJson(promptSuelo); // Suponiendo que devuelve un JSON con una clave "prompt_suelo"
    
    let promptFinalSuelo = "una textura de suelo sin costuras";
    if(descripcionSuelo && descripcionSuelo.prompt_suelo){
        promptFinalSuelo = descripcionSuelo.prompt_suelo;
    }

    return await generarImagenParaToma(promptFinalSuelo);
}


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
    scene.background = new THREE.Color(0xcccccc); // Fondo neutro
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

    // --- Cargar textura del suelo y crear el plano ---
    const sueloPromise = new Promise((resolve, reject) => {
        loader.load(texturaSueloUrl, (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(10, 10);
            const groundMaterial = new THREE.MeshStandardMaterial({ map: texture });
            const groundGeometry = new THREE.PlaneGeometry(100, 100);
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2; // Poner el plano horizontal
            scene.add(ground);
            resolve();
        }, undefined, reject);
    });
    allPromises.push(sueloPromise);

    // --- Cargar las imágenes de las entidades como Sprites ---
    const sprites = [];
    entidades.forEach(entidad => {
        const spritePromise = new Promise((resolve, reject) => {
            loader.load(entidad.imageUrl, (texture) => {
                const material = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(material);
                
                // Tamaño inicial (se ajustará después)
                const aspectRatio = texture.image.width / texture.image.height;
                sprite.scale.set(5 * aspectRatio, 5, 1);
                
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
    // Lógica simple de distribución en círculo para el ejemplo.
    // Esto podría mejorarse pidiendo a la IA una distribución.
    const radio = 15;
    sprites.forEach((sprite, index) => {
        const angulo = (index / sprites.length) * Math.PI * 2;
        const x = Math.cos(angulo) * radio;
        const z = Math.sin(angulo) * radio;
        const y = sprite.scale.y / 2; // Elevar el sprite para que su base toque el suelo
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
    
    // Añadimos un poco de distancia extra
    cameraZ *= 1.5; 

    camera.position.set(center.x, center.y + size.y / 2, center.z + cameraZ);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
}
