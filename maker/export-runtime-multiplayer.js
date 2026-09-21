// export-runtime-multiplayer.js - SUBMÓDULO DE EXPORTACIÓN Y RUNTIME MULTIJUGADOR FIREBASE
function buildExportRuntimeMultiplayer() {
    const cfg = projectData.multiplayerConfig;
    if (!cfg || !cfg.enabled || !cfg.databaseURL) {
        return `// Multijugador desactivado o credenciales no configuradas.`;
    }
    return `
    <!-- INYECCIÓN DE FIREBASE MULTIJUGADOR EN TIEMPO DE EJECUCIÓN -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getDatabase, ref, set, onValue, remove, onDisconnect, off } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

        const firebaseConfig = ${JSON.stringify({
            apiKey: cfg.apiKey,
            authDomain: cfg.authDomain,
            databaseURL: cfg.databaseURL,
            projectId: cfg.projectId,
            storageBucket: cfg.storageBucket,
            messagingSenderId: cfg.messagingSenderId,
            appId: cfg.appId
        })};

        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);

        class ExportMultiplayerRuntime {
            constructor() {
                this.playerId = 'player_' + Math.random().toString(36).substring(2, 9);
                this.remotePlayers = {};
                this.currentSubscribedScene = null;
                this.sceneRef = null;
                this.myRef = null;
                this.init();
            }

            init() {
                this.switchScene(currentSceneId);

                // Bucle de sincronización de posición propia a 20 FPS (50ms)
                setInterval(() => {
                    this.syncMyPosition();
                }, 50);

                // Monitoreo continuo de cambio de escena y mantención en el DOM
                setInterval(() => {
                    if (this.currentSubscribedScene !== currentSceneId) {
                        this.switchScene(currentSceneId);
                    } else {
                        this.renderRemotePlayers();
                    }
                }, 100);
            }

            switchScene(newSceneId) {
                // 1. Limpiar referencia del jugador en la escena previa de Firebase
                if (this.myRef) {
                    remove(this.myRef);
                }
                if (this.sceneRef) {
                    off(this.sceneRef);
                }

                // Limpiar del DOM los jugadores remotos de la escena anterior
                document.querySelectorAll('.remote-player-element').forEach(el => el.remove());
                this.remotePlayers = {};
                this.currentSubscribedScene = newSceneId;

                if (!newSceneId) return;

                // 2. Suscribir a la nueva escena en Realtime Database
                this.myRef = ref(db, 'players/' + newSceneId + '/' + this.playerId);
                onDisconnect(this.myRef).remove();

                this.sceneRef = ref(db, 'players/' + newSceneId);
                onValue(this.sceneRef, (snapshot) => {
                    this.remotePlayers = snapshot.val() || {};
                    this.renderRemotePlayers();
                });
            }

            syncMyPosition() {
                if (!this.currentSubscribedScene) return;
                const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
                const myPlayer = scene?.elements?.find(e => e.isPlayer);
                if (!myPlayer) return;

                const myData = {
                    id: this.playerId,
                    x: Math.round(myPlayer.x),
                    y: Math.round(myPlayer.y),
                    image: myPlayer.image || '',
                    width: myPlayer.width,
                    height: myPlayer.height,
                    rotation: myPlayer.rotation || 0,
                    lastSeen: Date.now()
                };

                if (this.myRef) {
                    set(this.myRef, myData);
                }
            }

            renderRemotePlayers() {
                const stage = document.getElementById('stage');
                if (!stage) return;

                const now = Date.now();
                const activeRemoteIds = new Set();

                // Renderizar o actualizar cada jugador remoto
                Object.entries(this.remotePlayers || {}).forEach(([id, p]) => {
                    if (id === this.playerId || !p) return; // Omitir al jugador local

                    // Descartar jugadores inactivos por más de 10 segundos
                    if (p.lastSeen && (now - p.lastSeen > 10000)) return;

                    activeRemoteIds.add(id);

                    let remoteEl = document.getElementById('remote-el-' + id);
                    if (!remoteEl) {
                        remoteEl = document.createElement('div');
                        remoteEl.id = 'remote-el-' + id;
                        remoteEl.className = 'stage-element layer-entidad remote-player-element';

                        const img = document.createElement('img');
                        img.src = (typeof assetsData !== 'undefined' && assetsData[p.image]) ? assetsData[p.image] : p.image;
                        img.style.cssText = 'width: 100%; height: 100%; display: block; pointer-events: none; object-fit: fill;';
                        remoteEl.appendChild(img);
                        stage.appendChild(remoteEl);
                    } else {
                        // Sincronizar imagen si cambia
                        const img = remoteEl.querySelector('img');
                        const targetSrc = (typeof assetsData !== 'undefined' && assetsData[p.image]) ? assetsData[p.image] : p.image;
                        if (img && img.src !== targetSrc) {
                            img.src = targetSrc;
                        }
                    }

                    // Posición y dimensiones
                    const posX = Math.round(p.x);
                    const posY = Math.round(p.y);
                    remoteEl.style.left = posX + 'px';
                    remoteEl.style.top = posY + 'px';
                    remoteEl.style.width = p.width + 'px';
                    remoteEl.style.height = p.height + 'px';
                    remoteEl.style.zIndex = 100 + Math.round(p.y + p.height);

                    // Renderizado y comportamiento Mode 7 / 2D
                    const rot = p.rotation || 0;
                    const yaw = (typeof cameraState !== 'undefined' && cameraState.rotation !== undefined) ? cameraState.rotation : 0;

                    if (typeof isIsometricView !== 'undefined' && isIsometricView) {
                        remoteEl.classList.add('mode7-billboard');
                        remoteEl.style.transformStyle = 'preserve-3d';
                        remoteEl.style.transform = 'rotateX(-90deg) rotateZ(' + (-yaw) + 'deg) rotate(' + rot + 'deg)';
                    } else {
                        remoteEl.classList.remove('mode7-billboard');
                        remoteEl.style.transform = 'rotate(' + rot + 'deg)';
                    }
                });

                // Eliminar del DOM únicamente los jugadores desasociados
                document.querySelectorAll('.remote-player-element').forEach(el => {
                    const elId = el.id.replace('remote-el-', '');
                    if (!activeRemoteIds.has(elId)) {
                        el.remove();
                    }
                });
            }
        }

        window.multiplayerRuntime = new ExportMultiplayerRuntime();
    </script>
    `;
}