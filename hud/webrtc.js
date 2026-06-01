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

// Nodos del mezclador de Audio para compartir pantalla + micrófono a la vez de forma limpia
let audioContextMixer = null;
let micAudioSource = null;
let screenAudioSource = null;
let mixedAudioDestination = null;
let currentSenderAudio = null;

const rtcConfig = {     
    iceServers: [         
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }     
    ] 
};

/**
 * Realiza una oferta de re-negociación limpia garantizando la sincronización de estados.
 */
async function forzarReNegociacionSegura() {
    if (!peerConnection || !activeChatId || !currentMyRealId) return;
    try {
        if (peerConnection.signalingState === "stable") {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            await conexion.sendMessage(activeChatId, currentMyRealId, "[RE-NEGOCIACION MULTIMEDIA]", {
                signalType: "renegotiation_offer",
                offer: { type: offer.type, sdp: offer.sdp }
            });
        }
    } catch (err) {
        console.error("Error crítico durante la re-negociación segura:", err);
    }
}

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
                            await forzarReNegociacionSegura();
                        }                     
                    }                 
                }             
            } catch (err) {                 
                console.error("Error al activar la cámara en caliente:", err);             
            }         
        }     
    } 
}

export async function conmutarCompartirPantalla(activar, camaraDeberiaEstarActiva = true) {     
    try {         
        if (activar) {             
            // Solicitamos la captura de pantalla incluyendo de forma robusta pistas de audio del sistema
            displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                video: {
                    cursor: "always",
                    displaySurface: "monitor"
                },
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    systemAudio: "include" 
                }
            });             
            
            const screenVideoTrack = displayStream.getVideoTracks()[0];             
            const screenAudioTrack = displayStream.getAudioTracks()[0]; 
            
            if (peerConnection) {                 
                const senders = peerConnection.getSenders();                 
                
                // 1. Reemplazar pista de vídeo comercial en caliente
                const videoSender = senders.find(s => s.track && s.track.kind === "video");                 
                if (videoSender) {                     
                    await videoSender.replaceTrack(screenVideoTrack);                 
                } else {
                    peerConnection.addTrack(screenVideoTrack, displayStream);
                }            

                // 2. Mezclador Avanzado de Audio (Micrófono + Audio de Sistema de Escritorio)
                const micAudioTrack = localStream ? localStream.getAudioTracks()[0] : null;
                
                if (screenAudioTrack && micAudioTrack) {
                    // Inicializamos contexto de audio nativo si no existiera
                    if (!audioContextMixer) {
                        audioContextMixer = new (window.AudioContext || window.webkitAudioContext)();
                    }
                    if (audioContextMixer.state === "suspended") {
                        await audioContextMixer.resume();
                    }

                    mixedAudioDestination = audioContextMixer.createMediaStreamDestination();
                    
                    // Conectamos micrófono original al mezclador
                    const micStream = new MediaStream([micAudioTrack]);
                    micAudioSource = audioContextMixer.createMediaStreamSource(micStream);
                    micAudioSource.connect(mixedAudioDestination);
                    
                    // Conectamos audio de la pantalla capturada al mezclador
                    const screenAudioStream = new MediaStream([screenAudioTrack]);
                    screenAudioSource = audioContextMixer.createMediaStreamSource(screenAudioStream);
                    screenAudioSource.connect(mixedAudioDestination);
                    
                    // Extraemos la pista combinada resultante
                    const blendedAudioTrack = mixedAudioDestination.stream.getAudioTracks()[0];
                    
                    if (currentSenderAudio) {
                        await currentSenderAudio.replaceTrack(blendedAudioTrack);
                    } else {
                        const audioSender = senders.find(s => s.track && s.track.kind === "audio");
                        if (audioSender) {
                            currentSenderAudio = audioSender;
                            await audioSender.replaceTrack(blendedAudioTrack);
                        }
                    }
                } else if (screenAudioTrack) {
                    // Si no hay micro, mandamos directo el audio del sistema
                    const audioSender = senders.find(s => s.track && s.track.kind === "audio");
                    if (audioSender) {
                        await audioSender.replaceTrack(screenAudioTrack);
                    }
                }
            }                          
            
            // Avisar al extremo remoto de forma explícita mediante la red de datos
            await conexion.sendMessage(activeChatId, currentMyRealId, "[COMPARTIENDO PANTALLA]", {
                signalType: "screen_sharing_on"
            });

            // Forzar renderizado local de la pantalla en la zona grande de la UI
            setFlujosVideo(displayStream, null, true);             
            
            // Escuchar si el usuario detiene la compartición desde la barra flotante nativa del OS
            screenVideoTrack.onended = async () => {                 
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
            // Limpieza del flujo de pantalla y detención segura de hardware
            if (displayStream) {                 
                displayStream.getTracks().forEach(t => t.stop());                 
                displayStream = null;             
            }             

            // Destrucción de conexiones previas del mezclador de audio
            if (micAudioSource) { micAudioSource.disconnect(); micAudioSource = null; }
            if (screenAudioSource) { screenAudioSource.disconnect(); screenAudioSource = null; }
            if (audioContextMixer) {
                if (audioContextMixer.state !== "closed") await audioContextMixer.close();
                audioContextMixer = null;
            }
            
            if (localStream) {                 
                const videoTrack = localStream.getVideoTracks()[0];                 
                const audioTrack = localStream.getAudioTracks()[0];

                if (peerConnection) {                         
                    const senders = peerConnection.getSenders();                         
                    
                    // Restaurar de inmediato la cámara original
                    if (videoTrack) {                     
                        videoTrack.enabled = camaraDeberiaEstarActiva;                     
                        const videoSender = senders.find(s => s.track && s.track.kind === "video");                         
                        if (videoSender) {                             
                            await videoSender.replaceTrack(videoTrack);                         
                        }                     
                    }                 

                    // Restaurar de forma imperativa el micrófono original puro del usuario
                    if (audioTrack) {
                        const audioSender = senders.find(s => s.track && s.track.kind === "audio");
                        if (audioSender) {
                            await audioSender.replaceTrack(audioTrack);
                        }
                    }
                }                 
                // Forzamos explícitamente a que limpie la zona de pantallas pasándole false
                setFlujosVideo(localStream, null, false);             
            }             

            // Notificar el fin de la captura de pantalla a la base de datos
            await conexion.sendMessage(activeChatId, currentMyRealId, "[DEJAR DE COMPARTIR PANTALLA]", {
                signalType: "screen_sharing_off"
            });

            await forzarReNegociacionSegura();
            return false;         
        }     
    } catch (err) {         
        console.error("Error crítico al conmutar captura de pantalla. Cancelación o denegación:", err);         
        // Fallback defensivo: Si falla la inicialización de pantalla, restauramos el flujo nativo
        if (localStream && peerConnection) {
            const senders = peerConnection.getSenders();
            const videoTrack = localStream.getVideoTracks()[0];
            const audioTrack = localStream.getAudioTracks()[0];
            const videoSender = senders.find(s => s.track && s.track.kind === "video");
            const audioSender = senders.find(s => s.track && s.track.kind === "audio");
            if (videoSender && videoTrack) await videoSender.replaceTrack(videoTrack);
            if (audioSender && audioTrack) await audioSender.replaceTrack(audioTrack);
            setFlujosVideo(localStream, null, false);
        }
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
                    }).catch(err => console.error("Error al procesar oferta de renegociación:", err));                 
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
    if (micAudioSource) { micAudioSource = null; }
    if (screenAudioSource) { screenAudioSource = null; }
    if (audioContextMixer) {
        try { audioContextMixer.close(); } catch(e){}
        audioContextMixer = null;
    }
    currentSenderAudio = null;
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
        conexion.sendMessage(activeChatId, currentMyRealId, "[DESCONEXION INVOLUNTARIA]", { signalType: "hangup" });     
    } 
});

export function removerEscuchaLlamadaEntrante(chatId) {}