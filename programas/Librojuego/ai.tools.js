// Archivo: Librojuego/ai.tools.js

window.AIGenerator = window.AIGenerator || {};

window.AIGenerator.copyTemplate = function() {
    const template = {
        "premise": "Un mundo de fantasía oscura donde la magia está prohibida...",
        "start": "El protagonista despierta en las mazmorras del castillo...",
        "idealEnd": "Derrotar al rey tirano y restaurar la magia en el reino.",
        "characters": "Héroe (Valiente), Rey Tirano (Villano), Mago Oculto (Guía).",
        "waypoints": "Escapar de la prisión, Encontrar la espada rúnica, Enfrentar a la guardia real.",
        "protagonist": "Guerrero renegado",
        "style": "Fantasía oscura e inmersiva",
        "nodes": 50
    };
    const templateStr = JSON.stringify(template, null, 4);
    navigator.clipboard.writeText(templateStr).then(() => {
        alert("Plantilla JSON copiada al portapapeles.");
    }).catch(err => {
        console.error("Error al copiar al portapapeles: ", err);
        alert("No se pudo copiar la plantilla al portapapeles.");
    });
};

window.AIGenerator.loadFromJSON = function() {
    const jsonStr = document.getElementById('ai-json-input').value;
    if (!jsonStr) {
        return alert("Por favor, pega un JSON en el área de texto antes de cargar.");
    }
    try {
        const data = JSON.parse(jsonStr);
        
        // Asignación segura: Verifica que el elemento exista antes de inyectar el valor
        if (data.premise && document.getElementById('ai-premise')) document.getElementById('ai-premise').value = data.premise;
        if (data.start && document.getElementById('ai-start')) document.getElementById('ai-start').value = data.start;
        if (data.idealEnd && document.getElementById('ai-ideal-end')) document.getElementById('ai-ideal-end').value = data.idealEnd;
        if (data.characters && document.getElementById('ai-characters')) document.getElementById('ai-characters').value = data.characters;
        if (data.waypoints && document.getElementById('ai-waypoints')) document.getElementById('ai-waypoints').value = data.waypoints;
        if (data.protagonist && document.getElementById('ai-protagonist')) document.getElementById('ai-protagonist').value = data.protagonist;
        if (data.style && document.getElementById('ai-style')) document.getElementById('ai-style').value = data.style;
        if (data.nodes && document.getElementById('ai-nodes')) document.getElementById('ai-nodes').value = data.nodes;
        
        document.getElementById('ai-json-input').value = ""; // Limpia el input tras cargar
        alert("Datos cargados correctamente en los campos.");
    } catch (error) {
        console.error("Error parseando el JSON pegado:", error);
        alert("El JSON no es válido. Revisa el formato y vuelve a intentarlo.\n" + error.message);
    }
};