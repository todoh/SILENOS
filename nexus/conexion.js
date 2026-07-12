// --- MOTOR DE LLAMADAS TRANSMUTADORAS CON REINTENTOS AUTOMÁTICOS (GEMINI API) ---
async function callGeminiWithRetry(prompt, systemInstruction, validatorFn = null, maxRetries = 3) {
    const apiKey = document.getElementById('gemini-api-key').value.trim();
    const model = document.getElementById('gemini-model').value.trim();
    if (!apiKey) {
        throw new Error("Falta la API Key de Gemini en los parámetros de cabecera.");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const promptCompleto = `${systemInstruction}\n\n${prompt}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logConsole(`Llamada LLM (Intento ${attempt}/${maxRetries}). Procesando tokens...`, 'api');
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptCompleto }] }]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
                        
            const data = await response.json();
                        
            if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content?.parts?.[0]?.text) {
                throw new Error("Gemini no retornó contenido estructural.");
            }
                        
            let rawOutput = data.candidates[0].content.parts[0].text.trim();
            if (validatorFn) {
                if (validatorFn.isJsonValidator) {
                    let processedString = extractJSON(rawOutput);
                    try {
                        let parsedObj = JSON.parse(processedString);
                        let validationResult = validatorFn(parsedObj);
                        if (validationResult.valid) {
                            return parsedObj;
                        } else {
                            logConsole(`Validación fallida en intento ${attempt}: ${validationResult.reason}`, 'warning');
                        }
                    } catch (jsonErr) {
                        logConsole(`Fallo de parseo estructural en intento ${attempt}: El output no conforma un JSON válido.`, 'warning');
                    }
                } else {
                    // Validación personalizada para flujos de texto plano
                    let validationResult = validatorFn(rawOutput);
                    if (validationResult.valid) {
                        return rawOutput.trim();
                    } else {
                        logConsole(`Validación de texto fallida en intento ${attempt}: ${validationResult.reason}`, 'warning');
                    }
                }
            } else {
                if (rawOutput && rawOutput.trim().length > 0) return rawOutput.trim();
            }
        } catch (err) {
            logConsole(`Error de conexión o respuesta en intento ${attempt}: ${err.message}`, 'error');
        }
        await new Promise(resolve => setTimeout(resolve, 3500));
    }
    throw new Error(`Pipeline bloqueado: Superados los ${maxRetries} reintentos críticos sin un output válido.`);
}