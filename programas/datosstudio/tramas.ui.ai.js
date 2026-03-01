// --- datosstudio/tramas.ui.ai.js ---
// LÓGICA DE INTELIGENCIA ARTIFICIAL (IA TRAMAS) Y AGENTE DE ENRIQUECIMIENTO

window.TramasUI = window.TramasUI || {
    selectedNodeId: null,
    expandTargetId: null
};

Object.assign(window.TramasUI, {
    toggleTramasGenerator() {
        document.getElementById('tramas-generator-sidebar').classList.toggle('open');
    },

    openExpandModal(nodeId) {
        if (!app.targetHandle) return ui.alert("Abre una carpeta primero.");
        this.expandTargetId = nodeId;
        const node = app.tramas.find(n => n.id === nodeId);
        document.getElementById('expand-node-title').innerText = node ? node.name : "Desconocido";
        document.getElementById('expand-direction').value = '';
        document.getElementById('tramas-expand-modal').classList.remove('hidden');
    },

    closeExpandModal() {
        document.getElementById('tramas-expand-modal').classList.add('hidden');
        this.expandTargetId = null;
    },

    async confirmExpandNode() {
        if (!window.Koreh.Core.getAuthKey()) return ui.alert("Falta API Key.");
        const direction = document.getElementById('expand-direction').value;
        const count = parseInt(document.getElementById('expand-count').value) || 1;
        
        if (!direction) return ui.alert("Escribe una dirección narrativa.");
        
        const targetNode = app.tramas.find(n => n.id === this.expandTargetId);
        if (!targetNode) return;

        ui.setLoading(true, "Expandiendo rama con IA...");
        this.closeExpandModal();

        const worldContext = await Coherence.getContextString();

        const prompt = `
            Eres un guionista experto trabajando en este universo narrativo:
            CONTEXTO DEL MUNDO:
            ${worldContext}

            El usuario quiere continuar la historia a partir de este evento específico:
            EVENTO ACTUAL: "${targetNode.name}"
            DESCRIPCIÓN DEL EVENTO: "${targetNode.desc}"

            Crea una continuación lineal de ${count} eventos nuevos hacia esta dirección: "${direction}".
            Usa los personajes y lugares del contexto si encajan.
            
            ESTRUCTURA OBLIGATORIA (Devuelve SOLO un objeto JSON con la clave "eventos" que contenga un Array):
            {
                "eventos": [
                    {
                        "name": "Título descriptivo corto",
                        "type": "Desarrollo|Inflexión|Obstáculo|Clímax|Resolución|Gancho|Medio|Crisis",
                        "desc": "Descripción narrativa del evento.",
                        "tension": número del 1 al 5 indicando el nivel de tensión narrativa,
                        "notes": "Notas meta para el autor sobre por qué funciona este paso."
                    }
                ]
            }
        `;

        try {
            const result = await window.Koreh.Text.generate(
                'Eres un asistente de guion. Devuelve estrictamente JSON sin formato markdown.', 
                prompt, 
                { model: 'openai-large', jsonMode: true }
            );

            this.appendGeneratedNodes(result, this.expandTargetId);
        } catch (e) {
            console.error(e);
            ui.alert("Error de IA al expandir: " + e.message);
        } finally {
            ui.setLoading(false);
        }
    },

    async generatePlotFromScratch() {
        if (!app.targetHandle) return ui.alert("Selecciona una carpeta.");
        if (!window.Koreh.Core.getAuthKey()) return ui.alert("Falta API Key.");

        const premise = document.getElementById('tramas-gen-premise').value;
        const tone = document.getElementById('tramas-gen-tone').value || "Equilibrado";
        const count = parseInt(document.getElementById('tramas-gen-count').value) || 5;

        if (!premise) return ui.alert("Escribe una premisa inicial.");

        ui.setLoading(true, "Construyendo trama desde cero...");
        const btn = document.getElementById('btn-tramas-gen-scratch');
        btn.disabled = true;

        const worldContext = await Coherence.getContextString();

        const prompt = `
            Eres un arquitecto narrativo experto. Diseña una trama completa secuencial de ${count} eventos basada en esta premisa: "${premise}".
            El tono general de la historia debe ser: "${tone}".

            Tienes a tu disposición este CONTEXTO DEL MUNDO (Personajes, Lugares, Objetos, etc.):
            ${worldContext}

            Integra elementos del contexto en la trama de forma orgánica.
            Asegúrate de tener un ritmo clásico: Gancho inicial, Desarrollo, Punto Medio, Clímax y Resolución.
            
            ESTRUCTURA OBLIGATORIA (Devuelve SOLO un objeto JSON con la clave "eventos" que contenga un Array):
            {
                "eventos": [
                    {
                        "name": "Título del evento",
                        "type": "Gancho|Contexto|Incidente|Inflexión|Desarrollo|Obstáculo|Medio|Crisis|Clímax|Resolución|Epílogo",
                        "desc": "Descripción detallada de lo que ocurre aquí.",
                        "tension": número del 1 al 5 indicando la tensión dramática,
                        "notes": "Notas meta o consejos para el autor."
                    }
                ]
            }
        `;

        try {
            const result = await window.Koreh.Text.generate(
                'Eres un asistente de guion. Devuelve estrictamente JSON.', 
                prompt, 
                { model: 'openai-large', jsonMode: true }
            );

            this.appendGeneratedNodes(result, null); 
            this.toggleTramasGenerator(); 
        } catch (e) {
            console.error(e);
            ui.alert("Error generando trama: " + e.message);
        } finally {
            ui.setLoading(false);
            btn.disabled = false;
        }
    },

    async expandExistingPlot() {
        if (!app.targetHandle) return ui.alert("Selecciona una carpeta.");
        if (!window.Koreh.Core.getAuthKey()) return ui.alert("Falta API Key.");

        const direction = document.getElementById('tramas-expand-premise').value;
        const count = parseInt(document.getElementById('tramas-expand-count').value) || 3;

        if (!direction) return ui.alert("Escribe la dirección narrativa.");

        const nodesContext = app.tramas.filter(n => n.type !== 'Region').map(n => `- ${n.name} (${n.type}): ${n.desc}`).join('\n');
        
        const worldContext = await Coherence.getContextString();

        ui.setLoading(true, "Ampliando lore global...");
        const btn = document.getElementById('btn-tramas-expand-existing');
        btn.disabled = true;

        const prompt = `
            Eres un arquitecto narrativo. 
            
            CONTEXTO GLOBAL DEL MUNDO (Lore):
            ${worldContext}

            TRAMA EXISTENTE HASTA AHORA:
            ${nodesContext || "(Aún no hay trama, eres el primero en añadir eventos al lore)"}

            Genera ${count} eventos NUEVOS que añadan lore, expandan el mundo o continúen la historia basándose en esta directriz: "${direction}".
            Estos eventos se conectarán linealmente entre ellos, pero quedarán libres del resto de la trama para que el usuario los ubique.

            ESTRUCTURA OBLIGATORIA (Devuelve SOLO un objeto JSON con la clave "eventos" que contenga un Array):
            {
                "eventos": [
                    {
                        "name": "Título del evento",
                        "type": "Contexto|Inflexión|Desarrollo|Obstáculo",
                        "desc": "Descripción detallada de la expansión del lore.",
                        "tension": número del 1 al 5,
                        "notes": "Notas adicionales."
                    }
                ]
            }
        `;

        try {
            const result = await window.Koreh.Text.generate(
                'Eres un asistente de guion. Devuelve estrictamente JSON.', 
                prompt, 
                { model: 'openai-large', jsonMode: true }
            );

            this.appendGeneratedNodes(result, null);
            this.toggleTramasGenerator();
        } catch (e) {
            console.error(e);
            ui.alert("Error expandiendo lore: " + e.message);
        } finally {
            ui.setLoading(false);
            btn.disabled = false;
        }
    },

    appendGeneratedNodes(nodeArray, attachToNodeId = null) {
        if (nodeArray && typeof nodeArray === 'object' && !Array.isArray(nodeArray)) {
            if (nodeArray.eventos) {
                nodeArray = nodeArray.eventos;
            } else if (nodeArray.events) {
                nodeArray = nodeArray.events;
            } else {
                const keys = Object.keys(nodeArray);
                for (let k of keys) {
                    if (Array.isArray(nodeArray[k])) {
                        nodeArray = nodeArray[k];
                        break;
                    }
                }
            }
        }

        if (!Array.isArray(nodeArray) || nodeArray.length === 0) {
            console.warn("La IA no devolvió un array válido", nodeArray);
            return ui.alert("La IA no devolvió un formato correcto.");
        }

        let lastId = attachToNodeId;
        const newNodeIds = []; // Recolectamos IDs para el agente
        
        nodeArray.forEach(item => {
            const newNode = {
                id: `omega-${Date.now().toString(36)}-${Math.random().toString(36).substr(2,5)}`,
                name: item.name || "Evento IA",
                type: item.type || "Desarrollo",
                desc: item.desc || "",
                tension: item.tension || 2,
                notes: item.notes || "",
                status: "Borrador",
                timestamp: "", duration: "", pov: null, dataRefs: [], connections: [],
                x: 0, y: 0 
            };

            app.tramas.push(newNode);
            newNodeIds.push(newNode.id);

            if (lastId) {
                const prevNode = app.tramas.find(n => n.id === lastId);
                if (prevNode) {
                    if (!prevNode.connections) prevNode.connections = [];
                    prevNode.connections.push(newNode.id);
                }
            }
            lastId = newNode.id;
        });

        app.saveTramas();
        this.autoLayout();
        
        // Disparamos la tubería de enriquecimiento automático en lote (gemini-fast)
        this.enrichMultipleNodes(newNodeIds);
    },

    // --- NUEVO SISTEMA DE AGENTES: TUBERÍA DE ENRIQUECIMIENTO ---
    
    async enrichMultipleNodes(nodeIds) {
        if (!window.Koreh.Core.getAuthKey()) return;
        
        // Ejecución secuencial para procesar de uno en uno con toda la información
        for (let i = 0; i < nodeIds.length; i++) {
            ui.setLoading(true, `IA Enriqueciendo evento ${i+1}/${nodeIds.length} (gemini-fast)...`);
            await this.enrichEventAgent(nodeIds[i], true);
        }
        
        ui.setLoading(false);
        ui.alert(`¡IA ha generado y enriquecido exhaustivamente ${nodeIds.length} eventos!`);
        window.TramasCanvas.render();
    },

    async enrichEventAgent(nodeId, isSilent = false) {
        const node = app.tramas.find(n => n.id === nodeId);
        if (!node) return;

        if (!isSilent) ui.setLoading(true, `Enriqueciendo evento: ${node.name}...`);
        
        // Creamos una lista estricta de IDs para que la IA sepa qué puede mapear
        const itemsContext = app.items.map(i => `- ID_ARCHIVO: "${i.name}" | NOMBRE: "${i.data.name || 'Sin Nombre'}" | TIPO: "${i.data.type || 'General'}"`).join('\n');
        const worldContext = await Coherence.getContextString();

        const prompt = `
            Eres un analista de continuidad narrativa. Analiza este evento narrativo y enriquécelo con metadatos exhaustivos.
            
            EVENTO: "${node.name}"
            TIPO: "${node.type}"
            DESCRIPCIÓN ACTUAL: "${node.desc}"

            CONTEXTO DEL MUNDO (Lore global):
            ${worldContext}

            BASE DE DATOS DE ELEMENTOS EXISTENTES (Usa SOLO los ID_ARCHIVO exactos de esta lista):
            ${itemsContext || "(No hay datos en la carpeta)"}

            TAREA:
            1. timestamp: Ubicación temporal lógica dentro del lore (Ej: "Año 24, Mes 3", "Día 1, Mañana", "Desconocido").
            2. duration: Duración estimada del evento (Ej: "2 horas", "Varios meses", "Instantáneo").
            3. dataRefs: Array exhaustivo con TODOS los "ID_ARCHIVO" de los elementos de la base de datos que participan, se mencionan o están implicados en este evento. Solo usa los ID_ARCHIVO de la lista.
            4. expandedDesc: Toma la descripción actual y mejórala añadiendo máximo detalle y contexto.

            Devuelve SOLO un objeto JSON con esta estructura exacta:
            {
                "timestamp": "texto",
                "duration": "texto",
                "dataRefs": ["id_archivo_1", "id_archivo_2"],
                "expandedDesc": "texto"
            }
        `;

        try {
            // Se utiliza gemini-fast según tu instrucción para hacerlo rápido y varias veces
            const result = await window.Koreh.Text.generate(
                'Eres un asistente de datos narrativos. Devuelve estrictamente JSON puro.', 
                prompt, 
                { model: 'gemini-fast', jsonMode: true }
            );

            if (result.timestamp) node.timestamp = result.timestamp;
            if (result.duration) node.duration = result.duration;
            if (result.expandedDesc) node.desc = result.expandedDesc;
            
            // Filtrar IDs para evitar referencias fantasma inventadas por la IA
            if (result.dataRefs && Array.isArray(result.dataRefs)) {
                const validIds = app.items.map(i => i.name);
                const safeRefs = result.dataRefs.filter(id => validIds.includes(id));
                node.dataRefs = [...new Set([...(node.dataRefs || []), ...safeRefs])]; // Mezclar sin duplicados
            }

            app.saveTramas();
            
            if (window.TramasUI.selectedNodeId === nodeId) {
                window.TramasUI.openInspector(nodeId);
            }
            if (!isSilent) window.TramasCanvas.render();

        } catch (e) {
            console.error("Error en Agente de Enriquecimiento para nodo " + nodeId, e);
            if (!isSilent) ui.alert("Fallo al enriquecer evento: " + e.message);
        } finally {
            if (!isSilent) ui.setLoading(false);
        }
    }
});