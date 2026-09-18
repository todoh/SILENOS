// save-system.js - SISTEMA DE GUARDADO Y CARGA DE PARTIDA (PERSISTENCIA LOCALSTORAGE)
class SaveSystem {
    static SAVE_KEY = 'koreh_game_save_data';

    // Guarda el estado actual del juego
    static saveGame() {
        if (typeof projectData === 'undefined' || typeof gameState === 'undefined') return false;

        const saveData = {
            timestamp: Date.now(),
            currentSceneId: currentSceneId,
            variables: JSON.parse(JSON.stringify(gameState.variables || {})),
            inventory: (typeof inventoryManager !== 'undefined') ? JSON.parse(JSON.stringify(inventoryManager.items || [])) : [],
            equipment: (typeof inventoryManager !== 'undefined') ? JSON.parse(JSON.stringify(inventoryManager.equipment || {})) : {},
            playerPos: null,
            scenesDelta: {}
        };

        // Guardar posición del jugador
        const currentScene = projectData.scenes[currentSceneId];
        if (currentScene && currentScene.elements) {
            const player = currentScene.elements.find(e => e.isPlayer);
            if (player) {
                saveData.playerPos = { x: player.x, y: player.y };
            }
        }

        // Guardar modificaciones del estado de las escenas (elementos construidos/transformados/destruidos)
        Object.keys(projectData.scenes).forEach(sId => {
            saveData.scenesDelta[sId] = JSON.parse(JSON.stringify(projectData.scenes[sId].elements));
        });

        try {
            localStorage.setItem(SaveSystem.SAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error("Error al guardar la partida:", e);
            return false;
        }
    }

    // Comprueba si existe una partida guardada
    static hasSaveGame() {
        return !!localStorage.getItem(SaveSystem.SAVE_KEY);
    }

    // Carga los datos de la partida guardada sobre el runtime activo
    static loadGame() {
        const raw = localStorage.getItem(SaveSystem.SAVE_KEY);
        if (!raw) return false;

        try {
            const saveData = JSON.parse(raw);

            // 1. Restaurar estado de las escenas
            if (saveData.scenesDelta) {
                Object.keys(saveData.scenesDelta).forEach(sId => {
                    if (projectData.scenes[sId]) {
                        projectData.scenes[sId].elements = saveData.scenesDelta[sId];
                    }
                });
            }

            // 2. Restaurar variables
            if (saveData.variables) {
                gameState.variables = saveData.variables;
            }

            // 3. Restaurar inventario y equipo
            if (typeof inventoryManager !== 'undefined') {
                inventoryManager.items = saveData.inventory || [];
                inventoryManager.equipment = saveData.equipment || { head: null, chest: null, weapon: null, shield: null, feet: null };
                inventoryManager.render();
            }

            // 4. Transición a la escena guardada
            const targetScene = saveData.currentSceneId || projectData.startScene;
            const posX = saveData.playerPos ? saveData.playerPos.x : null;
            const posY = saveData.playerPos ? saveData.playerPos.y : null;

            if (typeof changeSceneWithTransition === 'function') {
                changeSceneWithTransition(targetScene, posX, posY);
            } else {
                currentSceneId = targetScene;
                if (typeof renderStage === 'function') renderStage(true);
            }

            return true;
        } catch (e) {
            console.error("Error al cargar la partida:", e);
            return false;
        }
    }

    // Elimina la partida guardada
    static clearSaveGame() {
        localStorage.removeItem(SaveSystem.SAVE_KEY);
    }
}