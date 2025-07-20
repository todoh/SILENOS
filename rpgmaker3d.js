class RPGMaker3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        // --- ESTADO ---
        this.isGameActive = false;
        this.player = null;
        this.playerTargetPosition = new THREE.Vector3();
        this.cameraOffset = new THREE.Vector3(10, 10, 10);

        // --- SETUP BÁSICO ---
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(0x1e1e1e);
        this.container.appendChild(this.renderer.domElement);

        // --- HELPERS Y CACHÉS ---
        this.textureLoader = new THREE.TextureLoader();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.textureCache = new Map();
        this.materialCache = new Map();

        // --- GRUPOS DE ESCENA ---
        this.editorObjects = new THREE.Group();
        this.gameObjects = new THREE.Group();
        this.scene.add(this.editorObjects, this.gameObjects);
        
        this.setupLights();
        this.setupEditorControls();
        
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.domElement.addEventListener('mousedown', this.onCanvasClick.bind(this));
        this.animate();
    }

    // --- SETUP ---
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 20, 5);
        this.scene.add(directionalLight);
    }

    setupEditorControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.editorControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.editorControls.enableDamping = true;
            this.editorControls.target.set(0, 0, 0);
        }
    }

    // --- LÓGICA DE JUEGO ---
    startGame(mapData, startPos, playerSkinSrc) {
        this.isGameActive = true;
        this.editorControls.enabled = false;
        this.editorObjects.visible = false;
        this.gameObjects.visible = true;

        this.buildGameScene(mapData, playerSkinSrc, startPos);

        this.camera.position.copy(this.player.position).add(this.cameraOffset);
        this.camera.lookAt(this.player.position);
    }

    stopGame(mapData, startPos) {
        this.isGameActive = false;
        this.player = null;
        this.editorControls.enabled = true;
        this.editorObjects.visible = true;
        this.gameObjects.visible = false;
        
        // Limpiar completamente el grupo de objetos del juego
        while(this.gameObjects.children.length) this.gameObjects.remove(this.gameObjects.children[0]);

        this.updateEditorScene(mapData, startPos); // Restaurar vista editor
        this.camera.position.set(15, 15, 15); // Reset camera
    }

    // --- CONSTRUCCIÓN DE ESCENAS ---
    buildGameScene(mapData, playerSkinSrc, startPos) {
        // CORRECCIÓN: Limpiar objetos del juego antes de construir
        while(this.gameObjects.children.length) this.gameObjects.remove(this.gameObjects.children[0]);

        const mapSize = mapData.length;
        const TILE_3D_SIZE = 1;

        // 1. Crear el suelo invisible para el raycasting y añadirlo a la escena del juego
        this.gameFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(mapSize * TILE_3D_SIZE, mapSize * TILE_3D_SIZE),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        this.gameFloor.rotation.x = -Math.PI / 2;
        this.gameObjects.add(this.gameFloor);

        // 2. Renderizar el mapa visible (suelo) y añadirlo a la escena del juego
        const mapGroup = this.renderMap(mapData, false);
        this.gameObjects.add(mapGroup);

        // 3. Crear el jugador y añadirlo a la escena del juego
        const playerMaterial = this.getMaterial(playerSkinSrc, true);
        this.player = new THREE.Sprite(playerMaterial);
        const startX = (startPos.x - mapSize / 2 + 0.5) * TILE_3D_SIZE;
        const startZ = (startPos.y - mapSize / 2 + 0.5) * TILE_3D_SIZE;
        this.player.position.set(startX, TILE_3D_SIZE / 2, startZ);
        this.player.scale.set(TILE_3D_SIZE, TILE_3D_SIZE, TILE_3D_SIZE);
        this.playerTargetPosition.copy(this.player.position);
        this.gameObjects.add(this.player);
    }
    
    updateEditorScene(mapData, startPos) {
        if (this.isGameActive) return;
        
        // Limpiar objetos del editor antes de construir
        while(this.editorObjects.children.length) this.editorObjects.remove(this.editorObjects.children[0]);

        // Renderizar el mapa visible (suelo y sprites) y añadirlo a la escena del editor
        const mapGroup = this.renderMap(mapData, true);
        this.editorObjects.add(mapGroup);
        
        // Banderita 3D (solo en modo editor)
        if (startPos) {
             const flagMaterial = this.getMaterial('flag_red');
             const flagGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
             const flag = new THREE.Mesh(flagGeometry, flagMaterial);
             const flagX = (startPos.x - mapData.length / 2 + 0.5);
             const flagZ = (startPos.y - mapData.length / 2 + 0.5);
             flag.position.set(flagX, 0.4, flagZ);
             this.editorObjects.add(flag);
        }
    }

    // CORRECCIÓN: Esta función ahora crea y devuelve un grupo, no modifica la escena directamente
    renderMap(mapData, isEditorMode) {
        const mapGroup = new THREE.Group();
        const mapSize = mapData.length;
        const TILE_3D_SIZE = 1;
        
        mapData.forEach((row, y) => {
            row.forEach((cell, x) => {
                const posX = (x - mapSize / 2 + 0.5) * TILE_3D_SIZE;
                const posZ = (y - mapSize / 2 + 0.5) * TILE_3D_SIZE;
                
                // Suelo
                const floorGeo = new THREE.PlaneGeometry(TILE_3D_SIZE + 0.01, TILE_3D_SIZE + 0.01);
                const floorMat = cell.texture ? this.getMaterial(cell.texture.src) : this.getMaterial('default');
                const floorTile = new THREE.Mesh(floorGeo, floorMat);
                floorTile.rotation.x = -Math.PI / 2;
                floorTile.position.set(posX, 0, posZ);
                mapGroup.add(floorTile);

                // Sprites (solo en modo editor)
                if (isEditorMode && cell.sprite) {
                    const sprite = new THREE.Sprite(this.getMaterial(cell.sprite.src, true));
                    sprite.position.set(posX, TILE_3D_SIZE / 2, posZ);
                    sprite.scale.set(TILE_3D_SIZE, TILE_3D_SIZE, TILE_3D_SIZE);
                    mapGroup.add(sprite);
                }
            });
        });
        return mapGroup;
    }

    // --- EVENTOS Y ANIMACIÓN ---
    onCanvasClick(event) {
        if (!this.isGameActive || !this.gameFloor) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // CORRECCIÓN: Intersectar con el gameFloor que ahora se preserva correctamente
        const intersects = this.raycaster.intersectObject(this.gameFloor);

        if (intersects.length > 0) {
            this.playerTargetPosition.copy(intersects[0].point);
            this.playerTargetPosition.y = this.player.position.y; // Mantener la altura del sprite
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.isGameActive && this.player) {
            // Mover jugador
            this.player.position.lerp(this.playerTargetPosition, 0.05);
            // Mover cámara
            const targetCameraPos = this.player.position.clone().add(this.cameraOffset);
            this.camera.position.lerp(targetCameraPos, 0.1);
            this.camera.lookAt(this.player.position);
        } else {
            if(this.editorControls) this.editorControls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    // --- HELPERS ---
    getMaterial(src, isSprite = false) {
        if (src === 'default') {
            if (!this.materialCache.has('default_floor')) {
                this.materialCache.set('default_floor', new THREE.MeshLambertMaterial({ color: 0x444444 }));
            }
            return this.materialCache.get('default_floor');
        }
        // Material para la banderita
        if (src === 'flag_red') {
            if (!this.materialCache.has('flag_red')) {
                this.materialCache.set('flag_red', new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            }
            return this.materialCache.get('flag_red');
        }

        const cacheKey = `${src}_${isSprite}`;
        if (!this.materialCache.has(cacheKey)) {
             const texture = this.textureLoader.load(src);
             texture.colorSpace = THREE.SRGBColorSpace;
             const material = isSprite 
                ? new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.5 })
                : new THREE.MeshLambertMaterial({ map: texture });
             this.materialCache.set(cacheKey, material);
        }
        return this.materialCache.get(cacheKey);
    }
}
