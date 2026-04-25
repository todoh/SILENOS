// Archivo: Librojuego/ai.visual.js

window.AIVisual = {
    isUpdateMode: false,

    openModal(isUpdate = false) {
        this.isUpdateMode = isUpdate;
        const modal = document.getElementById('visual-bible-modal');
        const btnSubmit = document.getElementById('btn-submit-visual-modal');
        
        if (btnSubmit) {
            if (this.isUpdateMode) {
                btnSubmit.innerHTML = `<i class="fa-solid fa-plus"></i> Añadir Novedades a la Biblia`;
            } else {
                btnSubmit.innerHTML = `<i class="fa-solid fa-book-open-reader"></i> Forjar Biblia Visual de Cero`;
            }
        }

        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    },
    
    closeModal() {
        const modal = document.getElementById('visual-bible-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },
    
    submitModal() {
        const input = document.getElementById('visual-bible-instructions');
        const customInstructions = input ? input.value : "";
        this.closeModal();
        this.generateVisualBible(customInstructions, this.isUpdateMode);
    },

    saveManualBible() {
        const bible = {
            style: document.getElementById('vb-style')?.value || '',
            characters: document.getElementById('vb-characters')?.value || '',
            places: document.getElementById('vb-places')?.value || '',
            flora_fauna: document.getElementById('vb-flora_fauna')?.value || '',
            objects_tech: document.getElementById('vb-objects_tech')?.value || '',
            clothing: document.getElementById('vb-clothing')?.value || '',
            magic_fx: document.getElementById('vb-magic_fx')?.value || ''
        };
        
        if (Core.bookData) Core.bookData.visualBible = bible;
        if (Core.book) Core.book.visualBible = bible;
        if (Core.scheduleSave) Core.scheduleSave();
    },
    
    loadManualBible(bibleData) {
        if (!bibleData) return;
        if (typeof bibleData === 'string') {
            const el = document.getElementById('vb-style');
            if (el) el.value = bibleData;
        } else {
            if (document.getElementById('vb-style')) document.getElementById('vb-style').value = bibleData.style || '';
            if (document.getElementById('vb-characters')) document.getElementById('vb-characters').value = bibleData.characters || '';
            if (document.getElementById('vb-places')) document.getElementById('vb-places').value = bibleData.places || '';
            if (document.getElementById('vb-flora_fauna')) document.getElementById('vb-flora_fauna').value = bibleData.flora_fauna || '';
            if (document.getElementById('vb-objects_tech')) document.getElementById('vb-objects_tech').value = bibleData.objects_tech || '';
            if (document.getElementById('vb-clothing')) document.getElementById('vb-clothing').value = bibleData.clothing || '';
            if (document.getElementById('vb-magic_fx')) document.getElementById('vb-magic_fx').value = bibleData.magic_fx || '';
        }
    },

    async generateVisualBible(customInstructions = "", isUpdate = false) {
        const bookTitle = Core.bookData?.title || Core.book?.title || "Sin título";
        const nodes = Core.bookData?.nodes || Core.book?.nodes || [];
        const validNodes = nodes.filter(n => n.text && n.text.trim().length > 10);
        
        if (validNodes.length === 0) return alert("Aún no hay pasajes con texto suficiente para analizar.");

        let bible = Core.bookData?.visualBible || Core.book?.visualBible;
        if (!isUpdate || typeof bible !== 'object' || !bible) {
            bible = {
                style: document.getElementById('vb-style')?.value || "",
                characters: "", places: "", flora_fauna: "", objects_tech: "", clothing: "", magic_fx: ""
            };
        }

        const instructionsText = customInstructions.trim() 
            ? `\nINSTRUCCIONES CRÍTICAS DEL USUARIO:\n"${customInstructions}"\n` 
            : "";

        UI.setLoading(true, "Iniciando forjado de Biblia...", 5, "Preparando motor", 5);

        try {
            // Fase 1: Extraer Estilo si es desde cero y no hay estilo definido
            if (!isUpdate && !bible.style) {
                const contextNodes = validNodes.slice(0, 10).map(n => n.text).join(" | ");
                const sysPromptTaxonomy = "Eres un Director de Arte. Deduce un estilo visual fotográfico/ilustrativo para la obra. Devuelve JSON PURO.";
                const userPromptTaxonomy = `
                    Título: ${bookTitle}
                    Trama: ${contextNodes.substring(0, 2000)}
                    ${instructionsText}
                    Formato JSON: { "style": "Estilo técnico de renderizado en inglés (tags)" }
                `;
                const taxonomyData = await window.Koreh.Text.generateWithRetry(sysPromptTaxonomy, userPromptTaxonomy, {
                    model: 'gemini-fast', jsonMode: true, temperature: 0.4
                }, (data) => data && data.style);

                bible.style = taxonomyData.style || "Cinematic, realistic, 8k, highly detailed";
            }

            // Fase 2: Procesar Pasaje por Pasaje en Lotes para no saturar
            const BATCH_SIZE = 15;
            let processedCount = 0;
            let totalNuevos = 0;

            for (let i = 0; i < validNodes.length; i += BATCH_SIZE) {
                const batch = validNodes.slice(i, i + BATCH_SIZE);
                let pct = (processedCount / validNodes.length) * 100;
                UI.setLoading(true, "Forjando Biblia Pasaje a Pasaje...", pct, `Analizando bloque ${Math.floor(i/BATCH_SIZE)+1} (${processedCount}/${validNodes.length})`, pct);

                const promises = batch.map(async (node) => {
                    const currentLoreContext = JSON.stringify({
                        characters: bible.characters, places: bible.places, flora_fauna: bible.flora_fauna,
                        objects_tech: bible.objects_tech, clothing: bible.clothing, magic_fx: bible.magic_fx
                    });

                    const sysPromptExtract = "Eres un extractor de entidades de worldbuilding. Lee el pasaje y localiza personajes, lugares, criaturas u objetos clave. Separa los que ya existan en el LORE ACTUAL de los que sean totalmente NUEVOS. OBLIGATORIO: En 'elementos_presentes' incluye siempre al 'PROTAGONISTA'. Devuelve ESTRICTAMENTE JSON PURO.";
                    const userPromptExtract = `
                        LORE ACTUAL EN LA BIBLIA VISUAL:
                        ${currentLoreContext}
                        
                        TEXTO A ANALIZAR:
                        "${node.text}"
                        ${instructionsText}
                        
                        INSTRUCCIONES: 
                        1. "nuevos_elementos": Identifica elementos NUEVOS que NO ESTÉN en el lore actual (categorías: characters, places, flora_fauna, objects_tech, clothing, magic_fx).
                        2. "elementos_presentes": Lista los NOMBRES EXACTOS de TODAS las entidades relevantes que aparecen en este texto (incluyendo a PROTAGONISTA, nuevas y ya existentes).

                        FORMATO JSON ESPERADO:
                        {
                            "nuevos_elementos": [
                                { "nombre": "Nombre", "categoria": "characters" }
                            ],
                            "elementos_presentes": ["PROTAGONISTA", "Nombre1"]
                        }
                    `;

                    try {
                        const extractData = await window.Koreh.Text.generateWithRetry(sysPromptExtract, userPromptExtract, {
                            model: 'nova-fast', jsonMode: true, temperature: 0.3
                        }, (d) => d && Array.isArray(d.elementos_presentes));

                        let etiquetasFinales = [];
                        const validCats = ['characters', 'places', 'flora_fauna', 'objects_tech', 'clothing', 'magic_fx'];

                        if (extractData.nuevos_elementos && Array.isArray(extractData.nuevos_elementos)) {
                            // Ejecución secuencial para no chocar al escribir en la variable 'bible'
                            for (const el of extractData.nuevos_elementos) {
                                const cleanName = el.nombre.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_ÁÉÍÓÚÑ]/g, '');
                                const targetCat = validCats.includes(el.categoria) ? el.categoria : 'characters';
                                
                                if (!bible[targetCat].includes(`@${cleanName}:`)) {
                                    const sysPromptDesc = "Eres un Artista Técnico. Escribe una ficha visual técnica usando TAGS (etiquetas separadas por comas) describiendo físicamente este elemento. PROHIBIDO frases completas, verbos o contexto.";
                                    const userPromptDesc = `Elemento a detallar: "${el.nombre}"\nCategoría: "${el.categoria}"\nContexto: "${node.text}"\n${instructionsText}\nGenera etiquetas físicas en inglés:`;

                                    const description = await window.Koreh.Text.generateWithRetry(sysPromptDesc, userPromptDesc, {
                                        model: 'nova-fast', jsonMode: false, temperature: 0.5
                                    }, (d) => d && d.length > 5);

                                    const newEntry = `\n@${cleanName}: ${description.trim()}\n`;
                                    bible[targetCat] += newEntry;
                                    totalNuevos++;
                                }
                            }
                        }

                        if (extractData.elementos_presentes && Array.isArray(extractData.elementos_presentes)) {
                            extractData.elementos_presentes.forEach(name => {
                                let clean = name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_ÁÉÍÓÚÑ]/g, '');
                                if (!clean.startsWith('@')) clean = '@' + clean;
                                if (!etiquetasFinales.includes(clean)) etiquetasFinales.push(clean);
                            });
                        }

                        if (etiquetasFinales.length > 0) {
                            node.text = node.text.replace(/\n\n\[Canon Visual:.*?\]/g, ''); // Limpiar si ya había
                            node.text += `\n\n[Canon Visual: ${etiquetasFinales.join(', ')}]`; // Inyectar al final
                        }
                    } catch (e) {
                        console.warn(`Error procesando nodo ${node.id} en Biblia:`, e);
                    }
                });

                await Promise.all(promises);
                processedCount += batch.length;
                if (i + BATCH_SIZE < validNodes.length) {
                    await new Promise(r => setTimeout(r, 1500));
                }
            }

            if (Core.bookData) Core.bookData.visualBible = bible;
            if (Core.book) Core.book.visualBible = bible;

            this.loadManualBible(bible);
            this.saveManualBible();
            if (Core.scheduleSave) Core.scheduleSave();

            alert(`✅ Biblia Visual forjada y actualizada.\n\nSe revisaron ${processedCount} pasajes inyectando el Canon al final del texto.\nSe han añadido ${totalNuevos} elementos nuevos al Lore.`);

        } catch (error) {
            console.error(error);
            alert("Error en la actualización de la Biblia: " + error.message);
        } finally {
            UI.setLoading(false);
            if (typeof Canvas !== 'undefined') Canvas.renderNodes();
            if (Core.selectedNodeId && typeof Editor !== 'undefined') Editor.loadNode(Core.selectedNodeId);
        }
    }
};

window.Canvas = window.Canvas || {};
if (typeof window.Canvas.render === 'function') {
    window.Canvas.render();
}