// logic-events.js - MANEJADORES DE EVENTOS DE CANVAS, DRAG&DROP Y VARIABLES
document.addEventListener('DOMContentLoaded', () => {
    const stage = document.getElementById('stage');
    const selectAspectRatio = document.getElementById('select-aspect-ratio');
    const customDimContainer = document.getElementById('custom-dim-container');
    const inputCustomWidth = document.getElementById('input-custom-width');
    const inputCustomHeight = document.getElementById('input-custom-height');
    const varKeyInput = document.getElementById('var-key');
    const varTypeInput = document.getElementById('var-type');
    const varValInput = document.getElementById('var-val');
    const btnSaveVariable = document.getElementById('btn-save-variable');

    // --- DRAG AND DROP EN EL STAGE (MANEJA ASSETS Y ELEMENTOS GUARDADOS) ---
    if (stage) {
        stage.addEventListener('dragover', (e) => e.preventDefault());
        stage.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (isPlayMode) return;
            if (!projectData) projectData = { scenes: {} };
            if (!projectData.scenes) projectData.scenes = {};
            if (!currentSceneId || !projectData.scenes[currentSceneId]) {
                const firstSceneKey = Object.keys(projectData.scenes)[0];
                if (firstSceneKey) {
                    currentSceneId = firstSceneKey;
                } else {
                    currentSceneId = "zona_1";
                    projectData.scenes[currentSceneId] = { name: "Zona Principal", elements: [] };
                }
            }
            if (!projectData.scenes[currentSceneId].elements) {
                projectData.scenes[currentSceneId].elements = [];
            }
            const rect = stage.getBoundingClientRect();
            const dim = getStageDimensions();
            const scaleX = dim.width / rect.width;
            const scaleY = dim.height / rect.height;
            const savedElemJson = e.dataTransfer.getData('application/json');
            const dropType = e.dataTransfer.getData('text/plain');

            // CASO A: Se soltó un Elemento Reutilizable Guardado
            if (dropType === 'saved_element' && savedElemJson) {
                const elemData = JSON.parse(savedElemJson);
                const newElement = JSON.parse(JSON.stringify(elemData));
                
                newElement.id = 'elem_' + Date.now();
                delete newElement.savedName;
                const targetW = elemData.width || 100;
                const targetH = elemData.height || 100;
                const x = Math.round(((e.clientX - rect.left) * scaleX) - (targetW / 2));
                const y = Math.round(((e.clientY - rect.top) * scaleY) - (targetH / 2));
                newElement.x = Math.max(0, x);
                newElement.y = Math.max(0, y);
                projectData.scenes[currentSceneId].elements.push(newElement);
                selectedElementId = newElement.id;
                renderStage();
                autoSaveJSON();
                return;
            }

            // CASO B: Se soltó una Imagen desde Assets directamente
            const fileName = dropType;
            if (!fileName || !assetsMap[fileName]) return;
            const asset = assetsMap[fileName];
            let targetW = Math.min(250, asset.width);
            let targetH = targetW / asset.aspect;
            const x = Math.round(((e.clientX - rect.left) * scaleX) - (targetW / 2));
            const y = Math.round(((e.clientY - rect.top) * scaleY) - (targetH / 2));
            const newElement = {
                id: 'elem_' + Date.now(),
                image: fileName,
                x: Math.max(0, x),
                y: Math.max(0, y),
                width: Math.round(targetW),
                height: Math.round(targetH),
                rotation: 0,
                type: 'decoracion',
                keepAspect: true,
                dialog: '',
                targetScene: '',
                addItem: [],
                removeItem: [],
                condition: { type: 'none' },
                setVariable: { varId: '', value: '' }
            };
            projectData.scenes[currentSceneId].elements.push(newElement);
            selectedElementId = newElement.id;
            renderStage();
            autoSaveJSON();
        });
    }

    // --- MANEJADORES DE ASPECT RATIO Y TAMAÑO PERSONALIZADO ---
    if (selectAspectRatio) {
        selectAspectRatio.addEventListener('change', () => {
            projectData.aspectRatio = selectAspectRatio.value;
            if (customDimContainer) {
                customDimContainer.style.display = selectAspectRatio.value === 'custom' ? 'flex' : 'none';
            }
            if (typeof resetCamera === 'function') resetCamera();
            autoSaveJSON();
            renderStage();
            fitStage();
        });
    }

    const updateCustomDimensions = () => {
        if (inputCustomWidth && inputCustomHeight) {
            projectData.customWidth = Math.max(100, parseInt(inputCustomWidth.value, 10) || 1920);
            projectData.customHeight = Math.max(100, parseInt(inputCustomHeight.value, 10) || 1080);
            autoSaveJSON();
            renderStage();
            fitStage();
        }
    };
    if (inputCustomWidth) inputCustomWidth.addEventListener('input', updateCustomDimensions);
    if (inputCustomHeight) inputCustomHeight.addEventListener('input', updateCustomDimensions);

    // --- GESTIÓN DE VARIABLES ---
    if (btnSaveVariable) {
        btnSaveVariable.addEventListener('click', () => {
            const key = varKeyInput.value.trim().replace(/\s+/g, '_');
            const type = varTypeInput.value;
            let val = varValInput.value.trim();
            
            if (!key) {
                alert('Por favor introduce un ID válido para la variable.');
                return;
            }
            
            if (type === 'boolean') {
                val = val === 'true' || val === '1';
            } else if (type === 'number') {
                val = Number(val) || 0;
            }
            
            if (!projectData.variablesConfig) projectData.variablesConfig = {};
            projectData.variablesConfig[key] = { type, value: val };
            
            autoSaveJSON();
            updateVariablesConfigUI();
            updatePropertiesPanel();
            
            varKeyInput.value = '';
            varValInput.value = '';
        });
    }
});