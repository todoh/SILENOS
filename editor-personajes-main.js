// ===============================================
// SCRIPT PRINCIPAL DEL EDITOR DE PERSONAJES
// ===============================================

function initCharacterEditor() {
    
    // --- MODELO DE DATOS CENTRAL ---
    const characterData = {
        skinColor: '#e0ac69', eyeColor: '#5b3a29', hairColor: '#d6b881',
        detailColor: '#2d3748', eyeWhiteColor: '#ffffff', height: 175,
        // Morphs de cabeza
        headWidth: 0.5, foreheadHeight: 0.5, cheekProminence: 0.5,
        jawWidth: 0.5, chinHeight: 0.5, earSize: 0.5,
        // Morphs de cuerpo
        bodyWidth: 0.5, muscleStrength: 0.4,
        // Opciones
        hairStyle: 'hair-short', eyeShape: 'eyes-default', mouthShape: 'mouth-smile',
        earStyle: 'ear-human',
    };

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const editorContainer = document.getElementById('galeria-editor-personajes');
    if (!editorContainer) {
        console.error("No se pudo encontrar el contenedor del editor de personajes (#galeria-editor-personajes).");
        return;
    }

    const rootStyle = document.documentElement.style;
    const characterRoot = editorContainer.querySelector('#character-root');

    const controls = {
        skinColor: editorContainer.querySelector('#skin-color'), eyeColor: editorContainer.querySelector('#eye-color'),
        hairColor: editorContainer.querySelector('#hair-color'), height: editorContainer.querySelector('#height'),
        jawWidth: editorContainer.querySelector('#jaw-width'), headWidth: editorContainer.querySelector('#head-width'),
        foreheadHeight: editorContainer.querySelector('#forehead-height'), cheekProminence: editorContainer.querySelector('#cheek-prominence'),
        chinHeight: editorContainer.querySelector('#chin-height'), earSize: editorContainer.querySelector('#ear-size'),
        bodyWidth: editorContainer.querySelector('#body-width'), muscleStrength: editorContainer.querySelector('#muscle-strength'),
    };

    const valueLabels = {
        height: editorContainer.querySelector('#height-value'), jawWidth: editorContainer.querySelector('#jaw-width-value'),
        headWidth: editorContainer.querySelector('#head-width-value'), foreheadHeight: editorContainer.querySelector('#forehead-height-value'),
        cheekProminence: editorContainer.querySelector('#cheek-prominence-value'), chinHeight: editorContainer.querySelector('#chin-height-value'),
        earSize: editorContainer.querySelector('#ear-size-value'), bodyWidth: editorContainer.querySelector('#body-width-value'),
        muscleStrength: editorContainer.querySelector('#muscle-strength-value'),
    };
    
    const optionSelectors = {
        hairStyle: editorContainer.querySelector('#hair-style-options'),
        eyeShape: editorContainer.querySelector('#eye-shape-options'),
        mouthShape: editorContainer.querySelector('#mouth-shape-options'),
        earStyle: editorContainer.querySelector('#ear-style-options'),
    };

    // --- FUNCIÓN DE RENDERIZADO PRINCIPAL ---
    function renderCharacter() {
        // 1. Colores y Altura Global
        rootStyle.setProperty('--skin-color', characterData.skinColor);
        rootStyle.setProperty('--eye-color', characterData.eyeColor);
        rootStyle.setProperty('--hair-color', characterData.hairColor);
        rootStyle.setProperty('--detail-color', characterData.detailColor);
        rootStyle.setProperty('--eye-white-color', characterData.eyeWhiteColor);

        const heightScale = (characterData.height - 150) / 50 * 0.2 + 0.9;
        if(characterRoot) characterRoot.setAttribute('transform', `translate(0, ${600 * (1 - heightScale)}) scale(1, ${heightScale})`);

        // 2. Delegar actualizaciones a los módulos
        if (typeof updateHead === 'function') updateHead(characterData);
        if (typeof updateBody === 'function') updateBody(characterData);
    }

    // --- MANEJADORES DE EVENTOS ---
    function setupEventListeners() {
        // Eventos para sliders y colores
        Object.keys(controls).forEach(key => {
            if(!controls[key]) return;
            controls[key].addEventListener('input', (e) => {
                const value = e.target.value;
                if (e.target.type === 'range') {
                    const min = parseFloat(e.target.min);
                    const max = parseFloat(e.target.max);
                    
                    if (key === 'height') {
                        characterData.height = parseInt(value, 10);
                        valueLabels.height.textContent = Math.round(value);
                    } else {
                        let normalizedValue = (value - min) / (max - min);
                        characterData[key] = normalizedValue;
                        valueLabels[key].textContent = Math.round(value);
                    }
                } else {
                    characterData[key] = value;
                }
                renderCharacter();
            });
        });
        
        // Eventos para selectores de opciones (pelo, ojos, boca, orejas)
        Object.keys(optionSelectors).forEach(part => {
            if(!optionSelectors[part]) return;
            optionSelectors[part].addEventListener('click', (e) => {
                const card = e.target.closest('.option-card');
                if (!card) return;
                if (card.classList.contains('selected')) return;
                
                characterData[part] = card.dataset.value;

                optionSelectors[part].querySelectorAll('.option-card').forEach(c => c.classList.remove('selected', 'border-blue-400', 'shadow-lg'));
                card.classList.add('selected', 'border-blue-400', 'shadow-lg');

                renderCharacter();
            });
        });
        
        // Eventos para el acordeón
        editorContainer.querySelectorAll('.accordion-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const target = editorContainer.querySelector(button.dataset.target);
                if (!target) return;
                const isOpen = target.classList.contains('open');
                
                if (!isOpen) {
                    target.classList.add('open');
                } else {
                    target.classList.remove('open');
                }
            });
        });
    }

    // --- INICIALIZACIÓN ---
    function init() {
        // Inicializar módulos
        if (typeof initBody === 'function') initBody();
        if (typeof initHead === 'function') initHead();

        // Cargar valores iniciales a los controles de la UI
        Object.keys(controls).forEach(key => {
            if (!controls[key]) return;
            if (controls[key].type === 'range' && key !== 'height') {
                const slider = controls[key];
                const normalizedValue = characterData[key];
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                slider.value = min + (normalizedValue * (max-min));
                if (valueLabels[key]) {
                    valueLabels[key].textContent = Math.round(slider.value);
                }
            } else if (key === 'height') {
                controls.height.value = characterData.height;
                if (valueLabels.height) {
                    valueLabels.height.textContent = characterData.height;
                }
            } else {
                 controls[key].value = characterData[key];
            }
        });
        
        // Sincronizar el estado inicial de los selectores de opción
         Object.keys(optionSelectors).forEach(part => {
            const container = optionSelectors[part];
            if (!container) return;
            const value = characterData[part];
            const card = container.querySelector(`.option-card[data-value="${value}"]`);
            if (card) {
                container.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            }
        });

        setupEventListeners();
        renderCharacter(); // Renderizado inicial
    }

    init();
}
