
// --- LÓGICA LIBRO-JUEGO UI v2.4 (Soporte Táctil & Mouse) ---

console.log("Sistema Gamebook Visual Cargado (v2.4 - Touch Enabled)");

let gameNodes = JSON.parse(localStorage.getItem('minimal_gamebook_nodes')) || [];
let currentNodeId = null;

// Drag variables
let isDraggingNode = false;
let draggedNodeId = null;
let initialMouseX = 0;
let initialMouseY = 0;
let initialNodeX = 0;
let initialNodeY = 0;

// DOM References
const nodesContainer = document.getElementById('gb-nodes-container');
const svgLayer = document.getElementById('gb-connections-layer');
const editorModal = document.getElementById('gb-editor-modal');

const inputTitle = document.getElementById('gb-node-title');
const inputText = document.getElementById('gb-node-text');
const inputIsStart = document.getElementById('gb-is-start');
const choicesList = document.getElementById('gb-choices-list');
const nodeIdDisplay = document.getElementById('gb-node-id');

if (nodesContainer) {
    ensureCoordinates();
    renderGraph();
    
    editorModal.addEventListener('click', (e) => {
        if (e.target === editorModal) closeNodeEditor();
    });

    // EVENTOS RATÓN (PC)
    document.addEventListener('mousemove', onGlobalMouseMove);
    document.addEventListener('mouseup', onGlobalDragEnd);

    // EVENTOS TÁCTILES (MÓVIL)
    // Passive: false es vital para poder hacer e.preventDefault() y evitar scroll
    document.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', onGlobalDragEnd);
}

function saveGameData() {
    localStorage.setItem('minimal_gamebook_nodes', JSON.stringify(gameNodes));
}

function ensureCoordinates() {
    gameNodes.forEach((node, index) => {
        if (typeof node.x === 'undefined') {
            node.x = 100 + (index * 120) % 800;
            node.y = 100 + Math.floor(index / 7) * 120;
        }
    });
}

// --- RENDERIZADO ---

function renderGraph() {
    nodesContainer.innerHTML = '';
    svgLayer.innerHTML = '';

    drawConnections();

    gameNodes.forEach(node => {
        const el = document.createElement('div');
        el.className = `gb-node-circle ${node.isStart ? 'is-start' : ''}`;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
        el.innerHTML = `<span>${node.title || 'Vacío'}</span>`;
        
        // 1. MOUSE DOWN (PC)
        el.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Evita que se mueva la cámara
            startDrag(e, node);
        });

        // 2. TOUCH START (MOVIL)
        el.addEventListener('touchstart', (e) => {
            e.stopPropagation(); // CRÍTICO: Evita que el control de cámara capture este toque
            startDrag(e, node);
        }, { passive: false });

        // 3. CLICK (Abrir Editor)
        el.addEventListener('click', (e) => {
            if (!isDraggingNode) openNode(node.id);
        });

        // En móvil el click a veces es tricky si hubo micro-arrastre, 
        // así que el touchend gestiona la limpieza, y el click nativo se dispara después.
        
        nodesContainer.appendChild(el);
    });
}

function drawConnections() {
    const nodeMap = {};
    gameNodes.forEach(n => nodeMap[n.id] = n);

    gameNodes.forEach(sourceNode => {
        if (sourceNode.choices && sourceNode.choices.length > 0) {
            sourceNode.choices.forEach(choice => {
                // Loose equality por si ID es string
                const targetNode = gameNodes.find(n => n.id == choice.targetId);
                if (targetNode) {
                    createSvgLine(sourceNode, targetNode);
                }
            });
        }
    });
}

function createSvgLine(n1, n2) {
    const x1 = n1.x + 40;
    const y1 = n1.y + 40;
    const x2 = n2.x + 40;
    const y2 = n2.y + 40;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', 'connection-line');
    svgLayer.appendChild(line);
}

// --- LÓGICA UNIFICADA DE DRAG (TOUCH & MOUSE) ---

function startDrag(e, node) {
    isDraggingNode = false; 
    draggedNodeId = node.id;
    
    // Detectar si es toque o ratón
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

// Función central que calcula el movimiento
function handleDragMove(clientX, clientY) {
    if (draggedNodeId !== null) {
        // Umbral de movimiento para diferenciar "Click" de "Drag"
        if (Math.abs(clientX - initialMouseX) > 5 || Math.abs(clientY - initialMouseY) > 5) {
            isDraggingNode = true;
        }

        if (isDraggingNode) {
            const node = gameNodes.find(n => n.id === draggedNodeId);
            
            // Compensar Zoom
            let currentScale = 1;
            if (window.gamebookControls && window.gamebookControls.getCameraState) {
                currentScale = window.gamebookControls.getCameraState().scale;
            }

            const deltaX = (clientX - initialMouseX) / currentScale;
            const deltaY = (clientY - initialMouseY) / currentScale;

            node.x = initialNodeX + deltaX;
            node.y = initialNodeY + deltaY;

            renderGraph();
        }
    }
}

// Handler PC
function onGlobalMouseMove(e) {
    if (draggedNodeId !== null) {
        e.preventDefault();
        handleDragMove(e.clientX, e.clientY);
    }
}

// Handler Móvil
function onGlobalTouchMove(e) {
    if (draggedNodeId !== null) {
        e.preventDefault(); // IMPORTANTE: Evita que la pantalla haga scroll/pull-refresh
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
}

// Handler Final (Común)
function onGlobalDragEnd(e) {
    if (draggedNodeId !== null) {
        if (isDraggingNode) {
            saveGameData();
            // Pequeño delay para que el evento 'click' no se dispare inmediatamente después de soltar
            setTimeout(() => { 
                isDraggingNode = false; 
                draggedNodeId = null; 
            }, 50);
        } else {
            draggedNodeId = null;
        }
    }
}

// --- CRUD ---

function createNewNode() {
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
        isStart: gameNodes.length === 0
    };
    gameNodes.push(newNode);
    saveGameData();
    renderGraph();
    openNode(newNode.id);
}

function openNode(id) {
    currentNodeId = id;
    const node = gameNodes.find(n => n.id === id);
    if (!node) return;

    editorModal.classList.add('active');
    editorModal.style.display = 'flex';

    inputTitle.value = node.title;
    inputText.value = node.text || "";
    inputIsStart.checked = node.isStart;
    nodeIdDisplay.textContent = "ID: " + node.id.toString().slice(-4);
    
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
    if (!currentNodeId) return;
    const node = gameNodes.find(n => n.id === currentNodeId);
    node.title = inputTitle.value;
    node.text = inputText.value;
    
    if (inputIsStart.checked) {
        gameNodes.forEach(n => n.isStart = false);
        node.isStart = true;
    } else {
        node.isStart = false;
    }
    saveGameData();
}

function deleteCurrentNode() {
    if (confirm("¿Borrar este nodo?")) {
        gameNodes = gameNodes.filter(n => n.id !== currentNodeId);
        gameNodes.forEach(n => {
            n.choices = n.choices.filter(c => c.targetId != currentNodeId); 
        });
        saveGameData();
        closeNodeEditor();
        renderGraph();
    }
}

function renderChoicesEditor() {
    choicesList.innerHTML = '';
    const node = gameNodes.find(n => n.id === currentNodeId);
    
    node.choices.forEach((choice, index) => {
        const row = document.createElement('div');
        row.className = 'gb-choice-item';
        
        row.innerHTML = `
            <input class="gb-choice-text" value="${choice.text}" placeholder="Acción..." oninput="updateChoice(${index}, 'text', this.value)">
            <select class="gb-choice-target" onchange="updateChoice(${index}, 'targetId', this.value)">
                <option value="">Destino...</option>
                ${gameNodes.map(n => `<option value="${n.id}" ${n.id == choice.targetId ? 'selected' : ''}>${n.title}</option>`).join('')}
            </select>
            <button class="btn-icon danger" onclick="deleteChoice(${index})">×</button>
        `;
        choicesList.appendChild(row);
    });
}

function addChoice() {
    const node = gameNodes.find(n => n.id === currentNodeId);
    node.choices.push({ text: "", targetId: "" });
    saveGameData();
    renderChoicesEditor();
}

function updateChoice(index, field, val) {
    const node = gameNodes.find(n => n.id === currentNodeId);
    node.choices[index][field] = val;
    saveGameData();
}

function deleteChoice(index) {
    const node = gameNodes.find(n => n.id === currentNodeId);
    node.choices.splice(index, 1);
    saveGameData();
    renderChoicesEditor();
}

// --- ORGANIZACIÓN JERÁRQUICA ---

function organizeGraph() {
    if (gameNodes.length === 0) return;

    // 1. Encontrar Inicio
    const startNode = gameNodes.find(n => n.isStart) || gameNodes[0];
    
    // 2. BFS para niveles
    const levels = {}; 
    const visited = new Set();
    const queue = [{ id: startNode.id, level: 0 }];

    visited.add(startNode.id);

    while (queue.length > 0) {
        const { id, level } = queue.shift();
        const node = gameNodes.find(n => n.id == id);
        
        if (node) {
            if (!levels[level]) levels[level] = [];
            levels[level].push(node.id);

            if (node.choices) {
                node.choices.forEach(choice => {
                    if (choice.targetId) {
                        const targetExists = gameNodes.some(n => n.id == choice.targetId);
                        if (targetExists && !visited.has(choice.targetId)) {
                            visited.add(choice.targetId);
                            queue.push({ id: choice.targetId, level: level + 1 });
                        }
                    }
                });
            }
        }
    }

    // 3. Huérfanos
    const maxLevel = Math.max(...Object.keys(levels).map(Number)) || 0;
    const visitedIds = Array.from(visited).map(id => String(id));
    const orphans = gameNodes.filter(n => !visitedIds.includes(String(n.id)));
    
    if (orphans.length > 0) {
        levels[maxLevel + 2] = orphans.map(n => n.id);
    }

    // 4. Posicionar
    const SPACING_X = 140; 
    const SPACING_Y = 180; 
    const START_Y = 100;
    const CENTER_X = 400; 

    Object.keys(levels).forEach(lvlKey => {
        const level = parseInt(lvlKey);
        const ids = levels[level];
        const rowWidth = ids.length * SPACING_X;
        const startX = CENTER_X - (rowWidth / 2) + (SPACING_X / 2); 

        ids.forEach((id, index) => {
            const node = gameNodes.find(n => n.id == id);
            if (node) {
                node.x = startX + (index * SPACING_X);
                node.y = START_Y + (level * SPACING_Y);
            }
        });
    });

    saveGameData();
    renderGraph();
    if (window.centerCanvas) window.centerCanvas();
}


// Helpers globales
window.centerCanvas = function() {
    if(window.gamebookControls) window.gamebookControls.centerCanvas();
};

window.togglePlayMode = function() {
    const overlay = document.getElementById('gb-player-overlay');
    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        const start = gameNodes.find(n => n.isStart);
        if(start) loadPlayerNode(start.id);
        else alert("Define un nodo de inicio");
    } else {
        overlay.classList.add('hidden');
    }
}

window.loadPlayerNode = function(id) {
     const node = gameNodes.find(n => n.id == id);
     if(!node) return;
     document.getElementById('player-text').textContent = node.text;
     const cont = document.getElementById('player-choices');
     cont.innerHTML = '';
     node.choices.forEach(c => {
         if(c.targetId) {
             const btn = document.createElement('button');
             btn.className = 'gb-player-btn';
             btn.textContent = c.text;
             btn.onclick = () => window.loadPlayerNode(c.targetId);
             cont.appendChild(btn);
         }
     });
}
window.resetGame = () => window.togglePlayMode();

// Exportar
window.createNewNode = createNewNode;
window.closeNodeEditor = closeNodeEditor;
window.updateNodeData = updateNodeData;
window.deleteCurrentNode = deleteCurrentNode;
window.addChoice = addChoice;
window.updateChoice = updateChoice;
window.deleteChoice = deleteChoice;
window.organizeGraph = organizeGraph; 
