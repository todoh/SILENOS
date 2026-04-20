// live gemini/narrative_studio_tools.js
// ─── NARRATIVE STUDIO TOOLS (CONEXIÓN IA) ────────────────────────────────

async function handleNarrativeStudioTool(args) {
    const { action, field, data_json, value } = args;

    try {
        if (action === 'open') {
            if (typeof narrativeStudioUI !== 'undefined') {
                narrativeStudioUI.open();
                return "Interfaz de Narrative Studio abierta al usuario.";
            }
            return "Error: Narrative Studio no encontrado en el sistema.";
        } 
        else if (action === 'close') {
            if (typeof narrativeStudioUI !== 'undefined') {
                narrativeStudioUI.close();
                return "Interfaz de Narrative Studio cerrada.";
            }
            return "Error: Narrative Studio no encontrado.";
        }
        else if (action === 'create_template') {
            if (typeof narrativeStudioUI !== 'undefined') {
                if (data_json) {
                    try {
                        const parsed = JSON.parse(data_json);
                        narrativeStudioUI.currentData = { ...narrativeStudioUI.currentData, ...parsed };
                        narrativeStudioUI.currentFileHandle = null; // Reiniciar para no pisar el archivo anterior
                    } catch(e) {
                        return "Aviso: data_json no contenía un formato válido, se inicializará una plantilla vacía.";
                    }
                }
                narrativeStudioUI.open();
                narrativeStudioUI.updateUI();
                return "Nueva plantilla preparada e inyectada en el Narrative Studio. Interfaz mostrada al usuario.";
            }
            return "Error: Narrative Studio no encontrado.";
        }
        else if (action === 'generate_field') {
            if (!field) return "Error: Se requiere el parámetro 'field' para saber qué generar.";
            if (typeof narrativeStudioUI !== 'undefined') {
                const modal = document.getElementById('narrativeStudioModal');
                if (modal && modal.classList.contains('hidden')) narrativeStudioUI.open();
                
                await narrativeStudioUI.generateField(field);
                return `El campo '${field}' ha sido generado vía IA (nova-fast) e inyectado visualmente en la interfaz del usuario.`;
            }
            return "Error: Narrative Studio no encontrado.";
        }
        else if (action === 'save_template') {
            if (typeof narrativeStudioUI !== 'undefined') {
                await narrativeStudioUI.saveTemplate();
                const safeName = (narrativeStudioUI.currentData.name || "SinNombre").replace(/[^a-zA-Z0-9_-]/g, '_');
                return `Plantilla guardada exitosamente en el disco local como 'Plantilla_${safeName}.json'.`;
            }
            return "Error: Narrative Studio no encontrado.";
        }
        else if (action === 'load_template') {
            if (typeof narrativeStudioUI !== 'undefined') {
                narrativeStudioUI.loadTemplate();
                return "Se ha abierto el selector de archivos para que el usuario cargue su plantilla JSON local.";
            }
            return "Error: Narrative Studio no encontrado.";
        }
        else if (action === 'analyze_template') {
            if (typeof narrativeStudioUI !== 'undefined') {
                narrativeStudioUI.analyzeNarrative();
                return "Se ha iniciado un análisis narrativo profundo de la plantilla actual. Cuando acabe, se guardará en disco y se le mostrará al usuario automáticamente.";
            }
            return "Error: Narrative Studio no encontrado.";
        }
        else if (action === 'read_template') {
            if (typeof narrativeStudioUI !== 'undefined') {
                narrativeStudioUI.readUI(); // Fuerzo sincronización
                return `CONTENIDO ACTUAL DE LA PLANTILLA EN EL EDITOR:\n${JSON.stringify(narrativeStudioUI.currentData, null, 2)}`;
            }
            return "Error: Narrative Studio no encontrado.";
        }
        else if (action === 'update_field') {
            if (!field || value === undefined) return "Error: Faltan parámetros 'field' o 'value'.";
            if (typeof narrativeStudioUI !== 'undefined') {
                narrativeStudioUI.currentData[field] = field === 'nodes' ? parseInt(value) || 50 : value;
                narrativeStudioUI.updateUI();
                narrativeStudioUI.autoSave();
                return `El campo '${field}' de la plantilla ha sido actualizado y sincronizado en vivo en la pantalla del usuario.`;
            }
            return "Error: Narrative Studio no encontrado.";
        }
        
        return `Acción '${action}' no reconocida en Narrative Studio.`;
    } catch (e) {
        return `Fallo crítico en Narrative Studio: ${e.message}`;
    }
}