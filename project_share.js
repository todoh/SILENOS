// --- PROJECT SHARE (Hub de Sincronización P2P en Tiempo Real) v6.2 (Atomized Fix) ---
import { getUniversalDataSnapshot, importDataSnapshot, STORAGE_KEYS } from './project_core.js';

console.log("Project Share Module Cargado (v6.2 - Atomized Fix)");

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

export function setSyncState(enabled) {
    isSyncEnabled = enabled;
    console.log(`📡 Estado de Sincronización: ${enabled ? 'ACTIVO' : 'INACTIVO'}`);
    
    const syncPill = document.getElementById('status-pill-sync');
    if (syncPill) {
        if (enabled) syncPill.classList.add('active');
        else syncPill.classList.remove('active');
    }
}

export async function sendProjectData(dataChannel) {
    if (!dataChannel || dataChannel.readyState !== 'open') return alert("Error de conexión P2P.");
    registerDataChannel(dataChannel);
    
    setSyncState(true);
    
    // RECONSTRUCCIÓN DEL SNAPSHOT COMPLETO PARA ENVÍO
    // Como ahora todo está separado, lo juntamos solo para la transferencia P2P inicial
    const fullPackage = {
        type: 'full_sync_package',
        dataSnapshot: getUniversalDataSnapshot(), // Worldbuilding y nombre proyecto
        books: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS)) || [],
        scripts: JSON.parse(localStorage.getItem(STORAGE_KEYS.SCRIPTS)) || [],
        games: JSON.parse(localStorage.getItem(STORAGE_KEYS.GAMES)) || []
    };

    const jsonStr = JSON.stringify(fullPackage);
    
    updateOverlay(true, "Enviando entorno completo...");
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
    if (isRemoteUpdate) return; 
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
            const packageObj = JSON.parse(fullStr);
            
            // PROCESAR PAQUETE ATOMIZADO
            processIncomingPackage(packageObj);

            isReceivingFile = false;
            updateOverlay(false);
        }
        else if (msg.type === 'SYNC_UPDATE') {
            handleRealTimeUpdate(msg.action, msg.payload);
        }
    } catch (e) { console.error("Error P2P:", e); }
}

function processIncomingPackage(pkg) {
    try {
        // 1. Datos del Universo (Worldbuilding)
        if (pkg.dataSnapshot) {
            importDataSnapshot(pkg.dataSnapshot);
        }
        // 2. Colecciones (Libros, Guiones, Juegos)
        if (pkg.books) localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(pkg.books));
        if (pkg.scripts) localStorage.setItem(STORAGE_KEYS.SCRIPTS, JSON.stringify(pkg.scripts));
        if (pkg.games) localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(pkg.games));

        if (activeDataChannel) registerDataChannel(activeDataChannel);
        setSyncState(true);
        
        alert("Entorno sincronizado. ¡Edición colaborativa activada!");
        
        // Refrescar Vistas
        if (window.renderCards) window.renderCards();
        if (window.renderBookList) window.renderBookList();
        if (window.renderScriptList) window.renderScriptList();
        if (window.renderGameList) window.renderGameList();
        if (window.loadUniverseName) window.loadUniverseName();

    } catch (e) {
        console.error("Error procesando paquete:", e);
        alert("Error al integrar los datos recibidos.");
    }
}

function handleRealTimeUpdate(action, payload) {
    isRemoteUpdate = true; 
    try {
        switch (action) {
            case 'PROJECT_NAME_UPDATE':
                 if (window.applyRemoteDataUpdate) window.applyRemoteDataUpdate(action, payload);
                 break;

            case 'GAME_CREATE': case 'GAME_DELETE': case 'GAME_UPDATE':
            case 'GAME_NODE_MOVE': case 'GAME_NODE_DATA':
            case 'GAME_NODE_CREATE': case 'GAME_NODE_DELETE': case 'GAME_CONNECTION':
                if (window.applyRemoteGameUpdate) window.applyRemoteGameUpdate(action, payload);
                break;
            
            case 'DATA_CARD_UPDATE': case 'DATA_CARD_CREATE': case 'DATA_CARD_DELETE':
                if (window.applyRemoteDataUpdate) window.applyRemoteDataUpdate(action, payload);
                break;

            case 'BOOK_CREATE': case 'BOOK_UPDATE': case 'BOOK_DELETE':
                if (window.applyRemoteBookUpdate) window.applyRemoteBookUpdate(action, payload);
                break;

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