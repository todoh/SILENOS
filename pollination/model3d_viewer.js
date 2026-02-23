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
        // 1. Calculamos la caja delimitadora (Bounding Box)
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // 2. Obtenemos la dimensión mayor y evitamos el valor 0
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Margen de respiración
        
        // 3. Reubicamos la cámara relativa al modelo real
        camera.position.set(center.x + cameraZ * 0.5, center.y + (cameraZ * 0.3), center.x + cameraZ);
        
        // 4. Centramos el pivote exacto
        controls.target.copy(center);
        
        // 5. Ajustes límites
        controls.minDistance = maxDim * 0.1;
        controls.maxDistance = maxDim * 10;
        
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
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 3, 4);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    // --- CORRECCIÓN BUG ABSURDO 1 Y 2: CSS y Eventos del Navegador ---
    // Elimina el salto por micro-redimensiones de Flexbox y bloquea el scroll nativo.
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;  
    
    // --- CORRECCIÓN BUG ABSURDO 3: Trackpads hiper-sensibles ---
    // Aplicamos tu propio comentario: drásticamente de 1.0 a 0.1
    controls.zoomSpeed = 0.1;     
    controls.rotateSpeed = 0.6;     
    controls.panSpeed = 0.4;        
    
    // --- CORRECCIÓN BUG ABSURDO 4: Inversión de cámara ---
    // Bloqueamos que la cámara pase por debajo del suelo y provoque un latigazo "Gimbal Lock"
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    controls.target.set(0, 0.5, 0); 

    const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(grid);

    window.addEventListener('resize', () => {
        // Evitar divisiones por 0 que rompan la matriz si el contenedor se oculta
        if(!container.clientWidth || container.clientWidth === 0) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    function animate() {
        requestAnimationFrame(animate);
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