// =======================================================================
// === CONSTANTES Y DATOS DEL MUNDO (ACTUALIZADO) ========================
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
    entities: {eraser: { name: "Borrador", icon: "❌", isSolid: false },
        playerStart: { icon: '🚩', name: 'Inicio del Jugador', isSolid: false, radius: 0 },
            lamppost: {
            icon: '💡', // Un emoji o ícono de respaldo
            name: 'Farola',
            isSolid: true, // ¿El jugador puede atravesarla?
            radius: 0.5,   // Radio de colisión
            model: {
                objects: [
                    {
                        name: 'post',
                        geometry: { type: 'Cylinder', radius: 0.2, height: 7 },
                        material: { color: 0x333333 },
                        position: { x: 0, y: 3.5, z: 0 }
                    },
                    {
                        name: 'light_box',
                        geometry: { type: 'Box' },
                        scale: { x: 0.8, y: 0.8, z: 0.8 },
                        material: { color: 0xffffaa }, // Un color amarillento para la luz
                        position: { x: 0, y: 7, z: 0 }
                    }
                ]
            }
        },

 
        chest: {
            icon: '📦',
            name: 'Cofre',
            isSolid: true,
            radius: 1,
            model: {
                objects: [
                    {
                        name: 'chest_body',
                        geometry: { type: 'Box' },
                        scale: { x: 1.5, y: 1, z: 1 },
                        material: { color: 0x8B4513 }, // Color madera
                        position: { x: 0, y: 0.5, z: 0 }
                    },
                    {
                        name: 'chest_lid',
                        geometry: { type: 'Box' },
                        scale: { x: 1.6, y: 0.3, z: 1.1 },
                        material: { color: 0x654321 }, // Madera más oscura
                        position: { x: 0, y: 1.15, z: 0 }
                    }
                ]
            }
        }
     ,
        tree: { 
            icon: '🌳', 
            name: 'Árbol', 
            isSolid: true, 
            radius: 1.2,
            model: {
                objects: [
                    // Usamos CylinderGeometry para el tronco
                    {
                        name: 'trunk',
                        geometry: { type: 'Cylinder', radiusTop: 0.5, radiusBottom: 0.8, height: 8, radialSegments: 8 },
                        material: { color: 0x66402D },
                        position: { x: 0, y: 4, z: 0 }
                    },
                    // Usamos CylinderGeometry con radio superior 0 para simular un cono
                    {
                        name: 'leaves',
                        geometry: { type: 'Cylinder', radiusTop: 0, radiusBottom: 3, height: 6, radialSegments: 8 },
                        material: { color: 0x228B22 },
                        position: { x: 0, y: 10, z: 0 } // y = altura_tronco + altura_copa / 2
                    }
                ]
            }
        },
    
  "pine_tree": {
    "icon": "🌲",
    "name": "Pino Hiperdetallado",
    "isSolid": true,
    "radius": 2.5,
    "model": {
      "objects": [
        // --- TRONCO ---
        // El tronco se compone de varios cilindros para simular la conicidad y textura.
        {
          "name": "trunk_base",
          "geometry": { "type": "Cylinder", "radiusTop": 0.7, "radiusBottom": 0.9, "height": 2, "radialSegments": 12 },
          "material": { "color": 0x5D4037 },
          "position": { "x": 0, "y": 1, "z": 0 }
        },
        {
          "name": "trunk_mid",
          "geometry": { "type": "Cylinder", "radiusTop": 0.5, "radiusBottom": 0.7, "height": 4, "radialSegments": 12 },
          "material": { "color": 0x6D4C41 },
          "position": { "x": 0, "y": 4, "z": 0 } // y = 2 (altura base) + 4/2
        },
        {
          "name": "trunk_top",
          "geometry": { "type": "Cylinder", "radiusTop": 0.3, "radiusBottom": 0.5, "height": 5, "radialSegments": 12 },
          "material": { "color": 0x795548 },
          "position": { "x": 0, "y": 8.5, "z": 0 } // y = 2 + 4 + 5/2
        },

        // --- FOLLAJE / CAPAS DE HOJAS ---
        // Se usan múltiples conos (cilindros con radio superior casi cero) para las capas de follaje.
        // Cada capa tiene un color ligeramente diferente para dar profundidad.
        {
          "name": "foliage_layer_1",
          "geometry": { "type": "Cylinder", "radiusTop": 1.5, "radiusBottom": 3.5, "height": 4, "radialSegments": 16 },
          "material": { "color": 0x1B5E20 },
          "position": { "x": 0, "y": 7, "z": 0 }
        },
        {
          "name": "foliage_layer_2",
          "geometry": { "type": "Cylinder", "radiusTop": 1.2, "radiusBottom": 3.0, "height": 4, "radialSegments": 16 },
          "material": { "color": 0x2E7D32 },
          "position": { "x": 0, "y": 9, "z": 0 }
        },
        {
          "name": "foliage_layer_3",
          "geometry": { "type": "Cylinder", "radiusTop": 1.0, "radiusBottom": 2.8, "height": 3.5, "radialSegments": 16 },
          "material": { "color": 0x388E3C },
          "position": { "x": 0, "y": 11, "z": 0 }
        },
        {
          "name": "foliage_layer_4",
          "geometry": { "type": "Cylinder", "radiusTop": 0.8, "radiusBottom": 2.5, "height": 3, "radialSegments": 16 },
          "material": { "color": 0x43A047 },
          "position": { "x": 0, "y": 13, "z": 0 }
        },
        {
          "name": "foliage_layer_5",
          "geometry": { "type": "Cylinder", "radiusTop": 0.5, "radiusBottom": 2.0, "height": 2.5, "radialSegments": 16 },
          "material": { "color": 0x4CAF50 },
          "position": { "x": 0, "y": 14.5, "z": 0 }
        },
        {
          "name": "foliage_layer_6",
          "geometry": { "type": "Cylinder", "radiusTop": 0.3, "radiusBottom": 1.5, "height": 2, "radialSegments": 16 },
          "material": { "color": 0x66BB6A },
          "position": { "x": 0, "y": 16, "z": 0 }
        },
        
        // --- PUNTA DEL ÁRBOL ---
        // Un cono final y afilado para la copa.
        {
          "name": "tree_top",
          "geometry": { "type": "Cylinder", "radiusTop": 0, "radiusBottom": 1.0, "height": 2.5, "radialSegments": 12 },
          "material": { "color": 0x81C784 },
          "position": { "x": 0, "y": 17.25, "z": 0 } // y = 16 + 2.5/2
        }
      ]
    }
  }
 
,     stick: {
            name: 'Palo',
            icon: '🪵', // Emoji de respaldo
            isSolid: false,      // El jugador puede pasar por encima
            isCollectible: true, // ¡NUEVO! Marca el objeto como recolectable
            collectibleId: 'stick', // ¡NUEVO! Un ID único para el inventario
            model: {
                objects: [
                    {
                        name: 'stick_main',
                        geometry: { type: 'Cylinder', radiusTop: 0.1, radiusBottom: 0.1, height: 2.5, radialSegments: 5 },
                        material: { color: 0x8B4513 }, // Color madera
                        // Lo rotamos para que esté tumbado en el suelo
                        rotation: { x: 0, y: 0, z: 1.5708 } // 90 grados en Z
                    }
                ]
            }
        },
        // --- ROCA AHORA TIENE MODELO ---
        rock: { 
            icon: '🪨', 
            name: 'Roca Grande', 
            isSolid: true, 
            radius: 2.0,
            model: {
                objects: [
                    // IcosahedronGeometry es una buena aproximación para una roca poligonal
                    {
                        name: 'rock_main',
                        geometry: { type: 'Icosahedron', radius: 2.5, detail: 0 },
                        material: { color: 0x5c5c5c },
                        position: { x: 0, y: 1.25, z: 0 }
                    }
                ]
            }
        },
        japanese_torii: {
    "icon": "⛩️",
    "name": "Torii Japonés",
    "isSolid": true,
    "radius": 5,
    "model": {
      "objects": [
        // --- PILARES VERTICALES (Hashira) ---
        {
          "name": "left_pillar",
          "geometry": { "type": "Cylinder", "radiusTop": 0.5, "radiusBottom": 0.5, "height": 10, "radialSegments": 12 },
          "material": { "color": 0xC62828 },
          "position": { "x": -4, "y": 5, "z": 0 }
        },
        {
          "name": "right_pillar",
          "geometry": { "type": "Cylinder", "radiusTop": 0.5, "radiusBottom": 0.5, "height": 10, "radialSegments": 12 },
          "material": { "color": 0xC62828 },
          "position": { "x": 4, "y": 5, "z": 0 }
        },

        // --- TRAVESAÑO RECTO (Nuki) ---
        // Atraviesa los dos pilares.
        {
          "name": "nuki_beam",
          "geometry": { "type": "Box", "width": 10, "height": 0.8, "depth": 0.6 },
          "material": { "color": 0x212121 },
          "position": { "x": 0, "y": 7, "z": 0 }
        },

        // --- DINTEL SUPERIOR (Kasagi) ---
        // Compuesto por dos partes para simular la forma tradicional.
        {
          "name": "kasagi_bottom",
          "geometry": { "type": "Box", "width": 12, "height": 0.7, "depth": 1 },
          "material": { "color": 0xC62828 },
          "position": { "x": 0, "y": 10.5, "z": 0 }
        },
        {
          "name": "kasagi_top",
          "geometry": { "type": "Box", "width": 13, "height": 0.8, "depth": 1 },
          "material": { "color": 0x212121 },
          "position": { "x": 0, "y": 11.25, "z": 0 }
        },

        // --- SOPORTE CENTRAL (Gakuzuka) ---
        // Pequeño soporte entre el nuki y el kasagi.
        {
          "name": "gakuzuka_strut",
          "geometry": { "type": "Box", "width": 2.5, "height": 1.5, "depth": 0.5 },
          "material": { "color": 0x212121 },
          "position": { "x": 0, "y": 9.05, "z": 0 }
        }
      ]
    }
  },
        
        antique_lamppost: {
    "icon": "💡",
    "name": "Farola Antigua (Pequeña)",
    "isSolid": true,
    "radius": 0.27,
    "model": {
      "objects": [
        // --- BASE DE LA FAROLA ---
        // Modelo escalado a 1/3 de su tamaño original.
        {
          "name": "base_bottom",
          "geometry": { "type": "Cylinder", "radiusTop": 0.27, "radiusBottom": 0.27, "height": 0.13, "radialSegments": 16 },
          "material": { "color": 0x2C3E50 },
          "position": { "x": 0, "y": 0.07, "z": 0 }
        },
        {
          "name": "base_mid",
          "geometry": { "type": "Cylinder", "radiusTop": 0.2, "radiusBottom": 0.23, "height": 0.27, "radialSegments": 16 },
          "material": { "color": 0x34495E },
          "position": { "x": 0, "y": 0.27, "z": 0 }
        },

        // --- POSTE PRINCIPAL ---
        {
          "name": "post",
          "geometry": { "type": "Cylinder", "radiusTop": 0.08, "radiusBottom": 0.08, "height": 4, "radialSegments": 12 },
          "material": { "color": 0x34495E },
          "position": { "x": 0, "y": 2.4, "z": 0 }
        },

        // --- SECCIÓN DE LA LINTERNA ---
        {
          "name": "lantern_support",
          "geometry": { "type": "Box", "width": 0.13, "height": 0.5, "depth": 0.13 },
          "material": { "color": 0x2C3E50 },
          "position": { "x": 0, "y": 4.65, "z": 0 }
        },
        {
          "name": "lantern_roof",
          "geometry": { "type": "Cylinder", "radiusTop": 0, "radiusBottom": 0.4, "height": 0.27, "radialSegments": 8 },
          "material": { "color": 0x2C3E50 },
          "position": { "x": 0, "y": 5.03, "z": 0 }
        },
        {
          "name": "lantern_case",
          "geometry": { "type": "Box", "width": 0.5, "height": 0.6, "depth": 0.5 },
          "material": { "color": 0xF1C40F, "transparent": true, "opacity": 0.2 },
          "position": { "x": 0, "y": 4.6, "z": 0 }
        },

        // --- LUZ INTERIOR ---
        {
          "name": "light_bulb",
          "geometry": { "type": "Sphere", "radius": 0.17, "widthSegments": 16, "heightSegments": 16 },
          "material": { "color": 0xF1C40F, "emissive": 0xF1C40F, "emissiveIntensity": 2 },
          "position": { "x": 0, "y": 4.6, "z": 0 }
        }
      ]
    }
  },
        
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
                        scale: { x: 5, y: 5, z: 0.3 }
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
        },   luxury_mansion: {
    "icon": "🏛️",
    "name": "Mansión de Lujo",
    "isSolid": true,
    "radius": 25,
    "model": {
      "objects": [
        // --- CUERPO PRINCIPAL ---
        {
          "name": "main_building",
          "geometry": { "type": "Box" },
          "scale": { "x": 25, "y": 12, "z": 18 },
          "material": { "color": 0xE8E8E8 },
          "position": { "x": 0, "y": 6, "z": 0 }
        },
        // --- ALAS LATERALES ---
        {
          "name": "left_wing",
          "geometry": { "type": "Box" },
          "scale": { "x": 12, "y": 10, "z": 20 },
          "material": { "color": 0xE8E8E8 },
          "position": { "x": -18.5, "y": 5, "z": 1 }
        },
        {
          "name": "right_wing",
          "geometry": { "type": "Box" },
          "scale": { "x": 12, "y": 10, "z": 20 },
          "material": { "color": 0xE8E8E8 },
          "position": { "x": 18.5, "y": 5, "z": 1 }
        },
        // --- TEJADO ---
        {
          "name": "main_roof",
          "geometry": { "type": "Box" },
          "scale": { "x": 26, "y": 1.5, "z": 19 },
          "material": { "color": 0x4A4A4A },
          "position": { "x": 0, "y": 12.75, "z": 0 }
        },
        {
          "name": "left_wing_roof",
          "geometry": { "type": "Box" },
          "scale": { "x": 13, "y": 1, "z": 21 },
          "material": { "color": 0x4A4A4A },
          "position": { "x": -18.5, "y": 10.5, "z": 1 }
        },
        {
          "name": "right_wing_roof",
          "geometry": { "type": "Box" },
          "scale": { "x": 13, "y": 1, "z": 21 },
          "material": { "color": 0x4A4A4A },
          "position": { "x": 18.5, "y": 10.5, "z": 1 }
        },
        // --- PÓRTICO FRONTAL ---
        { "name": "portico_floor", "geometry": { "type": "Box" }, "scale": { "x": 14, "y": 1, "z": 6 }, "material": { "color": 0xDCDCDC }, "position": { "x": 0, "y": 0.5, "z": 12 } },
        { "name": "portico_roof", "geometry": { "type": "Box" }, "scale": { "x": 14, "y": 1.5, "z": 6 }, "material": { "color": 0x4A4A4A }, "position": { "x": 0, "y": 11, "z": 12 } },
        // --- COLUMNAS DEL PÓRTICO ---
        { "name": "column_1", "geometry": { "type": "Cylinder", "radius": 0.7, "height": 10 }, "material": { "color": 0xF5F5DC }, "position": { "x": -5, "y": 6, "z": 10.5 } },
        { "name": "column_2", "geometry": { "type": "Cylinder", "radius": 0.7, "height": 10 }, "material": { "color": 0xF5F5DC }, "position": { "x": 5, "y": 6, "z": 10.5 } },
        { "name": "column_3", "geometry": { "type": "Cylinder", "radius": 0.7, "height": 10 }, "material": { "color": 0xF5F5DC }, "position": { "x": -5, "y": 6, "z": 13.5 } },
        { "name": "column_4", "geometry": { "type": "Cylinder", "radius": 0.7, "height": 10 }, "material": { "color": 0xF5F5DC }, "position": { "x": 5, "y": 6, "z": 13.5 } },
        // --- PUERTA PRINCIPAL ---
        {
          "name": "main_door",
          "geometry": { "type": "Box" },
          "scale": { "x": 4, "y": 6.5, "z": 0.5 },
          "material": { "color": 0x5C4033 },
          "position": { "x": 0, "y": 3.25, "z": 9.1 }
        },
        // --- VENTANAS (MATERIAL OSCURO PARA SIMULAR VIDRIO) ---
        { "name": "window_front_1", "geometry": { "type": "Box" }, "scale": { "x": 2, "y": 3, "z": 0.3 }, "material": { "color": 0x111122 }, "position": { "x": -5, "y": 7, "z": 9.1 } },
        { "name": "window_front_2", "geometry": { "type": "Box" }, "scale": { "x": 2, "y": 3, "z": 0.3 }, "material": { "color": 0x111122 }, "position": { "x": 5, "y": 7, "z": 9.1 } },
        { "name": "window_right_1", "geometry": { "type": "Box" }, "scale": { "x": 0.3, "y": 3, "z": 2 }, "material": { "color": 0x111122 }, "position": { "x": 12.6, "y": 7, "z": 4 } },
        { "name": "window_right_2", "geometry": { "type": "Box" }, "scale": { "x": 0.3, "y": 3, "z": 2 }, "material": { "color": 0x111122 }, "position": { "x": 12.6, "y": 7, "z": -2 } },
        { "name": "window_left_1", "geometry": { "type": "Box" }, "scale": { "x": 0.3, "y": 3, "z": 2 }, "material": { "color": 0x111122 }, "position": { "x": -12.6, "y": 7, "z": 4 } },
        { "name": "window_left_2", "geometry": { "type": "Box" }, "scale": { "x": 0.3, "y": 3, "z": 2 }, "material": { "color": 0x111122 }, "position": { "x": -12.6, "y": 7, "z": -2 } },
        // --- PISCINA EN EL ALA DERECHA ---
        {
          "name": "pool_deck",
          "geometry": { "type": "Box" },
          "scale": { "x": 10, "y": 0.4, "z": 18 },
          "material": { "color": 0x8B4513 },
          "position": { "x": 18.5, "y": 0.2, "z": -12 }
        },
        {
          "name": "pool_water",
          "geometry": { "type": "Box" },
          "scale": { "x": 8, "y": 0.3, "z": 16 },
          "material": { "color": 0x4FC3F7, "transparent": true, "opacity": 0.8 },
          "position": { "x": 18.5, "y": 0.35, "z": -12 }
        }
      ]
    }
}, 
designer_console: {
  "icon": "🗄️",
  "name": "Consola de Diseño",
  "isSolid": true,
  "radius": 2.5,
  "model": {
    "objects": [
      // Base sólida y oscura que asienta la pieza
      {
        "name": "console_base",
        "geometry": { "type": "Box" },
        "scale": { "x": 4.8, "y": 0.5, "z": 1.3 },
        "material": { "color": 0x333333 },
        "position": { "x": 0, "y": 0.25, "z": 0 }
      },
      // Cuerpo principal del mueble en un tono neutro
      {
        "name": "console_body",
        "geometry": { "type": "Box" },
        "scale": { "x": 5, "y": 1.2, "z": 1.5 },
        "material": { "color": 0xEAEAEA },
        "position": { "x": 0, "y": 1.1, "z": 0 }
      },
      // Panel decorativo asimétrico de madera para dar calidez y carácter
      {
        "name": "decorative_wood_panel",
        "geometry": { "type": "Box" },
        "scale": { "x": 2.2, "y": 1.0, "z": 0.1 },
        "material": { "color": 0x8B4513 }, 
        "position": { "x": -1.1, "y": 1.1, "z": 0.78 } 
      },
      // Un tirador vertical o detalle metálico que rompe la simetría
      {
        "name": "metal_handle",
        "geometry": { "type": "Box" },
        "scale": { "x": 0.05, "y": 0.8, "z": 0.05 },
        "material": { "color": 0xC0C0C0 },
        "position": { "x": 1.3, "y": 1.1, "z": 0.78 }
      }
    ]
  }
},
lips_sofa: {
    "icon": "💋",
    "name": "Sofá Labios Estilizado",
    "isSolid": true,
    "radius": 2.0,
    "model": {
      "objects": [
        // --- Labio Inferior (una caja ancha) ---
        {
          "name": "lower_lip",
          "geometry": { "type": "Box" },
          "scale": { "x": 3.5, "y": 1.2, "z": 1.4 },
          "material": { "color": 0xD91F4E }, // Un color rojo/rosa intenso
          "position": { "x": 0, "y": 0.6, "z": 0 }
        },
        // --- Labio Superior (dos cajas en ángulo para crear el arco de Cupido) ---
        {
          "name": "upper_lip_left",
          "geometry": { "type": "Box" },
          "scale": { "x": 1.8, "y": 1, "z": 1.3 },
          "material": { "color": 0xD91F4E },
          "position": { "x": -0.9, "y": 1.7, "z": 0 },
          "rotation": { "x": 0, "y": 0, "z": 0.12 } // Inclinamos ligeramente hacia abajo en el extremo
        },
        {
          "name": "upper_lip_right",
          "geometry": { "type": "Box" },
          "scale": { "x": 1.8, "y": 1, "z": 1.3 },
          "material": { "color": 0xD91F4E },
          "position": { "x": 0.9, "y": 1.7, "z": 0 },
          "rotation": { "x": 0, "y": 0, "z": -0.12 } // Inclinamos la otra parte para formar el centro
        }
      ]
    }
},

mailbox_stylish: {
    "icon": "📮",
    "name": "Buzón de Correos Estilizado",
    "isSolid": true,
    "radius": 0.8,
    "model": {
        "objects": [
            // Base octogonal
            {
                "name": "mailbox_base",
                "geometry": { "type": "Cylinder", "radiusTop": 0.7, "radiusBottom": 0.7, "height": 0.2, "radialSegments": 8 },
                "material": { "color": 0x444444 },
                "position": { "x": 0, "y": 0.1, "z": 0 }
            },
            // Cuerpo principal octogonal
            {
                "name": "mailbox_body",
                "geometry": { "type": "Cylinder", "radiusTop": 0.6, "radiusBottom": 0.6, "height": 2.5, "radialSegments": 8 },
                "material": { "color": 0xFFD700 }, // Amarillo Correos
                "position": { "x": 0, "y": 1.45, "z": 0 }
            },
            // Tapa superior
            {
                "name": "mailbox_lid",
                "geometry": { "type": "Cylinder", "radiusTop": 0.7, "radiusBottom": 0.7, "height": 0.3, "radialSegments": 8 },
                "material": { "color": 0x444444 },
                "position": { "x": 0, "y": 2.85, "z": 0 }
            },
            // Ranura para el correo
            {
                "name": "mailbox_slot_plate",
                "geometry": { "type": "Box" },
                "scale": { "x": 0.9, "y": 0.3, "z": 0.1 },
                "material": { "color": 0x666666 },
                "position": { "x": 0, "y": 1.9, "z": 0.55 }
            },
            {
                "name": "mailbox_slot_opening",
                "geometry": { "type": "Box" },
                "scale": { "x": 0.7, "y": 0.1, "z": 0.1 },
                "material": { "color": 0x111111 },
                "position": { "x": 0, "y": 1.9, "z": 0.61 }
            }
        ]
    }
},

sofa: {
    "icon": "🛋️",
    "name": "Sofá Cómodo",
    "isSolid": true,
    "radius": 1.8,
    "model": {
      "objects": [
        // --- Base del sofá (asientos) ---
        {
          "name": "sofa_base",
          "geometry": { "type": "Box" },
          "scale": { "x": 3.5, "y": 1.0, "z": 1.5 },
          "material": { "color": 0x555555 }, // Un color gris oscuro
          "position": { "x": 0, "y": 0.5, "z": 0 }
        },
        // --- Respaldo del sofá ---
        {
          "name": "sofa_backrest",
          "geometry": { "type": "Box" },
          "scale": { "x": 3.5, "y": 1.2, "z": 0.4 },
          "material": { "color": 0x555555 },
          "position": { "x": 0, "y": 1.6, "z": -0.55 } // Se apoya sobre la base
        },
        // --- Reposabrazos izquierdo ---
        {
          "name": "armrest_left",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 0.7, "z": 1.1 }, // Un poco más corto que la base
          "material": { "color": 0x666666 }, // Un tono ligeramente diferente
          "position": { "x": -1.55, "y": 1.35, "z": 0 } // Al lado izquierdo de la base
        },
        // --- Reposabrazos derecho ---
        {
          "name": "armrest_right",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 0.7, "z": 1.1 },
          "material": { "color": 0x666666 },
          "position": { "x": 1.55, "y": 1.35, "z": 0 } // Al lado derecho de la base
        }
      ]
    }
}, 

chair: {
    "icon": "🪑",
    "name": "Silla de Madera",
    "isSolid": true,
    "radius": 0.6,
    "model": {
      "objects": [
        // --- Asiento ---
        {
          "name": "seat",
          "geometry": { "type": "Box" },
          "scale": { "x": 1, "y": 0.2, "z": 1 },
          "material": { "color": 0x8B4513 }, // Color madera
          "position": { "x": 0, "y": 1.2, "z": 0 }
        },
        // --- Respaldo ---
        {
          "name": "backrest",
          "geometry": { "type": "Box" },
          "scale": { "x": 1, "y": 1.5, "z": 0.2 },
          "material": { "color": 0x8B4513 },
          "position": { "x": 0, "y": 1.95, "z": -0.4 }
        },
        // --- Patas ---
        {
          "name": "leg_front_right",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.2, "y": 1.2, "z": 0.2 },
          "material": { "color": 0x8B4513 },
          "position": { "x": 0.4, "y": 0.6, "z": 0.4 }
        },
        {
          "name": "leg_front_left",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.2, "y": 1.2, "z": 0.2 },
          "material": { "color": 0x8B4513 },
          "position": { "x": -0.4, "y": 0.6, "z": 0.4 }
        },
        {
          "name": "leg_back_right",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.2, "y": 1.2, "z": 0.2 },
          "material": { "color": 0x8B4513 },
          "position": { "x": 0.4, "y": 0.6, "z": -0.4 }
        },
        {
          "name": "leg_back_left",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.2, "y": 1.2, "z": 0.2 },
          "material": { "color": 0x8B4513 },
          "position": { "x": -0.4, "y": 0.6, "z": -0.4 }
        }
      ]
    }
},
wooden_table: {
    "icon": "🪑",
    "name": "Mesa de Madera",
    "isSolid": true,
    "radius": 1.5,
    "model": {
      "objects": [
        // --- TABLERO DE LA MESA ---
        {
          "name": "table_top",
          "geometry": { "type": "Box" },
          "scale": { "x": 4, "y": 0.3, "z": 2.5 },
          "material": { "color": 0x8B4513 },
          "position": { "x": 0, "y": 2.5, "z": 0 }
        },
        // --- PATAS DE LA MESA ---
        {
          "name": "table_leg_1",
          "geometry": { "type": "Cylinder", "radius": 0.2, "height": 2.5 },
          "material": { "color": 0x8B4513 },
          "position": { "x": -1.7, "y": 1.25, "z": -1.0 }
        },
        {
          "name": "table_leg_2",
          "geometry": { "type": "Cylinder", "radius": 0.2, "height": 2.5 },
          "material": { "color": 0x8B4513 },
          "position": { "x": 1.7, "y": 1.25, "z": -1.0 }
        },
        {
          "name": "table_leg_3",
          "geometry": { "type": "Cylinder", "radius": 0.2, "height": 2.5 },
          "material": { "color": 0x8B4513 },
          "position": { "x": -1.7, "y": 1.25, "z": 1.0 }
        },
        {
          "name": "table_leg_4",
          "geometry": { "type": "Cylinder", "radius": 0.2, "height": 2.5 },
          "material": { "color": 0x8B4513 },
          "position": { "x": 1.7, "y": 1.25, "z": 1.0 }
        }
      ]
    }
},
antique_lamppost: {
    "icon": "💡",
    "name": "Farola Antigua (Pequeña)",
    "isSolid": true,
    "radius": 0.27,
    "model": {
      "objects": [
        // --- BASE DE LA FAROLA ---
        // Modelo escalado a 1/3 de su tamaño original.
        {
          "name": "base_bottom",
          "geometry": { "type": "Cylinder", "radiusTop": 0.27, "radiusBottom": 0.27, "height": 0.13, "radialSegments": 16 },
          "material": { "color": 0x2C3E50 },
          "position": { "x": 0, "y": 0.07, "z": 0 }
        },
        {
          "name": "base_mid",
          "geometry": { "type": "Cylinder", "radiusTop": 0.2, "radiusBottom": 0.23, "height": 0.27, "radialSegments": 16 },
          "material": { "color": 0x34495E },
          "position": { "x": 0, "y": 0.27, "z": 0 }
        },

        // --- POSTE PRINCIPAL ---
        {
          "name": "post",
          "geometry": { "type": "Cylinder", "radiusTop": 0.08, "radiusBottom": 0.08, "height": 4, "radialSegments": 12 },
          "material": { "color": 0x34495E },
          "position": { "x": 0, "y": 2.4, "z": 0 }
        },

        // --- SECCIÓN DE LA LINTERNA ---
        {
          "name": "lantern_support",
          "geometry": { "type": "Box", "width": 0.13, "height": 0.5, "depth": 0.13 },
          "material": { "color": 0x2C3E50 },
          "position": { "x": 0, "y": 4.65, "z": 0 }
        },
        {
          "name": "lantern_roof",
          "geometry": { "type": "Cylinder", "radiusTop": 0, "radiusBottom": 0.4, "height": 0.27, "radialSegments": 8 },
          "material": { "color": 0x2C3E50 },
          "position": { "x": 0, "y": 5.03, "z": 0 }
        },
        {
          "name": "lantern_case",
          "geometry": { "type": "Box", "width": 0.5, "height": 0.6, "depth": 0.5 },
          "material": { "color": 0xF1C40F, "transparent": true, "opacity": 0.2 },
          "position": { "x": 0, "y": 4.6, "z": 0 }
        },

        // --- LUZ INTERIOR ---
        {
          "name": "light_bulb",
          "geometry": { "type": "Sphere", "radius": 0.17, "widthSegments": 16, "heightSegments": 16 },
          "material": { "color": 0xF1C40F, "emissive": 0xF1C40F, "emissiveIntensity": 2 },
          "position": { "x": 0, "y": 4.6, "z": 0 }
        }
      ]
    }
},      
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
                        scale: { x: 5, y: 5, z: 0.3 }
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
}, 
 
luxury_fountain: {
    "icon": "⛲",
    "name": "Fuente Ornamental",
    "isSolid": true,
    "radius": 4,
    "model": {
      "objects": [
        // --- BASE DE LA FUENTE ---
        {
          "name": "fountain_base",
          "geometry": { "type": "Cylinder", "radius": 4, "height": 1, "radialSegments": 24 },
          "material": { "color": 0x9E9E9E },
          "position": { "x": 0, "y": 0.5, "z": 0 }
        },
        // --- PEDESTAL CENTRAL ---
        {
          "name": "fountain_pedestal",
          "geometry": { "type": "Cylinder", "radius": 1, "height": 3, "radialSegments": 16 },
          "material": { "color": 0x9E9E9E },
          "position": { "x": 0, "y": 2.5, "z": 0 }
        },
        // --- CUENCO SUPERIOR ---
        {
          "name": "fountain_basin",
          "geometry": { "type": "Cylinder", "radius": 2.5, "height": 1.5, "radialSegments": 20 },
          "material": { "color": 0x9E9E9E },
          "position": { "x": 0, "y": 4.75, "z": 0 }
        },
        // --- AGUA EN EL CUENCO ---
        {
          "name": "basin_water",
          "geometry": { "type": "Cylinder", "radius": 2.4, "height": 1, "radialSegments": 20 },
          "material": { "color": 0x4FC3F7, "transparent": true, "opacity": 0.75 },
          "position": { "x": 0, "y": 4.8, "z": 0 }
        },
        // --- CHORRO DE AGUA (Simulado con un cono) ---
        {
          "name": "water_spray",
          "geometry": { "type": "Cylinder", "radiusTop": 1.5, "radiusBottom": 0.1, "height": 2.5 },
          "material": { "color": 0xADD8E6, "transparent": true, "opacity": 0.6 },
          "position": { "x": 0, "y": 6.5, "z": 0 }
        }
      ]
    }
},
confluence_shelf: {
    "icon": "🌱",
    "name": "Estantería Confluencia (Y)",
    "isSolid": true,
    "radius": 1.8,
    "model": {
      "objects": [
        // --- Estructura principal en forma de Y ---
        // El "tronco" de la Y
        {
          "name": "y_stem",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 2.5, "z": 0.4 },
          "material": { "color": 0x333333 }, // Un gris muy oscuro, casi negro
          "position": { "x": 0, "y": 1.25, "z": 0 }
        },
        // La rama izquierda de la Y
        {
          "name": "y_branch_left",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 2.5, "z": 0.4 },
          "material": { "color": 0x333333 },
          "position": { "x": -0.8, "y": 3.4, "z": 0 },
          "rotation": { "x": 0, "y": 0, "z": 0.6 } // Rotación para crear la forma de Y
        },
        // La rama derecha de la Y
        {
          "name": "y_branch_right",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 2.5, "z": 0.4 },
          "material": { "color": 0x333333 },
          "position": { "x": 0.8, "y": 3.4, "z": 0 },
          "rotation": { "x": 0, "y": 0, "z": -0.6 } // Rotación inversa a la otra rama
        },

        // --- Estantes horizontales ---
        // Se insertan en la estructura
        {
          "name": "shelf_bottom",
          "geometry": { "type": "Box" },
          "scale": { "x": 3.5, "y": 0.15, "z": 1.2 },
          "material": { "color": 0x9D6F4F }, // Tono madera
          "position": { "x": 0, "y": 1.5, "z": 0.2 }
        },
        {
          "name": "shelf_top",
          "geometry": { "type": "Box" },
          "scale": { "x": 3, "y": 0.15, "z": 1.2 },
          "material": { "color": 0x9D6F4F },
          "position": { "x": 0, "y": 2.8, "z": 0.2 }
        }
      ]
    }
},
casa_familiar: {
    "icon": "🏠",
    "name": "Casa Familiar",
    "isSolid": true,
    "radius": 15,
    "model": {
      "objects": [
        // --- BASE / SUELO DE LA CASA ---
        {
          "name": "floor",
          "geometry": { "type": "Box" },
          "scale": { "x": 22, "y": 0.2, "z": 16 },
          "material": { "color": 0xC2B280 }, // Un tono de madera clara o baldosa
          "position": { "x": 0, "y": 0.1, "z": 0 }
        },

        // --- PUERTA PRINCIPAL (Estilo Edificio) ---
        {
          "name": "main_door",
          "geometry": { "type": "Box" },
          "scale": { "x": 5, "y": 4, "z": 0.3 }, // Altura ajustada a 4m
          "material": { "color": 0x8B4513 },
          "position": { "x": 0, "y": 2, "z": 7.85 } // Posicionada en la pared sur
        },

        // --- PAREDES EXTERIORES (Altura 4m) ---
        {
          "name": "wall_south_left",
          "geometry": { "type": "Box" },
          "scale": { "x": 8.5, "y": 4, "z": 0.4 },
          "material": { "color": 0xEAEAEA },
          "position": { "x": -6.75, "y": 2, "z": 7.8 }
        },
        {
          "name": "wall_south_right",
          "geometry": { "type": "Box" },
          "scale": { "x": 8.5, "y": 4, "z": 0.4 },
          "material": { "color": 0xEAEAEA },
          "position": { "x": 6.75, "y": 2, "z": 7.8 }
        },
        {
          "name": "wall_north",
          "geometry": { "type": "Box" },
          "scale": { "x": 22, "y": 4, "z": 0.4 },
          "material": { "color": 0xEAEAEA },
          "position": { "x": 0, "y": 2, "z": -7.8 }
        },
        {
          "name": "wall_west",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 4, "z": 16 },
          "material": { "color": 0xEAEAEA },
          "position": { "x": -10.8, "y": 2, "z": 0 }
        },
        {
          "name": "wall_east",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 4, "z": 16 },
          "material": { "color": 0xEAEAEA },
          "position": { "x": 10.8, "y": 2, "z": 0 }
        },

        // --- PAREDES INTERIORES (DIVISIÓN DE HABITACIONES) ---
        // Pared que separa el salón de la habitación izquierda
        {
          "name": "divider_living_room_left_1",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 4, "z": 5 },
          "material": { "color": 0xF5F5F5 },
          "position": { "x": -3, "y": 2, "z": 5.3 }
        },
        {
          "name": "divider_living_room_left_2",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 4, "z": 8 },
          "material": { "color": 0xF5F5F5 },
          "position": { "x": -3, "y": 2, "z": -3.8 }
        },
        // Pared que divide las dos habitaciones de la derecha
        {
          "name": "divider_right_bedrooms",
          "geometry": { "type": "Box" },
          "scale": { "x": 8, "y": 4, "z": 0.4 },
          "material": { "color": 0xF5F5F5 },
          "position": { "x": 6.8, "y": 2, "z": 0 }
        },
        // Pared que separa el salón de las habitaciones derechas
        {
          "name": "divider_living_room_right",
          "geometry": { "type": "Box" },
          "scale": { "x": 0.4, "y": 4, "z": 13 },
          "material": { "color": 0xF5F5F5 },
          "position": { "x": 2.8, "y": 2, "z": -1.3 }
        }
      ]
    }
},
flower_pot: {
    "icon": "🪴",
    "name": "Maceta con Flores",
    "isSolid": true,
    "radius": 0.8,
    "model": {
      "objects": [
        // --- MACETA ---
        {
          "name": "pot",
          "geometry": { "type": "Cylinder", "radiusTop": 0.8, "radiusBottom": 0.6, "height": 1.2, "radialSegments": 12 },
          "material": { "color": 0xD2691E }, // Color terracota
          "position": { "x": 0, "y": 0.6, "z": 0 }
        },
        // --- TIERRA ---
        {
          "name": "soil",
          "geometry": { "type": "Cylinder", "radius": 0.75, "height": 0.2 },
          "material": { "color": 0x654321 }, // Color tierra oscura
          "position": { "x": 0, "y": 1.1, "z": 0 }
        },
        // --- TALLO ---
        {
          "name": "stem",
          "geometry": { "type": "Cylinder", "radius": 0.05, "height": 1.5 },
          "material": { "color": 0x228B22 }, // Verde tallo
          "position": { "x": 0, "y": 1.95, "z": 0 }
        },
        // --- CENTRO DE LA FLOR ---
        {
          "name": "flower_center",
          "geometry": { "type": "Sphere", "radius": 0.3 },
          "material": { "color": 0xFFD700 }, // Amarillo dorado
          "position": { "x": 0, "y": 2.8, "z": 0 }
        },
        // --- PÉTALOS ---
        { "name": "petal_1", "geometry": { "type": "Sphere", "radius": 0.4 }, "material": { "color": 0xFF1493 }, "position": { "x": 0.5, "y": 2.8, "z": 0 } },
        { "name": "petal_2", "geometry": { "type": "Sphere", "radius": 0.4 }, "material": { "color": 0xFF1493 }, "position": { "x": -0.5, "y": 2.8, "z": 0 } },
        { "name": "petal_3", "geometry": { "type": "Sphere", "radius": 0.4 }, "material": { "color": 0xFF1493 }, "position": { "x": 0, "y": 2.8, "z": 0.5 } },
        { "name": "petal_4", "geometry": { "type": "Sphere", "radius": 0.4 }, "material": { "color": 0xFF1493 }, "position": { "x": 0, "y": 2.8, "z": -0.5 } }
      ]
    }
},
potted_tropical_plant: {
    "icon": "🪴",
    "name": "Planta Tropical en Maceta",
    "isSolid": true,
    "radius": 1.2,
    "model": {
      "objects": [
        // --- La Maceta ---
        // Usamos un cilindro con radios diferentes para que sea más ancha arriba que abajo.
        {
          "name": "flower_pot",
          "geometry": { "type": "Cylinder", "radiusTop": 1.2, "radiusBottom": 0.8, "height": 1.5, "radialSegments": 16 },
          "material": { "color": 0xCD853F }, // Un color similar a la terracota
          "position": { "x": 0, "y": 0.75, "z": 0 }
        },
        // --- La Tierra ---
        // Un cilindro plano y oscuro dentro de la maceta.
        {
          "name": "soil",
          "geometry": { "type": "Cylinder", "radiusTop": 1.1, "radiusBottom": 1.1, "height": 0.2, "radialSegments": 16 },
          "material": { "color": 0x5D4037 }, // Marrón oscuro para la tierra
          "position": { "x": 0, "y": 1.4, "z": 0 } // Justo en el borde superior de la maceta
        },
        // --- El Tallo ---
        {
          "name": "plant_stem",
          "geometry": { "type": "Cylinder", "radius": 0.1, "height": 1.5 },
          "material": { "color": 0x2E7D32 }, // Verde oscuro
          "position": { "x": 0, "y": 2.2, "z": 0 }
        },
        // --- Las Hojas (cajas aplanadas y rotadas) ---
        {
          "name": "leaf_1",
          "geometry": { "type": "Box" },
          "scale": { "x": 1.5, "y": 0.1, "z": 0.8 },
          "material": { "color": 0x4CAF50 }, // Verde vibrante
          "position": { "x": 0.7, "y": 2.8, "z": 0 },
          "rotation": { "x": 0, "y": 0.3, "z": -0.5 }
        },
        {
          "name": "leaf_2",
          "geometry": { "type": "Box" },
          "scale": { "x": 1.5, "y": 0.1, "z": 0.8 },
          "material": { "color": 0x4CAF50 },
          "position": { "x": -0.7, "y": 2.5, "z": 0.2 },
          "rotation": { "x": 0, "y": -0.3, "z": 0.5 }
        },
        {
          "name": "leaf_3",
          "geometry": { "type": "Box" },
          "scale": { "x": 1.2, "y": 0.1, "z": 0.7 },
          "material": { "color": 0x4CAF50 },
          "position": { "x": 0, "y": 3.0, "z": -0.6 },
          "rotation": { "x": 0.5, "y": 0.1, "z": 0 }
        },
        {
          "name": "leaf_4",
          "geometry": { "type": "Box" },
          "scale": { "x": 1.4, "y": 0.1, "z": 0.8 },
          "material": { "color": 0x4CAF50 },
          "position": { "x": 0.2, "y": 2.2, "z": 0.7 },
          "rotation": { "x": -0.5, "y": -0.2, "z": 0 }
        }
      ]
    }
} 
    },
    customEntities: {}
};


// =======================================================================
// === UTILIDAD PARA CREAR MODELOS 3D (ACTUALIZADA) ======================
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

            // Se normalizan los nombres para que CylinderGeometry pueda crear conos
            if (geoType.includes('Cylinder')) {
                geometry = new THREE.CylinderGeometry(geoParams.radiusTop ?? 0, geoParams.radiusBottom ?? geoParams.radius, geoParams.height, geoParams.radialSegments);
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
        
        if (part.name) mesh.name = part.name;
        if (part.position) mesh.position.set(part.position.x || 0, part.position.y || 0, part.position.z || 0);
        
        mesh.castShadow = true;
        group.add(mesh);
    });

    return group;
}