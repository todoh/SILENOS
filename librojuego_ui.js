// --- LÓGICA LIBRO-JUEGO UI v3.0 (Gestor de Proyectos + Neoformismo) ---
// T → Tramo (Gestión visual optimizada)

console.log("Sistema Gamebook Visual Cargado (v3.0 - Project Manager)");

// NUEVA ESTRUCTURA DE DATOS: Lista de Juegos
let games = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
let currentGameId = null;

// Variables de Drag (Interfaz visual)
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

// --- INICIALIZACIÓN ---
if (gamesContainer) {
    // Migración simple si existía la versión anterior (un solo juego)
    checkAndMigrateLegacy();
    
    renderGameList();
    
    // Eventos del modal
    editorModal.addEventListener('click', (e) => {
        if (e.target === editorModal) closeNodeEditor();
    });

    // Eventos Ratón Globales (Para drag and drop)
    document.addEventListener('mousemove', onGlobalMouseMove);
    document.addEventListener('mouseup', onGlobalDragEnd);
    document.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', onGlobalDragEnd);
}

// --- MIGRACIÓN DE LEGADO ---
function checkAndMigrateLegacy() {
    const legacyNodes = localStorage.getItem('minimal_gamebook_nodes');
    if (legacyNodes) {
        try {
            const nodes = JSON.parse(legacyNodes);
            if (nodes.length > 0) {
                // Crear un proyecto nuevo con estos nodos
                const migratedGame = {
                    id: Date.now(),
                    title: "Juego Migrado (Legacy)",
                    nodes: nodes
                };
                games.push(migratedGame);
                saveAllGames();
                // Limpiar legacy para no repetir
                localStorage.removeItem('minimal_gamebook_nodes');
            }
        } catch (e) { console.error("Error migrando legacy", e); }
    }
}

// --- GESTIÓN DE ALMACENAMIENTO ---
function saveAllGames() {
    try {
        localStorage.setItem('minimal_games_v1', JSON.stringify(games));
    } catch (e) {
        alert("Espacio lleno. Reduce contenido.");
    }
}

// --- GESTIÓN DE LA LISTA DE JUEGOS ---

function renderGameList() {
    games = JSON.parse(localStorage.getItem('minimal_games_v1')) || [];
    
    if (!gamesContainer) return;
    gamesContainer.innerHTML = '';

    if (games.length === 0) {
        gamesContainer.innerHTML = '<div style="text-align:center; padding: 40px; color:#ccc; font-weight:300;">No hay juegos creados.</div>';
        return;
    }

    games.slice().reverse().forEach(game => {
        const item = document.createElement('div');
        item.className = 'book-item'; // Reutilizamos estilo de tarjeta
        
        item.onclick = function() { 
            openGame(game.id); 
        };

        const nodeCount = game.nodes ? game.nodes.length : 0;

        item.innerHTML = `
            <div class="book-info" style="pointer-events: none;"> 
                <div class="book-title">${game.title || 'Juego Sin Título'}</div>
                <div class="book-meta">${nodeCount} ${nodeCount === 1 ? 'Escena' : 'Escenas'}</div>
            </div>
            <div style="opacity:0.2; pointer-events: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
        `;
        gamesContainer.appendChild(item);
    });
}

function createNewGame() {
    const newGame = {
        id: Date.now(),
        title: "Nuevo Juego",
        nodes: [] // Empieza vacío
    };
    games.push(newGame);
    saveAllGames();
    renderGameList();
    openGame(newGame.id);
    
    // Crear nodo inicial automáticamente
    createNewNode(); 
}

function openGame(id) {
    currentGameId = id;
    const game = games.find(g => g.id === id);
    if (!game) return;

    // Cambiar vista
    gameListView.style.display = 'none';
    gameEditorView.style.display = 'block';

    // Cargar datos en UI
    gameMainTitleInput.value = game.title;
    
    ensureCoordinates(game.nodes);
    renderGraph();
    
    // Centrar cámara (opcional)
    if (window.gamebookControls && window.gamebookControls.centerCanvas) {
        window.gamebookControls.centerCanvas();
    }
}

function goBackToGames() {
    currentGameId = null;
    gameEditorView.style.display = 'none';
    gameListView.style.display = 'block';
    renderGameList();
}

function deleteCurrentGame() {
    if (confirm("¿Eliminar este juego completo?")) {
        games = games.filter(g => g.id !== currentGameId);
        saveAllGames();
        goBackToGames();
    }
}

function updateGameTitle() {
    const game = games.find(g => g.id === currentGameId);
    if (game) {
        game.title = gameMainTitleInput.value;
        saveAllGames();
    }
}

// --- HELPER PARA OBTENER NODOS ACTUALES ---
function getCurrentNodes() {
    if (!currentGameId) return [];
    const game = games.find(g => g.id === currentGameId);
    return game ? game.nodes : [];
}

// --- RENDERIZADO DEL GRAFO (Igual que antes pero usando getCurrentNodes) ---

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

    drawConnections(nodes);

    nodes.forEach(node => {
        const el = document.createElement('div');
        // Estilo Neoformista aplicado en CSS
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
                if (targetNode) {
                    createSvgLine(sourceNode, targetNode);
                }
            });
        }
    });
}

function createSvgLine(n1, n2) {
    const x1 = n1.x + 45; // Ajustado para nuevo tamaño (90px/2)
    const y1 = n1.y + 45;
    const x2 = n2.x + 45;
    const y2 = n2.y + 45;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', 'connection-line');
    svgLayer.appendChild(line);
}

// --- LÓGICA DE DRAG ---

function startDrag(e, node) {
    isDraggingNode = false; 
    draggedNodeId = node.id;
    
    if (e.touches && e.touches.length > 0) {
        initialMouseX = e.touches[0].clientX;
        initialMouseY = e.touches[0].clientY;
    } else {
        initialMouseX = e.clientX;
        initialMouseY = e.clientY;
    }
    initialNodeX = node.x;
    initialNodeY = node.y;
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
            if (el) {
                el.style.left = `${node.x}px`;
                el.style.top = `${node.y}px`;
            }
            svgLayer.innerHTML = ''; 
            drawConnections(nodes);
        }
    }
}

function onGlobalMouseMove(e) {
    if (draggedNodeId !== null) { e.preventDefault(); handleDragMove(e.clientX, e.clientY); }
}

function onGlobalTouchMove(e) {
    if (draggedNodeId !== null) { e.preventDefault(); handleDragMove(e.touches[0].clientX, e.touches[0].clientY); }
}

function onGlobalDragEnd(e) {
    if (draggedNodeId !== null) {
        if (isDraggingNode) {
            saveAllGames(); // Guardar cambios de posición en el juego actual
            setTimeout(() => { 
                isDraggingNode = false; 
                draggedNodeId = null; 
                renderGraph();
            }, 50);
        } else {
            draggedNodeId = null;
        }
    }
}

// --- CRUD DE NODOS (Operan sobre getCurrentNodes) ---

// Variable global interna para el nodo que se está editando
let editingNodeId = null;

function createNewNode() {
    const nodes = getCurrentNodes();
    let spawnX = 400; 
    let spawnY = 300;
    
    if (window.gamebookControls && window.gamebookControls.getCameraState) {
        const cam = window.gamebookControls.getCameraState();
        spawnX = -cam.x / cam.scale + 400; 
        spawnY = -cam.y / cam.scale + 300;
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
    
    node.title = inputTitle.value;
    node.text = inputText.value;
    
    if (inputIsStart.checked) {
        nodes.forEach(n => n.isStart = false);
        node.isStart = true;
    } else {
        node.isStart = false;
    }
    saveAllGames();
    renderGraph(); 
}

function deleteCurrentNode() {
    if (confirm("¿Borrar este nodo?")) {
        const game = games.find(g => g.id === currentGameId);
        game.nodes = game.nodes.filter(n => n.id !== editingNodeId);
        game.nodes.forEach(n => {
            n.choices = n.choices.filter(c => c.targetId != editingNodeId); 
        });
        saveAllGames();
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
            <input class="gb-choice-text" value="${choice.text}" placeholder="Texto de la opción..." oninput="updateChoice(${index}, 'text', this.value)">
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
}

function updateChoice(index, field, val) {
    const nodes = getCurrentNodes();
    const node = nodes.find(n => n.id === editingNodeId);
    node.choices[index][field] = val;
    saveAllGames();
}

function deleteChoice(index) {
    const nodes = getCurrentNodes();
    const node = nodes.find(n => n.id === editingNodeId);
    node.choices.splice(index, 1);
    saveAllGames();
    renderChoicesEditor();
}

// --- ORGANIZACIÓN JERÁRQUICA ---
function organizeGraph() {
    const nodes = getCurrentNodes();
    if (nodes.length === 0) return;

    // Lógica BFS (sin cambios significativos, solo usa 'nodes')
    const startNode = nodes.find(n => n.isStart) || nodes[0];
    const levels = {}; 
    const visited = new Set();
    const queue = [{ id: startNode.id, level: 0 }];
    visited.add(startNode.id);

    while (queue.length > 0) {
        const { id, level } = queue.shift();
        const node = nodes.find(n => n.id == id);
        if (node) {
            if (!levels[level]) levels[level] = [];
            levels[level].push(node.id);
            if (node.choices) {
                node.choices.forEach(choice => {
                    if (choice.targetId) {
                        const targetExists = nodes.some(n => n.id == choice.targetId);
                        if (targetExists && !visited.has(choice.targetId)) {
                            visited.add(choice.targetId);
                            queue.push({ id: choice.targetId, level: level + 1 });
                        }
                    }
                });
            }
        }
    }
    const maxLevel = Math.max(...Object.keys(levels).map(Number)) || 0;
    const visitedIds = Array.from(visited).map(id => String(id));
    const orphans = nodes.filter(n => !visitedIds.includes(String(n.id)));
    if (orphans.length > 0) levels[maxLevel + 2] = orphans.map(n => n.id);

    const SPACING_X = 150; // Más ancho para nodos más grandes
    const SPACING_Y = 200; 
    const START_Y = 100;
    const CENTER_X = 400; 

    Object.keys(levels).forEach(lvlKey => {
        const level = parseInt(lvlKey);
        const ids = levels[level];
        const rowWidth = ids.length * SPACING_X;
        const startX = CENTER_X - (rowWidth / 2) + (SPACING_X / 2); 
        ids.forEach((id, index) => {
            const node = nodes.find(n => n.id == id);
            if (node) {
                node.x = startX + (index * SPACING_X);
                node.y = START_Y + (level * SPACING_Y);
            }
        });
    });

    saveAllGames();
    renderGraph();
    if (window.centerCanvas) window.centerCanvas();
}
window.centerCanvas = function() {
    if (!window.gamebookControls) return;

    const nodes = getCurrentNodes();
    
    // Si no hay nodos, resetear a 0,0
    if (nodes.length === 0) {
        window.gamebookControls.resetCamera();
        return;
    }

    // Calcular la caja delimitadora (Bounding Box) de todos los nodos
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
        if (node.x < minX) minX = node.x;
        if (node.x > maxX) maxX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.y > maxY) maxY = node.y;
    });

    // Calcular el punto central de esa caja + el tamaño del nodo (90px)
    const centerX = minX + (maxX - minX) / 2 + 45;
    const centerY = minY + (maxY - minY) / 2 + 45;

    // Ordenar a los controles enfocar ese punto
    window.gamebookControls.focusPoint(centerX, centerY);
};
// EXPORTACIONES A WINDOW
window.createNewNode = createNewNode;
window.closeNodeEditor = closeNodeEditor;
window.updateNodeData = updateNodeData;
window.deleteCurrentNode = deleteCurrentNode;
window.addChoice = addChoice;
window.updateChoice = updateChoice;
window.deleteChoice = deleteChoice;
window.organizeGraph = organizeGraph;

// Nuevas exportaciones del gestor
window.createNewGame = createNewGame;
window.openGame = openGame;
window.goBackToGames = goBackToGames;
window.deleteCurrentGame = deleteCurrentGame;
window.updateGameTitle = updateGameTitle;

// Helper para juego_game.js
window.getCurrentGameNodes = getCurrentNodes;