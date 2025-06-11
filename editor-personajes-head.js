// ===============================================
// SCRIPT PARA LA CABEZA DEL EDITOR DE PERSONAJES
// ===============================================

// --- VARIABLES GLOBALES DEL MÓDULO ---
let headShape, earLeft, earRight, hairSlot, eyeSlot, mouthSlot;
const editorContainerForHead = document.getElementById('galeria-editor-personajes');


/**
 * Inicializa las referencias a los elementos de la cabeza.
 */
function initHead() {
    if (!editorContainerForHead) return;
    headShape = editorContainerForHead.querySelector('#head-shape');
    earLeft = editorContainerForHead.querySelector('#ear-left-slot');
    earRight = editorContainerForHead.querySelector('#ear-right-slot');
    hairSlot = editorContainerForHead.querySelector('#hair-slot');
    eyeSlot = editorContainerForHead.querySelector('#eye-slot');
    mouthSlot = editorContainerForHead.querySelector('#mouth-slot');
}

/**
 * Actualiza la apariencia de la cabeza basándose en los datos del personaje.
 * @param {object} characterData - El objeto de datos del personaje.
 */
function updateHead(characterData) {
    if (!headShape) return;
    
    // 1. Actualizar slots (partes intercambiables)
    hairSlot.setAttribute('href', `#${characterData.hairStyle}`);
    eyeSlot.setAttribute('href', `#${characterData.eyeShape}`);
    mouthSlot.setAttribute('href', `#${characterData.mouthShape}`);
    earLeft.setAttribute('href', `#${characterData.earStyle}`);
    earRight.setAttribute('href', `#${characterData.earStyle}`);


    // 2. Aplicar morphs a la forma de la cabeza
    const hw = (characterData.headWidth - 0.5) * 40;
    const fh = (characterData.foreheadHeight - 0.5) * 20;
    const cp = (characterData.cheekProminence - 0.5) * 20;
    const jw = (characterData.jawWidth - 0.5) * 30;
    const ch = (characterData.chinHeight - 0.5) * 20;
    const es = 0.7 + characterData.earSize * 0.6;

    const headPath = `M${0},${70+ch} C${-50-jw},${70+ch} ${-80-hw-cp},${20} ${-60-hw},-20 C${-40-hw},${-70-fh} ${40+hw},${-70-fh} ${60+hw},-20 C${80+hw+cp},${20} ${50+jw},${70+ch} ${0},${70+ch} Z`;
    headShape.setAttribute('d', headPath);
    
    // 3. Lógica de anclaje y escalado de orejas
    const earAnchorX = 60 + hw + (cp * 0.5);
    const earAnchorY = -15;

    earLeft.setAttribute('transform', `translate(${-earAnchorX}, ${earAnchorY}) scale(-${es}, ${es})`);
    earRight.setAttribute('transform', `translate(${earAnchorX}, ${earAnchorY}) scale(${es}, ${es})`);
}
