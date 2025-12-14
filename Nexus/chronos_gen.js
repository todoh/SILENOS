/* NEXUS SILENOS/chronos_gen.js */
import { generateFresh } from './chronos_gen_fresh.js';
import { generateWithContext } from './chronos_gen_context.js';

export class ChronosGenerator {
    constructor(systemData) {
        this.systemData = systemData; // Referencia viva a los datos
    }

    /**
     * @param {string} userIdea - Prompt del usuario
     * @param {boolean} useContext - True: leer datos actuales; False: ignorar.
     * @param {object} timeRange - { min: number, max: number }
     */
    async generateTimeline(userIdea, useContext, timeRange = { min: 0, max: 100 }) {
        let resultData;

        try {
            if (useContext && this._hasData()) {
                // Estrategia B: Contexto
                const rawResult = await generateWithContext(userIdea, this.systemData, timeRange);
                resultData = this._mergeContextResult(rawResult);
            } else {
                // Estrategia A: Fresco (o si no hay datos)
                const rawResult = await generateFresh(userIdea, timeRange);
                resultData = this._postProcessFresh(rawResult);
            }

            return resultData;

        } catch (error) {
            console.error("ChronosGenerator Error:", error);
            throw error;
        }
    }

    _hasData() {
        // Verificar si hay algo que valga la pena leer
        return (this.systemData.places.length > 0 || this.systemData.characters.length > 0);
    }

    // Procesa la respuesta "Fresh" (Estructura estándar)
    _postProcessFresh(data) {
        const ts = Date.now();
        
        // Asignar IDs únicos a Personajes
        if (data.newCharacters) {
            data.newCharacters.forEach((c, i) => c.id = `char_ai_${ts}_${i}`);
        }

        // Asignar IDs a Lugares y Eventos
        if (data.places) {
            data.places.forEach((p, pi) => {
                p.id = `p_ai_${ts}_${pi}`;
                if (p.events) {
                    p.events.forEach((e, ei) => {
                        e.id = `evt_ai_${ts}_${pi}_${ei}`;
                        this._resolveCharRefs(e, data.newCharacters);
                    });
                }
            });
        }
        return data; // Estructura: { newCharacters, places }
    }

    // Procesa la respuesta "Context" (Estructura de actualización)
    _mergeContextResult(data) {
        const ts = Date.now();
        const output = { newCharacters: [], places: [] };

        // 1. Nuevos Personajes
        if (data.newCharacters) {
            data.newCharacters.forEach((c, i) => {
                c.id = `char_ai_ctx_${ts}_${i}`;
                // Guardamos referencia temporal para resolverla abajo
                c._tempRefName = c.name; 
            });
            output.newCharacters = data.newCharacters;
        }

        // 2. Lugares (Actualizar existentes o crear nuevos)
        if (data.placesToUpdate) {
            data.placesToUpdate.forEach((pUpdate, pi) => {
                let targetPlace;

                if (pUpdate.isNew) {
                    // Es un lugar nuevo generado por IA
                    targetPlace = {
                        id: `p_ai_ctx_${ts}_${pi}`,
                        name: pUpdate.name || "Zona Desconocida",
                        color: pUpdate.color || "#666",
                        events: []
                    };
                    // Lo añadimos a la salida como lugar completo
                    output.places.push(targetPlace);
                } else {
                    // Es una actualización de un lugar existente
                    // En este flujo, NO devolvemos el lugar entero, sino que ChronosApp deberá fusionarlo.
                    // Pero para mantener la consistencia del return, devolvemos una estructura "delta".
                    // O mejor: Simulamos que es un lugar parcial.
                    targetPlace = {
                        id: pUpdate.id, // ID existente
                        _isUpdate: true, // Flag para el controlador
                        events: []
                    };
                    output.places.push(targetPlace);
                }

                // Procesar Nuevos Eventos
                if (pUpdate.newEvents) {
                    pUpdate.newEvents.forEach((e, ei) => {
                        e.id = `evt_ai_ctx_${ts}_${pi}_${ei}`;
                        
                        // Resolver referencias mixtas (IDs existentes vs Nombres nuevos)
                        if (e.characterIds) {
                            e.characters = e.characterIds.map(ref => {
                                // ¿Es un ID existente? (Asumimos que sí si no coincide con un nuevo)
                                // ¿Es una referencia a uno nuevo?
                                const newChar = output.newCharacters.find(nc => nc.id === ref || nc.name === ref);
                                return newChar ? newChar.id : ref;
                            });
                            delete e.characterIds;
                        }
                        
                        targetPlace.events.push(e);
                    });
                }
            });
        }

        return output; 
    }

    // Helper para convertir nombres en IDs (Solo para Fresh)
    _resolveCharRefs(evt, newChars) {
        if (evt.characterRefs && newChars) {
            evt.characters = [];
            evt.characterRefs.forEach(refName => {
                const found = newChars.find(c => c.name.toLowerCase().includes(refName.toLowerCase()));
                if (found) evt.characters.push(found.id);
            });
            delete evt.characterRefs;
        }
    }
}