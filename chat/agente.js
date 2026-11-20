// agente.js
// Pipeline de Orquestación con Doble Validación por Fase, Subagentes de Revisión y Contrato de API

import { 
    agentTools, functionLibrary, saveAgentTools, writeJSONToDirectory, readJSONFromDirectory, 
    writeFileToDirectory, readFileFromDirectory, saveAgentCheckpoint, clearAgentCheckpoint, loadAgentCheckpoint 
} from './conversations.js';
import * as db from './db.js';
import { 
    EXECUTABLE_REGISTRY, compileAndRegisterTool, initDefaultExecutables 
} from './agent_tools_registry.js';
import { 
    callSpecificModel, extractJSONFromText, extractCodeBlocks, getDirectoryFileList 
} from './agent_helpers.js';
import { 
    buildDynamicSystemPrompt, buildWorkerSystemPrompt 
} from './agent_prompts.js';

export { compileAndRegisterTool } from './agent_tools_registry.js';

export const ACTIVE_AGENT_PAUSE_SIGNALS = {};

export function requestAgentPause(chatId) {
    ACTIVE_AGENT_PAUSE_SIGNALS[chatId] = true;
}

/** Subllamada del Modelo Rápido para autocorregir y validar respuestas/código en subagentes */
async function fastModelCodeSanitizer(rawCode, rapidoModel, configKeys) {
    const sanitizePrompt = [
        { 
            role: 'system', 
            content: 'Eres un Linter y Auditor Syntax de código web. Revisa el código recibido, corrige posibles errores de sintaxis JS, corchetes o etiquetas no cerradas y asegúrate de que no haya truncamientos. Devuelve ÚNICAMENTE el código corregido dentro de bloques markdown adecuados.' 
        },
        { role: 'user', content: rawCode }
    ];
    try {
        const cleaned = await callSpecificModel(sanitizePrompt, rapidoModel, configKeys, []);
        return cleaned;
    } catch (e) {
        return rawCode;
    }
}

export async function runAgentPipeline(messages, fuerteModel, rapidoModel, configKeys, agentLimits, waitingNodeId, attachments = [], chatId = null) {
    const waitingNode = document.getElementById(waitingNodeId);
    const progressContainer = waitingNode ? waitingNode.querySelector('.space-y-1\\.5') : null;

    initDefaultExecutables();
    agentTools.forEach(t => {
        if (t.javascript_code && !EXECUTABLE_REGISTRY[t.name]) {
            compileAndRegisterTool(t.name, t.javascript_code);
        }
    });

    if (chatId) {
        ACTIVE_AGENT_PAUSE_SIGNALS[chatId] = false;
    }

    const isUnlimited = agentLimits.maxStrong === 'ilimitadas';
    const totalMaxStrong = isUnlimited ? 999 : parseInt(agentLimits.maxStrong, 10);
    let strongRemaining = totalMaxStrong;
    let fastRemaining = agentLimits.maxFast === 'ilimitadas' ? Infinity : parseInt(agentLimits.maxFast, 10);

    let currentStrongCalls = 0;
    let currentFastCalls = 0;

    let agentMemory = [...messages];
    let globalTasksState = [];
    let accumulatedCodeOutput = "";
    let finalResponseText = "El agente no pudo consolidar una respuesta dentro de las restricciones fijadas.";

    const savedCheckpoint = chatId ? await loadAgentCheckpoint(chatId) : null;
    if (savedCheckpoint) {
        agentMemory = savedCheckpoint.agentMemory || agentMemory;
        currentStrongCalls = savedCheckpoint.currentStrongCalls || 0;
        currentFastCalls = savedCheckpoint.currentFastCalls || 0;
        strongRemaining = savedCheckpoint.strongRemaining ?? strongRemaining;
        fastRemaining = savedCheckpoint.fastRemaining ?? fastRemaining;
        globalTasksState = savedCheckpoint.globalTasksState || [];
        accumulatedCodeOutput = savedCheckpoint.accumulatedCodeOutput || "";

        if (progressContainer) {
            const restoreBadge = document.createElement('div');
            restoreBadge.className = "text-[10px] font-mono text-purple-700 bg-purple-50 px-2.5 py-1 border border-purple-200 rounded my-1 flex items-center gap-2";
            restoreBadge.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> <strong>Checkpoint Restaurado:</strong> Reanudando desde Fase #${currentStrongCalls + 1}...`;
            progressContainer.appendChild(restoreBadge);
        }
    }

    let counterBadge = null;
    if (progressContainer) {
        counterBadge = document.createElement('div');
        counterBadge.className = "agent-counter-badge flex items-center gap-3 text-[10px] font-mono text-neutral-500 bg-neutral-100/80 border border-neutral-200 px-2.5 py-1 rounded-md mb-2 w-fit select-none";
        counterBadge.innerHTML = `
            <span id="cnt-fuerte" class="flex items-center gap-1 font-semibold text-orange-600">
                <i class="fa-solid fa-brain text-[9px]"></i> ${fuerteModel.name}: <strong>${currentStrongCalls} / ${isUnlimited ? '∞' : totalMaxStrong}</strong>
            </span>
            <span class="text-neutral-300">|</span>
            <span id="cnt-rapido" class="flex items-center gap-1 font-semibold text-blue-600">
                <i class="fa-solid fa-bolt text-[9px]"></i> ${rapidoModel.name}: <strong>${currentFastCalls}</strong>
            </span>
        `;
        progressContainer.appendChild(counterBadge);
    }

    const updateCallsCounter = () => {
        if (!counterBadge) return;
        const fuerteEl = counterBadge.querySelector('#cnt-fuerte strong');
        const rapidoEl = counterBadge.querySelector('#cnt-rapido strong');
        if (fuerteEl) fuerteEl.textContent = `${currentStrongCalls} / ${isUnlimited ? '∞' : totalMaxStrong}`;
        if (rapidoEl) rapidoEl.textContent = currentFastCalls;
    };

    const serializedTools = agentTools.map(t => ({ name: t.name, description: t.desc }));
    const serializedFunctions = functionLibrary.map(f => ({ name: f.name, description: f.desc, code: f.javascript_code }));

    while (strongRemaining > 0) {
        if (chatId && ACTIVE_AGENT_PAUSE_SIGNALS[chatId]) {
            await saveAgentCheckpoint(chatId, {
                chatId, agentMemory, currentStrongCalls, currentFastCalls,
                strongRemaining, fastRemaining, globalTasksState, accumulatedCodeOutput, timestamp: Date.now()
            });
            if (progressContainer) {
                const pauseLabel = document.createElement('div');
                pauseLabel.className = "text-[10px] font-mono text-amber-700 bg-amber-50 px-2.5 py-1.5 border border-amber-200 rounded my-2 font-bold flex items-center gap-2";
                pauseLabel.innerHTML = `<i class="fa-solid fa-circle-pause"></i> Ejecución Pausada por el Usuario. Checkpoint Guardado en Disco.`;
                progressContainer.appendChild(pauseLabel);
            }
            return `PAUSED_CHECKPOINT:[El agente ha sido pausado exitosamente en la Fase #${currentStrongCalls}. Puedes reanudar en cualquier momento.]`;
        }

        const currentStepNumber = currentStrongCalls + 1;
        const isLastTurn = strongRemaining === 1 && !isUnlimited;
        const existingFiles = await getDirectoryFileList();

        const dynamicSystemPrompt = buildDynamicSystemPrompt(
            currentStepNumber, isUnlimited, totalMaxStrong, strongRemaining, 
            fastRemaining, existingFiles, serializedTools, isLastTurn, serializedFunctions
        );

        if (agentMemory.length > 0 && agentMemory[0].role === 'system') {
            agentMemory[0] = { role: 'system', content: dynamicSystemPrompt };
        } else {
            agentMemory.unshift({ role: 'system', content: dynamicSystemPrompt });
        }

        // ==========================================
        // LLAMADA FUERTE #1: Planificación y Contrato
        // ==========================================
        currentStrongCalls++;
        strongRemaining--;
        updateCallsCounter();

        if (progressContainer) {
            const stepLabel = document.createElement('div');
            stepLabel.className = "text-[10px] font-mono text-orange-600 bg-orange-50 px-2 py-1 border border-orange-200/50 rounded my-1 flex items-center justify-between";
            stepLabel.innerHTML = `<span><i class="fa-solid fa-microchip mr-1"></i> [Arquitecto Fuerte - Paso 1: Planificación y Contrato API] Fase #${currentStepNumber}</span> <span class="font-bold">${isUnlimited ? 'Sin límite' : `Quedan ${strongRemaining} fases`}</span>`;
            progressContainer.appendChild(stepLabel);
        }

        let rawOutputStep1 = "";
        try {
            rawOutputStep1 = await callSpecificModel(agentMemory, fuerteModel, configKeys, attachments);
        } catch (err) {
            if (chatId) {
                await saveAgentCheckpoint(chatId, {
                    chatId, agentMemory, currentStrongCalls, currentFastCalls,
                    strongRemaining, fastRemaining, globalTasksState, accumulatedCodeOutput, timestamp: Date.now()
                });
            }
            throw new Error(`Fallo crítico en Modelo Fuerte Paso 1 (Checkpoint Guardado): ${err.message}`);
        }

        let parsedStep1;
        try {
            parsedStep1 = extractJSONFromText(rawOutputStep1);
        } catch (jsonErr) {
            agentMemory.push({ role: 'model', content: rawOutputStep1 });
            agentMemory.push({
                role: 'user',
                content: `ERROR CRÍTICO: Formato no válido. Devuelve únicamente un objeto JSON estricto.`
            });
            continue;
        }

        if (parsedStep1.plan_actual && Array.isArray(parsedStep1.plan_actual)) {
            globalTasksState = parsedStep1.plan_actual;
        }

        if (parsedStep1.action === 'final_response') {
            finalResponseText = parsedStep1.content || "Proceso completado con éxito.";
            if (!finalResponseText.includes("```") && accumulatedCodeOutput) {
                finalResponseText += "\n\n### Código Fuente HTML Autocontenido Generado por Subagentes:\n\n" + accumulatedCodeOutput;
            }
            if (parsedStep1.thought) {
                finalResponseText = `<think>${parsedStep1.thought}</think>${finalResponseText}`;
            }
            if (counterBadge) {
                finalResponseText = `<div class="agent-summary-badge mb-3">${counterBadge.outerHTML}</div>` + finalResponseText;
            }
            if (chatId) await clearAgentCheckpoint(chatId);
            break;
        }

        // ==========================================
        // EJECUCIÓN DE SUBTAREAS O HERRAMIENTAS
        // ==========================================
        let intermediateFeedback = "";

        if (parsedStep1.action === 'delegate_parallel' && parsedStep1.prompts && parsedStep1.prompts.length > 0) {
            const currentTasks = parsedStep1.prompts;
            if (currentTasks.length > fastRemaining) currentTasks.length = fastRemaining;
            
            fastRemaining -= currentTasks.length;

            let existingContract = await readJSONFromDirectory('api_contract.json');

            if (progressContainer) {
                const parallelLabel = document.createElement('div');
                parallelLabel.className = "text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-1 border border-blue-200/50 rounded font-semibold";
                parallelLabel.innerHTML = `<i class="fa-solid fa-network-wired mr-1"></i> [Subagentes Rápidos] Generando módulos según Contrato API (${currentTasks.length} tareas)...`;
                progressContainer.appendChild(parallelLabel);
            }

            agentMemory.push({ role: 'model', content: JSON.stringify(parsedStep1) });

            const parallelPromises = currentTasks.map(async (taskPrompt) => {
                currentFastCalls++;
                updateCallsCounter();

                const subTaskId = currentFastCalls;
                const fastSystemPrompt = buildWorkerSystemPrompt(serializedFunctions, existingContract);
                const workerPayload = [
                    { role: 'system', content: fastSystemPrompt },
                    { role: 'user', content: taskPrompt }
                ];

                let fastResult = await callSpecificModel(workerPayload, rapidoModel, configKeys, attachments);
                fastResult = await fastModelCodeSanitizer(fastResult, rapidoModel, configKeys);

                const detectedBlocks = extractCodeBlocks(fastResult);
                for (let i = 0; i < detectedBlocks.length; i++) {
                    const block = detectedBlocks[i];
                    let ext = block.language === 'css' ? 'css' : (block.language === 'javascript' || block.language === 'js' ? 'js' : 'html');
                    let targetFilename = `modulo_${subTaskId}.${ext}`;
                    await writeFileToDirectory(targetFilename, block.code);
                }

                if (progressContainer) {
                    const taskLabel = document.createElement('div');
                    taskLabel.className = "text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200/50 p-1.5 rounded ml-4 my-1";
                    taskLabel.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>Módulo #${subTaskId} Procesado:</strong> <span class="block text-neutral-500 font-sans mt-0.5">${taskPrompt.substring(0, 65)}...</span>`;
                    progressContainer.appendChild(taskLabel);
                }

                accumulatedCodeOutput += `\n\n/* --- MÓDULO PROTOCOLAR #${subTaskId}: ${taskPrompt} --- */\n` + fastResult;
                return `[Resultado Módulo #${subTaskId} - Solicitud: "${taskPrompt}"]: \n${fastResult}`;
            });

            const resultsArray = await Promise.all(parallelPromises);
            intermediateFeedback = `Resultados de los Subagentes Programadores:\n\n${resultsArray.join('\n\n---\n\n')}`;
        } 
        else if (parsedStep1.action === 'call_tool' && parsedStep1.tool_calls && parsedStep1.tool_calls.length > 0) {
            agentMemory.push({ role: 'model', content: JSON.stringify(parsedStep1) });
            const toolResults = [];
            const safeContext = {
                console: console,
                db: db,
                writeJSONToDirectory: writeJSONToDirectory,
                readJSONFromDirectory: readJSONFromDirectory,
                writeFileToDirectory: writeFileToDirectory,
                readFileFromDirectory: readFileFromDirectory
            };

            for (const call of parsedStep1.tool_calls) {
                const name = call.tool_name;
                const args = call.arguments || {};
                
                let output = "";
                if (EXECUTABLE_REGISTRY[name]) {
                    try {
                        const result = await EXECUTABLE_REGISTRY[name](args, safeContext);
                        output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                    } catch (execErr) {
                        output = `Error ejecutando [${name}]: ${execErr.message}`;
                    }
                } else {
                    output = `Error: La herramienta [${name}] no existe en el registro.`;
                }
                toolResults.push(`[Resultado ${name}]: \n${output}`);
            }
            intermediateFeedback = `Feedback de ejecución de herramientas:\n\n${toolResults.join('\n\n---\n\n')}`;
        } else {
            intermediateFeedback = "Instrucción procesada sin llamadas externas.";
        }

        // ==========================================
        // LLAMADA FUERTE #2: Auditoría y Consolidador
        // ==========================================
        currentStrongCalls++;
        updateCallsCounter();

        if (progressContainer) {
            const auditLabel = document.createElement('div');
            auditLabel.className = "text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-1 border border-purple-200/50 rounded my-1 flex items-center justify-between";
            auditLabel.innerHTML = `<span><i class="fa-solid fa-magnifying-glass-code mr-1"></i> [Arquitecto Fuerte - Paso 2: Auditoría e Inyección de Contrato]</span>`;
            progressContainer.appendChild(auditLabel);
        }

        const auditPrompt = `${intermediateFeedback}\n\nINSTRUCCIÓN DE AUDITORÍA Y CONTROL DE CALIDAD EN MODO HTML:\n1. Revisa minuciosamente los archivos y fragmentos generados en esta iteración.\n2. Asegúrate de que los módulos cumplan las firmas de funciones y variables globales establecidas.\n3. Asegúrate de que el resultado entregable sea un ARCHIVO HTML 100% AUTOCONTENIDO (con todo el CSS en <style> y JS en <script> dentro del mismo código, incrustando recursos en Data URLs/SVGs inline si aplica).\n4. Verifica la correcta inclusión de las funciones reutilizables solicitadas de la librería universal.\n5. Actualiza el campo "plan_actual" evaluando si ya se han cubierto todos los archivos del protocolo según la escala del proyecto.\n6. Si el proyecto está listo o quedan pocas vueltas (${strongRemaining}), ensambla la solución completa en un bloque \`\`\`html \`\`\` e emite "final_response". De lo contrario, indica la siguiente acción en JSON.`;

        agentMemory.push({ role: 'user', content: auditPrompt });

        let rawOutputStep2 = "";
        try {
            rawOutputStep2 = await callSpecificModel(agentMemory, fuerteModel, configKeys, attachments);
        } catch (err) {
            if (chatId) {
                await saveAgentCheckpoint(chatId, {
                    chatId, agentMemory, currentStrongCalls, currentFastCalls,
                    strongRemaining, fastRemaining, globalTasksState, accumulatedCodeOutput, timestamp: Date.now()
                });
            }
            throw new Error(`Fallo crítico en Modelo Fuerte Paso 2 (Checkpoint Guardado): ${err.message}`);
        }

        let parsedStep2;
        try {
            parsedStep2 = extractJSONFromText(rawOutputStep2);
        } catch (jsonErr) {
            agentMemory.push({ role: 'model', content: rawOutputStep2 });
            agentMemory.push({ role: 'user', content: `ERROR DE FORMATO EN AUDITORÍA: Proporciona un objeto JSON válido.` });
            continue;
        }

        agentMemory.push({ role: 'model', content: JSON.stringify(parsedStep2) });

        if (parsedStep2.plan_actual && Array.isArray(parsedStep2.plan_actual)) {
            globalTasksState = parsedStep2.plan_actual;
        }

        if (chatId) {
            await saveAgentCheckpoint(chatId, {
                chatId, agentMemory, currentStrongCalls, currentFastCalls,
                strongRemaining, fastRemaining, globalTasksState, accumulatedCodeOutput, timestamp: Date.now()
            });
        }

        if (parsedStep2.action === 'final_response') {
            finalResponseText = parsedStep2.content || "Proceso completado tras la fase de auditoría.";
            if (!finalResponseText.includes("```") && accumulatedCodeOutput) {
                finalResponseText += "\n\n### Código Fuente Autocontenido Generado y Auditado:\n\n" + accumulatedCodeOutput;
            }
            if (parsedStep2.thought) {
                finalResponseText = `<think>${parsedStep2.thought}</think>${finalResponseText}`;
            }
            if (counterBadge) {
                finalResponseText = `<div class="agent-summary-badge mb-3">${counterBadge.outerHTML}</div>` + finalResponseText;
            }
            if (chatId) await clearAgentCheckpoint(chatId);
            break;
        }
    }

    return finalResponseText;
}