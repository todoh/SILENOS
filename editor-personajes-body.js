// ===============================================
// SCRIPT PARA EL CUERPO DEL EDITOR DE PERSONAJES
// ===============================================

// --- VARIABLES GLOBALES DEL MÓDULO ---
let torsoShape, armLeftGroup, armRightGroup, legLeftGroup, legRightGroup;
let parsedTorsoSlim, parsedTorsoWide;
const editorContainerForBody = document.getElementById('galeria-editor-personajes');


// --- FORMAS CLAVE (KEYFRAMES) PARA EL TORSO ---
const torsoSlimPathString = "M-15,25 C-45,30 -50,80 -35,160 L35,160 C50,80 45,30 15,25 L10,0 L-10,0 Z";
const torsoWidePathString = "M-25,25 C-80,30 -90,90 -50,160 L50,160 C90,90 80,30 25,25 L20,0 L-20,0 Z";

// --- FUNCIONES DE MORPHING ---
function parsePath(pathString) {
    const pathSegments = pathString.match(/[a-df-z][^a-df-z]*/ig) || [];
    return pathSegments.map(segment => {
        const command = segment.charAt(0);
        const args = segment.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
        return { command, args };
    });
}

function interpolatePaths(parsedPathA, parsedPathB, t) {
    if (parsedPathA.length !== parsedPathB.length) return parsedPathA;
    return parsedPathA.map((segmentA, i) => {
        const segmentB = parsedPathB[i];
        if (segmentA.command !== segmentB.command) return segmentA;
        const interpolatedArgs = segmentA.args.map((argA, j) => argA + (segmentB.args[j] - argA) * t);
        return { command: segmentA.command, args: interpolatedArgs };
    });
}

function stringifyPath(parsedPath) {
    return parsedPath.map(segment => segment.command + segment.args.join(' ')).join('');
}

/**
 * Inicializa las referencias a los elementos del cuerpo y parsea las formas clave.
 */
function initBody() {
    if(!editorContainerForBody) return;
    torsoShape = editorContainerForBody.querySelector('#torso-shape');
    armLeftGroup = editorContainerForBody.querySelector('#arm-left-group');
    armRightGroup = editorContainerForBody.querySelector('#arm-right-group');
    legLeftGroup = editorContainerForBody.querySelector('#leg-left-group');
    legRightGroup = editorContainerForBody.querySelector('#leg-right-group');

    parsedTorsoSlim = parsePath(torsoSlimPathString);
    parsedTorsoWide = parsePath(torsoWidePathString);
}

/**
 * Actualiza la apariencia del cuerpo basándose en los datos del personaje.
 * @param {object} characterData - El objeto de datos del personaje.
 */
function updateBody(characterData) {
    if(!torsoShape) return;

    const bodyWidthFactor = characterData.bodyWidth;
    const muscleScale = 0.8 + (characterData.muscleStrength * 0.8);
    
    // 1. Morfear la forma del torso basado en el ancho del cuerpo
    const morphedPathObject = interpolatePaths(parsedTorsoSlim, parsedTorsoWide, bodyWidthFactor);
    const newTorsoPath = stringifyPath(morphedPathObject);
    torsoShape.setAttribute('d', newTorsoPath);

    // 2. Escalar la forma del torso por la musculatura
    torsoShape.setAttribute('transform', `scale(${muscleScale}, 1)`);
    
    // 3. Posicionar las extremidades basado en ancho y musculatura
    const armOffset = (bodyWidthFactor * 35) + (characterData.muscleStrength * 20);
    const legOffset = (bodyWidthFactor * 5) + (characterData.muscleStrength * 10);
    
    armLeftGroup.setAttribute('transform', `translate(${155 - armOffset}, 245) rotate(15) scale(${muscleScale}, 1)`);
    armRightGroup.setAttribute('transform', `translate(${245 + armOffset}, 245) rotate(-15) scale(${muscleScale}, 1)`);

    legLeftGroup.setAttribute('transform', `translate(${170 - legOffset}, 380) scale(${muscleScale}, 1)`);
    legRightGroup.setAttribute('transform', `translate(${230 + legOffset}, 380) scale(${muscleScale}, 1)`);
}
