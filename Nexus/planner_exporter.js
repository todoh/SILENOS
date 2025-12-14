/* NEXUS SILENOS/planner_exporter.js */
/**
 * PLANNER EXPORT - IO & DATA VIEW
 * Genera el paquete JSON para Silenos y la vista de guion textual.
 */

class PlannerExport {
    constructor(manager) {
        this.manager = manager;
        this.injectExportHelpers();
    }

    // --- FASE 3: EXPORTACIÓN (JSON) ---
    generateSilenosPackage() {
        const p = this.manager.activeProject;
        const items = [];
        
        // [PLANNING]
        let planContent = `OBRA: ${p.title}\nESTILO: ${p.narrativeStyle}\n\n`;
        p.chapters.forEach((c, i) => {
            planContent += `### CAPÍTULO ${i+1}: ${c.title}\n${c.desc || 'Sin descripción'}\n`;
            if (c.povId) planContent += `[POV: ${c.povId}]\n`;
            if (c.focus) planContent += `[FOCO: ${c.focus}]\n`;
            if(c.linkedEventIds.length > 0) planContent += `   > Eventos Clave: ${c.linkedEventIds.map(eid => this.manager.findEventInfo(eid).title).join(', ')}\n`;
            planContent += `\n`;
        });
        
        // AÑADIR LORE GENERADO AL CONTENIDO DEL PLAN
        if(p.aiGeneratedLore && p.aiGeneratedLore.length > 0) {
            planContent += `\n=== LORE CONTEXTUAL GENERADO ===\n`;
            p.aiGeneratedLore.forEach(l => {
                planContent += `* ${l.term}: ${l.definition}\n`;
            });
        }

        items.push({ id: 'plan_' + Date.now(), category: 'PLANNING', title: `Escaleta: ${p.title}`, content: planContent, createdAt: Date.now() });

        // [PERSONAJES]
        p.selectedCharIds.forEach(cid => {
            const char = this.manager.sagaData.characters.find(c => c.id === cid);
            if(char) items.push({ id: 'char_' + cid, category: 'PERSONAJE', title: char.name, content: `ROL: ${char.role}\nOBJETIVO: ${char.goal}\nMIEDO: ${char.fear}\nNOTAS: ${char.notes}`, createdAt: Date.now() });
        });

        // [LUGARES]
        p.selectedPlaceIds.forEach(pid => {
            let place = this.manager.sagaData.placeDb.find(x => x.id === pid) || this.manager.sagaData.places.find(x => x.id === pid);
            if(place) items.push({ id: 'place_' + pid, category: 'LUGAR', title: place.name, content: `TIPO: ${place.type || 'General'}\nDESC: ${place.desc || ''}`, createdAt: Date.now() });
        });

        // [EVENTOS]
        p.selectedEventIds.forEach(eid => {
            const evt = this.manager.findEventInfo(eid);
            if(evt) items.push({ id: 'evt_' + eid, category: 'CONTEXTO', title: `Evento: ${evt.title}`, content: `T: ${evt.k}\n${evt.desc || ''}`, createdAt: Date.now() });
        });

        return { universeName: p.title, items: items };
    }

    generatePreview() {
        const pkg = this.generateSilenosPackage();
        const p = this.manager.activeProject;
        const summary = `${pkg.items.length} tarjetas generadas.\n(1 Plan, ${p.selectedCharIds.length} Personajes, ${p.selectedPlaceIds.length} Lugares, ${p.selectedEventIds.length} Eventos)`;
        document.getElementById('exportSummary').innerText = summary;
        document.getElementById('jsonPreview').innerText = JSON.stringify(pkg, null, 2);
    }

    downloadPackage() {
        const pkg = this.generateSilenosPackage();
        const p = this.manager.activeProject;
        const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        const safeTitle = p.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `SILENOS_${safeTitle}.json`;
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    // --- FASE 4: VISTA DE DATOS (ESCALETA JSON ESTRUCTURADA) ---
    generateDataView() {
        const p = this.manager.activeProject;
        
        // ESTRUCTURA OBJETIVO (JSON COMPATIBLE CON SCRIPT UI)
        const scriptStructure = {
            id: Date.now(),
            title: p.title,
            isAI: true, 
            scenes: []
        };

        // 1. INTRODUCCIÓN (Planteamiento General + Estilo + Códice)
        const codexTone = this.manager.sagaData.codex ? this.manager.sagaData.codex.tone : 'Neutro';
        const generalOverview = `ESTILO: ${p.narrativeStyle}. TONO: ${codexTone}. \n` +
                                `Esta obra narra los acontecimientos estructurados en ${p.chapters.length} capítulos.`;
        
        scriptStructure.scenes.push({
            title: "INTRODUCCIÓN",
            paragraphs: [
                { text: generalOverview }
            ]
        });

        // 2. CAPÍTULOS (Estructura)
        if (p.chapters.length > 0) {
            p.chapters.forEach((c, i) => {
                let chapterText = c.desc || "Sin descripción.";
                
                // Enriquecer con POV y Foco
                let povName = c.povId ? (this.manager.sagaData.characters.find(x=>x.id===c.povId)?.name || 'Omnisciente') : 'Narrador Omnisciente';
                chapterText += `\n[Punto de Vista: ${povName}]`;
                if (c.focus) chapterText += `\n[Foco Dramático: ${c.focus}]`;

                // Enriquecer con Eventos Vinculados
                if(c.linkedEventIds.length > 0) {
                    const eventDescs = c.linkedEventIds.map(eid => {
                        const evt = this.manager.findEventInfo(eid);
                        return `- ${evt.title}: ${evt.desc}`;
                    }).join('\n');
                    chapterText += `\n\nEventos Clave:\n${eventDescs}`;
                }

                scriptStructure.scenes.push({
                    title: `CAPÍTULO ${i+1}: ${c.title || 'Sin Título'}`,
                    paragraphs: [
                        { text: chapterText }
                    ]
                });
            });
        } else {
            scriptStructure.scenes.push({
                title: "CAPÍTULO 1",
                paragraphs: [{ text: "No hay estructura definida. Añade capítulos en la pestaña Estructura." }]
            });
        }

        // 3. APÉNDICE: GLOSARIO Y LORE
        let loreText = "";
        
        // 3a. LORE GENERADO POR IA (NUEVO)
        if (p.aiGeneratedLore && p.aiGeneratedLore.length > 0) {
            loreText += "### CONCEPTOS DEDUCIDOS (IA) ###\n\n";
            p.aiGeneratedLore.forEach(l => {
                loreText += `* ${l.term.toUpperCase()}: ${l.definition}\n`;
            });
            loreText += "\n-----------------------------------\n\n";
        }

        // 3b. DATOS EXISTENTES (PERSONAJES/LUGARES SELECCIONADOS)
        p.selectedCharIds.forEach(cid => {
            const char = this.manager.sagaData.characters.find(c => c.id === cid);
            if(char) {
                loreText += `### ${char.name.toUpperCase()} (${char.role || 'Personaje'}): \n`;
                loreText += `${char.notes || char.goal || 'Sin detalles adicionales'}.\n\n`;
            }
        });

        p.selectedPlaceIds.forEach(pid => {
            let place = this.manager.sagaData.placeDb.find(x => x.id === pid) || this.manager.sagaData.places.find(x => x.id === pid);
            if(place) {
                loreText += `### ${place.name.toUpperCase()} (${place.type || 'Lugar'}): \n`;
                loreText += `${place.desc || place.notes || 'Sin descripción'}.\n\n`;
            }
        });

        if (loreText.trim() !== "") {
            scriptStructure.scenes.push({
                title: "APÉNDICE: GLOSARIO Y LORE",
                paragraphs: [
                    { text: loreText }
                ]
            });
        }

        // ASIGNAR AL TEXTAREA (Pretty Print)
        const txtEl = document.getElementById('txtNarrativa');
        if(txtEl) txtEl.value = JSON.stringify(scriptStructure, null, 2);

        // --- RESTO DE CAMPOS DE TEXTO ---
        this._fillReferenceTextAreas(p);
    }

    _fillReferenceTextAreas(p) {
        // PERSONAJES
        let txtPersonajes = `=== DRAMATIS PERSONAE ===\n\n`;
        p.selectedCharIds.forEach(cid => {
            const c = this.manager.sagaData.characters.find(x => x.id === cid);
            if(c) {
                txtPersonajes += `NOMBRE: ${c.name}\nROLE: ${c.role||'N/A'}\nOBJETIVO: ${c.goal||'N/A'}\nMIEDO: ${c.fear||'N/A'}\n${c.notes ? `NOTAS: ${c.notes}\n` : ''}\n`;
            }
        });
        const elPers = document.getElementById('txtPersonajes');
        if(elPers) elPers.value = txtPersonajes;

        // LUGARES
        let txtLugares = `=== LOCALIZACIONES ===\n\n`;
        p.selectedPlaceIds.forEach(pid => {
            let place = this.manager.sagaData.placeDb.find(x => x.id === pid) || this.manager.sagaData.places.find(x => x.id === pid);
            if(place) {
                const desc = place.desc || (place.events ? `Contiene ${place.events.length} eventos históricos.` : 'Sin descripción.');
                txtLugares += `LUGAR: ${place.name}\nTIPO: ${place.type || 'General'}\nDESCRIPCIÓN: ${desc}\n${place.notes ? `NOTAS: ${place.notes}\n` : ''}\n`;
            }
        });
        const elLug = document.getElementById('txtLugares');
        if(elLug) elLug.value = txtLugares;

        // EVENTOS
        let txtEventos = `=== CRONOLOGÍA ===\n\n`;
        const eventsList = [];
        p.selectedEventIds.forEach(eid => {
            const evt = this.manager.findEventInfo(eid);
            if(evt && evt.title !== 'Evento Desconocido') eventsList.push(evt);
        });
        eventsList.sort((a,b) => a.k - b.k);

        eventsList.forEach(e => {
            txtEventos += `[TIEMPO: ${Math.round(e.k)}] ${e.title.toUpperCase()}\n${e.desc ? e.desc + '\n' : ''}\n`;
        });
        const elEvt = document.getElementById('txtEventos');
        if(elEvt) elEvt.value = txtEventos;
    }

    injectExportHelpers() {
        window.downloadNarrativeJson = () => {
            const el = document.getElementById('txtNarrativa');
            const content = el.value;
            
            if (!content) return this.manager.notify("No hay datos para descargar.");
            
            let filename = "narrativa_silenos.json";
            try {
                const jsonObj = JSON.parse(content);
                if (jsonObj.title) {
                    filename = jsonObj.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json";
                }
            } catch(e) {
                filename = "narrativa_raw.json";
            }

            const blob = new Blob([content], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => { 
                document.body.removeChild(a); 
                URL.revokeObjectURL(url); 
            }, 100);
            
            this.manager.notify("Descarga JSON iniciada.");
        };
    }
}