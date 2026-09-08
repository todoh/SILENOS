// io.js - GESTIÓN DE EXPORTACIÓN E IMPORTACIÓN JSON
document.addEventListener('DOMContentLoaded', () => {
    const btnExportJson = document.getElementById('btn-export-json');
    const btnImportJson = document.getElementById('btn-import-json');
    const ioJsonFileInput = document.getElementById('io-json-file-input');
    const ioIncludeBase64 = document.getElementById('io-include-base64');
    const ioIncludeElementsBase64 = document.getElementById('io-include-elements-base64');
    const ioMergeMode = document.getElementById('io-merge-mode');
    const ioStatus = document.getElementById('io-status');

    if (btnExportJson) {
        btnExportJson.addEventListener('click', async () => {
            ioStatus.textContent = "Generando archivo JSON...";
            try {
                const exportData = JSON.parse(JSON.stringify(projectData));
                
                const includeBase64 = ioIncludeBase64 && ioIncludeBase64.checked;
                const includeElementsBase64 = ioIncludeElementsBase64 && ioIncludeElementsBase64.checked;

                if (includeBase64 || includeElementsBase64) {
                    exportData.assetsData = {};
                    for (const key in assetsMap) {
                        exportData.assetsData[key] = assetsMap[key].dataUrl;
                    }
                    if (includeElementsBase64 && exportData.savedElementsConfig) {
                        Object.values(exportData.savedElementsConfig).forEach(elem => {
                            if (!elem.isText && elem.image && assetsMap[elem.image]) {
                                exportData.assetsData[elem.image] = assetsMap[elem.image].dataUrl;
                            }
                        });
                    }
                } else {
                    delete exportData.assetsData;
                    delete projectData.assetsData;
                }

                const jsonStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `koreh_mapa_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(a.href);

                if (!includeBase64 && !includeElementsBase64) {
                    await autoSaveJSON();
                }
                ioStatus.textContent = "💾 Proyecto exportado correctamente";
                setTimeout(() => { ioStatus.textContent = ""; }, 3000);
            } catch (err) {
                console.error(err);
                ioStatus.textContent = "Error al exportar JSON";
            }
        });
    }

    if (btnImportJson) {
        btnImportJson.addEventListener('click', () => {
            if (ioJsonFileInput) ioJsonFileInput.click();
        });
    }

    if (ioJsonFileInput) {
        ioJsonFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            ioStatus.textContent = "Cargando datos del JSON...";
            try {
                const text = await file.text();
                const importedData = JSON.parse(text);
                const isMerge = ioMergeMode ? ioMergeMode.value === 'merge' : false;

                if (isMerge) {
                    if (importedData.scenes) {
                        Object.keys(importedData.scenes).forEach(sceneId => {
                            let newId = sceneId;
                            if (projectData.scenes[newId]) {
                                newId = sceneId + '_' + Date.now();
                            }
                            projectData.scenes[newId] = importedData.scenes[sceneId];
                        });
                    }
                    if (importedData.itemsConfig) {
                        projectData.itemsConfig = { ...projectData.itemsConfig, ...importedData.itemsConfig };
                    }
                    if (importedData.variablesConfig) {
                        projectData.variablesConfig = { ...projectData.variablesConfig, ...importedData.variablesConfig };
                    }
                    if (importedData.savedElementsConfig) {
                        projectData.savedElementsConfig = { ...projectData.savedElementsConfig, ...importedData.savedElementsConfig };
                    }
                } else {
                    projectData = importedData;
                    if (!projectData.scenes) projectData.scenes = {};
                    if (!projectData.itemsConfig) projectData.itemsConfig = {};
                    if (!projectData.variablesConfig) projectData.variablesConfig = {};
                    if (!projectData.savedElementsConfig) projectData.savedElementsConfig = {};
                    if (!projectData.aspectRatio) projectData.aspectRatio = "horizontal";
                }

                if (importedData.assetsData) {
                    for (const fileName in importedData.assetsData) {
                        const dataUrl = importedData.assetsData[fileName];
                        if (!assetsMap[fileName]) {
                            const res = await fetch(dataUrl);
                            const blob = await res.blob();
                            await registerAsset(fileName, blob);
                        }
                    }
                }

                if (!projectData.startScene || !projectData.scenes[projectData.startScene]) {
                    projectData.startScene = Object.keys(projectData.scenes)[0] || "zona_1";
                }
                currentSceneId = projectData.startScene;
                renderSceneTabs();
                renderStage();
                updateInventoryConfigUI();
                updateVariablesConfigUI();
                if (typeof updateElementsUI === 'function') updateElementsUI();

                await autoSaveJSON();
                ioStatus.textContent = isMerge ? "✅ Zonas y datos anexados correctamente" : "✅ Proyecto cargado correctamente";
                setTimeout(() => { ioStatus.textContent = ""; }, 3000);
            } catch (err) {
                console.error(err);
                ioStatus.textContent = "Error al procesar el archivo JSON";
            }
            ioJsonFileInput.value = '';
        });
    }
});