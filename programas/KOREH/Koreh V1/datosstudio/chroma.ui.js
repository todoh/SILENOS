// --- LÓGICA DE INTERFAZ Y PROMPTING ---
const ChromaUI = {
    // Verifica si el toggle está activado en el DOM
    isEnabled: () => {
        const toggle = document.getElementById('chroma-toggle');
        // Si el elemento no existe, asumimos falso.
        if (!toggle) return false;
        return toggle.checked;
    },

    // Devuelve el prompt técnico
    getPromptSuffix: () => {
        return ", isolated on pure vivid green background, hex color #00FF00, studio lighting, no shadows on background, hard rim lighting, crisp edges";
    },

    // Debug helper
    status: () => {
        console.log("Estado Sin Fondo:", ChromaUI.isEnabled());
    }
};