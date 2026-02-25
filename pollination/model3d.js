// model3d.js
import * as THREE from 'three';
import { SUBTRACTION, ADDITION, Brush, Evaluator } from 'three-bvh-csg';
import { GeometryModifiers } from './model3d_modifiers.js';
import { setCurrentModelGroup, initModel3DViewer, createFallbackTexture } from './model3d_viewer.js';

// --- GEOMETRÍA PERSONALIZADA: CUÑA (WEDGE) ---
// CORRECCIÓN TÉCNICA SILENCIOSA: Centramos la geometría en el eje Y (-height/2 a +height/2)
// Esto hace que se comporte igual que un cubo estándar de Three.js, corrigiendo el techo flotante
// sin tener que cambiar los prompts de la IA.
function createWedgeGeometry(width = 1, height = 1, depth = 1) {
    const geometry = new THREE.BufferGeometry();
    const h2 = height / 2; // Mitad de la altura
    const w2 = width / 2;
    const d2 = depth / 2;

    const vertices = new Float32Array([
        // Base (Ahora en -h2)
        -w2, -h2, -d2,   w2, -h2, -d2,  -w2, -h2,  d2,
         w2, -h2, -d2,   w2, -h2,  d2,  -w2, -h2,  d2,
        
        // Cara Frontal (Vertical)
        -w2, -h2, -d2,  -w2,  h2, -d2,   w2, -h2, -d2,
         w2, -h2, -d2,  -w2,  h2, -d2,   w2,  h2, -d2,
        
        // Rampa (La hipotenusa)
        -w2, -h2, d2,    w2, -h2, d2,    -w2,  h2, -d2,
         w2, -h2, d2,    w2,  h2, -d2,  -w2,  h2, -d2,
        
        // Lado Izquierdo
        -w2, -h2, -d2,  -w2, -h2, d2,   -w2,  h2, -d2,
        
        // Lado Derecho
         w2, -h2, -d2,   w2,  h2, -d2,   w2, -h2, d2
    ]);

    const uvs = new Float32Array([
        0, 1,  1, 1,  0, 0,   1, 1,  1, 0,  0, 0,
        1, 0,  1, 1,  0, 0,   0, 0,  1, 1,  0, 1,
        0, 0,  1, 0,  0, 1,   1, 0,  1, 1,  0, 1,
        0, 0,  1, 0,  0, 1,   1, 0,  1, 1,  0, 0
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
}

// --- SANITIZADOR DE GEOMETRÍA ---
function sanitizeGeometry(geometry) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) {
        return new THREE.BoxGeometry(1, 1, 1);
    }
    
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        if (isNaN(pos.getX(i)) || isNaN(pos.getY(i)) || isNaN(pos.getZ(i))) {
            console.warn("Sanitizador: Geometría degenerada detectada. Aplicando fallback.");
            return new THREE.BoxGeometry(1, 1, 1); 
        }
    }
    
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    return geometry;
}

// 2. Lógica del "Arquitecto" Multi-Agente
window.generateModel3D = async function() {
    const promptInput = document.getElementById('model3d-prompt').value.trim();
    if (!promptInput) return alert("Por favor, describe el modelo 3D que quieres crear.");

    const apiKey = localStorage.getItem('pollinations_api_key') || '';
    if (!apiKey) {
        alert("Por favor, conecta tu API Key de Pollination primero.");
        const modal = document.getElementById('login-modal');
        if (modal) modal.classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('btn-generate-model3d');
    const statusText = document.getElementById('model3d-status');
    const placeholder = document.getElementById('model3d-placeholder');
    const exportOptions = document.getElementById('model3d-export-options');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>ARQUITECTO PENSANDO...</span>';
    
    placeholder.style.opacity = '1';
    placeholder.style.pointerEvents = 'auto';
    statusText.innerText = "Fase 1: Diseñando blueprint estructural (openai-large)...";
    exportOptions.classList.add('hidden');
    exportOptions.classList.remove('flex');

    setCurrentModelGroup(null);
    const endpoint = "https://gen.pollinations.ai/v1/chat/completions";

    try {
        // ====================================================================
        // FASE 1: EL ARQUITECTO (PROMPT RESTAURADO AL ORIGINAL)
        // ====================================================================
        const sysPromptArchitect = `Eres un Arquitecto de Ensamblaje 3D (Lego Builder). Tu objetivo es construir objetos tridimensionales robustos, lógicos y proporcionados usando primitivas.
RESPONDE EXCLUSIVAMENTE CON UN JSON VÁLIDO. NO USES MARKDOWN.

REGLAS ESPACIALES MATEMÁTICAS (FUNDAMENTALES):
1. Ejes: Y es Altura (Arriba+ / Abajo-). X es Anchura (Izquierda- / Derecha+). Z es Profundidad (Adelante+ / Atrás-).
2. Construcción Base: Construye siempre partiendo de un "chasis" o cuerpo central en X=0.
3. El array "size" siempre es [Ancho_X, Alto_Y, Profundo_Z].
4. REGLA DEL CILINDRO (CYLINDER): Nacen "de pie" (Verticales).
   - Para columnas/pilares: "rotation": [0,0,0]. El grosor lo da X/Z, la altura la da Y.
   - Para RUEDAS o EJES LATERALES: ¡OBLIGATORIO! Usa "rotation": [0, 0, 90] para tumbarlo. IMPORTANTE: Cuando tumbas un cilindro, su 'Y' del array "size" se convierte visualmente en el ancho de la rueda, y la 'X'/'Z' en su diámetro. Ejemplo Rueda: "size": [1.5, 0.4, 1.5] rotado [0,0,90] -> Diámetro 1.5, Grosor 0.4.
5. Simetría: NUNCA crees piezas duplicadas a mano si van en espejo. Crea SOLO la pieza del lado derecho (X positivo) y pon "symmetry": "x". El motor dibujará la izquierda.
6. Ensamblaje: Las piezas deben intersecarse un poco para formar un modelo sólido. No dejes huecos.

ESTRUCTURA JSON REQUERIDA:
{
    "global": { "surfaceType": "HARD_SURFACE" },
    "materials": [ { "id": "mat_1", "prompt": "texture description (e.g. rusty red metal, dark rubber)" } ],
    "steps": [
        {
            "op": "ADD", // Usa ADD para sumar volumen. Usa SUBTRACT solo para perforar agujeros.
            "shape": "BOX", // BOX, CYLINDER, WEDGE, SPHERE, CONE
            "name": "chasis",
            "materialId": "mat_1",
            "size": [2, 0.8, 4], 
            "position": [0, 0.5, 0],
            "rotation": [0, 0, 0],
            "symmetry": "none" // 'none', 'x', 'y', 'z'
        }
    ]
}`;

        const chatRes1 = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'openai-large',
                messages: [
                    { role: 'system', content: sysPromptArchitect },
                    { role: 'user', content: promptInput }
                ],
                jsonMode: true,
                temperature: 0.1
            })
        });

        if (!chatRes1.ok) throw new Error("Fallo en Fase 1 (Arquitecto).");
        const chatData1 = await chatRes1.json();
        let blueprint;
        try {
            const cleanJson = chatData1.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
            blueprint = JSON.parse(cleanJson);
        } catch (e) {
            throw new Error("El Arquitecto devolvió un formato inválido.");
        }

        // ====================================================================
        // FASE 2: EL DELINEANTE MATEMÁTICO (Fallback seguro)
        // ====================================================================
        statusText.innerText = "Fase 2: Calculando vectores matemáticos (openai-large)...";
        btn.innerHTML = '<i class="fa-solid fa-compass"></i> <span>TRAZANDO VECTORES...</span>';

        if (blueprint.steps) {
            const mathPromises = blueprint.steps.map(async (step) => {
                if ((step.shape === 'LATHE' || step.shape === 'EXTRUDE' || step.shape === 'TUBE') && step.profileDescription) {
                    const sysPromptMath = `Eres un Motor Geométrico. Convierte la descripción en un array JSON de coordenadas 2D. EVITA LÍNEAS CRUZADAS. Responde solo con array JSON.`;
                    try {
                        const mathRes = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ model: 'openai-large', messages: [{ role: 'system', content: sysPromptMath }], temperature: 0.1 })
                        });
                        if (mathRes.ok) {
                            const mathData = await mathRes.json();
                            const rawArray = mathData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
                            step.points = JSON.parse(rawArray);
                        }
                    } catch (e) {
                        step.shape = 'BOX'; 
                    }
                }
            });
            await Promise.all(mathPromises);
        }

        // ====================================================================
        // FASE 3: MATERIALES PBR
        // ====================================================================
        statusText.innerText = "Fase 3: Sintetizando materiales PBR...";
        btn.innerHTML = '<i class="fa-solid fa-palette"></i> <span>MATERIALES...</span>';
        const textureMap = {};
        
        if (blueprint.materials && blueprint.materials.length > 0) {
            const texPromises = blueprint.materials.map(async (mat) => {
                let cleanPrompt = mat.prompt.replace(/[^\w\s-]/gi, "").trim();
                const finalPrompt = `texture of ${cleanPrompt}, seamless, flat lighting, highly detailed surface`;
                try {
                    const seed = Math.floor(Math.random() * 1000000);
                    const imgUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}?model=klein&width=512&height=512&seed=${seed}&nologo=true&key=${apiKey}`;
                    
                    const imgRes = await fetch(imgUrl);
                    if (imgRes.ok) {
                        const blob = await imgRes.blob();
                        const url = URL.createObjectURL(blob);
                        await new Promise((resolve) => {
                            const img = new Image();
                            img.src = url;
                            img.onload = () => {
                                const tex = new THREE.Texture(img);
                                tex.colorSpace = THREE.SRGBColorSpace;
                                tex.wrapS = THREE.RepeatWrapping;
                                tex.wrapT = THREE.RepeatWrapping;
                                tex.needsUpdate = true;
                                textureMap[mat.id] = new THREE.MeshStandardMaterial({ 
                                    map: tex, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide
                                });
                                resolve();
                            };
                            img.onerror = () => { textureMap[mat.id] = new THREE.MeshStandardMaterial({ color: 0x888888 }); resolve(); };
                        });
                    } else throw new Error();
                } catch (err) { textureMap[mat.id] = new THREE.MeshStandardMaterial({ color: 0xcccccc }); }
            });
            await Promise.all(texPromises);
        }

        // ====================================================================
        // FASE 4: ENSAMBLAJE CSG & MOTOR 3D
        // ====================================================================
        statusText.innerText = "Fase 4: Ensamblando e iterando colisiones (CSG)...";
        btn.innerHTML = '<i class="fa-solid fa-cube"></i> <span>ENSAMBLANDO...</span>';
        
        const csgEvaluator = new Evaluator();
        csgEvaluator.useGroups = true;

        const outputGroup = new THREE.Group();
        let mainBodyBrush = null; 

        if (blueprint.steps) {
            for (const step of blueprint.steps) {
                let geo;
                const sx = step.size ? step.size[0] : 1;
                const sy = step.size ? step.size[1] : 1;
                const sz = step.size ? step.size[2] : 1;

                try {
                    switch(step.shape) {
                        case 'LATHE':
                            if (step.points && step.points.length > 1) {
                                const lathePts = step.points.map(p => new THREE.Vector2(p[0] || 0, p[1] || 0));
                                geo = new THREE.LatheGeometry(lathePts, 64);
                            } else geo = new THREE.CylinderGeometry(sx/2, sx/2, sy, 32);
                            break;
                        case 'EXTRUDE':
                            if (step.points && step.points.length > 2) {
                                const shape = new THREE.Shape();
                                shape.moveTo(step.points[0][0] || 0, step.points[0][1] || 0);
                                for (let i = 1; i < step.points.length; i++) {
                                    shape.lineTo(step.points[i][0] || 0, step.points[i][1] || 0);
                                }
                                geo = new THREE.ExtrudeGeometry(shape, { depth: sz, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4 });
                                geo.center(); 
                            } else geo = new THREE.BoxGeometry(sx, sy, sz);
                            break;
                        case 'TUBE':
                            if (step.points && step.points.length > 1) {
                                const tubePts = step.points.map(p => new THREE.Vector3(p[0]||0, p[1]||0, p[2]||0));
                                const curve = new THREE.CatmullRomCurve3(tubePts);
                                geo = new THREE.TubeGeometry(curve, 64, sx/2, 16, false);
                            } else geo = new THREE.CylinderGeometry(sx/2, sx/2, sy, 16);
                            break;
                        case 'WEDGE': geo = createWedgeGeometry(sx, sy, sz); break;
                        case 'CYLINDER': geo = new THREE.CylinderGeometry(sx/2, sx/2, sy, 64); break;
                        case 'SPHERE': geo = new THREE.SphereGeometry(sx/2, 64, 64); break;
                        case 'CAPSULE': geo = new THREE.CapsuleGeometry(sx/2, sy, 8, 32); break;
                        case 'CONE': geo = new THREE.ConeGeometry(sx/2, sy, 64); break;
                        case 'TORUS': geo = new THREE.TorusGeometry(sx/2, sy/4, 32, 100); break;
                        case 'BOX': default: geo = new THREE.BoxGeometry(sx, sy, sz); break;
                    }
                } catch(e) {
                    geo = new THREE.BoxGeometry(sx, sy, sz);
                }

                geo = sanitizeGeometry(geo);

                const mat = textureMap[step.materialId] || new THREE.MeshStandardMaterial({ color: 0x888888 });
                const rotX = step.rotation ? step.rotation[0] * (Math.PI/180) : 0;
                const rotY = step.rotation ? step.rotation[1] * (Math.PI/180) : 0;
                const rotZ = step.rotation ? step.rotation[2] * (Math.PI/180) : 0;

                const currentBrush = new Brush(geo, mat);
                currentBrush.position.set(step.position ? step.position[0] : 0, step.position ? step.position[1] : 0, step.position ? step.position[2] : 0);
                currentBrush.rotation.set(rotX, rotY, rotZ);
                currentBrush.updateMatrixWorld();

                try {
                    if (step.op === 'SUBTRACT' && mainBodyBrush) {
                        mainBodyBrush = csgEvaluator.evaluate(mainBodyBrush, currentBrush, SUBTRACTION);
                    } else if (step.op === 'ADD') {
                        if (!mainBodyBrush) mainBodyBrush = currentBrush;
                        else mainBodyBrush = csgEvaluator.evaluate(mainBodyBrush, currentBrush, ADDITION);
                    } else {
                        const mesh = new THREE.Mesh(geo, mat);
                        mesh.position.copy(currentBrush.position);
                        mesh.rotation.copy(currentBrush.rotation);
                        outputGroup.add(mesh);
                    }
                } catch (csgError) {
                    const fallbackMesh = new THREE.Mesh(geo, mat);
                    fallbackMesh.position.copy(currentBrush.position);
                    fallbackMesh.rotation.copy(currentBrush.rotation);
                    outputGroup.add(fallbackMesh);
                }

                // SIMETRÍA CORREGIDA
                if (step.symmetry === 'x' || step.symmetry === 'z' || step.symmetry === 'y') {
                    try {
                        const symBrush = new Brush(geo, mat);
                        symBrush.position.copy(currentBrush.position);
                        
                        // Corrección de rotación para espejos matemáticos
                        if (step.symmetry === 'x') { 
                            symBrush.position.x *= -1; 
                            symBrush.rotation.set(rotX, -rotY, -rotZ); 
                        }
                        if (step.symmetry === 'y') { 
                            symBrush.position.y *= -1; 
                            symBrush.rotation.set(-rotX, rotY, -rotZ); 
                        }
                        if (step.symmetry === 'z') { 
                            symBrush.position.z *= -1; 
                            symBrush.rotation.set(-rotX, -rotY, rotZ); 
                        }
                        
                        symBrush.updateMatrixWorld();

                        if (step.op === 'SUBTRACT' && mainBodyBrush) {
                            mainBodyBrush = csgEvaluator.evaluate(mainBodyBrush, symBrush, SUBTRACTION);
                        } else if (step.op === 'ADD') {
                            mainBodyBrush = csgEvaluator.evaluate(mainBodyBrush, symBrush, ADDITION);
                        } else {
                            const symMesh = new THREE.Mesh(geo, mat);
                            symMesh.position.copy(symBrush.position);
                            symMesh.rotation.copy(symBrush.rotation);
                            outputGroup.add(symMesh);
                        }
                    } catch (symError) {
                        console.error(`Error en simetría:`, symError);
                    }
                }
            }
        }

        if (mainBodyBrush) outputGroup.add(mainBodyBrush);

        const box = new THREE.Box3().setFromObject(outputGroup);
        const center = box.getCenter(new THREE.Vector3());
        outputGroup.position.sub(center); 
        outputGroup.position.y += (box.max.y - box.min.y) / 2;
        
        setCurrentModelGroup(outputGroup);

        placeholder.style.opacity = '0';
        placeholder.style.pointerEvents = 'none';
        exportOptions.classList.remove('hidden');
        exportOptions.classList.add('flex');

    } catch (error) {
        alert("Error en Pipeline: " + error.message);
        statusText.innerText = "Fallo estructural: " + error.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cube"></i> <span data-i18n="model3d_btn_generate">Generar Modelo 3D</span>';
        if (typeof updateDOM === 'function') updateDOM();
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-generate-model3d');
    if (btn) {
        btn.removeAttribute('onclick'); 
        btn.addEventListener('click', window.generateModel3D);
    }
    setTimeout(() => { initModel3DViewer(); }, 500); 
});