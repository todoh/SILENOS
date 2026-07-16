/**
 * Pipeline de Orquestación del Sistema de Agentes Jerárquicos (Modelo Fuerte + Modelo Rápido)
 * Orquestación en serie con delegación paralela, metaprogramación y ejecución dinámica de herramientas.
 */
import { queryGemini } from './gemini.js';
import { queryPollinations } from './pollinations.js';
import { queryOllama } from './ollama.js';
import { agentTools, saveAgentTools } from './conversations.js';

// Registro de herramientas ejecutables cargadas en memoria
const EXECUTABLE_REGISTRY = {};

/**
 * Compila una herramienta e interactúa con el registro dinámico.
 */
function compileAndRegisterTool(name, jsCode) {
    try {
        // Envolver el string de código JS dentro de una función con argumentos de entrada estructurados
        const dynamicFunction = new Function('args', `
            try {
                ${jsCode}
                if (typeof execute === 'function') {
                    return execute(args);
                } else {
                    throw new Error("No se ha detectado la función principal 'execute(args)' en el código proporcionado.");
                }
            } catch (innerErr) {
                throw new Error("Fallo de ejecución interno de la herramienta: " + innerErr.message);
            }
        `);
        EXECUTABLE_REGISTRY[name] = dynamicFunction;
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Inicializa y compila las herramientas estáticas por defecto al primer ciclo si no están en el registro.
 */
function initDefaultExecutables() {
    // Herramienta 'notebook_buffer' por defecto
    if (!EXECUTABLE_REGISTRY['notebook_buffer']) {
        EXECUTABLE_REGISTRY['notebook_buffer'] = function(args) {
            const action = args.action || 'read';
            const noteContent = args.content || '';
            if (action === 'write') {
                localStorage.setItem('agent_notebook_buffer', noteContent);
                return "Contenido escrito exitosamente en el cuaderno de notas persistente.";
            } else {
                return localStorage.getItem('agent_notebook_buffer') || "El cuaderno de notas está vacío.";
            }
        };
    }

    // Herramienta 'json_validator' por defecto
    if (!EXECUTABLE_REGISTRY['json_validator']) {
        EXECUTABLE_REGISTRY['json_validator'] = function(args) {
            try {
                const parsed = JSON.parse(args.json_string);
                return "JSON perfectamente válido y estructurado.";
            } catch (e) {
                return `Error de validación de esquema: ${e.message}`;
            }
        };
    }
}

/**
 * Lanza el bucle de ejecución jerárquico del agente autónomo.
 * @param {Array} messages - Historial completo de la conversación activa
 * @param {Object} fuerteModel - Objeto del modelo fuerte seleccionado { name, tag, provider }
 * @param {Object} rapidoModel - Objeto del modelo rápido seleccionado { name, tag, provider }
 * @param {Object} configKeys - Claves de API { gemini, pollinations, ollamaEndpoint }
 * @param {Object} agentLimits - Límites configurados { maxStrong, maxFast } (número o 'ilimitadas')
 * @param {string} waitingNodeId - ID del nodo DOM donde se imprime el progreso en tiempo real
 * @param {Array} attachments - Archivos adjuntos del turno actual
 * @returns {Promise<string>} Resultado final consolidado por el agente
 */
export async function runAgentPipeline(messages, fuerteModel, rapidoModel, configKeys, agentLimits, waitingNodeId, attachments = []) {
    const waitingNode = document.getElementById(waitingNodeId);
    const progressContainer = waitingNode ? waitingNode.querySelector('.space-y-1\\.5') : null;

    initDefaultExecutables();

    // Sincronizar herramientas que ya estén guardadas en conversations.js al registro en vivo
    agentTools.forEach(t => {
        if (t.javascript_code && !EXECUTABLE_REGISTRY[t.name]) {
            compileAndRegisterTool(t.name, t.javascript_code);
        }
    });

    // Inicializar contadores de control de vida
    let strongRemaining = agentLimits.maxStrong === 'ilimitadas' ? Infinity : parseInt(agentLimits.maxStrong, 10);
    let fastRemaining = agentLimits.maxFast === 'ilimitadas' ? Infinity : parseInt(agentLimits.maxFast, 10);

    let currentStrongCalls = 0;
    let currentFastCalls = 0;

    // Clonamos el historial original para usarlo como memoria de trabajo expandida del Agente
    let agentMemory = [...messages];

    // Mapear el catálogo de herramientas activas a un formato JSON legible para el prompt de sistema
    const serializedTools = agentTools.map(t => ({
        name: t.name,
        description: t.desc
    }));

    // System prompt con metaprogramación y soporte estricto para Tool Calling y Build Tool
    const agentSystemPrompt = `Eres el orquestador principal (Modelo Fuerte) en una arquitectura jerárquica de agentes con capacidades avanzadas de autogeneración de software y metaprogramación.

Tu objetivo es resolver la tarea de la manera más óptima posible. Para ello cuentas con un catálogo de herramientas activas, ejecución en serie/paralela de modelos rápidos y la capacidad de autogenerar tus propias herramientas de software en caliente si detectas una brecha técnica.

CATÁLOGO DE HERRAMIENTAS ACTIVAS:
${JSON.stringify(serializedTools, null, 2)}

REGLAS DE RESPUESTA IMPRESCINDIBLES (DEVOLVER EXCLUSIVAMENTE UN JSON CRUDO):
Debes responder EXCLUSIVAMENTE con un objeto JSON válido. No incluyas explicaciones de texto fuera del JSON. No uses bloques markdown tipo \`\`\`json \`\`\`.

La estructura del JSON debe ser exactamente una de estas cuatro según la acción requerida:

1. Si deseas DELEGAR sub-tareas conceptuales en paralelo a un Modelo Rápido:
{
  "action": "delegate_parallel",
  "thought": "Explicación detallada de tu razonamiento o plan actual.",
  "prompts": [
    "Instrucción clara e independiente 1 para el modelo rápido",
    "Instrucción clara e independiente 2 para el modelo rápido"
  ]
}

2. Si deseas EJECUTAR una herramienta activa de tu catálogo actual:
{
  "action": "call_tool",
  "thought": "Razonamiento detallado de por qué ejecutas esta herramienta.",
  "tool_calls": [
    {
      "tool_name": "nombre_de_la_herramienta",
      "arguments": {
        "clave": "valor"
      }
    }
  ]
}

3. Si necesitas una capacidad técnica ausente y deseas CREAR/AUTOGENERAR una nueva herramienta JavaScript:
{
  "action": "build_tool",
  "thought": "Explicación detallada de la carencia técnica detectada y qué resolverá la nueva herramienta.",
  "tool_creation": {
    "name": "nombre_nueva_herramienta",
    "description": "Explicación estricta de lo que hace y sus parámetros esperados.",
    "javascript_code": "function execute(args) {\\n  // Tu lógica de programación aquí.\\n  // Siempre debe haber una función execute que reciba args y retorne el resultado.\\n  return \\"Resultado de la operación\\";\\n}"
  }
}

4. Si consideras que has completado la tarea o consolidado la información:
{
  "action": "final_response",
  "thought": "Reflexión final sobre todos los resultados obtenidos.",
  "content": "Tu respuesta estructurada, detallada y pulida dirigida al usuario humano."
}

ESTADO DE RECURSOS DEL CICLO:
- Llamadas fuertes disponibles: ${strongRemaining}.
- Llamadas rápidas disponibles: ${fastRemaining}.
Mantén el control de recursos y concluye elegantemente si se agota el presupuesto de ciclos.`;

    // Inyectar el system prompt enriquecido al inicio de la memoria
    agentMemory.unshift({ role: 'system', content: agentSystemPrompt });

    let finalResponseText = "El agente no pudo consolidar una respuesta dentro de las restricciones de control fijadas.";

    // Bucle en serie de ejecución del Modelo Fuerte
    while (strongRemaining > 0) {
        currentStrongCalls++;
        strongRemaining--;

        // Imprimir traza visual del paso actual del orquestador en el DOM en tiempo real
        if (progressContainer) {
            const stepLabel = document.createElement('div');
            stepLabel.className = "text-[10px] font-mono text-orange-600 bg-orange-50 px-2 py-1 border border-orange-200/50 rounded my-1 animate-pulse";
            stepLabel.innerHTML = `<i class="fa-solid fa-microchip mr-1"></i> [Orquestador: ${fuerteModel.name}] Analizando paso #${currentStrongCalls}... (Llamadas Fuertes Restantes: ${strongRemaining === Infinity ? '∞' : strongRemaining})`;
            progressContainer.appendChild(stepLabel);
            document.getElementById('chat-history').scrollTop = document.getElementById('chat-history').scrollHeight;
        }

        // 1. Llamar al Modelo Fuerte
        let rawOutput = "";
        try {
            rawOutput = await callSpecificModel(agentMemory, fuerteModel, configKeys, attachments);
        } catch (err) {
            throw new Error(`Fallo crítico en el Modelo Fuerte (Paso ${currentStrongCalls}): ${err.message}`);
        }

        // Limpiar posibles impurezas del output antes de parsear el JSON estructurado
        let cleanJsonStr = rawOutput.trim();
        if (cleanJsonStr.startsWith('```json')) cleanJsonStr = cleanJsonStr.substring(7);
        if (cleanJsonStr.startsWith('```')) cleanJsonStr = cleanJsonStr.substring(3);
        if (cleanJsonStr.endsWith('```')) cleanJsonStr = cleanJsonStr.substring(0, cleanJsonStr.length - 3);
        cleanJsonStr = cleanJsonStr.trim();

        let parsedOutput;
        try {
            parsedOutput = JSON.parse(cleanJsonStr);
        } catch (jsonErr) {
            if (progressContainer) {
                const warnLabel = document.createElement('div');
                warnLabel.className = "text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200/40";
                warnLabel.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Advertencia: Formato no estructurado. Autoconsolidando respuesta.`;
                progressContainer.appendChild(warnLabel);
            }
            parsedOutput = {
                action: "final_response",
                thought: "Formato de salida libre detectado. Recuperación automática completada.",
                content: rawOutput
            };
        }

        // Imprimir pensamiento interno en el flujo de ejecución en tiempo real
        if (progressContainer && parsedOutput.thought) {
            const thoughtBox = document.createElement('div');
            thoughtBox.className = "border-l-2 border-neutral-300 pl-3 my-2 text-neutral-600 bg-neutral-100/50 rounded-r-lg p-2 text-[11px] font-mono";
            thoughtBox.innerHTML = `<div class="font-bold text-[9px] text-neutral-400 uppercase tracking-wider mb-1"><i class="fa-solid fa-brain text-purple-400 mr-1"></i> Pensamiento del Agente (Paso ${currentStrongCalls})</div>${parsedOutput.thought}`;
            progressContainer.appendChild(thoughtBox);
            document.getElementById('chat-history').scrollTop = document.getElementById('chat-history').scrollHeight;
        }

        // 2. Evaluar Acción Decidida por el Orquestador
        if (parsedOutput.action === 'final_response') {
            finalResponseText = parsedOutput.content;
            if (parsedOutput.thought) {
                finalResponseText = `<think>${parsedOutput.thought}</think>${finalResponseText}`;
            }
            break; // Salida exitosa del bucle
        } 
        
        // ACCIÓN: delegate_parallel
        if (parsedOutput.action === 'delegate_parallel' && parsedOutput.prompts && parsedOutput.prompts.length > 0) {
            const currentTasks = parsedOutput.prompts;
            
            if (currentTasks.length > fastRemaining) {
                if (progressContainer) {
                    const limitLabel = document.createElement('div');
                    limitLabel.className = "text-[10px] font-mono text-red-600 bg-red-50 p-1 rounded border border-red-200/50";
                    limitLabel.textContent = `[!] Truncando tareas paralelas: Solicitadas ${currentTasks.length}, permitidas ${fastRemaining}.`;
                    progressContainer.appendChild(limitLabel);
                }
                currentTasks.length = fastRemaining;
            }

            if (currentTasks.length === 0) {
                agentMemory.push({ role: 'user', content: "Límite de sub-tareas alcanzado. Por favor, concluye con la información actual." });
                continue;
            }

            fastRemaining -= currentTasks.length;

            if (progressContainer) {
                const parallelLabel = document.createElement('div');
                parallelLabel.className = "text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-1 border border-blue-200/50 rounded font-semibold";
                parallelLabel.innerHTML = `<i class="fa-solid fa-network-wired mr-1"></i> [Trabajador: ${rapidoModel.name}] Ejecutando ${currentTasks.length} tareas en paralelo...`;
                progressContainer.appendChild(parallelLabel);
                document.getElementById('chat-history').scrollTop = document.getElementById('chat-history').scrollHeight;
            }

            agentMemory.push({ role: 'model', content: JSON.stringify(parsedOutput) });

            const parallelPromises = currentTasks.map(async (taskPrompt, subIndex) => {
                const subTaskId = ++currentFastCalls;
                const fastSystemPrompt = `Eres un agente de ejecución rápido de nivel 1. Tu rol es resolver de manera precisa, veloz y directa la siguiente sub-tarea asignada por tu orquestador. Responde de forma concisa y enfocada únicamente en la información solicitada.`;
                const workerPayload = [
                    { role: 'system', content: fastSystemPrompt },
                    { role: 'user', content: taskPrompt }
                ];

                const fastResult = await callSpecificModel(workerPayload, rapidoModel, configKeys, attachments);

                if (progressContainer) {
                    const taskLabel = document.createElement('div');
                    taskLabel.className = "text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200/50 p-1.5 rounded ml-4 my-1 animate-fade-in";
                    taskLabel.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>Tarea Rápida #${subTaskId} Resuelta:</strong> <span class="block text-neutral-500 font-sans mt-0.5">${taskPrompt.substring(0, 60)}...</span>`;
                    progressContainer.appendChild(taskLabel);
                    document.getElementById('chat-history').scrollTop = document.getElementById('chat-history').scrollHeight;
                }

                return `[Resultado de Sub-Tarea Paralela #${subTaskId} - Prompt: "${taskPrompt}"]: \n${fastResult}`;
            });

            const resultsArray = await Promise.all(parallelPromises);
            const combinedResultsPrompt = `Resultados obtenidos de las llamadas en paralelo ejecutadas por el Modelo Rápido:\n\n${resultsArray.join('\n\n---\n\n')}\n\nPor favor, analiza estos datos y determina tu siguiente acción ("delegate_parallel", "call_tool", "build_tool" o "final_response").`;
            
            agentMemory.push({ role: 'user', content: combinedResultsPrompt });
        } 
        
        // ACCIÓN: call_tool (Ejecución Dinámica de Herramientas)
        else if (parsedOutput.action === 'call_tool' && parsedOutput.tool_calls && parsedOutput.tool_calls.length > 0) {
            agentMemory.push({ role: 'model', content: JSON.stringify(parsedOutput) });
            const toolResults = [];

            for (const call of parsedOutput.tool_calls) {
                const name = call.tool_name;
                const args = call.arguments || {};

                if (progressContainer) {
                    const toolLabel = document.createElement('div');
                    toolLabel.className = "text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-1 border border-indigo-200/50 rounded my-1 font-semibold";
                    toolLabel.innerHTML = `<i class="fa-solid fa-gears mr-1"></i> [Invocación] Ejecutando herramienta: [${name}]...`;
                    progressContainer.appendChild(toolLabel);
                    document.getElementById('chat-history').scrollTop = document.getElementById('chat-history').scrollHeight;
                }

                let output = "";
                if (EXECUTABLE_REGISTRY[name]) {
                    try {
                        const result = EXECUTABLE_REGISTRY[name](args);
                        output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                    } catch (execErr) {
                        output = `Error al ejecutar la herramienta [${name}]: ${execErr.message}. Corrige los parámetros o redefine la herramienta si tiene bugs internos.`;
                    }
                } else {
                    output = `Error: La herramienta [${name}] no está registrada ni compilada en el sistema. Puedes usar "build_tool" para crearla primero.`;
                }

                toolResults.push(`[Resultado Ejecución Herramienta: "${name}"]: \n${output}`);
            }

            const combinedToolPrompt = `Resultados de la ejecución de herramientas:\n\n${toolResults.join('\n\n---\n\n')}\n\nAnaliza este feedback de sistema y determina tu próximo paso.`;
            agentMemory.push({ role: 'user', content: combinedToolPrompt });
        }

        // ACCIÓN: build_tool (Metaprogramación - Autogeneración de código JS)
        else if (parsedOutput.action === 'build_tool' && parsedOutput.tool_creation) {
            agentMemory.push({ role: 'model', content: JSON.stringify(parsedOutput) });
            const info = parsedOutput.tool_creation;
            const cleanName = info.name.toLowerCase().replace(/\s+/g, '_');

            if (progressContainer) {
                const buildLabel = document.createElement('div');
                buildLabel.className = "text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-1 border border-purple-200/50 rounded my-1 font-semibold animate-pulse";
                buildLabel.innerHTML = `<i class="fa-solid fa-code mr-1"></i> [Metaprogramación] Compilando e indexando nueva herramienta: [${cleanName}]...`;
                progressContainer.appendChild(buildLabel);
                document.getElementById('chat-history').scrollTop = document.getElementById('chat-history').scrollHeight;
            }

            // Compilar e indexar en el Host de JS
            const compileResult = compileAndRegisterTool(cleanName, info.javascript_code);
            let responseFeedback = "";

            if (compileResult.success) {
                // Registrar visualmente en el panel y persistir en conversations.js
                const idNueva = `tool-${Date.now()}`;
                agentTools.push({
                    id: idNueva,
                    name: cleanName,
                    desc: info.description,
                    javascript_code: info.javascript_code
                });
                saveAgentTools();

                // Intentar actualizar la interfaz en caliente de forma segura
                const toolsContainerDOM = document.getElementById('tools-list-container');
                if (toolsContainerDOM) {
                    import('./ui.js').then(uiModule => {
                        uiModule.renderAgentToolsListUI(toolsContainerDOM);
                    });
                }

                responseFeedback = `Éxito: La herramienta [${cleanName}] se ha programado, compilado y guardado con éxito. Ahora está disponible en tu catálogo. Puedes invocarla usando "action": "call_tool" con "tool_name": "${cleanName}".`;
            } else {
                responseFeedback = `Fallo de compilación de código JavaScript en la herramienta [${cleanName}]: ${compileResult.error}. Revisa la sintaxis, corrige el script y vuelve a intentar la compilación usando "build_tool".`;
            }

            agentMemory.push({ role: 'user', content: responseFeedback });
        }

        else {
            agentMemory.push({ role: 'user', content: "Acción inválida o faltante. Por favor, utiliza la estructura estricta 'delegate_parallel', 'call_tool', 'build_tool' o 'final_response' en un objeto JSON válido." });
        }
    }

    if (strongRemaining <= 0 && parsedOutput?.action !== 'final_response') {
        if (progressContainer) {
            const alertLabel = document.createElement('div');
            alertLabel.className = "text-[10px] font-mono text-red-700 bg-red-100 p-2 border border-red-200 rounded font-bold";
            alertLabel.innerHTML = `<i class="fa-solid fa-hand"></i> Límite absoluto de llamadas fuertes alcanzado. Cerrando pipeline.`;
            progressContainer.appendChild(alertLabel);
        }
    }

    return finalResponseText;
}

/**
 * Enrutador unificado para consultar un proveedor específico de IA basado en su tipado nativo.
 */
async function callSpecificModel(messages, model, configKeys, attachments) {
    if (model.provider === 'gemini') {
        return await queryGemini(messages, model.tag, configKeys.gemini, attachments);
    } else if (model.provider === 'pollinations') {
        return await queryPollinations(messages, model.tag, configKeys.pollinations, attachments);
    } else if (model.provider === 'ollama') {
        return await queryOllama(messages, model.tag, configKeys.ollamaEndpoint, attachments);
    } else {
        throw new Error(`Proveedor desconocido: ${model.provider}`);
    }
}