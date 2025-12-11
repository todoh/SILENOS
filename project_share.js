// --- PROJECT SHARE (Hub de Sincronización P2P en Tiempo Real) ---
import { getProjectSnapshot, importProjectSnapshot } from './project_core.js';

console.log("Project Share Module Cargado (v6.1 - Router Updated)");

const CHUNK_SIZE = 16384; 
let receivedChunks = [];
let isReceivingFile = false;
let activeDataChannel = null;
export let isRemoteUpdate = false; 

// ESTADO DE SINCRONIZACIÓN
let isSyncEnabled = false; 

export function registerDataChannel(channel) {
    activeDataChannel = channel;
    console.log("🔗 Canal P2P Registrado");
}

// Activar/Desactivar Sincronización explícitamente y controlar indicador visual
export function setSyncState(enabled) {
    isSyncEnabled = enabled;
    console.log(`📡 Estado de Sincronización: ${enabled ? 'ACTIVO' : 'INACTIVO'}`);
    
    // Actualizar UI del icono flotante
    const syncPill = document.getElementById('status-pill-sync');
    if (syncPill) {
        if (enabled) syncPill.classList.add('active');
        else syncPill.classList.remove('active');
    }
}

export async function sendProjectData(dataChannel) {
    if (!dataChannel || dataChannel.readyState !== 'open') return alert("Error de conexión P2P.");
    registerDataChannel(dataChannel);
    
    // Al iniciar un envío masivo, ACTIVAMOS el estado de sync
    setSyncState(true);
    
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
    // 1. Si viene de remoto, NO reenviar (eco)
    if (isRemoteUpdate) return; 
    
    // 2. IMPORTANTE: Si la sincronización no está activa explícitamente, NO enviar nada.
    if (!isSyncEnabled) return;

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
                setSyncState(true); // Activar modo sync tras recibir datos
                
                alert("Entorno sincronizado. ¡Edición colaborativa activada!");
                // Recargar todas las vistas visualmente
                if (window.renderCards) window.renderCards();
                if (window.renderBookList) window.renderBookList();
                if (window.renderScriptList) window.renderScriptList();
                if (window.renderGameList) window.renderGameList();
                if (window.loadUniverseName) window.loadUniverseName(); // Recargar nombre proyecto
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
        switch (action) {
            // --- NOMBRE DEL PROYECTO ---
            case 'PROJECT_NAME_UPDATE':
                 if (window.applyRemoteDataUpdate) window.applyRemoteDataUpdate(action, payload);
                 break;

            // --- JUEGOS ---
            case 'GAME_CREATE': case 'GAME_DELETE': case 'GAME_UPDATE':
            case 'GAME_NODE_MOVE': case 'GAME_NODE_DATA':
            case 'GAME_NODE_CREATE': case 'GAME_NODE_DELETE': case 'GAME_CONNECTION':
                if (window.applyRemoteGameUpdate) window.applyRemoteGameUpdate(action, payload);
                break;
            
            // --- DATOS ---
            case 'DATA_CARD_UPDATE': case 'DATA_CARD_CREATE': case 'DATA_CARD_DELETE':
                if (window.applyRemoteDataUpdate) window.applyRemoteDataUpdate(action, payload);
                break;

            // --- LIBROS ---
            case 'BOOK_CREATE': case 'BOOK_UPDATE': case 'BOOK_DELETE':
                if (window.applyRemoteBookUpdate) window.applyRemoteBookUpdate(action, payload);
                break;

            // --- GUIONES ---
            case 'SCRIPT_CREATE': case 'SCRIPT_UPDATE': case 'SCRIPT_DELETE':
                if (window.applyRemoteScriptUpdate) window.applyRemoteScriptUpdate(action, payload);
                break;
        }
    } catch (e) { console.error("Sync Error:", e); }
    
    setTimeout(() => { isRemoteUpdate = false; }, 50);
}

function updateOverlay(show, text) {
    const overlay = document.getElementById('transfer-overlay');
    const status = document.getElementById('transfer-status');
    if (!overlay || !status) return; 
    if (show) { overlay.style.display = 'flex'; if (text) status.textContent = text; } 
    else { overlay.style.display = 'none'; }
}