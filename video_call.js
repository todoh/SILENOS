// --- SISTEMA DE VIDEOLLAMADA (WebRTC Pura) v4.3 ---
// Fix: Minimizar ahora libera la pantalla correctamente (pointer-events).
// Fix: Estilos de la barra minimizada ajustados.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, push, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { currentUser } from './auth_ui.js';
import { handleIncomingData, sendProjectData, registerDataChannel } from './project_share.js'; 

console.log("Módulo Video Call Cargado (v4.3 - Fixed UI)");

const firebaseConfig = {
  apiKey: "AIzaSyBxlmzjYjOEAwc_DVtFpt9DnN7XnuRkbKw",
  authDomain: "silenos-fc5e5.firebaseapp.com",
  databaseURL: "https://silenos-fc5e5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "silenos-fc5e5",
  storageBucket: "silenos-fc5e5.firebasestorage.app",
  messagingSenderId: "314671855826",
  appId: "1:314671855826:web:ea0af5cd962baa1fd6150b",
  measurementId: "G-V636CRYZ8X"
};

const app = initializeApp(firebaseConfig, "SilenosVideo");
const db = getDatabase(app); 

let localStream = null;
let remoteStream = null;
let peerConnection = null;
let dataChannel = null; 
let currentCallId = null;
let unsubscribeSignal = null;
let callTimeout = null;
let pendingProjectShare = false;

const servers = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
    ]
};

let videoModal = null;
let localVideo = null;
let remoteVideo = null;

export function initVideoSystem() {
    createVideoModalDOM();
    if (!currentUser) return;
    const myCallRef = ref(db, `users/${currentUser.uid}/incoming_call`);
    onValue(myCallRef, async (snapshot) => {
        const data = snapshot.val();
        if (data && data.type === 'offer' && !peerConnection) {
            showIncomingCallUI(data.fromName, data.fromUid, data.offer, data.isProjectShare);
        } else if (!data && peerConnection && !currentCallId) {
            endCall(false); 
        }
    });
}

// --- NOTIFICACIONES VISUALES ---
function showIncomingCallUI(name, uid, offer, isProjectShare) {
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    if (document.getElementById(`call-notif-${uid}`)) return;

    const notif = document.createElement('div');
    notif.className = 'silenos-notification';
    notif.id = `call-notif-${uid}`;
    
    const title = isProjectShare ? "📦 Sincronización P2P" : "📞 Videollamada";
    const msg = isProjectShare 
        ? `<strong>${name}</strong> quiere sincronizar proyectos.<br><span style="font-size:0.75rem; color:#d63031;">⚠️ Se sobrescribirán tus datos locales.</span>`
        : `<strong>${name}</strong> te está llamando.`;

    notif.innerHTML = `
        <div class="notif-header">${title}</div>
        <div class="notif-body">${msg}</div>
        <div class="notif-actions">
            <button class="notif-btn accept">Aceptar</button>
            <button class="notif-btn decline">Rechazar</button>
        </div>
    `;

    notif.querySelector('.accept').onclick = () => {
        notif.remove();
        acceptCall(uid, offer, isProjectShare);
    };
    notif.querySelector('.decline').onclick = () => {
        notif.remove();
        set(ref(db, `users/${currentUser.uid}/incoming_call`), null);
    };

    container.appendChild(notif);
}

// --- DOM MODAL ---
function createVideoModalDOM() {
    if (document.getElementById('video-modal')) return;
    const div = document.createElement('div');
    div.id = 'video-modal';
    div.className = 'modal-overlay';
    div.style.zIndex = '10000';
    
    // Contenido del Modal
    div.innerHTML = `
        <div class="video-container glass-container" id="video-main-container">
            <div class="video-grid" id="video-grid-area">
                <video id="remote-video" autoplay playsinline></video>
                <video id="local-video" autoplay playsinline muted></video>
                <div id="transfer-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:none; justify-content:center; align-items:center; flex-direction:column; color:white; z-index:20; backdrop-filter:blur(5px);">
                    <div style="font-size:3rem; margin-bottom:15px; animation:bounce 2s infinite;">📦</div>
                    <h3 style="margin:0;">Sincronizando...</h3>
                    <div id="transfer-status" style="margin-top:10px; font-family:monospace; color:#00bcd4; font-size:0.9rem;">Conectando...</div>
                </div>
            </div>
            <div class="video-controls">
                <div class="call-status" id="call-status-text">Conectando...</div>
                <button class="video-btn" onclick="window.toggleVideoMode()" title="Minimizar / Restaurar" style="background:rgba(255,255,255,0.1); color:white; margin-right:10px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button class="video-btn danger" onclick="window.hangUpCall()" title="Desconectar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
    
    videoModal = document.getElementById('video-modal');
    localVideo = document.getElementById('local-video');
    remoteVideo = document.getElementById('remote-video');
    
    // --- LÓGICA DE MINIMIZAR CORREGIDA ---
    window.toggleVideoMode = () => {
        const grid = document.getElementById('video-grid-area');
        const container = document.getElementById('video-main-container');
        
        if (grid.style.display === 'none') {
            // RESTAURAR (Maximizar)
            grid.style.display = 'flex';
            
            // Restaurar estilos del contenedor
            container.style.height = '80vh';
            container.style.width = '95%';
            container.style.maxWidth = '900px';
            container.style.background = '#000';
            container.style.position = 'relative'; 
            container.style.bottom = 'auto';
            container.style.right = 'auto';

            // Restaurar overlay bloqueante
            videoModal.style.background = 'rgba(242, 242, 242, 0.9)'; // Tu color de fondo original
            videoModal.style.pointerEvents = 'auto'; 
            videoModal.style.backdropFilter = 'blur(5px)';
            videoModal.style.alignItems = 'center'; // Centrar de nuevo
        } else {
            // MINIMIZAR
            grid.style.display = 'none';
            
            // Convertir contenedor en barra pequeña
            container.style.height = 'auto';
            container.style.width = 'auto';
            container.style.minWidth = '250px';
            container.style.background = 'rgba(30, 30, 30, 0.9)';
            
            // Posicionar abajo
            container.style.position = 'fixed'; 
            container.style.bottom = '80px'; // Encima del dock de usuario
            container.style.right = '20px';
            container.style.transform = 'none'; // Quitar transformaciones de centrado si las hubiera
            
            // HACER TRANSPARENTE EL OVERLAY PARA PODER CLICAR DETRÁS
            videoModal.style.background = 'transparent';
            videoModal.style.backdropFilter = 'none';
            videoModal.style.pointerEvents = 'none'; // IMPORTANTE: Deja pasar clics al fondo
            videoModal.style.alignItems = 'flex-end'; // Alinear al fondo para gestión de layout
            
            // Pero reactivar clics en la barra flotante
            container.style.pointerEvents = 'auto'; 
        }
    };
    
    window.hangUpCall = () => endCall(true);
}

// --- CONEXIÓN ---
export async function shareProject(targetUid, targetName) {
    if (!currentUser) return;
    if (peerConnection && peerConnection.connectionState === 'connected') {
        sendProjectData(dataChannel);
    } else {
        pendingProjectShare = true;
        startVideoCall(targetUid, targetName, true);
    }
}

export async function startVideoCall(targetUid, targetName, isProjectShare = false) {
    if (!currentUser) return;
    currentCallId = targetUid;
    
    openVideoModal(isProjectShare ? `Conectando con ${targetName}...` : `Llamando a ${targetName}...`);
    
    if (callTimeout) clearTimeout(callTimeout);
    callTimeout = setTimeout(() => {
        if (peerConnection && peerConnection.connectionState !== 'connected') {
            endCall(true);
            alert("Sin respuesta.");
        }
    }, 30000); 

    if (!isProjectShare) await setupLocalMedia();
    else document.getElementById('transfer-overlay').style.display = 'flex';

    createPeerConnection();
    setupDataChannel(); 

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await set(ref(db, `users/${targetUid}/incoming_call`), {
        type: 'offer', offer: { type: offer.type, sdp: offer.sdp },
        fromUid: currentUser.uid, fromName: currentUser.displayName || "Usuario",
        isProjectShare: isProjectShare 
    });

    onValue(ref(db, `users/${currentUser.uid}/call_answer`), async (snap) => {
        const data = snap.val();
        if (data && data.type === 'answer' && !peerConnection.currentRemoteDescription) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            document.getElementById('call-status-text').textContent = "P2P Activo";
            // Minimizar auto si es solo datos
            if(isProjectShare) setTimeout(() => window.toggleVideoMode(), 1000);
        }
    });

    listenForIceCandidates(targetUid);
}

async function acceptCall(callerUid, remoteOffer, isProjectShare) {
    currentCallId = callerUid;
    openVideoModal("Conectando...");
    if (!isProjectShare) await setupLocalMedia();
    else document.getElementById('transfer-overlay').style.display = 'flex';

    createPeerConnection(); 
    await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await set(ref(db, `users/${callerUid}/call_answer`), {
        type: 'answer', answer: { type: answer.type, sdp: answer.sdp }
    });

    listenForIceCandidates(callerUid);
}

// --- WEBRTC CORE ---
async function setupLocalMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        if (peerConnection) localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    } catch (e) { console.warn("No media:", e); }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && currentCallId) {
            push(ref(db, `users/${currentCallId}/incoming_ice`), {
                candidate: event.candidate.toJSON(), sender: currentUser.uid
            });
        }
    };
    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };
    peerConnection.onconnectionstatechange = () => {
        if(['disconnected', 'failed'].includes(peerConnection.connectionState)) endCall(false);
    };
    peerConnection.ondatachannel = (event) => {
        console.log("Canal remoto recibido");
        setupDataChannelEvents(event.channel);
    };
    if (localStream) localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
}

function setupDataChannel() {
    dataChannel = peerConnection.createDataChannel("silenos_sync");
    setupDataChannelEvents(dataChannel);
}

function setupDataChannelEvents(channel) {
    dataChannel = channel;
    registerDataChannel(dataChannel); 
    dataChannel.onopen = () => {
        document.getElementById('call-status-text').textContent = "P2P Activo";
        if (pendingProjectShare) {
            sendProjectData(dataChannel);
            pendingProjectShare = false;
        }
    };
    dataChannel.onmessage = handleIncomingData;
}

function listenForIceCandidates(remoteUid) {
    unsubscribeSignal = onChildAdded(ref(db, `users/${currentUser.uid}/incoming_ice`), async (snap) => {
        const data = snap.val();
        if (data && data.candidate && peerConnection) {
             try { await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {}
        }
    });
}

function openVideoModal(status) {
    if(!videoModal) createVideoModalDOM();
    videoModal.classList.add('active');
    videoModal.style.display = 'flex';
    document.getElementById('call-status-text').textContent = status;
    document.getElementById('transfer-overlay').style.display = 'none';
    // Resetear a estado maximizado por defecto
    const grid = document.getElementById('video-grid-area');
    if(grid && grid.style.display === 'none') window.toggleVideoMode(); 
}

export function endCall(notifyRemote) {
    if (callTimeout) clearTimeout(callTimeout);
    if (videoModal) {
        videoModal.classList.remove('active');
        setTimeout(() => videoModal.style.display = 'none', 300);
    }
    if (localStream) { localStream.getTracks().forEach(track => track.stop()); localStream = null; }
    if (dataChannel) { dataChannel.close(); dataChannel = null; }
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    
    if (currentUser) {
        remove(ref(db, `users/${currentUser.uid}/incoming_call`));
        remove(ref(db, `users/${currentUser.uid}/call_answer`));
        remove(ref(db, `users/${currentUser.uid}/incoming_ice`));
        if (notifyRemote && currentCallId) {
            remove(ref(db, `users/${currentCallId}/incoming_call`)).catch(e => {});
            remove(ref(db, `users/${currentCallId}/call_answer`)).catch(e => {});
        }
    }
    currentCallId = null;
    pendingProjectShare = false;
    if (unsubscribeSignal) unsubscribeSignal();
}

window.hangUpCall = () => endCall(true);