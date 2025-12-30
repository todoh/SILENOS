/* SILENOS 3/three-input.js */
// --- B -> VISIÓN: SISTEMA DE ENTRADA Y NAVEGACIÓN ESPACIAL (H) ---

const ThreeInput = {
    targetZ: 800,
    targetX: 0,
    targetY: 0,
    isPanning: false,
    lastMouseX: 0,
    lastMouseY: 0,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),

    init() {
        window.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });
        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
    },

    handleZoom(e) {
        const isUi = e.target.closest('.window') || 
                     e.target.closest('.prog-editor-container') || 
                     e.target.closest('.dock-item') ||
                     e.target.closest('#launcher-menu') ||
                     e.target.closest('#context-menu');

        if (isUi) return;

        e.preventDefault();
        this.targetZ = Math.max(300, Math.min(this.targetZ + e.deltaY * 2, 1800));
        ThreeCore.needsRender = true;
    },

    handleMouseDown(e) {
        // [COHERENCIA H] Si SelectionManager está detectando el combo Derecho+Izquierdo, abortamos paneo
        if (e.buttons === 3) return;

        const isWindow = e.target.closest('.window');
        const isDock = e.target.closest('.dock-item') || e.target.closest('#launcher-btn');
        const isMenu = e.target.closest('#context-menu') || e.target.closest('#launcher-menu');
        const isUiObject = e.target.closest('.pointer-events-auto');
        const isDesktopIcon = e.target.closest('.desktop-icon-3d') || e.target.dataset.id;

        if (isWindow || isDock || isMenu || (isUiObject && !isDesktopIcon)) return;

        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, ThreeCore.camera);

        const intersects = this.raycaster.intersectObjects(ThreeCore.scene.children, true);
        const meshTarget = intersects.find(i => i.object instanceof THREE.Mesh && i.object.userData.id);

        if (meshTarget) {
            const id = meshTarget.object.userData.id;
            if (e.detail === 2) { 
                if (typeof openDataWindow === 'function') openDataWindow(id);
            } else {
                if (typeof startIconDrag === 'function') startIconDrag(e, id, 'desktop');
            }
            return;
        }

        // Solo paneo si NO es el botón derecho (que se usa para menú o combo de selección)
        if (e.button !== 2) {
            this.isPanning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            document.body.style.cursor = 'grabbing';
        }
    },

    handleMouseMove(e) {
        // [REFINE] Si se activa el combo de selección a mitad de camino, cancelar paneo
        if (e.buttons === 3 || (window.SelectionManager && SelectionManager.isSelecting)) {
            this.isPanning = false;
            return;
        }

        if (this.isPanning) {
            const sensitivity = (ThreeCore.camera.position.z + 1000) / 2500;
            this.targetX -= (e.clientX - this.lastMouseX) * sensitivity;
            this.targetY += (e.clientY - this.lastMouseY) * sensitivity;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            ThreeCore.needsRender = true;
        }
    },

    handleMouseUp() {
        this.isPanning = false;
        document.body.style.cursor = 'default';
    },

    screenToWorld(clientX, clientY) {
        const m = new THREE.Vector2();
        m.x = (clientX / window.innerWidth) * 2 - 1;
        m.y = -(clientY / window.innerHeight) * 2 + 1;
        const rc = new THREE.Raycaster();
        rc.setFromCamera(m, ThreeCore.camera);
        const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const targetPos = new THREE.Vector3();
        rc.ray.intersectPlane(planeZ, targetPos);
        return { 
            x: targetPos.x + (window.innerWidth / 2), 
            y: -targetPos.y + (window.innerHeight / 2), 
            z: 0 
        };
    }
};

window.ThreeDesktop = ThreeInput;