// stats.js - SISTEMA DE CONFIGURACIÓN Y GESTIÓN DE ESTADÍSTICAS Y MÓDULOS DE UI
class StatsManager {
    constructor() {
        this.defaultStatsConfig = {
            inventoryButton: { name: "Botón Inventario", enabled: true, isSystem: true },
            vida: { name: "Vida", enabled: true, current: 100, max: 100, color: "#ff3b30" },
            energia: { name: "Energía", enabled: true, current: 100, max: 100, color: "#ffcc00" },
            mana: { name: "Maná", enabled: false, current: 50, max: 50, color: "#5856d6" },
            sed: { name: "Sed", enabled: false, current: 100, max: 100, color: "#5ac8fa" },
            hambre: { name: "Hambre", enabled: false, current: 100, max: 100, color: "#ff9500" },
            ataque: { name: "Ataque", enabled: true, value: 15, isNumeric: true },
            defensa: { name: "Defensa", enabled: true, value: 10, isNumeric: true },
            poderes: { name: "Poderes / Magia", enabled: false, value: 0, isNumeric: true },
            especiales: { name: "Stats Especiales", enabled: false, value: "Ninguna", isText: true }
        };
    }

    getStatsConfig() {
        if (!projectData.statsConfig) {
            projectData.statsConfig = JSON.parse(JSON.stringify(this.defaultStatsConfig));
        }
        return projectData.statsConfig;
    }

    setStatEnabled(statKey, enabled) {
        const config = this.getStatsConfig();
        if (config[statKey]) {
            config[statKey].enabled = enabled;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            this.renderStatsUI();
            this.renderHUD();
            if (typeof inventoryManager !== 'undefined' && inventoryManager.render) {
                inventoryManager.render();
            }
        }
    }

    setStatValue(statKey, field, value) {
        const config = this.getStatsConfig();
        if (config[statKey]) {
            config[statKey][field] = value;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            this.renderHUD();
        }
    }

    renderStatsUI() {
        const list = document.getElementById('registered-stats-list');
        if (!list) return;
        list.innerHTML = '';

        const config = this.getStatsConfig();

        Object.keys(config).forEach(key => {
            const stat = config[key];
            const card = document.createElement('div');
            card.style.cssText = 'display: flex; flex-direction: column; gap: 6px; background: rgba(255,255,255,0.7); border: 1px solid var(--border-subtle); padding: 8px 10px; border-radius: 8px;';

            let controlsHTML = '';
            if (stat.current !== undefined) {
                controlsHTML = `
                    <div style="display:flex; gap:6px;">
                        <input type="number" value="${stat.current}" style="width:50%; font-size:10px; padding:2px 4px;" placeholder="Actual" data-key="${key}" data-field="current">
                        <input type="number" value="${stat.max}" style="width:50%; font-size:10px; padding:2px 4px;" placeholder="Máx" data-key="${key}" data-field="max">
                    </div>
                `;
            } else if (stat.isNumeric) {
                controlsHTML = `
                    <input type="number" value="${stat.value}" style="width:100%; font-size:10px; padding:2px 4px;" placeholder="Valor" data-key="${key}" data-field="value">
                `;
            } else if (stat.isText) {
                controlsHTML = `
                    <input type="text" value="${stat.value}" style="width:100%; font-size:10px; padding:2px 4px;" placeholder="Detalles" data-key="${key}" data-field="value">
                `;
            }

            card.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <strong style="font-size: 11px; color: var(--text-primary);">${stat.name}</strong>
                    <input type="checkbox" ${stat.enabled ? 'checked' : ''} data-toggle="${key}" style="cursor:pointer;">
                </div>
                ${controlsHTML}
            `;

            const toggle = card.querySelector(`[data-toggle="${key}"]`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.setStatEnabled(key, e.target.checked);
                });
            }

            const inputs = card.querySelectorAll('input[data-field]');
            inputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    const k = e.target.getAttribute('data-key');
                    const f = e.target.getAttribute('data-field');
                    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
                    this.setStatValue(k, f, val);
                });
            });

            list.appendChild(card);
        });
    }

    renderHUD() {
        let hudContainer = document.getElementById('game-stats-hud');
        if (!hudContainer) {
            const gameUI = document.getElementById('game-ui');
            if (!gameUI) return;
            hudContainer = document.createElement('div');
            hudContainer.id = 'game-stats-hud';
            hudContainer.style.cssText = `
                position: absolute; top: 16px; left: 16px;
                display: flex; flex-direction: column; gap: 6px;
                pointer-events: auto; z-index: 100000;
            `;
            gameUI.appendChild(hudContainer);
        }

        hudContainer.innerHTML = '';
        const config = this.getStatsConfig();

        Object.keys(config).forEach(key => {
            const stat = config[key];
            if (!stat.enabled || stat.isSystem) return;

            const badge = document.createElement('div');
            badge.style.cssText = `
                background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px;
                padding: 4px 8px; color: #fff; font-size: 10px; font-weight: 600;
                display: flex; align-items: center; justify-content: space-between; min-width: 120px;
            `;

            if (stat.current !== undefined) {
                const percent = Math.min(100, Math.max(0, (stat.current / stat.max) * 100));
                badge.style.flexDirection = 'column';
                badge.style.alignItems = 'flex-start';
                badge.innerHTML = `
                    <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:2px;">
                        <span>${stat.name}</span>
                        <span>${stat.current}/${stat.max}</span>
                    </div>
                    <div style="width:100%; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; overflow:hidden;">
                        <div style="width:${percent}%; height:100%; background:${stat.color || '#0071e3'};"></div>
                    </div>
                `;
            } else {
                badge.innerHTML = `
                    <span style="color: rgba(255,255,255,0.7);">${stat.name}:</span>
                    <span style="color: #fff;">${stat.value}</span>
                `;
            }

            hudContainer.appendChild(badge);
        });
    }
}

const statsManager = new StatsManager();

function updateStatsUI() {
    statsManager.renderStatsUI();
    statsManager.renderHUD();
}

document.addEventListener('DOMContentLoaded', () => {
    statsManager.renderStatsUI();
});