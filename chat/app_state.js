// app_state.js
// Estado global, variables de control de la aplicación y getters/setters unificados
import { UNIFIED_FUNCTION_LIBRARY } from './fn_library_index.js';
import { functionLibrary } from './conversations.js';

export const state = {
    appMode: 'chat',
    withFunctionsMode: false,
    listadoModelosTexto: [],
    activeModelIndex: 0,
    activeImageModelIndex: 0
};

export function setAppMode(mode) {
    state.appMode = mode;
}

export function setWithFunctionsMode(val) {
    state.withFunctionsMode = val;
}

export function setListadoModelosTexto(list) {
    state.listadoModelosTexto = list;
}

export function setActiveModelIndex(idx) {
    state.activeModelIndex = idx;
}

export function setActiveImageModelIndex(idx) {
    state.activeImageModelIndex = idx;
}

export function getCombinedFunctionLibrary() {
    const combined = [...UNIFIED_FUNCTION_LIBRARY];
    functionLibrary.forEach(customFn => {
        if (!combined.some(f => f.name === customFn.name)) {
            combined.push(customFn);
        }
    });
    return combined;
}