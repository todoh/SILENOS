import * as THREE from 'three';
import { appState } from './editor-escenas-main.js';
import { showModal, updateInspector } from './editor-escenas-ui.js';

let timelineContainer, ruler, tracksContainer, scrubber, timeDisplay;
let isScrubbing = false;
let animationFrameId;

// Constante para la escala de la línea de tiempo (píxeles por segundo)
const PIXELS_PER_SECOND = 100;

// --- LÓGICA DE CONTROL DE ANIMACIÓN ---

/**
 * Mueve la escena a un punto específico en el tiempo.
 * @param {number} time - El tiempo en segundos al que mover la escena.
 */
function setSceneTime(time) {
    // Asegurar que el tiempo no exceda la duración total
    const totalDuration = appState.timelineDuration > 0 ? appState.timelineDuration : 10;
    appState.currentTime = Math.max(0, Math.min(time, totalDuration));

    // Actualiza la posición de cada objeto basado en sus animaciones
    appState.allAnimations.forEach(anim => {
        const { object, startPosition, endPosition, startTime, duration } = anim;
        
        // El progreso es 0 antes del inicio, 1 después del final, e interpolado durante el clip.
        let progress = (appState.currentTime - startTime) / duration;
        progress = Math.max(0, Math.min(progress, 1)); 

        if (isNaN(progress)) progress = 0;

        object.position.lerpVectors(startPosition, endPosition, progress);
    });
    updateScrubberPosition();

  
}

/**
 * Inicia el bucle de reproducción de la animación.
 */
function playAnimationLoop() {
    if (!appState.isPlaying) return;

    let lastTime = performance.now();

    function animate(now) {
        if (!appState.isPlaying) {
            cancelAnimationFrame(animationFrameId);
            return;
        }

        const deltaTime = (now - lastTime) / 1000; // Delta en segundos
        lastTime = now;

        let newTime = appState.currentTime + deltaTime;
        
        // Detener al final de la línea de tiempo
        if (newTime >= appState.timelineDuration) {
            newTime = appState.timelineDuration;
            setSceneTime(newTime);
            pauseAllAnimations();
            return;
        }
        
        setSceneTime(newTime);
        animationFrameId = requestAnimationFrame(animate);
    }

    animationFrameId = requestAnimationFrame(animate);
}

// --- LÓGICA DE LA INTERFAZ DE LA LÍNEA DE TIEMPO (MEJORADA) ---

/**
 * Dibuja la regla, las pistas de animación y configura la interactividad.
 */
function drawTimeline() {
    // Calcular la duración total a partir de la animación que termina más tarde
    appState.timelineDuration = 0;
    appState.allAnimations.forEach(anim => {
        const endTime = anim.startTime + anim.duration;
        if (endTime > appState.timelineDuration) {
            appState.timelineDuration = endTime;
        }
    });
    // Asegurar una duración mínima para que la línea de tiempo sea visible
    if (appState.timelineDuration === 0) appState.timelineDuration = 10;

    ruler.innerHTML = '';
    tracksContainer.innerHTML = '';
    const timelineWidth = Math.max(appState.timelineDuration * PIXELS_PER_SECOND, timelineContainer.clientWidth);
    ruler.style.width = `${timelineWidth}px`;
    tracksContainer.style.width = `${timelineWidth}px`;

    // Dibujar la regla con marcas de segundos
    for (let i = 0; i <= Math.ceil(appState.timelineDuration); i++) {
        const marker = document.createElement('div');
        marker.className = 'time-marker major';
        marker.style.left = `${(i * PIXELS_PER_SECOND)}px`;
        ruler.appendChild(marker);

        const label = document.createElement('span');
        label.className = 'time-label';
        label.textContent = `${i}s`;
        label.style.left = marker.style.left;
        ruler.appendChild(label);
    }
    
    // Dibujar las pistas de animación interactivas
    appState.allAnimations.forEach((anim, index) => {
        const trackBar = document.createElement('div');
        trackBar.className = 'animation-track-bar';
        trackBar.textContent = `${anim.object.userData.name || 'Objeto'}`;
        trackBar.title = `${anim.object.userData.name || 'Objeto'}\nInicio: ${anim.startTime.toFixed(2)}s\nDuración: ${anim.duration.toFixed(2)}s`;
        trackBar.dataset.animIndex = index;

        const { startTime, duration } = anim;
        trackBar.style.left = `${startTime * PIXELS_PER_SECOND}px`;
        trackBar.style.width = `${duration * PIXELS_PER_SECOND}px`;
        trackBar.style.top = `${index * 30}px`;

        // Añadir manejadores para redimensionar
        const leftHandle = document.createElement('div');
        leftHandle.className = 'resize-handle left';
        trackBar.appendChild(leftHandle);

        const rightHandle = document.createElement('div');
        rightHandle.className = 'resize-handle right';
        trackBar.appendChild(rightHandle);

        tracksContainer.appendChild(trackBar);
        
        // Configurar la interactividad (arrastrar y redimensionar) para esta pista
        setupTrackBarInteractions(trackBar, leftHandle, rightHandle);
    });
}

/**
 * Configura los eventos de arrastrar y redimensionar para una pista de animación.
 * @param {HTMLElement} trackBar El elemento de la pista.
 * @param {HTMLElement} leftHandle El manejador izquierdo.
 * @param {HTMLElement} rightHandle El manejador derecho.
 */
function setupTrackBarInteractions(trackBar, leftHandle, rightHandle) {
    let initialMouseX, initialStartTime, initialDuration;
    let activeDrag = null; // Puede ser 'move', 'resize-left', o 'resize-right'

    function onMouseDown(e, dragType) {
        e.preventDefault();
        e.stopPropagation();

        const animIndex = parseInt(trackBar.dataset.animIndex, 10);
        const anim = appState.allAnimations[animIndex];
        if (!anim) return;

        activeDrag = dragType;
        initialMouseX = e.clientX;
        initialStartTime = anim.startTime;
        initialDuration = anim.duration;
        
        document.body.style.cursor = window.getComputedStyle(e.target).cursor;

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
        if (!activeDrag) return;
        e.preventDefault();

        const animIndex = parseInt(trackBar.dataset.animIndex, 10);
        const anim = appState.allAnimations[animIndex];
        if (!anim) return;

        const deltaX = e.clientX - initialMouseX;
        const deltaTime = deltaX / PIXELS_PER_SECOND;

        if (activeDrag === 'move') {
            anim.startTime = Math.max(0, initialStartTime + deltaTime);
        } else if (activeDrag === 'resize-right') {
            anim.duration = Math.max(0.1, initialDuration + deltaTime); // Duración mínima de 0.1s
        } else if (activeDrag === 'resize-left') {
            const newStartTime = Math.max(0, initialStartTime + deltaTime);
            const startTimeChange = newStartTime - initialStartTime;
            const newDuration = initialDuration - startTimeChange;

            if (newDuration >= 0.1) { // Asegurar duración mínima
                anim.startTime = newStartTime;
                anim.duration = newDuration;
            }
        }
        
        // Volver a dibujar la UI para reflejar los cambios en tiempo real
        drawTimeline();
        // Sincronizar el estado de la escena con el tiempo actual
        setSceneTime(appState.currentTime);
    }

    function onMouseUp(e) {
        if (!activeDrag) return;
        e.preventDefault();
        
        activeDrag = null;
        document.body.style.cursor = 'default';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        // Actualización final y completa de la UI
        updateTimelineUI();
    }

    // Adjuntar listeners
    trackBar.addEventListener('mousedown', (e) => {
        // Solo iniciar el movimiento si se hace clic directamente en la barra (no en los manejadores)
        if (e.target === trackBar) {
            onMouseDown(e, 'move');
        }
    });
    leftHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'resize-left'));
    rightHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'resize-right'));
}


/**
 * Actualiza la posición visual del scrubber y el display de tiempo.
 */
function updateScrubberPosition() {
    // !<--- CORRECCIÓN CLAVE: Añadir una guarda para evitar el error si los elementos no existen.
    if (!scrubber || !timeDisplay) return;
    scrubber.style.left = `${appState.currentTime * PIXELS_PER_SECOND}px`; //
    timeDisplay.textContent = `${appState.currentTime.toFixed(2)}s`; //
}

/**
 * Inicializa los listeners para el arrastre del scrubber.
 */
function setupScrubberEvents() {
    function onMouseDown(e) {
        e.preventDefault();
        isScrubbing = true;
        pauseAllAnimations();
        updateTimeFromMouseEvent(e);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
        if (!isScrubbing) return;
        e.preventDefault();
        updateTimeFromMouseEvent(e);
    }
    
    function onMouseUp(e) {
        if (!isScrubbing) return;
        e.preventDefault();
        isScrubbing = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }

    function updateTimeFromMouseEvent(e) {
        const rect = timelineContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const scroll = timelineContainer.scrollLeft;
        const position = x + scroll;
        
        const newTime = Math.max(0, position / PIXELS_PER_SECOND);
        setSceneTime(newTime);
    }

    scrubber.addEventListener('mousedown', onMouseDown);
    // Permitir hacer clic en cualquier parte de la línea de tiempo para mover el scrubber
    timelineContainer.addEventListener('click', (e) => {
        if (!isScrubbing && e.target.closest('#timeline-scrubber') === null && e.target.closest('.animation-track-bar') === null) {
             updateTimeFromMouseEvent(e);
        }
    });
}

// --- FUNCIONES DE CONTROL PÚBLICAS (MODIFICADAS) ---

/**
 * Punto de entrada para inicializar y actualizar toda la UI de la línea de tiempo.
 */
export function updateTimelineUI() {
    if (!ruler) {
        timelineContainer = document.getElementById('timeline-scrubber-area');
        ruler = document.getElementById('timeline-ruler');
        tracksContainer = document.getElementById('timeline-tracks');
        scrubber = document.getElementById('timeline-scrubber');
        timeDisplay = document.getElementById('timeline-time-display');
        setupScrubberEvents();
    }
    drawTimeline();
    setSceneTime(appState.currentTime);
}

/**
 * Inicia el proceso de configuración de una animación para el objeto seleccionado.
 */
export async function handleAnimationSetup() {
    if (!appState.selectedObject) {
        await showModal("Selecciona un objeto antes de añadir una animación.");
        return;
    }
    appState.animationSetupData = {
        object: appState.selectedObject,
        startPosition: appState.selectedObject.position.clone()
    };
    await showModal("Punto de inicio (A) fijado. Mueve el objeto a su destino (B) y pulsa el botón verde para continuar.");
    updateInspector();
}

/**
 * Crea una nueva animación para el objeto seleccionado.
 * La animación comienza en el tiempo actual del scrubber.
 */
export async function createAnimation() {
    if (!appState.animationSetupData) return;
    
    const durationInput = await showModal("Introduce la duración del movimiento en segundos:", { isPrompt: true, defaultValue: "5" });
    if (durationInput === null) { // El usuario canceló
        appState.animationSetupData = null;
        updateInspector();
        return;
    }
    
    const duration = parseFloat(durationInput);
    if (isNaN(duration) || duration <= 0) {
        await showModal("Error: Introduce un número válido y positivo.");
        appState.animationSetupData = null;
        updateInspector();
        return;
    }

    const { object, startPosition } = appState.animationSetupData;
    const endPosition = object.position.clone();

    // Crear el objeto de animación con la estructura mejorada
    const newAnimation = {
        object,
        startPosition,
        endPosition,
        startTime: appState.currentTime, // MEJORA CLAVE: La animación empieza en el tiempo actual.
        duration,
    };

    appState.allAnimations.push(newAnimation);
    
    appState.animationSetupData = null; // Limpiar datos de configuración
    updateInspector();
    updateTimelineUI();
    
    // Devolvemos el objeto a la posición inicial de este clip recién creado
    // para mantener la consistencia visual.
    object.position.copy(startPosition);
    setSceneTime(appState.currentTime);
}

export function playAllAnimations() {
    if (appState.isPlaying) return;
    appState.isPlaying = true;
    document.getElementById('play-btn').classList.add('active');
    document.getElementById('pause-btn').classList.remove('active');
    
    if (appState.currentTime >= appState.timelineDuration) {
        setSceneTime(0);
    }

    playAnimationLoop();
}

export function pauseAllAnimations() {
    appState.isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    document.getElementById('play-btn').classList.remove('active');
    document.getElementById('pause-btn').classList.add('active');
}

export function resetAllAnimations() {
    pauseAllAnimations();
    setSceneTime(0);
    document.getElementById('pause-btn').classList.remove('active');
    document.getElementById('play-btn').classList.remove('active');
}



export function initTimeline() {
    timelineContainer = document.getElementById('timeline-scrubber-area');
    ruler = document.getElementById('timeline-ruler');
    tracksContainer = document.getElementById('timeline-tracks');
    scrubber = document.getElementById('timeline-scrubber');
    timeDisplay = document.getElementById('timeline-time-display');

    if (timelineContainer && scrubber) {
        setupScrubberEvents();
    } else {
        console.warn("Elementos de la línea de tiempo no encontrados. La UI de animación no funcionará.");
    }
}