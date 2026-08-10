// js/uiAuth.js
// Manejo de la sesión de usuario y eventos de Autenticación de Firebase

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

import { 
    authPanel, playerPanel, rightPanel, mobileTopBar, mobilePlayerPanel,
    modalNameSetup, modalSetupTitle, setupPlayerNameInput, btnSavePlayerName, 
    btnCancelModal, emailInput, passwordInput, rememberInput, btnLogin, 
    btnRegister, btnGoogleLogin, btnLogout, btnEditProfile, mBtnLogout, 
    mBtnEditProfile, setAvatarSelection, selectedAvatarPath, switchTab, openProfileEditModal 
} from "./uiBase.js";

import { initChatListener, loadNews, loadLeaderboard } from "./uiViews.js";

export async function handleUserSession(user, context) {
    const { playerManager, actionEngine, businessEngine, multiplayerEngine, renderUI } = context;
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
            await completeSessionInit(player, context);
        };
    } else {
        await completeSessionInit(player, context);
    }
}

export async function completeSessionInit(player, context) {
    const { actionEngine, businessEngine, playerManager, multiplayerEngine, newsEngine, renderUI } = context;
    const tabs = document.getElementById("nav-tabs");
    const content = document.getElementById("tabs-content");
    const bottomNav = document.getElementById("mobile-bottom-nav");

    authPanel.style.display = "none";

    if (window.innerWidth <= 768) {
        if (mobileTopBar) mobileTopBar.style.display = "block";
        playerPanel.style.display = "none";
        if (bottomNav) bottomNav.style.display = "flex";
        if (rightPanel) rightPanel.style.display = "none";
    } else {
        if (mobileTopBar) mobileTopBar.style.display = "none";
        playerPanel.style.display = "block";
        if (bottomNav) bottomNav.style.display = "none";
        if (rightPanel) rightPanel.style.display = "flex";
    }

    if (tabs) tabs.style.display = "flex";
    if (content) content.style.display = "block";

    actionEngine.processOfflineTime(player, Date.now());
    businessEngine.processBusinessIncome(player, Date.now());
    businessEngine.processDailyRent(player, Date.now());

    await playerManager.savePlayerState();
    await multiplayerEngine.updatePublicProfile(player);

    initChatListener(multiplayerEngine, playerManager);
    switchTab("tab-actions", () => loadNews(newsEngine), () => loadLeaderboard(multiplayerEngine), renderUI);
    renderUI();
}

export async function applyPersistence() {
    const persistenceMode = rememberInput.checked 
        ? browserLocalPersistence 
        : browserSessionPersistence;
    await setPersistence(auth, persistenceMode);
}

export function initAuthListeners(context) {
    const { playerManager, renderUI, multiplayerEngine } = context;

    onAuthStateChanged(auth, async (user) => {
        const tabs = document.getElementById("nav-tabs");
        const content = document.getElementById("tabs-content");
        const bottomNav = document.getElementById("mobile-bottom-nav");

        if (user) {
            await handleUserSession(user, context);
        } else {
            authPanel.style.display = "block";
            playerPanel.style.display = "none";
            if (mobileTopBar) mobileTopBar.style.display = "none";
            if (mobilePlayerPanel) mobilePlayerPanel.style.display = "none";
            modalNameSetup.style.display = "none";

            if (tabs) tabs.style.display = "none";
            if (content) content.style.display = "none";
            if (bottomNav) bottomNav.style.display = "none";
            if (rightPanel) rightPanel.style.display = "none";

            playerManager.currentPlayer = null;
        }
    });

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
    btnEditProfile.addEventListener("click", () => openProfileEditModal(playerManager, multiplayerEngine, renderUI));

    if (mBtnLogout) mBtnLogout.addEventListener("click", () => signOut(auth));
    if (mBtnEditProfile) mBtnEditProfile.addEventListener("click", () => openProfileEditModal(playerManager, multiplayerEngine, renderUI));
}