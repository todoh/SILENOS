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
    contenedorLlamada.className = "video-modal-overlay"; // Inicia a pantalla completa por defecto
    contenedorLlamada.innerHTML = `
        <div class="video-modal-content">
            <div class="video-feeds">
                <video id="remote-video" autoplay playsinline class="video-remote-frame"></video>
                <video id="local-video" autoplay playsinline muted class="video-local-frame"></video>
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

/**
 * Reemplaza los controles iniciales por el panel avanzado de operación en caliente.
 */
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

    // Evento Minimizar / Maximizar ventana
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

    // Mute / Unmute Audio
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

    // On / Off Video Cámara
    const btnCam = document.getElementById("btn-media-cam");
    btnCam.addEventListener("click", () => {
        if (compartiendoPantalla) {
            alert("Detén la captura de pantalla antes de alterar la cámara.");
            return;
        }
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

    // Compartir Pestaña/Ventana/Pantalla
    const btnScreen = document.getElementById("btn-media-screen");
    btnScreen.addEventListener("click", async () => {
        if (!compartiendoPantalla) {
            const exito = await conmutarCompartirPantalla(true);
            if (exito) {
                compartiendoPantalla = true;
                btnScreen.innerText = "[Dejar de Compartir]";
                btnScreen.classList.add("media-disabled");
                // Forzar encendido visual circunstancial si la cámara estaba apagada
                btnCam.classList.add("hidden");
            }
        } else {
            await conmutarCompartirPantalla(false, !camApagada);
            compartiendoPantalla = false;
            btnScreen.innerText = "[Compartir Pantalla]";
            btnScreen.classList.remove("media-disabled");
            btnCam.classList.remove("hidden");
        }
    });

    document.getElementById("btn-rtc-colgar").addEventListener("click", () => colgarLlamada(chatId));
}

export function setFlujosVideo(localStream, remoteStream) {
    const localVideo = document.getElementById("local-video");
    const remoteVideo = document.getElementById("remote-video");
    const statusText = document.getElementById("rtc-status-text");
    if (localStream && localVideo) {
        localVideo.srcObject = localStream;
    }
    if (remoteStream && remoteVideo) {
        remoteVideo.srcObject = remoteStream;
        if (statusText) statusText.innerText = "Conexión Establecida";
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