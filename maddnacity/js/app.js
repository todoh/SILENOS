 
// Controlador Principal Integral – Dashboard UI y Loop Completo de Maddna City MMO
import { auth } from "./firebase.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { TimeEngine } from "./time.js";
import { PlayerManager } from "./player.js";
import { ActionEngine } from "./actionEngine.js";
import { BusinessEngine } from "./businessEngine.js";
import { NewsEngine } from "./newsEngine.js";
import { MultiplayerEngine } from "./multiplayerEngine.js";
import { ACTIONS_CATALOG } from "./actions.js";
import { PROPERTY_TYPES, BUSINESS_TYPES, MARKET_ITEMS } from "./economy.js";

const timeEngine = new TimeEngine();
const playerManager = new PlayerManager();
const actionEngine = new ActionEngine(timeEngine);
const businessEngine = new BusinessEngine(timeEngine);
const newsEngine = new NewsEngine();
const multiplayerEngine = new MultiplayerEngine();

// Variable local para almacenar el avatar seleccionado en el modal
let selectedAvatarPath = "images/1.jpg";

// Mapeo local de rutas de imágenes para Inmuebles y Mercado
const PROPERTY_IMAGES = {
    APARTMENT_BASIC: "images/apartamento.jpg",
    LUXURY_PENTHOUSE: "images/tower.jpg",
    COMMERCIAL_LOCAL: "images/local.jpg",
    INDUSTRIAL_WAREHOUSE: "images/almacen.jpg"
};

const MARKET_IMAGES = {
    ENERGY_DRINK: "images/energetica.jpg",
    HEALTH_KIT: "images/botiquin.jpg",
    GOURMET_MEAL: "images/cena.jpg"
};

// DOM Elements Base
const gameDateEl = document.getElementById("game-date");
const gameTimeEl = document.getElementById("game-time");
const gameYearEl = document.getElementById("game-year");
const authPanel = document.getElementById("auth-panel");
const playerPanel = document.getElementById("player-panel");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const rememberInput = document.getElementById("auth-remember");
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");
const btnGoogleLogin = document.getElementById("btn-google-login");
const btnLogout = document.getElementById("btn-logout");
const btnEditProfile = document.getElementById("btn-edit-profile");

// DOM Elements Modal Configuración Jugador
const modalNameSetup = document.getElementById("modal-name-setup");
const modalSetupTitle = document.getElementById("modal-setup-title");
const setupPlayerNameInput = document.getElementById("setup-player-name");
const btnSavePlayerName = document.getElementById("btn-save-player-name");
const btnCancelModal = document.getElementById("btn-cancel-modal");

// Seleccionar visualmente un avatar en el selector
function setAvatarSelection(avatarPath) {
    selectedAvatarPath = avatarPath || "images/1.jpg";
    const avatarOptions = document.querySelectorAll(".avatar-option");
    avatarOptions.forEach(opt => {
        if (opt.dataset.avatar === selectedAvatarPath) {
            opt.classList.add("selected");
        } else {
            opt.classList.remove("selected");
        }
    });
}

// Inicializador de eventos para el selector de avatar del modal
function initAvatarSelector() {
    const avatarOptions = document.querySelectorAll(".avatar-option");
    avatarOptions.forEach(img => {
        img.addEventListener("click", (e) => {
            avatarOptions.forEach(opt => opt.classList.remove("selected"));
            e.target.classList.add("selected");
            selectedAvatarPath = e.target.dataset.avatar;
        });
    });
}

// Abrir modal en modo Edición de Perfil
function openProfileEditModal() {
    const player = playerManager.currentPlayer;
    if (!player) return;

    modalSetupTitle.textContent = "[EDITAR PERFIL]";
    setupPlayerNameInput.value = player.name || "";
    setAvatarSelection(player.avatar || "images/1.jpg");
    btnSavePlayerName.textContent = "GUARDAR CAMBIOS";
    btnCancelModal.style.display = "block";

    btnSavePlayerName.onclick = async () => {
        const newName = setupPlayerNameInput.value.trim();
        if (!newName) {
            alert("Por favor introduce un nombre válido.");
            return;
        }
        player.name = newName;
        player.avatar = selectedAvatarPath;
        modalNameSetup.style.display = "none";
        await playerManager.savePlayerState();
        await multiplayerEngine.updatePublicProfile(player);
        renderUI();
    };

    btnCancelModal.onclick = () => {
        modalNameSetup.style.display = "none";
    };

    modalNameSetup.style.display = "flex";
}

// Construcción del Dashboard Principal con Navegación de Pestañas
function injectMainUI() {
    if (document.getElementById("nav-tabs")) return;

    const centerContainer = document.getElementById("center-container");
    const tabsNav = document.createElement("div");
    tabsNav.id = "nav-tabs";
    tabsNav.style.cssText = "display:flex; gap:6px; flex-wrap:wrap;";
    tabsNav.innerHTML = `
        <button class="tab-btn active" data-tab="tab-actions">ACTIVIDADES</button>
        <button class="tab-btn" data-tab="tab-skills">HABILIDADES</button>
        <button class="tab-btn" data-tab="tab-economy">EMPRESAS & BIENES</button>
        <button class="tab-btn" data-tab="tab-market">MERCADO</button>
        <button class="tab-btn" data-tab="tab-news">NOTICIAS</button>
        <button class="tab-btn" data-tab="tab-multiplayer">CIUDADANOS</button>
    `;

    const contentArea = document.createElement("div");
    contentArea.id = "tabs-content";

    // Pestaña 1: Actividades
    const tabActions = document.createElement("div");
    tabActions.id = "tab-actions";
    tabActions.className = "tab-page";
    tabActions.innerHTML = `
        <div class="card">
            <h2>[PLAN] Planificador de Actividades</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <select id="select-action" style="flex-grow:1; margin-bottom:0;">
                    ${Object.values(ACTIONS_CATALOG).map(act => `<option value="${act.id}">${act.name.toUpperCase()}</option>`).join('')}
                </select>
                <input type="number" id="input-duration" value="60" min="15" max="480" step="15" style="width: 100px; margin-bottom:0;" placeholder="Minutos">
                <button id="btn-add-action">+ AÑADIR A COLA</button>
            </div>
            <h3>Actividad En Curso</h3>
            <div id="current-action-box" style="background:#000; padding:12px; border:1px solid #222; margin-bottom:15px; font-size:0.85em;">
                Sin actividad programada.
            </div>
            <h3>Cola de Procesamiento (<span id="queue-count">0</span>/4)</h3>
            <ul id="queue-list" style="list-style:none; padding:0; margin:0;"></ul>
        </div>
    `;

    // Pestaña Habilidades
    const tabSkills = document.createElement("div");
    tabSkills.id = "tab-skills";
    tabSkills.className = "tab-page";
    tabSkills.style.display = "none";
    tabSkills.innerHTML = `
        <div class="card">
            <h2>[SKL] Habilidades del Ciudadano</h2>
            <div id="skills-list" style="display:flex; flex-direction:column; gap:12px;"></div>
        </div>
    `;

    // Pestaña Economía y Propiedades
    const tabEconomy = document.createElement("div");
    tabEconomy.id = "tab-economy";
    tabEconomy.className = "tab-page";
    tabEconomy.style.display = "none";
    tabEconomy.innerHTML = `
        <div class="card">
            <h2>[EST] Bienes Inmuebles Disponibles</h2>
            <div id="properties-catalog" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;"></div>
            <h2>[OWN] Tus Propiedades</h2>
            <div id="my-properties" style="margin-bottom:20px; font-size:0.85em; color:#777;">Sin propiedades asignadas.</div>
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
            <div id="my-businesses" style="font-size:0.85em; color:#777;">Sin empresas registradas.</div>
        </div>
    `;

    // Pestaña Mercado
    const tabMarket = document.createElement("div");
    tabMarket.id = "tab-market";
    tabMarket.className = "tab-page";
    tabMarket.style.display = "none";
    tabMarket.innerHTML = `
        <div class="card">
            <h2>[MKT] Mercado de Suministros</h2>
            <div id="market-items-list" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;"></div>
            <h2>[INV] Inventario del Ciudadano</h2>
            <div id="my-inventory" style="font-size:0.85em; color:#777;">Inventario vacío.</div>
        </div>
    `;

    // Pestaña Noticias
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

    // Pestaña Ciudadanos / Multijugador
    const tabMultiplayer = document.createElement("div");
    tabMultiplayer.id = "tab-multiplayer";
    tabMultiplayer.className = "tab-page";
    tabMultiplayer.style.display = "none";
    tabMultiplayer.innerHTML = `
        <div class="card">
            <h2>[NET] Registro Global de Ciudadanos</h2>
            <button id="btn-refresh-leaderboard" style="margin-bottom:15px; width:100%;">CARGAR RANKING</button>
            <div id="leaderboard-list">Cargando lista de ciudadanos...</div>
        </div>
    `;

    contentArea.appendChild(tabActions);
    contentArea.appendChild(tabSkills);
    contentArea.appendChild(tabEconomy);
    contentArea.appendChild(tabMarket);
    contentArea.appendChild(tabNews);
    contentArea.appendChild(tabMultiplayer);

    centerContainer.appendChild(tabsNav);
    centerContainer.appendChild(contentArea);

    // Navegación por pestañas
    tabsNav.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            tabsNav.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.querySelectorAll(".tab-page").forEach(page => page.style.display = "none");
            document.getElementById(btn.dataset.tab).style.display = "block";

            if (btn.dataset.tab === "tab-news") loadNews();
            if (btn.dataset.tab === "tab-multiplayer") loadLeaderboard();
        });
    });

    // Listeners del Formulario de Actividades
    document.getElementById("btn-add-action").addEventListener("click", () => {
        const actionType = document.getElementById("select-action").value;
        const duration = parseInt(document.getElementById("input-duration").value, 10) || 60;
        const player = playerManager.currentPlayer;
        if (!player) return;

        const res = actionEngine.enqueueAction(player, actionType, duration);
        if (!res.success) alert(res.reason);
        else {
            playerManager.savePlayerState();
            renderUI();
        }
    });

    // Listeners de Fundar Empresa
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

    // Refreshers
    document.getElementById("btn-refresh-news").addEventListener("click", loadNews);
    document.getElementById("btn-refresh-leaderboard").addEventListener("click", loadLeaderboard);
}

// Cargar Noticias
async function loadNews() {
    const list = document.getElementById("news-feed-list");
    list.textContent = "Obteniendo últimas noticias...";
    const items = await newsEngine.getLatestNews(6);
    if (items.length === 0) {
        list.innerHTML = `<p style="color:#777; font-size:0.85em;">No hay boletines informativos recientes.</p>`;
        return;
    }
    list.innerHTML = items.map(n => `
        <div style="background:#000; padding:10px; margin-bottom:10px; border:1px solid #222;">
            <strong style="color:#fff; font-size:0.85em;">${n.title.toUpperCase()}</strong>
            <p style="margin:5px 0 0 0; font-size:0.8em; color:#aaa;">${n.content}</p>
        </div>
    `).join('');
}

// Cargar Ranking Global con visualización de Avatar
async function loadLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    list.textContent = "Cargando clasificación de ciudadanos...";
    const citizens = await multiplayerEngine.getTopCitizens(10);
    if (citizens.length === 0) {
        list.innerHTML = `<p style="color:#777; font-size:0.85em;">No se registraron otros ciudadanos en la red.</p>`;
        return;
    }
    list.innerHTML = citizens.map((c, idx) => `
        <div style="background:#000; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid #222; font-size:0.8em;">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${c.avatar || 'images/1.jpg'}" class="avatar-img-leaderboard" alt="Avatar">
                <span><strong>#${idx + 1} ${c.name.toUpperCase()}</strong></span>
            </div>
            <span>${c.money.toFixed(2)} $ | ${c.businessCount} EMPRESAS</span>
        </div>
    `).join('');
}

// Bucle Principal de Juego (Game Loop)
function startMainLoop() {
    setInterval(() => {
        // Update Reloj UI
        const timeData = timeEngine.getFormattedTime();
        gameDateEl.textContent = timeData.dateStr;
        gameTimeEl.textContent = timeData.timeStr;
        gameYearEl.textContent = timeData.year;

        // Procesar simulación para personaje autenticado
        if (playerManager.currentPlayer) {
            const player = playerManager.currentPlayer;
            const now = Date.now();
            const mod1 = actionEngine.processOfflineTime(player, now);
            const mod2 = businessEngine.processBusinessIncome(player, now);
            if (mod1 || mod2) {
                renderUI();
            }
        }
    }, 1000);

    // Auto-Guardado y Sincronización Multijugador cada 15 segundos
    setInterval(async () => {
        if (playerManager.currentPlayer) {
            await playerManager.savePlayerState();
            await multiplayerEngine.updatePublicProfile(playerManager.currentPlayer);
        }
    }, 15000);
}

// Renderizado de la Interfaz del Dashboard
function renderUI() {
    const player = playerManager.currentPlayer;
    if (!player) return;

    // Indicadores superiores y avatar del perfil
    document.getElementById("p-name").textContent = player.name;
    document.getElementById("p-age").textContent = `${player.age}y`;
    document.getElementById("p-money").textContent = `${player.money.toFixed(2)} $`;
    document.getElementById("p-rep-inf").textContent = `${player.reputation} / ${player.influence}`;
    document.getElementById("p-stats").textContent = 
        `${Math.round(player.stats.health)} / ${Math.round(player.stats.energy)} / ${Math.round(player.stats.mood)}`;

    const avatarImgEl = document.getElementById("p-avatar");
    if (avatarImgEl) {
        avatarImgEl.src = player.avatar || "images/1.jpg";
    }

    // Panel lateral de Monitor Rápido
    const quickStatus = document.getElementById("quick-action-status");

    // Pestaña Actividades - Estado Actual
    const box = document.getElementById("current-action-box");
    if (player.activeAction) {
        const def = ACTIONS_CATALOG[player.activeAction.type];
        const progressPct = Math.min(100, Math.round((player.activeAction.progressMinutes / player.activeAction.durationMinutes) * 100));
        
        box.innerHTML = `
            <strong>${def.name.toUpperCase()}</strong> (${Math.round(player.activeAction.progressMinutes)} / ${player.activeAction.durationMinutes}m)
            <div style="background:#222; height:6px; margin-top:8px; border:1px solid #444;">
                <div style="background:#fff; height:100%; width:${progressPct}%;"></div>
            </div>
        `;

        quickStatus.innerHTML = `
            <div>EJECUTANDO: <span style="color:#fff;">${def.name.toUpperCase()}</span></div>
            <div>PROGRESO: <span style="color:#fff;">${progressPct}%</span></div>
            <div>EN COLA: <span style="color:#fff;">${player.actionQueue.length} tareas</span></div>
        `;
    } else {
        box.innerHTML = `<span style="color:#777;">Ciudadano en reposo pasivo.</span>`;
        quickStatus.innerHTML = `
            <div>ESTADO: <span style="color:#fff;">IDLE / REPOSO</span></div>
            <div>EN COLA: <span style="color:#fff;">${player.actionQueue.length} tareas</span></div>
        `;
    }

    // Pestaña Actividades - Cola
    const queueList = document.getElementById("queue-list");
    document.getElementById("queue-count").textContent = player.actionQueue.length;
    queueList.innerHTML = "";
    player.actionQueue.forEach((item, index) => {
        const def = ACTIONS_CATALOG[item.type];
        const li = document.createElement("li");
        li.style.cssText = "background:#000; padding:8px 10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid #222; font-size:0.8em;";
        li.innerHTML = `
            <span><strong>${index + 1}. ${def.name.toUpperCase()}</strong> (${item.durationMinutes}m)</span>
            <button class="btn-cancel" style="padding:2px 6px; font-size:0.75em;">X</button>
        `;
        li.querySelector(".btn-cancel").addEventListener("click", () => {
            actionEngine.cancelQueueItem(player, index);
            playerManager.savePlayerState();
            renderUI();
        });
        queueList.appendChild(li);
    });

    // Pestaña Habilidades - Renderizado de niveles, progreso y bonificaciones
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

            // Cálculo de bonificaciones actuales
            const effBonusPct = Math.round((sk.level - 1) * 2);
            const fatigueRedPct = Math.round((sk.level - 1) * 1.5);
            const bizIncBonusPct = Math.round((sk.level - 1) * 10);

            const div = document.createElement("div");
            div.style.cssText = "background:rgba(255,255,255,0.5); padding:12px; border:1px solid var(--border-glass); border-radius:10px; font-size:0.8em;";
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
                <div style="display:flex; gap:6px; flex-wrap:wrap; font-size:0.75em;">
                    <span style="background:rgba(44, 62, 80, 0.08); border:1px solid var(--border-subtle); padding:3px 6px; border-radius:6px; color:var(--accent); font-weight:600;">
                        Eficiencia / Ingreso Activo: +${effBonusPct}%
                    </span>
                    <span style="background:rgba(44, 62, 80, 0.08); border:1px solid var(--border-subtle); padding:3px 6px; border-radius:6px; color:var(--accent); font-weight:600;">
                        Reducción de Fatiga: -${fatigueRedPct}%
                    </span>
                    <span style="background:rgba(44, 62, 80, 0.08); border:1px solid var(--border-subtle); padding:3px 6px; border-radius:6px; color:var(--accent); font-weight:600;">
                        Ingreso Pasivo Empresa: +${bizIncBonusPct}%
                    </span>
                </div>
            `;
            skillsList.appendChild(div);
        });
    }

    // Pestaña Economía - Propiedades
    const propsCatalog = document.getElementById("properties-catalog");
    propsCatalog.innerHTML = "";
    Object.values(PROPERTY_TYPES).forEach(p => {
        const imgSrc = PROPERTY_IMAGES[p.id] || "";
        const div = document.createElement("div");
        div.style.cssText = "background:#000; padding:10px; border:1px solid #222; font-size:0.8em; display:flex; flex-direction:column;";
        div.innerHTML = `
            ${imgSrc ? `<img src="${imgSrc}" alt="${p.name}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; margin-bottom:8px;">` : ""}
            <strong>${p.name.toUpperCase()}</strong>
            <span style="color:#777; margin-top:2px;">Precio: ${p.price.toLocaleString()} $</span>
            <button style="margin-top:auto; width:100%;">COMPRAR</button>
        `;
        div.querySelector("button").addEventListener("click", () => {
            const res = businessEngine.buyProperty(player, p.id);
            if (!res.success) alert(res.reason);
            else {
                alert("Inmueble adquirido.");
                playerManager.savePlayerState();
                renderUI();
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
            div.style.cssText = "background:#000; padding:8px; margin-bottom:5px; border:1px solid #222; font-size:0.8em;";
            div.textContent = `${def.name.toUpperCase()} [ID: ${p.id.substr(0, 6)}]`;
            myProps.appendChild(div);

            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${def.name.toUpperCase()} (${p.id.substr(0, 6)})`;
            selectBizProp.appendChild(opt);
        });
    }

    // Pestaña Economía - Empresas
    const myBiz = document.getElementById("my-businesses");
    myBiz.innerHTML = "";
    if (!player.businesses || player.businesses.length === 0) {
        myBiz.textContent = "No tienes empresas registradas.";
    } else {
        player.businesses.forEach(b => {
            const def = BUSINESS_TYPES[b.typeId];
            const div = document.createElement("div");
            div.style.cssText = "background:#000; padding:10px; margin-bottom:10px; border:1px solid #222; font-size:0.8em;";
            div.innerHTML = `
                <strong>${b.name.toUpperCase()}</strong> (${def.name})<br>
                Caja Fuerte: <span style="color:#fff;">${(b.vaultMoney || 0).toFixed(2)} $</span><br>
                <button class="btn-withdraw" style="margin-top:8px; width:100%;">RETIRAR FONDOS</button>
            `;
            div.querySelector(".btn-withdraw").addEventListener("click", () => {
                const res = businessEngine.withdrawBusinessVault(player, b.id);
                if (!res.success) alert(res.reason);
                else {
                    alert(`Has retirado ${res.amount.toFixed(2)} $ a tu cuenta.`);
                    playerManager.savePlayerState();
                    renderUI();
                }
            });
            myBiz.appendChild(div);
        });
    }

    // Pestaña Mercado
    const marketList = document.getElementById("market-items-list");
    marketList.innerHTML = "";
    Object.values(MARKET_ITEMS).forEach(item => {
        const imgSrc = MARKET_IMAGES[item.id] || "";
        const div = document.createElement("div");
        div.style.cssText = "background:#000; padding:10px; border:1px solid #222; font-size:0.8em; display:flex; flex-direction:column;";
        div.innerHTML = `
            ${imgSrc ? `<img src="${imgSrc}" alt="${item.name}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; margin-bottom:8px;">` : ""}
            <strong>${item.name.toUpperCase()}</strong>
            <span style="color:#777; margin-top:2px;">Precio: ${item.price} $</span>
            <button style="margin-top:auto; width:100%;">COMPRAR</button>
        `;
        div.querySelector("button").addEventListener("click", () => {
            const res = businessEngine.buyMarketItem(player, item.id, 1);
            if (!res.success) alert(res.reason);
            else {
                playerManager.savePlayerState();
                renderUI();
            }
        });
        marketList.appendChild(div);
    });

    // Pestaña Inventario
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
            div.style.cssText = "background:#000; padding:8px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; border:1px solid #222; font-size:0.8em;";
            div.innerHTML = `
                <span>${itemDef ? itemDef.name.toUpperCase() : k} (x${count})</span>
                <button class="btn-use" style="padding:4px 8px;">CONSUMIR</button>
            `;
            div.querySelector(".btn-use").addEventListener("click", () => {
                const res = businessEngine.useMarketItem(player, k);
                if (!res.success) alert(res.reason);
                else {
                    playerManager.savePlayerState();
                    renderUI();
                }
            });
            myInv.appendChild(div);
        });
    }
}

// Inicialización de la sesión del jugador tras autenticación
async function handleUserSession(user) {
    const player = await playerManager.loadOrCreatePlayer(user.uid);
    if (!player.name || player.name === "Ciudadano") {
        modalSetupTitle.textContent = "[REGISTRAR CIUDADANO]";
        btnSavePlayerName.textContent = "CONFIRMAR E INGRESAR";
        btnCancelModal.style.display = "none";
        setupPlayerNameInput.value = "";
        setAvatarSelection("images/1.jpg");
        modalNameSetup.style.display = "flex";

        btnSavePlayerName.onclick = async () => {
            const name = setupPlayerNameInput.value.trim();
            if (!name) {
                alert("Por favor introduce un nombre para tu personaje.");
                return;
            }
            player.name = name;
            player.avatar = selectedAvatarPath;
            modalNameSetup.style.display = "none";
            await completeSessionInit(player);
        };
    } else {
        await completeSessionInit(player);
    }
}

async function completeSessionInit(player) {
    const tabs = document.getElementById("nav-tabs");
    const content = document.getElementById("tabs-content");
    authPanel.style.display = "none";
    playerPanel.style.display = "block";
    if (tabs) tabs.style.display = "flex";
    if (content) content.style.display = "block";

    // Simulación offline acumulada
    actionEngine.processOfflineTime(player, Date.now());
    businessEngine.processBusinessIncome(player, Date.now());

    await playerManager.savePlayerState();
    await multiplayerEngine.updatePublicProfile(player);
    renderUI();
}

// Configuración dinámica del tipo de persistencia en Firebase Auth
async function applyPersistence() {
    const persistenceMode = rememberInput.checked 
        ? browserLocalPersistence 
        : browserSessionPersistence;
    await setPersistence(auth, persistenceMode);
}

// Escuchador de Autenticación de Firebase
onAuthStateChanged(auth, async (user) => {
    const tabs = document.getElementById("nav-tabs");
    const content = document.getElementById("tabs-content");
    if (user) {
        await handleUserSession(user);
    } else {
        authPanel.style.display = "block";
        playerPanel.style.display = "none";
        modalNameSetup.style.display = "none";
        if (tabs) tabs.style.display = "none";
        if (content) content.style.display = "none";
        playerManager.currentPlayer = null;
    }
});

// Eventos de Autenticación
btnLogin.addEventListener("click", async () => {
    try {
        await applyPersistence();
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (err) { alert("Error de acceso: " + err.message); }
});

btnRegister.addEventListener("click", async () => {
    try {
        await applyPersistence();
        await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (err) { alert("Error de registro: " + err.message); }
});

btnGoogleLogin.addEventListener("click", async () => {
    try {
        await applyPersistence();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (err) { alert("Error al autenticar con Google: " + err.message); }
});

btnLogout.addEventListener("click", () => signOut(auth));
btnEditProfile.addEventListener("click", openProfileEditModal);

// Inicialización del Dashboard y selectores
initAvatarSelector();
injectMainUI();
startMainLoop();
 