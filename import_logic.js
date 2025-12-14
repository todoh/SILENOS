// SILENOS/import_logic.js
// --- IMPORT LOGIC: DETECCIÓN INTELIGENTE Y CARGA v1.0 ---
// Detecta automáticamente si el JSON es un Juego, Libro, Guion o Dataset
// y lo añade como una NUEVA entrada sin sobrescribir.

import { STORAGE_KEYS } from './project_core.js';

console.log("Módulo Import Logic Cargado (Auto-Detect)");

// --- SETUP INICIAL ---
let hiddenImportInput = null;

export function initImportSystem() {
    // Crear input invisible para subida de archivos si no existe
    if (!document.getElementById('hidden-import-json')) {
        hiddenImportInput = document.createElement('input');
        hiddenImportInput.type = 'file';
        hiddenImportInput.id = 'hidden-import-json';
        hiddenImportInput.accept = '.json';
        hiddenImportInput.style.display = 'none';
        hiddenImportInput.addEventListener('change', handleFileSelect);
        document.body.appendChild(hiddenImportInput);
    } else {
        hiddenImportInput = document.getElementById('hidden-import-json');
    }

    // Exponer funciones globales para que el HTML inyectado en auth_ui pueda llamarlas
    window.triggerJSONFileImport = triggerJSONFileImport;
    window.handleJSONPaste = handleJSONPaste;
}

// --- DISPARADORES ---

function triggerJSONFileImport() {
    if (hiddenImportInput) hiddenImportInput.click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            processImport(json, file.name);
        } catch (err) {
            alert("Error: El archivo no es un JSON válido.");
            console.error(err);
        }
        hiddenImportInput.value = ''; // Reset para permitir subir el mismo archivo de nuevo
    };
    reader.readAsText(file);
}

function handleJSONPaste(textarea) {
    const text = textarea.value.trim();
    if (!text) return;

    // Intentamos parsear. Si falla, no hacemos nada (el usuario puede estar escribiendo aún)
    // Si tiene éxito, procesamos y limpiamos.
    try {
        if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
            const json = JSON.parse(text);
            const success = processImport(json, "Texto Pegado");
            
            if (success) {
                // Feedback visual en el textarea
                const originalPlaceholder = textarea.placeholder;
                textarea.value = "";
                textarea.placeholder = "¡Importado correctamente! ✅";
                textarea.style.borderColor = "#00b894";
                
                setTimeout(() => {
                    textarea.placeholder = originalPlaceholder;
                    textarea.style.borderColor = "";
                }, 2000);
            }
        }
    } catch (e) {
        // Silencioso: Esperamos a que el JSON sea válido
    }
}

// --- NÚCLEO: DETECCIÓN DE TIPO Y GUARDADO --- 
function processImport(data, sourceName) {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    let typeDetected = null;
    let title = "Importado";

    // 1. DETECTAR JUEGO (Tiene 'nodes')
    if (data.nodes && Array.isArray(data.nodes)) {
        typeDetected = 'game';
        title = data.title || "Juego Importado";
        
        const newGame = {
            ...data,
            id: newId,
            title: title + " (Imp.)",
            isPlaceholder: false // Aseguramos que se trate como local
        };

        const games = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAMES)) || [];
        games.unshift(newGame);
        localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
        
        if (window.renderGameList) window.renderGameList();
    }
    
    // 2. DETECTAR GUION (Tiene 'scenes')
    else if (data.scenes && Array.isArray(data.scenes)) {
        typeDetected = 'script';
        title = data.title || "Guion Importado";

        const newScript = {
            ...data,
            id: newId,
            title: title + " (Imp.)",
            isPlaceholder: false
        };

        const scripts = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCRIPTS)) || [];
        scripts.unshift(newScript);
        localStorage.setItem(STORAGE_KEYS.SCRIPTS, JSON.stringify(scripts));

        if (window.renderScriptList) window.renderScriptList();
    }

    // 3. DETECTAR LIBRO (Tiene 'chapters')
    else if (data.chapters && Array.isArray(data.chapters)) {
        typeDetected = 'book';
        title = data.title || "Libro Importado";

        const newBook = {
            ...data,
            id: newId,
            title: title + " (Imp.)",
            isPlaceholder: false
        };

        const books = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS)) || [];
        books.unshift(newBook);
        localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));

        if (window.renderBookList) window.renderBookList();
    }

    // 4. DETECTAR DATASET (Array directo de cartas o objeto con items)
    else if (Array.isArray(data) || (data.items && Array.isArray(data.items))) {
        typeDetected = 'data';
        title = data.universeName || data.name || "Datos Importados";
        
        // Normalizar items (si viene como array directo o envuelto)
        const items = Array.isArray(data) ? data : data.items;

        // Crear nueva entrada en la librería de datasets
        const library = JSON.parse(localStorage.getItem('silenos_datasets_library_v2')) || [];
        
        const newDataset = {
            id: 'ds_' + newId,
            name: title + " (Imp.)",
            data: items,
            timestamp: Date.now(),
            isPlaceholder: false
        };

        library.unshift(newDataset);
        localStorage.setItem('silenos_datasets_library_v2', JSON.stringify(library));

        if (window.refreshDatasetLibrary) window.refreshDatasetLibrary();
        // Si estamos en la vista de datos, actualizamos el selector visualmente
        if (window.renderDatasetSelector) window.renderDatasetSelector();
    }

    if (typeDetected) {
        console.log(`✅ Importado exitosamente: ${typeDetected} - ${title}`);
        
        // Feedback visual sutil en el avatar
        const badge = document.querySelector('.user-avatar');
        if(badge) {
            const originalFilter = badge.style.filter;
            badge.style.filter = "brightness(1.5) sepia(1) hue-rotate(90deg)"; // Flash verde
            setTimeout(() => badge.style.filter = originalFilter, 500);
        }
        return true;
    } else {
        // Fallback: No reconocemos la estructura
        alert("Formato desconocido. Asegúrate de que es un JSON válido de Silenos (Guion, Libro, Juego o Datos/Items).");
        return false;
    }
}

// Iniciar al cargar el módulo
document.addEventListener('DOMContentLoaded', initImportSystem);