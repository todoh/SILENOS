// =============================================================
//               INICIALIZACIÓN DE LA ESCENA 3D
// =============================================================
let scene, camera, renderer, controls;
let ground, sky;
const objects = []; // Array para almacenar nuestros objetos 3D seleccionables

function init() {
    // 1. Contenedor
    const container = document.getElementById('canvas-container-3d');

    // 2. Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Color de cielo por defecto

    // 3. Cámara
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 15); // Posición inicial de la cámara
    camera.lookAt(0, 0, 0);

    // 4. Renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 5. Controles de Cámara (OrbitControls)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 6. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // 7. Suelo
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotar el plano para que sea horizontal
    scene.add(ground);
    
    // Iniciar el bucle de animación
    animate();
    
    // Listeners para redimensionar la ventana
    window.addEventListener('resize', onWindowResize);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Actualizar controles de cámara
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container-3d');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}


// =============================================================
//           CREACIÓN Y MANEJO DE OBJETOS (SPRITES)
// =============================================================
const textureLoader = new THREE.TextureLoader();

/**
 * Crea un plano vertical (sprite) con una textura de imagen y lo añade a la escena.
 * @param {string} imageUrl La URL de la imagen a usar como textura.
 */
function createSpriteFromImage(imageUrl) {
    const texture = textureLoader.load(imageUrl, (tex) => {
        // Una vez cargada la textura, creamos el plano con la proporción correcta
        const aspectRatio = tex.image.width / tex.image.height;
        const height = 5; // Altura base del sprite
        const width = height * aspectRatio;

        const geometry = new THREE.PlaneGeometry(width, height);
        // Usamos MeshBasicMaterial para que no le afecten las luces y se vea como un sprite 2D
        const material = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true, // Habilitar transparencia para PNGs
            side: THREE.DoubleSide
        });

        const sprite = new THREE.Mesh(geometry, material);
        
        // Posicionar el sprite en el origen, de pie sobre el suelo
        sprite.position.set(0, height / 2, 0);
        
        scene.add(sprite);
        objects.push(sprite); // Añadir a la lista de objetos manejables
    });
}

// Conectar los botones del HTML
document.getElementById('import-img-btn-3d').addEventListener('click', () => {
    document.getElementById('import-input-3d').click();
});

document.getElementById('import-input-3d').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        createSpriteFromImage(url);
    }
});

// =============================================================
//                  SISTEMA DE ANIMACIÓN 3D
// =============================================================

// Suponiendo que 'animationData' tiene la misma estructura pero con valores de Three.js
// animationData = { "mesh_uuid_1": { keyframes: [...], current: {...} }, ... }

function updateStateAtTime(time) {
    for (const objectId in animationData) {
        const object = scene.getObjectByProperty('uuid', objectId);
        if (!object) continue;

        const keyframes = animationData[objectId].keyframes;
        if (!keyframes || keyframes.length === 0) continue;

        let kf1 = keyframes.filter(kf => kf.time <= time).pop();
        let kf2 = keyframes.find(kf => kf.time > time);

        if (!kf1) { // Antes del primer keyframe
            apply3DTransforms(object, keyframes[0].attrs);
            continue;
        }
        if (!kf2) { // Después del último keyframe
            apply3DTransforms(object, kf1.attrs);
            continue;
        }

        // Interpolar
        const t = (time - kf1.time) / (kf2.time - kf1.time);
        // Aquí podrías añadir tus funciones de easing modificando 't'

        const interpolated = {
            position: new THREE.Vector3().lerpVectors(kf1.attrs.position, kf2.attrs.position, t),
            scale:    new THREE.Vector3().lerpVectors(kf1.attrs.scale,    kf2.attrs.scale,    t),
            rotation: new THREE.Euler().setFromQuaternion(
                new THREE.Quaternion().slerpQuaternions(
                    new THREE.Quaternion().setFromEuler(kf1.attrs.rotation),
                    new THREE.Quaternion().setFromEuler(kf2.attrs.rotation),
                    t
                )
            )
        };
        
        apply3DTransforms(object, interpolated);
    }
}

/**
 * Aplica las transformaciones a un objeto de Three.js
 * @param {THREE.Object3D} object El objeto a transformar
 * @param {object} attrs Un objeto con propiedades position, rotation, scale
 */
function apply3DTransforms(object, attrs) {
    if (attrs.position) object.position.copy(attrs.position);
    if (attrs.rotation) object.rotation.copy(attrs.rotation);
    if (attrs.scale) object.scale.copy(attrs.scale);
}

// Debes integrar esta función en tu bucle de animación o al mover el slider
// Por ejemplo, en tu función `animate()`:
// function animate() {
//     requestAnimationFrame(animate);
//     const currentTime = parseInt(timelineSlider.value);
//     updateStateAtTime(currentTime);
//     controls.update();
//     renderer.render(scene, camera);
// }

// =============================================================
//                PERSONALIZACIÓN DEL ENTORNO
// =============================================================

function setGroundTexture(imageUrl) {
    textureLoader.load(imageUrl, (texture) => {
        // Permitir que la textura se repita
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20); // Repetir la textura 20x20 veces sobre el suelo

        ground.material.map = texture;
        ground.material.needsUpdate = true;
    });
}

function setSkyTexture(imageUrl) {
    // Usamos una esfera gigante que envuelve la escena
    const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
    // Invertimos la geometría para que las caras apunten hacia adentro
    skyGeometry.scale(-1, 1, 1);
    
    textureLoader.load(imageUrl, (texture) => {
        const skyMaterial = new THREE.MeshBasicMaterial({ map: texture });
        
        if (sky) scene.remove(sky); // Eliminar cielo anterior si existe
        sky = new THREE.Mesh(skyGeometry, skyMaterial);
        scene.add(sky);
    });
}

// Conectar los inputs de archivo del HTML
document.getElementById('ground-texture-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) setGroundTexture(URL.createObjectURL(file));
});

document.getElementById('sky-texture-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) setSkyTexture(URL.createObjectURL(file));
});




document.addEventListener('DOMContentLoaded', init);