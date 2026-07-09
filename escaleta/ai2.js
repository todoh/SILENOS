// --- cronologia/ai2.js: ANALISTA ESTRUCTURAL (Escalado Adaptativo) ---

const ai2 = {
    
    // --- CÁLCULO DE ESTRUCTURA (AUDITORÍA DE DENSIDAD) ---
  async calculateStructure() {
        // 1. Validaciones
        if (!ai.apiKey) return alert("Conecta la IA primero.");
        const prompt = document.getElementById('ai-prompt').value;
        if (!prompt) return alert("Necesito la Biblia/Premisa para evaluar la densidad narrativa.");

        // 2. UI Loading
        const btn = document.getElementById('btn-calc-struct');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-scale-balanced fa-spin"></i> AUDITANDO DENSIDAD MÁXIMA...';
        
        ai.toggleLoading(true, "EVALUANDO ALCANCE DE SUBPARTES", "Analizando fragmentación real de la cronología...");

        try {
            // --- PASO 1: EL AUDITOR DE DENSIDAD GRANULAR ---
            // Le indicamos explícitamente que rompa la contención y cuente subpartes individuales
            const auditPrompt = `Actúa como un EDITOR LITERARIO EXHAUSTIVO Y DETALLISTA.
            
            TEXTO DE ENTRADA:
            "${prompt.substring(0, 5000)}"
            
            TU TAREA:
            Realiza una "Auditoría de Densidad" de grano fino. Necesito encontrar cada subparte, hito dramático y cambio de acción interna.
            
            REGLAS DE ESCALADO OBLIGATORIAS:
            1. Si el usuario te indica que tiene múltiples eventos con subpartes (ej: 10 eventos x 3 subpartes), CADA SUBPARTE REPRESENTA UN CAPÍTULO/ESCENA INDEPENDIENTE. El conteo total debe reflejar la multiplicación matemática real (mínimo 30).
            2. PROHIBIDO colapsar o unificar hitos de acción diferentes bajo la excusa de compartir locación.
            3. Si detectas alta densidad semántica o micro-narrativas consecutivas, debes elevar drásticamente la recomendación de capítulos para preservar la fidelidad.
            
            Salida JSON ESTRICTA:
            {
                "detected_beats_count": number,
                "classification": "NOVEL",
                "recommended_chapters": number, (Calcula con precisión. Si hay 10 eventos con 3 subpartes cada uno, esto DEBE ser como mínimo 30).
                "reasoning": "Explicación breve de la multiplicación de subpartes.",
                "density_setting": "high"
            }`;

            const auditRes = await ai.callModel(auditPrompt, "Audita la historia considerando subpartes densas de forma obligatoria.", 0.2, 'gemini-fast');
            const audit = JSON.parse(ai.cleanJSON(auditRes));
            
            ai.log(`Clasificación de Densidad: ${audit.classification} (${audit.detected_beats_count} micro-beats)`, "brain");
            ai.log(`Dictamen Forense: ${audit.reasoning}`, "info");

            // --- PASO 2: APLICACIÓN DIRECTA DE ALTO VOLUMEN ---
            let finalCount = audit.recommended_chapters;
            
            // Si el análisis se quedó corto a pesar de las instrucciones, aplicamos un piso adaptativo matemático de seguridad
            if (finalCount < 30 && prompt.toLowerCase().includes('subparte') || finalCount < 30) {
                finalCount = 30; 
                ai.log("Ajuste de seguridad por el algoritmo Nexus: forzando un mínimo adaptativo de 30 escenas para cubrir subpartes.", "warn");
            }

            // Límite superior técnico por seguridad de hilos
            if (finalCount > 60) finalCount = 60; 

            // Aplicar directamente a la interfaz
            document.getElementById('ai-event-count').value = finalCount;
            document.getElementById('ai-density').value = "high";

            // Feedback Visual de éxito técnico
            const input = document.getElementById('ai-event-count');
            const prevClass = input.className;
            
            input.className = `config-input text-center font-mono border-2 text-purple-600 border-purple-500 bg-purple-50 font-bold shadow-lg transition-all duration-500`;
            setTimeout(() => input.className = prevClass, 2000);

            ai.log(`Estructura Expandida Definida: ${finalCount} Escenas/Capítulos listos en formato ramificado de alta densidad.`, "success");

        } catch (e) {
            console.error(e);
            ai.log("Error en auditoría adaptativa: " + e.message, "error");
            alert("Error al auditar la densidad estructural.");
        } finally {
            ai.toggleLoading(false);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};