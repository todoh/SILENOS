// agent-stage1-elements.js - FASE 1: ELABORACIÓN DE ELEMENTOS Y OBJETOS DEL AGENTE
class AgentStage1Elements {
    constructor() {
        this.isGenerating = false;
    }

    // Calcular la caja de colisión ideal en la base según la categoría y plano visual
    calculateBaseCollision(elem, widthPx, heightPx, billboardMode) {
        if (elem.hasCollision === false) {
            return { collisionX: 0, collisionY: 0, collisionW: widthPx, collisionH: heightPx };
        }

        const cat = String(elem.category || '').toLowerCase();

        // 1. Elementos verticales, árboles, plantas, farolas, postes o con proyección en X
        if (billboardMode === 'cross_x' || cat === 'planta' || elem.planeMode === 'plano_x') {
            const colW = Math.max(8, Math.round(widthPx * 0.35));
            const colH = Math.max(8, Math.round(heightPx * 0.15));
            const colX = Math.round((widthPx - colW) / 2);
            const colY = Math.round(heightPx * 0.82);
            return { collisionX: colX, collisionY: colY, collisionW: colW, collisionH: colH };
        }

        // 2. Personajes, NPCs y criaturas (colisión ligera solo en pies/base)
        if (cat === 'npc' || cat === 'animal') {
            const colW = Math.max(8, Math.round(widthPx * 0.5));
            const colH = Math.max(8, Math.round(heightPx * 0.2));
            const colX = Math.round((widthPx - colW) / 2);
            const colY = Math.round(heightPx * 0.8);
            return { collisionX: colX, collisionY: colY, collisionW: colW, collisionH: colH };
        }

        // 3. Muebles, estructuras y artefactos (colisión en el 30% inferior)
        if (cat === 'mueble' || cat === 'artefacto' || cat === 'maquina' || cat === 'vehiculo') {
            const colW = Math.max(8, Math.round(widthPx * 0.85));
            const colH = Math.max(8, Math.round(heightPx * 0.35));
            const colX = Math.round((widthPx - colW) / 2);
            const colY = Math.round(heightPx * 0.65);
            return { collisionX: colX, collisionY: colY, collisionW: colW, collisionH: colH };
        }

        // 4. Fallback general para objetos sólidos (base centrada al 25% de la altura)
        const colW = Math.max(8, Math.round(widthPx * 0.7));
        const colH = Math.max(8, Math.round(heightPx * 0.25));
        const colX = Math.round((widthPx - colW) / 2);
        const colY = Math.round(heightPx * 0.75);
        return { collisionX: colX, collisionY: colY, collisionW: colW, collisionH: colH };
    }

    async generateElementsBatch(promptText, stylePrompt, apiKey, abortController = null, onProgress = null) {
        if (this.isGenerating) return;
        this.isGenerating = true;

        try {
            if (onProgress) onProgress(10, "Fase 1: Analizando y diseñando catálogo de elementos...");
            
            // Obtener configuración de escala Px/Metro activa
            const pxPerMeter = agentScaleGuide.pxPerMeter;

            const prompt = `Eres un diseñador de videojuegos 2D/2.5D experto. Analiza la siguiente solicitud del usuario y genera un catálogo estructurado de elementos y objetos interactivos: "${promptText}".

REGLAS DE DISEÑO DE ELEMENTOS, ESCALA (${pxPerMeter}px = 1 METRO) Y PROPORCIONES:
1. Categorías válidas: "npc", "animal", "mueble", "artefacto", "item", "planta", "vehiculo", "maquina", "decoracion".
2. Asigna dimensiones reales en metros (widthMeters, heightMeters) y conviértelas a píxeles aproximados (width, height).
3. "planeMode" (Configuración del plano visual):
   - "plano_x": OBLIGATORIO para árboles, flores, plantas, farolas, postes y prácticamente CUALQUIER elemento vertical, redondo, esférico, cilíndrico o similar (para dar más volumen al objeto con proyección en X / cross_x).
   - "plano_fijo": OBLIGATORIO para TODO LO DEMÁS (personajes, NPCs, muebles, puertas, artefactos, estructuras) para mantenerse en ÁNGULO FIJO recto a 90° con respecto al suelo.
   - "suelo": Exclusivamente para alfombras, senderos, charcos, hierba baja pegados al terreno.
   - "muro": Para paredes, cajas tridimensionales, rocas sólidas o columnas con volumen 3D.
4. PROPORCIONES Y ESTILO DE PERSONAJES:
   - Los personajes y NPCs deben tener PROPORCIONES REALISTAS (anatomía estilizada de proporciones humanas reales, ~7-8 cabezas de alto).
   - Queda ESTRICTAMENTE PROHIBIDO el estilo "chibi", "chubi", cabezón o con proporciones infantiles/caricaturescas de videojuego.
   - En "visualPrompt", especifica explícitamente: "proporciones realistas humanas, cuerpo estilizado maduro, NO chibi, NO chubi".
5. "movePattern": "none" (quieto), "random" (movimiento aleatorio), "waypoints" (patrulla).
6. "hasCollision": true para elementos sólidos (árboles, paredes, muebles), false para elementos atravesables.
7. Interactividad:
   - "dialog": Texto expuesto al hacer clic o interactuar (si aplica).
   - "addItem": Lista de IDs de ítems que otorga al interactuar (ej: ["llave_dorada"]).
   - "removeItem": Lista de IDs de ítems que consume al interactuar.
   - "transformAsset": ID del elemento guardado en el que se transforma al usarse (si aplica).

Devuelve ÚNICAMENTE un objeto JSON válido con este formato:
{
  "elements": [
    {
      "id": "mercader_goblin",
      "name": "Mercader Goblin",
      "category": "npc",
      "visualPrompt": "Goblin mercader con saco de monedas, proporciones realistas de cuerpo humano de 7 cabezas de alto, no chibi, no chubi, vista frontal, estilo vectorial 2D con fondo transparente",
      "widthMeters": 1.7,
      "heightMeters": 1.75,
      "planeMode": "plano_fijo",
      "movePattern": "none",
      "hasCollision": true,
      "dialog": "¡Bienvenido a mi tienda! ¿Qué buscas hoy?",
      "addItem": [],
      "removeItem": [],
      "transformAsset": ""
    }
  ]
}`;

            const response = await this.callGeminiJson(prompt, apiKey, abortController);
            if (!response || !response.elements || !Array.isArray(response.elements)) {
                throw new Error("Respuesta no válida al generar elementos.");
            }

            const generatedElements = response.elements;
            const total = generatedElements.length;

            if (onProgress) onProgress(30, `Generando gráficos SVG para ${total} elementos en tandas de máximo 10...`);

            if (!projectData.savedElementsConfig) {
                projectData.savedElementsConfig = {};
            }

            // Procesamiento en tandas paralelas de 10 como máximo
            const BATCH_SIZE = 10;
            let completedCount = 0;

            for (let i = 0; i < total; i += BATCH_SIZE) {
                const chunk = generatedElements.slice(i, i + BATCH_SIZE);
                await Promise.all(chunk.map(async (elem) => {
                    // Calcular dimensiones finales basadas en la guía de escala
                    const catDims = agentScaleGuide.getCategoryDimensions(elem.category, elem.heightMeters);
                    const widthPx = elem.widthMeters ? agentScaleGuide.metersToPx(elem.widthMeters) : catDims.pxWidth;
                    const heightPx = elem.heightMeters ? agentScaleGuide.metersToPx(elem.heightMeters) : catDims.pxHeight;

                    // Nombre único asegurando colisión cero de IDs entre llamadas concurrentes
                    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
                    const svgFileName = `saved_${elem.id}_${Date.now().toString(36)}_${uniqueSuffix}.svg`;

                    const isEntity = elem.category !== 'suelo';

                    // Generar gráfico SVG vectorial mediante la API de Gemini (Llamada paralela)
                    let svgBlob = await agentIllustrator.generateSingleSVG(
                        elem.visualPrompt || elem.name,
                        stylePrompt,
                        apiKey,
                        isEntity,
                        abortController
                    );

                    // Cropear espacios vacíos del SVG para un encuadre sin margen sobrante
                    if (typeof cropSVG === 'function') {
                        try {
                            const rawSvgText = await svgBlob.text();
                            const croppedText = await cropSVG(rawSvgText);
                            svgBlob = new Blob([croppedText], { type: 'image/svg+xml' });
                        } catch (cropErr) {
                            console.warn(`Aviso: No se pudo cropear el SVG de ${elem.id}:`, cropErr);
                        }
                    }

                    await registerAsset(svgFileName, svgBlob, true);
                    if (typeof dirHandle !== 'undefined' && dirHandle) {
                        await agentIllustrator.saveFileToDisk(svgFileName, svgBlob);
                    }

                    // Resolver billboardMode
                    const billboardMode = agentScaleGuide.resolveBillboardMode(elem.planeMode);

                    // Ajustar la colisión estrictamente a la base inferior del objeto
                    const collisionData = this.calculateBaseCollision(elem, widthPx, heightPx, billboardMode);

                    // Construir objeto de Elemento Guardado compatible con "ELEMENTOS"
                    const savedKey = `saved_${elem.id}`;
                    const savedElementObj = {
                        savedName: elem.name || elem.id,
                        image: svgFileName,
                        width: widthPx,
                        height: heightPx,
                        rotation: 0,
                        type: elem.category === 'suelo' ? 'fondo' : 'entidad',
                        billboardMode: billboardMode,
                        hasCollision: elem.hasCollision !== undefined ? elem.hasCollision : true,
                        collisionX: collisionData.collisionX,
                        collisionY: collisionData.collisionY,
                        collisionW: collisionData.collisionW,
                        collisionH: collisionData.collisionH,
                        movePattern: elem.movePattern || 'none',
                        dialog: elem.dialog || '',
                        targetScene: '',
                        addItem: elem.addItem || [],
                        removeItem: elem.removeItem || [],
                        transformAsset: elem.transformAsset || '',
                        condition: { type: 'none' },
                        setVariable: { varId: '', value: '' }
                    };

                    // Guardar directamente en el catálogo "ELEMENTOS"
                    projectData.savedElementsConfig[savedKey] = savedElementObj;

                    completedCount++;
                    const progressPct = 30 + Math.floor((completedCount / total) * 60);
                    if (onProgress) {
                        onProgress(progressPct, `[${completedCount}/${total}] Ilustrado SVG: ${elem.name || elem.id}...`);
                    }
                }));
            }

            if (typeof autoSaveJSON === 'function') await autoSaveJSON();
            if (typeof updateElementsUI === 'function') updateElementsUI();
            if (onProgress) onProgress(100, `¡Se han guardado ${total} elementos en ELEMENTOS!`);

            return generatedElements;

        } catch (err) {
            console.error("Error en Fase 1 (Elaboración de Elementos):", err);
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

const agentStage1Elements = new AgentStage1Elements();