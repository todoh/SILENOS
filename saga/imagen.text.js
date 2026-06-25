// --- UTILIDADES DE TEXTO (IA - Refactorizado) ---
DataStudio.prototype.refineText = async function(field) {
    const apiMode = localStorage.getItem('koreh_api_mode') || 'local';

    if (apiMode === 'online' && !window.Koreh.Core.getAuthKey()) {
        return ui.alert("Falta clave de autenticación.");
    }

    const original = document.getElementById(`inp-${field}`).value;
    ui.setLoading(true, "Refinando...");
    try {
        const refinedText = await window.Koreh.Text.generate(
            'Eres un editor experto. Mejora el texto manteniendo el tono narrativo. Devuelve única y estrictamente el texto mejorado sin comentarios.',
            original, {
                jsonMode: false
            }
        );

        document.getElementById(`inp-${field}`).value = refinedText;
        if (typeof app !== 'undefined' && app.scheduleSave) {
            app.scheduleSave();
        }
    } catch (e) {
        ui.alert("Error al refinar: " + e.message);
    } finally {
        ui.setLoading(false);
    }
};

/**
 * Traduce la descripción visual del editor actual al inglés de forma directa.
 */
DataStudio.prototype.translateVisualDescription = async function() {
    const field = 'inp-visual';
    const original = document.getElementById(field).value;
    if (!original) return;

    ui.setLoading(true, "Traduciendo a Inglés...");
    try {
        const translatedText = await window.Koreh.Text.generate(
            'You are a professional translator and art director. Translate the following visual description strictly into English for an image generator. Return ONLY the translated text.',
            original, {
                jsonMode: false
            }
        );

        document.getElementById(field).value = translatedText;
        Utils.log("Traducción visual completada.", "success");
        this.scheduleSave();
    } catch (e) {
        ui.alert("Error al traducir: " + e.message);
    } finally {
        ui.setLoading(false);
    }
};