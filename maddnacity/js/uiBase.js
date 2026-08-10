// js/uiBase.js
// Elementos Base del DOM y Utilidades para la UI

export let selectedAvatarPath = "images/1.jpg";

export function setSelectedAvatarPath(path) {
    selectedAvatarPath = path || "images/1.jpg";
}

export const PROPERTY_IMAGES = {
    APARTMENT_BASIC: "images/apartamento.jpg",
    LUXURY_PENTHOUSE: "images/tower.jpg",
    COMMERCIAL_LOCAL: "images/local.jpg",
    INDUSTRIAL_WAREHOUSE: "images/almacen.jpg"
};

export const MARKET_IMAGES = {
    ENERGY_DRINK: "images/energetica.jpg",
    HEALTH_KIT: "images/botiquin.jpg",
    GOURMET_MEAL: "images/cena.jpg"
};

// DOM Elements Base
export const gameDateEl = document.getElementById("game-date");
export const gameTimeEl = document.getElementById("game-time");
export const gameYearEl = document.getElementById("game-year");

export const authPanel = document.getElementById("auth-panel");
export const playerPanel = document.getElementById("player-panel");
export const rightPanel = document.getElementById("right-panel");

export const emailInput = document.getElementById("auth-email");
export const passwordInput = document.getElementById("auth-password");
export const rememberInput = document.getElementById("auth-remember");
export const btnLogin = document.getElementById("btn-login");
export const btnRegister = document.getElementById("btn-register");
export const btnGoogleLogin = document.getElementById("btn-google-login");
export const btnLogout = document.getElementById("btn-logout");
export const btnEditProfile = document.getElementById("btn-edit-profile");

// DOM Elements Móvil
export const mobileTopBar = document.getElementById("mobile-top-bar");
export const mobileProfileToggle = document.getElementById("mobile-profile-toggle");
export const mobilePlayerPanel = document.getElementById("mobile-player-panel");
export const mBtnEditProfile = document.getElementById("m-btn-edit-profile");
export const mBtnLogout = document.getElementById("m-btn-logout");

// DOM Elements Modal Configuración Jugador
export const modalNameSetup = document.getElementById("modal-name-setup");
export const modalSetupTitle = document.getElementById("modal-setup-title");
export const setupPlayerNameInput = document.getElementById("setup-player-name");
export const btnSavePlayerName = document.getElementById("btn-save-player-name");
export const btnCancelModal = document.getElementById("btn-cancel-modal");

export function setAvatarSelection(avatarPath) {
    setSelectedAvatarPath(avatarPath || "images/1.jpg");
    const avatarOptions = document.querySelectorAll(".avatar-option");
    avatarOptions.forEach(opt => {
        if (opt.dataset.avatar === selectedAvatarPath) {
            opt.classList.add("selected");
        } else {
            opt.classList.remove("selected");
        }
    });
}

export function initAvatarSelector() {
    const avatarOptions = document.querySelectorAll(".avatar-option");
    avatarOptions.forEach(img => {
        img.addEventListener("click", (e) => {
            avatarOptions.forEach(opt => opt.classList.remove("selected"));
            e.target.classList.add("selected");
            setSelectedAvatarPath(e.target.dataset.avatar);
        });
    });
}

export function openProfileEditModal(playerManager, multiplayerEngine, renderUICallback) {
    const player = playerManager.currentPlayer;
    if (!player) return;

    if (mobilePlayerPanel) {
        mobilePlayerPanel.style.display = "none";
        mobileProfileToggle.classList.remove("open");
    }

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
        renderUICallback();
    };

    btnCancelModal.onclick = () => {
        modalNameSetup.style.display = "none";
    };

    modalNameSetup.style.display = "flex";
}

export function switchTab(tabId, loadNewsCallback, loadLeaderboardCallback, renderUICallback) {
    const pcTabs = document.querySelectorAll("#nav-tabs .tab-btn");
    pcTabs.forEach(b => {
        if (b.dataset.tab === tabId) b.classList.add("active");
        else b.classList.remove("active");
    });

    const mobileTabs = document.querySelectorAll("#mobile-bottom-nav .nav-item");
    mobileTabs.forEach(b => {
        if (b.dataset.tab === tabId) b.classList.add("active");
        else b.classList.remove("active");
    });

    document.querySelectorAll(".tab-page").forEach(page => page.style.display = "none");
    const targetPage = document.getElementById(tabId);
    if (targetPage) targetPage.style.display = "block";

    if (tabId === "tab-news") loadNewsCallback();
    if (tabId === "tab-multiplayer") loadLeaderboardCallback();

    renderUICallback();
}

export function checkPlayerVitals(player, playerManager) {
    if (!player || !player.stats) return;

    if (player.stats.health <= 0) {
        let penaltyMod = player.modifiers?.collapsePenaltyRed || 0;
        let penaltyMoney = Math.round(100 * (1 - penaltyMod));
        
        alert(`¡Atención! Has colapsado por falta de salud. Has sido atendido en el hospital. Coste médico: ${penaltyMoney} $.`);
        
        const maxHealth = 100 + (player.modifiers?.maxHealthBonus || 0);
        player.stats.health = Math.round(maxHealth * 0.5);
        player.stats.energy = 50;
        player.stats.mood = 50;
        player.money = Math.max(0, player.money - penaltyMoney);
        player.activeAction = null;
        player.actionQueue = [];
        
        if (playerManager) {
            playerManager.savePlayerState();
        }
    }
}