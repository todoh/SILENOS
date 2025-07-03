/**
 * @file compositor-escenas.js
 * @description Orquesta la creación de escenas 3D compuestas a partir de un prompt.
 * Analiza el prompt para la disposición de objetos y la cinematografía, genera las entidades
 * necesarias, las compone en una escena de Three.js y devuelve una imagen final.
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
        // --- PASO 1: Análisis de IA para Layout y Cámara ---
        updateStatus('Analizando prompt para composición...');
        const analisisCompleto = await analizarPromptParaComposicion(prompt);
        const { entorno, entidades: entidadesNecesarias, layout, camara } = analisisCompleto;

        if (!entidadesNecesarias && entidadesNecesarias.length === 0) {
            throw new Error("La IA no pudo identificar entidades en el prompt.");
        }
        updateStatus(`Entorno: ${entorno.tipo} (${entorno.iluminacion}). Entidades: ${entidadesNecesarias.join(', ')}.`);
        await delay(500);

        // --- PASO 2: Generar Recursos Visuales (Texturas y Skybox) ---
        const recursosEntorno = await generarRecursosDeEntorno(entorno, updateStatus);
        
        // --- PASO 3: Recolectar o Crear Entidades ---
        const entidadesDisponibles = await recolectarYCrearEntidades(entidadesNecesarias, updateStatus);

        // --- PASO 4: Componer la Escena 3D y Renderizar ---
        updateStatus('Componiendo la escena 3D...');
        const imagenFinalUrl = await componerYRenderizarEscena3D(entidadesDisponibles, recursosEntorno, layout, camara, entorno);

        updateStatus('¡Escena compuesta completada!');
        return imagenFinalUrl;

    } catch (error) {
        console.error("Error fatal en generarEscenaCompuesta:", error);
        updateStatus(`Error: ${error.message}`);
        throw error;
    }
}

/**
 * Llama a la IA para un análisis completo del prompt.
 * @param {string} prompt - El prompt a analizar.
 * @returns {Promise<Object>} Un objeto con la estructura de la escena.
 */
async function analizarPromptParaComposicion(prompt) {
    const apiPrompt = `
Eres un director de fotografía y escenógrafo de IA. Analiza el siguiente prompt y genera una composición de escena 3D.

Prompt: "${prompt}"

Tu tarea es devolver un único objeto JSON con la siguiente estructura:
1.  "entorno": Un objeto que describe el escenario:
    - "tipo": El tipo de escenario. Ej: "playa", "desierto", "bosque", "ciudad".
    - "iluminacion": Determina si la escena es de "dia" o de "noche".
    - "descripcion_textura_principal": Prompt para la textura principal (ej: "arena de playa clara y fina").
    - "descripcion_textura_secundaria": Prompt para una segunda textura si aplica (ej: "agua de mar azul y tranquila"). Pon null si no aplica.
    - "descripcion_skybox": Prompt para un fondo panorámico de 360 grados (ej: "cielo nocturno estrellado con una luna llena brillante sobre el océano").
2.  "entidades": Una lista de nombres de todos los objetos o personajes discretos. NO incluyas el entorno.
3.  "layout": Un array de objetos, uno por cada entidad, con "nombre", "posicion" [x, z] y "escala".
4.  "camara": Un objeto con "tipo" de plano y "foco".

Ejemplo para "Un oso panda en la playa y al lado un coche rojo en la orilla de noche con estrellas y la luna":
{
  "entorno": {
    "tipo": "playa",
    "iluminacion": "noche",
    "descripcion_textura_principal": "arena de playa húmeda iluminada por la luna",
    "descripcion_textura_secundaria": "agua de mar oscura con reflejos de la luna",
    "descripcion_skybox": "cielo nocturno despejado y lleno de estrellas con una gran luna llena"
  },
  "entidades": ["oso panda", "coche rojo"],
  "layout": [
    { "nombre": "oso panda", "posicion": [-8, 2], "escala": 1.0 },
    { "nombre": "coche rojo", "posicion": [8, 1], "escala": 1.2 }
  ],
  "camara": {
    "tipo": "plano_medio",
    "foco": "centro_escena"
  }
}
`;
    if (typeof callApiAndParseJson !== 'function') {
        throw new Error("La función 'callApiAndParseJson' no está disponible.");
    }
    return await callApiAndParseJson(apiPrompt);
}

/**
 * Genera todas las texturas necesarias para el entorno (suelo, cielo, etc.).
 * @param {object} entorno - El objeto de entorno devuelto por la IA.
 * @param {function} updateStatus - Función para reportar el progreso.
 * @returns {Promise<Object>} Un objeto con las URLs de las imágenes generadas.
 */
async function generarRecursosDeEntorno(entorno, updateStatus) {
    const recursos = {};
    const promesas = [];

    // Generar textura principal
    updateStatus('Generando textura principal del entorno...');
    const promptPrincipal = `${entorno.descripcion_textura_principal}, photorealistic, seamless, tileable texture, top-down view`;
    promesas.push(generarImagenParaToma(promptPrincipal).then(url => {
        if (url) {
            recursos.texturaPrincipalUrl = url;
            guardarEnGaleria(url, `Textura Principal: ${entorno.descripcion_textura_principal}`);
        }
    }));

    // Generar textura secundaria si existe
    if (entorno.descripcion_textura_secundaria) {
        updateStatus('Generando textura secundaria del entorno...');
        const promptSecundaria = `${entorno.descripcion_textura_secundaria}, photorealistic, seamless, tileable texture, top-down view`;
        promesas.push(generarImagenParaToma(promptSecundaria).then(url => {
            if (url) {
                recursos.texturaSecundariaUrl = url;
                guardarEnGaleria(url, `Textura Secundaria: ${entorno.descripcion_textura_secundaria}`);
            }
        }));
    }

    // Generar skybox
    updateStatus('Generando fondo panorámico (skybox)...');
    const promptSkybox = `${entorno.descripcion_skybox}, 360 degree equirectangular panorama, photorealistic`;
    promesas.push(generarImagenParaToma(promptSkybox).then(url => {
        if (url) {
            recursos.skyboxUrl = url;
            guardarEnGaleria(url, `Skybox: ${entorno.descripcion_skybox}`);
        }
    }));
    
    await Promise.all(promesas);
    return recursos;
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

        const keyEntidad = galeriaMap.has(nombreEntidadLower) ? nombreEntidadLower :
                           galeriaMap.has(nombreEntidad) ? nombreEntidad : null;

        if (keyEntidad) {
            updateStatus(`-> Encontrada en la galería: ${nombreEntidad}`);
            entidadesFinales.push({
                nombre: nombreEntidad,
                imageUrl: galeriaMap.get(keyEntidad)
            });
        } else {
            updateStatus(`-> No encontrada. Creando: ${nombreEntidad}...`);
            if (typeof generarImagenParaToma !== 'function') {
                throw new Error("La función 'generarImagenParaToma' no está disponible.");
            }
            const imageUrl = await generarImagenParaToma(`un solo objeto: ${nombreEntidad}, sobre fondo blanco, sin sombras, estilo de sprite de videojuego, 4k`);
            
            if (imageUrl) {
                entidadesFinales.push({ nombre: nombreEntidad, imageUrl });
                guardarEnGaleria(imageUrl, nombreEntidad);
                updateStatus(`-> Creada y guardada: ${nombreEntidad}`);
            } else {
                 updateStatus(`-> Falló la creación de: ${nombreEntidad}`);
            }

            if (i < listaEntidades.length - 1) {
                updateStatus('Esperando antes de la siguiente petición...');
                await delay(4000);
            }
        }
    }
    return entidadesFinales;
}

/**
 * Carga una imagen y la convierte en una textura de Three.js que se puede repetir sin costuras visibles.
 * @param {string} imageUrl - La URL de la imagen a procesar.
 * @param {THREE.WebGLRenderer} renderer - El renderer para obtener capacidades de anistropía.
 * @returns {Promise<THREE.Texture>} Una promesa que se resuelve con la textura corregida.
 */
function createSeamlessTexture(imageUrl, renderer) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(imageUrl, (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(30, 30); 

            if (renderer) {
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            }
            
            const inset = 0.001;
            texture.matrix.setUvTransform(inset, inset, 1 - 2 * inset, 1 - 2 * inset, 0, 0.5, 0.5);
            texture.matrixAutoUpdate = false;

            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            texture.needsUpdate = true;

            resolve(texture);
        }, undefined, (err) => {
            console.error("Falló la carga de la textura del suelo.", err);
            reject(err);
        });
    });
}

/**
 * Usa Three.js para componer la escena y renderizarla a una imagen.
 * @param {Object[]} entidades - Array de entidades con {nombre, imageUrl}.
 * @param {Object} recursosEntorno - URLs de las texturas y skybox.
 * @param {Object[]} layout - Las instrucciones de posicionamiento y escala.
 * @param {Object} camaraSetup - Las instrucciones para la cámara.
 * @param {Object} entorno - La descripción del entorno general.
 * @returns {Promise<string>} La URL de la imagen final renderizada.
 */
async function componerYRenderizarEscena3D(entidades, recursosEntorno, layout, camaraSetup, entorno) {
    const ancho = 1280;
    const alto = 720; 
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, ancho / alto, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(ancho, alto);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // --- Sistema de Iluminación Dinámico ---
    if (entorno.iluminacion === 'noche') {
        // Iluminación nocturna
        scene.add(new THREE.AmbientLight(0x404040, 0.6)); // Luz ambiental muy tenue
        const moonLight = new THREE.DirectionalLight(0x8899aa, 0.8); // Luz azulada de la luna
        moonLight.position.set(30, 50, 20);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        scene.add(moonLight);
    } else {
        // Iluminación diurna (la que ya teníamos)
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(20, 30, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);
    }

    const loader = new THREE.TextureLoader();
    const allPromises = [];
    const sceneObjects = [];

    // Configurar Skybox
    if (recursosEntorno.skyboxUrl) {
        const skyboxPromise = new Promise(resolve => {
            loader.load(recursosEntorno.skyboxUrl, (texture) => {
                const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
                rt.fromEquirectangularTexture(renderer, texture);
                scene.background = rt.texture;
                resolve();
            });
        });
        allPromises.push(skyboxPromise);
    } else {
        scene.background = new THREE.Color(0xcccccc);
        scene.fog = new THREE.Fog(0xcccccc, 50, 150);
    }

    // Configurar Suelo
    if (entorno.tipo === 'playa' && recursosEntorno.texturaPrincipalUrl && recursosEntorno.texturaSecundariaUrl) {
        // Escenario compuesto: Playa (arena + mar)
        const arenaPromise = createSeamlessTexture(recursosEntorno.texturaPrincipalUrl, renderer).then(tex => {
            const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.1 });
            const geo = new THREE.PlaneGeometry(300, 150);
            const arena = new THREE.Mesh(geo, mat);
            arena.rotation.x = -Math.PI / 2;
            arena.position.z = -75;
            arena.receiveShadow = true;
            scene.add(arena);
        });
        const marPromise = createSeamlessTexture(recursosEntorno.texturaSecundariaUrl, renderer).then(tex => {
            const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });
            const geo = new THREE.PlaneGeometry(300, 150);
            const mar = new THREE.Mesh(geo, mat);
            mar.rotation.x = -Math.PI / 2;
            mar.position.z = 75;
            mar.receiveShadow = true;
            scene.add(mar);
        });
        allPromises.push(arenaPromise, marPromise);
    } else if (recursosEntorno.texturaPrincipalUrl) {
        // Escenario simple
        const sueloPromise = createSeamlessTexture(recursosEntorno.texturaPrincipalUrl, renderer).then(tex => {
            const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.1 });
            const geo = new THREE.PlaneGeometry(300, 300);
            const suelo = new THREE.Mesh(geo, mat);
            suelo.rotation.x = -Math.PI / 2;
            suelo.receiveShadow = true;
            scene.add(suelo);
        });
        allPromises.push(sueloPromise);
    }

    // Cargar entidades
    entidades.forEach(entidad => {
        const spritePromise = new Promise((resolve, reject) => {
            loader.load(entidad.imageUrl, (texture) => {
                const isEnvironmental = /rocas?|piedras?|árbol(es)?|arbustos?|plantas?/i.test(entidad.nombre);
                let object3d;
                if (isEnvironmental) {
                    const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
                    const aspectRatio = texture.image.width / texture.image.height;
                    const geometry = new THREE.PlaneGeometry(1, 1 / aspectRatio);
                    object3d = new THREE.Mesh(geometry, material);
                    object3d.castShadow = true;
                } else {
                    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.5 });
                    object3d = new THREE.Sprite(material);
                }
                object3d.name = entidad.nombre; 
                sceneObjects.push(object3d);
                scene.add(object3d);
                resolve();
            }, undefined, reject);
        });
        allPromises.push(spritePromise);
    });

    await Promise.all(allPromises);

    // Posicionar entidades
    sceneObjects.forEach(object => {
        const layoutInfo = layout.find(l => l.nombre === object.name);
        if (layoutInfo) {
            const [x, z] = layoutInfo.posicion;
            const escala = layoutInfo.escala || 1.0;
            const alturaBase = 8;
            if (object.type === 'Sprite') {
                const aspectRatio = object.material.map.image.width / object.material.map.image.height;
                object.scale.set(alturaBase * aspectRatio * escala, alturaBase * escala, 1);
                object.position.set(x, object.scale.y / 2, z);
            } else {
                object.scale.set(alturaBase * escala, alturaBase * escala, 1);
                object.position.set(x, object.scale.y / 2, z);
                object.quaternion.copy(camera.quaternion);
            }
        }
    });
    
    configurarCamaraCreativa(camera, sceneObjects, camaraSetup, scene);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
}

/**
 * Configura la cámara con un enfoque cinematográfico mejorado.
 * @param {THREE.PerspectiveCamera} camera - La cámara de la escena.
 * @param {THREE.Object3D[]} sceneObjects - Todos los objetos de la escena.
 * @param {Object} camaraSetup - Las instrucciones de la IA {tipo, foco}.
 * @param {THREE.Scene} scene - La escena 3D para calcular el centro.
 */
function configurarCamaraCreativa(camera, sceneObjects, camaraSetup, scene) {
    const focoObjeto = sceneObjects.find(s => s.name === camaraSetup.foco);
    let cameraTarget;
    
    const boundingBox = new THREE.Box3();
    if (focoObjeto) {
        boundingBox.setFromObject(focoObjeto);
        cameraTarget = boundingBox.getCenter(new THREE.Vector3());
    } else {
        sceneObjects.forEach(sprite => boundingBox.expandByObject(sprite));
        cameraTarget = boundingBox.getCenter(new THREE.Vector3());
    }
     if (boundingBox.isEmpty()) {
        cameraTarget = new THREE.Vector3(0, 5, 0);
        camera.position.set(0, 5, 30);
        camera.lookAt(cameraTarget);
        return;
    }

    const size = boundingBox.getSize(new THREE.Vector3());
    const fovInRadians = camera.fov * (Math.PI / 180);
    let distancia;

    switch (camaraSetup.tipo) {
        case 'primer_plano':
            distancia = (size.y / 2) / Math.tan(fovInRadians / 2) * 1.5;
            camera.position.set(cameraTarget.x, cameraTarget.y, cameraTarget.z + Math.max(distancia, 10));
            break;
        case 'plano_americano':
        case 'plano_medio':
            distancia = (size.y) / Math.tan(fovInRadians / 2);
            camera.position.set(cameraTarget.x, cameraTarget.y, cameraTarget.z + Math.max(distancia, 15));
            break;
        case 'contrapicado':
            distancia = (size.y) / Math.tan(fovInRadians / 2);
            camera.position.set(cameraTarget.x, cameraTarget.y * 0.2, cameraTarget.z + distancia * 0.8);
            cameraTarget.y += size.y / 4;
            break;
        case 'cenital':
            camera.position.set(cameraTarget.x, cameraTarget.y + 50, cameraTarget.z);
            break;
        case 'plano_general':
        default:
            sceneObjects.forEach(sprite => boundingBox.expandByObject(sprite));
            const center = boundingBox.getCenter(new THREE.Vector3());
            const sceneSize = boundingBox.getSize(new THREE.Vector3());
            const horizontalFov = 2 * Math.atan(Math.tan(fovInRadians / 2) * camera.aspect);
            const distW = (sceneSize.x / 2) / Math.tan(horizontalFov / 2);
            const distH = (sceneSize.y / 2) / Math.tan(fovInRadians / 2);
            distancia = Math.max(distW, distH) * 1.4;
            camera.position.set(center.x, center.y + sceneSize.y * 0.2, center.z + distancia);
            cameraTarget = center;
            break;
    }
    
    camera.lookAt(cameraTarget);
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
