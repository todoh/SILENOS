// SILENOS/librojuego_ui.js
// --- LÓGICA LIBRO-JUEGO UI v3.5 (Quick Export UI) ---
import { broadcastSync, isRemoteUpdate } from './project_share.js'; 
import { loadFileContent } from './drive_api.js'; 

console.log("Sistema Gamebook Visual Cargado (v3.5 - Quick Export UI)");

let games = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
let currentGameId = null;

// Variables de Drag
let isDraggingNode = false;
let draggedNodeId = null;
let initialMouseX = 0;
let initialMouseY = 0;
let initialNodeX = 0;
let initialNodeY = 0;

// DOM References
const gameListView = document.getElementById('game-list-view');
const gameEditorView = document.getElementById('game-editor-view');
const gamesContainer = document.getElementById('games-container');
const gameMainTitleInput = document.getElementById('game-main-title');
const nodesContainer = document.getElementById('gb-nodes-container');
const svgLayer = document.getElementById('gb-connections-layer');
const editorModal = document.getElementById('gb-editor-modal');

const inputTitle = document.getElementById('gb-node-title');
const inputText = document.getElementById('gb-node-text');
const inputIsStart = document.getElementById('gb-is-start');
const choicesList = document.getElementById('gb-choices-list');
const nodeIdDisplay = document.getElementById('gb-node-id');

if (gamesContainer) {
    checkAndMigrateLegacy();
    renderGameList();
    
    editorModal.addEventListener('click', (e) => {
        if (e.target === editorModal) closeNodeEditor();
    });

    document.addEventListener('mousemove', onGlobalMouseMove);
    document.addEventListener('mouseup', onGlobalDragEnd);
    document.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', onGlobalDragEnd);
}

function checkAndMigrateLegacy() {
    const legacyNodes = localStorage.getItem('minimal_gamebook_nodes');
    if (legacyNodes) {
        try {
            const nodes = JSON.parse(legacyNodes);
            if (nodes.length > 0) {
                const migratedGame = { id: Date.now(), title: "Juego Migrado (Legacy)", nodes: nodes };
                games.push(migratedGame);
                saveAllGames();
                localStorage.removeItem('minimal_gamebook_nodes');
            }
        } catch (e) {}
    }
}

function saveAllGames() {
    try {
        localStorage.setItem('minimal_games_v1', JSON.stringify(games));
    } catch (e) {
        console.warn("Espacio lleno");
    }
}

// --- GESTIÓN LISTA ---

function renderGameList() {
    games = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
    if (!gamesContainer) return;
    gamesContainer.innerHTML = '';

    if (games.length === 0) {
        gamesContainer.innerHTML = '<div style="text-align:center; padding: 40px; color:#ccc;">No hay juegos.</div>';
        return;
    }

    games.slice().reverse().forEach(game => {
        const item = document.createElement('div');
        item.className = 'book-item'; 
        item.style.position = 'relative'; 
        
        const isCloud = game.isPlaceholder;
        const cloudIcon = isCloud ? '<span style="font-size:0.8rem; margin-right:5px;">☁️</span>' : '';
        
        item.onclick = function() { openGame(game.id); };
        
        const nodeCount = isCloud ? '?' : (game.nodes ? game.nodes.length : 0);
        const metaText = isCloud ? 'En Nube' : `${nodeCount} Escenas`;

        item.innerHTML = `
            <div class="book-info" style="pointer-events: none; padding-right: 60px;"> 
                <div class="book-title">${cloudIcon}${game.title || 'Juego Sin Título'}</div>
                <div class="book-meta">${metaText}</div>
            </div>
             <div class="quick-export-bar">
                <span class="export-badge" onclick="event.stopPropagation(); window.quickExport('game', ${game.id}, 'html')" title="Descargar HTML">HTML</span>
                <span class="export-badge" onclick="event.stopPropagation(); window.quickExport('game', ${game.id}, 'doc')" title="Descargar DOC">DOC</span>
                <span class="export-badge" onclick="event.stopPropagation(); window.quickExport('game', ${game.id}, 'txt')" title="Descargar TXT">TXT</span>
            </div>
        `;
        gamesContainer.appendChild(item);
    });
}

function createNewGame() {
    if (isRemoteUpdate) return; 

    const newGame = { id: Date.now(), title: "Nuevo Juego", nodes: [] };
    games.push(newGame);
    saveAllGames();
    renderGameList();
    openGame(newGame.id);
    
    broadcastSync('GAME_CREATE', newGame);
    createNewNode(); 
}

async function openGame(id) {
    games = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
    let game = games.find(g => g.id === id);
    if (!game) return;

    if (game.isPlaceholder) {
        console.log(`☁️ Descargando juego: ${game.title}`);
        
        gameListView.style.display = 'none';
        gameEditorView.style.display = 'block';
        gameMainTitleInput.value = "Descargando...";
        nodesContainer.innerHTML = '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#aaa;">Obteniendo nodos...</div>';

        try {
            const fullData = await loadFileContent(game.driveFileId);
            if (!fullData) throw new Error("Datos vacíos o error de red");

            const driveId = game.driveFileId;
            Object.assign(game, fullData);
            
            game.driveFileId = driveId;
            delete game.isPlaceholder;

            saveAllGames();
            
            id = game.id;

        } catch (e) {
            alert("Error al descargar el juego: " + e.message);
            goBackToGames();
            return;
        }
    }

    currentGameId = id;
    
    gameListView.style.display = 'none';
    gameEditorView.style.display = 'block';
    gameMainTitleInput.value = game.title;
    
    ensureCoordinates(game.nodes);
    renderGraph();
    if (window.centerCanvas) window.centerCanvas();
}

function goBackToGames() {
    currentGameId = null;
    gameEditorView.style.display = 'none';
    gameListView.style.display = 'block';
    renderGameList();
}

function deleteCurrentGame() {
    if (isRemoteUpdate) return;

    if (confirm("¿Eliminar este juego?")) {
        const idToDelete = currentGameId;
        games = games.filter(g => g.id !== currentGameId);
        saveAllGames();
        goBackToGames();

        broadcastSync('GAME_DELETE', { id: idToDelete });
    }
}

function updateGameTitle() {
    if (isRemoteUpdate) return;

    const game = games.find(g => g.id === currentGameId);
    if (game) {
        game.title = gameMainTitleInput.value;
        saveAllGames();
        broadcastSync('GAME_UPDATE', game);
    }
}

function getCurrentNodes() {
    if (!currentGameId) return [];
    const game = games.find(g => g.id === currentGameId);
    return game ? game.nodes : [];
}

function ensureCoordinates(nodes) {
    if (!nodes) return;
    nodes.forEach((node, index) => {
        if (typeof node.x === 'undefined') {
            node.x = 100 + (index * 120) % 800;
            node.y = 100 + Math.floor(index / 7) * 120;
        }
    });
}

function renderGraph() {
    const nodes = getCurrentNodes();
    nodesContainer.innerHTML = '';
    svgLayer.innerHTML = '';
    
    if (!nodes) return;

    drawConnections(nodes);

    nodes.forEach(node => {
        const el = document.createElement('div');
        el.className = `gb-node-circle ${node.isStart ? 'is-start' : ''}`;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
        el.dataset.id = node.id; 
        el.innerHTML = `<span>${node.title || 'Vacío'}</span>`;
        
        el.addEventListener('mousedown', (e) => { e.stopPropagation(); startDrag(e, node); });
        el.addEventListener('touchstart', (e) => { e.stopPropagation(); startDrag(e, node); }, { passive: false });
        el.addEventListener('click', (e) => { if (!isDraggingNode) openNode(node.id); });

        nodesContainer.appendChild(el);
    });
}

function drawConnections(nodes) {
    nodes.forEach(sourceNode => {
        if (sourceNode.choices && sourceNode.choices.length > 0) {
            sourceNode.choices.forEach(choice => {
                const targetNode = nodes.find(n => n.id == choice.targetId);
                if (targetNode) createSvgLine(sourceNode, targetNode);
            });
        }
    });
}

function createSvgLine(n1, n2) {
    const x1 = n1.x + 45; const y1 = n1.y + 45;
    const x2 = n2.x + 45; const y2 = n2.y + 45;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('class', 'connection-line');
    svgLayer.appendChild(line);
}

function startDrag(e, node) {
    isDraggingNode = false; 
    draggedNodeId = node.id;
    if (e.touches && e.touches.length > 0) {
        initialMouseX = e.touches[0].clientX; initialMouseY = e.touches[0].clientY;
    } else {
        initialMouseX = e.clientX; initialMouseY = e.clientY;
    }
    initialNodeX = node.x; initialNodeY = node.y;
}

function handleDragMove(clientX, clientY) {
    if (draggedNodeId !== null) {
        if (Math.abs(clientX - initialMouseX) > 5 || Math.abs(clientY - initialMouseY) > 5) {
            isDraggingNode = true;
        }
        if (isDraggingNode) {
            const nodes = getCurrentNodes();
            const node = nodes.find(n => n.id === draggedNodeId);
            
            let currentScale = 1;
            if (window.gamebookControls && window.gamebookControls.getCameraState) {
                currentScale = window.gamebookControls.getCameraState().scale;
            }

            const deltaX = (clientX - initialMouseX) / currentScale;
            const deltaY = (clientY - initialMouseY) / currentScale;

            node.x = initialNodeX + deltaX;
            node.y = initialNodeY + deltaY;

            const el = document.querySelector(`.gb-node-circle[data-id="${draggedNodeId}"]`);
            if (el) { el.style.left = `${node.x}px`; el.style.top = `${node.y}px`; }
            svgLayer.innerHTML = ''; 
            drawConnections(nodes);
        }
    }
}

function onGlobalMouseMove(e) { if (draggedNodeId !== null) { e.preventDefault(); handleDragMove(e.clientX, e.clientY); } }
function onGlobalTouchMove(e) { if (draggedNodeId !== null) { e.preventDefault(); handleDragMove(e.touches[0].clientX, e.touches[0].clientY); } }

function onGlobalDragEnd(e) {
    if (draggedNodeId !== null) {
        if (isDraggingNode) {
            saveAllGames(); 
            const nodes = getCurrentNodes();
            const node = nodes.find(n => n.id === draggedNodeId);
            
            broadcastSync('GAME_NODE_MOVE', { 
                gameId: currentGameId, 
                nodeId: node.id, 
                x: node.x, 
                y: node.y 
            });

            setTimeout(() => { 
                isDraggingNode = false; draggedNodeId = null; renderGraph(); 
            }, 50);
        } else {
            draggedNodeId = null;
        }
    }
}

let editingNodeId = null;

function createNewNode() {
    const nodes = getCurrentNodes();
    let spawnX = 400; let spawnY = 300;
    
    if (window.gamebookControls && window.gamebookControls.getCameraState) {
        const cam = window.gamebookControls.getCameraState();
        spawnX = -cam.x / cam.scale + 400; spawnY = -cam.y / cam.scale + 300;
    }

    const newNode = {
        id: Date.now(),
        title: "Nueva Escena",
        text: "",
        x: spawnX,
        y: spawnY,
        choices: [],
        isStart: nodes.length === 0
    };
    nodes.push(newNode);
    saveAllGames();
    renderGraph();

    broadcastSync('GAME_NODE_CREATE', { gameId: currentGameId, node: newNode });
}

function openNode(id) {
    editingNodeId = id;
    const nodes = getCurrentNodes();
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    editorModal.classList.add('active');
    editorModal.style.display = 'flex';

    inputTitle.value = node.title;
    inputText.value = node.text || "";
    inputIsStart.checked = node.isStart;
    nodeIdDisplay.textContent = "#" + node.id.toString().slice(-3);
    
    renderChoicesEditor();
}

function closeNodeEditor() {
    editorModal.classList.remove('active');
    setTimeout(() => {
        editorModal.style.display = 'none';
        renderGraph();
    }, 200);
}

function updateNodeData() {
    if (!editingNodeId) return;
    const nodes = getCurrentNodes();
    const node = nodes.find(n => n.id === editingNodeId);
    
    if (isRemoteUpdate) return; 

    node.title = inputTitle.value;
    node.text = inputText.value;
    
    if (inputIsStart.checked) {
        nodes.forEach(n => n.isStart = false);
        node.isStart = true;
    } else {
        node.isStart = false;
    }
    saveAllGames();

    const elText = document.querySelector(`.gb-node-circle[data-id="${node.id}"] span`);
    if(elText) elText.textContent = node.title;

    broadcastSync('GAME_NODE_DATA', { 
        gameId: currentGameId, 
        nodeId: node.id, 
        title: node.title, 
        text: node.text,
        isStart: node.isStart 
    });
}

function deleteCurrentNode() {
    if (confirm("¿Borrar este nodo?")) {
        const game = games.find(g => g.id === currentGameId);
        game.nodes = game.nodes.filter(n => n.id !== editingNodeId);
        game.nodes.forEach(n => {
            n.choices = n.choices.filter(c => c.targetId != editingNodeId); 
        });
        saveAllGames();
        
        broadcastSync('GAME_NODE_DELETE', { gameId: currentGameId, nodeId: editingNodeId });

        closeNodeEditor();
        renderGraph();
    }
}

function renderChoicesEditor() {
    choicesList.innerHTML = '';
    const nodes = getCurrentNodes();
    const node = nodes.find(n => n.id === editingNodeId);
    
    node.choices.forEach((choice, index) => {
        const row = document.createElement('div');
        row.className = 'gb-choice-item';
        row.innerHTML = `
            <input class="gb-choice-text" value="${choice.text}" placeholder="Opción..." oninput="updateChoice(${index}, 'text', this.value)">
            <select class="gb-choice-target" onchange="updateChoice(${index}, 'targetId', this.value)">
                <option value="">Destino...</option>
                ${nodes.map(n => `<option value="${n.id}" ${n.id == choice.targetId ? 'selected' : ''}>${n.title}</option>`).join('')}
            </select>
            <button class="btn-icon danger" onclick="deleteChoice(${index})">×</button>
        `;
        choicesList.appendChild(row);
    });
}

function addChoice() {
    const nodes = getCurrentNodes();
    const node = nodes.find(n => n.id === editingNodeId);
    node.choices.push({ text: "", targetId: "" });
    saveAllGames();
    renderChoicesEditor();
    
    broadcastSync('GAME_CONNECTION', { gameId: currentGameId, nodeId: node.id, choices: node.choices });
}

function updateChoice(index, field, val) {
    const nodes = getCurrentNodes();
    const node = nodes.find(n => n.id === editingNodeId);
    node.choices[index][field] = val;
    saveAllGames();
    
    broadcastSync('GAME_CONNECTION', { gameId: currentGameId, nodeId: node.id, choices: node.choices });
}

function deleteChoice(index) {
    const nodes = getCurrentNodes();
    const node = nodes.find(n => n.id === editingNodeId);
    node.choices.splice(index, 1);
    saveAllGames();
    renderChoicesEditor();

    broadcastSync('GAME_CONNECTION', { gameId: currentGameId, nodeId: node.id, choices: node.choices });
}

window.applyRemoteGameUpdate = function(action, payload) {
    games = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
    
    if (action === 'GAME_CREATE') {
        if (!games.find(g => g.id === payload.id)) {
            games.push(payload);
            saveAllGames();
            renderGameList();
        }
        return;
    }
    else if (action === 'GAME_DELETE') {
        games = games.filter(g => g.id !== payload.id);
        saveAllGames();
        if (currentGameId === payload.id) goBackToGames();
        renderGameList();
        return;
    }
    else if (action === 'GAME_UPDATE') {
        const index = games.findIndex(g => g.id === payload.id);
        if (index !== -1) {
            games[index].title = payload.title; 
            saveAllGames();
            if (currentGameId === payload.id) {
                if (gameMainTitleInput) gameMainTitleInput.value = payload.title;
            }
            renderGameList();
        }
        return;
    }

    const game = games.find(g => g.id === payload.gameId);
    if (!game) return; 

    if (action === 'GAME_NODE_MOVE') {
        const node = game.nodes.find(n => n.id === payload.nodeId);
        if (node) {
            node.x = payload.x;
            node.y = payload.y;
            if (currentGameId === payload.gameId) {
                const el = document.querySelector(`.gb-node-circle[data-id="${payload.nodeId}"]`);
                if (el) {
                    el.style.left = `${node.x}px`;
                    el.style.top = `${node.y}px`;
                    const currentNodes = getCurrentNodes();
                    const svgLayer = document.getElementById('gb-connections-layer');
                    if(svgLayer) { svgLayer.innerHTML = ''; drawConnections(currentNodes); }
                }
            }
        }
    }
    
    else if (action === 'GAME_NODE_DATA') {
        const node = game.nodes.find(n => n.id === payload.nodeId);
        if (node) {
            node.title = payload.title;
            node.text = payload.text;
            node.isStart = payload.isStart;
            
            if (currentGameId === payload.gameId) {
                const elText = document.querySelector(`.gb-node-circle[data-id="${payload.nodeId}"] span`);
                if(elText) elText.textContent = node.title;
                
                if (editingNodeId === payload.nodeId) {
                    const inpT = document.getElementById('gb-node-title');
                    const inpTx = document.getElementById('gb-node-text');
                    if(inpT) inpT.value = node.title;
                    if(inpTx) inpTx.value = node.text;
                }
            }
        }
    }

    else if (action === 'GAME_NODE_CREATE') {
        if (!game.nodes.find(n => n.id === payload.node.id)) {
            game.nodes.push(payload.node);
            if (currentGameId === payload.gameId) renderGraph();
        }
    }

    else if (action === 'GAME_NODE_DELETE') {
        game.nodes = game.nodes.filter(n => n.id !== payload.nodeId);
        game.nodes.forEach(n => {
            n.choices = n.choices.filter(c => c.targetId != payload.nodeId); 
        });
        if (currentGameId === payload.gameId) {
            if (editingNodeId === payload.nodeId) closeNodeEditor();
            renderGraph();
        }
    }

    else if (action === 'GAME_CONNECTION') {
        const node = game.nodes.find(n => n.id === payload.nodeId);
        if (node) {
            node.choices = payload.choices;
            if (currentGameId === payload.gameId) {
                renderGraph();
                if (editingNodeId === payload.nodeId) renderChoicesEditor();
            }
        }
    }

    saveAllGames();
};

window.createNewNode = createNewNode;
window.closeNodeEditor = closeNodeEditor;
window.updateNodeData = updateNodeData;
window.deleteCurrentNode = deleteCurrentNode;
window.addChoice = addChoice;
window.updateChoice = updateChoice;
window.deleteChoice = deleteChoice;
window.createNewGame = createNewGame;
window.openGame = openGame;
window.goBackToGames = goBackToGames;
window.deleteCurrentGame = deleteCurrentGame;
window.updateGameTitle = updateGameTitle;
window.getCurrentGameNodes = getCurrentNodes;
window.renderGameList = renderGameList;