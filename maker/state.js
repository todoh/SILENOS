// state.js - ESTADO GLOBAL Y GESTI N DE ARCHIVOS
let dirHandle = null;
let projectData = {
    startScene: "zona_1",
    aspectRatio: "horizontal",
    scenes: {
        "zona_1": { name: "Zona Principal", elements: [] }
    },
    itemsConfig: {},
    variablesConfig: {},
    savedElementsConfig: {}
};

let gameState = {
    variables: {}
};

let currentSceneId = "zona_1";
let selectedElementId = null;
let assetsMap = {};
let sessionGeneratedAssets = [];
let isPlayMode = false;
let isIsometricView = false; // Modo 2.5D Mode 7
let copiedElementData = null; // Buffer para Copiar/Pegar

// Estado de edici n interactiva de rutas Waypoint en vivo
let isRouteEditingMode = false;

// Estado de c mara (Zoom y Pan)
let cameraState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    minZoom: 0.1,
    maxZoom: 5.0
};

function getStageDimensions() {
    const ratio = projectData.aspectRatio || "horizontal";
    
    if (ratio === "custom") {
        return { 
            width: Math.max(100, parseInt(projectData.customWidth, 10) || 1920), 
            height: Math.max(100, parseInt(projectData.customHeight, 10) || 1080) 
        };
    }
    
    if (ratio === "vertical") return { width: 540, height: 960 };
    if (ratio === "square") return { width: 720, height: 720 };
    if (ratio === "horizontal") return { width: 960, height: 540 };
    if (ratio === "medium") return { width: 1920, height: 1080 };
    if (ratio === "large") return { width: 1920, height: 1920 };
    if (ratio === "giant") return { width: 7680, height: 4320 };
    if (ratio === "immense") return { width: 12000, height: 8000 };
    if (ratio === "extreme") return { width: 20000, height: 20000 };
    return { width: 960, height: 540 };
}

function getGridSizeForDimensions(width, height) {
    return 16;
}

function initRuntimeVariables() {
    gameState.variables = {};
    if (projectData.variablesConfig) {
        Object.keys(projectData.variablesConfig).forEach(key => {
            const conf = projectData.variablesConfig[key];
            let val = conf.value;
            if (conf.type === 'boolean') {
                val = val === true || val === 'true';
            } else if (conf.type === 'number') {
                val = Number(val) || 0;
            }
            gameState.variables[key] = val;
        });
    }
}

function checkCondition(cond) {
    if (!cond || cond.type === 'none' || !cond.type) return true;
    if (cond.type === 'variable') {
        if (!cond.varId) return true;
        const currentVal = gameState.variables[cond.varId];
        let targetVal = cond.targetVal;
        const varConfig = projectData.variablesConfig ? projectData.variablesConfig[cond.varId] : null;
        const varType = varConfig ? varConfig.type : 'string';
        if (varType === 'boolean') {
            targetVal = targetVal === true || targetVal === 'true';
        } else if (varType === 'number') {
            targetVal = Number(varType) || 0;
        }
        const op = cond.op || '==';
        if (op === '==') return currentVal == targetVal;
        if (op === '!=') return currentVal != targetVal;
        if (op === '>') return currentVal > targetVal;
        if (op === '<') return currentVal < targetVal;
        return true;
    }
    if (cond.type === 'inventory') {
        if (!cond.itemId) return true;
        const hasItem = inventoryManager.hasItem(cond.itemId);
        if (cond.itemState === 'has') return hasItem;
        if (cond.itemState === 'not_has') return !hasItem;
    }
    return true;
}

async function loadProjectFromDir() {
    if (!dirHandle) return;
    assetsMap = {};
    sessionGeneratedAssets = [];
    
    const fileList = document.getElementById('file-list');
    if (fileList) fileList.innerHTML = '';
    
    const genGallery = document.getElementById('gen-session-gallery');
    if (genGallery) genGallery.innerHTML = '';

    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            if (entry.name === 'adventure.json') {
                const file = await entry.getFile();
                const text = await file.text();
                projectData = JSON.parse(text);
                if (!projectData.scenes) projectData.scenes = {};
                if (!projectData.itemsConfig) projectData.itemsConfig = {};
                if (!projectData.variablesConfig) projectData.variablesConfig = {};
                if (!projectData.savedElementsConfig) projectData.savedElementsConfig = {};
                if (!projectData.aspectRatio) projectData.aspectRatio = "horizontal";
            } else if (entry.name.match(/\.(png|jpe?g|gif|webp|svg)$/i)) {
                const file = await entry.getFile();
                await registerAsset(entry.name, file);
            }
        }
    }

    const sceneKeys = Object.keys(projectData.scenes);
    if (sceneKeys.length === 0) {
        projectData.scenes["zona_1"] = { name: "Zona Principal", elements: [] };
    }
    
    if (!currentSceneId || !projectData.scenes[currentSceneId]) {
        currentSceneId = projectData.startScene && projectData.scenes[projectData.startScene] 
            ? projectData.startScene 
            : Object.keys(projectData.scenes)[0];
    }

    if (projectData.assetsData) {
        for (const fileName in projectData.assetsData) {
            if (!assetsMap[fileName]) {
                const dataUrl = projectData.assetsData[fileName];
                const blob = await dataURLtoBlob(dataUrl);
                await registerAsset(fileName, blob);
            }
        }
    }

    const selectAspect = document.getElementById('select-aspect-ratio');
    if (selectAspect) selectAspect.value = projectData.aspectRatio;

    renderSceneTabs();
    renderStage();
    updateInventoryConfigUI();
    updateVariablesConfigUI();
    if (typeof updateElementsUI === 'function') updateElementsUI();
}

async function registerAsset(fileName, fileOrBlob, isGenerated = false) {
    const url = URL.createObjectURL(fileOrBlob);
    const dataUrl = await fileToDataURL(fileOrBlob);
    
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const naturalW = img.naturalWidth || 100;
            const naturalH = img.naturalHeight || 100;
            const aspect = naturalW / naturalH;
            
            assetsMap[fileName] = { 
                url, 
                dataUrl, 
                aspect, 
                width: naturalW, 
                height: naturalH 
            };
            
            renderAssetCard(fileName, url);
            renderAssetPickerGrid();
            
            if (isGenerated) {
                if (!sessionGeneratedAssets.includes(fileName)) {
                    sessionGeneratedAssets.push(fileName);
                }
                renderSessionGenCard(fileName, url);
            }
            
            updatePropertiesPanel();
            resolve(assetsMap[fileName]);
        };
        img.src = url;
    });
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function dataURLtoBlob(dataUrl) {
    return fetch(dataUrl).then(res => res.blob());
}

async function autoSaveJSON() {
    if (!dirHandle) return;
    try {
        for (const fileName in assetsMap) {
            try {
                await dirHandle.getFileHandle(fileName, { create: false });
            } catch (e) {
                try {
                    const newFileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                    const blob = await dataURLtoBlob(assetsMap[fileName].dataUrl);
                    const writable = await newFileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } catch (errWrite) {
                    console.error(`Error guardando asset ${fileName} en el disco:`, errWrite);
                }
            }
        }
        const fileHandle = await dirHandle.getFileHandle('adventure.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(projectData, null, 2));
        await writable.close();
    } catch (err) {
        console.error("Error guardando proyecto:", err);
    }
}

function renderAssetCard(fileName, url) {
    if (document.getElementById(`asset-${fileName}`)) return;
    const fileList = document.getElementById('file-list');
    if (!fileList) return;
    
    const card = document.createElement('div');
    card.className = 'asset-card';
    card.id = `asset-${fileName}`;
    card.draggable = true;
    card.innerHTML = `<img src="${url}" alt="${fileName}"><span>${fileName}</span>`;
    
    const imgEl = card.querySelector('img');
    imgEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(url, fileName);
    });

    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', fileName);
    });

    fileList.appendChild(card);
}

function renderSessionGenCard(fileName, url) {
    const genGallery = document.getElementById('gen-session-gallery');
    if (!genGallery) return;
    if (document.getElementById(`gen-asset-${fileName}`)) return;

    const card = document.createElement('div');
    card.className = 'gen-card';
    card.id = `gen-asset-${fileName}`;
    card.draggable = true;
    card.innerHTML = `<img src="${url}" alt="${fileName}"><span>${fileName}</span>`;

    const imgEl = card.querySelector('img');
    imgEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(url, fileName);
    });

    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', fileName);
    });

    genGallery.prepend(card);
}

function openLightbox(url, captionText = '') {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    
    if (!modal || !img) return;
    img.src = url;
    if (caption) caption.textContent = captionText;
    modal.style.display = 'flex';
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    if (modal) modal.style.display = 'none';
    if (img) img.src = '';
}