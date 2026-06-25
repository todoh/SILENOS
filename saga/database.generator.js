// --- datosstudio/database.generator.js ---
/**
 * GENERADOR DE BASE DE DATOS (MULTI-PROMPT PARALELO + CLASIFICADOR SEMÁNTICO)
 * Ejecuta clasificación previa, creación de lore ultra-fiel, 
 * prompts visuales integrando el Estilo Global y generación de imágenes en paralelo.
 * Adaptado para respetar dinámicamente el modelo o proveedor seleccionado en la interfaz.
 */

const DatabaseGenerator = {
    async processSingleItem(promptText, defaultType, globalStyle, isChroma, appInstance, index, placeholderFilename) {
        try {
            const memoryItem = appInstance.items.find(i => i.name === placeholderFilename);
            const activeConfig = { jsonMode: true };

            const classSystem = "Eres un analista semántico para un motor de worldbuilding. Devuelve estrictamente JSON puro.";
            const classUser = `Analiza la siguiente premisa del usuario: "${promptText}".
            Tu objetivo es clasificarla en la categoría que MEJOR encaje de esta lista exacta: 
            Dato, Personaje, Criatura, Flora, Raza, Lugar, Asentamiento, Estructura, Cosmología, Objeto, Arma, Vehículo, Recurso, Comida, Facción, Religión, Idioma, Profesión, Evento, Hechizo, Ley, Misión, Concepto.
            
            REGLA: Si la premisa es simple o mundana (ej. "gato", "espada", "manzana"), clasifícala de forma literal y lógica (Criatura, Arma, Comida) sin inventar contextos épicos.
            
            FORMATO JSON ESPERADO:
            {
                "categoria": "Una sola categoría de la lista"
            }`;

            let classData = await window.Koreh.Text.generate(classSystem, classUser, activeConfig);
            if (typeof classData === 'string') classData = JSON.parse(Utils.cleanJSON(classData));
            
            const tipoFinal = classData.categoria || defaultType;

            if (memoryItem) {
                memoryItem.data.type = tipoFinal;
                appInstance.renderGrid();
            }

            let protocolo = "Describe este concept de forma enciclopédica, directa y ultra fiel a la premisa. No inventes tramas innecesarias.";
            
            if (tipoFinal === "Personaje") {
                protocolo = "Describe a este individuo: su aspect, personalidad básica y su rol directo, manteniendo estricta fidelidad a la premisa. Si es un concept simple, adáptalo a un arquetipo humanoide.";
            } else if (["Criatura", "Flora", "Raza", "Dato"].includes(tipoFinal)) {
                protocolo = "Describe sus características biológicas, físicas o naturales de forma objetiva y documental, sin humanizarlo ni inventarle roles sociales complejos o magia a menos que la premisa lo pida explícitamente.";
            } else if (["Lugar", "Asentamiento", "Estructura", "Cosmología"].includes(tipoFinal)) {
                protocolo = "Describe el entorno, la geografía, la atmósfera y los detalles espaciales/arquitectónicos. Sé inmersivo pero estricto con lo que pide la premisa.";
            } else if (["Objeto", "Arma", "Vehículo", "Recurso", "Comida"].includes(tipoFinal)) {
                protocolo = "Describe sus propiedades tangibles: forma, materiales, utilidad, peso y aspecto visual directo.";
            }

            const text1System = "Eres un redactor de enciclopedias hiper-preciso. Devuelve estrictamente JSON puro.";
            const text1User = `Genera 1 entrada para la base de datos basada ÚNICA Y EXCLUSIVAMENTE en esta premisa: "${promptText}".
            
            CATEGORÍA ASIGNADA: "${tipoFinal}".
            PROTOCOLO DE REDACCIÓN: ${protocolo}
            
            REGLA ABSOLUTA 1: Sé ULTRA FIEL a la premisa original. No alucines ni añadas epicidad innecesaria si no se pide.
            REGLA ABSOLUTA 2: NO uses nombres propios (de personas, reinos, ciudades específicas, etc.) en el campo 'desc' (lore). Usa descripciones genéricas o conceptuales.
            
            FORMATO JSON ESPERADO:
            {
                "name": "Nombre descriptivo y directo (coherente con la premisa)",
                "desc": "Lore descriptivo siguiendo estrictamente el protocolo, SIN USAR nombres propios."
            }`;

            let data1 = await window.Koreh.Text.generate(text1System, text1User, activeConfig);
            if (typeof data1 === 'string') data1 = JSON.parse(Utils.cleanJSON(data1));

            if (memoryItem) {
                memoryItem.data.name = data1.name || memoryItem.data.name;
                memoryItem.data.desc = data1.desc || "Sin descripción disponible.";
                appInstance.renderGrid();
            }

            const text2System = "You are an expert art director. You must write the output properties strictly in English language. Return a pure JSON object.";
            const text2User = `Analyze the following entity to build its visual image generation prompt:
            Name: ${data1.name || memoryItem.data.name}
            Type: ${tipoFinal}
            Description: ${data1.desc}
            GLOBAL REQUIRED VISUAL STYLE: "${globalStyle || 'Free / Realistic'}"
            
            CRITICAL RULE: Create a detailed and direct visual prompt for an image generator. The value of 'visualDesc' MUST BE WRITTEN ENTIRELY IN ENGLISH, regardless of the input language. Translate any concepts if necessary.
            Focus on aesthetics, lighting, materials, appearance, and heavily incorporate the required global visual style.
            
            EXPECTED JSON FORMAT:
            {
                "visualDesc": "Detailed visual prompt completely in English language"
            }`;

            let data2 = await window.Koreh.Text.generate(text2System, text2User, activeConfig);
            if (typeof data2 === 'string') data2 = JSON.parse(Utils.cleanJSON(data2));

            const finalData = {
                name: data1.name || memoryItem.data.name,
                type: tipoFinal,
                desc: data1.desc || "Sin descripción disponible.",
                visualDesc: data2.visualDesc || "concept art masterpiece",
                imagen64: null,
                imageFile: null
            };

            const cleanName = finalData.name.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${cleanName}_${Date.now()}_${index}.json`;

            try {
                await appInstance.targetHandle.removeEntry(placeholderFilename);
            } catch(e) {}

            const fileHandle = await appInstance.targetHandle.getFileHandle(filename, { create: true });
            let writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(finalData, null, 2));
            await writable.close();

            if (memoryItem) {
                memoryItem.handle = fileHandle;
                memoryItem.name = filename;
                memoryItem.data = finalData;
            }
            
            appInstance.processingIds.delete(placeholderFilename);
            appInstance.processingIds.add(filename);
            appInstance.renderGrid();
            
            if (typeof Coherence !== 'undefined') Coherence.updateItem(finalData);

            let fullPrompt = `${finalData.name}, ${finalData.visualDesc}, ${globalStyle}, high quality, highly detailed`;
            if (isChroma) fullPrompt += ChromaUI.getPromptSuffix();
            else fullPrompt += ", solid background";

            const selectedModel = localStorage.getItem('koreh_selected_image_model') || 'flux';

            let blob = await window.Koreh.Image.generate(fullPrompt, {
                model: selectedModel,
                width: 1024,
                height: 1024,
                nologo: true
            });

            if (isChroma) {
                blob = await ChromaCore.process(blob);
            }

            let ext = 'png';
            if (blob.type === 'image/jpeg') ext = 'jpg';
            if (blob.type === 'image/webp') ext = 'webp';
            const imgFilename = filename.replace('.json', `.${ext}`);

            const imgHandle = await appInstance.targetHandle.getFileHandle(imgFilename, { create: true });
            const imgWritable = await imgHandle.createWritable();
            await imgWritable.write(blob);
            await imgWritable.close();

            finalData.imageFile = imgFilename;
            finalData.imagen64 = null;
            const displayUrl = URL.createObjectURL(blob);

            writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(finalData, null, 2));
            await writable.close();

            appInstance.processingIds.delete(filename);
            if (memoryItem) {
                memoryItem.data.imageFile = imgFilename;
                memoryItem.data.imagen64 = null;
                memoryItem.displayImage = displayUrl;
            }
            
            appInstance.renderGrid();
            Utils.log(`[Base de Datos] Imagen creada en archivo: ${imgFilename} (${tipoFinal}) con modelo ${selectedModel}`, "success");

            return finalData;

        } catch (error) {
            console.error(`Error en hilo ${index} de Base de Datos:`, error);
            Utils.log(`[Base de Datos] Error procesando elemento ${index}: ${error.message}`, "error");
            appInstance.processingIds.delete(placeholderFilename);
            appInstance.items = appInstance.items.filter(i => i.name !== placeholderFilename);
            appInstance.renderGrid();
            return null;
        }
    },

    async runBatch(premise, count, defaultType, globalStyle, isChroma, appInstance) {
        const prompts = premise.split('.').map(p => p.trim()).filter(p => p.length > 0);
        
        if (prompts.length === 0) {
            throw new Error("No se detectaron prompts válidos tras separar por puntos.");
        }

        const totalTasks = prompts.length * count;
        Utils.log(`[Base de Datos] Iniciando ${totalTasks} tareas paralelas (${prompts.length} prompts x ${count} copias)...`, "info");
        
        const parallelPromises = [];
        let globalIndex = 0;

        for (const promptText of prompts) {
            for (let i = 0; i < count; i++) {
                const index = globalIndex++;
                const placeholderFilename = `placeholder_db_${Date.now()}_${index}.json`;

                const mockData = {
                    name: `Generando (${index + 1}/${totalTasks})...`,
                    type: defaultType,
                    desc: `Procesando análisis semántico del texto: "${promptText.substring(0, 40)}..."`,
                    visualDesc: "",
                    imagen64: null,
                    imageFile: null
                };

                const fileHandle = await appInstance.targetHandle.getFileHandle(placeholderFilename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(mockData, null, 2));
                await writable.close();

                appInstance.items.push({
                    handle: fileHandle,
                    data: mockData,
                    name: placeholderFilename,
                    displayImage: null
                });
                appInstance.processingIds.add(placeholderFilename);

                parallelPromises.push(
                    this.processSingleItem(promptText, defaultType, globalStyle, isChroma, appInstance, index, placeholderFilename)
                );
            }
        }

        appInstance.renderGrid();

        await Promise.all(parallelPromises);
        await appInstance.loadFiles();
        Utils.log(`[Base de Datos] Lote completado exitosamente.`, "success");
    }
};

window.DatabaseGenerator = DatabaseGenerator;