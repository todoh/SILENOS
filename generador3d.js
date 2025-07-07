// =================================================================
// ARCHIVO CORREGIDO: datos/generador3d.js
// Reescrito para asegurar una inicialización correcta y robusta.
// Añade controles de cámara y una escena base mejorada.
// CORRECCIÓN: Los objetos ahora se colocan correctamente sobre el suelo.
// NUEVO: Guarda los datos del modelo junto a la imagen en la galería y permite recargarlos.
// MEJORA SUSTANCIAL: Proceso de generación en 4 fases (Análisis, Creación, Ensamblaje y Refinamiento).
// MEJORA 2: Añadido delay entre llamadas a la API y prompt de ensamblaje mejorado.
// MEJORA 3: Optimización para generar componentes únicos y luego instanciarlos.
// =================================================================

/**
 * Encapsula toda la lógica del generador 3D.
 * Se ejecuta cuando el DOM está completamente cargado.
 */
function setupGenerador3D() {
    // --- Referencias a elementos del DOM ---
    const generateButton3D = document.getElementById('btn-generate-3d');
    const saveButton3D = document.getElementById('btn-save-generation-3d');
    const promptInput3D = document.getElementById('user-prompt-input-3d');
    const renderContainer3D = document.getElementById('render-container-3d');
    const renderCanvas3D = document.getElementById('render-canvas-3d');
    const statusMessage3D = document.getElementById('status-message-3d');
    const generacionesGrid = document.getElementById('generaciones-grid');
    const generacionesContainer = document.getElementById('generaciones-container');
    
    if (!document.getElementById('generador-3d-panel') || !renderContainer3D) {
        return;
    }

    // --- Variables de Three.js y de estado ---
    let scene, camera, renderer, controls;
    let currentModelGroup = null;
    let currentSceneJson = null;

    /**
     * Función de ayuda para crear una pausa.
     * @param {number} ms - Milisegundos a esperar.
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function initThreeJS() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a3b4c);
        scene.fog = new THREE.Fog(0x2a3b4c, 5, 60);

        camera = new THREE.PerspectiveCamera(60, renderContainer3D.clientWidth / renderContainer3D.clientHeight, 0.1, 1000);
        camera.position.set(8, 6, 12);

        renderer = new THREE.WebGLRenderer({ canvas: renderCanvas3D, antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(renderContainer3D.clientWidth, renderContainer3D.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 15, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 100;
        controls.target.set(0, 1, 0);
        controls.update();

        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', onWindowResize, false);
        statusMessage3D.textContent = 'Listo para generar. Introduce tu idea.';
    }

    function onWindowResize() {
        camera.aspect = renderContainer3D.clientWidth / renderContainer3D.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(renderContainer3D.clientWidth, renderContainer3D.clientHeight);
    }

    function clearScene() {
        if (currentModelGroup) {
            scene.remove(currentModelGroup);
            currentModelGroup.traverse(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material.isMaterial) child.material.dispose();
                }
            });
        }
        currentModelGroup = new THREE.Group();
        scene.add(currentModelGroup);
    }

    /**
     * Orquesta el proceso de generación optimizado en 4 fases.
     */
    async function handleGeneration3D() {
        const prompt = promptInput3D.value.trim();
        if (!prompt) {
            showCustomAlert("Por favor, introduce un prompt para generar la escena 3D.");
            return;
        }

        renderContainer3D.classList.add('loading');
        statusMessage3D.style.display = 'block';

        try {
            // --- FASE 1: Deconstrucción y Conteo de Partes ---
            statusMessage3D.textContent = 'Fase 1: Analizando componentes...';
            const deconstructionPrompt = `Analyze the user's request for a "${prompt}" and identify the distinct parts and their quantities. Return a JSON array of objects, each with "partName" (e.g., "chair leg") and "quantity". For "a wooden chair", return [{"partName": "chair leg", "quantity": 4}, {"partName": "chair seat", "quantity": 1}, {"partName": "chair backrest", "quantity": 1}]. Return only the JSON array.`;
            const uniquePartsListJson = await callGeminiAPI(deconstructionPrompt);
            await delay(3500);
            const uniquePartsList = extractJson(uniquePartsListJson);

            if (!Array.isArray(uniquePartsList) || uniquePartsList.length === 0) {
                throw new Error("La IA no pudo descomponer el objeto en partes.");
            }

            // --- FASE 2: Creación de Componentes Únicos ---
            const generatedUniqueParts = {};
            for (const uniquePart of uniquePartsList) {
                const partName = uniquePart.partName;
                statusMessage3D.textContent = `Creando componente único: "${partName}"...`;
                const partGenerationPrompt = `Generate a JSON object for a single 3D part: "${partName}" to be used in a "${prompt}". The JSON must be an object with "partName", "shape", "color", "scale", and optional "details". Set position and rotation to zero, as they will be defined later.`;
                const partJsonText = await callGeminiAPI(partGenerationPrompt);
                await delay(3500);
                generatedUniqueParts[partName] = extractJson(partJsonText);
            }

            // --- FASE 3: Plan de Ensamblaje de Instancias ---
            statusMessage3D.textContent = `Fase 3: Planificando ensamblaje...`;
            const assemblyPrompt = `Create an assembly plan for a "${prompt}". You are given a list of required parts and their quantities: ${JSON.stringify(uniquePartsList)}. You also have the definitions for each unique part: ${JSON.stringify(generatedUniqueParts)}. Your task is to create a final scene array. This array should contain an object for EACH instance required (e.g., 4 objects for 4 legs). Each object must have "partName" (matching a unique part), and its own unique "position" and "rotation". Ensure all parts are physically connected to form a single, coherent object.`;
            const assembledLayoutJson = await callGeminiAPI(assemblyPrompt);
            await delay(3500);
            const assembledLayout = extractJson(assembledLayoutJson);

            // --- FASE 4: Revisión y Refinamiento del Ensamblaje ---
            statusMessage3D.textContent = `Fase 4: Refinando la colocación...`;
            const refinementPrompt = `You are a 3D model quality control inspector. You are given a JSON array representing an assembled 3D model for the prompt "${prompt}". Review the "position" and "rotation" of each part. Fix issues like floating parts, incorrect intersections, or illogical placements to make the model more physically plausible. The parts must be connected. Do not change any properties other than "position" and "rotation". Here is the model to review: ${JSON.stringify(assembledLayout, null, 2)}`;
            const finalLayoutJson = await callGeminiAPI(refinementPrompt);
            const finalLayout = extractJson(finalLayoutJson);

            // --- Renderizado Final ---
            createSceneFromLayout(finalLayout, generatedUniqueParts);

            statusMessage3D.textContent = '¡Escena 3D generada con éxito!';
            setTimeout(() => { statusMessage3D.style.display = 'none'; }, 4000);

        } catch (error) {
            console.error('Error during multi-phase 3D generation:', error);
            statusMessage3D.textContent = `Error en la generación: ${error.message}`;
        } finally {
            renderContainer3D.classList.remove('loading');
        }
    }

    /**
     * Crea la escena 3D a partir de un layout y un mapa de partes únicas.
     * @param {Array<Object>} layout - El plano de ensamblaje final.
     * @param {Object} uniqueParts - El mapa que contiene las definiciones de las partes únicas.
     */
    function createSceneFromLayout(layout, uniqueParts) {
        clearScene();
        currentSceneJson = { layout, uniqueParts }; // Almacena la estructura completa para guardado

        if (!Array.isArray(layout)) {
            throw new Error("El layout de la escena no es un array válido.");
        }

        // Pre-construye las geometrías y materiales para clonarlos eficientemente
        const partPrototypes = {};
        for (const partName in uniqueParts) {
            const partDef = uniqueParts[partName];
            let geometry;
            const d = partDef.details || {};
            switch (partDef.shape) {
                case "box": geometry = new THREE.BoxGeometry(1, 1, 1); break;
                case "sphere": geometry = new THREE.SphereGeometry(0.5, 32, 32); break;
                case "cylinder": geometry = new THREE.CylinderGeometry(d.radiusTop ?? 0.5, d.radiusBottom ?? 0.5, d.height ?? 1, 32); break;
                case "cone": geometry = new THREE.ConeGeometry(0.5, 1, 32); break;
                case "torus": geometry = new THREE.TorusGeometry(d.radius ?? 0.5, d.tube ?? 0.2, 16, 100); break;
                default: console.warn(`Forma desconocida en prototipo: ${partDef.shape}`); continue;
            }
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(partDef.color || "#ffffff"),
                roughness: 0.5, metalness: 0.1
            });
            partPrototypes[partName] = { geometry, material, definition: partDef };
        }

        // Crea las instancias en la escena
        layout.forEach(instance => {
            const proto = partPrototypes[instance.partName];
            if (!proto) {
                console.warn(`Prototipo no encontrado para: ${instance.partName}`);
                return;
            }

            const mesh = new THREE.Mesh(proto.geometry, proto.material); // Reutiliza geometría y material
            
            // La escala se define en la parte única
            mesh.scale.set(proto.definition.scale.x, proto.definition.scale.y, proto.definition.scale.z);

            // Calcula el desplazamiento de altura basado en la escala final
            let heightOffset = 0;
            const scaledBox = new THREE.Box3().setFromObject(mesh);
            heightOffset = (scaledBox.max.y - scaledBox.min.y) / 2;

            mesh.position.set(instance.position.x, instance.position.y + heightOffset, instance.position.z);
            mesh.rotation.set(
                THREE.MathUtils.degToRad(instance.rotation.x),
                THREE.MathUtils.degToRad(instance.rotation.y),
                THREE.MathUtils.degToRad(instance.rotation.z)
            );
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            currentModelGroup.add(mesh);
        });
    }

    function save3DGenerationToGallery() {
        if (!renderer || !currentSceneJson) {
            showCustomAlert("No hay un modelo 3D que guardar.");
            return;
        }
        renderer.render(scene, camera);
        const imageDataUrl = renderer.domElement.toDataURL('image/png');
        const promptText = promptInput3D.value.trim() || "Escena 3D sin título";
        const itemDiv = document.createElement('div');
        itemDiv.className = 'generation-item item-3d';
        itemDiv.dataset.modelData = JSON.stringify(currentSceneJson);
        const img = document.createElement('img');
        img.src = imageDataUrl;
        img.alt = promptText;
        const overlay = document.createElement('div');
        overlay.className = 'generation-item-overlay';
        const title = document.createElement('p');
        title.textContent = promptText;
        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.className = 'generation-item-buttons';
        const reloadBtn = document.createElement('button');
        reloadBtn.textContent = 'Recargar';
        reloadBtn.className = 'reload-3d-btn';
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = () => itemDiv.remove();
        buttonsWrapper.appendChild(reloadBtn);
        buttonsWrapper.appendChild(deleteBtn);
        overlay.appendChild(title);
        overlay.appendChild(buttonsWrapper);
        itemDiv.appendChild(img);
        itemDiv.appendChild(overlay);
        if (generacionesGrid) generacionesGrid.prepend(itemDiv);
        if (generacionesContainer) generacionesContainer.style.display = 'block';
        showCustomAlert("¡Escena 3D guardada en la galería!");
    }

    async function callGeminiAPI(prompt, expectJson = true) {
      
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`;
        const generationConfig = expectJson ? { response_mime_type: "application/json" } : {};
        const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error de la API de Gemini: ${errorBody.error?.message || response.statusText}`);
        }
        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("Respuesta inesperada de la API de Gemini.");
        }
        return data.candidates[0].content.parts[0].text;
    }

    function extractJson(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            const match = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (match && match[1]) {
                try { return JSON.parse(match[1]); }
                catch (parseError) { throw new Error("No se pudo parsear el bloque JSON en la respuesta."); }
            }
            throw new Error("La respuesta de la IA no contenía un JSON válido.");
        }
    }
    
    function showCustomAlert(message) {
        const alertBox = document.createElement('div');
        alertBox.textContent = message;
        Object.assign(alertBox.style, {
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            padding: '12px 20px', backgroundColor: '#333', color: 'white', borderRadius: '8px',
            zIndex: '1002', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: 'opacity 0.3s, top 0.3s',
            opacity: '0'
        });
        document.body.appendChild(alertBox);
        setTimeout(() => { alertBox.style.opacity = '1'; alertBox.style.top = '30px'; }, 10);
        setTimeout(() => {
            alertBox.style.opacity = '0';
            alertBox.style.top = '20px';
            setTimeout(() => document.body.removeChild(alertBox), 300);
        }, 4000);
    }

    // --- Inicialización y Listeners ---
    initThreeJS();

    if (generateButton3D) generateButton3D.addEventListener('click', handleGeneration3D);
    if (saveButton3D) saveButton3D.addEventListener('click', save3DGenerationToGallery);
    
    if (promptInput3D) promptInput3D.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGeneration3D();
        }
    });

    if (generacionesGrid) {
        generacionesGrid.addEventListener('click', function(event) {
            const target = event.target;
            if (target.classList.contains('reload-3d-btn')) {
                const item = target.closest('.generation-item');
                if (item && item.dataset.modelData) {
                    document.getElementById('toggle-3d-btn')?.click();
                    const modelData = JSON.parse(item.dataset.modelData);
                    // La función de recarga ahora usa createSceneFromLayout
                    createSceneFromLayout(modelData.layout, modelData.uniqueParts);
                    const title = item.querySelector('p');
                    if (title && promptInput3D) promptInput3D.value = title.textContent;
                    showCustomAlert("Modelo 3D recargado en el visor.");
                }
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGenerador3D);
} else {
    setupGenerador3D();
}
