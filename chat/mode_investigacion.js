// mode_investigacion.js
// Modo Investigación: Recopila datos de llamadas/herramientas y los ordena en un HTML preparado para leer

import { runAgentPipeline } from './agente.js';
import { writeFileToDirectory, readFileFromDirectory } from './conversations.js';

export async function runModoInvestigacion(messages, fuerteModel, rapidoModel, configKeys, agentLimits, waitingNodeId, attachments, chatId) {
    const waitingNode = document.getElementById(waitingNodeId);
    const progressContainer = waitingNode ? waitingNode.querySelector('.space-y-1\\.5') : null;

    if (progressContainer) {
        const infoBadge = document.createElement('div');
        infoBadge.className = "text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded my-1 flex items-center gap-2";
        infoBadge.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> <strong>Modo Investigación Activado:</strong> Recopilando datos e informes...`;
        progressContainer.appendChild(infoBadge);
    }

    // Ejecutamos la recopilación y uso de herramientas del pipeline base
    const agentRawResponse = await runAgentPipeline(messages, fuerteModel, rapidoModel, configKeys, agentLimits, waitingNodeId, attachments, chatId);

    // Leer CSS estándar de documentos o fallback
    let cssContent = await readFileFromDirectory('style_documentos.css') || `
    body { background-color: #f8fafc; color: #0f172a; font-family: sans-serif; line-height: 1.6; margin: 0; }
    .document-container { max-width: 900px; margin: 40px auto; background: #fff; padding: 50px; border-radius: 8px; border: 1px solid #e2e8f0; }
    h1 { color: #0369a1; border-bottom: 2px solid #0369a1; }
    `;

    const formattedReportHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de Investigación</title>
    <style>
    ${cssContent}
    </style>
</head>
<body>
    <div class="document-container">
        <span class="research-badge">Dossier de Investigación</span>
        <div class="research-content">
            ${agentRawResponse.replace(/```html|```/g, '')}
        </div>
    </div>
</body>
</html>`;

    const fileName = `informe_investigacion_${Date.now()}.html`;
    await writeFileToDirectory(fileName, formattedReportHtml);

    return `${agentRawResponse}\n\n---\n\n### Dossier de Investigación Ensamblado\nSe ha guardado el informe visual formateado en: \`${fileName}\``;
}