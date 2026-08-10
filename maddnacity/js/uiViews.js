// js/uiViews.js
// Construcción de vistas e inyección completa del sistema de Sudokus y Misiones
import { 
    mobilePlayerPanel, mobileProfileToggle, 
    PROPERTY_IMAGES, MARKET_IMAGES, switchTab 
} from "./uiBase.js";
import { ACTIONS_CATALOG } from "./actions.js";
import { PROPERTY_TYPES, BUSINESS_TYPES, MARKET_ITEMS } from "./economy.js";
import { SPECIALIZATIONS_CATALOG } from "./skillsCatalog.js";
import { LIFESTYLE_CATALOG } from "./lifestyleCatalog.js";
import { QUESTS_CATALOG } from "./questsCatalog.js";

export function injectViewsUI(context) {
    const { playerManager, businessEngine, newsEngine, multiplayerEngine, actionEngine, questEngine, sudokuEngine, renderUI } = context;
    if (document.getElementById("nav-tabs")) return;

    const centerContainer = document.getElementById("center-container");

    const tabsNav = document.createElement("div");
    tabsNav.id = "nav-tabs";
    tabsNav.style.cssText = "display:none; gap:6px; flex-wrap:wrap;";
    tabsNav.innerHTML = `
        <button class="tab-btn active" data-tab="tab-actions">ACTIVIDADES</button>
        <button class="tab-btn" data-tab="tab-quests">MISIONES & TRABAJOS</button>
        <button class="tab-btn" data-tab="tab-skills">HABILIDADES & TALENTOS</button>
        <button class="tab-btn" data-tab="tab-economy">EMPRESAS & BIENES</button>
        <button class="tab-btn" data-tab="tab-market">MERCADO & LIFESTYLE</button>
        <button class="tab-btn" data-tab="tab-news">NOTICIAS</button>
        <button class="tab-btn" data-tab="tab-multiplayer">CIUDADANOS & CHAT</button>
    `;

    const contentArea = document.createElement("div");
    contentArea.id = "tabs-content";
    contentArea.style.display = "none";

    const tabActions = document.createElement("div");
    tabActions.id = "tab-actions";
    tabActions.className = "tab-page";
    tabActions.innerHTML = `
        <div class="card">
            <h2>[PLAN] Planificador de Actividades</h2>
            <div id="actions-catalog-list" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;"></div>
            <h3>Actividad En Curso</h3>
            <div id="current-action-box" style="padding:12px; margin-bottom:15px; font-size:0.85em;">
                Sin actividad programada.
            </div>
            <h3>Cola de Procesamiento (<span id="queue-count">0</span>/<span id="queue-max">5</span>)</h3>
            <ul id="queue-list" style="list-style:none; padding:0; margin:0;"></ul>
        </div>
    `;

    const tabQuests = document.createElement("div");
    tabQuests.id = "tab-quests";
    tabQuests.className = "tab-page";
    tabQuests.style.display = "none";
    tabQuests.innerHTML = `
        <div class="card" style="margin-bottom:20px;">
            <h2>[JOB] Trabajos Activos (Sudoku)</h2>
            <div id="sudoku-job-container"></div>
        </div>
        <div class="card" style="margin-bottom:20px;">
            <h2>[ACHV] Logros de Trabajos Guardados</h2>
            <div style="font-size:0.85em; margin-bottom:10px;">
                Sudokus Completados: <strong id="stat-sudoku-count" style="color:var(--accent);">0</strong>
            </div>
            <div id="achievements-list" style="display:flex; flex-direction:column; gap:8px;"></div>
        </div>
        <div class="card">
            <h2>[QST] Misiones Activas</h2>
            <div id="active-quests-list" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;"></div>
            <h2>[BOARD] Tablón de Encargos</h2>
            <div id="available-quests-list" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;"></div>
            <h2>[HIST] Historial de Misiones</h2>
            <div id="completed-quests-list" style="font-size:0.85em; color:var(--text-dim);">Sin misiones completadas.</div>
        </div>
    `;

    const tabSkills = document.createElement("div");
    tabSkills.id = "tab-skills";
    tabSkills.className = "tab-page";
    tabSkills.style.display = "none";
    tabSkills.innerHTML = `
        <div class="card">
            <h2>[SKL] Habilidades y Árbol de Talentos</h2>
            <div id="skills-list" style="display:flex; flex-direction:column; gap:12px;"></div>
        </div>
    `;

    const tabEconomy = document.createElement("div");
    tabEconomy.id = "tab-economy";
    tabEconomy.className = "tab-page";
    tabEconomy.style.display = "none";
    tabEconomy.innerHTML = `
        <div class="card">
            <h2>[EST] Bienes Inmuebles Disponibles</h2>
            <div id="properties-catalog" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;"></div>
            <h2>[OWN] Tus Propiedades</h2>
            <div id="my-properties" style="margin-bottom:20px; font-size:0.85em; color:var(--text-dim);">Sin propiedades asignadas.</div>
            <h2>[CORP] Fundar Nueva Empresa</h2>
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                <input type="text" id="input-biz-name" placeholder="NOMBRE DE TU EMPRESA" style="margin-bottom:0;">
                <select id="select-biz-type" style="margin-bottom:0;">
                    ${Object.values(BUSINESS_TYPES).map(b => `<option value="${b.id}">${b.name.toUpperCase()} (${b.creationCost} $)</option>`).join('')}
                </select>
                <select id="select-biz-prop" style="margin-bottom:0;">
                    <option value="">SELECCIONA PROPIEDAD VINCULADA...</option>
                </select>
                <button id="btn-found-biz">REGISTRAR EMPRESA</button>
            </div>
            <h2>Tus Empresas</h2>
            <div id="my-businesses" style="font-size:0.85em; color:var(--text-dim);">Sin empresas registradas.</div>
        </div>
    `;

    const tabMarket = document.createElement("div");
    tabMarket.id = "tab-market";
    tabMarket.className = "tab-page";
    tabMarket.style.display = "none";
    tabMarket.innerHTML = `
        <div class="card">
            <h2>[MKT] Mercado de Suministros</h2>
            <div id="market-items-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;"></div>
            <h2>[LUX] Catálogo de Estilo de Vida (Vehículos, Ropa, Hogar)</h2>
            <div id="lifestyle-catalog-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap:12px; margin-bottom:20px;"></div>
            <h2>[INV] Inventario del Ciudadano</h2>
            <div id="my-inventory" style="font-size:0.85em; color:var(--text-dim); margin-bottom:20px;">Inventario vacío.</div>
            <h2>[EQUIP] Equipamiento y Bienes Activos</h2>
            <div id="my-lifestyle-equipped" style="font-size:0.85em; color:var(--text-dim);">Sin objetos de lujo equipados.</div>
        </div>
    `;

    const tabNews = document.createElement("div");
    tabNews.id = "tab-news";
    tabNews.className = "tab-page";
    tabNews.style.display = "none";
    tabNews.innerHTML = `
        <div class="card">
            <h2>[FEED] Boletines de Maddna City</h2>
            <button id="btn-refresh-news" style="margin-bottom:15px; width:100%;">ACTUALIZAR NOTICIAS</button>
            <div id="news-feed-list">Cargando titulares...</div>
        </div>
    `;

    const tabMultiplayer = document.createElement("div");
    tabMultiplayer.id = "tab-multiplayer";
    tabMultiplayer.className = "tab-page";
    tabMultiplayer.style.display = "none";
    tabMultiplayer.innerHTML = `
        <div class="card" style="margin-bottom: 20px;">
            <h2>[CHAT] Canal Frecuencia Global</h2>
            <div id="chat-messages-box" style="height: 220px; overflow-y: auto; padding: 10px; border: 1px solid var(--border-glass); border-radius: 10px; margin-bottom: 12px; background: rgba(255,255,255,0.3); display: flex; flex-direction: column; gap: 8px;">
                <span style="color: var(--text-dim); font-size:0.8em;">Conectando a la red neuronal de chat...</span>
            </div>
            <form id="chat-form" style="display: flex; gap: 8px; margin-bottom: 0;">
                <input type="text" id="chat-input-text" placeholder="Escribe un mensaje público..." style="flex:1; margin-bottom:0;" maxlength="150" required autocomplete="off">
                <button type="submit" id="btn-send-chat">ENVIAR</button>
            </form>
        </div>
        <div class="card">
            <h2>[NET] Registro Global de Ciudadanos</h2>
            <button id="btn-refresh-leaderboard" style="margin-bottom:15px; width:100%;">CARGAR RANKING</button>
            <div id="leaderboard-list">Cargando lista de ciudadanos...</div>
        </div>
    `;

    contentArea.appendChild(tabActions);
    contentArea.appendChild(tabQuests);
    contentArea.appendChild(tabSkills);
    contentArea.appendChild(tabEconomy);
    contentArea.appendChild(tabMarket);
    contentArea.appendChild(tabNews);
    contentArea.appendChild(tabMultiplayer);

    centerContainer.appendChild(tabsNav);
    centerContainer.appendChild(contentArea);

    const onTabClick = (tabId) => switchTab(
        tabId, 
        () => loadNews(newsEngine), 
        () => loadLeaderboard(multiplayerEngine), 
        renderUI
    );

    tabsNav.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => onTabClick(btn.dataset.tab));
    });

    document.querySelectorAll("#mobile-bottom-nav .nav-item").forEach(btn => {
        btn.addEventListener("click", () => onTabClick(btn.dataset.tab));
    });

    if (mobileProfileToggle) {
        mobileProfileToggle.addEventListener("click", () => {
            const isVisible = mobilePlayerPanel.style.display === "block";
            if (isVisible) {
                mobilePlayerPanel.style.display = "none";
                mobileProfileToggle.classList.remove("open");
            } else {
                mobilePlayerPanel.style.display = "block";
                mobileProfileToggle.classList.add("open");
            }
        });
    }

    document.getElementById("btn-found-biz").addEventListener("click", () => {
        const name = document.getElementById("input-biz-name").value;
        const bizTypeId = document.getElementById("select-biz-type").value;
        const propId = document.getElementById("select-biz-prop").value;
        const player = playerManager.currentPlayer;
        if (!player) return;

        const res = businessEngine.foundBusiness(player, bizTypeId, name, propId);
        if (!res.success) alert(res.reason);
        else {
            alert("Empresa registrada oficialmente en Maddna City.");
            newsEngine.publishNews(`Nueva Empresa Registrada`, `${player.name} ha fundado '${name}'.`);
            playerManager.savePlayerState();
            multiplayerEngine.updatePublicProfile(player);
            renderUI();
        }
    });

    document.getElementById("btn-refresh-news").addEventListener("click", () => loadNews(newsEngine));
    document.getElementById("btn-refresh-leaderboard").addEventListener("click", () => loadLeaderboard(multiplayerEngine));

    const chatForm = document.getElementById("chat-form");
    if (chatForm) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const input = document.getElementById("chat-input-text");
            const player = playerManager.currentPlayer;
            if (!player || !input || !input.value.trim()) return;
            const text = input.value.trim();
            input.value = "";
            await multiplayerEngine.sendChatMessage(player, text);
        });
    }
}

export function initChatListener(multiplayerEngine, playerManager) {
    const box = document.getElementById("chat-messages-box");
    if (!box) return;

    multiplayerEngine.listenToGlobalChat((messages) => {
        const currentPlayer = playerManager.currentPlayer;
        if (!currentPlayer) return;

        if (messages.length === 0) {
            box.innerHTML = `<span style="color:var(--text-dim); font-size:0.8em;">No hay mensajes en la frecuencia global. ¡Sé el primero en hablar!</span>`;
            return;
        }

        box.innerHTML = "";
        messages.forEach(m => {
            const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isOwner = m.senderId === currentPlayer.id;
            const div = document.createElement("div");
            div.style.cssText = "display:flex; align-items:flex-start; gap:8px; font-size:0.8em; padding:4px 6px; border-bottom:1px solid var(--border-subtle);";
            div.innerHTML = `
                <img src="${m.senderAvatar || 'images/1.jpg'}" class="avatar-img-leaderboard" style="width:24px; height:24px;" alt="Avatar">
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="color:var(--accent); font-size:0.85em;">${m.senderName}</strong>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="font-size:0.7em; color:var(--text-dim);">${time}</span>
                            ${isOwner ? `<button class="btn-cancel btn-delete-msg" data-msg-id="${m.id}" style="padding:1px 5px; font-size:0.65em; border-radius:4px;">BORRAR</button>` : ''}
                        </div>
                    </div>
                    <div style="color:var(--text-main); margin-top:2px; word-break:break-word;">${m.text}</div>
                </div>
            `;

            if (isOwner) {
                const delBtn = div.querySelector(".btn-delete-msg");
                if (delBtn) {
                    delBtn.addEventListener("click", async () => {
                        await multiplayerEngine.deleteChatMessage(m.id, currentPlayer.id);
                    });
                }
            }
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
}

export async function loadNews(newsEngine) {
    const list = document.getElementById("news-feed-list");
    if (!list) return;
    list.textContent = "Obteniendo últimas noticias...";
    const items = await newsEngine.getLatestNews(6);
    if (items.length === 0) {
        list.innerHTML = `<p style="color:var(--text-dim); font-size:0.85em;">No hay boletines informativos recientes.</p>`;
        return;
    }
    list.innerHTML = items.map(n => `
        <div style="padding:10px; margin-bottom:10px; border:1px solid var(--border-glass); border-radius:8px;">
            <strong style="color:var(--accent); font-size:0.85em;">${n.title.toUpperCase()}</strong>
            <p style="margin:5px 0 0 0; font-size:0.8em; color:var(--text-main);">${n.content}</p>
        </div>
    `).join('');
}

export async function loadLeaderboard(multiplayerEngine) {
    const list = document.getElementById("leaderboard-list");
    if (!list) return;
    list.textContent = "Cargando clasificación de ciudadanos...";
    const citizens = await multiplayerEngine.getTopCitizens(10);
    if (citizens.length === 0) {
        list.innerHTML = `<p style="color:var(--text-dim); font-size:0.85em;">No se registraron otros ciudadanos en la red.</p>`;
        return;
    }
    list.innerHTML = citizens.map((c, idx) => `
        <div style="padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-glass); font-size:0.8em; border-radius:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${c.avatar || 'images/1.jpg'}" class="avatar-img-leaderboard" alt="Avatar">
                <span><strong>#${idx + 1} ${c.name.toUpperCase()}</strong></span>
            </div>
            <span>${c.money.toFixed(2)} $ | ${c.businessCount} EMPRESAS</span>
        </div>
    `).join('');
}

export function renderUI(context) {
    const { playerManager, actionEngine, businessEngine, questEngine, sudokuEngine } = context;
    const player = playerManager.currentPlayer;
    if (!player) return;

    playerManager.recalculatePlayerModifiers(player);

    const maxHealth = 100 + (player.modifiers?.maxHealthBonus || 0);

    document.getElementById("p-name").textContent = player.name;
    document.getElementById("p-age").textContent = `${player.age}y`;
    document.getElementById("p-money").textContent = `${player.money.toFixed(2)} $`;
    document.getElementById("p-rep-inf").textContent = `${player.reputation} / ${player.influence}`;
    document.getElementById("p-stats").textContent = 
        `${Math.round(player.stats.health)} (${maxHealth}) / ${Math.round(player.stats.energy)} / ${Math.round(player.stats.mood)}`;
    
    const avatarImgEl = document.getElementById("p-avatar");
    if (avatarImgEl) avatarImgEl.src = player.avatar || "images/1.jpg";

    const mobileAvatar = document.getElementById("m-p-avatar");
    const mobileName = document.getElementById("m-p-name");
    const mobileMoney = document.getElementById("m-p-money");
    if (mobileAvatar) mobileAvatar.src = player.avatar || "images/1.jpg";
    if (mobileName) mobileName.textContent = player.name;
    if (mobileMoney) mobileMoney.textContent = `${player.money.toFixed(2)} $`;

    const mAvatarDetail = document.getElementById("m-p-avatar-detail");
    const mNameDetail = document.getElementById("m-p-name-detail");
    const mAgeDetail = document.getElementById("m-p-age");
    const mMoneyDetail = document.getElementById("m-p-money-detail");
    const mRepInfDetail = document.getElementById("m-p-rep-inf");
    const mStatsDetail = document.getElementById("m-p-stats");

    if (mAvatarDetail) mAvatarDetail.src = player.avatar || "images/1.jpg";
    if (mNameDetail) mNameDetail.textContent = player.name;
    if (mAgeDetail) mAgeDetail.textContent = `${player.age}y`;
    if (mMoneyDetail) mMoneyDetail.textContent = `${player.money.toFixed(2)} $`;
    if (mRepInfDetail) mRepInfDetail.textContent = `${player.reputation} / ${player.influence}`;
    if (mStatsDetail) mStatsDetail.textContent = 
        `${Math.round(player.stats.health)} (${maxHealth}) / ${Math.round(player.stats.energy)} / ${Math.round(player.stats.mood)}`;

    // Renderizar Catálogo de Acciones
    const actionsCatalogList = document.getElementById("actions-catalog-list");
    if (actionsCatalogList && actionsCatalogList.children.length === 0) {
        actionsCatalogList.innerHTML = "";
        Object.values(ACTIONS_CATALOG).forEach(act => {
            const card = document.createElement("div");
            card.style.cssText = "display:flex; align-items:center; gap:12px; padding:10px; border:1px solid var(--border-glass); border-radius:10px; background:rgba(255,255,255,0.5);";
            card.innerHTML = `
                <img src="${act.image}" alt="${act.name}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; flex-shrink:0;">
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                    <strong style="color:var(--accent); font-size:0.85em;">${act.name.toUpperCase()}</strong>
                    <span style="font-size:0.75em; color:var(--text-dim); line-height:1.2;">${act.description}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; min-width:110px;">
                    <input type="number" id="duration-${act.id}" value="${act.minGameMinutes}" min="${act.minGameMinutes}" max="${act.maxGameMinutes}" step="15" style="width:90px; margin-bottom:0; text-align:center; font-size:0.8em;" placeholder="Minutos">
                    <button class="btn-enqueue-action" data-action="${act.id}" style="padding:6px 10px; font-size:0.65em; width:90px;">+ AÑADIR</button>
                </div>
            `;
            card.querySelector(".btn-enqueue-action").addEventListener("click", () => {
                const durationInput = card.querySelector(`#duration-${act.id}`);
                const duration = parseInt(durationInput.value, 10) || act.minGameMinutes;
                const res = actionEngine.enqueueAction(player, act.id, duration);
                if (!res.success) alert(res.reason);
                else {
                    playerManager.savePlayerState();
                    renderUI(context);
                }
            });
            actionsCatalogList.appendChild(card);
        });
    }

    const quickStatus = document.getElementById("quick-action-status");
    const box = document.getElementById("current-action-box");

    if (player.activeAction) {
        const def = ACTIONS_CATALOG[player.activeAction.type];
        const progressPct = Math.min(100, Math.round((player.activeAction.progressMinutes / player.activeAction.durationMinutes) * 100));
        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${def.name.toUpperCase()}</strong>
                <button id="btn-cancel-active" class="btn-cancel" style="padding:2px 6px; font-size:0.75em;">CANCELAR</button>
            </div>
            <div style="font-size:0.9em; margin-top:4px;">Progreso: ${Math.round(player.activeAction.progressMinutes)} / ${player.activeAction.durationMinutes}m</div>
            <div style="background:rgba(0,0,0,0.1); height:6px; margin-top:8px; border:1px solid var(--border-subtle); border-radius:3px; overflow:hidden;">
                <div style="background:var(--accent); height:100%; width:${progressPct}%;"></div>
            </div>
        `;
        document.getElementById("btn-cancel-active").addEventListener("click", () => {
            player.activeAction = null;
            if (player.actionQueue.length > 0) {
                player.activeAction = player.actionQueue.shift();
                player.activeAction.startTimeReal = Date.now();
                player.activeAction.progressMinutes = 0;
            }
            playerManager.savePlayerState();
            renderUI(context);
        });

        if (quickStatus) {
            quickStatus.innerHTML = `
                <div>EJECUTANDO: <span style="color:var(--accent); font-weight:600;">${def.name.toUpperCase()}</span></div>
                <div>PROGRESO: <span style="color:var(--accent); font-weight:600;">${progressPct}%</span></div>
                <div>EN COLA: <span style="color:var(--accent); font-weight:600;">${player.actionQueue.length} tareas</span></div>
            `;
        }
    } else {
        box.innerHTML = `<span style="color:var(--text-dim);">Ciudadano en reposo pasivo.</span>`;
        if (quickStatus) {
            quickStatus.innerHTML = `
                <div>ESTADO: <span style="color:var(--accent); font-weight:600;">IDLE / REPOSO</span></div>
                <div>EN COLA: <span style="color:var(--accent); font-weight:600;">${player.actionQueue.length} tareas</span></div>
            `;
        }
    }

    const maxQueue = 5 + (player.modifiers?.maxQueueBonus || 0);
    const queueList = document.getElementById("queue-list");
    document.getElementById("queue-count").textContent = player.actionQueue.length;
    document.getElementById("queue-max").textContent = maxQueue;
    queueList.innerHTML = "";

    player.actionQueue.forEach((item, index) => {
        const def = ACTIONS_CATALOG[item.type];
        const li = document.createElement("li");
        li.style.cssText = "padding:8px 10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-glass); font-size:0.8em; border-radius:8px;";
        li.innerHTML = `
            <span><strong>${index + 1}. ${def.name.toUpperCase()}</strong> (${item.durationMinutes}m)</span>
            <button class="btn-cancel" style="padding:2px 6px; font-size:0.75em;">X</button>
        `;
        li.querySelector(".btn-cancel").addEventListener("click", () => {
            actionEngine.cancelQueueItem(player, index);
            playerManager.savePlayerState();
            renderUI(context);
        });
        queueList.appendChild(li);
    });

    // Renderizar Trabajo / Sudoku
    const sudokuJobContainer = document.getElementById("sudoku-job-container");
    if (sudokuJobContainer) {
        if (sudokuEngine) {
            sudokuEngine.renderUI(sudokuJobContainer, player, () => {
                playerManager.savePlayerState();
                renderUI(context);
            });
        } else {
            sudokuJobContainer.innerHTML = `<div style="color:red; font-size:0.8em;">Error: Instancia de SudokuEngine no encontrada en el contexto.</div>`;
        }
    }

    // Renderizar Estadísticas y Logros guardados en Firestore
    const statCountEl = document.getElementById("stat-sudoku-count");
    const achievementsList = document.getElementById("achievements-list");
    const count = player.statsCustom?.sudokusCompleted || 0;
    if (statCountEl) statCountEl.textContent = count;

    if (achievementsList) {
        const ACHIEVEMENTS = [
            { id: 'sudoku_1', title: 'Mente Analítica I', req: 1, desc: 'Completa tu primer trabajo de Sudoku.' },
            { id: 'sudoku_5', title: 'Calculador Lógico II', req: 5, desc: 'Completa 5 trabajos de Sudoku.' },
            { id: 'sudoku_15', title: 'Maestro del Orden III', req: 15, desc: 'Completa 15 trabajos de Sudoku.' },
            { id: 'sudoku_50', title: 'Leyenda de Maddna IV', req: 50, desc: 'Completa 50 trabajos de Sudoku.' }
        ];

        achievementsList.innerHTML = ACHIEVEMENTS.map(ach => {
            const unlocked = count >= ach.req;
            return `
                <div style="padding:8px 12px; border:1px solid var(--border-glass); border-radius:8px; font-size:0.8em; display:flex; justify-content:space-between; align-items:center; background:${unlocked ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255,255,255,0.3)'};">
                    <div>
                        <strong style="color:${unlocked ? '#27ae60' : 'var(--text-dim)'};">${ach.title.toUpperCase()}</strong>
                        <div style="font-size:0.75em; color:var(--text-dim);">${ach.desc}</div>
                    </div>
                    <span style="font-weight:bold; font-size:0.75em; color:${unlocked ? '#27ae60' : 'var(--text-dim)'};">
                        ${unlocked ? '[DESBLOQUEADO]' : `${count}/${ach.req}`}
                    </span>
                </div>
            `;
        }).join('');
    }

    // Renderizar Misiones (Pestaña Tab Quests)
    const activeQuestsList = document.getElementById("active-quests-list");
    const availableQuestsList = document.getElementById("available-quests-list");
    const completedQuestsList = document.getElementById("completed-quests-list");

    if (activeQuestsList && availableQuestsList && completedQuestsList) {
        activeQuestsList.innerHTML = "";
        availableQuestsList.innerHTML = "";
        completedQuestsList.innerHTML = "";

        const activeKeys = Object.keys(player.quests?.active || {});
        if (activeKeys.length === 0) {
            activeQuestsList.innerHTML = `<div style="font-size:0.85em; color:var(--text-dim);">Sin misiones activas en curso.</div>`;
        } else {
            activeKeys.forEach(qId => {
                const qState = player.quests.active[qId];
                const qDef = QUESTS_CATALOG[qId];
                if (!qDef) return;

                const pct = Math.min(100, Math.round((qState.progress / qState.target) * 100));
                const div = document.createElement("div");
                div.style.cssText = "padding:12px; border:1px solid var(--border-glass); border-radius:10px; font-size:0.8em; background:rgba(255,255,255,0.5);";
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <strong style="color:var(--accent); font-size:0.9em;">${qDef.title.toUpperCase()}</strong>
                        <span style="font-size:0.75em; color:var(--text-dim);">${qState.progress} / ${qState.target}</span>
                    </div>
                    <div style="font-size:0.8em; color:var(--text-dim); margin-bottom:8px;">${qDef.description}</div>
                    <div style="background:rgba(0,0,0,0.06); height:8px; border-radius:4px; overflow:hidden; border:1px solid var(--border-subtle); margin-bottom:10px;">
                        <div style="background:var(--accent); height:100%; width:${pct}%; transition:width 0.3s ease;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75em; color:var(--text-main);">Recompensa: $${qDef.rewards.money || 0} | Rep: ${qDef.rewards.reputation || 0}</span>
                        ${qState.completed 
                            ? `<button class="btn-claim-quest" data-quest="${qId}" style="padding:6px 10px; font-size:0.7em; background:#27ae60; color:#fff;">RECLAMAR RECOMPENSA</button>`
                            : `<button disabled style="padding:6px 10px; font-size:0.7em; opacity:0.6;">EN PROGRESO (${pct}%)</button>`
                        }
                    </div>
                `;

                const btnClaim = div.querySelector(".btn-claim-quest");
                if (btnClaim) {
                    btnClaim.addEventListener("click", () => {
                        const res = questEngine.claimReward(player, qId);
                        if (!res.success) alert(res.reason);
                        else {
                            alert("¡Misión completada y recompensa obtenida!");
                            playerManager.savePlayerState();
                            renderUI(context);
                        }
                    });
                }
                activeQuestsList.appendChild(div);
            });
        }

        const completedSet = new Set(player.quests?.completed || []);
        let availableCount = 0;

        Object.keys(QUESTS_CATALOG).forEach(qId => {
            if (!player.quests?.active?.[qId] && !completedSet.has(qId)) {
                const qDef = QUESTS_CATALOG[qId];
                availableCount++;
                const div = document.createElement("div");
                div.style.cssText = "padding:10px; border:1px solid var(--border-glass); border-radius:10px; font-size:0.8em; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4);";
                div.innerHTML = `
                    <div>
                        <strong style="color:var(--accent);">${qDef.title.toUpperCase()}</strong>
                        <div style="font-size:0.75em; color:var(--text-dim);">${qDef.description}</div>
                    </div>
                    <button class="btn-accept-quest" data-quest="${qId}" style="padding:6px 10px; font-size:0.7em;">ACEPTAR</button>
                `;
                div.querySelector(".btn-accept-quest").addEventListener("click", () => {
                    const res = questEngine.acceptQuest(player, qId);
                    if (!res.success) alert(res.reason);
                    else {
                        playerManager.savePlayerState();
                        renderUI(context);
                    }
                });
                availableQuestsList.appendChild(div);
            }
        });

        if (availableCount === 0) {
            availableQuestsList.innerHTML = `<div style="font-size:0.85em; color:var(--text-dim);">No hay nuevos encargos disponibles en este momento.</div>`;
        }

        if (completedSet.size === 0) {
            completedQuestsList.textContent = "Sin misiones completadas.";
        } else {
            completedQuestsList.innerHTML = Array.from(completedSet).map(qId => {
                const qDef = QUESTS_CATALOG[qId];
                return `<div style="padding:6px 8px; margin-bottom:4px; border-bottom:1px solid var(--border-subtle); font-size:0.8em;">✓ <strong>${qDef ? qDef.title : qId}</strong></div>`;
            }).join('');
        }
    }

    // Renderizar Habilidades y Especializaciones
    const skillsList = document.getElementById("skills-list");
    if (skillsList && player.skills) {
        skillsList.innerHTML = "";
        const skillNames = {
            cooking: "Cocina",
            training: "Entrenamiento",
            talking: "Socialización",
            working: "Trabajo"
        };

        Object.keys(player.skills).forEach(skillKey => {
            const sk = player.skills[skillKey];
            const name = skillNames[skillKey] || skillKey.toUpperCase();
            const neededXp = sk.level * 100;
            const pct = Math.min(100, Math.round((sk.xp / neededXp) * 100));

            const div = document.createElement("div");
            div.style.cssText = "padding:12px; border:1px solid var(--border-glass); border-radius:10px; font-size:0.8em;";

            let branchHTML = "";
            const specDef = SPECIALIZATIONS_CATALOG[skillKey];

            if (sk.level >= (specDef?.minSkillLevel || 5)) {
                if (!sk.specialization) {
                    branchHTML = `
                        <div style="margin-top:10px; padding:10px; background:rgba(255,255,255,0.6); border-radius:8px;">
                            <strong style="color:var(--accent);">★ Especialización Disponible!</strong>
                            <div style="display:flex; gap:8px; margin-top:6px;">
                                ${Object.values(specDef.branches).map(b => `
                                    <button class="btn-select-branch" data-skill="${skillKey}" data-branch="${b.id}" style="flex:1;">
                                        Elegir ${b.name}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    const currentBranch = specDef.branches[sk.specialization];
                    branchHTML = `
                        <div style="margin-top:10px; padding:10px; background:rgba(255,255,255,0.6); border-radius:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong>Rama: <span style="color:var(--accent);">${currentBranch.name}</span></strong>
                                <span>Puntos TP Disponibles: <strong>${sk.talentPoints || 0}</strong></span>
                            </div>
                            <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
                                ${Object.values(currentBranch.nodes).map(node => {
                                    const isUnlocked = (sk.unlockedNodes || []).includes(node.id);
                                    return `
                                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.8); padding:6px 10px; border-radius:6px;">
                                            <div>
                                                <strong>${node.name}</strong>: ${node.description}
                                            </div>
                                            ${isUnlocked 
                                                ? `<span style="color:green; font-weight:bold;">[ADQUIRIDO]</span>`
                                                : `<button class="btn-unlock-node" data-skill="${skillKey}" data-node="${node.id}" style="padding:4px 8px;">Aprender (1 TP)</button>`
                                            }
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }
            }

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong style="color:var(--accent); font-size:0.9em;">${name.toUpperCase()}</strong>
                    <span style="font-weight:700;">NIVEL ${sk.level}</span>
                </div>
                <div style="color:var(--text-dim); font-size:0.85em; margin-bottom:6px;">
                    XP: ${Math.floor(sk.xp)} / ${neededXp} (${pct}%)
                </div>
                <div style="background:rgba(0,0,0,0.06); height:8px; border-radius:4px; overflow:hidden; border:1px solid var(--border-subtle); margin-bottom:10px;">
                    <div style="background:var(--accent); height:100%; width:${pct}%; transition:width 0.3s ease;"></div>
                </div>
                ${branchHTML}
            `;

            div.querySelectorAll(".btn-select-branch").forEach(btn => {
                btn.addEventListener("click", () => {
                    const skKey = btn.dataset.skill;
                    const branchKey = btn.dataset.branch;
                    player.skills[skKey].specialization = branchKey;
                    playerManager.recalculatePlayerModifiers(player);
                    playerManager.savePlayerState();
                    renderUI(context);
                });
            });

            div.querySelectorAll(".btn-unlock-node").forEach(btn => {
                btn.addEventListener("click", () => {
                    const skKey = btn.dataset.skill;
                    const nodeId = btn.dataset.node;
                    const targetSkill = player.skills[skKey];
                    if ((targetSkill.talentPoints || 0) >= 1) {
                        targetSkill.talentPoints -= 1;
                        if (!targetSkill.unlockedNodes) targetSkill.unlockedNodes = [];
                        targetSkill.unlockedNodes.push(nodeId);
                        playerManager.recalculatePlayerModifiers(player);
                        playerManager.savePlayerState();
                        renderUI(context);
                    } else {
                        alert("No dispones de suficientes Puntos de Talento (TP). Subes nivel tras el Nivel 5 para conseguir más.");
                    }
                });
            });

            skillsList.appendChild(div);
        });
    }

    const propsCatalog = document.getElementById("properties-catalog");
    propsCatalog.innerHTML = "";
    Object.values(PROPERTY_TYPES).forEach(p => {
        const imgSrc = PROPERTY_IMAGES[p.id] || "";
        const discount = player.modifiers?.purchaseDiscount || 0;
        const finalPrice = Math.round(p.price * (1 - discount));

        const div = document.createElement("div");
        div.style.cssText = "padding:10px; border:1px solid var(--border-glass); border-radius:10px; font-size:0.8em; display:flex; flex-direction:column;";
        div.innerHTML = `
            ${imgSrc ? `<img src="${imgSrc}" alt="${p.name}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; margin-bottom:8px;">` : ""}
            <strong>${p.name.toUpperCase()}</strong>
            <span style="color:var(--text-dim); margin-top:2px;">Precio: ${finalPrice.toLocaleString()} $ ${discount > 0 ? `(-${Math.round(discount*100)}%)` : ""}</span>
            <button style="margin-top:auto; width:100%;">COMPRAR</button>
        `;
        div.querySelector("button").addEventListener("click", () => {
            const res = businessEngine.buyProperty(player, p.id);
            if (!res.success) alert(res.reason);
            else {
                alert("Inmueble adquirido.");
                playerManager.savePlayerState();
                renderUI(context);
            }
        });
        propsCatalog.appendChild(div);
    });

    const myProps = document.getElementById("my-properties");
    const selectBizProp = document.getElementById("select-biz-prop");
    myProps.innerHTML = "";
    selectBizProp.innerHTML = `<option value="">SELECCIONA PROPIEDAD VINCULADA...</option>`;

    if (!player.properties || player.properties.length === 0) {
        myProps.textContent = "No posees propiedades en tu activo.";
    } else {
        player.properties.forEach(p => {
            const def = PROPERTY_TYPES[p.typeId];
            const div = document.createElement("div");
            div.style.cssText = "padding:8px; margin-bottom:5px; border:1px solid var(--border-glass); border-radius:8px; font-size:0.8em;";
            div.textContent = `${def.name.toUpperCase()} [ID: ${p.id.substr(0, 6)}]`;
            myProps.appendChild(div);

            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${def.name.toUpperCase()} (${p.id.substr(0, 6)})`;
            selectBizProp.appendChild(opt);
        });
    }

    const myBiz = document.getElementById("my-businesses");
    myBiz.innerHTML = "";
    if (!player.businesses || player.businesses.length === 0) {
        myBiz.textContent = "No tienes empresas registradas.";
    } else {
        player.businesses.forEach(b => {
            const def = BUSINESS_TYPES[b.typeId];
            const div = document.createElement("div");
            div.style.cssText = "padding:10px; margin-bottom:10px; border:1px solid var(--border-glass); border-radius:10px; font-size:0.8em;";
            div.innerHTML = `
                <strong>${b.name.toUpperCase()}</strong> (${def.name})<br>
                Caja Fuerte: <span style="color:var(--accent); font-weight:700;">${(b.vaultMoney || 0).toFixed(2)} $</span><br>
                <button class="btn-withdraw" style="margin-top:8px; width:100%;">RETIRAR FONDOS</button>
            `;
            div.querySelector(".btn-withdraw").addEventListener("click", () => {
                const res = businessEngine.withdrawBusinessVault(player, b.id);
                if (!res.success) alert(res.reason);
                else {
                    alert(`Has retirado ${res.amount.toFixed(2)} $ a tu cuenta.`);
                    playerManager.savePlayerState();
                    renderUI(context);
                }
            });
            myBiz.appendChild(div);
        });
    }

    const marketList = document.getElementById("market-items-list");
    marketList.innerHTML = "";
    Object.values(MARKET_ITEMS).forEach(item => {
        const imgSrc = MARKET_IMAGES[item.id] || "";
        const discount = player.modifiers?.purchaseDiscount || 0;
        const finalPrice = Math.round(item.price * (1 - discount));

        const card = document.createElement("div");
        card.className = "square-card";
        card.innerHTML = `
            ${imgSrc ? `<img src="${imgSrc}" alt="${item.name}" class="square-card-img">` : ""}
            <div class="square-card-content">
                <div>
                    <strong class="square-card-title">${item.name.toUpperCase()}</strong>
                    <div class="square-card-desc">${item.description || "Sin descripción."}</div>
                </div>
                <div>
                    <span class="square-card-price">${finalPrice} $</span>
                    <button class="btn-buy-market" style="padding:4px 6px; font-size:0.6em; width:100%; margin-top:4px;">COMPRAR</button>
                </div>
            </div>
        `;
        card.querySelector("button").addEventListener("click", () => {
            const res = businessEngine.buyMarketItem(player, item.id, 1);
            if (!res.success) alert(res.reason);
            else {
                playerManager.savePlayerState();
                renderUI(context);
            }
        });
        marketList.appendChild(card);
    });

    const lifestyleCatalogList = document.getElementById("lifestyle-catalog-list");
    lifestyleCatalogList.innerHTML = "";
    Object.values(LIFESTYLE_CATALOG).forEach(item => {
        const discount = player.modifiers?.purchaseDiscount || 0;
        const finalPrice = Math.round(item.price * (1 - discount));
        const isOwned = player.lifestyle?.ownedItems && player.lifestyle.ownedItems[item.id];
        const imgSrc = item.image || "";

        const card = document.createElement("div");
        card.className = "square-card";
        card.innerHTML = `
            ${imgSrc ? `<img src="${imgSrc}" alt="${item.name}" class="square-card-img">` : ""}
            <div class="square-card-content">
                <div>
                    <strong class="square-card-title">${item.name.toUpperCase()}</strong>
                    <div class="square-card-desc">${item.description}</div>
                </div>
                <div>
                    <div class="square-card-price">${finalPrice.toLocaleString()} $</div>
                    <div class="square-card-maint">Maint: ${item.dailyMaintenance} $/d</div>
                    <div style="margin-top:4px; width:100%;">
                        ${isOwned 
                            ? `<button disabled style="width:100%; opacity:0.6; padding:4px 6px; font-size:0.6em;">POSEÍDO</button>`
                            : `<button class="btn-buy-lifestyle" style="width:100%; padding:4px 6px; font-size:0.6em;">ADQUIRIR</button>`
                        }
                    </div>
                </div>
            </div>
        `;
        if (!isOwned) {
            card.querySelector(".btn-buy-lifestyle").addEventListener("click", () => {
                const res = businessEngine.buyLifestyleItem(player, item.id);
                if (!res.success) alert(res.reason);
                else {
                    alert("Objeto de lujo adquirido.");
                    playerManager.recalculatePlayerModifiers(player);
                    playerManager.savePlayerState();
                    renderUI(context);
                }
            });
        }
        lifestyleCatalogList.appendChild(card);
    });

    const myInv = document.getElementById("my-inventory");
    myInv.innerHTML = "";
    const invKeys = Object.keys(player.inventory || {}).filter(k => player.inventory[k] > 0);
    if (invKeys.length === 0) {
        myInv.textContent = "Inventario vacío.";
    } else {
        invKeys.forEach(k => {
            const itemDef = MARKET_ITEMS[k];
            const count = player.inventory[k];
            const div = document.createElement("div");
            div.style.cssText = "padding:8px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-glass); border-radius:8px; font-size:0.8em;";
            div.innerHTML = `
                <span>${itemDef ? itemDef.name.toUpperCase() : k} (x${count})</span>
                <button class="btn-use" style="padding:4px 8px;">CONSUMIR</button>
            `;
            div.querySelector(".btn-use").addEventListener("click", () => {
                const res = businessEngine.useMarketItem(player, k);
                if (!res.success) alert(res.reason);
                else {
                    if (player.inventory[k] <= 0) {
                        delete player.inventory[k];
                    }
                    playerManager.savePlayerState();
                    renderUI(context);
                }
            });
            myInv.appendChild(div);
        });
    }

    const myLifestyleEquipped = document.getElementById("my-lifestyle-equipped");
    myLifestyleEquipped.innerHTML = "";
    const ownedItemsKeys = Object.keys(player.lifestyle?.ownedItems || {});
    if (ownedItemsKeys.length === 0) {
        myLifestyleEquipped.textContent = "Sin objetos de lujo poseídos.";
    } else {
        ownedItemsKeys.forEach(itemId => {
            const itemDef = LIFESTYLE_CATALOG[itemId];
            const itemState = player.lifestyle.ownedItems[itemId];
            const isEquipped = 
                player.lifestyle.equippedVehicle === itemId ||
                player.lifestyle.equippedApparel === itemId ||
                player.lifestyle.equippedHomeComfort === itemId;

            const div = document.createElement("div");
            div.style.cssText = "padding:8px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-glass); border-radius:8px; font-size:0.8em;";
            div.innerHTML = `
                <div>
                    <strong>${itemDef.name.toUpperCase()}</strong> 
                    <span style="font-size:0.8em; color:${itemState.status === "ACTIVE" ? "green" : "red"};">
                        [${itemState.status}]
                    </span>
                </div>
                ${isEquipped 
                    ? `<span style="font-weight:bold; color:var(--accent);">[EQUIPADO]</span>`
                    : `<button class="btn-equip-lifestyle" style="padding:4px 8px;">EQUIPAR</button>`
                }
            `;
            if (!isEquipped) {
                div.querySelector(".btn-equip-lifestyle").addEventListener("click", () => {
                    const res = businessEngine.equipLifestyleItem(player, itemId);
                    if (!res.success) alert(res.reason);
                    else {
                        playerManager.recalculatePlayerModifiers(player);
                        playerManager.savePlayerState();
                        renderUI(context);
                    }
                });
            }
            myLifestyleEquipped.appendChild(div);
        });
    }
}