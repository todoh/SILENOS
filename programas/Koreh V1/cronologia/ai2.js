// --- ai2.js: ANALISTA ESTRUCTURAL (Escalado Adaptativo) ---

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
        btn.innerHTML = '<i class="fa-solid fa-scale-balanced fa-spin"></i> AUDITANDO DENSIDAD...';
        
        ai.toggleLoading(true, "EVALUANDO ALCANCE", "Contando beats narrativos reales...");

        try {
            // --- PASO 1: EL AUDITOR DE DENSIDAD ---
            // Objetivo: Determinar si es una Anécdota (1 cap) o una Saga (20 caps).
            
            const auditPrompt = `Actúa como un EDITOR LITERARIO "TACAÑO" Y CRÍTICO.
            
            TEXTO DE ENTRADA:
            "${prompt.substring(0, 4000)}"
            
            TU TAREA:
            Realiza una "Auditoría de Densidad". No quiero que inventes nada. Quiero que midas lo que HAY.
            
            PASOS DE ANÁLISIS:
            1. CUENTA LOS "BEATS" REALES: Un beat es una acción que cambia el estado de la trama. (Ej: "Llega", "Pide vino", "Ve al enemigo" = 3 Beats).
            2. DETERMINA LA ESCALA:
               - < 5 Beats = MICRO-HISTORIA (Requiere 1 Capítulo denso).
               - 5-15 Beats = RELATO CORTO (Requiere 3-5 Capítulos).
               - > 20 Beats + Cambios de lugar/tiempo = NOVELA (Requiere 10+ Capítulos).
            
            REGLAS DE ORO (ANTI-RELLENO):
            - Si todo ocurre en un solo lugar (ej: "Una Venta"), LA ESTRUCTURA DEBE SER MONOLÍTICA (1 o 2 capítulos máx).
            - PROHIBIDO sugerir capítulos de "Viaje" si el texto no describe el viaje explícitamente.
            - PROHIBIDO separar "Mirar" y "Actuar" en capítulos distintos.
            
            Salida JSON ESTRICTA:
            {
                "detected_beats_count": number,
                "classification": "MICRO" | "SHORT" | "NOVEL",
                "recommended_chapters": number, (Sé honesto. Si es 1, pon 1).
                "reasoning": "Explicación breve (ej: 'Es una escena estática en una taberna, no justifica más de 1 capítulo').",
                "density_setting": "high" (Para Micro) | "medium" | "low"
            }`;

            // Usamos 'openai-large' para máxima capacidad lógica
            const auditRes = await ai.callModel(auditPrompt, "Audita la historia y dame el número REAL de capítulos necesarios.", 0.2, 'openai-large');
            const audit = JSON.parse(ai.cleanJSON(auditRes));
            
            ai.log(`Clasificación: ${audit.classification} (${audit.detected_beats_count} beats)`, "brain");
            ai.log(`Dictamen: ${audit.reasoning}`, "info");

            // --- PASO 2: APLICACIÓN DIRECTA (SIN SUELO ARTIFICIAL) ---
            
            let finalCount = audit.recommended_chapters;
            
            // Límite superior por seguridad técnica, pero SIN límite inferior (permitimos 1)
            if (finalCount > 50) finalCount = 50; 
            if (finalCount < 1) finalCount = 1;

            // Aplicar a la UI
            document.getElementById('ai-event-count').value = finalCount;
            
            // Ajustar densidad automáticamente según el tipo
            // Si es MICRO (1 cap), queremos densidad ALTA (muchos detalles en ese cap)
            if (audit.classification === "MICRO") {
                document.getElementById('ai-density').value = "high";
            } else if (audit.density_setting) {
                // Mapeo seguro
                const map = { "low": "low", "medium": "medium", "high": "high" };
                document.getElementById('ai-density').value = map[audit.density_setting] || "medium";
            }

            // Feedback Visual
            const input = document.getElementById('ai-event-count');
            const prevClass = input.className;
            const colorClass = finalCount === 1 ? 'text-purple-600 border-purple-500 bg-purple-50' : 'text-green-700 border-green-500 bg-green-50';
            
            input.className = `config-input text-center font-mono border-2 ${colorClass} font-bold shadow-lg transition-all duration-500`;
            setTimeout(() => input.className = prevClass, 2000);

            ai.log(`Estructura Definida: ${finalCount} ${finalCount===1 ? 'Capítulo Único (Formato Denso)' : 'Capítulos'}.`, "success");

        } catch (e) {
            console.error(e);
            ai.log("Error auditoría: " + e.message, "error");
            alert("Error al auditar densidad.");
        } finally {
            ai.toggleLoading(false);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};