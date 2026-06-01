import { DEFAULT_AVATAR } from "./config.js";

export const dom = {
    authSection: document.getElementById("auth-section"),
    setupSection: document.getElementById("setup-section"),
    mainPanel: document.getElementById("main-panel"),
    btnLogin: document.getElementById("btn-login"),
    btnLogout: document.getElementById("btn-logout"),
    inputSetupUsername: document.getElementById("input-setup-username"),
    inputSetupAvatar: document.getElementById("input-setup-avatar"),
    btnSubmitSetup: document.getElementById("btn-submit-setup"),
    profileRealId: document.getElementById("profile-real-id"),
    profileUsername: document.getElementById("profile-username"),
    profileAvatarImg: document.getElementById("profile-avatar-img"),
    menuOptName: document.getElementById("menu-opt-name"),
    menuOptImage: document.getElementById("menu-opt-image"),
    menuOptFriends: document.getElementById("menu-opt-friends"),
    subPanelName: document.getElementById("sub-panel-name"),
    subPanelImage: document.getElementById("sub-panel-image"),
    subPanelFriends: document.getElementById("sub-panel-friends"),
    inputChangeUsername: document.getElementById("input-change-username"),
    btnChangeUsername: document.getElementById("btn-change-username"),
    inputChangeAvatar: document.getElementById("input-change-avatar"),
    btnChangeAvatar: document.getElementById("btn-change-avatar"),
    inputSearchUsername: document.getElementById("input-search-username"),
    btnSendRequest: document.getElementById("btn-send-request"),
    searchError: document.getElementById("search-error"),
    listRequests: document.getElementById("list-requests"),
    listFriends: document.getElementById("list-friends"),
    tuentiBar: document.getElementById("tuenti-chat-bar"),
    chatWindowsContainer: document.getElementById("chat-windows-container")
};

export function showSubPanel(panelToShow) {
    dom.subPanelName.classList.add("hidden");
    dom.subPanelImage.classList.add("hidden");
    dom.subPanelFriends.classList.add("hidden");
    panelToShow.classList.remove("hidden");
}

export function renderRequests(requests, allUsers, myRealId) {
    dom.listRequests.innerHTML = "";
    let hasRequests = false;
    for (let senderRealId in requests) {
        if (requests[senderRealId] === "pending") {
            hasRequests = true;
            const senderData = allUsers[senderRealId] || { username: `Desconocido`, avatar: DEFAULT_AVATAR };
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="user-row">
                    <img src="${senderData.avatar || DEFAULT_AVATAR}">
                    <div class="user-meta">
                        <strong>${senderData.username}</strong>
                        <span class="user-id-tag">#ID:${senderRealId}</span>
                    </div>
                </div>
                <div>
                    <span class="link-action" data-accept="${senderRealId}">[Aceptar]</span>
                    <span class="link-action link-danger" data-reject="${senderRealId}">[Rechazar]</span>
                </div>
            `;
            dom.listRequests.appendChild(li);
        }
    }
    if (!hasRequests) {
        dom.listRequests.innerHTML = `<li style="color:#555555; border:none;">Ninguna solicitud pendiente</li>`;
    }
}

export function renderFriends(friendsList, allUsers) {
    dom.listFriends.innerHTML = "";
    let hasFriends = false;
    for (let friendRealId in friendsList) {
        if (friendsList[friendRealId] === true) {
            hasFriends = true;
            const friendData = allUsers[friendRealId] || { username: `Desconocido`, avatar: DEFAULT_AVATAR };
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="user-row">
                    <img src="${friendData.avatar || DEFAULT_AVATAR}">
                    <div class="user-meta">
                        <strong>${friendData.username}</strong>
                        <span class="user-id-tag">#ID:${friendRealId}</span>
                    </div>
                </div>
                <div>
                    <span class="link-action" data-chat="${friendRealId}" style="margin-right: 12px; color: #a1c580;">[Chat]</span>
                    <span class="link-action link-danger" data-remove="${friendRealId}">[Eliminar]</span>
                </div>
            `;
            dom.listFriends.appendChild(li);
        }
    }
    if (!hasFriends) {
        dom.listFriends.innerHTML = `<li style="color:#555555; border:none;">No tienes amigos agregados</li>`;
    }
}

export function renderTuentiBar(activeTabs, allUsers) {
    dom.tuentiBar.innerHTML = "";
    for (let friendId in activeTabs) {
        const state = activeTabs[friendId];
        const friendData = allUsers[friendId] || { username: `User`, avatar: DEFAULT_AVATAR };
        
        const tab = document.createElement("div");
        tab.className = `tuenti-tab ${state === 'notification' ? 'tuenti-tab-flash' : ''}`;
        tab.setAttribute("data-target-id", friendId);
        
        tab.innerHTML = `
            <span class="tuenti-tab-status"></span>
            <span class="tuenti-tab-name">${friendData.username}</span>
            <span class="tuenti-tab-close" data-close-tab="${friendId}">&times;</span>
        `;
        dom.tuentiBar.appendChild(tab);
    }
}

export function updateChatWindowMessages(friendId, messages, myRealId) {
    const body = document.getElementById(`chat-body-${friendId}`);
    if (!body) return;
    
    body.innerHTML = "";
    if (messages && Array.isArray(messages)) {
        messages.forEach(msg => {
            // CORREGIDO: Si es un paquete de señalización WebRTC, no se renderiza en la UI del chat
            if (msg.signalType) return;

            const msgDiv = document.createElement("div");
            msgDiv.className = `chat-msg ${msg.sender === myRealId ? 'msg-me' : 'msg-them'}`;
            msgDiv.innerText = msg.text;
            body.appendChild(msgDiv);
        });
        body.scrollTop = body.scrollHeight;
    }
}