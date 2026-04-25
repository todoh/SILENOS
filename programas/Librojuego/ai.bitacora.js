// Archivo: Librojuego/ai.bitacora.js

window.AIBitacora = {
    isUpdating: false,
    
    async getBitacoraHandle() {
        if (!Core.targetHandle) return null;
        try {
            return await Core.targetHandle.getFileHandle('bitacora.json', { create: true });
        } catch (e) {
            console.error("No se pudo acceder a bitacora.json", e);
            return null;
        }
    },

    async loadBitacora() {
        const handle = await this.getBitacoraHandle();
        if (!handle) return this.getDefaultBitacora();
        try {
            const file = await handle.getFile();
            const text = await file.text();
            if (!text.trim()) return this.getDefaultBitacora();
            return JSON.parse(text);
        } catch (e) {
            return this.getDefaultBitacora();
        }
    },

    async saveBitacora(data) {
        const handle = await this.getBitacoraHandle();
        if (!handle) return;
        data.ultima_actualizacion = new Date().toISOString();
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 4));
        await writable.close();
    },

    getDefaultBitacora() {
        return {
            resumen_general: "La historia acaba de comenzar o aún no hay datos suficientes.",
            puntos_singulares: [],
            nodos: {},
            ultima_actualizacion: ""
        };
    },

    async openModal() {
        if (!Core.targetHandle) return alert("Selecciona la carpeta raíz de tu proyecto primero.");
        UI.setLoading(true, "Abriendo Bitácora...");
        try {
            const data = await this.loadBitacora();
            
            document.getElementById('bitacora-resumen').value = data.resumen_general || "";
            document.getElementById('bitacora-puntos').value = (data.puntos_singulares || []).join('\n');
            
            const nodosList = document.getElementById('bitacora-nodos-list');
            nodosList.innerHTML = '';
            if (data.nodos && Object.keys(data.nodos).length > 0) {
                for (const [id, res] of Object.entries(data.nodos)) {
                    nodosList.innerHTML += `<div class="bg-gray-50 p-2 rounded-xl border border-gray-200 text-[10px] mb-2 leading-relaxed shadow-sm"><span class="font-bold text-indigo-600 block mb-1 uppercase tracking-wider"><i class="fa-solid fa-microchip"></i> ${id}:</span> ${res}</div>`;
                }
            } else {
                nodosList.innerHTML = `<div class="text-gray-400 text-[10px] text-center italic mt-4">Aún no hay nodos registrados en la bitácora.</div>`;
            }

            const modal = document.getElementById('bitacora-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        } catch (e) {
            alert("Error al cargar la Bitácora: " + e.message);
        } finally {
            UI.setLoading(false);
        }
    },

    closeModal() {
        const modal = document.getElementById('bitacora-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    },

    async saveManual() {
        UI.setLoading(true, "Guardando Bitácora...");
        try {
            const data = await this.loadBitacora();
            data.resumen_general = document.getElementById('bitacora-resumen').value;
            data.puntos_singulares = document.getElementById('bitacora-puntos').value.split('\n').filter(p => p.trim() !== '');
            
            await this.saveBitacora(data);
            this.closeModal();
            setTimeout(() => alert("Bitácora actualizada y guardada correctamente."), 300);
        } catch(e) {
            alert("Error al guardar: " + e.message);
        } finally {
            UI.setLoading(false);
        }
    },

    // ----------------------------------------------------
    // FUNCIÓN 1: Regenerar TODO desde cero (Manual/Bloqueante)
    // ----------------------------------------------------
    async regenerateAll() {
        if (!Core.targetHandle) return alert("Selecciona la carpeta raíz primero.");
        if (this.isUpdating) return alert("Ya hay un proceso en curso.");
        
        const confirmacion = confirm("⚠️ ¿Estás seguro? Esto BORRARÁ la bitácora actual y rastreará todos los nodos de tu librojuego desde cero. En obras grandes puede tardar varios minutos.");
        if (!confirmacion) return;

        this.isUpdating = true;
        this.closeModal();

        try {
            const allNodes = Core.bookData?.nodes || Core.book?.nodes || [];
            const validNodes = allNodes.filter(n => n.text && n.text.trim().length > 10);
            
            if (validNodes.length === 0) {
                alert("No hay nodos con texto suficiente en tu obra para analizarlos.");
                this.isUpdating = false;
                return;
            }

            let bitacora = this.getDefaultBitacora(); // Reiniciamos el objeto
            await this._processNodesAndFinalize(validNodes, bitacora, "Forjando Bitácora desde Cero");
            
        } catch (e) {
            console.error(e);
            alert("Error crítico: " + e.message);
            UI.setLoading(false);
        } finally {
            this.isUpdating = false;
        }
    },

    // ----------------------------------------------------
    // FUNCIÓN 2: Completar solo los faltantes (Manual/Bloqueante)
    // ----------------------------------------------------
    async completeMissing() {
        if (!Core.targetHandle) return alert("Selecciona la carpeta raíz primero.");
        if (this.isUpdating) return alert("Ya hay un proceso en curso.");
        
        this.isUpdating = true;
        this.closeModal();

        try {
            let bitacora = await this.loadBitacora();
            const allNodes = Core.bookData?.nodes || Core.book?.nodes || [];
            
            // Buscar nodos válidos que NO existan en las claves de bitacora.nodos
            const missingNodes = allNodes.filter(n => n.text && n.text.trim().length > 10 && !bitacora.nodos[n.id]);
            
            if (missingNodes.length === 0) {
                alert("¡Excelente! Todos los nodos de tu librojuego ya están resumidos en la bitácora.");
                this.isUpdating = false;
                return;
            }

            const confirmacion = confirm(`Se han detectado ${missingNodes.length} nodos sin resumir. ¿Proceder a extraer su información y actualizar la bitácora global?`);
            if (!confirmacion) {
                this.isUpdating = false;
                return;
            }

            await this._processNodesAndFinalize(missingNodes, bitacora, "Completando Bitácora (Nuevos Nodos)");
            
        } catch (e) {
            console.error(e);
            alert("Error crítico: " + e.message);
            UI.setLoading(false);
        } finally {
            this.isUpdating = false;
        }
    },

    // ----------------------------------------------------
    // PROCESAMIENTO MASIVO (Lotes Paralelos + Síntesis)
    // ----------------------------------------------------
    async _processNodesAndFinalize(nodesList, bitacora, titleStr) {
        const BATCH_SIZE = 6; 
        let processedCount = 0;

        // FASE 1: Extraer resúmenes individuales
        for (let i = 0; i < nodesList.length; i += BATCH_SIZE) {
            const batch = nodesList.slice(i, i + BATCH_SIZE);
            let pct = (processedCount / nodesList.length) * 60; 
            
            UI.setLoading(true, titleStr, pct, `Leyendo nodos y extrayendo síntesis (${processedCount}/${nodesList.length})...`, pct);

            const promises = batch.map(async (n) => {
                const sys = "Eres un cronista. Resume el texto en 1 o 2 frases destacando lo vital. Devuelve ESTRICTAMENTE JSON PURO.";
                const usr = `TEXTO DEL NODO:\n"${n.text}"\n\nFORMATO ESPERADO:\n{\n  "resumen_nodo": "..."\n}`;
                try {
                    const data = await window.Koreh.Text.generateWithRetry(sys, usr, { model: 'nova-fast', jsonMode: true, temperature: 0.3 }, d => d && d.resumen_nodo);
                    bitacora.nodos[n.id] = data.resumen_nodo;
                } catch(e) {
                    bitacora.nodos[n.id] = "[El cronista no pudo descifrar este nodo]";
                }
            });

            await Promise.all(promises);
            processedCount += batch.length;

            if (i + BATCH_SIZE < nodesList.length) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        // Preparamos el contexto
        let contextoNodos = Object.entries(bitacora.nodos)
                                  .map(([id, res]) => `[Nodo: ${id}]: ${res}`)
                                  .join("\n");
        if (contextoNodos.length > 15000) {
            contextoNodos = "...(Nodos omitidos por antigüedad)...\n" + contextoNodos.substring(contextoNodos.length - 15000);
        }

        // FASE 2: Resumen Global
        UI.setLoading(true, titleStr, 70, "Consolidando Resumen General (Macrotrama)...", 70);
        const sys2 = "Eres el Archivero Mayor. Escribe un resumen global cohesionado y épico (2-3 párrafos) de toda la trama integrando la cronología. Devuelve ESTRICTAMENTE JSON PURO.";
        const usr2 = `RESUMEN ANTERIOR:\n"${bitacora.resumen_general}"\n\nLÍNEA TEMPORAL COMPLETA:\n${contextoNodos}\n\nFORMATO ESPERADO:\n{\n  "resumen_general": "La historia trata sobre..."\n}`;
        
        try {
            const data2 = await window.Koreh.Text.generateWithRetry(sys2, usr2, { model: 'nova-fast', jsonMode: true, temperature: 0.5 }, d => d && d.resumen_general);
            bitacora.resumen_general = data2.resumen_general;
        } catch(e) {
            console.warn("Fallo al generar resumen general", e);
        }

        // FASE 3: Puntos Singulares
        UI.setLoading(true, titleStr, 85, "Extrayendo Hitos y Sucesos Clave...", 85);
        const sys3 = "Eres un analista táctico. A partir de la historia global y el detalle de los nodos, extrae los hitos, descubrimientos, objetos obtenidos o combates en una lista de puntos cortos. Devuelve ESTRICTAMENTE JSON PURO.";
        const usr3 = `HISTORIA GLOBAL:\n"${bitacora.resumen_general}"\n\nDETALLE:\n${contextoNodos}\n\nFORMATO ESPERADO:\n{\n  "puntos_singulares": ["Hito 1", "Hito 2"]\n}`;
        
        try {
            const data3 = await window.Koreh.Text.generateWithRetry(sys3, usr3, { model: 'nova-fast', jsonMode: true, temperature: 0.4 }, d => d && Array.isArray(d.puntos_singulares));
            bitacora.puntos_singulares = data3.puntos_singulares;
        } catch(e) {
            console.warn("Fallo al generar puntos singulares", e);
        }

        // FASE FINAL: Guardado
        UI.setLoading(true, titleStr, 100, "Inscribiendo bitacora.json en el disco...", 100);
        await this.saveBitacora(bitacora);
        
        setTimeout(() => {
            UI.setLoading(false);
            alert("¡Operación completada con éxito! La bitácora del librojuego ha sido actualizada.");
            this.openModal(); 
        }, 1000);
    },

    // ----------------------------------------------------
    // FUNCIÓN DE ACTUALIZACIÓN INDIVIDUAL (TOTALMENTE SILENCIOSA Y PARALELA)
    // ----------------------------------------------------
    async updateLogbook(nodeId) {
        if (this.isUpdating) {
            console.log(`[Bitácora] Ya hay una actualización en curso, ignorando petición automática para el nodo ${nodeId}.`);
            return;
        }

        if (!Core.targetHandle) {
            console.warn("[Bitácora] No se puede guardar en 2º plano porque no hay carpeta seleccionada.");
            return;
        }

        const node = Core.getNode(nodeId);
        if (!node || !node.text || node.text.trim().length < 10) return;

        this.isUpdating = true;
        
        // No ocultamos el UI ni lanzamos alerts para no interferir en el trabajo del usuario
        try {
            console.log(`[Bitácora] Iniciando actualización silenciosa en 2º plano para el nodo ${nodeId}...`);
            let bitacora = await this.loadBitacora();

            console.log(`[Bitácora] Paso 1: Analizando el texto del nodo...`);
            const sys1 = "Eres un cronista meticuloso. Tu trabajo es leer el fragmento de la historia y resumirlo en 1 o 2 frases destacando lo esencial. Devuelve ESTRICTAMENTE JSON PURO.";
            const usr1 = `TEXTO DEL NODO:\n"${node.text}"\n\nFORMATO ESPERADO:\n{\n  "resumen_nodo": "..."\n}`;
            
            const data1 = await window.Koreh.Text.generateWithRetry(sys1, usr1, { model: 'nova-fast', jsonMode: true, temperature: 0.3 }, d => d && d.resumen_nodo);
            bitacora.nodos[nodeId] = data1.resumen_nodo;

            let contextoNodos = Object.entries(bitacora.nodos)
                                      .map(([id, res]) => `[Nodo: ${id}]: ${res}`)
                                      .join("\n");
            
            if (contextoNodos.length > 12000) contextoNodos = "...(Omitido)...\n" + contextoNodos.substring(contextoNodos.length - 12000);

            console.log(`[Bitácora] Paso 2: Reescribiendo el Resumen General de la macrotrama...`);
            const sys2 = "Eres el Archivero Mayor. Escribe un resumen global cohesionado y épico de la trama integrando la información nueva. Devuelve ESTRICTAMENTE JSON PURO.";
            const usr2 = `RESUMEN GLOBAL ANTERIOR:\n"${bitacora.resumen_general}"\n\nLÍNEA TEMPORAL:\n${contextoNodos}\n\nFORMATO:\n{\n  "resumen_general": "..."\n}`;
            
            const data2 = await window.Koreh.Text.generateWithRetry(sys2, usr2, { model: 'nova-fast', jsonMode: true, temperature: 0.5 }, d => d && d.resumen_general);
            bitacora.resumen_general = data2.resumen_general;

            console.log(`[Bitácora] Paso 3: Extrayendo Puntos Singulares y Sucesos Clave...`);
            const sys3 = "Eres un analista táctico. Extrae hitos, descubrimientos o combates en puntos cortos. Devuelve JSON PURO.";
            const usr3 = `HISTORIA:\n"${bitacora.resumen_general}"\n\nSUCESOS:\n${contextoNodos}\n\nFORMATO:\n{\n  "puntos_singulares": ["..."]\n}`;
            
            const data3 = await window.Koreh.Text.generateWithRetry(sys3, usr3, { model: 'nova-fast', jsonMode: true, temperature: 0.4 }, d => d && Array.isArray(d.puntos_singulares));
            bitacora.puntos_singulares = data3.puntos_singulares;

            await this.saveBitacora(bitacora);
            
            console.log(`[Bitácora] ¡Actualización silenciosa en 2º plano completada y guardada con éxito!`);

        } catch (e) {
            console.error("[Bitácora] Fallo al actualizar la bitácora en segundo plano:", e);
        } finally {
            this.isUpdating = false;
        }
    }
};