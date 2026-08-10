// js/app.js
// Controlador Principal Integral - Dashboard UI y Loop Completo de Maddna City MMO

import { TimeEngine } from "./time.js";
import { PlayerManager } from "./player.js";
import { ActionEngine } from "./actionEngine.js";
import { BusinessEngine } from "./businessEngine.js";
import { NewsEngine } from "./newsEngine.js";
import { MultiplayerEngine } from "./multiplayerEngine.js";
import { QuestEngine } from "./questEngine.js";
import { SudokuEngine } from "./sudokuEngine.js";
import { 
    gameDateEl, gameTimeEl, gameYearEl, 
    initAvatarSelector, checkPlayerVitals 
} from "./uiBase.js";
import { injectViewsUI, renderUI } from "./uiViews.js";
import { initAuthListeners } from "./uiAuth.js";

const timeEngine = new TimeEngine();
const playerManager = new PlayerManager();
const questEngine = new QuestEngine(timeEngine);
const actionEngine = new ActionEngine(timeEngine, questEngine);
const businessEngine = new BusinessEngine(timeEngine, questEngine);
const newsEngine = new NewsEngine();
const multiplayerEngine = new MultiplayerEngine();
const sudokuEngine = new SudokuEngine();

const context = {
    timeEngine,
    playerManager,
    actionEngine,
    businessEngine,
    newsEngine,
    multiplayerEngine,
    questEngine,
    sudokuEngine,
    renderUI: () => renderUI(context)
};

function startMainLoop() {
    setInterval(() => {
        const timeData = timeEngine.getFormattedTime();
        if (gameDateEl) gameDateEl.textContent = timeData.dateStr;
        if (gameTimeEl) gameTimeEl.textContent = timeData.timeStr;
        if (gameYearEl) gameYearEl.textContent = timeData.year;

        if (playerManager.currentPlayer) {
            const player = playerManager.currentPlayer;
            const now = Date.now();

            const mod1 = actionEngine.processOfflineTime(player, now);
            const mod2 = businessEngine.processBusinessIncome(player, now);
            const mod3 = businessEngine.processDailyRent(player, now);

            checkPlayerVitals(player, playerManager);

            if (mod1 || mod2 || mod3) {
                renderUI(context);
            }
        }
    }, 1000);

    setInterval(() => {
        multiplayerEngine.cleanOldChatMessages();
    }, 60000);

    setInterval(async () => {
        if (playerManager.currentPlayer) {
            await playerManager.savePlayerState();
            await multiplayerEngine.updatePublicProfile(playerManager.currentPlayer);
        }
    }, 15000);
}

// Inicialización de la aplicación
initAvatarSelector();
injectViewsUI(context);
initAuthListeners(context);
startMainLoop();