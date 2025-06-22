import * as THREE from 'three';
import { appState, scene, groundSize, camera } from './editor-escenas-main.js'; // Importar camera también

// Variables para el ciclo día/noche y clima
let sunLight, moonLight, ambientLight;
let sun, moon; // Representaciones visuales del sol y la luna
let clock = new THREE.Clock(); // Para controlar el tiempo del día
let dayTime = 0.5; // 0 = medianoche, 0.5 = mediodía, 1 = próxima medianoche
const dayDuration = 60; // Duración de un ciclo completo día/noche en segundos
let particles, particleSystem; // Para lluvia/nieve
let volumetricCloudsGroup;
const MAX_VOLUMETRIC_CLOUDS = 50; // Número máximo de mallas de nubes
let CLOUD_AREA_SIZE; // Declarada aquí, pero inicializada dentro de setupDayNightCycle

// NUEVO: Variables para el skybox con degradado
let skyMesh;
const skyRadius = 900; // Radio de la esfera del cielo, debe ser mayor que el radio de la órbita de sol/luna y el far plane de la cámara.

/**
 * Crea una textura circular para el sol.
 * @returns {THREE.CanvasTexture} La textura del sol.
 */
function createSunTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Gradiente para un efecto de sol ardiente
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 0, 1)');   // Centro amarillo
    gradient.addColorStop(0.5, 'rgba(255, 165, 0, 1)'); // Naranja medio
    gradient.addColorStop(1, 'rgba(255, 69, 0, 0.8)'); // Exterior rojizo, ligeramente transparente

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
}

/**
 * Crea una textura circular para la luna.
 * @returns {THREE.CanvasTexture} La textura de la luna.
 */
function createMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Círculo gris simple para la luna
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#F0F8FF'; // Blanco azulado
    ctx.fill();

    // Añadir algunos cráteres/detalles sutiles (opcional)
    for (let i = 0; i < 10; i++) {
        const x = canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.6;
        const y = canvas.height / 2 + (Math.random() - 0.5) * canvas.height * 0.6;
        const radius = Math.random() * 5 + 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(192, 192, 192, 0.5)'; // Gris para cráteres
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

/**
 * Define y devuelve los colores del horizonte y el cenit para un momento dado del día.
 * Utiliza un gradiente más suave y realista.
 * @param {number} time El tiempo del día (0 a 1).
 * @returns {{horizon: THREE.Color, zenith: THREE.Color}} Los colores del horizonte y el cenit.
 */
function getHorizonAndZenithColors(time) {
    const horizonColor = new THREE.Color();
    const zenithColor = new THREE.Color();

    // Colores clave para el gradiente del cielo
    const nightHorizon = new THREE.Color(0x0a0a20);
    const nightZenith = new THREE.Color(0x000010); // Más oscuro arriba en la noche

    const dawnHorizon = new THREE.Color(0xff8c00); // Naranja oscuro
    const dawnZenith = new THREE.Color(0x4a3b6e); // Púrpura azulado

    const morningHorizon = new THREE.Color(0xffa500); // Naranja
    const morningZenith = new THREE.Color(0x87CEEB); // Azul cielo claro

    const dayHorizon = new THREE.Color(0x66B2FF); // Azul medio brillante
    const dayZenith = new THREE.Color(0x0066cc); // Azul profundo del cenit

    const eveningHorizon = new THREE.Color(0xff4500); // Naranja rojizo fuerte
    const eveningZenith = new THREE.Color(0x3a206a); // Púrpura oscuro

    // Definir paradas de tiempo para cada fase (0 a 1)
    // Medianoche (0) a Amanecer (0.25)
    if (time >= 0 && time < 0.2) { // Noche profunda
        const t = time / 0.2;
        horizonColor.copy(nightHorizon).lerp(dawnHorizon, t);
        zenithColor.copy(nightZenith).lerp(dawnZenith, t);
    } else if (time >= 0.2 && time < 0.28) { // Amanecer (transición rápida)
        const t = (time - 0.2) / 0.08;
        horizonColor.copy(dawnHorizon).lerp(morningHorizon, t);
        zenithColor.copy(dawnZenith).lerp(morningZenith, t);
    } else if (time >= 0.28 && time < 0.4) { // Mañana
        const t = (time - 0.28) / 0.12;
        horizonColor.copy(morningHorizon).lerp(dayHorizon, t);
        zenithColor.copy(morningZenith).lerp(dayZenith, t);
    } else if (time >= 0.4 && time < 0.6) { // Día
        horizonColor.copy(dayHorizon);
        zenithColor.copy(dayZenith);
    } else if (time >= 0.6 && time < 0.72) { // Atardecer (transición rápida)
        const t = (time - 0.6) / 0.12;
        horizonColor.copy(dayHorizon).lerp(eveningHorizon, t);
        zenithColor.copy(dayZenith).lerp(eveningZenith, t);
    } else { // Noche (0.72 a 1.0)
        const t = (time - 0.72) / 0.28;
        horizonColor.copy(eveningHorizon).lerp(nightHorizon, t);
        zenithColor.copy(eveningZenith).lerp(nightZenith, t);
    }

    return { horizon: horizonColor, zenith: zenithColor };
}

/**
 * Configura la malla del cielo con un degradado.
 */
function setupSkyGradient() {
    const skyGeometry = new THREE.SphereGeometry(skyRadius, 32, 15); // Esfera grande para el cielo
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            horizonColor: { value: new THREE.Color() },
            zenithColor: { value: new THREE.Color() },
            // Añadir el offset de la cámara para que el degradado siga al jugador
            cameraY: { value: 0.0 } 
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                // Calcular la posición del vértice en el espacio del mundo
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 horizonColor;
            uniform vec3 zenithColor;
            uniform float cameraY; // Altura de la cámara para el offset
            varying vec3 vWorldPosition;

            void main() {
                // Normalizar la posición Y para obtener un valor entre -1 y 1
                // Ajustar el offset para que el horizonte se alinee con la cámara
                float y = normalize(vWorldPosition - vec3(0.0, cameraY, 0.0)).y; 
                // Suavizar la transición y enfocar el degradado cerca del horizonte
                float t = pow(max(0.0, y + 0.1), 0.7); 
                gl_FragColor = vec4(mix(horizonColor, zenithColor, t), 1.0);
            }
        `,
        side: THREE.BackSide, // Renderizar la parte interior de la esfera
        depthWrite: false // Importante para que no bloquee otros objetos
    });
    skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skyMesh);
}


/**
 * Inicializa luces y objetos para el ciclo día/noche.
 */
export function setupDayNightCycle() {
    CLOUD_AREA_SIZE = groundSize * 2;

    // --- MEJORA ---: Se reduce la intensidad inicial de la luz del sol y se le da un color ligeramente cálido.
    sunLight = new THREE.DirectionalLight(0xfff5e1, 1.5); 
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2096; // Se reduce para mejor rendimiento, 4096 puede ser excesivo.
    sunLight.shadow.mapSize.height = 2096;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 1500;
    sunLight.shadow.camera.left = -100; // Se amplía el área de sombra para cubrir más escena.
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -120;
    sunLight.shadow.bias = -0.001; // Se ajusta el bias para un mejor balance.
    scene.add(sunLight);

    // --- MEJORA ---: Se reduce la intensidad de la luz de la luna y se ajusta su color.
    moonLight = new THREE.DirectionalLight(0xb0c4de, 0.4); // LightSteelBlue, más sutil.
    moonLight.castShadow = false; // La luna no proyecta sombras fuertes.
    scene.add(moonLight);

    // --- MEJORA ---: Se utiliza HemisphereLight con mayor intensidad para suavizar las sombras y dar una iluminación más global.
    const { zenith: initialSkyColor } = getHorizonAndZenithColors(dayTime);
    const groundColorInitial = new THREE.Color(0x604530); // Un color de tierra más oscuro y menos saturado.
    const hemisphereIntensityInitial = 1.0; // Se aumenta la intensidad base de la luz ambiental.
    ambientLight = new THREE.HemisphereLight(initialSkyColor, groundColorInitial, hemisphereIntensityInitial);
    scene.add(ambientLight);

    // Representación visual del sol
    const sunGeometry = new THREE.SphereGeometry(20, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        map: createSunTexture(),
        transparent: true
    });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Representación visual de la luna
    const moonGeometry = new THREE.SphereGeometry(10, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({
        map: createMoonTexture(),
        transparent: true
    });
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(moon);

    setupSkyGradient();
}

/**
 * Actualiza la posición del sol/luna y la iluminación según la hora del día.
 */
export function updateDayNightCycle() {
    dayTime %= 1; 

    const angle = dayTime * Math.PI * 2; 
    const radius = 800; 

    // Posición del sol y la luna
    sunLight.position.set(Math.sin(angle) * radius, -Math.cos(angle) * radius, 150); // Se añade un offset en Z para un ángulo de luz más interesante.
    sun.position.copy(sunLight.position);
    sun.lookAt(new THREE.Vector3(0, 0, 0));

    moonLight.position.set(-Math.sin(angle) * radius, Math.cos(angle) * radius, -150);
    moon.position.copy(moonLight.position);
    moon.lookAt(new THREE.Vector3(0, 0, 0));

    // --- MEJORA ---: Se ajustan las intensidades máximas para evitar la sobreexposición ("quemado").
    const sunIntensityFactor = Math.max(0, -Math.cos(angle)); // Factor de 0 a 1 para el día
    const moonIntensityFactor = Math.max(0, Math.cos(angle)); // Factor de 0 a 1 para la noche

    // --- MEJORA ---: Se reduce la intensidad máxima del sol.
    sunLight.intensity = sunIntensityFactor * 1.8; 
    // --- MEJORA ---: Se reduce la intensidad máxima de la luna.
    moonLight.intensity = moonIntensityFactor * 0.6;

    // --- MEJORA ---: La luz ambiental (HemisphereLight) es ahora mucho más influyente para suavizar la escena.
    // Tiene una intensidad base alta y varía suavemente con el ciclo.
    ambientLight.intensity = 0.7 + sunIntensityFactor * 0.5 + moonIntensityFactor * 0.2;
    
    // --- MEJORA ---: Los colores de la HemisphereLight se actualizan dinámicamente con los colores del cielo.
    const { horizon, zenith } = getHorizonAndZenithColors(dayTime);
    ambientLight.color.copy(zenith);
    // El color del suelo de la HemisphereLight también se actualiza, usando el color del horizonte.
    ambientLight.groundColor.copy(horizon).multiplyScalar(0.7); 

    appState.isDay = sunIntensityFactor > 0.1;

    // Actualizar los uniforms del shader del cielo
    if (skyMesh) {
        skyMesh.material.uniforms.horizonColor.value.copy(horizon);
        skyMesh.material.uniforms.zenithColor.value.copy(zenith);
        skyMesh.position.y = camera.position.y; // El cielo sigue a la cámara
        skyMesh.material.uniforms.cameraY.value = camera.position.y;
    }

    // La niebla toma su color del horizonte para una mejor integración visual.
    if (scene.fog) {
      scene.fog.color.copy(horizon);
      scene.fog.density = appState.fogDensity;
    }
}

/**
 * Establece la hora del día manualmente (para el slider).
 * @param {number} value - El valor de la hora del día (0 a 1).
 */
export function setDayTime(value) {
    dayTime = value;
    updateDayNightCycle(); // Forzar una actualización inmediata
}

/**
 * Actualiza la densidad de la niebla.
 * @param {number} density - La densidad de la niebla.
 */
export function setFogDensity(density) {
    appState.fogDensity = density;
    scene.fog.density = density;
}

/**
 * Alterna entre lluvia, nieve o ninguno.
 * @param {'none'|'rain'|'snow'} type - El tipo de precipitación.
 */
export function togglePrecipitation(type) {
    appState.precipitationType = type;
    if (particleSystem) {
        scene.remove(particleSystem);
        particleSystem.geometry.dispose();
        particleSystem.material.dispose();
    }

    if (type !== 'none') {
        const particleCount = 15000;
        const geometry = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * CLOUD_AREA_SIZE - CLOUD_AREA_SIZE / 2;
            const y = Math.random() * groundSize * 2;
            const z = Math.random() * CLOUD_AREA_SIZE - CLOUD_AREA_SIZE / 2;
            positions.push(x, y, z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        let material;
        if (type === 'rain') {
            material = new THREE.PointsMaterial({
                color: 0xaaaaaa,
                size: 0.5,
                transparent: true,
                opacity: 0.6
            });
        } else if (type === 'snow') {
            material = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 1.0,
                transparent: true,
                opacity: 0.8
            });
        }
        particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);
    }
}

/**
 * Función para actualizar las partículas (lluvia/nieve).
 */
export function animateParticles() {
    if (particleSystem && appState.precipitationType !== 'none') {
        const positions = particleSystem.geometry.attributes.position.array;
        const speed = appState.precipitationType === 'rain' ? 2 : 0.5;

        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= speed;
            if (positions[i] < 0) {
                positions[i] = groundSize * 2;
                positions[i - 1] = Math.random() * CLOUD_AREA_SIZE - CLOUD_AREA_SIZE / 2;
                positions[i + 1] = Math.random() * CLOUD_AREA_SIZE - CLOUD_AREA_SIZE / 2;
            }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
    }
}

/**
 * Función para controlar la densidad de nubes (simplificado, solo cambia el color del cielo y la niebla).
 * @param {number} density - La densidad de nubes (0-100).
 */
export function setCloudDensity(density) {
    appState.cloudDensity = density;

    // Ya no configuramos scene.background directamente aquí, lo hace el skyMesh
    // El color de la niebla sigue siendo afectado por las nubes
    let fogColor = new THREE.Color();
    const baseZenithColor = getHorizonAndZenithColors(dayTime).zenith;
    fogColor.copy(baseZenithColor).lerp(new THREE.Color(0x606060), density / 100);
    scene.fog.color.copy(fogColor);

    // Atenuar la luz direccional del sol/luna a medida que aumenta la densidad de nubes
    const lightIntensityFactor = 1 - (density / 100) * 0.7; // Reduce la luz hasta un 70%
    if (sunLight) sunLight.intensity = (appState.isDay ? 2.5 : 0) * lightIntensityFactor;
    if (moonLight) moonLight.intensity = (appState.isDay ? 0 : 1.2) * lightIntensityFactor;

    // Ajustar la intensidad de la luz ambiental
    ambientLight.intensity = (0.2 + (appState.isDay ? sunLight.intensity * 0.5 : 0) + (appState.isDay ? 0 : moonLight.intensity * 0.3)) * lightIntensityFactor;
    // Si el skyMesh existe, también podemos atenuar su opacidad si el shader lo permite, o simplemente dejar que la niebla lo haga.
}

/**
 * Nueva función para añadir nubes volumétricas (visualización simple).
 * @param {number} amount - La cantidad de nubes volumétricas (0-100).
 */
export function setVolumetricClouds(amount) {
    appState.volumetricCloudAmount = amount;
    if (!volumetricCloudsGroup) {
        volumetricCloudsGroup = new THREE.Group();
        scene.add(volumetricCloudsGroup);
    }

    while (volumetricCloudsGroup.children.length > 0) {
        const child = volumetricCloudsGroup.children[0];
        volumetricCloudsGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    }

    const numClouds = Math.floor((amount / 100) * MAX_VOLUMETRIC_CLOUDS);
    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    for (let i = 0; i < numClouds; i++) {
        const cloudGeometry = new THREE.SphereGeometry(Math.random() * 5 + 5, 8, 8);
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);

        cloud.position.set(
            (Math.random() * CLOUD_AREA_SIZE) - (CLOUD_AREA_SIZE / 2),
            Math.random() * 20 + 70,
            (Math.random() * CLOUD_AREA_SIZE) - (CLOUD_AREA_SIZE / 2)
        );

        cloud.scale.set(Math.random() * 1.5 + 0.8, Math.random() * 1.5 + 0.8, Math.random() * 1.5 + 0.8);
        cloud.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        cloud.castShadow = false;
        cloud.receiveShadow = false;

        volumetricCloudsGroup.add(cloud);
    }
}
