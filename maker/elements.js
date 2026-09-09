// elements.js - GESTIÓN DE ELEMENTOS REUTILIZABLES (COPIAR, PEGAR, ARRASTRAR Y EDITAR EN PANEL DERECHO)
let selectedSavedElementKey = null;

class ElementsManager {
    constructor() {
        this.savedElements = {};
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            const btnSaveCopied = document.getElementById('btn-save-copied-element');
            if (btnSaveCopied) {
                btnSaveCopied.addEventListener('click', () => {
                    this.saveCurrentCopiedElement();
                });
            }
        });
    }

    // Guarda el elemento que se encuentra actualmente copiado en el buffer (copiedElementData)
    saveCurrentCopiedElement() {
        if (!copiedElementData) {
            alert('No hay ningún elemento copiado en la memoria. Copia un elemento del canvas (Ctrl+C o Clic Derecho -> Copiar) antes de guardarlo.');
            return;
        }

        const namePrompt = prompt("Nombre para guardar este elemento:", copiedElementData.textContent || copiedElementData.id || "Nuevo Elemento");
        if (!namePrompt) return;

        const elemId = 'saved_' + Date.now();
        
        // Clona el objeto reteniendo dimensiones, colisión, física, acciones e interacción
        const elementToSave = JSON.parse(JSON.stringify(copiedElementData));
        elementToSave.savedName = namePrompt.trim();

        if (!projectData.savedElementsConfig) {
            projectData.savedElementsConfig = {};
        }

        projectData.savedElementsConfig[elemId] = elementToSave;
        
        if (typeof autoSaveJSON === 'function') {
            autoSaveJSON();
        }

        // Seleccionar automáticamente el elemento guardado para editarlo en el panel derecho
        selectedSavedElementKey = elemId;
        selectedElementId = null;
        if (typeof renderStage === 'function') renderStage();
        this.renderElementsList();
        if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
    }

    // Renderiza la lista de elementos en la pestaña lateral
    renderElementsList() {
        const listContainer = document.getElementById('saved-elements-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        const savedConfig = projectData.savedElementsConfig || {};
        const savedKeys = Object.keys(savedConfig);

        if (savedKeys.length === 0) {
            listContainer.innerHTML = '<span style="font-size: 11px; color: var(--text-secondary); text-align: center; display: block; margin-top: 10px;">No hay elementos guardados.<br>Copia un elemento del canvas y presiona "Guardar Elemento Copiado".</span>';
            return;
        }

        savedKeys.forEach(key => {
            const elemData = savedConfig[key];
            const isSelected = selectedSavedElementKey === key;

            const card = document.createElement('div');
            card.className = `asset-card ${isSelected ? 'selected' : ''}`;
            card.style.cssText = `
                position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; 
                background: ${isSelected ? 'rgba(0,113,227,0.12)' : 'rgba(255,255,255,0.85)'}; 
                border: ${isSelected ? '2px solid #0071e3' : '1px solid var(--border-subtle)'}; 
                padding: 8px; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s ease;
            `;
            card.draggable = true;

            // Obtener vista previa visual (Imagen o Texto)
            let previewHTML = '';
            if (elemData.isText) {
                previewHTML = `<div style="font-size: 14px; font-weight: bold; height: 50px; display: flex; align-items: center; justify-content: center; overflow: hidden; color: ${elemData.textColor || '#000'};">${elemData.textContent || 'Texto'}</div>`;
            } else {
                const asset = typeof assetsMap !== 'undefined' ? assetsMap[elemData.image] : null;
                const imgSrc = asset ? (asset.dataUrl || asset.url) : elemData.image;
                previewHTML = `<img src="${imgSrc}" style="width: 100%; height: 50px; object-fit: contain; display: block; margin-bottom: 4px; pointer-events: none;">`;
            }

            card.innerHTML = `
                ${previewHTML}
                <strong style="font-size: 10px; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; width: 100%; text-align: center;">${elemData.savedName || 'Elemento'}</strong>
                <span style="font-size: 8px; color: var(--text-secondary);">${elemData.width || 100}x${elemData.height || 100} px</span>
                <div style="display: flex; gap: 4px; margin-top: 6px; width: 100%;">
                    <button class="btn btn-select-elem" style="flex: 1; padding: 2px 4px; font-size: 9px; background: ${isSelected ? '#0071e3' : '#5856d6'}; color: white; border: none;">${isSelected ? 'Editando' : 'Editar'}</button>
                    <button class="btn btn-duplicate" style="padding: 2px 4px; font-size: 9px; background: var(--accent-light); color: var(--accent-blue); border: none;">Duplicar</button>
                    <button class="btn btn-delete" style="padding: 2px 4px; font-size: 9px; background: #ff3b30; color: white; border: none;">Borrar</button>
                </div>
            `;

            // Drag and Drop hacia el Canvas pasando los datos completos del elemento serializados
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(elemData));
                e.dataTransfer.setData('text/plain', 'saved_element');
            });

            // Clic en la tarjeta para seleccionar y editar en la ventana de la derecha
            card.onclick = () => {
                selectedSavedElementKey = key;
                selectedElementId = null;
                if (typeof renderStage === 'function') renderStage();
                this.renderElementsList();
                if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
            };

            // Botón Editar
            const btnEdit = card.querySelector('.btn-select-elem');
            btnEdit.onclick = (ev) => {
                ev.stopPropagation();
                selectedSavedElementKey = key;
                selectedElementId = null;
                if (typeof renderStage === 'function') renderStage();
                this.renderElementsList();
                if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
            };

            // Botón Duplicar
            card.querySelector('.btn-duplicate').onclick = (ev) => {
                ev.stopPropagation();
                const dupId = 'saved_' + Date.now();
                const dupData = JSON.parse(JSON.stringify(elemData));
                dupData.savedName = (elemData.savedName || 'Elemento') + ' (Copia)';
                projectData.savedElementsConfig[dupId] = dupData;
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
                this.renderElementsList();
            };

            // Botón Borrar
            card.querySelector('.btn-delete').onclick = (ev) => {
                ev.stopPropagation();
                if (confirm(`¿Borrar el elemento guardado "${elemData.savedName || key}"?`)) {
                    delete projectData.savedElementsConfig[key];
                    if (selectedSavedElementKey === key) {
                        selectedSavedElementKey = null;
                        if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
                    }
                    if (typeof autoSaveJSON === 'function') autoSaveJSON();
                    this.renderElementsList();
                }
            };

            listContainer.appendChild(card);
        });
    }
}

const elementsManager = new ElementsManager();

function updateElementsUI() {
    elementsManager.renderElementsList();
}