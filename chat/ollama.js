/**
 * Pipeline de Conexión Local con Instancias Activas de Ollama
 * Soporta entrada de texto, archivos de código e imágenes nativas en base64 para modelos multimodales.
 * Implementa lectura en streaming en tiempo real y cálculo de rendimiento (tokens/s).
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

        if (role === 'user' && isLastMessage && attachments.length > 0) {
            const imagesBase64 = [];
            let textExtensions = "";
            attachments.forEach(file => {
                if (file.isImage) {
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

    const startTime = performance.now();
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelTag,
            messages: ollamaMessages,
            stream: true
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama Local Engine Error (Status: ${response.status}). Asegúrate de haber ejecutado 'ollama run ${modelTag}'`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";
    let evalCount = 0;
    let evalDuration = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (line.trim() === "") continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.message && parsed.message.content) {
                    const token = parsed.message.content;
                    fullText += token;

                    if (typeof onStream === 'function') {
                        onStream(fullText);
                    }
                }
                if (parsed.eval_count) evalCount = parsed.eval_count;
                if (parsed.eval_duration) evalDuration = parsed.eval_duration;
            } catch (err) {
                console.warn("Error parseando línea de stream de Ollama:", err);
            }
        }
    }

    if (buffer.trim() !== "") {
        try {
            const parsed = JSON.parse(buffer);
            if (parsed.message && parsed.message.content) {
                fullText += parsed.message.content;
                if (typeof onStream === 'function') {
                    onStream(fullText);
                }
            }
            if (parsed.eval_count) evalCount = parsed.eval_count;
            if (parsed.eval_duration) evalDuration = parsed.eval_duration;
        } catch (e) {}
    }

    const endTime = performance.now();
    const totalTimeSec = (endTime - startTime) / 1000;
    
    // Si Ollama no devuelve métricas nativas, estimamos según aprox. 4 caracteres por token
    const tokenCount = evalCount || Math.ceil(fullText.length / 4);
    const tokSec = evalDuration > 0 
        ? (evalCount / (evalDuration / 1e9)).toFixed(1)
        : (tokenCount / totalTimeSec).toFixed(1);

    return {
        text: fullText,
        metrics: {
            tokens: tokenCount,
            tokSec: parseFloat(tokSec),
            timeSec: totalTimeSec.toFixed(2)
        }
    };
}

export async function fetchOllamaModels(endpointUrl) {
    const cleanUrl = endpointUrl.endsWith('/') ? endpointUrl.slice(0, -1) : endpointUrl;
    const response = await fetch(`${cleanUrl}/api/tags`);
    if (!response.ok) throw new Error("Ollama Offline");
    const data = await response.json();
    return data.models || [];
}