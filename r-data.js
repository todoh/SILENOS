// =======================================================================
// === CONSTANTES Y DATOS DEL MUNDO ======================================
// =======================================================================

const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;
const SUBGRID_SIZE = 5;

// Almacena todos los datos del mapa y la posición inicial del jugador.
let worldData = {
    metadata: {
        playerStartPosition: null
    },
    chunks: {}
};

// Objeto que define las herramientas de texturas, entidades base y entidades personalizadas.
const tools = {
    textures: {
        grass: { color: '#7C9C4A', name: 'Hierba', isPassable: true },
        sand: { color: '#EDC9AF', name: 'Arena', isPassable: true },
        stone: { color: '#615953', name: 'Roca', isPassable: true },
        water: { color: '#3B698B', name: 'Agua', isPassable: false },
        forest: { color: '#3E7C4F', name: 'Bosque', isPassable: true },
    },
    entities: {
        playerStart: { icon: '🚩', name: 'Inicio del Jugador', isSolid: false, radius: 0 },
        tree: { icon: '🌳', name: 'Árbol', isSolid: true, radius: 1.2 },
        rock: { icon: '🪨', name: 'Roca Grande', isSolid: true, radius: 2.0 },
        building: {
            icon: '🏢',
            name: 'Edificio',
            isSolid: true, 
            radius: 7,
            model: {
                objects: [
                    // Paredes
                    { name: 'wall_north', geometry: { type: 'Box' }, material: { color: 0xaaaaaa }, position: { x: 0, y: 2.5, z: -5 }, scale: { x: 10, y: 5, z: 0.5 } },
                    { name: 'wall_east', geometry: { type: 'Box' }, material: { color: 0xaaaaaa }, position: { x: 5, y: 2.5, z: 0 }, scale: { x: 0.5, y: 5, z: 10 } },
                    { name: 'wall_west', geometry: { type: 'Box' }, material: { color: 0xaaaaaa }, position: { x: -5, y: 2.5, z: 0 }, scale: { x: 0.5, y: 5, z: 10 } },
                    { name: 'wall_south_1', geometry: { type: 'Box' }, material: { color: 0xaaaaaa }, position: { x: -3.75, y: 2.5, z: 5 }, scale: { x: 2.5, y: 5, z: 0.5 } },
                    { name: 'wall_south_2', geometry: { type: 'Box' }, material: { color: 0xaaaaaa }, position: { x: 3.75, y: 2.5, z: 5 }, scale: { x: 2.5, y: 5, z: 0.5 } },
                    // Puerta
                    {
                        name: 'building_door',
                        geometry: { type: 'Box' },
                        material: { color: 0x8B4513 },
                        position: { x: 0, y: 2.5, z: 5 },
                        scale: { x: 5, y: 5, z: 0.3 },
                        interactionRadius: 5 // Radio de interacción
                    },
                    // Suelo del edificio
                    {
                        name: 'building_floor',
                        geometry: { type: 'Box' },
                        material: { color: 0xcccccc },
                        position: { x: 0, y: 0.1, z: 0 },
                        scale: { x: 10, y: 0.2, z: 10 }
                    }
                ]
            }
        }
    },
    customEntities: {}
};


// =======================================================================
// === UTILIDAD PARA CREAR MODELOS 3D ====================================
// =======================================================================

/**
 * Construye un objeto THREE.Group a partir de una definición JSON.
 * @param {object} jsonData - El objeto JSON que define el modelo.
 * @returns {THREE.Group} El grupo de mallas que representa el modelo.
 */
function createModelFromJSON(jsonData) {
    const group = new THREE.Group();

    if (!jsonData || typeof jsonData !== 'object') {
        console.error("Datos JSON inválidos:", jsonData);
        return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
    }

    const parts = jsonData.parts || jsonData.objects;
    if (!Array.isArray(parts)) {
        console.error("El JSON no contiene un array 'parts' u 'objects' válido.");
        return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
    }

    parts.forEach(part => {
        let geometry;
        const geoDef = part.geometry;
        const matDef = part.material;

        try {
            const geoType = geoDef.type || part.geometry;
            const geoParams = geoDef || part.geometryParams;

            if (geoType.includes('Cylinder')) {
                geometry = new THREE.CylinderGeometry(geoParams.radiusTop ?? geoParams.radius, geoParams.radiusBottom ?? geoParams.radius, geoParams.height, geoParams.radialSegments);
            } else if (geoType.includes('Icosahedron')) {
                geometry = new THREE.IcosahedronGeometry(geoParams.radius, geoParams.detail);
            } else if (geoType.includes('Sphere')) {
                geometry = new THREE.SphereGeometry(geoParams.radius, geoParams.widthSegments ?? geoParams.width, geoParams.heightSegments ?? geoParams.height);
            } else if (geoType.includes('Box')) {
                const scale = part.scale || {x: 1, y: 1, z: 1};
                geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
            } else {
                console.warn(`Geometría no soportada: ${geoType}. Usando un cubo.`);
                geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            }
        } catch (e) {
            console.error(`Error creando geometría:`, e, part);
            geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        }

        const color = matDef ? matDef.color : part.color;
        const material = matDef ? new THREE.MeshStandardMaterial(matDef) : new THREE.MeshLambertMaterial({ color });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        if (part.name) {
            mesh.name = part.name;
        }

        if (part.position) {
            mesh.position.set(part.position.x || 0, part.position.y || 0, part.position.z || 0);
        }
        
        mesh.castShadow = true;
        group.add(mesh);
    });

    return group;
}
