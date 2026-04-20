// Archivo: Librojuego/audio.engine.js

window.AudioEngine = {
    googleVoices: [],
    selectedLang: 'es-ES',
    selectedVoice: null,
    generatingNodes: new Set(), // Registro de tareas de audio en segundo plano

    async loadVoices() {
        const apiKey = this.getApiKey();
        const select = document.getElementById('google-voice-select');
        if (!apiKey) {
            if(select) select.innerHTML = '<option disabled selected>Falta API Key de Google Cloud</option>';
            return alert("Por favor, introduce la API Key de Google Cloud en los ajustes del sistema [CFG] de Silenos.");
        }
        if(select) select.innerHTML = '<option>Cargando voces...</option>';
        try {
            const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            this.googleVoices = data.voices;
            this.filterVoices();
        } catch (e) {
            console.error(e);
            if(select) select.innerHTML = '<option>Error al cargar voces</option>';
        }
    },

    filterVoices() {
        const lang = document.getElementById('google-lang-select')?.value || 'es-ES';
        const select = document.getElementById('google-voice-select');
        if(!select) return;
        select.innerHTML = '';
        
        let filtered = this.googleVoices.filter(v => 
            lang === 'all' || v.languageCodes.some(code => code.includes(lang.split('-')[0]))
        );
        
        // Ponemos las voces Premium/Chirp arriba del todo
        filtered.sort((a, b) => b.name.toLowerCase().includes('chirp') - a.name.toLowerCase().includes('chirp'));
        
        filtered.forEach(v => {
            const option = document.createElement('option');
            option.value = v.name;
            option.dataset.lang = v.languageCodes[0];
            let label = v.name.split('-').pop();
            let type = v.name.toLowerCase().includes('chirp') ? '🔥 CHIRP' : (v.name.toLowerCase().includes('wavenet') ? '🌊 WaveNet' : 'Standard');
            option.text = `[${type}] ${label} (${v.ssmlGender})`;
            select.appendChild(option);
        });
        this.setVoice();
    },

    setVoice() {
        const select = document.getElementById('google-voice-select');
        if(select && select.selectedIndex >= 0) {
            this.selectedVoice = select.options[select.selectedIndex].value;
            this.selectedLang = select.options[select.selectedIndex].dataset.lang;
        }
    },

    getApiKey() {
        return localStorage.getItem('googlecloud_api_key') || (window.parent && window.parent.googlecloudapikey);
    },

    async generateNodeAudio(nodeId) {
        if (this.generatingNodes.has(nodeId)) {
            console.warn(`[AudioEngine] El nodo ${nodeId} ya está en proceso de locución.`);
            return;
        }

        const node = Core.getNode(nodeId);
        if(!node || !node.text) return alert("El nodo no tiene texto para narrar.");
        if(!Core.targetHandle) return alert("Selecciona una carpeta raíz del proyecto primero.");
        const apiKey = this.getApiKey();
        if(!apiKey) return alert("Falta API Key de Google Cloud.");
        if(!this.selectedVoice) return alert("Selecciona una voz primero. Recuerda darle al botón de Cargar Voces.");

        // Candado de concurrencia: Marcar que el nodo ha iniciado proceso asíncrono
        this.generatingNodes.add(nodeId);

        // Reflejar visualmente en el botón si estamos editando este mismo nodo
        const btn = document.getElementById('btn-generate-node-audio');
        if (btn && Core.selectedNodeId === nodeId) {
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> GENERANDO EN 2º PLANO...`;
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        try {
            console.log(`[Segundo Plano] Sintetizando Voz para el nodo ${nodeId}...`);
            const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
            const payload = {
                input: { text: node.text },
                voice: { languageCode: this.selectedLang, name: this.selectedVoice },
                audioConfig: { audioEncoding: "MP3" }
            };
            const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
            const data = await res.json();
            if(data.error) throw new Error(data.error.message);

            const byteCharacters = atob(data.audioContent);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNumbers)], {type: 'audio/mp3'});

            const filename = `AUD_${nodeId}_${Date.now()}.mp3`;
            const fileHandle = await Core.targetHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            node.audioUrl = filename;
            node._cachedAudioUrl = URL.createObjectURL(blob);
            Core.scheduleSave();

            // Refrescar UI Inmediata si el lienzo y/o editor coinciden
            if (typeof Editor !== 'undefined' && Core.selectedNodeId === nodeId) {
                Editor.loadNode(nodeId);
            }
            
            console.log(`[Segundo Plano] ¡Éxito! Audio del nodo ${nodeId} listo.`);
        } catch(e) {
            console.error("Caos en Hilo Secundario (Audio):", e);
            // Avisamos al usuario sin bloquearle su trabajo actual
            alert(`Fallo en 2º plano al generar la voz del nodo ${nodeId}:\n${e.message}`);
        } finally {
            // Liberar el candado
            this.generatingNodes.delete(nodeId);
            
            // Restaurar el botón a su estado normal si el editor sigue enfocado en este nodo
            if (Core.selectedNodeId === nodeId) {
                const currentBtn = document.getElementById('btn-generate-node-audio');
                if (currentBtn) {
                    currentBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> GENERAR VOZ (TTS)`;
                    currentBtn.disabled = false;
                    currentBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        }
    },

    async generateAllAudio() {
        if(!Core.targetHandle) return alert("Selecciona una carpeta raíz primero.");
        const apiKey = this.getApiKey();
        if(!apiKey) return alert("Falta API Key de Google Cloud.");
        if(!this.selectedVoice) return alert("Selecciona una voz primero. Recuerda darle al botón de Cargar Voces.");

        const nodes = (Core.bookData?.nodes || Core.book?.nodes || []).filter(n => !n.audioUrl && n.text && n.text.trim().length > 10);
        if(nodes.length === 0) return alert("Todos los nodos ya tienen locución o no tienen texto narrativo válido.");
        if(!confirm(`Se generarán locuciones para ${nodes.length} nodos en paralelo usando Google TTS. ¿Continuar?`)) return;

        // Proceso en Lotes Paralelos
        const BATCH_SIZE = 8;
        let processedCount = 0;

        try {
            UI.setLoading(true, "Producción Masiva de Audio Iniciada", 0, `Preparando ${nodes.length} nodos`, 0);
            
            for(let i = 0; i < nodes.length; i += BATCH_SIZE) {
                const batch = nodes.slice(i, i + BATCH_SIZE);
                
                let pct = (processedCount / nodes.length) * 100;
                UI.setLoading(true, `Grabando Voces...`, pct, `Procesando Lote ${Math.floor(i/BATCH_SIZE)+1} (${batch.length} audios en paralelo)`, pct);
                
                // Esperamos que todos los audios del lote terminen
                await Promise.all(batch.map(n => this.generateNodeAudio(n.id)));
                
                processedCount += batch.length;
                
                // Latencia entre ráfagas para no saturar la API
                if (i + BATCH_SIZE < nodes.length) {
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
            
            UI.setLoading(true, "¡Locución Masiva Completada!", 100, "Guardando datos", 100);
            setTimeout(() => {
                UI.setLoading(false);
                alert(`¡Éxito! Se han narrado ${processedCount} nodos de tu librojuego.`);
            }, 1000);

        } catch(e) {
            console.error("Caos en Hilo Secundario (Audio Masivo):", e);
            alert("El proceso por lotes se detuvo debido a un error: " + e.message);
            UI.setLoading(false);
        }
    },

    async deleteAudio(nodeId) {
        const node = Core.getNode(nodeId);
        if(!node || !node.audioUrl) return;
        
        const confirmDelete = confirm("¿Seguro que deseas borrar el audio de este nodo? Se eliminará definitivamente de la carpeta.");
        if(!confirmDelete) return;
        
        try {
            UI.setLoading(true, "Borrando Audio...", 50, "Eliminando archivo físico", 50);
            
            if(Core.targetHandle) {
                try { await Core.targetHandle.removeEntry(node.audioUrl); } catch(e){ console.warn("Archivo físico no encontrado", e); }
            }
            delete node.audioUrl;
            delete node._cachedAudioUrl;
            Core.scheduleSave();
            
            if (typeof Editor !== 'undefined' && Core.selectedNodeId === nodeId) {
                Editor.loadNode(nodeId);
            }
        } catch(e) {
            alert("Error al borrar: " + e.message);
        } finally {
            UI.setLoading(false);
        }
    }
};