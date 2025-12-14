/* NEXUS SILENOS/chronos_gen_fresh.js */
import { callGoogleAPI, cleanAndParseJSON } from './ia_koreh.js';

export async function generateFresh(userIdea, timeRange) {
    const { min, max } = timeRange;
    
    const systemPrompt = `
        Eres KOREH, arquitecto narrativo de NEXUS.
        Objetivo: Crear una línea temporal NUEVA basada en la idea del usuario.
        
        FORMATO JSON REQUERIDO:
        {
            "newCharacters": [
                { "id": "gen_c1", "name": "Nombre", "role": "Rol", "goal": "Objetivo", "fear": "Miedo" }
            ],
            "places": [
                {
                    "id": "gen_p1",
                    "name": "Nombre Lugar/Carril",
                    "color": "#HEXCOLOR",
                    "events": [
                        {
                            "id": "gen_e1",
                            "k": 10,
                            "title": "Título Evento",
                            "desc": "Descripción.",
                            "characterRefs": ["NombreExactoChar1"]
                        }
                    ]
                }
            ]
        }
        REGLAS:
        1. Genera min 2 Carriles y 4 Eventos.
        2. 'k' es el tiempo. DEBE estar estrictamente entre ${min} y ${max}. Distribuye los eventos lógicamente en ese rango.
        3. Solo JSON válido.
    `;

    console.log(`Koreh (Fresh): Generando nueva realidad en rango [${min}-${max}]...`);
    const rawResponse = await callGoogleAPI(systemPrompt, `IDEA: "${userIdea}"`);
    return cleanAndParseJSON(rawResponse);
}