// model3d_viewer.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

export let scene, camera, renderer, controls;
export let currentModelGroup = null;
export let isViewerInitialized = false;

// Controlador seguro para reemplazar modelos en la escena actual
export function setCurrentModelGroup(group) {
    if (currentModelGroup) {
        scene.remove(currentModelGroup);
    }
    currentModelGroup = group;
    if (group) {
        scene.add(group);
        
        // --- EVOLUCIÓN DE LA CÁMARA: Auto-Encuadre y Pivot Dinámico ---
        // 1. Calculamos la caja delimitadora (Bounding Box) del nuevo modelo
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // 2. Obtenemos la dimensión mayor para saber cuánto alejarnos proporcionalmente
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Margen de respiración para que no quede pegado a los bordes
        
        // 3. Actualizamos la posición de la cámara relativa al centro real del objeto
        camera.position.set(center.x + cameraZ * 0.5, center.y + cameraZ * 0.5, center.x + cameraZ);
        
        // 4. Establecemos el pivote exacto de los controles en el centro de masa del modelo
        // Esto elimina por completo el "latigazo" al rotar
        controls.target.copy(center);
        
        // 5. Ajustamos las distancias dinámicamente para evitar bloqueos del zoom
        controls.minDistance = maxDim * 0.1;
        controls.maxDistance = maxDim * 10;
        
        // Actualizamos la cámara y los controles para aplicar los cambios de inmediato
        camera.updateProjectionMatrix();
        controls.update();
    }
}

// 1. Inicialización del Visor 3D (Función del Canvas)
export function initModel3DViewer() {
    if (isViewerInitialized) return;
    
    const container = document.getElementById('model3d-viewer');
    if (!container) return;

    scene = new THREE.Scene();
    
    // Ajuste de cámara inicial - Ampliamos el plano lejano (far plane) a 1000 para evitar recortes al hacer zoom out
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 3, 4); // Posición inicial más equilibrada

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    
    // --- FÍSICAS DE CÁMARA EVOLUCIONADAS (AJUSTE FINO) ---
    controls.enableDamping = true; // Fundamental para la suavidad del movimiento
    controls.dampingFactor = 0.05;  // Inercia suave y realista
    
    // Ajustes de fricción y velocidad para evitar movimientos erráticos
    controls.zoomSpeed = 0.6; // Reducido para mayor control en la rueda del ratón (antes estaba en 1)
    controls.rotateSpeed = 0.7; // Rotación natural
    controls.panSpeed = 0.5; // Desplazamiento lateral equilibrado
    
    controls.target.set(0, 0.5, 0); // Apuntar al centro inicial del canvas vacío

    const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(grid);

    window.addEventListener('resize', () => {
        if(!container.clientWidth) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    function animate() {
        requestAnimationFrame(animate);
        // El damping requiere que update se llame imperativamente en cada frame de la animación
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    
    isViewerInitialized = true;
}

// Genera textura fallback gris por si la red o API falla de forma irrecuperable
export function createFallbackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#888888';
    ctx.fillRect(0,0,64,64);
    ctx.fillStyle = '#666666';
    ctx.fillRect(0,0,32,32);
    ctx.fillRect(32,32,32,32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// 3. Funciones de Exportación (GLTF y OBJ)
window.exportGLB = function() {
    if (!currentModelGroup) return;
    const exporter = new GLTFExporter();
    
    exporter.parse(
        currentModelGroup,
        function (gltf) {
            const blob = new Blob([gltf], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `silenos_model_${Date.now()}.glb`;
            a.click();
            URL.revokeObjectURL(url);
        },
        function (error) {
            console.error('GLB Export Error:', error);
            alert('Falló la exportación GLB.');
        },
        { binary: true }
    );
};

window.exportOBJ = function() {
    if (!currentModelGroup) return;
    const exporter = new OBJExporter();
    const result = exporter.parse(currentModelGroup);
    
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silenos_model_${Date.now()}.obj`;
    a.click();
    URL.revokeObjectURL(url);
};