// --- SISTEMA DE PARSEO AVANZADO Y FILTRADO DE BLOQUES JSON ---
function extractJSON(text) {
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();
    let startIdx = cleanText.indexOf('{');
    let endIdx = cleanText.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        return cleanText.substring(startIdx, endIdx + 1).trim();
    }
    return cleanText;
}