// =======================================================================
// === VISOR 3D LIGERO E INTERACTIVO PARA EL EDITOR DE DATOS ============
// =======================================================================

class Mini3DViewer {
    /**
     * Inicializa el visor 3D en un canvas específico.
     * @param {HTMLCanvasElement} canvas - El elemento canvas donde se renderizará la escena.
     * @param {object} modelData - El objeto JSON que describe el modelo 3D.
     */
    constructor(canvas, modelData) {
        this.canvas = canvas;
        this.modelData = modelData;
        this.animationFrameId = null;

        // 1. Configuración básica de la escena
        this.scene = new THREE.Scene();
        // this.scene.background = new THREE.Color(0xf0f0f0); // Un fondo claro para el editor

        // 2. Configuración de la cámara
        const rect = this.canvas.getBoundingClientRect();
        this.camera = new THREE.PerspectiveCamera(50, rect.width / rect.height, 0.1, 1000);
        this.camera.position.set(10, 10, 10);

        // 3. Configuración del renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // 4. Añadir luces
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 7.5);
        this.scene.add(dirLight);

        // 5. Añadir controles de órbita (para rotar el modelo)
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.screenSpacePanning = false;

        // 6. Cargar el modelo y empezar a animar
        this.modelGroup = new THREE.Group();
        this.scene.add(this.modelGroup);
        this.updateModel(this.modelData);

        this.animate();
    }

    /**
     * Crea un modelo 3D a partir de un objeto JSON.
     * @param {object} jsonData - Los datos del modelo.
     * @returns {THREE.Group} - Un grupo que contiene todas las partes del modelo.
     */
    createModelFromJSON(jsonData) {
        const group = new THREE.Group();
        if (!jsonData || !Array.isArray(jsonData.objects)) {
            console.error("Formato de JSON para modelo 3D no válido.", jsonData);
            return group;
        }

        jsonData.objects.forEach(obj => {
            let geometry;
            const geoParams = obj.geometry;

            switch (geoParams.type.toLowerCase()) {
                case 'box':
                    geometry = new THREE.BoxGeometry(geoParams.width || 1, geoParams.height || 1, geoParams.depth || 1);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(geoParams.radiusTop || 0.5, geoParams.radiusBottom || 0.5, geoParams.height || 1, geoParams.radialSegments || 16);
                    break;
                case 'sphere':
                     geometry = new THREE.SphereGeometry(geoParams.radius || 0.5, geoParams.widthSegments || 16, geoParams.heightSegments || 16);
                     break;
                default:
                    console.warn(`Geometría desconocida: ${geoParams.type}`);
                    return;
            }

            const matParams = obj.material || {};
            const material = new THREE.MeshStandardMaterial({
                color: matParams.color || 0xffffff,
                roughness: matParams.roughness || 0.5,
                metalness: matParams.metalness || 0.5
            });

            const mesh = new THREE.Mesh(geometry, material);

            if (obj.position) {
                mesh.position.set(obj.position.x || 0, obj.position.y || 0, obj.position.z || 0);
            }
            if (obj.rotation) {
                mesh.rotation.set(
                    THREE.MathUtils.degToRad(obj.rotation.x || 0),
                    THREE.MathUtils.degToRad(obj.rotation.y || 0),
                    THREE.MathUtils.degToRad(obj.rotation.z || 0)
                );
            }
            group.add(mesh);
        });

        return group;
    }
 
/**
 * Actualiza el modelo que se muestra en la escena y centra la cámara en él.
 * @param {object} newModelData - El nuevo objeto JSON del modelo.
 */
updateModel(newModelData) {
    // Limpiar el grupo de modelo anterior
    while (this.modelGroup.children.length > 0) {
        this.modelGroup.remove(this.modelGroup.children[0]);
    }

    // Crear y añadir el nuevo modelo
    const newModel = this.createModelFromJSON(newModelData);
    this.modelGroup.add(newModel);

    // --- INICIO DE LA MODIFICACIÓN: Lógica de centrado automático ---
    
    // 1. Calcular la caja que envuelve al nuevo modelo
    const box = new THREE.Box3().setFromObject(newModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // 2. Obtener la dimensión más grande para ajustar el zoom
    const maxDim = Math.max(size.x, size.y, size.z);
    const cameraDistance = maxDim * 0.8; // Ajusta este multiplicador si quieres el modelo más cerca o más lejos
    
    // 3. Apuntar los controles al centro del objeto
    this.controls.target.copy(center);
    
    // 4. Mover la cámara a una posición ideal para ver el objeto completo
    this.camera.position.copy(center);
    this.camera.position.x += cameraDistance;
    this.camera.position.y += cameraDistance * 0.8; // Un poco más alto para una vista agradable
    this.camera.position.z += cameraDistance;
    
    // 5. Asegurar que la cámara mire al centro y aplicar los cambios
    this.camera.lookAt(center);
    this.controls.update();

    // --- FIN DE LA MODIFICACIÓN ---
}

    /**
     * El bucle de animación que renderiza la escena.
     */
    animate = () => {
        this.animationFrameId = requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Limpia todos los recursos para evitar fugas de memoria.
     */
    cleanup() {
        cancelAnimationFrame(this.animationFrameId);
        this.renderer.dispose();
        this.controls.dispose();
        // También podrías querer limpiar geometrías y materiales si son complejos
        console.log("Mini 3D Viewer limpiado.");
    }
}