// mode_classifier.js
// Determina con el modelo rápido qué tipo de experto u orquestador activar según la tarea

import { callSpecificModel, extractJSONFromText } from './agent_helpers.js';

export async function classifyTaskMode(userPrompt, rapidoModel, configKeys) {
    const systemPrompt = `Eres el Clasificador Central de Intentos del Sistema. Tu única tarea es analizar la consulta del usuario y determinar el modo experto ideal para resolverla.

MODOS DISPONIBLES:
1. "libre": Consultas generales, pequeñas tareas de programación, preguntas directas o tareas conceptuales.
2. "escritura": Generación de documentos narrativos, relatos, guiones, manuales o ensayos extensos.
3. "html": Desarrollo rápido de aplicaciones web sencillas o páginas en un solo bloque.
4. "investigacion": Recopilación estructurada de información, análisis de fuentes e informes.
5. "fx": Proyectos complejos de código que requieran modularización en 6 archivos (index.html, styles.css, uioi.js, funciones.js, logic.js, main.js) o cuando el usuario tenga activado o solicite explícitamente el modo +FX.

REGLAS DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON estricto en el siguiente formato:
{
    "modo": "libre" | "escritura" | "html" | "investigacion" | "fx",
    "justificacion": "Explicación breve del modo elegido"
}`;

    const payload = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    try {
        const rawOutput = await callSpecificModel(payload, rapidoModel, configKeys, []);
        const parsed = extractJSONFromText(rawOutput);
        if (parsed && parsed.modo) {
            return parsed.modo;
        }
    } catch (err) {
        console.warn("Fallo en la clasificación de modo. Usando 'html' por defecto:", err);
    }
    return 'html';
}