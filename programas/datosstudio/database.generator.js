// --- datosstudio/database.generator.js ---
/**
 * GENERADOR DE BASE DE DATOS (MULTI-PROMPT PARALELO + CLASIFICADOR SEMÁNTICO)
 * Ejecuta clasificación previa, creación de lore ultra-fiel (nova-fast), 
 * prompts visuales integrando el Estilo Global (nova-fast) y generación de imágenes (flux) en paralelo.
 */

const DatabaseGenerator = {
    async processSingleItem(promptText, defaultType, globalStyle, isChroma, appInstance, index) {
        try {
            const classSystem = "Eres un analista semántico para un motor de worldbuilding. Devuelve estrictamente JSON puro.";
            const classUser = `Analiza la siguiente premisa del usuario: "${promptText}".
            Tu objetivo es clasificarla en la categoría que MEJOR encaje de esta lista exacta: 
            Dato, Personaje, Criatura, Flora, Raza, Lugar, Asentamiento, Estructura, Cosmología, Objeto, Arma, Vehículo, Recurso, Comida, Facción, Religión, Idioma, Profesión, Evento, Hechizo, Ley, Misión, Concepto.
            
            REGLA: Si la premisa es simple o mundana (ej. "gato", "espada", "manzana"), clasifícala de forma literal y lógica (Criatura, Arma, Comida) sin inventar contextos épicos.
            
            FORMATO JSON ESPERADO:
            {
                "categoria": "Una sola categoría de la lista"
            }`;

            let classData = await window.Koreh.Text.generate(classSystem, classUser, { model: 'nova-fast', jsonMode: true });
            if (typeof classData === 'string') classData = JSON.parse(Utils.cleanJSON(classData));
            
            const tipoFinal = classData.categoria || defaultType;

            let protocolo = "Describe este concepto de forma enciclopédica, directa y ultra fiel a la premisa. No inventes tramas innecesarias.";
            
            if (tipoFinal === "Personaje") {
                protocolo = "Describe a este individuo: su aspecto, personalidad básica y su rol directo, manteniendo estricta fidelidad a la premisa. Si es un concepto simple, adáptalo a un arquetipo humanoide.";
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

            let data1 = await window.Koreh.Text.generate(text1System, text1User, { model: 'nova-fast', jsonMode: true });
            if (typeof data1 === 'string') data1 = JSON.parse(Utils.cleanJSON(data1));

            const text2System = "Eres un director de arte experto. Devuelve estrictamente JSON puro.";
            const text2User = `Analiza la siguiente entidad para crear su prompt de generación de imagen:
            Nombre: ${data1.name}
            Tipo: ${tipoFinal}
            Descripción: ${data1.desc}
            ESTILO VISUAL GLOBAL REQUERIDO: "${globalStyle || 'Libre / Realista'}"
            
            Crea un prompt visual detallado y directo (en INGLÉS) para generar una imagen precisa de esta entidad.
            Asegúrate de INCLUIR y ADAPTAR el prompt al "ESTILO VISUAL GLOBAL REQUERIDO" para que la estética coincida.
            
            FORMATO JSON ESPERADO:
            {
                "visualDesc": "Detailed visual prompt in english, focusing on aesthetics, lighting, materials, appearance, and heavily incorporating the required visual style."
            }`;

            let data2 = await window.Koreh.Text.generate(text2System, text2User, { model: 'nova-fast', jsonMode: true });
            if (typeof data2 === 'string') data2 = JSON.parse(Utils.cleanJSON(data2));

            const finalData = {
                name: data1.name || `Dato_${index}`,
                type: tipoFinal,
                desc: data1.desc || "Sin descripción disponible.",
                visualDesc: data2.visualDesc || "concept art masterpiece",
                imagen64: null,
                imageFile: null
            };

            const cleanName = finalData.name.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${cleanName}_${Date.now()}_${index}.json`;

            const fileHandle = await appInstance.targetHandle.getFileHandle(filename, { create: true });
            let writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(finalData, null, 2));
            await writable.close();

            appInstance.items.push({ handle: fileHandle, data: finalData, name: filename });
            appInstance.processingIds.add(filename);
            appInstance.renderGrid();
            
            if (typeof Coherence !== 'undefined') Coherence.updateItem(finalData);

            let fullPrompt = `${finalData.name}, ${finalData.visualDesc}, ${globalStyle}, high quality, highly detailed`;
            if (isChroma) fullPrompt += ChromaUI.getPromptSuffix();
            else fullPrompt += ", solid background";

            const selectedModel = document.getElementById('global-image-model') ? document.getElementById('global-image-model').value : 'klein';

            let blob = await window.Koreh.Image.generate(fullPrompt, {
                model: selectedModel,
                width: 1024,
                height: 1024,
                nologo: true
            });

            if (isChroma) {
                blob = await ChromaCore.process(blob);
            }

            // --- NUEVO: GUARDADO DE ARCHIVO SEPARADO ---
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
            const memoryItem = appInstance.items.find(i => i.name === filename);
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
                parallelPromises.push(
                    this.processSingleItem(promptText, defaultType, globalStyle, isChroma, appInstance, globalIndex++)
                );
            }
        }

        await Promise.all(parallelPromises);

        await appInstance.loadFiles();
        Utils.log(`[Base de Datos] Lote completado exitosamente.`, "success");
    }
};

window.DatabaseGenerator = DatabaseGenerator;