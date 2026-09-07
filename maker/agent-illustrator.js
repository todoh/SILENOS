// agent-illustrator.js - LÓGICA DE ILUSTRACIÓN Y GENERACIÓN SVG DEL AGENTE
class AgentIllustrator {
    async generateSingleSVG(promptText, stylePrompt, apiKey, isEntity = false, abortController = null) {
        let fullPrompt = "";
        if (isEntity) {
            fullPrompt = `Asset gráfico 2D interactivo: ${promptText}. Estilo: ${stylePrompt}. Fondo transparente, totalmente aislado. El asset debe verse de frente o perspectiva top-down 2D según corresponda para ser un elemento interactivo en el mundo.`;
        } else {
            fullPrompt = `Diseño de suelo/terreno para mapa de juego 2D (vista cenital o top-down 2.5D): ${promptText}. Estilo: ${stylePrompt}. Debe actuar únicamente como la textura base de suelo o pavimento, sin personajes, sin paredes ni objetos superpuestos.`;
        }

        return await executeGeminiSvgGeneration(fullPrompt, apiKey);
    }

    async generateBatchItemsSVG(batch, stylePrompt, apiKey, abortController = null, onProgress = null) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

        let batchPrompt = `Genera un paquete de ${batch.length} iconos vectoriales SVG individuales de ítems de inventario. Estilo: ${stylePrompt}.\n` +
            `CADA SVG debe estar delimitado EXACTAMENTE por una etiqueta única de comentario XML de apertura e inicio con su identificador.\n\n` +
            `Los ítems a generar son:\n`;

        batch.forEach(([itemId, itemPrompt]) => {
            batchPrompt += `- ID: "${itemId}" -> Descripción: ${itemPrompt}\n`;
        });

        batchPrompt += `\nDevuelve el código formateado de la siguiente manera para poder separar los SVGs:\n` +
            `<!-- START_SVG: id_del_item -->\n<svg ...>...</svg>\n<!-- END_SVG: id_del_item -->\n`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: batchPrompt }] }]
        };

        const res = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: abortController ? abortController.signal : null
        }, 30000);

        if (!res.ok) throw new Error(`Error Gemini Batch SVG (${res.status})`);

        const data = await res.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        for (const [itemId] of batch) {
            const regex = new RegExp(`<!--\\s*START_SVG:\\s*${itemId}\\s*-->([\\s\\S]*?)<!--\\s*END_SVG:\\s*${itemId}\\s*-->`, 'i');
            let match = responseText.match(regex);
            let svgText = "";

            if (match && match[1]) {
                svgText = match[1].trim();
            } else {
                const rawSvgMatch = responseText.match(/<svg[\s\S]*?<\/svg>/gi);
                const itemIndex = batch.findIndex(b => b[0] === itemId);
                if (rawSvgMatch && rawSvgMatch[itemIndex]) {
                    svgText = rawSvgMatch[itemIndex];
                }
            }

            if (!svgText) {
                svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0071e3"/><text x="50" y="55" fill="#fff" font-size="12" text-anchor="middle">${itemId}</text></svg>`;
            }

            const fileName = `item_${itemId}.svg`;
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            await registerAsset(fileName, blob, true);
            if (typeof dirHandle !== 'undefined' && dirHandle) {
                await this.saveFileToDisk(fileName, blob);
            }
        }
    }

    async saveFileToDisk(fileName, blob) {
        try {
            if (typeof dirHandle === 'undefined' || !dirHandle) return;
            const newFileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err) {
            console.error(`Error guardando ${fileName} en el directorio local:`, err);
        }
    }
}

const agentIllustrator = new AgentIllustrator();