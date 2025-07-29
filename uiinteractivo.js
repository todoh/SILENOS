// editor-ui.js
const editorUI = {

    getSettingsTabHTML(locations, currentSettings) {
        const locationsOptions = Object.keys(locations)
            .map(id => `<option value="${id}" ${currentSettings.initialLocation === id ? 'selected' : ''}>${id}</option>`)
            .join('');

        return `
            <div class="form-group">
                <label for="setting-initial-location">Ubicación Inicial del Jugador</label>
                <select id="setting-initial-location" data-key="initialLocation">
                    <option value="">-- Selecciona una ubicación --</option>
                    ${locationsOptions}
                </select>
            </div>`;
    },

    getActionEditorHTML(actionData = {}, index = 0) {
        let optionsHTML = '<option value="">-- Selecciona una acción --</option>';
        for (const funcName in gameActionsMetadata) {
            optionsHTML += `<option value="${funcName}" ${actionData.function === funcName ? 'selected' : ''}>${funcName}</option>`;
        }

        let paramsHTML = '';
        if (actionData.function && gameActionsMetadata[actionData.function]) {
            const metadata = gameActionsMetadata[actionData.function];
            paramsHTML = metadata.params.map((paramLabel, i) => `
                <div class="form-group">
                    <label>${paramLabel}</label>
                    <input type="text" class="action-param" value="${actionData.params[i] || ''}">
                </div>
            `).join('');
        }

        return `
            <div class="action-editor-container" data-index="${index}">
                <div class="form-group">
                    <label>Función a Ejecutar</label>
                    <select class="action-function-selector">${optionsHTML}</select>
                </div>
                <div class="action-params">${paramsHTML}</div>
            </div>
        `;
    },

    getModalFormHTML(type, id, data, isSceneEditor = false) {
        const item = id ? data[type][id] : {};
        let html = `
            <div class="form-group" style="grid-column: 1 / -1;">
                <label for="edit-id">ID (único, sin espacios)</label>
                <input type="text" id="edit-id" value="${id || ''}" ${id ? 'disabled' : ''}>
            </div>
        `;

        const createField = (field, itemData) => {
            const value = itemData[field.key] || (field.type === 'number' ? '0' : '');
             if (field.type === 'textarea') {
                return `<div class="form-group" style="grid-column: 1 / -1;"><label>${field.label}</label><textarea data-key="${field.key}" rows="4">${value}</textarea></div>`;
            }
            return `<div class="form-group"><label>${field.label}</label><input type="${field.type || 'text'}" data-key="${field.key}" value="${value}"></div>`;
        };
        
        // MODIFICADO: Ahora incluye el botón de carga
        const createImageUploader = (field, itemData) => `
            <div class="form-group" style="grid-column: 1 / -1;"><label>${field.label}</label><div class="image-uploader">
                <img src="${itemData.image || ''}" class="image-preview">
                <input type="hidden" data-key="image" value="${itemData.image || ''}">
                <input type="file" accept="image/*" class="image-input" style="display: none;">
                <button type="button" class="btn btn-upload">Cargar Imagen</button>
            </div></div>`;

        switch (type) {
            case 'npcs':
                html += createField({ key: 'name', label: 'Nombre del NPC' }, item);
                html += createImageUploader({ label: 'Imagen del NPC' }, item);
                html += createField({ key: 'dialogue', label: 'Diálogo Inicial', type: 'textarea' }, item);

                let optionsHTML = (item.options || []).map((option, index) => `
                    <div class="dialogue-option-row" data-index="${index}">
                        <div class="form-group">
                            <label>Texto de la Opción</label>
                            <input type="text" class="dialogue-option-text" value="${option.text || ''}">
                        </div>
                        <label>Acción de la Opción</label>
                        ${this.getActionEditorHTML(option.action, index)}
                        <button type="button" class="btn btn-delete btn-delete-option">Eliminar Opción</button>
                    </div>
                `).join('');
                
                html += `<div id="dialogue-options-container" style="grid-column: 1 / -1; border-top: 1px solid var(--border-color); margin-top: 15px; padding-top: 15px;">
                            <h3>Opciones de Diálogo</h3>
                            ${optionsHTML}
                         </div>
                         <button type="button" id="btn-add-dialogue-option" class="btn" style="grid-column: 1 / -1;">Añadir Opción de Diálogo</button>`;
                break;

            case 'items':
                 html += createField({ key: 'name', label: 'Nombre del Objeto' }, item);
                 html += createImageUploader({ label: 'Imagen del Objeto' }, item);
                 html += `<div id="item-action-container" style="grid-column: 1 / -1; border-top: 1px solid var(--border-color); margin-top: 15px; padding-top: 15px;">
                            <h3>Acción al Usar (Consumibles)</h3>
                            ${this.getActionEditorHTML(item.action)}
                          </div>`;
                break;

            case 'cards':
                html += createField({ key: 'name', label: 'Nombre de la Carta' }, item);
                html += createImageUploader({ label: 'Imagen de la Carta' }, item);
                html += createField({ key: 'attack', label: 'Ataque', type: 'number' }, item);
                html += createField({ key: 'defense', label: 'Defensa', type: 'number' }, item);
                break;

            case 'locations':
                if (isSceneEditor) {
                    const itemData = data.locations[id] || { npcs: [], objects: [], actions: [] };
                    const npcsOptions = Object.keys(data.npcs).map(npcId => `<option value="${npcId}" ${(itemData.npcs || []).includes(npcId) ? 'selected' : ''}>${data.npcs[npcId].name} (${npcId})</option>`).join('');
                    const itemsOptions = Object.keys(data.items).map(itemId => `<option value="${itemId}" ${(itemData.objects || []).includes(itemId) ? 'selected' : ''}>${data.items[itemId].name} (${itemId})</option>`).join('');
                    
                    html += `<div class="form-group" style="grid-column: 1 / -1;"><label>NPCs en esta ubicación</label><select multiple data-key="npcs" data-valuetype="array" size="5">${npcsOptions}</select></div>`;
                    html += `<div class="form-group" style="grid-column: 1 / -1;"><label>Objetos en esta ubicación</label><select multiple data-key="objects" data-valuetype="array" size="5">${itemsOptions}</select></div>`;
                } else {
                     html += createImageUploader({ label: 'Imagen de Fondo' }, item);
                }
                break;
        }

        return html;
    }
};