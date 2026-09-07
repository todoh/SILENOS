// agent-orchestrator.js - ORQUESTADOR POR ETAPAS (AGENTE ODS CON RESUME/RETRY)
class AgentOrchestrator {
    constructor() {
        this.isGenerating = false;
        this.abortController = null;
        this.checkpoint = null; // Guardar la fase actual y los datos acumulados
    }

    log(msg) {
        const consoleEl = document.getElementById('agent-console');
        if (consoleEl) {
            const time = new Date().toLocaleTimeString();
            consoleEl.innerHTML += `<div>[${time}] ${msg}</div>`;
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }

    updateProgress(percent, label) {
        const fill = document.getElementById('agent-progress-fill');
        const text = document.getElementById('agent-progress-text');
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.textContent = label;
    }

    hideResumeButton() {
        const btnResume = document.getElementById('btn-resume-agent');
        if (btnResume) btnResume.style.display = 'none';
    }

    showResumeButton(label = "Reanudar Pipeline") {
        const btnResume = document.getElementById('btn-resume-agent');
        if (btnResume) {
            btnResume.textContent = label;
            btnResume.style.display = 'inline-block';
        }
    }

    resetState() {
        this.checkpoint = null;
        this.hideResumeButton();
        const consoleEl = document.getElementById('agent-console');
        if (consoleEl) consoleEl.innerHTML = '';
    }

    async startPipeline() {
        this.resetState();
        await this.runPipeline();
    }

    async resumePipeline() {
        if (!this.checkpoint) return;
        this.log("Reanudando pipeline desde el punto guardado...");
        this.hideResumeButton();
        await this.runPipeline();
    }

    async runPipeline() {
        if (this.isGenerating) return;

        const promptText = document.getElementById('agent-prompt').value.trim();
        if (!promptText && !this.checkpoint) {
            alert("Por favor introduce una premisa o prompt para la aventura.");
            return;
        }

        const apiKey = localStorage.getItem('koreh_gemini_book_api_key') || '';
        if (!apiKey) {
            alert("Por favor, configura tu API Key de Gemini desde la barra superior.");
            return;
        }

        const numScenes = parseInt(document.getElementById('agent-scenes-count').value, 10) || 3;
        const stylePrompt = document.getElementById('agent-style').value.trim() || "Flat Design minimalista vectorial para videojuego 2D";

        this.isGenerating = true;
        this.abortController = new AbortController();

        const btnStart = document.getElementById('btn-start-agent');
        if (btnStart) btnStart.disabled = true;

        try {
            // Inicializar checkpoint si es la primera ejecución
            if (!this.checkpoint) {
                this.log("Iniciando Agente Orquestador del Juego...");
                this.checkpoint = {
                    stage: 'ETAPA_1',
                    skeletonData: null,
                    detailedScenes: {},
                    allItemsToGenerate: new Map(),
                    allEntitiesToGenerate: [],
                    reusableDecorations: new Map(),
                    globalVariables: {},
                    sceneIndex: 0,
                    bgIndex: 0,
                    itemBatchIndex: 0,
                    entityIndex: 0
                };
            }

            // ==========================================
            // ETAPA 1: ESQUELETO GLOBAL
            // ==========================================
            if (this.checkpoint.stage === 'ETAPA_1') {
                this.updateProgress(5, "Etapa 1: Diseñando mapa y estructura del juego...");
                const skeletonPrompt = `Diseña el esqueleto de un videojuego 2D explorable de ${numScenes} escenas/zonas basándote en esta premisa: "${promptText}".
Instrucciones de diseño de mapa:
- Las zonas representan áreas explorables con mapeado, vegetación, obstáculos, entradas y elementos de interacción.
- Define el objetivo global y las conexiones inter-zonas.

Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura estricta:
{
  "title": "Título",
  "startScene": "zona_1",
  "scenesOverview": [
    { "id": "zona_1", "name": "Nombre Zona 1", "concept": "Descripción temática de la zona 1" }
  ],
  "globalObjective": "Objetivo principal"
}`;

                this.checkpoint.skeletonData = await this.callGeminiJson(skeletonPrompt, apiKey);
                this.log(`Esqueleto de mapa creado: "${this.checkpoint.skeletonData.title}" con ${this.checkpoint.skeletonData.scenesOverview.length} zonas.`);
                this.checkpoint.stage = 'ETAPA_2';
                this.checkpoint.sceneIndex = 0;
            }

            const skeletonData = this.checkpoint.skeletonData;

            // ==========================================
            // ETAPA 2: ATOMIZACIÓN DE MAPA POR ZONA
            // ==========================================
            if (this.checkpoint.stage === 'ETAPA_2') {
                this.updateProgress(20, "Etapa 2: Atomizando mapeado, decoración y lógica...");

                for (let i = this.checkpoint.sceneIndex; i < skeletonData.scenesOverview.length; i++) {
                    const scOverview = skeletonData.scenesOverview[i];
                    this.log(`Diseñando mapa Zona ${i + 1}/${skeletonData.scenesOverview.length}: ${scOverview.name || scOverview.id}...`);

                    const dim = getStageDimensions();
                    const scenePrompt = `Eres un diseñador de niveles 2D experto. Construye el mapeado y la decoración para la zona "${scOverview.name || scOverview.id}" (${scOverview.id}).
Dimensiones exactas del escenario: Ancho ${dim.width}px, Alto ${dim.height}px.
Contexto global: ${skeletonData.globalObjective}.
Concepto de esta zona: ${scOverview.concept}.
Otras zonas existentes: ${skeletonData.scenesOverview.map(s => s.id).join(', ')}.

REGLAS DE DISEÑO DE MAPA:
1. El "groundPrompt" es EXCLUSIVAMENTE la textura del SUELO/PAVIMENTO (césped, arena, baldosas, piedra, tierra). NO debe incluir árboles, rocas, paredes o muebles.
2. Todo lo demás son elementos colocados sobre el suelo dentro de las coordenadas (x: 0 a ${dim.width}, y: 0 a ${dim.height}):
   - "decoracion": Árboles, rocas, estatuas, arbustos, columnas, muebles, vallas. Actúan como ambientación.
   - "entidad": Cofres, puertas de cambio de zona, NPCs, palancas, objetos interactivos.
3. Distribuye los elementos a lo largo de las dimensiones globales (${dim.width}x${dim.height}px).
4. Para la zona inicial (${skeletonData.startScene}), INCLUYE obligatoriamente un elemento jugador con "isPlayer": true.
5. Coloca obstáculos o límites de mapa usando "hasCollision": true para los elementos sólidos.

Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "groundPrompt": "Textura de suelo 2D lisa de césped y sendero de piedra, vista cenital top-down, sin elementos ni árboles",
  "reusableAssets": [
    { "typeId": "arbol_roble", "visualPrompt": "Árbol de roble frondoso estilo juego 2D vista top-down con fondo transparente" }
  ],
  "elements": [
    {
      "id": "elem_id",
      "type": "entidad|decoracion",
      "decorationType": "arbol_roble",
      "isPlayer": false,
      "x": 100, "y": 100, "width": 120, "height": 140,
      "hasCollision": true,
      "collisionX": 10, "collisionY": 100, "collisionW": 100, "collisionH": 40,
      "dialog": "Diálogo si aplica",
      "targetScene": "id_de_otra_zona_si_es_puerta",
      "addItem": ["item_id"],
      "removeItem": ["item_id"],
      "setVariable": { "varId": "nombre_var", "value": "true" },
      "condition": { "type": "none|variable|inventory", "varId": "", "op": "==", "targetVal": "", "itemId": "", "itemState": "has" },
      "visualPrompt": "Descripción única sólo si no usa decorationType"
    }
  ],
  "items": [
    { "id": "item_id", "name": "Nombre ítem", "prompt": "Descripción visual icono SVG" }
  ],
  "variables": [
    { "id": "nombre_var", "type": "boolean|number|string", "value": false }
  ]
}`;

                    const sceneDetail = await this.callGeminiJson(scenePrompt, apiKey);

                    this.checkpoint.detailedScenes[scOverview.id] = {
                        name: scOverview.name || scOverview.id,
                        elements: [],
                        backgroundPrompt: sceneDetail.groundPrompt || "Suelo de mapa 2D para videojuego"
                    };

                    if (sceneDetail.variables) {
                        sceneDetail.variables.forEach(v => {
                            this.checkpoint.globalVariables[v.id] = { type: v.type, value: v.value };
                        });
                    }

                    if (sceneDetail.items) {
                        sceneDetail.items.forEach(it => {
                            if (!projectData.itemsConfig) projectData.itemsConfig = {};
                            projectData.itemsConfig[it.id] = {
                                name: it.name,
                                imageAsset: `item_${it.id}.svg`
                            };
                            this.checkpoint.allItemsToGenerate.set(it.id, it.prompt);
                        });
                    }

                    // Registrar assets decorativos reutilizables
                    if (sceneDetail.reusableAssets) {
                        sceneDetail.reusableAssets.forEach(ra => {
                            if (!this.checkpoint.reusableDecorations.has(ra.typeId)) {
                                const assetFileName = `decor_${ra.typeId}.svg`;
                                this.checkpoint.reusableDecorations.set(ra.typeId, {
                                    fileName: assetFileName,
                                    prompt: ra.visualPrompt
                                });
                            }
                        });
                    }

                    // Procesar elementos posicionados en el mapa
                    if (sceneDetail.elements) {
                        sceneDetail.elements.forEach(elem => {
                            let elemImgName = "";
                            if (elem.decorationType && this.checkpoint.reusableDecorations.has(elem.decorationType)) {
                                elemImgName = this.checkpoint.reusableDecorations.get(elem.decorationType).fileName;
                            } else {
                                elemImgName = `elem_${scOverview.id}_${elem.id}.svg`;
                                this.checkpoint.allEntitiesToGenerate.push({
                                    fileName: elemImgName,
                                    prompt: elem.visualPrompt || elem.id
                                });
                            }

                            const newElem = {
                                id: elem.id || ('elem_' + Date.now() + Math.random().toString(36).substring(2, 5)),
                                image: elemImgName,
                                x: elem.x || 100,
                                y: elem.y || 100,
                                width: elem.width || 120,
                                height: elem.height || 120,
                                rotation: 0,
                                type: elem.type || 'decoracion',
                                isPlayer: !!elem.isPlayer,
                                hasCollision: elem.hasCollision !== undefined ? elem.hasCollision : (elem.type === 'decoracion'),
                                collisionX: elem.collisionX,
                                collisionY: elem.collisionY,
                                collisionW: elem.collisionW,
                                collisionH: elem.collisionH,
                                keepAspect: true,
                                dialog: elem.dialog || '',
                                targetScene: elem.targetScene || '',
                                addItem: elem.addItem || [],
                                removeItem: elem.removeItem || [],
                                condition: elem.condition || { type: 'none' },
                                setVariable: elem.setVariable || { varId: '', value: '' }
                            };
                            this.checkpoint.detailedScenes[scOverview.id].elements.push(newElem);
                        });
                    }

                    this.checkpoint.sceneIndex = i + 1;
                }
                this.checkpoint.stage = 'ETAPA_3';
            }

            // ==========================================
            // ETAPA 3: ENSAMBLAJE DE ESTRUCTURA Y LÓGICA
            // ==========================================
            if (this.checkpoint.stage === 'ETAPA_3') {
                this.log("Compilando mapa e integrando sistema de físicas...");
                this.updateProgress(40, "Etapa 3: Estructura de mapa ensamblada...");

                projectData.startScene = skeletonData.startScene || skeletonData.scenesOverview[0].id;
                projectData.scenes = this.checkpoint.detailedScenes;
                projectData.variablesConfig = this.checkpoint.globalVariables;

                this.checkpoint.stage = 'ETAPA_4_FONDOS';
                this.checkpoint.bgIndex = 0;
            }

            // ==========================================
            // ETAPA 4: PIPELINE DE ILUSTRACIÓN SVG
            // ==========================================
            const sceneKeys = Object.keys(projectData.scenes);

            // A. FONDOS DE SUELO
            if (this.checkpoint.stage === 'ETAPA_4_FONDOS') {
                this.log("Generando capas de suelo/terreno para las zonas...");
                while (this.checkpoint.bgIndex < sceneKeys.length) {
                    const i = this.checkpoint.bgIndex;
                    const sId = sceneKeys[i];
                    const sc = projectData.scenes[sId];
                    const bgFileName = `bg_${sId}.svg`;

                    this.log(`[Suelo Zona ${i + 1}/${sceneKeys.length}] Generando textura: ${sc.name}...`);
                    this.updateProgress(45 + Math.floor((i / sceneKeys.length) * 15), `Suelo SVG ${i + 1}/${sceneKeys.length}`);

                    const bgBlob = await agentIllustrator.generateSingleSVG(sc.backgroundPrompt, stylePrompt, apiKey, false, this.abortController);
                    await registerAsset(bgFileName, bgBlob, true);
                    if (typeof dirHandle !== 'undefined' && dirHandle) await agentIllustrator.saveFileToDisk(bgFileName, bgBlob);

                    const dim = getStageDimensions();
                    if (!sc.elements.some(e => e.id === `bg_elem_${sId}`)) {
                        sc.elements.unshift({
                            id: `bg_elem_${sId}`,
                            image: bgFileName,
                            x: 0,
                            y: 0,
                            width: dim.width,
                            height: dim.height,
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
                    }

                    this.checkpoint.bgIndex = i + 1;
                }
                this.checkpoint.stage = 'ETAPA_4_DECORACIONES';
                this.checkpoint.decorBatchIndex = 0;
            }

            // B. ELEMENTOS DECORATIVOS REUTILIZABLES
            if (this.checkpoint.stage === 'ETAPA_4_DECORACIONES') {
                this.log("Generando elementos decorativos reutilizables para el mapa...");
                const decorList = Array.from(this.checkpoint.reusableDecorations.values());
                let idx = 0;
                for (const decor of decorList) {
                    this.log(`[Decoración ${idx + 1}/${decorList.length}] Generando SVG: ${decor.fileName}...`);
                    const decorBlob = await agentIllustrator.generateSingleSVG(decor.prompt, stylePrompt, apiKey, true, this.abortController);
                    await registerAsset(decor.fileName, decorBlob, true);
                    if (typeof dirHandle !== 'undefined' && dirHandle) await agentIllustrator.saveFileToDisk(decor.fileName, decorBlob);
                    idx++;
                }
                this.checkpoint.stage = 'ETAPA_4_ITEMS';
                this.checkpoint.itemBatchIndex = 0;
            }

            // C. ÍTEMS
            if (this.checkpoint.stage === 'ETAPA_4_ITEMS') {
                this.log("Generando ítems de inventario en tandas...");
                const itemEntries = Array.from(this.checkpoint.allItemsToGenerate.entries());
                while (this.checkpoint.itemBatchIndex < itemEntries.length) {
                    const i = this.checkpoint.itemBatchIndex;
                    const batch = itemEntries.slice(i, i + 4);

                    this.log(`Tanda de ítems (${batch.map(b => b[0]).join(', ')})...`);
                    this.updateProgress(70 + Math.floor((i / Math.max(1, itemEntries.length)) * 10), `Ítems SVG (${i + 1}/${itemEntries.length})`);

                    await agentIllustrator.generateBatchItemsSVG(batch, stylePrompt, apiKey, this.abortController);
                    this.checkpoint.itemBatchIndex = i + 4;
                }
                this.checkpoint.stage = 'ETAPA_4_ENTIDADES';
                this.checkpoint.entityIndex = 0;
            }

            // D. ENTIDADES ÚNICAS Y PERSONAJE JUGADOR
            if (this.checkpoint.stage === 'ETAPA_4_ENTIDADES') {
                this.log("Generando entidades e interactivos únicos...");
                const entities = this.checkpoint.allEntitiesToGenerate;
                while (this.checkpoint.entityIndex < entities.length) {
                    const i = this.checkpoint.entityIndex;
                    const entity = entities[i];

                    this.log(`[Entidad ${i + 1}/${entities.length}] Generando SVG: ${entity.fileName}...`);
                    this.updateProgress(85 + Math.floor((i / Math.max(1, entities.length)) * 10), `Entidad SVG ${i + 1}/${entities.length}`);

                    const entityBlob = await agentIllustrator.generateSingleSVG(entity.prompt, stylePrompt, apiKey, true, this.abortController);
                    await registerAsset(entity.fileName, entityBlob, true);
                    if (typeof dirHandle !== 'undefined' && dirHandle) await agentIllustrator.saveFileToDisk(entity.fileName, entityBlob);

                    this.checkpoint.entityIndex = i + 1;
                }
                this.checkpoint.stage = 'ETAPA_5';
            }

            // ==========================================
            // ETAPA 5: FINALIZACIÓN
            // ==========================================
            if (this.checkpoint.stage === 'ETAPA_5') {
                this.log("Guardando proyecto y actualizando interfaz...");
                currentSceneId = projectData.startScene;
                await autoSaveJSON();
                renderSceneTabs();
                renderStage();
                updateInventoryConfigUI();
                updateVariablesConfigUI();
                this.updateProgress(100, "¡Juego 2D generado con éxito!");
                this.log("Proceso completado exitosamente!");
                this.resetState();
            }

        } catch (err) {
            console.error("Error en Agente Orquestador:", err);
            this.log(`Interrupción: ${err.message}`);
            this.updateProgress(0, "Proceso pausado por error.");
            this.showResumeButton(`Reanudar desde paso actual`);
        } finally {
            this.isGenerating = false;
            if (btnStart) btnStart.disabled = false;
        }
    }

    async callGeminiJson(promptText, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const res = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: this.abortController ? this.abortController.signal : null
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

async function fetchWithTimeout(resource, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: options.signal || controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Tiempo de espera agotado (Timeout) en la petición a Gemini API.');
        }
        throw error;
    }
}

const agentOrchestrator = new AgentOrchestrator();