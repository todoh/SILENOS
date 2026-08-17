/**
 * Pipeline de Conexión Local con Instancias Activas de Ollama
 * Soporta entrada de texto, archivos de código e imágenes nativas en base64 para modelos multimodales
 * Implementa lectura en streaming en tiempo real para capturar razonamiento y contenido
 */
export async function queryOllama(messages, modelTag, endpointUrl, attachments = [], onStream = null) {
    const cleanUrl = endpointUrl.endsWith('/') ? endpointUrl.slice(0, -1) : endpointUrl;
    const url = `${cleanUrl}/api/chat`;

    const ollamaMessages = messages.map((m, index) => {
        const isLastMessage = index === messages.length - 1;
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        
        const msgObj = {
            role: role,
            content: m.content
        };

        // Procesar adjuntos únicamente en el último mensaje enviado por el usuario
        if (role === 'user' && isLastMessage && attachments.length > 0) {
            const imagesBase64 = [];
            let textExtensions = "";
            attachments.forEach(file => {
                if (file.isImage) {
                    // Ollama requiere únicamente la parte de datos Base64 cruda (sin cabecera mime)
                    const base64Raw = file.data.split(',')[1];
                    imagesBase64.push(base64Raw);
                } else {
                    textExtensions += `\n\n[Archivo Adjuntado: ${file.name}]\n\`\`\`\n${file.data}\n\`\`\``;
                }
            });

            if (imagesBase64.length > 0) {
                msgObj.images = imagesBase64;
            }
            if (textExtensions !== "") {
                msgObj.content += textExtensions;
            }
        }
        return msgObj;
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelTag,
            messages: ollamaMessages,
            stream: true // Habilitamos streaming para recibir datos en tiempo real
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama Local Engine Error (Status: ${response.status}). Asegúrate de haber ejecutado 'ollama run ${modelTag}'`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // El último elemento puede estar incompleto, lo dejamos en el búfer
        buffer = lines.pop();

        for (const line of lines) {
            if (line.trim() === "") continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.message && parsed.message.content) {
                    const token = parsed.message.content;
                    fullText += token;
                    
                    // Si se pasó una función callback, enviamos el progreso acumulado en caliente
                    if (typeof onStream === 'function') {
                        onStream(fullText);
                    }
                }
            } catch (err) {
                console.warn("Error parseando línea de stream de Ollama:", err);
            }
        }
    }

    // Procesar remanente si queda algo en el búfer
    if (buffer.trim() !== "") {
        try {
            const parsed = JSON.parse(buffer);
            if (parsed.message && parsed.message.content) {
                fullText += parsed.message.content;
                if (typeof onStream === 'function') {
                    onStream(fullText);
                }
            }
        } catch (e) {}
    }

    return fullText;
}

/**
 * Recuperar catálogo local de tags mapeados en el demonio del sistema
 */
export async function fetchOllamaModels(endpointUrl) {
    const cleanUrl = endpointUrl.endsWith('/') ? endpointUrl.slice(0, -1) : endpointUrl;
    const response = await fetch(`${cleanUrl}/api/tags`);
    if (!response.ok) throw new Error("Ollama Offline");
    const data = await response.json();
    return data.models || [];
}