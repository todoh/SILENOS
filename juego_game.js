// --- MOTOR DE JUEGO (GAME ENGINE) v2.0 ---
// F → Forma (Estructura de ejecución)
// K → Ki (Flujo de la historia)

console.log("Motor de Juego Cargado (v2.0 - Play Linked)");

let gameState = {
    currentNodeId: null,
    history: [], 
    nodes: []
};

const overlay = document.getElementById('gb-player-overlay');
const textContainer = document.getElementById('player-text');
const choicesContainer = document.getElementById('player-choices');

function initGameEngine() {
    window.togglePlayMode = togglePlayMode;
    window.resetGame = restartGame;
}

function togglePlayMode() {
    if (!overlay) return;
    if (overlay.classList.contains('hidden')) {
        startGame();
    } else {
        closeGame();
    }
}

function startGame() {
    // CAMBIO IMPORTANTE: Obtenemos los nodos del juego ACTUALMENTE abierto en el editor
    if (window.getCurrentGameNodes) {
        gameState.nodes = window.getCurrentGameNodes();
    } else {
        gameState.nodes = [];
    }
    
    if (gameState.nodes.length === 0) {
        alert("El tablero está vacío o no has abierto un juego.");
        return;
    }

    const startNode = gameState.nodes.find(n => n.isStart);
    if (!startNode) {
        alert("Falta definir un nodo de Inicio.");
        return;
    }

    gameState.history = [];
    gameState.currentNodeId = null;

    overlay.classList.remove('hidden');
    loadNode(startNode.id);
}

function closeGame() {
    overlay.classList.add('hidden');
    setTimeout(() => {
        textContainer.textContent = "";
        choicesContainer.innerHTML = "";
    }, 300);
}

function restartGame() {
    startGame();
}

function loadNode(nodeId) {
    const node = gameState.nodes.find(n => n.id == nodeId);
    if (!node) return console.error("Nodo perdido:", nodeId);

    if (gameState.currentNodeId && gameState.currentNodeId !== nodeId) {
        // Historial gestionado en click
    }

    gameState.currentNodeId = node.id;
    renderNodeContent(node);
}

function renderNodeContent(node) {
    textContainer.style.opacity = 0;
    
    setTimeout(() => {
        const titleHtml = `<div style="font-weight:bold; margin-bottom:10px; color:#00bcd4; text-transform:uppercase; font-size:0.8rem;">${node.title}</div>`;
        const contentHtml = node.text ? node.text.replace(/\n/g, '<br>') : "<i>...</i>";
        
        textContainer.innerHTML = titleHtml + contentHtml;
        textContainer.style.opacity = 1;
        renderChoices(node);
    }, 200);
}

function renderChoices(node) {
    choicesContainer.innerHTML = '';
    
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
            gameState.history.push(gameState.currentNodeId);
            loadNode(choice.targetId);
        };
        
        choicesContainer.appendChild(btn);
    });

    if (gameState.history.length > 0) {
        const backBtn = document.createElement('button');
        backBtn.className = 'gb-player-btn';
        backBtn.style.marginTop = "20px";
        backBtn.style.color = "#888";
        backBtn.style.fontSize = "0.9rem";
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
    endMsg.innerHTML = "― FIN ―";
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'gb-player-btn';
    restartBtn.style.textAlign = "center";
    restartBtn.textContent = "Reiniciar";
    restartBtn.onclick = restartGame;

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

document.addEventListener('DOMContentLoaded', initGameEngine);