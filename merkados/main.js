// main.js
// --- CANVAS, EVENTOS Y RENDER LOOP ---

const canvas = document.getElementById('flowCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

window.selectedNode = null;
window.selectedConnection = null;
window.selectedNodes = new Set(); 
window.searchHighlightId = null;

let dragging = false;
let rightDragging = false;
let connectStartNode = null;
let mouse = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let rightClickStartTime = 0;
let snapToGrid = false;
const GRID = 20;

let camera = { x: 0, y: 0, zoom: 1 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let spaceHeld = false;

// Almacenamiento en caché de objetos de imagen HTML en tiempo real para evitar parpadeos en el render loop
const nodeImageCache = new Map();

function init() {
    window.addEventListener('resize', resize);
    resize();

    if (currentId && projects[currentId]) {
        handleLoadProject(currentId);
    } else {
        handleNewProject();
    }

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.oncontextmenu = (e) => e.preventDefault();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    document.getElementById('node-title').oninput = updateDataFromUI;
    document.getElementById('node-content').oninput = updateDataFromUI;
    document.getElementById('connection-label').oninput = updateDataFromUI;

    requestAnimationFrame(loop);
}

function resize() {
    const rightOffset = window.assistPanelOffset || 0;
    canvas.width = container.clientWidth - rightOffset;
    canvas.height = container.clientHeight;
}

function updateDataFromUI() {
    if (window.selectedNode) {
        window.selectedNode.title = document.getElementById('node-title').value;
        window.selectedNode.content = document.getElementById('node-content').value;
        updateWordCount();
        if (document.activeElement.id === 'node-title') {
            renderOptionsPanel(window.selectedNode);
        }
    } else if (window.selectedConnection) {
        window.selectedConnection.label = document.getElementById('connection-label').value;
    }
    saveLogic();
}

function updateWordCount() {
    const el = document.getElementById('node-word-count');
    if (!el || !window.selectedNode) return;
    const txt = window.selectedNode.content || '';
    const words = txt.split(/\s+/).filter(Boolean).length;
    el.textContent = `${words} palabras / ${txt.length} car.`;
}

function updateGrid() {
    container.style.backgroundPosition = `${camera.x}px ${camera.y}px`;
    container.style.backgroundSize = `${GRID * camera.zoom}px ${GRID * camera.zoom}px`;
}

function handleWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const worldX = (screenX - camera.x) / camera.zoom;
    const worldY = (screenY - camera.y) / camera.zoom;

    const zoomFactor = 1.1;
    if (e.deltaY < 0) camera.zoom *= zoomFactor;
    else camera.zoom /= zoomFactor;
    camera.zoom = Math.max(0.1, Math.min(camera.zoom, 5));

    camera.x = screenX - worldX * camera.zoom;
    camera.y = screenY - worldY * camera.zoom;
    updateGrid();
}

function handleKeyDown(e) {
    if (e.code === 'Space' && !isTypingInInput()) {
        spaceHeld = true;
        document.body.style.cursor = 'grab';
        e.preventDefault();
        return;
    }

    if (isTypingInInput()) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault(); redo(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && window.selectedNode) {
        e.preventDefault();
        const copy = duplicateNodeLogic(window.selectedNode.id);
        if (copy) {
            window.selectedNode = copy;
            openEditor('node', copy);
        }
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (typeof openSearch === 'function') openSearch();
        return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (window.selectedNodes && window.selectedNodes.size > 1) {
            const ids = Array.from(window.selectedNodes);
            ids.forEach(id => { if (typeof deleteMediaFromDB === 'function') deleteMediaFromDB(id); });
            data.nodes = data.nodes.filter(n => !ids.includes(n.id));
            data.connections = data.connections.filter(c => !ids.includes(c.from) && !ids.includes(c.to));
            window.selectedNodes.clear();
            saveLogic();
            closeEditor();
        } else if (window.selectedNode) {
            const targetId = window.selectedNode.id;
            if (typeof deleteMediaFromDB === 'function') deleteMediaFromDB(targetId);
            data.nodes = data.nodes.filter(n => n.id !== targetId);
            data.connections = data.connections.filter(c => c.from !== targetId && c.to !== targetId);
            closeEditor();
            saveLogic();
        } else if (window.selectedConnection) {
            const c = window.selectedConnection;
            data.connections = data.connections.filter(cc => !(cc.from === c.from && cc.to === c.to));
            closeEditor();
            saveLogic();
        }
        return;
    }
    if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        if (typeof fitToScreen === 'function') fitToScreen();
        return;
    }
    if (e.key === '0') {
        if (typeof resetZoom === 'function') resetZoom();
        return;
    }
    if (e.key.toLowerCase() === 'e' && window.selectedNode) {
        toggleEndingLogic(window.selectedNode.id);
        return;
    }
    if (e.key === 'Escape') {
        closeEditor();
        window.selectedNodes.clear();
        if (typeof closeSearch === 'function') closeSearch();
        return;
    }
}

function handleKeyUp(e) {
    if (e.code === 'Space') {
        spaceHeld = false;
        document.body.style.cursor = '';
    }
}

function isTypingInInput() {
    const t = document.activeElement?.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
        isPanning = true;
        panStart.x = screenX - camera.x;
        panStart.y = screenY - camera.y;
        document.body.style.cursor = 'grabbing';
        e.preventDefault();
        return;
    }

    mouse.x = (screenX - camera.x) / camera.zoom;
    mouse.y = (screenY - camera.y) / camera.zoom;

    const target = getTargetNodeLogic(mouse.x, mouse.y);

    if (e.button === 0) {
        const connIdx = data.connections.findIndex(c => isPointOnLineLogic(mouse.x, mouse.y, c));

        if (e.altKey && connIdx !== -1) {
            data.connections.splice(connIdx, 1);
            if (window.selectedNode) renderOptionsPanel(window.selectedNode);
            saveLogic();
            return;
        }

        if (target) {
            if (e.shiftKey) {
                if (window.selectedNodes.has(target.id)) window.selectedNodes.delete(target.id);
                else window.selectedNodes.add(target.id);
            } else {
                if (!window.selectedNodes.has(target.id)) window.selectedNodes.clear();
                window.selectedNodes.add(target.id);
            }
            window.selectedNode = target;
            window.selectedConnection = null;
            dragging = true;
            offset.x = mouse.x - target.x;
            offset.y = mouse.y - target.y;
            openEditor('node', target);
        } else if (connIdx !== -1) {
            window.selectedConnection = data.connections[connIdx];
            window.selectedNode = null;
            window.selectedNodes.clear();
            openEditor('connection', window.selectedConnection);
        } else {
            window.selectedNodes.clear();
            closeEditor();
            isPanning = true;
            panStart.x = screenX - camera.x;
            panStart.y = screenY - camera.y;
            document.body.style.cursor = 'grabbing';
        }
    }
    else if (e.button === 2) {
        rightClickStartTime = Date.now();
        if (target) {
            connectStartNode = target;
            rightDragging = true;
        }
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isPanning) {
        camera.x = screenX - panStart.x;
        camera.y = screenY - panStart.y;
        updateGrid();
        return;
    }

    mouse.x = (screenX - camera.x) / camera.zoom;
    mouse.y = (screenY - camera.y) / camera.zoom;

    if (dragging && window.selectedNode) {
        const newX = mouse.x - offset.x;
        const newY = mouse.y - offset.y;
        const dx = newX - window.selectedNode.x;
        const dy = newY - window.selectedNode.y;

        if (window.selectedNodes.size > 1) {
            window.selectedNodes.forEach(id => {
                const n = data.nodes.find(nd => nd.id === id);
                if (n) { n.x += dx; n.y += dy; }
            });
        } else {
            window.selectedNode.x = newX;
            window.selectedNode.y = newY;
        }
    }
}

function handleMouseUp(e) {
    if (isPanning) {
        isPanning = false;
        document.body.style.cursor = spaceHeld ? 'grab' : '';
        return;
    }

    if (e.button === 2) {
        const duration = Date.now() - rightClickStartTime;
        const target = getTargetNodeLogic(mouse.x, mouse.y);

        if (rightDragging && connectStartNode && target && target !== connectStartNode) {
            if (!data.connections.some(c => c.from === connectStartNode.id && c.to === target.id)) {
                data.connections.push({ from: connectStartNode.id, to: target.id, label: "" });
                if (window.selectedNode && window.selectedNode.id === connectStartNode.id) {
                    renderOptionsPanel(window.selectedNode);
                }
            }
        } else if (duration < 300 && !rightDragging) {
            if (!target) {
                const newNode = {
                    id: genId('n'), x: mouse.x - 70, y: mouse.y - 30,
                    title: "Paso " + (data.nodes.length + 1), content: "",
                    tags: [], color: null, isEnding: false, endingType: null, notes: "", image: null
                };
                data.nodes.push(newNode);
            }
        } else if (duration < 300 && target) {
            const hasContent = (target.title && target.title.trim()) || (target.content && target.content.trim()) || target.image;
            if (!hasContent || confirm(`¿Borrar el nodo "${target.title}"?`)) {
                if (typeof deleteMediaFromDB === 'function') deleteMediaFromDB(target.id);
                data.nodes = data.nodes.filter(n => n.id !== target.id);
                data.connections = data.connections.filter(c => c.from !== target.id && c.to !== target.id);
                window.selectedNodes.delete(target.id);
                if (typeof abortTask === 'function') abortTask(target.id);
                closeEditor();
            }
        }
        saveLogic();
    }

    if (dragging && e.shiftKey && window.selectedNode) {
        if (window.selectedNodes.size > 1) {
            window.selectedNodes.forEach(id => {
                const n = data.nodes.find(nd => nd.id === id);
                if (n) {
                    n.x = Math.round(n.x / GRID) * GRID;
                    n.y = Math.round(n.y / GRID) * GRID;
                }
            });
        } else {
            window.selectedNode.x = Math.round(window.selectedNode.x / GRID) * GRID;
            window.selectedNode.y = Math.round(window.selectedNode.y / GRID) * GRID;
        }
    }

    if (dragging) saveLogic();

    dragging = false;
    rightDragging = false;
    connectStartNode = null;
}

// --- RENDER LOOP OPTIMIZADO (CON FRUSTUM CULLING ANTI-CUELGUES) ---
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Límites de la pantalla mapeados al espacio del mundo virtual para descartar lo invisible
    const viewLeft = -camera.x / camera.zoom;
    const viewTop = -camera.y / camera.zoom;
    const viewRight = (canvas.width - camera.x) / camera.zoom;
    const viewBottom = (canvas.height - camera.y) / camera.zoom;

    // Indexar nodos en un mapa asociativo rápido O(1) para evitar llamadas pesadas a .find() dentro de las conexiones
    const nodesMap = {};
    const inDeg = {}, outDeg = {};
    
    data.nodes.forEach(n => { 
        nodesMap[n.id] = n;
        inDeg[n.id] = 0; 
        outDeg[n.id] = 0; 
    });

    data.connections.forEach(c => {
        if (inDeg[c.to] !== undefined) inDeg[c.to]++;
        if (outDeg[c.from] !== undefined) outDeg[c.from]++;
    });

    // 1. Renderizar conexiones
    data.connections.forEach(c => {
        const n1 = nodesMap[c.from];
        const n2 = nodesMap[c.to];
        if (!n1 || !n2) return;

        const x1 = n1.x + 140, y1 = n1.y + 30;
        const x2 = n2.x, y2 = n2.y + 30;

        // Descarte rápido de líneas completamente fuera del viewport
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        if (maxX < viewLeft || minX > viewRight || maxY < viewTop || minY > viewBottom) return;

        const isSel = window.selectedConnection === c;
        ctx.strokeStyle = isSel ? '#3b82f6' : '#000';
        ctx.lineWidth = isSel ? 2 : 1;

        const cx1 = x1 + Math.max(40, Math.abs(x2 - x1) * 0.4);
        const cx2 = x2 - Math.max(40, Math.abs(x2 - x1) * 0.4);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cx1, y1, cx2, y2, x2, y2);
        ctx.stroke();

        const angle = Math.atan2(y2 - y1, x2 - cx2);
        ctx.save();
        ctx.translate(x2, y2);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-10, -5); ctx.lineTo(0, 0); ctx.lineTo(-10, 5);
        ctx.stroke();
        ctx.restore();

        if (c.label && c.label.trim() !== "") {
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            ctx.font = '9px Inter';
            const textWidth = ctx.measureText(c.label).width;
            ctx.fillStyle = '#fff';
            ctx.fillRect(midX - textWidth/2 - 4, midY - 7, textWidth + 8, 14);
            ctx.strokeRect(midX - textWidth/2 - 4, midY - 7, textWidth + 8, 14);
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.fillText(c.label.toUpperCase(), midX, midY + 3);
            ctx.textAlign = 'start';
        }
    });

    if (rightDragging && connectStartNode) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        const sx = connectStartNode.x + 140, sy = connectStartNode.y + 30;
        const cx1 = sx + Math.max(40, Math.abs(mouse.x - sx) * 0.4);
        const cx2 = mouse.x - Math.max(40, Math.abs(mouse.x - sx) * 0.4);
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(cx1, sy, cx2, mouse.y, mouse.x, mouse.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 2. Renderizar Nodos
    data.nodes.forEach(n => {
        // FRUSTUM CULLING CRÍTICO: Si el nodo está fuera de la pantalla visible, saltárselo completamente
        // El tamaño del nodo es 140x60, añadimos un pequeño margen por las selecciones de búsqueda (3px)
        if (n.x + 145 < viewLeft || n.x - 5 > viewRight || n.y + 65 < viewTop || n.y - 5 > viewBottom) {
            return; 
        }

        const isSel = window.selectedNode === n;
        const inMulti = window.selectedNodes.has(n.id);
        const isSearchHit = window.searchHighlightId === n.id;
        const isRoot = inDeg[n.id] === 0 && outDeg[n.id] > 0;
        const isOrphan = inDeg[n.id] === 0 && outDeg[n.id] === 0;
        const isEnd = n.isEnding || (inDeg[n.id] > 0 && outDeg[n.id] === 0);

        // Dibujado del contorno de selección de búsqueda redondeado
        if (isSearchHit) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(n.x - 3, n.y - 3, 146, 66, 11);
            ctx.stroke();
        }

        if (n.color) ctx.fillStyle = n.color;
        else if (isSel) ctx.fillStyle = '#000';
        else if (n.isEnding) ctx.fillStyle = '#7f1d1d';
        else ctx.fillStyle = '#fff';
        
        // Dibujado del cuerpo principal del nodo con esquinas redondeadas de 8px (Estilo Google Material)
        ctx.beginPath();
        ctx.roundRect(n.x, n.y, 140, 60, 8);
        ctx.fill();

        // Si el nodo está seleccionado en la multi-selección, se dibuja un trazo sutil redondeado de indicación
        if (inMulti && !isSel) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (n.image && n.image !== "db_stored") {
            let cachedImg = nodeImageCache.get(n.id);
            if (!cachedImg || cachedImg.src !== n.image) {
                cachedImg = new Image();
                cachedImg.src = n.image;
                nodeImageCache.set(n.id, cachedImg);
            }
            if (cachedImg.complete) {
                ctx.save();
                ctx.globalAlpha = 1.0;
                
                // Crear máscara de recorte redondeada interna para que la imagen se adapte a las esquinas redondeadas del nodo
                ctx.beginPath();
                ctx.roundRect(n.x + 1, n.y + 1, 138, 58, 7);
                ctx.clip();
                
                const targetW = 138;
                const targetH = 58;
                let imgW = cachedImg.width;
                let imgH = cachedImg.height;
                let srcX = 0, srcY = 0;
                
                const targetRatio = targetW / targetH;
                const imgRatio = imgW / imgH;
                
                if (imgRatio > targetRatio) {
                    let newWidth = imgH * targetRatio;
                    srcX = (imgW - newWidth) / 2;
                    imgW = newWidth;
                } else {
                    let newHeight = imgW / targetRatio;
                    srcY = (imgH - newHeight) / 2;
                    imgH = newHeight;
                }
                
                ctx.drawImage(cachedImg, srcX, srcY, imgW, imgH, n.x + 1, n.y + 1, targetW, targetH);
                ctx.restore();
            }
        }

        const useDark = (isSel || n.isEnding) ? true : false;
        ctx.font = 'bold 7px Inter';
        ctx.fillStyle = useDark ? '#fff' : '#000';
        let tagX = n.x + 128; // Desplazado ligeramente hacia la izquierda debido al radio de las esquinas
        const tagY = n.y + 11;
        ctx.textAlign = 'right';
        if (isRoot) { ctx.fillText('▶ INICIO', tagX, tagY); tagX -= ctx.measureText('▶ INICIO').width + 6; }
        if (isEnd) { ctx.fillText('■ FIN', tagX, tagY); tagX -= ctx.measureText('■ FIN').width + 6; }
        if (isOrphan) { ctx.fillText('◇ HUÉRFANO', tagX, tagY); }
        ctx.textAlign = 'start';

        ctx.fillStyle = useDark ? '#fff' : '#000';
        ctx.font = 'bold 10px Inter';
        ctx.fillText((n.title || '').toUpperCase().substring(0, 18), n.x + 12, n.y + 28);

        ctx.font = '8px Inter';
        ctx.globalAlpha = 0.4;
        ctx.fillText((n.content || '').substring(0, 25) + ((n.content || '').length > 25 ? '...' : ''), n.x + 12, n.y + 48);
        ctx.globalAlpha = 1.0;

        if (typeof activeTasks !== 'undefined' && activeTasks.has(n.id)) {
            const task = activeTasks.get(n.id);
            const barY = n.y + 60 + 5; 
            
            ctx.fillStyle = '#e5e7eb';
            ctx.fillRect(n.x, barY, 140, 4);
            
            ctx.fillStyle = '#000000';
            ctx.fillRect(n.x, barY, 140 * (task.progress / 100), 4);
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(n.x, barY, 140, 4);
        }
    });

    ctx.restore();

    if (typeof renderMinimap === 'function') renderMinimap();

    requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);