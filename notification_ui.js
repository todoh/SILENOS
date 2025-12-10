// --- SISTEMA UI DE NOTIFICACIONES ---
console.log("Módulo Notification UI Cargado");

let container = null;

function initContainer() {
    if (!document.querySelector('.notification-container')) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    } else {
        container = document.querySelector('.notification-container');
    }
}

export function showRequestNotification(requestData, onAccept, onDecline) {
    initContainer();

    // Evitar duplicados visuales si ya existe una notificacion para este ID
    if (document.getElementById(`notif-${requestData.id}`)) return;

    const notif = document.createElement('div');
    notif.className = 'silenos-notification';
    notif.id = `notif-${requestData.id}`;

    notif.innerHTML = `
        <div class="notif-header">
            <span>👋 Solicitud de Aliado</span>
        </div>
        <div class="notif-body">
            <strong>${requestData.name}</strong> quiere conectar contigo.
            <div style="font-size:0.75rem; color:#999; margin-top:4px;">${requestData.email || ''}</div>
        </div>
        <div class="notif-actions">
            <button class="notif-btn accept">Aceptar</button>
            <button class="notif-btn decline">Rechazar</button>
        </div>
    `;

    // Eventos
    const btnAccept = notif.querySelector('.accept');
    const btnDecline = notif.querySelector('.decline');

    btnAccept.onclick = () => {
        closeNotification(notif);
        onAccept();
    };

    btnDecline.onclick = () => {
        closeNotification(notif);
        onDecline();
    };

    container.appendChild(notif);
}

function closeNotification(element) {
    element.style.animation = 'slideOutRight 0.4s ease forwards';
    setTimeout(() => {
        if(element.parentElement) element.parentElement.removeChild(element);
    }, 400);
}