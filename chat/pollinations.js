/**
 * Pipeline de Interconexión con el Gateway Automático de Pollinations AI
 * Soporta entrada de texto y archivos adjuntos (imágenes en base64 y código/texto)
 */
export async function queryPollinations(messages, modelTag, apiKey, attachments = []) {
    const url = `https://gen.pollinations.ai/v1/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Formatear al estándar OpenAI exigido por Pollinations
    const openAiMessages = messages.map((m, index) => {
        const isLastMessage = index === messages.length - 1;
        
        // Si no es el último mensaje o no tiene adjuntos, procesar como texto plano estándar
        if (!isLastMessage || attachments.length === 0) {
            return {
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            };
        }

        // Si es el último mensaje y contiene adjuntos, creamos un contenido estructurado (multi-part)
        const contentParts = [
            { type: "text", text: m.content }
        ];

        attachments.forEach(file => {
            if (file.isImage) {
                // Pollinations acepta el estándar de formato image_url de OpenAI
                contentParts.push({
                    type: "image_url",
                    image_url: {
                        url: file.data // URI Base64 completa
                    }
                });
            } else {
                // Adjuntar archivos de texto plano, código o JSON estructuradamente
                contentParts.push({
                    type: "text",
                    text: `\n\n[Archivo Adjunto: ${file.name}]\n\`\`\`\n${file.data}\n\`\`\``
                });
            }
        });

        return {
            role: 'user',
            content: contentParts
        };
    });

    const payload = {
        model: modelTag,
        messages: openAiMessages,
        jsonMode: false
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Error en el Gateway de Pollinations (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}