// --- GESTIÓN DE API KEY (GOOGLE GEMINI - MODO METRALLETA) ---

console.log("Módulo API Key Cargado (Soporte Multi-Key)");

const apiKeyInput = document.getElementById('google-api-key');
const STORAGE_KEY = 'silenos_google_apikey';

// Al cargar, recuperar si existe
document.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey && apiKeyInput) {
        apiKeyInput.value = savedKey;
    }
});

function saveGoogleApiKey() {
    if (!apiKeyInput) return;
    // Limpiamos espacios alrededor de las comas para evitar errores
    let keyStr = apiKeyInput.value.trim();
    
    if (keyStr.length > 0) {
        localStorage.setItem(STORAGE_KEY, keyStr);
        // Feedback visual de cuántas keys hay cargadas
        const count = keyStr.split(',').filter(k => k.trim()).length;
        alert(`Modo Metralleta Configurado: ${count} Key(s) guardada(s) en la recámara.`);
    } else {
        if(confirm("¿Quieres borrar la configuración de API Keys?")) {
            localStorage.removeItem(STORAGE_KEY);
            apiKeyInput.value = '';
        }
    }
}

// Devuelve la cadena cruda (para inputs)
function getGoogleApiKey() {
    return localStorage.getItem(STORAGE_KEY);
}

// NUEVO: Devuelve un ARRAY de keys limpias para la rotación
function getApiKeysList() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // Separa por coma, quita espacios y filtra entradas vacías
    return raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

// Exponer a window para el HTML
window.saveGoogleApiKey = saveGoogleApiKey;
// Exportar para uso en módulos
export { getGoogleApiKey, getApiKeysList };