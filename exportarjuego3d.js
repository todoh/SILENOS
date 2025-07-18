/**
 * ================================================================
 * EXPORTADOR DE JUEGO 3D INTERACTIVO
 * Genera un archivo HTML autónomo con un motor de juego Three.js.
 * ================================================================
 */

function generarJuego3D() {
    console.log("Iniciando exportación de juego 3D...");

    // --- PASO 1: Recopilar todos los datos necesarios ---

    // Recopilar datos de todos los momentos
    const momentosNodos = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    if (momentosNodos.length === 0) {
        alert("No hay momentos para exportar.");
        return;
    }

    const momentosData = Array.from(momentosNodos).map(nodo => {
        return {
            id: nodo.id,
            titulo: nodo.querySelector('.momento-titulo').textContent,
            descripcion: nodo.dataset.descripcion || "",
            acciones: JSON.parse(nodo.dataset.acciones || '[]'),
            entorno: JSON.parse(nodo.dataset.entorno || '{}'),
            entidades: JSON.parse(nodo.dataset.entidades || '[]'),
        };
    });

    // Recopilar recursos (imágenes de los "Datos")
    const recursosData = {};
    if (window.bibliotecaData && window.bibliotecaData.datos) {
        window.bibliotecaData.datos.forEach(dato => {
            if (dato.imagen) {
                recursosData[dato.nombre] = dato.imagen; // Guardamos el base64
            }
        });
    }

    // Encontrar el momento inicial
    const nodoInicial = document.querySelector('.momento-nodo.inicio');
    const idInicial = nodoInicial ? nodoInicial.id : (momentosNodos.length > 0 ? momentosNodos[0].id : null);

    if (!idInicial) {
        alert("Marca un momento como inicial (con la bandera 🚩) antes de exportar.");
        return;
    }

    // Empaquetar todo en un solo objeto JSON
    const JUEGO_DATA = {
        idInicial,
        momentos: momentosData,
        recursos: recursosData
    };

    // --- PASO 2: Definir el motor de juego como un string ---
    // Este código se inyectará directamente en el HTML final.
    const motorJuegoString = `
        // --- MOTOR DE JUEGO 3D BÁSICO ---
        let scene, camera, renderer, controls;
        const textureLoader = new THREE.TextureLoader();
        const loadedTextures = new Map();
        let entidadesEnEscena = [];

        function init() {
            // Escena
            scene = new THREE.Scene();
            
            // Cámara
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 2, 10);

            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);

            // Controles de cámara (OrbitControls)
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.target.set(0, 1, 0);

            // Cargar texturas de recursos por adelantado
            for (const nombre in JUEGO_DATA.recursos) {
                loadedTextures.set(nombre, textureLoader.load(JUEGO_DATA.recursos[nombre]));
            }

            // Cargar el primer momento
            cargarMomento(JUEGO_DATA.idInicial);

            // Iniciar bucle de animación
            animate();

            // Listener para redimensionar ventana
            window.addEventListener('resize', onWindowResize);
        }

        function limpiarEscena() {
            entidadesEnEscena.forEach(ent => scene.remove(ent));
            entidadesEnEscena = [];
            // También podríamos querer limpiar luces, suelo, etc., si cambian entre escenas
        }

        function cargarMomento(id) {
            limpiarEscena();
            const momento = JUEGO_DATA.momentos.find(m => m.id === id);
            if (!momento) {
                console.error("Momento no encontrado:", id);
                return;
            }

            // Configurar entorno
            const entorno = momento.entorno;
            scene.background = new THREE.Color(entorno.colorCielo || '#87ceeb');

            // Crear suelo (si tiene textura)
            if (entorno.texturaSuelo) {
                const sueloGeo = new THREE.PlaneGeometry(100, 100);
                const sueloTex = textureLoader.load(entorno.texturaSuelo);
                sueloTex.wrapS = sueloTex.wrapT = THREE.RepeatWrapping;
                sueloTex.repeat.set(50, 50);
                const sueloMat = new THREE.MeshBasicMaterial({ map: sueloTex });
                const suelo = new THREE.Mesh(sueloGeo, sueloMat);
                suelo.rotation.x = -Math.PI / 2;
                scene.add(suelo);
                entidadesEnEscena.push(suelo);
            }
            
            // Añadir luz ambiental básica
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambientLight);
            entidadesEnEscena.push(ambientLight);

            // Cargar entidades (sprites)
            momento.entidades.forEach(entData => {
                const textura = loadedTextures.get(entData.recurso);
                if (textura) {
                    const material = new THREE.SpriteMaterial({ map: textura });
                    const sprite = new THREE.Sprite(material);
                    
                    sprite.position.set(entData.pos[0], entData.pos[1], entData.pos[2]);
                    
                    const aspect = textura.image ? textura.image.width / textura.image.height : 1;
                    sprite.scale.set(entData.escala * aspect, entData.escala, 1);

                    scene.add(sprite);
                    entidadesEnEscena.push(sprite);
                }
            });

            // Actualizar la UI
            const uiContainer = document.getElementById('ui-container');
            uiContainer.innerHTML = \`
                <div class="descripcion">$\{momento.descripcion\}</div>
                <div class="acciones">
                    $\{momento.acciones.map(accion => \`
                        <button onclick="cargarMomento('$\{accion.idDestino\}')">$\{accion.textoBoton\}</button>
                    \`).join('')\}
                </div>
            \`;
        }

        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        window.onload = init;
    `;

    // --- PASO 3: Construir el HTML final ---
    const htmlFinal = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aventura Interactiva 3D</title>
    <style>
        body { margin: 0; overflow: hidden; font-family: sans-serif; }
        canvas { display: block; }
        #ui-container {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            max-width: 800px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
        }
        .descripcion { margin-bottom: 15px; line-height: 1.5; }
        .acciones button {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 5px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        }
        .acciones button:hover { background: #2980b9; }
    </style>
</head>
<body>
    <div id="ui-container"></div>

    <!-- Librerías de Three.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

    <!-- Datos del juego -->
    <script>
        const JUEGO_DATA = ${JSON.stringify(JUEGO_DATA, null, 2)};
    </script>

    <!-- Motor del juego -->
    <script>
        ${motorJuegoString}
    </script>
</body>
</html>
    `;

    // --- PASO 4: Descargar el archivo ---
    const blob = new Blob([htmlFinal], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'juego_3d.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("¡Juego 3D exportado con éxito!");
}
