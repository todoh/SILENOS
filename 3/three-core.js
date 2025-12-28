/* SILENOS 3/three-core.js */
// --- H -> COHERENCIA: NÚCLEO ATMOSFÉRICO DINÁMICO ---

const ThreeCore = {
    scene: null,
    camera: null,
    renderer: null, // CSS3D
    webglRenderer: null, // WebGL
    container: null,
    needsRender: true,
    isIdle: false,
    lastActivity: Date.now(),
    fogSystem: null, 
    particleUniforms: null, // Para animar la niebla con Shaders

    async init() {
        this.container = document.getElementById('desktop-area');
        if (!this.container) return;

        // 1. Escena y Cámara (O -> El Conjunto)
        this.scene = new THREE.Scene();
        
        // --- DISEÑO DE FONDO: Niebla de Profundidad ---
        // Usamos FogExp2 para un degradado natural, pero ajustamos la densidad
        // para que la esfera a -18000 se sienta como un "horizonte perdido".
        this.scene.background = new THREE.Color(0xffffff);
        this.scene.fog = new THREE.FogExp2(0xffffff, 0.000085); 

        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 1, 60000);
        this.camera.position.z = 2500; 

        // 2. Renderizador WebGL
        this.webglRenderer = new THREE.WebGLRenderer({ 
            antialias: window.devicePixelRatio < 2, 
            alpha: true,
            powerPreference: "high-performance" 
        });
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.webglRenderer.domElement.style.position = 'absolute';
        this.webglRenderer.domElement.style.top = '0';
        this.webglRenderer.domElement.style.zIndex = '1';
        this.webglRenderer.domElement.style.pointerEvents = 'none';
        this.container.appendChild(this.webglRenderer.domElement);

        // 3. Renderizador CSS3D
        this.renderer = new THREE.CSS3DRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.zIndex = '2';
        this.container.appendChild(this.renderer.domElement);

        // 4. Iluminación (U -> Unión de planos)
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        // --- CREACIÓN DE ELEMENTOS ---
        this.createDistantSphere();
        this.createVolumetricFog();
        
        if (typeof ThreeInput !== 'undefined') ThreeInput.init();
        if (typeof ThreeEntities !== 'undefined') ThreeEntities.init();

        window.addEventListener('resize', () => this.onResize());
        
        const wake = () => { this.lastActivity = Date.now(); this.needsRender = true; };
        window.addEventListener('mousemove', wake, {passive: true});
        window.addEventListener('mousedown', wake, {passive: true});
        window.addEventListener('wheel', wake, {passive: true});
        window.addEventListener('fs-data-changed', wake);

        this.animate();
        console.log("Z-H -> Atmósfera Refinada: Niebla Volumétrica Avanzada.");
    },

    createDistantSphere() {
        // La Esfera (I -> Identidad del Vacío)
        const geometry = new THREE.SphereGeometry(15000, 64, 64);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            side: THREE.BackSide // La vemos desde dentro o como fondo
        });
        const sphere = new THREE.Mesh(geometry, material);
        
        // Posicionada en el límite donde la niebla la oculta casi al 90%
        sphere.position.z = -25000;
        this.scene.add(sphere);
    },

    createVolumetricFog() {
        // (A -> Acción Individualizada)
        const count = 450; // Más partículas para mayor densidad
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const opacities = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Distribución expansiva
            positions[i * 3] = (Math.random() - 0.5) * 35000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30000 - 5000;
            
            sizes[i] = 2000 + Math.random() * 4000; // Tamaños variados
            opacities[i] = 0.1 + Math.random() * 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('customOpacity', new THREE.BufferAttribute(opacities, 1));

        // Textura procedimental mejorada con gradiente Gaussiano
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.54)');
        grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        const texture = new THREE.CanvasTexture(canvas);
        
        // ShaderMaterial para control total de la "A" (Acción) sin CPU lag
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uTexture: { value: texture },
                uFogColor: { value: new THREE.Color(0xffffff) },
                uFogDensity: { value: 0.000085 }
            },
            vertexShader: `
                attribute float size;
                attribute float customOpacity;
                varying float vOpacity;
                uniform float uTime;
                void main() {
                    vOpacity = customOpacity * (0.8 + 0.2 * sin(uTime + position.x));
                    vec3 pos = position;
                    pos.y += sin(uTime * 0.2 + position.x * 0.01) * 100.0; // Movimiento orgánico
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (1000.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D uTexture;
                uniform vec3 uFogColor;
                varying float vOpacity;
                void main() {
                    vec4 tex = texture2D(uTexture, gl_PointCoord);
                    gl_FragColor = vec4(uFogColor, tex.a * vOpacity);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });

        this.fogSystem = new THREE.Points(geometry, material);
        this.particleUniforms = material.uniforms;
        this.scene.add(this.fogSystem);
    },

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.needsRender = true;
    },

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;

        // Movimiento de la niebla (A -> Acción)
        if (this.fogSystem) {
            this.particleUniforms.uTime.value = time;
            this.fogSystem.rotation.y += 0.0001; // Rotación planetaria muy lenta
            this.needsRender = true;
        }

        if (Date.now() - this.lastActivity > 3000 && !this.needsRender) return;

        // Suavizado de cámara (E -> Equilibrio)
        let cameraMoving = false;
        if (typeof ThreeInput !== 'undefined') {
            const camDx = ThreeInput.targetX - this.camera.position.x;
            const camDy = ThreeInput.targetY - this.camera.position.y;
            const camDz = ThreeInput.targetZ - this.camera.position.z;

            if (Math.abs(camDx) > 0.05 || Math.abs(camDy) > 0.05 || Math.abs(camDz) > 0.05) {
                this.camera.position.x += camDx * 0.08;
                this.camera.position.y += camDy * 0.08;
                this.camera.position.z += camDz * 0.08;
                cameraMoving = true;
            }
        }

        const entitiesMoving = (typeof ThreeEntities !== 'undefined') ? ThreeEntities.renderFiles() : false;

        if (cameraMoving || entitiesMoving || this.needsRender) {
            this.webglRenderer.render(this.scene, this.camera);
            this.renderer.render(this.scene, this.camera);
            this.needsRender = false; 
        }
    }
};

setTimeout(() => ThreeCore.init(), 100);