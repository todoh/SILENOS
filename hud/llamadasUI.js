import { aceptarLlamadaEntrante, rechazarLlamadaEntrante, colgarLlamada, alternarTrackLocal, conmutarCompartirPantalla } from "./webrtc.js";

let contenedorLlamada = null;
let audioCtx = null;
let oscilador = null;
let ganancia = null;
let intervaloTimbre = null;

// Estados locales de la interfaz de la llamada activa
let micMutear = false;
let camApagada = false;
let compartiendoPantalla = false;

function iniciarSonidoTimbre() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const reproducirTono = () => {
            if (!audioCtx || audioCtx.state === "suspended") return;
            
            oscilador = audioCtx.createOscillator();
            ganancia = audioCtx.createGain();
            
            oscilador.type = "sine";
            oscilador.frequency.setValueAtTime(440, audioCtx.currentTime);
            
            ganancia.gain.setValueAtTime(0, audioCtx.currentTime);
            ganancia.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
            ganancia.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.8);
            
            oscilador.connect(ganancia);
            ganancia.connect(audioCtx.destination);
            
            oscilador.start();
            oscilador.stop(audioCtx.currentTime + 1.8);
        };
        reproducirTono();
        intervaloTimbre = setInterval(reproducirTono, 3000);
    } catch (e) {
        console.error("No se pudo iniciar el audio de notificación:", e);
    }
}

function detenerSonidoTimbre() {
    if (intervaloTimbre) {
        clearInterval(intervaloTimbre);
        intervaloTimbre = null;
    }
    if (oscilador) {
        try { oscilador.stop(); } catch(e) {}
        oscilador = null;
    }
}

export function abrirInterfazLlamada(chatId, myRealId, esLlamante) {
    if (document.getElementById("silenos-video-modal")) return;

    // Resetear estados multimedia al abrir una nueva interfaz
    micMutear = false;
    camApagada = false;
    compartiendoPantalla = false;

    contenedorLlamada = document.createElement("div");
    contenedorLlamada.id = "silenos-video-modal";
    contenedorLlamada.className = "video-modal-overlay";

    contenedorLlamada.innerHTML = `
        <div class="video-modal-content">
            <div class="video-layout-manager state-standard-grid" id="video-layout-manager">
                <div class="video-shares-zone" id="video-shares-zone">
                    </div>
                <div class="video-cameras-zone" id="video-cameras-zone">
                    <div class="video-frame-wrapper" id="wrapper-remote">
                        <video id="remote-video" autoplay playsinline class="video-stream-element"></video>
                        <div class="video-user-label">REMOTO</div>
                    </div>
                    <div class="video-frame-wrapper" id="wrapper-local">
                        <video id="local-video" autoplay playsinline muted class="video-stream-element"></video>
                        <div class="video-user-label">TÚ</div>
                    </div>
                </div>
            </div>
            
            <div class="setup-media-controls" id="media-pre-setup">
                <label class="media-checkbox-label">
                    <input type="checkbox" id="chk-pre-cam"> Encender Cámara
                </label>
                <label class="media-checkbox-label">
                    <input type="checkbox" id="chk-pre-mic" checked> Encender Micrófono
                </label>
            </div>
            
            <div class="video-controls" id="video-controls-bar">
                ${esLlamante 
                      ? `<span class="link-action" id="btn-rtc-confirmar-llamar" style="color: #a1c580; margin-right:15px;">[Iniciar Llamada]</span>
                         <span class="link-action link-danger" id="btn-rtc-colgar">[Cancelar]</span>`
                      : `
                         <span class="link-action" id="btn-rtc-aceptar" style="color: #a1c580; margin-right:15px;">[Aceptar]</span>
                         <span class="link-action link-danger" id="btn-rtc-rechazar">[Rechazar]</span>
                        `
                }
            </div>
            <div class="video-status-msg" id="rtc-status-text">
                ${esLlamante ? "Configura tus dispositivos antes de llamar" : "Videollamada Entrante... Configura tus dispositivos"}
            </div>
        </div>
    `;
    document.body.appendChild(contenedorLlamada);

    if (!esLlamante) {
        iniciarSonidoTimbre();
        
        const partesId = chatId.split("_");
        const targetId = partesId[0] === String(myRealId) ? partesId[1] : partesId[0];
        const tabAsociada = document.querySelector(`.tuenti-tab[data-target-id="${targetId}"]`);
        if (tabAsociada) {
            tabAsociada.classList.add("tuenti-tab-flash");
        }
    }

    if (esLlamante) {
        document.getElementById("btn-rtc-confirmar-llamar").addEventListener("click", () => {
            const videoActivo = document.getElementById("chk-pre-cam").checked;
            const audioActivo = document.getElementById("chk-pre-mic").checked;
            
            camApagada = !videoActivo;
            micMutear = !audioActivo;

            document.getElementById("media-pre-setup").style.display = "none";
            document.getElementById("rtc-status-text").innerText = "Llamando...";
            
            inyectarControlesEnLlamada(chatId);
            
            const eventoLlamar = new CustomEvent("silenosIniciarLlamada", {
                detail: { video: videoActivo, audio: audioActivo }
            });
            document.dispatchEvent(eventoLlamar);
        });
        document.getElementById("btn-rtc-colgar").addEventListener("click", () => colgarLlamada(chatId));
    } else {
        document.getElementById("btn-rtc-aceptar").addEventListener("click", () => {
            detenerSonidoTimbre();
            const videoActivo = document.getElementById("chk-pre-cam").checked;
            const audioActivo = document.getElementById("chk-pre-mic").checked;
            
            camApagada = !videoActivo;
            micMutear = !audioActivo;

            document.getElementById("media-pre-setup").style.display = "none";
            document.getElementById("rtc-status-text").innerText = "Conectando P2P...";
            
            inyectarControlesEnLlamada(chatId);
            
            aceptarLlamadaEntrante(chatId, videoActivo, audioActivo);
        });
        document.getElementById("btn-rtc-rechazar").addEventListener("click", () => {
            detenerSonidoTimbre();
            rechazarLlamadaEntrante(chatId);
        });
    }
}

function inyectarControlesEnLlamada(chatId) {
    const bar = document.getElementById("video-controls-bar");
    if (!bar) return;

    bar.innerHTML = `
        <span class="link-action" id="btn-media-minimize">[Minimizar]</span>
        <span class="link-action hidden" id="btn-media-maximize">[Pantalla Completa]</span>
        <span class="link-action ${micMutear ? 'media-disabled' : ''}" id="btn-media-mute">${micMutear ? '[Desmutear]' : '[Mutear]'}</span>
        <span class="link-action ${camApagada ? 'media-disabled' : ''}" id="btn-media-cam">${camApagada ? '[Poner Cam]' : '[Quitar Cam]'}</span>
        <span class="link-action" id="btn-media-screen">[Compartir Pantalla]</span>
        <span class="link-action link-danger" id="btn-rtc-colgar">[Colgar]</span>
    `;

    const btnMinimize = document.getElementById("btn-media-minimize");
    const btnMaximize = document.getElementById("btn-media-maximize");

    btnMinimize.addEventListener("click", () => {
        contenedorLlamada.classList.add("video-modal-minimized");
        btnMinimize.classList.add("hidden");
        btnMaximize.classList.remove("hidden");
    });

    btnMaximize.addEventListener("click", () => {
        contenedorLlamada.classList.remove("video-modal-minimized");
        btnMaximize.classList.add("hidden");
        btnMinimize.classList.remove("hidden");
    });

    const btnMute = document.getElementById("btn-media-mute");
    btnMute.addEventListener("click", () => {
        micMutear = !micMutear;
        alternarTrackLocal("audio", !micMutear);
        if (micMutear) {
            btnMute.innerText = "[Desmutear]";
            btnMute.classList.add("media-disabled");
        } else {
            btnMute.innerText = "[Mutear]";
            btnMute.classList.remove("media-disabled");
        }
    });

    const btnCam = document.getElementById("btn-media-cam");
    btnCam.addEventListener("click", () => {
        camApagada = !camApagada;
        alternarTrackLocal("video", !camApagada);
        if (camApagada) {
            btnCam.innerText = "[Poner Cam]";
            btnCam.classList.add("media-disabled");
        } else {
            btnCam.innerText = "[Quitar Cam]";
            btnCam.classList.remove("media-disabled");
        }
    });

    const btnScreen = document.getElementById("btn-media-screen");
    btnScreen.addEventListener("click", async () => {
        if (!compartiendoPantalla) {
            const exito = await conmutarCompartirPantalla(true);
            if (exito) {
                compartiendoPantalla = true;
                btnScreen.innerText = "[Dejar de Compartir]";
                btnScreen.classList.add("media-disabled");
            }
        } else {
            await conmutarCompartirPantalla(false, !camApagada);
            compartiendoPantalla = false;
            btnScreen.innerText = "[Compartir Pantalla]";
            btnScreen.classList.remove("media-disabled");
        }
    });

    document.getElementById("btn-rtc-colgar").addEventListener("click", () => colgarLlamada(chatId));
}

/**
 * Recibe y rutea los flujos multimedia.
 * Se implementa una validación robusta y un flag explícito para asegurar que la captura de pantalla 
 * jamás sea interceptada erróneamente por el contenedor de vídeo del rostro.
 */
export function setFlujosVideo(localStream, remoteStream, esPantallaCompartida = false) {
    const localVideo = document.getElementById("local-video");
    const remoteVideo = document.getElementById("remote-video");
    const statusText = document.getElementById("rtc-status-text");
    const layoutManager = document.getElementById("video-layout-manager");
    const sharesZone = document.getElementById("video-shares-zone");

    if (!layoutManager || !sharesZone) return;

    // --- PROCESAMIENTO DE FLUJO LOCAL ---
    if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
            const track = videoTracks[0];
            // Determinación robusta: flag explícito, pista o indicación de pantalla
            const esCapturaPantalla = esPantallaCompartida || 
                                     (track.label && track.label.toLowerCase().includes("screen")) || 
                                     (track.contentHint === "detail");

            if (esCapturaPantalla) {
                let localShareVideo = document.getElementById("local-share-video");
                if (!localShareVideo) {
                    const wrapper = document.createElement("div");
                    wrapper.className = "video-frame-wrapper share-wrapper";
                    wrapper.id = "wrapper-local-share";
                    wrapper.innerHTML = `
                        <video id="local-share-video" autoplay playsinline muted class="video-stream-element fit-contain"></video>
                        <div class="video-user-label">TU PANTALLA COMPARTIDA</div>
                    `;
                    sharesZone.appendChild(wrapper);
                    localShareVideo = document.getElementById("local-share-video");
                }
                if (localShareVideo.srcObject !== localStream) {
                    localShareVideo.srcObject = localStream;
                }
            } else {
                if (localVideo && localVideo.srcObject !== localStream) {
                    localVideo.srcObject = localStream;
                }
                const existingLocalShare = document.getElementById("wrapper-local-share");
                if (existingLocalShare) existingLocalShare.remove();
            }
        }
    }

    // --- PROCESAMIENTO DE FLUJO REMOTO ---
    if (remoteStream) {
        const remoteTracks = remoteStream.getVideoTracks();
        if (remoteTracks.length > 0) {
            const track = remoteTracks[0];
            // Determinación robusta para el flujo remoto
            const esCapturaPantallaRemota = esPantallaCompartida || 
                                           (track.label && track.label.toLowerCase().includes("screen")) || 
                                           (track.contentHint === "detail");

            if (esCapturaPantallaRemota) {
                let remoteShareVideo = document.getElementById("remote-share-video");
                if (!remoteShareVideo) {
                    const wrapper = document.createElement("div");
                    wrapper.className = "video-frame-wrapper share-wrapper";
                    wrapper.id = "wrapper-remote-share";
                    wrapper.innerHTML = `
                        <video id="remote-share-video" autoplay playsinline class="video-stream-element fit-contain"></video>
                        <div class="video-user-label">PANTALLA COMPARTIDA DEL CONTACTO</div>
                    `;
                    sharesZone.appendChild(wrapper);
                    remoteShareVideo = document.getElementById("remote-share-video");
                }
                if (remoteShareVideo.srcObject !== remoteStream) {
                    remoteShareVideo.srcObject = remoteStream;
                }
                if (statusText) statusText.innerText = "Conexión Establecida - Viendo Pantalla";
            } else {
                if (remoteVideo && remoteVideo.srcObject !== remoteStream) {
                    remoteVideo.srcObject = remoteStream;
                }
                // Si la pista remota volvió a ser una cámara normal, limpiamos la zona de pantallas compartidas
                const existingRemoteShare = document.getElementById("wrapper-remote-share");
                if (existingRemoteShare) existingRemoteShare.remove();
                if (statusText) statusText.innerText = "Conexión Establecida";
            }
        }
    }

    // Actualización y renderizado dinámico de estados del layout manager por CSS absoluto
    const totalShares = sharesZone.querySelectorAll(".share-wrapper").length;
    if (totalShares === 1) {
        layoutManager.className = "video-layout-manager state-single-share";
    } else if (totalShares >= 2) {
        layoutManager.className = "video-layout-manager state-dual-share";
    } else {
        layoutManager.className = "video-layout-manager state-standard-grid";
    }
}

export function cerrarInterfazLlamada() {
    detenerSonidoTimbre();
    const modal = document.getElementById("silenos-video-modal");
    if (modal) {
        modal.remove();
    }
    contenedorLlamada = null;
}