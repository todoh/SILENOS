import * as conexion from "./conexion.js"; 
import { abrirInterfazLlamada, cerrarInterfazLlamada, setFlujosVideo } from "./llamadasUI.js"; 

let peerConnection = null; 
let localStream = null; 
let displayStream = null;  
let activeChatId = null; 
let currentMyRealId = null; 
let mensajesProcesados = new Set(); 
let iceBuffer = []; 
let desuscripcionPresencia = null; 

const rtcConfig = {     
    iceServers: [         
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }     
    ] 
};

export async function alternarTrackLocal(tipo, habilitar) {     
    if (!localStream) return;     
    if (tipo === "audio") {         
        localStream.getAudioTracks().forEach(track => track.enabled = habilitar);     
    } else if (tipo === "video") {         
        const videoTracks = localStream.getVideoTracks();         
        if (videoTracks.length > 0) {             
            videoTracks.forEach(track => track.enabled = habilitar);         
        } else if (habilitar) {             
            try {                 
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });                 
                const newVideoTrack = tempStream.getVideoTracks()[0];                                  
                if (newVideoTrack) {                     
                    localStream.addTrack(newVideoTrack);                     
                    setFlujosVideo(localStream, null);                                          
                    if (peerConnection) {                         
                        const senders = peerConnection.getSenders();                         
                        const videoSender = senders.find(s => s.track && s.track.kind === "video");                                                  
                        if (videoSender) {                             
                            await videoSender.replaceTrack(newVideoTrack);                         
                        } else {                             
                            peerConnection.addTrack(newVideoTrack, localStream);                                                          
                            if (peerConnection.signalingState === "stable") {                                 
                                const offer = await peerConnection.createOffer();                                 
                                await peerConnection.setLocalDescription(offer);                                 
                                conexion.sendMessage(activeChatId, currentMyRealId, "[RE-NEGOCIACION VIDEO]", {                                     
                                    signalType: "renegotiation_offer",                                     
                                    offer: { type: offer.type, sdp: offer.sdp }                                 
                                });                             
                            }                         
                        }                     
                    }                 
                }             
            } catch (err) {                 
                console.error("Error al activar la c mara en caliente:", err);             
            }         
        }     
    } 
}

export async function conmutarCompartirPantalla(activar, camaraDeberiaEstarActiva = true) {     
    try {         
        if (activar) {             
            displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                video: {
                    cursor: "always"
                },
                audio: false 
            });             
            
            const screenTrack = displayStream.getVideoTracks()[0];             
            
            if (peerConnection) {                 
                const senders = peerConnection.getSenders();                 
                const videoSender = senders.find(s => s.track && s.track.kind === "video");                 
                if (videoSender) {                     
                    await videoSender.replaceTrack(screenTrack);                 
                }             
            }                          
            
            // Avisar al extremo remoto de forma explícita mediante el canal de señalización
            conexion.sendMessage(activeChatId, currentMyRealId, "[COMPARTIENDO PANTALLA]", {
                signalType: "screen_sharing_on"
            });

            // Forzar el renderizado local de la pantalla en la zona grande superior
            setFlujosVideo(displayStream, null, true);             
            
            screenTrack.onended = async () => {                 
                await conmutarCompartirPantalla(false, camaraDeberiaEstarActiva);                 
                const btnScreen = document.getElementById("btn-media-screen");                 
                const btnCam = document.getElementById("btn-media-cam");                 
                if (btnScreen) {                     
                    btnScreen.innerText = "[Compartir Pantalla]";                     
                    btnScreen.classList.remove("media-disabled");                 
                }                 
                if (btnCam) btnCam.classList.remove("hidden");             
            };             
            return true;         
        } else {             
            if (displayStream) {                 
                displayStream.getTracks().forEach(t => t.stop());                 
                displayStream = null;             
            }             
            
            if (localStream) {                 
                const videoTrack = localStream.getVideoTracks()[0];                 
                if (videoTrack) {                     
                    videoTrack.enabled = camaraDeberiaEstarActiva;                     
                    if (peerConnection) {                         
                        const senders = peerConnection.getSenders();                         
                        const videoSender = senders.find(s => s.track && s.track.kind === "video");                         
                        if (videoSender) {                             
                            await videoSender.replaceTrack(videoTrack);                         
                        }                     
                    }                 
                }                 
                setFlujosVideo(localStream, null, false);             
            }             

            // Notificar el fin de la captura de pantalla
            conexion.sendMessage(activeChatId, currentMyRealId, "[DEJAR DE COMPARTIR PANTALLA]", {
                signalType: "screen_sharing_off"
            });

            return false;         
        }     
    } catch (err) {         
        console.error("Error al conmutar captura de pantalla:", err);         
        return false;     
    } 
}

export async function iniciarVideollamada(chatId, myRealId, targetRealId) {     
    activeChatId = chatId;     
    currentMyRealId = myRealId;     
    iceBuffer = [];     
    abrirInterfazLlamada(chatId, myRealId, true);     
    
    document.addEventListener("silenosIniciarLlamada", async (e) => {         
        const { video, audio } = e.detail;         
        try {             
            conexion.establecerPresenciaLlamada(chatId, myRealId);             
            vincularMonitoreoPresencia(chatId, myRealId);             
            localStream = await navigator.mediaDevices.getUserMedia({ video: video, audio: audio });             
            setFlujosVideo(localStream, null, false);             
            
            peerConnection = new RTCPeerConnection(rtcConfig);             
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));             
            
            peerConnection.ontrack = (event) => {                 
                if (event.streams && event.streams[0]) {
                    // Por defecto se asume falso, la orden explícita del signalType cambiará el layout
                    setFlujosVideo(null, event.streams[0], false);             
                }
            };             
            
            peerConnection.onicecandidate = (event) => {                 
                if (event.candidate) {                     
                    conexion.sendMessage(chatId, myRealId, "[ICE CANDIDATE]", {                         
                        signalType: "ice_candidate",                         
                        candidate: event.candidate.toJSON()                     
                    });                 
                }             
            };             
            
            const offer = await peerConnection.createOffer();             
            await peerConnection.setLocalDescription(offer);             
            conexion.sendMessage(chatId, myRealId, "[LLAMADA ENTRANTE]", {                 
                signalType: "offer",                 
                offer: { type: offer.type, sdp: offer.sdp }             
            });         
        } catch (err) {             
            console.error("Error emisor WebRTC:", err);             
            colgarLlamada(chatId);         
        }     
    }, { once: true }); 
}

export function escucharLlamadasEntrantes(chatId, myRealId) {     
    currentMyRealId = myRealId;     
    conexion.listenToChatRoom(chatId, (snapshot) => {         
        const messages = snapshot.val();         
        if (!messages || !Array.isArray(messages)) return;         
        messages.forEach((msg) => {             
            const msgId = `${msg.sender}_${msg.timestamp}_${msg.signalType}`;             
            if (mensajesProcesados.has(msgId)) return;             
            
            if (String(msg.sender) === String(myRealId)) {                 
                if (msg.signalType === "hangup") {                     
                    mensajesProcesados.add(msgId);                     
                    finalizarLlamadaLocal();                 
                }                 
                return;             
            }             
            
            if (msg.signalType === "offer") {                 
                mensajesProcesados.add(msgId);                 
                activeChatId = chatId;                 
                const esMensajeNuevo = (Date.now() - msg.timestamp) < 15000;                 
                if (!esMensajeNuevo) return;                 
                if (!document.getElementById("silenos-video-modal")) {                     
                    conexion.openChatTab(myRealId, msg.sender, true).then(() => {                         
                        abrirInterfazLlamada(chatId, myRealId, false);                         
                        document.getElementById("silenos-video-modal").setAttribute("data-pending-offer", JSON.stringify(msg.offer));                     
                    });                 
                }             
            }             
            else if (msg.signalType === "screen_sharing_on") {
                mensajesProcesados.add(msgId);
                // Forzamos al receptor remoto a enrutar el flujo actual hacia la zona grande superior
                if (peerConnection) {
                    const receivers = peerConnection.getReceivers();
                    const remoteVideoReceiver = receivers.find(r => r.track && r.track.kind === "video");
                    if (remoteVideoReceiver && remoteVideoReceiver.track) {
                        const simulatedStream = new MediaStream([remoteVideoReceiver.track]);
                        setFlujosVideo(null, simulatedStream, true);
                    }
                }
            }
            else if (msg.signalType === "screen_sharing_off") {
                mensajesProcesados.add(msgId);
                // Devolvemos el flujo remoto al contenedor de su cámara web estándar
                if (peerConnection) {
                    const receivers = peerConnection.getReceivers();
                    const remoteVideoReceiver = receivers.find(r => r.track && r.track.kind === "video");
                    if (remoteVideoReceiver && remoteVideoReceiver.track) {
                        const simulatedStream = new MediaStream([remoteVideoReceiver.track]);
                        setFlujosVideo(null, simulatedStream, false);
                    }
                }
            }
            else if (msg.signalType === "renegotiation_offer") {                 
                mensajesProcesados.add(msgId);                 
                if (peerConnection) {                     
                    peerConnection.setRemoteDescription(new RTCSessionDescription(msg.offer)).then(async () => {                         
                        const answer = await peerConnection.createAnswer();                         
                        await peerConnection.setLocalDescription(answer);                         
                        conexion.sendMessage(chatId, myRealId, "[RESPUESTA RE-NEGOCIACION]", {                             
                            signalType: "renegotiation_answer",                             
                            answer: { type: answer.type, sdp: answer.sdp }                         
                        });                     
                    }).catch(err => console.error("Error al procesar oferta de renegociaci n:", err));                 
                }             
            }             
            else if (msg.signalType === "answer") {                 
                mensajesProcesados.add(msgId);                 
                if (peerConnection && peerConnection.signalingState === "have-local-offer") {                     
                    peerConnection.setRemoteDescription(new RTCSessionDescription(msg.answer)).then(async () => {                         
                        while (iceBuffer.length > 0) {                             
                            const cand = iceBuffer.shift();                             
                            await peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});                         
                        }                     
                    }).catch(err => console.error("Error setting remote description para answer:", err));                 
                }             
            }             
            else if (msg.signalType === "renegotiation_answer") {                 
                mensajesProcesados.add(msgId);                 
                if (peerConnection && peerConnection.signalingState === "have-local-offer") {                     
                    peerConnection.setRemoteDescription(new RTCSessionDescription(msg.answer)).catch(err => {                         
                        console.error("Error setting remote description para re-negotiation answer:", err);                     
                    });                 
                }             
            }             
            else if (msg.signalType === "ice_candidate") {                 
                mensajesProcesados.add(msgId);                 
                if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {                     
                    peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});                 
                } else {                     
                    iceBuffer.push(msg.candidate);                 
                }             
            }             
            else if (msg.signalType === "hangup") {                 
                mensajesProcesados.add(msgId);                 
                finalizarLlamadaLocal();             
            }         
        });     
    }); 
}

export async function aceptarLlamadaEntrante(chatId, videoActivo, audioActivo) {     
    activeChatId = chatId;     
    try {         
        const modal = document.getElementById("silenos-video-modal");         
        if (!modal) return;         
        const offerData = JSON.parse(modal.getAttribute("data-pending-offer"));         
        
        conexion.establecerPresenciaLlamada(chatId, currentMyRealId);         
        vincularMonitoreoPresencia(chatId, currentMyRealId);         
        
        localStream = await navigator.mediaDevices.getUserMedia({ video: videoActivo, audio: audioActivo });         
        setFlujosVideo(localStream, null, false);         
        
        peerConnection = new RTCPeerConnection(rtcConfig);         
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));         
        
        peerConnection.ontrack = (event) => {             
            if (event.streams && event.streams[0]) setFlujosVideo(null, event.streams[0], false);         
        };         
        
        peerConnection.onicecandidate = (event) => {             
            if (event.candidate) {                 
                conexion.sendMessage(chatId, currentMyRealId, "[ICE CANDIDATE]", {                     
                    signalType: "ice_candidate",                     
                    candidate: event.candidate.toJSON()                 
                });             
            }         
        };         
        
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offerData));         
        const answer = await peerConnection.createAnswer();         
        await peerConnection.setLocalDescription(answer);         
        
        conexion.sendMessage(chatId, currentMyRealId, "[LLAMADA ACEPTADA]", {             
            signalType: "answer",             
            answer: { type: answer.type, sdp: answer.sdp }         
        });         
        
        while (iceBuffer.length > 0) {             
            const cand = iceBuffer.shift();             
            await peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});         
        }     
    } catch (err) {         
        console.error("Error al aceptar llamada:", err);         
        rechazarLlamadaEntrante(chatId);     
    } 
}

export function rechazarLlamadaEntrante(chatId) {     
    conexion.sendMessage(chatId, currentMyRealId, "[LLAMADA RECHAZADA]", { signalType: "hangup" });     
    finalizarLlamadaLocal(); 
}

export function colgarLlamada(chatId) {     
    conexion.sendMessage(chatId, currentMyRealId, "[LLAMADA FINALIZADA]", { signalType: "hangup" });     
    finalizarLlamadaLocal(); 
}

export function finalizarLlamadaLocal() {     
    if (activeChatId && currentMyRealId) {         
        conexion.removerPresenciaLlamada(activeChatId, currentMyRealId);     
    }     
    if (desuscripcionPresencia) {         
        desuscripcionPresencia();         
        desuscripcionPresencia = null;     
    }     
    if (displayStream) {         
        displayStream.getTracks().forEach(track => track.stop());         
        displayStream = null;     
    }     
    if (localStream) {         
        localStream.getTracks().forEach(track => track.stop());         
        localStream = null;     
    }     
    if (peerConnection) {         
        peerConnection.close();         
        peerConnection = null;     
    }     
    iceBuffer = [];     
    cerrarInterfazLlamada(); 
}

function vincularMonitoreoPresencia(chatId, myRealId) {     
    if (desuscripcionPresencia) desuscripcionPresencia();     
    let llamadaEstabilizada = false;     
    setTimeout(() => {         
        llamadaEstabilizada = true;     
    }, 3500);     
    desuscripcionPresencia = conexion.escucharPresenciaLlamada(chatId, (snapshot) => {         
        const presencias = snapshot.val() || {};         
        const llaves = Object.keys(presencias);         
        if (llaves.length >= 2) {             
            llamadaEstabilizada = true;         
        }         
        if (llamadaEstabilizada && llaves.length < 2) {             
            finalizarLlamadaLocal();         
        }     
    }); 
}

window.addEventListener("beforeunload", () => {     
    if (activeChatId && currentMyRealId) {         
        conexion.sendMessage(activeChatId, currentMyRealId, "[DESCONEXI N INVOLUNTARIA]", { signalType: "hangup" });     
    } 
});

export function removerEscuchaLlamadaEntrante(chatId) {}