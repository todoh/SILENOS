// agent-stage2-maps.js - FASE 2: ELABORACIÓN DE MAPAS DEL AGENTE
class AgentStage2Maps {
    constructor() {
        this.isGenerating = false;
    }

    // Generar informe recopilatorio sintético (Anti-Saturación Contextual)
    buildSynthetizedContextReport() {
        const savedElements = projectData.savedElementsConfig || {};
        const availableElementsSummary = Object.keys(savedElements).map(key => {
            const el = savedElements[key];
            return {
                key: key,
                name: el.savedName || key,
                dimensionsPx: `${el.width}x${el.height}`,
                dimensionsMeters: `${agentScaleGuide.pxToMeters(el.width)}m x ${agentScaleGuide.pxToMeters(el.height)}m`,
                type: el.type,
                hasDialog: !!el.dialog,
                hasCollision: !!el.hasCollision
            };
        });

        const existingScenes = projectData.scenes || {};
        const mapSummary = Object.keys(existingScenes).map(sId => {
            const sc = existingScenes[sId];
            return {
                id: sId,
                name: sc.name || sId,
                elementCount: sc.elements ? sc.elements.length : 0,
                interactiveElements: sc.elements ? sc.elements.filter(e => e.type === 'entidad').map(e => ({ id: e.id, dialog: e.dialog, targetScene: e.targetScene })) : []
            };
        });

        return {
            availableSavedElements: availableElementsSummary,
            existingMaps: mapSummary,
            globalVariables: projectData.variablesConfig || {},
            registeredItems: projectData.itemsConfig || {}
        };
    }

    async generateMapsPipeline(promptText, numMaps, mapPresetKey, stylePrompt, apiKey, abortController = null, onProgress = null) {
        if (this.isGenerating) return;
        this.isGenerating = true;

        try {
            if (onProgress) onProgress(10, "Fase 2: Compilando informe sintético de elementos y mapas...");

            const contextReport = this.buildSynthetizedContextReport();
            const mapDims = agentScaleGuide.getMapPixelDimensions(mapPresetKey);

            if (onProgress) onProgress(25, "Fase 2: Diseñando mapeado y maquetación con Gemini...");

            const mapPrompt = `Eres un diseñador de niveles de videojuegos 2D/2.5D. Debes crear ${numMaps} mapas/escenarios basándote en esta solicitud: "${promptText}".

DIMENSIONES EXACTAS DEL MAPA POR ZONA:
- Ancho: ${mapDims.widthPx}px (${mapDims.widthMeters} metros).
- Alto: ${mapDims.heightPx}px (${mapDims.heightMeters} metros).

INFORME SINTÉTICO DE ELEMENTOS DISPONIBLES EN "ELEMENTOS":
${JSON.stringify(contextReport.availableSavedElements, null, 2)}

INFORMACIÓN DE MAPAS EXISTENTES Y LÓGICA:
${JSON.stringify(contextReport.existingMaps, null, 2)}

REGLAS DE GENERACIÓN DE MAPAS:
1. "groundPrompt": Exclusivamente la textura de suelo/pavimento base (césped, baldosas, piedra). SIN árboles ni paredes superpuestas.
2. Coloca los elementos de la biblioteca "ELEMENTOS" usando su "savedElementKey" exacto.
3. Las coordenadas (x, y) deben colocarse dentro del rango (0 a ${mapDims.widthPx}, 0 a ${mapDims.heightPx}).
4. Asegúrate de incluir elementos de conexión inter-zona ("targetScene") si aplica.
5. Para el primer mapa generado, si el juego no posee un personaje jugador, asigna "isPlayer": true a uno de los elementos.

Devuelve ÚNICAMENTE un objeto JSON válido con este formato:
{
  "maps": [
    {
      "id": "zona_mercado_1",
      "name": "Plaza del Mercado",
      "groundPrompt": "Suelo de adoquines de piedra antiguos y senderos de tierra, vista top-down 2D",
      "placedElements": [
        {
          "savedElementKey": "saved_mercader_goblin",
          "x": 400,
          "y": 300,
          "isPlayer": false,
          "customDialog": "¡Mercancía fresca recién llegada!"
        }
      ]
    }
  ]
}`;

            const response = await this.callGeminiJson(mapPrompt, apiKey, abortController);
            if (!response || !response.maps || !Array.isArray(response.maps)) {
                throw new Error("Respuesta de mapas no válida.");
            }

            const mapsToBuild = response.maps;
            if (!projectData.scenes) projectData.scenes = {};

            for (let i = 0; i < mapsToBuild.length; i++) {
                const mapData = mapsToBuild[i];
                const sceneId = mapData.id || `zona_${Date.now()}_${i}`;

                if (onProgress) onProgress(40 + Math.floor((i / mapsToBuild.length) * 50), `Generando suelo SVG y montando escenario ${i + 1}/${mapsToBuild.length}: ${mapData.name}...`);

                // 1. Generar SVG del Suelo / Fondo del Mapa
                const bgFileName = `bg_${sceneId}.svg`;
                let bgBlob = await agentIllustrator.generateSingleSVG(mapData.groundPrompt, stylePrompt, apiKey, false, abortController);
                
                if (typeof cropSVG === 'function') {
                    try {
                        const rawBgText = await bgBlob.text();
                        const croppedBgText = await cropSVG(rawBgText);
                        bgBlob = new Blob([croppedBgText], { type: 'image/svg+xml' });
                    } catch (cropErr) {
                        console.warn(`Aviso: No se pudo cropear el SVG de fondo ${bgFileName}:`, cropErr);
                    }
                }

                await registerAsset(bgFileName, bgBlob, true);
                if (typeof dirHandle !== 'undefined' && dirHandle) {
                    await agentIllustrator.saveFileToDisk(bgFileName, bgBlob);
                }

                // 2. Crear el objeto Escena
                const newSceneObj = {
                    name: mapData.name || sceneId,
                    backgroundPrompt: mapData.groundPrompt,
                    elements: []
                };

                // Añadir la capa de Fondo
                newSceneObj.elements.push({
                    id: `bg_elem_${sceneId}`,
                    image: bgFileName,
                    x: 0,
                    y: 0,
                    width: mapDims.widthPx,
                    height: mapDims.heightPx,
                    rotation: 0,
                    type: 'fondo',
                    keepAspect: false,
                    dialog: '',
                    targetScene: '',
                    addItem: [],
                    removeItem: [],
                    condition: { type: 'none' },
                    setVariable: { varId: '', value: '' }
                });

                // 3. Colocar los elementos de la biblioteca ELEMENTOS conservando sus colisiones en la base
                if (mapData.placedElements) {
                    mapData.placedElements.forEach(pe => {
                        const savedTemplate = projectData.savedElementsConfig[pe.savedElementKey];
                        const instanceId = 'elem_' + Date.now() + Math.random().toString(36).substring(2, 6);

                        const elemWidth = savedTemplate ? savedTemplate.width : 100;
                        const elemHeight = savedTemplate ? savedTemplate.height : 100;

                        const newElem = {
                            id: instanceId,
                            image: savedTemplate ? savedTemplate.image : 'placeholder.svg',
                            x: pe.x || 100,
                            y: pe.y || 100,
                            width: elemWidth,
                            height: elemHeight,
                            rotation: 0,
                            type: savedTemplate ? savedTemplate.type : 'decoracion',
                            billboardMode: savedTemplate ? savedTemplate.billboardMode : 'camera',
                            isPlayer: !!pe.isPlayer,
                            hasCollision: savedTemplate ? savedTemplate.hasCollision : true,
                            collisionX: savedTemplate && savedTemplate.collisionX !== undefined ? savedTemplate.collisionX : Math.round(elemWidth * 0.1),
                            collisionY: savedTemplate && savedTemplate.collisionY !== undefined ? savedTemplate.collisionY : Math.round(elemHeight * 0.75),
                            collisionW: savedTemplate && savedTemplate.collisionW !== undefined ? savedTemplate.collisionW : Math.round(elemWidth * 0.8),
                            collisionH: savedTemplate && savedTemplate.collisionH !== undefined ? savedTemplate.collisionH : Math.round(elemHeight * 0.25),
                            keepAspect: true,
                            dialog: pe.customDialog || (savedTemplate ? savedTemplate.dialog : ''),
                            targetScene: pe.targetScene || (savedTemplate ? savedTemplate.targetScene : ''),
                            addItem: savedTemplate ? savedTemplate.addItem : [],
                            removeItem: savedTemplate ? savedTemplate.removeItem : [],
                            transformAsset: savedTemplate ? savedTemplate.transformAsset : '',
                            condition: savedTemplate ? savedTemplate.condition : { type: 'none' },
                            setVariable: savedTemplate ? savedTemplate.setVariable : { varId: '', value: '' }
                        };

                        newSceneObj.elements.push(newElem);
                    });
                }

                projectData.scenes[sceneId] = newSceneObj;

                if (i === 0 && (!projectData.startScene || !projectData.scenes[projectData.startScene])) {
                    projectData.startScene = sceneId;
                }
            }

            if (typeof autoSaveJSON === 'function') await autoSaveJSON();
            if (typeof renderSceneTabs === 'function') renderSceneTabs();
            if (typeof renderStage === 'function') renderStage();
            if (onProgress) onProgress(100, `¡Se han generado ${mapsToBuild.length} mapas exitosamente!`);

            return mapsToBuild;

        } catch (err) {
            console.error("Error en Fase 2 (Elaboración de Mapas):", err);
            throw err;
        } finally {
            this.isGenerating = false;
        }
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

const agentStage2Maps = new AgentStage2Maps();