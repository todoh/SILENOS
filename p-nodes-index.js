const pNodeDefinitions = {
    // --- NUEVO NODO ---
    initiator: {
        title: '🚀 Iniciador',
        inputs: 0, // No tiene entradas, es un punto de partida.
        outputs: 1,
        content: `<span>Punto de inicio de la ejecución.</span>`,
        process: () => {
            // Envía una señal 'true' para activar el siguiente nodo.
            return true;
        }
    },
    // --- NODO MODIFICADO ---
    text_variable: {
        title: '📝 Variable de Texto',
        inputs: 1, // Ahora necesita una señal para activarse.
        outputs: 1,
        content: `<input type="text" data-save="value" placeholder="Escribe algo..." value="un perro con un sombrero">`,
        process: (pNode, pInputs) => {
            // Cuando se activa, ignora la señal de entrada y devuelve su propio valor.
            return pNode.element.querySelector('input').value;
        }
    },
    // --- NUEVO NODO ---
    await_delay: {
        title: '⏳ Esperar (Await)',
        inputs: 1,
        outputs: 1,
        content: `<span>Retrasar señal por: </span><input type="number" data-save="delay" value="1000" style="width: 60px;"> ms`,
        process: async (pNode, pInputs) => {
            const inputValue = pInputs[0];
            const delay = parseInt(pNode.element.querySelector('input[data-save="delay"]').value, 10) || 1000;
            
            // Pausa la ejecución por el tiempo especificado.
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Después de la pausa, deja pasar el valor original.
            return inputValue;
        }
    },
    uppercase: {
        title: 'Abc ➜ ABC',
        inputs: 1,
        outputs: 1,
        content: `<span>Convierte el texto a mayúsculas.</span>`,
        process: (pNode, pInputs) => pInputs[0] ? String(pInputs[0]).toUpperCase() : ''
    },
    suffix: {
        title: 'Añadir Sufijo',
        inputs: 1,
        outputs: 1,
        content: `<input type="text" data-save="value" placeholder="Sufijo..." value="!">`,
        process: (pNode, pInputs) => {
            const pSuffix = pNode.element.querySelector('input').value;
            return pInputs[0] ? `${pInputs[0]}${pSuffix}` : pSuffix;
        }
    },
    log: {
        title: '➜ Mostrar Resultado',
        inputs: 1,
        outputs: 0,
        content: `<span>Muestra la entrada en el panel de salida.</span>`,
        process: (pNode, pInputs) => {
            const outputDiv = document.getElementById('p-output');
            const input = pInputs[0];
            let contentToLog;

            // Si la entrada es un objeto y no es nulo, lo formatea como JSON.
            if (typeof input === 'object' && input !== null) {
                // JSON.stringify con null y 2 formatea el JSON para que sea legible.
                contentToLog = `<pre contenteditable="true" >${JSON.stringify(input, null, 2)}</pre>`;
            } else {
                // Si es texto, número, etc., lo muestra directamente.
                contentToLog = input || 'N/A';
            }
            
            outputDiv.innerHTML += `<div style="margin-bottom: 8px;">[${pNode.id}]: ${contentToLog}</div>`;
        }
    },
    generacion_imagen: {
        title: '🖼️ Generación de Imagen',
        inputs: 1,
        outputs: 1,
        content: `<input type="text" data-save="prompt" placeholder="Añadir contexto o estilo (ej: foto realista)">`,
        process: async (pNode, pInputs) => {
            const pOutputDiv = document.getElementById('p-output');
            const promptContexto = pNode.element.querySelector('input[data-save="prompt"]').value.trim();
            const promptsEntrada = pInputs[0];

            if (!promptsEntrada || typeof promptsEntrada !== 'string') {
                pOutputDiv.innerHTML += `<p style="color: orange;">Advertencia: El nodo de Generación de Imagen necesita una cadena de texto en su entrada.</p>`;
                return null;
            }
            
            const promptsIndividuales = promptsEntrada.split('@').map(p => p.trim()).filter(p => p.length > 0);
            
            if (promptsIndividuales.length === 0) {
                pOutputDiv.innerHTML += `<p style="color: orange;">Advertencia: La entrada no contenía prompts válidos.</p>`;
                return null;
            }

            pOutputDiv.innerHTML += `<p>🚀 Lanzando ${promptsIndividuales.length} peticiones de imagen en paralelo...</p>`;
            
            const promesasDeImagenes = promptsIndividuales.map(prompt => {
                const promptFinal = `${prompt} ${promptContexto}`.trim();
                return pGenerarImagenIA(promptFinal, pOutputDiv);
            });
            
            const urlsDeImagenes = await Promise.all(promesasDeImagenes);
            
            return urlsDeImagenes.filter(url => url);
        }
    },
  
generador_datos: {
    title: '🧩 Generador de Datos',
    inputs: 1,
    outputs: 1,
    content: `<span>Genera datos, imágenes y embeddings a partir de un texto.</span>`,
    process: async (pNode, pInputs) => {
        const pOutputDiv = document.getElementById('p-output');
        const peticionResumida = pInputs[0];

        if (!peticionResumida || typeof peticionResumida !== 'string') {
            const errorMsg = "Error: El nodo Generador de Datos necesita un texto de entrada.";
            pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
            return errorMsg;
        }

        if (typeof opcionesEtiqueta === 'undefined' || typeof agregarPersonajeDesdeDatos === 'undefined') {
            const errorMsg = "Error crítico: Funciones o variables globales requeridas no están disponibles.";
            console.error(errorMsg);
            pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
            return errorMsg;
        }

        pOutputDiv.innerHTML += `<p><strong>Silenos:</strong> Iniciando pipeline de generación creativa...</p>`;

        try {
            // ===== INICIO DEL BLOQUE RESTAURADO =====
            const etiquetasValidas = opcionesEtiqueta
                .map(o => o.valor)
                .filter(v => v !== 'indeterminado' && v !== 'personalizar')
                .join(', ');

            const promptGeneracion = `
                **Tarea Principal:** Basado en la siguiente solicitud, genera una lista de uno o más datos estructurados de forma creativa.
                **Solicitud del Usuario:** "${peticionResumida}"

                **Instrucciones:**
                - Produce contenido original y detallado que se ajuste a la petición.
                - Para CADA dato generado, proporciona: "nombre", "descripcion" (detallada, para el embedding), "promptVisual" (una descripción para generar una imagen detallada y repetible del dato; si es una persona, detalla con exactitud su morfología, TODOS los rasgos de su cara y su vestimenta), y la "etiqueta" MÁS APROPIADA de la lista [${etiquetasValidas}].

                **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un objeto JSON válido que sea un array de datos. Cada objeto en el array debe tener la estructura completa:
                { "nombre": "...", "descripcion": "...", "promptVisual": "...", "etiqueta": "..." }
            `;
            
            pOutputDiv.innerHTML += `<p>🧠 Generando datos textuales para: "${peticionResumida}"</p>`;
            let datosGenerados = await pLlamarIAGenerica(promptGeneracion, "gemini-2.5-flash", pOutputDiv);

            if (!Array.isArray(datosGenerados)) {
                if (typeof datosGenerados === 'object' && datosGenerados !== null) {
                    datosGenerados = [datosGenerados];
                } else {
                    throw new Error("La IA no devolvió un array de objetos válido.");
                }
            }
            // ===== FIN DEL BLOQUE RESTAURADO =====

            pOutputDiv.innerHTML += `<p>✅ Se han generado ${datosGenerados.length} perfiles de datos. Procesando cada uno...</p>`;
            let totalCreados = 0;

            for (const dato of datosGenerados) {
                if (!dato.nombre || !dato.descripcion || !dato.promptVisual) continue;
                
                pOutputDiv.innerHTML += `<hr><p>➡️ Procesando: <strong>${dato.nombre}</strong></p>`;

                const imagenUrl = await pGenerarImagenIA(dato.promptVisual, pOutputDiv, false);
                const embeddingVector = await pGenerarEmbedding(dato.descripcion, pOutputDiv);

                const datosCompletos = {
                    ...dato,
                    imagen: imagenUrl || '',
                    embedding: embeddingVector || [],
                };

                agregarPersonajeDesdeDatos(datosCompletos);
                pOutputDiv.innerHTML += `<p style="color: green; font-weight: bold;">✔️ Dato "${dato.nombre}" creado y añadido a la aplicación.</p>`;
                totalCreados++;
            }

            if (typeof reinicializarFiltrosYActualizarVista === 'function') {
                reinicializarFiltrosYActualizarVista();
            }
            
            const successMsg = `Proceso completado. Se crearon ${totalCreados} datos nuevos.`;
            pOutputDiv.innerHTML += `<hr><p style="font-weight: bold;">${successMsg}</p>`;
            return successMsg;

        } catch (error) {
            const errorMsg = `Fallo el proceso de generación: ${error.message}`;
            pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
            return errorMsg;
        }
    }
}
,
generador_personajesyobjetos: {
    title: '🧩 Generador de Personajes y Objetos',
    inputs: 1,
    outputs: 1,
    content: `<span>Genera datos, imágenes y embeddings a partir de un texto.</span>`,
   
    process: async (pNode, pInputs) => {
        // La única línea que necesitas. pInputs[0] es el texto que entra al nodo.
        return generarDatosConImagenAvanzada(pInputs[0]);
    }
}
, gemini_text_request: {
        title: '🤖 Petición de Texto a Gemini',
        inputs: 1,
        outputs: 1,
        content: `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label for="model-select">Modelo:</label>
                <select data-save="model">
                   <option value="gemini-2.5-flash">2.5 Flash</option>
                    <option value="gemini-2.5-flash-lite">2.5 Flash Lite</option>
                    <option value="gemini-2.5-pro">2.5 Pro</option>
                     <option value="gemini-2.0-flash">2.0 Flash</option>
                    <option value="gemini-2.0-flash-lite">2.0 Flash Lite</option>
                    <option value="gemini-2.0-pro">2.0 Pro</option>
                </select>
                <label for="system-prompt">Prompt de Sistema (opcional):</label>
                <textarea data-save="system_prompt" rows="3" placeholder="Ej: Eres un asistente experto en..."></textarea>
            </div>
        `,
        process: async (pNode, pInputs) => {
            const systemPrompt = pNode.element.querySelector('[data-save="system_prompt"]').value;
            const model = pNode.element.querySelector('[data-save="model"]').value;
            const userPrompt = pInputs[0] || '';
            
            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`.trim();
            
            // Llama a la función de la nueva librería
            const result = await pCallGeminiApi(fullPrompt, model, false);
            return result; // Devuelve la respuesta de texto
        }
    },

     gemini_json_request: {
        title: '📄 Petición de JSON a Gemini',
        inputs: 1,
        outputs: 1,
        content: `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label for="model-select">Modelo:</label>
                <select data-save="model">                  
                 <option value="gemini-2.5-flash">2.5 Flash</option>
                    <option value="gemini-2.5-flash-lite">2.5 Flash Lite</option>
                    <option value="gemini-2.5-pro">2.5 Pro</option>
                     <option value="gemini-2.0-flash">2.0 Flash</option>
                    <option value="gemini-2.0-flash-lite">2.0 Flash Lite</option>
                    <option value="gemini-2.0-pro">2.0 Pro</option>
                </select>
                <label for="system-prompt">Prompt de Sistema:</label>
                <textarea data-save="system_prompt" rows="3" placeholder="Ej: Devuelve un JSON con la clave 'respuesta'..."></textarea>
            </div>
        `,
        process: async (pNode, pInputs) => {
            const systemPrompt = pNode.element.querySelector('[data-save="system_prompt"]').value;
            const model = pNode.element.querySelector('[data-save="model"]').value;
            const userPrompt = pInputs[0] || '';

            const fullPrompt = `${systemPrompt}\n\nDatos de entrada: ${JSON.stringify(userPrompt)}`.trim();

            // Llama a la función de la nueva librería pidiendo un JSON
            const result = await pCallGeminiApi(fullPrompt, model, true);
            return result; // Devuelve el objeto JSON
        }
    },    salida_a_datos: {
        title: '💾 Salida a Datos',
        inputs: 1,
        outputs: 0,
        content: `<span>Recibe un JSON y lo guarda directamente en la aplicación.</span>`,
        process: (pNode, pInputs) => {
            const pOutputDiv = document.getElementById('p-output');
            const datosEntrada = pInputs[0];

            if (!datosEntrada || typeof datosEntrada !== 'object') {
                const errorMsg = "Error: El nodo 'Salida a Datos' necesita un objeto JSON (o un array de ellos) en su entrada.";
                if(pOutputDiv) pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
                console.error(errorMsg);
                return;
            }

            const datosArray = Array.isArray(datosEntrada) ? datosEntrada : [datosEntrada];

            if (typeof agregarPersonajeDesdeDatos === 'undefined') {
                const errorMsg = "Error crítico: La función global 'agregarPersonajeDesdeDatos' no está disponible.";
                if(pOutputDiv) pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
                console.error(errorMsg);
                return;
            }

            if(pOutputDiv) pOutputDiv.innerHTML += `<p><strong>Salida a Datos:</strong> Iniciando guardado para ${datosArray.length} objeto(s).</p>`;
            let totalCreados = 0;

            try {
                for (const dato of datosArray) {
                    if (!dato.nombre) {
                        if(pOutputDiv) pOutputDiv.innerHTML += `<p style="color: orange;">Advertencia: Se omitió un objeto por faltar el campo 'nombre'.</p>`;
                        continue;
                    }

                    if(pOutputDiv) pOutputDiv.innerHTML += `<hr><p>➡️ Guardando directamente: <strong>${dato.nombre}</strong></p>`;

                    // No hay llamadas a la API. Montamos el objeto con valores por defecto si faltan.
                    const datosCompletos = {
                        ...dato,
                        imagen: dato.imagen || '', // Usa la imagen existente o un valor por defecto.
                        embedding: dato.embedding || [], // Usa el embedding existente o uno por defecto.
                    };

                    agregarPersonajeDesdeDatos(datosCompletos);
                    if(pOutputDiv) pOutputDiv.innerHTML += `<p style="color: green; font-weight: bold;">✔️ Dato "${dato.nombre}" añadido directamente.</p>`;
                    totalCreados++;
                }

                if (typeof reinicializarFiltrosYActualizarVista === 'function') {
                    reinicializarFiltrosYActualizarVista();
                }
                
                if(pOutputDiv) pOutputDiv.innerHTML += `<hr><p style="font-weight: bold;">Proceso completado. Se añadieron ${totalCreados} datos.</p>`;

            } catch (error) {
                const errorMsg = `Fallo en 'Salida a Datos': ${error.message}`;
                if(pOutputDiv) pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
                console.error(errorMsg, error);
            }
        }
    },
    // --- NODO AÑADIDO ---
    json_add_field: {
        title: '➕ Añadir Campo a JSON',
        inputs: 2,
        inputNames: ["JSON Base", "Valor"],
        outputs: 1,
        content: `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label for="json-key">Nombre del Campo (Clave):</label>
                <input type="text" data-save="key" placeholder="Ej: nombre">
            </div>
        `,
        process: (pNode, pInputs) => {
            const [jsonInput, value] = pInputs;
            // CORRECCIÓN: Se usa .trim() para eliminar espacios accidentales.
            const key = pNode.element.querySelector('[data-save="key"]').value.trim();
            const pOutputDiv = document.getElementById('p-output');

            if (!key) {
                if(pOutputDiv) pOutputDiv.innerHTML += `<p style="color: orange;">Advertencia en nodo [${pNode.id}]: El nombre del campo (clave) no puede estar vacío.</p>`;
                return (typeof jsonInput === 'object' && jsonInput !== null) ? jsonInput : {};
            }

            const baseObject = (typeof jsonInput === 'object' && jsonInput !== null) ? jsonInput : {};
            
            const result = {
                ...baseObject,
                [key]: value
            };

            return result;
        }
    
    },json_to_text: {
        title: '📄 JSON a Texto',
        inputs: 1,
        outputs: 1,
        content: `<span>Convierte un objeto JSON a texto plano (string) con formato.</span>`,
        process: (pNode, pInputs) => {
            const jsonInput = pInputs[0];
            if (typeof jsonInput !== 'object' || jsonInput === null) {
                return ''; // Devuelve una cadena vacía si la entrada no es un objeto válido.
            }
            // JSON.stringify con los argumentos null y 2 formatea el string con indentación.
            return JSON.stringify(jsonInput, null, 2);
        }
    }
,  
    
    json_render_3d: {
        "title": "📦 Render 3D desde JSON (Completo)",
        "inputs": 1,
        "outputs": 1,
        "content": "<span>Renderiza un modelo 3D desde JSON. Soporta todas las geometrías estándar de Three.js y auto-detecta el formato de entrada.</span>",
        "process": async (pNode, pInputs) => {
            let sceneData = pInputs[0];
            const pOutputDiv = document.getElementById('p-output');

            // --- Validación Inicial y Autocorrección de Formato ---
            if (typeof THREE === 'undefined') {
                const errorMsg = "Error: La biblioteca Three.js no está cargada.";
                if (pOutputDiv) pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
                return null;
            }

            if (typeof sceneData === 'string' && sceneData.trim().startsWith('{')) {
                try {
                    sceneData = JSON.parse(sceneData);
                } catch (e) {
                    const errorMsg = `Error en [${pNode.id}]: La entrada parece ser JSON pero no se pudo procesar. Error: ${e.message}`;
                    if (pOutputDiv) pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
                    return null;
                }
            }

            let objectsArray = null;
            if (sceneData && Array.isArray(sceneData.objects)) {
                objectsArray = sceneData.objects;
            } else if (sceneData && Array.isArray(sceneData.parts)) {
                objectsArray = sceneData.parts;
            }

            if (!objectsArray) {
                const errorMsg = `Error en [${pNode.id}]: La entrada debe ser un JSON con una propiedad 'objects' o 'parts' que sea un array.`;
                if (pOutputDiv) pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
                return null;
            }
            
            // --- Configuración de la Escena 3D ---
            const width = 512;
            const height = 512;
            const scene = new THREE.Scene();
            // Se elimina scene.background para tener fondo transparente
            const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            renderer.setSize(width, height);
            renderer.shadowMap.enabled = true;

            // --- Iluminación ---
            scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
            directionalLight.position.set(5, 10, 7.5);
            directionalLight.castShadow = true;
            scene.add(directionalLight);

            // --- Construcción del Modelo (Lógica con Todas las Geometrías) ---
            const modelGroup = new THREE.Group();
            try {
                objectsArray.forEach(obj => {
                    let geometryType, geometryParams, materialColor, materialRoughness, materialMetalness;

                    if (obj.material && typeof obj.geometry === 'object') {
                        geometryType = obj.geometry.type;
                        geometryParams = obj.geometry;
                        materialColor = obj.material.color;
                        materialRoughness = obj.material.roughness;
                        materialMetalness = obj.material.metalness;
                    } else {
                        geometryType = obj.geometry;
                        geometryParams = obj.geometryParams || {};
                        materialColor = obj.color;
                        materialRoughness = obj.roughness;
                        materialMetalness = obj.metalness;
                    }

                    if (!geometryType || !materialColor) {
                        console.warn(`Saltando objeto "${obj.name}" por falta de 'geometry' o 'color'/'material'.`);
                        return;
                    }

                    let geometry;
                    switch (geometryType) {
                        case "Box": case "BoxGeometry":
                            geometry = new THREE.BoxGeometry(geometryParams.width || 1, geometryParams.height || 1, geometryParams.depth || 1);
                            break;
                        case "Sphere": case "SphereGeometry":
                            geometry = new THREE.SphereGeometry(geometryParams.radius || 1, geometryParams.widthSegments || 32, geometryParams.heightSegments || 16);
                            break;
                        case "Cylinder": case "CylinderGeometry":
                            geometry = new THREE.CylinderGeometry(geometryParams.radiusTop ?? geometryParams.radius ?? 1, geometryParams.radiusBottom ?? geometryParams.radius ?? 1, geometryParams.height || 2, geometryParams.radialSegments || 32);
                            break;
                        case "Cone": case "ConeGeometry":
                            geometry = new THREE.ConeGeometry(geometryParams.radius || 1, geometryParams.height || 2, geometryParams.radialSegments || 32);
                            break;
                        case "Torus": case "TorusGeometry":
                            geometry = new THREE.TorusGeometry(geometryParams.radius || 1, geometryParams.tube || 0.4, geometryParams.radialSegments || 16, geometryParams.tubularSegments || 100);
                            break;
                        case "Icosahedron": case "IcosahedronGeometry":
                            geometry = new THREE.IcosahedronGeometry(geometryParams.radius || 1, geometryParams.detail || 0);
                            break;
                        case "Dodecahedron": case "DodecahedronGeometry":
                             geometry = new THREE.DodecahedronGeometry(geometryParams.radius || 1, geometryParams.detail || 0);
                            break;
                        case "Octahedron": case "OctahedronGeometry":
                             geometry = new THREE.OctahedronGeometry(geometryParams.radius || 1, geometryParams.detail || 0);
                            break;
                        case "Tetrahedron": case "TetrahedronGeometry":
                             geometry = new THREE.TetrahedronGeometry(geometryParams.radius || 1, geometryParams.detail || 0);
                            break;
                        case "Plane": case "PlaneGeometry":
                            geometry = new THREE.PlaneGeometry(geometryParams.width || 1, geometryParams.height || 1);
                            break;
                        case "Circle": case "CircleGeometry":
                            geometry = new THREE.CircleGeometry(geometryParams.radius || 1, geometryParams.segments || 32);
                            break;
                        case "Ring": case "RingGeometry":
                            geometry = new THREE.RingGeometry(geometryParams.innerRadius || 0.5, geometryParams.outerRadius || 1, geometryParams.thetaSegments || 32);
                            break;
                        case "TorusKnot": case "TorusKnotGeometry":
                            geometry = new THREE.TorusKnotGeometry(geometryParams.radius || 1, geometryParams.tube || 0.4, geometryParams.tubularSegments || 100, geometryParams.radialSegments || 16, geometryParams.p || 2, geometryParams.q || 3);
                            break;
                        default:
                            throw new Error(`Geometría desconocida: ${geometryType}`);
                    }
                    
                    const material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(materialColor),
                        roughness: materialRoughness ?? 0.5,
                        metalness: materialMetalness ?? 0.1
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    
                    if(obj.position) mesh.position.set(obj.position.x || 0, obj.position.y || 0, obj.position.z || 0);
                    if(obj.scale) mesh.scale.set(obj.scale.x || 1, obj.scale.y || 1, obj.scale.z || 1);
                    if(obj.rotation) mesh.rotation.set(obj.rotation.x || 0, obj.rotation.y || 0, obj.rotation.z || 0);
                    
                    modelGroup.add(mesh);
                });
            } catch (error) {
                const errorMsg = `Error construyendo el modelo 3D: ${error.message}`;
                if (pOutputDiv) pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
                renderer.dispose();
                return null;
            }
            
            scene.add(modelGroup);

            // --- Encuadre automático de la Cámara (Centrado y con Zoom) ---
            const box = new THREE.Box3().setFromObject(modelGroup);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            if (maxDim > 0) {
                const fov = camera.fov * (Math.PI / 180);
                const cameraDistance = Math.abs(maxDim / Math.tan(fov / 2));
                camera.position.set(
                    center.x,
                    center.y, // Cámara centrada verticalmente
                    center.z + cameraDistance * 1.2 // Más cerca para mayor zoom
                );
            } else {
                camera.position.set(0, 5, 15);
            }
            
            camera.lookAt(center);

            // --- Renderizado y Limpieza ---
            renderer.render(scene, camera);
            const base64Image = renderer.domElement.toDataURL('image/png');

            scene.traverse(object => {
                if (object.isMesh) {
                    object.geometry.dispose();
                    if (object.material.isMaterial) {
                        object.material.dispose();
                    }
                }
            });
            renderer.dispose();

            if (pOutputDiv) pOutputDiv.innerHTML += `<p>✅ Modelo 3D renderizado y capturado como imagen.</p>`;
            return base64Image;
        }
    }

, text_to_json: {
        title: '➡️ Texto a JSON',
        inputs: 1,
        outputs: 1,
        content: `<span>Convierte una cadena de texto JSON en un objeto JSON real.</span>`,
        process: (pNode, pInputs) => {
            const textInput = pInputs[0];
            const pOutputDiv = document.getElementById('p-output');
            if (typeof textInput !== 'string' || !textInput.trim()) {
                return null;
            }
            try {
                // Intenta parsear el texto a JSON.
                return JSON.parse(textInput);
            } catch (error) {
                const errorMsg = `Error en [${pNode.id}]: El texto de entrada no es un JSON válido. ${error.message}`;
                if (pOutputDiv) pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
                return null;
            }
        }
    }
};