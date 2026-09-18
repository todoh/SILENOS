// export-assets.js - SUBMÓDULO DE RECOPILACIÓN Y EMPAQUETADO DE ASSETS
function collectExportAssets() {
    const usedAssetKeys = new Set();
    
    if (projectData.scenes) {
        Object.values(projectData.scenes).forEach(scene => {
            if (scene.elements) {
                scene.elements.forEach(elem => {
                    if (!elem.isText && elem.image) {
                        usedAssetKeys.add(elem.image);
                    }
                    if (elem.transformAsset) {
                        const savedConfig = projectData.savedElementsConfig || {};
                        if (savedConfig[elem.transformAsset] && savedConfig[elem.transformAsset].image) {
                            usedAssetKeys.add(savedConfig[elem.transformAsset].image);
                        } else if (assetsMap[elem.transformAsset]) {
                            usedAssetKeys.add(elem.transformAsset);
                        }
                    }
                });
            }
        });
    }

    if (projectData.savedElementsConfig) {
        Object.values(projectData.savedElementsConfig).forEach(savedElem => {
            if (!savedElem.isText && savedElem.image) {
                usedAssetKeys.add(savedElem.image);
            }
        });
    }

    if (projectData.itemsConfig) {
        Object.values(projectData.itemsConfig).forEach(item => {
            if (item.imageAsset) {
                usedAssetKeys.add(item.imageAsset);
            }
        });
    }

    const assetsData = {};
    usedAssetKeys.forEach(key => {
        if (assetsMap[key] && assetsMap[key].dataUrl) {
            assetsData[key] = assetsMap[key].dataUrl;
        }
    });

    return assetsData;
}