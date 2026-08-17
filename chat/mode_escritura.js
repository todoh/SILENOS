// mode_escritura.js
// Modo Escritura: Construye documentos narrativos y los empaqueta en un único archivo HTML listo con style_documentos.css

import { callSpecificModel, extractCodeBlocks } from './agent_helpers.js';
import { writeFileToDirectory, readFileFromDirectory } from './conversations.js';

export async function runModoEscritura(messages, fuerteModel, rapidoModel, configKeys, agentLimits, waitingNodeId, attachments, chatId) {
    const waitingNode = document.getElementById(waitingNodeId);
    const progressContainer = waitingNode ? waitingNode.querySelector('.space-y-1\\.5') : null;

    if (progressContainer) {
        const infoBadge = document.createElement('div');
        infoBadge.className = "text-[10px] font-mono text-purple-700 bg-purple-50 px-2.5 py-1 border border-purple-200 rounded my-1 flex items-center gap-2";
        infoBadge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> <strong>Modo Escritura Activado:</strong> Generando documento completo estructurado...`;
        progressContainer.appendChild(infoBadge);
    }

    const lastMessage = messages[messages.length - 1].content;

    const writingPrompt = `Eres un Redactor y Escritor Experto. Tu objetivo es redactar un documento completo, exhaustivo y perfectamente estructurado para la siguiente solicitud:
"${lastMessage}"

REGLAS DE FORMATO Y ESTILO:
1. Genera el contenido dentro de una estructura semántica HTML limpia (utilizando <h1>, <h2>, <p>, <blockquote>, <table>, etc.).
2. Envuelve todo el cuerpo dentro de un contenedor principal: <div class="document-container"> ... </div>.
3. No incluyas las etiquetas <html>, <head> o <body>, solo el contenido del cuerpo dentro del div principal.
4. Desarrolla las secciones con máxima riqueza técnica, literaria o descriptiva sin escatimar en extensión.`;

    const payload = [
        { role: 'system', content: writingPrompt },
        ...messages.slice(0, -1),
        { role: 'user', content: lastMessage }
    ];

    const bodyHtml = await callSpecificModel(payload, fuerteModel, configKeys, attachments);

    // Leer CSS estándar de documentos o usar fallback integrado
    let cssContent = await readFileFromDirectory('style_documentos.css') || `
    body { background-color: #fcfbf9; color: #1a1a1a; font-family: Georgia, serif; line-height: 1.8; margin: 0; }
    .document-container { max-width: 850px; margin: 40px auto; background: #fff; padding: 60px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border-radius: 8px; }
    h1 { font-family: sans-serif; font-size: 2.25rem; border-bottom: 2px solid #2b6cb0; }
    p { margin-bottom: 1.4em; text-align: justify; }
    `;

    const finalHtmlDocument = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documento de Escritura</title>
    <style>
    ${cssContent}
    </style>
</head>
<body>
    ${bodyHtml}
</body>
</html>`;

    const fileName = `documento_escritura_${Date.now()}.html`;
    await writeFileToDirectory(fileName, finalHtmlDocument);

    return `### Documento Generado con Éxito (Modo Escritura)\n\nSe ha montado el documento completo e independiente en la carpeta local:\n- **Archivo:** \`${fileName}\`\n\n\`\`\`html\n${finalHtmlDocument}\n\`\`\``;
}