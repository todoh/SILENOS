document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const rpgMakerContainer = document.getElementById('rpgmaker');
    const importBtn = document.getElementById('import-assets-btn');
    const assetList = document.getElementById('asset-list');
    const selectedAssetPreview = document.getElementById('selected-asset-preview');
    const playerSkinPreview = document.getElementById('player-skin-preview');
    const mapCanvas = document.getElementById('map-canvas');
    const ctx = mapCanvas.getContext('2d');

    // Botones de modo
    const modeTextureBtn = document.getElementById('mode-texture-btn');
    const modeSpriteBtn = document.getElementById('mode-sprite-btn');
    const modeStartPosBtn = document.getElementById('mode-start-pos-btn');
    
    // Botones de juego
    const startGameBtn = document.getElementById('start-game-btn');
    const stopGameBtn = document.getElementById('stop-game-btn');
    const exportGameBtn = document.getElementById('export-game-btn');

    // --- ESTADO DEL EDITOR ---
    const TILE_SIZE = 32;
    const MAP_SIZE_TILES = mapCanvas.width / TILE_SIZE;
    let currentMode = 'texture';
    let selectedAsset = { src: null, imageObject: null };
    let playerSkin = { src: null, imageObject: null };
    let playerStartPosition = null;
    let isPainting = false;

    let mapData = Array.from({ length: MAP_SIZE_TILES }, () =>
        Array.from({ length: MAP_SIZE_TILES }, () => ({ texture: null, sprite: null }))
    );
    const imageCache = new Map();

    // --- INICIALIZACIÓN 3D ---
    const rpg3d = new RPGMaker3D('three-canvas-container');

    // --- LÓGICA DE MODOS Y JUEGO ---
    function setMode(newMode) {
        currentMode = newMode;
        modeTextureBtn.classList.toggle('active', newMode === 'texture');
        modeSpriteBtn.classList.toggle('active', newMode === 'sprite');
        modeStartPosBtn.classList.toggle('active', newMode === 'start_pos');
    }

    modeTextureBtn.addEventListener('click', () => setMode('texture'));
    modeSpriteBtn.addEventListener('click', () => setMode('sprite'));
    modeStartPosBtn.addEventListener('click', () => setMode('start_pos'));

    startGameBtn.addEventListener('click', () => {
        if (!playerStartPosition || !playerSkin.src) {
            alert("Por favor, marca una posición de inicio (🚩) y selecciona una skin para el jugador.");
            return;
        }
        rpgMakerContainer.classList.add('game-active');
        startGameBtn.style.display = 'none';
        stopGameBtn.style.display = 'block';
        exportGameBtn.style.display = 'none';
        rpg3d.startGame(mapData, playerStartPosition, playerSkin.src);
    });

    stopGameBtn.addEventListener('click', () => {
        rpgMakerContainer.classList.remove('game-active');
        startGameBtn.style.display = 'block';
        stopGameBtn.style.display = 'none';
        exportGameBtn.style.display = 'block';
        rpg3d.stopGame(mapData, playerStartPosition);
    });

    // --- LÓGICA DE EXPORTACIÓN ---
    exportGameBtn.addEventListener('click', exportGame);

    async function exportGame() {
        if (!playerStartPosition || !playerSkin.src) {
            alert("Por favor, marca una posición de inicio (🚩) y selecciona una skin para el jugador antes de exportar.");
            return;
        }

        console.log("Iniciando exportación...");
        const exportBtnText = exportGameBtn.textContent;
        exportGameBtn.textContent = "Exportando...";
        exportGameBtn.disabled = true;

        try {
            const imageUrls = new Set();
            if (playerSkin.src) imageUrls.add(playerSkin.src);
            mapData.forEach(row => {
                row.forEach(cell => {
                    if (cell.texture?.src) imageUrls.add(cell.texture.src);
                    if (cell.sprite?.src) imageUrls.add(cell.sprite.src);
                });
            });

            const assetDataUrls = new Map();
            const conversionPromises = Array.from(imageUrls).map(url =>
                imageToDataUrl(url).then(dataUrl => {
                    assetDataUrls.set(url, dataUrl);
                })
            );
            await Promise.all(conversionPromises);
            console.log("Imágenes convertidas a Base64.");

            const gameData = {
                mapData: mapData.map(row => row.map(cell => ({
                    textureSrc: cell.texture?.src || null,
                    spriteSrc: cell.sprite?.src || null,
                }))),
                playerStartPosition,
                playerSkinSrc: playerSkin.src,
                assets: Object.fromEntries(assetDataUrls)
            };

            // CORRECCIÓN: Escapar la etiqueta </script> dentro del string de la clase por si acaso.
            const rpgMaker3DClassString = RPGMaker3D.toString().replace(/<\/script>/g, '<\\/script>');
            
            const htmlContent = createHtmlTemplate(gameData, rpgMaker3DClassString);
            console.log("Plantilla HTML creada.");

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'juego.html';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            console.log("¡Juego exportado!");

        } catch (error) {
            console.error("Error durante la exportación:", error);
            alert("Hubo un error al exportar el juego. Revisa la consola para más detalles.");
        } finally {
            exportGameBtn.textContent = exportBtnText;
            exportGameBtn.disabled = false;
        }
    }

    function imageToDataUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL());
            };
            img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${url}`));
            img.src = url;
        });
    }

    function createHtmlTemplate(gameData, classString) {
        // CORRECCIÓN FINAL: La estructura de la plantilla es ahora más robusta.
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Juego RPG</title>
    <style>
        body { margin: 0; background-color: #000; color: #fff; font-family: sans-serif; text-align: center; overflow: hidden; }
        #game-container { width: 100vw; height: 100vh; }
        canvas { display: block; }
        #info { position: absolute; top: 10px; width: 100%; pointer-events: none; }
    </style>
</head>
<body>
    <div id="info">Haz clic en el suelo para moverte</div>
    <div id="game-container"></div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>

    <script>
        // Inyectar la clase RPGMaker3D
        ${classString}

        // Inyectar los datos del juego
        const gameData = ${JSON.stringify(gameData, null, 2)};

        // Lógica de inicialización del juego
        window.addEventListener('DOMContentLoaded', () => {
            console.log("Iniciando juego exportado...");
            const rpg3d = new RPGMaker3D('game-container');

            // Precargar texturas desde Base64 para que el caché funcione
            Object.entries(gameData.assets).forEach(([originalSrc, dataUrl]) => {
                const texture = rpg3d.textureLoader.load(dataUrl);
                texture.colorSpace = THREE.SRGBColorSpace;
                rpg3d.textureCache.set(originalSrc, texture);
            });

            // Reconstruir mapData con referencias a las URLs originales
            const finalMapData = gameData.mapData.map(row => row.map(cell => ({
                texture: cell.textureSrc ? { src: cell.textureSrc } : null,
                sprite: cell.spriteSrc ? { src: cell.spriteSrc } : null
            })));

            rpg3d.startGame(finalMapData, gameData.playerStartPosition, gameData.playerSkinSrc);
        });
    <\/script>
</body>
</html>
        `;
    }


    // --- LÓGICA DE ASSETS ---
    importBtn.addEventListener('click', () => {
        assetList.innerHTML = '';
        const addedSources = new Set();
        document.querySelectorAll('#personajes .personaje img').forEach(img => {
            if (img && img.src && !addedSources.has(img.src)) {
                addedSources.add(img.src);
                const assetImg = document.createElement('img');
                assetImg.src = img.src;
                assetImg.classList.add('asset-item');
                assetImg.title = `Click: Textura | Alt+Click: Sprite | Shift+Click: Skin Jugador`;
                
                if (!imageCache.has(img.src)) {
                    const imageObj = new Image();
                    imageObj.src = img.src;
                    imageCache.set(img.src, imageObj);
                }

                assetImg.addEventListener('click', (e) => {
                    const assetSrc = img.src;
                    const imageObject = imageCache.get(assetSrc);

                    if (e.shiftKey) {
                        playerSkin = { src: assetSrc, imageObject };
                        playerSkinPreview.style.backgroundImage = `url(${assetSrc})`;
                        document.querySelectorAll('.asset-item.player-skin-selected').forEach(el => el.classList.remove('player-skin-selected'));
                        assetImg.classList.add('player-skin-selected');
                    } else {
                        selectedAsset = { src: assetSrc, imageObject };
                        selectedAssetPreview.style.backgroundImage = `url(${assetSrc})`;
                        document.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                        assetImg.classList.add('selected');
                        setMode(e.altKey ? 'sprite' : 'texture');
                    }
                });
                assetList.appendChild(assetImg);
            }
        });
    });

    // --- LÓGICA DEL MAPA 2D ---
    function drawMap() {
        ctx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
        mapData.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell.texture?.imageObject?.complete) {
                    ctx.drawImage(cell.texture.imageObject, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
                if (cell.sprite?.imageObject?.complete) {
                    ctx.drawImage(cell.sprite.imageObject, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            });
        });
        
        if (playerStartPosition) {
            ctx.font = '24px serif';
            ctx.fillText('🚩', playerStartPosition.x * TILE_SIZE + 4, playerStartPosition.y * TILE_SIZE + 24);
        }

        drawGrid();
    }
    
    function drawGrid() {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        for (let i = 0; i <= MAP_SIZE_TILES; i++) {
            ctx.beginPath();
            ctx.moveTo(i * TILE_SIZE, 0);
            ctx.lineTo(i * TILE_SIZE, mapCanvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * TILE_SIZE);
            ctx.lineTo(mapCanvas.width, i * TILE_SIZE);
            ctx.stroke();
        }
    }

    function handleMapInteraction(event) {
        const rect = mapCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
        const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
        if (x < 0 || x >= MAP_SIZE_TILES || y < 0 || y >= MAP_SIZE_TILES) return;

        switch (currentMode) {
            case 'texture':
                if (selectedAsset.src) mapData[y][x].texture = { ...selectedAsset };
                break;
            case 'sprite':
                if (selectedAsset.src) {
                    mapData[y][x].sprite = event.shiftKey ? null : { ...selectedAsset };
                }
                break;
            case 'start_pos':
                playerStartPosition = { x, y };
                break;
        }
        
        drawMap();
        rpg3d.updateEditorScene(mapData, playerStartPosition);
    }

    mapCanvas.addEventListener('mousedown', (e) => {
        isPainting = true;
        handleMapInteraction(e);
    });
    mapCanvas.addEventListener('mousemove', (e) => {
        if (isPainting && currentMode !== 'start_pos') handleMapInteraction(e);
    });
    mapCanvas.addEventListener('mouseup', () => isPainting = false);
    mapCanvas.addEventListener('mouseleave', () => isPainting = false);

    // CORRECCIÓN: Dibujo inicial del mapa y de la escena 3D.
    drawMap();
    rpg3d.updateEditorScene(mapData, playerStartPosition);
});
