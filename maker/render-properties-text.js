// render-properties-text.js - CONFIGURACIÓN Y ESTILIZACIÓN DE TEXTO
function renderTextPropertiesSection(propsContent, elem, isSavedElement) {
    let physicsPropsContainer = document.getElementById('physics-element-props');
    let textPropsContainer = document.getElementById('text-element-props');
    if (!textPropsContainer) {
        textPropsContainer = document.createElement('div');
        textPropsContainer.id = 'text-element-props';
        textPropsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 4px;';
        propsContent.insertBefore(textPropsContainer, physicsPropsContainer ? physicsPropsContainer.nextSibling : propsContent.firstChild);
    }

    if (elem.isText) {
        textPropsContainer.style.display = 'flex';
        textPropsContainer.innerHTML = `
            <div class="sidebar-title">Propiedades de Texto</div>
            <div class="form-group">
                <label>Contenido del Texto:</label>
                <textarea id="txt-prop-content" rows="2">${elem.textContent || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Tipografía:</label>
                <select id="txt-prop-font">
                    <option value="Arial, sans-serif" ${elem.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                    <option value="'Courier New', monospace" ${elem.fontFamily === "'Courier New', monospace" ? 'selected' : ''}>Courier New</option>
                    <option value="'Georgia', serif" ${elem.fontFamily === "'Georgia', serif" ? 'selected' : ''}>Georgia</option>
                    <option value="'Impact', sans-serif" ${elem.fontFamily === "'Impact', sans-serif" ? 'selected' : ''}>Impact</option>
                    <option value="'Trebuchet MS', sans-serif" ${elem.fontFamily === "'Trebuchet MS', sans-serif" ? 'selected' : ''}>Trebuchet MS</option>
                </select>
            </div>
            <div class="row-group" style="display:flex; gap:8px;">
                <div class="form-group" style="flex:1;">
                    <label>Tamaño (px):</label>
                    <input type="number" id="txt-prop-size" value="${elem.fontSize || 24}" min="8" max="200">
                </div>
                <div class="form-group" style="flex:1;">
                    <label>Color Texto:</label>
                    <input type="color" id="txt-prop-color" value="${elem.textColor || '#1d1d1f'}" style="height:32px; padding:2px; cursor:pointer;">
                </div>
            </div>
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
                <input type="checkbox" id="txt-prop-outline" ${elem.textOutline ? 'checked' : ''}>
                <label for="txt-prop-outline" style="margin:0;">Contorno</label>
                <input type="color" id="txt-prop-outline-color" value="${elem.textOutlineColor || '#000000'}" style="height:24px; padding:0; cursor:pointer; margin-left:auto;">
            </div>
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
                <input type="checkbox" id="txt-prop-shadow" ${elem.textShadow ? 'checked' : ''}>
                <label for="txt-prop-shadow" style="margin:0;">Sombra</label>
                <input type="color" id="txt-prop-shadow-color" value="${elem.textShadowColor || '#000000'}" style="height:24px; padding:0; cursor:pointer; margin-left:auto;">
            </div>
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
                <input type="checkbox" id="txt-prop-glow" ${elem.textGlow ? 'checked' : ''}>
                <label for="txt-prop-glow" style="margin:0;">Brillo</label>
                <input type="color" id="txt-prop-glow-color" value="${elem.textGlowColor || '#0071e3'}" style="height:24px; padding:0; cursor:pointer; margin-left:auto;">
            </div>
            <hr style="border: none; border-top: 1px solid var(--border-subtle);">
        `;

        const updateTextElementDOM = () => {
            if (!isSavedElement) {
                const el = document.getElementById(`stage-el-${elem.id}`);
                if (el) {
                    el.textContent = elem.textContent || '';
                    el.style.fontSize = (elem.fontSize || 24) + 'px';
                    el.style.fontFamily = elem.fontFamily || 'Arial, sans-serif';
                    el.style.color = elem.textColor || '#1d1d1f';
                    const outline = elem.textOutline ? `-1px -1px 0 ${elem.textOutlineColor || '#000'}, 1px -1px 0 ${elem.textOutlineColor || '#000'}, -1px 1px 0 ${elem.textOutlineColor || '#000'}, 1px 1px 0 ${elem.textOutlineColor || '#000'}` : '';
                    const shadow = elem.textShadow ? `0px 4px 8px ${elem.textShadowColor || 'rgba(0,0,0,0.5)'}` : '';
                    const glow = elem.textGlow ? `0px 0px 12px ${elem.textGlowColor || '#0071e3'}` : '';
                    const textEffects = [outline, shadow, glow].filter(Boolean).join(', ');
                    el.style.textShadow = textEffects || 'none';
                }
            }
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (typeof updateElementsUI === 'function') updateElementsUI();
        };

        document.getElementById('txt-prop-content').addEventListener('input', (e) => {
            elem.textContent = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-font').addEventListener('change', (e) => {
            elem.fontFamily = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-size').addEventListener('input', (e) => {
            elem.fontSize = parseInt(e.target.value, 10) || 24;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-color').addEventListener('input', (e) => {
            elem.textColor = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-outline').addEventListener('change', (e) => {
            elem.textOutline = e.target.checked;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-outline-color').addEventListener('input', (e) => {
            elem.textOutlineColor = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-shadow').addEventListener('change', (e) => {
            elem.textShadow = e.target.checked;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-shadow-color').addEventListener('input', (e) => {
            elem.textShadowColor = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-glow').addEventListener('change', (e) => {
            elem.textGlow = e.target.checked;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-glow-color').addEventListener('input', (e) => {
            elem.textGlowColor = e.target.value;
            updateTextElementDOM();
        });
    } else {
        textPropsContainer.style.display = 'none';
    }
}