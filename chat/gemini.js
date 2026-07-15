/**
 * Pipeline de Interconexión con la API de Google Gemini (v1beta)
 * Soporta entrada de texto, imágenes binarias integradas y múltiples archivos.
 */
export async function queryGemini(messages, modelTag, apiKey, attachments = []) {
    if (!apiKey) {
        throw new Error("API Key de Google Gemini no detectada en los campos de configuración.");
    }
    
    // Formatear historial al tipado estructurado de Gemini (roles: 'user' o 'model')
    const geminiContents = messages.map((m, index) => {
        const isLastMessage = index === messages.length - 1;
        const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
        
        const parts = [{ text: m.content }];

        // Si es el último mensaje del usuario y hay adjuntos, adjuntamos la información
        if (role === 'user' && isLastMessage && attachments.length > 0) {
            attachments.forEach(file => {
                if (file.isImage) {
                    // Extraer base64 crudo quitando la cabecera data:image/...;base64,
                    const base64Data = file.data.split(',')[1];
                    parts.push({
                        inlineData: {
                            mimeType: file.type || "image/jpeg",
                            data: base64Data
                        }
                    });
                } else {
                    // Si es texto se integra como parte textual
                    parts.push({
                        text: `\n\n[Archivo Adjuntado: ${file.name}]\n\`\`\`\n${file.data}\n\`\`\``
                    });
                }
            });
        }

        return {
            role: role,
            parts: parts
        };
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelTag}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: geminiContents
        })
    });

    if (!response.ok) {
        const errDetails = await response.text();
        throw new Error(`Google Gemini API Error (Status: ${response.status}): ${errDetails}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
        return data.candidates[0].content.parts[0].text;
    }
    
    throw new Error("La estructura de respuesta de Gemini no contiene datos legibles.");
}