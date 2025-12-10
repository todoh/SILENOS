// --- PROJECT SHARE (Hub de Sincronización P2P en Tiempo Real) ---
import { getProjectSnapshot, importProjectSnapshot } from './project_core.js';

console.log("Project Share Module Cargado (Real-Time Sync v5.2 - Full Routing)");

const CHUNK_SIZE = 16384; 
let receivedChunks = [];
let isReceivingFile = false;
let activeDataChannel = null;
export let isRemoteUpdate = false; 

export function registerDataChannel(channel) {
    activeDataChannel = channel;
    console.log("🔗 Canal P2P Registrado");
}

export async function sendProjectData(dataChannel) {
    if (!dataChannel || dataChannel.readyState !== 'open') return alert("Error de conexión P2P.");
    registerDataChannel(dataChannel);
    
    const projectData = getProjectSnapshot();
    const jsonStr = JSON.stringify(projectData);
    
    updateOverlay(true, "Enviando entorno...");
    const totalSize = jsonStr.length;
    let offset = 0;
    
    try {
        dataChannel.send(JSON.stringify({ type: 'FILE_START', size: totalSize }));
        while (offset < totalSize) {
            const slice = jsonStr.slice(offset, offset + CHUNK_SIZE);
            dataChannel.send(JSON.stringify({ type: 'FILE_CHUNK', data: slice }));
            offset += CHUNK_SIZE;
            
            const percent = Math.min(100, Math.floor((offset / totalSize) * 100));
            updateOverlay(true, `Enviando ${percent}%`);
            if (dataChannel.bufferedAmount > 16000000) await new Promise(r => setTimeout(r, 50));
        }
        dataChannel.send(JSON.stringify({ type: 'FILE_END' }));
        setTimeout(() => updateOverlay(false), 1000);
    } catch (e) {
        console.error("Error envío:", e);
        updateOverlay(false);
    }
}

export function broadcastSync(action, payload) {
    // Si viene de remoto, NO reenviar (evitar bucle infinito de eco)
    if (isRemoteUpdate) return; 

    if (activeDataChannel && activeDataChannel.readyState === 'open') {
        const msg = JSON.stringify({ type: 'SYNC_UPDATE', action: action, payload: payload });
        activeDataChannel.send(msg);
    }
}

export function handleIncomingData(event) {
    try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'FILE_START') {
            receivedChunks = [];
            isReceivingFile = true;
            updateOverlay(true, "Recibiendo Datos...");
        } 
        else if (msg.type === 'FILE_CHUNK' && isReceivingFile) {
            receivedChunks.push(msg.data);
        } 
        else if (msg.type === 'FILE_END' && isReceivingFile) {
            updateOverlay(true, "Procesando...");
            const fullStr = receivedChunks.join('');
            const projectObj = JSON.parse(fullStr);
            const success = importProjectSnapshot(projectObj);
            isReceivingFile = false;
            updateOverlay(false);
            if (success) {
                if (event.target) registerDataChannel(event.target);
                alert("Entorno sincronizado. ¡Edición colaborativa activada!");
                // Recargar todas las vistas visualmente
                if (window.renderCards) window.renderCards();
                if (window.renderBookList) window.renderBookList();
                if (window.renderScriptList) window.renderScriptList();
                if (window.renderGameList) window.renderGameList();
            }
        }
        else if (msg.type === 'SYNC_UPDATE') {
            handleRealTimeUpdate(msg.action, msg.payload);
        }
    } catch (e) { console.error("Error P2P:", e); }
}

function handleRealTimeUpdate(action, payload) {
    isRemoteUpdate = true; // Bloqueo temporal para evitar re-emisión (Eco)
    try {
        // --- ROUTER DE ACCIONES ACTUALIZADO ---
        switch (action) {
            // --- JUEGOS (Estructura y Nodos) ---
            case 'GAME_CREATE':       // Nuevo juego en la lista
            case 'GAME_DELETE':       // Borrar juego de la lista
            case 'GAME_UPDATE':       // Cambio de título del juego
            case 'GAME_NODE_MOVE':    // Movimiento visual
            case 'GAME_NODE_DATA':    // Edición texto nodo
            case 'GAME_NODE_CREATE':  // Nuevo nodo
            case 'GAME_NODE_DELETE':  // Borrar nodo
            case 'GAME_CONNECTION':   // Nuevas conexiones
                if (window.applyRemoteGameUpdate) window.applyRemoteGameUpdate(action, payload);
                break;
            
            // --- DATOS (Worldbuilding) ---
            case 'DATA_CARD_UPDATE':
            case 'DATA_CARD_CREATE':
            case 'DATA_CARD_DELETE':
                if (window.applyRemoteDataUpdate) window.applyRemoteDataUpdate(action, payload);
                break;

            // --- LIBROS (Novelas) ---
            case 'BOOK_CREATE':       // Nuevo libro
            case 'BOOK_UPDATE':       // Edición contenido/título
            case 'BOOK_DELETE':       // Borrar libro
                if (window.applyRemoteBookUpdate) window.applyRemoteBookUpdate(action, payload);
                break;

            // --- GUIONES (Scripts) ---
            case 'SCRIPT_CREATE':     // Nuevo guion
            case 'SCRIPT_UPDATE':     // Edición contenido/título
            case 'SCRIPT_DELETE':     // Borrar guion
                if (window.applyRemoteScriptUpdate) window.applyRemoteScriptUpdate(action, payload);
                break;
        }
    } catch (e) { console.error("Sync Error:", e); }
    
    // Desbloquear tras un instante para permitir mis propias ediciones futuras
    setTimeout(() => { isRemoteUpdate = false; }, 50);
}

function updateOverlay(show, text) {
    const overlay = document.getElementById('transfer-overlay');
    const status = document.getElementById('transfer-status');
    if (!overlay || !status) return; 
    if (show) { overlay.style.display = 'flex'; if (text) status.textContent = text; } 
    else { overlay.style.display = 'none'; }
}