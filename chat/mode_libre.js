// mode_libre.js
// Modo Libre: Funciona como el orquestador general clásico

import { runAgentPipeline } from './agente.js';

export async function runModoLibre(messages, fuerteModel, rapidoModel, configKeys, agentLimits, waitingNodeId, attachments, chatId) {
    return await runAgentPipeline(messages, fuerteModel, rapidoModel, configKeys, agentLimits, waitingNodeId, attachments, chatId);
}