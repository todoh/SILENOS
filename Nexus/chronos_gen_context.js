/* NEXUS SILENOS/chronos_gen_context.js */
import { callGoogleAPI, cleanAndParseJSON } from './ia_koreh.js';

// --- ORQUESTADOR KOREH V3.6 (Conciencia Geográfica + Códice) ---

export async function generateWithContext(userIdea, currentData, globalTimeRange) {
    const log = (msg) => console.log(`%c[KOREH] ${msg}`, 'color: #00acc1; font-weight: bold;');
    
    log("Fase 0: El Archivero (Recuperación de Contexto Completo)...");
    
    // 1. FASE 0: EL ARCHIVERO (RAG Ligero + Mapas + CODEX)
    const contextSelection = await phase0_Archivist(userIdea, currentData);
    
    // 2. PREPARACIÓN DE CONTEXTO RICO
    const richContext = {
        characters: currentData.characters.filter(c => contextSelection.relevantCharIds.includes(c.id)),
        places: currentData.places.filter(p => contextSelection.relevantPlaceIds.includes(p.id)),
        mapPois: contextSelection.relevantMapLocations,
        codex: currentData.codex || {}, // INYECTAR CODEX
        timeRange: globalTimeRange
    };

    log(`Archivero: ${richContext.characters.length} Personajes, ${richContext.places.length} Carriles, ${richContext.mapPois.length} Ubicaciones.`);

    // 3. FASE 1: EL GUIONISTA (Ahora con Reglas)
    const masterScript = await phase1_Screenwriter(userIdea, richContext, contextSelection);

    log(`Guion Maestro: "${masterScript.title}"`);

    // 4. FASE 2: EL TEJEDOR
    const promises = [];

    if (masterScript.productionOrders.createCharacters) {
        promises.push(phase2A_CharacterDesigner(userIdea, masterScript, richContext.codex));
    } else {
        promises.push(Promise.resolve([]));
    }

    if (masterScript.productionOrders.targetPlaces && masterScript.productionOrders.targetPlaces.length > 0) {
        const placeTasks = masterScript.productionOrders.targetPlaces.map(target => 
            phase2B_PlaceArchitect(target, userIdea, richContext, masterScript)
        );
        promises.push(Promise.all(placeTasks));
    } else {
        promises.push(Promise.resolve([]));
    }

    const [newCharacters, placesResults] = await Promise.all(promises);
    const placesToUpdate = (placesResults || []).filter(p => p !== null);

    return { newCharacters, placesToUpdate };
}

// ------------------------------------------------------------------
// FASE 0: EL ARCHIVERO
// ------------------------------------------------------------------

async function phase0_Archivist(userIdea, currentData) {
    // Índices ligeros
    const indexChars = (currentData.characters || []).map(c => ({ id: c.id, name: c.name }));
    const indexPlaces = (currentData.places || []).map(p => ({ id: p.id, name: p.name }));
    
    // POIs del mapa
    let allMapPois = [];
    if (currentData.maps && Array.isArray(currentData.maps)) {
        currentData.maps.forEach(m => {
            if (m.pois) {
                m.pois.forEach(p => allMapPois.push({ label: p.label, type: p.type }));
            }
        });
    }

    const prompt = `
        Eres EL ARCHIVERO DE NEXUS. 
        INPUT USUARIO: "${userIdea}"
        
        CATÁLOGO:
        - Personajes: ${JSON.stringify(indexChars)}
        - Carriles Temporales: ${JSON.stringify(indexPlaces)}
        - Ubicaciones Geográficas (Mapa): ${JSON.stringify(allMapPois)}

        TAREA:
        Selecciona lo relevante para la idea del usuario.
        
        FORMATO JSON:
        {
            "relevantCharIds": ["id1"],
            "relevantPlaceIds": ["idA"],
            "relevantMapLocations": ["NombreExactoPOI1"],
            "intentAnalysis": "..."
        }
    `;

    try {
        const res = await callGoogleAPI(prompt, "Archivando...");
        return cleanAndParseJSON(res);
    } catch (e) {
        return { relevantCharIds: [], relevantPlaceIds: [], relevantMapLocations: [] };
    }
}

// ------------------------------------------------------------------
// FASE 1: EL GUIONISTA (AUMENTADO CON CODEX)
// ------------------------------------------------------------------

async function phase1_Screenwriter(userIdea, richContext, analysis) {
    // FORMATEAR EL CODEX PARA EL PROMPT
    const codex = richContext.codex;
    const codexStr = `
        LEYES DEL MUNDO (CÓDICE):
        - GÉNERO: ${codex.worldType || "No definido"}
        - SISTEMA DE MAGIA/TECNOLOGÍA: ${codex.magicSystem || "Genérico"}
        - COSMOLOGÍA: ${codex.cosmology || "Desconocida"}
        - TONO: ${codex.tone || "Neutro"}
        - AXIOMAS INQUEBRANTABLES: ${JSON.stringify(codex.axioms || [])}
    `;

    const prompt = `
        Eres EL GUIONISTA MAESTRO.
        TRAMA: "${userIdea}"
        RANGO (K): ${richContext.timeRange.min} a ${richContext.timeRange.max}
        
        ${codexStr}

        RECURSOS:
        - Personajes: ${JSON.stringify(richContext.characters)}
        - Ubicaciones Mapa: ${JSON.stringify(richContext.mapPois)}
        
        TAREA:
        Diseña la trama respetando ESTRICTAMENTE las LEYES DEL MUNDO.
        Si el Tono es oscuro, crea conflictos letales. Si la magia tiene coste, úsalo.

        FORMATO JSON:
        {
            "title": "Título",
            "synopsis": "...",
            "tone": "...",
            "globalBeats": [{ "k": number, "summary": "..." }],
            "productionOrders": {
                "createCharacters": boolean,
                "targetPlaces": [
                    { 
                        "type": "EXISTING" o "NEW", 
                        "id": "ID si existe", 
                        "name": "Nombre Carril",
                        "roleInPlot": "..."
                    }
                ]
            }
        }
    `;

    try {
        const res = await callGoogleAPI(prompt, "Escribiendo Guion con Leyes...");
        return cleanAndParseJSON(res);
    } catch (e) { throw new Error("Fallo en Guionista"); }
}

// ------------------------------------------------------------------
// FASE 2A: EL DISEÑADOR (Con Tono del Codex)
// ------------------------------------------------------------------
async function phase2A_CharacterDesigner(userIdea, masterScript, codex) {
    const prompt = `
        Diseña personajes para: "${masterScript.synopsis}".
        REGLAS DEL MUNDO: ${codex ? JSON.stringify(codex.axioms) : 'Ninguna'}.
        TONO: ${codex ? codex.tone : 'Neutro'}.
        
        JSON Array: [{ "name": "...", "role": "...", "goal": "...", "fear": "..." }]
    `;
    try {
        const res = await callGoogleAPI(prompt, "Diseñando...");
        const data = cleanAndParseJSON(res);
        return Array.isArray(data) ? data : (data.characters || []);
    } catch (e) { return []; }
}

// ------------------------------------------------------------------
// FASE 2B: EL ARQUITECTO (Con Lógica del Codex)
// ------------------------------------------------------------------

async function phase2B_PlaceArchitect(target, userIdea, richContext, masterScript) {
    const isExisting = target.type === 'EXISTING';
    const placeInfo = isExisting 
        ? (richContext.places.find(p => p.id === target.id) || { name: "Carril Existente" }) 
        : { name: target.name || "Nuevo Carril" };

    const codex = richContext.codex;

    const prompt = `
        Eres EL ARQUITECTO DE ESCENAS.
        Lugar/Carril: ${placeInfo.name}.
        
        LEYES FÍSICAS Y MÁGICAS:
        ${codex.magicSystem || "Estándar"}
        AXIOMAS: ${JSON.stringify(codex.axioms || [])}
        
        UBICACIONES GEOGRÁFICAS VÁLIDAS:
        ${JSON.stringify(richContext.mapPois)}
        
        GUION: ${JSON.stringify(masterScript.globalBeats)}
        
        TAREA:
        Genera eventos JSON que cumplan las Leyes Físicas y Mágicas definidas.
        Usa "mapLocation" si corresponde.

        FORMATO JSON:
        {
            "id": "${isExisting ? placeInfo.id : 'GEN_' + Date.now()}",
            "isNew": ${!isExisting},
            "name": "${placeInfo.name}",
            "color": "#random",
            "newEvents": [
                {
                    "k": number,
                    "title": "Título",
                    "desc": "Descripción detallada y coherente con el sistema de magia.",
                    "mapLocation": "Nombre Del POI (o null)", 
                    "characterRefs": ["Nombre"]
                }
            ]
        }
    `;

    try {
        const res = await callGoogleAPI(prompt, `Escenas para ${placeInfo.name}`);
        return cleanAndParseJSON(res);
    } catch (e) { return null; }
}