/**
 * API KEY MANAGER - OFFLINE / LOCAL ONLY
 * Este módulo ha sido lobotomizado para eliminar conexiones externas.
 * ÚNICA FUENTE DE VERDAD: El almacenamiento local del navegador (Modal de Configuración).
 */

console.log("Módulo API Key Cargado (MODO LOCAL ESTRICTO)");

const STORAGE_KEY = 'silenos_google_apikey';
const MODEL_KEY = 'silenos_ai_model'; 

// --- GESTIÓN DE API KEYS (SOLO LOCAL) ---

export function hasUserCustomKeys() {
    const local = localStorage.getItem(STORAGE_KEY);
    return local && local.trim().length > 0;
}

export function getUserKeyCount() {
    const local = localStorage.getItem(STORAGE_KEY);
    if (!local) return 0;
    // Separa por comas, punto y coma o saltos de línea
    return local.split(/[,;\n]+/).filter(k => k.trim().length > 0).length;
}

export function saveUserKeys(keystring) {
    if (!keystring || keystring.trim() === '') {
        localStorage.removeItem(STORAGE_KEY);
        return 0;
    } else {
        // Limpieza básica
        let clean = keystring.replace(/["']/g, ''); 
        localStorage.setItem(STORAGE_KEY, clean.trim());
        return getUserKeyCount();
    }
}

export function getUserKeysRaw() {
    return localStorage.getItem(STORAGE_KEY) || '';
}

// --- GESTIÓN DE MODELO ---

export function saveUserAIModel(modelId) {
    if (!modelId || modelId.trim() === '') {
        localStorage.removeItem(MODEL_KEY);
    } else {
        localStorage.setItem(MODEL_KEY, modelId.trim());
    }
}

export function getUserAIModel() {
    return localStorage.getItem(MODEL_KEY) || 'gemma-3-27b-it'; 
}

// --- FUNCIÓN CORE PARA KOREH ---

export async function getApiKeysList() {
    // Única fuente: LocalStorage
    const rawLocal = localStorage.getItem(STORAGE_KEY);
    if (rawLocal && rawLocal.trim().length > 0) {
        return rawLocal.split(/[,;\n]+/).map(k => k.trim()).filter(k => k.length > 0);
    }
    return [];
}

// --- EXPOSICIÓN GLOBAL (BRIDGE PARA UI.JS) ---
// Necesario para que el modal de configuración (que no es módulo) pueda guardar datos
window.NexusKeys = {
    saveUserKeys,
    getUserKeyCount,
    getUserKeysRaw,
    saveUserAIModel,
    getUserAIModel,
    hasUserCustomKeys
};