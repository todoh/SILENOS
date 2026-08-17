// mode_html.js
import { callSpecificModel, extractCodeBlocks } from './agent_helpers.js';
import { writeFileToDirectory, functionLibrary } from './conversations.js';

/**
 * Escanea recursivamente el código para inyectar funciones de la biblioteca,
 * sus dependencias transitivas (sin límite de nivel) y las variables/constantes globales requeridas sin duplicidades.
 */
export function injectReferencedLibraryFunctions(code, library) {
    if (!code || !Array.isArray(library) || library.length === 0) {
        return code;
    }

    const functionsToInject = [];
    const addedNames = new Set();

    function resolveDependencies(targetCode) {
        let addedInLoop = false;
        for (const fnItem of library) {
            if (!fnItem.name || !fnItem.javascript_code || addedNames.has(fnItem.name)) continue;

            const usageRegex = new RegExp(`\\b${fnItem.name}\\b`, 'g');
            const declarationRegex = new RegExp(`function\\s+${fnItem.name}\\b|const\\s+${fnItem.name}\\b|let\\s+${fnItem.name}\\b|var\\s+${fnItem.name}\\b`, 'g');

            // Compara la presencia de la función en targetCode y verifica que no esté explícitamente declarada dentro del código base del usuario
            if (usageRegex.test(targetCode) && !declarationRegex.test(code)) {
                functionsToInject.push(fnItem.javascript_code.trim());
                addedNames.add(fnItem.name);
                addedInLoop = true;
            }
        }

        // Si en esta iteración se añadió alguna función nueva, analizamos todo el bloque acumulado
        // para capturar dependencias anidadas (nivel 2, 3, etc.)
        if (addedInLoop) {
            resolveDependencies(functionsToInject.join('\n\n'));
        }
    }

    resolveDependencies(code);

    if (functionsToInject.length === 0) {
        return code;
    }

    let injectedBlock = functionsToInject.join('\n\n');
    let globalHeaders = [];

    // Inyección de variables globales obligatorias para el motor de audio, canvas y matrices WebGL 3D
    if ((injectedBlock.includes('_globalAudioContext') || code.includes('_globalAudioContext') || injectedBlock.includes('initAudioContext') || injectedBlock.includes('getMasterAudioDestination')) &&
        !/\b(let|var|const|window\._globalAudioContext)\s+_globalAudioContext\b/g.test(code)) {
        globalHeaders.push('window._globalAudioContext = window._globalAudioContext || null;');
        globalHeaders.push('window._globalAudioMasterGain = window._globalAudioMasterGain || null;');
    }

    if (injectedBlock.includes('VoxelWorld3D') || code.includes('VoxelWorld3D')) {
        globalHeaders.push('window._activeVoxelWorld = window._activeVoxelWorld || null;');
    }

    const headerText = globalHeaders.length > 0 ? globalHeaders.join('\n') + '\n\n' : '';
    const fullInjectedCode = `\n/* --- FUNCIONES Y VARIABLES AUTO-INYECTADAS DE LA BIBLIOTECA --- */\n` +
                               headerText +
                               injectedBlock +
                               `\n/* ------------------------------------------------------------- */\n\n`;

    if (code.includes('<script>')) {
        return code.replace('<script>', `<script>\n${fullInjectedCode}`);
    } else if (code.includes('</script>')) {
        return code.replace('</script>', `${fullInjectedCode}\n</script>`);
    }

    return fullInjectedCode + code;
}

/**
 * Valida la estructura básica de marcado HTML para prevenir documentos corruptos.
 */
function validateAndFixHTMLStructure(htmlString) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const parserErrors = doc.querySelectorAll('parsererror');
        if (parserErrors.length > 0) {
            console.warn("Advertencia: El parser detectó inconsistencias de marcado HTML. El navegador auto-corregirá la estructura.");
        }
        return doc.documentElement.outerHTML || htmlString;
    } catch (e) {
        return htmlString;
    }
}

export async function runModoHTML(messages, fuerteModel, rapidoModel, configKeys, agentLimits, waitingNodeId, attachments, chatId) {
    const waitingNode = document.getElementById(waitingNodeId);
    const progressContainer = waitingNode ? waitingNode.querySelector('.space-y-1\\.5') : null;

    const logStep = (msg) => {
        if (progressContainer) {
            const stepEl = document.createElement('div');
            stepEl.className = "text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-1 border border-blue-200/60 rounded my-1 flex items-center gap-1.5";
            stepEl.innerHTML = `<i class="fa-solid fa-code text-[10px]"></i> <span>${msg}</span>`;
            progressContainer.appendChild(stepEl);
        }
    };

    logStep("Iniciando Construcción de Aplicación HTML Autocontenida de Alta Potencia...");
    const lastUserPrompt = messages[messages.length - 1].content;
    const serializedFunctions = functionLibrary.map(f => ({ name: f.name, description: f.desc, code: f.javascript_code }));

    // FASE 1: Estructura HTML Base y UI Layout
    logStep("Fase 1/4: Generando index.html semántico y contenedor UI...");
    const htmlPrompt = [
        { 
            role: 'system', 
            content: "Eres un Desarrollador Frontend Senior especializado en aplicaciones web de un solo archivo y videojuegos HTML5. Genera una estructura HTML5 limpia con viewport adaptativo, lienzo Canvas 2D/3D alineado y contenedor UI. Devuelve ÚNICAMENTE el código dentro de un bloque ```html ```." 
        },
        { role: 'user', content: lastUserPrompt }
    ];
    let htmlRaw = await callSpecificModel(htmlPrompt, rapidoModel, configKeys, attachments);
    let htmlCode = (extractCodeBlocks(htmlRaw)[0] || {}).code || htmlRaw;

    // FASE 2: Estilos CSS Modernos y Responsivos
    logStep("Fase 2/4: Diseñando interfaz visual y hoja de estilos...");
    const cssPrompt = [
        { 
            role: 'system', 
            content: "Eres un Diseñador UI/UX Senior. Genera estilos CSS3 modernos, responsivos, asegurando que el <canvas> o área de juego ocupe correctamente la pantalla sin barras de scroll innecesarias. Devuelve ÚNICAMENTE el código dentro de un bloque ```css ```." 
        },
        { role: 'user', content: `Estructura HTML:\n${htmlCode}\n\nSolicitud Original: ${lastUserPrompt}` }
    ];
    let cssRaw = await callSpecificModel(cssPrompt, rapidoModel, configKeys, attachments);
    let cssCode = (extractCodeBlocks(cssRaw)[0] || {}).code || cssRaw;

    // FASE 3: Lógica JS e Integración de Biblioteca Universal
    logStep("Fase 3/4: Programando motor interactivo JS e inyectando librerías...");
    const jsPrompt = [
        { 
            role: 'system', 
            content: `Eres un Arquitecto de Software JavaScript especializado en videojuegos. Desarrolla la lógica JS interactiva, la manipulación del DOM, eventos de teclado/ratón y el bucle de renderizado. LIBRERÍA DE FUNCIONES DISPONIBLES (Invoque sus nombres exactos directamente sin redeclararlas): ${JSON.stringify(serializedFunctions, null, 2)} REGLA: Devuelve ÚNICAMENTE el código dentro de un bloque \`\`\`javascript \`\`\`.` 
        },
        { role: 'user', content: `Estructura HTML:\n${htmlCode}\n\nRequerimiento: ${lastUserPrompt}` }
    ];
    let jsRaw = await callSpecificModel(jsPrompt, rapidoModel, configKeys, attachments);
    let jsCode = (extractCodeBlocks(jsRaw)[0] || {}).code || jsRaw;

    // Inyección recursiva de dependencias cruzadas
    jsCode = injectReferencedLibraryFunctions(jsCode, functionLibrary);

    // FASE 4: Empaquetado y Consolidación Autocontenida
    logStep("Fase 4/4: Empaquetando todo el CSS, JS e inyectando recursos en el Bundle Final...");

    let finalBundle = htmlCode;

    // Inyección de CSS
    if (cssCode && !finalBundle.includes(cssCode)) {
        if (finalBundle.includes('</head>')) {
            finalBundle = finalBundle.replace('</head>', `<style>\n${cssCode}\n</style>\n</head>`);
        } else {
            finalBundle = `<style>\n${cssCode}\n</style>\n` + finalBundle;
        }
    }

    // Inyección de JS
    if (jsCode && !finalBundle.includes(jsCode)) {
        if (finalBundle.includes('</body>')) {
            finalBundle = finalBundle.replace('</body>', `<script>\n${jsCode}\n</script>\n</body>`);
        } else {
            finalBundle += `\n<script>\n${jsCode}\n</script>`;
        }
    }

    // Doble pasada de seguridad sobre el HTML resultante para garantizar resolución completa
    finalBundle = injectReferencedLibraryFunctions(finalBundle, functionLibrary);
    finalBundle = validateAndFixHTMLStructure(finalBundle);

    const outputFilename = `app_bundle_${Date.now()}.html`;
    await writeFileToDirectory(outputFilename, finalBundle);
    await writeFileToDirectory('index.html', htmlCode);
    await writeFileToDirectory('style.css', cssCode);
    await writeFileToDirectory('app.js', jsCode);

    logStep(`¡Proceso completado! Bundle autocontenido guardado en ${outputFilename}`);

    return `### Aplicación Web Autocontenida Generada con Éxito\n\nSe ha construido el paquete HTML completo inyectando estilos CSS y lógica JS sin dependencias externas relativas:\n- **Archivo Final Ejecutable:** \`${outputFilename}\`\n\n\`\`\`html\n${finalBundle}\n\`\`\``;
}