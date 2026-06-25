/**
 * IO LOGIC - Módulo unificado para la carga, copia y exportación de estructuras JSON
 * Espacio de nombres: window.KorehIO
 * Versión: 4.1 - Soporte de Inyección Dinámica e Inmunidad de Sobrescritura en Cronografías
 */

window.KorehIO = {
    templates: {
        datos: {
            instrucciones_ia: 
                "=========================================================================\n" +
                "REGLAS E INSTRUCCIONES PARA LA GENERACIÓN DE DATOS (ENCICLOPEDIA)\n" +
                "=========================================================================\n" +
                "ROL: Analista Enciclopédico de Lore y Worldbuilding.\n\n" +
                "REGLAS DE ORO:\n" +
                "1. Idioma: Los campos 'name' y 'desc' deben escribirse estrictamente en ESPAÑOL.\n" +
                "2. Prompt de Imagen: El campo 'visualDesc' DEBE estar escrito completamente en INGLÉS. Describe con máximo detalle la apariencia, vestuario, materiales, iluminación y atmósfera. NO utilices nombres propios dentro de este campo.\n" +
                "3. Campos Fijos Obligatorios: Los campos 'imagen64' e 'imageFile' deben ser null obligatoriamente.\n" +
                "4. Clasificación Estricta ('type'): Elige solo una categoría de esta lista: Personaje, Criatura, Flora, Raza, Lugar, Asentamiento, Estructura, Cosmología, Objeto, Arma, Vehículo, Recurso, Comida.\n\n" +
                "ESTRUCTURA DE CAMPOS:\n" +
                "- name: Nombre directo del elemento.\n" +
                "- type: Tipo o categoría exacta.\n" +
                "- desc: Lore documental, objetivo y detallado en español.\n" +
                "- visualDesc: Prompt fotográfico en inglés para generación artística.\n\n" +
                "Sigue fielmente el formato del siguiente JSON de ejemplo:\n" +
                "-------------------------------------------------------------------------",
            ejemplo_matriz: [
                {
                    "name": "Arandela de Luz Antigua",
                    "type": "Objeto",
                    "desc": "Un artefacto circular forjado en bronce hermético durante la primera era de Taira. Emite una resonancia magnética capaz de estabilizar fluctuaciones en el éter cercano.",
                    "visualDesc": "A floating ancient bronze ring ornament, intricate esoteric engravings, glowing cyan runes flickering, realistic brass metal textures, studio lighting, isolated on solid gray background, masterpiece, 8k",
                    "imagen64": null,
                    "imageFile": null
                },
                {
                    "name": "Silenos el Erudito",
                    "type": "Personaje",
                    "desc": "Astrónomo real exiliado en Motril. Custodio de los planos del multiverso procedural y fundador de la academia de la Arandela Colocada.",
                    "visualDesc": "An old bearded astronomer in minimalist brutalist monochrome robes, holding an ancient scroll, detailed weathered face, soft low-key dramatic lighting, dark ambient library background, volumetric dust, photorealistic",
                    "imagen64": null,
                    "imageFile": null
                }
            ]
        },
        tramas: {
            instrucciones_ia:
                "=========================================================================\n" +
                "REGLAS E INSTRUCCIONES PARA LA GENERACIÓN DE TRAMAS (NODOS OMEGA)\n" +
                "=========================================================================\n" +
                "ROL: Arquitecto de Escaletas Narrativas y Redes de Eventos.\n\n" +
                "REGLAS DE ORO:\n" +
                "1. Enrutamiento y Conexiones: Los nodos se conectan de forma lineal o ramificada incluyendo en el array 'connections' los strings con los 'id' de los nodos siguientes.\n" +
                "2. Identificadores Únicos: Cada nodo debe poseer un 'id' único que inicie con el prefijo 'omega-' (ej. 'omega-evento-01').\n" +
                "3. Vinculación Semántica ('dataRefs'): Añade en este array los nombres exactos de los archivos JSON de datos del mundo que participan en el hito (ej. 'silenos_el_erudito.json') para que la UI pinte sus burbujas automáticamente.\n" +
                "4. Agrupación por Hilos: Los eventos de una misma subtrama se guían bajo el mismo 'threadName' y comparten idéntico color hexadecimal en 'threadColor'.\n" +
                "5. Roles Estructurales ('type'): Usa únicamente uno de estos valores: Gancho, Contexto, Incidente, Inflexión, Desarrollo, Obstáculo, Medio, Crisis, Clímax, Resolución, Epílogo.\n\n" +
                "Sigue fielmente el formato del siguiente JSON de ejemplo:\n" +
                "-------------------------------------------------------------------------",
            ejemplo_matriz: [
                {
                    "id": "omega-nodo-inicio",
                    "name": "El Descubrimiento de la Arandela",
                    "type": "Incidente",
                    "status": "Borrador",
                    "tension": 3,
                    "timestamp": "Año 1, Otoño",
                    "duration": "1 noche",
                    "pov": "silenos_el_erudito.json",
                    "desc": "Silenos localiza la Arandela de Luz Antigua enterrada bajo los cimientos de la vieja torre de Motril, desatando una señal luminosa hacia el cosmos.",
                    "notes": "Asegurarse de que este nodo rompa el statu quo inicial.",
                    "threadName": "Trama Principal",
                    "threadColor": "#8b5cf6",
                    "x": 150,
                    "y": 200,
                    "dataRefs": ["arandela_de_luz_antigua.json", "silenos_el_erudito.json"],
                    "connections": ["omega-nodo-obstaculo"]
                },
                {
                    "id": "omega-nodo-obstaculo",
                    "name": "La Persecución en la Costa",
                    "type": "Obstáculo",
                    "status": "Borrador",
                    "tension": 5,
                    "timestamp": "Año 1, Invierno",
                    "duration": "2 horas",
                    "pov": "silenos_el_erudito.json",
                    "desc": "Las fuerzas camaleónicas detectan la fluctuación del éter e interceptan a Silenos en los acantalidos de la costa.",
                    "notes": "Momento de alta tensión física en el entorno.",
                    "threadName": "Trama Principal",
                    "threadColor": "#8b5cf6",
                    "x": 450,
                    "y": 200,
                    "dataRefs": ["silenos_el_erudito.json"],
                    "connections": []
                }
            ]
        },
        cronologia: {
            instrucciones_ia:
                "=========================================================================\n" +
                "REGLAS E INSTRUCCIONES PARA LA GENERACIÓN DE CRONOLOGÍA (STORYBOARD)\n" +
                "=========================================================================\n" +
                "ROL: Director de Continuidad, Guionista de Cine y Diseñador de Storyboards.\n\n" +
                "REGLAS DE ORO:\n" +
                "1. Ubicación Temporal Explicita: El campo 'time' define la coordenada horizontal de la escena en la línea de tiempo. Debe ser un valor numérico secuencial o fraccionario progresivo (ej: 1.0, 1.5, 2.0).\n" +
                "2. Desglose en Latidos ('moments'): Cada escena contiene un array de 'moments' que subdivide el capítulo en planos secuenciales directos.\n" +
                "3. Prompts Cinematográficos Puros: El campo 'visualPrompt' dentro de los momentos DEBE escribirse por completo en INGLÉS técnico descriptivo. Define el tipo de plano (Close up, Wide angle), la iluminación (cinematic lighting, dramatic shadows) y la estética visual de la toma sin usar nombres propios.\n" +
                "4. Narración Literaria: El campo 'text' contiene la prosa poética o el guion narrativo descriptivo de lo que acontece en español.\n\n" +
                "Sigue fielmente el formato del siguiente JSON de ejemplo:\n" +
                "-------------------------------------------------------------------------",
            ejemplo_matriz: [
                {
                    "id": "evt-cronologia-001",
                    "time": 1.5,
                    "description": "La Activación de Emergencia",
                    "moments": [
                        {
                            "id": 90001,
                            "text": "Con las manos temblorosas por el frío y el miedo, Silenos encajó la Arandela de Luz en la ranura de piedra. El suelo vibró al instante.",
                            "visualPrompt": "Close up shot of wrinkled old hands inserting a glowing brass metallic ring into a dark ancient stone altar, cyan sparks flying, high contrast shadow, macro photography, cinematic lighting, 8k",
                            "image64": null,
                            "aspectRatio": "landscape"
                        },
                        {
                            "id": 90002,
                            "text": "Un haz vertical pálido rasgó las nubes de Motril, cegando a los perseguidores que se aproximaban por la línea de la costa.",
                            "visualPrompt": "Wide angle cinematic shot, a massive beam of pale light shooting upwards from a coastal cliff into a stormy dark sky, crashing sea waves below, distant silhouettes of soldiers blinded by glare, highly detailed masterpiece",
                            "image64": null,
                            "aspectRatio": "landscape"
                        }
                    ]
                }
            ]
        }
    },

    refreshTargetTimelineSelect() {
        const select = document.getElementById('io-import-crono-target');
        if (!select) return;
        
        const list = (window.mainCrono && window.mainCrono.availableTimelines) ? window.mainCrono.availableTimelines : ['TIMELINE_DATA.json'];
        const currentActive = (window.mainCrono && window.mainCrono.currentTimelineName) ? window.mainCrono.currentTimelineName : 'TIMELINE_DATA.json';
        
        select.innerHTML = list.map(t => `
            <option value="${t}" ${t === currentActive ? 'selected' : ''}>${t.replace('.json', '').replace('timeline_', '').toUpperCase()}</option>
        `).join('');
    },

    copyTemplate(type) {
        const template = this.templates[type];
        if (!template) return;

        const jsonString = JSON.stringify(template.ejemplo_matriz, null, 2);
        const fullOutputText = template.instrucciones_ia + "\n" + jsonString;

        const txtArea = document.getElementById('io-json-area');
        if (txtArea) txtArea.value = fullOutputText;

        navigator.clipboard.writeText(fullOutputText).then(() => {
            if (window.ui && window.ui.alert) {
                window.ui.alert(`Instrucciones lógicas y JSON de [${type.toUpperCase()}] listados y copiados.`);
            } else {
                alert("Copiado con éxito.");
            }
        }).catch(err => {
            console.error("No se pudo copiar de forma nativa: ", err);
        });
    },

    async loadIntoSystem() {
        if (!window.app || !window.app.targetHandle) {
            return alert("Primero debes seleccionar una carpeta del proyecto en la interfaz.");
        }

        const txtArea = document.getElementById('io-json-area');
        let content = txtArea ? txtArea.value.trim() : '';

        if (!content) return alert("La consola JSON está vacía.");

        try {
            const firstOpenBrace = content.indexOf('{');
            const firstOpenBracket = content.indexOf('[');
            let jsonStartIndex = -1;

            if (firstOpenBrace !== -1 && firstOpenBracket !== -1) {
                jsonStartIndex = Math.min(firstOpenBrace, firstOpenBracket);
            } else {
                jsonStartIndex = firstOpenBrace !== -1 ? firstOpenBrace : firstOpenBracket;
            }

            if (jsonStartIndex !== -1) {
                content = content.substring(jsonStartIndex);
            }

            const parsedData = JSON.parse(content);
            
            // Caso 1: Es una exportación completa previa del sistema completo
            if (parsedData.__nexus_saga_export__) {
                const targetCronoFile = document.getElementById('io-import-crono-target')?.value || 'TIMELINE_DATA.json';
                if (window.mainCrono && window.mainCrono.currentTimelineName !== targetCronoFile) {
                    await window.mainCrono.switchTimelineFile(targetCronoFile);
                }

                if (parsedData.datos && Array.isArray(parsedData.datos)) {
                    for (const item of parsedData.datos) {
                        await this.writeItemToDisk(item.filename, item.data);
                    }
                }
                if (parsedData.tramas) {
                    window.app.tramas = parsedData.tramas;
                    await window.app.saveTramas();
                }
                if (parsedData.cronologia && window.mainCrono) {
                    window.mainCrono.data.events = parsedData.cronologia;
                    await window.mainCrono.saveData();
                }

                alert("¡Matriz estructural completa restaurada con éxito!");
                await window.app.loadFiles();
                return;
            }

            // Detectar si el payload contiene elementos cronológicos puros antes de tocar la línea de tiempo
            let containsTimelinePayload = false;
            if (Array.isArray(parsedData)) {
                containsTimelinePayload = parsedData.some(obj => obj.moments !== undefined || obj.time !== undefined);
            } else {
                containsTimelinePayload = (parsedData.moments !== undefined || parsedData.time !== undefined);
            }

            const targetCronoFile = document.getElementById('io-import-crono-target')?.value || 'TIMELINE_DATA.json';

            // BLINDAJE CRÍTICO: Solo conmutamos y cargamos el archivo crono si los datos entrantes van a modificar la línea temporal
            if (containsTimelinePayload && window.mainCrono && window.mainCrono.currentTimelineName !== targetCronoFile) {
                await window.mainCrono.switchTimelineFile(targetCronoFile);
            }

            // Caso 2: Es un array de elementos o un objeto único suelto
            if (Array.isArray(parsedData)) {
                alert("Se ha detectado un lote. Procesando inserción paralela...");
                for (let i = 0; i < parsedData.length; i++) {
                    await this.injectSingleObject(parsedData[i], i);
                }
            } else {
                await this.injectSingleObject(parsedData, 0);
            }

            alert(`Operación de inyección finalizada con éxito.`);
            await window.app.loadFiles();

        } catch (e) {
            console.error(e);
            alert("Error al parsear o procesar el JSON: " + e.message);
        }
    },

    async injectSingleObject(obj, index) {
        if (obj.moments !== undefined || obj.time !== undefined) {
            if (!window.mainCrono) throw new Error("Módulo Cronología no disponible.");
            const cleanEvent = {
                id: obj.id || 'evt-' + Date.now() + index,
                time: parseFloat(obj.time || 0),
                description: obj.description || obj.title || "Nueva Escena Importada",
                moments: obj.moments || []
            };
            window.mainCrono.data.events.push(cleanEvent);
            await window.mainCrono.saveData();
            return;
        }

        if (obj.threadName !== undefined || obj.type === 'Region' || (obj.id && obj.id.startsWith('omega-'))) {
            const cleanOmegaNode = {
                id: obj.id || `omega-${Date.now().toString(36)}-${index}`,
                name: obj.name || "Evento Importado",
                type: obj.type || "Desarrollo",
                status: obj.status || "Borrador",
                tension: parseInt(obj.tension || 2),
                timestamp: obj.timestamp || "",
                duration: obj.duration || "",
                pov: obj.pov || null,
                desc: obj.desc || "",
                notes: obj.notes || "",
                threadName: obj.threadName || "",
                threadColor: obj.threadColor || "#8b5cf6",
                x: parseFloat(obj.x || 100),
                y: parseFloat(obj.y || 100),
                dataRefs: obj.dataRefs || [],
                connections: obj.connections || []
            };
            window.app.tramas.push(cleanOmegaNode);
            await window.app.saveTramas();

            if (window.TramasCanvas && typeof window.TramasCanvas.render === 'function') {
                window.TramasCanvas.render();
            }
            return;
        }

        const cleanName = (obj.name || "elemento_io_" + index).trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${cleanName}_${Date.now()}_${index}.json`;
        const dataPayload = {
            name: obj.name || "Elemento Importado",
            type: obj.type || "General",
            desc: obj.desc || "Pendiente...",
            visualDesc: obj.visualDesc || "representation art masterpiece",
            imagen64: obj.imagen64 || null,
            imageFile: obj.imageFile || null
        };
        await this.writeItemToDisk(filename, dataPayload);
    },

    async writeItemToDisk(filename, data) {
        try {
            const fileHandle = await window.app.targetHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        } catch(err) {
            console.error("Fallo escribiendo asset individual:", filename, err);
        }
    },

    async exportSystemJSON() {
        if (!window.app || !window.app.targetHandle) {
            return alert("Selecciona una carpeta activa primero.");
        }

        const filter = document.getElementById('io-export-filter').value;
        const exportPackage = {
            __nexus_saga_export__: true,
            timestamp: new Date().toISOString(),
            scope: filter
        };

        try {
            if (filter === 'all' || filter === 'datos') {
                exportPackage.datos = [];
                for await (const entry of window.app.targetHandle.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.includes('TIMELINE') && !entry.name.startsWith('timeline_') && !entry.name.includes('RESUMEN_GLOBAL') && !entry.name.includes('TRAMAS_GLOBAL') && !entry.name.includes('VISUAL_BIBLE')) {
                        const file = await entry.getFile();
                        const text = await file.text();
                        try {
                            exportPackage.datos.push({
                                filename: entry.name,
                                data: JSON.parse(text)
                            });
                        } catch(jsonErr){}
                    }
                }
            }

            if (filter === 'all' || filter === 'tramas') {
                exportPackage.tramas = window.app.tramas || [];
            }

            if (filter === 'all' || filter === 'cronologia') {
                exportPackage.cronologia = (window.mainCrono && window.mainCrono.data) ? window.mainCrono.data.events : [];
                exportPackage.active_timeline_filename = window.mainCrono ? window.mainCrono.currentTimelineName : 'TIMELINE_DATA.json';
            }

            const jsonBlob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json;charset=utf-8' });
            const downloadUrl = URL.createObjectURL(jsonBlob);
            const a = document.createElement('a');
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.href = downloadUrl;
            a.download = `Nexus_Saga_IO_${filter.toUpperCase()}_${timestamp}.json`;
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);
            }, 100);

        } catch (err) {
            console.error("Fallo crítico en exportador IO:", err);
            alert("Error empaquetando exportación JSON.");
        }
    }
};