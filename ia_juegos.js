// --- IA: GENERADOR DE JUEGOS NARRATIVOS (Estructura Ramificada Pura) ---
import { getApiKeysList } from './apikey.js';
import { callGoogleAPI, cleanAndParseJSON, delay } from './ia_koreh.js';

console.log("Módulo IA Juegos Cargado (Arquitecto de Finales v2.1 - Conexiones Robustas)");

const promptInput = document.getElementById('ia-game-prompt');
const metricInput = document.getElementById('ia-game-metric'); // Ej: Honor, Supervivencia
const useDataCheck = document.getElementById('ia-game-use-data');
const btnGen = document.getElementById('btn-gen-game');
const progressContainer = document.getElementById('game-progress');

// Event Listener
if (btnGen) {
    btnGen.addEventListener('click', startStoryGeneration);
}

// --- UI HELPERS ---
function updateProgress(percent, text) {
    if(!progressContainer) return;
    const fill = progressContainer.querySelector('.progress-fill');
    const textEl = progressContainer.querySelector('.progress-text');
    const percentEl = progressContainer.querySelector('.progress-percent');
    
    if(fill) fill.style.width = `${percent}%`;
    if(textEl) textEl.textContent = text;
    if(percentEl) percentEl.textContent = `${Math.floor(percent)}%`;
}

function showProgress(show) {
    if(!progressContainer) return;
    if(show) progressContainer.classList.add('active');
    else progressContainer.classList.remove('active');
}

function getUniversalData() {
    const rawData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    if (rawData.length === 0) return "";
    return rawData.map(d => `[${d.category}] ${d.title}: ${d.content}`).join('\n').substring(0, 4000);
}

// --- LÓGICA DE GENERACIÓN ---

async function startStoryGeneration() {
    const keys = await getApiKeysList();
    if (!keys || keys.length === 0) return alert("Error: No hay API Keys disponibles.");

    const topic = promptInput.value.trim();
    const metric = metricInput.value.trim() || "Puntuación Final";
    
    if (!topic) return alert("Por favor, define el tema del juego.");

    btnGen.disabled = true;
    showProgress(true);

    try {
        const universeContext = useDataCheck.checked ? getUniversalData() : "";

        // PASO 1: DISEÑO DE FINALES (0 a 100)
        updateProgress(15, "Diseñando el espectro de finales (0-100)...");
        const endings = await phaseDesignEndings(topic, metric, universeContext);
        
        // PASO 2: CONSTRUCCIÓN DEL GRAFO NARRATIVO
        updateProgress(40, "Escribiendo caminos y decisiones...");
        const gameNodes = await phaseBuildNarrative(topic, metric, endings, universeContext);

        // PASO 3: ENSAMBLAJE INTELIGENTE
        updateProgress(90, "Conectando nodos y estableciendo inicio...");
        const fullGame = assembleGame(topic, gameNodes, endings);

        saveGame(fullGame);

        updateProgress(100, "¡Juego Completado!");
        await delay(500);
        alert(`Juego "${fullGame.title}" creado con éxito.\nContiene ${fullGame.nodes.length} escenas conectadas.`);
        
        // Abrir automáticamente
        if (window.openGame) window.openGame(fullGame.id);

    } catch (e) {
        console.error(e);
        alert("Ocurrió un error: " + e.message);
    } finally {
        btnGen.disabled = false;
        setTimeout(() => showProgress(false), 3000);
    }
}

// --- FASE 1: ARQUITECTO DE FINALES ---
async function phaseDesignEndings(topic, metric, context) {
    const systemPrompt = `Eres un Maestro de Juego experto en narrativa ramificada.
    TU OBJETIVO: Definir una escala de desenlaces para una historia interactiva.
    
    TEMA: ${topic}
    MÉTRICA DE ÉXITO: ${metric} (Escala 0 a 100)
    CONTEXTO DE UNIVERSO: ${context ? "Basado en estos datos:" : "Inventa los detalles."}
    ${context}

    TAREA:
    Genera una lista de EXACTAMENTE 6 a 8 finales posibles que representen todo el espectro de éxito/fracaso.
    - El final 0 debe ser catastrófico.
    - El final 100 debe ser perfecto.
    - Los intermedios (ej: 20, 40, 60, 80) deben tener matices narrativos distintos.

    OUTPUT JSON:
    {
        "endings": [
            { "score": 0, "title": "Título del Final", "text": "Descripción narrativa del desenlace..." },
            { "score": 15, "title": "...", "text": "..." },
            ...
            { "score": 100, "title": "...", "text": "..." }
        ]
    }`;

    const raw = await callGoogleAPI(systemPrompt, "Genera los finales.", { temperature: 0.8 });
    const data = cleanAndParseJSON(raw);
    
    if (!data || !data.endings) throw new Error("La IA no pudo generar los finales.");
    return data.endings;
}

// --- FASE 2: TEJEDOR DE HISTORIAS (Weaver) ---
async function phaseBuildNarrative(topic, metric, endings, context) {
    // Convertimos los finales en un texto de referencia claro
    const endingsRef = endings.map(e => `[FINAL_ID_${e.score}]: ${e.title} (Valor: ${e.score})`).join('\n');

    const systemPrompt = `Eres un Escritor de Librojuegos (Choose Your Own Adventure).
    
    TEMA: ${topic}
    MÉTRICA: ${metric}
    
    TUS HERRAMIENTAS - LISTA DE FINALES EXISTENTES (No los crees, CONÉCTALOS):
    ${endingsRef}

    TAREA:
    Escribe los nodos narrativos (Escenas) que conecten el INICIO con esos FINALES.
    - Nodo ID 1 es el INICIO.
    - Crea una estructura ramificada interesante (10-15 nodos intermedios).
    - IMPORTANTE: Cuando una decisión lleve a un final, pon en "targetId" el VALOR del final (ej: 0, 50, 100) o el string "FINAL_ID_100".
    
    OUTPUT JSON (Estructura de grafo):
    {
        "title": "Título del juego",
        "nodes": [
            { "id": 1, "title": "Inicio", "text": "...", "choices": [{ "text": "Ir a la cueva", "targetId": 2 }, ...] },
            { "id": 2, "title": "Intermedio", "text": "...", "choices": [{ "text": "Final malo", "targetId": 0 }, {"text": "Seguir", "targetId": 3}] },
            ...
        ]
    }`;

    const userPrompt = `Genera la estructura completa. Asegúrate de que todos los caminos terminen eventualmente apuntando a uno de los IDs de los finales (0, 20, 50, 100, etc).`;

    const raw = await callGoogleAPI(systemPrompt, userPrompt, { 
        model: "gemma-3-27b-it", 
        maxOutputTokens: 8192,
        temperature: 0.7 
    });
    
    const data = cleanAndParseJSON(raw);
    if (!data || !data.nodes) throw new Error("La IA falló al construir la narrativa.");
    
    return data;
}

// --- FASE 3: ENSAMBLAJE FINAL (LÓGICA CORREGIDA) ---
function assembleGame(topic, narrativeData, endings) {
    let narrativeNodes = narrativeData.nodes;
    
    // 1. Crear los nodos finales reales con IDs altos y seguros
    // Usaremos 9000 + score para evitar conflictos con IDs normales (1, 2, 3...)
    const finalNodes = endings.map(end => {
        return {
            id: 9000 + end.score, // ID Único y predecible
            title: `FINAL: ${end.title}`,
            text: `${end.text}\n\n<strong style="color:#00bcd4">― VALORACIÓN: ${end.score} / ${metricInput.value || '100'} ―</strong>`,
            choices: [], // Sin salida
            isFinal: true
        };
    });

    // 2. RECABLEADO INTELIGENTE (Smart Rewiring)
    // Recorremos los nodos narrativos y corregimos los "targetId" que apuntan a finales
    const narrativeIds = new Set(narrativeNodes.map(n => n.id));

    narrativeNodes.forEach(node => {
        // Aseguramos que x,y existan para layout
        node.x = node.x || 0;
        node.y = node.y || 0;

        if (node.choices && node.choices.length > 0) {
            node.choices.forEach(choice => {
                let target = choice.targetId;

                // Caso A: La IA puso un string tipo "FINAL_ID_100"
                if (typeof target === 'string' && target.includes('FINAL_ID_')) {
                    const score = parseInt(target.replace(/\D/g, '')); // Extraer solo números
                    if (!isNaN(score)) {
                        choice.targetId = 9000 + score;
                    }
                }
                // Caso B: La IA puso directamente el número del score (ej: 100 o 0)
                // Si el target NO existe en los nodos narrativos Y es un número bajo (<=100), asumimos que es un final.
                else if (!narrativeIds.has(target) && target <= 100) {
                    // Buscamos el final más cercano disponible
                    // (Por si la IA puso 99 y solo tenemos final 100)
                    const closestEnd = endings.reduce((prev, curr) => {
                        return (Math.abs(curr.score - target) < Math.abs(prev.score - target) ? curr : prev);
                    });
                    choice.targetId = 9000 + closestEnd.score;
                }
            });
        }
    });

    // 3. ESTABLECER EL NODO DE INICIO (CRÍTICO)
    // Buscamos el nodo con ID 1, o el primero de la lista si no existe
    let startNode = narrativeNodes.find(n => n.id === 1);
    if (!startNode && narrativeNodes.length > 0) {
        startNode = narrativeNodes[0];
    }
    
    if (startNode) {
        // Limpiamos cualquier flag previo y marcamos este
        narrativeNodes.forEach(n => n.isStart = false);
        startNode.isStart = true;
        startNode.title = `(INICIO) ${startNode.title}`;
    }

    // 4. UNIR Y POSICIONAR VISUALMENTE
    const allNodes = [...narrativeNodes, ...finalNodes];

    // Layout automático simple (Árbol vertical)
    const levels = {}; 
    // Mapeo simple por ID para distribuir verticalmente si no hay algo mejor
    allNodes.forEach((n, i) => {
        // Si es final, lo mandamos al fondo
        if (n.id >= 9000) {
            const indexInFinals = (n.id - 9000) / 20; // Espaciado
            n.x = 200 + (indexInFinals * 250);
            n.y = 1000; // Muy abajo
        } else {
            // Nodos normales en matriz
            const col = i % 5;
            const row = Math.floor(i / 5);
            n.x = 100 + (col * 300);
            n.y = 100 + (row * 250);
        }
    });
    
    // Si tenemos al nodo start, lo ponemos arriba al centro
    if (startNode) {
        startNode.x = 600;
        startNode.y = 50;
    }

    return {
        id: Date.now(),
        title: narrativeData.title || topic,
        nodes: allNodes
    };
}

function saveGame(gameData) {
    const games = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
    games.push(gameData);
    localStorage.setItem('minimal_games_v1', JSON.stringify(games));
    
    if (window.renderGameList) window.renderGameList();
}