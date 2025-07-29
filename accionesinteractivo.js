/**
 * actions.js
 * Librería de acciones de juego reutilizables.
 * Cada función aquí puede ser referenciada desde el archivo datos.js.
 */

const gameActions = {

    /**
     * El jugador recoge un objeto del escenario. El objeto desaparece de la vista.
     * @param {Array} params - [itemId: string]
     */
    collectObject: (params) => {
        const [itemId] = params;
        const itemData = game.items[itemId];
        if (!itemData) return console.error(`collectObject: No se encontró el item con id "${itemId}"`);

        // Añadir al inventario y notificar
        game.player.inventory.push(itemId);
        ui.updateLog(`Has recogido: ${itemData.name}.`);

        // Eliminar del escenario
        const location = game.locations[game.currentLocation];
        const objectIndex = location.objects.indexOf(itemId);
        if (objectIndex > -1) {
            location.objects.splice(objectIndex, 1);
            ui.renderInteractiveElements(location); // Re-render para que desaparezca
        }
    },

    /**
     * Cambia permanentemente el texto de diálogo de un NPC.
     * @param {Array} params - [npcId: string, newDialogue: string]
     */
    updateDialogue: (params) => {
        const [npcId, newDialogue] = params;
        const npcData = game.npcs[npcId];
        if (!npcData) return console.error(`updateDialogue: No se encontró el NPC con id "${npcId}"`);

        npcData.dialogue = newDialogue;
        ui.showDialogue(npcId); // Refrescar el diálogo para mostrar el nuevo texto
    },

    /**
     * El jugador intercambia un objeto de su inventario por una carta.
     * @param {Array} params - [npcId: string, requiredItem: string, receivedCard: string, newDialogue: string]
     */
    tradeItemForCard: (params) => {
        const [npcId, requiredItem, receivedCard, newDialogue] = params;
        const itemIndex = game.player.inventory.indexOf(requiredItem);

        if (itemIndex > -1) {
            game.player.inventory.splice(itemIndex, 1); // Quitar objeto
            game.addCardToLibrary(receivedCard); // Dar carta

            game.npcs[npcId].dialogue = newDialogue;
            ui.showDialogue(npcId);
        } else {
            ui.updateLog(`No tienes un(a) ${game.items[requiredItem].name} para intercambiar.`);
            ui.toggleModal('dialogue-modal', false);
        }
    },

    /**
     * El jugador gasta un recurso (energía, oro...) para obtener un objeto o carta.
     * @param {Array} params - [resourceType: string, cost: int, receivedItem: string, itemType: string ('card' o 'item'), npcId: string, newDialogue: string]
     */
    purchaseWithResource: (params) => {
        const [resourceType, cost, receivedItem, itemType, npcId, newDialogue] = params;
        
        if (game.player[resourceType] >= cost) {
            game.player[resourceType] -= cost;

            if (itemType === 'card') {
                game.addCardToLibrary(receivedItem);
            } else {
                game.addItem(receivedItem);
            }

            ui.updateStats();
            game.npcs[npcId].dialogue = newDialogue;
            ui.showDialogue(npcId);
        } else {
            ui.updateLog(`No tienes suficiente ${resourceType}.`);
            ui.toggleModal('dialogue-modal', false);
        }
    },

    /**
     * El jugador usa un objeto consumible desde su inventario.
     * @param {Array} params - [itemId: string, statToChange: string, amount: int]
     */
    useConsumableItem: (params) => {
        const [itemId, statToChange, amount] = params;
        // Esta acción se llamaría desde el inventario. La lógica estaría en `ui.js`.
        // Por ahora, definimos la función base.
        console.log(`Usando ${itemId} para cambiar ${statToChange} en ${amount}`);
    },

    /**
     * Inicia un combate. (Actualmente desactivado, solo muestra un mensaje).
     * @param {Array} params - [enemyConfigObject: object]
     */
    startCombat: (params) => {
        const [enemyConfig] = params;
        ui.toggleModal('dialogue-modal', false);
        // Cuando el combate esté activo, la siguiente línea funcionará:
        // game.startCombat(enemyConfig);
        
        // --- Placeholder actual ---
        console.log("Combate iniciado (placeholder):", enemyConfig);
        ui.updateLog(`¡${enemyConfig.name} te desafía! (Combate no implementado)`);
        // --- Fin del placeholder ---
    },
    
    /**
     * Modifica una variable global para registrar el progreso de una misión.
     * @param {Array} params - [questId: string, newState: any]
     */
    updateQuestState: (params) => {
        const [questId, newState] = params;
        if (!game.questStates) {
            game.questStates = {}; // Inicializar si no existe
        }
        game.questStates[questId] = newState;
        ui.updateLog(`Progreso de misión: ${questId} -> ${newState}`);
        console.log("Estado de misiones:", game.questStates);
    }
};

/**
 * Metadata para el editor. Describe los parámetros de cada función de gameActions.
 * Esto permite a la UI generar los formularios dinámicamente.
 */
const gameActionsMetadata = {
    collectObject: {
        description: "El jugador recoge un objeto del escenario.",
        params: ["ID del Objeto"]
    },
    updateDialogue: {
        description: "Cambia el diálogo de un NPC.",
        params: ["ID del NPC", "Nuevo Texto del Diálogo"]
    },
    tradeItemForCard: {
        description: "Intercambiar un objeto por una carta.",
        params: ["ID del NPC", "Objeto Requerido", "Carta Recibida", "Nuevo Diálogo Post-Intercambio"]
    },
    purchaseWithResource: {
        description: "Comprar un objeto/carta con un recurso.",
        params: ["Recurso (ej: energy)", "Coste", "ID del Item/Carta Recibido", "Tipo (item o card)", "ID del NPC", "Nuevo Diálogo Post-Compra"]
    },
    useConsumableItem: {
        description: "Define la acción de un objeto consumible.",
        params: ["ID del Objeto (debe coincidir)", "Stat a Cambiar (ej: health)", "Cantidad"]
    },
    startCombat: {
        description: "Inicia un combate.",
        params: ["Objeto de Configuración del Enemigo (JSON)"]
    },
    updateQuestState: {
        description: "Actualiza el estado de una misión.",
        params: ["ID de la Misión", "Nuevo Estado"]
    }
};