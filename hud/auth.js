import * as conexion from "./conexion.js";
import { dom, showSubPanel } from "./ui.js";
import { DEFAULT_AVATAR } from "./config.js";

export let currentUser = null;       
export let currentUserData = null;   

// Inicializa el ciclo de vida de autenticación
export function initAuth(onUserReadyCallback) {
    dom.btnLogin.addEventListener("click", () => {
        conexion.loginWithGoogle().catch(err => console.error("Error Login:", err));
    });

    dom.btnLogout.addEventListener("click", () => {
        conexion.logoutSession().then(() => {
            window.location.reload();
        });
    });

    conexion.subscribeToAuthState((user) => {
        if (user) {
            currentUser = user;
            dom.authSection.classList.add("hidden");
            checkUserIdentity(onUserReadyCallback);
        } else {
            currentUser = null;
            dom.authSection.classList.remove("hidden");
            dom.setupSection.classList.add("hidden");
            dom.mainPanel.classList.add("hidden");
        }
    });

    setupProfileModifiers();
}

function checkUserIdentity(onUserReadyCallback) {
    conexion.getUserMapping(currentUser.uid).then((snapshot) => {
        if (snapshot.exists()) {
            const realId = snapshot.val();
            listenToUserData(realId, onUserReadyCallback);
        } else {
            dom.setupSection.classList.remove("hidden");
            dom.mainPanel.classList.add("hidden");
        }
    });
}

// Registro de cuentas nuevas
dom.btnSubmitSetup.addEventListener("click", () => {
    const username = dom.inputSetupUsername.value.trim().toLowerCase();
    let avatarUrl = dom.inputSetupAvatar.value.trim();
    if (!username) return alert("Introduce un nombre de ID válido");
    if (!avatarUrl) avatarUrl = DEFAULT_AVATAR;

    const realId = Date.now(); 

    conexion.getAllUsers().then((snapshot) => {
        let usernameExists = false;
        if (snapshot.exists()) {
            const allUsers = snapshot.val();
            for (let id in allUsers) {
                if (allUsers[id].username === username) {
                    usernameExists = true;
                    break;
                }
            }
        }

        if (usernameExists) {
            return alert("Ese nombre de ID ya está ocupado por otro usuario.");
        }

        const updates = {};
        updates[`uid_to_realid/${currentUser.uid}`] = realId;
        updates[`users/${realId}`] = {
            realId: realId,
            username: username,
            avatar: avatarUrl,
            uid: currentUser.uid
        };

        conexion.writeTransaction(updates).then(() => {
            dom.setupSection.classList.add("hidden");
            // Nota: Aquí pasamos una función vacía o placeholder temporal si se registra desde cero
            listenToUserData(realId, () => { window.location.reload(); });
        });
    });
});

function listenToUserData(realId, onUserReadyCallback) {
    dom.mainPanel.classList.remove("hidden");
    dom.setupSection.classList.add("hidden");

    conexion.listenToUserNode(realId, (snapshot) => {
        if (snapshot.exists()) {
            currentUserData = snapshot.val();
            dom.profileRealId.innerText = currentUserData.realId;
            dom.profileUsername.innerText = currentUserData.username;
            dom.profileAvatarImg.src = currentUserData.avatar || DEFAULT_AVATAR;
            
            if (onUserReadyCallback) onUserReadyCallback(realId);
        }
    });
}

function setupProfileModifiers() {
    dom.btnChangeUsername.addEventListener("click", () => {
        const newUsername = dom.inputChangeUsername.value.trim().toLowerCase();
        if (!newUsername) return alert("Introduce un nombre de ID válido");

        conexion.getAllUsers().then((snapshot) => {
            let usernameExists = false;
            if (snapshot.exists()) {
                const allUsers = snapshot.val();
                for (let id in allUsers) {
                    if (allUsers[id].username === newUsername && String(id) !== String(currentUserData.realId)) {
                        usernameExists = true;
                        break;
                    }
                }
            }

            if (usernameExists) {
                return alert("Ese nombre de ID ya está ocupado.");
            }

            conexion.updateUserFields(currentUserData.realId, { username: newUsername }).then(() => {
                dom.inputChangeUsername.value = "";
                showSubPanel(dom.subPanelFriends);
            });
        });
    });

    dom.btnChangeAvatar.addEventListener("click", () => {
        const newAvatar = dom.inputChangeAvatar.value.trim();
        if (!newAvatar) return alert("Introduce una URL válida");

        conexion.updateUserFields(currentUserData.realId, { avatar: newAvatar }).then(() => {
            dom.inputChangeAvatar.value = "";
            showSubPanel(dom.subPanelFriends);
        });
    });
}