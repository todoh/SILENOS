/* SILENOS 3/window/window-3d-viewer.js */

const Window3DViewer = {
    // Flag interno para evitar recargas
    dependenciesLoaded: false,

    async render(winId, fileId) {
        const winEl = document.getElementById(`window-${winId}`);
        const contentArea = winEl.querySelector('.content-area');
        
        // Loader visual
        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full bg-gray-900 text-blue-400">
                <i data-lucide="box" class="w-10 h-10 animate-bounce mb-4"></i>
                <div class="text-lg font-semibold">Cargando Modelo 3D...</div>
                <div class="text-sm text-gray-500 mt-2">Inicializando Three.js</div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();

        // Obtener archivo
        const file = FileSystem.getFile(fileId);
        if (!file) {
            contentArea.innerHTML = '<div class="text-red-500 p-8 text-center">Archivo no encontrado en el sistema.</div>';
            return;
        }

        // Cargar librerías
        try {
            await this.loadDependencies();
        } catch (e) {
            contentArea.innerHTML = `<div class="text-red-500 p-8">Error cargando Three.js: ${e.message}</div>`;
            return;
        }

        // Limpiar área y crear contenedor
        contentArea.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'w-full h-full relative overflow-hidden bg-gradient-to-b from-gray-800 to-gray-950';
        container.id = `viewer-3d-${winId}`;
        contentArea.appendChild(container);

        // Iniciar escena
        this.initScene(container, file, winId);
    },

    async loadDependencies() {
        if (this.dependenciesLoaded && window.THREE && window.THREE.GLTFLoader) return;

        // Carga secuencial para asegurar dependencias
        if (!window.THREE) {
            const three = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
            window.THREE = three;
        }

        if (!window.THREE.GLTFLoader) {
            const { GLTFLoader } = await import('https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
            window.THREE.GLTFLoader = GLTFLoader;
        }

        if (!window.THREE.OrbitControls) {
            const { OrbitControls } = await import('https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js');
            window.THREE.OrbitControls = OrbitControls;
        }
        
        this.dependenciesLoaded = true;
    },

    initScene(container, file, winId) {
        const w = container.clientWidth;
        const h = container.clientHeight;

        // SCENE
        const scene = new THREE.Scene();
        
        // GRID
        const grid = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
        scene.add(grid);

        // LIGHTS
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
        backLight.position.set(-5, 5, -5);
        scene.add(backLight);

        // CAMERA
        const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        camera.position.set(5, 3, 5);

        // RENDERER
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        // CONTROLS
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;

        // LOAD DATA
        this.loadModelData(file, scene, camera, container, controls);

        // ANIMATION LOOP
        const animate = () => {
            if (!document.getElementById(`window-${winId}`)) {
                renderer.dispose();
                return;
            }
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // RESIZE
        const ro = new ResizeObserver(() => {
            const newW = container.clientWidth;
            const newH = container.clientHeight;
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
        });
        ro.observe(container);
    },

    async loadModelData(file, scene, camera, container, controls) {
        let glbUrl = null;

        try {
            // LÓGICA MEJORADA: 
            // 1. Intentar resolver ruta interna del sistema (/files/...)
            // 2. Intentar buscar URL en estructura legacy
            
            let content = file.content;

            if (typeof content === 'string' && content.startsWith('/files/')) {
                // Caso: Archivo RAW guardado en el sistema
                // Usamos FileSystem para obtener una URL de Blob válida
                glbUrl = await FileSystem.getImageUrl(content);
            } else {
                // Caso: Legacy JSON wrapper o Data URI directa
                if (typeof content === 'string') {
                    try { content = JSON.parse(content); } catch(e) {}
                }

                if (content && content.url) glbUrl = content.url;
                else if (content && content.content && content.content.url) glbUrl = content.content.url;
                else if (typeof content === 'string' && content.startsWith('data:')) glbUrl = content;
                
                if (!glbUrl && file.url) glbUrl = file.url;
            }

            if (!glbUrl) {
                throw new Error("No se encontró URL válida ni contenido binario para el modelo.");
            }

        } catch (error) {
            console.error("Error extrayendo datos:", error);
            this.showError(container, "Estructura de archivo inválida: " + error.message);
            return;
        }

        // Cargar GLB desde la URL resuelta
        const loader = new THREE.GLTFLoader();
        
        // Panel de carga
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-xs';
        loadingDiv.innerText = 'Decodificando geometría...';
        container.appendChild(loadingDiv);

        loader.load(glbUrl, (gltf) => {
            const model = gltf.scene;
            
            // Auto-centrado y Escala
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            // Centrar
            model.position.sub(center); 

            // Escalar para que encaje en vista (aprox 4 unidades)
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 4 / maxDim;
            if (isFinite(scale)) model.scale.setScalar(scale);

            // Ajuste fino para que pise el suelo
            const box2 = new THREE.Box3().setFromObject(model); 
            model.position.y -= box2.min.y;

            scene.add(model);
            
            loadingDiv.remove();
            console.log("📦 Modelo cargado. Vertices:", renderer.info.render.triangles);
            
            // Detener rotación automática
            setTimeout(() => { controls.autoRotate = false; }, 2000);

        }, undefined, (err) => {
            console.error(err);
            loadingDiv.innerText = 'Error al renderizar GLB';
            loadingDiv.classList.add('text-red-400');
        });
    },

    showError(container, msg) {
        const err = document.createElement('div');
        err.className = 'absolute inset-0 flex items-center justify-center bg-black/90 z-50 p-6';
        err.innerHTML = `<div class="text-red-400 text-center border border-red-800 p-4 rounded bg-red-900/20">
            <h3 class="font-bold mb-2">Error de Carga</h3>
            <p class="text-sm text-gray-300">${msg}</p>
        </div>`;
        container.appendChild(err);
    }
};