// --- SISTEMA DE VIDEOLLAMADA P2P (WebRTC + Firebase Signaling) ---
// CORRECCIÓN: Timeout añadido y corrección del cierre prematuro al llamar.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, push, onChildAdded } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { currentUser } from './auth_ui.js';

console.log("Módulo VideoCall Cargado (v2.3 - Ringing Fix)");

// 1. CONFIGURACIÓN DE FIREBASE
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
let currentCallId = null;
let unsubscribeSignal = null;
let callTimeout = null; // <--- NUEVO: Variable para el temporizador de llamada

const servers = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
    ]
};

// --- DOM ELEMENTS ---
let videoModal = null;
let localVideo = null;
let remoteVideo = null;

// --- 1. INICIALIZACIÓN Y LISTENERS ---

export function initVideoSystem() {
    createVideoModalDOM();
    
    if (!currentUser) return;
    
    // Escuchar llamadas entrantes (CALLEE)
    const myCallRef = ref(db, `users/${currentUser.uid}/incoming_call`);
    onValue(myCallRef, async (snapshot) => {
        const data = snapshot.val();
        
        // CASO A: Recibo una llamada
        if (data && data.type === 'offer' && !peerConnection) {
            showIncomingCallUI(data.fromName, data.fromUid, data.offer);
        } 
        // CASO B: La llamada se cortó remotamente (el llamante colgó antes de que contestáramos)
        else if (!data && peerConnection && !currentCallId) {
            // Solo cerramos si nosotros NO somos el que inició la llamada (currentCallId suele ser null al recibir antes de aceptar)
            // O si ya habíamos aceptado y la señal desapareció.
            console.log("Detectado corte remoto entrante");
            endCall(false); 
        }
    });
}

function createVideoModalDOM() {
    if (document.getElementById('video-modal')) return;

    const div = document.createElement('div');
    div.id = 'video-modal';
    div.className = 'modal-overlay';
    div.style.zIndex = '10000';
    div.innerHTML = `
        <div class="video-container glass-container">
            <div class="video-grid">
                <video id="remote-video" autoplay playsinline></video>
                <video id="local-video" autoplay playsinline muted></video>
            </div>
            <div class="video-controls">
                <div class="call-status" id="call-status-text">Conectando...</div>
                <button class="video-btn danger" onclick="window.hangUpCall()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
    videoModal = document.getElementById('video-modal');
    localVideo = document.getElementById('local-video');
    remoteVideo = document.getElementById('remote-video');
    
    window.hangUpCall = () => endCall(true);
}

// --- 2. LÓGICA DE LLAMADA (CALLER) ---

export async function startVideoCall(targetUid, targetName) {
    if (!currentUser) return;
    currentCallId = targetUid;
    
    openVideoModal(`Llamando a ${targetName}...`);
    
    // --- NUEVO: TIMEOUT DE SEGURIDAD (30 SEGUNDOS) ---
    // Si no contestan en 30s, se cuelga automáticamente.
    if (callTimeout) clearTimeout(callTimeout);
    callTimeout = setTimeout(() => {
        if (peerConnection && peerConnection.connectionState !== 'connected') {
            alert("No hay respuesta del aliado.");
            endCall(true);
        }
    }, 30000); 

    // 1. Obtener media local
    await setupLocalMedia();

    // 2. Crear Peer Connection
    createPeerConnection();

    // 3. Crear Offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // 4. Enviar señal
    const callData = {
        type: 'offer',
        offer: { type: offer.type, sdp: offer.sdp },
        fromUid: currentUser.uid,
        fromName: currentUser.displayName || "Aliado Silenos"
    };
    await set(ref(db, `users/${targetUid}/incoming_call`), callData);

    // 5. Escuchar respuesta (Answer)
    const answerRef = ref(db, `users/${currentUser.uid}/call_answer`);
    onValue(answerRef, async (snapshot) => {
        const data = snapshot.val();
        
        // CASO A: Me contestan
        if (data && data.type === 'answer' && !peerConnection.currentRemoteDescription) {
            // Cancelamos el timeout porque ya contestaron
            if (callTimeout) clearTimeout(callTimeout);
            
            const answer = new RTCSessionDescription(data.answer);
            await peerConnection.setRemoteDescription(answer);
            document.getElementById('call-status-text').textContent = "Conectado";
        }
        
        // CORRECCIÓN IMPORTANTE:
        // Hemos eliminado el "else if (!data)" aquí. 
        // Antes, al estar vacío el nodo 'call_answer' al inicio, se cerraba solo.
        // Ahora dejamos que la llamada siga "sonando" hasta que contesten o salte el timeout.
        
        // CASO B: Detección de corte remoto SOLO si ya estábamos conectados
        else if (!data && peerConnection && peerConnection.connectionState === 'connected') {
             console.log("El aliado colgó la llamada establecida.");
             endCall(false);
        }
    });

    listenForIceCandidates(targetUid, 'callee');
}

// --- 3. LÓGICA DE RECEPCIÓN (CALLEE) ---

function showIncomingCallUI(name, uid, offer) {
    if (confirm(`📞 Videollamada entrante de ${name}.\n¿Aceptar conexión segura P2P?`)) {
        acceptCall(uid, offer);
    } else {
        set(ref(db, `users/${currentUser.uid}/incoming_call`), null);
    }
}

async function acceptCall(callerUid, remoteOffer) {
    currentCallId = callerUid;
    openVideoModal("Estableciendo conexión...");
    
    await setupLocalMedia();
    createPeerConnection();

    await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    const answerData = {
        type: 'answer',
        answer: { type: answer.type, sdp: answer.sdp }
    };
    await set(ref(db, `users/${callerUid}/call_answer`), answerData);

    listenForIceCandidates(callerUid, 'caller');
}

// --- 4. WEBRTC CORE & ICE CANDIDATES ---

async function setupLocalMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        
        if (peerConnection) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
    } catch (e) {
        alert("Error: No se pudo acceder a cámara/micrófono.");
        endCall(true);
    }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && currentCallId) {
            const targetNode = `users/${currentCallId}/incoming_ice`;
            push(ref(db, targetNode), {
                candidate: event.candidate.toJSON(),
                sender: currentUser.uid
            });
        }
    };

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };
    
    // Monitorizar estado de conexión para detectar desconexiones reales
    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
            endCall(false);
        }
    };
    
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
}

function listenForIceCandidates(remoteUid, role) {
    const iceRef = ref(db, `users/${currentUser.uid}/incoming_ice`);
    unsubscribeSignal = onChildAdded(iceRef, async (snapshot) => {
        const data = snapshot.val();
        if (data && data.candidate && peerConnection) {
             try {
                 await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
             } catch (e) { console.warn("Error adding ICE", e); }
        }
    });
}

// --- 5. UTILIDADES UI Y LIMPIEZA ---

function openVideoModal(status) {
    if(!videoModal) createVideoModalDOM();
    videoModal.classList.add('active');
    videoModal.style.display = 'flex';
    document.getElementById('call-status-text').textContent = status;
}

function endCall(notifyRemote) {
    // Limpiar timeout si existe
    if (callTimeout) {
        clearTimeout(callTimeout);
        callTimeout = null;
    }

    if (videoModal) {
        videoModal.classList.remove('active');
        setTimeout(() => videoModal.style.display = 'none', 300);
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (remoteStream) remoteStream = null;

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (currentUser) {
        remove(ref(db, `users/${currentUser.uid}/incoming_call`));
        remove(ref(db, `users/${currentUser.uid}/call_answer`));
        remove(ref(db, `users/${currentUser.uid}/incoming_ice`));
        
        // Sincronización de cierre: Si yo cuelgo, le borro la señal al otro
        if (notifyRemote && currentCallId) {
            console.log("Enviando señal de fin al remoto:", currentCallId);
            remove(ref(db, `users/${currentCallId}/incoming_call`)).catch(e => console.error(e));
            remove(ref(db, `users/${currentCallId}/call_answer`)).catch(e => console.error(e));
        }
    }
    
    currentCallId = null;
    if (unsubscribeSignal) unsubscribeSignal();
}

window.hangUpCall = () => endCall(true);