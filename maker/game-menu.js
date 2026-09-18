// game-menu.js - INTERFAZ DE MENÚ PRINCIPAL (NUEVA PARTIDA / CONTINUAR) Y HUD DE GUARDADO
class GameMenu {
    constructor() {
        this.initUI();
    }

    initUI() {
        document.addEventListener('DOMContentLoaded', () => {
            this.createOverlayMenu();
            this.injectSaveHUDButton();
        });
    }

    // Pantalla overlay inicial antes de entrar al mapa
    createOverlayMenu() {
        const viewport = document.getElementById('viewport-container');
        if (!viewport || document.getElementById('main-game-menu')) return;

        const menuOverlay = document.createElement('div');
        menuOverlay.id = 'main-game-menu';
        menuOverlay.style.cssText = `
            position: absolute;
            inset: 0;
            background: rgba(13, 14, 18, 0.85);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            z-index: 300000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        const hasSave = SaveSystem.hasSaveGame();

        menuOverlay.innerHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                <h1 style="font-size: 32px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-shadow: 0 0 20px rgba(0,113,227,0.6);">
                    ${projectData?.name || 'AVENTURA KOREH'}
                </h1>
                <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 4px;">Selecciona una opción para empezar</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; width: 220px;">
                <button id="btn-start-new-game" style="
                    background: #0071e3; color: #fff; border: none; padding: 12px 20px; border-radius: 12px;
                    font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
                    box-shadow: 0 4px 15px rgba(0,113,227,0.4);">
                    Nueva Partida
                </button>
                <button id="btn-continue-game" style="
                    background: ${hasSave ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}; 
                    color: ${hasSave ? '#ffffff' : 'rgba(255,255,255,0.3)'}; 
                    border: 1px solid ${hasSave ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}; 
                    padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; 
                    cursor: ${hasSave ? 'pointer' : 'not-allowed'}; transition: all 0.2s ease;" 
                    ${!hasSave ? 'disabled' : ''}>
                    Continuar Partida
                </button>
            </div>
        `;

        viewport.appendChild(menuOverlay);

        // Eventos de botones
        document.getElementById('btn-start-new-game').onclick = () => {
            menuOverlay.style.opacity = '0';
            menuOverlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => { menuOverlay.style.display = 'none'; }, 300);
        };

        const btnContinue = document.getElementById('btn-continue-game');
        if (hasSave) {
            btnContinue.onclick = () => {
                if (SaveSystem.loadGame()) {
                    menuOverlay.style.opacity = '0';
                    menuOverlay.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => { menuOverlay.style.display = 'none'; }, 300);
                }
            };
        }
    }

    // Inyecta el botón rápido de Guardar en la interfaz de usuario (HUD)
    injectSaveHUDButton() {
        const uiContainer = document.getElementById('game-ui');
        if (!uiContainer || document.getElementById('btn-quick-save')) return;

        const btnSave = document.createElement('button');
        btnSave.id = 'btn-quick-save';
        btnSave.style.cssText = `
            position: absolute;
            top: 16px;
            left: 120px;
            pointer-events: auto;
            z-index: 100001;
            background: rgba(0, 0, 0, 0.75);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
        `;
        btnSave.textContent = 'Guardar';

        btnSave.onclick = () => {
            if (SaveSystem.saveGame()) {
                btnSave.textContent = '¡Guardado!';
                btnSave.style.background = '#34c759';
                setTimeout(() => {
                    btnSave.textContent = 'Guardar';
                    btnSave.style.background = 'rgba(0, 0, 0, 0.75)';
                }, 1500);
            }
        };

        uiContainer.appendChild(btnSave);
    }
}

const gameMenu = new GameMenu();