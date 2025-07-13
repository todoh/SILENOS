/**
 * @file compositor-escenas-3d.js
 * @description Motor de renderizado 3D para componer tomas utilizando Three.js.
 * @version 1.0
 */

// Se asume que Three.js está cargado globalmente desde index.html
if (typeof THREE === 'undefined') {
    console.error("Three.js no está cargado. Asegúrate de incluirlo en tu index.html.");
    // Proporcionar un objeto THREE falso para evitar que el resto del código falle estrepitosamente.
    window.THREE = {
        Scene: function() {},
        PerspectiveCamera: function() {},
        WebGLRenderer: function() { return { setSize: function(){}, render: function(){}, domElement: { toDataURL: function(){ return ''; } }, dispose: function(){} }; },
        TextureLoader: function() { return { load: function(){} }; },
        AmbientLight: function() {},
        DirectionalLight: function() {},
        Color: function() {},
        PlaneGeometry: function() {},
        MeshLambertMaterial: function() {},
        MeshBasicMaterial: function() {},
        Mesh: function() { this.rotation = {x:0}; this.position = {y:0}; },
        RepeatWrapping: 2,
        DoubleSide: 2,
        Box3: function() { return { setFromObject: function(){ return { getSize: function(){ return {x:0, y:0, z:0}; }, getCenter: function(){ return {x:0, y:0, z:0}; } } } }; },
        Vector3: function() {}
    };
}


/**
 * Compone una escena 3D a partir de un plan y recursos, y devuelve una imagen.
 * @param {object} composicion - El plan de composición con detalles del entorno, cámara y elementos.
 * @param {Array<object>} todosLosRecursos - Array con los datos de los elementos (nombre, imagen).
 * @param {function} statusUpdater - Función para reportar el progreso.
 * @returns {Promise<string>} - La URL de datos (dataURL) de la imagen renderizada.
 */
async function componerEscena3D(composicion, todosLosRecursos, statusUpdater) {
    statusUpdater('Inicializando motor 3D...');

    const ANCHO = 1024;
    const ALTO = 576;

    // 1. Configuración básica de Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, ANCHO / ALTO, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(ANCHO, ALTO);
    renderer.setClearColor(0x000000, 0); // Fondo transparente por defecto

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "Anonymous";

    // Función de utilidad para cargar texturas de forma asíncrona
    const loadTextureAsync = (url) => {
        return new Promise((resolve, reject) => {
            if (!url || !url.startsWith('data:image')) {
                console.warn(`URL de textura inválida o faltante: ${url}. Usando placeholder.`);
                const canvas = document.createElement('canvas');
                canvas.width = 128;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'magenta';
                ctx.fillRect(0, 0, 128, 128);
                resolve(new THREE.CanvasTexture(canvas));
                return;
            }
            textureLoader.load(url, resolve, undefined, (err) => {
                console.error('Error al cargar textura:', err);
                reject(new Error(`No se pudo cargar la textura desde ${url.substring(0, 50)}...`));
            });
        });
    };

    // 2. Configurar Entorno (Cielo y Luces)
    statusUpdater('Creando entorno...');
    configurarEntorno(scene, composicion.entorno);

    // 3. Configurar Suelo
    const recursoSuelo = todosLosRecursos.find(r => r.nombre.toLowerCase() === (composicion.entorno.textura_suelo || '').toLowerCase());
    if (recursoSuelo && recursoSuelo.imagen) {
        statusUpdater('Texturizando suelo...');
        try {
            const groundTexture = await loadTextureAsync(recursoSuelo.imagen);
            groundTexture.wrapS = THREE.RepeatWrapping;
            groundTexture.wrapT = THREE.RepeatWrapping;
            groundTexture.repeat.set(20, 20);
            const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });
            const groundGeometry = new THREE.PlaneGeometry(200, 200);
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = 0;
            ground.name = "ground";
            scene.add(ground);
        } catch (error) {
            statusUpdater('Error al cargar textura de suelo. Usando color sólido.', true);
            const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x556B2F }));
            ground.rotation.x = -Math.PI / 2;
            ground.name = "ground";
            scene.add(ground);
        }
    } else {
        statusUpdater(`Textura de suelo '${composicion.entorno.textura_suelo}' no encontrada. Usando color.`, true);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x556B2F }));
        ground.rotation.x = -Math.PI / 2;
        ground.name = "ground";
        scene.add(ground);
    }

    // 4. Añadir Elementos 2D como Billboards
    statusUpdater('Colocando elementos en la escena...');
    const elementosOrdenados = (composicion.elementos || []).sort((a, b) => (b.posicion[1] || 50) - (a.posicion[1] || 50)); // Ordenar por profundidad (Z)

    for (const elemento of elementosOrdenados) {
        const recursoElemento = todosLosRecursos.find(r => r.nombre.toLowerCase() === (elemento.nombre || '').toLowerCase());
        if (recursoElemento && recursoElemento.imagen) {
            try {
                const texture = await loadTextureAsync(recursoElemento.imagen);
                const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });
                const aspectRatio = (texture.image && texture.image.width) ? texture.image.width / texture.image.height : 1;
                const altura = (elemento.escala || 1.0) * 4; // Altura base de 4 unidades en el mundo 3D
                const geometria = new THREE.PlaneGeometry(altura * aspectRatio, altura);
                const billboard = new THREE.Mesh(geometria, material);

                const x = ((elemento.posicion[0] || 50) / 100) * 50 - 25; // Rango de -25 a 25
                const y = (altura / 2); 
                const z = ((elemento.posicion[1] || 50) / 100) * 50 - 25;

                billboard.position.set(x, y, z);
                scene.add(billboard);
            } catch (error) {
                 statusUpdater(`Error al procesar elemento '${elemento.nombre}'.`, true);
                 console.error(error);
            }
        } else {
            statusUpdater(`Recurso para '${elemento.nombre}' no encontrado o sin imagen.`, true);
        }
    }

    // 5. Configurar Cámara
    statusUpdater('Posicionando cámara...');
    configurarCamara(camera, scene, composicion.plano_camara);

    // 6. Renderizar y devolver DataURL
    statusUpdater('Renderizando imagen final...');
    
    // Asegurarse de que los billboards miren a la cámara ANTES de renderizar
    scene.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry && child.name !== "ground") {
             if (child.material.map) { 
                child.quaternion.copy(camera.quaternion);
             }
        }
    });

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.9);
    
    // Limpieza para liberar memoria de la GPU
    renderer.dispose();
    scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
        }
    });
    
    return dataUrl;
}

/**
 * Establece el color de fondo y las luces de la escena.
 * @param {THREE.Scene} scene La escena a configurar.
 * @param {object} entorno Objeto con la configuración del entorno.
 */
function configurarEntorno(scene, entorno) {
    let colorCielo;
    switch (entorno.tipo_cielo) {
        case 'noche':
            colorCielo = new THREE.Color(0x0c0c2a);
            break;
        case 'atardecer':
            colorCielo = new THREE.Color(0xFF8C00);
            break;
        case 'dia':
        default:
            colorCielo = new THREE.Color(0x87CEEB);
            break;
    }
    scene.background = colorCielo;

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    if (entorno.tipo_cielo === 'noche') {
        ambientLight.intensity = 0.3;
        directionalLight.intensity = 0.4;
        directionalLight.color.set(0xaaaaff);
    } else if (entorno.tipo_cielo === 'atardecer') {
        ambientLight.intensity = 0.5;
        directionalLight.intensity = 1.2;
        directionalLight.color.set(0xffa500);
        directionalLight.position.set(-10, 7, 5);
    }
}

/**
 * Posiciona la cámara según el tipo de plano solicitado.
 * @param {THREE.PerspectiveCamera} camera La cámara a configurar.
 * @param {THREE.Scene} scene La escena, para calcular el encuadre.
 * @param {string} tipoPlano El tipo de plano ('plano_general', 'plano_medio', 'primer_plano').
 */
function configurarCamara(camera, scene, tipoPlano) {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Asegurarse de que el centro no esté bajo el suelo
    center.y = Math.max(center.y, size.y / 2, 1);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    if(maxDim === 0) { // Escena vacía
        camera.position.set(0, 5, 15);
        camera.lookAt(0, 2, 0);
        return;
    }

    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 1.5 / Math.tan(fov / 2));

    camera.position.y = center.y;
    camera.lookAt(center);

    switch (tipoPlano) {
        case 'primer_plano':
            camera.position.z = center.z + Math.max(cameraZ * 0.4, 5);
            camera.position.y = center.y + 1; // Un poco más alto para un primer plano
            break;
        case 'plano_medio':
            camera.position.z = center.z + Math.max(cameraZ * 0.8, 10);
            break;
        case 'plano_general':
        default:
            camera.position.z = center.z + Math.max(cameraZ * 1.5, 20);
            break;
    }
    
    if (camera.position.y < 1) {
        camera.position.y = 1;
    }
}
