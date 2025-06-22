// datos/editor-escenas-terreno.js

import * as THREE from 'three';
// MODIFICADO: Importar terrainGeometry, heightmapTexture y groundSegments de main.js
import { terrainGeometry, heightmapTexture, groundSegments, groundSize } from './editor-escenas-main.js'; 

// Global variables for terrain painting and sculpting
let groundCanvas;
let groundCtx;
let groundTextureCanvas; // Canvas for the main paintable texture
let groundTextureCtx;
let groundTextureMap; // THREE.CanvasTexture derived from groundTextureCanvas
let brushTextureMap; // The texture currently selected for the painting brush
let brushSize = 50; // Default painting brush size in world units
let currentBrushTexture = null; // Stores the currently selected brush texture (THREE.Texture)

// Helper to generate various procedural textures
function createProceduralTexture(type, width = 256, height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    switch (type) {
        case 'grass':
            ctx.fillStyle = '#2E6930'; // Dark green base
            ctx.fillRect(0, 0, width, height);
            for (let i = 0; i < 2000; i++) { // More grass blades
                const x = Math.random() * width;
                const y = Math.random() * height;
                const h = Math.random() * 5 + 2;
                ctx.fillStyle = Math.random() < 0.5 ? '#38803A' : '#255227'; // Tones of green
                ctx.fillRect(x, y, 1, h);
            }
            break;
        case 'rock':
            ctx.fillStyle = '#808080'; // Grey base
            ctx.fillRect(0, 0, width, height);
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const r = Math.random() * 20 + 10;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${Math.floor(Math.random() * 50) + 100}, ${Math.floor(Math.random() * 50) + 100}, ${Math.floor(Math.random() * 50) + 100}, 1)`;
                ctx.fill();
            }
            break;
        case 'sand':
            ctx.fillStyle = '#F4A460'; // Sandy brown base
            ctx.fillRect(0, 0, width, height);
            for (let i = 0; i < 5000; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 2 + 0.5;
                ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 50) + 160}, ${Math.floor(Math.random() * 50) + 90}, 0.8)`;
                ctx.fillRect(x, y, size, size);
            }
            break;
        case 'snow':
            ctx.fillStyle = '#FFFFFF'; // White base
            ctx.fillRect(0, 0, width, height);
            for (let i = 0; i < 1000; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const r = Math.random() * 2 + 1;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(240, 240, 255, ${Math.random() * 0.5 + 0.5})`;
                ctx.fill();
            }
            break;
        case 'dirt':
            ctx.fillStyle = '#6B4F3A'; // Earthy brown base
            ctx.fillRect(0, 0, width, height);
            for (let i = 0; i < 3000; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const size = Math.random() * 3 + 1;
                ctx.fillStyle = `rgba(${Math.floor(Math.random() * 30) + 90}, ${Math.floor(Math.random() * 20) + 60}, ${Math.floor(Math.random() * 10) + 40}, 0.9)`;
                ctx.fillRect(x, y, size, size);
            }
            break;
        default:
            ctx.fillStyle = 'gray';
            ctx.fillRect(0, 0, width, height);
            break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Predefined textures for painting (now procedural)
export const terrainTextures = {
    'grass': { name: 'Césped', generator: () => createProceduralTexture('grass', 512, 512), repeat: 16 },
    'rock': { name: 'Roca', generator: () => createProceduralTexture('rock', 512, 512), repeat: 8 },
    'sand': { name: 'Arena', generator: () => createProceduralTexture('sand', 512, 512), repeat: 16 },
    'snow': { name: 'Nieve', generator: () => createProceduralTexture('snow', 512, 512), repeat: 8 },
    'dirt': { name: 'Tierra', generator: () => createProceduralTexture('dirt', 512, 512), repeat: 16 }
};


/**
 * Creates a simple brick texture (retained from original).
 * @returns {THREE.CanvasTexture}
 */
export function createBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#A9A9A9'; ctx.fillRect(0, 0, 256, 256); // Fondo gris
    ctx.strokeStyle = '#696969'; ctx.lineWidth = 4; // Líneas de las juntas
    for (let y = 0; y < 256; y += 32) {
        for (let x = 0; x < 256; x += 64) {
            const offsetX = (y / 32) % 2 === 0 ? 0 : -32; // Offset para patrón de ladrillos
            ctx.fillStyle = '#B22222'; // Color del ladrillo
            ctx.fillRect(x + offsetX, y, 62, 30); // Dibujar ladrillo
            ctx.strokeRect(x + offsetX, y, 62, 30); // Borde del ladrillo
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; // Repetir textura en S y T
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2); // Cuántas veces se repite la textura
    return texture;
}

/**
 * Creates a base texture for the ground (retained from original).
 * This will now use the procedural grass texture.
 * @returns {THREE.CanvasTexture}
 */
export function createGrassTexture() {
    return createProceduralTexture('grass', 512, 512); // Use procedural grass
}


/**
 * Paints a texture onto the ground blending map.
 * This function is called when the user "paints" on the ground.
 * It draws on the `groundCtx` (the blending canvas).
 * @param {THREE.Vector2} uv - The UV coordinates where to paint (0-1 range).
 * @param {number} strength - The intensity of the paint (0-1).
 */
export function paintOnGround(uv, strength = 1.0) {
    if (!groundTextureCtx || !currentBrushTexture) return;

    // Map UV to the ground texture canvas resolution
    // CORRECCIÓN CLAVE: Invertir Y del UV para mapear correctamente al canvas 2D
    // Las coordenadas UV de Three.js (uv.x, uv.y) tienen uv.y=0 en la parte inferior y uv.y=1 en la superior.
    // Los canvas 2D tienen el origen (0,0) en la parte superior izquierda.
    // Por lo tanto, para pintar en la posición correcta del canvas, necesitamos invertir uv.y.
    // También, la PlaneGeometry está rotada -Math.PI / 2 en X, lo que hace que su "arriba" original (Y)
    // se convierta en el eje Z del mundo, y su "profundidad" original (Z) se convierta en el eje Y del mundo (vertical).
    // Sin embargo, para la *textura* aplicada al plano, los UVs se interpretan normalmente,
    // donde uv.x es de izquierda a derecha y uv.y es de abajo a arriba.
    // Si tu canvas 2D es estándar (0,0 arriba a la izquierda), la inversión de Y es correcta.
    // El problema podría ser en la visualización o en la proporción del pincel.
    const drawX = uv.x * groundTextureCanvas.width;
    const drawY = (1 - uv.y) * groundTextureCanvas.height; 

    // Get the image element from the brush texture. For CanvasTexture, 'image' is the canvas itself.
    const brushCanvas = currentBrushTexture.image;
    if (!brushCanvas || !(brushCanvas instanceof HTMLCanvasElement)) {
        console.warn("Brush texture is not a valid CanvasElement for drawing.");
        return;
    }

    // Adjust brush size from world units to canvas units
    // Assuming a groundSize of 1200 and a canvas of 1024x1024,
    // 1 world unit = 1024/1200 canvas units.
    const canvasBrushSize = brushSize * (groundTextureCanvas.width / groundSize); // Usar groundSize importado

    groundTextureCtx.globalAlpha = strength;
    groundTextureCtx.globalCompositeOperation = 'source-over'; // Default blending
    
    // Draw the brush image (which is a canvas) centered at (drawX, drawY)
    groundTextureCtx.drawImage(
        brushCanvas, // Draw the brush's canvas directamente
        drawX - canvasBrushSize / 2,
        drawY - canvasBrushSize / 2,
        canvasBrushSize,
        canvasBrushSize
    );
    groundTextureCtx.globalAlpha = 1.0; // Reset alpha
    
    // Crucial: Mark the CanvasTexture for update
    if (groundTextureMap) {
        groundTextureMap.needsUpdate = true;
    }
}


/**
 * Sets the texture to be used by the painting brush.
 * @param {string} textureKey - The key of the texture from terrainTextures.
 */
export function setBrushTexture(textureKey) {
    const textureInfo = terrainTextures[textureKey];
    if (!textureInfo) {
        console.error(`Texture key '${textureKey}' not found.`);
        currentBrushTexture = null; // Ensure no texture is set if key is invalid
        return;
    }

    // Generate the procedural texture using its generator function
    currentBrushTexture = textureInfo.generator();
    currentBrushTexture.needsUpdate = true; // Mark for update

    console.log(`Brush texture set to: ${textureInfo.name}`);
}


/**
 * Sets the size of the painting brush.
 * @param {number} size - The new brush size in world units.
 */
export function setBrushSize(size) {
    brushSize = size;
    console.log(`Brush size set to: ${brushSize}`);
}


/**
 * Initializes the main ground texture canvas and returns its texture.
 * This canvas is what the shader will display, and it's where we 'paint'.
 * @param {number} size - The size of the ground plane.
 * @param {THREE.Texture} initialTexture - The texture to fill the canvas with initially.
 * @returns {THREE.CanvasTexture} The main texture to apply to the ground mesh.
 */
export function createPaintableGroundTexture(size, initialTexture) {
    groundTextureCanvas = document.createElement('canvas');
    groundTextureCanvas.width = 1024; // High resolution for painting
    groundTextureCanvas.height = 1024;
    groundTextureCtx = groundTextureCanvas.getContext('2d');

    // Draw the initial texture onto the canvas using its internal image (canvas)
    const initialBrushCanvas = initialTexture.image; // Assuming initialTexture is a CanvasTexture
    if (initialBrushCanvas && initialBrushCanvas instanceof HTMLCanvasElement) {
        groundTextureCtx.drawImage(initialBrushCanvas, 0, 0, groundTextureCanvas.width, groundTextureCanvas.height);
    } else {
        // Fallback if initialTexture is not a CanvasTexture or its image is not ready
        console.warn("Initial grass texture not a CanvasTexture or image not ready. Drawing fallback color.");
        groundTextureCtx.fillStyle = '#2E6930'; // Default grass color
        groundTextureCtx.fillRect(0, 0, groundTextureCanvas.width, groundTextureCanvas.height);
    }

    groundTextureMap = new THREE.CanvasTexture(groundTextureCanvas);
    groundTextureMap.wrapS = THREE.RepeatWrapping;
    groundTextureMap.wrapT = THREE.RepeatWrapping;
    groundTextureMap.repeat.set(1, 1);
    groundTextureMap.needsUpdate = true;
    groundTextureMap.colorSpace = THREE.SRGBColorSpace;

    // Set a default brush texture (e.g., grass)
    setBrushTexture('grass');

    return groundTextureMap;
}

// --- NUEVAS FUNCIONES PARA MODELADO DE TERRENO ---

/**
 * Inicializa los datos del mapa de alturas como un Uint8Array.
 * @param {number} resolution - La resolución del mapa de alturas (ej. groundSegments).
 * @returns {{data: Uint8Array, width: number, height: number, format: THREE.RGBAFormat}} La DataTexture que representa el mapa de alturas.
 */
export function initializeHeightmap(resolution) {
    const data = new Uint8Array(resolution * resolution * 4); // Datos RGBA
    // Inicializar el heightmap a un valor medio (ej. 0.5 en el rango 0-1) para un terreno plano
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 128; // Canal R (0-255, 128 es 0.5)
        data[i + 1] = 128; // G
        data[i + 2] = 128; // B
        data[i + 3] = 255; // A (opacidad total)
    }

    // Se devuelve un objeto que main.js usará para crear la THREE.DataTexture
    return {
        data: data,
        width: resolution,
        height: resolution,
        format: THREE.RGBAFormat // Especificar el formato
    };
}

/**
 * Actualiza la altura del terreno en una posición específica usando un pincel.
 * Se manipula directamente la geometría del terreno para reflejar los cambios.
 * @param {THREE.Vector2} uv - Las coordenadas UV (0-1) del punto de impacto.
 * @param {number} brushRadiusWorld - El radio del pincel en unidades de mundo.
 * @param {number} amount - La cantidad a añadir/restar/establecer.
 * @param {string} mode - El modo de esculpido ('raise', 'lower', 'flatten', 'smooth').
 * @param {number} flattenHeight - La altura objetivo para el modo 'flatten' (en unidades de mundo).
 * @param {number} totalGroundSize - El tamaño total del plano del terreno en unidades de mundo.
 */
export function updateTerrainHeight(uv, brushRadiusWorld, amount, mode, flattenHeight, totalGroundSize) {
    if (!heightmapTexture || !terrainGeometry) {
        console.warn("Terrain geometry or heightmap not initialized.");
        return;
    }

    const resolution = groundSegments; // Usar groundSegments para la resolución del heightmap
    const data = heightmapTexture.image.data; // Acceder a los datos de la DataTexture directamente
    const positions = terrainGeometry.attributes.position.array; // Acceder a los vértices de la geometría

    // Convertir coordenadas UV y radio del pincel de mundo a píxeles del heightmap
    // uv.x se mapea a X y (1 - uv.y) se mapea a Y del heightmap.
    const centerPxX = Math.floor(uv.x * resolution);
    const centerPxY = Math.floor((1 - uv.y) * resolution); // Invertir Y del UV
    
    // Relación de píxeles del heightmap a unidades de mundo
    const pixelsPerWorldUnit = resolution / totalGroundSize;
    const brushRadiusPx = brushRadiusWorld * pixelsPerWorldUnit;

    const maxSculptHeight = 50; // Altura máxima en unidades de mundo
    const minSculptHeight = -50; // Altura mínima en unidades de mundo

    // Recorrer los píxeles dentro del área del pincel
    // Se itera en un cuadrado alrededor del centro del pincel.
    for (let yOffset = -Math.round(brushRadiusPx); yOffset <= Math.round(brushRadiusPx); yOffset++) {
        for (let xOffset = -Math.round(brushRadiusPx); xOffset <= Math.round(brushRadiusPx); xOffset++) {
            const currentPxX = centerPxX + xOffset;
            const currentPxY = centerPxY + yOffset;

            // Asegurarse de que el píxel esté dentro de los límites del heightmap
            if (currentPxX >= 0 && currentPxX < resolution && currentPxY >= 0 && currentPxY < resolution) {
                const distance = Math.sqrt(xOffset * xOffset + yOffset * yOffset);
                const falloff = Math.max(0, 1 - (distance / brushRadiusPx)); // Caída suave del pincel
                
                // Índice en el array de datos del heightmap (RGBA)
                const dataIndex = (currentPxY * resolution + currentPxX) * 4; 
                let currentHeightData = data[dataIndex]; // Leer el valor de altura actual (0-255)

                // Mapear el valor de 0-255 del heightmap a una altura en unidades de mundo
                let currentWorldHeight = (currentHeightData / 255) * (maxSculptHeight - minSculptHeight) + minSculptHeight;

                if (mode === 'raise') {
                    currentWorldHeight += amount * falloff;
                } else if (mode === 'lower') {
                    currentWorldHeight -= amount * falloff;
                } else if (mode === 'flatten') {
                    // amount aquí actúa como la velocidad de aplanado hacia flattenHeight
                    currentWorldHeight += (flattenHeight - currentWorldHeight) * amount * falloff;
                } else if (mode === 'smooth') {
                    let sumHeights = currentWorldHeight;
                    let numNeighbors = 1;

                    // Promediar con los vecinos del heightmap
                    // NOTA: Para un suavizado más robusto en tiempo real, se usaría un buffer temporal
                    // para evitar que los cambios en este mismo pase afecten los cálculos de los vecinos.
                    // Aquí, se leen los valores modificados del array 'data' en el mismo pase.
                    for (let ny = -1; ny <= 1; ny++) {
                        for (let nx = -1; nx <= 1; nx++) {
                            if (nx === 0 && ny === 0) continue; 

                            const neighborPxX = currentPxX + nx;
                            const neighborPxY = currentPxY + ny;

                            if (neighborPxX >= 0 && neighborPxX < resolution && neighborPxY >= 0 && neighborPxY < resolution) {
                                const neighborDataIndex = (neighborPxY * resolution + neighborPxX) * 4;
                                sumHeights += (data[neighborDataIndex] / 255) * (maxSculptHeight - minSculptHeight) + minSculptHeight;
                                numNeighbors++;
                            }
                        }
                    }
                    const averageHeight = sumHeights / numNeighbors;
                    currentWorldHeight += (averageHeight - currentWorldHeight) * amount * falloff;
                }

                // Limitar la altura en unidades de mundo
                currentWorldHeight = Math.max(minSculptHeight, Math.min(maxSculptHeight, currentWorldHeight));
                
                // Convertir la altura en unidades de mundo de nuevo a 0-255 para el heightmap data
                data[dataIndex] = Math.max(0, Math.min(255, Math.floor(((currentWorldHeight - minSculptHeight) / (maxSculptHeight - minSculptHeight)) * 255)));

                // Actualizar la coordenada Z del vértice correspondiente en la geometría
                // El plano está rotado -PI/2 en X, por lo que su 'arriba' es el eje Z en coordenadas globales.
                // Los índices de los vértices en PlaneGeometry son (fila * (columnas + 1) + columna) * 3
                // CORRECCIÓN CLAVE: El número de vértices por fila es (resolution + 1) para un PlaneGeometry
                // con 'resolution' segmentos (widthSegments y heightSegments).
                const vertexRow = currentPxY;
                const vertexCol = currentPxX;
                // 'resolution' representa los segmentos. El número de vértices es (segmentos + 1).
                const verticesPerRow = resolution + 1; // Correcto: (segmentos + 1) vértices por fila/columna para PlaneGeometry
                const vertexIndex = (vertexRow * verticesPerRow + vertexCol) * 3;
                
                // Asegurarse de que el índice no esté fuera de los límites
                if (vertexIndex + 2 < positions.length) {
                    positions[vertexIndex + 2] = currentWorldHeight; // Z es la altura en este plano rotado
                }
            }
        }
    }

    // Indicar a Three.js que los vértices han cambiado
    terrainGeometry.attributes.position.needsUpdate = true;
    terrainGeometry.computeVertexNormals(); // Recalcular normales para una iluminación correcta
    heightmapTexture.needsUpdate = true; // Indicar a Three.js que la textura de datos ha cambiado (aunque no se use directamente para render)
}


/**
 * Obtiene la altura del terreno en unas coordenadas UV específicas.
 * Utiliza el heightmap para buscar la altura.
 * @param {THREE.Vector2} uv - Las coordenadas UV (0-1) del punto.
 * @param {number} totalGroundSize - El tamaño total del plano del terreno.
 * @returns {number} La altura del terreno en las coordenadas dadas.
 */
export function getHeightAtCoordinates(uv, totalGroundSize) {
    if (!heightmapTexture || !terrainGeometry) {
        console.warn("Terrain geometry or heightmap not initialized when trying to get height.");
        return 0; // Fallback
    }

    const resolution = groundSegments;
    const data = heightmapTexture.image.data;

    // Convertir UV a coordenadas de píxel del heightmap
    const pxX = Math.floor(uv.x * resolution);
    const pxY = Math.floor((1 - uv.y) * resolution); // Invertir Y del UV

    // Limitar las coordenadas al rango del heightmap
    const clampedPxX = Math.max(0, Math.min(resolution - 1, pxX));
    const clampedPxY = Math.max(0, Math.min(resolution - 1, pxY));

    const dataIndex = (clampedPxY * resolution + clampedPxX) * 4;
    const heightData = data[dataIndex]; // Leer el valor de altura (0-255)

    const maxSculptHeight = 50; 
    const minSculptHeight = -50; 

    // Convertir de nuevo a altura en unidades de mundo
    return (heightData / 255) * (maxSculptHeight - minSculptHeight) + minSculptHeight;
}
