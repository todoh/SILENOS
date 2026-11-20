// mode_fx_agent.js
// Pipeline Avanzado del Modo +FX: Contrato de API, Generación por Componentes, 
// Inyección Recursiva de Librerías Universales y Auditoría Runtime Sandbox.

import { callSpecificModel, extractCodeBlocks } from './agent_helpers.js';
import { writeFileToDirectory } from './conversations.js';
import { injectReferencedLibraryFunctions } from './mode_html.js';
import { getCombinedFunctionLibrary } from './app_state.js';

/**
 * Ejecuta una prueba sintáctica y de runtime dentro de un iframe en memoria
 * @param {string} htmlCode 
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
function testBundleInSandbox(htmlCode) {
    return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        let runtimeError = null;

        const cleanup = () => {
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        };

        const timeoutId = setTimeout(() => {
            cleanup();
            resolve({ success: !runtimeError, error: runtimeError });
        }, 1200);

        iframe.contentWindow.onerror = function (msg, url, line, col, error) {
            runtimeError = `Error en Runtime: ${msg} (Línea: ${line}, Columna: ${col})`;
            clearTimeout(timeoutId);
            cleanup();
            resolve({ success: false, error: runtimeError });
            return true;
        };

        iframe.contentWindow.addEventListener('unhandledrejection', function (event) {
            runtimeError = `Promesa Rechazada No Capturada: ${event.reason ? (event.reason.message || event.reason) : 'Error desconocido'}`;
            clearTimeout(timeoutId);
            cleanup();
            resolve({ success: false, error: runtimeError });
        });

        try {
            iframe.srcdoc = htmlCode;
        } catch (err) {
            runtimeError = `Error al parsear documento en sandbox: ${err.message}`;
            clearTimeout(timeoutId);
            cleanup();
            resolve({ success: false, error: runtimeError });
        }
    });
}

export async function runModoFXAgent(messages, fuerteModel, rapidoModel, configKeys, waitingNodeId) {
    const waitingNode = document.getElementById(waitingNodeId);
    const progressContainer = waitingNode ? waitingNode.querySelector('.space-y-1\\.5') : null;

    const logStep = (stepNum, title, details) => {
        if (progressContainer) {
            const el = document.createElement('div');
            el.className = "text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-1 border border-blue-200/60 rounded my-1 flex items-center justify-between";
            el.innerHTML = `<span><i class="fa-solid fa-bolt mr-1"></i> <strong>[Fase +FX #${stepNum}/5]</strong> ${title}</span> <span class="text-neutral-500">${details}</span>`;
            progressContainer.appendChild(el);
        }
    };

    const userPrompt = messages[messages.length - 1].content;
    const fullLibrary = getCombinedFunctionLibrary();

    // Inventory de firmas de la librería universal
    const serializedFunctions = fullLibrary.map(f => ({
        name: f.name,
        description: f.desc,
        signature: f.signature,
        tags: f.tags || []
    }));

    // ==========================================
    // FASE 1: Diseño de Contrato de API (Arquitectura)
    // ==========================================
    logStep(1, "Contrato de API", "Diseñando arquitectura de IDs, funciones y eventos");
    
    const contractPrompt = [
        {
            role: 'system',
            content: `Eres un Arquitecto Principal de Software Frontend. Define la arquitectura técnica y el contrato de interfaz para la aplicación solicitada.
LIBRERÍA UNIVERSAL DISPONIBLE (+FX): ${JSON.stringify(serializedFunctions, null, 2)}

REGLAS STRICTAS:
1. Diseña la estructura en un contrato JSON estricto.
2. Especifica los IDs exactos del DOM que deben crearse en el HTML.
3. Especifica los manejadores de eventos, variables globales y funciones que debe implementar JavaScript.
4. Identifica explícitamente qué funciones de la Librería Universal +FX se deberán invocar.

Devuelve ÚNICAMENTE un bloque markdown \`\`\`json \`\`\` con la estructura del contrato.`
        },
        { role: 'user', content: userPrompt }
    ];

    const resContract = await callSpecificModel(contractPrompt, fuerteModel, configKeys, []);
    const contractRaw = (extractCodeBlocks(resContract)[0] || {}).code || resContract;
    await writeFileToDirectory('api_contract.json', contractRaw);

    // ==========================================
    // FASE 2: Estructura HTML Base (Acoplada al Contrato)
    // ==========================================
    logStep(2, "Estructura HTML5", "Generando maquetación según el Contrato de API");
    
    const htmlPrompt = [
        {
            role: 'system',
            content: `Eres un Programador HTML5 Frontend Senior. Crea la estructura semántica completa basándote estrictamente en el Contrato de API acordado.
Asegúrate de incluir todos los elementos DOM, contenedores UI y canvas con los IDs especificados en el contrato.

Devuelve ÚNICAMENTE el código dentro de un bloque \`\`\`html \`\`\`.`
        },
        { role: 'user', content: `Solicitud: ${userPrompt}\n\nCONTRATO API:\n${contractRaw}` }
    ];

    const resHtml = await callSpecificModel(htmlPrompt, rapidoModel, configKeys, []);
    const indexHtml = (extractCodeBlocks(resHtml)[0] || {}).code || resHtml;
    await writeFileToDirectory('index.html', indexHtml);

    // ==========================================
    // FASE 3: Hoja de Estilos CSS3 Responsiva
    // ==========================================
    logStep(3, "Diseño y Estilos CSS3", "Creando interfaz moderna y adaptativa");
    
    const cssPrompt = [
        {
            role: 'system',
            content: "Eres un Diseñador UI/UX Frontend. Genera la hoja de estilos CSS3 moderna, pulida y adaptativa para el HTML proporcionado. Evita scrollbars innecesarios en juegos o Canvas. Devuelve ÚNICAMENTE el código en un bloque ```css ```."
        },
        { role: 'user', content: `HTML Base:\n${indexHtml}\n\nSolicitud: ${userPrompt}` }
    ];

    const resCss = await callSpecificModel(cssPrompt, rapidoModel, configKeys, []);
    const stylesCss = (extractCodeBlocks(resCss)[0] || {}).code || resCss;
    await writeFileToDirectory('styles.css', stylesCss);

    // ==========================================
    // FASE 4: Lógica JavaScript e Invocación +FX
    // ==========================================
    logStep(4, "Lógica JavaScript (+FX)", "Programando interacciones invocando la Librería Universal");

    const jsPrompt = [
        {
            role: 'system',
            content: `Eres un Programador JavaScript Senior. Desarrolla la lógica interactiva completa.

REGLAS DE ORO:
1. Respeta el Contrato de API e interactúa con los IDs presentes en el HTML.
2. Invocación de la Librería Universal +FX: Utiliza directamente por su nombre exacto las funciones requeridas de este inventario: ${JSON.stringify(serializedFunctions, null, 2)}.
3. Queda TOTALMENTE PROHIBIDO volver a declarar o redefinir cualquier función de la librería universal en tu código.
4. Escribe código defensivo (comprueba si los elementos DOM existen antes de usarlos).
5. Inicializa los contextos de Audio o Canvas tras la primera interacción del usuario.

Devuelve ÚNICAMENTE el código dentro de un bloque \`\`\`javascript \`\`\`.`
        },
        { role: 'user', content: `CONTRATO API:\n${contractRaw}\n\nHTML:\n${indexHtml}\n\nSolicitud: ${userPrompt}` }
    ];

    const resJs = await callSpecificModel(jsPrompt, fuerteModel, configKeys, []);
    let cleanJs = (extractCodeBlocks(resJs)[0] || {}).code || resJs;

    // ==========================================
    // FASE 5: Ensamblado, Inyección +FX y Auditoría Sandbox
    // ==========================================
    logStep(5, "Ensamblado y Sandbox", "Consolidando bundle autocontenido y evaluando en Runtime");

    // Construcción del bundle inicial
    let integratedHtml = indexHtml;

    if (stylesCss && !integratedHtml.includes(stylesCss)) {
        integratedHtml = integratedHtml.includes('</head>')
            ? integratedHtml.replace('</head>', `<style>\n${stylesCss}\n</style>\n</head>`)
            : `<style>\n${stylesCss}\n</style>\n` + integratedHtml;
    }

    if (cleanJs && !integratedHtml.includes(cleanJs)) {
        integratedHtml = integratedHtml.includes('</body>')
            ? integratedHtml.replace('</body>', `<script>\n${cleanJs}\n</script>\n</body>`)
            : integratedHtml + `\n<script>\n${cleanJs}\n</script>`;
    }

    // Inyección automática recursiva de dependencias transitivas de la librería universal
    let finalBundle = injectReferencedLibraryFunctions(integratedHtml, fullLibrary);

    // Auditoría activa en Sandbox
    const testResult = await testBundleInSandbox(finalBundle);

    if (!testResult.success && testResult.error) {
        logStep(5, "Corrección Runtime", "Fallo en sandbox detectado. Autocorrigiendo JavaScript...");
        
        const repairPrompt = [
            {
                role: 'system',
                content: `Eres un Auditor y Linter de JavaScript. Se ha detectado un error durante la ejecución en tiempo de real del código web. Corrige el código JavaScript para solucionar el fallo. Devuelve ÚNICAMENTE el código JS corregido dentro de un bloque \`\`\`javascript \`\`\`.`
            },
            { role: 'user', content: `CÓDIGO JS CON ERROR:\n${cleanJs}\n\nERROR DETECTADO EN RUNTIME:\n${testResult.error}` }
        ];

        const resRepaired = await callSpecificModel(repairPrompt, rapidoModel, configKeys, []);
        cleanJs = (extractCodeBlocks(resRepaired)[0] || {}).code || cleanJs;
        
        // Re-ensamblar bundle tras la corrección
        integratedHtml = indexHtml.includes('</head>')
            ? indexHtml.replace('</head>', `<style>\n${stylesCss}\n</style>\n</head>`)
            : `<style>\n${stylesCss}\n</style>\n` + indexHtml;
            
        integratedHtml = integratedHtml.includes('</body>')
            ? integratedHtml.replace('</body>', `<script>\n${cleanJs}\n</script>\n</body>`)
            : integratedHtml + `\n<script>\n${cleanJs}\n</script>`;

        finalBundle = injectReferencedLibraryFunctions(integratedHtml, fullLibrary);
    }

    // Guardado final en disco de la carpeta de trabajo
    await writeFileToDirectory('app.js', cleanJs);
    const finalFilename = `bundle_fx_${Date.now()}.html`;
    await writeFileToDirectory(finalFilename, finalBundle);

    return `### Aplicación Web Autocontenida (+FX Robotizada)\n\nSe ha construido y auditado con éxito la aplicación integrando la Librería Universal (+FX):\n- **Contrato API:** \`api_contract.json\`\n- **Bundle Autocontenido:** \`${finalFilename}\`\n\n\`\`\`html\n${finalBundle}\n\`\`\``;
}