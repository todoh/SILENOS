// agent_tools_registry.js
import { 
    readFileFromDirectory, writeFileToDirectory, functionLibrary 
} from './conversations.js';

export const EXECUTABLE_REGISTRY = {};

export function compileAndRegisterTool(name, jsCode) {
    try {
        const dynamicFunction = new Function('args', 'context', `
            try {
                ${jsCode}
                if (typeof execute === 'function') {
                    return Promise.resolve(execute(args, context));
                } else {
                    throw new Error("No se ha detectado la función principal 'execute(args, context)' en el código proporcionado.");
                }
            } catch (innerErr) {
                return Promise.reject(new Error("Fallo de ejecución interno de la herramienta: " + innerErr.message));
            }
        `);
        EXECUTABLE_REGISTRY[name] = dynamicFunction;
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export function initDefaultExecutables() {
    if (!EXECUTABLE_REGISTRY['notebook_buffer']) {
        EXECUTABLE_REGISTRY['notebook_buffer'] = async function(args, context) {
            const action = args.action || 'read';
            const noteContent = args.content || '';
            if (action === 'write') {
                if (context.writeJSONToDirectory) {
                    await context.writeJSONToDirectory('notebook_buffer.json', { content: noteContent });
                }
                return "Contenido escrito exitosamente en el cuaderno de notas.";
            } else {
                if (context.readJSONFromDirectory) {
                    const res = await context.readJSONFromDirectory('notebook_buffer.json');
                    return res ? res.content : "El cuaderno de notas está vacío.";
                }
                return "El cuaderno de notas está vacío.";
            }
        };
    }

    if (!EXECUTABLE_REGISTRY['file_writer']) {
        EXECUTABLE_REGISTRY['file_writer'] = async function(args, context) {
            const filename = args.filename;
            const content = args.content;
            if (!filename || content === undefined) return "Error: Se requieren los parámetros 'filename' y 'content'.";
            if (context.writeFileToDirectory) {
                const res = await context.writeFileToDirectory(filename, content);
                return res ? `Archivo '${filename}' guardado exitosamente en disco.` : "Error al escribir el archivo en disco.";
            }
            return "Error: No hay acceso a la carpeta de trabajo.";
        };
    }

    if (!EXECUTABLE_REGISTRY['project_bundler']) {
        EXECUTABLE_REGISTRY['project_bundler'] = async function(args, context) {
            const htmlFile = args.html_file || 'index.html';
            const cssFile = args.css_file || 'styles.css';
            const jsFile = args.js_file || 'main.js';
            const outputFile = args.output_file || 'bundle_completo.html';
            
            try {
                let htmlContent = await readFileFromDirectory(htmlFile) || '';
                let cssContent = await readFileFromDirectory(cssFile) || '';
                let jsContent = await readFileFromDirectory(jsFile) || '';
                
                if (!htmlContent) {
                    htmlContent = `<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>App Autocontenida</title>\n</head>\n<body>\n<div id="app"></div>\n</body>\n</html>`;
                }
                
                if (cssContent && !htmlContent.includes(cssContent)) {
                    if (htmlContent.includes('</head>')) {
                        htmlContent = htmlContent.replace('</head>', `<style>\n${cssContent}\n</style>\n</head>`);
                    } else {
                        htmlContent += `\n<style>\n${cssContent}\n</style>`;
                    }
                }
                
                if (jsContent && !htmlContent.includes(jsContent)) {
                    if (htmlContent.includes('</body>')) {
                        htmlContent = htmlContent.replace('</body>', `<script>\n${jsContent}\n</script>\n</body>`);
                    } else {
                        htmlContent += `\n<script>\n${jsContent}\n</script>`;
                    }
                }

                // RESOLUCIÓN RECURSIVA E INYECCIÓN DE LA LIBRERÍA DE FUNCIONES Y SUS DEPENDENCIAS TRANSITIVAS
                if (Array.isArray(functionLibrary) && functionLibrary.length > 0) {
                    const functionsToInject = [];
                    const addedNames = new Set();
                    
                    function resolveDependencies(targetCode) {
                        let addedInLoop = false;
                        for (const fnItem of functionLibrary) {
                            if (!fnItem.name || !fnItem.javascript_code || addedNames.has(fnItem.name)) continue;
                            
                            const usageRegex = new RegExp(`\\b${fnItem.name}\\b`, 'g');
                            const declarationRegex = new RegExp(`function\\s+${fnItem.name}\\b|const\\s+${fnItem.name}\\b|let\\s+${fnItem.name}\\b|var\\s+${fnItem.name}\\b`, 'g');
                            
                            // Revisa si se invoca la función en el código objetivo y asegura que no esté redefinida en el HTML base
                            if (usageRegex.test(targetCode) && !declarationRegex.test(htmlContent)) {
                                functionsToInject.push(fnItem.javascript_code.trim());
                                addedNames.add(fnItem.name);
                                addedInLoop = true;
                            }
                        }
                        // Si se añadieron nuevas funciones en esta vuelta, busca recursivamente las dependencias de esas funciones recién añadidas
                        if (addedInLoop) {
                            resolveDependencies(functionsToInject.join('\n\n'));
                        }
                    }
                    
                    resolveDependencies(htmlContent);
                    
                    if (functionsToInject.length > 0) {
                        let injectedBlock = functionsToInject.join('\n\n');
                        let globalHeaders = [];
                        
                        // Inicialización de cabeceras globales para audio
                        if ((injectedBlock.includes('_globalAudioContext') || htmlContent.includes('_globalAudioContext') || injectedBlock.includes('initAudioContext')) &&
                            !/\b(let|var|const|window\._globalAudioContext)\s+_globalAudioContext\b/g.test(htmlContent)) {
                            globalHeaders.push('window._globalAudioContext = window._globalAudioContext || null;');
                            globalHeaders.push('window._globalAudioMasterGain = window._globalAudioMasterGain || null;');
                        }
                        
                        const headerText = globalHeaders.length > 0 ? globalHeaders.join('\n') + '\n\n' : '';
                        const fullInjectedCode = `\n/* --- AUTO-INJECTED LIBRARY FUNCTIONS & VARS --- */\n` +
                                                   headerText +
                                                   injectedBlock +
                                                   `\n/* ------------------------------------------- */\n`;
                        
                        if (htmlContent.includes('<script>')) {
                            htmlContent = htmlContent.replace('<script>', `<script>\n${fullInjectedCode}`);
                        } else if (htmlContent.includes('</body>')) {
                            htmlContent = htmlContent.replace('</body>', `<script>${fullInjectedCode}</script>\n</body>`);
                        }
                    }
                }

                await writeFileToDirectory(outputFile, htmlContent);
                return JSON.stringify({
                    status: "success",
                    message: `Proyecto ensamblado e inyectado correctamente en ${outputFile}`,
                    bundledHtml: htmlContent
                });
            } catch (err) {
                return "Error ensamblando proyecto: " + err.message;
            }
        };
    }
}