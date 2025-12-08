 
// --- MOTOR DE JUEGO (GAME ENGINE) v1.0 ---
// F → Forma (Estructura de ejecución)
// K → Ki (Flujo de la historia)

console.log("Motor de Juego Cargado (v1.0 - Play Mode)");

// Estado del juego
let gameState = {
    currentNodeId: null,
    history: [], // Pila para el botón "Atrás"
    nodes: []
};

// Referencias DOM
const overlay = document.getElementById('gb-player-overlay');
const textContainer = document.getElementById('player-text');
const choicesContainer = document.getElementById('player-choices');

// --- INICIALIZACIÓN ---

function initGameEngine() {
    // Vinculamos las funciones globales que usará el botón del HTML
    window.togglePlayMode = togglePlayMode;
    window.resetGame = restartGame;
}

// --- CONTROL PRINCIPAL ---

function togglePlayMode() {
    if (!overlay) return;

    // Si está oculto, lo mostramos (START)
    if (overlay.classList.contains('hidden')) {
        startGame();
    } else {
        // Si está visible, lo ocultamos (STOP)
        closeGame();
    }
}

function startGame() {
    // 1. Cargar datos frescos
    gameState.nodes = JSON.parse(localStorage.getItem('minimal_gamebook_nodes')) || [];
    
    if (gameState.nodes.length === 0) {
        alert("El tablero está vacío (M → Material inexistente). Crea nodos primero.");
        return;
    }

    // 2. Buscar nodo de inicio
    const startNode = gameState.nodes.find(n => n.isStart);
    if (!startNode) {
        alert("No hay un nodo de Inicio definido (K → Falta dirección). Marca una casilla como 'Inicio'.");
        return;
    }

    // 3. Resetear estado
    gameState.history = [];
    gameState.currentNodeId = null;

    // 4. Mostrar UI
    overlay.classList.remove('hidden');
    
    // 5. Cargar nodo inicial
    loadNode(startNode.id);
}

function closeGame() {
    overlay.classList.add('hidden');
    // Limpiar texto para que no parpadee al volver a abrir
    setTimeout(() => {
        textContainer.textContent = "";
        choicesContainer.innerHTML = "";
    }, 300);
}

function restartGame() {
    startGame();
}

// --- LÓGICA DE NAVEGACIÓN ---

function loadNode(nodeId) {
    const node = gameState.nodes.find(n => n.id == nodeId);
    if (!node) return console.error("Nodo perdido en el vacío (X). ID:", nodeId);

    // Guardar historial si nos movemos a un nodo nuevo (y no estamos volviendo atrás)
    if (gameState.currentNodeId && gameState.currentNodeId !== nodeId) {
        // Solo guardamos si no es el mismo nodo (evitar bucles simples)
        // La gestión real de "Atrás" se hace sacando del array, aquí solo empujamos
    }

    gameState.currentNodeId = node.id;

    // A → Acción (Renderizar)
    renderNodeContent(node);
}

function renderNodeContent(node) {
    // 1. Texto (Con efecto de aparición suave si quisieras, por ahora directo)
    textContainer.style.opacity = 0;
    
    setTimeout(() => {
        // Título opcional en negrita
        const titleHtml = `<div style="font-weight:bold; margin-bottom:10px; color:#00bcd4; text-transform:uppercase; font-size:0.8rem;">${node.title}</div>`;
        
        // Convertir saltos de línea en <br>
        const contentHtml = node.text ? node.text.replace(/\n/g, '<br>') : "<i>(Sin descripción...)</i>";
        
        textContainer.innerHTML = titleHtml + contentHtml;
        textContainer.style.opacity = 1;

        // 2. Opciones
        renderChoices(node);
    }, 200);
}

function renderChoices(node) {
    choicesContainer.innerHTML = '';
    
    // Validar si es un final (L → Límite)
    const validChoices = node.choices ? node.choices.filter(c => c.targetId) : [];

    if (validChoices.length === 0) {
        renderEndGame();
        return;
    }

    validChoices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'gb-player-btn';
        btn.innerHTML = `<span style="opacity:0.7;">➤</span> ${choice.text || 'Continuar...'}`;
        
        btn.onclick = () => {
            // Guardar en historial antes de saltar
            gameState.history.push(gameState.currentNodeId);
            loadNode(choice.targetId);
        };
        
        choicesContainer.appendChild(btn);
    });

    // Botón "Atrás" (si hay historial)
    if (gameState.history.length > 0) {
        const backBtn = document.createElement('button');
        backBtn.className = 'gb-player-btn';
        backBtn.style.marginTop = "20px";
        backBtn.style.border = "1px dashed #ccc";
        backBtn.style.color = "#888";
        backBtn.innerHTML = "↶ Volver atrás";
        
        backBtn.onclick = () => {
            const prevNodeId = gameState.history.pop();
            loadNode(prevNodeId);
        };
        choicesContainer.appendChild(backBtn);
    }
}

function renderEndGame() {
    const endMsg = document.createElement('div');
    endMsg.style.padding = "20px";
    endMsg.style.textAlign = "center";
    endMsg.style.color = "#888";
    endMsg.innerHTML = "― FIN DE LA HISTORIA (Z) ―";
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'gb-player-btn';
    restartBtn.style.background = "#111";
    restartBtn.style.color = "#fff";
    restartBtn.textContent = "Reiniciar Historia";
    restartBtn.onclick = restartGame;

    // Botón Atrás también en el final
    if (gameState.history.length > 0) {
        const backBtn = document.createElement('button');
        backBtn.className = 'gb-player-btn';
        backBtn.style.marginTop = "10px";
        backBtn.innerHTML = "↶ Deshacer última elección";
        backBtn.onclick = () => {
            const prevNodeId = gameState.history.pop();
            loadNode(prevNodeId);
        };
        choicesContainer.appendChild(backBtn);
    }

    choicesContainer.appendChild(endMsg);
    choicesContainer.appendChild(restartBtn);
}

// Arrancar
document.addEventListener('DOMContentLoaded', initGameEngine);
