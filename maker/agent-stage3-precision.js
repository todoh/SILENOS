// agent-stage3-precision.js - FASE 3: EDICIÓN DE PRECISIÓN DEL AGENTE (DIRECTOR AI)

class AgentStage3Precision {
    constructor() {
        this.isGenerating = false;
    }

    // Compilar informe sintético exclusivo de la zona/mapa a editar
    buildSceneContextReport(targetSceneId) {
        const scene = projectData.scenes ? projectData.scenes[targetSceneId] : null;
        if (!scene) {
            throw new Error(`La zona/mapa "${targetSceneId}" no existe en el proyecto.`);
        }

        // Elementos presentes actualmente en este mapa
        const currentElements = (scene.elements || []).map(elem => ({
            id: elem.id,
            image: elem.image,
            type: elem.type,
            x: elem.x,
            y: elem.y,
            width: elem.width,
            height: elem.height,
            isPlayer: !!elem.isPlayer,
            hasCollision: !!elem.hasCollision,
            dialog: elem.dialog || '',
            targetScene: elem.targetScene || '',
            addItem: elem.addItem || [],
            removeItem: elem.removeItem || [],
            billboardMode: elem.billboardMode || 'camera'
        }));

        // Catálogo de Elementos Guardados disponibles para insertar
        const savedElements = projectData.savedElementsConfig || {};
        const availableCatalog = Object.keys(savedElements).map(key => ({
            key: key,
            name: savedElements[key].savedName || key,
            width: savedElements[key].width,
            height: savedElements[key].height,
            type: savedElements[key].type,
            dialog: savedElements[key].dialog || ''
        }));

        return {
            targetSceneId: targetSceneId,
            targetSceneName: scene.name || targetSceneId,
            mapDimensions: typeof getStageDimensions === 'function' ? getStageDimensions() : { width: 1920, height: 1080 },
            pxPerMeter: agentScaleGuide.pxPerMeter,
            currentElements: currentElements,
            availableCatalog: availableCatalog,
            otherScenes: Object.keys(projectData.scenes || {}).filter(s => s !== targetSceneId)
        };
    }

    async executePrecisionEdit(targetSceneId, userInstructions, apiKey, abortController = null, onProgress = null) {
        if (this.isGenerating) return;
        this.isGenerating = true;

        try {
            if (onProgress) onProgress(10, `Fase 3: Analizando estructura del mapa "${targetSceneId}"...`);

            const sceneContext = this.buildSceneContextReport(targetSceneId);

            if (onProgress) onProgress(30, "Fase 3: Procesando instrucciones del Director de Nivel con Gemini...");

            const directorPrompt = `Eres un Director de Niveles 2D/2.5D experto para videojuegos.
Tu tarea es modificar de forma QUIRÚRGICA y PRECISA el mapa seleccionado procesando estas instrucciones del usuario:
"${userInstructions}"

INFORME DEL MAPA ACTUAL ("${sceneContext.targetSceneName}" - ID: ${targetSceneId}):
- Dimensiones del Escenario: ${sceneContext.mapDimensions.width}px x ${sceneContext.mapDimensions.height}px
- Relación de Escala: ${sceneContext.pxPerMeter}px = 1 metro.
- Zonas existentes para teletransporte: ${sceneContext.otherScenes.join(', ')}

ELEMENTOS ACTUALMENTE PRESENTES EN ESTE MAPA:
${JSON.stringify(sceneContext.currentElements, null, 2)}

CATÁLOGO DE "ELEMENTOS" DISPONIBLES PARA INSERTAR:
${JSON.stringify(sceneContext.availableCatalog, null, 2)}

REGLAS DE ACTUACIÓN COMO DIRECTOR:
1. NO regeneres el escenario completo ni modifiques elementos que no se hayan solicitado cambiar.
2. Utiliza únicamente las siguientes operaciones Delta en el array "actions":
   - "INSERT": Coloca un elemento del catálogo "availableCatalog" en una posición (x, y). Debe incluir "savedElementKey", "x", "y".
   - "MOVE": Cambia las coordenadas de un elemento existente. Debe incluir "elementId", "newX", "newY".
   - "REMOVE": Elimina un elemento del mapa. Debe incluir "elementId".
   - "UPDATE_PROPERTIES": Modifica propiedades específicas de un elemento existente (dialog, targetScene, hasCollision, billboardMode, addItem, removeItem, width, height, etc.). Debe incluir "elementId" y "changes".

Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura estricta:
{
  "targetScene": "${targetSceneId}",
  "actions": [
    {
      "op": "INSERT",
      "savedElementKey": "saved_cofre",
      "x": 350,
      "y": 200,
      "customProperties": { "dialog": "Has encontrado un cofre secreto." }
    },
    {
      "op": "MOVE",
      "elementId": "elem_mercader_1",
      "newX": 500,
      "newY": 300
    },
    {
      "op": "REMOVE",
      "elementId": "elem_roca_vieja"
    },
    {
      "op": "UPDATE_PROPERTIES",
      "elementId": "elem_puerta_principal",
      "changes": {
        "dialog": "La puerta está cerrada con llave.",
        "hasCollision": true
      }
    }
  ]
}`;

            const response = await this.callGeminiJson(directorPrompt, apiKey, abortController);
            if (!response || !response.actions || !Array.isArray(response.actions)) {
                throw new Error("Respuesta de edición de precisión no válida.");
            }

            if (onProgress) onProgress(70, `Fase 3: Aplicando ${response.actions.length} cambios en el mapa...`);

            const resultSummary = this.applyDeltaActions(targetSceneId, response.actions);

            if (typeof autoSaveJSON === 'function') await autoSaveJSON();
            if (typeof renderStage === 'function') renderStage();
            if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();

            if (onProgress) onProgress(100, `¡Edición de precisión completada! (${resultSummary.applied} acciones aplicadas).`);
            return response;

        } catch (err) {
            console.error("Error en Fase 3 (Edición de Precisión):", err);
            throw err;
        } finally {
            this.isGenerating = false;
        }
    }

    // Ejecución local del motor de comandos Delta
    applyDeltaActions(sceneId, actions) {
        const scene = projectData.scenes[sceneId];
        if (!scene || !scene.elements) {
            throw new Error(`Escena objetivo "${sceneId}" no encontrada.`);
        }

        let appliedCount = 0;

        actions.forEach(action => {
            const op = String(action.op).toUpperCase();

            // 1. INSERTAR ELEMENTO
            if (op === 'INSERT' && action.savedElementKey) {
                const template = projectData.savedElementsConfig ? projectData.savedElementsConfig[action.savedElementKey] : null;
                const newId = 'elem_' + Date.now() + Math.random().toString(36).substring(2, 6);

                const newElem = {
                    id: newId,
                    image: template ? template.image : 'placeholder.svg',
                    x: action.x !== undefined ? action.x : 100,
                    y: action.y !== undefined ? action.y : 100,
                    width: template ? template.width : 100,
                    height: template ? template.height : 100,
                    rotation: 0,
                    type: template ? template.type : 'decoracion',
                    billboardMode: template ? template.billboardMode : 'camera',
                    isPlayer: false,
                    hasCollision: template ? template.hasCollision : true,
                    collisionX: template ? template.collisionX : 0,
                    collisionY: template ? template.collisionY : 0,
                    collisionW: template ? template.collisionW : 100,
                    collisionH: template ? template.collisionH : 100,
                    keepAspect: true,
                    dialog: template ? template.dialog : '',
                    targetScene: template ? template.targetScene : '',
                    addItem: template ? template.addItem : [],
                    removeItem: template ? template.removeItem : [],
                    transformAsset: template ? template.transformAsset : '',
                    condition: template ? template.condition : { type: 'none' },
                    setVariable: template ? template.setVariable : { varId: '', value: '' }
                };

                // Sobrescribir propiedades personalizadas si las envía el Director
                if (action.customProperties && typeof action.customProperties === 'object') {
                    Object.assign(newElem, action.customProperties);
                }

                scene.elements.push(newElem);
                appliedCount++;
            }

            // 2. MOVER ELEMENTO
            else if (op === 'MOVE' && action.elementId) {
                const elem = scene.elements.find(e => e.id === action.elementId);
                if (elem) {
                    if (action.newX !== undefined) elem.x = action.newX;
                    if (action.newY !== undefined) elem.y = action.newY;
                    appliedCount++;
                }
            }

            // 3. ELIMINAR ELEMENTO
            else if (op === 'REMOVE' && action.elementId) {
                const initialLength = scene.elements.length;
                scene.elements = scene.elements.filter(e => e.id !== action.elementId);
                if (scene.elements.length < initialLength) {
                    appliedCount++;
                }
            }

            // 4. ACTUALIZAR PROPIEDADES DE UN ELEMENTO
            else if (op === 'UPDATE_PROPERTIES' && action.elementId && action.changes) {
                const elem = scene.elements.find(e => e.id === action.elementId);
                if (elem && typeof action.changes === 'object') {
                    Object.assign(elem, action.changes);
                    appliedCount++;
                }
            }
        });

        return { applied: appliedCount, total: actions.length };
    }

    async callGeminiJson(promptText, apiKey, abortController = null) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const res = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: abortController ? abortController.signal : null
        }, 30000);

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Error API Gemini JSON (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJson) throw new Error("No se recibió respuesta válida de Gemini JSON.");

        return JSON.parse(rawJson);
    }
}

const agentStage3Precision = new AgentStage3Precision();