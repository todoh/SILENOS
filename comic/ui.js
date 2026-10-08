// ui.js
window.ComicPipeline = window.ComicPipeline || {};
const ComicPipeline = {
    state: {
        storyPlan: null,
        bible: null,
        baseScript: null,
        script: null,
        prompts: null,
        includeCover: false,
        comicCoverTitle: "",
        imageScale: "1.0", // Guardado de escala activa
        ingredients: [] // Contenedor de ingredientes visuales
    },
    dirHandle: null,
    modalResolver: null,
    parseSafeJSON(jsonStr) {
        if (!jsonStr) return {};
        let cleaned = String(jsonStr)
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\u00A0/g, ' ');
        cleaned = SagaGemini.cleanJson(cleaned);
        try {
            return JSON.parse(cleaned);
        } catch (e) {
            console.warn("[SAGA] Primer intento de parsing falló. Reintentando limpieza agresiva...", e);
            try {
                const sanitizeNewlines = cleaned.replace(/\r?\n/g, " ");
                return JSON.parse(sanitizeNewlines);
            } catch (e2) {
                const fallbackClean = cleaned.trim().replace(/^[^\[\{]+/, '').replace(/[^\]\}]+$/, '');
                return JSON.parse(fallbackClean);
            }
        }
    },
    cleanBase64FromText(text) {
        if (!text) return "";
        let cleaned = text.replace(/data:image\/[a-zA-Z]+;base64,[^"'\s\)]+/g, '');
        cleaned = cleaned.replace(/"[A-Za-z0-9+\/=]{100,}"/g, '""');
        return cleaned.trim();
    },
    cleanBibleObject(bibleObj) {
        if (!bibleObj || typeof bibleObj !== 'object') return bibleObj;
        const cleaned = JSON.parse(JSON.stringify(bibleObj));
        const removeBase64Recursively = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            for (const key in obj) {
                if (key.toLowerCase().includes('base64') || key.toLowerCase().includes('image_data')) {
                    delete obj[key];
                } else if (typeof obj[key] === 'string') {
                    if (obj[key].startsWith('data:image/')) {
                        obj[key] = '';
                    }
                } else if (typeof obj[key] === 'object') {
                    removeBase64Recursively(obj[key]);
                }
            }
        };
        removeBase64Recursively(cleaned);
        return cleaned;
    },
    async generateAutoBible() {
        saveSettings();
        const title = document.getElementById('comic-title').value.trim();
        const style = document.getElementById('comic-style').value.trim();
        let existingBible = document.getElementById('comic-bible').value.trim();
        existingBible = this.cleanBase64FromText(existingBible);
        document.getElementById('comic-bible').value = existingBible;
        if (!title && !existingBible) {
            alert("Escribe la trama/premisa o pega información en la Biblia Visual para generar.");
            return;
        }
        this.updateStepTag(0, 'active');
        const prompt = `Analiza la premisa del cómic y la información visual proporcionada por el usuario:
Premisa / Trama: "${title}"
Datos Visuales Preexistentes: "${existingBible || 'Ninguno'}"
Estilo artístico deseado: "${style}".
Genera una Biblia Visual de Coherencia en formato JSON puro. DEBES incorporar y respetar fielmente cualquier texto, objeto, vehículo, personaje o escenario proporcionado.
REGLAS ESTRUCTURALES Y NARRATIVAS:
1. Define para cada personaje no solo su físico, sino su estilo de habla/idiolecto y paleta de colores distintiva.
2. NUNCA, BAJO NINGUNA CIRCUNSTANCIA, INCLUYAS NOMBRES PROPIOS DENTRO DEL CAMPO "anchor_en".
3. "anchor_en" debe contener ÚNICAMENTE la descripción física visual pura en inglés (edad, etnia, peinado, ropa exacta, materiales, paleta de color, marcas distintivas).
4. QUEDA PROHIBIDO INCLUIR IMÁGENES O CADENAS DE TEXTO BASE64 EN EL JSON RESULTANTE.

Responde exclusivamente con este JSON puro usando exactamente esta estructura de claves:
{
  "personajes": [{"nombre": "Malder The Monk", "idiolecto": "Flujo rítmico de rap, beatbox", "anchor_en": "12th century benedictine monk in brown habit, energetic posture, expressive hands, medieval monastery background"}],
  "props": [{"objeto": "Sacos de harina", "anchor_en": "three hessian burlap flour sacks, dusty texture, medieval marketplace setting"}],
  "vehiculos": [],
  "entornos": [{"nombre": "Monasterio benedictino", "anchor_en": "12th century stone monastery cloister, foggy atmosphere, sunlight filtering through arches"}]
}`;
        try {
            const rawJson = await SagaGemini.generateText(prompt);
            let cleaned = SagaGemini.cleanJson(rawJson);
            cleaned = this.cleanBase64FromText(cleaned);
            document.getElementById('comic-bible').value = cleaned;
            const parsedBible = this.parseSafeJSON(cleaned);
            this.state.bible = this.cleanBibleObject(parsedBible);
            this.updateStepTag(0, 'completed');
            if (typeof this.renderIngredientsUI === 'function') {
                this.renderIngredientsUI();
            }
            await this.autoSave();
        } catch (e) {
            alert("Error al auto-generar Biblia Visual: " + e.message);
        }
    },
    async resumePipeline() {
        await this.startPipeline(true);
    },
    async startPipeline(resumeMode = false) {
        try {
            saveSettings();
            const rawCoverTitle = document.getElementById('comic-cover-title').value.trim();
            const rawPlot = document.getElementById('comic-title').value.trim();
            const coverTitle = rawCoverTitle || rawPlot || "SAGA COMIC";
            const plotText = rawPlot || rawCoverTitle;
            const pages = parseInt(document.getElementById('comic-pages').value, 10);
            const style = document.getElementById('comic-style').value.trim();
            const format = document.getElementById('comic-page-format').value;
            let bibleText = document.getElementById('comic-bible').value.trim();
            bibleText = this.cleanBase64FromText(bibleText);
            document.getElementById('comic-bible').value = bibleText;
            const lang = document.getElementById('comic-lang').value;
            const includeCover = document.getElementById('comic-include-cover').checked;
            
            this.state.includeCover = includeCover;
            this.state.comicCoverTitle = coverTitle;
            if (this.state.bible) {
                this.state.bible = this.cleanBibleObject(this.state.bible);
            }
            
            if (!plotText) { alert("Introduce un título o una premisa para el cómic."); return; }
            
            if (!resumeMode) {
                if (this.state.storyPlan || this.state.baseScript || this.state.script || this.state.prompts) {
                    const confirmRestart = confirm("¿Deseas reiniciar el pipeline desde cero? Esto reiniciará el progreso guardado anteriormente.");
                    if (!confirmRestart) return;
                }
                this.state.storyPlan = null;
                this.state.bible = null;
                this.state.baseScript = null;
                this.state.script = null;
                this.state.prompts = null;
            }
            
            if (!bibleText) {
                await this.generateAutoBible();
                bibleText = document.getElementById('comic-bible').value.trim();
                bibleText = this.cleanBase64FromText(bibleText);
                if (!bibleText) return;
            }
            
            // FASE 1: PLAN GLOBAL
            const BLOCK_SIZE_PLAN = 10;
            const totalPlanBlocks = Math.ceil(pages / BLOCK_SIZE_PLAN);
            
            if (!this.state.storyPlan) {
                this.state.storyPlan = {
                    resumen_argumental: "",
                    arco_dramatico: "",
                    elementos_nuevos_necesarios: {},
                    bloques: [],
                    plan_por_pagina: []
                };
            }
            
            const hasBlocksPlan = this.state.storyPlan.bloques && this.state.storyPlan.bloques.length > 0;
            if (!resumeMode || !hasBlocksPlan) {
                this.updateStepTag(0, 'active');
                const promptCall1_Blocks = `Eres un Executive Producer, Showrunner y Guionista Senior de Novelas Gráficas de Gran Extensión. Diseña el esquema argumental modular dividiendo la obra en BLOQUES NARRATIVOS (arcos) de aproximadamente ${BLOCK_SIZE_PLAN} páginas cada uno para un total de EXACTAMENTE ${pages} PÁGINAS INTERIORES (${totalPlanBlocks} bloques en total).
Título: ${coverTitle}
Premisa Inicial: ${plotText}
Extensión Exigida: ${pages} páginas interiores (${totalPlanBlocks} bloques)
Estilo Visual: ${style}
Biblia Visual Actual: ${bibleText}
INSTRUCCIONES DE PLANIFICACIÓN POR BLOQUES:
1. Divide la historia en ${totalPlanBlocks} bloques narrativos. Cada bloque abarcará un rango de páginas.
2. Asigna a cada bloque un título, objetivo dramático, conflicto principal y gancho de cierre.
3. Asegura una progresión épica y coherente en los 3 actos.
4. Aplica el principio "Show, Don't Tell".

Responde ÚNICAMENTE con este JSON puro sin caracteres de escape no válidos:
{
  "resumen_argumental": "Sinopsis extendida general de la obra de ${pages} páginas",
  "arco_dramatico": "Desglose general por actos dramáticos",
  "elementos_nuevos_necesarios": {
    "personajes_adicionales": [{"nombre": "Nombre", "rol": "Función", "descripcion_fisica_sugerida": "Rasgos"}],
    "props_adicionales": [{"objeto": "Nombre", "funcion": "Uso"}],
    "vehiculos_adicionales": [{"nombre": "Nombre", "descripcion": "Sugerencia"}],
    "entornos_adicionales": [{"nombre": "Lugar", "descripcion": "Atmósfera e iluminación"}]
  },
  "bloques": [
    {
      "num_bloque": 1,
      "paginas_inicio": 1,
      "paginas_fin": ${Math.min(BLOCK_SIZE_PLAN, pages)},
      "titulo_bloque": "Título o nombre del arco",
      "objetivo_narrativo": "Objetivo del bloque",
      "conflicto_clave": "Conflicto o clímax del bloque",
      "gancho_final": "Gancho al final del bloque"
    }
  ]
}`;
                let rawBlocksPlan = await SagaGemini.generateText(promptCall1_Blocks);
                const parsedBlocks = this.parseSafeJSON(rawBlocksPlan);
                this.state.storyPlan.resumen_argumental = parsedBlocks.resumen_argumental || "";
                this.state.storyPlan.arco_dramatico = parsedBlocks.arco_dramatico || "";
                this.state.storyPlan.elementos_nuevos_necesarios = parsedBlocks.elementos_nuevos_necesarios || {};
                this.state.storyPlan.bloques = parsedBlocks.bloques || [];
                if (!this.state.storyPlan.plan_por_pagina) this.state.storyPlan.plan_por_pagina = [];
                await this.autoSave();
            }
            
            for (let pb = 0; pb < totalPlanBlocks; pb++) {
                const startPg = pb * BLOCK_SIZE_PLAN + 1;
                const endPg = Math.min(pages, (pb + 1) * BLOCK_SIZE_PLAN);
                const blockInfo = this.state.storyPlan.bloques.find(b => b.num_bloque === (pb + 1)) || {
                    num_bloque: pb + 1,
                    paginas_inicio: startPg,
                    paginas_fin: endPg,
                    titulo_bloque: `Bloque ${pb + 1}`
                };
                
                const hasPagesForBlock = this.state.storyPlan.plan_por_pagina.some(p => p.pagina >= startPg && p.pagina <= endPg);
                if (!resumeMode || !hasPagesForBlock) {
                    this.updateStepTag(0, 'active');
                    const prevPagesPlan = this.state.storyPlan.plan_por_pagina.filter(p => p.pagina < startPg);
                    const prevSummary = prevPagesPlan.length > 0 
                        ? prevPagesPlan.map(p => `Pág ${p.pagina}: [Objetivo] ${p.objetivo_narrativo} -> [Gancho] ${p.gancho_final}`).join('\n')
                        : "Inicio de la obra.";
                    
                    const promptCall1_Pages = `Eres un Guionista Principal de Cómics. Estás detallando la planificación página a página para el BLOQUE ${pb + 1} de ${totalPlanBlocks} (Páginas ${startPg} a ${endPg}).
Título general: ${coverTitle}
Resumen General: ${this.state.storyPlan.resumen_argumental}
Información del Bloque Actual: ${JSON.stringify(blockInfo)}
RESUMEN DE PÁGINAS ANTERIORES YA PLANIFICADAS:
${prevSummary}
INSTRUCCIONES DE DESGLOSE POR PÁGINA:
1. Genera exactamente la planificación para cada página individual desde la página ${startPg} hasta la página ${endPg}.
2. Cada página debe poseer un objetivo dramático claro y un gancho final de tensión.
3. Garantiza la continuidad directa respecto al bloque anterior.

Responde ÚNICAMENTE con este JSON puro:
{
  "plan_paginas": [
    {
      "pagina": ${startPg},
      "objetivo_narrativo": "Objetivo de esta página",
      "gancho_final": "Gancho o momento de tensión al final de la página"
    }
  ]
}`;
                    let rawBlockPages = await SagaGemini.generateText(promptCall1_Pages);
                    const parsedPages = this.parseSafeJSON(rawBlockPages);
                    const newPages = parsedPages.plan_paginas || parsedPages.plan_por_pagina || [];
                    this.state.storyPlan.plan_por_pagina = [
                        ...this.state.storyPlan.plan_por_pagina.filter(p => p.pagina < startPg || p.pagina > endPg),
                        ...newPages
                    ].sort((a, b) => a.pagina - b.pagina);
                    await this.autoSave();
                }
            }
            this.updateStepTag(0, 'completed');
            
            // FASE 2: BIBLIA VISUAL V2
            if (resumeMode && this.state.bible && this.state.bible.version === 2) {
                console.log("-> Retomando Llamada 2: Biblia Visual v2 cargada previamente.");
                this.updateStepTag(1, 'completed');
            } else {
                this.updateStepTag(1, 'active');
                const promptCall2 = `Eres un Director Visual y Art Director de Cine y Novelas Gráficas. Fusiona la Biblia Visual Base inicial con los nuevos elementos aprobados para generar la BIBLIA VISUAL VERSIÓN 2 DEFINITIVA.
Biblia Base Previa: ${bibleText}
Plan Argumental Aprobado (Llamada 1): ${JSON.stringify(this.state.storyPlan)}
REGLAS DE ORO PARA "anchor_en":
1. PROHIBIDO INCLUIR NOMBRES PROPIOS EN EL CAMPO "anchor_en".
2. Cada "anchor_en" debe ser una descripción detallada en inglés con: edad, rasgos faciales, peinado, atuendo exacto, texturas de materiales, esquema de iluminación por defecto e idiolecto visual.
3. QUEDA ESTRICTAMENTE PROHIBIDO INCLUIR O GENERAR IMÁGENES O CADENAS DE TEXTO BASE64.

Responde ÚNICAMENTE con este JSON puro:
{
  "version": 2,
  "personajes": [{"nombre": "Nombre", "anchor_en": "pure English detailed visual description without proper names, exact facial features, outfit, color accents"}],
  "props": [{"objeto": "Nombre", "anchor_en": "pure English detailed description, materials, lighting"}],
  "vehiculos": [{"nombre": "Nombre", "anchor_en": "pure English detailed description, wear and tear, glow details"}],
  "entornos": [{"nombre": "Lugar", "anchor_en": "pure English environment, architectural details, volumetric lighting, atmospheric weather"}]
}`;
                let rawBibleV2 = await SagaGemini.generateText(promptCall2);
                let cleanedBibleV2 = SagaGemini.cleanJson(rawBibleV2);
                cleanedBibleV2 = this.cleanBase64FromText(cleanedBibleV2);
                document.getElementById('comic-bible').value = cleanedBibleV2;
                const parsedBibleV2 = this.parseSafeJSON(cleanedBibleV2);
                this.state.bible = this.cleanBibleObject(parsedBibleV2);
                this.updateStepTag(1, 'completed');
                if (typeof this.renderIngredientsUI === 'function') {
                    this.renderIngredientsUI();
                }
                await this.autoSave();
            }
            
            // FASE 3: GENERACIÓN EN LOTES
            const BATCH_SIZE = 5;
            const totalBatches = Math.ceil(pages / BATCH_SIZE);
            if (!this.state.baseScript) this.state.baseScript = { guion_base_paginas: [] };
            if (!this.state.script) this.state.script = { paginas: [] };
            if (!this.state.prompts) this.state.prompts = [];
            
            for (let b = 0; b < totalBatches; b++) {
                const startPg = b * BATCH_SIZE + 1;
                const endPg = Math.min(pages, (b + 1) * BATCH_SIZE);
                const batchTag = `Lote ${b + 1}/${totalBatches} (Págs ${startPg}-${endPg})`;
                
                const hasBaseBatch = this.state.baseScript.guion_base_paginas.some(p => p.pagina >= startPg && p.pagina <= endPg);
                if (!resumeMode || !hasBaseBatch) {
                    this.updateStepTag(2, 'active');
                    const prevPagesScript = this.state.baseScript.guion_base_paginas.filter(p => p.pagina < startPg);
                    const prevContextSummary = prevPagesScript.length > 0 
                        ? prevPagesScript.map(p => `Pág ${p.pagina}: [Evento] ${p.resumen_evento} -> [Desarrollo] ${p.desarrollo_narrativo}`).join('\n')
                        : "Inicio de la obra (sin páginas anteriores).";
                    const planSubset = this.state.storyPlan.plan_por_pagina.filter(p => p.pagina >= startPg && p.pagina <= endPg);
                    
                    const promptCall3 = `Eres un Guionista Principal de Cómics. Escribe el GUIÓN BASE NARRATIVO DETALLADO para el ${batchTag}.
Título: ${coverTitle} | Idioma: ${lang}
Biblia Visual v2: ${JSON.stringify(this.state.bible)}
Plan Argumental de este Lote: ${JSON.stringify(planSubset)}
RESUMEN ACUMULADO DE PÁGINAS ANTERIORES (COHERENCIA MÁXIMA):
${prevContextSummary}
INSTRUCCIONES DE DIÁLOGO Y NARRACIÓN:
- Mantén la continuidad directa de las situaciones, objetos en posesión y estado emocional de los personajes tras el final del bloque anterior.
- Diálogos breves, incisivos y con subtexto.
- Cartuchos narrativos solo para tono poético o transiciones.

Responde ÚNICAMENTE con este JSON puro:
{
  "guion_base_paginas": [
    {
      "pagina": ${startPg},
      "resumen_evento": "Descripción clara del evento",
      "lugar_entorno": "Lugar exacto de la Biblia v2",
      "personajes_presentes": ["Lista de personajes"],
      "props_y_vehiculos": ["Lista de props o vehículos"],
      "desarrollo_narrativo": "Detalle secuencial de la escena, emociones y ritmo"
    }
  ]
}`;
                    let rawBaseScript = await SagaGemini.generateText(promptCall3);
                    const parsedBase = this.parseSafeJSON(rawBaseScript);
                    this.state.baseScript.guion_base_paginas = [
                        ...this.state.baseScript.guion_base_paginas.filter(p => p.pagina < startPg || p.pagina > endPg),
                        ...(parsedBase.guion_base_paginas || [])
                    ].sort((a, b) => a.pagina - b.pagina);
                    await this.autoSave();
                }
                
                const hasScriptBatch = this.state.script.paginas.some(p => p.pagina >= startPg && p.pagina <= endPg);
                if (!resumeMode || !hasScriptBatch) {
                    this.updateStepTag(3, 'active');
                    const baseScriptSubset = this.state.baseScript.guion_base_paginas.filter(p => p.pagina >= startPg && p.pagina <= endPg);
                    
                    const promptCall4 = `Eres un Director de Fotografía y Maquetador Senior de Cómics. Convierte el GUIÓN BASE del ${batchTag} en el GUIÓN TÉCNICO MASTER DE VIÑETAS, LENTES Y CÁMARA.
Título: ${coverTitle} | Formato: ${format.toUpperCase()}
Guión Base del Lote: ${JSON.stringify(baseScriptSubset)}
Biblia Visual v2: ${JSON.stringify(this.state.bible)}
REGLAS CINEMATOGRÁFICAS Y DE LAYOUT (1 A 8 VIÑETAS POR PÁGINA):
1. GRID DE 12 COLUMNAS: La suma de "grid_span" en cada fila DEBE SER EXACTAMENTE 12.
2. COMPOSICIÓN Y CÁMARA: Especifica encuadre (GPG, Contrapicado, Picado, Plano Holandés, PP), lentes (24mm, 35mm, 85mm) e iluminación.
3. PROFUNDIDAD EN 3 PLANOS: Foreground, midground, background.
4. ESPACIO NEGATIVO: Espacio para cartuchos y bocadillos.
5. ONOMATOPEYAS: FX si aplica.

Responde EXCLUSIVAMENTE con este JSON puro:
{
  "paginas": [
    {
      "pagina": ${startPg},
      "vinetas": [
        {
          "vineta": 1,
          "grid_span": 12,
          "camara": "Ángulo, lente, iluminación...",
          "accion": "Descripción visual detallada...",
          "cartucho": "Texto narrativo en ${lang} o vacío",
          "dialogo": "Diálogo del personaje en ${lang} o vacío",
          "onomatopeya": "FX o vacío"
        }
      ]
    }
  ]
}`;
                    let rawScript = await SagaGemini.generateText(promptCall4);
                    const parsedScript = this.parseSafeJSON(rawScript);
                    this.state.script.paginas = [
                        ...this.state.script.paginas.filter(p => p.pagina < startPg || p.pagina > endPg),
                        ...(parsedScript.paginas || [])
                    ].sort((a, b) => a.pagina - b.pagina);
                    await this.autoSave();
                }
                
                const hasPromptsBatch = this.state.prompts.some(p => p.pagina >= startPg && p.pagina <= endPg);
                if (!resumeMode || !hasPromptsBatch) {
                    this.updateStepTag(4, 'active');
                    const scriptBatchSubset = this.state.script.paginas.filter(p => p.pagina >= startPg && p.pagina <= endPg);
                    const isFirstBatchWithCover = (b === 0 && includeCover && !this.state.prompts.some(p => p.pagina === 0));
                    
                    const promptPromptsRefiner = `Eres un Master Concept Artist y Prompt Engineer para SDXL, Lumina, Flux y ComfyUI. Genera PROMPTS TÉCNICOS DETALLADOS EN INGLÉS para las viñetas del ${batchTag}.
ESTILO GLOBAL: ${style}
BIBLIA VISUAL V2 (ANCHORS): ${JSON.stringify(this.state.bible, null, 2)}
GUIÓN TÉCNICO DEL LOTE: ${JSON.stringify(scriptBatchSubset, null, 2)}
${isFirstBatchWithCover ? `INCLUYE PROMPT PARA LA PORTADA (Página 0, Viñeta 1) con título "${coverTitle}".` : ''}
REGLAS DE INGENIERÍA DE PROMPTS Y OBLIGACIÓN DE INGREDIENTES:
1. REGLA FUNDAMENTAL DE INGREDIENTES: Identifica explícitamente en el array "elementos_presentes" los nombres o títulos exactos de los personajes, props, vehículos o entornos de la Biblia Visual v2 que aparecen en esta viñeta (p. ej. ["Malder The Monk", "Monasterio benedictino"]).
2. SUSTITUCIÓN DE ANCHORS: En el texto del "prompt", incluye tanto el nombre de la entidad como su "anchor_en" exacto o descripción detallada.
3. ESTRUCTURA: [ESTILO GLOBAL] + [NOMBRE ELEMENTO Y ANCHOR_EN DE BIBLIA] + [TIPO DE PLANO/LENTE/CÁMARA] + [ACCIÓN/EXPRESIÓN] + [ENTORNO ANCHOR_EN] + [ILUMINACIÓN Y ATMÓSFERA] + [COMPOSICIÓN LIMPIA].
4. ESPACIO NEGATIVO OBLIGATORIO: Inyecta "spacious composition with clean empty upper space for dialogue placement".
5. SUFIJO DE LIMPIEZA OBLIGATORIO: Finaliza CADA prompt exactamente con: ", cinematic lighting, highly detailed, masterwork, clean artwork, strictly no text, no speech bubbles, no dialogue, no word balloons, no watermark".

Responde ÚNICAMENTE con el JSON:
{
  "prompts": [
    ${isFirstBatchWithCover ? `{"pagina": 0, "vineta": 1, "elementos_presentes": ["Portada"], "prompt": "${style}, photorealistic full page cover artwork of..., dramatic composition, ultra detailed background, clean upper margin, clean artwork, strictly no text, no speech bubbles, no dialogue, no word balloons, no watermark", "cartucho": "", "dialogo": "", "onomatopeya": ""},` : ''}
    {
      "pagina": ${startPg},
      "vineta": 1,
      "elementos_presentes": ["Nombre Personaje / Prop / Entorno exacto de la Biblia"],
      "prompt": "${style}, [Element Name & Anchor_EN in Action/Emotion] + [Camera Shot/Lens] + [Environment Anchor_EN] + [Lighting Mood] + spacious composition with clean empty upper space, cinematic lighting, highly detailed, clean artwork, strictly no text, no speech bubbles, no dialogue, no word balloons, no watermark",
      "cartucho": "texto",
      "dialogo": "texto",
      "onomatopeya": "FX"
    }
  ]
}`;
                    let rawPrompts = await SagaGemini.generateText(promptPromptsRefiner);
                    const parsedBatchPrompts = this.parseSafeJSON(rawPrompts).prompts || [];
                    
                    const promptsByPage = {};
                    parsedBatchPrompts.forEach((p, pIdx) => {
                        if (p.pagina === undefined || p.pagina === null) p.pagina = startPg;
                        if (p.vineta === undefined || p.vineta === null) p.vineta = pIdx + 1;
                        if (!promptsByPage[p.pagina]) promptsByPage[p.pagina] = [];
                        promptsByPage[p.pagina].push(p);
                    });
                    
                    let batchFinalPrompts = [];
                    Object.keys(promptsByPage).forEach(pageNumStr => {
                        const pageNum = parseInt(pageNumStr, 10);
                        const pagePanels = promptsByPage[pageNum];
                        if (pageNum === 0) {
                            const dims = this.calculatePanelDimensions(format, 12, 1);
                            batchFinalPrompts.push({
                                ...pagePanels[0],
                                pagina: 0,
                                vineta: 1,
                                elementos_presentes: pagePanels[0].elementos_presentes || pagePanels[0].elementos || [],
                                grid_span: 12,
                                originalWidth: dims.originalWidth,
                                originalHeight: dims.originalHeight,
                                width: dims.width,
                                height: dims.height,
                                imageUrl: null
                            });
                        } else {
                            const scriptPage = this.state.script?.paginas?.find(pg => pg.pagina === pageNum);
                            const panelsWithInitialSpan = pagePanels.map((p, idx) => {
                                const scriptPanel = scriptPage?.vinetas?.find(v => v.vineta === p.vineta);
                                return {
                                    ...p,
                                    pagina: pageNum,
                                    vineta: p.vineta || (idx + 1),
                                    elementos_presentes: p.elementos_presentes || p.elementos || [],
                                    cartucho: p.cartucho || scriptPanel?.cartucho || "",
                                    dialogo: p.dialogo || scriptPanel?.dialogo || "",
                                    onomatopeya: p.onomatopeya || scriptPanel?.onomatopeya || "",
                                    grid_span: scriptPanel?.grid_span || p.grid_span || 12
                                };
                            });
                            const layout = this.organizeAndBalancePagePanels(panelsWithInitialSpan);
                            layout.panels.forEach((p, idx) => {
                                const dims = this.calculatePanelDimensions(format, p.grid_span, layout.actualRows);
                                batchFinalPrompts.push({
                                    ...p,
                                    pagina: pageNum,
                                    vineta: p.vineta || (idx + 1),
                                    originalWidth: dims.originalWidth,
                                    originalHeight: dims.originalHeight,
                                    width: dims.width,
                                    height: dims.height,
                                    imageUrl: null
                                });
                            });
                        }
                    });
                    
                    const existingNonBatchPrompts = this.state.prompts.filter(p => p.pagina < startPg || p.pagina > endPg);
                    this.state.prompts = [...existingNonBatchPrompts, ...batchFinalPrompts].sort((a, b) => {
                        if (a.pagina !== b.pagina) return a.pagina - b.pagina;
                        return a.vineta - b.vineta;
                    });
                    await this.autoSave();
                }
            }
            
            this.updateStepTag(2, 'completed');
            this.updateStepTag(3, 'completed');
            this.updateStepTag(4, 'completed');
            this.updateStepTag(5, 'active');
            await this.autoSave();
            this.renderGenerationUI();
        } catch (err) {
            console.error("Pipeline Error:", err);
            await this.autoSave();
            alert(`Ocurrió un error durante la ejecución:\n\n${err.message}\n\nTodo el progreso alcanzado ha sido GUARDADO AUTOMÁTICAMENTE.\n\nPuedes pulsar el botón 'RETOMAR PIPELINE' para continuar.`);
        }
    }
};
window.ComicPipeline = ComicPipeline;