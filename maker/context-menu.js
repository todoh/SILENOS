// context-menu.js - MENÚ CONTEXTUAL DE ESCENARIO Y CREACIÓN RÁPIDA
let contextMenuEl = null;
let currentMousePos = { x: null, y: null };

function removeContextMenu() {
    if (contextMenuEl) {
        contextMenuEl.remove();
        contextMenuEl = null;
    }
}

// Función auxiliar para copiar el elemento actualmente seleccionado
function copySelectedElement() {
    if (!selectedElementId || isPlayMode) return false;
    const scene = projectData.scenes[currentSceneId];
    if (!scene) return false;
    
    const elem = scene.elements.find(e => e.id === selectedElementId);
    if (elem) {
        copiedElementData = JSON.parse(JSON.stringify(elem));
        return true;
    }
    return false;
}

// Función auxiliar para pegar el elemento copiado en la escena
function pasteCopiedElement(customX = null, customY = null) {
    if (!copiedElementData || isPlayMode) return false;
    const scene = projectData.scenes[currentSceneId];
    if (!scene) return false;

    const newElem = JSON.parse(JSON.stringify(copiedElementData));
    newElem.id = 'elem_' + Date.now();

    if (customX !== null && customY !== null) {
        newElem.x = Math.max(0, customX - Math.round(newElem.width / 2));
        newElem.y = Math.max(0, customY - Math.round(newElem.height / 2));
    } else if (currentMousePos.x !== null && currentMousePos.y !== null) {
        // Pegar centrado en la posición actual del puntero sobre el escenario
        newElem.x = Math.max(0, currentMousePos.x - Math.round(newElem.width / 2));
        newElem.y = Math.max(0, currentMousePos.y - Math.round(newElem.height / 2));
    } else {
        // Fallback si el ratón está fuera del viewport
        newElem.x = newElem.x + 20;
        newElem.y = newElem.y + 20;
    }

    scene.elements.push(newElem);
    selectedElementId = newElem.id;
    renderStage();
    autoSaveJSON();
    return true;
}

// Función auxiliar para eliminar el elemento seleccionado
function deleteSelectedElement() {
    if (!selectedElementId || isPlayMode) return false;
    const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
    if (scene && scene.elements) {
        scene.elements = scene.elements.filter(e => e.id !== selectedElementId);
        selectedElementId = null;
        renderStage();
        autoSaveJSON();
        if (typeof updatePropertiesPanel === 'function') {
            updatePropertiesPanel();
        }
        return true;
    }
    return false;
}

// Listener de atajos de teclado globales (Ctrl+C / Ctrl+V / Cmd+C / Cmd+V / SUPR / Delete)
document.addEventListener('keydown', (e) => {
    // Evitar activar cuando se escribe en inputs, textareas o contenteditables
    const activeEl = document.activeElement;
    const isEditingText = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
    );
    if (isEditingText) return;

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        if (copySelectedElement()) {
            e.preventDefault();
        }
    } else if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        if (pasteCopiedElement()) {
            e.preventDefault();
        }
    } else if (e.key === 'Delete' || e.key === 'Supr') {
        if (deleteSelectedElement()) {
            e.preventDefault();
        }
    }
});

// Cierra el menú en clics fuera de él
document.addEventListener('click', (e) => {
    if (contextMenuEl && !contextMenuEl.contains(e.target)) {
        removeContextMenu();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const viewportContainer = document.getElementById('viewport-container');
    const stage = document.getElementById('stage');

    // Rastreo dinámico de las coordenadas del puntero sobre el Canvas
    if (stage) {
        stage.addEventListener('mousemove', (e) => {
            const stageRect = stage.getBoundingClientRect();
            const dim = getStageDimensions();
            const scaleX = dim.width / stageRect.width;
            const scaleY = dim.height / stageRect.height;

            currentMousePos.x = Math.round((e.clientX - stageRect.left) * scaleX);
            currentMousePos.y = Math.round((e.clientY - stageRect.top) * scaleY);
        });

        stage.addEventListener('mouseleave', () => {
            currentMousePos.x = null;
            currentMousePos.y = null;
        });
    }

    if (viewportContainer) {
        viewportContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (isPlayMode) return;

            removeContextMenu();

            const stageRect = stage.getBoundingClientRect();
            const dim = getStageDimensions();
            const scaleX = dim.width / stageRect.width;
            const scaleY = dim.height / stageRect.height;

            const clickX = Math.round((e.clientX - stageRect.left) * scaleX);
            const clickY = Math.round((e.clientY - stageRect.top) * scaleY);

            // Verificar si el clic fue sobre un elemento del Canvas
            const scene = projectData.scenes[currentSceneId];
            let targetElem = null;

            if (scene) {
                targetElem = [...scene.elements].reverse().find(elem => {
                    const elRect = {
                        left: elem.x,
                        top: elem.y,
                        right: elem.x + elem.width,
                        bottom: elem.y + elem.height
                    };
                    return clickX >= elRect.left && clickX <= elRect.right && clickY >= elRect.top && clickY <= elRect.bottom;
                });
            }

            if (targetElem) {
                selectElement(targetElem.id);
            }

            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;

            // Opción: Copiar
            const itemCopy = document.createElement('div');
            itemCopy.className = `context-menu-item ${!targetElem ? 'disabled' : ''}`;
            itemCopy.innerHTML = `<span>Copiar Elemento</span><span style="font-size:10px; color:var(--text-secondary); margin-left:12px;">Ctrl+C</span>`;
            itemCopy.onclick = (ev) => {
                ev.stopPropagation();
                copySelectedElement();
                removeContextMenu();
            };
            menu.appendChild(itemCopy);

            // Opción: Pegar
            const itemPaste = document.createElement('div');
            itemPaste.className = `context-menu-item ${!copiedElementData ? 'disabled' : ''}`;
            itemPaste.innerHTML = `<span>Pegar Aquí</span><span style="font-size:10px; color:var(--text-secondary); margin-left:12px;">Ctrl+V</span>`;
            itemPaste.onclick = (ev) => {
                ev.stopPropagation();
                pasteCopiedElement(clickX, clickY);
                removeContextMenu();
            };
            menu.appendChild(itemPaste);

            // Opción: Eliminar
            const itemDelete = document.createElement('div');
            itemDelete.className = `context-menu-item ${!targetElem ? 'disabled' : ''}`;
            itemDelete.innerHTML = `<span style="color:#ff3b30;">Eliminar Elemento</span><span style="font-size:10px; color:var(--text-secondary); margin-left:12px;">SUPR</span>`;
            itemDelete.onclick = (ev) => {
                ev.stopPropagation();
                deleteSelectedElement();
                removeContextMenu();
            };
            menu.appendChild(itemDelete);

            const hr1 = document.createElement('hr');
            hr1.style.cssText = 'border:none; border-top:1px solid var(--border-subtle); margin:2px 0;';
            menu.appendChild(hr1);

            // Opción: Crear Texto
            const itemText = document.createElement('div');
            itemText.className = 'context-menu-item';
            itemText.innerHTML = `<span>Crear Texto Editable</span>`;
            itemText.onclick = (ev) => {
                ev.stopPropagation();
                setTimeout(() => {
                    const textVal = prompt("Introduce el texto inicial:", "Nuevo Texto");
                    if (textVal) {
                        const newElem = {
                            id: 'elem_' + Date.now(),
                            isText: true,
                            textContent: textVal,
                            fontSize: 28,
                            fontFamily: 'Arial, sans-serif',
                            textColor: '#1d1d1f',
                            textOutline: false,
                            textOutlineColor: '#000000',
                            textShadow: false,
                            textShadowColor: 'rgba(0,0,0,0.5)',
                            textGlow: false,
                            textGlowColor: '#0071e3',
                            x: Math.max(0, clickX - 100),
                            y: Math.max(0, clickY - 20),
                            width: 200,
                            height: 50,
                            rotation: 0,
                            type: 'decoracion',
                            keepAspect: false,
                            dialog: '',
                            targetScene: '',
                            addItem: [],
                            removeItem: [],
                            condition: { type: 'none' },
                            setVariable: { varId: '', value: '' }
                        };
                        scene.elements.push(newElem);
                        selectedElementId = newElem.id;
                        renderStage();
                        autoSaveJSON();
                    }
                    removeContextMenu();
                }, 10);
            };
            menu.appendChild(itemText);

            // Opción: Submenú Flechas
            const itemArrows = document.createElement('div');
            itemArrows.className = 'context-menu-item';
            itemArrows.innerHTML = `<span>Añadir Flechas</span><span style="font-size:10px;">▶</span>`;

            const arrowsSubmenu = document.createElement('div');
            arrowsSubmenu.className = 'context-submenu';
            const arrowList = ['⬅️', '➡️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔄', '🔄', '🔙', '🔚', '🔛', '🔝', '🔜', '🔼', '🔽', '◀️', '▶️', '🔺', '🔻'];

            const arrowGrid = document.createElement('div');
            arrowGrid.className = 'emoji-grid';

            arrowList.forEach(arrow => {
                const aCell = document.createElement('div');
                aCell.className = 'emoji-item';
                aCell.textContent = arrow;
                aCell.onclick = (ev) => {
                    ev.stopPropagation();
                    const newElem = {
                        id: 'elem_' + Date.now(),
                        isText: true,
                        textContent: arrow,
                        fontSize: 42,
                        fontFamily: 'Arial, sans-serif',
                        textColor: '#0071e3',
                        x: Math.max(0, clickX - 30),
                        y: Math.max(0, clickY - 30),
                        width: 60,
                        height: 60,
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
                    scene.elements.push(newElem);
                    selectedElementId = newElem.id;
                    renderStage();
                    autoSaveJSON();
                    removeContextMenu();
                };
                arrowGrid.appendChild(aCell);
            });

            arrowsSubmenu.appendChild(arrowGrid);
            itemArrows.appendChild(arrowsSubmenu);
            menu.appendChild(itemArrows);

            // Opción: Submenú Emojis
            const itemEmojis = document.createElement('div');
            itemEmojis.className = 'context-menu-item';
            itemEmojis.innerHTML = `<span>Añadir Emojis</span><span style="font-size:10px;">▶</span>`;

            const emojisSubmenu = document.createElement('div');
            emojisSubmenu.className = 'context-submenu';
            const emojiList = ['🔑', '🗝️', '📜', '📦', '🎁', '💎', '🏆', '👑', '🕯️', '💡', '🚪', '🗿', '🔮', '⚔️', '🛡️', '🏹', '💣', '🧪', '🩸', '❤️', '🔥', '💧', '⚡', '🌟', '✨', '💀', '👻', '🤖', '👾', '👤', '💬', '❓', '❗', '⚠️', '🚫', '⛔', '🟢', '🔴', '🟡', '🔵'];

            const emojiGrid = document.createElement('div');
            emojiGrid.className = 'emoji-grid';

            emojiList.forEach(emoji => {
                const eCell = document.createElement('div');
                eCell.className = 'emoji-item';
                eCell.textContent = emoji;
                eCell.onclick = (ev) => {
                    ev.stopPropagation();
                    const newElem = {
                        id: 'elem_' + Date.now(),
                        isText: true,
                        textContent: emoji,
                        fontSize: 42,
                        fontFamily: 'Arial, sans-serif',
                        textColor: '#1d1d1f',
                        x: Math.max(0, clickX - 30),
                        y: Math.max(0, clickY - 30),
                        width: 60,
                        height: 60,
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
                    scene.elements.push(newElem);
                    selectedElementId = newElem.id;
                    renderStage();
                    autoSaveJSON();
                    removeContextMenu();
                };
                emojiGrid.appendChild(eCell);
            });

            emojisSubmenu.appendChild(emojiGrid);
            itemEmojis.appendChild(emojisSubmenu);
            menu.appendChild(itemEmojis);

            contextMenuEl = menu;
            document.body.appendChild(menu);
        });
    }
});