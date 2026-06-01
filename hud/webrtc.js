import * as conexion from "./conexion.js";  
import { abrirInterfazLlamada, cerrarInterfazLlamada, setFlujosVideo } from "./llamadasUI.js";  

let peerConnection = null;  
let localStream = null;  
let displayStream = null; // Stream secundario para la captura de pantalla  
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

/**
 * Habilita o deshabilita pistas locales en caliente (Audio o Video)
 * Integra negociación reactiva completa para que el remoto reciba el nuevo flujo.
 */
export async function alternarTrackLocal(tipo, habilitar) {          
    if (!localStream) return;          
    
    if (tipo === "audio") {                  
        localStream.getAudioTracks().forEach(track => track.enabled = habilitar);          
    } else if (tipo === "video") {                  
        const videoTracks = localStream.getVideoTracks();
        
        if (videoTracks.length > 0) {
            // Si el track ya existía, simplemente lo conmutamos
            videoTracks.forEach(track => track.enabled = habilitar);
        } else if (habilitar) {
            // Si no existía pista de video porque se entró con ella apagada, la solicitamos en caliente
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newVideoTrack = tempStream.getVideoTracks()[0];
                
                if (newVideoTrack) {
                    // La inyectamos en nuestro stream local activo
                    localStream.addTrack(newVideoTrack);
                    
                    // Actualizamos los flujos multimedia de la interfaz local
                    setFlujosVideo(localStream, null);
                    
                    // Si la conexión P2P ya existe, inyectamos el track en el peerConnection
                    if (peerConnection) {
                        const senders = peerConnection.getSenders();
                        const videoSender = senders.find(s => s.track && s.track.kind === "video");
                        
                        if (videoSender) {
                            await videoSender.replaceTrack(newVideoTrack);
                        } else {
                            peerConnection.addTrack(newVideoTrack, localStream);
                            
                            // Forzamos la renegociación asíncrona con el par remoto
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
                console.error("Error al activar la cámara en caliente:", err);
            }
        }
    }          
}

/**
 * Captura la pantalla y reemplaza el track de video en el RTCPeerConnection de forma dinámica.
 */
export async function conmutarCompartirPantalla(activar, camaraDeberiaEstarActiva = true) {          
    try {                  
        if (activar) {                          
            displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });                          
            const screenTrack = displayStream.getVideoTracks()[0];                          
            
            // Reemplazar track en el sender de WebRTC              
            if (peerConnection) {                                  
                const senders = peerConnection.getSenders();                                  
                const videoSender = senders.find(s => s.track && s.track.kind === "video");                                  
                if (videoSender) {                                          
                    await videoSender.replaceTrack(screenTrack);                                  
                }                          
            }                          
            // Cambiar visualización local localmente              
            setFlujosVideo(displayStream, null);                          
            
            // Escuchar el botón nativo del navegador "Dejar de compartir"              
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
            // Detener captura de pantalla              
            if (displayStream) {                                  
                displayStream.getTracks().forEach(t => t.stop());                                  
                displayStream = null;                          
            }                          
            // Recuperar el track original de la cámara              
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
                setFlujosVideo(localStream, null);                          
            }                          
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
            // Marcamos nuestra presencia e iniciamos escucha del estado de la llamada             
            conexion.establecerPresenciaLlamada(chatId, myRealId);             
            vincularMonitoreoPresencia(chatId, myRealId);             
            
            localStream = await navigator.mediaDevices.getUserMedia({ video: video, audio: audio });                          
            setFlujosVideo(localStream, null);                          
            
            peerConnection = new RTCPeerConnection(rtcConfig);                          
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));                                       
            
            peerConnection.ontrack = (event) => {                                  
                if (event.streams && event.streams[0]) setFlujosVideo(null, event.streams[0]);                          
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
            
            // Si el mensaje es mío, solo me interesan mis propias acciones de colgado o cancelaciones             
            if (String(msg.sender) === String(myRealId)) {                                  
                if (msg.signalType === "hangup") {                                          
                    mensajesProcesados.add(msgId);                                          
                    finalizarLlamadaLocal();                                  
                }                                  
                return;                          
            }                                       
            
            // Mensajes remotos (del otro usuario)             
            if (msg.signalType === "offer") {                                  
                mensajesProcesados.add(msgId);                                  
                activeChatId = chatId;                                                   
                
                // Evitar disparar llamadas fantasma por recarga: solo procesar si el mensaje es muy reciente (menos de 15 segundos)                 
                const esMensajeNuevo = (Date.now() - msg.timestamp) < 15000;                 
                if (!esMensajeNuevo) return;                 
                
                if (!document.getElementById("silenos-video-modal")) {                                          
                    conexion.openChatTab(myRealId, msg.sender, true).then(() => {                                                  
                        abrirInterfazLlamada(chatId, myRealId, false);                                                  
                        document.getElementById("silenos-video-modal").setAttribute("data-pending-offer", JSON.stringify(msg.offer));                                          
                    });                                  
                }                          
            } 
            else if (msg.signalType === "renegotiation_offer") {
                mensajesProcesados.add(msgId);
                // Si ya estamos en llamada y tenemos conexión, asimilamos la oferta en caliente sin abrir modales
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
        
        // Marcamos presencia al aceptar e iniciamos el monitoreo equilibrado         
        conexion.establecerPresenciaLlamada(chatId, currentMyRealId);         
        vincularMonitoreoPresencia(chatId, currentMyRealId);         
        
        localStream = await navigator.mediaDevices.getUserMedia({ video: videoActivo, audio: audioActivo });                  
        setFlujosVideo(localStream, null);                  
        
        peerConnection = new RTCPeerConnection(rtcConfig);                  
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));                           
        
        peerConnection.ontrack = (event) => {                          
            if (event.streams && event.streams[0]) setFlujosVideo(null, event.streams[0]);                  
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
    
    // Permitimos un margen de 3.5 segundos para que la base de datos asiente ambos estados de presencia al conectar     
    setTimeout(() => {         
        llamadaEstabilizada = true;     
    }, 3500);     
    
    desuscripcionPresencia = conexion.escucharPresenciaLlamada(chatId, (snapshot) => {         
        const presencias = snapshot.val() || {};         
        const llaves = Object.keys(presencias);                  
        
        // Si ambos están en el nodo, la llamada se considera activa y confirmada         
        if (llaves.length >= 2) {             
            llamadaEstabilizada = true;         
        }         
        // Una vez estabilizada la conexión, si alguno se desconecta o cierra, destruimos la sesión local         
        if (llamadaEstabilizada && llaves.length < 2) {             
            finalizarLlamadaLocal();         
        }     
    }); 
}

// Evento de seguridad antes de destruir la pestaña o recargar de forma manual 
window.addEventListener("beforeunload", () => {     
    if (activeChatId && currentMyRealId) {         
        conexion.sendMessage(activeChatId, currentMyRealId, "[DESCONEXIÓN INVOLUNTARIA]", { signalType: "hangup" });     
    } 
});

export function removerEscuchaLlamadaEntrante(chatId) {}