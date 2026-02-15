// --- UTILIDADES DE TEXTO (IA - Refactorizado) ---

DataStudio.prototype.refineText = async function(field) {
    // Auth check delegado a la librería, pero validamos UI
    if(!window.Koreh.Core.getAuthKey()) return ui.alert("Falta API Key.");
    
    const original = document.getElementById(`inp-${field}`).value;
    ui.setLoading(true, "Refinando...");
   
    try {
       const refinedText = await window.Koreh.Text.generate(
           'Eres editor experto. Mejora el texto manteniendo el tono. Devuelve solo el texto mejorado.',
           original,
           { model: 'openai-large' }
       );
       
       document.getElementById(`inp-${field}`).value = refinedText;

    } catch(e) { 
        ui.alert("Error al refinar: " + e.message); 
    } finally { 
        ui.setLoading(false); 
    }
};