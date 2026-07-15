/**
 * Pipeline de Conexión Local con Instancias Activas de Ollama
 * Soporta entrada de texto, archivos de código e imágenes nativas en base64 para modelos multimodales
 */
export async function queryOllama(messages, modelTag, endpointUrl, attachments = []) {
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
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama Local Engine Error (Status: ${response.status}). Asegúrate de haber ejecutado 'ollama run ${modelTag}'`);
    }

    const data = await response.json();
    return data.message.content;
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